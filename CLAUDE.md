# Vital Socks theme: notes for Claude sessions

A Shopify Online Store 2.0 theme for Vital Socks, a South African compression-sock brand. The founder is Farida Cajee-Botes, an orthotist and prosthetist whose practice site is cajeebotes.com. See README.md for store setup.

## Hard rules

- **The repo root is the theme.** Only these folders ship to Shopify: `assets`, `config`, `layout`, `locales`, `sections`, `snippets` and `templates`. No build step, and no `src/` or `dist/` in the theme folders, because the GitHub integration must see a plain theme.
- **This repo is public.** SEO plans, competitor analysis, client figures and unverified claims belong in the private SEO programme repo, not here.
- **Numbers, prices, credentials, mmHg values, testimonials and competitor claims need a person's approval before they ship.** Never invent them. Compression values come only from the product metafield `custom.compression_level`. Sizes come only from the fit-finder blocks, which stay flagged "Sample sizes" until the real chart is in.
- **Never write quotes attributed to Farida** unless she has actually said them.
- **Brand colours are the three logo blues plus navy ink:** royal `#0060C2`, sky `#229EE3`, ice `#9AC7E9`, navy `#02182D`. Sky and ice backgrounds need navy text, because white on sky fails contrast.

## Conventions

- Section CSS and JS load from inside the section (`{{ 'x.css' | asset_url | stylesheet_tag }}`). Global styles go in `assets/base.css`.
- Motion lives only in `assets/motion.js` (GSAP, ScrollTrigger and Lenis, vendored in `assets/`). CSS never hides content for animation's sake. Scroll-linked motion is scrubbed. Reduced motion, and "animations off" in Theme settings, give a static page.
- The sock carousel follows the original brief: 650ms `cubic-bezier(0.4,0,0.2,1)`, a navigation lock, and roles centre, left, right and back. Keep that behaviour when editing it.
- Every piece of visible copy is a section or block setting, so the merchant can edit it in the theme editor. Put UI strings in `locales/en.default.json`.

## Checking work

- `npm run preview` starts http://localhost:8787, which renders the real theme files with mock data. `dev/preview/server.mjs` shims the Shopify tags and filters the theme uses. If you add a new Shopify filter or tag, add a shim there too.
- `npm run check` runs Shopify Theme Check. Keep it at zero offenses.
- Browser QA uses the `agent-browser` CLI at 1440 × 900 and 390 × 844, and checks there's no horizontal overflow.
