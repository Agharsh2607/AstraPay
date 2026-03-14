/**
 * controllers/swapController.js
 * Handles GET /api/swap-quote
 */

const { validationResult } = require('express-validator');
const { getSwapQuote }     = require('../services/swapService');

/**
 * GET /api/swap-quote?from=ETH&to=USDC&amount=1
 */
const getQuote = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { from, to, amount } = req.query;

  try {
    const quote = getSwapQuote(from, to, parseFloat(amount));
    return res.json({ success: true, quote });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/supported-tokens — return all tokens with prices
 */
const getSupportedTokens = (req, res) => {
  const { TOKEN_PRICES } = require('../services/routingEngine');
  const tokens = Object.entries(TOKEN_PRICES).map(([symbol, priceUSD]) => ({
    symbol,
    priceUSD,
    type: ['USDC', 'USDT', 'DAI', 'BUSD'].includes(symbol) ? 'stablecoin' : 'crypto',
  }));
  return res.json({ success: true, count: tokens.length, tokens });
};

module.exports = { getQuote, getSupportedTokens };
