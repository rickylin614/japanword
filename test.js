const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');

async function createQuiz(level, failure) {
    const html = read(`${level}.html`);
    assert.match(html, /onkeydown="handleKeyPress\(event\)"/);
    assert.match(html, /<script src="quiz.js"><\/script>/);
    assert.ok(!html.includes('let file ='));
    const elements = {};
    for (const id of ['answer', 'question', 'feedback', 'explanation', 'last-correct', 'status']) {
        assert.ok(html.includes(`id="${id}"`));
        elements[id] = {
            value: '', textContent: '', className: '', disabled: false,
            focus() { this.focused = true; }
        };
    }
    const types = [...html.matchAll(/name="questionType" value="(\d+)"/g)].map(match => match[1]);
    const selectedType = { value: '1' };
    const fetched = [];
    const context = vm.createContext({
        document: {
            body: { dataset: { level }, setAttribute() {} },
            getElementById: id => elements[id],
            querySelector: () => selectedType,
            querySelectorAll: () => [elements.answer, selectedType]
        },
        window: {}, localStorage: { getItem: () => null },
        fetch: async filename => {
            fetched.push(filename);
            if (failure === 'network') throw new Error('offline');
            return {
                ok: failure !== filename, status: 404,
                text: async () => failure === 'empty' ? read(filename).split('\n')[0] : read(filename)
            };
        }
    });
    vm.runInContext(read('quiz.js'), context);
    context.checkAnswer();
    context.loadQuestion();
    const loading = context.window.onload();
    assert.equal(elements.answer.disabled, true);
    await loading;
    assert.deepEqual(fetched.sort(), [`${level}.csv`, `${level}_questions.csv`].sort());
    return { context, elements, selectedType, types };
}

function pressKey(context, overrides = {}) {
    const event = {
        key: 'Enter', prevented: false,
        preventDefault() { this.prevented = true; },
        ...overrides
    };
    context.handleKeyPress(event);
    return event;
}

async function main() {
    for (const level of ['n3', 'n4', 'n5']) {
        const { context, elements, selectedType, types } = await createQuiz(level);
        assert.equal(elements.answer.disabled, false, elements.question.textContent);
        const questions = vm.runInContext('questions', context);
        const words = vm.runInContext('words', context);
        assert.ok(words.length > 100);
        assert.ok(!words.some(word => /動詞原形|^動詞$/.test(word.verb)));
        assert.equal(new Set(questions.map(question => question.id)).size, questions.length);
        for (const question of questions) {
            assert.ok(question.prompt && question.explanation && question.answers.every(Boolean));
        }
        assert.equal(questions.filter(question => Number(question.type) >= 9).length, level === 'n3' ? 16 : 12);
        for (const type of types) {
            selectedType.value = type;
            context.loadQuestion();
            const question = vm.runInContext('currentQuestion', context);
            assert.ok(question, `${level} type ${type}`);
            if (type !== '8') assert.equal(question.type, type);
            const history = elements['last-correct'].textContent;
            for (const value of ['', '   ', '\u3000']) {
                elements.answer.value = value;
                assert.equal(pressKey(context).prevented, true);
                assert.ok(elements.feedback.textContent.includes(question.answers[0]));
                assert.equal(elements.feedback.className, '');
                assert.equal(vm.runInContext('currentQuestion', context), question);
                assert.equal(elements['last-correct'].textContent, history);
                assert.ok(elements.explanation.textContent.includes(question.explanation));
            }
            context.loadQuestion();
            assert.equal(elements.feedback.textContent, '');
            assert.equal(elements.explanation.textContent, '');
            const current = vm.runInContext('currentQuestion', context);
            assert.notEqual(current.id, question.id);
            elements.answer.value = current.answers[0];
            for (const ignored of [{ isComposing: true }, { keyCode: 229 }, { repeat: true }, { key: 'Escape' }]) {
                assert.equal(pressKey(context, ignored).prevented, false);
                assert.equal(elements.feedback.textContent, '');
            }
            pressKey(context);
            assert.match(elements.feedback.textContent, /正確/);
            assert.equal(vm.runInContext('currentQuestion', context), current);
            assert.ok(elements['last-correct'].textContent.includes(current.answers[0]));
            pressKey(context);
            const next = vm.runInContext('currentQuestion', context);
            assert.notEqual(next.id, current.id);
            elements.answer.value = 'not-a-correct-answer';
            pressKey(context);
            assert.equal(elements.feedback.className, 'incorrect');
            assert.equal(vm.runInContext('currentQuestion', context), next);
            assert.equal(elements.answer.value, '');
            context.checkAnswer();
            assert.match(elements.feedback.textContent, /^答案：/);
        }
        for (const question of questions.filter(question => Number(question.type) >= 9)) {
            for (const answer of question.answers) {
                context.testQuestion = question;
                vm.runInContext('currentQuestion = testQuestion; answered = false;', context);
                elements.answer.value = answer;
                context.checkAnswer();
                assert.equal(elements.feedback.className, 'correct', question.id);
            }
        }
        selectedType.value = '8';
        const seenTypes = new Set();
        for (let sample = 0; sample < 300; sample++) {
            context.loadQuestion();
            seenTypes.add(vm.runInContext('currentQuestion.type', context));
        }
        assert.equal(seenTypes.size, types.length - 1);
        const parsed = context.parseCSV('\uFEFFid,prompt,answers\r\nx,"quoted, ""text""\nand newline",a\r\n');
        assert.equal(parsed[0].prompt, 'quoted, "text"\nand newline');
        assert.throws(() => context.parseCSV('id,prompt\nx,"unfinished'));
        assert.throws(() => context.parseCSV('id,prompt\nx'));
        assert.equal(context.answerVariants('来ない（こない）').join('|'), '来ない|こない');
        if (level === 'n4') assert.equal(words.find(word => word.verb === '受ける').ta, '受けた');
        console.log(`${level}: ${words.length} words; ${questions.length} questions; ${types.length} modes passed`);
        for (const failure of [`${level}.csv`, `${level}_questions.csv`, 'network', 'empty']) {
            const failed = await createQuiz(level, failure);
            assert.equal(failed.elements.answer.disabled, true);
            assert.match(failed.elements.question.textContent, /資料載入失敗/);
            assert.equal(vm.runInContext('currentQuestion', failed.context), null);
        }
    }
    console.log('CSV parsing, all answer aliases, keyboard/IME guards, mixed coverage and loading failures passed.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });

