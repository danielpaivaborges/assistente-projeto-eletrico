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
let generatedBackup = null;
let downloadedFilename = null;
let printCalls = 0;

function createElement() {
  const listeners = {};

  return {
    value: '',
    innerHTML: '',
    textContent: '',
    hidden: false,
    style: {},
    files: [],
    classList: { add() {}, remove() {} },
    listeners,
    addEventListener(type, listener) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener);
    },
    click() {
      (listeners.click || []).forEach((listener) => listener({ target: this, preventDefault() {} }));
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

class FakeBlob {
  constructor(parts, options) {
    this.text = parts.join('');
    this.type = options.type;
  }
}

class FakeFileReader {
  readAsText(file) {
    this.result = file.content;
    this.onload({ target: this });
  }
}

const body = {
  appendChild() {},
  removeChild() {}
};

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
    print() { printCalls += 1; },
    Blob: FakeBlob,
    FileReader: FakeFileReader,
    URL: {
      createObjectURL(blob) {
        generatedBackup = blob.text;
        return 'blob:backup';
      },
      revokeObjectURL() {}
    },
    localStorage: {
      getItem(key) { return storedValues.has(key) ? storedValues.get(key) : null; },
      setItem(key, value) { storedValues.set(key, String(value)); }
    }
  },
  document: {
    body,
    getElementById,
    addEventListener() {},
    querySelectorAll() { return []; },
    createElement(tagName) {
      if (tagName !== 'a') throw new Error('Elemento inesperado: ' + tagName);
      return {
        style: {},
        href: '',
        download: '',
        click() { downloadedFilename = this.download; }
      };
    }
  },
  console
}, { filename: 'src/app.js' });

getElementById('export-backup').click();

const exported = JSON.parse(generatedBackup);
assert.equal(exported.format, 'assistente-projeto-eletrico-backup');
assert.equal(exported.version, 1);
assert.equal(exported.project.settings.projectName, 'Casa Modelo');
assert.equal(exported.project.circuits.length, 6);
assert.match(downloadedFilename, /^casa-modelo-backup-\d{4}-\d{2}-\d{2}\.json$/);

const importedBackup = {
  format: 'assistente-projeto-eletrico-backup',
  version: 1,
  exportedAt: '2026-10-09T12:00:00.000Z',
  project: {
    version: 1,
    settings: {
      projectName: 'Casa Importada',
      supplyType: 'two-127-220',
      boardSize: '36 módulos DIN'
    },
    circuits: [
      { id: 'luz', name: 'Iluminação importada', category: 'Iluminação', power: 100, voltage: 127, phase: 'A' }
    ],
    rooms: [
      { id: 'sala', name: 'Sala importada', type: 'Sala' }
    ],
    points: [
      { id: 'luz-sala', roomId: 'sala', type: 'Iluminação', description: 'Luminária importada', power: 100, voltage: 127 }
    ]
  }
};

const importInput = getElementById('import-project-file');
importInput.files = [{ name: 'casa-importada.json', content: JSON.stringify(importedBackup) }];
importInput.listeners.change[0]({ target: importInput });

assert.equal(getElementById('project-title').textContent, 'Casa Importada · 127/220 V · bifásica');
assert.match(getElementById('circuits-body').innerHTML, /Iluminação importada/);
assert.match(getElementById('rooms-list').innerHTML, /Sala importada/);
assert.equal(JSON.parse(storedValues.get(storageKey)).settings.projectName, 'Casa Importada');

importInput.files = [{ name: 'arquivo-invalido.json', content: JSON.stringify({ format: 'assistente-projeto-eletrico-backup', version: 1, project: {} }) }];
importInput.listeners.change[0]({ target: importInput });

assert.equal(getElementById('project-title').textContent, 'Casa Importada · 127/220 V · bifásica');

getElementById('print-report').click();
assert.equal(printCalls, 1);

console.log('✔ backup é exportado, importado e pronto para relatório');
