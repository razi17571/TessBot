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

let ACCESS_TOKEN = process.env.ACCESS_TOKEN;
let logs = [];



async function getScore(quizId) {
    const url = `https://api.tesseractonline.com/quizattempts/submit-quiz`;

    const headers = {
        'Accept': 'application/json, text/plain, /',
        'Content-Type': 'application/json',
        'Authorization': ACCESS_TOKEN,
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

async function attemptQuizApi(quizId, questionId, userAnswer) {
    const url = `https://api.tesseractonline.com/quizquestionattempts/save-user-quiz-answer`;

    const headers = {
        'Accept': 'application/json, text/plain, /',
        'Content-Type': 'application/json',
        'Authorization': ACCESS_TOKEN,
        'Origin': 'https://tesseractonline.com',
        'Referer': 'https://tesseractonline.com/',
    };

    const payload = { quizId, questionId, userAnswer };

    try {
        const response = await axios.post(url, payload, { headers });
        return await getScore(quizId);
    } catch (error) {
        console.error(`Error attempting quiz ${quizId}, question ${questionId}:`, error);
        throw error;
    }
}

async function attemptQuiz(quizId, questionId, currentScore) {
    let score = currentScore;
    const options = ['a', 'b', 'c', 'd'];
    let i = 0;
    console.log(score, currentScore);
    while (score !== currentScore + 1) {
        try {
            score = await attemptQuizApi(quizId, questionId, options[i]);
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

async function attemptOneQuiz(quizId) {
    const url = `https://api.tesseractonline.com/quizattempts/create-quiz/${quizId}`;

    const headers = {
        'Accept': 'application/json, text/plain, /',
        'Content-Type': 'application/json',
        'Authorization': ACCESS_TOKEN,
        'Origin': 'https://tesseractonline.com',
        'Referer': 'https://tesseractonline.com/',
    };

    try {
        const response = await axios.get(url, { headers });
        const data = response.data;
        quiz_Id = data.payload.quizId;
        let currentScore = 0;
        for (const question of data.payload.questions) {
            currentScore = await attemptQuiz(quiz_Id, question.questionId, currentScore);
        }

        return { quizId: data.payload.quizId, finalScore: currentScore };
    } catch (error) {
        console.log(`Error creating quiz ${quizId}: ${error}`);
        throw error;
    }
}

async function getUnitTopics(unitId) {
    const url = `https://api.tesseractonline.com/studentmaster/get-topics-unit/${unitId}`;

    const headers = {
        'Authorization': ACCESS_TOKEN,
        'Host': 'api.tesseractonline.com',
    };

    try {
        const response = await axios.get(url, { headers });
        const data = response.data;

        return data.payload.topics.map(topic => ({
            topicId: topic.id,
            topicName: topic.name
        }));
    } catch (error) {
        console.log(`Error fetching topics for unit ${unitId}: ${error}`);
        throw error;
    }
}

async function resultQuiz(topicId) {
    const url = `https://api.tesseractonline.com/quizattempts/quiz-result/${topicId}`;

    const headers = {
        'Authorization': ACCESS_TOKEN,
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

app.get('/', (req, res) => {
    res.render("index.ejs");
});

app.post('/', async (req, res) => {
    const { accessToken, unitId } = req.body;

    if (!accessToken || !unitId) {
        return res.status(400).json({ error: 'Missing accessToken or unitId in request data.' });
    }

    ACCESS_TOKEN = accessToken;

    try {
        const unitIds = unitId.split(' ');

        for (const unit of unitIds) {
            const topics = await getUnitTopics(unit);

            for (const topic of topics) {
                console.log(`${topic.topicId}: ${topic.topicName}`);
                console.log(''); 
            }

            for (const topic of topics) {
                const done = await resultQuiz(topic.topicId);

                if (done) {
                    console.log(`Quiz with id ${topic.topicId} is already done!`);
                } else {
                    console.log(`Solving quiz ${topic.topicId}`);
                    await attemptOneQuiz(topic.topicId);
                    console.log(`Quiz ${topic.topicId} is finished.`);
                    console.log(''); 
                }
            }
        }

        res.status(200).json({ logs, message: 'Processing complete' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
