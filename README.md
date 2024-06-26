# Tess Automation

This repository contains steps to use TessBot.

### Note: 
You can watch video demo - TessBotVideo.mp4 || https://youtu.be/sFwg-QyoXdI

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/razi17571/TessBot.git
   ```

2. navigate to directory:
   ```
   cd TessBot
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Steps

1. Run the Node.js script:
   ```
   node index.js
   ```

2. Login to Tess:
   - Open Tess in your browser and Login with your credentials.
   - Press F12 to open Developer Tools.
   - Go to the Networks tab.
   - Refresh the page to capture network requests.
   - Find the request in the list and go to the Headers section.
   - Copy the `Authorization` Bearer Token.

3. Navigate to the subject and unit in Tess:
   - Visit a URL like `https://tesseractonline.com/student/subject/<subject-id>/unit/<unit-id>`.
   - Extract the `unit_id` from the URL (e.g., `unit_id` is `316` from `https://tesseractonline.com/student/subject/61/unit/316`).

4. Submit the Form:
   - Open http://localhost:3000/ in your browser.
   - Enter the `Authorization` Bearer Token in the input field.
   - Enter the `unit_id` in the input field.

