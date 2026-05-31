const fs = require('fs');
const html = fs.readFileSync('n3.html', 'utf8');

const match = html.match(/let file = `([\s\S]*?)`;/);
if (!match) {
    console.log("Could not extract file string");
    process.exit(1);
}
const file = match[1];

let words = [];

function parseCSV() {
    const lines = file.split('\n');
    lines.forEach(line => {
        if (!line.trim() || line.startsWith('動詞,')) return;
        const [verb, masuForm, naiForm, teForm, chinese, taForm, masuPron, taiForm, meireiForm, pron] = line.split(',');
        if (chinese && verb && masuForm && teForm && naiForm) {
            words.push({ chinese, verb, masuForm, teForm, naiForm, pron });
        } else {
            console.log("Failed to parse line:", line);
        }
    });
}

parseCSV();
console.log("Words length:", words.length);
if (words.length > 0) {
    console.log(words[0]);
}

