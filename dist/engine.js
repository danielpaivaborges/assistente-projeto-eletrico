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

  var ENGINE_VERSION = '0.3.0-preliminar';
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

  function normalizedText(value) {
    return String(value === undefined || value === null ? '' : value).trim();
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

  function validateRoom(room) {
    var source = room || {};
    var name = normalizedText(source.name);
    var type = normalizedText(source.type) || 'Outro ambiente';
    var hasArea = source.areaM2 !== undefined && source.areaM2 !== null && source.areaM2 !== '';
    var area = hasArea ? positiveNumber(source.areaM2) : null;
    var issues = [];

    if (!name) issues.push({ code: 'missing-room-name' });
    if (hasArea && area === null) issues.push({ code: 'invalid-room-area' });

    return {
      valid: issues.length === 0,
      issues: issues,
      room: Object.assign({}, source, {
        name: name,
        type: type,
        areaM2: area
      }),
      rulesetVersion: ENGINE_VERSION
    };
  }

  function validatePoint(point, rooms, supply) {
    var source = point || {};
    var description = normalizedText(source.description);
    var type = normalizedText(source.type);
    var roomId = source.roomId;
    var power = positiveNumber(source.power);
    var voltage = positiveNumber(source.voltage);
    var knownRoom = (rooms || []).some(function (room) { return room && room.id === roomId; });
    var issues = [];

    if (!roomId || !knownRoom) issues.push({ code: 'point-room-not-found' });
    if (!type) issues.push({ code: 'missing-point-type' });
    if (!description) issues.push({ code: 'missing-point-description' });
    if (power === null) issues.push({ code: 'invalid-point-power' });
    if (voltage === null) issues.push({ code: 'invalid-point-voltage' });

    if (supply && voltage !== null && getSupportedVoltages(supply).indexOf(voltage) === -1) {
      issues.push({ code: 'point-voltage-not-available-in-supply' });
    }

    return {
      valid: issues.length === 0,
      issues: issues,
      point: Object.assign({}, source, {
        description: description,
        type: type,
        power: power,
        voltage: voltage
      }),
      rulesetVersion: ENGINE_VERSION
    };
  }

  function validateProjectInventory(rooms, points, supply) {
    var roomIds = [];
    var issues = [];
    var normalizedRooms = (rooms || []).map(function (room, index) {
      var validation = validateRoom(room);
      var roomId = room && room.id !== undefined ? room.id : index;

      validation.issues.forEach(function (issue) {
        issues.push({ entity: 'room', entityId: roomId, code: issue.code });
      });

      if (!room || room.id === undefined || room.id === null || room.id === '') {
        issues.push({ entity: 'room', entityId: roomId, code: 'missing-room-id' });
      } else if (roomIds.indexOf(room.id) !== -1) {
        issues.push({ entity: 'room', entityId: room.id, code: 'duplicate-room-id' });
      } else {
        roomIds.push(room.id);
      }

      return validation.room;
    });

    (points || []).forEach(function (point, index) {
      var validation = validatePoint(point, normalizedRooms, supply);
      var pointId = point && point.id !== undefined ? point.id : index;

      validation.issues.forEach(function (issue) {
        issues.push({ entity: 'point', entityId: pointId, code: issue.code });
      });
    });

    return {
      valid: issues.length === 0,
      issues: issues,
      rulesetVersion: ENGINE_VERSION
    };
  }

  function summarizeProjectInventory(rooms, points) {
    var roomSummaries = (rooms || []).map(function (room, index) {
      var validation = validateRoom(room);
      var roomId = room && room.id !== undefined ? room.id : index;
      var roomPoints = [];

      (points || []).forEach(function (point) {
        if (point && point.roomId === roomId) roomPoints.push(point);
      });

      var pointTypes = {};
      var plannedPowerW = 0;

      roomPoints.forEach(function (point) {
        var pointValidation = validatePoint(point, rooms);
        var key = normalizedText(point.type) || 'Sem tipo';

        pointTypes[key] = (pointTypes[key] || 0) + 1;
        if (pointValidation.point.power !== null) plannedPowerW += pointValidation.point.power;
      });

      return {
        id: roomId,
        name: validation.room.name || 'Ambiente sem nome',
        type: validation.room.type,
        areaM2: validation.room.areaM2,
        pointCount: roomPoints.length,
        plannedPowerW: plannedPowerW,
        pointTypes: pointTypes
      };
    });
    var knownRoomIds = roomSummaries.map(function (room) { return room.id; });
    var unassignedPoints = (points || []).filter(function (point) {
      return !point || knownRoomIds.indexOf(point.roomId) === -1;
    });
    var totals = roomSummaries.reduce(function (summary, room) {
      summary.plannedPowerW += room.plannedPowerW;
      summary.pointCount += room.pointCount;
      return summary;
    }, { roomCount: roomSummaries.length, pointCount: 0, plannedPowerW: 0, unassignedPointCount: unassignedPoints.length });

    return {
      rooms: roomSummaries,
      totals: totals,
      warnings: unassignedPoints.length ? [{ code: 'points-without-known-room', count: unassignedPoints.length }] : [],
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
    summarizeProjectInventory: summarizeProjectInventory,
    validateCircuitsForSupply: validateCircuitsForSupply,
    validatePoint: validatePoint,
    validateProjectInventory: validateProjectInventory,
    validateRoom: validateRoom
  };
}));
