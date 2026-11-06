import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261106170000_hh_crm_telegram_companion_home.sql',import.meta.url),'utf8');
const svc=readFileSync(new URL('../lib/crm/telegram-companion-service.js',import.meta.url),'utf8');
test('companion lives in private forced-RLS schema without public grants',()=>{
 assert.match(sql,/create table if not exists app_private\.crm_tg_companion_sessions/);
 assert.match(sql,/force row level security/);
 assert.match(sql,/from public,anon,authenticated/);
 assert.match(sql,/current_setting\('hh\.crm_companion',true\)='1'/);
 assert.doesNotMatch(sql,/security definer|grant .* to anon/i);
});
test('AI and daily consent remain independent of diagnostic consent',()=>{
 assert.match(svc,/pending_ai_at/);assert.match(svc,/daily_opt_in_at/);
 assert.match(svc,/daily_opt_out_at=now\(\)/);
 assert.match(svc,/return \{handled:false,reviewRequested:true/);
 assert.match(svc,/if\(stop\)/);
});
test('daily requires explicit consent and never replays uncertain send',()=>{
 assert.match(svc,/daily_opt_in_at is not null/);
 assert.match(svc,/last_daily_day is distinct from/);
 assert.match(svc,/last_daily_status='unknown'/);
 assert.match(svc,/for update skip locked/);
 assert.match(svc,/daily_opt_out_at>=s\.daily_opt_in_at/);
});

test('real Telegram private chat recipient check uses reviewed numeric-ID policy',()=>{
 const provider=readFileSync(new URL('../lib/crm/messenger-provider.js',import.meta.url),'utf8');
 assert.ok(provider.includes('if(!telegramHomeRecipientAllowed(to)'));
});
test('privacy opt-out bypasses daily reply limit without violating DB bound',()=>{
 assert.ok(svc.includes('companionReplyBudgetAllows(selected?.action,count,ALLOWED_REPLY,row.mode)'));
 assert.ok(svc.includes('Math.min(ALLOWED_REPLY,count+1)'));
});

test('check-in choice is ephemeral: no score persistence and stale callbacks cannot replay',()=>{
 const menu=readFileSync(new URL('../lib/crm/telegram-companion-menu.mjs',import.meta.url),'utf8');
 assert.match(menu,/checkin_\[1-5\]/);
 assert.match(svc,/if\(row\.mode==='checkin'\)/);
 assert.match(svc,/companionCheckinReply\(language,Number\(action\.slice\(-1\)\)\)/);
 assert.match(svc,/mode='menu'/);
 assert.doesNotMatch(svc,/insert into .*checkin|update .*checkin_score/i);
});
