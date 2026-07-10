/* ═══ Velmont India · launch landing interactions ═══ */

/* ── nav: solid after leaving hero ── */
const nav = document.getElementById('nav');
const navItems = [...document.querySelectorAll('.nav-item')];
const closeMenus = except => navItems.forEach(o => { if (o !== except) o.classList.remove('open'); });
const announce = document.querySelector('.announce');
/* announce strip: hidden while scrolling down, back when scrolling up or
   at the very top; the nav always moves WITH it so they never overlap */
let lastY = window.scrollY, stripShown = window.scrollY <= 10;
const onScroll = () => {
  const y = window.scrollY;
  if (y <= 10) stripShown = true;
  else if (y > lastY + 4) stripShown = false;
  else if (y < lastY - 4) stripShown = true;
  announce.classList.toggle('hide', !stripShown);
  nav.classList.toggle('up', !stripShown);
  nav.classList.toggle('scrolled', y > window.innerHeight * 0.6);
  closeMenus(null);
  lastY = y;
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ── mega menus: open on enter, close after a grace delay so the pointer
   can travel across the gap between the link and the panel ── */
navItems.forEach(item => {
  let t;
  item.addEventListener('mouseenter', () => { clearTimeout(t); closeMenus(item); item.classList.add('open'); });
  item.addEventListener('mouseleave', () => { clearTimeout(t); t = setTimeout(() => item.classList.remove('open'), 320); });
});

/* ── mobile drawer ── */
const drawer = document.getElementById('drawer');
const burger = document.getElementById('burger');
burger.addEventListener('click', () => drawer.classList.toggle('open'));
drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => drawer.classList.remove('open')));
document.getElementById('drawer-close')?.addEventListener('click', () => drawer.classList.remove('open'));
document.addEventListener('click', e => {
  if (drawer.classList.contains('open') && !drawer.contains(e.target) && !burger.contains(e.target)) {
    drawer.classList.remove('open');
  }
});

/* ── countdown to launch ── */
const timer = document.getElementById('cd-timer');
const launch = new Date(timer.dataset.launch).getTime();
const pad = n => String(n).padStart(2, '0');
const tick = () => {
  let diff = Math.max(0, launch - Date.now());
  const d = Math.floor(diff / 864e5);
  const h = Math.floor(diff % 864e5 / 36e5);
  const m = Math.floor(diff % 36e5 / 6e4);
  const s = Math.floor(diff % 6e4 / 1e3);
  document.getElementById('cd-d').textContent = pad(d);
  document.getElementById('cd-h').textContent = pad(h);
  document.getElementById('cd-m').textContent = pad(m);
  document.getElementById('cd-s').textContent = pad(s);
  if (diff === 0) {
    document.querySelector('.cd-label').textContent = 'The doors are open';
    armCelebration();
  }
};

/* ── launch-day celebration: once the countdown bar is 40% in view after
   the doors open, confetti pops and the digits become a welcome ── */
let cdArmed = false, celebrated = false;
function armCelebration() {
  if (cdArmed) return; cdArmed = true;
  const bar = document.querySelector('.countdown-bar');
  const io40 = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { celebrate(bar); io40.disconnect(); } });
  }, { threshold: 0.4 });
  io40.observe(bar);
}
function celebrate(bar) {
  if (celebrated) return; celebrated = true;
  const swap = () => {
    /* the ivory wave washes the night out while the digits and the
       welcome breathe past each other in a slow crossfade */
    bar.classList.add('washed');
    bar.classList.remove('night');
    timer.classList.add('cd-out');
    const w = document.querySelector('.cd-welcome');
    requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('on')));
    setTimeout(() => { timer.style.visibility = 'hidden'; }, 1250);
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { swap(); return; }
  confettiBurst(bar);
  setTimeout(swap, 250);
}
function confettiBurst(anchor) {
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:90';
  document.body.appendChild(cv);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const r = anchor.getBoundingClientRect();
  const cy = r.top + r.height / 2;
  const colors = ['#c9a24b', '#e6c87e', '#96543f', '#f4efe7', '#2e6b4f'];
  const parts = [];
  const spawn = (x, y, dir, n) => {
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * 1.1;
      const sp = 7 + Math.random() * 9;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        w: 5 + Math.random() * 6, h: 8 + Math.random() * 6,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        c: colors[(Math.random() * colors.length) | 0],
        life: 1, decay: 0.006 + Math.random() * 0.006 });
    }
  };
  spawn(r.left + r.width * 0.12, cy, -Math.PI * 0.35, 55);
  spawn(r.left + r.width * 0.88, cy, -Math.PI * 0.65, 55);
  spawn(r.left + r.width * 0.5, cy, -Math.PI / 2, 45);
  let last = performance.now();
  const loop = ts => {
    const dt = Math.min(32, ts - last) / 16.7; last = ts;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    for (const p of parts) {
      if (p.life <= 0) continue; alive++;
      p.vy += 0.28 * dt; p.vx *= 0.985; p.vy *= 0.99;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= p.decay * dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * (0.6 + 0.4 * Math.sin(p.rot * 2)));
      ctx.restore();
    }
    if (alive > 0) requestAnimationFrame(loop); else cv.remove();
  };
  requestAnimationFrame(loop);
}

tick();
setInterval(tick, 1000);
document.querySelector('.countdown-bar').classList.add('night');
if (launch <= Date.now()) armCelebration();

/* ── product carousel arrows ── */
const carousel = document.getElementById('carousel');
const step = () => (carousel.querySelector('.product').offsetWidth + 24) * 2;
document.getElementById('next').addEventListener('click', () => carousel.scrollBy({ left: step(), behavior: 'smooth' }));
document.getElementById('prev').addEventListener('click', () => carousel.scrollBy({ left: -step(), behavior: 'smooth' }));

/* ── toast ── */
const toast = document.getElementById('toast');
let toastT;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toast.classList.remove('show'), 3200);
}
document.querySelectorAll('[data-toast]').forEach(el =>
  el.addEventListener('click', () => showToast(el.dataset.toast))
);

/* ── wishlist + bag counters ── */
let wishlist = 0, bag = 0;
const wishCountEl = document.getElementById('wishlist-count');
const bagCountEl = document.getElementById('bag-count');

function setCount(el, val) {
  el.textContent = val;
  el.hidden = val === 0;
}

document.querySelectorAll('.heart').forEach(btn =>
  btn.addEventListener('click', e => {
    e.preventDefault();
    const active = btn.classList.toggle('active');
    wishlist += active ? 1 : -1;
    setCount(wishCountEl, wishlist);
    const name = btn.closest('.product').querySelector('.p-name').textContent;
    showToast(active ? `${name} saved to your wishlist ♥` : `${name} removed from wishlist`);
  })
);

document.querySelectorAll('.add-bag').forEach(btn =>
  btn.addEventListener('click', () => {
    bag += 1;
    setCount(bagCountEl, bag);
    showToast(`${btn.dataset.name} reserved · checkout opens 10 July`);
  })
);

document.getElementById('bag-btn').addEventListener('click', () =>
  showToast(bag === 0
    ? 'Your bag is empty. The Launch Edit awaits below.'
    : `${bag} piece${bag > 1 ? 's' : ''} reserved · checkout opens 10 July`)
);
document.getElementById('wishlist-btn').addEventListener('click', () =>
  showToast(wishlist === 0
    ? 'Your wishlist is empty, for now.'
    : `${wishlist} piece${wishlist > 1 ? 's' : ''} in your wishlist ♥`)
);

/* ── FAQ: close others when one opens ── */
document.querySelectorAll('.faq-item').forEach(item =>
  item.addEventListener('toggle', () => {
    if (item.open) document.querySelectorAll('.faq-item[open]').forEach(o => { if (o !== item) o.open = false; });
  })
);

/* ── newsletter ── */
document.getElementById('news-form').addEventListener('submit', e => {
  e.preventDefault();
  const input = e.target.querySelector('input');
  showToast('Welcome to the guest list. See you on 10 July ✦');
  input.value = '';
});

/* ── reveal on scroll ── */
const io = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ── placeholder links ── */
document.querySelectorAll('a[href="#"]').forEach(a =>
  a.addEventListener('click', e => { e.preventDefault(); showToast('Coming soon, with the full store on 10 July.'); })
);
