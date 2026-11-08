// No imports: scripts/check-legacy-wordpress.mjs runs this file on its own.
// The addresses of the WordPress site that encountersagainandagain.com served until the move to this project
// (docs/encounters/migracion-dominio.md). Pages that have a new home go there for good (308); pages of WordPress itself
// that do not come back answer 410 Gone, so search engines drop them quickly. Older addresses already recorded in
// route_history (works, Crew, messages) keep resolving there.
const moved:Record<string,string>={
  '/elementor-3062':'/expeditions',
  '/elementor-page-3107':'/workshops',
  '/contact-3':'/contact',
  '/form':'/contact',
  '/form/simple-contact-form':'/contact',
  '/category/you-never-know-what-encounter-could-change-your-life':'/meaningful-messages',
  '/services-3':'/',
  // The shop of WordPress has no equivalent: the works of Art are the closest thing.
  '/shop':'/art','/cart':'/art','/checkout':'/art','/customer-dashboard':'/art','/my-account':'/art',
};
const gone=/^\/(wp-content|wp-includes|wp-json|wp-admin)(\/|$)|^\/(wp-login|xmlrpc|wp-cron|wp-signup)\.php$|(^|\/)feed\/?$|^\/comments\/feed\/?$/;
export function legacyWordPress(pathname:string):{status:308;location:string}|{status:410}|null{
  const path=pathname.toLowerCase().replace(/\/+$/,'')||'/';
  if(moved[path])return {status:308,location:moved[path]};
  if(gone.test(pathname.toLowerCase()))return {status:410};
  return null;
}
