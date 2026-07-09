/* Door intro for the Webflow bundle.
   Enabled when VELMONT_CONFIG.doorImage is a non-empty URL. Plays ONCE per
   page load as a timed intro: the closed keyhole holds briefly, then zooms
   out and fades away on its own. Any scroll/touch/key input fast-forwards
   it. Skipped on mid-page refreshes, deep links and reduced-motion. */
(function(){
  var url = CFG.doorImage;
  if(!url) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if(window.scrollY > 2) return;              /* refresh mid-page */
  if(location.hash.length > 1) return;        /* deep link to a section */

  var HOLD = CFG.doorHold != null ? CFG.doorHold : 600;   /* ms closed before zoom */
  var ZOOM = CFG.doorZoom != null ? CFG.doorZoom : 1900;  /* ms zoom-out duration */

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
  function start(){ if(!done && !raf) raf = requestAnimationFrame(frame); }

  /* begin once the image is ready; never hold the page hostage if it isn't */
  if(el.complete) start();
  else { el.onload = start; el.onerror = finish; setTimeout(start, 2500); }
})();
