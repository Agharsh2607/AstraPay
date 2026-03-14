/**
 * config/db.js
 * MongoDB connection using Mongoose.
 * In SIMULATION_MODE, skips the real DB and uses in-memory stores instead.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  // If simulation mode is on, skip real DB connection
  if (process.env.SIMULATION_MODE === 'true') {
    console.log('🟡 [DB] Simulation mode — skipping MongoDB connection (using in-memory store)');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ [DB] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ [DB] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
