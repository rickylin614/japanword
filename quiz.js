const level = document.body.dataset.level;
let words = [];
let questions = [];
let currentQuestion = null;
let answered = false;

function normalizeStr(value) {
    return String(value || '').normalize('NFKC').trim();
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    const source = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    for (let index = 0; index < source.length; index++) {
        const character = source[index];
        if (character === '"') {
            if (quoted && source[index + 1] === '"') {
                field += '"';
                index++;
            } else {
                quoted = !quoted;
            }
        } else if (!quoted && (character === ',' || character === '\n')) {
            row.push(field.trim());
            field = '';
            if (character === '\n') {
                if (row.some(Boolean)) rows.push(row);
                row = [];
            }
        } else {
            field += character;
        }
    }
    if (quoted) throw new Error('CSV 引號未閉合');
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
    const headers = rows.shift();
    if (!headers) throw new Error('CSV 沒有標題列');
    return rows.map((values, index) => {
        if (values.length !== headers.length) throw new Error(`CSV 第 ${index + 2} 列欄位數不符`);
        return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
    });
}

function answerVariants(value) {
    const normalized = normalizeStr(value);
    const annotated = normalized.match(/^([^()]+)\(([ぁ-ゖァ-ヺー]+)\)$/u);
    return annotated ? [annotated[1].trim(), annotated[2]] : [normalized];
}

function readWords(csv) {
    return parseCSV(csv).map((row, index) => {
        const word = {
            id: `${level}-word-${index}`,
            verb: row['動詞'] || row['動詞原形'],
            chinese: row['中文'],
            pron: row['發音'] || row['原形發音'],
            masu: row['ます形'],
            te: row['て形 (音便)'] || row['て形'],
            nai: row['ない型'],
            ta: row['た形']
        };
        if (!word.verb || !word.chinese || !word.pron || !word.masu || !word.te || !word.nai) {
            throw new Error(`動詞 CSV 第 ${index + 2} 列缺少必要欄位`);
        }
        if (!word.ta) word.ta = answerVariants(word.te)[0].replace(/て$/, 'た').replace(/で$/, 'だ');
        return word;
    });
}

function wordQuestion(word, type, field, label) {
    const answers = type === '1'
        ? [...answerVariants(word.verb), word.pron]
        : answerVariants(word[field]);
    return {
        id: `${word.id}-${type}`, type,
        prompt: type === '1' ? `中文：${word.chinese}（請回答原形）` : `${word.verb}（${label}）`,
        answers, explanation: `原形：${word.verb}（${word.pron}）；中文：${word.chinese}`,
        speech: word.verb
    };
}

function buildQuestions(vocabulary, exercises) {
    const result = [];
    for (const word of vocabulary) {
        result.push(wordQuestion(word, '1', 'verb', '請回答原形'));
        for (const [type, field, label] of [
            ['2', 'masu', '請回答ます形'], ['3', 'te', '請回答て形'],
            ['4', 'nai', '請回答ない形'], ['5', 'ta', '請回答た形']
        ]) result.push(wordQuestion(word, type, field, label));
        if (/\p{Script=Han}/u.test(word.verb)) {
            result.push(wordQuestion(word, '6', 'pron', '請以假名回答讀音'));
        }
        for (const [field, label] of [['masu', 'ます形'], ['te', 'て形'], ['nai', 'ない形'], ['ta', 'た形']]) {
            result.push({
                id: `${word.id}-7-${field}`, type: '7',
                prompt: `${answerVariants(word[field])[0]}（${label} → 請回答原形）`,
                answers: [...answerVariants(word.verb), word.pron],
                explanation: `${word.verb}（${word.pron}）的${label}是「${answerVariants(word[field])[0]}」。中文：${word.chinese}`,
                speech: answerVariants(word[field])[0]
            });
        }
    }
    const ids = new Set();
    for (const row of parseCSV(exercises)) {
        if (!row.id || ids.has(row.id) || !row.prompt || !row.answers || !row.explanation) {
            throw new Error('進階 CSV 有重複 ID 或缺少題目／答案／解析');
        }
        if (!['9', ...(level === 'n3' ? ['10'] : [])].includes(row.type)) {
            throw new Error(`進階題 ${row.id} 題型無效`);
        }
        ids.add(row.id);
        const answers = row.answers.split('|').map(normalizeStr);
        if (answers.some(answer => !answer)) throw new Error(`進階題 ${row.id} 有空白答案`);
        result.push({ ...row, answers, speech: row.prompt });
    }
    return result;
}

async function fetchCSV(filename) {
    const response = await fetch(filename);
    if (!response.ok) throw new Error(`${filename} 載入失敗（${response.status}）`);
    return response.text();
}

async function initializeQuiz() {
    setControlsDisabled(true);
    try {
        const [vocabulary, exercises] = await Promise.all([
            fetchCSV(`${level}.csv`), fetchCSV(`${level}_questions.csv`)
        ]);
        words = readWords(vocabulary);
        if (!words.length) throw new Error('動詞題庫沒有資料');
        questions = buildQuestions(words, exercises);
        setControlsDisabled(false);
        document.getElementById('status').textContent = `已載入 ${words.length} 個動詞、${questions.filter(question => Number(question.type) >= 9).length} 道進階題`;
        loadQuestion();
    } catch (error) {
        document.getElementById('question').textContent = `資料載入失敗：${error.message}`;
        document.getElementById('status').textContent = '請使用 HTTP 伺服器開啟，並確認同目錄的 CSV 存在且格式正確。重新載入頁面可重試。';
    }
}

function setControlsDisabled(disabled) {
    document.querySelectorAll('input, .question-area button').forEach(element => { element.disabled = disabled; });
}

function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function loadQuestion() {
    if (!questions.length) return;
    let type = document.querySelector('input[name="questionType"]:checked').value;
    if (type === '8') type = pick([...new Set(questions.map(question => question.type))]);
    const pool = questions.filter(question => question.type === type);
    const candidates = pool.filter(question => question.id !== currentQuestion?.id);
    currentQuestion = pick(candidates.length ? candidates : pool);
    answered = false;
    document.getElementById('feedback').textContent = '';
    document.getElementById('explanation').textContent = '';
    document.getElementById('question').textContent = currentQuestion?.prompt || '此題型尚無題目，請選擇其他題型。';
    const input = document.getElementById('answer');
    input.value = '';
    input.focus();
}

function handleKeyPress(event) {
    if (event.key !== 'Enter' || event.isComposing || event.keyCode === 229 || event.repeat) return;
    event.preventDefault();
    checkAnswer();
}

function checkAnswer() {
    if (!currentQuestion) return;
    if (answered) {
        loadQuestion();
        return;
    }
    const input = document.getElementById('answer');
    const response = normalizeStr(input.value);
    const feedback = document.getElementById('feedback');
    const answer = [...new Set(currentQuestion.answers)].join(' ／ ');
    document.getElementById('explanation').textContent = `解析：${currentQuestion.explanation}`;
    if (!response) {
        feedback.textContent = `答案：${answer}（可輸入答案練習，或按「下一題」）`;
        feedback.className = '';
    } else if (currentQuestion.answers.some(candidate => normalizeStr(candidate) === response)) {
        answered = true;
        feedback.textContent = '✅ 正確！閱讀解析後按 Enter 或「下一題」繼續。';
        feedback.className = 'correct';
        document.getElementById('last-correct').textContent = `${currentQuestion.prompt} 答案：${answer}`;
    } else {
        feedback.textContent = `❌ 錯誤！正確答案：${answer}`;
        feedback.className = 'incorrect';
        input.value = '';
    }
    input.focus();
}

function speakText() {
    if (!currentQuestion || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(currentQuestion.speech);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function toggleTheme() {
    const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch {}
}

try {
    if (localStorage.getItem('theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
} catch {}
window.onload = initializeQuiz;
