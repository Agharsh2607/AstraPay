/* ============================================================
   AstraPay — script.js
   Frontend ↔ Backend integration via Socket.io + REST API
   ============================================================ */

// ── Backend config ─────────────────────────────────────────
const API_BASE = 'http://localhost:5000/api';
const WS_URL   = 'http://localhost:5000';

// ── NAV scroll effect ──────────────────────────────────────
const mainNav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  mainNav.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Particle canvas ────────────────────────────────────────
const canvas  = document.getElementById('particleCanvas');
const ctx     = canvas.getContext('2d');
let particles = [];
const connectionThreshold = 140;

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
resizeCanvas();

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x  = Math.random() * canvas.width;
    this.y  = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.r  = Math.random() * 1.8 + 0.5;
    this.blue = Math.random() > 0.5;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > canvas.width)  this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.blue ? 'rgba(59,158,255,0.6)' : 'rgba(34,211,165,0.6)';
    ctx.fill();
  }
}

function initParticles() {
  const count = Math.floor((canvas.width * canvas.height) / 14000);
  particles = Array.from({ length: Math.min(count, 80) }, () => new Particle());
}

function drawConnections() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < connectionThreshold) {
        const alpha = (1 - dist / connectionThreshold) * 0.15;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(59,158,255,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  drawConnections();
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

// ── Scroll reveal ──────────────────────────────────────────
const revealEls = document.querySelectorAll(
  '.stat-card, .feature-card, .step, .chain-pill, .cta-card, .hud-card'
);
revealEls.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), entry.target.dataset.delay || 0);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach((el, i) => {
  el.dataset.delay = i * 60;
  revealObserver.observe(el);
});

// ── Counter animation ──────────────────────────────────────
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const isFloat = !Number.isInteger(target);
  const duration = 1800;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = eased * target;
    el.textContent = prefix + (isFloat ? value.toFixed(2) : Math.round(value)) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-card__value[data-target]').forEach(el => statObserver.observe(el));

// ── Chains ticker pause on hover ───────────────────────────
const chainsTrack = document.getElementById('chainsTrack');
if (chainsTrack) {
  chainsTrack.addEventListener('mouseenter', () => { chainsTrack.style.animationPlayState = 'paused'; });
  chainsTrack.addEventListener('mouseleave', () => { chainsTrack.style.animationPlayState = 'running'; });
}

// ── CTA form submission ────────────────────────────────────
const ctaSubmit  = document.getElementById('ctaSubmit');
const emailInput = document.getElementById('emailInput');

if (ctaSubmit) {
  ctaSubmit.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      emailInput.style.borderColor = '#ff4d6d';
      emailInput.style.boxShadow = '0 0 0 3px rgba(255,77,109,0.2)';
      emailInput.focus();
      setTimeout(() => { emailInput.style.borderColor = ''; emailInput.style.boxShadow = ''; }, 2000);
      return;
    }
    ctaSubmit.textContent = "✓ You're on the list!";
    ctaSubmit.style.background = 'linear-gradient(135deg, #22d3a5, #3b9eff)';
    ctaSubmit.disabled = true;
    emailInput.value = '';
    emailInput.placeholder = 'Access request sent!';
  });
  emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') ctaSubmit.click(); });
}

// ── Feature card tilt ──────────────────────────────────────
document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const rotateX = (((e.clientY - rect.top) / rect.height) - 0.5) * -10;
    const rotateY = (((e.clientX - rect.left) / rect.width) - 0.5) * 10;
    card.style.transform = `translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    card.style.transition = 'transform 0.1s ease';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease';
  });
});

// ============================================================
// BACKEND INTEGRATION — Socket.io + REST API
// ============================================================

// HUD card DOM references
const hudRows = document.querySelectorAll('.hud-val');

function updateHUD(tx) {
  if (hudRows[0]) hudRows[0].textContent = tx.route || 'ETH → USDC → Polygon';
  if (hudRows[1]) hudRows[1].textContent = tx.amountUSD
    ? `$${Number(tx.amountUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$0.00';
  if (hudRows[2]) hudRows[2].textContent = `${tx.latency || '0.38s'} ⚡`;
  if (hudRows[3]) hudRows[3].textContent = tx.estimatedFee || '$0.004';

  // Update status indicator
  const statusEl = document.querySelector('.hud-status');
  if (statusEl) {
    const statusMap = { confirmed: '● CONFIRMED', pending: '◌ PENDING…', failed: '✕ FAILED' };
    statusEl.textContent = statusMap[tx.status] || '● CONFIRMED';
    statusEl.style.color = tx.status === 'confirmed' ? 'var(--emerald)'
      : tx.status === 'failed' ? '#ff4d6d' : '#f59e0b';
  }
}

/**
 * Fetch protocol stats from the backend and update the stat cards.
 */
async function fetchAndUpdateStats() {
  try {
    const res  = await fetch(`${API_BASE}/protocol-stats`);
    const data = await res.json();

    if (!data.success) return;

    // Update stat counters live from backend
    const cards = document.querySelectorAll('.stat-card__value');
    const values = [
      data.supportedChains,
      parseInt(data.avgSettlement),
      parseFloat(data.totalVolume.replace(/[$B]/g, '')),
      parseFloat(data.uptime),
    ];
    const targets = [null, 'ms', 'B', '%'];
    const prefixes = [null, null, '$', null];

    cards.forEach((card, i) => {
      if (values[i] !== undefined) {
        card.dataset.target = String(values[i]);
        if (targets[i]) card.dataset.suffix = targets[i];
        if (prefixes[i]) card.dataset.prefix = prefixes[i];
      }
    });
  } catch {
    // Backend offline — silently fall back to static values
  }
}

/**
 * Initialize Socket.io connection to the AstraPay backend.
 * Falls back to local simulation if the backend is not running.
 */
function initBackendConnection() {
  // Check if socket.io client library is available
  if (typeof io === 'undefined') {
    console.warn('[AstraPay] Socket.io client not loaded — falling back to local simulation');
    startLocalSimulation();
    return;
  }

  const socket = io(WS_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 3,
    timeout: 5000,
  });

  socket.on('connect', () => {
    console.log('🔌 [AstraPay] Connected to backend WebSocket');
    fetchAndUpdateStats();
  });

  // Live transaction feed — updates HUD card
  socket.on('transaction:feed', (tx) => {
    console.log('📡 [AstraPay] Live TX:', tx.route, tx.status);
    updateHUD(tx);
  });

  // New payment created
  socket.on('transaction:new', (tx) => {
    console.log('🔄 [AstraPay] New payment:', tx.txHash?.slice(0, 12) + '…');
  });

  // Confirmed / failed update
  socket.on('transaction:update', (tx) => {
    console.log(`✅ [AstraPay] TX ${tx.txHash?.slice(0, 12)}… → ${tx.status}`);
    updateHUD(tx);
  });

  // Stats refresh from backend
  socket.on('stats:update', (stats) => {
    console.log('📊 [AstraPay] Stats update received');
  });

  socket.on('connect_error', () => {
    console.warn('[AstraPay] Backend not reachable — using local simulation');
    startLocalSimulation();
  });

  socket.on('disconnect', () => {
    console.log('[AstraPay] Disconnected from backend');
  });
}

/**
 * Local simulation fallback — rotates HUD data without the backend.
 */
function startLocalSimulation() {
  const demoRoutes = [
    { route: 'ETH → USDC → Polygon',    amountUSD: 128400, latency: '0.38s', estimatedFee: '$0.004', status: 'confirmed' },
    { route: 'BTC → USDC → Arbitrum',   amountUSD: 54200,  latency: '0.29s', estimatedFee: '$0.003', status: 'confirmed' },
    { route: 'SOL → USDC → Base',       amountUSD: 312900, latency: '0.21s', estimatedFee: '$0.001', status: 'confirmed' },
    { route: 'AVAX → USDC → zkSync',    amountUSD: 78100,  latency: '0.45s', estimatedFee: '$0.002', status: 'pending'   },
    { route: 'MATIC → USDC → Optimism', amountUSD: 209500, latency: '0.31s', estimatedFee: '$0.002', status: 'confirmed' },
  ];
  let idx = 0;

  setInterval(() => {
    idx = (idx + 1) % demoRoutes.length;
    updateHUD(demoRoutes[idx]);
  }, 3500);
}

// ── Boot ───────────────────────────────────────────────────
// Load socket.io client from backend, then connect
(function boot() {
  const script = document.createElement('script');
  script.src = `${WS_URL}/socket.io/socket.io.js`;
  script.onload  = () => initBackendConnection();
  script.onerror = () => startLocalSimulation();
  document.head.appendChild(script);

  // Also fetch stats via REST on load
  fetchAndUpdateStats();
})();
