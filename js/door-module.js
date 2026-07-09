/* Logo-warp intro.
   The bundle raises the overlay at boot (solid dark wall). This module
   choreographs the user's storyboard:
     1. white V logo + wordmark fade up on black
     2. the logo "lights the wall": warm radial glow + breathing bloom
        around the logo while the page loads underneath (scroll disabled,
        html.vm-entering -> overflow hidden, no scrollbar, nothing
        interactive)
     3. when ready, the warp: the logo is a CUTOUT in the wall and we fly
        through it. Zoom eased in LOG space (true warp feel: slow push,
        explosive middle, calm deceleration). The page shows through the
        cutout hazy under a bloom veil (backdrop blur)
     4. as the warp decelerates the wall dissolves and the veil sharpens:
        the hero comes into full clarity and the page becomes interactive
   Time caps guarantee it never holds the page hostage. Skipped on
   mid-page refreshes, section deep-links and reduced-motion. */
(function(){
  function dismantle(h){
    if(!h) return;
    if(h.root && h.root.parentNode) h.root.parentNode.removeChild(h.root);
    if(h.wall && h.wall.parentNode) h.wall.parentNode.removeChild(h.wall);
    if(h.veil && h.veil.parentNode) h.veil.parentNode.removeChild(h.veil);
    if(h.style && h.style.parentNode) h.style.parentNode.removeChild(h.style);
    document.documentElement.classList.remove('vm-entering');
    window.__VM_ENTR = null;
  }

  var on = CFG.intro == null || !!CFG.intro;
  var h = window.__VM_ENTR;
  if(!on || window.scrollY > 2 || location.hash.length > 1 ||
     window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    dismantle(h); return;
  }
  if(!h && typeof vmEntrance === 'function') h = vmEntrance();
  if(!h) return;
  window.__VM_ENTR = null;    /* this module owns it from here */

  var MIN = CFG.introMin != null ? CFG.introMin : 1600;      /* ms before warp may start */
  var MAX = CFG.introMax != null ? CFG.introMax : 4500;      /* never wait longer */
  var WARP = CFG.introWarp != null ? CFG.introWarp : 3000;   /* ms fly-through */
  var SMAX = 60;                                             /* final zoom: full engulf through the diamond */

  function capped(p, ms){
    return Promise.race([p, new Promise(function(r){ setTimeout(r, ms); })]);
  }
  function decoded(img, ms){
    return capped(new Promise(function(res){
      if(img.decode){ img.decode().then(res, res); return; }
      if(img.complete){ res(); return; }
      img.onload = res; img.onerror = res;
    }), ms);
  }

  /* the hole geometry: logo height H0 = 34vmin at rest, anchored so the
     image's (50%, 42%) point sits at container (50%, 42%); the warp
     origin is the diamond finial = image point (50%, 88%) */
  function geom(k){
    var vw = window.innerWidth, vh = window.innerHeight;
    var H0 = 0.34 * Math.min(vw, vh);
    var cy = 0.42*vh + 0.46*H0;          /* diamond's fixed screen position */
    var H = H0 * k, W = H * h.AR;
    return { W: W, H: H, x: vw/2 - 0.5*W, y: cy - 0.88*H, vw: vw, vh: vh };
  }

  /* paint the wall for zoom factor k: dark fill + warm glow, then punch
     the logo hole with destination-out (viewport-bounded cost at any k) */
  var wctx = null, dpr = 1;
  function paintWall(k, wallAlpha, glowAlpha){
    if(!wctx){
      dpr = Math.min(2, window.devicePixelRatio || 1);
      h.wall.width = Math.round(window.innerWidth * dpr);
      h.wall.height = Math.round(window.innerHeight * dpr);
      wctx = h.wall.getContext('2d');
      wctx.scale(dpr, dpr);
      h.wall.style.background = 'transparent';   /* canvas paints it now */
    }
    var g = geom(k), c = wctx;
    c.clearRect(0, 0, g.vw, g.vh);
    if(wallAlpha <= 0) return;
    c.globalAlpha = wallAlpha;
    c.fillStyle = '#070402';
    c.fillRect(0, 0, g.vw, g.vh);
    if(glowAlpha > 0){
      var cy = 0.42*g.vh + 0.46*(0.34*Math.min(g.vw, g.vh));
      var r = 0.62 * Math.min(g.vw, g.vh);
      var grad = c.createRadialGradient(g.vw/2, cy, 0, g.vw/2, cy, r);
      grad.addColorStop(0, 'rgba(126,84,42,' + (0.62*glowAlpha) + ')');
      grad.addColorStop(0.55, 'rgba(60,38,18,' + (0.22*glowAlpha) + ')');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = grad;
      c.fillRect(0, 0, g.vw, g.vh);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'destination-out';
    c.drawImage(h.logo, g.x, g.y, g.W, g.H);
    c.globalCompositeOperation = 'source-over';
  }

  /* phase 1: logo appears and lights the wall */
  var lit = false, litT = null;
  decoded(h.logo, 2500).then(function(){
    litT = performance.now();
    paintWall(1, 1, 0);
    h.logo.style.opacity = '1';
    h.brand.style.opacity = '1';
    setTimeout(function(){ lit = true; }, 750);
  });

  /* page readiness: hero background + fonts, each capped */
  var ready = 0;
  var hero = new Image();
  hero.src = (typeof BASE !== 'undefined' ? BASE : '') + 'assets/hero.jpg';
  capped(hero.decode ? hero.decode()['catch'](function(){}) : Promise.resolve(), 3500)
    .then(function(){ ready++; });
  capped((document.fonts && document.fonts.ready) || Promise.resolve(), 2500)
    .then(function(){ ready++; });

  var t0 = performance.now(), warpT = null;

  function smooth(x){ x = Math.max(0, Math.min(1, x)); return x*x*(3 - 2*x); }
  function quint(x){ return x < .5 ? 16*x*x*x*x*x : 1 - Math.pow(-2*x + 2, 5)/2; }

  function frame(ts){
    var el = ts - t0;
    if(warpT === null){
      /* waiting: the wall light fades up and the logo's bloom breathes */
      if(litT !== null){
        h.logoGlow.style.opacity = String(0.28 + 0.2*Math.sin(ts/380));
        paintWall(1, 1, smooth((ts - litT)/1400));
      }
      if((ready >= 2 && lit && el >= MIN) || el >= MAX){
        warpT = ts;
        h.logo.style.transition = 'none';
        h.brand.style.transition = 'none';
      }
      requestAnimationFrame(frame);
      return;
    }
    /* the warp: fly through the logo cutout into the page.
       g blends a gentle visible push (first 40%) with a quintic ease in
       LOG space: slow approach, explosive middle, calm deceleration */
    var p = Math.min(1, (ts - warpT)/WARP);
    var g = 0.10*smooth(p/0.40) + 0.90*quint(p);
    var k = Math.pow(SMAX, g);
    /* the white logo rides the zoom and dissolves into the page as the
       acceleration kicks in (gone by ~3.5x), so the slow push is always
       "flying into the glowing logo", never a black lull */
    var burn = smooth((k - 1)/2.5);
    if(burn < 1){
      h.root.style.transform = 'scale(' + k + ')';
      h.logo.style.opacity = String(1 - burn);
      h.logoGlow.style.opacity = String(Math.max(0, 0.4*(1 - burn)));
      h.brand.style.opacity = String(Math.max(0, 1 - smooth(p/0.2)));
    } else if(h.root.style.display !== 'none'){
      h.root.style.display = 'none';         /* fully burned: stop painting it */
    }
    /* wall dissolve near the end is only a safety net: at SMAX the hole
       genuinely engulfs the viewport through the diamond */
    var dissolve = smooth((p - 0.78)/0.17);
    paintWall(k, 1 - dissolve, (1 - 0.7*burn)*(1 - dissolve));
    /* light surge through the cutout during the fast section (the bright
       warp tunnel), resolving as the deceleration sharpens the hero */
    var surge = smooth((p - 0.12)/0.22) * (1 - smooth((p - 0.6)/0.25));
    var sharpen = smooth((p - 0.65)/0.32);   /* bloom clears, hero sharpens */
    var bb = 'blur(' + (9*(1 - sharpen)) + 'px) brightness(' + (1.1 + 0.4*surge - 0.1*sharpen) + ')';
    h.veil.style.webkitBackdropFilter = bb;
    h.veil.style.backdropFilter = bb;
    h.veil.style.background = 'rgba(255,250,240,' + ((0.1 + 0.5*surge)*(1 - sharpen)) + ')';
    if(p >= 0.85) document.documentElement.classList.remove('vm-entering');
    if(p >= 1){ dismantle(h); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
