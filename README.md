# Velmont India · Launch Site

Temporary launch website for velmontindia.com (grand launch 10 July). The whole
site is injected into empty Webflow pages via custom code; Webflow only provides
the domain, pages and SEO settings. Files are served from this repo through
jsDelivr.

## Files

- `index.html` / `coming-soon.html`: the two pages (source of truth for markup and copy)
- `css/styles.css`: all styles
- `js/script.js`: page behaviors (nav, countdown, carousel, FAQ, toasts, reveals)
- `js/door-module.js`: scroll-locked door opening intro
- `js/webflow-render.js`: GENERATED bundle that Webflow loads. Do not edit by hand.
- `build-webflow-bundle.py`: regenerates the bundle
- `webflow-inject/`: the two snippets pasted into Webflow Site Settings custom code
- `assets/`: optimized images

## Edit workflow

1. Edit `index.html`, `coming-soon.html`, `css/styles.css`, `js/script.js`,
   `js/door-module.js` or `site-config.json`
2. Run `./deploy.sh "what changed"`. It rebuilds the bundle, commits and
   pushes. The Webflow loader pins CSS/JS to the latest commit hash, so
   every deploy is live for all visitors within seconds, no cache purging
   or hard refresh needed.

Door intro on/off lives in `site-config.json` (`"doorImage": ""` disables it).
Webflow is only needed for: page meta/SEO, slugs, domain settings, or changing
the two custom-code snippets themselves.

## Webflow config

- Both pages (Home, /coming-soon) have completely empty bodies
- Site Settings > Custom Code: head = `webflow-inject/head-code.html`,
  footer = `webflow-inject/footer-code.html`
- Door intro on/off: `site-config.json` in this repo

## Placeholder data to replace before launch

- Phone number and store map address (announcement strip, in `index.html` and footer)
- All prices, ratings, review quotes and "styles" counts in the Launch Edit and categories
- Registered address in the footer
