#!/usr/bin/env python3
"""Builds js/webflow-render.js: a single script that injects the ENTIRE
launch site (landing page + coming-soon page) into an empty Webflow body.

Run after editing index.html / coming-soon.html / js/script.js:
    python3 build-webflow-bundle.py
"""
import json, re, time, pathlib

root = pathlib.Path(__file__).parent

# monotonically increasing build stamp: a bundle only ever REPLACES page
# content injected by an OLDER build, never the other way round
build_t = int(time.time())

def body_inner(path):
    html = (root / path).read_text()
    m = re.search(r'<body[^>]*>(.*)</body>', html, re.S)
    inner = m.group(1)
    inner = re.sub(r'<script\b.*?</script>', '', inner, flags=re.S)   # scripts come from the bundle
    return inner.strip()

main = body_inner('index.html')
cs = body_inner('coming-soon.html')

defaults = json.loads((root / 'site-config.json').read_text())

# static-site links -> Webflow routes.
# NOTE: coming-soon routes through the HOMEPAGE with a query string, because
# the Webflow project has no /coming-soon page (a bare /coming-soon hits
# Webflow's 404, which does not include the custom-code loader at all).
for a, b in [('href="coming-soon.html"', 'href="/?coming-soon"'),
             ('href="index.html#', 'href="/#'),
             ('href="index.html"', 'href="/"')]:
    main = main.replace(a, b)
    cs = cs.replace(a, b)

behaviors = (root / 'js' / 'script.js').read_text()

door = (root / 'js' / 'door-module.js').read_text()

bundle = f'''/* VELMONT INDIA · Webflow full-site bundle (GENERATED, do not edit by hand:
   edit index.html / coming-soon.html / js/script.js / js/door-module.js
   then run  python3 build-webflow-bundle.py) */
(function(){{
var BUILD_T = {build_t};

/* run-once guard: if this same-or-newer bundle already executed (e.g. an
   old script tag left in Webflow footer code + the new head loader), the
   second copy must NOT run again. Versioned so a NEWER bundle still runs
   after an older one (and can replace its stale content below). */
if(window.__VELMONT_BOOTED_T && window.__VELMONT_BOOTED_T >= BUILD_T) return;
window.__VELMONT_BOOTED_T = BUILD_T;
window.__VELMONT_BOOTED__ = true;

var CFG = window.VELMONT_CONFIG || {{}};
var sc = document.currentScript && document.currentScript.src || '';
var BASE = CFG.base || sc.replace(/js\\/[^\\/]*(\\?.*)?$/, '');

/* defaults from site-config.json (repo-driven); a window.VELMONT_CONFIG
   entry in Webflow head code still overrides when present */
var DEF = {json.dumps(defaults)};
for(var k in DEF) if(!(k in CFG)) CFG[k] = DEF[k];
if(CFG.introLogo && !/^https?:/.test(CFG.introLogo)) CFG.introLogo = BASE + CFG.introLogo;

var MAIN = {json.dumps(main)};
var CS = {json.dumps(cs)};

function inject(markup){{
  markup = markup.split('src="assets/').join('src="' + BASE + 'assets/');
  var host = document.getElementById('vm-site');
  if(host){{ host.innerHTML = markup; }}
  else {{ var d = document.createElement('div'); d.innerHTML = markup;
         while(d.firstChild) document.body.appendChild(d.firstChild); }}
}}

function csCountdown(){{
  var timer = document.getElementById('cd-timer');
  if(!timer) return;
  var launch = new Date(timer.dataset.launch).getTime();
  var pad = function(n){{ return String(n).padStart(2, '0'); }};
  var tick = function(){{
    var diff = Math.max(0, launch - Date.now());
    document.getElementById('cd-d').textContent = pad(Math.floor(diff / 864e5));
    document.getElementById('cd-h').textContent = pad(Math.floor(diff % 864e5 / 36e5));
    document.getElementById('cd-m').textContent = pad(Math.floor(diff % 36e5 / 6e4));
    document.getElementById('cd-s').textContent = pad(Math.floor(diff % 6e4 / 1e3));
  }};
  tick(); setInterval(tick, 1000);
}}

function vmEntrance(){{
  /* the logo-warp entrance: white V on black -> the logo lights the wall
     -> we fly THROUGH the logo cutout into the (bloom-hazed) page, which
     sharpens as the warp decelerates. Built entirely with inline styles
     so it renders correctly BEFORE the site stylesheet has loaded. */
  var st = document.createElement('style');
  st.id = 'vm-entr-style';
  st.textContent = 'html.vm-entering,html.vm-entering body{{overflow:hidden!important}}';
  document.head.appendChild(st);
  document.documentElement.classList.add('vm-entering');

  var LOGO = CFG.introLogo || (BASE + 'assets/logo-v-gold.png');

  /* bloom veil over the page, UNDER the wall: only ever seen through the
     logo cutout, gives the hazy cinematic look until the final sharpen */
  var veil = document.createElement('div');
  veil.className = 'vm-door';
  veil.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1198;background:rgba(255,250,240,.1);-webkit-backdrop-filter:blur(9px) brightness(1.1);backdrop-filter:blur(9px) brightness(1.1);pointer-events:none';
  document.body.appendChild(veil);

  /* the wall: a CANVAS painted each frame (dark fill + warm glow, logo
     hole punched via destination-out). Canvas cost is viewport-bounded at
     ANY zoom factor: CSS masks and transform-scaled layers both hit
     renderer rasterization limits during the warp; canvas does not */
  var wall = document.createElement('canvas');
  wall.className = 'vm-door';
  wall.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1199;background:#070402';
  document.body.appendChild(wall);

  /* foreground layer for the white logo lockup; scales only during the
     short burn-away, so no rasterization artifacts */
  var root = document.createElement('div');
  root.className = 'vm-door';
  root.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1200;transform-origin:50% calc(42% + 15.64vmin);transform:scale(1);will-change:transform;pointer-events:none';

  /* the white logo sitting exactly over the hole, with its bloom copy */
  var logoGlow = document.createElement('img');
  logoGlow.src = LOGO; logoGlow.alt = '';
  logoGlow.style.cssText = 'position:absolute;left:50%;top:42%;height:34vmin;width:auto;transform:translate(-50%,-42%);filter:brightness(0) invert(1) blur(12px);opacity:0;pointer-events:none';
  root.appendChild(logoGlow);

  var logo = document.createElement('img');
  logo.src = LOGO; logo.alt = '';
  logo.style.cssText = 'position:absolute;left:50%;top:42%;height:34vmin;width:auto;transform:translate(-50%,-42%);filter:brightness(0) invert(1);opacity:0;transition:opacity .7s ease;pointer-events:none';
  root.appendChild(logo);

  var brand = document.createElement('div');
  brand.style.cssText = 'position:absolute;left:50%;top:calc(42% + 22vmin);transform:translateX(-50%);white-space:nowrap;font-family:\\'Cormorant Garamond\\',Georgia,serif;font-size:clamp(13px,2.4vmin,19px);letter-spacing:.42em;padding-left:.42em;color:#e8dcc2;text-transform:uppercase;opacity:0;transition:opacity .9s ease;pointer-events:none';
  brand.textContent = 'Velmont India';
  root.appendChild(brand);

  document.body.appendChild(root);
  return {{root:root, wall:wall, logo:logo, logoGlow:logoGlow,
          brand:brand, veil:veil, style:st, logoUrl:LOGO, AR:682/760}};
}}

function whenCssReady(cb){{
  /* run cb only once OUR stylesheet is actually applied: injecting markup
     before it loads flashes raw unstyled content (blue links, white bg) */
  var fired = false;
  function fin(){{ if(fired) return; fired = true; cb(); }}
  var link = null, ls = document.querySelectorAll('link[rel="stylesheet"]');
  for(var i = 0; i < ls.length; i++)
    if(/css\\/styles\\.css/.test(ls[i].href)) link = ls[i];
  if(!link){{
    link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = BASE + 'css/styles.css';
    document.head.appendChild(link);
  }}
  if(link.sheet){{ fin(); return; }}
  link.addEventListener('load', fin);
  link.addEventListener('error', fin);
  var iv = setInterval(function(){{
    if(fired || link.sheet){{ clearInterval(iv); fin(); }}
  }}, 40);
  setTimeout(fin, 4000);
}}

function stripWebflowCss(){{
  /* the Webflow project's own stylesheet contains the OLD design's classes
     (e.g. ".section" with height:100vh + overflow:clip) which collide with
     ours and clip/overlap sections. The Webflow body is empty, so its CSS
     serves nothing: drop it entirely. */
  var links = document.querySelectorAll('link[rel="stylesheet"]');
  for(var i = 0; i < links.length; i++){{
    if(/website-files\\.com/.test(links[i].href)) links[i].parentNode.removeChild(links[i]);
  }}
}}

function dedupe(){{
  /* self-heal: if a stale un-guarded copy of this bundle managed to inject
     the site a second time, remove the second copy and everything after it */
  var marks = document.querySelectorAll('.announce, .cs-page');
  if(marks.length < 2) return;
  var n = marks[1], kill = [];
  while(n){{ kill.push(n); n = n.nextElementSibling; }}
  for(var i = 0; i < kill.length; i++)
    if(kill[i].parentNode) kill[i].parentNode.removeChild(kill[i]);
  unlockStaleDoor();
}}

function teardown(){{
  /* remove a stale injected copy (markup + door + shield) so this newer
     build can render fresh content in its place */
  var start = document.querySelector('.announce, .cs-page');
  if(start){{
    var n = start, kill = [];
    while(n){{ kill.push(n); n = n.nextElementSibling; }}
    for(var i = 0; i < kill.length; i++)
      if(kill[i].parentNode) kill[i].parentNode.removeChild(kill[i]);
  }}
  var doors = document.querySelectorAll('.vm-door');
  for(var j = 0; j < doors.length; j++) doors[j].parentNode.removeChild(doors[j]);
  var est = document.getElementById('vm-entr-style');
  if(est) est.parentNode.removeChild(est);
  document.documentElement.classList.remove('vm-entering');
  var kids = document.body.children;
  for(var k = kids.length - 1; k >= 0; k--){{
    var el = kids[k];
    if(el.tagName === 'DIV' && !el.className && !el.textContent.replace(/\\s/g, '') &&
       getComputedStyle(el).position === 'fixed')
      el.parentNode.removeChild(el);
  }}
  unlockStaleDoor();
}}

function unlockStaleDoor(){{
  /* an old scroll-driven door module may still hold its scroll lock: feed it
     a huge synthetic wheel delta so it completes and unlocks. The event is
     tagged __vm so THIS bundle's own intro ignores it. */
  try{{
    var ev = new WheelEvent('wheel', {{deltaY: 9e9, cancelable: true}});
    ev.__vm = 1;
    window.dispatchEvent(ev);
  }}catch(e){{}}
}}

function boot(){{
  stripWebflowCss();
  setTimeout(dedupe, 1200); setTimeout(dedupe, 3500);
  /* if the site markup is ALREADY in the DOM, another copy of this bundle
     injected it first. If that copy came from a SAME-OR-NEWER build, stand
     down. If it came from an OLDER build (stale browser/CDN-cached @main
     bundle from an old script tag), tear it down and render fresh. */
  if(document.querySelector('.announce, .cs-page')){{
    if((window.__VELMONT_BUILD_T || 0) >= BUILD_T) return;
    teardown();
  }}
  window.__VELMONT_BUILD_T = BUILD_T;

  var isCS = /coming-soon/.test(location.pathname + location.search);

  /* raise the entrance overlay IMMEDIATELY when the intro will play, so
     none of the page assembly (CSS load, injection, image decode) is ever
     visible; the entrance module drives and dismantles it */
  var introOn = CFG.intro == null || !!CFG.intro;
  if(!isCS && introOn && window.scrollY <= 2 && location.hash.length <= 1 &&
     !window.matchMedia('(prefers-reduced-motion: reduce)').matches){{
    window.__VM_ENTR = vmEntrance();
    /* warm the hero image while the CSS is still loading */
    (new Image()).src = BASE + 'assets/hero.jpg';
  }}

  whenCssReady(function(){{
    if(isCS){{
      document.body.classList.add('cs-body');
      inject(CS);
      csCountdown();
      return;
    }}
    inject(MAIN);

    /* ── page behaviors (script.js) ── */
{behaviors}

    /* ── door opening sequence ── */
{door}
  }});
}}

if(document.readyState === 'loading'){{ document.addEventListener('DOMContentLoaded', boot); }}
else {{ boot(); }}
}})();
'''

out = root / 'js' / 'webflow-render.js'
out.write_text(bundle)
print(f'wrote {out} ({out.stat().st_size} bytes)')
