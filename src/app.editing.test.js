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
    disabled: false,
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

function actionTarget(entity, action, id) {
  const attributes = {
    'data-project-entity': entity,
    'data-project-action': action,
    'data-project-id': id
  };

  return {
    parentNode: null,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
    }
  };
}

function triggerAction(containerId, entity, action, id) {
  const listener = getElementById(containerId).listeners.click[0];
  listener({ target: actionTarget(entity, action, id), preventDefault() {} });
}

function submit(formId) {
  getElementById(formId).listeners.submit[0]({ preventDefault() {} });
}

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

triggerAction('rooms-list', 'room', 'edit', 'sala');
assert.equal(getElementById('room-modal-title').textContent, 'Editar ambiente');
assert.equal(getElementById('room-name').value, 'Sala');
getElementById('room-name').value = 'Sala principal';
submit('room-form');
assert.match(getElementById('rooms-list').innerHTML, /Sala principal/);

triggerAction('points-list', 'point', 'edit', 'chuveiro');
assert.equal(getElementById('point-power').value, 6800);
getElementById('point-power').value = '7000';
submit('point-form');

let saved = JSON.parse(storedValues.get(storageKey));
assert.equal(saved.points.find((point) => point.id === 'chuveiro').power, 7000);
assert.equal(saved.circuits.find((circuit) => circuit.id === 5).power, 7000);

triggerAction('points-list', 'point', 'delete', 'chuveiro');
assert.match(getElementById('toast').textContent, /vinculado/);
saved = JSON.parse(storedValues.get(storageKey));
assert.ok(saved.points.some((point) => point.id === 'chuveiro'));

triggerAction('circuits-body', 'circuit', 'delete', '5');
saved = JSON.parse(storedValues.get(storageKey));
assert.ok(!saved.circuits.some((circuit) => circuit.id === 5));
assert.ok(saved.points.some((point) => point.id === 'chuveiro'));

triggerAction('points-list', 'point', 'delete', 'chuveiro');
saved = JSON.parse(storedValues.get(storageKey));
assert.ok(!saved.points.some((point) => point.id === 'chuveiro'));

triggerAction('rooms-list', 'room', 'delete', 'banheiro');
saved = JSON.parse(storedValues.get(storageKey));
assert.ok(!saved.rooms.some((room) => room.id === 'banheiro'));

console.log('✔ edição e exclusão preservam vínculos na interface');
