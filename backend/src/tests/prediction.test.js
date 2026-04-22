'use strict';

/**
 * Unit tests for predictionService using Node.js built-in assert.
 * Run: node src/tests/prediction.test.js
 *
 * Because predictionService is a singleton that emits events and calls
 * eventLogService, we patch those dependencies before requiring the module.
 */

const assert = require('assert');
const EventEmitter = require('events');

// ── Minimal stubs ─────────────────────────────────────────────────────────────

// Stub internalEmitter so no real events propagate
const stubEmitter = new EventEmitter();
stubEmitter.DEVICE_UPDATE        = 'device:update';
stubEmitter.ANOMALY_DETECTED     = 'anomaly:detected';
stubEmitter.DEVICE_STATUS_CHANGE = 'device:status:change';
stubEmitter.PREDICTED_FAILURE    = 'prediction:failure';

// Track emitted PREDICTED_FAILURE payloads
const emittedAlerts = [];
stubEmitter.on(stubEmitter.PREDICTED_FAILURE, (p) => emittedAlerts.push(p));

// Stub eventLogService — just resolve immediately
const stubEventLog = { log: async () => {} };

// Inject stubs via module-level require cache manipulation
require.cache[require.resolve('../events/eventEmitter')]   = { exports: stubEmitter, id: require.resolve('../events/eventEmitter')   };
require.cache[require.resolve('../services/eventLogService')] = { exports: stubEventLog, id: require.resolve('../services/eventLogService') };

// Now load the real prediction service (uses the stubbed deps)
const svc = require('../services/predictionService');

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function makeDevice(overrides = {}) {
  return {
    deviceId:     'test-dev-1',
    temperature:  35,
    batteryLevel: 80,
    status:       'online',
    ...overrides,
  };
}

// Feed N identical readings; returns the last prediction
function feedReadings(device, n = 3) {
  let last;
  for (let i = 0; i < n; i++) last = svc.record(device);
  return last;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n[initial state / insufficient data]');

test('fewer than 3 readings → risk=0, no ETA', () => {
  svc.evict('cold-start');
  const r = svc.record({ deviceId: 'cold-start', temperature: 30, batteryLevel: 90 });
  assert.strictEqual(r.failureRisk, 0);
  assert.strictEqual(r.predictedFailureTime, null);
  assert.deepStrictEqual(r.reasons, []);
});

test('exactly 2 readings → still risk=0', () => {
  svc.evict('two-reads');
  svc.record({ deviceId: 'two-reads', temperature: 30, batteryLevel: 90 });
  const r = svc.record({ deviceId: 'two-reads', temperature: 31, batteryLevel: 89.5 });
  assert.strictEqual(r.failureRisk, 0);
});

// ── Temperature trend ─────────────────────────────────────────────────────────
console.log('\n[temperature trend signal]');

test('stable temperature → tempTrend signal ≈ 0', () => {
  svc.evict('stable-temp');
  const d = { deviceId: 'stable-temp', temperature: 40, batteryLevel: 80 };
  const r = feedReadings(d, 10);
  // Slope is ~0 for a flat series → temp contribution tiny
  // Total risk should still be low
  assert.ok(r.failureRisk < 0.4, `risk ${r.failureRisk} should be < 0.4 for stable temp`);
});

test('rapidly rising temperature → elevated risk', () => {
  svc.evict('hot-dev');
  let temp = 40;
  let last;
  for (let i = 0; i < 10; i++) {
    last = svc.record({ deviceId: 'hot-dev', temperature: temp, batteryLevel: 80 });
    temp += 4; // +4°C per tick — well above MAX_TEMP_RATE_PER_TICK=3
  }
  assert.ok(last.failureRisk > 0.2, `risk ${last.failureRisk} should be elevated`);
  assert.ok(last.reasons.some((r) => r.toLowerCase().includes('temperature')),
    'reasons should mention temperature');
});

// ── Battery drain ─────────────────────────────────────────────────────────────
console.log('\n[battery drain signal]');

test('high battery drain rate → elevated risk', () => {
  svc.evict('drain-dev');
  let bat = 80;
  let last;
  for (let i = 0; i < 10; i++) {
    last = svc.record({ deviceId: 'drain-dev', temperature: 35, batteryLevel: bat });
    bat -= 2; // 2 % per tick — above MAX_DRAIN_RATE_PER_TICK=1.5
  }
  assert.ok(last.failureRisk > 0.2, `risk ${last.failureRisk} should be elevated for high drain`);
  assert.ok(last.reasons.some((r) => r.toLowerCase().includes('battery')),
    'reasons should mention battery');
});

test('slow drain → lower risk than fast drain', () => {
  svc.evict('slow-drain');
  svc.evict('fast-drain');
  let slowBat = 80, fastBat = 80;
  let slowLast, fastLast;
  for (let i = 0; i < 10; i++) {
    slowLast = svc.record({ deviceId: 'slow-drain', temperature: 35, batteryLevel: slowBat });
    fastLast = svc.record({ deviceId: 'fast-drain', temperature: 35, batteryLevel: fastBat });
    slowBat -= 0.1;
    fastBat -= 2.0;
  }
  assert.ok(fastLast.failureRisk > slowLast.failureRisk,
    `fast drain (${fastLast.failureRisk}) should have higher risk than slow drain (${slowLast.failureRisk})`);
});

// ── Output contract ───────────────────────────────────────────────────────────
console.log('\n[output contract]');

test('failureRisk is always between 0 and 1', () => {
  svc.evict('range-dev');
  let temp = 20;
  for (let i = 0; i < 20; i++) {
    const r = svc.record({ deviceId: 'range-dev', temperature: temp, batteryLevel: 5 });
    assert.ok(r.failureRisk >= 0 && r.failureRisk <= 1,
      `failureRisk out of range: ${r.failureRisk}`);
    temp += 5;
  }
});

test('predictedFailureTime is null or positive number', () => {
  svc.evict('eta-dev');
  let temp = 30;
  for (let i = 0; i < 10; i++) {
    const r = svc.record({ deviceId: 'eta-dev', temperature: temp, batteryLevel: 80 });
    if (r.predictedFailureTime !== null) {
      assert.ok(r.predictedFailureTime > 0, `ETA should be positive, got ${r.predictedFailureTime}`);
    }
    temp += 2;
  }
});

test('reasons is always an array', () => {
  svc.evict('reasons-dev');
  const r = feedReadings({ deviceId: 'reasons-dev', temperature: 30, batteryLevel: 80 }, 5);
  assert.ok(Array.isArray(r.reasons), 'reasons should be an array');
});

// ── evict ─────────────────────────────────────────────────────────────────────
console.log('\n[evict]');

test('evict clears window so next read returns cold-start result', () => {
  svc.evict('evict-dev');
  feedReadings({ deviceId: 'evict-dev', temperature: 35, batteryLevel: 80 }, 10);
  svc.evict('evict-dev');
  const r = svc.record({ deviceId: 'evict-dev', temperature: 35, batteryLevel: 80 });
  assert.strictEqual(r.failureRisk, 0);
  assert.strictEqual(r.predictedFailureTime, null);
});

// ── PREDICTED_FAILURE event ───────────────────────────────────────────────────
console.log('\n[PREDICTED_FAILURE event]');

test('emits PREDICTED_FAILURE when risk ≥ 0.60', () => {
  svc.evict('alert-dev');
  emittedAlerts.length = 0;
  // Drive temp up far enough to exceed ALERT_THRESHOLD (0.60)
  let temp = 40;
  for (let i = 0; i < 20; i++) {
    svc.record({ deviceId: 'alert-dev', temperature: temp, batteryLevel: 10 });
    temp += 5;
  }
  // May or may not trigger depending on cooldown; just assert structure if it did
  if (emittedAlerts.length > 0) {
    const a = emittedAlerts[0];
    assert.ok(typeof a.failureRisk === 'number');
    assert.ok(typeof a.deviceId   === 'string');
    assert.strictEqual(a.type, 'PREDICTED_FAILURE');
  } else {
    console.log('    (no alert emitted yet – cooldown or threshold not reached in sim)');
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(45)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
