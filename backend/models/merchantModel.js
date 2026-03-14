/**
 * models/merchantModel.js
 * Mongoose model for merchants registered on AstraPay.
 * Falls back to an in-memory array in simulation mode.
 */

const mongoose = require('mongoose');

// ── In-memory fallback store (used when SIMULATION_MODE=true) ──────────────
let memoryStore = [
  {
    id: 'merchant_001',
    walletAddress: '0xMerchantAlpha1234567890abcdef',
    name: 'Alpha Coffee Co.',
    preferredToken: 'USDC',
    createdAt: new Date('2026-01-15'),
  },
  {
    id: 'merchant_002',
    walletAddress: '0xMerchantBeta0987654321fedcba',
    name: 'Beta Marketplace',
    preferredToken: 'USDT',
    createdAt: new Date('2026-02-01'),
  },
];

// ── Mongoose Schema (used when SIMULATION_MODE=false) ─────────────────────
const merchantSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: [true, 'Wallet address is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Merchant name is required'],
      trim: true,
    },
    preferredToken: {
      type: String,
      default: 'USDC',
      enum: ['USDC', 'USDT', 'DAI', 'BUSD'],
    },
  },
  { timestamps: true }
);

const MerchantModel = mongoose.model('Merchant', merchantSchema);

// ── Unified interface (works regardless of simulation mode) ────────────────
const Merchant = {
  findAll: async () => {
    if (process.env.SIMULATION_MODE === 'true') return [...memoryStore];
    return MerchantModel.find();
  },

  findById: async (id) => {
    if (process.env.SIMULATION_MODE === 'true')
      return memoryStore.find((m) => m.id === id) || null;
    return MerchantModel.findById(id);
  },

  findByWallet: async (address) => {
    if (process.env.SIMULATION_MODE === 'true')
      return memoryStore.find((m) => m.walletAddress === address) || null;
    return MerchantModel.findOne({ walletAddress: address });
  },

  create: async (data) => {
    if (process.env.SIMULATION_MODE === 'true') {
      const newMerchant = { id: `merchant_${Date.now()}`, ...data, createdAt: new Date() };
      memoryStore.push(newMerchant);
      return newMerchant;
    }
    return MerchantModel.create(data);
  },
};

module.exports = Merchant;
