// Launch switch for search engines (docs/encounters/seo-plan.md A8). Until ENCOUNTERS_INDEXABLE=true is set for the
// Production deployment, robots.txt, the robots meta tag and the X-Robots-Tag header all keep the site out of search
// engines. Previews and local builds are never indexable. Admin, API and review stay out even after launch.
export const indexable=process.env.ENCOUNTERS_INDEXABLE==='true'&&process.env.VERCEL_ENV==='production';
