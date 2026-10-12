import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const compileUrl = text => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`;
const modulesUrl = compileUrl(await source('src/config/modules.ts'));
const policyUrl = compileUrl((await source('src/config/module-policy.ts')).replace("'./modules'", JSON.stringify(modulesUrl)));
const { isRouteEnabled, assertDataAccessEnabled } = await import(policyUrl);
const { moduleFetch } = await import(compileUrl((await source('src/lib/moduleFetch.ts')).replace("'@/config/module-policy'", JSON.stringify(policyUrl))));
const { isAllowedEncountersSupabaseTarget } = await import(compileUrl(await source('src/lib/encountersSupabaseTarget.ts')));
const blocked = ['/shop','/shop/item','/cart','/checkout','/support-us','/gallery','/gear','/destinations','/blog/post','/r/token','/admin/orders','/admin/products','/admin/providers','/admin/reviews','/admin/comments','/admin/gallery','/admin/gear','/admin/countries','/api/shop/checkout','/api/stripe/webhook','/api/admin/orders/x/refund','/api/admin/pod/variants','/api/cron/cleanup-pending-orders','/api/post-likes','/api/post-comments','/api/contact'];
for (const path of blocked) assert.equal(isRouteEnabled(path),false,path);
for (const path of ['/','/admin/posts','/admin/newsletter','/api/newsletter/subscribe','/crew','/art','/posts/new-slug']) assert.equal(isRouteEnabled(path),true,path);
assert.equal(isAllowedEncountersSupabaseTarget('https://lzwmwofxoegkxykglneq.supabase.co'),true);
assert.equal(isAllowedEncountersSupabaseTarget('https://another-project.supabase.co'),false);
assert.equal(isAllowedEncountersSupabaseTarget('http://127.0.0.1:54321'),false);
process.env.ENCOUNTERS_ALLOW_LOCAL_SUPABASE='true';
assert.equal(isAllowedEncountersSupabaseTarget('http://127.0.0.1:54321'),true);
assert.equal(isAllowedEncountersSupabaseTarget('http://localhost:54321'),true);
assert.equal(isAllowedEncountersSupabaseTarget('http://127.0.0.1:6543'),false);
delete process.env.ENCOUNTERS_ALLOW_LOCAL_SUPABASE;
const originalFetch = globalThis.fetch;
let outboundCalls = 0;
globalThis.fetch = async () => { outboundCalls++; return new Response('{}'); };
try {
  for (const table of ['ecommerce_products','shop_marketing_campaigns','shop_orders','gear_items','gallery_items','post_comments','post_likes']) {
    assert.throws(() => assertDataAccessEnabled(`https://encounters.invalid/rest/v1/${table}`));
    assert.throws(() => moduleFetch(`https://encounters.invalid/rest/v1/${table}`));
  }
  assert.equal(outboundCalls,0,'Disabled tables must never reach fetch');
  await moduleFetch('https://encounters.invalid/rest/v1/posts');
  assert.equal(outboundCalls,1);
} finally { globalThis.fetch = originalFetch; }
console.log('PASS: route policy and disabled data access rejected before any outbound request.');

if (process.env.TEST_BASE_URL) {
  const base = process.env.TEST_BASE_URL;
  assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/,'HTTP smoke tests are local-only');
  for (const path of blocked) {
    const result = await fetch(base+path, {method:path.startsWith('/api/')?'POST':'GET',redirect:'manual'});
    assert.equal(result.status,404,path);
  }
  for (const path of ['/','/about','/contact','/crew','/art','/workshops','/expeditions','/meaningful-messages','/admin/login','/manifest.webmanifest']) {
    const result=await fetch(base+path); assert.equal(result.status,200,path);
    const text=await result.text(); assert.doesNotMatch(text,/whatkatieseas|What Katie Seas|#katie|travelpayouts/i,path);
    assert.match(result.headers.get('x-robots-tag') || '',/noindex/);
  }
  for (const path of ['/posts/new-slug','/crew/missing','/art/books/missing']) assert.equal((await fetch(base+path)).status,404,path);
  const post = body => fetch(base+'/api/newsletter/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await post({email:'invalid'})).status,400);
  assert.equal((await post({email:'reader@example.invalid',consent:true,campaignId:'disabled'})).status,404);
  assert.equal((await post({email:'reader@example.invalid'})).status,400);
  assert.equal((await post({email:'reader@example.invalid',consent:true,website:'honeypot'})).status,200);
  const newsletterAdmin=await fetch(base+'/api/admin/newsletter/send',{method:'POST'});
  assert.equal(newsletterAdmin.status,503);
  assert.equal((await fetch(base+'/api/admin/revalidate',{method:'POST'})).status,401);
  const sitemap=await (await fetch(base+'/sitemap.xml')).text(); assert.doesNotMatch(sitemap,/whatkatieseas|\/expeditions|\/workshops|\/meaningful-messages/);
  assert.match(sitemap,/<loc>https?:\/\/[^<]+\/crew<\/loc>/);
  const robots=await (await fetch(base+'/robots.txt')).text(); assert.match(robots,/Disallow: \/\s/);
  console.log('PASS: 26 disabled HTTP paths, 10 own-brand pages, unpublished details, newsletter consent/campaign/honeypot checks, delivery disabled, unauthorized revalidation and SEO exclusion. No subscriptions created.');
}
