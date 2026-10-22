import assert from 'node:assert/strict';
import {writeFileSync,mkdtempSync,readFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {client,assertTarget,projectRef,fail} from './encounters-context.mjs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3215';
assert.match(base,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/,'Verification is local-only');
const ok=r=>{if(r.error)throw Error(r.error.message);return r.data;};
assertTarget();
try{
  if(process.argv[2]==='--close'){
    const path=process.argv[3];if(!/^\/private\/tmp\/encounters-phase4-[^/]+\/state.json$/.test(path)&&!path?.startsWith(join(tmpdir(),'encounters-phase4-')))throw Error('Unexpected temporary state path');
    const state=JSON.parse(readFileSync(path,'utf8'));const session=JSON.parse(state.origins[0].localStorage[0].value);
    const refreshed=await client().auth.refreshSession({refresh_token:session.refresh_token});
    if(refreshed.data.session)ok(await client(true).auth.admin.signOut(refreshed.data.session.access_token,'local'));
    else if(!['refresh_token_not_found','refresh_token_already_used','session_not_found'].includes(refreshed.error?.code))throw Error('Could not revoke temporary session; state retained for cleanup.');
    unlinkSync(path);rmdirSync(join(path,'..'));console.log('Temporary admin session revoked or already inactive; state file removed.');
  }else{
    const checks=[];const admin=client(true),anon=client();
    const posts=ok(await admin.from('posts').select('id,slug,kind,status'));assert.equal(posts.length,12);assert.equal(posts.filter(p=>p.status==='draft').length,4);
    const crew=ok(await anon.from('crew_members').select('id,slug,has_page'));assert.equal(crew.length,6);
    assert.equal(ok(await anon.from('art_categories').select('id')).length,0);assert.equal(ok(await anon.from('artworks').select('id')).length,0);
    const draftIds=posts.filter(p=>p.status==='draft').map(p=>p.id);assert.equal(ok(await anon.from('posts').select('id').in('id',draftIds)).length,0);assert.equal(ok(await anon.from('post_blocks').select('id').in('post_id',draftIds)).length,0);
    checks.push('Imported counts unchanged; four drafts and their blocks hidden anonymously');
    const responses=[];
    for(const path of ['/art','/crew','/crew/wild-wonders','/crew/julian-lange','/art/nonexistent','/art/nonexistent/nonexistent','/elementor-page-3462','/elementor-2907','/elementor-3062']){
      const r=await fetch(base+path,{redirect:'manual'});const html=await r.text();responses.push({path,status:r.status,location:r.headers.get('location')});
      if(['/art','/crew','/crew/wild-wonders'].includes(path)){assert.equal(r.status,200);assert.ok(html.includes('rel="canonical"'));assert.ok(html.includes('og:title'));assert.ok(!html.includes('temporarily unavailable'));}
      else if(['/elementor-page-3462','/elementor-2907'].includes(path))assert.equal(r.status,308);else assert.equal(r.status,404);
    }
    const sitemap=await (await fetch(base+'/sitemap.xml')).text();assert.ok(sitemap.includes('/crew/wild-wonders'));assert.ok(!sitemap.includes('/crew/julian-lange'));assert.ok(!sitemap.includes('/expeditions'));checks.push('Completed routes, canonical/OG, published-only sitemap and only ready legacy redirects');
    const media=ok(await anon.from('media').select('id').limit(1))[0];const image=await fetch(base+`/api/media/${media.id}`);assert.equal(image.status,200);assert.match(image.headers.get('cache-control'),/^public, max-age=600, s-maxage=600$/);assert.match(image.headers.get('content-type'),/^image\//);checks.push('Anonymous published image uses stable endpoint, cached 10 minutes');
    assert.equal((await fetch(base+'/api/admin/revalidate',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"scope":"posts"}'})).status,401);
    const email=(process.env.ADMIN_EMAILS||'').split(',')[0].trim();
    const link=ok(await admin.auth.admin.generateLink({type:'magiclink',email}));
    const signed=ok(await anon.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token}));assert.ok(signed.session);
    const authed=client(false,signed.session.access_token);assert.equal(ok(await authed.rpc('is_admin')),true);assert.equal(ok(await authed.from('posts').select('id').in('id',draftIds)).length,4);
    checks.push('Existing admin session reads drafts; anonymous revalidation is denied; no email sent');
    if(process.argv.includes('--browser-state')){const dir=mkdtempSync(join(tmpdir(),'encounters-phase4-'));const path=join(dir,'state.json');writeFileSync(path,JSON.stringify({cookies:[],origins:[{origin:base,localStorage:[{name:'encounters-auth',value:JSON.stringify(signed.session)}]}]}),{mode:0o600});console.log('Temporary browser state:',path);}else ok(await admin.auth.admin.signOut(signed.session.access_token,'local'));
    const report={project_ref:projectRef,result:'PASS',checks,responses,committed_fixtures:0,emails_sent:0};writeFileSync('docs/encounters/verification/phase4-http.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }
}catch(error){fail(error);}
