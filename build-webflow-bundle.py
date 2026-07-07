#!/usr/bin/env python3
"""Builds js/webflow-render.js: a single script that injects the ENTIRE
launch site (landing page + coming-soon page) into an empty Webflow body.

Run after editing index.html / coming-soon.html / js/script.js:
    python3 build-webflow-bundle.py
"""
import json, re, pathlib

root = pathlib.Path(__file__).parent

def body_inner(path):
    html = (root / path).read_text()
    m = re.search(r'<body[^>]*>(.*)</body>', html, re.S)
    inner = m.group(1)
    inner = re.sub(r'<script\b.*?</script>', '', inner, flags=re.S)   # scripts come from the bundle
    return inner.strip()

main = body_inner('index.html')
cs = body_inner('coming-soon.html')

defaults = json.loads((root / 'site-config.json').read_text())

# static-site links -> Webflow routes
for a, b in [('href="coming-soon.html"', 'href="/coming-soon"'),
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

function boot(){{
  if(/coming-soon/.test(location.pathname)){{
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
