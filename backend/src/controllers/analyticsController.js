const Telemetry = require("../models/Telemetry");
const Alert = require("../models/Alert");
const Device = require("../models/Device");
const { Parser } = require("json2csv");

function rangeToDate(range) {
  const map = {
    "15m": 15 * 60 * 1000,
    "1h":  60 * 60 * 1000,
    "6h":  6  * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d":  7  * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  const ms = map[range] || map["24h"];
  return new Date(Date.now() - ms);
}

async function getSummary(req, res, next) {
  try {
    const since   = rangeToDate(req.query.range);
    const houseId = req.user.houseId;

    const [totalDevices, onlineDevices, totalAlerts, openAlerts] = await Promise.all([
      Device.countDocuments({ houseId }),
      Device.countDocuments({ houseId, status: "online" }),
      Alert.countDocuments({ houseId, createdAt: { $gte: since } }),
      Alert.countDocuments({ houseId, acknowledged: false }),
    ]);

    const avgAgg = await Telemetry.aggregate([
      { $match: { houseId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          avgTemp:    { $avg: "$temperature" },
          avgBattery: { $avg: "$battery" },
          avgLatency: { $avg: "$latency" },
          avgLoss:    { $avg: "$packetLoss" },
        },
      },
    ]);
    const avg = avgAgg[0] || {};

    res.json({
      totalDevices,
      onlineDevices,
      offlineDevices: totalDevices - onlineDevices,
      totalAlerts,
      openAlerts,
      avgTemperature: avg.avgTemp    != null ? +avg.avgTemp.toFixed(1)    : null,
      avgBattery:     avg.avgBattery != null ? +avg.avgBattery.toFixed(1) : null,
      avgLatency:     avg.avgLatency != null ? +avg.avgLatency.toFixed(0) : null,
      avgPacketLoss:  avg.avgLoss    != null ? +avg.avgLoss.toFixed(1)    : null,
    });
  } catch (err) { next(err); }
}

async function getTelemetryAnalytics(req, res, next) {
  try {
    const since   = rangeToDate(req.query.range);
    const houseId = req.user.houseId;
    const match   = { houseId, createdAt: { $gte: since } };
    if (req.query.deviceId) match.deviceId = req.query.deviceId;

    const rangeDays = (Date.now() - since.getTime()) / (24 * 60 * 60 * 1000);
    const groupFmt  = rangeDays <= 7
      ? { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" }, hour: { $hour: "$createdAt" } }
      : { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } };

    const data = await Telemetry.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupFmt,
          avgTemp:    { $avg: "$temperature" },
          avgBattery: { $avg: "$battery" },
          avgLatency: { $avg: "$latency" },
          avgLoss:    { $avg: "$packetLoss" },
          count:      { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
      { $limit: 200 },
    ]);

    res.json(data);
  } catch (err) { next(err); }
}

async function getAlertAnalytics(req, res, next) {
  try {
    const since   = rangeToDate(req.query.range);
    const houseId = req.user.houseId;

    const [byType, bySeverity, timeline] = await Promise.all([
      Alert.aggregate([
        { $match: { houseId, createdAt: { $gte: since } } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $match: { houseId, createdAt: { $gte: since } } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $match: { houseId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              year:  { $year:  "$createdAt" },
              month: { $month: "$createdAt" },
              day:   { $dayOfMonth: "$createdAt" },
              hour:  { $hour: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
        { $limit: 168 },
      ]),
    ]);

    res.json({ byType, bySeverity, timeline });
  } catch (err) { next(err); }
}

async function getUptimeAnalytics(req, res, next) {
  try {
    const since   = rangeToDate(req.query.range);
    const houseId = req.user.houseId;

    const uptime = await Telemetry.aggregate([
      { $match: { houseId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$deviceId",
          total:  { $sum: 1 },
          online: { $sum: { $cond: [{ $eq: ["$status", "online"] }, 1, 0] } },
        },
      },
      {
        $project: {
          deviceId:  "$_id",
          total:     1,
          online:    1,
          uptimePct: { $multiply: [{ $divide: ["$online", "$total"] }, 100] },
        },
      },
      { $sort: { uptimePct: 1 } },
    ]);

    res.json(uptime);
  } catch (err) { next(err); }
}

async function exportCSV(req, res, next) {
  try {
    const since   = rangeToDate(req.query.range);
    const houseId = req.user.houseId;
    const filter  = { houseId, createdAt: { $gte: since } };
    if (req.query.deviceId) filter.deviceId = req.query.deviceId;

    const rows = await Telemetry.find(filter)
      .sort({ createdAt: 1 })
      .limit(5000)
      .lean();

    const fields = ["deviceId","temperature","battery","signalStrength","latency","packetLoss","status","createdAt"];
    const parser = new Parser({ fields });
    const csv    = parser.parse(rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="telemetry-${req.query.range || "24h"}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
}

module.exports = { getSummary, getTelemetryAnalytics, getAlertAnalytics, getUptimeAnalytics, exportCSV };
