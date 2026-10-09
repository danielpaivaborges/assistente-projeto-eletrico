const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('./electrical-engine.js');

test('calcula corrente nominal a partir de potência e tensão', () => {
  assert.equal(engine.calculateCurrent(2200, 220), 10);
  assert.equal(engine.calculateCurrent(1270, 127), 10);
  assert.equal(engine.calculateCurrent(0, 127), null);
  assert.equal(engine.calculateCurrent(1000, 0), null);
});

test('soma correntes nas fases informadas sem inventar atribuições', () => {
  const result = engine.calculatePhaseLoads([
    { id: 1, power: 1270, voltage: 127, phase: 'A' },
    { id: 2, power: 4400, voltage: 220, phase: 'AB' },
    { id: 3, power: 635, voltage: 127, phase: 'C' }
  ], ['A', 'B', 'C']);

  assert.deepEqual(result.phaseLoads, { A: 30, B: 20, C: 5 });
  assert.equal(result.warnings.length, 0);
  assert.equal(result.imbalance.differenceA, 25);
});

test('equilibra apenas circuitos monofásicos e preserva cargas entre fases', () => {
  const result = engine.balanceSinglePhaseCircuits([
    { id: 'duplo', power: 4400, voltage: 220, phase: 'AB' },
    { id: 'luz', power: 1270, voltage: 127, phase: 'A' },
    { id: 'tomadas', power: 635, voltage: 127, phase: 'B' }
  ], ['A', 'B', 'C']);

  const locked = result.circuits.find((circuit) => circuit.id === 'duplo');

  assert.equal(locked.phase, 'AB');
  assert.deepEqual(result.phaseLoads, { A: 20, B: 20, C: 15 });
  assert.deepEqual(result.movedCircuitIds.sort(), ['luz', 'tomadas']);
});

test('impede uma mudança de alimentação que deixaria circuitos incompatíveis', () => {
  const validation = engine.validateCircuitsForSupply([
    { id: 'c1', power: 1000, voltage: 127, phase: 'C' },
    { id: 'c2', power: 4400, voltage: 220, phase: 'AB' }
  ], 'two-127-220');

  assert.equal(validation.valid, false);
  assert.deepEqual(validation.issues, [{ circuitId: 'c1', code: 'phase-not-available-in-supply' }]);
});

test('não oferece dimensionamento de condutor sem dados de instalação', () => {
  const readiness = engine.getSizingReadiness({ power: 2200, voltage: 220, phase: 'AB' });

  assert.equal(readiness.currentA, 10);
  assert.equal(readiness.status, 'pending-installation-data');
  assert.ok(readiness.missingInputs.includes('método de instalação'));
});

test('valida ambiente e ponto antes de usar os dados no projeto', () => {
  const room = engine.validateRoom({ id: 'sala', name: 'Sala', type: 'Sala', areaM2: 18 });
  const point = engine.validatePoint({
    id: 'tv',
    roomId: 'sala',
    type: 'Tomada de uso geral',
    description: 'TV e rack',
    power: 280,
    voltage: 127
  }, [room.room], 'three-127-220');

  assert.equal(room.valid, true);
  assert.equal(point.valid, true);
  assert.equal(point.point.power, 280);
});

test('resume ambientes, pontos e potência prevista sem inferir requisitos normativos', () => {
  const summary = engine.summarizeProjectInventory([
    { id: 'sala', name: 'Sala', type: 'Sala' },
    { id: 'banheiro', name: 'Banheiro', type: 'Banheiro' }
  ], [
    { id: 'luz-sala', roomId: 'sala', type: 'Iluminação', description: 'Luminária central', power: 24, voltage: 127 },
    { id: 'rack', roomId: 'sala', type: 'Tomada de uso geral', description: 'TV e rack', power: 280, voltage: 127 },
    { id: 'chuveiro', roomId: 'banheiro', type: 'Chuveiro', description: 'Chuveiro elétrico', power: 6800, voltage: 220 }
  ]);

  assert.deepEqual(summary.totals, {
    roomCount: 2,
    pointCount: 3,
    plannedPowerW: 7104,
    unassignedPointCount: 0
  });
  assert.equal(summary.rooms[0].pointCount, 2);
  assert.equal(summary.rooms[1].plannedPowerW, 6800);
});

test('bloqueia inventário com ponto incompatível com a alimentação escolhida', () => {
  const validation = engine.validateProjectInventory([
    { id: 'sala', name: 'Sala', type: 'Sala' }
  ], [
    { id: 'tv', roomId: 'sala', type: 'Tomada de uso geral', description: 'TV', power: 280, voltage: 127 }
  ], 'three-220-380');

  assert.equal(validation.valid, false);
  assert.deepEqual(validation.issues, [{
    entity: 'point',
    entityId: 'tv',
    code: 'point-voltage-not-available-in-supply'
  }]);
});

test('cria circuito rastreável a partir de pontos da mesma tensão', () => {
  const points = [
    { id: 'luz-sala', roomId: 'sala', type: 'Iluminação', description: 'Luminária sala', power: 60, voltage: 127 },
    { id: 'luz-quarto', roomId: 'quarto', type: 'Iluminação', description: 'Luminária quarto', power: 40, voltage: 127 }
  ];
  const result = engine.createCircuitFromPoints({
    id: 'iluminacao',
    name: 'Iluminação social',
    category: 'Iluminação',
    pointIds: ['luz-sala', 'luz-quarto']
  }, points, [], 'three-127-220');

  assert.equal(result.valid, true);
  assert.deepEqual(result.circuit, {
    id: 'iluminacao',
    name: 'Iluminação social',
    category: 'Iluminação',
    pointIds: ['luz-sala', 'luz-quarto'],
    power: 100,
    voltage: 127,
    phase: 'A',
    powerSource: 'linked-points'
  });
});

test('não cria circuito misturando pontos de tensões diferentes', () => {
  const result = engine.createCircuitFromPoints({
    id: 'misto',
    name: 'Carga mista',
    category: 'Outra carga',
    pointIds: ['tv', 'chuveiro']
  }, [
    { id: 'tv', power: 300, voltage: 127 },
    { id: 'chuveiro', power: 6800, voltage: 220 }
  ], [], 'three-127-220');

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === 'mixed-point-voltages'));
});

test('detecta ponto vinculado a mais de um circuito', () => {
  const circuits = [
    { id: 'c1', powerSource: 'linked-points', pointIds: ['luz'], power: 60, voltage: 127 },
    { id: 'c2', powerSource: 'linked-points', pointIds: ['luz'], power: 60, voltage: 127 }
  ];
  const validation = engine.validatePointCircuitLinks(circuits, [
    { id: 'luz', power: 60, voltage: 127 }
  ]);

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === 'point-linked-to-multiple-circuits'));
});

test('valida os dados físicos mínimos antes de liberar regras técnicas', () => {
  const validation = engine.validateInstallationData({
    installationMethod: 'Eletroduto embutido',
    conductorMaterial: 'Cobre',
    ambientTemperatureC: 30,
    groupingCount: 1,
    lengthM: 18.5,
    protectionContext: 'Proteção a definir no projeto executivo'
  });

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.installation, {
    installationMethod: 'Eletroduto embutido',
    conductorMaterial: 'Cobre',
    ambientTemperatureC: 30,
    groupingCount: 1,
    lengthM: 18.5,
    protectionContext: 'Proteção a definir no projeto executivo'
  });
});

test('resume a prontidão de instalação de cada circuito', () => {
  const summary = engine.summarizeInstallationReadiness([
    {
      id: 'pronto', power: 2200, voltage: 220,
      installation: {
        installationMethod: 'Eletroduto embutido',
        conductorMaterial: 'Cobre',
        ambientTemperatureC: 30,
        groupingCount: 1,
        lengthM: 18,
        protectionContext: 'Proteção a definir no projeto executivo'
      }
    },
    { id: 'pendente', power: 1000, voltage: 127 },
    {
      id: 'invalido', power: 1000, voltage: 127,
      installation: {
        installationMethod: 'Canaleta',
        conductorMaterial: 'Cobre',
        ambientTemperatureC: 30,
        groupingCount: 0,
        lengthM: 8,
        protectionContext: 'Circuito terminal'
      }
    }
  ]);

  assert.deepEqual(summary.totals, { circuitCount: 3, readyCount: 1, pendingCount: 1, invalidCount: 1 });
  assert.equal(summary.byCircuitId.pronto.status, 'ready-for-rule-evaluation');
  assert.equal(summary.byCircuitId.invalido.status, 'invalid-installation-data');
});

test('organiza uma revisão do anteprojeto sem aplicar critérios normativos', () => {
  const review = engine.summarizeProjectReview([
    {
      id: 'luz', name: 'Iluminação social', power: 100, voltage: 127, phase: 'A',
      powerSource: 'linked-points', pointIds: ['luz-sala'],
      installation: {
        installationMethod: 'Eletroduto embutido',
        conductorMaterial: 'Cobre',
        ambientTemperatureC: 30,
        groupingCount: 1,
        lengthM: 10,
        protectionContext: 'Circuito terminal'
      }
    },
    { id: 'manual', name: 'Reserva', power: 800, voltage: 127, phase: 'B' }
  ], [
    { id: 'sala', name: 'Sala', type: 'Sala' }
  ], [
    { id: 'luz-sala', roomId: 'sala', type: 'Iluminação', description: 'Luminária sala', power: 100, voltage: 127 },
    { id: 'rack', roomId: 'sala', type: 'Tomada de uso geral', description: 'TV e rack', power: 300, voltage: 127 }
  ], 'three-127-220');

  assert.deepEqual(review.totals, {
    circuitCount: 2,
    pointCount: 2,
    linkedPointCount: 1,
    unlinkedPointCount: 1,
    installationReadyCount: 1,
    conflictCount: 0,
    pendingCount: 2,
    manualCircuitCount: 1,
    openItemCount: 2
  });
  assert.ok(review.items.some((item) => item.code === 'point-without-circuit' && item.title === 'TV e rack'));
  assert.ok(review.items.some((item) => item.code === 'installation-data-pending' && item.title === 'Reserva'));
  assert.ok(review.items.some((item) => item.code === 'manual-circuit-entry' && item.title === 'Reserva'));
});

test('recalcula um circuito rastreável quando a potência de um ponto vinculado é editada', () => {
  const rooms = [{ id: 'sala', name: 'Sala', type: 'Sala' }];
  const points = [
    { id: 'luz', roomId: 'sala', type: 'Iluminação', description: 'Luz', power: 60, voltage: 127 },
    { id: 'rack', roomId: 'sala', type: 'Tomada de uso geral', description: 'Rack', power: 120, voltage: 127 }
  ];
  const circuits = [{
    id: 'social', name: 'Circuito social', category: 'Iluminação', powerSource: 'linked-points',
    pointIds: ['luz', 'rack'], power: 180, voltage: 127, phase: 'A'
  }];

  const result = engine.updatePointInProject({
    id: 'luz', roomId: 'sala', type: 'Iluminação', description: 'Luz principal', power: 90, voltage: 127
  }, points, circuits, rooms, 'three-127-220');

  assert.equal(result.valid, true);
  assert.equal(result.point.description, 'Luz principal');
  assert.equal(result.circuits[0].power, 210);
  assert.equal(result.circuits[0].voltage, 127);
  assert.equal(result.circuits[0].phase, 'A');
  assert.deepEqual(result.affectedCircuitIds, ['social']);
  assert.equal(engine.validatePointCircuitLinks(result.circuits, result.points).valid, true);
});

test('preserva a derivação de carga ao editar rótulos de circuito criado por pontos', () => {
  const circuits = [{
    id: 'luz', name: 'Iluminação', category: 'Iluminação', powerSource: 'linked-points',
    pointIds: ['p1'], power: 80, voltage: 127, phase: 'B'
  }];

  const result = engine.updateCircuitInProject({
    id: 'luz', name: 'Iluminação revisada', category: 'Carga especial', power: 9999, voltage: 220
  }, circuits, [{ id: 'p1', power: 80, voltage: 127 }], 'three-127-220');

  assert.equal(result.valid, true);
  assert.equal(result.circuit.name, 'Iluminação revisada');
  assert.equal(result.circuit.category, 'Carga especial');
  assert.equal(result.circuit.power, 80);
  assert.equal(result.circuit.voltage, 127);
  assert.equal(result.circuit.phase, 'B');
  assert.deepEqual(result.lockedFields, ['power', 'voltage', 'phase', 'pointIds']);
});

test('permite editar circuito manual e preserva uma fase já compatível', () => {
  const result = engine.updateCircuitInProject({
    id: 'manual', name: 'TUG revisada', category: 'Tomadas de uso geral', power: 1450, voltage: 127
  }, [{ id: 'manual', name: 'TUG', category: 'Tomadas de uso geral', power: 1200, voltage: 127, phase: 'C' }], [], 'three-127-220');

  assert.equal(result.valid, true);
  assert.equal(result.circuit.power, 1450);
  assert.equal(result.circuit.phase, 'C');
  assert.equal(result.circuit.powerSource, 'manual');
});

test('bloqueia exclusões que romperiam ambiente ou ponto rastreável', () => {
  const rooms = [{ id: 'banheiro', name: 'Banheiro', type: 'Banheiro' }];
  const points = [{ id: 'chuveiro', roomId: 'banheiro', type: 'Chuveiro', description: 'Chuveiro', power: 6800, voltage: 220 }];
  const circuits = [{
    id: 'chuveiro', name: 'Chuveiro', category: 'Chuveiro', powerSource: 'linked-points',
    pointIds: ['chuveiro'], power: 6800, voltage: 220, phase: 'AB'
  }];

  const roomBlocked = engine.removeRoomFromProject('banheiro', rooms, points);
  const pointBlocked = engine.removePointFromProject('chuveiro', points, circuits);
  const circuitRemoved = engine.removeCircuitFromProject('chuveiro', circuits);
  const pointRemoved = engine.removePointFromProject('chuveiro', points, circuitRemoved.circuits);
  const roomRemoved = engine.removeRoomFromProject('banheiro', rooms, pointRemoved.points);

  assert.equal(roomBlocked.valid, false);
  assert.equal(roomBlocked.issues[0].code, 'room-has-points');
  assert.equal(pointBlocked.valid, false);
  assert.equal(pointBlocked.issues[0].code, 'point-linked-to-circuit');
  assert.equal(circuitRemoved.valid, true);
  assert.deepEqual(circuitRemoved.releasedPointIds, ['chuveiro']);
  assert.equal(pointRemoved.valid, true);
  assert.equal(roomRemoved.valid, true);
});
