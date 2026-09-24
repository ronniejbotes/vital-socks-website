# Vital Socks — Shopify theme

A custom Shopify Online Store 2.0 theme for Vital Socks, a South African brand of graduated compression socks whose compression grading is overseen by an orthotist.

The repository root **is** the theme. There's no build step: what's in `assets/`, `config/`, `layout/`, `locales/`, `sections/`, `snippets/` and `templates/` is exactly what Shopify runs. Everything else (`dev/`, `package.json`, this README) is local tooling that Shopify ignores.

## Getting it onto Shopify

Pick one:

1. **Upload a zip.** Run `npm run package`, then in Shopify admin go to **Online Store > Themes > Add theme > Upload zip file** and choose `dist/vital-socks-theme.zip`.
2. **Connect GitHub (recommended).** Go to **Online Store > Themes > Add theme > Connect from GitHub** and pick this repo and the `main` branch. Shopify syncs every push, and edits made in the theme editor come back as commits. Non-theme folders are ignored.
3. **Shopify CLI.** Run `shopify theme push`, or `shopify theme dev` for live preview against the real store. `.shopifyignore` keeps local tooling out.

## Store setup checklist

The theme reads everything below from Shopify admin, so none of it is hard-coded.

**Products.** Create the five launch designs with these **handles**, because the homepage is already wired to them: `cherry-pop`, `espresso`, `checker`, `daisy`, `black`. Add a `Size` option with the real sizes.

- Image 1: the transparent cut-out (`dev/product-images/*-01-cutout.png`). It floats on a tinted tile on cards and on the product page.
- Image 2: the lifestyle photo (`*-02-lifestyle.jpg`). It fades in when a card is hovered.
- Image 3 (optional): the studio shot (`*-03-studio.jpg`).

**Product metafields.** Go to **Settings > Custom data > Products** and add these definitions:

| Namespace and key | Type | Used for |
|---|---|---|
| `custom.compression_level` | Single line text | Compression range, for example "15–20 mmHg". It shows on product pages, cards, the carousel and `/agents.md`. Keep it in this one place only. |
| `custom.compression_class` | Single line text | Optional class note |
| `custom.persona` | Single line text | Who the design is for, for example "The shift worker" |
| `custom.fabric` | Multi-line text | Fabric composition |
| `custom.care` | Multi-line text | Care instructions |
| `custom.card_color` | Colour | Optional tile colour behind the product |

**Collections.** Create `launch-prints` with the five designs. The homepage grid uses it.

**Pages.** Create each page and pick the matching theme template:

| Page | Handle | Template |
|---|---|---|
| About | `about` | `page.about` |
| Compression guide | `compression-guide` | `page.compression-guide` |
| Size guide | `size-guide` | `page.size-guide` |
| FAQ | `faq` | `page.faq` |
| Contact | `contact` | `page.contact` |

**Menus.** Under **Content > Menus**, set up:

- `main-menu`: Shop, Compression guide, Size guide, About, FAQ
- `footer`: the product links
- `footer-help`: Size guide, Compression guide, FAQ, Contact, Shipping policy, Refund policy

**Theme settings.** In the theme editor, open **Theme settings > Business details** and fill in the registered name, company registration number, VAT number, physical address, email and phone. South African law (ECTA section 43) requires these on an online store, and the footer and structured data read them from there.

**Size chart.** In the theme editor, open the **Fit finder** section on the Size guide page and the homepage. Replace the sample rows with the real size chart, then untick **Sample sizes**. Until then a notice tells shoppers the sizes are samples.

**Policies.** Under **Settings > Policies**, write the refund, shipping, privacy (POPIA) and terms policies. The theme links them automatically.

**Payments and delivery.** Under **Settings > Payments**, South African stores usually use a third-party provider such as Payfast, Yoco, Peach Payments or Ozow. Check which ones Shopify lists for this store. Set delivery rates under **Settings > Shipping and delivery**, and turn on **Include tax in prices** under **Settings > Taxes and duties**.

## SEO: what the theme already does

- `templates/robots.txt.liquid` outputs `/robots.txt` from Shopify's maintained default rules, so they stay current.
- Shopify generates `/sitemap.xml` automatically. Submit it in Google Search Console.
- `templates/agents.md.liquid` outputs `/agents.md`, and Shopify also serves it at `/llms.txt` and `/llms-full.txt`. It's a live, AI-readable summary of the store: products, prices, compression grades, policies and how to buy.
- `snippets/meta-tags.liquid` handles the title, description, canonical, robots, Open Graph (`en_ZA`) and Twitter tags. Search, cart and tag-filtered pages are set to `noindex`.
- Structured data:
  - OnlineStore and WebSite on the home page, with the founder as a `Person`, from Business details.
  - BreadcrumbList on products, collections, pages and articles.
  - Product (ProductGroup with variants) and Article, through Shopify's `structured_data` filter.
  - FAQPage from the FAQ page's questions. Keep FAQ markup on one page only.
- There's one H1 per page. On the homepage it's the carousel heading.
- Performance:
  - Self-hosted fonts are preloaded.
  - All JavaScript is deferred.
  - Images are responsive and lazy-loaded below the fold.
  - Animation uses only transform and opacity.
  - Visitors who ask for reduced motion get a still site.

## Working locally

```bash
npm install
npm run preview   # http://localhost:8787 — renders the real theme files with mock products
npm run check     # Shopify Theme Check
npm run package   # builds dist/vital-socks-theme.zip for upload
```

The preview (`dev/preview/`) exists so the theme could be built before a store existed. Its products, prices and sizes are mock data, and a badge on every page says so. Once the Vital Socks store exists, use `shopify theme dev` for real data.

## How it's built

| Area | Files |
|---|---|
| Layout | `layout/theme.liquid` (password page: `layout/password.liquid`) |
| Homepage hero: sock carousel | `sections/sock-carousel.liquid`, `assets/section-sock-carousel.css`, `assets/sock-carousel.js` |
| Scroll motion (GSAP, ScrollTrigger, Lenis) | `assets/motion.js`, with the vendor files in `assets/vendor-*.js` |
| Cart drawer, product form, fit finder | `assets/theme.js`, `sections/cart-drawer.liquid`, `sections/main-product.liquid`, `sections/fit-finder.liquid` |
| Brand tokens | Theme settings, printed as CSS variables in `layout/theme.liquid`, used by `assets/base.css` |
| SEO | `snippets/meta-tags.liquid`, `snippets/structured-data.liquid`, `templates/robots.txt.liquid`, `templates/agents.md.liquid` |

Every homepage section can be edited, reordered, added or removed in the Shopify theme editor.

## Imagery

The sock renders and lifestyle photos were generated with Higgsfield from the flat design files and the logo. Check them against the physical samples before launch, particularly the cuff logo, heel and toe colours, and print scale. Replace them with real photography whenever it's available.
