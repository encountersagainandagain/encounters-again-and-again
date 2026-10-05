import { spawnSync } from 'node:child_process';
import { assertTarget, projectRef, fail } from './encounters-context.mjs';

try {
  assertTarget();
  if (!process.env.SUPABASE_ACCESS_TOKEN || !process.env.SUPABASE_DB_PASSWORD) throw new Error('Set SUPABASE_ACCESS_TOKEN and SUPABASE_DB_PASSWORD in .env.local.');
  const action = process.argv[2];
  const commands = {
    link: ['link','--project-ref',projectRef],
    plan: ['db','push','--linked','--dry-run','--skip-vault'],
    apply: ['db','push','--linked','--skip-vault','--yes'],
    history: ['migration','list','--linked'],
  };
  if (!commands[action]) throw new Error('Use link, plan, apply or history');
  console.log(`Encounters CLI ${action}: verified project ${projectRef}`);
  const args=[...commands[action],...(process.argv.includes('--dns-https')?['--dns-resolver','https']:[])];
  const result = spawnSync('node_modules/.bin/supabase', args, { env: process.env, encoding: 'utf8', timeout: 180000 });
  let output = `${result.stdout || ''}${result.stderr || ''}`;
  for (const key of ['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY']) {
    if (process.env[key]) output = output.split(process.env[key]).join('[REDACTED]');
  }
  console.log(output);
  if (result.error) throw new Error('CLI failed to finish; check credentials/network locally');
  process.exitCode = result.status || 0;
} catch (error) { fail(error); }
