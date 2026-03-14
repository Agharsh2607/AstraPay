/**
 * routes/merchantRoutes.js
 */

const express = require('express');
const { body, param } = require('express-validator');
const {
  registerMerchant,
  listMerchants,
  getMerchantTransactions,
  getMerchantDashboard,
} = require('../controllers/merchantController');

const router = express.Router();

// POST /api/merchant/register
router.post(
  '/merchant/register',
  [
    body('walletAddress').notEmpty().withMessage('walletAddress is required'),
    body('name').notEmpty().withMessage('Merchant name is required').trim(),
    body('preferredToken')
      .optional()
      .isIn(['USDC', 'USDT', 'DAI', 'BUSD']).withMessage('Invalid preferred token'),
  ],
  registerMerchant
);

// GET /api/merchants
router.get('/merchants', listMerchants);

// GET /api/merchant/:id/transactions
router.get(
  '/merchant/:id/transactions',
  [param('id').notEmpty().withMessage('Merchant ID is required')],
  getMerchantTransactions
);

// GET /api/merchant/:id/stats
router.get(
  '/merchant/:id/stats',
  [param('id').notEmpty().withMessage('Merchant ID is required')],
  getMerchantDashboard
);

module.exports = router;
