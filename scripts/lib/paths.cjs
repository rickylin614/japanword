// Logical dataset names are stable in source-hash manifests; physical files live in dedicated directories.
const path=require('node:path');
const ROOT_DIR=path.resolve(__dirname,'../..');
const PUBLIC_DIR=path.join(ROOT_DIR,'public');
const scripts={
  "build-aizuchi-speech-plan.cjs": "scripts/audio/build-aizuchi-speech-plan.cjs",
  "build-grammar.cjs": "scripts/build/build-grammar.cjs",
  "build-n2.cjs": "scripts/build/build-n2.cjs",
  "build-pages.cjs": "scripts/build/build-pages.cjs",
  "build-shell.cjs": "scripts/build/build-shell.cjs",
  "build-verb-examples.cjs": "scripts/build/build-verb-examples.cjs",
  "build-verbs.cjs": "scripts/build/build-verbs.cjs",
  "build-verified.cjs": "scripts/build/build-verified.cjs",
  "build-vocabulary-examples.cjs": "scripts/build/build-vocabulary-examples.cjs",
  "compile-n2-translations.cjs": "scripts/build/compile-n2-translations.cjs",
  "create-all-sources.cjs": "scripts/build/create-all-sources.cjs",
  "create-sources.cjs": "scripts/build/create-sources.cjs",
  "encode-example-mp3.py": "scripts/audio/encode-example-mp3.py",
  "fetch-n2-sources.ps1": "scripts/data/fetch-n2-sources.ps1",
  "find_similar.py": "scripts/legacy/find_similar.py",
  "generate-aizuchi-voicevox.cjs": "scripts/audio/generate-aizuchi-voicevox.cjs",
  "generate-vocabulary-voicevox.cjs": "scripts/audio/generate-vocabulary-voicevox.cjs",
  "generate-word-voicevox.cjs": "scripts/audio/generate-word-voicevox.cjs",
  "generate_n3.py": "scripts/legacy/generate_n3.py",
  "prepare-example-candidates.py": "scripts/data/prepare-example-candidates.py",
  "process_n3.py": "scripts/legacy/process_n3.py",
  "restyle-verbs.cjs": "scripts/build/restyle-verbs.cjs",
  "serve.cjs": "scripts/serve.cjs",
  "shape-aizuchi-prosody.py": "data/speech/renderer-snapshots/shape-aizuchi-prosody.py",
  "test-conversation.cjs": "tests/test-conversation.cjs",
  "test-example-audio.cjs": "tests/test-example-audio.cjs",
  "test-favorites.cjs": "tests/test-favorites.cjs",
  "test-grammar.cjs": "tests/test-grammar.cjs",
  "test-learning.cjs": "tests/test-learning.cjs",
  "test-n2.cjs": "tests/test-n2.cjs",
  "test-verbs.cjs": "tests/test-verbs.cjs",
  "test-verified.cjs": "tests/test-verified.cjs",
  "test-vocabulary-examples.cjs": "tests/test-vocabulary-examples.cjs",
  "test-word-audio.cjs": "tests/test-word-audio.cjs",
  "verify-aizuchi-prosody.py": "scripts/audio/verify-aizuchi-prosody.py",
  "vocabulary-speech-plan.cjs": "scripts/audio/vocabulary-speech-plan.cjs",
  "word-speech-plan.cjs": "scripts/audio/word-speech-plan.cjs",
  "write-example-audit.cjs": "scripts/build/write-example-audit.cjs"
};
const runtime=new Set(["learning.js","quiz.js","legacy-navigation.js","shared-shell.js"]);
function resolveFile(...parts) {
  let name = path.join(...parts);
  if (path.isAbsolute(name)) {
    if (name.startsWith(ROOT_DIR + path.sep)) name = path.relative(ROOT_DIR, name);
    else if (/^[/\\]/.test(name) && !/^\w:/.test(name)) name = name.replace(/^[/\\]+/, '');
    else return name;
  }
  name = name.replaceAll('\\', '/');
  const prefixes = {'sources/':'data/vocabulary/sources/', 'vocabulary-examples/':'data/vocabulary/examples/', 'grammar-source/':'data/grammar/', 'speech/':'data/speech/', 'audio/':'public/audio/', 'assets/':'public/assets/'};
  for (const [from,to] of Object.entries(prefixes)) if (name.startsWith(from)) return path.resolve(ROOT_DIR, to + name.slice(from.length));
  const directories = {sources:'data/vocabulary/sources', 'vocabulary-examples':'data/vocabulary/examples', 'grammar-source':'data/grammar', speech:'data/speech'};
  if (directories[name]) return path.join(ROOT_DIR, directories[name]);
  if (scripts[name]) return path.join(ROOT_DIR, scripts[name]);
  if (runtime.has(name)) return path.join(PUBLIC_DIR, 'assets/js', name);
  if (/(?:-data|-examples|-audio)\.js$/.test(name)) return path.join(PUBLIC_DIR, 'assets/data', name);
  if (/\.html$/.test(name) && !name.includes('/')) return path.join(PUBLIC_DIR, name);
  if (/\.css$/.test(name) && !name.includes('/')) return path.join(PUBLIC_DIR, 'assets/css', name);
  if (/\.csv$/.test(name) && !name.includes('/')) return path.join(PUBLIC_DIR, 'assets/data/legacy', name);
  if (/^favicon\./.test(name)) return path.join(PUBLIC_DIR, 'assets/icons', name);
  if (/\.png$/.test(name) && !name.includes('/')) {
    const dir = path.join(ROOT_DIR, 'artifacts/screenshots');
    require('node:fs').mkdirSync(dir, {recursive:true});
    return path.join(dir, name);
  }
  return path.resolve(ROOT_DIR, name);
}
function assetUrl(name) { return path.relative(PUBLIC_DIR, resolveFile(name)).replaceAll('\\', '/'); }
module.exports = {ROOT_DIR, PUBLIC_DIR, resolveFile, assetUrl};
