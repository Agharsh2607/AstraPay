/* ============================================================
   AstraPay — script.js
   Frontend ↔ Backend integration via Socket.io + REST API
   ============================================================ */

const API_BASE = 'http://localhost:5000/api';
const WS_URL   = 'http://localhost:5000';

// ── NAV scroll ─────────────────────────────────────────────
const mainNav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  mainNav.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Particle canvas ────────────────────────────────────────
const canvas = document.getElementById('particleCanvas');
const ctx    = canvas.getContext('2d');
let particles = [];

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
    this.x += this.vx; this.y += this.vy;
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
  const count = Math.min(Math.floor((canvas.width * canvas.height) / 14000), 80);
  particles = Array.from({ length: count }, () => new Particle());
}

function drawConnections() {
  const threshold = 140;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(59,158,255,${(1 - dist / threshold) * 0.15})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

(function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  drawConnections();
  requestAnimationFrame(animateParticles);
})();
initParticles();

// ── Scroll reveal ──────────────────────────────────────────
document.querySelectorAll('.stat-card,.feature-card,.step,.chain-pill,.cta-card,.hud-card,.widget-panel,.feed-panel')
  .forEach((el, i) => {
    el.classList.add('reveal');
    el.dataset.delay = i * 50;
  });

new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), e.target.dataset.delay || 0);
    }
  });
}, { threshold: 0.12 }).observe
&& document.querySelectorAll('.reveal').forEach(el =>
  new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), e.target.dataset.delay || 0);
      }
    });
  }, { threshold: 0.12 }).observe(el)
);

// ── Counter animation ──────────────────────────────────────
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const isFloat = !Number.isInteger(target);
  const start = performance.now();
  const dur = 1800;
  const step = (now) => {
    const p = Math.min((now - start) / dur, 1);
    const v = (1 - Math.pow(1 - p, 3)) * target;
    el.textContent = prefix + (isFloat ? v.toFixed(2) : Math.round(v)) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
document.querySelectorAll('.stat-card__value[data-target]').forEach(el =>
  new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) animateCounter(e.target); });
  }, { threshold: 0.5 }).observe(el)
);

// ── Chains ticker ──────────────────────────────────────────
const chainsTrack = document.getElementById('chainsTrack');
if (chainsTrack) {
  chainsTrack.addEventListener('mouseenter', () => { chainsTrack.style.animationPlayState = 'paused'; });
  chainsTrack.addEventListener('mouseleave', () => { chainsTrack.style.animationPlayState = 'running'; });
}

// ── CTA form ───────────────────────────────────────────────
const ctaSubmit = document.getElementById('ctaSubmit');
const emailInput = document.getElementById('emailInput');
if (ctaSubmit) {
  ctaSubmit.addEventListener('click', () => {
    const email = emailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.style.borderColor = '#ff4d6d';
      setTimeout(() => { emailInput.style.borderColor = ''; }, 2000);
      return;
    }
    ctaSubmit.textContent = "✓ You're on the list!";
    ctaSubmit.style.background = 'linear-gradient(135deg, #22d3a5, #3b9eff)';
    ctaSubmit.disabled = true;
    emailInput.value = '';
    emailInput.placeholder = 'Access request sent!';
  });
  emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') ctaSubmit.click(); });
}

// ── Feature card tilt ──────────────────────────────────────
document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    const rx = (((e.clientY - r.top) / r.height) - 0.5) * -10;
    const ry = (((e.clientX - r.left) / r.width) - 0.5) * 10;
    card.style.transform = `translateY(-8px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    card.style.transition = 'transform 0.1s ease';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease';
  });
});

// ============================================================
// HUD CARD — updates from live feed
// ============================================================
const hudRows = document.querySelectorAll('.hud-val');
function updateHUD(tx) {
  if (hudRows[0]) hudRows[0].textContent = tx.route || '—';
  if (hudRows[1]) hudRows[1].textContent = tx.amountUSD
    ? `$${Number(tx.amountUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$0.00';
  if (hudRows[2]) hudRows[2].textContent = `${tx.latency || '0.38s'} ⚡`;
  if (hudRows[3]) hudRows[3].textContent = tx.estimatedFee || '$0.004';
  const statusEl = document.querySelector('.hud-status');
  if (statusEl) {
    const map = { confirmed: '● CONFIRMED', pending: '◌ PENDING…', failed: '✕ FAILED' };
    statusEl.textContent = map[tx.status] || '● CONFIRMED';
    statusEl.style.color = tx.status === 'confirmed' ? 'var(--emerald)'
      : tx.status === 'failed' ? '#ff4d6d' : '#f59e0b';
  }
}

// ============================================================
// LIVE FEED
// ============================================================
let feedCount = 0;
const feedList  = document.getElementById('feedList');
const feedBadge = document.getElementById('feedCount');

function addFeedItem(tx) {
  feedCount++;
  if (feedBadge) feedBadge.textContent = `${feedCount} tx${feedCount !== 1 ? 's' : ''}`;

  // Remove empty state
  const empty = feedList.querySelector('.feed-empty');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = `feed-item ${tx.status || 'pending'}`;

  const amountStr = tx.amountUSD
    ? `$${Number(tx.amountUSD).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : `${tx.amount} ${tx.fromToken || ''}`;

  item.innerHTML = `
    <div class="feed-item__route">${tx.route || 'Unknown Route'}</div>
    <div class="feed-item__meta">
      <span class="feed-item__amount">${amountStr}</span>
      <span>${tx.latency || '—'} · ${new Date().toLocaleTimeString()}</span>
      <span class="feed-item__status ${tx.status}">${(tx.status || 'pending').toUpperCase()}</span>
    </div>
  `;

  // Prepend (newest on top), keep max 30 items
  feedList.insertBefore(item, feedList.firstChild);
  if (feedList.children.length > 30) feedList.lastChild.remove();

  // Also update HUD
  updateHUD(tx);
}

// ============================================================
// BACKEND STATUS INDICATOR
// ============================================================
const backendDot   = document.getElementById('backendDot');
const backendLabel = document.getElementById('backendLabel');

function setBackendStatus(online) {
  if (!backendDot || !backendLabel) return;
  backendDot.className = `backend-dot ${online ? 'online' : 'offline'}`;
  backendLabel.textContent = online
    ? '🟢 Backend connected — localhost:5000'
    : '🔴 Backend offline — using simulation';
}

// ============================================================
// TAB SWITCHING
// ============================================================
document.querySelectorAll('.widget-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.widget-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.getElementById('swapTab').style.display = target === 'swap' ? 'flex' : 'none';
    document.getElementById('payTab').style.display  = target === 'pay'  ? 'flex' : 'none';
  });
});

// ============================================================
// SWAP QUOTE — calls GET /api/swap-quote
// ============================================================
document.getElementById('getQuoteBtn')?.addEventListener('click', async () => {
  const from   = document.getElementById('swapFrom').value;
  const to     = document.getElementById('swapTo').value;
  const amount = document.getElementById('swapAmount').value;
  const btn    = document.getElementById('getQuoteBtn');
  const result = document.getElementById('quoteResult');
  const errEl  = document.getElementById('quoteError');

  result.style.display = 'none';
  errEl.style.display  = 'none';
  btn.disabled = true;
  btn.textContent = 'Fetching…';

  try {
    const res  = await fetch(`${API_BASE}/swap-quote?from=${from}&to=${to}&amount=${amount}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message || 'Quote failed');

    const q = data.quote;
    document.getElementById('qRate').textContent    = `1 ${q.from} = ${q.rate} ${q.to}`;
    document.getElementById('qReceive').textContent = `${q.toAmount} ${q.to}`;
    document.getElementById('qImpact').textContent  = q.priceImpact;
    document.getElementById('qGas').textContent     = q.estimatedGas;
    document.getElementById('qFee').textContent     = q.protocolFee;
    document.getElementById('qDex').textContent     = q.dex;
    result.style.display = 'flex';
  } catch (err) {
    // Fallback: local simulation
    const mockRates = { ETH: 3520, BTC: 68000, SOL: 168, MATIC: 0.82, AVAX: 36, BNB: 580 };
    const rate = parseFloat(((mockRates[from] || 1) / 1).toFixed(4));
    document.getElementById('qRate').textContent    = `1 ${from} = ${rate} ${to}`;
    document.getElementById('qReceive').textContent = `${(parseFloat(amount) * rate).toFixed(4)} ${to}`;
    document.getElementById('qImpact').textContent  = '0.0012%';
    document.getElementById('qGas').textContent     = '$0.75';
    document.getElementById('qFee').textContent     = '$0.0042';
    document.getElementById('qDex').textContent     = 'Local simulation (backend offline)';
    result.style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Get Quote →';
  }
});

// ============================================================
// SEND PAYMENT — calls POST /api/create-payment
// ============================================================
document.getElementById('sendPayBtn')?.addEventListener('click', async () => {
  const token    = document.getElementById('payToken').value;
  const amount   = document.getElementById('payAmount').value;
  const chain    = document.getElementById('payChain').value;
  const merchant = document.getElementById('payMerchant').value.trim();
  const btn      = document.getElementById('sendPayBtn');
  const result   = document.getElementById('payResult');
  const errEl    = document.getElementById('payError');
  const btnText  = document.getElementById('sendBtnText');

  if (!merchant) {
    errEl.textContent = 'Please enter a merchant wallet address.';
    errEl.style.display = 'block';
    return;
  }

  result.style.display = 'none';
  errEl.style.display  = 'none';
  btn.disabled = true;
  btnText.textContent = '⏳ Processing…';

  try {
    const res  = await fetch(`${API_BASE}/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, amount: parseFloat(amount), targetChain: chain, merchant }),
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.errors?.[0]?.msg || data.message || 'Payment failed');

    const statusEl = document.getElementById('pStatus');
    statusEl.textContent = data.status.toUpperCase();
    statusEl.className   = `result-val status-badge status-${data.status}`;

    document.getElementById('pHash').textContent     = data.txHash;
    document.getElementById('pRoute').textContent    = data.route;
    document.getElementById('pAmountUSD').textContent= `$${data.amountUSD?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('pTime').textContent     = data.estimatedTime;
    document.getElementById('pFee').textContent      = data.estimatedFee;
    result.style.display = 'flex';

    // Show in live feed too
    addFeedItem({ route: data.route, amountUSD: data.amountUSD, latency: data.estimatedTime, status: data.status, fromToken: token });

    // After 2.5s update status to confirmed (matches backend simulation timing)
    setTimeout(() => {
      statusEl.textContent = 'CONFIRMED';
      statusEl.className   = 'result-val status-badge status-confirmed';
    }, 2800);

  } catch (err) {
    // Local simulation fallback
    const mockRoutes = { ETH: 'ETH → USDC → ', BTC: 'BTC → USDC → ', SOL: 'SOL → USDC → ', MATIC: 'MATIC → USDC → ', AVAX: 'AVAX → USDC → ', BNB: 'BNB → USDC → ' };
    const mockPrices = { ETH: 3520, BTC: 68000, SOL: 168, MATIC: 0.82, AVAX: 36, BNB: 580 };
    const mockHash   = '0x' + Math.random().toString(16).substr(2, 40);
    const mockRoute  = (mockRoutes[token] || `${token} → USDC → `) + chain;
    const mockUSD    = (parseFloat(amount) * (mockPrices[token] || 1)).toFixed(2);

    document.getElementById('pHash').textContent     = mockHash;
    document.getElementById('pRoute').textContent    = mockRoute;
    document.getElementById('pAmountUSD').textContent= `$${parseFloat(mockUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('pTime').textContent     = '0.38s (simulated)';
    document.getElementById('pFee').textContent      = '$0.004 (simulated)';
    const statusEl = document.getElementById('pStatus');
    statusEl.textContent = 'PENDING';
    statusEl.className = 'result-val status-badge status-pending';
    result.style.display = 'flex';

    addFeedItem({ route: mockRoute, amountUSD: parseFloat(mockUSD), latency: '0.38s', status: 'pending', fromToken: token });

    setTimeout(() => {
      statusEl.textContent = 'CONFIRMED';
      statusEl.className = 'result-val status-badge status-confirmed';
      addFeedItem({ route: mockRoute, amountUSD: parseFloat(mockUSD), latency: '0.38s', status: 'confirmed', fromToken: token });
    }, 2500);

  } finally {
    btn.disabled = false;
    btnText.textContent = 'Send Payment →';
  }
});

// ============================================================
// PROTOCOL STATS — fetch from backend to update stat cards
// ============================================================
async function fetchStats() {
  try {
    const res  = await fetch(`${API_BASE}/protocol-stats`);
    const data = await res.json();
    if (!data.success) return;
    const cards = document.querySelectorAll('.stat-card__value');
    const values = [data.supportedChains, parseInt(data.avgSettlement), parseFloat(data.totalVolume.replace(/[$B]/g, '')), parseFloat(data.uptime)];
    const suffixes = ['', 'ms', 'B', '%'];
    const prefixes = ['', '', '$', ''];
    cards.forEach((c, i) => {
      if (values[i] !== undefined) {
        c.dataset.target = String(values[i]);
        c.dataset.suffix = suffixes[i];
        c.dataset.prefix = prefixes[i];
      }
    });
  } catch { /* backend offline */ }
}

// ============================================================
// SOCKET.IO — connect to backend WebSocket
// ============================================================
function initSocket() {
  if (typeof io === 'undefined') { setBackendStatus(false); startLocalDemo(); return; }

  const socket = io(WS_URL, { transports: ['websocket', 'polling'], reconnectionAttempts: 3, timeout: 5000 });

  socket.on('connect', () => {
    setBackendStatus(true);
    fetchStats();
  });

  socket.on('transaction:feed', (tx) => addFeedItem(tx));
  socket.on('transaction:new',  (tx) => addFeedItem(tx));
  socket.on('transaction:update', (tx) => addFeedItem(tx));

  socket.on('connect_error', () => { setBackendStatus(false); startLocalDemo(); });
  socket.on('disconnect',    () =>  setBackendStatus(false));
}

// ── Local demo feed (fallback when backend is offline) ─────
function startLocalDemo() {
  const demos = [
    { route: 'ETH → USDC → Polygon',    amountUSD: 128400, latency: '0.38s', status: 'confirmed' },
    { route: 'BTC → USDC → Arbitrum',   amountUSD: 54200,  latency: '0.29s', status: 'confirmed' },
    { route: 'SOL → USDC → Base',       amountUSD: 312900, latency: '0.21s', status: 'confirmed' },
    { route: 'AVAX → USDC → zkSync',    amountUSD: 78100,  latency: '0.45s', status: 'pending'   },
    { route: 'MATIC → USDC → Optimism', amountUSD: 209500, latency: '0.31s', status: 'confirmed' },
    { route: 'BNB → USDC → Polygon',    amountUSD: 41800,  latency: '0.33s', status: 'failed'    },
  ];
  let i = 0;
  const next = () => {
    addFeedItem(demos[i % demos.length]);
    i++;
    setTimeout(next, 3000 + Math.random() * 2000);
  };
  setTimeout(next, 1500);
}

// ── Boot ───────────────────────────────────────────────────
(function boot() {
  fetchStats();
  const s = document.createElement('script');
  s.src = `${WS_URL}/socket.io/socket.io.js`;
  s.onload  = initSocket;
  s.onerror = () => { setBackendStatus(false); startLocalDemo(); };
  document.head.appendChild(s);
})();
