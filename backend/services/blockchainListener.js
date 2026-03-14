/**
 * services/blockchainListener.js
 * Transaction Monitoring Service.
 *
 * In production: uses ethers.js to listen to on-chain events via WebSocket RPC.
 * In simulation: generates mock tx hashes and simulates confirmation lifecycle.
 *
 * Emits transaction status updates through the passed Socket.io instance.
 */

const { ethers } = require('ethers');
const Transaction = require('../models/transactionModel');

// ── Mock transaction lifecycle timing ─────────────────────────────────────
const CONFIRMATION_DELAY_MS = 2000;  // 2s: pending → confirmed
const FAILURE_PROBABILITY   = 0.03;  // 3% chance of failure (simulated)

/**
 * Generate a realistic-looking mock transaction hash.
 */
function generateMockTxHash() {
  const randomBytes = ethers.hexlify(ethers.randomBytes(32));
  return randomBytes; // Already 0x-prefixed 64-char hex
}

/**
 * Simulate the confirmation of a blockchain transaction.
 * Updates DB and broadcasts via Socket.io.
 *
 * @param {string}   txHash  - Transaction hash
 * @param {object}   txData  - Original transaction data
 * @param {object}   io      - Socket.io server instance
 */
async function simulateConfirmation(txHash, txData, io) {
  setTimeout(async () => {
    const failed = Math.random() < FAILURE_PROBABILITY;
    const newStatus = failed ? 'failed' : 'confirmed';

    const actualLatency = `${(Math.random() * 0.5 + 0.2).toFixed(2)}s`;

    await Transaction.updateStatus(txHash, newStatus, { latency: actualLatency });

    const updatedTx = {
      txHash,
      route: txData.route,
      fromToken: txData.fromToken,
      toToken: txData.toToken,
      amount: txData.amount,
      amountUSD: txData.amountUSD,
      merchant: txData.merchant,
      status: newStatus,
      latency: actualLatency,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all connected WebSocket clients
    if (io) {
      io.emit('transaction:update', updatedTx);
      io.emit('transaction:feed', updatedTx); // live feed event
    }

    console.log(`📡 [Listener] TX ${txHash.slice(0, 12)}… → ${newStatus.toUpperCase()} (${actualLatency})`);
  }, CONFIRMATION_DELAY_MS + Math.floor(Math.random() * 1500));
}

/**
 * Start monitoring a newly created payment.
 * Creates the tx in DB as "pending", then simulates confirmation.
 *
 * @param {object} paymentData - { fromToken, toToken, amount, amountUSD, route, merchant, targetChain, estimatedFee, estimatedTime }
 * @param {object} io          - Socket.io server instance
 * @returns {object}           - { txHash, status: 'pending' }
 */
async function monitorPayment(paymentData, io) {
  const txHash = generateMockTxHash();

  const txRecord = {
    txHash,
    fromToken:     paymentData.fromToken,
    toToken:       paymentData.toToken,
    amount:        paymentData.amount,
    amountUSD:     paymentData.amountUSD,
    route:         paymentData.route,
    merchant:      paymentData.merchant,
    targetChain:   paymentData.targetChain,
    estimatedFee:  paymentData.estimatedFee,
    estimatedTime: paymentData.estimatedTime,
    status:        'pending',
  };

  await Transaction.create(txRecord);

  // Broadcast pending status immediately
  if (io) {
    io.emit('transaction:new', { ...txRecord, timestamp: new Date().toISOString() });
  }

  console.log(`🔄 [Listener] TX ${txHash.slice(0, 12)}… created — status: pending`);

  // Kick off async confirmation simulation
  simulateConfirmation(txHash, txRecord, io);

  return { txHash, status: 'pending' };
}

/**
 * (Optional) Real ethers.js listener setup for production use.
 * Connects to a provider and listens for Transfer events.
 */
async function startRealListener() {
  if (process.env.SIMULATION_MODE === 'true') {
    console.log('🟡 [Listener] Simulation mode — real blockchain listener disabled');
    return;
  }

  try {
    const provider = new ethers.WebSocketProvider(process.env.ETH_RPC_URL);
    provider.on('block', (blockNumber) => {
      console.log(`⛓  [Listener] New Ethereum block: ${blockNumber}`);
    });
    console.log('✅ [Listener] Real Ethereum listener started');
  } catch (err) {
    console.warn('⚠️  [Listener] Could not start real listener:', err.message);
  }
}

module.exports = { monitorPayment, startRealListener, generateMockTxHash };
