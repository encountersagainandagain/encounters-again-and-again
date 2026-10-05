import { client, fail } from './encounters-context.mjs';

try {
  const emails = [...new Set((process.env.ADMIN_EMAILS || '').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean))];
  if (!emails.length) throw new Error('Configure server-only ADMIN_EMAILS in .env.local.');
  const admin = client(true);
  const users = [];
  for (let page=1; ; page++) {
    const {data,error} = await admin.auth.admin.listUsers({page,perPage:100});
    if (error) throw new Error('Cannot list Auth users');
    users.push(...data.users);
    if (data.users.length<100) break;
  }
  const matches = emails.map(email=>users.find(u=>u.email?.toLowerCase()===email && u.email_confirmed_at));
  if (matches.some(u=>!u)) throw new Error('At least one configured admin is absent or email unconfirmed. No users changed.');
  if (process.argv.includes('--apply')) {
    const {error} = await admin.from('admin_users').upsert(matches.map(u=>({user_id:u.id})),{onConflict:'user_id',ignoreDuplicates:true});
    if (error) throw new Error(`Admin registration failed (${error.code})`);
  }
  console.log(JSON.stringify({matched_confirmed_accounts:matches.length,registered:process.argv.includes('--apply'),emails_logged:false,invitations_sent:false}));
} catch(error) {fail(error);}
