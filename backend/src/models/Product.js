'use strict';

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    productId:   { type: String, required: true, unique: true, trim: true, index: true },
    orgId:       { type: String, required: true, trim: true, index: true },
    name:        { type: String, required: true, trim: true, maxlength: 120 },
    category:    {
      type: String,
      required: true,
      enum: ['mobile', 'laptop', 'wearable', 'tablet', 'desktop', 'server', 'sensor', 'router', 'camera', 'other'],
      index: true,
    },
    releaseDate: { type: Date, required: true },
    imageEmoji:  { type: String, default: '📦' },
  },
  { timestamps: true }
);

productSchema.index({ orgId: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);
