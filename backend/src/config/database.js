'use strict';

const mongoose = require('mongoose');

/**
 * Establishes a connection to MongoDB.
 * Exits the process on failure so the platform never starts in a broken state.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/skytrack';

  try {
    await mongoose.connect(uri);
    console.log(`[Database] Connected to MongoDB: ${uri}`);
  } catch (err) {
    console.error('[Database] Connection failed:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB disconnected.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[Database] MongoDB reconnected.');
  });
}

module.exports = connectDB;
