'use strict';

const productService = require('../services/productService');

// ── GET /api/products ──────────────────────────────────────────────────────────
async function getProducts(req, res, next) {
  try {
    const { orgId } = req.query;
    const products = await productService.getAllProducts({ orgId });
    res.json({ count: products.length, products });
  } catch (err) { next(err); }
}

// ── GET /api/products/:id ──────────────────────────────────────────────────────
async function getProductById(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      const err = new Error(`Product "${req.params.id}" not found.`);
      err.status = 404;
      return next(err);
    }
    const metrics = await productService.getProductMetrics(req.params.id);
    res.json({ product, metrics });
  } catch (err) { next(err); }
}

// ── GET /api/products/:id/devices ──────────────────────────────────────────────
async function getProductDevices(req, res, next) {
  try {
    const devices = await productService.getDevicesForProduct(req.params.id);
    res.json({ count: devices.length, devices });
  } catch (err) { next(err); }
}

// ── GET /api/orgs ──────────────────────────────────────────────────────────────
async function getOrgs(req, res, next) {
  try {
    const orgs = await productService.getAllOrgs();
    res.json({ count: orgs.length, orgs });
  } catch (err) { next(err); }
}

// ── GET /api/org/:id/summary ───────────────────────────────────────────────────
async function getOrgSummary(req, res, next) {
  try {
    const summary = await productService.getOrgSummary(req.params.id);
    if (!summary) {
      const err = new Error(`Organization "${req.params.id}" not found.`);
      err.status = 404;
      return next(err);
    }
    res.json(summary);
  } catch (err) { next(err); }
}

module.exports = { getProducts, getProductById, getProductDevices, getOrgs, getOrgSummary };
