import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {createDaybookJournalRepository} from '../lib/app/daybook-journal.js'
import {closeDatabase} from '../lib/app/database.js'

// Dedicated disposable database only. Never accept a production URL or environment.
const url=process.env.HH_DAYBOOK_TEST_DATABASE_URL
if(!url||process.env.VERCEL||process.env.HH_APP_TEST_RUNTIME!=='isolated')throw new Error('ISOLATED_DAYBOOK_DATABASE_REQUIRED')
const parsed=new URL(url)
if(parsed.hostname!=='127.0.0.1'||parsed.pathname!=='/hh_daybook_runtime_test')throw new Error('ISOLATED_DAYBOOK_DATABASE_REQUIRED')
const admin=new pg.Client({connectionString:url})
const config={test:true,databaseUrl:url,encryptionKey:Buffer.alloc(32,9),encryptionKeyId:'journal-test'}
const repo=createDaybookJournalRepository(config)
const a={id:randomUUID(),claims:{}},b={id:randomUUID(),claims:{}}
for(const actor of [a,b])actor.claims={sub:actor.id,session_id:randomUUID()}
const entry=(extra={})=>({id:randomUUID(),operationId:randomUUID(),revision:0,text:'Synthetic private entry',tags:['test'],kind:'note',locale:'en',timezone:'America/Toronto',localDay:'2026-11-22',goalId:null,...extra})
before(async()=>{
 await admin.connect()
 await admin.query(`create schema app; create schema app_private; create schema auth;
  create table app.accounts(id uuid primary key,status text,onboarding_state text);
  create table auth.sessions(id uuid primary key,user_id uuid);
  create table app_private.coaching_goals(id uuid primary key,account_id uuid,status text);
  create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;
  create function app_private.account_active() returns boolean language sql stable as $$select exists(select 1 from app.accounts where id=auth.uid() and status='active' and onboarding_state='active')$$;
  create function app_private.session_active() returns boolean language sql stable as $$select exists(select 1 from auth.sessions where id=(current_setting('request.jwt.claims',true)::jsonb->>'session_id')::uuid and user_id=auth.uid())$$;
  grant usage on schema app,app_private,auth to hh_app_backend;
  grant select on app.accounts,auth.sessions,app_private.coaching_goals to hh_app_backend;
  grant update on app.accounts to hh_app_backend;`)
 await admin.query(await readFile(new URL('../supabase/migrations/20261122210000_hh_daybook_journal.sql',import.meta.url),'utf8'))
 for(const actor of [a,b]){
  await admin.query("insert into app.accounts values($1,'active','active')",[actor.id])
  await admin.query('insert into auth.sessions values($1,$2)',[actor.claims.session_id,actor.id])
 }
})
after(async()=>{await closeDatabase();await admin.end()})
test('actual transaction saves encrypted content, reads it back and replays a committed retry',async()=>{
 const input=entry(),saved=await repo.save(a,input)
 assert.equal(saved.entry.text,input.text)
 assert.equal(saved.entry.revision,1)
 assert.deepEqual((await repo.read(a,input.id)).entry,saved.entry)
 assert.equal((await repo.save(a,input)).replayed,true)
 const raw=(await admin.query('select payload_ciphertext from app_private.daybook_entries where id=$1',[input.id])).rows[0]
 assert.equal(raw.payload_ciphertext.includes(input.text),false)
 await assert.rejects(repo.save(a,{...input,text:'changed retry'}),{code:'JOURNAL_IDEMPOTENCY_CONFLICT'})
})
test('parallel stale edits have exactly one winner and old retry cannot claim the newer revision',async()=>{
 const input=entry();await repo.save(a,input)
 const result=await Promise.allSettled([1,2].map(n=>repo.save(a,{...input,revision:1,operationId:randomUUID(),text:'edit '+n})))
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1)
 assert.equal(result.find(r=>r.status==='rejected').reason.code,'JOURNAL_REVISION_CONFLICT')
 assert.equal((await repo.read(a,input.id)).entry.revision,2)
 await assert.rejects(repo.save(a,input),{code:'JOURNAL_REVISION_ADVANCED'})
})
test('two accounts cannot read, edit, delete or attach the other account goal',async()=>{
 const input=entry();await repo.save(a,input)
 await assert.rejects(repo.read(b,input.id),{code:'NOT_FOUND'})
 assert.equal((await repo.list(b)).entries.length,0)
 await assert.rejects(repo.save(b,{...input,revision:1,operationId:randomUUID()}),{code:'JOURNAL_REVISION_CONFLICT'})
 await assert.rejects(repo.remove(b,{id:input.id,revision:1,operationId:randomUUID()}),{code:'JOURNAL_REVISION_CONFLICT'})
 const goalId=randomUUID();await admin.query("insert into app_private.coaching_goals values($1,$2,'active')",[goalId,a.id])
 await assert.rejects(repo.save(b,entry({goalId})),{code:'JOURNAL_GOAL_UNAVAILABLE'})
 assert.equal((await repo.save(a,entry({goalId}))).saved,true)
})
test('hard deletion is retryable and delayed creates cannot resurrect ciphertext',async()=>{
 const input=entry();await repo.save(a,input)
 const removal={id:input.id,revision:1,operationId:randomUUID()}
 assert.equal((await repo.remove(a,removal)).deleted,true)
 assert.equal((await repo.remove(a,removal)).replayed,true)
 assert.equal((await admin.query('select id from app_private.daybook_entries where id=$1',[input.id])).rowCount,0)
 await assert.rejects(repo.save(a,input),{code:'JOURNAL_ENTRY_DELETED'})
 await assert.rejects(repo.save(a,{...input,operationId:randomUUID()}),{code:'JOURNAL_ENTRY_DELETED'})
})
test('cursor pages have no repeated records and do not accept a foreign cursor',async()=>{
 await repo.save(b,entry());await repo.save(b,entry());await repo.save(b,entry())
 const first=await repo.list(b,{limit:2}),second=await repo.list(b,{limit:2,before:first.nextCursor})
 assert.equal(first.entries.length,2);assert.equal(second.entries.length,1)
 assert.equal(new Set([...first.entries,...second.entries].map(x=>x.id)).size,3)
 await assert.rejects(repo.list(a,{before:first.nextCursor}),{code:'JOURNAL_CURSOR_UNAVAILABLE'})
})
test('inactive accounts and revoked sessions fail through the actual transaction stack',async()=>{
 await admin.query("update app.accounts set status='suspended' where id=$1",[b.id])
 await assert.rejects(repo.save(b,entry()),{code:'ACCOUNT_REQUIRED'})
 await admin.query("update app.accounts set status='active' where id=$1",[b.id])
 await admin.query('delete from auth.sessions where id=$1',[b.claims.session_id])
 await assert.rejects(repo.list(b),{code:'SIGN_IN_REQUIRED'})
})
test('account hard deletion erases journal ciphertext and retry receipts by cascade',async()=>{
 const c={id:randomUUID(),claims:{session_id:randomUUID()}};c.claims.sub=c.id
 await admin.query("insert into app.accounts values($1,'active','active')",[c.id])
 await admin.query('insert into auth.sessions values($1,$2)',[c.claims.session_id,c.id])
 await repo.save(c,entry())
 assert.equal((await admin.query('select 1 from app_private.daybook_entry_receipts where account_id=$1',[c.id])).rowCount,1)
 await admin.query('delete from app.accounts where id=$1',[c.id])
 for(const table of ['daybook_entries','daybook_entry_receipts']) assert.equal((await admin.query(`select 1 from app_private.${table} where account_id=$1`,[c.id])).rowCount,0)
})
test('journal remains editable when its previously selected goal is later completed',async()=>{
 const goalId=randomUUID();await admin.query("insert into app_private.coaching_goals values($1,$2,'active')",[goalId,a.id])
 const input=entry({goalId});await repo.save(a,input)
 await admin.query("update app_private.coaching_goals set status='completed' where id=$1",[goalId])
 const saved=await repo.save(a,{...input,operationId:randomUUID(),revision:1,text:'Reflection after completing the goal'})
 assert.equal(saved.entry.revision,2)
 assert.equal(saved.entry.goalId,goalId)
 await assert.rejects(repo.save(a,entry({goalId})),{code:'JOURNAL_GOAL_UNAVAILABLE'})
})
