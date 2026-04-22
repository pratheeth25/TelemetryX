'use strict';

const Product = require('../models/Product');
const Organization = require('../models/Organization');
const Device = require('../models/Device');

/**
 * ProductService
 * Handles product/org queries and per-product aggregation metrics.
 */
class ProductService {
  // ── Products ───────────────────────────────────────────────────────────────

  async getAllProducts({ orgId } = {}) {
    const filter = orgId ? { orgId } : {};
    return Product.find(filter).sort({ orgId: 1, name: 1 }).lean();
  }

  async getProductById(productId) {
    return Product.findOne({ productId }).lean();
  }

  async getDevicesForProduct(productId) {
    return Device.find({ productId }).lean();
  }

  // ── Organizations ──────────────────────────────────────────────────────────

  async getAllOrgs() {
    return Organization.find().sort({ name: 1 }).lean();
  }

  async getOrgSummary(orgId) {
    const [org, products, devices] = await Promise.all([
      Organization.findOne({ orgId }).lean(),
      Product.find({ orgId }).lean(),
      Device.find({ orgId }).lean(),
    ]);

    if (!org) return null;

    const productIds = products.map((p) => p.productId);

    // Per-product metrics via aggregation
    const metrics = await Device.aggregate([
      { $match: { orgId } },
      {
        $group: {
          _id: '$productId',
          avgTemperature:  { $avg: '$temperature'  },
          avgBattery:      { $avg: '$batteryLevel' },
          avgHealthScore:  { $avg: '$healthScore'  },
          totalDevices:    { $sum: 1 },
          offlineCount:    { $sum: { $cond: [{ $eq: ['$status', 'offline']  }, 1, 0] } },
          criticalCount:   { $sum: { $cond: [{ $eq: ['$status', 'critical'] }, 1, 0] } },
          warningCount:    { $sum: { $cond: [{ $eq: ['$status', 'warning']  }, 1, 0] } },
        },
      },
    ]);

    const metricsMap = {};
    for (const m of metrics) {
      metricsMap[m._id] = {
        avgTemperature: parseFloat((m.avgTemperature || 0).toFixed(2)),
        avgBattery:     parseFloat((m.avgBattery     || 0).toFixed(2)),
        avgHealthScore: parseFloat((m.avgHealthScore  || 0).toFixed(2)),
        totalDevices:   m.totalDevices,
        failureRate:    parseFloat(
          (((m.offlineCount + m.criticalCount) / (m.totalDevices || 1)) * 100).toFixed(1)
        ),
        offlineCount:   m.offlineCount,
        criticalCount:  m.criticalCount,
        warningCount:   m.warningCount,
      };
    }

    // Org-level rollup
    const onlineDevices = devices.filter((d) => d.status === 'online').length;
    const failedDevices = devices.filter((d) => d.status === 'offline' || d.status === 'critical').length;

    return {
      org,
      totalProducts:  products.length,
      totalDevices:   devices.length,
      onlineDevices,
      failedDevices,
      overallFailureRate: parseFloat(((failedDevices / (devices.length || 1)) * 100).toFixed(1)),
      products: products.map((p) => ({
        ...p,
        metrics: metricsMap[p.productId] || {
          avgTemperature: 0, avgBattery: 0, avgHealthScore: 0,
          totalDevices: 0, failureRate: 0, offlineCount: 0,
          criticalCount: 0, warningCount: 0,
        },
      })),
    };
  }

  // ── Aggregation (used by GET /products/:id metrics endpoint) ──────────────

  async getProductMetrics(productId) {
    const [result] = await Device.aggregate([
      { $match: { productId } },
      {
        $group: {
          _id: '$productId',
          avgTemperature: { $avg: '$temperature'  },
          avgBattery:     { $avg: '$batteryLevel' },
          avgHealthScore: { $avg: '$healthScore'  },
          totalDevices:   { $sum: 1 },
          offlineCount:   { $sum: { $cond: [{ $eq: ['$status', 'offline']  }, 1, 0] } },
          criticalCount:  { $sum: { $cond: [{ $eq: ['$status', 'critical'] }, 1, 0] } },
          warningCount:   { $sum: { $cond: [{ $eq: ['$status', 'warning']  }, 1, 0] } },
        },
      },
    ]);

    if (!result) return null;
    return {
      avgTemperature: parseFloat((result.avgTemperature || 0).toFixed(2)),
      avgBattery:     parseFloat((result.avgBattery     || 0).toFixed(2)),
      avgHealthScore: parseFloat((result.avgHealthScore  || 0).toFixed(2)),
      totalDevices:   result.totalDevices,
      failureRate:    parseFloat(
        (((result.offlineCount + result.criticalCount) / (result.totalDevices || 1)) * 100).toFixed(1)
      ),
      offlineCount:   result.offlineCount,
      criticalCount:  result.criticalCount,
      warningCount:   result.warningCount,
    };
  }
}

module.exports = new ProductService();
