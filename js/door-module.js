/* Entrance intro for the Webflow bundle: "walking in through a door".
   The bundle raises the overlay at boot (dark room + glowing doorway ajar
   + wordmark + gold progress hairline). This module drives it:
     1. the door opens WITH the real loading progress (hero image, fonts),
        so the intro visibly communicates that the page is loading
     2. scrolling is disabled outright while it plays (html.vm-entering
        sets overflow:hidden), so no scrollbar appears and nothing about
        it looks interactive
     3. when everything is ready the door swings fully open, light floods
        the screen while the camera pushes through the doorway, and the
        bloom fades into the finished page
   Time caps guarantee it can never hold the page hostage. Skipped on
   mid-page refreshes, section deep-links and reduced-motion. */
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

  var MIN = CFG.introMin != null ? CFG.introMin : 1700;   /* theatrical minimum, ms */
  var MAX = CFG.introMax != null ? CFG.introMax : 4500;   /* never wait longer, ms */

  /* ── real loading progress: base credit for boot+CSS (both already done
        when this runs), hero image and fonts add the rest ── */
  var target = 0.3, flooding = false;

  function capped(p, ms){
    return Promise.race([p, new Promise(function(r){ setTimeout(r, ms); })]);
  }
  var hero = new Image();
  hero.src = (typeof BASE !== 'undefined' ? BASE : '') + 'assets/hero.jpg';
  capped(hero.decode ? hero.decode()['catch'](function(){}) : Promise.resolve(), 3500)
    .then(function(){ target += 0.45; });
  capped((document.fonts && document.fonts.ready) || Promise.resolve(), 2500)
    .then(function(){ target += 0.25; });

  var disp = 0, last = null, t0 = performance.now();

  function frame(ts){
    if(flooding) return;
    if(last === null) last = ts;
    var dt = ts - last; last = ts;
    var el = ts - t0;
    disp += (Math.min(target, 1) - disp) * (1 - Math.pow(0.9, dt/16.7));
    disp += dt * 0.00004;                 /* slow drift so it never looks stuck */
    if(el >= MAX) disp = 1;
    if(disp > 1) disp = 1;
    h.panel.style.transform = 'rotateY(' + (-(10 + 58*disp)) + 'deg)';
    h.bar.style.transform = 'scaleX(' + disp + ')';
    h.spill.style.opacity = String(0.15 + 0.5*disp);
    if(disp >= 0.999 && el >= MIN){ flood(); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ── the entrance: door swings open, light floods, camera pushes
        through, bloom fades into the page ── */
  function flood(){
    if(flooding) return; flooding = true;
    h.panel.style.transition = 'transform 620ms cubic-bezier(.6,0,.35,1)';
    h.panel.style.transform = 'rotateY(-89deg)';
    h.scene.style.transition = 'transform 950ms cubic-bezier(.55,0,.55,1)';
    h.scene.style.transform = 'scale(2.35)';
    setTimeout(function(){
      h.bloom.style.transition = 'opacity 480ms ease';
      h.bloom.style.opacity = '1';
    }, 240);
    setTimeout(function(){
      /* scrollbar comes back behind the full-white bloom, invisibly */
      document.documentElement.classList.remove('vm-entering');
      h.root.style.transition = 'opacity 720ms ease';
      h.root.style.opacity = '0';
    }, 780);
    setTimeout(function(){ dismantle(h); }, 1650);
  }
})();
