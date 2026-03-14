/**
 * services/routingEngine.js
 * Payment Routing Engine — core logic of AstraPay.
 *
 * Determines the optimal cross-chain payment route by comparing:
 *  - Gas cost (simulated per network)
 *  - Network congestion score (simulated)
 *  - Swap liquidity depth (simulated)
 *
 * Real implementation would query on-chain data via ethers.js / RPC calls.
 */

// ── Mock network data ──────────────────────────────────────────────────────
const NETWORKS = {
  Ethereum:   { gasUSD: 4.2,  congestion: 0.7, liquidity: 1.0  },
  Polygon:    { gasUSD: 0.01, congestion: 0.3, liquidity: 0.85 },
  Arbitrum:   { gasUSD: 0.08, congestion: 0.25,liquidity: 0.9  },
  Optimism:   { gasUSD: 0.05, congestion: 0.2, liquidity: 0.8  },
  BNBChain:   { gasUSD: 0.15, congestion: 0.5, liquidity: 0.9  },
  Avalanche:  { gasUSD: 0.12, congestion: 0.35,liquidity: 0.75 },
  Solana:     { gasUSD: 0.00025, congestion: 0.15, liquidity: 0.7 },
  Base:       { gasUSD: 0.04, congestion: 0.2, liquidity: 0.72 },
  zkSync:     { gasUSD: 0.03, congestion: 0.15, liquidity: 0.68 },
};

// ── Token price map (mock USD prices) ─────────────────────────────────────
const TOKEN_PRICES = {
  ETH:   3520,
  BTC:   68000,
  SOL:   168,
  MATIC: 0.82,
  AVAX:  36,
  BNB:   580,
  ARB:   1.12,
  USDC:  1.0,
  USDT:  1.0,
  DAI:   1.0,
};

// ── Swap routes: which intermediate tokens to use per pair ─────────────────
const SWAP_PATHS = {
  'ETH-USDC':   ['ETH', 'USDC'],
  'ETH-USDT':   ['ETH', 'USDC', 'USDT'],
  'ETH-DAI':    ['ETH', 'DAI'],
  'BTC-USDC':   ['BTC', 'WBTC', 'USDC'],
  'SOL-USDC':   ['SOL', 'USDC'],
  'MATIC-USDC': ['MATIC', 'USDC'],
  'AVAX-USDC':  ['AVAX', 'USDC'],
  'BNB-USDC':   ['BNB', 'USDC'],
};

/**
 * Score a route — lower is better.
 * Formula: gasCost * 0.5 + congestion * 0.3 + (1 - liquidity) * 0.2
 */
function scoreRoute(network) {
  const n = NETWORKS[network] || NETWORKS['Polygon'];
  return n.gasUSD * 0.5 + n.congestion * 0.3 + (1 - n.liquidity) * 0.2;
}

/**
 * Calculate estimated settlement time in milliseconds.
 */
function estimateTime(sourceChain, targetChain) {
  const sourceCongest = (NETWORKS[sourceChain] || NETWORKS['Polygon']).congestion;
  const targetCongest = (NETWORKS[targetChain] || NETWORKS['Polygon']).congestion;
  const baseMs = 200;
  const variable = Math.round((sourceCongest + targetCongest) * 200);
  return baseMs + variable + Math.floor(Math.random() * 80);
}

/**
 * Build the token hop path for a given from/to token pair.
 */
function buildSwapPath(fromToken, toToken, targetToken = 'USDC') {
  const key = `${fromToken}-${targetToken}`;
  const path = SWAP_PATHS[key] || [fromToken, targetToken];
  // Append target chain's preferred token if different
  if (toToken && toToken !== targetToken && !path.includes(toToken)) {
    path.push(toToken);
  }
  return path;
}

/**
 * Main entry point: find the best route for a payment.
 *
 * @param {string} fromToken   - Token user is paying with (e.g. "ETH")
 * @param {number} amount      - Amount in the fromToken units
 * @param {string} targetChain - Destination blockchain
 * @param {string} merchantToken - Token merchant wants to receive (default USDC)
 * @returns {object} Best route details
 */
function findBestRoute(fromToken, amount, targetChain, merchantToken = 'USDC') {
  const sourceChain = 'Ethereum'; // default source chain assumption

  // Build all candidate routes (source → intermediate chain → target)
  const candidates = Object.keys(NETWORKS).map((chain) => {
    const score = scoreRoute(chain);
    const gasUSD = (NETWORKS[chain].gasUSD + NETWORKS[sourceChain].gasUSD).toFixed(4);
    return { chain, score, gasUSD: parseFloat(gasUSD) };
  });

  // Sort by score (lowest = best)
  candidates.sort((a, b) => a.score - b.score);
  const bestIntermediate = candidates[0];

  // Build the token swap path
  const swapPath = buildSwapPath(fromToken, merchantToken, 'USDC');
  const routeString = [
    fromToken,
    ...swapPath.slice(1, -1).map((t) => t),
    merchantToken,
    targetChain,
  ]
    .filter((v, i, arr) => arr.indexOf(v) === i) // deduplicate
    .join(' → ');

  // Convert amount to USD
  const priceUSD = TOKEN_PRICES[fromToken] || 1;
  const amountUSD = amount * priceUSD;

  // Estimate fee
  const totalFeeUSD = bestIntermediate.gasUSD + amountUSD * 0.0003; // 0.03% protocol fee

  // Estimate time
  const timeMs = estimateTime(sourceChain, targetChain);

  return {
    route: routeString,
    sourceChain,
    targetChain,
    intermediateChain: bestIntermediate.chain,
    fromToken,
    toToken: merchantToken,
    amount,
    amountUSD: parseFloat(amountUSD.toFixed(2)),
    estimatedFee: `$${totalFeeUSD.toFixed(3)}`,
    estimatedTime: `${(timeMs / 1000).toFixed(2)}s`,
    estimatedTimeMs: timeMs,
    routeScore: parseFloat(bestIntermediate.score.toFixed(4)),
    gasCostUSD: bestIntermediate.gasUSD,
    alternatives: candidates.slice(1, 3).map((c) => ({
      chain: c.chain,
      estimatedFee: `$${(c.gasUSD + amountUSD * 0.0003).toFixed(3)}`,
      score: c.score.toFixed(4),
    })),
  };
}

module.exports = { findBestRoute, TOKEN_PRICES, NETWORKS };
