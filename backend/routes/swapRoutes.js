/**
 * routes/swapRoutes.js
 */

const express = require('express');
const { query } = require('express-validator');
const { getQuote, getSupportedTokens } = require('../controllers/swapController');

const router = express.Router();

// GET /api/swap-quote?from=ETH&to=USDC&amount=1
router.get(
  '/swap-quote',
  [
    query('from').notEmpty().withMessage('from token is required'),
    query('to').notEmpty().withMessage('to token is required'),
    query('amount')
      .notEmpty().withMessage('amount is required')
      .isFloat({ min: 0 }).withMessage('amount must be a positive number'),
  ],
  getQuote
);

// GET /api/supported-tokens
router.get('/supported-tokens', getSupportedTokens);

module.exports = router;
