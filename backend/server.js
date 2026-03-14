/**
 * server.js — AstraPay Backend Entry Point
 *
 * Starts the Express API server + Socket.io WebSocket server.
 *
 * Run with:
 *   npm run dev   (development — nodemon auto-reload)
 *   npm start     (production)
 */

require('dotenv').config();

const express           = require('express');
const http              = require('http');
const cors              = require('cors');
const { Server }        = require('socket.io');
const connectDB         = require('./config/db');
const { startRealListener } = require('./services/blockchainListener');
const { initTransactionFeed } = require('./websocket/transactionFeed');
const { setIO }         = require('./controllers/paymentController');
const { getProtocolStats }  = require('./services/analyticsService');

// ── Import routes ──────────────────────────────────────────────────────────
const paymentRoutes  = require('./routes/paymentRoutes');
const swapRoutes     = require('./routes/swapRoutes');
const merchantRoutes = require('./routes/merchantRoutes');

// ── App setup ──────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

// ── CORS ───────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://127.0.0.1:5500',      // VS Code Live Server
    'http://localhost:5500',
    'null',                        // local file:// origin
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

// Pass Socket.io instance to the payment controller (for tx broadcasts)
setIO(io);

// ── Database ───────────────────────────────────────────────────────────────
connectDB();

// ── WebSocket transaction feed ─────────────────────────────────────────────
initTransactionFeed(io);

// ── REST API Routes ────────────────────────────────────────────────────────
app.use('/api', paymentRoutes);
app.use('/api', swapRoutes);
app.use('/api', merchantRoutes);

// ── Protocol stats endpoint ────────────────────────────────────────────────
app.get('/api/protocol-stats', async (_req, res) => {
  try {
    const stats = await getProtocolStats();
    return res.json({ success: true, ...stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    service: 'AstraPay Backend',
    version: '1.0.0',
    mode: process.env.SIMULATION_MODE === 'true' ? 'simulation' : 'production',
    timestamp: new Date().toISOString(),
  })
);

// ── Root ───────────────────────────────────────────────────────────────────
app.get('/', (_req, res) =>
  res.json({
    name: 'AstraPay API',
    version: '1.0.0',
    endpoints: {
      health:          'GET  /health',
      protocolStats:   'GET  /api/protocol-stats',
      createPayment:   'POST /api/create-payment',
      swapQuote:       'GET  /api/swap-quote?from=ETH&to=USDC&amount=1',
      supportedTokens: 'GET  /api/supported-tokens',
      transactions:    'GET  /api/transactions',
      transaction:     'GET  /api/transaction/:txHash',
      merchants:       'GET  /api/merchants',
      merchantStats:   'GET  /api/merchant/:id/stats',
      merchantTxs:     'GET  /api/merchant/:id/transactions',
      registerMerchant:'POST /api/merchant/register',
    },
    websocket: {
      events: [
        'transaction:new    — new payment initiated',
        'transaction:update — status changed',
        'transaction:feed   — live feed event',
        'stats:update       — protocol stats refresh',
        'stats:request      — client can emit to request stats',
      ],
    },
  })
);

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Endpoint not found' })
);

// ── Start ──────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║        AstraPay Backend v1.0          ║');
  console.log('  ╠═══════════════════════════════════════╣');
  console.log(`  ║  API Server → http://localhost:${PORT}    ║`);
  console.log(`  ║  Mode       → ${process.env.SIMULATION_MODE === 'true' ? 'SIMULATION 🟡          ' : 'PRODUCTION 🟢          '}║`);
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('');

  // Start optional real blockchain listener
  startRealListener();
});

module.exports = { app, server, io };
