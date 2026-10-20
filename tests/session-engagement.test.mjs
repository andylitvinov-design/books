import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {parseEngagementCommand,ENGAGEMENT_ACTIONS} from '../lib/clients/session-engagement-policy.mjs'
const id='27ae6df2-d975-455d-8f72-59d92bf17f6f'
const viewer='b834911c-c70a-4c66-9fa9-7016f1fcc719'
const grant='b834911c-c70a-4c66-9fa9-7016f1fcc720'
const session='b834911c-c70a-4c66-9fa9-7016f1fcc721'
const client='b834911c-c70a-4c66-9fa9-7016f1fcc722'

test('only minimal allowlisted actions, without private identifiers or text',()=>{
  assert.equal(ENGAGEMENT_ACTIONS.includes('opened'),true)
  assert.deepEqual(parseEngagementCommand({op:'consent',accepted:false}),{op:'consent',accepted:false})
  assert.deepEqual(parseEngagementCommand({op:'event',id,kind:'active',seconds:30}),
    {op:'event',id,kind:'active',seconds:30})
  for(const event of [
    {op:'event',id,kind:'health_test',seconds:0},
    {op:'event',id,kind:'active',seconds:61},
    {op:'event',id,kind:'opened',seconds:1},
    {op:'event',id,kind:'tests',url:'/private/my-report',seconds:0},
    {op:'event',id,kind:'tests',email:'private@example.com'},
    {op:'event',id,kind:'report_diagnosis'},
    {op:'event',id:'../bad',kind:'opened'},
    {op:'consent',accepted:true,source:'hidden'},
    {op:'consent',accepted:'true'}
  ])assert.throws(()=>parseEngagementCommand(event),event.kind)
})

test('server never records without consent, and revocation purges the same viewer',async()=>{
  const src=await readFile(new URL('../lib/clients/session-engagement.js',import.meta.url),'utf8')
  class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
  let accepted=null,deleted=0,writes=0,queries=[]
  const transaction=async(_cfg,_actor,fn)=>fn({query:async(sql,args)=>{
    queries.push(sql)
    if(sql.includes('select accepted from'))return {rows:accepted===null?[]:[{accepted}]}
    if(sql.includes('insert into app_private.client_session_engagement_consents')){accepted=args[2];return {rows:[]}}
    if(sql.includes('update app_private.client_session_engagement_consents')){accepted=args[2];return {rows:[]}}
    if(sql.includes('delete from app_private.client_session_engagement_events')){deleted++;return {rows:[]}}
    if(sql.includes('insert into app_private.client_session_engagement_events')){writes++;return {rows:[]}}
    return {rows:[]}
  }})
  const make=new Function('transaction','AppError','validUuid','parseEngagementCommand','ENGAGEMENT_NOTICE_VERSION',
    src.replace(/^import .*\n/gm,'').replace(/export /g,'')+
    '\nreturn {writeShareEngagement,readShareEngagementConsent}')
  const {writeShareEngagement,readShareEngagementConsent}=make(transaction,AppError,
    value=>[viewer,grant,session,client].includes(value),parseEngagementCommand,'hh-session-engagement-v1')
  const access={grantId:grant,sessionId:session,clientId:client}
  assert.equal(await readShareEngagementConsent({},access,viewer),false)
  await assert.rejects(writeShareEngagement({},access,viewer,{op:'event',id,kind:'opened'}),{code:'ENGAGEMENT_CONSENT_REQUIRED'})
  assert.equal(writes,0)
  await writeShareEngagement({},access,viewer,{op:'consent',accepted:true})
  assert.equal(await readShareEngagementConsent({},access,viewer),true)
  await writeShareEngagement({},access,viewer,{op:'event',id,kind:'opened'})
  assert.equal(writes,1)
  await writeShareEngagement({},access,viewer,{op:'consent',accepted:false})
  assert.equal(deleted,1)
  assert.equal(await readShareEngagementConsent({},access,viewer),false)
  await assert.rejects(writeShareEngagement({},access,viewer,{op:'event',id,kind:'opened'}),{code:'ENGAGEMENT_CONSENT_REQUIRED'})
  assert.equal(writes,1)
  assert.ok(queries.some(query=>query.includes('for update')))
})

test('protected routes, least-privilege migration, no impression pixels and daily expiry',async()=>{
 const root=new URL('../',import.meta.url)
 const read=path=>readFile(new URL(path,root),'utf8')
 const [route,owner,migration,cleanup,ui]=await Promise.all([
   read('app/api/client-session-viewer/[selector]/engagement/route.js'),
   read('app/api/admin/clients/[id]/sessions/[sessionId]/engagement/route.js'),
   read('supabase/migrations/20261020191500_hh_report_engagement_opt_in.sql'),
   read('lib/app/maintenance.js'),read('components/client-session-engagement.jsx'),
 ])
 assert.match(route,/authorizeSessionGuest/)
 assert.match(route,/readSessionViewerCookie/)
 assert.match(route,/smallJson\(request,512\)/)
 assert.match(owner,/ownerDelivery/)
 assert.match(owner,/getOwnerSession/)
 for(const fragment of ['force row level security','revoke all','hh_app_backend','active_seconds','viewer_id','grant_id']) assert.ok(migration.includes(fragment),fragment)
 assert.match(cleanup,/client_session_engagement_events/)
 assert.match(cleanup,/interval '90 days'/)
 assert.match(ui,/mode|consent|accepted/)
 assert.doesNotMatch(route+owner+ui,/gtag|dataLayer|facebook\.com\/tr|fbq\(/)
})
