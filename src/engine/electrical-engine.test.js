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
