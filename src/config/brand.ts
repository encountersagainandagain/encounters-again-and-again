export const brand = {
  name: 'Encounters Again and Again',
  domain: 'encountersagainandagain.com',
  description: 'Art, ocean, education and conservation.',
  servicesAccount: 'encounters.services@outlook.com',
  logo: '/images/brand/encounters-logo.png',
} as const;

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || `https://${brand.domain}`).replace(/\/$/, '');
