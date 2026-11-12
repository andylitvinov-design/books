import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('private story selection migration requires RLS and no public grants',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261103230000_hh_owner_dot_story_selection.sql',import.meta.url),'utf8');
 for(const required of ['app_private.telegram_owner_story_selection','force row level security',
   'revoke all','callback_session','revision','taxonomy_version','expires_at','job_id'])
   assert.ok(sql.includes(required),required);
 assert.ok(!/grant\s+select\s+on\s+app_private\.telegram_owner_story_selection\s+to\s+(anon|authenticated)/i.test(sql));
});
