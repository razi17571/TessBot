document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('tessbot-form');

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const accessToken = document.getElementById('access-token').value.trim();
        const unitId = document.getElementById('unit-id').value.trim();

        if (accessToken === '' || unitId === '') {
            alert('Please enter both Access Token and Unit ID.');
            return;
        }

        fetch('/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ accessToken, unitId })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Response received:', data);

            const logsDiv = document.querySelector('.logs');
            logsDiv.innerHTML = ''; 

            if (data.logs && data.logs.length > 0) {
                data.logs.forEach(log => {
                    const logElement = document.createElement('p');
                    logElement.textContent = log;
                    logsDiv.appendChild(logElement);
                });
            }

            alert(data.message);
        })
        .catch(error => {
            console.error('Fetch error:', error);
            alert('Failed to trigger main function in Express.js. Please try again later.');
        });
    });
});
