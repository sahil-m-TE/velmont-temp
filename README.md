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

1. Edit `index.html`, `coming-soon.html`, `css/styles.css`, `js/script.js` or `js/door-module.js`
2. If you touched anything except the CSS: `python3 build-webflow-bundle.py`
3. Commit and push
4. jsDelivr caches `@main` for ~12h: purge at https://www.jsdelivr.com/tools/purge
   (purge both `/css/styles.css` and `/js/webflow-render.js`), or bump a `?v=N`
   query on the two URLs in Webflow custom code

## Webflow config

- Both pages (Home, /coming-soon) have completely empty bodies
- Site Settings > Custom Code: head = `webflow-inject/head-code.html`,
  footer = `webflow-inject/footer-code.html`
- Door intro on/off: `window.VELMONT_CONFIG.doorImage` in the head snippet
  (image URL = on, empty string = off)

## Placeholder data to replace before launch

- Phone number and store map address (announcement strip, in `index.html` and footer)
- All prices, ratings, review quotes and "styles" counts in the Launch Edit and categories
- Registered address in the footer
