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
const url=sh('vercel',['deploy','--yes','--target=preview','--meta',`reviewCommit=${head}`]).split('\n').filter(l=>/^https:\/\//.test(l)).pop();
assert(url,'Vercel did not return a deployment URL.');
if(config.reviewUrl){sh('vercel',['alias','set',url,new URL(config.reviewUrl).host]);console.log(`Review: ${config.reviewUrl} → ${url}`);}
else console.log(`Deployment: ${url} (no stable reviewUrl configured yet)`);
console.log(`Commit: ${head}`);
