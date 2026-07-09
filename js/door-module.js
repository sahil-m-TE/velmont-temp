/* Logo-warp intro.
   The bundle raises the overlay at boot (solid dark wall). Storyboard:
     1. the full white lockup (V + star + wordmark, ONE vector file:
        assets/full-logo-white.svg) fades up on pure black
     2. the logo "lights the wall": dim warm radial + breathing bloom
        while the page loads underneath (scroll disabled via
        html.vm-entering -> overflow hidden: no scrollbar, nothing
        interactive)
     3. the warp: the lockup is a CUTOUT in the wall and we fly through
        it, easeInOutExpo in LOG-zoom space (near-still, exponential
        whoosh, calm halt). The page shows through the cutout under a
        cinematic bloom (screen-blended blurred hero) and a defocus veil
     4. as the warp decelerates the bloom resolves, the hero sharpens,
        and the page chrome enters (nav slides down, hero copy blurs in
        via html.vm-in)
   The warp origin is the diamond finial at the V's tip. Time caps
   guarantee the intro never holds the page hostage. Skipped on mid-page
   refreshes, section deep-links and reduced-motion. */
(function(){
  function dismantle(h){
    if(!h) return;
    if(h.root && h.root.parentNode) h.root.parentNode.removeChild(h.root);
    if(h.wall && h.wall.parentNode) h.wall.parentNode.removeChild(h.wall);
    if(h.veil && h.veil.parentNode) h.veil.parentNode.removeChild(h.veil);
    if(h.bloom && h.bloom.parentNode) h.bloom.parentNode.removeChild(h.bloom);
    if(h.style && h.style.parentNode) h.style.parentNode.removeChild(h.style);
    document.documentElement.classList.remove('vm-entering');
    document.documentElement.classList.add('vm-in');
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
  var WARP = CFG.introWarp != null ? CFG.introWarp : 2400;   /* ms fly-through */
  var SMAX = 60;                                             /* final zoom: through the diamond */
  var FX = 0.5003, FY = 0.6936;   /* diamond finial as a fraction of the lockup box */
  var H0F = 0.52;                 /* lockup height at rest, in vmin */
  var CYF = 0.45;                 /* lockup center sits at 45% viewport height */

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

  /* hole geometry for zoom factor k: the diamond point (FX, FY) stays
     pinned at its rest screen position while everything grows around it */
  function geom(k){
    var vw = window.innerWidth, vh = window.innerHeight;
    var H0 = H0F * Math.min(vw, vh), W0 = H0 * h.AR;
    var cxD = vw/2 + (FX - 0.5)*W0;
    var cyD = CYF*vh + (FY - 0.5)*H0;
    var H = H0 * k, W = H * h.AR;
    return { W: W, H: H, x: cxD - FX*W, y: cyD - FY*H, cxD: cxD, cyD: cyD, vw: vw, vh: vh };
  }

  /* paint the wall for zoom factor k: dark fill + warm glow, then punch
     the lockup hole with destination-out (viewport-bounded cost at any k;
     the SVG re-rasterizes crisply thanks to its large intrinsic size) */
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
    c.fillStyle = '#020101';
    c.fillRect(0, 0, g.vw, g.vh);
    if(glowAlpha > 0){
      var vmin = Math.min(g.vw, g.vh);
      var grad = c.createRadialGradient(g.vw/2, CYF*g.vh, 0, g.vw/2, CYF*g.vh, 0.72*vmin);
      grad.addColorStop(0, 'rgba(108,70,34,' + (0.5*glowAlpha) + ')');
      grad.addColorStop(0.55, 'rgba(48,30,14,' + (0.17*glowAlpha) + ')');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = grad;
      c.fillRect(0, 0, g.vw, g.vh);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'destination-out';
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(h.logo, g.x, g.y, g.W, g.H);
    c.globalCompositeOperation = 'source-over';
  }

  /* phase 1: lockup appears and lights the wall */
  var lit = false, litT = null;
  decoded(h.logo, 2500).then(function(){
    litT = performance.now();
    var g = geom(1);
    h.root.style.transformOrigin = g.cxD + 'px ' + g.cyD + 'px';
    paintWall(1, 1, 0);
    h.logo.style.opacity = '1';
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

  var t0 = performance.now(), warpT = null, vmIn = false;

  function smooth(x){ x = Math.max(0, Math.min(1, x)); return x*x*(3 - 2*x); }
  function expo(x){
    return x <= 0 ? 0 : x >= 1 ? 1 :
      x < 0.5 ? Math.pow(2, 20*x - 10)/2 : (2 - Math.pow(2, -20*x + 10))/2;
  }

  function frame(ts){
    var el = ts - t0;
    if(warpT === null){
      /* waiting: the wall light fades up and the lockup's bloom breathes */
      if(litT !== null){
        h.logoGlow.style.opacity = String(0.28 + 0.2*Math.sin(ts/380));
        var glowIn = smooth((ts - litT)/1400);
        paintWall(1, 1, glowIn);
        h.bloom.style.opacity = String(0.5*glowIn);
      }
      if((ready >= 2 && lit && el >= MIN) || el >= MAX){
        warpT = ts;
        h.logo.style.transition = 'none';
      }
      requestAnimationFrame(frame);
      return;
    }
    /* the warp: fly through the lockup cutout into the page.
       easeInOutExpo applied in LOG-zoom space: near-still push, an
       exponential whoosh through the logo, then a calm decelerated halt */
    var p = Math.min(1, (ts - warpT)/WARP);
    var k = Math.pow(SMAX, expo(p));
    /* the white lockup rides the zoom and dissolves into the page as the
       acceleration kicks in (gone by ~3.5x): the push is always "flying
       into the glowing logo", never a black lull */
    var burn = smooth((k - 1)/2.5);
    if(burn < 1){
      h.root.style.transform = 'scale(' + k + ')';
      h.logo.style.opacity = String(1 - burn);
      h.logoGlow.style.opacity = String(Math.max(0, 0.4*(1 - burn)));
    } else if(h.root.style.display !== 'none'){
      h.root.style.display = 'none';         /* fully burned: stop painting it */
    }
    /* wall dissolve near the end is only a safety net: at SMAX the hole
       genuinely engulfs the viewport through the diamond */
    var dissolve = smooth((p - 0.78)/0.17);
    paintWall(k, 1 - dissolve, (1 - 0.7*burn)*(1 - dissolve));
    /* cinematic light surge: the bloom layer flares the hero's own
       highlights during the whoosh, then resolves as the deceleration
       sharpens the hero */
    var surge = smooth((p - 0.18)/0.2) * (1 - smooth((p - 0.62)/0.24));
    var sharpen = smooth((p - 0.65)/0.32);
    var bb = 'blur(' + (9*(1 - sharpen)) + 'px) brightness(' + (1.04 - 0.04*sharpen) + ')';
    h.veil.style.webkitBackdropFilter = bb;
    h.veil.style.backdropFilter = bb;
    h.bloom.style.opacity = String(Math.min(1, 0.55 + 0.55*surge)*(1 - sharpen));
    h.bloom.style.filter = 'blur(26px) brightness(' + (1.25 + 0.55*surge) + ') saturate(1.15)';
    if(p >= 0.6 && !vmIn){ vmIn = true; document.documentElement.classList.add('vm-in'); }
    if(p >= 0.85) document.documentElement.classList.remove('vm-entering');
    if(p >= 1){ dismantle(h); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
