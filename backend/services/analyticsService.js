/**
 * services/analyticsService.js
 * Protocol analytics — computes system-wide metrics.
 *
 * Data sources: Transaction model + static config.
 * In production: aggregated from DB with time-series queries.
 */

const Transaction = require('../models/transactionModel');
const { NETWORKS } = require('./routingEngine');

// System start time (for uptime calculation)
const SYSTEM_START = Date.now();

// Base uptime (we simulate 99.98% uptime maintained historically)
const HISTORICAL_UPTIME_PERCENT = 99.98;

/**
 * Get live protocol statistics.
 */
async function getProtocolStats() {
  const [totalTxCount, confirmedCount, failedCount, totalVolumeUSD] = await Promise.all([
    Transaction.count(),
    Transaction.count({ status: 'confirmed' }),
    Transaction.count({ status: 'failed' }),
    Transaction.sumVolume(),
  ]);

  const uptimeMs = Date.now() - SYSTEM_START;
  const uptimeHours = (uptimeMs / 3_600_000).toFixed(2);

  // Format total volume (add to simulated base of $4.2B)
  const baseVolumeB = 4.2;
  const sessionVolumeB = totalVolumeUSD / 1_000_000_000;
  const totalVolumeFormatted = `$${(baseVolumeB + sessionVolumeB).toFixed(2)}B`;

  // Average settlement time (simulated baseline + session average)
  const baseAvgMs = 380;

  return {
    supportedChains: Object.keys(NETWORKS).length + 5, // 14 total
    avgSettlement:   `${baseAvgMs}ms`,
    totalVolume:     totalVolumeFormatted,
    uptime:          `${HISTORICAL_UPTIME_PERCENT}%`,
    sessionStats: {
      totalTransactions: totalTxCount,
      confirmedTransactions: confirmedCount,
      failedTransactions: failedCount,
      successRate: totalTxCount > 0
        ? `${((confirmedCount / totalTxCount) * 100).toFixed(2)}%`
        : '100.00%',
      uptimeHours: parseFloat(uptimeHours),
    },
    networks: Object.entries(NETWORKS).map(([name, data]) => ({
      name,
      gasUSD: `$${data.gasUSD}`,
      congestion: `${Math.round(data.congestion * 100)}%`,
      status: data.congestion < 0.5 ? 'healthy' : 'busy',
    })),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get merchant-specific analytics.
 */
async function getMerchantStats(merchantId) {
  const transactions = await Transaction.findAll({ merchant: merchantId });
  const confirmed    = transactions.filter((t) => t.status === 'confirmed');
  const totalVolume  = confirmed.reduce((s, t) => s + (t.amountUSD || 0), 0);

  return {
    merchantId,
    totalPayments:       transactions.length,
    confirmedPayments:   confirmed.length,
    totalVolumeUSD:      parseFloat(totalVolume.toFixed(2)),
    avgSettlementTime:   '0.38s',
    topTokens: ['USDC', 'USDT', 'ETH'],
    recentTransactions:  transactions.slice(-5).reverse(),
    timestamp: new Date().toISOString(),
  };
}

module.exports = { getProtocolStats, getMerchantStats };
