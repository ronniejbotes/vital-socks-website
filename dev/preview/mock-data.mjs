/**
 * Mock store data for the local preview ONLY. Nothing here ships to Shopify.
 * Prices, sizes and compression figures are placeholders: the real values
 * live on the products in Shopify admin (and the size chart in the theme
 * editor), so this file must never be treated as a source of truth.
 */
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

const SIZES = ['S', 'M', 'L', 'XL']; // placeholder sizes

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
          compression_level: { value: 'mmHg TBC' },
          fabric: { value: 'Fabric composition to be confirmed.' },
          care: { value: 'Care instructions to be confirmed.' },
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
  contact: { title: 'Contact', template_suffix: 'contact', content: '<p>Page text is written in Shopify admin under Online Store > Pages.</p>' },
  'compression-guide': {
    title: 'The compression guide',
    template_suffix: 'compression-guide',
    content:
      '<p>This page\'s long-form guide is written in Shopify admin under Online Store > Pages, ideally by Farida, so it carries her clinical authority.</p>',
  },
  'size-guide': { title: 'Size guide', template_suffix: 'size-guide', content: '' },
  faq: { title: 'FAQ', template_suffix: 'faq', content: '' },
};

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
