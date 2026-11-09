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
      }finally{await closeDatabase()}
    }finally{await db.end()}
  })
}
