import { modules, type ModuleName } from './modules';
const routeModules: [string, ModuleName][] = [
  ['/shop','commerce'], ['/cart','commerce'], ['/checkout','commerce'],
  ['/api/shop','commerce'], ['/api/stripe/shop-webhook','commerce'],
  ['/api/stripe','donations'], ['/support-us','donations'], ['/api/create-checkout-session','donations'],
  ['/api/cron','commerce'], ['/r','reviews'],
  ['/admin/products','commerce'], ['/admin/orders','commerce'], ['/admin/collections','commerce'], ['/admin/shop-disputes','commerce'],
  ['/api/admin/products','commerce'], ['/api/admin/orders','commerce'],
  ['/admin/providers','providers'], ['/api/admin/pod','providers'],
  ['/admin/reviews','reviews'], ['/api/admin/reviews','reviews'],
  ['/gallery','gallery'], ['/admin/gallery','gallery'],
  ['/gear','affiliates'], ['/admin/gear','affiliates'], ['/affiliate-disclosure','affiliates'],
  ['/destinations','destinations'], ['/admin/countries','destinations'],
  ['/admin/comments','engagement'], ['/api/post-comments','engagement'], ['/api/post-likes','engagement'],
  ['/api/contact','contactForm'],
  ['/api/newsletter','newsletter'], ['/api/admin/newsletter','newsletter'], ['/admin/newsletter','newsletter'], ['/unsubscribe','newsletter'],
  ['/admin','cms'], ['/api/admin','cms'],
  ['/crew','crew'], ['/art','art'], ['/expeditions','expeditions'], ['/workshops','workshops'],
  ['/meaningful-messages','messages'], ['/posts','stories'], ['/upcoming','upcoming'], ['/contact','contact'],
];
export function isRouteEnabled(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (['/blog','/category','/videos'].some(prefix => path === prefix || path.startsWith(prefix + '/'))) return false;
  const match = routeModules.find(([prefix]) => path === prefix || path.startsWith(prefix + '/'));
  return match ? modules[match[1]] : true;
}
const tableModules: [RegExp, ModuleName][] = [
  [/^(posts|post_blocks|site_settings)$/, 'cms'], [/^newsletter_subscribers$/, 'newsletter'],
  [/^(ecommerce_|shop_|orders$|order_|products$|product_|promotion_)/, 'commerce'],
  [/^(gear_|affiliate_)/, 'affiliates'], [/^gallery_/, 'gallery'],
  [/^(post_comments|post_likes)/, 'engagement'], [/^(qr_|review_)/, 'reviews'],
];
export function assertDataAccessEnabled(url: string): void {
  const path = new URL(url).pathname;
  if (path.startsWith('/storage/v1/') && !modules.media) throw new Error('Media is disabled.');
  if (path.includes('/rpc/') && /newsletter/.test(path) && !modules.newsletter) throw new Error('Newsletter is disabled.');
  const table = path.split('/rest/v1/')[1]?.split('/')[0];
  const match = table && tableModules.find(([pattern]) => pattern.test(table));
  if (match && !modules[match[1]]) throw new Error(`Data access disabled for module ${match[1]}.`);
}
