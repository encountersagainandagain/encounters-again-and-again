// Backup of the real Encounters database before a migration: schema and data, secrets redacted from the output.
//   node scripts/production-backup.mjs      (run by hand, with Juani's OK; files land in the ignored .encounters-work/backups/)
import {mkdir,readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
import {REAL_REF,readEnvFile} from './cms-target.mjs';
await mkdir('.encounters-work/backups',{recursive:true});
if((await readFile('supabase/.temp/project-ref','utf8')).trim()!==REAL_REF)throw new Error('The linked project is not the real Encounters project.');
const e=await readEnvFile('.env.local');const env={...process.env,DO_NOT_TRACK:'1',SUPABASE_ACCESS_TOKEN:e.SUPABASE_ACCESS_TOKEN,SUPABASE_DB_PASSWORD:e.SUPABASE_DB_PASSWORD};
const stamp=`${new Date().toISOString().slice(0,10)}-${process.argv[2]||'backup'}`;
for(const [name,extra] of [['schema',[]],['data',['--data-only','--use-copy']]]){
  const file=`.encounters-work/backups/${stamp}-${name}.sql`;
  const r=spawnSync('npx',['--no-install','supabase','db','dump','--linked','-f',file,...extra],{encoding:'utf8',env});
  let out=`${r.stdout||''}${r.stderr||''}`;for(const v of Object.values(e))if(v&&v.length>6)out=out.replaceAll(v,'<secret>');
  console.log(`${name}: exit ${r.status}`,out.split('\n').filter(l=>l&&!/new version|recommend/i.test(l)).slice(-3).join(' | '));
  if(r.status)process.exit(r.status);
  const text=await readFile(file,'utf8');console.log(`  ${file}: ${(text.length/1024).toFixed(0)} KB, ${(text.match(/CREATE TABLE/g)||[]).length} tables, ${(text.match(/^COPY /gm)||[]).length} data blocks`);
}
