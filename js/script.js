/* ═══ Velmont India · launch landing interactions ═══ */

/* ── nav: solid after leaving hero ── */
const nav = document.getElementById('nav');
const navItems = [...document.querySelectorAll('.nav-item')];
const closeMenus = except => navItems.forEach(o => { if (o !== except) o.classList.remove('open'); });
const announce = document.querySelector('.announce');
const onScroll = () => {
  const hid = window.scrollY > 10;
  announce.classList.toggle('hide', hid);
  nav.classList.toggle('up', hid);
  nav.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.6);
  closeMenus(null);
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
  if (diff === 0) document.querySelector('.cd-label').textContent = 'The doors are open';
};
tick();
setInterval(tick, 1000);

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
