/**
 * Actual two-account RLS acceptance against the EXISTING disposable App R1
 * PostgreSQL CI service. Never connects to production, Supabase, Vercel,
 * non-loopback hosts or arbitrary DB names. Adds no new workflow or runner.
 */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {actor,rawAs} from '../tests/helpers/app-db-setup.mjs'

const adminUrl=process.env.HH_TEST_ADMIN_DATABASE_URL||''
const appUrl=process.env.HH_APP_DATABASE_URL||''
let isolated=false
try {
 const a=new URL(adminUrl),b=new URL(appUrl)
 isolated=process.env.CI==='true' && process.env.HH_APP_TEST_RUNTIME==='isolated' &&
  !process.env.VERCEL && !process.env.VERCEL_ENV &&
  ['127.0.0.1','localhost'].includes(a.hostname) &&
  ['127.0.0.1','localhost'].includes(b.hostname) &&
  a.pathname==='/hh_app_test' && b.pathname==='/hh_app_test' &&
  b.username==='hh_app_ci_login'
} catch {}
if(!isolated)throw Error('ISOLATED_COMMUNITY_VIDEO_POSTGRES_REQUIRED')

const A='7c000001-0000-4000-8000-000000000001'
const B='7c000002-0000-4000-8000-000000000002'
const C='7c000003-0000-4000-8000-000000000003'
const SA='7d000001-0000-4000-8000-000000000001'
const SB='7d000002-0000-4000-8000-000000000002'
const VA='7e000001-0000-4000-8000-000000000001'
const VB='7e000002-0000-4000-8000-000000000002'
const VC='7e000003-0000-4000-8000-000000000003'
const a=actor(A,SA),b=actor(B,SB)
const db=new pg.Client({connectionString:adminUrl})
await db.connect()
try {
 const existing=await db.query(`select to_regclass('app_private.community_video_publications') as publication,
  to_regclass('app_private.personal_videos') as source`)
 if(existing.rows[0].publication)throw Error('COMMUNITY_SCHEMA_NOT_FRESH')
 if(!existing.rows[0].source){
  const sourceSql=await readFile(new URL('../supabase/migrations/20261028161029_hh_account_personal_videos_private_20261028.sql',import.meta.url),'utf8')
  await db.query(sourceSql)
 }
 const sql=await readFile(new URL('../supabase/migrations/20261106231500_hh_community_video_publishing_v2.sql',import.meta.url),'utf8')
 if(!sql.includes('force row level security')||!sql.includes('source_video_id uuid not null unique')||
  !sql.includes('community_publication_own_select'))throw Error('UNREVIEWED_COMMUNITY_VIDEO_MIGRATION')
 await db.query(sql)
 const force=await db.query(`select relname,relrowsecurity,relforcerowsecurity
  from pg_class where oid in (
   'app_private.community_video_authors'::regclass,
   'app_private.community_video_publications'::regclass,
   'app_private.community_video_upload_attempts'::regclass,
   'app_private.community_youtube_oauth'::regclass,
   'app_private.community_video_audit'::regclass)`)
 assert.equal(force.rowCount,5)
 assert.ok(force.rows.every(row=>row.relrowsecurity===true&&row.relforcerowsecurity===true))
 for(const table of ['community_video_authors','community_video_publications',
   'community_video_upload_attempts','community_youtube_oauth','community_video_audit']){
  for(const role of ['anon','authenticated','hh_app_inbox']){
   const p=await db.query('select has_table_privilege($1,$2,\'SELECT\') as can_read',
    [role,'app_private.'+table])
   assert.equal(p.rows[0].can_read,false,role+' forbidden from '+table)
  }
 }
 const users=await db.query('select id from auth.users where id=any($1::uuid[])',[[A,B]])
 assert.equal(users.rowCount,0,'fresh synthetic user ids required')
 await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',
  [A,'community-a@example.invalid',B,'community-b@example.invalid'])
 await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)',[SA,A,SB,B])
 await db.query(`insert into app.accounts(id,status,onboarding_state)
  values($1,'active','active'),($2,'active','active'),($3,'active','active')`,[A,B,C])
 for(const [accountId,videoId] of [[A,VA],[B,VB],[B,VC]]){
  await db.query(`insert into app_private.personal_videos
   (id,account_id,theme,scene_id,aspect,duration_seconds,bytes,object_key,status,ready_at)
   values($1,$2,'energy','sun-rise','landscape',20,10000,$3,'ready',now())`,
   [videoId,accountId,`personal-videos/${accountId}/${videoId}/master.mp4`])
 }
} finally {await db.end()}

const insertPublication=async (db,owner,video)=>db.query(`insert into app_private.community_video_publications
 (owner_account_id,source_video_id,source_sha256,source_bytes,source_aspect,
  source_duration_seconds,title,description,author_display_name,author_profile_url,
  audio_language,visibility,contains_synthetic_media,made_for_kids,metadata_hash,
  consent_policy_version,rights_confirmed_at,privacy_reviewed_at,youtube_consent_at)
 values($1,$2,repeat('a',64),10000,'landscape',20,'Synthetic fixture','',
  'Synthetic creator','https://holistichouse.vercel.app/en/creators/'||$1::text,
  'en','link_only',false,'no',repeat('b',64),'hh-community-youtube-v2',now(),now(),now()) returning id`,
 [owner,video])

await rawAs(a,'hh_app_backend',async client=>{
 assert.equal((await client.query('select count(*)::int n from app_private.community_video_authors')).rows[0].n,0)
 await client.query('insert into app_private.community_video_authors(account_id,display_name) values($1,$2)',[A,'Creator A'])
 await insertPublication(client,A,VA)
 assert.equal((await client.query('select count(*)::int n from app_private.community_video_publications')).rows[0].n,1)
 assert.equal((await client.query('select count(*)::int n from app_private.personal_videos')).rows[0].n,1)
})
await rawAs(b,'hh_app_backend',async client=>{
 assert.equal((await client.query('select count(*)::int n from app_private.community_video_publications')).rows[0].n,0,
  'B must NOT read A publication')
 assert.equal((await client.query('select count(*)::int n from app_private.community_video_authors')).rows[0].n,0,
  'B must NOT read A author row')
 assert.equal((await client.query('select count(*)::int n from app_private.personal_videos')).rows[0].n,2,
  'B must see only its two private final MP4 fixtures')
 await client.query('insert into app_private.community_video_authors(account_id,display_name) values($1,$2)',[B,'Creator B'])
 await insertPublication(client,B,VB)
 assert.equal((await client.query('select count(*)::int n from app_private.community_video_publications')).rows[0].n,1)
 assert.equal((await client.query('update app_private.community_video_publications set title=$1 where owner_account_id=$2',
  ['Hijack',A])).rowCount,0,'B cannot mutate A state')
 assert.equal((await client.query('select count(*)::int n from app_private.community_video_upload_attempts')).rows[0].n,0)
 assert.equal((await client.query('select count(*)::int n from app_private.community_youtube_oauth')).rows[0].n,0)
})
await assert.rejects(()=>rawAs(b,'hh_app_backend',client=>insertPublication(client,A,VC)),
 /row-level security|permission denied/i,'forged owner must be denied')
await assert.rejects(()=>rawAs(b,'hh_app_backend',client=>client.query(
 'insert into app_private.community_video_authors(account_id,display_name) values($1,$2)',[C,'Forged'])),
 /row-level security|permission denied|duplicate key/i,'forged author must be denied')
await assert.rejects(()=>rawAs(a,'authenticated',client=>client.query(
 'select * from app_private.community_video_publications')),
 /permission denied/i,'Supabase client role has no read grant')
await rawAs(a,'hh_app_backend',async client=>{
 assert.equal((await client.query('select count(*)::int n from app_private.community_video_publications')).rows[0].n,1)
 assert.equal((await client.query('select count(*)::int n from app_private.community_video_authors')).rows[0].n,1)
})
console.log('HH_COMMUNITY_VIDEO_PG17_TWO_ACCOUNTS_FORCE_RLS_PASS')