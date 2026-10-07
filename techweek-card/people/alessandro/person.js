// Alessandro Martinengo — staging at alessandrostaging.vivido.world.
// Build/run with CARD=alessandro (Vercel env var on Alessandro's project).

export default {
  id: 'alessandro',
  name: 'Alessandro Martinengo',
  firstName: 'Alessandro',
  lastName: 'Martinengo',

  // Page
  title: 'Alessandro Martinengo · SalesMagic',
  description: 'Founder of SalesMagic. I build B2B sales systems that multiply results, not the team.',
  ogDescription: 'Founder of SalesMagic. I build B2B sales systems that multiply results, not the team.',
  noindex: true, // staging: robots meta + robots.txt
  role: 'Founder · SalesMagic',
  bio: 'I build B2B sales systems that multiply results, not the team.',
  photo: '/alessandro.jpg', // 600×600, used by /me, /qr
  photoLg: '/alessandro-lg.jpg', // 800×800, card hero, OG image, email
  pills: [
    // TODO(logo): logos/salesmagic.svg|png and favicon.svg are redrawn from a screenshot; swap in the official files.
    { label: 'SalesMagic', img: '/logos/salesmagic.svg', href: 'https://www.salesmagic.tech/' },
    { label: 'Based in Milan', icon: 'pin' },
  ],
  companies: [
    { name: 'SalesMagic', role: 'Founder', line: 'B2B sales systems and outbound campaigns that multiply results', href: 'https://www.salesmagic.tech/', logo: '/logos/salesmagic.png', emailLogo: 'salesmagic.png' },
    // No official URL found for We Are Founders: shown without a link. TODO(logo): placeholder "WF" mark.
    { name: 'We Are Founders', role: 'Startup Mentor', line: 'Free mentoring for founders, from people who have done it before', logo: '/logos/wearefounders.png', emailLogo: 'wearefounders.png' },
  ],
  sign: { logo: '/logos/salesmagic.svg', title: 'SalesMagic', line: 'Feels like magic ✦' },
  themeColor: '#0B0B0C',
  themeCss: `
  :root { color-scheme: dark; }
  /* SalesMagic look (salesmagic.tech): violet night, purple glow, violet CTAs. Always dark. */
  :root {
    --bg: #0C0613; --ink: #F3F0FA; --ink-muted: #A49BB8; --pill-line: rgba(255,255,255,.12);
    --bezel: #1B1129; --panel: #140C1F; --panel-line: #2A2039; --on-panel: #F4F1FA; --on-panel-muted: #A69CB9; --tile: #231834;
    --purple: #7B61FF; --violet-glow: rgba(123,97,255,.55);
  }
  body { background: #0C0613 radial-gradient(130% 70% at 50% -10%, #3F1C86 0%, #1C0D38 38%, #0C0613 72%) no-repeat; }
  .pill { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.1); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
  .card { box-shadow: 0 0 0 1px rgba(170,140,255,.14), 0 30px 90px -24px var(--violet-glow), 0 12px 24px -12px rgba(0,0,0,.6); }
  .cta.primary, .send { background: var(--purple); color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.22), 0 10px 30px -8px var(--violet-glow); }
  .cta.secondary, .social { box-shadow: inset 0 0 0 1px rgba(255,255,255,.07); }
  .section-head { font-family: var(--mono); }
  .sheet { background: rgba(26,16,42,.82); border-color: rgba(170,140,255,.16); }
  .done .tick { background: var(--purple); color: #fff; }
  .sign img { width: 26px; height: 26px; filter: drop-shadow(0 0 8px var(--violet-glow)); }`,
  consentFrom: 'Alessandro / SalesMagic',
  scriptConfig: '',
  scriptExtra: '',

  // Contact
  bookingUrl: 'https://cal.com/jessica-pretti-k562b0/30min',
  linkedin: 'https://www.linkedin.com/in/alessandromartinengov/',
  whatsapp: 'https://wa.me/393931528763',
  email: 'alessandro@salesmagic.tech',
  phone: '+393931528763',

  // vCard: generated at build time into /alessandro.vcf (photo embedded like Samuele's)
  vcf: {
    path: '/alessandro.vcf',
    filename: 'Alessandro Martinengo.vcf',
    generate: {
      org: 'SalesMagic',
      title: 'Founder',
      urls: ['https://www.salesmagic.tech/', 'https://www.linkedin.com/in/alessandromartinengov/'],
      city: 'Milan',
      country: 'Italy',
      note: 'Founder of SalesMagic · Startup Mentor at We Are Founders.',
      photo: 'vcard-photo.jpg', // 240×240, like the photo inside samuele.vcf
    },
  },
  qr: { org: 'SalesMagic', title: 'Founder' },
  contactsLabel: 'Contacts',

  // "Nice to meet you" email
  mail: {
    usesEvent: false, // no event name anywhere
    attachVcard: true,
    button: { bg: '#7B61FF', color: '#FFFFFF' }, // SalesMagic violet
    preheader: 'If what we talked about is worth a call, grab a slot.',
    // intro is inserted as HTML
    intro: "I'm Alessandro, founder of SalesMagic: I build B2B sales systems that multiply results, not the team. If what we talked about is worth a call, grab a slot below. My contact card is attached.",
    text: ({ booking }) => [
      `I'm Alessandro, founder of SalesMagic: I build B2B sales systems that multiply results, not the team.`,
      `If what we talked about is worth a call, grab a slot here: ${booking}`,
      '',
      'SalesMagic builds B2B sales systems and outbound campaigns that multiply results.',
      'My contact card is attached to this email.',
    ],
    textLinks: [
      ['LinkedIn', 'https://www.linkedin.com/in/alessandromartinengov/'],
      ['SalesMagic', 'https://www.salesmagic.tech/'],
    ],
    site: { href: 'https://www.salesmagic.tech/', label: 'salesmagic.tech' },
  },
};
