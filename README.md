# Vital Socks — Shopify theme

A custom Shopify Online Store 2.0 theme for Vital Socks, a South African brand of graduated compression socks designed by an Orthotist & Prosthetist.

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
- Images 4 and up (optional): extra photos of the socks being worn (`*-04-lifestyle.jpg`, `*-05-lifestyle.jpg`), for the product gallery.

Every photo of the socks being worn shows them at their true length: knee-high, with the cuff just under the knee. Keep to that for any new photos.

**Product metafields.** Go to **Settings > Custom data > Products** and add these definitions:

| Namespace and key | Type | Used for |
|---|---|---|
| `custom.compression_level` | Single line text | Compression range: "18–21 mmHg" for the launch range. It shows on product pages, cards and the carousel, and section copy shows it through the `[compression]` token (see **Compression** below). `templates/agents.md.liquid` types it in, because that template can't read metafields, so change it there too. |
| `custom.compression_class` | Single line text | Optional class note |
| `custom.persona` | Single line text | Who the design is for, for example "The shift worker" |
| `custom.fabric` | Multi-line text | Optional. Leave it blank unless a design's fabric differs, because the product page's **Fabric text** setting covers every design. |
| `custom.care` | Multi-line text | Care instructions |
| `custom.card_color` | Colour | Optional tile colour behind the product |

**Collections.** Create `launch-prints` with the five designs. The homepage grid uses it.

**Blog.** Create a blog with the handle `guides`. The homepage, the collection page and the compression guide list its latest posts, and show nothing until the first post is published. Under **Settings > Custom data > Blog posts**, add these optional definitions; each one shows on the post only when it's filled in:

| Namespace and key | Type | Used for |
|---|---|---|
| `custom.last_updated` | Date | "Last updated" in the byline, `article:modified_time` and the structured data's `dateModified`. Set it only when the post's content really changes. |
| `custom.takeaways` | List of single line text | The "Key takeaways" box under the post |
| `custom.references` | List of links | The "References" list under the post, also output as `citation` in the structured data |

A post whose author name matches the founder's name in Business details gets her byline link, author box and `Person` markup. Every other post is credited to the store.

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

**Theme settings.** In the theme editor, open **Theme settings > Business details** and fill in the registered name, company registration number, VAT number, physical address, email and phone. South African law (ECTA section 43) requires these on an online store, and the footer and structured data read them from there. The same panel holds the founder's name, title, practice website, profile page and any other verified profiles (one URL per line), which feed the founder section and structured data.

**Compression.** Under **Theme settings > Compression**, choose any launch design as the reference product. Wherever section copy contains `[compression]` (the homepage explainer, the product grid text, the founder points, FAQ answers, rich text and the product page panels), the theme shows that product's `custom.compression_level`. The value is typed in one place only. If the metafield is blank, the paragraph, point, feature or FAQ question holding the token is hidden, so no sentence is left with a gap.

**Size chart.** The **Fit finder** section on the Size guide page holds the manufacturer's chart: S, M and L by ankle and calf circumference, in whole centimetres (19–22 covers 19 up to just under 23). The ankle measurement sets the size and the calf only checks the fit, because the calf ranges overlap. It's the only copy of the chart, so if it changes, edit the size rows there.

**Policies.** Under **Settings > Policies**, write the refund, shipping, privacy (POPIA) and terms policies. The theme links them automatically: in the footer, in the notice above the checkout button (**Theme settings > Cart**), in the product page's Shipping & exchanges panel, and in the privacy notices under the newsletter, password-page and contact forms. A policy that hasn't been written stays unlinked.

**Payments and delivery.** Under **Settings > Payments**, South African stores usually use a third-party provider such as Payfast, Yoco, Peach Payments or Ozow. Check which ones Shopify lists for this store. Set delivery rates under **Settings > Shipping and delivery**, and turn on **Include tax in prices** under **Settings > Taxes and duties**.

## SEO: what the theme already does

- `templates/robots.txt.liquid` outputs `/robots.txt` from Shopify's maintained default rules, so they stay current.
- Shopify generates `/sitemap.xml` automatically. Submit it in Google Search Console.
- `templates/agents.md.liquid` outputs `/agents.md`, and Shopify also serves it at `/llms.txt` and `/llms-full.txt`. Shopify renders it in a restricted context where only `request` and `agents` exist, so `shop`, `settings`, collections and metafields all render blank there. The store facts (compression level, length, sizes, fabric and page links) are typed into the template, so update them whenever the products change. Don't put an email address or phone number in it, because the file is cached and served to every agent.
- `snippets/meta-tags.liquid` handles the title, description, canonical, robots, Open Graph (`en_ZA`) and Twitter tags. The " – Vital Socks" suffix is added only when the whole title stays within 60 characters. Search, cart, tag-filtered and 404 pages are set to `noindex, follow`.
- Structured data (`snippets/structured-data.liquid`):
  - OnlineStore on every page, from Business details, with the founder as a `Person` reference. WebSite on the home page only.
  - The founder's `Person` node on the home page, the About page (handle `about`) and her own posts.
  - BlogPosting on posts, built in the snippet, with the author, dates and references from the blog post metafields above.
  - BreadcrumbList on products, collections, blogs and posts, matching the visible breadcrumbs. Pages get theirs from the Page content section, beside the visible trail, so the About page, which has no trail, has no breadcrumb markup.
  - Product (ProductGroup with variants), through Shopify's `structured_data` filter.
  - FAQPage from the FAQ page's questions. Keep FAQ markup on one page only.
- There's one H1 per page. On the homepage it's the carousel heading.
- Every post ends with the disclaimer, the author box (for the founder's posts) and links to the next three posts, so no post is left without internal links.
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

The founder section shows the bundled portrait of Farida Cajee-Botes (`assets/founder-farida-cajee-botes.webp` and its `-md` size) until a portrait is chosen in the section.

The sock renders and lifestyle photos were generated with Higgsfield from the flat design files and the logo. Check them against the physical samples before launch, particularly the cuff logo, heel and toe colours, and print scale. Replace them with real photography whenever it's available.
