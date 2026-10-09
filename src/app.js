(function () {
  'use strict';

  var engine = window.ElectricalEngine;

  if (!engine) {
    window.console.error('O motor técnico não foi carregado.');
    return;
  }

  var PROJECT_STORAGE_KEY = 'assistente-projeto-eletrico:projeto:v1';
  var PROJECT_STORAGE_VERSION = 1;
  var DEFAULT_PROJECT = {
    circuits: [
      { id: 1, name: 'Iluminação social', category: 'Iluminação', voltage: 127, power: 720, phase: 'A' },
      { id: 2, name: 'TUG quartos', category: 'Tomadas de uso geral', voltage: 127, power: 1200, phase: 'B' },
      { id: 3, name: 'TUG sala', category: 'Tomadas de uso geral', voltage: 127, power: 1000, phase: 'C' },
      { id: 4, name: 'Cozinha', category: 'Tomada de uso específico', voltage: 220, power: 3500, phase: 'AB' },
      { id: 5, name: 'Chuveiro', category: 'Chuveiro', voltage: 220, power: 6800, phase: 'BC', pointIds: ['chuveiro'], powerSource: 'linked-points' },
      { id: 6, name: 'Lavanderia', category: 'Tomada de uso específico', voltage: 127, power: 1500, phase: 'A' }
    ],
    rooms: [
      { id: 'sala', name: 'Sala', type: 'Sala' },
      { id: 'cozinha', name: 'Cozinha', type: 'Cozinha' },
      { id: 'quarto-1', name: 'Quarto 1', type: 'Quarto' },
      { id: 'quarto-2', name: 'Quarto 2', type: 'Quarto' },
      { id: 'banheiro', name: 'Banheiro', type: 'Banheiro' }
    ],
    points: [
      { id: 'luz-sala', roomId: 'sala', type: 'Iluminação', description: 'Luminária central', power: 60, voltage: 127 },
      { id: 'tv-rack', roomId: 'sala', type: 'Tomada de uso geral', description: 'TV e rack', power: 300, voltage: 127 },
      { id: 'bancada', roomId: 'cozinha', type: 'Tomada de uso geral', description: 'Bancada de preparo', power: 1200, voltage: 127 },
      { id: 'luz-quarto-1', roomId: 'quarto-1', type: 'Iluminação', description: 'Luminária central', power: 60, voltage: 127 },
      { id: 'chuveiro', roomId: 'banheiro', type: 'Chuveiro', description: 'Chuveiro elétrico', power: 6800, voltage: 220 }
    ],
    settings: {
      projectName: 'Casa Modelo',
      supplyType: 'three-127-220',
      boardSize: '24 módulos DIN'
    }
  };

  function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createExampleProject() {
    return cloneData(DEFAULT_PROJECT);
  }

  var initialProject = createExampleProject();
  var circuits = initialProject.circuits;
  var rooms = initialProject.rooms;
  var points = initialProject.points;

  var toastTimer = null;
  var elements = {
    body: document.getElementById('circuits-body'),
    totalPower: document.getElementById('total-power'),
    circuitCount: document.getElementById('circuit-count'),
    singleCount: document.getElementById('single-count'),
    largestCircuit: document.getElementById('largest-circuit'),
    largestDetail: document.getElementById('largest-detail'),
    balanceWord: document.getElementById('balance-word'),
    balanceDetail: document.getElementById('balance-detail'),
    phaseRows: {
      A: document.getElementById('phase-a-row'),
      B: document.getElementById('phase-b-row'),
      C: document.getElementById('phase-c-row')
    },
    phaseBars: {
      A: document.getElementById('phase-a-bar'),
      B: document.getElementById('phase-b-bar'),
      C: document.getElementById('phase-c-bar')
    },
    phaseNumbers: {
      A: document.getElementById('phase-a-number'),
      B: document.getElementById('phase-b-number'),
      C: document.getElementById('phase-c-number')
    },
    imbalance: document.getElementById('imbalance-number'),
    balanceStatus: document.getElementById('balance-status'),
    boardRail: document.getElementById('board-rail'),
    boardModules: document.getElementById('board-modules'),
    boardCapacity: document.getElementById('board-capacity'),
    materials: document.getElementById('materials-list'),
    roomsList: document.getElementById('rooms-list'),
    pointsList: document.getElementById('points-list'),
    inventorySummary: document.getElementById('inventory-summary'),
    inventoryStatus: document.getElementById('inventory-status'),
    installationList: document.getElementById('installation-list'),
    installationStatus: document.getElementById('installation-status'),
    reviewList: document.getElementById('review-list'),
    reviewSummary: document.getElementById('review-summary'),
    reviewStatus: document.getElementById('review-status'),
    saveStatus: document.getElementById('save-status'),
    resetProject: document.getElementById('reset-project'),
    circuitModal: document.getElementById('circuit-modal'),
    pointCircuitModal: document.getElementById('point-circuit-modal'),
    installationModal: document.getElementById('installation-modal'),
    roomModal: document.getElementById('room-modal'),
    pointModal: document.getElementById('point-modal'),
    toast: document.getElementById('toast'),
    circuitForm: document.getElementById('circuit-form'),
    pointCircuitForm: document.getElementById('point-circuit-form'),
    installationForm: document.getElementById('installation-form'),
    roomForm: document.getElementById('room-form'),
    pointForm: document.getElementById('point-form'),
    projectName: document.getElementById('project-name'),
    projectTitle: document.getElementById('project-title'),
    supplyType: document.getElementById('supply-type'),
    boardSize: document.getElementById('board-size'),
    circuitVoltage: document.getElementById('circuit-voltage'),
    pointVoltage: document.getElementById('point-voltage'),
    pointRoom: document.getElementById('point-room'),
    pointCircuitOptions: document.getElementById('point-circuit-options'),
    pointCircuitSelection: document.getElementById('point-circuit-selection'),
    installationCircuit: document.getElementById('installation-circuit'),
    installationMethod: document.getElementById('installation-method'),
    installationConductorMaterial: document.getElementById('installation-conductor-material'),
    installationLength: document.getElementById('installation-length'),
    installationTemperature: document.getElementById('installation-temperature'),
    installationGrouping: document.getElementById('installation-grouping'),
    installationProtectionContext: document.getElementById('installation-protection-context'),
    phaseCLegend: document.getElementById('phase-c-legend')
  };
  var activeSupplyKey = elements.supplyType.value;

  function availableBoardSizes() {
    return ['24 módulos DIN', '36 módulos DIN', '48 módulos DIN', '64 módulos DIN'];
  }

  function getBrowserStorage() {
    try {
      return window.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function normalizeStoredProject(value) {
    if (!value || value.version !== PROJECT_STORAGE_VERSION || !value.settings) return null;
    if (!Array.isArray(value.circuits) || !Array.isArray(value.rooms) || !Array.isArray(value.points)) return null;
    if (typeof value.settings !== 'object') return null;

    return {
      circuits: value.circuits.filter(function (item) { return item && typeof item === 'object'; }),
      rooms: value.rooms.filter(function (item) { return item && typeof item === 'object'; }),
      points: value.points.filter(function (item) { return item && typeof item === 'object'; }),
      settings: value.settings
    };
  }

  function applyProjectSettings(settings) {
    var supply = engine.getSupplyProfile(settings && settings.supplyType);
    var boardSize = settings && settings.boardSize;

    elements.projectName.value = settings && typeof settings.projectName === 'string'
      ? settings.projectName
      : DEFAULT_PROJECT.settings.projectName;
    elements.supplyType.value = supply.key;
    elements.boardSize.value = availableBoardSizes().indexOf(boardSize) !== -1
      ? boardSize
      : DEFAULT_PROJECT.settings.boardSize;
    activeSupplyKey = elements.supplyType.value;
  }

  function restoreStoredProject() {
    var storage = getBrowserStorage();
    if (!storage) return false;

    try {
      var raw = storage.getItem(PROJECT_STORAGE_KEY);
      if (!raw) return false;

      var stored = normalizeStoredProject(JSON.parse(raw));
      if (!stored) return false;

      circuits = cloneData(stored.circuits);
      rooms = cloneData(stored.rooms);
      points = cloneData(stored.points);
      applyProjectSettings(stored.settings);
      return true;
    } catch (error) {
      return false;
    }
  }

  function setSaveStatus(state) {
    if (!elements.saveStatus) return;

    if (state === 'saved') {
      elements.saveStatus.textContent = 'salvo neste navegador';
      elements.saveStatus.style.background = '#e6f7f1';
      elements.saveStatus.style.color = '#188868';
      return;
    }

    elements.saveStatus.textContent = 'salvamento indisponível';
    elements.saveStatus.style.background = '#fff6dd';
    elements.saveStatus.style.color = '#9b6615';
  }

  function saveProjectState() {
    var storage = getBrowserStorage();
    if (!storage) {
      setSaveStatus('unavailable');
      return false;
    }

    try {
      storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify({
        version: PROJECT_STORAGE_VERSION,
        settings: {
          projectName: elements.projectName.value,
          supplyType: activeSupplyKey,
          boardSize: elements.boardSize.value
        },
        circuits: circuits,
        rooms: rooms,
        points: points
      }));
      setSaveStatus('saved');
      return true;
    } catch (error) {
      setSaveStatus('unavailable');
      return false;
    }
  }

  function restoreExampleProject() {
    if (!window.confirm || !window.confirm('Restaurar o modelo de exemplo? Os dados atuais deste navegador serão substituídos.')) {
      return;
    }

    var example = createExampleProject();
    circuits = example.circuits;
    rooms = example.rooms;
    points = example.points;
    applyProjectSettings(example.settings);
    closeAllModals();
    updateRoomOptions();
    updateVoltageOptions();
    render();
    toast('Modelo de exemplo restaurado e salvo neste navegador.');
  }

  restoreStoredProject();

  function currentSupply() {
    return engine.getSupplyProfile(activeSupplyKey);
  }

  function activePhases() {
    return currentSupply().phases;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatPower(value) {
    if (value >= 1000) return (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' kW';
    return value.toLocaleString('pt-BR') + ' W';
  }

  function formatCurrent(value) {
    if (!Number.isFinite(value)) return '—';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' A';
  }

  function formatLength(value) {
    var number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return null;
    return number.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' m';
  }

  function phaseClass(phase) {
    if (phase === 'A') return 'phase-a';
    if (phase === 'B') return 'phase-b';
    if (phase === 'C') return 'phase-c';
    return 'phase-2p';
  }

  function phaseLoadResult() {
    return engine.calculatePhaseLoads(circuits, activePhases());
  }

  function pointCircuitTraceability() {
    return engine.getPointCircuitTraceability(circuits, points);
  }

  function getCircuitName(circuitId) {
    var circuit = circuits.filter(function (item) { return String(item.id) === String(circuitId); })[0];
    return circuit ? circuit.name : 'Circuito não localizado';
  }

  function getBalanceView(diff) {
    if (diff === 0) {
      return { word: 'Igual', label: 'sem diferença nas correntes calculadas', tone: '#153f4e', text: '#a4f2d8' };
    }

    return {
      word: 'Leitura',
      label: 'diferença visual de ' + formatCurrent(diff),
      tone: '#153f4e',
      text: '#a4f2d8'
    };
  }

  function getBoardSize() {
    var match = String(elements.boardSize.value).match(/\d+/);
    return match ? Number(match[0]) : 24;
  }

  function renderProjectTitle() {
    var name = elements.projectName.value.trim() || 'Projeto sem nome';
    elements.projectTitle.textContent = name + ' · ' + currentSupply().label;
  }

  function renderCircuits() {
    var traceability = pointCircuitTraceability();

    elements.body.innerHTML = circuits.map(function (circuit) {
      var sizing = engine.getSizingReadiness(circuit);
      var phase = engine.getCircuitPhases(circuit).join('') || '—';
      var links = traceability.byCircuitId[circuit.id];
      var currentDescription = sizing.currentA === null
        ? sizing.label
        : formatCurrent(sizing.currentA) + ' estimados · ' + sizing.label;
      var pointDescription = !links || !links.linkedPoints.length
        ? 'manual · sem pontos vinculados'
        : links.linkedPoints.length + (links.linkedPoints.length === 1 ? ' ponto vinculado' : ' pontos vinculados');

      return '<tr>' +
        '<td><span class="circuit-name">' + escapeHtml(circuit.name) + '</span><span class="circuit-meta">' + escapeHtml(circuit.category) + '</span></td>' +
        '<td>' + formatPower(circuit.power) + '</td>' +
        '<td>' + circuit.voltage + ' V</td>' +
        '<td><span class="phase-badge ' + phaseClass(phase) + '">' + escapeHtml(phase) + '</span></td>' +
        '<td><span class="technical-line">' + escapeHtml(pointDescription) + '</span></td>' +
        '<td><span class="technical-line">' + escapeHtml(currentDescription) + '</span></td>' +
        '</tr>';
    }).join('');
  }

  function renderMetrics() {
    var total = circuits.reduce(function (sum, circuit) { return sum + circuit.power; }, 0);
    var singles = circuits.filter(function (circuit) { return engine.getCircuitPoleCount(circuit) === 1; });
    var largest = circuits.reduce(function (current, circuit) {
      return !current || circuit.power > current.power ? circuit : current;
    }, null);
    var result = phaseLoadResult();
    var balance = getBalanceView(result.imbalance.differenceA);

    elements.totalPower.textContent = formatPower(total);
    elements.circuitCount.textContent = String(circuits.length);
    elements.singleCount.textContent = String(singles.length);
    elements.largestCircuit.textContent = largest ? formatPower(largest.power) : '—';
    elements.largestDetail.textContent = largest ? largest.name + ' · ' + largest.voltage + ' V' : 'sem circuitos';
    elements.balanceWord.textContent = result.warnings.length ? 'Revisar' : balance.word;
    elements.balanceDetail.textContent = result.warnings.length ? 'há circuitos incompatíveis com a alimentação' : balance.label;
  }

  function renderBalance() {
    var result = phaseLoadResult();
    var loads = result.phaseLoads;
    var phases = activePhases();
    var values = phases.map(function (phase) { return loads[phase]; });
    var max = Math.max.apply(null, values.concat([1]));
    var balance = getBalanceView(result.imbalance.differenceA);

    ['A', 'B', 'C'].forEach(function (phase) {
      var enabled = phases.indexOf(phase) !== -1;
      elements.phaseRows[phase].hidden = !enabled;
      if (!enabled) return;

      elements.phaseBars[phase].style.width = (loads[phase] / max * 100).toFixed(0) + '%';
      elements.phaseNumbers[phase].textContent = formatCurrent(loads[phase]);
    });

    elements.phaseCLegend.hidden = phases.indexOf('C') === -1;
    elements.imbalance.textContent = formatCurrent(result.imbalance.differenceA);
    elements.balanceStatus.textContent = result.warnings.length ? 'revisar entradas' : 'indicador visual';
    elements.balanceStatus.style.background = result.warnings.length ? '#542635' : balance.tone;
    elements.balanceStatus.style.color = result.warnings.length ? '#ffbec8' : balance.text;
  }

  function renderBoard() {
    var modules = getBoardSize();
    var used = circuits.reduce(function (sum, circuit) { return sum + engine.getCircuitPoleCount(circuit); }, 0);
    var breakerHtml = circuits.map(function (circuit) {
      var poles = engine.getCircuitPoleCount(circuit);
      var sizing = engine.getSizingReadiness(circuit);
      var phase = engine.getCircuitPhases(circuit).join('') || '—';
      var multiplePoles = poles > 1 ? ' two-pole' : '';

      return '<div class="breaker' + multiplePoles + '" title="' + escapeHtml(circuit.name) + '">' +
        '<span class="breaker-phase">' + escapeHtml(phase) + ' · ' + circuit.voltage + ' V</span>' +
        '<span class="breaker-name">' + escapeHtml(circuit.name) + '</span>' +
        '<span class="breaker-rating">' + escapeHtml(formatCurrent(sizing.currentA)) + ' est.</span>' +
        '</div>';
    }).join('');
    var empty = Math.max(0, Math.min(4, modules - used));
    var remaining = modules - used;

    for (var index = 0; index < empty; index += 1) {
      breakerHtml += '<div class="breaker din-empty"><span class="breaker-phase">DIN</span><span class="breaker-name">Reserva</span><span class="breaker-rating">—</span></div>';
    }

    elements.boardRail.innerHTML = breakerHtml;
    elements.boardModules.textContent = used + ' de ' + modules + ' módulos usados';
    elements.boardCapacity.textContent = remaining >= 0
      ? remaining + ' módulos livres'
      : Math.abs(remaining) + ' módulos além do quadro';
  }

  function renderMaterials() {
    var mono = circuits.filter(function (circuit) { return engine.getCircuitPoleCount(circuit) === 1; }).length;
    var multi = circuits.filter(function (circuit) { return engine.getCircuitPoleCount(circuit) > 1; }).length;
    var occupied = circuits.reduce(function (sum, circuit) { return sum + engine.getCircuitPoleCount(circuit); }, 0);
    var rows = [
      ['Posições para dispositivos de 1 polo', mono + ' un.'],
      ['Posições para dispositivos de mais de 1 polo', multi + ' un.'],
      ['Módulos DIN ocupados', occupied + ' un.'],
      ['Etiquetas de circuito', circuits.length + ' un.'],
      ['Quadro de distribuição', '1 un.']
    ];

    elements.materials.innerHTML = rows.map(function (row) {
      return '<div class="material-row"><span>' + row[0] + '</span><span class="qty">' + row[1] + '</span></div>';
    }).join('');
  }

  function getRoomName(roomId) {
    var room = rooms.filter(function (item) { return item.id === roomId; })[0];
    return room ? room.name : 'Ambiente não localizado';
  }

  function renderInventory() {
    var summary = engine.summarizeProjectInventory(rooms, points);
    var totals = summary.totals;
    var traceability = pointCircuitTraceability();

    elements.roomsList.innerHTML = summary.rooms.map(function (room) {
      var pointLabel = room.pointCount === 1 ? '1 ponto' : room.pointCount + ' pontos';
      var detail = pointLabel + ' · ' + formatPower(room.plannedPowerW) + ' previstos';

      return '<div class="inventory-row room-row">' +
        '<div><span class="inventory-name">' + escapeHtml(room.name) + '</span><span class="inventory-meta">' + escapeHtml(room.type) + ' · ' + detail + '</span></div>' +
        '<span class="inventory-qty">' + room.pointCount + '</span>' +
        '</div>';
    }).join('');

    elements.pointsList.innerHTML = points.map(function (point) {
      var linkedCircuitIds = traceability.pointLinks[point.id] || [];
      var circuitStatus = !linkedCircuitIds.length
        ? 'sem circuito'
        : linkedCircuitIds.length === 1
          ? 'circuito: ' + getCircuitName(linkedCircuitIds[0])
          : 'vínculo em conflito';

      return '<div class="inventory-row point-row">' +
        '<div><span class="inventory-name">' + escapeHtml(point.description) + '</span><span class="inventory-meta"><span class="inventory-type">' + escapeHtml(point.type) + '</span> · ' + escapeHtml(getRoomName(point.roomId)) + ' · ' + point.voltage + ' V · ' + escapeHtml(circuitStatus) + '</span></div>' +
        '<span class="inventory-power">' + formatPower(point.power) + '</span>' +
        '</div>';
    }).join('');

    elements.inventoryStatus.textContent = traceability.totals.unlinkedPointCount + ' sem circuito';
    elements.inventorySummary.textContent = totals.pointCount + ' pontos cadastrados · ' + formatPower(totals.plannedPowerW) + ' de potência prevista · ' + traceability.totals.linkedPointCount + ' ponto(s) já vinculados a circuitos.';
  }

  function installationStatusView(status) {
    if (status === 'ready-for-rule-evaluation') {
      return { label: 'pronto para regras', background: '#e6f7f1', color: '#188868' };
    }

    if (status === 'invalid-installation-data' || status === 'invalid-input') {
      return { label: 'dados a corrigir', background: '#fff0f2', color: '#be3d4c' };
    }

    return { label: 'dados pendentes', background: '#fff6dd', color: '#9b6615' };
  }

  function renderInstallation() {
    var summary = engine.summarizeInstallationReadiness(circuits);
    var totals = summary.totals;

    elements.installationStatus.textContent = totals.readyCount + ' de ' + totals.circuitCount + ' completos';
    elements.installationStatus.style.background = totals.invalidCount ? '#fff0f2' : totals.readyCount === totals.circuitCount && totals.circuitCount ? '#e6f7f1' : '#fff6dd';
    elements.installationStatus.style.color = totals.invalidCount ? '#be3d4c' : totals.readyCount === totals.circuitCount && totals.circuitCount ? '#188868' : '#9b6615';

    elements.installationList.innerHTML = circuits.map(function (circuit) {
      var readiness = summary.byCircuitId[circuit.id];
      var status = installationStatusView(readiness.status);
      var installation = circuit.installation || {};
      var routeDetails = [
        formatLength(installation.lengthM),
        installation.installationMethod,
        installation.conductorMaterial
      ].filter(Boolean);
      var detail = routeDetails.length
        ? routeDetails.join(' · ')
        : 'Trajeto e condições de instalação ainda não informados.';
      var pending = readiness.missingInputs.length
        ? 'Falta: ' + readiness.missingInputs.slice(0, 2).join(' · ')
        : '';
      var invalid = readiness.invalidInputs.length
        ? 'Corrija: ' + readiness.invalidInputs.join(' · ')
        : '';
      var progress = readiness.status === 'ready-for-rule-evaluation'
        ? 'Dados mínimos coletados; regras técnicas ainda serão validadas.'
        : invalid || pending;

      return '<div class="installation-row">' +
        '<div><span class="installation-name">' + escapeHtml(circuit.name) + '</span>' +
        '<span class="installation-meta">' + escapeHtml(detail) + '</span>' +
        '<span class="installation-progress">' + escapeHtml(progress) + '</span></div>' +
        '<span class="installation-state" style="background:' + status.background + ';color:' + status.color + '">' + escapeHtml(status.label) + '</span>' +
        '</div>';
    }).join('');
  }

  function reviewStatusView(status) {
    if (status === 'conflict') {
      return { label: 'conflito de dados', background: '#fff0f2', color: '#be3d4c' };
    }

    if (status === 'manual') {
      return { label: 'registro manual', background: '#edf7ff', color: '#1677ad' };
    }

    return { label: 'a completar', background: '#fff6dd', color: '#9b6615' };
  }

  function renderReview() {
    var review = engine.summarizeProjectReview(circuits, rooms, points, currentSupply());
    var totals = review.totals;
    var headline = totals.conflictCount
      ? totals.conflictCount + (totals.conflictCount === 1 ? ' conflito' : ' conflitos')
      : totals.pendingCount
        ? totals.pendingCount + (totals.pendingCount === 1 ? ' pendência' : ' pendências')
        : 'dados organizados';
    var summaryParts = [];

    if (totals.conflictCount) summaryParts.push(totals.conflictCount + (totals.conflictCount === 1 ? ' conflito de dados' : ' conflitos de dados'));
    if (totals.pendingCount) summaryParts.push(totals.pendingCount + (totals.pendingCount === 1 ? ' item a completar' : ' itens a completar'));
    if (totals.manualCircuitCount) summaryParts.push(totals.manualCircuitCount + (totals.manualCircuitCount === 1 ? ' circuito manual' : ' circuitos manuais'));
    if (!summaryParts.length) summaryParts.push('Os dados cadastrados não têm pendências de organização identificadas.');

    elements.reviewStatus.textContent = headline;
    elements.reviewStatus.style.background = totals.conflictCount ? '#fff0f2' : totals.pendingCount ? '#fff6dd' : '#e6f7f1';
    elements.reviewStatus.style.color = totals.conflictCount ? '#be3d4c' : totals.pendingCount ? '#9b6615' : '#188868';
    elements.reviewSummary.textContent = summaryParts.join(' · ');

    if (!review.items.length) {
      elements.reviewList.innerHTML = '<p class="review-empty">Nenhuma pendência de organização foi identificada. A validação técnica e normativa continua necessária.</p>';
      return;
    }

    elements.reviewList.innerHTML = review.items.map(function (item) {
      var status = reviewStatusView(item.status);
      var scope = item.scope === 'point' ? 'Ponto elétrico' : item.scope === 'room' ? 'Ambiente' : 'Circuito';

      return '<div class="review-row">' +
        '<span class="review-scope">' + escapeHtml(scope) + '</span>' +
        '<div><span class="review-name">' + escapeHtml(item.title) + '</span><span class="review-description">' + escapeHtml(item.description) + '</span></div>' +
        '<span class="review-state" style="background:' + status.background + ';color:' + status.color + '">' + escapeHtml(status.label) + '</span>' +
        '</div>';
    }).join('');
  }

  function render() {
    renderProjectTitle();
    renderInventory();
    renderCircuits();
    renderInstallation();
    renderReview();
    renderMetrics();
    renderBalance();
    renderBoard();
    renderMaterials();
    saveProjectState();
  }

  function toast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    toastTimer = window.setTimeout(function () { elements.toast.classList.remove('visible'); }, 3600);
  }

  function openCircuitModal() {
    elements.circuitModal.classList.add('open');
    window.setTimeout(function () { document.getElementById('circuit-label').focus(); }, 60);
  }

  function closeCircuitModal() {
    elements.circuitModal.classList.remove('open');
    elements.circuitForm.reset();
    updateVoltageOptions();
  }

  function openRoomModal() {
    elements.roomModal.classList.add('open');
    window.setTimeout(function () { document.getElementById('room-name').focus(); }, 60);
  }

  function closeRoomModal() {
    elements.roomModal.classList.remove('open');
    elements.roomForm.reset();
  }

  function openPointModal() {
    updateRoomOptions();
    updateVoltageOptions();
    elements.pointModal.classList.add('open');
    window.setTimeout(function () { document.getElementById('point-description').focus(); }, 60);
  }

  function closePointModal() {
    elements.pointModal.classList.remove('open');
    elements.pointForm.reset();
    updateRoomOptions();
    updateVoltageOptions();
  }

  function selectedPointIdsForCircuit() {
    return Array.prototype.slice.call(document.querySelectorAll('.point-circuit-option:checked'))
      .map(function (input) { return input.getAttribute('data-point-id'); });
  }

  function renderPointCircuitSelection() {
    var selectedIds = selectedPointIdsForCircuit();
    var selectedPoints = points.filter(function (point) { return selectedIds.indexOf(String(point.id)) !== -1; });
    var voltages = selectedPoints.map(function (point) { return point.voltage; }).filter(function (voltage, index, values) {
      return values.indexOf(voltage) === index;
    });
    var power = selectedPoints.reduce(function (sum, point) { return sum + point.power; }, 0);

    if (!selectedPoints.length) {
      elements.pointCircuitSelection.textContent = 'Selecione um ou mais pontos da mesma tensão.';
      return;
    }

    elements.pointCircuitSelection.textContent = voltages.length === 1
      ? selectedPoints.length + ' ponto(s) · ' + formatPower(power) + ' · ' + voltages[0] + ' V'
      : selectedPoints.length + ' ponto(s) · tensões diferentes — separe-os em circuitos distintos.';
  }

  function renderPointCircuitOptions() {
    var traceability = pointCircuitTraceability();
    var availablePoints = points.filter(function (point) {
      return !(traceability.pointLinks[point.id] || []).length;
    });

    if (!availablePoints.length) {
      elements.pointCircuitOptions.innerHTML = '<p class="point-circuit-empty">Todos os pontos já estão vinculados a um circuito.</p>';
      elements.pointCircuitSelection.textContent = 'Adicione novos pontos para criar outro circuito rastreável.';
      return;
    }

    elements.pointCircuitOptions.innerHTML = availablePoints.map(function (point) {
      return '<label class="point-circuit-choice">' +
        '<input class="point-circuit-option" type="checkbox" data-point-id="' + escapeHtml(point.id) + '">' +
        '<span><strong>' + escapeHtml(point.description) + '</strong><small>' + escapeHtml(getRoomName(point.roomId)) + ' · ' + escapeHtml(point.type) + ' · ' + point.voltage + ' V</small></span>' +
        '<em>' + formatPower(point.power) + '</em>' +
        '</label>';
    }).join('');

    document.querySelectorAll('.point-circuit-option').forEach(function (input) {
      input.addEventListener('change', renderPointCircuitSelection);
    });
    renderPointCircuitSelection();
  }

  function openPointCircuitModal() {
    elements.pointCircuitForm.reset();
    renderPointCircuitOptions();
    elements.pointCircuitModal.classList.add('open');
    window.setTimeout(function () { document.getElementById('point-circuit-name').focus(); }, 60);
  }

  function closePointCircuitModal() {
    elements.pointCircuitModal.classList.remove('open');
    elements.pointCircuitForm.reset();
  }

  function selectedInstallationCircuit() {
    return circuits.filter(function (circuit) {
      return String(circuit.id) === String(elements.installationCircuit.value);
    })[0];
  }

  function updateInstallationCircuitOptions() {
    var selected = elements.installationCircuit.value;

    elements.installationCircuit.innerHTML = circuits.map(function (circuit) {
      return '<option value="' + escapeHtml(circuit.id) + '">' + escapeHtml(circuit.name) + ' · ' + circuit.voltage + ' V</option>';
    }).join('');
    elements.installationCircuit.value = circuits.some(function (circuit) {
      return String(circuit.id) === String(selected);
    }) ? selected : (circuits[0] ? String(circuits[0].id) : '');
  }

  function fillInstallationForm() {
    var circuit = selectedInstallationCircuit();
    var installation = circuit && circuit.installation ? circuit.installation : {};

    elements.installationMethod.value = installation.installationMethod || '';
    elements.installationConductorMaterial.value = installation.conductorMaterial || '';
    elements.installationLength.value = installation.lengthM !== undefined ? installation.lengthM : '';
    elements.installationTemperature.value = installation.ambientTemperatureC !== undefined ? installation.ambientTemperatureC : '';
    elements.installationGrouping.value = installation.groupingCount !== undefined ? installation.groupingCount : '1';
    elements.installationProtectionContext.value = installation.protectionContext || '';
  }

  function openInstallationModal() {
    if (!circuits.length) {
      toast('Cadastre ao menos um circuito antes de informar seus dados de instalação.');
      return;
    }

    updateInstallationCircuitOptions();
    fillInstallationForm();
    elements.installationModal.classList.add('open');
    window.setTimeout(function () { elements.installationCircuit.focus(); }, 60);
  }

  function closeInstallationModal() {
    elements.installationModal.classList.remove('open');
    elements.installationForm.reset();
  }

  function closeAllModals() {
    closeCircuitModal();
    closeRoomModal();
    closePointModal();
    closePointCircuitModal();
    closeInstallationModal();
  }

  function fillVoltageOptions(control) {
    var supported = engine.getSupportedVoltages(currentSupply());
    var selected = Number(control.value);

    control.innerHTML = supported.map(function (voltage) {
      return '<option value="' + voltage + '">' + voltage + ' V</option>';
    }).join('');
    control.value = supported.indexOf(selected) !== -1 ? String(selected) : String(supported[0]);
  }

  function updateVoltageOptions() {
    fillVoltageOptions(elements.circuitVoltage);
    fillVoltageOptions(elements.pointVoltage);
  }

  function updateRoomOptions() {
    var selected = elements.pointRoom.value;

    elements.pointRoom.innerHTML = rooms.map(function (room) {
      return '<option value="' + escapeHtml(room.id) + '">' + escapeHtml(room.name) + '</option>';
    }).join('');
    elements.pointRoom.value = rooms.some(function (room) { return room.id === selected; }) ? selected : (rooms[0] ? rooms[0].id : '');
  }

  function automaticBalance() {
    var result = engine.balanceSinglePhaseCircuits(circuits, activePhases());
    circuits = result.circuits;
    render();

    if (result.warnings.length) {
      toast('Redistribuição concluída com pendências: revise os circuitos incompatíveis antes de avançar.');
      return;
    }

    toast(result.movedCircuitIds.length
      ? result.movedCircuitIds.length + ' circuito(s) monofásico(s) redistribuído(s). Revise antes de executar.'
      : 'Nenhum circuito monofásico precisou mudar de fase.');
  }

  document.getElementById('add-circuit-secondary').addEventListener('click', openCircuitModal);
  document.getElementById('create-circuit-from-points').addEventListener('click', openPointCircuitModal);
  document.getElementById('add-installation-data').addEventListener('click', openInstallationModal);
  document.getElementById('add-point-primary').addEventListener('click', openPointModal);
  document.getElementById('close-modal').addEventListener('click', closeCircuitModal);
  document.getElementById('cancel-modal').addEventListener('click', closeCircuitModal);
  document.getElementById('close-point-circuit-modal').addEventListener('click', closePointCircuitModal);
  document.getElementById('cancel-point-circuit-modal').addEventListener('click', closePointCircuitModal);
  document.getElementById('close-installation-modal').addEventListener('click', closeInstallationModal);
  document.getElementById('cancel-installation-modal').addEventListener('click', closeInstallationModal);
  document.getElementById('add-room-button').addEventListener('click', openRoomModal);
  document.getElementById('add-point-button').addEventListener('click', openPointModal);
  elements.resetProject.addEventListener('click', restoreExampleProject);
  document.getElementById('close-room-modal').addEventListener('click', closeRoomModal);
  document.getElementById('cancel-room-modal').addEventListener('click', closeRoomModal);
  document.getElementById('close-point-modal').addEventListener('click', closePointModal);
  document.getElementById('cancel-point-modal').addEventListener('click', closePointModal);
  document.getElementById('balance-button').addEventListener('click', automaticBalance);
  document.getElementById('balance-secondary').addEventListener('click', automaticBalance);

  elements.circuitModal.addEventListener('click', function (event) {
    if (event.target === elements.circuitModal) closeCircuitModal();
  });
  elements.pointCircuitModal.addEventListener('click', function (event) {
    if (event.target === elements.pointCircuitModal) closePointCircuitModal();
  });
  elements.installationModal.addEventListener('click', function (event) {
    if (event.target === elements.installationModal) closeInstallationModal();
  });
  elements.roomModal.addEventListener('click', function (event) {
    if (event.target === elements.roomModal) closeRoomModal();
  });
  elements.pointModal.addEventListener('click', function (event) {
    if (event.target === elements.pointModal) closePointModal();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeAllModals();
  });

  elements.circuitForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var voltage = Number(elements.circuitVoltage.value);
    var phase = engine.suggestPhaseAssignment(circuits, currentSupply(), voltage);

    if (!phase) {
      toast('A tensão selecionada não é compatível com a alimentação informada.');
      return;
    }

    circuits.push({
      id: Date.now(),
      name: document.getElementById('circuit-label').value.trim(),
      category: document.getElementById('circuit-category').value,
      voltage: voltage,
      power: Number(document.getElementById('circuit-power').value),
      phase: phase,
      powerSource: 'manual'
    });
    closeCircuitModal();
    render();
    toast('Circuito incluído em ' + phase + '. A seleção de proteção e condutor continua pendente de dados técnicos.');
  });

  elements.pointCircuitForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var result = engine.createCircuitFromPoints({
      id: 'circuit-' + Date.now(),
      name: document.getElementById('point-circuit-name').value.trim(),
      category: document.getElementById('point-circuit-category').value,
      pointIds: selectedPointIdsForCircuit()
    }, points, circuits, currentSupply());

    if (!result.valid) {
      if (result.issues.some(function (issue) { return issue.code === 'mixed-point-voltages'; })) {
        toast('Os pontos selecionados têm tensões diferentes. Crie circuitos separados.');
      } else if (result.issues.some(function (issue) { return issue.code === 'selected-point-already-linked'; })) {
        toast('Um ponto selecionado já pertence a outro circuito. Revise os vínculos.');
      } else {
        toast('Informe o nome, a categoria e ao menos um ponto disponível para criar o circuito.');
      }
      return;
    }

    circuits.push(result.circuit);
    closePointCircuitModal();
    render();
    toast('Circuito criado com ' + result.circuit.pointIds.length + ' ponto(s) e fase ' + result.circuit.phase + '. Revise antes de executar.');
  });

  elements.installationCircuit.addEventListener('change', fillInstallationForm);

  elements.installationForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var circuit = selectedInstallationCircuit();
    if (!circuit) {
      toast('Selecione um circuito para registrar os dados de instalação.');
      return;
    }

    var validation = engine.validateInstallationData({
      installationMethod: elements.installationMethod.value,
      conductorMaterial: elements.installationConductorMaterial.value,
      lengthM: elements.installationLength.value,
      ambientTemperatureC: elements.installationTemperature.value,
      groupingCount: elements.installationGrouping.value,
      protectionContext: elements.installationProtectionContext.value
    });

    if (!validation.valid) {
      var issues = validation.invalidInputs.length ? validation.invalidInputs : validation.missingInputs;
      toast('Confira os dados de instalação: ' + issues.join(', ') + '.');
      return;
    }

    circuit.installation = validation.installation;
    closeInstallationModal();
    render();
    toast('Dados do circuito registrados. Condutor e proteção continuam bloqueados até a validação das regras técnicas.');
  });

  elements.roomForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var areaInput = document.getElementById('room-area').value;
    var room = {
      id: 'room-' + Date.now(),
      name: document.getElementById('room-name').value.trim(),
      type: document.getElementById('room-type').value,
      areaM2: areaInput === '' ? null : Number(areaInput)
    };
    var validation = engine.validateRoom(room);

    if (!validation.valid) {
      toast('Informe um nome de ambiente e, se houver área, use um valor maior que zero.');
      return;
    }

    rooms.push(validation.room);
    closeRoomModal();
    render();
    toast('Ambiente adicionado. Agora cadastre seus pontos elétricos previstos.');
  });

  elements.pointForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var point = {
      id: 'point-' + Date.now(),
      roomId: elements.pointRoom.value,
      type: document.getElementById('point-type').value,
      description: document.getElementById('point-description').value.trim(),
      power: Number(document.getElementById('point-power').value),
      voltage: Number(elements.pointVoltage.value)
    };
    var validation = engine.validatePoint(point, rooms, currentSupply());

    if (!validation.valid) {
      toast('Confira ambiente, tipo, descrição, potência e tensão antes de adicionar o ponto.');
      return;
    }

    points.push(validation.point);
    closePointModal();
    render();
    toast('Ponto adicionado ao inventário. A criação do circuito continuará sendo uma decisão revisável.');
  });

  elements.projectName.addEventListener('input', function () {
    renderProjectTitle();
    saveProjectState();
  });
  elements.boardSize.addEventListener('change', function () {
    renderBoard();
    saveProjectState();
  });
  elements.supplyType.addEventListener('change', function () {
    var requestedSupply = elements.supplyType.value;
    var circuitValidation = engine.validateCircuitsForSupply(circuits, requestedSupply);
    var inventoryValidation = engine.validateProjectInventory(rooms, points, requestedSupply);
    var traceabilityValidation = engine.validatePointCircuitLinks(circuits, points);

    if (!circuitValidation.valid || !inventoryValidation.valid || !traceabilityValidation.valid) {
      elements.supplyType.value = activeSupplyKey;
      toast('A mudança exige revisar circuitos, fases, pontos ou vínculos atuais; nenhum dado foi alterado automaticamente.');
      return;
    }

    activeSupplyKey = requestedSupply;
    updateVoltageOptions();
    render();
    toast('Alimentação atualizada. Confira as premissas do projeto.');
  });

  document.querySelectorAll('.nav-button[data-message]').forEach(function (button) {
    button.addEventListener('click', function () {
      document.querySelectorAll('.nav-button').forEach(function (item) { item.classList.remove('active'); });
      button.classList.add('active');
      toast(button.getAttribute('data-message'));
    });
  });

  updateRoomOptions();
  updateVoltageOptions();
  render();
}());
