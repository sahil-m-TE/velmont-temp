/* Entrance intro: light through the keyhole.
   The bundle raises the overlay at boot (dark room; the keyhole image and
   the white light behind it fade in as soon as the keyhole image decodes,
   so the first thing seen is BLINDING light through the hole, glow
   bleeding into the dark, wordmark beneath). This module drives it:
     1. while the page loads, the light simply breathes: no progress
        widgets, nothing that looks interactive; scrolling is disabled
        outright (html.vm-entering sets overflow:hidden -> no scrollbar)
     2. when the page is ready (hero decoded, fonts in, time caps) the
        camera pushes toward the keyhole; as it grows, the overexposed
        white "adjusts" and the actual page resolves through the light,
        like eyes adjusting when walking toward a bright window
     3. the keyhole edges pass around the viewer and the dark surround
        dissolves: you are inside
   Skipped on mid-page refreshes, section deep-links and reduced-motion. */
(function(){
  function dismantle(h){
    if(!h) return;
    if(h.root && h.root.parentNode) h.root.parentNode.removeChild(h.root);
    if(h.style && h.style.parentNode) h.style.parentNode.removeChild(h.style);
    document.documentElement.classList.remove('vm-entering');
    window.__VM_ENTR = null;
  }

  var on = CFG.intro != null ? !!CFG.intro : !!CFG.doorImage;
  var h = window.__VM_ENTR;
  if(!on || window.scrollY > 2 || location.hash.length > 1 ||
     window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    dismantle(h); return;
  }
  if(!h && typeof vmEntrance === 'function') h = vmEntrance();
  if(!h) return;
  window.__VM_ENTR = null;    /* this module owns it from here */

  var MIN = CFG.introMin != null ? CFG.introMin : 1300;        /* ms before the approach may start */
  var MAX = CFG.introMax != null ? CFG.introMax : 4500;        /* never wait longer */
  var APPROACH = CFG.introApproach != null ? CFG.introApproach : 2500;  /* ms push-through */

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

  requestAnimationFrame(function(){ h.brand.style.opacity = '1'; });

  /* light switches on through the hole the moment the keyhole image is
     ready (before that the room stays dark, never a bare white screen) */
  var lit = false;
  decoded(h.door, 2500).then(function(){
    h.white.style.transition = 'opacity .5s ease';
    h.door.style.transition = 'opacity .5s ease';
    h.white.style.opacity = '1';
    h.door.style.opacity = '1';
    h.brand.style.color = '#4a3a28';   /* wordmark now sits on the lit hole */
    setTimeout(function(){
      lit = true;
      /* the keyhole image itself now provides the darkness; the root must
         go transparent so the page can resolve through the hole when the
         white light fades during the approach */
      h.root.style.background = 'transparent';
    }, 520);
  });

  /* page readiness: hero background + fonts, each capped */
  var ready = 0;
  var hero = new Image();
  hero.src = (typeof BASE !== 'undefined' ? BASE : '') + 'assets/hero.jpg';
  capped(hero.decode ? hero.decode()['catch'](function(){}) : Promise.resolve(), 3500)
    .then(function(){ ready++; });
  capped((document.fonts && document.fonts.ready) || Promise.resolve(), 2500)
    .then(function(){ ready++; });

  var t0 = performance.now(), approachT = null;

  function smooth(x){ x = Math.max(0, Math.min(1, x)); return x*x*(3 - 2*x); }
  function easeInOut(x){ return x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3)/2; }

  function frame(ts){
    var el = ts - t0;
    if(approachT === null){
      /* waiting: the light gently breathes */
      if(lit) h.halo.style.opacity = String(0.55 + 0.18*Math.sin(ts/350));
      if((ready >= 2 && lit && el >= MIN) || el >= MAX){
        approachT = ts;
        h.white.style.transition = 'none';
        h.door.style.transition = 'none';
        h.brand.style.opacity = '0';
      }
      requestAnimationFrame(frame);
      return;
    }
    /* the approach: move toward the light; exposure adjusts; enter */
    var p = Math.min(1, (ts - approachT)/APPROACH);
    var z = easeInOut(p);
    h.door.style.transform = 'scale(' + (1 + 5.2*z) + ')';
    h.white.style.opacity = String(1 - smooth((p - 0.33)/0.42));
    h.halo.style.opacity = String(Math.max(0, 0.6*(1 - smooth(p/0.3))));
    h.door.style.opacity = String(1 - smooth((p - 0.55)/0.45));
    if(p >= 0.8) document.documentElement.classList.remove('vm-entering');
    if(p >= 1){ dismantle(h); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
