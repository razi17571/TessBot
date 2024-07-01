const express = require('express');
const axios = require('axios');
const path = require("path");
const engine = require('ejs-mate');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/public")));
app.engine('ejs', engine);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

app.get('/', (req, res) => {
    res.render("index.ejs");
});

async function getScore(quizId, accessToken) {
    const url = 'https://api.tesseractonline.com/quizattempts/submit-quiz';
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Authorization': accessToken,
        'Origin': 'https://tesseractonline.com',
        'Referer': 'https://tesseractonline.com/',
    };
    const payload = { quizId };

    try {
        const response = await axios.post(url, payload, { headers });
        return response.data.payload.score;
    } catch (error) {
        console.error(`Error submitting quiz ${quizId}:`, error);
        throw error;
    }
}

async function attemptQuizApi(quizId, questionId, userAnswer, accessToken) {
    const url = 'https://api.tesseractonline.com/quizquestionattempts/save-user-quiz-answer';
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Authorization': accessToken,
        'Origin': 'https://tesseractonline.com',
        'Referer': 'https://tesseractonline.com/',
    };
    const payload = { quizId, questionId, userAnswer };

    try {
        const response = await axios.post(url, payload, { headers });
        return await getScore(quizId, accessToken);
    } catch (error) {
        console.error(`Error attempting quiz ${quizId}, question ${questionId}:`, error);
        throw error;
    }
}

async function attemptQuiz(quizId, questionId, currentScore, accessToken) {
    let score = currentScore;
    const options = ['a', 'b', 'c', 'd'];
    let i = 0;

    while (score !== currentScore + 1) {
        try {
            score = await attemptQuizApi(quizId, questionId, options[i], accessToken);
            if (score === currentScore + 1) {
                console.log(`Option ${options[i]} locked for question ${questionId}`);
            }
        } catch (error) {
            console.log(`Error with quiz ${quizId}, question ${questionId}, stopping attempts.`);
            break;
        }
        i += 1;
    }

    return score;
}

async function attemptOneQuiz(quizId, accessToken) {
    const url = `https://api.tesseractonline.com/quizattempts/create-quiz/${quizId}`;
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Authorization': accessToken,
        'Origin': 'https://tesseractonline.com',
        'Referer': 'https://tesseractonline.com/',
    };

    try {
        const response = await axios.get(url, { headers });
        const data = response.data;
        let currentScore = 0;

        for (const question of data.payload.questions) {
            currentScore = await attemptQuiz(data.payload.quizId, question.questionId, currentScore, accessToken);
        }

        return { quizId: data.payload.quizId, finalScore: currentScore };
    } catch (error) {
        console.log(`Error creating quiz ${quizId}: ${error}`);
        throw error;
    }
}

async function getUnitTopics(unitId, accessToken) {
    const url = `https://api.tesseractonline.com/studentmaster/get-topics-unit/${unitId}`;
    const headers = {
        'Authorization': accessToken,
        'Host': 'api.tesseractonline.com',
    };

    try {
        const response = await axios.get(url, { headers });
        const data = response.data;

        return data.payload.topics
            .filter(topic => topic.contentFlag) // Only include topics with contentFlag true
            .map(topic => ({
                topicId: topic.id,
                topicName: topic.name
            }));
    } catch (error) {
        console.log(`Error fetching topics for unit ${unitId}: ${error}`);
        throw error;
    }
}

async function resultQuiz(topicId, accessToken) {
    const url = `https://api.tesseractonline.com/quizattempts/quiz-result/${topicId}`;
    const headers = {
        'Authorization': accessToken,
        'Host': 'api.tesseractonline.com',
    };

    try {
        const response = await axios.get(url, { headers });
        const data = response.data;

        return data.payload.badge === 1;
    } catch (error) {
        console.log(`Error fetching quiz result for topic ${topicId}: ${error}`);
        throw error;
    }
}

app.post('/', async (req, res) => {
    const { accessToken, unitId, numUnits } = req.body;

    if (!accessToken || !unitId || numUnits === undefined) {
        return res.status(400).json({ error: 'Missing accessToken, unitId, or numUnits in request data.' });
    }

    let logs = [];
    let topicsCount = 0; // Initialize topics counter
    let processedTopics = 0; // Track the number of processed topics

    try {
        const unitIds = unitId.split(' ');
        const numUnitsInt = parseInt(numUnits, 10); // Convert numUnits to an integer

        for (const unit of unitIds) {
            if (numUnitsInt !== 0 && processedTopics >= numUnitsInt) break; // Stop processing if the limit is reached and numUnits is not 0

            const topics = await getUnitTopics(unit, accessToken);
            topicsCount += topics.length; // Increment the counter by the number of topics in the current unit

            for (const topic of topics) {
                if (numUnitsInt !== 0 && processedTopics >= numUnitsInt) break; // Stop processing if the limit is reached and numUnits is not 0

                console.log(`${topic.topicId}: ${topic.topicName}`);

                const done = await resultQuiz(topic.topicId, accessToken);

                if (done) {
                    console.log(`Quiz with id ${topic.topicId} is already done!`);
                } else {
                    console.log(`Solving quiz ${topic.topicId}`);
                    await attemptOneQuiz(topic.topicId, accessToken);
                    console.log(`Quiz ${topic.topicId} is finished.`);
                    console.log('');
                    
                    processedTopics += 1; // Increment the processed topics counter only for attempted quizzes
                }
            }
        }

        res.status(200).json({ logs, message: 'Submission complete', topicsCount }); // Include topicsCount in the response
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});