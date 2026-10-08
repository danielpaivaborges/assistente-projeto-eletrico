(function () {
  'use strict';

  var engine = window.ElectricalEngine;

  if (!engine) {
    window.console.error('O motor técnico não foi carregado.');
    return;
  }

  var circuits = [
    { id: 1, name: 'Iluminação social', category: 'Iluminação', voltage: 127, power: 720, phase: 'A' },
    { id: 2, name: 'TUG quartos', category: 'Tomadas de uso geral', voltage: 127, power: 1200, phase: 'B' },
    { id: 3, name: 'TUG sala', category: 'Tomadas de uso geral', voltage: 127, power: 1000, phase: 'C' },
    { id: 4, name: 'Cozinha', category: 'Tomada de uso específico', voltage: 220, power: 3500, phase: 'AB' },
    { id: 5, name: 'Chuveiro', category: 'Chuveiro', voltage: 220, power: 6800, phase: 'BC' },
    { id: 6, name: 'Lavanderia', category: 'Tomada de uso específico', voltage: 127, power: 1500, phase: 'A' }
  ];

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
    modal: document.getElementById('circuit-modal'),
    toast: document.getElementById('toast'),
    form: document.getElementById('circuit-form'),
    projectName: document.getElementById('project-name'),
    projectTitle: document.getElementById('project-title'),
    supplyType: document.getElementById('supply-type'),
    boardSize: document.getElementById('board-size'),
    voltage: document.getElementById('circuit-voltage'),
    phaseCLegend: document.getElementById('phase-c-legend')
  };
  var activeSupplyKey = elements.supplyType.value;

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

  function phaseClass(phase) {
    if (phase === 'A') return 'phase-a';
    if (phase === 'B') return 'phase-b';
    if (phase === 'C') return 'phase-c';
    return 'phase-2p';
  }

  function phaseLoadResult() {
    return engine.calculatePhaseLoads(circuits, activePhases());
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
    elements.body.innerHTML = circuits.map(function (circuit) {
      var sizing = engine.getSizingReadiness(circuit);
      var phase = engine.getCircuitPhases(circuit).join('') || '—';
      var currentDescription = sizing.currentA === null
        ? sizing.label
        : formatCurrent(sizing.currentA) + ' estimados · ' + sizing.label;

      return '<tr>' +
        '<td><span class="circuit-name">' + escapeHtml(circuit.name) + '</span><span class="circuit-meta">' + escapeHtml(circuit.category) + '</span></td>' +
        '<td>' + formatPower(circuit.power) + '</td>' +
        '<td>' + circuit.voltage + ' V</td>' +
        '<td><span class="phase-badge ' + phaseClass(phase) + '">' + escapeHtml(phase) + '</span></td>' +
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

  function render() {
    renderProjectTitle();
    renderCircuits();
    renderMetrics();
    renderBalance();
    renderBoard();
    renderMaterials();
  }

  function toast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    toastTimer = window.setTimeout(function () { elements.toast.classList.remove('visible'); }, 3600);
  }

  function openModal() {
    elements.modal.classList.add('open');
    window.setTimeout(function () { document.getElementById('circuit-label').focus(); }, 60);
  }

  function closeModal() {
    elements.modal.classList.remove('open');
    elements.form.reset();
    updateVoltageOptions();
  }

  function updateVoltageOptions() {
    var supported = engine.getSupportedVoltages(currentSupply());
    var selected = Number(elements.voltage.value);

    elements.voltage.innerHTML = supported.map(function (voltage) {
      return '<option value="' + voltage + '">' + voltage + ' V</option>';
    }).join('');
    elements.voltage.value = supported.indexOf(selected) !== -1 ? String(selected) : String(supported[0]);
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

  document.getElementById('add-circuit-button').addEventListener('click', openModal);
  document.getElementById('add-circuit-secondary').addEventListener('click', openModal);
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-modal').addEventListener('click', closeModal);
  document.getElementById('balance-button').addEventListener('click', automaticBalance);
  document.getElementById('balance-secondary').addEventListener('click', automaticBalance);

  elements.modal.addEventListener('click', function (event) {
    if (event.target === elements.modal) closeModal();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeModal();
  });

  elements.form.addEventListener('submit', function (event) {
    event.preventDefault();

    var voltage = Number(elements.voltage.value);
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
      phase: phase
    });
    closeModal();
    render();
    toast('Circuito incluído em ' + phase + '. A seleção de proteção e condutor continua pendente de dados técnicos.');
  });

  elements.projectName.addEventListener('input', renderProjectTitle);
  elements.boardSize.addEventListener('change', renderBoard);
  elements.supplyType.addEventListener('change', function () {
    var requestedSupply = elements.supplyType.value;
    var validation = engine.validateCircuitsForSupply(circuits, requestedSupply);

    if (!validation.valid) {
      elements.supplyType.value = activeSupplyKey;
      toast('A mudança exige revisar circuitos e fases atuais; nenhum circuito foi alterado automaticamente.');
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

  updateVoltageOptions();
  render();
}());
