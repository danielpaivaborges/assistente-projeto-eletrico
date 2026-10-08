const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const engine = require('./engine/electrical-engine.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const availableIds = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => match[1]));
const elements = new Map();

function createElement() {
  return {
    value: '',
    innerHTML: '',
    textContent: '',
    hidden: false,
    style: {},
    classList: { add() {}, remove() {} },
    addEventListener() {},
    focus() {},
    reset() {}
  };
}

function getElementById(id) {
  if (!availableIds.has(id)) {
    throw new Error('A interface referencia um id ausente no HTML: ' + id);
  }

  if (!elements.has(id)) elements.set(id, createElement());
  return elements.get(id);
}

getElementById('project-name').value = 'Casa Modelo';
getElementById('supply-type').value = 'three-127-220';
getElementById('board-size').value = '24 módulos DIN';

vm.runInNewContext(appSource, {
  window: {
    ElectricalEngine: engine,
    console,
    clearTimeout() {},
    setTimeout() { return 1; }
  },
  document: {
    getElementById,
    addEventListener() {},
    querySelectorAll() { return []; }
  },
  console
}, { filename: 'src/app.js' });

assert.match(getElementById('rooms-list').innerHTML, /Sala/);
assert.match(getElementById('points-list').innerHTML, /Luminária central/);
assert.equal(getElementById('inventory-status').textContent, '4 sem circuito');
assert.match(getElementById('inventory-summary').textContent, /5 pontos cadastrados/);
assert.match(getElementById('inventory-summary').textContent, /1 ponto\(s\) já vinculados/);
assert.match(getElementById('circuits-body').innerHTML, /Iluminação social/);
assert.match(getElementById('circuits-body').innerHTML, /1 ponto vinculado/);

console.log('✔ interface inicializa com ambientes, pontos e circuitos');
