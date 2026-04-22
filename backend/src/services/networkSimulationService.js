'use strict';

/**
 * NetworkSimulationService
 *
 * Simulates satellite-link characteristics:
 *  - Variable latency (min–max range, jittered per packet)
 *  - Burst outages (random duration blackouts)
 *  - Bandwidth throttling (max bytes/sec; payload queued if over limit)
 *  - Message batching (hold packets for up to batchWindowMs then flush together)
 *  - Delivery metrics: success rate, average latency
 *
 * All features only activate when `enabled === true`.
 */

const DEFAULT = {
  delayMinMs:       parseInt(process.env.NET_DELAY_MIN_MS,   10) || 2000,
  delayMaxMs:       parseInt(process.env.NET_DELAY_MAX_MS,   10) || 10000,
  packetLossRate:   parseFloat(process.env.NET_PACKET_LOSS)       || 0.05,
  burstLossRate:    parseFloat(process.env.NET_BURST_LOSS)        || 0.15,
  burstDurationMs:  parseInt(process.env.NET_BURST_DURATION_MS, 10) || 4000,
  burstIntervalMs:  parseInt(process.env.NET_BURST_INTERVAL_MS, 10) || 30000,
  bandwidthBps:     parseInt(process.env.NET_BANDWIDTH_BPS, 10)   || 0,      // 0 = unlimited
  batchWindowMs:    parseInt(process.env.NET_BATCH_WINDOW_MS, 10) || 0,      // 0 = no batching
};

/** Rolling window for metrics (ms) */
const METRICS_WINDOW_MS = 60_000;

class NetworkSimulationService {
  constructor() {
    this.enabled = false;

    // Config
    this.delayMinMs      = DEFAULT.delayMinMs;
    this.delayMaxMs      = DEFAULT.delayMaxMs;
    this.packetLossRate  = DEFAULT.packetLossRate;
    this.burstLossRate   = DEFAULT.burstLossRate;
    this.burstDurationMs = DEFAULT.burstDurationMs;
    this.burstIntervalMs = DEFAULT.burstIntervalMs;
    this.bandwidthBps    = DEFAULT.bandwidthBps;
    this.batchWindowMs   = DEFAULT.batchWindowMs;

    // Burst outage state
    this._inBurst        = false;
    this._burstTimer     = null;
    this._burstInterval  = null;

    // Bandwidth token bucket (bytes available per tick)
    this._tokenBucket    = 0;
    this._tokenInterval  = null;

    // Batch queue: [{ payload, resolve }]
    this._batchQueue     = [];
    this._batchTimer     = null;

    // Metrics
    this._sent        = [];   // timestamps of delivered packets
    this._dropped     = [];   // timestamps of dropped packets
    this._latencies   = [];   // { ts, latencyMs } of recent deliveries
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Transmit a payload through the simulated satellite link.
   * @param {object} payload
   * @returns {Promise<object|null>}  null = dropped
   */
  transmit(payload) {
    if (!this.enabled) {
      this._recordSent(0);
      return Promise.resolve(payload);
    }

    // Bandwidth throttle: estimate payload size
    if (this.bandwidthBps > 0) {
      const estimatedBytes = JSON.stringify(payload).length;
      if (this._tokenBucket < estimatedBytes) {
        this._recordDropped();
        return Promise.resolve(null); // throttled → drop
      }
      this._tokenBucket -= estimatedBytes;
    }

    // Batching
    if (this.batchWindowMs > 0) {
      return new Promise((resolve) => {
        this._batchQueue.push({ payload, resolve });
        if (!this._batchTimer) {
          this._batchTimer = setTimeout(() => this._flushBatch(), this.batchWindowMs);
        }
      });
    }

    return this._deliverOne(payload);
  }

  toggle(enabled) {
    if (typeof enabled === 'boolean') {
      this.enabled = enabled;
    } else {
      this.enabled = !this.enabled;
    }
    if (this.enabled) {
      this._startBurstScheduler();
      this._startTokenBucket();
    } else {
      this._stopBurstScheduler();
      this._stopTokenBucket();
      this._flushBatch();
    }
    return this.getStatus();
  }

  updateConfig(cfg = {}) {
    const num = (v, min = 0) => {
      if (v === undefined) return undefined;
      const n = Number(v);
      if (!Number.isFinite(n) || n < min) throw Object.assign(new Error(`Invalid value ${v}`), { status: 400 });
      return n;
    };

    if (cfg.delayMinMs      !== undefined) this.delayMinMs      = num(cfg.delayMinMs, 0);
    if (cfg.delayMaxMs      !== undefined) this.delayMaxMs      = num(cfg.delayMaxMs, 0);
    if (cfg.packetLossRate  !== undefined) this.packetLossRate  = Math.min(1, Math.max(0, Number(cfg.packetLossRate)));
    if (cfg.burstLossRate   !== undefined) this.burstLossRate   = Math.min(1, Math.max(0, Number(cfg.burstLossRate)));
    if (cfg.burstDurationMs !== undefined) this.burstDurationMs = num(cfg.burstDurationMs, 0);
    if (cfg.burstIntervalMs !== undefined) this.burstIntervalMs = num(cfg.burstIntervalMs, 1000);
    if (cfg.bandwidthBps    !== undefined) this.bandwidthBps    = num(cfg.bandwidthBps, 0);
    if (cfg.batchWindowMs   !== undefined) this.batchWindowMs   = num(cfg.batchWindowMs, 0);

    // Restart schedulers with new config if enabled
    if (this.enabled) {
      this._stopBurstScheduler();
      this._startBurstScheduler();
      this._stopTokenBucket();
      this._startTokenBucket();
    }

    // Legacy compat: accept single delayMs → set both min and max
    if (cfg.delayMs !== undefined) {
      const d = num(cfg.delayMs, 0);
      this.delayMinMs = Math.min(d, this.delayMaxMs);
      this.delayMaxMs = Math.max(d, this.delayMinMs);
    }

    return this.getStatus();
  }

  getStatus() {
    return {
      enabled:         this.enabled,
      delayMinMs:      this.delayMinMs,
      delayMaxMs:      this.delayMaxMs,
      // Legacy field kept for backward compat with existing frontend
      delayMs:         Math.round((this.delayMinMs + this.delayMaxMs) / 2),
      packetLossRate:  this.packetLossRate,
      burstLossRate:   this.burstLossRate,
      burstDurationMs: this.burstDurationMs,
      burstIntervalMs: this.burstIntervalMs,
      inBurst:         this._inBurst,
      bandwidthBps:    this.bandwidthBps,
      batchWindowMs:   this.batchWindowMs,
      metrics:         this.getMetrics(),
    };
  }

  getMetrics() {
    const now = Date.now();
    const cutoff = now - METRICS_WINDOW_MS;

    // Prune old entries
    this._sent     = this._sent.filter((t) => t > cutoff);
    this._dropped  = this._dropped.filter((t) => t > cutoff);
    this._latencies = this._latencies.filter((l) => l.ts > cutoff);

    const totalAttempts = this._sent.length + this._dropped.length;
    const successRate   = totalAttempts === 0 ? 1 : this._sent.length / totalAttempts;
    const avgLatency    = this._latencies.length === 0
      ? 0
      : this._latencies.reduce((s, l) => s + l.latencyMs, 0) / this._latencies.length;

    return {
      windowMs:     METRICS_WINDOW_MS,
      delivered:    this._sent.length,
      dropped:      this._dropped.length,
      successRate:  parseFloat(successRate.toFixed(4)),
      avgLatencyMs: Math.round(avgLatency),
      inBurst:      this._inBurst,
    };
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  _deliverOne(payload) {
    const effectiveLoss = this._inBurst ? this.burstLossRate : this.packetLossRate;
    if (Math.random() < effectiveLoss) {
      this._recordDropped();
      return Promise.resolve(null);
    }

    const latency = this.delayMinMs + Math.random() * (this.delayMaxMs - this.delayMinMs);
    const start   = Date.now();

    return new Promise((resolve) => {
      setTimeout(() => {
        this._recordSent(Date.now() - start);
        resolve(payload);
      }, latency);
    });
  }

  _flushBatch() {
    this._batchTimer = null;
    const queue = this._batchQueue.splice(0);
    for (const { payload, resolve } of queue) {
      this._deliverOne(payload).then(resolve);
    }
  }

  _startBurstScheduler() {
    if (this._burstInterval) return;
    this._burstInterval = setInterval(() => {
      if (this._inBurst) return;
      this._inBurst = true;
      this._burstTimer = setTimeout(() => {
        this._inBurst = false;
      }, this.burstDurationMs);
    }, this.burstIntervalMs);
  }

  _stopBurstScheduler() {
    if (this._burstInterval) { clearInterval(this._burstInterval); this._burstInterval = null; }
    if (this._burstTimer)    { clearTimeout(this._burstTimer);     this._burstTimer    = null; }
    this._inBurst = false;
  }

  _startTokenBucket() {
    if (!this.bandwidthBps || this._tokenInterval) return;
    // Refill every 100 ms
    const refillPer100ms = this.bandwidthBps / 10;
    this._tokenBucket = refillPer100ms;
    this._tokenInterval = setInterval(() => {
      this._tokenBucket = Math.min(this._tokenBucket + refillPer100ms, this.bandwidthBps);
    }, 100);
  }

  _stopTokenBucket() {
    if (this._tokenInterval) { clearInterval(this._tokenInterval); this._tokenInterval = null; }
    this._tokenBucket = 0;
  }

  _recordSent(latencyMs) {
    this._sent.push(Date.now());
    this._latencies.push({ ts: Date.now(), latencyMs });
  }

  _recordDropped() {
    this._dropped.push(Date.now());
  }
}

module.exports = new NetworkSimulationService();
