const segment = (value: string) => {
  if (!value.trim() || value === '.' || value === '..' || /[/\\?#]/.test(value)) {
    throw new Error('Expected a nonempty route slug, not a path.');
  }
  return encodeURIComponent(value);
};

export const routes = {
  home: '/', about: '/about', contact: '/contact', crew: '/crew',
  expeditions: '/expeditions', workshops: '/workshops', art: '/art',
  messages: '/meaningful-messages', upcoming: '/upcoming', admin: '/admin',
  crewMember: (slug: string) => `/crew/${segment(slug)}`,
  expedition: (slug: string) => `/expeditions/${segment(slug)}`,
  workshop: (slug: string) => `/workshops/${segment(slug)}`,
  artCategory: (slug: string) => `/art/${segment(slug)}`,
  artwork: (category: string, slug: string) => `/art/${segment(category)}/${segment(slug)}`,
  message: (slug: string) => `/meaningful-messages#${segment(slug)}`,
  post: (slug: string) => `/posts/${segment(slug)}`,
  unsubscribe: (token: string) => `/unsubscribe/${segment(token)}`,
} as const;

export const publicNavigation = [
  { label: 'Expeditions', href: routes.expeditions },
  { label: 'Workshops', href: routes.workshops },
  { label: 'Meaningful Messages', href: routes.messages },
  { label: 'Art', href: routes.art },
  { label: 'About us', href: routes.about },
  { label: 'The crew', href: routes.crew },
  { label: 'Contact', href: routes.contact },
] as const;
