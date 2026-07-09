/* Door intro for the Webflow bundle.
   Enabled when VELMONT_CONFIG.doorImage is a non-empty URL. Choreographed
   so the visitor never sees the page assembling:
     1. the bundle raises an opaque curtain the moment it boots
     2. under it the markup is injected, CSS applied, and the door image,
        hero image and fonts are decoded/loaded (each capped by a timeout
        so a slow asset can never hold the page hostage)
     3. the curtain fades away revealing the CLOSED keyhole with the
        finished hero behind it
     4. a brief hold, then the keyhole zooms out and fades away
   Any scroll/touch/key/click fast-forwards the whole sequence. Skipped on
   mid-page refreshes, section deep-links and reduced-motion. */
(function(){
  function dropCurtain(){
    var c = window.__VM_CURTAIN;
    if(c && c.parentNode) c.parentNode.removeChild(c);
    window.__VM_CURTAIN = null;
  }

  var url = CFG.doorImage;
  if(!url || window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
     window.scrollY > 2 || location.hash.length > 1){ dropCurtain(); return; }

  var curtain = window.__VM_CURTAIN;
  if(!curtain){
    curtain = document.createElement('div');
    curtain.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1201;background:#16100a;opacity:1';
    document.body.appendChild(curtain);
  }
  window.__VM_CURTAIN = null;   /* this module owns it from here */

  var HOLD = CFG.doorHold != null ? CFG.doorHold : 550;   /* ms closed before zoom */
  var ZOOM = CFG.doorZoom != null ? CFG.doorZoom : 1900;  /* ms zoom-out duration */
  var FADE = 500;                                         /* ms curtain fade */

  var el = document.createElement('img');
  el.src = url; el.alt = ''; el.className = 'vm-door';
  var s = el.style;
  s.position='fixed';s.top='0';s.left='0';s.width='100%';s.height='100%';s.maxWidth='none';s.margin='0';
  s.objectFit='cover';s.zIndex='1200';s.transformOrigin='50% 50%';s.willChange='transform,opacity';
  s.pointerEvents='none';
  document.body.appendChild(el);

  /* invisible shield keeps clicks off the page while the intro plays */
  var blk = document.createElement('div');
  blk.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:1199;background:transparent';
  document.body.appendChild(blk);

  var done=false, skip=false, elapsed=0, last=null, raf=null;

  function onWheel(e){ if(e.__vm) return; if(!done){ e.preventDefault(); skip=true; } }
  function onTouch(e){ if(!done && e.cancelable){ e.preventDefault(); skip=true; } }
  function onKey(e){
    if(done) return;
    var k=e.key;
    if(k==='ArrowDown'||k==='ArrowUp'||k==='PageDown'||k==='PageUp'||k===' '||k==='Home'||k==='End'){
      e.preventDefault(); skip=true;
    }
  }
  function onScroll(){ if(!done) window.scrollTo(0,0); }
  function onClick(){ if(!done) skip=true; }

  function finish(){
    if(done) return; done=true;
    if(raf) cancelAnimationFrame(raf);
    if(el.parentNode) el.parentNode.removeChild(el);
    if(blk.parentNode) blk.parentNode.removeChild(blk);
    if(curtain.parentNode) curtain.parentNode.removeChild(curtain);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchmove', onTouch);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', onScroll);
    blk.removeEventListener('click', onClick);
  }

  window.addEventListener('wheel', onWheel, {passive:false});
  window.addEventListener('touchmove', onTouch, {passive:false});
  window.addEventListener('keydown', onKey);
  window.addEventListener('scroll', onScroll, {passive:true});
  blk.addEventListener('click', onClick);

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

  /* the hero is a CSS background image: decode the same URL so the reveal
     never shows an empty hero through the keyhole */
  var hero = new Image();
  hero.src = (typeof BASE !== 'undefined' ? BASE : '') + 'assets/hero.jpg';

  var waits = [decoded(el, 3500), decoded(hero, 3500)];
  if(document.fonts && document.fonts.ready) waits.push(capped(document.fonts.ready, 2500));
  Promise.all(waits).then(reveal);

  function easeInOut(p){ return p<0.5 ? 4*p*p*p : 1-Math.pow(-2*p+2,3)/2; }

  function frame(ts){
    if(done) return;
    if(last===null) last=ts;
    elapsed += (ts-last)*(skip?5:1); last=ts;   /* input plays it out 5x faster */
    var p = elapsed<=HOLD ? 0 : Math.min(1,(elapsed-HOLD)/ZOOM);
    var q = easeInOut(p);
    el.style.transform = 'scale(' + (1+5*q) + ')';
    el.style.opacity = String(1-q);
    if(p>=1){ finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  function reveal(){
    if(done) return;
    var f = skip ? 120 : FADE;
    curtain.style.transition = 'opacity ' + f + 'ms ease';
    curtain.style.opacity = '0';
    setTimeout(function(){ if(curtain.parentNode) curtain.parentNode.removeChild(curtain); }, f + 80);
    /* the hold starts once the curtain is gone */
    setTimeout(function(){ if(!done && !raf) raf = requestAnimationFrame(frame); }, skip ? 0 : f);
  }
})();
