/**
 * controllers/paymentController.js
 * Handles POST /api/create-payment
 *
 * Flow:
 *  1. Validate input
 *  2. Call routing engine to find best route
 *  3. Create transaction record with status "pending"
 *  4. Trigger blockchain listener to simulate confirmation
 *  5. Return route + tx details to client
 */

const { validationResult } = require('express-validator');
const { findBestRoute }    = require('../services/routingEngine');
const { monitorPayment }   = require('../services/blockchainListener');

// io instance — injected at startup via setIO()
let io;
const setIO = (ioInstance) => { io = ioInstance; };

/**
 * POST /api/create-payment
 */
const createPayment = async (req, res) => {
  // 1. Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { token, amount, targetChain, merchant, merchantToken = 'USDC' } = req.body;

  try {
    // 2. Find best route
    const route = findBestRoute(token, parseFloat(amount), targetChain, merchantToken);

    // 3 & 4. Create TX record + start simulation
    const { txHash, status } = await monitorPayment(
      {
        fromToken:     token,
        toToken:       merchantToken,
        amount:        parseFloat(amount),
        amountUSD:     route.amountUSD,
        route:         route.route,
        merchant:      merchant,
        targetChain:   targetChain,
        estimatedFee:  route.estimatedFee,
        estimatedTime: route.estimatedTime,
      },
      io
    );

    // 5. Respond
    return res.status(201).json({
      success: true,
      txHash,
      status,
      route:         route.route,
      sourceChain:   route.sourceChain,
      targetChain:   route.targetChain,
      fromToken:     token,
      toToken:       merchantToken,
      amount:        route.amount,
      amountUSD:     route.amountUSD,
      estimatedTime: route.estimatedTime,
      estimatedFee:  route.estimatedFee,
      alternatives:  route.alternatives,
      message:       'Payment initiated. Transaction is being confirmed on-chain.',
    });
  } catch (error) {
    console.error('[PaymentController] Error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/transaction/:txHash — get a single transaction by hash
 */
const getTransaction = async (req, res) => {
  try {
    const Transaction = require('../models/transactionModel');
    const tx = await Transaction.findByHash(req.params.txHash);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
    return res.json({ success: true, transaction: tx });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/transactions — get all transactions (newest first)
 */
const getAllTransactions = async (req, res) => {
  try {
    const Transaction = require('../models/transactionModel');
    const txs = await Transaction.findAll();
    return res.json({ success: true, count: txs.length, transactions: txs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPayment, getTransaction, getAllTransactions, setIO };
