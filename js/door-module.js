/* Door opening intro for the Webflow bundle.
   Enabled when VELMONT_CONFIG.doorImage is a non-empty URL. Page scroll is
   locked while the door is on screen; wheel/touch/keys drive the door
   percentage; native scrolling unlocks only at 100% open. Reversible at
   the very top of the page. */
(function(){
  var url = CFG.doorImage;
  if(!url) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var el = document.createElement('img');
  el.src = url; el.alt = ''; el.className = 'vm-door';
  var s = el.style;
  s.position='fixed';s.top='0';s.left='0';s.width='100%';s.height='100%';s.maxWidth='none';s.margin='0';
  s.objectFit='cover';s.zIndex='1200';s.transformOrigin='50% 50%';s.willChange='transform,opacity';
  s.pointerEvents='none';
  document.body.appendChild(el);

  /* invisible shield blocks clicks on the page behind the door while locked */
  var blk = document.createElement('div');
  blk.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:1199;background:transparent;display:none';
  document.body.appendChild(blk);

  var p=0, cur=0, raf=null, locked=false;
  function D(){ return window.innerHeight*0.9; }
  function lock(){ if(locked)return; locked=true; blk.style.display='block'; }
  function unlock(){ if(!locked)return; locked=false; blk.style.display='none'; }

  function loop(){
    cur += (p-cur)*0.16;
    if(Math.abs(p-cur) < 0.001) cur = p;
    var q = Math.sin(cur*Math.PI/2);
    el.style.transform = 'scale(' + (1+5*q) + ')';
    el.style.opacity = String(1-q);
    var done = (p>=1 && cur>0.996);
    el.style.visibility = done ? 'hidden' : 'visible';
    if(done) unlock();
    raf = (cur!==p) ? requestAnimationFrame(loop) : null;
  }
  function kick(){ if(!raf) raf = requestAnimationFrame(loop); }
  function bump(dy){ p = Math.min(1, Math.max(0, p+dy/D())); kick(); }

  window.addEventListener('wheel', function(e){
    var dy = e.deltaY*(e.deltaMode===1?33:e.deltaMode===2?window.innerHeight:1);
    if(locked){ e.preventDefault(); bump(dy); }
    else if(dy<0 && window.scrollY<=0 && p>=1){ lock(); bump(dy); }
  }, {passive:false});

  var ty=null;
  window.addEventListener('touchstart', function(e){ ty=e.touches[0].clientY; }, {passive:true});
  window.addEventListener('touchmove', function(e){
    if(ty===null) return;
    var y=e.touches[0].clientY, dy=(ty-y)*1.6; ty=y;
    if(locked){ if(e.cancelable) e.preventDefault(); bump(dy); }
    else if(dy<0 && window.scrollY<=0 && p>=1){ lock(); bump(dy); }
  }, {passive:false});
  window.addEventListener('touchend', function(){ ty=null; }, {passive:true});

  window.addEventListener('keydown', function(e){
    if(!locked) return;
    var k=e.key;
    if(k==='ArrowDown') bump(120); else if(k==='ArrowUp') bump(-120);
    else if(k==='PageDown'||k===' ') bump(window.innerHeight*0.6);
    else if(k==='PageUp') bump(-window.innerHeight*0.6);
    else if(k==='End') bump(1e6); else if(k==='Home') bump(-1e6);
    else return;
    e.preventDefault();
  });

  window.addEventListener('scroll', function(){ if(locked) window.scrollTo(0,0); }, {passive:true});

  if(window.scrollY > 2){                 /* refresh mid-page / deep link: skip intro */
    p=1; cur=1;
    el.style.visibility='hidden'; el.style.transform='scale(6)'; el.style.opacity='0';
  } else {
    lock();
  }
  kick();
})();
