'use strict';

/**
 * Unit tests for healthScoreService using Node.js built-in assert.
 * Run: node src/tests/healthScore.test.js
 */

const assert = require('assert');
const {
  computeScore,
  getCategory,
  pruneAnomalyWindow,
  WEIGHTS,
  TEMP_BASELINE,
  TEMP_MAX,
  MAX_ANOMALIES,
  ANOMALY_WINDOW_MS,
} = require('../services/healthScoreService');

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

function near(actual, expected, tolerance = 1) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${actual} to be within ${tolerance} of ${expected}`);
  }
}

// ── computeScore ─────────────────────────────────────────────────────────────
console.log('\n[computeScore]');

test('perfect device scores near 100', () => {
  const { score, category } = computeScore({
    temperature: 30,
    batteryLevel: 100,
    msSinceLastSeen: 0,
    recentAnomalyCount: 0,
    offlineTimeoutMs: 15_000,
  });
  near(score, 100, 2);
  assert.strictEqual(category, 'healthy');
});

test('critical-temp device scores low', () => {
  const { score, category } = computeScore({
    temperature: 120,       // full temp penalty
    batteryLevel: 5,        // near-dead battery
    msSinceLastSeen: 14_000, // nearly offline
    recentAnomalyCount: 10, // max anomalies
    offlineTimeoutMs: 15_000,
  });
  assert.ok(score < 10, `score should be < 10, got ${score}`);
  assert.strictEqual(category, 'critical');
});

test('high temp alone drives score into warning territory', () => {
  const { score } = computeScore({
    temperature: 90,          // above baseline
    batteryLevel: 80,
    msSinceLastSeen: 1_000,
    recentAnomalyCount: 0,
    offlineTimeoutMs: 15_000,
  });
  assert.ok(score < 80, `score should be < 80, got ${score}`);
});

test('low battery alone drives score into warning territory', () => {
  const { score } = computeScore({
    temperature: 30,
    batteryLevel: 10,         // very low battery
    msSinceLastSeen: 1_000,
    recentAnomalyCount: 0,
    offlineTimeoutMs: 15_000,
  });
  assert.ok(score < 80, `score should be < 80, got ${score}`);
});

test('high latency reduces score', () => {
  const low = computeScore({
    temperature: 35, batteryLevel: 90,
    msSinceLastSeen: 0, recentAnomalyCount: 0, offlineTimeoutMs: 15_000,
  });
  const high = computeScore({
    temperature: 35, batteryLevel: 90,
    msSinceLastSeen: 14_000, recentAnomalyCount: 0, offlineTimeoutMs: 15_000,
  });
  assert.ok(high.score < low.score, `high latency (${high.score}) should score lower than low latency (${low.score})`);
});

test('many anomalies reduce score proportionally', () => {
  const noAnomalies = computeScore({
    temperature: 35, batteryLevel: 90, msSinceLastSeen: 0, recentAnomalyCount: 0,
    offlineTimeoutMs: 15_000,
  });
  const manyAnomalies = computeScore({
    temperature: 35, batteryLevel: 90, msSinceLastSeen: 0, recentAnomalyCount: 10,
    offlineTimeoutMs: 15_000,
  });
  const expectedReduction = WEIGHTS.anomaly * 100; // 15 points
  near(noAnomalies.score - manyAnomalies.score, expectedReduction, 1);
});

test('score is always clamped between 0 and 100', () => {
  const { score: low } = computeScore({
    temperature: -999, batteryLevel: -999, msSinceLastSeen: -1, recentAnomalyCount: -1,
    offlineTimeoutMs: 15_000,
  });
  const { score: high } = computeScore({
    temperature: 999, batteryLevel: 999, msSinceLastSeen: 999_999, recentAnomalyCount: 999,
    offlineTimeoutMs: 15_000,
  });
  assert.ok(low >= 0 && low <= 100, `low score out of range: ${low}`);
  assert.ok(high >= 0 && high <= 100, `high score out of range: ${high}`);
});

test('returns component breakdown', () => {
  const { components } = computeScore({
    temperature: 35, batteryLevel: 80, msSinceLastSeen: 1_000, recentAnomalyCount: 2,
    offlineTimeoutMs: 15_000,
  });
  assert.ok(typeof components.temperature === 'number');
  assert.ok(typeof components.battery     === 'number');
  assert.ok(typeof components.latency     === 'number');
  assert.ok(typeof components.anomaly     === 'number');
});

// ── getCategory ───────────────────────────────────────────────────────────────
console.log('\n[getCategory]');

test('80 → healthy', () => assert.strictEqual(getCategory(80), 'healthy'));
test('100 → healthy', () => assert.strictEqual(getCategory(100), 'healthy'));
test('79.9 → warning', () => assert.strictEqual(getCategory(79.9), 'warning'));
test('50 → warning', () => assert.strictEqual(getCategory(50), 'warning'));
test('49.9 → critical', () => assert.strictEqual(getCategory(49.9), 'critical'));
test('0 → critical', () => assert.strictEqual(getCategory(0), 'critical'));

// ── pruneAnomalyWindow ────────────────────────────────────────────────────────
console.log('\n[pruneAnomalyWindow]');

test('removes timestamps older than ANOMALY_WINDOW_MS', () => {
  const now = Date.now();
  const old = now - ANOMALY_WINDOW_MS - 1_000;
  const arr = [old, now - 1_000, now];
  pruneAnomalyWindow(arr);
  assert.strictEqual(arr.length, 2, `expected 2 entries, got ${arr.length}`);
});

test('keeps all timestamps within window', () => {
  const now = Date.now();
  const arr = [now - 1_000, now - 500, now];
  pruneAnomalyWindow(arr);
  assert.strictEqual(arr.length, 3);
});

test('handles empty array', () => {
  const arr = [];
  pruneAnomalyWindow(arr);
  assert.strictEqual(arr.length, 0);
});

// ── Boundary: temperature at baseline is perfect ───────────────────────────
console.log('\n[boundary conditions]');

test(`temp at TEMP_BASELINE (${TEMP_BASELINE}°C) contributes full temp component`, () => {
  const { components } = computeScore({
    temperature: TEMP_BASELINE,
    batteryLevel: 100,
    msSinceLastSeen: 0,
    recentAnomalyCount: 0,
    offlineTimeoutMs: 15_000,
  });
  assert.strictEqual(components.temperature, 100);
});

test(`temp at TEMP_MAX (${TEMP_MAX}°C) contributes zero temp component`, () => {
  const { components } = computeScore({
    temperature: TEMP_MAX,
    batteryLevel: 100,
    msSinceLastSeen: 0,
    recentAnomalyCount: 0,
    offlineTimeoutMs: 15_000,
  });
  assert.strictEqual(components.temperature, 0);
});

test('offlineTimeoutMs = 0 gives latency component of 0', () => {
  const { components } = computeScore({
    temperature: 30, batteryLevel: 100, msSinceLastSeen: 0,
    recentAnomalyCount: 0, offlineTimeoutMs: 0,
  });
  assert.strictEqual(components.latency, 0);
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(45)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
}
