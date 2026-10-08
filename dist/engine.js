(function (root, factory) {
  'use strict';

  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.ElectricalEngine = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ENGINE_VERSION = '0.2.0-preliminar';
  var ALL_PHASES = ['A', 'B', 'C'];
  var SUPPLIES = {
    'three-127-220': {
      key: 'three-127-220',
      label: '127/220 V · trifásica',
      phases: ['A', 'B', 'C'],
      phaseToNeutralVoltage: 127,
      lineToLineVoltage: 220
    },
    'two-127-220': {
      key: 'two-127-220',
      label: '127/220 V · bifásica',
      phases: ['A', 'B'],
      phaseToNeutralVoltage: 127,
      lineToLineVoltage: 220
    },
    'three-220-380': {
      key: 'three-220-380',
      label: '220/380 V · trifásica',
      phases: ['A', 'B', 'C'],
      phaseToNeutralVoltage: 220,
      lineToLineVoltage: 380
    }
  };

  function positiveNumber(value) {
    var numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  function uniquePhases(value) {
    var raw = Array.isArray(value) ? value : String(value || '').split('');
    var phases = [];

    raw.forEach(function (item) {
      var phase = String(item).trim().toUpperCase();
      if (ALL_PHASES.indexOf(phase) !== -1 && phases.indexOf(phase) === -1) {
        phases.push(phase);
      }
    });

    return phases;
  }

  function normalizeAvailablePhases(phases) {
    var normalized = uniquePhases(phases);
    return normalized.length ? normalized : ALL_PHASES.slice();
  }

  function getSupplyProfile(value) {
    var key = typeof value === 'string' ? value : value && value.key;
    var profile = SUPPLIES[key] || SUPPLIES['three-127-220'];

    return {
      key: profile.key,
      label: profile.label,
      phases: profile.phases.slice(),
      phaseToNeutralVoltage: profile.phaseToNeutralVoltage,
      lineToLineVoltage: profile.lineToLineVoltage
    };
  }

  function getSupportedVoltages(supply) {
    var profile = getSupplyProfile(supply);
    return [profile.phaseToNeutralVoltage, profile.lineToLineVoltage]
      .filter(function (value, index, values) { return values.indexOf(value) === index; });
  }

  function calculateCurrent(powerW, voltageV) {
    var power = positiveNumber(powerW);
    var voltage = positiveNumber(voltageV);

    if (power === null || voltage === null) {
      return null;
    }

    return power / voltage;
  }

  function getCircuitPhases(circuit) {
    if (!circuit) return [];
    return uniquePhases(circuit.phases !== undefined ? circuit.phases : circuit.phase);
  }

  function getCircuitPoleCount(circuit) {
    var explicit = Number(circuit && circuit.poles);
    if (Number.isInteger(explicit) && explicit >= 1 && explicit <= 3) {
      return explicit;
    }

    return Math.max(1, getCircuitPhases(circuit).length);
  }

  function getConnectionPhaseCount(supply, voltage) {
    var profile = getSupplyProfile(supply);
    var numericVoltage = Number(voltage);

    if (numericVoltage === profile.phaseToNeutralVoltage) return 1;
    if (numericVoltage === profile.lineToLineVoltage) return 2;
    return null;
  }

  function getPhasePairs(phases) {
    var available = normalizeAvailablePhases(phases);
    var pairs = [];

    for (var first = 0; first < available.length; first += 1) {
      for (var second = first + 1; second < available.length; second += 1) {
        pairs.push([available[first], available[second]]);
      }
    }

    return pairs;
  }

  function calculateImbalance(loads, phases) {
    var available = normalizeAvailablePhases(phases);
    var values = available.map(function (phase) {
      return Number(loads && loads[phase]) || 0;
    });

    return {
      maxA: Math.max.apply(null, values),
      minA: Math.min.apply(null, values),
      differenceA: Math.max.apply(null, values) - Math.min.apply(null, values)
    };
  }

  function calculatePhaseLoads(circuits, phases) {
    var available = normalizeAvailablePhases(phases);
    var loads = {};
    var warnings = [];

    available.forEach(function (phase) { loads[phase] = 0; });

    (circuits || []).forEach(function (circuit, index) {
      var current = calculateCurrent(circuit && circuit.power, circuit && circuit.voltage);
      var circuitPhases = getCircuitPhases(circuit);
      var circuitId = circuit && circuit.id !== undefined ? circuit.id : index;

      if (current === null) {
        warnings.push({ circuitId: circuitId, code: 'invalid-current-input' });
        return;
      }

      if (!circuitPhases.length) {
        warnings.push({ circuitId: circuitId, code: 'missing-phase-assignment' });
        return;
      }

      if (circuitPhases.some(function (phase) { return available.indexOf(phase) === -1; })) {
        warnings.push({ circuitId: circuitId, code: 'phase-not-available-in-supply' });
        return;
      }

      circuitPhases.forEach(function (phase) {
        loads[phase] += current;
      });
    });

    return {
      phaseLoads: loads,
      phases: available,
      warnings: warnings,
      imbalance: calculateImbalance(loads, available),
      rulesetVersion: ENGINE_VERSION
    };
  }

  function compareCircuitCurrentDescending(first, second) {
    var secondCurrent = calculateCurrent(second.power, second.voltage) || 0;
    var firstCurrent = calculateCurrent(first.power, first.voltage) || 0;

    if (secondCurrent !== firstCurrent) return secondCurrent - firstCurrent;
    return String(first.id || first.name || '').localeCompare(String(second.id || second.name || ''));
  }

  function balanceSinglePhaseCircuits(circuits, phases) {
    var available = normalizeAvailablePhases(phases);
    var copiedCircuits = (circuits || []).map(function (circuit) {
      return Object.assign({}, circuit, Array.isArray(circuit.phases) ? { phases: circuit.phases.slice() } : {});
    });
    var movable = [];
    var locked = [];
    var warnings = [];

    copiedCircuits.forEach(function (circuit, index) {
      var current = calculateCurrent(circuit.power, circuit.voltage);
      var circuitPhases = getCircuitPhases(circuit);

      if (current === null) {
        warnings.push({ circuitId: circuit.id !== undefined ? circuit.id : index, code: 'invalid-current-input' });
        locked.push(circuit);
        return;
      }

      if (circuitPhases.length <= 1) {
        movable.push(circuit);
      } else {
        locked.push(circuit);
      }
    });

    var lockedLoads = calculatePhaseLoads(locked, available);
    var loads = Object.assign({}, lockedLoads.phaseLoads);
    var movedCircuitIds = [];

    warnings = warnings.concat(lockedLoads.warnings);
    movable.sort(compareCircuitCurrentDescending).forEach(function (circuit) {
      var previousAssignment = getCircuitPhases(circuit).join('');
      var target = available.slice().sort(function (first, second) {
        if (loads[first] !== loads[second]) return loads[first] - loads[second];
        return first.localeCompare(second);
      })[0];
      var current = calculateCurrent(circuit.power, circuit.voltage);

      circuit.phase = target;
      if (Array.isArray(circuit.phases)) circuit.phases = [target];
      loads[target] += current;

      if (previousAssignment !== target) {
        movedCircuitIds.push(circuit.id);
      }
    });

    return {
      circuits: copiedCircuits,
      phaseLoads: loads,
      phases: available,
      movedCircuitIds: movedCircuitIds,
      warnings: warnings,
      imbalance: calculateImbalance(loads, available),
      rulesetVersion: ENGINE_VERSION,
      status: 'preliminary'
    };
  }

  function suggestPhaseAssignment(circuits, supply, voltage) {
    var profile = getSupplyProfile(supply);
    var connectionPhaseCount = getConnectionPhaseCount(profile, voltage);
    var phaseLoadResult = calculatePhaseLoads(circuits, profile.phases);
    var loads = phaseLoadResult.phaseLoads;

    if (connectionPhaseCount === 1) {
      return profile.phases.slice().sort(function (first, second) {
        if (loads[first] !== loads[second]) return loads[first] - loads[second];
        return first.localeCompare(second);
      })[0];
    }

    if (connectionPhaseCount === 2) {
      var pair = getPhasePairs(profile.phases).sort(function (first, second) {
        var firstLoad = loads[first[0]] + loads[first[1]];
        var secondLoad = loads[second[0]] + loads[second[1]];
        if (firstLoad !== secondLoad) return firstLoad - secondLoad;
        return first.join('').localeCompare(second.join(''));
      })[0];
      return pair ? pair.join('') : null;
    }

    return null;
  }

  function validateCircuitsForSupply(circuits, supply) {
    var profile = getSupplyProfile(supply);
    var supportedVoltages = getSupportedVoltages(profile);
    var issues = [];

    (circuits || []).forEach(function (circuit, index) {
      var circuitId = circuit && circuit.id !== undefined ? circuit.id : index;
      var circuitPhases = getCircuitPhases(circuit);
      var expectedPhaseCount = getConnectionPhaseCount(profile, circuit && circuit.voltage);

      if (supportedVoltages.indexOf(Number(circuit && circuit.voltage)) === -1) {
        issues.push({ circuitId: circuitId, code: 'voltage-not-available-in-supply' });
      }

      if (!circuitPhases.length || circuitPhases.some(function (phase) { return profile.phases.indexOf(phase) === -1; })) {
        issues.push({ circuitId: circuitId, code: 'phase-not-available-in-supply' });
      } else if (expectedPhaseCount !== null && circuitPhases.length !== expectedPhaseCount) {
        issues.push({ circuitId: circuitId, code: 'connection-does-not-match-voltage' });
      }
    });

    return {
      valid: issues.length === 0,
      issues: issues,
      profile: profile,
      rulesetVersion: ENGINE_VERSION
    };
  }

  function getSizingReadiness(circuit) {
    var current = calculateCurrent(circuit && circuit.power, circuit && circuit.voltage);
    var installation = circuit && circuit.installation ? circuit.installation : {};
    var requiredInputs = [
      { key: 'installationMethod', label: 'método de instalação' },
      { key: 'conductorMaterial', label: 'material do condutor' },
      { key: 'ambientTemperatureC', label: 'temperatura ambiente' },
      { key: 'groupingCount', label: 'agrupamento de circuitos' },
      { key: 'lengthM', label: 'comprimento do trajeto' },
      { key: 'protectionContext', label: 'condições de proteção' }
    ];
    var missing = requiredInputs
      .filter(function (input) { return installation[input.key] === undefined || installation[input.key] === null || installation[input.key] === ''; })
      .map(function (input) { return input.label; });

    return {
      currentA: current,
      status: current === null ? 'invalid-input' : (missing.length ? 'pending-installation-data' : 'ready-for-rule-evaluation'),
      label: current === null ? 'potência ou tensão inválida' : (missing.length ? 'dados de instalação pendentes' : 'pronto para regras validadas'),
      missingInputs: missing,
      rulesetVersion: ENGINE_VERSION
    };
  }

  return {
    ENGINE_VERSION: ENGINE_VERSION,
    calculateCurrent: calculateCurrent,
    calculateImbalance: calculateImbalance,
    calculatePhaseLoads: calculatePhaseLoads,
    balanceSinglePhaseCircuits: balanceSinglePhaseCircuits,
    getCircuitPhases: getCircuitPhases,
    getCircuitPoleCount: getCircuitPoleCount,
    getConnectionPhaseCount: getConnectionPhaseCount,
    getSupplyProfile: getSupplyProfile,
    getSupportedVoltages: getSupportedVoltages,
    getSizingReadiness: getSizingReadiness,
    suggestPhaseAssignment: suggestPhaseAssignment,
    validateCircuitsForSupply: validateCircuitsForSupply
  };
}));
