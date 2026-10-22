// Publishes the online review: a Vercel Preview deployment of the encounters-review project, built from the pushed
// `review` branch, then points the stable review alias (src/config/staging.json reviewUrl) at it.
//   npm run review:deploy            checks only (branch, clean tree, pushed, linked project), then deploys
// Never --prod, no custom domain, no migrations or seeds (those are npm run staging -- …, by hand).
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

const sh=(cmd,args,opts={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...opts});if(r.status!==0)throw new Error(`${cmd} ${args[0]}: ${(r.stderr||r.stdout).trim().split('\n').slice(-5).join('\n')}`);return r.stdout.trim();};
const config=JSON.parse(await readFile('src/config/staging.json','utf8'));
assert.equal(sh('git',['branch','--show-current']),'review','Deploy the review from the review branch.');
assert.equal(sh('git',['status','--porcelain']),'','Commit or stash local changes first: the deployment must match a commit.');
sh('git',['fetch','-q','origin','review']);
const head=sh('git',['rev-parse','HEAD']);assert.equal(sh('git',['rev-parse','origin/review']),head,'Push the review branch first (git push origin review).');
const linked=JSON.parse(await readFile('.vercel/project.json','utf8').catch(()=>'{}'));
const inspect=spawnSync('vercel',['project','inspect',config.vercelProject],{encoding:'utf8'});
assert(linked.projectId&&`${inspect.stdout}${inspect.stderr}`.includes(linked.projectId),`Link this folder to ${config.vercelProject} first (vercel link --project ${config.vercelProject}).`);
console.log(`Deploying ${head.slice(0,7)} (review) to a Preview of ${config.vercelProject}…`);
const out=sh('vercel',['deploy','--yes','--target=preview','--non-interactive','--meta',`reviewCommit=${head}`]);
const url=(out.match(new RegExp(`https://${config.vercelProject}-[a-z0-9]{9}-[a-z0-9-]+\\.vercel\\.app`))||[])[0];
assert(url,'Vercel did not return a deployment URL.');
// Only aliases under the team scope (…-<team>.vercel.app) are covered by Vercel Authentication; a free-form
// *.vercel.app alias or the project's default domain would be public. The alias is checked and removed if open.
const protectedStatus=async u=>(await fetch(u,{redirect:'manual'})).status;
if(config.reviewUrl){
  const host=new URL(config.reviewUrl).host;sh('vercel',['alias','set',url,host,'--non-interactive']);
  const status=await protectedStatus(config.reviewUrl);
  if(![301,302,307,308,401,403].includes(status)){sh('vercel',['alias','rm',host,'--yes','--non-interactive']);throw new Error(`${host} answered ${status} without login: alias removed.`);}
  console.log(`Review: ${config.reviewUrl} → ${url} (asks for Vercel login: ${status})`);
}else console.log(`Deployment: ${url} (no stable reviewUrl configured yet)`);
console.log(`Commit: ${head}`);
