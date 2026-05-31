import os

with open('n3_annotated.csv', 'r', encoding='utf-8-sig') as f:
    csv_content = f.read()

html_template = """<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>N3 日文動詞測驗</title>
<style>
    /* CSS Variables for Dark / Bright Mode */
    :root {
        --bg-color: #f0f8ff;
        --card-bg: rgba(255, 255, 255, 0.85);
        --text-color: #333;
        --primary-color: #4CAF50;
        --primary-hover: #45a049;
        --border-color: #ccc;
        --shadow-color: rgba(0, 0, 0, 0.1);
        --input-bg: #fff;
        --input-text: #000;
        --feedback-correct: #28a745;
        --feedback-incorrect: #dc3545;
    }

    [data-theme="dark"] {
        --bg-color: #1a1a2e;
        --card-bg: rgba(30, 30, 46, 0.85);
        --text-color: #e0e0e0;
        --primary-color: #0f3460;
        --primary-hover: #e94560;
        --border-color: #444;
        --shadow-color: rgba(0, 0, 0, 0.5);
        --input-bg: #2a2a3e;
        --input-text: #fff;
        --feedback-correct: #4caf50;
        --feedback-incorrect: #ff4c4c;
    }

    body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: var(--bg-color);
        color: var(--text-color);
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        transition: background-color 0.3s ease, color 0.3s ease;
    }

    /* Glassmorphism Container */
    .container {
        width: 100%;
        max-width: 600px;
        background: var(--card-bg);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 15px;
        padding: 30px;
        box-shadow: 0 8px 32px 0 var(--shadow-color);
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-sizing: border-box;
        margin: 20px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .header-area {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    h1 {
        margin: 0;
        font-size: 1.8rem;
    }

    /* Toggle Button */
    .theme-toggle {
        background: transparent;
        border: 2px solid var(--text-color);
        color: var(--text-color);
        border-radius: 20px;
        padding: 5px 15px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
    }
    .theme-toggle:hover {
        background: var(--text-color);
        color: var(--bg-color);
    }

    /* Options Grid */
    .options-area {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }
    
    .options-area label {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 8px;
        transition: background 0.2s;
    }

    .options-area label:hover {
        background: rgba(128, 128, 128, 0.1);
    }

    .question-area {
        text-align: center;
        padding: 20px;
        background: rgba(0,0,0,0.03);
        border-radius: 10px;
    }

    h3#question {
        margin-top: 0;
        font-size: 1.4rem;
    }

    input[type="text"] {
        width: 80%;
        padding: 12px;
        margin-top: 10px;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        font-size: 1.1rem;
        background-color: var(--input-bg);
        color: var(--input-text);
        transition: all 0.3s ease;
    }

    input[type="text"]:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
    }

    .btn-group {
        margin-top: 15px;
        display: flex;
        justify-content: center;
        gap: 10px;
    }

    button.primary-btn {
        padding: 10px 25px;
        font-size: 1rem;
        color: #fff;
        background-color: var(--primary-color);
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.3s;
    }
    button.primary-btn:hover {
        background-color: var(--primary-hover);
    }

    .result-area {
        text-align: center;
        min-height: 80px;
    }

    #feedback {
        font-size: 1.2rem;
        font-weight: bold;
        min-height: 30px;
        margin-bottom: 10px;
    }
    .correct { color: var(--feedback-correct); }
    .incorrect { color: var(--feedback-incorrect); }

    .last-correct-box {
        margin-top: 10px;
        padding: 10px;
        background: rgba(128, 128, 128, 0.1);
        border-radius: 8px;
        font-size: 0.95rem;
    }

    /* Animations */
    @keyframes shake {
        0% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        50% { transform: translateX(5px); }
        75% { transform: translateX(-5px); }
        100% { transform: translateX(0); }
    }
    .shake {
        animation: shake 0.4s ease-in-out;
        border-color: var(--feedback-incorrect) !important;
    }
    
    @keyframes pop {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    .pop {
        animation: pop 0.3s ease-in-out;
    }

    /* RWD */
    @media (max-width: 480px) {
        .options-area {
            grid-template-columns: 1fr;
        }
        input[type="text"] {
            width: 95%;
        }
    }
</style>
</head>
<body>

<div class="container">
    <div class="header-area">
        <h1>N3 動詞測驗</h1>
        <button class="theme-toggle" onclick="toggleTheme()">切換主題</button>
    </div>
    
    <!-- 題目類型選擇 -->
    <div class="options-area">
        <label><input type="radio" name="questionType" value="1" checked onchange="loadQuestion()"> 中文 -> 原型</label>
        <label><input type="radio" name="questionType" value="2" onchange="loadQuestion()"> 原型 -> ます型</label>
        <label><input type="radio" name="questionType" value="3" onchange="loadQuestion()"> 原型 -> て型</label>
        <label><input type="radio" name="questionType" value="4" onchange="loadQuestion()"> 原型 -> ない型</label>
    </div>
    
    <div class="question-area">
        <h3 id="question">題目載入中...</h3>
        <input type="text" id="answer" placeholder="請輸入答案 (按 Enter 送出)" onkeypress="handleKeyPress(event)" autocomplete="off">
        <div class="btn-group">
            <button class="primary-btn" onclick="checkAnswer()">提交</button>
            <button class="primary-btn" onclick="speakText()">🔊 發音</button>
        </div>
    </div>
    
    <div class="result-area">
        <p id="feedback"></p>
        <div class="last-correct-box">
            <strong>上一次正確的題目和答案:</strong><br>
            <span id="last-correct">尚無記錄</span>
        </div>
    </div>
</div>

<script>
// Toggle Theme
function toggleTheme() {
    const body = document.body;
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
}
// Load saved theme
if (localStorage.getItem('theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
}

let file = `__CSV_CONTENT__`;

let words = [];
let currentQuestion = {};
let lastCorrect = '';

window.onload = function() { 
    parseCSV();
    loadQuestion();
};

function parseCSV() {
    const lines = file.split('\\n');
    lines.forEach(line => {
        if (!line.trim() || line.startsWith('動詞,')) return;
        const [verb, masuForm, naiForm, teForm, chinese, taForm, masuPron, taiForm, meireiForm, pron] = line.split(',');
        if (chinese && verb && masuForm && teForm && naiForm) {
            words.push({ chinese, verb, masuForm, teForm, naiForm, pron });
        }
    });
}

function handleKeyPress(event) {
    if (event.key === "Enter") {
        checkAnswer();
    }
}

function loadQuestion() {
    const questionType = parseInt(document.querySelector('input[name="questionType"]:checked').value, 10);
    const randomWord = words[Math.floor(Math.random() * words.length)];

    switch(questionType) {
        case 1:
            currentQuestion = { type: 'chinese', question: `中文: ${randomWord.chinese}`, answer: randomWord.verb, show: randomWord.pron };
            break;
        case 2:
            currentQuestion = { type: 'masu', question: `原型: ${randomWord.verb} (請回答ます型)`, answer: randomWord.masuForm, show: randomWord.masuForm };
            break;
        case 3:
            currentQuestion = { type: 'te', question: `原型: ${randomWord.verb} (請回答て型)`, answer: randomWord.teForm, show: randomWord.teForm };
            break;
        case 4:
            currentQuestion = { type: 'nai', question: `原型: ${randomWord.verb} (請回答ない型)`, answer: randomWord.naiForm, show: randomWord.naiForm };
            break;
    }
    
    document.getElementById('question').textContent = currentQuestion.question;
    const inputEl = document.getElementById('answer');
    inputEl.value = '';
    inputEl.focus();
    inputEl.classList.remove('shake');
}

function normalizeStr(str) {
    if (!str) return '';
    return str.trim().replace(/[　]/g, ' '); // Full-width space to half-width
}

function checkAnswer() {
    const inputEl = document.getElementById('answer');
    const userAnswer = normalizeStr(inputEl.value);
    const correctAns = normalizeStr(currentQuestion.answer);
    const correctShow = normalizeStr(currentQuestion.show);
    
    if (userAnswer === '') return;

    if (userAnswer === correctAns || (correctShow && userAnswer === correctShow)) {
        // Correct
        const feedbackEl = document.getElementById('feedback');
        feedbackEl.textContent = '✅ 正確！';
        feedbackEl.className = 'correct pop';
        
        lastCorrect = `${currentQuestion.question} 答案: ${correctAns} ${correctShow && correctShow !== correctAns ? '(' + correctShow + ')' : ''}`;
        document.getElementById('last-correct').textContent = lastCorrect;
        
        // Remove animation class after playing
        setTimeout(() => feedbackEl.classList.remove('pop'), 300);
        
        loadQuestion();
    } else {
        // Incorrect
        const feedbackEl = document.getElementById('feedback');
        feedbackEl.innerHTML = `❌ 錯誤！正確答案是：<strong>${correctAns}</strong> ${correctShow && correctShow !== correctAns ? '(' + correctShow + ')' : ''}`;
        feedbackEl.className = 'incorrect';
        
        inputEl.classList.add('shake');
        setTimeout(() => inputEl.classList.remove('shake'), 400);
        
        inputEl.value = '';
        inputEl.focus();
    }
}

function speakText() {
    let textToSpeak = '';
    const questionType = parseInt(document.querySelector('input[name="questionType"]:checked').value, 10);
    if (questionType === 1) {
        textToSpeak = currentQuestion.answer; // verb
    } else {
        // For other types, try to speak the question part or answer
        textToSpeak = currentQuestion.question.split(' ')[1] || currentQuestion.answer;
    }
    
    if (!textToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
}
</script>
</body>
</html>"""

# Fix template to escape backslashes where needed? No, Python multi-line string handles it well. 
# But wait, \n is in the CSV data. Let's make sure csv_content doesn't have issues.
# csv_content is just string.

html_out = html_template.replace('__CSV_CONTENT__', csv_content.strip())

with open('n3.html', 'w', encoding='utf-8-sig') as f:
    f.write(html_out)

print("n3.html successfully generated!")
