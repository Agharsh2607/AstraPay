/**
 * controllers/merchantController.js
 * Handles merchant registration, dashboard, and analytics.
 *
 * Endpoints:
 *  GET  /api/merchant/:id/transactions
 *  GET  /api/merchant/:id/stats
 *  POST /api/merchant/register
 *  GET  /api/merchants
 */

const { validationResult } = require('express-validator');
const Merchant             = require('../models/merchantModel');
const Transaction          = require('../models/transactionModel');
const { getMerchantStats } = require('../services/analyticsService');

/**
 * POST /api/merchant/register
 */
const registerMerchant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { walletAddress, name, preferredToken } = req.body;

  try {
    const existing = await Merchant.findByWallet(walletAddress);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Merchant already registered' });
    }

    const merchant = await Merchant.create({ walletAddress, name, preferredToken: preferredToken || 'USDC' });
    return res.status(201).json({ success: true, merchant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/merchants — list all merchants
 */
const listMerchants = async (_req, res) => {
  try {
    const merchants = await Merchant.findAll();
    return res.json({ success: true, count: merchants.length, merchants });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/merchant/:id/transactions
 */
const getMerchantTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({ merchant: req.params.id });
    return res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/merchant/:id/stats
 */
const getMerchantDashboard = async (req, res) => {
  try {
    const [merchant, stats] = await Promise.all([
      Merchant.findById(req.params.id),
      getMerchantStats(req.params.id),
    ]);

    if (!merchant && process.env.SIMULATION_MODE !== 'true') {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    return res.json({
      success: true,
      merchant: merchant || { id: req.params.id, note: 'Simulated merchant' },
      stats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { registerMerchant, listMerchants, getMerchantTransactions, getMerchantDashboard };
