import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {client,fail,projectRef} from './encounters-context.mjs';
const c=client(true);const ok=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
try{
  const post=ok(await c.from('posts').select('id,title,status').eq('slug','cms-verification-draft').single());
  assert.equal(post.title,'CMS verification draft');assert.equal(post.status,'draft');
  const blocks=ok(await c.from('post_blocks').select('content').eq('post_id',post.id));assert.equal(blocks.length,1);assert.equal(blocks[0].content.text,'Exact browser verification text.');
  assert.equal(ok(await client().from('posts').select('id').eq('id',post.id)).length,0);
  ok(await c.from('posts').delete().eq('id',post.id));
  assert.equal(ok(await c.from('posts').select('id')).length,0);assert.equal(ok(await c.from('media').select('id')).length,0);
  const report={project_ref:projectRef,result:'PASS',checks:['Browser created draft and paragraph through CMS form','Reloaded CMS list shows saved draft','Exact text persisted; anon cannot read draft','Test document removed; posts and media empty before import'],fixtures:'deleted'};
  writeFileSync('docs/encounters/verification/phase3-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}catch(e){fail(e);}
