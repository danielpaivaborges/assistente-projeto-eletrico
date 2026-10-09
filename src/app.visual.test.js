const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const sourceHero = path.join(root, 'src', 'assets', 'quadro-eletrico-hero.webp');
const sourceDevices = path.join(root, 'src', 'assets', 'dispositivos-residenciais.webp');
const builtHero = path.join(root, 'dist', 'assets', 'quadro-eletrico-hero.webp');
const builtDevices = path.join(root, 'dist', 'assets', 'dispositivos-residenciais.webp');

assert.match(html, /class="visual-hero"/);
assert.match(html, /class="project-journey"/);
assert.match(html, /id="journey-action"/);
assert.match(html, /id="journey-steps"/);
assert.match(html, /id="review-card"/);
assert.match(html, /assets\/quadro-eletrico-hero\.webp/);
assert.match(html, /assets\/dispositivos-residenciais\.webp/);
assert.match(html, /class="[^"]*visual-reference-card/);
assert.match(html, /Do ambiente ao quadro, cada decisão fica visível\./);

[sourceHero, sourceDevices, builtHero, builtDevices].forEach((assetPath) => {
  assert.ok(fs.existsSync(assetPath), 'Asset ausente: ' + assetPath);
  assert.ok(fs.statSync(assetPath).size > 10_000, 'Asset muito pequeno: ' + assetPath);
});

console.log('✔ identidade visual e assets originais estão prontos para a interface');
