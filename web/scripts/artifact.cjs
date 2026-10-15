// Prepare web/dist for publishing as a claude.ai artifact: a page fragment without the document
// skeleton, and the bundle with U+FFFD literals escaped (the artifact host rejects the raw character).
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const tags = [...html.matchAll(/<(?:script|link)[^>]*>(?:<\/script>)?/g)].map((m) => m[0]).filter((s) => !/viewport|charset/.test(s));
fs.writeFileSync(path.join(dist, 'artifact.html'), `<title>Matheos Editor</title>\n${tags.join('\n')}\n<div id="root"></div>\n`);

const ch = String.fromCharCode(0xfffd);
const esc = '\\' + 'uFFFD';
for (const f of fs.readdirSync(path.join(dist, 'assets')).filter((f) => f.endsWith('.js'))) {
  const p = path.join(dist, 'assets', f);
  const s = fs.readFileSync(p, 'utf8');
  if (s.includes(ch)) { fs.writeFileSync(p, s.split(ch).join(esc), 'utf8'); console.log(`escaped U+FFFD in ${f}`); }
}
console.log(JSON.stringify(fs.readdirSync(path.join(dist, 'assets')).map((f) => ({ path: 'assets/' + f }))));
