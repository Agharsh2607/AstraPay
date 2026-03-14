/**
 * routes/paymentRoutes.js
 */

const express = require('express');
const { body, param } = require('express-validator');
const {
  createPayment,
  getTransaction,
  getAllTransactions,
} = require('../controllers/paymentController');

const router = express.Router();

// POST /api/create-payment
router.post(
  '/create-payment',
  [
    body('token')
      .notEmpty().withMessage('token is required')
      .isString().toUpperCase(),
    body('amount')
      .notEmpty().withMessage('amount is required')
      .isFloat({ min: 0.000001 }).withMessage('amount must be a positive number'),
    body('targetChain')
      .notEmpty().withMessage('targetChain is required')
      .isString(),
    body('merchant')
      .notEmpty().withMessage('merchant wallet address is required'),
    body('merchantToken')
      .optional()
      .isIn(['USDC', 'USDT', 'DAI', 'BUSD']).withMessage('Invalid merchant token'),
  ],
  createPayment
);

// GET /api/transaction/:txHash
router.get(
  '/transaction/:txHash',
  [param('txHash').notEmpty().withMessage('txHash is required')],
  getTransaction
);

// GET /api/transactions
router.get('/transactions', getAllTransactions);

module.exports = router;
