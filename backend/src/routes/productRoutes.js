'use strict';

const express = require('express');
const {
  getProducts, getProductById, getProductDevices,
  getOrgs, getOrgSummary,
} = require('../controllers/productController');

const router = express.Router();

router.get('/products',                getProducts);
router.get('/products/:id',            getProductById);
router.get('/products/:id/devices',    getProductDevices);
router.get('/orgs',                    getOrgs);
router.get('/org/:id/summary',         getOrgSummary);

module.exports = router;
