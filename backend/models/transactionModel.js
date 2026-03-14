/**
 * models/transactionModel.js
 * Mongoose model for payment transactions.
 * Falls back to an in-memory array in simulation mode.
 */

const mongoose = require('mongoose');

// ── In-memory fallback store ────────────────────────────────────────────────
let memoryStore = [];

// ── Mongoose Schema ────────────────────────────────────────────────────────
const transactionSchema = new mongoose.Schema(
  {
    txHash: { type: String, required: true, unique: true },
    fromToken: { type: String, required: true },
    toToken: { type: String, required: true },
    amount: { type: Number, required: true },
    amountUSD: { type: Number },
    route: { type: String, required: true },
    merchant: { type: String },
    targetChain: { type: String },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'pending',
    },
    estimatedFee: { type: String },
    estimatedTime: { type: String },
    latency: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const TransactionModel = mongoose.model('Transaction', transactionSchema);

// ── Unified interface ──────────────────────────────────────────────────────
const Transaction = {
  findAll: async (filter = {}) => {
    if (process.env.SIMULATION_MODE === 'true') {
      if (filter.merchant) return memoryStore.filter((t) => t.merchant === filter.merchant);
      return [...memoryStore].reverse(); // newest first
    }
    return TransactionModel.find(filter).sort({ timestamp: -1 });
  },

  findByHash: async (txHash) => {
    if (process.env.SIMULATION_MODE === 'true')
      return memoryStore.find((t) => t.txHash === txHash) || null;
    return TransactionModel.findOne({ txHash });
  },

  create: async (data) => {
    if (process.env.SIMULATION_MODE === 'true') {
      const tx = { ...data, timestamp: new Date(), _id: data.txHash };
      memoryStore.push(tx);
      return tx;
    }
    return TransactionModel.create(data);
  },

  updateStatus: async (txHash, status, extra = {}) => {
    if (process.env.SIMULATION_MODE === 'true') {
      const tx = memoryStore.find((t) => t.txHash === txHash);
      if (tx) Object.assign(tx, { status, ...extra });
      return tx;
    }
    return TransactionModel.findOneAndUpdate({ txHash }, { status, ...extra }, { new: true });
  },

  count: async (filter = {}) => {
    if (process.env.SIMULATION_MODE === 'true') {
      if (filter.merchant) return memoryStore.filter((t) => t.merchant === filter.merchant).length;
      return memoryStore.length;
    }
    return TransactionModel.countDocuments(filter);
  },

  sumVolume: async (filter = {}) => {
    if (process.env.SIMULATION_MODE === 'true') {
      const items = filter.merchant
        ? memoryStore.filter((t) => t.merchant === filter.merchant)
        : memoryStore;
      return items.reduce((sum, t) => sum + (t.amountUSD || t.amount || 0), 0);
    }
    const result = await TransactionModel.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amountUSD' } } },
    ]);
    return result[0]?.total || 0;
  },
};

module.exports = Transaction;
