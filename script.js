/* ============================================================
   AntiGravity — script.js
   Particles · Scroll FX · Counter Animation · Nav scroll
   ============================================================ */

// ── NAV scroll effect ──────────────────────────────────────
const mainNav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  mainNav.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Particle canvas ────────────────────────────────────────
const canvas  = document.getElementById('particleCanvas');
const ctx     = canvas.getContext('2d');
let particles = [];
let connectionThreshold = 140;

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
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, (entry.target.dataset.delay || 0));
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
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
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

document.querySelectorAll('.stat-card__value[data-target]').forEach(el => {
  statObserver.observe(el);
});

// ── Chains ticker pause on hover ───────────────────────────
const chainsTrack = document.getElementById('chainsTrack');
if (chainsTrack) {
  chainsTrack.addEventListener('mouseenter', () => {
    chainsTrack.style.animationPlayState = 'paused';
  });
  chainsTrack.addEventListener('mouseleave', () => {
    chainsTrack.style.animationPlayState = 'running';
  });
}

// ── CTA form ───────────────────────────────────────────────
const ctaSubmit = document.getElementById('ctaSubmit');
const emailInput = document.getElementById('emailInput');

if (ctaSubmit) {
  ctaSubmit.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      emailInput.style.borderColor = '#ff4d6d';
      emailInput.style.boxShadow = '0 0 0 3px rgba(255,77,109,0.2)';
      emailInput.focus();
      setTimeout(() => {
        emailInput.style.borderColor = '';
        emailInput.style.boxShadow = '';
      }, 2000);
      return;
    }
    ctaSubmit.textContent = '✓ You\'re on the list!';
    ctaSubmit.style.background = 'linear-gradient(135deg, #22d3a5, #3b9eff)';
    ctaSubmit.disabled = true;
    emailInput.value = '';
    emailInput.placeholder = 'Access request sent!';
  });

  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') ctaSubmit.click();
  });
}

// ── Tilt effect on feature cards ───────────────────────────
document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -6;
    const rotateY = ((x - cx) / cx) * 6;
    card.style.transform = `translateY(-8px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    card.style.transition = 'transform 0.1s ease';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease';
  });
});

// ── HUD card live update ────────────────────────────────────
const hudRoutes = [
  'ETH → SOL → AVAX',
  'BTC → ETH → MATIC',
  'SOL → ARB → BASE',
  'AVAX → OP → zkSync',
  'MATIC → NEAR → SUI',
];

const hudAmounts = [128400, 54200, 312900, 78100, 209500];
const hudRows = document.querySelectorAll('.hud-val');

let hudIdx = 0;
setInterval(() => {
  hudIdx = (hudIdx + 1) % hudRoutes.length;
  if (hudRows[0]) hudRows[0].textContent = hudRoutes[hudIdx];
  if (hudRows[1]) hudRows[1].textContent = `$${hudAmounts[hudIdx].toLocaleString()}.00`;
  if (hudRows[2]) {
    const ms = (Math.random() * 0.4 + 0.2).toFixed(2);
    hudRows[2].textContent = `${ms}s ⚡`;
  }
  if (hudRows[3]) {
    const fee = (Math.random() * 0.008 + 0.001).toFixed(3);
    hudRows[3].textContent = `$${fee}`;
  }
}, 3500);
