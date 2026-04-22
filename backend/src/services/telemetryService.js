'use strict';

const Telemetry = require('../models/Telemetry');

/**
 * TelemetryService
 *
 * Handles writing raw telemetry readings to MongoDB and querying
 * downsampled (per-minute average) history for a device.
 *
 * Downsampling strategy
 * ─────────────────────
 * A MongoDB aggregation pipeline groups raw documents by deviceId +
 * minute-bucket (truncating seconds/milliseconds) and computes
 * $avg temperature and $avg batteryLevel for each bucket.
 * This keeps chart payloads small regardless of how many raw ticks
 * were recorded during the requested window.
 *
 * Range presets (parsed from `range` query param)
 * ────────────────────────────────────────────────
 *  15m  → 15 minutes  → minute-buckets  (up to  15 points)
 *  1h   → 1 hour      → minute-buckets  (up to  60 points)
 *  6h   → 6 hours     → minute-buckets  (up to 360 points)
 *  24h  → 24 hours    → 5-min buckets   (up to 288 points)
 *  7d   → 7 days      → hour-buckets    (up to 168 points)
 */

/** Map range-string → { ms: number, bucketMinutes: number } */
const RANGE_PRESETS = Object.freeze({
  '15m': { ms:     15 * 60_000, bucketMinutes: 1   },
  '1h':  { ms:      1 * 3_600_000, bucketMinutes: 1   },
  '6h':  { ms:      6 * 3_600_000, bucketMinutes: 1   },
  '24h': { ms:     24 * 3_600_000, bucketMinutes: 5   },
  '7d':  { ms:  7 * 24 * 3_600_000, bucketMinutes: 60  },
});

const DEFAULT_RANGE = '1h';

/** Maximum raw documents written per second per device (simple in-memory rate limiter). */
const WRITE_INTERVAL_MS = 3_000; // write at most once every 3 s

class TelemetryService {
  constructor() {
    /** Map<deviceId, lastWriteTs> – epoch-ms of last persisted reading */
    this._lastWrite = new Map();
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  /**
   * Persist a telemetry reading for the given device.
   * Rate-limited so that if ticks fire more frequently than WRITE_INTERVAL_MS
   * we skip the write to avoid excessive DB pressure.
   *
   * Fire-and-forget: caller should not await this unless it cares about errors.
   *
   * @param {string} deviceId
   * @param {number} temperature
   * @param {number} batteryLevel
   */
  record(deviceId, temperature, batteryLevel) {
    const now = Date.now();
    if ((now - (this._lastWrite.get(deviceId) || 0)) < WRITE_INTERVAL_MS) return;
    this._lastWrite.set(deviceId, now);

    Telemetry.create({ deviceId, timestamp: new Date(now), temperature, batteryLevel })
      .catch((err) => console.error('[Telemetry] Write error:', err.message));
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  /**
   * Return downsampled history for a device.
   *
   * @param {string} deviceId
   * @param {string} range   One of: 15m | 1h | 6h | 24h | 7d  (default: 1h)
   * @returns {Promise<Array<{ time: string, temp: number, battery: number }>>}
   */
  async getHistory(deviceId, range = DEFAULT_RANGE) {
    const preset = RANGE_PRESETS[range] || RANGE_PRESETS[DEFAULT_RANGE];
    const from   = new Date(Date.now() - preset.ms);
    const bucketMs = preset.bucketMinutes * 60_000;

    const pipeline = [
      // 1. Filter to this device + time window
      {
        $match: {
          deviceId,
          timestamp: { $gte: from },
        },
      },
      // 2. Sort for deterministic grouping
      { $sort: { timestamp: 1 } },
      // 3. Group by minute-bucket
      {
        $group: {
          _id: {
            bucket: {
              $subtract: [
                { $toLong: '$timestamp' },
                { $mod: [{ $toLong: '$timestamp' }, bucketMs] },
              ],
            },
          },
          avgTemp:    { $avg: '$temperature'  },
          avgBattery: { $avg: '$batteryLevel' },
          count:      { $sum: 1 },
        },
      },
      // 4. Sort buckets chronologically
      { $sort: { '_id.bucket': 1 } },
      // 5. Project clean output
      {
        $project: {
          _id: 0,
          // ISO string so the frontend can parse with new Date()
          time:    { $toDate: '$_id.bucket' },
          temp:    { $round: ['$avgTemp',    2] },
          battery: { $round: ['$avgBattery', 2] },
          count:   1,
        },
      },
    ];

    const raw = await Telemetry.aggregate(pipeline).exec();

    // Format time labels for the chart
    return raw.map((p) => ({
      time:    _formatLabel(new Date(p.time), preset.bucketMinutes),
      temp:    p.temp,
      battery: p.battery,
      count:   p.count,
    }));
  }

  /**
   * Return the supported range presets so callers don't hardcode them.
   */
  getRangePresets() {
    return Object.keys(RANGE_PRESETS);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _formatLabel(date, bucketMinutes) {
  if (bucketMinutes >= 60) {
    // Hour-level: "Apr 22 14:00"
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (bucketMinutes >= 5) {
    // 5-min: "14:35"
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  // 1-min or less: "14:35:00"
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

module.exports = new TelemetryService();
