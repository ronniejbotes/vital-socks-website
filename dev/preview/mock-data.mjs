/**
 * Mock store data for the local preview ONLY. Nothing here ships to Shopify.
 * Prices are placeholders. Sizes and the compression level mirror the
 * manufacturer's spec, but the real values live on the products in Shopify
 * admin (and the size chart in the theme editor), so this file must never be
 * treated as a source of truth. Fabric is blank here because the product
 * section's "Fabric text" setting is the single source for it.
 */
import { existsSync } from 'node:fs';

const IMAGE_DIR = new URL('../product-images/', import.meta.url);

export const MOCK_PRICE_CENTS = 39900; // placeholder only

const DESIGNS = [
  {
    handle: 'cherry-pop',
    title: 'Cherry Pop',
    persona: 'The trend',
    description:
      '<p>Red cherries on warm cream, with a red cuff, heel and toe.</p><p>Knee-high graduated compression: firmest at the ankle, lighter towards the knee.</p>',
  },
  {
    handle: 'espresso',
    title: 'Espresso',
    persona: 'The shift worker',
    description:
      '<p>Cream cups and beans on mocha, with a dark chocolate cuff, heel and toe. Made for nurses, hospitality and anyone on a double shift.</p><p>Knee-high graduated compression: firmest at the ankle, lighter towards the knee.</p>',
  },
  {
    handle: 'checker',
    title: 'Checker',
    persona: 'The young one',
    description:
      '<p>Black and cream checkerboard with a cream heel and toe.</p><p>Knee-high graduated compression: firmest at the ankle, lighter towards the knee.</p>',
  },
  {
    handle: 'daisy',
    title: 'Daisy',
    persona: 'The easy day',
    description:
      '<p>White daisies on soft lavender, with a deep purple cuff, heel and toe.</p><p>Knee-high graduated compression: firmest at the ankle, lighter towards the knee.</p>',
  },
  {
    handle: 'black',
    title: 'Black',
    persona: 'The everyday',
    description:
      '<p>Plain black with the white logo cuff. Under work trousers or over running calves.</p><p>Knee-high graduated compression: firmest at the ankle, lighter towards the knee.</p>',
  },
];

const SIZES = ['S', 'M', 'L'];

let nextId = 1000;
const id = () => ++nextId;

function media(src, alt, width, height) {
  const m = {
    id: id(),
    media_type: 'image',
    src,
    alt,
    width,
    height,
    aspect_ratio: width / height,
    presentation: { focal_point: '50% 50%' },
  };
  m.preview_image = m;
  return m;
}

export function buildProducts() {
  return DESIGNS.map((d) => {
    const mediaList = [
      media(`/dev-images/${d.handle}-01-cutout.png`, `${d.title} compression sock`, 640, 1600),
      media(`/dev-images/${d.handle}-02-lifestyle.jpg`, `${d.title} compression socks being worn`, 2752, 1536),
      media(`/dev-images/${d.handle}-03-studio.jpg`, `${d.title} compression sock, side view`, 1696, 2120),
    ];
    // Extra gallery photos (<handle>-04-lifestyle.jpg, -05-…), when they exist
    for (let n = 4; n <= 9; n++) {
      const file = `${d.handle}-0${n}-lifestyle.jpg`;
      if (!existsSync(new URL(file, IMAGE_DIR))) break;
      mediaList.push(media(`/dev-images/${file}`, `${d.title} knee-high compression socks being worn`, 2752, 1536));
    }
    const variants = SIZES.map((size) => ({
      id: id(),
      title: size,
      options: [size],
      option1: size,
      available: true,
      price: MOCK_PRICE_CENTS,
      compare_at_price: null,
      featured_media: null,
      sku: `VS-${d.handle.toUpperCase()}-${size}`,
    }));
    const product = {
      id: id(),
      handle: d.handle,
      title: d.title,
      url: `/products/${d.handle}`,
      description: d.description,
      content: d.description,
      vendor: 'Vital Socks',
      type: 'Compression socks',
      price: MOCK_PRICE_CENTS,
      price_min: MOCK_PRICE_CENTS,
      price_max: MOCK_PRICE_CENTS,
      price_varies: false,
      compare_at_price: null,
      compare_at_price_min: null,
      available: true,
      media: mediaList,
      images: mediaList,
      featured_media: mediaList[0],
      featured_image: mediaList[0],
      variants,
      options: ['Size'],
      has_only_default_variant: false,
      template_suffix: '',
      object_type: 'product',
      metafields: {
        custom: {
          persona: { value: d.persona },
          compression_level: { value: '18–21 mmHg' },
          fabric: { value: '' },
          care: { value: '' },
        },
      },
    };
    product.selected_or_first_available_variant = variants[0];
    product.options_with_values = [{ name: 'Size', position: 1, values: SIZES, selected_value: variants[0].option1 }];
    variants.forEach((v) => (v.product = product));
    return product;
  });
}

export const MENUS = {
  'main-menu': [
    ['Shop', '/collections/all'],
    ['Compression guide', '/pages/compression-guide'],
    ['Size guide', '/pages/size-guide'],
    ['About', '/pages/about'],
    ['FAQ', '/pages/faq'],
  ],
  footer: [
    ['Shop all', '/collections/all'],
    ['Cherry Pop', '/products/cherry-pop'],
    ['Espresso', '/products/espresso'],
    ['Checker', '/products/checker'],
    ['Daisy', '/products/daisy'],
    ['Black', '/products/black'],
  ],
  'footer-help': [
    ['Size guide', '/pages/size-guide'],
    ['Compression guide', '/pages/compression-guide'],
    ['FAQ', '/pages/faq'],
    ['Contact', '/pages/contact'],
    ['Shipping policy', '/policies/shipping-policy'],
    ['Refund policy', '/policies/refund-policy'],
  ],
};

export const PAGES = {
  about: { title: 'About', template_suffix: 'about', content: '' },
  contact: {
    title: 'Contact',
    template_suffix: 'contact',
    content: '<p><strong>MOCK page text for the local preview.</strong> Placeholder only: this shows where the page body sits above the form.</p>',
  },
  'compression-guide': {
    title: 'The compression guide',
    template_suffix: 'compression-guide',
    content:
      '<p><strong>MOCK page text for the local preview.</strong> Placeholder only: this shows where the page body sits under the title. Nothing here is advice.</p>',
  },
  'size-guide': { title: 'Size guide', template_suffix: 'size-guide', content: '' },
  faq: { title: 'FAQ', template_suffix: 'faq', content: '' },
};

/*
 * Mock blog. Every article is labelled MOCK and holds placeholder text only:
 * no health claims, no figures and no words attributed to anyone. Real guides
 * are written, checked and published in Shopify admin (blog handle `guides`).
 * The three articles cover the template's branches: all metafields set with a
 * later "last updated" date; metafields set with an unchanged date; none set.
 */
const MOCK_BODY = [
  '<p><strong>Mock article for the local preview.</strong> This placeholder text only shows how a guide is laid out. Real guides are written and approved in Shopify admin, and nothing here is advice.</p>',
  '<h2>A placeholder question heading</h2>',
  '<p>Placeholder paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>',
  '<h2>Another placeholder heading</h2>',
  '<p>Placeholder paragraph with a <a href="/pages/size-guide">link to the size guide</a>, to show how links look in a guide.</p>',
  '<ul><li>Placeholder list item one</li><li>Placeholder list item two</li><li>Placeholder list item three</li></ul>',
].join('');

const MOCK_ARTICLES = [
  {
    handle: 'mock-how-to-measure-your-ankle',
    title: 'MOCK: How to measure your ankle for your size',
    author: 'Farida Cajee-Botes',
    published_at: '2026-09-18T09:00:00+02:00',
    image: ['black-02-lifestyle.jpg', 'Black compression socks being worn'],
    custom: {
      last_updated: '2026-09-22',
      references: [
        { text: 'MOCK reference: placeholder source one', url: 'https://example.com/mock-reference-1' },
        { text: 'MOCK reference: placeholder source two', url: 'https://example.com/mock-reference-2' },
      ],
      takeaways: ['MOCK takeaway: placeholder point one', 'MOCK takeaway: placeholder point two', 'MOCK takeaway: placeholder point three'],
    },
  },
  {
    handle: 'mock-styling-a-printed-pair',
    title: 'MOCK: Styling a printed pair for work and weekends',
    author: 'Vital Socks',
    published_at: '2026-09-10T09:00:00+02:00',
    image: ['checker-02-lifestyle.jpg', 'Checker compression socks being worn'],
    custom: {
      last_updated: '2026-09-10',
      references: [{ text: 'MOCK reference: placeholder source', url: 'https://example.com/mock-reference-3' }],
      takeaways: ['MOCK takeaway: placeholder point one', 'MOCK takeaway: placeholder point two'],
    },
  },
  {
    handle: 'mock-choosing-a-design',
    title: 'MOCK: Choosing between the Vital Socks designs',
    author: 'Vital Socks',
    published_at: '2026-09-01T09:00:00+02:00',
    image: ['daisy-02-lifestyle.jpg', 'Daisy compression socks being worn'],
    custom: {},
  },
];

function buildArticle(blogHandle, a) {
  const [file, alt] = a.image;
  const image = { id: id(), src: `/dev-images/${file}`, alt, width: 2752, height: 1536, aspect_ratio: 2752 / 1536 };
  image.presentation = { focal_point: '50% 50%' };
  const excerpt = '<p>Mock excerpt: placeholder text for the local preview, not a real guide.</p>';
  const metafields = { custom: Object.fromEntries(Object.entries(a.custom).map(([k, v]) => [k, { value: v }])) };
  const [first, ...rest] = a.author.split(' ');
  return {
    id: id(),
    handle: a.handle,
    title: a.title,
    url: `/blogs/${blogHandle}/${a.handle}`,
    author: a.author,
    user: { name: a.author, first_name: first, last_name: rest.join(' '), bio: '', image: null },
    published_at: a.published_at,
    created_at: a.published_at,
    updated_at: a.published_at,
    excerpt,
    content: MOCK_BODY,
    excerpt_or_content: excerpt,
    image,
    tags: [],
    comments_count: 0,
    comments_enabled: false,
    template_suffix: null,
    metafields,
  };
}

function buildBlog(handle, title, articles, seo) {
  return {
    id: id(),
    handle,
    title,
    url: `/blogs/${handle}`,
    articles,
    articles_count: articles.length,
    tags: [],
    all_tags: [],
    comments_enabled: false,
    moderated: false,
    template_suffix: null,
    metafields: {},
    // Preview only: stands in for the blog's "Search engine listing" fields.
    seo,
  };
}

export function buildBlogs() {
  return [
    buildBlog(
      'guides',
      'Compression Socks Guides',
      MOCK_ARTICLES.map((a) => buildArticle('guides', a)),
      {
        title: 'Compression Socks Guides & Advice | Vital Socks',
        description:
          'Plain answers about compression socks for South Africans: flights, long shifts, sizing, summer wear and what the mmHg numbers mean.',
      }
    ),
    // Shopify creates an empty "News" blog in every store; it shows the empty state.
    buildBlog('news', 'News', [], null),
  ];
}

export const POLICIES = [
  ['Privacy policy', 'privacy-policy'],
  ['Refund policy', 'refund-policy'],
  ['Shipping policy', 'shipping-policy'],
  ['Terms of service', 'terms-of-service'],
].map(([title, handle]) => ({
  title,
  handle,
  url: `/policies/${handle}`,
  body: '<p>Policy text is managed in Shopify admin under Settings > Policies.</p>',
}));
