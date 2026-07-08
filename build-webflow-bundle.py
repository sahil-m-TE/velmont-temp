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
if(CFG.doorImage && !/^https?:/.test(CFG.doorImage)) CFG.doorImage = BASE + CFG.doorImage;

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
  var kids = document.body.children;
  for(var k = kids.length - 1; k >= 0; k--){{
    var el = kids[k];
    if(el.tagName === 'DIV' && !el.className && !el.textContent.replace(/\\s/g, '') &&
       getComputedStyle(el).position === 'fixed')
      el.parentNode.removeChild(el);
  }}
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
  if(/coming-soon/.test(location.pathname + location.search)){{
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
}}

if(document.readyState === 'loading'){{ document.addEventListener('DOMContentLoaded', boot); }}
else {{ boot(); }}
}})();
'''

out = root / 'js' / 'webflow-render.js'
out.write_text(bundle)
print(f'wrote {out} ({out.stat().st_size} bytes)')
