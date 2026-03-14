/**
 * websocket/transactionFeed.js
 * Real-time transaction feed via Socket.io.
 *
 * Events broadcast to clients:
 *  - transaction:new    — A new payment was created (status: pending)
 *  - transaction:update — A transaction was confirmed or failed
 *  - transaction:feed   — Aggregated live feed event for the dashboard
 *  - stats:update       — Protocol statistics update (sent every 10s)
 *
 * Client usage:
 *  const socket = io('http://localhost:5000');
 *  socket.on('transaction:feed', (data) => console.log(data));
 */

const { getProtocolStats } = require('../services/analyticsService');

// Simulated background transaction feed (for demo without real payments)
const DEMO_ROUTES = [
  { route: 'ETH → USDC → Polygon',   from: 'ETH',   amount: 2.5  },
  { route: 'BTC → USDC → Arbitrum',  from: 'BTC',   amount: 0.05 },
  { route: 'SOL → USDC → Base',      from: 'SOL',   amount: 180  },
  { route: 'AVAX → USDC → zkSync',   from: 'AVAX',  amount: 50   },
  { route: 'MATIC → USDC → Optimism',from: 'MATIC', amount: 5000 },
  { route: 'BNB → USDC → Polygon',   from: 'BNB',   amount: 8    },
  { route: 'ETH → DAI → Arbitrum',   from: 'ETH',   amount: 1.2  },
];

const TOKEN_PRICES = {
  ETH: 3520, BTC: 68000, SOL: 168, MATIC: 0.82,
  AVAX: 36,  BNB: 580,   ARB: 1.12,
};

/**
 * Initialize WebSocket behavior.
 * @param {object} io - Socket.io server instance
 */
function initTransactionFeed(io) {
  // ── Connection handler ────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`🔌 [WS] Client connected: ${socket.id}`);

    // Send current stats immediately on connect
    getProtocolStats().then((stats) => {
      socket.emit('stats:update', stats);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [WS] Client disconnected: ${socket.id}`);
    });

    // Allow clients to request a stats refresh
    socket.on('stats:request', async () => {
      const stats = await getProtocolStats();
      socket.emit('stats:update', stats);
    });
  });

  // ── Demo feed: simulate live transactions every 4–8 seconds ──────
  const broadcastDemoTransaction = () => {
    const demo   = DEMO_ROUTES[Math.floor(Math.random() * DEMO_ROUTES.length)];
    const price  = TOKEN_PRICES[demo.from] || 1;
    const latency = `${(Math.random() * 0.4 + 0.2).toFixed(2)}s`;
    const statuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'failed'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const event = {
      txHash:    `0x${Math.random().toString(16).substr(2, 40)}`,
      route:     demo.route,
      fromToken: demo.from,
      toToken:   'USDC',
      amount:    demo.amount,
      amountUSD: parseFloat((demo.amount * price).toFixed(2)),
      latency,
      status,
      timestamp: new Date().toISOString(),
      source:    'demo',
    };

    io.emit('transaction:feed', event);

    // Schedule next demo transaction
    const nextDelay = 4000 + Math.floor(Math.random() * 4000);
    setTimeout(broadcastDemoTransaction, nextDelay);
  };

  // Start demo feed after 3s (allow server to fully boot)
  setTimeout(broadcastDemoTransaction, 3000);

  // ── Stats broadcast every 15 seconds ─────────────────────────────
  setInterval(async () => {
    try {
      const stats = await getProtocolStats();
      io.emit('stats:update', stats);
    } catch (e) {
      // silent
    }
  }, 15000);

  console.log('✅ [WS] Transaction feed initialized');
}

module.exports = { initTransactionFeed };
