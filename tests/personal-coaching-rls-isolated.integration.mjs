// Runs destructive setup ONLY on a deliberately created empty local test DB.
// It must never connect to a shared, remote, Vercel or production database.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const raw=process.env.HH_TEST_ADMIN_DATABASE_URL||''
let isolated=false
try {
  const url=new URL(raw)
  const local=url.port==='55439'
  const ci=url.port==='5432' && process.env.CI==='true' && process.env.GITHUB_ACTIONS==='true' &&
    process.env.NODE_ENV==='test' && raw==='postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_coaching_rls_test'
  isolated=process.env.HH_APP_TEST_RUNTIME==='isolated' &&
    process.env.HH_COACHING_RLS_TEST==='synthetic-only' && !process.env.VERCEL &&
    ['postgres:','postgresql:'].includes(url.protocol) && url.hostname==='127.0.0.1' &&
    (local||ci) && url.pathname==='/hh_coaching_rls_test' && !url.search && !url.hash
} catch {}

const A='10000000-0000-4000-8000-000000000001'
const B='10000000-0000-4000-8000-000000000002'

if(!isolated){
  test('personal coaching RLS requires an explicitly isolated synthetic Postgres database',{skip:true},()=>{})
}else{
  test('Postgres enforces coaching owner isolation, writes and inactive-account denial',async()=>{
    const {default:pg}=await import('pg')
    const db=new pg.Client({connectionString:raw})
    await db.connect()
    try {
      const identity=(await db.query("select current_database() as db, inet_server_addr()::text as host, current_setting('port')::int as port, to_regnamespace('app') as app")).rows[0]
      assert.equal(identity.db,'hh_coaching_rls_test')
      const ci=process.env.CI==='true'&&process.env.GITHUB_ACTIONS==='true'&&identity.port===5432
      if(!ci)assert.equal(identity.host,'127.0.0.1/32')
      assert.ok(ci||identity.port===55439)
      assert.equal(identity.app,null,'refuse a nonempty application database')
      await db.query(`
        do $roles$ begin
          if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
          if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
          if not exists(select 1 from pg_roles where rolname='hh_app_backend') then create role hh_app_backend nologin nobypassrls; end if;
        end $roles$;
        create schema auth; create schema app; create schema app_private;
        create function auth.uid() returns uuid language sql stable as
          $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;
        create table app.accounts(id uuid primary key,status text not null,onboarding_state text not null);
        create function app_private.account_active() returns boolean language sql stable as
          $$ select exists(select 1 from app.accounts where id=auth.uid() and status='active' and onboarding_state='active') $$;
        grant usage on schema auth,app,app_private to hh_app_backend;
        grant select on app.accounts to hh_app_backend;
        grant execute on function auth.uid(),app_private.account_active() to hh_app_backend;
      `)
      const role=(await db.query("select rolsuper,rolbypassrls from pg_roles where rolname='hh_app_backend'")).rows[0]
      assert.equal(role.rolsuper,false)
      assert.equal(role.rolbypassrls,false)
      await db.query('insert into app.accounts values ($1,$3,$3),($2,$3,$3)',[A,B,'active'])
      const migration=await readFile(new URL('../supabase/migrations/20261023183700_hh_personal_coaching_sessions.sql',import.meta.url),'utf8')
      await db.query(migration)
      const as=async(actor,fn)=>{
        await db.query('begin')
        try {
          await db.query('set local role hh_app_backend')
          await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor})])
          const result=await fn(db)
          await db.query('commit')
          return result
        }catch(error){await db.query('rollback');throw error}
      }
      await as(A,c=>c.query('insert into app_private.personal_coaching_sessions(account_id,payload_ciphertext) values($1,$2)',[A,'a'.repeat(80)]))
      assert.equal((await as(A,c=>c.query('select account_id from app_private.personal_coaching_sessions'))).rowCount,1)
      assert.equal((await as(B,c=>c.query('select account_id from app_private.personal_coaching_sessions'))).rowCount,0)
      assert.equal((await as(B,c=>c.query('update app_private.personal_coaching_sessions set payload_ciphertext=$2 where account_id=$1',[A,'x'.repeat(80)]))).rowCount,0)
      assert.equal((await as(B,c=>c.query('delete from app_private.personal_coaching_sessions where account_id=$1',[A]))).rowCount,0)
      await assert.rejects(()=>as(B,c=>c.query('insert into app_private.personal_coaching_sessions(account_id,payload_ciphertext) values($1,$2)',[A,'x'.repeat(80)])),/row-level security/i)
      await assert.rejects(()=>as(A,c=>c.query('update app_private.personal_coaching_sessions set account_id=$2 where account_id=$1',[A,B])),/row-level security/i)
      await as(B,c=>c.query('insert into app_private.personal_coaching_sessions(account_id,payload_ciphertext) values($1,$2)',[B,'b'.repeat(80)]))
      assert.equal((await as(B,c=>c.query('select account_id from app_private.personal_coaching_sessions'))).rows[0].account_id,B)
      assert.equal((await as(A,c=>c.query('update app_private.personal_coaching_sessions set payload_ciphertext=$2 where account_id=$1',[A,'c'.repeat(80)]))).rowCount,1)
      assert.equal((await as(A,c=>c.query('delete from app_private.personal_coaching_sessions where account_id=$1',[A]))).rowCount,1)
      await db.query("update app.accounts set status='inactive' where id=$1",[B])
      assert.equal((await as(B,c=>c.query('select account_id from app_private.personal_coaching_sessions'))).rowCount,0)
      assert.equal((await as(B,c=>c.query('delete from app_private.personal_coaching_sessions where account_id=$1',[B]))).rowCount,0)
      // Exercise the actual coaching service and transactional lock on this disposable DB.
      await db.query("update app.accounts set status='active' where id=$1",[B])
      await db.query('delete from app_private.personal_coaching_sessions')
      await db.query(`create function app_private.session_active() returns boolean language sql stable as
        $$ select app_private.account_active() $$;
        grant execute on function app_private.session_active() to hh_app_backend;`)
      for(const file of ['20261023183000_hh_coaching_model_catalog_schema.sql','20261023183100_hh_coaching_model_catalog_seed.sql','20261108140500_hh_coaching_overload_session_v1.sql']){
        await db.query(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'))
      }
      const {randomBytes}=await import('node:crypto')
      const {savePersonalCoaching,readPersonalCoaching}=await import('../lib/app/personal-coaching.js')
      const {loadSchemeQuestions}=await import('../lib/app/personal-coaching-catalog.js')
      const {closeDatabase}=await import('../lib/app/database.js')
      const config={databaseUrl:raw,test:true,encryptionKey:randomBytes(32),encryptionKeyId:'isolated-test-v1'}
      const actorA={id:A,claims:{sub:A}},actorB={id:B,claims:{sub:B}}
      try{
        const scheme=await loadSchemeQuestions(db,'grow_overload_20_v1',{publishedOnly:true})
        assert.ok(scheme?.questions.length>1,'real migrated catalog must contain pilot questions')
        const start={action:'start',revision:0,schemeKey:'grow_overload_20_v1',clientQuestion:'I need to plan a calmer week',turnId:'90000000-0000-4000-8000-000000000001'}
        const starts=await Promise.allSettled([savePersonalCoaching(config,actorA,start),savePersonalCoaching(config,actorA,start)])
        assert.ok(starts.some(result=>result.status==='fulfilled'))
        for(const result of starts.filter(result=>result.status==='rejected'))assert.equal(result.reason.code,'PERSONAL_COACH_REVISION_CONFLICT')
        const session=await savePersonalCoaching(config,actorA,start)
        assert.equal(session.revision,1)
        assert.equal((await readPersonalCoaching(config,actorB)).course,null)
        const answer={action:'answer',revision:session.revision,questionId:scheme.questions[0].id,answer:'A calmer week with less pressure',turnId:'90000000-0000-4000-8000-000000000002'}
        // Hold the row until both actual service transactions are waiting, so this
        // is a real lock contention test rather than two possibly serial calls.
        await db.query('begin')
        await db.query('select account_id from app_private.personal_coaching_sessions where account_id=$1 for update',[A])
        const racing=Promise.all([savePersonalCoaching(config,actorA,answer),savePersonalCoaching(config,actorA,answer)])
        let waiting=0
        try{
          for(let attempt=0;attempt<100&&waiting<2;attempt++){
            waiting=Number((await db.query("select count(*) from pg_stat_activity where datname=current_database() and application_name='holistic-house-app' and wait_event_type='Lock'")).rows[0].count)
            if(waiting<2)await new Promise(resolve=>setTimeout(resolve,20))
          }
        }finally{await db.query('commit')}
        const [one,two]=await racing
        assert.ok(waiting>=2,'both service transactions must contend on the same row lock')
        assert.equal(one.revision,2)
        assert.equal(two.revision,2)
        assert.equal(one.course.current.answers[answer.questionId],answer.answer)
        assert.equal(one.course.current.answerTurns.filter(turn=>turn.id===answer.turnId).length,1)
        assert.equal(two.course.current.answerTurns.filter(turn=>turn.id===answer.turnId).length,1)
        assert.ok(one.course.current.pendingFollowup,'the persisted server phase must be present')
        const pending=one.course.current.pendingFollowup
        const skip={action:'skip_followup',revision:2,questionId:pending.questionId,followupKey:pending.key}
        const contenders=await Promise.allSettled([
          savePersonalCoaching(config,actorA,{...skip,turnId:'90000000-0000-4000-8000-000000000003'}),
          savePersonalCoaching(config,actorA,{...skip,turnId:'90000000-0000-4000-8000-000000000004'}),
        ])
        assert.equal(contenders.filter(result=>result.status==='fulfilled').length,1)
        assert.equal(contenders.find(result=>result.status==='rejected').reason.code,'PERSONAL_COACH_REVISION_CONFLICT')
        const stored=(await db.query('select payload_ciphertext,revision from app_private.personal_coaching_sessions where account_id=$1',[A])).rows[0]
        assert.equal(stored.revision,3)
        assert.equal(stored.payload_ciphertext.includes(answer.answer),false)
        assert.equal((await readPersonalCoaching(config,actorA)).course.current.pendingFollowup,undefined)
        // Rehearse the NEW Clarity SQL proposal on the same deliberately
        // disposable local database. This is not a registered deployment
        // migration, provider acceptance or flag activation.
        await db.query(await readFile(new URL('../docs/coaching/clarity-course-runs.proposal.sql',import.meta.url),'utf8'))
        const {claimTrustedFreeCoachingDays}=await import('../lib/app/coaching-free-day-quota.js')
        const {transaction}=await import('../lib/app/database.js')
        const C='10000000-0000-4000-8000-000000000003'
        const runA='20000000-0000-4000-8000-000000000001',runB='20000000-0000-4000-8000-000000000002',runC='20000000-0000-4000-8000-000000000003'
        const p1='30000000-0000-4000-8000-000000000001',p2='30000000-0000-4000-8000-000000000002',p3='30000000-0000-4000-8000-000000000003'
        const date='2026-11-27',nextDate='2026-11-28'
        const claim=(actor,calendarDay,protocolId)=>transaction(config,actor,c=>claimTrustedFreeCoachingDays(c,actor,[{calendarDay,protocolId}]))
        const freeRuns='app_private.clarity_course_runs',bindings='app_private.clarity_course_run_sessions',quota='app_private.coaching_free_session_days',leases='app_private.clarity_live_credential_windows'
        await db.query('insert into app.accounts values ($1,$2,$2)',[C,'active'])
        const addRun=(actor,id)=>as(actor,c=>c.query('insert into '+freeRuns+'(account_id,id,ordinal,access,revision,payload_ciphertext) values($1,$2,1,\'free\',1,\'synthetic ciphertext\')',[actor,id]))
        const bind=(actor,run,day,protocol)=>as(actor,c=>c.query('insert into '+bindings+'(account_id,course_run_id,course_day,protocol_id) values($1,$2,$3,$4)',[actor,run,day,protocol]))
        await addRun(A,runA);await addRun(B,runB);await addRun(C,runC)
        await bind(A,runA,1,p1);await bind(B,runB,1,p2);await bind(C,runC,1,p3)
        assert.equal((await as(A,c=>c.query('select id from '+freeRuns))).rows[0].id,runA)
        assert.equal((await as(B,c=>c.query('select id from '+freeRuns+' where id=$1',[runA]))).rowCount,0)
        assert.equal((await as(B,c=>c.query('select protocol_id from '+bindings+' where protocol_id=$1',[p1]))).rowCount,0)
        await assert.rejects(()=>as(B,c=>c.query('insert into '+bindings+'(account_id,course_run_id,course_day,protocol_id) values($1,$2,2,$3)',[A,runA,p3])),/row-level security/i)
        await assert.rejects(()=>bind(B,runA,2,p3),/foreign key/i)
        await assert.rejects(()=>bind(A,runA,2,p1),/unique constraint/i)
        await assert.rejects(()=>as(A,c=>c.query('update '+bindings+' set protocol_id=$1 where account_id=$2',[p3,A])),/permission denied/i)
        await assert.rejects(()=>as(A,c=>c.query('update '+freeRuns+' set ordinal=2 where id=$1',[runA])),/permission denied/i)
        assert.equal((await as(B,c=>c.query('update '+freeRuns+' set live_active=true where id=$1',[runA]))).rowCount,0)
        await as(A,c=>c.query('update '+freeRuns+' set live_active=true where id=$1',[runA]))
        const paid='20000000-0000-4000-8000-000000000004'
        await as(A,c=>c.query('insert into '+freeRuns+'(account_id,id,ordinal,access,revision,payload_ciphertext,payment_key) values($1,$2,2,\'paid\',0,\'synthetic ciphertext\',$3)',[A,paid,'d'.repeat(64)]))
        await assert.rejects(()=>as(A,c=>c.query('update '+freeRuns+' set live_active=true where id=$1',[paid])),/unique constraint/i)
        assert.equal((await as(A,c=>c.query('select id from '+freeRuns+' where live_active'))).rowCount,1)
        // Race two distinct logical sessions through the actual transaction and
        // shared quota function. Unique account/date + row visibility decides
        // one winner; the loser never consumes another day's slot.
        const quotaRace=await Promise.allSettled([claim(actorA,date,p1),claim(actorA,date,p2)])
        assert.equal(quotaRace.filter(x=>x.status==='fulfilled').length,1)
        assert.equal(quotaRace.find(x=>x.status==='rejected').reason.code,'COACHING_FREE_DAILY_LIMIT')
        const winner=(await as(A,c=>c.query('select protocol_id from '+quota+' where calendar_day=$1',[date]))).rows[0].protocol_id
        assert.ok([p1,p2].includes(winner))
        await claim(actorA,date,winner)
        await assert.rejects(()=>claim(actorA,date,winner===p1?p2:p1),{code:'COACHING_FREE_DAILY_LIMIT'})
        await claim(actorB,date,p2)
        assert.equal((await as(B,c=>c.query('select account_id from '+quota+' where account_id=$1',[A]))).rowCount,0)
        await assert.rejects(()=>as(B,c=>c.query('insert into '+quota+'(account_id,calendar_day,protocol_id) values($1,$2,$3)',[A,nextDate,p3])),/row-level security/i)
        await assert.rejects(()=>as(A,c=>c.query('update '+quota+' set protocol_id=$1 where account_id=$2',[p3,A])),/permission denied/i)
        await assert.rejects(()=>as(A,c=>c.query('delete from '+quota+' where account_id=$1',[A])),/permission denied/i)
        // A failure after a successful claim rolls the slot back atomically.
        await assert.rejects(()=>transaction(config,actorA,async c=>{
          await claimTrustedFreeCoachingDays(c,actorA,[{calendarDay:nextDate,protocolId:p3}])
          throw Error('synthetic rollback')
        }),/synthetic rollback/)
        assert.equal((await as(A,c=>c.query('select protocol_id from '+quota+' where calendar_day=$1',[nextDate]))).rowCount,0)
        await claim(actorA,nextDate,p3)
        // Real owner-lock + durable reservation race; no token mint, time
        // credit or enrollment. Synthetic candidates deliberately precede consent.
        const {reserveClarityCredentialInTransaction}=await import('../lib/app/clarity-course-runs.js')
        const {createClarityRun}=await import('../lib/coaching/clarity-course-runs.mjs')
        const candidate=(n)=>createClarityRun({id:'60000000-0000-4000-8000-00000000000'+n,ordinal:1,access:'free',createdAt:0,protocolIds:[p1,p2,p3]})
        const reserve=(actor,run)=>transaction(config,actor,c=>reserveClarityCredentialInTransaction(c,actor,run,{day:1,protocolId:p1}))
        const leaseRace=await Promise.allSettled([reserve(actorA,candidate(1)),reserve(actorA,candidate(2))])
        assert.equal(leaseRace.filter(x=>x.status==='fulfilled').length,1)
        assert.equal(leaseRace.find(x=>x.status==='rejected').reason.code,'CLARITY_CREDENTIAL_BUSY')
        const lease=leaseRace.find(x=>x.status==='fulfilled').value
        assert.equal(Date.parse(lease.expiresAt)-lease.now,1200000)
        assert.equal(Date.parse(lease.newSessionExpireTime)-lease.now,45000)
        assert.equal((await as(A,c=>c.query('select lease_id from '+leases))).rows[0].lease_id,lease.leaseId)
        await assert.rejects(()=>reserve(actorA,candidate(3)),{code:'CLARITY_CREDENTIAL_BUSY'})
        await reserve(actorB,candidate(4))
        assert.equal((await as(B,c=>c.query('select lease_id from '+leases+' where account_id=$1',[A]))).rowCount,0)
        assert.equal((await as(B,c=>c.query('update '+leases+' set possible_expires_at_ms=reserved_at_ms+1 where account_id=$1',[A]))).rowCount,0)
        await assert.rejects(()=>as(A,c=>c.query('delete from '+leases+' where account_id=$1',[A])),/permission denied/i)
        await assert.rejects(()=>as(A,c=>c.query('update '+leases+' set possible_expires_at_ms=reserved_at_ms+1200001 where account_id=$1',[A])),/check constraint/i)
        // Test an expired window without waiting for wall time: admin only,
        // on the disposable database. Production has no early release path.
        await db.query('update '+leases+' set reserved_at_ms=0,possible_expires_at_ms=1 where account_id=$1',[A])
        const replacement=await reserve(actorA,candidate(3))
        assert.notEqual(replacement.leaseId,lease.leaseId)
        assert.equal(replacement.previousCredentialExpiresAt,1)
        await reserve({id:C,claims:{sub:C}},candidate(5))
        await db.query("update app.accounts set status='inactive' where id=$1",[B])
        for(const table of [freeRuns,bindings,quota,leases])assert.equal((await as(B,c=>c.query('select * from '+table))).rowCount,0)
        await db.query("update app.accounts set status='active' where id=$1",[B])
        await claim({id:C,claims:{sub:C}},date,p3)
        await db.query('delete from app.accounts where id=$1',[C])
        for(const table of [freeRuns,bindings,quota,leases])assert.equal((await db.query('select * from '+table+' where account_id=$1',[C])).rowCount,0)
        // Anonymous and ordinary authenticated roles receive no table grants.
        for(const table of [freeRuns,bindings,quota,leases]){
          const privileges=(await db.query("select has_table_privilege('anon',$1,'SELECT') as anon_read,has_table_privilege('authenticated',$1,'SELECT') as authenticated_read,has_table_privilege('authenticated',$1,'INSERT') as authenticated_write",[table])).rows[0]
          assert.deepEqual(privileges,{anon_read:false,authenticated_read:false,authenticated_write:false})
        }
      }finally{await closeDatabase()}
    }finally{await db.end()}
  })
}
