'use strict';

const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, unique: true, trim: true, index: true },
    name:  { type: String, required: true, trim: true, maxlength: 120 },
    plan:  { type: String, enum: ['starter', 'pro', 'enterprise'], default: 'pro' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
