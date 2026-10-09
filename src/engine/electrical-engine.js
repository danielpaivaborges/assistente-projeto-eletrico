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

  var ENGINE_VERSION = '0.6.0-preliminar';
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

  function finiteNumber(value) {
    var numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
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

  function hasInputValue(value) {
    return value !== undefined && value !== null && normalizedText(value) !== '';
  }

  function validateInstallationData(installation) {
    var source = installation || {};
    var fields = [
      { key: 'installationMethod', label: 'método de instalação', kind: 'text' },
      { key: 'conductorMaterial', label: 'material do condutor', kind: 'text' },
      { key: 'ambientTemperatureC', label: 'temperatura ambiente', kind: 'number' },
      { key: 'groupingCount', label: 'agrupamento de circuitos', kind: 'positive-integer' },
      { key: 'lengthM', label: 'comprimento do trajeto', kind: 'positive-number' },
      { key: 'protectionContext', label: 'condições de proteção', kind: 'text' }
    ];
    var missingInputs = [];
    var invalidInputs = [];
    var normalized = {};

    fields.forEach(function (field) {
      var value = source[field.key];

      if (!hasInputValue(value)) {
        missingInputs.push(field.label);
        return;
      }

      if (field.kind === 'text') {
        normalized[field.key] = normalizedText(value);
        return;
      }

      if (field.kind === 'number') {
        var numeric = finiteNumber(value);
        if (numeric === null) invalidInputs.push(field.label);
        else normalized[field.key] = numeric;
        return;
      }

      if (field.kind === 'positive-number') {
        var positive = positiveNumber(value);
        if (positive === null) invalidInputs.push(field.label);
        else normalized[field.key] = positive;
        return;
      }

      var integer = Number(value);
      if (!Number.isInteger(integer) || integer < 1) invalidInputs.push(field.label);
      else normalized[field.key] = integer;
    });

    return {
      valid: missingInputs.length === 0 && invalidInputs.length === 0,
      missingInputs: missingInputs,
      invalidInputs: invalidInputs,
      installation: normalized,
      rulesetVersion: ENGINE_VERSION
    };
  }

  function getSizingReadiness(circuit) {
    var current = calculateCurrent(circuit && circuit.power, circuit && circuit.voltage);
    var installationValidation = validateInstallationData(circuit && circuit.installation);
    var status = 'ready-for-rule-evaluation';
    var label = 'pronto para regras validadas';

    if (current === null) {
      status = 'invalid-input';
      label = 'potência ou tensão inválida';
    } else if (installationValidation.missingInputs.length) {
      status = 'pending-installation-data';
      label = 'dados de instalação pendentes';
    } else if (installationValidation.invalidInputs.length) {
      status = 'invalid-installation-data';
      label = 'dados de instalação inválidos';
    }

    return {
      currentA: current,
      status: status,
      label: label,
      missingInputs: installationValidation.missingInputs,
      invalidInputs: installationValidation.invalidInputs,
      installation: installationValidation.installation,
      rulesetVersion: ENGINE_VERSION
    };
  }

  function summarizeInstallationReadiness(circuits) {
    var summaries = (circuits || []).map(function (circuit, index) {
      var circuitId = circuit && circuit.id !== undefined ? circuit.id : index;
      var readiness = getSizingReadiness(circuit);

      return {
        circuitId: circuitId,
        status: readiness.status,
        missingInputs: readiness.missingInputs,
        invalidInputs: readiness.invalidInputs,
        installation: readiness.installation
      };
    });
    var totals = summaries.reduce(function (summary, item) {
      if (item.status === 'ready-for-rule-evaluation') summary.readyCount += 1;
      else if (item.status === 'invalid-installation-data' || item.status === 'invalid-input') summary.invalidCount += 1;
      else summary.pendingCount += 1;
      return summary;
    }, { circuitCount: summaries.length, readyCount: 0, pendingCount: 0, invalidCount: 0 });

    return {
      circuits: summaries,
      byCircuitId: summaries.reduce(function (index, item) {
        index[item.circuitId] = item;
        return index;
      }, {}),
      totals: totals,
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

  function uniqueIds(values) {
    var ids = [];

    (Array.isArray(values) ? values : []).forEach(function (value) {
      if (value === undefined || value === null || value === '') return;
      if (ids.indexOf(value) === -1) ids.push(value);
    });

    return ids;
  }

  function getPointCircuitTraceability(circuits, points) {
    var pointById = {};
    var pointLinks = {};
    var circuitSummaries = [];
    var warnings = [];

    (points || []).forEach(function (point, index) {
      var pointId = point && point.id !== undefined ? point.id : index;
      pointById[pointId] = point;
      pointLinks[pointId] = [];
    });

    (circuits || []).forEach(function (circuit, index) {
      var circuitId = circuit && circuit.id !== undefined ? circuit.id : index;
      var rawPointIds = Array.isArray(circuit && circuit.pointIds) ? circuit.pointIds : [];
      var pointIds = uniqueIds(rawPointIds);
      var linkedPoints = [];
      var missingPointIds = [];
      var linkedPowerW = 0;

      if (rawPointIds.length !== pointIds.length) {
        warnings.push({ circuitId: circuitId, code: 'duplicate-point-in-circuit' });
      }

      pointIds.forEach(function (pointId) {
        var point = pointById[pointId];

        if (!point) {
          missingPointIds.push(pointId);
          return;
        }

        linkedPoints.push(point);
        pointLinks[pointId].push(circuitId);
        if (positiveNumber(point.power) !== null) linkedPowerW += Number(point.power);
      });

      if (missingPointIds.length) {
        warnings.push({ circuitId: circuitId, code: 'linked-point-not-found', pointIds: missingPointIds });
      }

      circuitSummaries.push({
        circuitId: circuitId,
        pointIds: pointIds,
        linkedPoints: linkedPoints,
        linkedPowerW: linkedPowerW,
        missingPointIds: missingPointIds,
        source: circuit && circuit.powerSource === 'linked-points' ? 'linked-points' : 'manual'
      });
    });

    Object.keys(pointLinks).forEach(function (pointId) {
      if (pointLinks[pointId].length > 1) {
        warnings.push({ pointId: pointId, code: 'point-linked-to-multiple-circuits', circuitIds: pointLinks[pointId].slice() });
      }
    });

    var byCircuitId = {};
    circuitSummaries.forEach(function (summary) { byCircuitId[summary.circuitId] = summary; });
    var unlinkedPointIds = Object.keys(pointLinks).filter(function (pointId) { return pointLinks[pointId].length === 0; });
    var totals = circuitSummaries.reduce(function (summary, circuit) {
      if (circuit.linkedPoints.length) summary.circuitsWithPoints += 1;
      else summary.manualCircuitCount += 1;
      return summary;
    }, {
      circuitCount: circuitSummaries.length,
      circuitsWithPoints: 0,
      manualCircuitCount: 0,
      linkedPointCount: Object.keys(pointLinks).filter(function (pointId) { return pointLinks[pointId].length > 0; }).length,
      unlinkedPointCount: unlinkedPointIds.length,
      duplicatePointCount: Object.keys(pointLinks).filter(function (pointId) { return pointLinks[pointId].length > 1; }).length
    });

    return {
      circuits: circuitSummaries,
      byCircuitId: byCircuitId,
      pointLinks: pointLinks,
      unlinkedPointIds: unlinkedPointIds,
      totals: totals,
      warnings: warnings,
      rulesetVersion: ENGINE_VERSION
    };
  }

  function validatePointCircuitLinks(circuits, points) {
    var traceability = getPointCircuitTraceability(circuits, points);
    var issues = traceability.warnings.slice();

    traceability.circuits.forEach(function (summary) {
      var circuit = (circuits || []).filter(function (item, index) {
        return (item && item.id !== undefined ? item.id : index) === summary.circuitId;
      })[0];
      var linkedVoltages = uniqueIds(summary.linkedPoints.map(function (point) { return point.voltage; }));

      if (!circuit || summary.source !== 'linked-points' || !summary.linkedPoints.length) return;

      if (Number(circuit.power) !== summary.linkedPowerW) {
        issues.push({ circuitId: summary.circuitId, code: 'linked-circuit-power-diverges-from-points' });
      }

      if (linkedVoltages.length !== 1 || Number(circuit.voltage) !== Number(linkedVoltages[0])) {
        issues.push({ circuitId: summary.circuitId, code: 'linked-circuit-voltage-diverges-from-points' });
      }
    });

    return {
      valid: issues.length === 0,
      issues: issues,
      traceability: traceability,
      rulesetVersion: ENGINE_VERSION
    };
  }

  function getCircuitLabel(circuit, index) {
    var name = normalizedText(circuit && circuit.name);
    return name || 'Circuito ' + (index + 1);
  }

  function getPointLabel(point, index) {
    var description = normalizedText(point && point.description);
    return description || 'Ponto ' + (index + 1);
  }

  function summarizeProjectReview(circuits, rooms, points, supply) {
    var circuitList = circuits || [];
    var roomList = rooms || [];
    var pointList = points || [];
    var traceability = getPointCircuitTraceability(circuitList, pointList);
    var installation = summarizeInstallationReadiness(circuitList);
    var supplyValidation = validateCircuitsForSupply(circuitList, supply);
    var inventoryValidation = validateProjectInventory(roomList, pointList, supply);
    var linkValidation = validatePointCircuitLinks(circuitList, pointList);
    var circuitById = {};
    var pointById = {};
    var roomById = {};
    var names = {};
    var items = [];

    function addItem(item) {
      items.push(item);
    }

    function circuitLabelFor(id) {
      var record = circuitById[id];
      return record ? record.label : 'Circuito não localizado';
    }

    function pointLabelFor(id) {
      var record = pointById[id];
      return record ? record.label : 'Ponto não localizado';
    }

    circuitList.forEach(function (circuit, index) {
      var circuitId = circuit && circuit.id !== undefined ? circuit.id : index;
      var label = getCircuitLabel(circuit, index);
      var nameKey = normalizedText(circuit && circuit.name).toLowerCase();

      circuitById[circuitId] = { circuit: circuit, index: index, label: label };
      if (nameKey) {
        if (!names[nameKey]) names[nameKey] = [];
        names[nameKey].push(circuitId);
      }
    });

    pointList.forEach(function (point, index) {
      var pointId = point && point.id !== undefined ? point.id : index;
      pointById[pointId] = { point: point, index: index, label: getPointLabel(point, index) };
    });

    roomList.forEach(function (room, index) {
      var roomId = room && room.id !== undefined ? room.id : index;
      roomById[roomId] = normalizedText(room && room.name) || 'Ambiente ' + (index + 1);
    });

    supplyValidation.issues.forEach(function (issue) {
      var description = issue.code === 'voltage-not-available-in-supply'
        ? 'A tensão registrada não está disponível na alimentação selecionada.'
        : issue.code === 'phase-not-available-in-supply'
          ? 'A fase registrada não está disponível na alimentação selecionada.'
          : 'A combinação entre tensão e fases precisa ser conferida.';

      addItem({
        scope: 'circuit',
        entityId: issue.circuitId,
        code: issue.code,
        status: 'conflict',
        title: circuitLabelFor(issue.circuitId),
        description: description
      });
    });

    inventoryValidation.issues.forEach(function (issue) {
      var isPoint = issue.entity === 'point';
      var label = isPoint ? pointLabelFor(issue.entityId) : (roomById[issue.entityId] || 'Ambiente não localizado');

      addItem({
        scope: issue.entity,
        entityId: issue.entityId,
        code: issue.code,
        status: 'conflict',
        title: label,
        description: isPoint
          ? 'Há dados do ponto que não podem ser usados na revisão do anteprojeto.'
          : 'Há dados do ambiente que precisam ser conferidos no cadastro.'
      });
    });

    linkValidation.issues.forEach(function (issue) {
      var entityId = issue.circuitId !== undefined ? issue.circuitId : issue.pointId;
      var scope = issue.circuitId !== undefined ? 'circuit' : 'point';
      var title = scope === 'circuit' ? circuitLabelFor(entityId) : pointLabelFor(entityId);
      var descriptions = {
        'duplicate-point-in-circuit': 'O mesmo ponto aparece mais de uma vez no circuito.',
        'linked-point-not-found': 'O circuito referencia um ponto que não está no inventário atual.',
        'point-linked-to-multiple-circuits': 'O mesmo ponto está vinculado a mais de um circuito.',
        'linked-circuit-power-diverges-from-points': 'A potência do circuito diverge da soma dos pontos vinculados.',
        'linked-circuit-voltage-diverges-from-points': 'A tensão do circuito diverge da tensão dos pontos vinculados.'
      };

      addItem({
        scope: scope,
        entityId: entityId,
        code: issue.code,
        status: 'conflict',
        title: title,
        description: descriptions[issue.code] || 'Há um vínculo entre ponto e circuito que precisa ser conferido.'
      });
    });

    traceability.unlinkedPointIds.forEach(function (pointId) {
      addItem({
        scope: 'point',
        entityId: pointId,
        code: 'point-without-circuit',
        status: 'pending',
        title: pointLabelFor(pointId),
        description: 'O ponto está cadastrado, mas ainda não foi vinculado a um circuito.'
      });
    });

    installation.circuits.forEach(function (readiness) {
      if (readiness.status === 'ready-for-rule-evaluation') return;

      var isInvalid = readiness.status === 'invalid-installation-data' || readiness.status === 'invalid-input';
      var details = isInvalid ? readiness.invalidInputs : readiness.missingInputs;
      var description = readiness.status === 'invalid-input'
        ? 'A potência ou a tensão do circuito precisa ser conferida.'
        : (isInvalid ? 'Corrija: ' : 'Falta informar: ') + details.join(', ') + '.';

      addItem({
        scope: 'circuit',
        entityId: readiness.circuitId,
        code: isInvalid ? 'installation-data-invalid' : 'installation-data-pending',
        status: isInvalid ? 'conflict' : 'pending',
        title: circuitLabelFor(readiness.circuitId),
        description: description
      });
    });

    traceability.circuits.forEach(function (summary) {
      if (summary.source !== 'manual') return;

      addItem({
        scope: 'circuit',
        entityId: summary.circuitId,
        code: 'manual-circuit-entry',
        status: 'manual',
        title: circuitLabelFor(summary.circuitId),
        description: 'Circuito lançado manualmente; mantenha a origem da carga registrada para conferência.'
      });
    });

    Object.keys(names).forEach(function (name) {
      if (names[name].length < 2) return;

      names[name].forEach(function (circuitId) {
        addItem({
          scope: 'circuit',
          entityId: circuitId,
          code: 'duplicate-circuit-name',
          status: 'pending',
          title: circuitLabelFor(circuitId),
          description: 'Há mais de um circuito com este nome; diferencie os rótulos para a conferência do quadro.'
        });
      });
    });

    var statusOrder = { conflict: 0, pending: 1, manual: 2 };
    items.sort(function (first, second) {
      var statusDifference = statusOrder[first.status] - statusOrder[second.status];
      if (statusDifference) return statusDifference;
      return first.title.localeCompare(second.title);
    });

    var totals = items.reduce(function (summary, item) {
      if (item.status === 'conflict') summary.conflictCount += 1;
      else if (item.status === 'pending') summary.pendingCount += 1;
      else summary.manualCircuitCount += 1;
      return summary;
    }, {
      circuitCount: circuitList.length,
      pointCount: pointList.length,
      linkedPointCount: traceability.totals.linkedPointCount,
      unlinkedPointCount: traceability.totals.unlinkedPointCount,
      installationReadyCount: installation.totals.readyCount,
      conflictCount: 0,
      pendingCount: 0,
      manualCircuitCount: 0
    });
    totals.openItemCount = totals.conflictCount + totals.pendingCount;

    return {
      items: items,
      totals: totals,
      traceability: traceability,
      installation: installation,
      supplyValidation: supplyValidation,
      inventoryValidation: inventoryValidation,
      rulesetVersion: ENGINE_VERSION
    };
  }

  function createCircuitFromPoints(draft, points, existingCircuits, supply) {
    var source = draft || {};
    var name = normalizedText(source.name);
    var category = normalizedText(source.category);
    var rawPointIds = Array.isArray(source.pointIds) ? source.pointIds : [];
    var pointIds = uniqueIds(rawPointIds);
    var traceability = getPointCircuitTraceability(existingCircuits, points);
    var pointById = {};
    var selectedPoints = [];
    var issues = [];

    (points || []).forEach(function (point, index) {
      var pointId = point && point.id !== undefined ? point.id : index;
      pointById[pointId] = point;
    });

    if (!name) issues.push({ code: 'missing-circuit-name' });
    if (!category) issues.push({ code: 'missing-circuit-category' });
    if (!pointIds.length) issues.push({ code: 'missing-circuit-points' });
    if (rawPointIds.length !== pointIds.length) issues.push({ code: 'duplicate-point-selection' });

    pointIds.forEach(function (pointId) {
      var point = pointById[pointId];

      if (!point) {
        issues.push({ code: 'selected-point-not-found', pointId: pointId });
        return;
      }

      if (traceability.pointLinks[pointId] && traceability.pointLinks[pointId].length) {
        issues.push({ code: 'selected-point-already-linked', pointId: pointId, circuitIds: traceability.pointLinks[pointId].slice() });
        return;
      }

      selectedPoints.push(point);
    });

    var voltages = uniqueIds(selectedPoints.map(function (point) { return point.voltage; }));
    var power = selectedPoints.reduce(function (sum, point) {
      var pointPower = positiveNumber(point.power);
      return pointPower === null ? sum : sum + pointPower;
    }, 0);
    var voltage = voltages.length === 1 ? Number(voltages[0]) : null;

    if (selectedPoints.length && voltages.length !== 1) {
      issues.push({ code: 'mixed-point-voltages' });
    }

    if (voltage !== null && getSupportedVoltages(supply).indexOf(voltage) === -1) {
      issues.push({ code: 'point-voltage-not-available-in-supply' });
    }

    var phase = voltage === null ? null : suggestPhaseAssignment(existingCircuits || [], supply, voltage);

    if (selectedPoints.length && phase === null) {
      issues.push({ code: 'could-not-suggest-circuit-phase' });
    }

    return {
      valid: issues.length === 0,
      issues: issues,
      circuit: {
        id: source.id,
        name: name,
        category: category,
        pointIds: pointIds,
        power: power,
        voltage: voltage,
        phase: phase,
        powerSource: 'linked-points'
      },
      traceability: traceability,
      rulesetVersion: ENGINE_VERSION
    };
  }

  return {
    ENGINE_VERSION: ENGINE_VERSION,
    calculateCurrent: calculateCurrent,
    calculateImbalance: calculateImbalance,
    calculatePhaseLoads: calculatePhaseLoads,
    balanceSinglePhaseCircuits: balanceSinglePhaseCircuits,
    createCircuitFromPoints: createCircuitFromPoints,
    getCircuitPhases: getCircuitPhases,
    getCircuitPoleCount: getCircuitPoleCount,
    getConnectionPhaseCount: getConnectionPhaseCount,
    getSupplyProfile: getSupplyProfile,
    getSupportedVoltages: getSupportedVoltages,
    getSizingReadiness: getSizingReadiness,
    getPointCircuitTraceability: getPointCircuitTraceability,
    summarizeProjectReview: summarizeProjectReview,
    summarizeInstallationReadiness: summarizeInstallationReadiness,
    suggestPhaseAssignment: suggestPhaseAssignment,
    summarizeProjectInventory: summarizeProjectInventory,
    validateCircuitsForSupply: validateCircuitsForSupply,
    validatePointCircuitLinks: validatePointCircuitLinks,
    validatePoint: validatePoint,
    validateProjectInventory: validateProjectInventory,
    validateRoom: validateRoom,
    validateInstallationData: validateInstallationData
  };
}));
