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
const storedValues = new Map();
const storageKey = 'assistente-projeto-eletrico:projeto:v1';

function createElement() {
  const listeners = {};

  return {
    value: '',
    innerHTML: '',
    textContent: '',
    hidden: false,
    style: {},
    classList: { add() {}, remove() {} },
    listeners,
    addEventListener(type, listener) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener);
    },
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

storedValues.set(storageKey, JSON.stringify({
  version: 1,
  settings: {
    projectName: 'Casa Persistida',
    supplyType: 'two-127-220',
    boardSize: '36 módulos DIN'
  },
  circuits: [
    { id: 'circuito-persistido', name: 'Circuito persistido', category: 'Iluminação', power: 500, voltage: 127, phase: 'A' }
  ],
  rooms: [
    { id: 'sala', name: 'Sala persistida', type: 'Sala' }
  ],
  points: [
    { id: 'luz', roomId: 'sala', type: 'Iluminação', description: 'Luz persistida', power: 500, voltage: 127 }
  ]
}));

getElementById('project-name').value = 'Casa Modelo';
getElementById('supply-type').value = 'three-127-220';
getElementById('board-size').value = '24 módulos DIN';

vm.runInNewContext(appSource, {
  window: {
    ElectricalEngine: engine,
    console,
    clearTimeout() {},
    setTimeout() { return 1; },
    confirm() { return true; },
    localStorage: {
      getItem(key) { return storedValues.has(key) ? storedValues.get(key) : null; },
      setItem(key, value) { storedValues.set(key, String(value)); }
    }
  },
  document: {
    getElementById,
    addEventListener() {},
    querySelectorAll() { return []; }
  },
  console
}, { filename: 'src/app.js' });

assert.equal(getElementById('project-title').textContent, 'Casa Persistida · 127/220 V · bifásica');
assert.match(getElementById('circuits-body').innerHTML, /Circuito persistido/);
assert.match(getElementById('rooms-list').innerHTML, /Sala persistida/);
assert.match(getElementById('points-list').innerHTML, /Luz persistida/);
assert.equal(getElementById('save-status').textContent, 'salvo neste navegador');

const savedProject = JSON.parse(storedValues.get(storageKey));
assert.equal(savedProject.version, 1);
assert.equal(savedProject.settings.projectName, 'Casa Persistida');
assert.equal(savedProject.settings.supplyType, 'two-127-220');
assert.equal(savedProject.settings.boardSize, '36 módulos DIN');
assert.equal(savedProject.circuits[0].name, 'Circuito persistido');

getElementById('reset-project').listeners.click[0]({ preventDefault() {} });

assert.equal(getElementById('project-title').textContent, 'Casa Modelo · 127/220 V · trifásica');
assert.match(getElementById('circuits-body').innerHTML, /Iluminação social/);
assert.equal(JSON.parse(storedValues.get(storageKey)).settings.projectName, 'Casa Modelo');

console.log('✔ projeto salvo localmente é restaurado com segurança');
