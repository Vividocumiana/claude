// Samuele Poggio — live at samuele.vivido.world (Vercel project "samuele-techweek-card").
// Everything here renders byte-for-byte the page that was hand-written before the
// per-person config existed: change it only to change Samuele's live card.

export default {
  id: 'samuele',
  name: 'Samuele Poggio',
  firstName: 'Samuele',
  lastName: 'Poggio',

  // Page
  title: 'Samuele Poggio · Vivido',
  description: 'Co-founder of Vivido, founder of Nest. I build systems that run without you.',
  ogDescription: 'I build systems that run without you.',
  noindex: false,
  role: 'Founder · Vivido, Nest, Nitido',
  bio: 'I build systems that run without you.',
  photo: '/samuele.jpg', // 600×600, used by /me, /qr
  photoLg: '/samuele-lg.jpg', // 800×800, card hero, OG image, email
  pills: [
    { label: 'Tech Week 2026', img: '/favicon.svg' },
    { label: 'Based in Lisbon', icon: 'pin' },
  ],
  companies: [
    { name: 'Vivido', role: 'Co-founder', line: 'Product design for founders', href: 'https://vivido.world', logo: '/favicon.svg', logoClass: 'vivido', emailLogo: 'vivido.png' },
    // href is set by scriptExtra below (NEST_URL), as on the original page
    { name: 'Nest', role: 'Founder', line: 'Operations for agencies, without hiring', id: 'nest', href: '#', logo: '/logos/nest.svg', emailLogo: 'nest.png', emailHref: 'https://www.usanest.it/' },
    { name: 'Nitido', role: 'Co-founder', line: 'Pitch-ready websites for funded startups', href: 'https://nitido.design', logo: '/logos/nitido.png', emailLogo: 'nitido.png' },
  ],
  sign: { logo: '/favicon.svg', title: 'Vivido', line: 'Product design for founders' },
  themeColor: null, // null = light/dark pair of the original page
  themeCss: '',
  consentFrom: 'Samuele / Vivido',
  scriptConfig: "  const NEST_URL = 'https://www.usanest.it/';",
  scriptExtra: [
    "  const nest = document.getElementById('nest');",
    '  if (NEST_URL) nest.href = NEST_URL;',
    "  else { nest.removeAttribute('href'); nest.querySelector('.go').remove(); }",
  ].join('\n'),

  // Contact
  bookingUrl: 'https://cal.com/vivido-wdkm3m/general-vivido?overlayCalendar=true',
  linkedin: 'https://www.linkedin.com/in/samuele-poggio-48b9a0219/',
  whatsapp: 'https://wa.me/393335839398',
  email: 'samuele@vivido.world',
  phone: '+393335839398',

  // vCard: hand-made file in people/samuele/public (not generated)
  vcf: { path: '/samuele.vcf', filename: 'Samuele Poggio.vcf' },
  qr: { org: 'Vivido', title: 'Co-founder' },
  contactsLabel: 'Tech Week contacts',

  // "Nice to meet you" email
  mail: {
    usesEvent: true, // subject/headline say "at <EVENT_NAME>"
    attachVcard: false,
    preheader: 'If what we talked about is worth 20 minutes, grab a slot.',
    // intro is inserted as HTML
    intro: "I'm Samuele: I run operations at Vivido and build Nest on the side. If what we talked about is worth 20 minutes, grab a slot below.",
    text: ({ event, booking }) => [
      `I'm Samuele: I run operations at Vivido and build Nest on the side.`,
      `If what we talked about at ${event} is worth 20 minutes, grab a slot here: ${booking}`,
      '',
      'Vivido helps founders validate ideas fast, without wasting budget or time.',
      'Product design, websites and prototypes for startups and scale-ups.',
    ],
    textLinks: [
      ['LinkedIn', 'https://www.linkedin.com/in/samuele-poggio-48b9a0219/'],
      ['Vivido', 'https://vivido.world'],
    ],
    site: { href: 'https://vivido.world', label: 'vivido.world' },
  },
};
