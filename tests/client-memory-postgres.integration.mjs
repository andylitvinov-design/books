// SECURITY CRITICAL: this test may apply DDL ONLY in the explicitly isolated
// and disposable CI Postgres database; NEVER in a Vercel or production process.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const url = process.env.HH_TEST_ADMIN_DATABASE_URL || ''
let isolated = false
try {
  const parsed = new URL(url)
  isolated = process.env.CI === 'true' && process.env.HH_APP_TEST_RUNTIME === 'isolated' &&
    process.env.HH_CLIENT_MEMORY_TEST_APPLY_PROPOSALS === 'synthetic-only' &&
    !process.env.VERCEL && ['127.0.0.1','localhost'].includes(parsed.hostname) &&
    parsed.pathname === '/hh_client_memory_test'
} catch {}
const A='10000000-0000-4000-8000-000000000001'
const B='10000000-0000-4000-8000-000000000002'
const M1='10000000-0000-4000-8000-000000000003'
const M2='10000000-0000-4000-8000-000000000004'
const REQ='20000000-0000-4000-8000-000000000001'
const REC='30000000-0000-4000-8000-000000000001'
const SHARE='40000000-0000-4000-8000-000000000001'
const TASK='50000000-0000-4000-8000-000000000001'
const op=n=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`

if(!isolated){
  test('client memory PostgreSQL owner/master isolation requires isolated loopback DB', {skip:true},()=>{})
} else {
  test('actual PostgreSQL RLS: 2 owners, 2 masters, share revocation, tasks',async()=>{
    const {default:pg}=await import('pg')
    const db = new pg.Client({connectionString:url})
    await db.connect()
    try {
      const has = await db.query("select to_regclass('app.accounts') as present")
      if(has.rows[0]?.present)throw Error('Refuse to modify nonempty database')
      await db.query(`
        -- Reuse cluster-wide CI roles if the existing app database suite ran
        -- earlier in this SAME isolated PostgreSQL service.
        do $roles$ begin
          if not exists(select 1 from pg_roles where rolname='anon') then
            create role anon nologin;
          end if;
          if not exists(select 1 from pg_roles where rolname='authenticated') then
            create role authenticated nologin;
          end if;
          if not exists(select 1 from pg_roles where rolname='hh_app_backend') then
            create role hh_app_backend nologin;
          end if;
          if not exists(select 1 from pg_roles where rolname='hh_app_inbox') then
            create role hh_app_inbox nologin;
          end if;
        end $roles$;
        create schema auth; create schema app; create schema app_private;
        create function auth.uid() returns uuid language sql stable as
          $$ select nullif((coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'sub'),'')::uuid $$;
        create table app.accounts (id uuid primary key,status text not null,onboarding_state text not null);
        create table app.practitioners(id uuid primary key,trusted_auth_user_id uuid not null,
           active boolean not null,status text not null,public_profile jsonb not null default '{}'::jsonb);
        create table app.consultation_requests(id uuid primary key, account_id uuid not null references app.accounts(id),
           recipient_practitioner_id uuid not null references app.practitioners(id),status text not null);
        create function app_private.account_active() returns boolean language sql stable security invoker as
          $$ select exists(select 1 from app.accounts where id=auth.uid() and status='active' and onboarding_state='active') $$;
        -- The synthetic suite binds claims directly, without the app's HTTP session fixture.
        create function app_private.session_active() returns boolean language sql stable security invoker as
          $$ select app_private.account_active() $$;
        insert into app.accounts values
          ('${A}','active','active'),('${B}','active','active'),
          ('${M1}','active','active'),('${M2}','active','active');
        insert into app.practitioners values
          ('70000000-0000-4000-8000-000000000001','${M1}',true,'approved','{"name":"Synthetic M1"}'),
          ('70000000-0000-4000-8000-000000000002','${M2}',true,'approved','{"name":"Synthetic M2"}');
        insert into app.consultation_requests values
          ('${REQ}','${A}','70000000-0000-4000-8000-000000000001','requested');
        grant usage on schema auth,app,app_private to hh_app_backend;
        grant execute on function auth.uid(),app_private.account_active() to hh_app_backend;
        grant select on app.accounts,app.practitioners,app.consultation_requests to hh_app_backend;
        alter table app.accounts enable row level security; alter table app.accounts force row level security;
        create policy accounts_sel on app.accounts for select to hh_app_backend using(id=auth.uid());
        alter table app.practitioners enable row level security; alter table app.practitioners force row level security;
        create policy practitioner_sel on app.practitioners for select to hh_app_backend
          using(active AND status='approved' AND (public_profile<>'{}'::jsonb OR trusted_auth_user_id=auth.uid()));
        alter table app.consultation_requests enable row level security;
        alter table app.consultation_requests force row level security;
        create policy request_sel on app.consultation_requests for select to hh_app_backend using(
          account_id=auth.uid() OR EXISTS(SELECT 1 FROM app.practitioners p
          WHERE p.id=recipient_practitioner_id AND p.trusted_auth_user_id=auth.uid() AND p.active AND p.status='approved'));
      `)
      // Real SQL executes BEGIN/COMMIT. This test owns its disposable DB.
      const source = await readFile(new URL('../supabase/migrations/20261106203000_hh_client_memory_care_journey_v1.sql',import.meta.url),'utf8')
      await db.query(source)
      await db.query(await readFile(new URL('../supabase/migrations/20261122133522_hh_my_coach_durable_protocol_archive_v1_20261122.sql',import.meta.url),'utf8'))
      await db.query(await readFile(new URL('../supabase/migrations/20261023183700_hh_personal_coaching_sessions.sql',import.meta.url),'utf8'))
      await db.query(await readFile(new URL('../supabase/migrations/20261125144854_hh_my_coach_private_protocol_drafts_20261125.sql',import.meta.url),'utf8'))
      await db.query(await readFile(new URL('../docs/coaching/PERSONAL_MEMORY_PROTOCOL_REFS_DRAFT.sql',import.meta.url),'utf8'))
      const force = await db.query(`select relname,relrowsecurity,relforcerowsecurity from pg_class
        where oid in ('app_private.client_ai_memory_settings'::regclass,
        'app_private.client_ai_memory_items'::regclass,
        'app_private.client_ai_memory_shares'::regclass,
        'app_private.client_care_tasks'::regclass,
        'app_private.client_care_task_events'::regclass,
        'app_private.client_ai_memory_audit'::regclass)`)
      assert.equal(force.rowCount,6)
      assert.ok(force.rows.every(r=>r.relrowsecurity&&r.relforcerowsecurity))
      const as = async(actor,fn)=>{
        await db.query('begin')
        try {
          await db.query('set local role hh_app_backend')
          await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor})])
          const val=await fn(db)
          await db.query('commit')
          return val
        }catch(e){await db.query('rollback').catch(()=>{});throw e}
      }
      await as(A,db=>db.query(`insert into app_private.client_ai_memory_settings
        (account_id,memory_enabled,master_sharing_enabled) values($1,true,true)`,[A]))
      await as(A,db=>db.query(`insert into app_private.client_ai_memory_items
        (id,account_id,category,scope,payload_ciphertext,source_kind,confidence,
         confirmed_at,expires_at,operation_id)
        values($1,$2,'goal','coaching',$3,'client_explicit','client_confirmed',now(),now()+interval '30 days',$4)`,
        [REC,A,'x'.repeat(100),op(1)]))
      assert.equal((await as(B,db=>db.query('select count(*)::int n from app_private.client_ai_memory_items'))).rows[0].n,0)
      // A direct callable helper must never reveal another account's item.
      assert.equal((await as(A,db=>db.query(
        'select app_private.client_ai_share_item_valid($1,$2) allowed',
        [A,REC]))).rows[0].allowed,true)
      assert.equal((await as(B,db=>db.query(
        'select app_private.client_ai_share_item_valid($1,$2) allowed',
        [A,REC]))).rows[0].allowed,false)
      await as(A,db=>db.query(`insert into app_private.client_ai_memory_shares
        (id,account_id,memory_item_id,consultation_request_id,practitioner_account_id,
          scope,consent_version,operation_id,expires_at)
        values($1,$2,$3,$4,$5,'view_one_item','client-ai-share-v2',$6,now()+interval '7 days')`,
        [SHARE,A,REC,REQ,M1,op(2)]))
      assert.equal((await as(M1,db=>db.query('select count(*)::int n from app_private.client_ai_memory_items'))).rows[0].n,1)
      assert.equal((await as(M2,db=>db.query('select count(*)::int n from app_private.client_ai_memory_items'))).rows[0].n,0)
      await as(A,db=>db.query('update app_private.client_ai_memory_settings set memory_enabled=false where account_id=$1',[A]))
      assert.equal((await as(M1,db=>db.query('select count(*)::int n from app_private.client_ai_memory_items'))).rows[0].n,0)
      const share = await as(A,db=>db.query('select revoked_at from app_private.client_ai_memory_shares where id=$1',[SHARE]))
      assert.ok(share.rows[0].revoked_at)
      await as(M1,db=>db.query(`insert into app_private.client_care_tasks
        (id,client_account_id,practitioner_account_id,consultation_request_id,origin,
          task_type,payload_ciphertext,status,operation_id)
        values($1,$2,$3,$4,'master_assignment','practice',$5,'offered',$6)`,[TASK,A,M1,REQ,'x'.repeat(100),op(3)]))
      assert.equal((await as(A,db=>db.query('select count(*)::int n from app_private.client_care_tasks'))).rows[0].n,1)
      assert.equal((await as(M2,db=>db.query('select count(*)::int n from app_private.client_care_tasks'))).rows[0].n,0)
      await as(A,db=>db.query("update app_private.client_care_tasks set status='accepted',revision=revision+1 where id=$1",[TASK]))
      await as(A,db=>db.query("update app_private.client_care_tasks set status='self_reported',revision=revision+1 where id=$1",[TASK]))
      // Client cannot mark their own report as master-reviewed.
      await assert.rejects(()=>as(A,db=>db.query(
        "update app_private.client_care_tasks set status='reviewed',revision=revision+1 where id=$1",[TASK])))
      // A different, active master must neither see nor review this client's task.
      assert.equal((await as(M2,db=>db.query(
        "update app_private.client_care_tasks set status='reviewed',revision=revision+1 where id=$1",[TASK]))).rowCount,0)
      await as(M1,db=>db.query("update app_private.client_care_tasks set status='reviewed',revision=revision+1 where id=$1",[TASK]))
      const status=await as(A,db=>db.query('select status,revision from app_private.client_care_tasks where id=$1',[TASK]))
      assert.deepEqual(status.rows[0],{status:'reviewed',revision:3})
      assert.equal((await as(M2,db=>db.query('select count(*)::int n from app_private.client_ai_memory_settings'))).rows[0].n,0)

      // Sensitive items require a separate consent; a second master cannot be
      // substituted into a valid owner's share request.
      await assert.rejects(()=>as(A,db=>db.query(`insert into app_private.client_ai_memory_items
        (id,account_id,category,scope,privacy_class,payload_ciphertext,source_kind,confidence,
         confirmed_at,expires_at,operation_id)
        values('30000000-0000-4000-8000-000000000002',$1,'goal','coaching','sensitive',$2,
          'client_explicit','client_confirmed',now(),now()+interval '30 days',$3)`,
        [A,'y'.repeat(100),op(4)])))
      await assert.rejects(()=>as(A,db=>db.query(`insert into app_private.client_ai_memory_shares
        (id,account_id,memory_item_id,consultation_request_id,practitioner_account_id,
          scope,consent_version,operation_id,expires_at)
        values('40000000-0000-4000-8000-000000000002',$1,$2,$3,$4,
          'view_one_item','client-ai-share-v2',$5,now()+interval '7 days')`,
        [A,REC,REQ,M2,op(5)])))

      // Source-backed PME extension: same account settings, no duplicated text.
      const protocolA='81000000-0000-4000-8000-000000000001'
      const protocolB='81000000-0000-4000-8000-000000000002'
      const refA='82000000-0000-4000-8000-000000000001'
      const refB='82000000-0000-4000-8000-000000000002'
      const fingerprint='a'.repeat(64)
      await as(A,d=>d.query('update app_private.client_ai_memory_settings set memory_enabled=true,sensitive_enabled=true where account_id=$1',[A]))
      await as(B,d=>d.query('insert into app_private.client_ai_memory_settings(account_id,memory_enabled,sensitive_enabled) values($1,true,true)',[B]))
      const {seal}=await import('../lib/app/crypto.js')
      const {ownerMemoryFingerprint,projectOwnerMemoryArchiveRow}=await import('../lib/app/my-coach-memory-source.js')
      const {manageMyCoachMemorySelection}=await import('../lib/app/my-coach-memory-selection.js')
      const {closeDatabase}=await import('../lib/app/database.js')
      const config={test:true,databaseUrl:url,encryptionKey:Buffer.alloc(32,42),encryptionKeyId:'synthetic'}
      const quote='A quiet walk before the meeting helps me.'
      const protocol={id:protocolB,locale:'en',provenance:'client_reviewed_dialogue',
        completedAt:'2026-11-22T10:00:00.000Z',courseSessionId:'clarity_support',
        courseFieldReview:{version:'hh-coach-course-review-v1',courseSessionId:'clarity_support',
          events:[{fieldId:'resources',status:'confirmed',turnIndex:0,quote,revision:1}]},
        turns:[{role:'user',content:quote}]}
      const cipher=seal(protocol,{accountId:B,recordId:protocolB,field:'my_coach.protocol'},config)
      const [sourceItem]=projectOwnerMemoryArchiveRow(config,{id:B},
        {account_id:B,protocol_id:protocolB,schema_version:1,protocol_ciphertext:cipher}).items
      for(const [owner,protocolId,encrypted] of [[A,protocolA,'synthetic-ciphertext'],[B,protocolB,cipher]])
        await as(owner,d=>d.query(
          'insert into app_private.my_coach_protocol_records(account_id,protocol_id,protocol_ciphertext) values($1,$2,$3)',
          [owner,protocolId,encrypted]))
      const insertRef=(owner,ref,protocol)=>as(owner,d=>d.query(
        "insert into app_private.client_ai_memory_protocol_refs(account_id,id,protocol_id,field_id,field_revision,turn_index,source_hash) values($1,$2,$3,'resources',1,0,$4)",[owner,ref,protocol,owner===B?ownerMemoryFingerprint(config,B,sourceItem):fingerprint]))
      await insertRef(A,refA,protocolA)
      await insertRef(B,refB,protocolB)
      await assert.rejects(()=>insertRef(B,'82000000-0000-4000-8000-000000000003',protocolA))
      await assert.rejects(()=>insertRef(A,'82000000-0000-4000-8000-000000000004',protocolA))
      assert.equal((await as(B,d=>d.query('select count(*)::int n from app_private.client_ai_memory_protocol_refs where account_id=$1',[A]))).rows[0].n,0)
      assert.equal((await as(B,d=>d.query("update app_private.client_ai_memory_protocol_refs set status='blocked',source_hash=null,revision=revision+1 where account_id=$1 and id=$2",[A,refA]))).rowCount,0)
      await as(A,d=>d.query("insert into app_private.client_ai_memory_protocol_ref_ops(account_id,operation_id,action,request_hash,ref_id) values($1,$2,'save',$3,$4)",[A,op(99),fingerprint,refA]))
      assert.equal((await as(B,d=>d.query('select count(*)::int n from app_private.client_ai_memory_protocol_ref_ops'))).rows[0].n,0)
      const addCorrection=(owner,ref,revision)=>as(owner,d=>d.query(
        "insert into app_private.client_ai_memory_protocol_ref_versions(account_id,ref_id,revision,value_ciphertext) values($1,$2,$3,$4)",
        [owner,ref,revision,"x".repeat(80)]))
      const advanceCorrection=(owner,ref)=>as(owner,d=>d.query(
        "update app_private.client_ai_memory_protocol_refs set revision=revision+1 where account_id=$1 and id=$2 returning revision",
        [owner,ref]))
      await assert.rejects(()=>advanceCorrection(A,refA),/MEMORY_PROTOCOL_REF_IMMUTABLE/)
      await assert.rejects(()=>addCorrection(B,refA,1))
      await assert.rejects(()=>addCorrection(A,refA,2))
      await as(A,async d=>{
        await d.query("insert into app_private.client_ai_memory_protocol_ref_versions(account_id,ref_id,revision,value_ciphertext) values($1,$2,1,$3)",
          [A,refA,"x".repeat(80)])
        const result=await d.query("update app_private.client_ai_memory_protocol_refs set revision=revision+1 where account_id=$1 and id=$2 returning revision",
          [A,refA])
        assert.equal(result.rows[0].revision,1)
      })
      assert.equal((await as(B,d=>d.query("select * from app_private.client_ai_memory_protocol_ref_versions where ref_id=$1",
        [refA]))).rowCount,0)
      assert.equal((await as(A,d=>d.query("delete from app_private.client_ai_memory_protocol_ref_versions where ref_id=$1",
        [refA]))).rowCount,0)
      await assert.rejects(()=>as(A,d=>d.query("update app_private.client_ai_memory_protocol_ref_versions set value_ciphertext=$1",
        ["y".repeat(80)])),/permission denied/)
      await as(A,d=>d.query('update app_private.client_ai_memory_settings set sensitive_enabled=false where account_id=$1',[A]))
      assert.deepEqual((await as(A,d=>d.query('select status,revision,source_hash from app_private.client_ai_memory_protocol_refs where id=$1',[refA]))).rows[0],
        {status:'blocked',revision:2,source_hash:null})
      assert.equal((await as(A,d=>d.query("select * from app_private.client_ai_memory_protocol_ref_versions where ref_id=$1",
        [refA]))).rowCount,0)
      assert.equal((await as(B,d=>d.query('select status from app_private.client_ai_memory_protocol_refs where id=$1',[refB]))).rows[0].status,'active')
      await as(A,d=>d.query('update app_private.client_ai_memory_settings set sensitive_enabled=true where account_id=$1',[A]))
      assert.equal((await as(A,d=>d.query('select status from app_private.client_ai_memory_protocol_refs where id=$1',[refA]))).rows[0].status,'blocked')
      await assert.rejects(()=>as(A,d=>d.query("update app_private.client_ai_memory_protocol_refs set status='active',source_hash=$2,revision=revision+1 where id=$1",[refA,fingerprint])))
      await as(A,d=>d.query('delete from app_private.my_coach_protocol_records where account_id=$1 and protocol_id=$2',[A,protocolA]))
      assert.equal((await as(A,d=>d.query('select count(*)::int n from app_private.client_ai_memory_protocol_refs'))).rows[0].n,0)
      assert.equal((await as(A,d=>d.query('select count(*)::int n from app_private.client_ai_memory_protocol_ref_ops'))).rows[0].n,1)
      const actor=id=>({id,claims:{sub:id}})
      const exportFor=id=>manageMyCoachMemorySelection(config,actor(id),{action:'export'})
      try {
        assert.equal((await exportFor(A)).exportStatus,'empty')
        await assert.rejects(()=>manageMyCoachMemorySelection(config,{id:B,claims:{sub:A}},{action:'export'}),
          {code:'ACCOUNT_REQUIRED'})
        // Start an actual server-issued question and advance through explicit skips.
        const {coachOpeningProgress,coachOpeningProtocolSnapshot}=await import('../lib/coaching/coach-opening-protocol.mjs')
        const {coachCourseGateTransition}=await import('../lib/coaching/coach-course-gate-draft.mjs')
        const {recallCoachCourseCheckpoint}=await import('../lib/app/my-coach-protocol-drafts.js')
        const current='81000000-0000-4000-8000-000000000003'
        const openingTurns=['Yes','My name is Anna','New topic','I want to work on a goal','Calm','Yes']
        const opening=coachOpeningProgress({turns:openingTurns,locale:'en',personaId:'mira'})
        let draft={revision:1,courseSessionId:protocol.courseSessionId,protocol:{id:current,
          courseSessionId:protocol.courseSessionId,locale:'en',personaId:'mira',startedAt:'2026-11-27T09:00:00.000Z',provenance:'client_autosaved_unreviewed_draft',
          opening:coachOpeningProtocolSnapshot(opening),turns:openingTurns.map(content=>({role:'user',content}))}}
        for(const action of ['course-gate-start','course-gate-answer','course-gate-answer']){
          const input={action,id:current,revision:draft.revision,requestId:op(120+draft.revision),consent:true,
            ...(action==='course-gate-answer'?{promptId:draft.courseGate.prompt.id,content:'skip this question'}:{})}
          draft={...draft,...coachCourseGateTransition(draft,input,'2026-11-27T10:00:00.000Z'),revision:draft.revision+1}
        }
        assert.equal(draft.courseGate.prompt.fieldId,'resources')
        const draftCipher=seal(draft,{accountId:B,recordId:current,field:'my_coach.draft'},config)
        await as(B,d=>d.query('insert into app_private.my_coach_protocol_drafts(account_id,protocol_id,revision,payload_ciphertext) values($1,$2,$3,$4)',
          [B,current,draft.revision,draftCipher]))
        const request={action:'course-gate-recall',id:current,revision:draft.revision,promptId:draft.courseGate.prompt.id,consent:true}
        const recallFor=(id,changes={})=>recallCoachCourseCheckpoint(config,actor(id),{...request,...changes})
        await assert.rejects(()=>recallFor(A),{code:'MY_COACH_DRAFT_CONFLICT'})
        await assert.rejects(()=>recallFor(B,{revision:request.revision-1}),{code:'MY_COACH_DRAFT_CONFLICT'})
        await assert.rejects(()=>recallFor(B,{promptId:'prompt:1:1'}),{code:'MY_COACH_DRAFT_CONFLICT'})
        await assert.rejects(()=>recallFor(B,{fieldId:'resources'}),{code:'MY_COACH_DRAFT_INVALID'})
        assert.deepEqual(await recallFor(B),{status:'ok',item:{value:quote,sessionEndedAt:protocol.completedAt,
          valueSource:'reviewed_coaching_protocol'}})
        const unchanged=(await as(B,d=>d.query('select revision,payload_ciphertext from app_private.my_coach_protocol_drafts where account_id=$1 and protocol_id=$2',[B,current]))).rows[0]
        assert.deepEqual(unchanged,{revision:draft.revision,payload_ciphertext:draftCipher})
        const original=await exportFor(B)
        assert.equal(original.exportStatus,'ok')
        assert.deepEqual(original.items.map(item=>item.value),[quote])
        await manageMyCoachMemorySelection(config,actor(B),{action:'correct',confirmed:true,operationId:op(101),
          id:refB,expectedRevision:0,value:'Walking after lunch works for me.'})
        const corrected=await exportFor(B)
        assert.equal(corrected.exportStatus,'ok')
        assert.equal((await recallFor(B)).item.value,'Walking after lunch works for me.')
        assert.deepEqual(corrected.items.map(item=>[item.value,item.valueSource]),
          [['Walking after lunch works for me.','owner_correction']])
        assert.doesNotMatch(JSON.stringify(corrected),/ciphertext|81000000|82000000|before the meeting/)
        await as(B,d=>d.query('update app_private.client_ai_memory_settings set sensitive_enabled=false where account_id=$1',[B]))
        const denied=await exportFor(B)
        assert.equal(denied.exportStatus,'not_authorized')
        assert.deepEqual(await recallFor(B),{status:'not_authorized',item:null})
        assert.deepEqual(denied.items,[])
        const {saveMyCoachProtocol,deleteMyCoachProtocol}=await import('../lib/app/personal-coaching.js')
        const memoryEnv=['HH_COACH_MEMORY_SELECTION_ENABLED','HH_CLIENT_MEMORY_ENABLED']
        const before=memoryEnv.map(key=>process.env[key])
        for(const key of memoryEnv)process.env[key]='true'
        try {
          const permissions=await manageMyCoachMemorySelection(config,actor(A),{action:'permissions'})
          assert.equal(permissions.allowed,true)
          const reviewed=id=>({...protocol,id,personaId:'mira',startedAt:'2026-11-22T09:00:00.000Z',
            turnLayout:'chronological',turns:[...protocol.turns,{role:'assistant',content:'Thank you.',mode:'offline'}]})
          const selected='81000000-0000-4000-8000-000000000021'
          const input={consent:true,protocol:reviewed(selected),expectedMemorySettingsRevision:permissions.settingsRevision}
          const parallel=await Promise.all([saveMyCoachProtocol(config,actor(A),input),saveMyCoachProtocol(config,actor(A),input)])
          assert.deepEqual(parallel.map(r=>r.memorySelection.status).sort(),['already_saved','saved'])
          assert.deepEqual(parallel.map(r=>r.memorySelection.selected).sort(),[0,1])
          assert.deepEqual((await exportFor(A)).items.map(item=>item.value),[quote])
          const stale='81000000-0000-4000-8000-000000000022'
          const staleResult=await saveMyCoachProtocol(config,actor(A),{...input,protocol:reviewed(stale),
            expectedMemorySettingsRevision:permissions.settingsRevision+1})
          assert.deepEqual(staleResult.memorySelection,{status:'stale_consent',selected:0})
          const plain='81000000-0000-4000-8000-000000000023'
          const plainResult=await saveMyCoachProtocol(config,actor(A),{consent:true,protocol:reviewed(plain)})
          assert.equal(plainResult.saved,true)
          assert.equal(Object.hasOwn(plainResult,'memorySelection'),false)
          const unavailable='81000000-0000-4000-8000-000000000024'
          await db.query("alter table app_private.client_ai_memory_protocol_refs add constraint isolated_write_failure check (protocol_id<>'81000000-0000-4000-8000-000000000024')")
          const errorResult=await saveMyCoachProtocol(config,actor(A),{...input,protocol:reviewed(unavailable)})
          assert.deepEqual(errorResult.memorySelection,{status:'unavailable',selected:0})
          const records=await as(A,d=>d.query('select protocol_id from app_private.my_coach_protocol_records where protocol_id=any($1::uuid[])',
            [[selected,stale,plain,unavailable]]))
          assert.equal(records.rowCount,4)
          assert.deepEqual((await as(A,d=>d.query('select protocol_id from app_private.client_ai_memory_protocol_refs'))).rows,[{protocol_id:selected}])
          assert.equal((await as(B,d=>d.query('select protocol_id from app_private.client_ai_memory_protocol_refs where protocol_id=$1',[selected]))).rowCount,0)
          await as(A,d=>d.query('update app_private.client_ai_memory_settings set sensitive_enabled=false where account_id=$1',[A]))
          await as(A,d=>d.query('update app_private.client_ai_memory_settings set sensitive_enabled=true where account_id=$1',[A]))
          const otherPermissions=await manageMyCoachMemorySelection(config,actor(A),{action:'permissions'})
          const retry=await saveMyCoachProtocol(config,actor(A),{...input,expectedMemorySettingsRevision:otherPermissions.settingsRevision})
          assert.deepEqual(retry.memorySelection,{status:'already_saved',selected:0})
          assert.equal((await exportFor(A)).exportStatus,'empty')

          // Resume an owner-approved import over more than 100 distinct encrypted sources.
          await db.query('alter table app_private.client_ai_memory_protocol_refs drop constraint isolated_write_failure')
          const history=Array.from({length:111},(_,i)=>'83000000-0000-4000-8000-'+String(i+1).padStart(12,'0'))
          const snapshots=history.map((id,i)=>seal(i===110?{...reviewed(id),courseSessionId:undefined,courseFieldReview:undefined}:reviewed(id),
            {accountId:A,recordId:id,field:'my_coach.protocol'},config))
          await as(A,d=>d.query(
            'insert into app_private.my_coach_protocol_records(account_id,protocol_id,protocol_ciphertext,saved_at) '+
            'select $1,u.id,u.cipher,$4::timestamptz from unnest($2::uuid[],$3::text[]) u(id,cipher)',
            [A,history,snapshots,'2026-11-21T10:00:00.123456Z']))
          const importRequest=(body,id=A)=>manageMyCoachMemorySelection(config,actor(id),body)
          const start={action:'backfill-start',confirmed:true,expectedSettingsRevision:otherPermissions.settingsRevision}
          assert.equal((await importRequest({...start,expectedSettingsRevision:start.expectedSettingsRevision+1})).status,'stale_consent')
          const started=await importRequest(start)
          assert.equal(started.status,'ready')
          assert.equal(started.scanned,0)
          const initialPage={action:'backfill-page',cursor:started.nextCursor}
          await as(B,d=>d.query('update app_private.client_ai_memory_settings set sensitive_enabled=true where account_id=$1',[B]))
          await assert.rejects(()=>importRequest(initialPage,B),{code:'MY_COACH_MEMORY_SELECTION_INVALID'})
          await assert.rejects(()=>importRequest({...initialPage,cursor:'tampered'}),{code:'MY_COACH_MEMORY_SELECTION_INVALID'})
          const first=await importRequest(initialPage)
          assert.equal(first.status,'partial')
          assert.ok(first.nextCursor)
          assert.ok(first.selected>0&&first.scanned<=6)
          const replay=await importRequest(initialPage)
          assert.equal(replay.selected,0)
          assert.equal(replay.scanned,first.scanned)
          const newer='83000000-0000-4000-8000-000000000201'
          await saveMyCoachProtocol(config,actor(A),{consent:true,protocol:reviewed(newer)})
          await deleteMyCoachProtocol(config,actor(A),{id:history[0],confirmed:true})
          let page=first, pages=1
          while(page.nextCursor&&pages<24){
            page=await importRequest({action:'backfill-page',cursor:page.nextCursor})
            assert.ok(page.scanned<=6)
            pages++
          }
          assert.ok(pages>17)
          assert.equal(page.status,'partial') // One historical row is untyped.
          assert.equal(page.nextCursor,null)
          const picked=await as(A,d=>d.query('select protocol_id,status from app_private.client_ai_memory_protocol_refs where protocol_id=any($1::uuid[])',
            [[...history,newer,selected]]))
          assert.equal(picked.rows.filter(r=>r.status==='active').length,109)
          assert.equal(picked.rows.find(r=>r.protocol_id===selected)?.status,'blocked')
          assert.ok(picked.rows.every(r=>![newer,history[0],history.at(-1)].includes(r.protocol_id)))
          const stillSaved=await as(A,d=>d.query('select protocol_ciphertext,saved_at::text from app_private.my_coach_protocol_records where protocol_id=$1',[history[1]]))
          assert.equal(stillSaved.rows[0].protocol_ciphertext,snapshots[1])
          assert.match(stillSaved.rows[0].saved_at,/\.123456/)
          const extra=Array.from({length:50},(_,i)=>'85000000-0000-4000-8000-'+String(i+1).padStart(12,'0'))
          const extraCipher=extra.map(id=>seal(reviewed(id),{accountId:A,recordId:id,field:'my_coach.protocol'},config))
          await as(A,d=>d.query('insert into app_private.my_coach_protocol_records(account_id,protocol_id,protocol_ciphertext) '+
            'select $1,u.id,u.cipher from unnest($2::uuid[],$3::text[]) u(id,cipher)',[A,extra,extraCipher]))
          let limited=await importRequest(start)
          for(let i=0;i<12&&limited.status!=='limit'&&limited.nextCursor;i++)
            limited=await importRequest({action:'backfill-page',cursor:limited.nextCursor})
          assert.equal(limited.status,'limit')
          const activeCount=async()=>Number((await as(A,d=>d.query(
            "select count(*) as n from app_private.client_ai_memory_protocol_refs where status='active'"))).rows[0].n)
          assert.equal(await activeCount(),150)
          const waiting={action:'backfill-page',cursor:limited.nextCursor}
          assert.equal((await importRequest(waiting)).selected,0)
          const oldRef=(await as(A,d=>d.query('select id,revision from app_private.client_ai_memory_protocol_refs where protocol_id=$1',[history[1]]))).rows[0]
          await importRequest({action:'forget',id:oldRef.id,expectedRevision:oldRef.revision,confirmed:true,operationId:op(188)})
          assert.equal((await importRequest(waiting)).selected,1)
          assert.equal(await activeCount(),150)

          const {updateClientMemoryConsent}=await import('../lib/app/client-memory-store.js')
          const revoked=await updateClientMemoryConsent(config,actor(A),{operationId:op(190),
            expectedRevision:start.expectedSettingsRevision,values:{sensitive_enabled:false}})
          assert.equal((await importRequest(initialPage)).status,'not_authorized')
          await updateClientMemoryConsent(config,actor(A),{operationId:op(191),
            expectedRevision:revoked.settings.revision,values:{sensitive_enabled:true}})
          assert.equal((await importRequest(initialPage)).status,'stale_consent')
          assert.equal((await exportFor(A)).exportStatus,'empty')
        } finally {
          memoryEnv.forEach((key,i)=>{if(before[i]===undefined)delete process.env[key];else process.env[key]=before[i]})
        }
      } finally { await closeDatabase() }
      await as(B,d=>d.query("delete from app_private.my_coach_protocol_records where account_id=$1 and protocol_id=$2",[B,protocolB]))
      assert.equal((await as(B,d=>d.query("select * from app_private.client_ai_memory_protocol_ref_versions where ref_id=$1",[refB]))).rowCount,0)
      const pmeRls=await db.query("select relrowsecurity,relforcerowsecurity from pg_class where oid in ('app_private.client_ai_memory_protocol_refs'::regclass,'app_private.client_ai_memory_protocol_ref_ops'::regclass,'app_private.client_ai_memory_protocol_ref_versions'::regclass)")
      assert.equal(pmeRls.rowCount,3);assert.ok(pmeRls.rows.every(row=>row.relrowsecurity&&row.relforcerowsecurity))

      // Re-enabling sharing and then deleting settings must revoke every live grant.
      await as(A,db=>db.query(`update app_private.client_ai_memory_settings
        set memory_enabled=true,master_sharing_enabled=true where account_id=$1`,[A]))
      await as(A,db=>db.query(`insert into app_private.client_ai_memory_shares
        (id,account_id,memory_item_id,consultation_request_id,practitioner_account_id,
          scope,consent_version,operation_id,expires_at)
        values('40000000-0000-4000-8000-000000000003',$1,$2,$3,$4,
          'view_one_item','client-ai-share-v2',$5,now()+interval '7 days')`,
        [A,REC,REQ,M1,op(6)]))
      await as(A,db=>db.query('delete from app_private.client_ai_memory_settings where account_id=$1',[A]))
      const deletedSettingsShare=await as(A,db=>db.query(
        "select revoked_at from app_private.client_ai_memory_shares where id='40000000-0000-4000-8000-000000000003'"))
      assert.ok(deletedSettingsShare.rows[0].revoked_at)

      // Neither anon nor authenticated can directly read these private tables.
      for(const role of ['anon','authenticated']){
        await db.query('begin')
        try{
          await db.query(`set local role ${role}`)
          await assert.rejects(()=>db.query('select * from app_private.client_ai_memory_items'))
        }finally{await db.query('rollback')}
      }
    }finally { await db.end() }
  })
}
