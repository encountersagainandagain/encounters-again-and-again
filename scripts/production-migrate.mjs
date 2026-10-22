// Versioned migrations on the real Encounters project (production), run by hand, never on build.
//   node scripts/production-migrate.mjs            list and dry run
//   node scripts/production-migrate.mjs --apply    apply the pending ones in order (back up first: supabase db dump)
// Uses the token and database password of .env.local; the project is the linked one and must be the real ref.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {REAL_REF,readEnvFile} from './cms-target.mjs';

const apply=process.argv.includes('--apply');
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),REAL_REF,'The linked Supabase project is not the real Encounters project.');
const e=await readEnvFile('.env.local');
assert(e.SUPABASE_ACCESS_TOKEN&&e.SUPABASE_DB_PASSWORD,'.env.local needs SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD.');
const env={...process.env,DO_NOT_TRACK:'1',SUPABASE_ACCESS_TOKEN:e.SUPABASE_ACCESS_TOKEN,SUPABASE_DB_PASSWORD:e.SUPABASE_DB_PASSWORD};
const run=args=>{const r=spawnSync('npx',['--no-install','supabase',...args],{encoding:'utf8',env});
  let out=`${r.stdout||''}${r.stderr||''}`;for(const v of Object.values(e))if(v&&v.length>6)out=out.replaceAll(v,'<secret>');
  console.log(`== supabase ${args.join(' ')}\n${out.split('\n').filter(l=>l&&!/new version|recommend/i.test(l)).join('\n')}`);if(r.status)process.exit(r.status);};
run(['db','push','--linked',...(apply?['--yes']:['--dry-run'])]);
if(apply)run(['migration','list','--linked']);else console.log('Dry run. Apply with: node scripts/production-migrate.mjs --apply');
