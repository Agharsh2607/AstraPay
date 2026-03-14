/**
 * services/swapService.js
 * Token Swap Quote Service — simulates Uniswap-style DEX quotes.
 *
 * In production this would:
 *  - Query Uniswap V3 on-chain quoter contracts via ethers.js
 *  - Or call 1inch / 0x API for aggregated quotes
 *
 * Here we use mock price data + realistic spread simulation.
 */

const { TOKEN_PRICES } = require('./routingEngine');

// ── Simulated liquidity depth per trading pair (affects slippage) ──────────
const PAIR_LIQUIDITY = {
  'ETH-USDC':   50_000_000,   // $50M TVL
  'ETH-USDT':   40_000_000,
  'ETH-DAI':    20_000_000,
  'BTC-USDC':   80_000_000,
  'SOL-USDC':   15_000_000,
  'MATIC-USDC': 10_000_000,
  'AVAX-USDC':  12_000_000,
  'BNB-USDC':   30_000_000,
  'ARB-USDC':   8_000_000,
  'DEFAULT':    5_000_000,
};

// ── Gas estimates per DEX / chain ─────────────────────────────────────────
const DEX_GAS = {
  Uniswap:  { gasUnits: 150_000, chainGwei: 15 },  // Ethereum mainnet
  QuickSwap:{ gasUnits: 100_000, chainGwei: 50 },   // Polygon (Gwei is cheap)
  Trader_Joe:{ gasUnits: 120_000, chainGwei: 28 },  // Avalanche
  Orca:     { gasUnits: 5_000,   chainGwei: 0.00025 }, // Solana (lamports → roughly)
  Default:  { gasUnits: 100_000, chainGwei: 20 },
};

// ETH price used to convert gas to USD
const ETH_USD = TOKEN_PRICES['ETH'] || 3500;

/**
 * Calculate price impact (slippage) for a given trade size vs pool liquidity.
 */
function calcPriceImpact(amountUSD, pairKey) {
  const liquidity = PAIR_LIQUIDITY[pairKey] || PAIR_LIQUIDITY['DEFAULT'];
  // Simple constant-product AMM approximation: impact ≈ amountUSD / (2 * liquidity)
  const impact = amountUSD / (2 * liquidity);
  return Math.min(impact, 0.05); // cap at 5%
}

/**
 * Calculate estimated gas cost in USD for a swap.
 */
function calcGasCostUSD(dexName = 'Default') {
  const dex = DEX_GAS[dexName] || DEX_GAS['Default'];
  const gasCostETH = (dex.gasUnits * dex.chainGwei * 1e-9); // Gwei → ETH
  return parseFloat((gasCostETH * ETH_USD).toFixed(4));
}

/**
 * Get a swap quote for converting `amount` units of `fromToken` to `toToken`.
 *
 * @param {string} fromToken
 * @param {string} toToken
 * @param {number} amount
 * @returns {object} Quote details
 */
function getSwapQuote(fromToken, toToken, amount) {
  const fromPrice = TOKEN_PRICES[fromToken.toUpperCase()];
  const toPrice   = TOKEN_PRICES[toToken.toUpperCase()];

  if (!fromPrice) throw new Error(`Unknown token: ${fromToken}`);
  if (!toPrice)   throw new Error(`Unknown token: ${toToken}`);

  const pairKey = `${fromToken.toUpperCase()}-${toToken.toUpperCase()}`;
  const amountUSD = amount * fromPrice;

  // Exchange rate (with tiny random market spread ±0.05%)
  const spread = (Math.random() - 0.5) * 0.001;
  const rate = parseFloat(((fromPrice / toPrice) * (1 - spread)).toFixed(6));
  const toAmount = parseFloat((amount * rate).toFixed(6));

  const priceImpact = calcPriceImpact(amountUSD, pairKey);
  const gasCostUSD = calcGasCostUSD('Uniswap');
  const protocolFeeUSD = amountUSD * 0.0003; // 0.03% AstraPay protocol fee

  const minimumReceived = parseFloat((toAmount * (1 - priceImpact - 0.005)).toFixed(6));

  return {
    from: fromToken.toUpperCase(),
    to: toToken.toUpperCase(),
    amount: parseFloat(amount),
    amountUSD: parseFloat(amountUSD.toFixed(2)),
    rate,
    toAmount,
    minimumReceived,
    priceImpact: `${(priceImpact * 100).toFixed(4)}%`,
    estimatedGas: `$${gasCostUSD}`,
    protocolFee: `$${protocolFeeUSD.toFixed(4)}`,
    totalFee: `$${(gasCostUSD + protocolFeeUSD).toFixed(4)}`,
    dex: 'AstraPay Aggregator (Uniswap V3 + 1inch)',
    validFor: '30s',
    timestamp: new Date().toISOString(),
  };
}

module.exports = { getSwapQuote };
