/**
 * Local preview for the Vital Socks theme — `npm run preview`.
 *
 * Renders the real theme files (layout, JSON templates, sections, snippets,
 * locales, settings) with LiquidJS plus small shims for Shopify-only tags and
 * filters, against mock products from mock-data.mjs. It exists so the theme
 * can be built and checked before a Shopify store exists. It is NOT Shopify:
 * once the store is set up, use `shopify theme dev` for real data.
 *
 * Shopify ignores this folder (see .shopifyignore; the GitHub integration
 * ignores non-theme folders).
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid, Tag, Value, Drop } from 'liquidjs';
import { buildBlogs, buildProducts, MENUS, PAGES, POLICIES } from './mock-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = Number(process.env.PORT) || 8787;
const ORIGIN = `http://localhost:${PORT}`;

/* ------------------------------------------------------------------ utils */
const read = (rel) => fs.readFile(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fss.existsSync(path.join(ROOT, rel));
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const kwargs = (args) => Object.fromEntries(args.filter(Array.isArray));
const handleize = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const fmtMoney = (cents) =>
  (Number(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function prep(src) {
  return src
    .replace(/{%-?\s*schema\s*-?%}[\s\S]*?{%-?\s*endschema\s*-?%}/g, '')
    .replace(/{%-?\s*(javascript|stylesheet)\s*-?%}[\s\S]*?{%-?\s*end\1\s*-?%}/g, '')
    .replace(/{%-?\s*style\s*-?%}/g, '<style>')
    .replace(/{%-?\s*endstyle\s*-?%}/g, '</style>')
    .replace(/posted_successfully\?/g, 'posted_successfully');
}

function extractSchema(src) {
  const m = src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
  return m ? JSON.parse(m[1]) : {};
}

function splitArgs(str) {
  const out = [];
  let cur = '';
  let quote = null;
  for (const ch of str) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/* ------------------------------------------------------------------ drops */
class Color extends Drop {
  constructor(hex) {
    super();
    this.hex = hex;
    const n = parseInt(String(hex).replace('#', ''), 16);
    this.red = (n >> 16) & 255;
    this.green = (n >> 8) & 255;
    this.blue = n & 255;
  }
  valueOf() {
    return this.hex;
  }
  toString() {
    return this.hex;
  }
  toJSON() {
    return this.hex;
  }
}

class ImageUrl {
  constructor(image, width) {
    this.image = image;
    this.width = width;
    const src = image.src || String(image);
    // Protocol-relative like Shopify's CDN URLs, so `| prepend: 'https:'` in
    // meta tags and JSON-LD gives an absolute URL here too.
    this.url = src.startsWith('/') && !src.startsWith('//') ? `//localhost:${PORT}${src}` : src;
  }
  toString() {
    return this.url;
  }
}

class RobotsLine {
  constructor(text) {
    this.text = text;
    const [directive, ...rest] = text.split(':');
    this.directive = directive;
    this.value = rest.join(':').trim();
  }
  toString() {
    return `${this.text}\n`;
  }
}

/* ------------------------------------------------------------------ store */
const products = buildProducts();
const productsByHandle = Object.fromEntries(products.map((p) => [p.handle, p]));
const variantsById = new Map(products.flatMap((p) => p.variants.map((v) => [String(v.id), v])));

function arrayWithHandles(items) {
  const arr = [...items];
  items.forEach((item) => (arr[item.handle] = item));
  return arr;
}

const SORT_OPTIONS = [
  { value: 'manual', name: 'Featured' },
  { value: 'best-selling', name: 'Best selling' },
  { value: 'title-ascending', name: 'Alphabetically, A-Z' },
  { value: 'price-ascending', name: 'Price, low to high' },
  { value: 'price-descending', name: 'Price, high to low' },
];
const makeCollection = (handle, title, description = '') => ({
  handle,
  title,
  description,
  url: `/collections/${handle}`,
  products,
  products_count: products.length,
  all_products_count: products.length,
  sort_options: SORT_OPTIONS,
  default_sort_by: 'manual',
  featured_image: null,
});
const collections = arrayWithHandles([
  makeCollection(
    'all',
    'All socks',
    "<p>Compression doesn't have to look clinical. Five knee-high designs, Cherry Pop, Espresso, Checker, Daisy and Black, all in graduated compression, sized S, M and L by ankle circumference.</p>"
  ),
  makeCollection('launch-prints', 'The launch prints'),
]);
const pages = arrayWithHandles(
  Object.entries(PAGES).map(([handle, p]) => ({ handle, url: `/pages/${handle}`, ...p }))
);
const blogs = arrayWithHandles(buildBlogs());

let cartLines = []; // { key, variant_id, quantity }

function cartObject() {
  const items = cartLines.map((line) => {
    const variant = variantsById.get(String(line.variant_id));
    const product = variant.product;
    return {
      key: line.key,
      id: variant.id,
      variant_id: variant.id,
      quantity: line.quantity,
      product,
      variant,
      title: `${product.title} - ${variant.title}`,
      image: product.featured_media,
      url: `${product.url}?variant=${variant.id}`,
      url_to_remove: `/cart/change?id=${line.key}&quantity=0`,
      price: variant.price,
      final_price: variant.price,
      final_line_price: variant.price * line.quantity,
      original_line_price: variant.price * line.quantity,
    };
  });
  const total = items.reduce((sum, i) => sum + i.final_line_price, 0);
  return {
    item_count: items.reduce((sum, i) => sum + i.quantity, 0),
    items,
    total_price: total,
    items_subtotal_price: total,
    original_total_price: total,
    currency: { iso_code: 'ZAR' },
    note: '',
  };
}

function cartJSON() {
  const c = cartObject();
  return {
    token: 'preview',
    note: c.note,
    item_count: c.item_count,
    total_price: c.total_price,
    currency: 'ZAR',
    items: c.items.map((i) => ({
      key: i.key,
      id: i.variant_id,
      quantity: i.quantity,
      title: i.title,
      price: i.price,
      line_price: i.final_line_price,
      url: i.url,
    })),
  };
}

/* ------------------------------------------------------------------ settings */
const settingsSchema = JSON.parse(await read('config/settings_schema.json'));
const settingsData = JSON.parse(await read('config/settings_data.json'));
const globalSettingTypes = {};
const globalDefaults = {};
for (const group of settingsSchema) {
  for (const s of group.settings || []) {
    if (!s.id) continue;
    globalSettingTypes[s.id] = s.type;
    if ('default' in s) globalDefaults[s.id] = s.default;
  }
}

function resolveSetting(type, value) {
  if (value === undefined || value === null || value === '') {
    if (type === 'checkbox') return false;
    return type === 'text' || type === 'textarea' || type === 'richtext' ? '' : null;
  }
  switch (type) {
    case 'color':
      return new Color(value);
    case 'product':
      return productsByHandle[value] || null;
    case 'collection':
      return collections[value] || null;
    case 'page':
      return pages[value] || null;
    case 'blog':
      return blogs[value] || null;
    case 'image_picker':
      return null;
    default:
      return value;
  }
}

function buildSettings() {
  const current = typeof settingsData.current === 'string' ? settingsData.presets[settingsData.current] : settingsData.current;
  const merged = { ...globalDefaults, ...current };
  const out = {};
  for (const [id, type] of Object.entries(globalSettingTypes)) out[id] = resolveSetting(type, merged[id]);
  return out;
}

/* ------------------------------------------------------------------ locales */
const locale = JSON.parse(await read('locales/en.default.json'));
function translate(key, args) {
  let node = key.split('.').reduce((acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), locale);
  if (node === undefined) return `translation missing: en.${key}`;
  if (typeof node === 'object') {
    const count = Number(args.count);
    node = count === 1 ? node.one ?? node.other : node.other ?? node.one;
  }
  return String(node).replace(/{{\s*(\w+)\s*}}/g, (_, name) => (args[name] ?? '').toString());
}

/* ------------------------------------------------------------------ engine */
const engine = new Liquid({
  root: [path.join(ROOT, 'snippets')],
  partials: path.join(ROOT, 'snippets'),
  extname: '.liquid',
  dynamicPartials: true,
  strictFilters: false,
  strictVariables: false,
  lenientIf: true,
  cache: false,
});

engine.registerFilter('asset_url', (file) => `//localhost:${PORT}/assets/${file}`);
engine.registerFilter('image_url', (img, ...args) => {
  if (!img) return '';
  const { width } = kwargs(args);
  return new ImageUrl(typeof img === 'string' ? { src: img } : img, width);
});
engine.registerFilter('image_tag', (u, ...args) => {
  if (!u) return '';
  const o = kwargs(args);
  const img = u.image || {};
  const width = o.width ?? u.width ?? img.width;
  const ratio = img.aspect_ratio || (img.width && img.height ? img.width / img.height : null);
  const height = o.height ?? (width && ratio ? Math.round(width / ratio) : img.height);
  const attrs = { src: u.url || String(u), alt: o.alt ?? img.alt ?? '' };
  if (o.widths) {
    attrs.srcset = String(o.widths)
      .split(',')
      .map((w) => `${attrs.src} ${w.trim()}w`)
      .join(', ');
  }
  if (o.sizes) attrs.sizes = o.sizes;
  attrs.width = width;
  attrs.height = height;
  for (const [k, v] of Object.entries(o)) {
    if (['alt', 'widths', 'sizes', 'width', 'height'].includes(k)) continue;
    attrs[k] = v;
  }
  return `<img ${Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(' ')}>`;
});
engine.registerFilter('preload_tag', (url, ...args) => {
  const o = kwargs(args);
  return `<link href="${url}" rel="preload"${Object.entries(o).map(([k, v]) => ` ${k}="${esc(v)}"`).join('')}>`;
});
engine.registerFilter('stylesheet_tag', (url) => `<link href="${url}" rel="stylesheet" type="text/css" media="all">`);
engine.registerFilter('script_tag', (url) => `<script src="${url}" type="text/javascript"></script>`);
engine.registerFilter('money', (c) => (c === null || c === undefined || c === '' ? '' : `R ${fmtMoney(c)}`));
engine.registerFilter('money_with_currency', (c) => (c === null || c === undefined ? '' : `R ${fmtMoney(c)} ZAR`));
engine.registerFilter('money_without_currency', (c) => (c === null || c === undefined ? '' : fmtMoney(c)));
engine.registerFilter('money_without_trailing_zeros', (c) =>
  c === null || c === undefined ? '' : `R ${fmtMoney(c).replace(/\.00$/, '')}`
);
engine.registerFilter('t', (key, ...args) => translate(String(key), kwargs(args)));
engine.registerFilter('handle', handleize);
engine.registerFilter('handleize', handleize);
engine.registerFilter('color_brightness', (c) => {
  const hex = String(c?.valueOf ? c.valueOf() : c).replace('#', '');
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return Math.round((r * 299 + g * 587 + b * 114) / 1000);
});
engine.registerFilter(
  'placeholder_svg_tag',
  (_, cls) => `<svg class="${esc(cls || '')}" viewBox="0 0 100 125" aria-hidden="true"><rect width="100" height="125" fill="#EAF4FB"/></svg>`
);
engine.registerFilter(
  'payment_type_svg_tag',
  (type) =>
    `<svg viewBox="0 0 38 24" width="38" height="24" role="img" aria-label="${esc(type)}"><rect width="38" height="24" rx="4" fill="#fff"/><text x="19" y="15" font-size="6.5" text-anchor="middle" fill="#02182D" font-family="system-ui">${esc(type)}</text></svg>`
);
engine.registerFilter('payment_button', () => '');
engine.registerFilter('format_code', (s) => s);
engine.registerFilter('structured_data', (obj) => {
  if (!obj) return '';
  if (obj.variants) {
    return JSON.stringify({
      '@context': 'http://schema.org/',
      '@type': 'ProductGroup',
      '@id': `${obj.url}#product`,
      name: obj.title,
      url: `${ORIGIN}${obj.url}`,
      brand: { '@type': 'Brand', name: 'Vital Socks' },
      description: String(obj.description).replace(/<[^>]+>/g, ' ').trim(),
      image: `${ORIGIN}${obj.featured_media?.src}`,
      productGroupID: String(obj.id),
      variesBy: ['https://schema.org/size'],
      hasVariant: obj.variants.map((v) => ({
        '@type': 'Product',
        name: `${obj.title} - ${v.title}`,
        sku: v.sku,
        size: v.title,
        offers: {
          '@type': 'Offer',
          price: (v.price / 100).toFixed(2),
          priceCurrency: 'ZAR',
          availability: v.available ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock',
          url: `${ORIGIN}${obj.url}?variant=${v.id}`,
        },
      })),
    });
  }
  return JSON.stringify({ '@context': 'http://schema.org/', '@type': 'Article', headline: obj.title });
});
engine.registerFilter('media_tag', (media) => {
  if (!media || media.media_type !== 'image') return '';
  return `<img src="${esc(new ImageUrl(media).url)}" alt="${esc(media.alt || '')}" width="${esc(media.width)}" height="${esc(media.height)}" loading="lazy">`;
});
engine.registerFilter('link_to', (text, url, title) => `<a href="${esc(url)}"${title ? ` title="${esc(title)}"` : ''}>${text}</a>`);

/* date: Shopify also takes `format: 'name'`, a named format from the locale's
   date_formats (or Shopify's defaults). LiquidJS only knows strftime strings. */
const SHOPIFY_DATE_FORMATS = {
  abbreviated_date: '%b %d, %Y',
  basic: '%m/%d/%Y',
  date: '%B %d, %Y',
  date_at_time: '%B %d, %Y at %-I:%M %p',
  default: '%a, %b %d, %Y, %-I:%M %p %z',
  on_date: 'on %b %d, %Y',
};
const liquidDate = engine.filters.date;
function dateFormat(args) {
  const positional = args.find((a) => !Array.isArray(a));
  if (positional !== undefined) return positional;
  const named = args.find((a) => Array.isArray(a) && a[0] === 'format');
  if (!named) return undefined;
  return locale.date_formats?.[named[1]] ?? SHOPIFY_DATE_FORMATS[named[1]] ?? named[1];
}
engine.registerFilter('date', function (v, ...args) {
  return liquidDate.call(this, v, dateFormat(args));
});
/* time_tag: <time datetime="ISO">formatted</time> */
engine.registerFilter('time_tag', function (v, ...args) {
  if (v === null || v === undefined || v === '') return '';
  const o = kwargs(args);
  const text = liquidDate.call(this, v, dateFormat(args) ?? SHOPIFY_DATE_FORMATS.default);
  const d = new Date(v);
  const iso = o.datetime ? liquidDate.call(this, v, o.datetime) : Number.isNaN(d.getTime()) ? '' : d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return `<time datetime="${esc(iso)}">${text}</time>`;
});

/* {% form %} */
engine.registerTag(
  'form',
  class extends Tag {
    constructor(token, remainTokens, liquid, parser) {
      super(token, remainTokens, liquid);
      this.argsStr = token.args;
      this.templates = [];
      const stream = parser
        .parseStream(remainTokens)
        .on('tag:endform', () => stream.stop())
        .on('template', (tpl) => this.templates.push(tpl))
        .on('end', () => {
          throw new Error('form tag not closed');
        });
      stream.start();
    }
    *render(ctx, emitter) {
      const parts = splitArgs(this.argsStr);
      const type = yield new Value(parts[0], this.liquid).value(ctx, false);
      const attrs = {};
      for (const part of parts.slice(1)) {
        const m = part.match(/^([\w-]+)\s*:\s*([\s\S]+)$/);
        if (m) attrs[m[1]] = yield new Value(m[2], this.liquid).value(ctx, false);
      }
      const actions = {
        product: '/cart/add',
        customer: '/contact#newsletter',
        contact: '/contact',
        storefront_password: '/password',
      };
      const attrStr = Object.entries(attrs)
        .map(([k, v]) => ` ${k}="${esc(v)}"`)
        .join('');
      emitter.write(
        `<form method="post" action="${actions[type] || '/'}" accept-charset="UTF-8"${type === 'product' ? ' enctype="multipart/form-data"' : ''}${attrStr}><input type="hidden" name="form_type" value="${esc(type)}"><input type="hidden" name="utf8" value="✓">`
      );
      ctx.push({ form: { posted_successfully: false, errors: null, email: '', name: '', body: '', phone: '' } });
      yield this.liquid.renderer.renderTemplates(this.templates, ctx, emitter);
      ctx.pop();
      emitter.write('</form>');
    }
  }
);

/* {% paginate %} (single page in the preview) */
engine.registerTag(
  'paginate',
  class extends Tag {
    constructor(token, remainTokens, liquid, parser) {
      super(token, remainTokens, liquid);
      this.templates = [];
      const stream = parser
        .parseStream(remainTokens)
        .on('tag:endpaginate', () => stream.stop())
        .on('template', (tpl) => this.templates.push(tpl))
        .on('end', () => {
          throw new Error('paginate tag not closed');
        });
      stream.start();
    }
    *render(ctx, emitter) {
      ctx.push({ paginate: { pages: 1, current_page: 1, parts: [], previous: null, next: null } });
      yield this.liquid.renderer.renderTemplates(this.templates, ctx, emitter);
      ctx.pop();
    }
  }
);

/* {% layout none %} — ignored */
engine.registerTag(
  'layout',
  class extends Tag {
    *render() {}
  }
);

/* {% section 'name' %} and {% sections 'group' %} */
engine.registerTag(
  'section',
  class extends Tag {
    constructor(token, remainTokens, liquid) {
      super(token, remainTokens, liquid);
      this.expr = token.args;
    }
    *render(ctx, emitter) {
      const name = yield new Value(this.expr, this.liquid).value(ctx, false);
      emitter.write(yield renderSection(name, {}, ctx.globals, name));
    }
  }
);
engine.registerTag(
  'sections',
  class extends Tag {
    constructor(token, remainTokens, liquid) {
      super(token, remainTokens, liquid);
      this.expr = token.args;
    }
    *render(ctx, emitter) {
      const group = yield new Value(this.expr, this.liquid).value(ctx, false);
      const data = JSON.parse(yield read(`sections/${group}.json`));
      let html = '';
      for (const key of data.order) {
        const sec = data.sections[key];
        if (sec.disabled) continue;
        html += yield renderSection(sec.type, sec, ctx.globals, `sections--1__${key}`, `shopify-section-group-${group}`);
      }
      emitter.write(html);
    }
  }
);

async function renderSection(type, data, globals, id, extraClass = '') {
  const src = await read(`sections/${type}.liquid`);
  const schema = extractSchema(src);
  const types = Object.fromEntries((schema.settings || []).filter((s) => s.id).map((s) => [s.id, s]));
  const settings = {};
  for (const [sid, def] of Object.entries(types)) {
    const raw = data.settings && sid in data.settings ? data.settings[sid] : def.default;
    settings[sid] = resolveSetting(def.type, raw);
  }
  const blocks = (data.block_order || []).map((bid) => {
    const b = data.blocks[bid];
    const bschema = (schema.blocks || []).find((x) => x.type === b.type) || {};
    const bsettings = {};
    for (const def of bschema.settings || []) {
      if (!def.id) continue;
      const raw = b.settings && def.id in b.settings ? b.settings[def.id] : def.default;
      bsettings[def.id] = resolveSetting(def.type, raw);
    }
    return { id: `${id}-${bid}`, type: b.type, settings: bsettings, shopify_attributes: '' };
  });
  const section = { id, settings, blocks };
  const body = await engine.parseAndRender(prep(src), { section }, { globals });
  const tag = schema.tag || 'div';
  const cls = ['shopify-section', extraClass, schema.class].filter(Boolean).join(' ');
  return `<${tag} id="shopify-section-${id}" class="${cls}">${body}</${tag}>`;
}

async function renderTemplateContent(name, globals) {
  if (exists(`templates/${name}.json`)) {
    const data = JSON.parse(await read(`templates/${name}.json`));
    let html = '';
    for (const key of data.order) {
      const sec = data.sections[key];
      if (sec.disabled) continue;
      html += await renderSection(sec.type, sec, globals, `template--1__${key}`);
    }
    return { html, layout: data.layout || 'theme' };
  }
  const src = await read(`templates/${name}.liquid`);
  return { html: await engine.parseAndRender(prep(src), {}, { globals }), layout: 'theme' };
}

/* ------------------------------------------------------------------ globals */
const PREVIEW_HEAD = (badge) => `
<script>window.Shopify = { designMode: false, preview: true };</script>
${
  badge
    ? `<style>.vs-preview-badge{position:fixed;right:6px;bottom:6px;z-index:9999;background:#02182D;color:#fff;font:600 10px/1 system-ui;padding:6px 10px;border-radius:999px;opacity:.8;letter-spacing:.08em;pointer-events:none}@media (max-width:639px){.vs-preview-badge{position:static;border-radius:0;opacity:1;padding:10px 16px;text-align:center;border-top:1px solid rgba(255,255,255,.12)}}</style>
<script>document.addEventListener('DOMContentLoaded',function(){var b=document.createElement('div');b.className='vs-preview-badge';b.textContent='LOCAL PREVIEW · MOCK PRODUCTS, PRICES & SIZES';document.body.appendChild(b);});</script>`
    : ''
}`;

function buildGlobals(url, extra = {}) {
  const pathName = url.pathname;
  const linklists = {};
  for (const [handle, links] of Object.entries(MENUS)) {
    linklists[handle] = {
      handle,
      links: links.map(([title, href]) => ({ title, url: href, current: href === pathName })),
    };
  }
  return {
    settings: buildSettings(),
    shop: {
      name: 'Vital Socks',
      url: ORIGIN,
      description:
        'Everyday graduated compression socks, designed by an Orthotist & Prosthetist. Five knee-high prints, sized by your ankle. Delivered across South Africa.',
      currency: 'ZAR',
      customer_accounts_enabled: false,
      enabled_payment_types: ['Visa', 'Mastercard', 'Instant EFT'],
      policies: POLICIES,
      privacy_policy: POLICIES[0],
      refund_policy: POLICIES[1],
      shipping_policy: POLICIES[2],
      terms_of_service: POLICIES[3],
      password_message: 'Opening soon.',
    },
    request: {
      page_type: extra.page_type || 'index',
      path: pathName,
      host: `localhost:${PORT}`,
      origin: ORIGIN,
      locale: { iso_code: 'en' },
      design_mode: false,
    },
    routes: {
      root_url: '/',
      cart_url: '/cart',
      cart_add_url: '/cart/add',
      cart_change_url: '/cart/change',
      cart_update_url: '/cart/update',
      search_url: '/search',
      collections_url: '/collections',
      all_products_collection_url: '/collections/all',
      product_recommendations_url: '/recommendations/products',
      account_login_url: '/account/login',
    },
    canonical_url: `${ORIGIN}${pathName}`,
    page_title: extra.page_title || 'Vital Socks',
    page_description: extra.page_description ?? '',
    page_image: null,
    current_page: 1,
    current_tags: null,
    template: { name: extra.template_name || 'index', suffix: extra.template_suffix || null },
    cart: cartObject(),
    linklists,
    collections,
    pages,
    blogs,
    all_products: productsByHandle,
    recommendations: { performed: false, products: [], products_count: 0 },
    search: { performed: false },
    content_for_header: PREVIEW_HEAD(url.searchParams.get('badge') !== '0'),
    ...extra.objects,
  };
}

async function renderPage(res, url, { template, suffix, pageType, title, description, objects, status = 200 }) {
  const name = suffix ? `${template}.${suffix}` : template;
  const globals = buildGlobals(url, {
    page_type: pageType || template,
    page_title: title,
    page_description: description,
    template_name: template,
    template_suffix: suffix,
    objects,
  });
  const { html: content, layout } = await renderTemplateContent(name, globals);
  const layoutSrc = prep(await read(`layout/${layout}.liquid`));
  const html = await engine.parseAndRender(layoutSrc, {}, { globals: { ...globals, content_for_layout: content } });
  send(res, status, html, 'text/html; charset=utf-8');
}

/* ------------------------------------------------------------------ http */
function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}
const MIME = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};
async function serveFile(res, dir, file) {
  const full = path.join(ROOT, dir, path.basename(file));
  if (!fss.existsSync(full)) return send(res, 404, 'Not found', 'text/plain');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fss.createReadStream(full).pipe(res);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  const type = req.headers['content-type'] || '';
  if (type.includes('application/json')) return JSON.parse(raw || '{}');
  if (type.includes('multipart/form-data')) {
    const boundary = type.split('boundary=')[1];
    const out = {};
    for (const part of raw.split(`--${boundary}`)) {
      const m = part.match(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  }
  const params = new URLSearchParams(raw);
  const out = {};
  for (const [k, v] of params) {
    if (k.endsWith('[]')) (out[k] = out[k] || []).push(v);
    else out[k] = v;
  }
  return out;
}

async function sectionsFor(names, sectionsUrl) {
  if (!names) return undefined;
  const url = new URL(sectionsUrl || '/', ORIGIN);
  const globals = buildGlobals(url, { page_type: 'cart' });
  const out = {};
  for (const name of String(names).split(',')) out[name] = await renderSection(name.trim(), {}, globals, name.trim());
  return out;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  const p = url.pathname.replace(/\/+$/, '') || '/';
  try {
    if (p.startsWith('/assets/')) return serveFile(res, 'assets', p.slice(8));
    if (p.startsWith('/dev-images/')) return serveFile(res, 'dev/product-images', p.slice(12));

    // ---- cart API
    if (p === '/cart.js') return send(res, 200, JSON.stringify(cartJSON()), 'application/json');
    if (p === '/cart/add.js' || (p === '/cart/add' && req.method === 'POST')) {
      const body = await readBody(req);
      const variant = variantsById.get(String(body.id));
      if (!variant) return send(res, 422, JSON.stringify({ status: 422, message: 'Cart Error', description: 'Variant not found' }), 'application/json');
      const qty = Math.max(1, Number(body.quantity || 1));
      const existing = cartLines.find((l) => l.variant_id === variant.id);
      if (existing) existing.quantity += qty;
      else cartLines.push({ key: `${variant.id}:preview`, variant_id: variant.id, quantity: qty });
      const payload = { id: variant.id, quantity: qty, title: variant.product.title, sections: await sectionsFor(body.sections, body.sections_url) };
      if (p === '/cart/add') {
        res.writeHead(302, { Location: '/cart' });
        return res.end();
      }
      return send(res, 200, JSON.stringify(payload), 'application/json');
    }
    if (p === '/cart/change.js') {
      const body = await readBody(req);
      const line = cartLines.find((l) => l.key === body.id || String(l.variant_id) === String(body.id));
      if (line) line.quantity = Number(body.quantity);
      cartLines = cartLines.filter((l) => l.quantity > 0);
      return send(res, 200, JSON.stringify({ ...cartJSON(), sections: await sectionsFor(body.sections, body.sections_url) }), 'application/json');
    }
    if (p === '/cart/change') {
      const key = url.searchParams.get('id');
      cartLines = cartLines.filter((l) => l.key !== key);
      res.writeHead(302, { Location: '/cart' });
      return res.end();
    }
    if (p === '/cart' && req.method === 'POST') {
      const body = await readBody(req);
      if ('checkout' in body) {
        return send(
          res,
          200,
          `<!doctype html><meta charset="utf-8"><title>Checkout</title><body style="font-family:system-ui;padding:48px"><h1>Checkout</h1><p>On the live store this hands over to Shopify's secure checkout, with South African payment and delivery options configured in Shopify admin.</p><p><a href="/cart">Back to cart</a></p>`,
          'text/html; charset=utf-8'
        );
      }
      const updates = body['updates[]'] || [];
      updates.forEach((q, i) => cartLines[i] && (cartLines[i].quantity = Number(q)));
      cartLines = cartLines.filter((l) => l.quantity > 0);
      res.writeHead(302, { Location: '/cart' });
      return res.end();
    }

    // ---- recommendations (Section Rendering)
    if (p === '/recommendations/products') {
      const sectionId = url.searchParams.get('section_id');
      const productId = url.searchParams.get('product_id');
      const tpl = JSON.parse(await read('templates/product.json'));
      const key = Object.keys(tpl.sections).find((k) => `template--1__${k}` === sectionId);
      if (!key) return send(res, 404, '', 'text/html');
      const recs = products.filter((x) => String(x.id) !== String(productId)).slice(0, 4);
      const globals = buildGlobals(url, {
        page_type: 'product',
        objects: {
          product: products.find((x) => String(x.id) === String(productId)),
          recommendations: { performed: true, products: recs, products_count: recs.length },
        },
      });
      return send(res, 200, await renderSection(tpl.sections[key].type, tpl.sections[key], globals, sectionId), 'text/html');
    }

    // ---- text endpoints
    if (p === '/robots.txt') {
      const groups = [
        {
          user_agent: new RobotsLine('User-agent: *'),
          rules: [
            'Disallow: /admin',
            'Disallow: /cart',
            'Disallow: /orders',
            'Disallow: /checkouts/',
            'Disallow: /checkout',
            'Disallow: /account',
            'Disallow: /collections/*sort_by*',
            'Disallow: /collections/*+*',
            'Disallow: /collections/*%2B*',
            'Disallow: /collections/*filter*&*filter*',
            'Disallow: /blogs/*+*',
            'Disallow: /*/blogs/*%2B*',
            'Disallow: /policies/',
            'Disallow: /search',
            'Disallow: /*preview_theme_id*',
            'Disallow: /*preview_script_id*',
          ].map((r) => new RobotsLine(r)),
          sitemap: new RobotsLine(`Sitemap: ${ORIGIN}/sitemap.xml`),
        },
        { user_agent: new RobotsLine('User-agent: AhrefsBot'), rules: [new RobotsLine('Crawl-delay: 10')], sitemap: '' },
      ];
      const html = await engine.parseAndRender(prep(await read('templates/robots.txt.liquid')), {}, { globals: { robots: { default_groups: groups } } });
      return send(res, 200, html, 'text/plain; charset=utf-8');
    }
    if (['/agents.md', '/llms.txt', '/llms-full.txt'].includes(p)) {
      // Shopify renders agents.md.liquid with a restricted context: ONLY
      // `request` and `agents` exist (no shop, settings, collections, cart,
      // routes or metafields). The preview passes nothing else, so anything
      // that would be blank on Shopify is blank here too.
      const agents = {
        store_name: 'Vital Socks',
        store_url: ORIGIN,
        ucp_discovery_url: `${ORIGIN}/.well-known/ucp`,
        mcp_endpoint_url: `${ORIGIN}/api/mcp`,
        ucp_versions: ['2026-08-25'],
        currency: 'ZAR',
        sitemap_url: `${ORIGIN}/sitemap.xml`,
      };
      const request = { host: `localhost:${PORT}`, origin: ORIGIN, path: p, locale: { iso_code: 'en' }, design_mode: false };
      const out = await engine.parseAndRender(prep(await read('templates/agents.md.liquid')), {}, { globals: { request, agents } });
      return send(res, 200, out, 'text/markdown; charset=utf-8');
    }

    // ---- pages
    if (p === '/') {
      return renderPage(res, url, {
        template: 'index',
        title: 'Compression Socks South Africa | Vital Socks',
        description:
          'Everyday graduated compression socks, designed by an Orthotist & Prosthetist. Five knee-high prints, sized by your ankle. Delivered across South Africa.',
      });
    }
    let m;
    if ((m = p.match(/^\/products\/([\w-]+)$/))) {
      const product = productsByHandle[m[1]];
      if (!product) throw Object.assign(new Error('404'), { status: 404 });
      const variantId = url.searchParams.get('variant');
      const selected = product.variants.find((v) => String(v.id) === variantId) || product.variants[0];
      product.selected_or_first_available_variant = selected;
      product.options_with_values[0].selected_value = selected.option1;
      return renderPage(res, url, {
        template: 'product',
        title: product.title,
        description: product.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155),
        objects: { product },
      });
    }
    if ((m = p.match(/^\/collections\/([\w-]+)$/))) {
      const collection = collections[m[1]];
      if (!collection) throw Object.assign(new Error('404'), { status: 404 });
      return renderPage(res, url, {
        template: 'collection',
        title: collection.title,
        description: 'Graduated compression socks in bold prints.',
        objects: { collection: { ...collection, sort_by: url.searchParams.get('sort_by') } },
      });
    }
    if (p === '/collections') return renderPage(res, url, { template: 'list-collections', title: 'Collections' });
    if ((m = p.match(/^\/pages\/([\w-]+)$/))) {
      const page = pages[m[1]];
      if (!page) throw Object.assign(new Error('404'), { status: 404 });
      return renderPage(res, url, {
        template: 'page',
        suffix: page.template_suffix || null,
        title: page.title,
        objects: { page },
      });
    }
    if ((m = p.match(/^\/blogs\/([\w-]+)$/))) {
      const blog = blogs[m[1]];
      if (!blog) throw Object.assign(new Error('404'), { status: 404 });
      return renderPage(res, url, {
        template: 'blog',
        title: blog.seo?.title || blog.title,
        description: blog.seo?.description || '',
        objects: { blog },
      });
    }
    if ((m = p.match(/^\/blogs\/([\w-]+)\/([\w-]+)$/))) {
      const blog = blogs[m[1]];
      const article = blog?.articles.find((a) => a.handle === m[2]);
      if (!article) throw Object.assign(new Error('404'), { status: 404 });
      return renderPage(res, url, {
        template: 'article',
        title: article.title,
        description: String(article.excerpt_or_content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155),
        objects: { blog, article, page_image: article.image },
      });
    }
    if ((m = p.match(/^\/policies\/([\w-]+)$/))) {
      const policy = POLICIES.find((x) => x.handle === m[1]);
      if (!policy) throw Object.assign(new Error('404'), { status: 404 });
      const globals = buildGlobals(url, { page_type: 'policy', page_title: policy.title });
      const content = `<div class="page-hero container container--narrow"><h1 class="h1">${esc(policy.title)}</h1></div><div class="container container--narrow section--tight rte">${policy.body}</div>`;
      const html = await engine.parseAndRender(prep(await read('layout/theme.liquid')), {}, { globals: { ...globals, content_for_layout: content } });
      return send(res, 200, html, 'text/html; charset=utf-8');
    }
    if (p === '/cart') return renderPage(res, url, { template: 'cart', title: 'Your cart' });
    if (p === '/search') {
      const q = (url.searchParams.get('q') || '').trim();
      const results = q ? products.filter((x) => `${x.title} ${x.description}`.toLowerCase().includes(q.toLowerCase())) : [];
      return renderPage(res, url, {
        template: 'search',
        title: 'Search',
        objects: { search: { performed: Boolean(q), terms: q, results, results_count: results.length } },
      });
    }
    if (p === '/password') return renderPage(res, url, { template: 'password', title: 'Opening soon' });
    if (p === '/contact' && req.method === 'POST') {
      res.writeHead(302, { Location: '/pages/contact?contact_posted=true' });
      return res.end();
    }
    throw Object.assign(new Error('404'), { status: 404 });
  } catch (err) {
    if (err.status === 404) {
      try {
        return await renderPage(res, url, { template: '404', title: 'Page not found', status: 404 });
      } catch (inner) {
        err = inner;
      }
    }
    console.error(err);
    send(res, 500, `<pre>${esc(err.stack || err.message)}</pre>`, 'text/html; charset=utf-8');
  }
});

server.listen(PORT, () => {
  console.log(`Vital Socks theme preview: ${ORIGIN}`);
  console.log('Mock data only. Use `shopify theme dev` once the store exists.');
});
