import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {canAutoContinueSave,savedResourcePath} from '../lib/app/client-handoff.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const ID='30000000-0000-4000-8000-000000000001'

test('a single consultation requires an explicit post-Google confirmation',()=>{
  assert.equal(savedResourcePath('ru','client_session',ID),'/ru/app/sessions/'+ID)
  assert.equal(canAutoContinueSave({automatic:true,authStatus:'',
    intent:{sourceKind:'client_session',status:'pending',expired:false}}),false)
  assert.throws(()=>savedResourcePath('en','client_session','../client-records'))
})

test('save intent is scoped by active one-session viewer and never a whole-cabinet bearer',()=>{
 const api=read('app/api/app/[...path]/route.js')
 const access=read('lib/clients/session-delivery-access.js')
 const save=read('lib/app/session-save-flow.js')
 const button=read('components/save-session-to-cabinet.jsx')
 assert.match(api,/authorizeSessionGuest\(config,store,body.selector/)
 assert.match(api,/readSessionViewerCookie\(request.cookies,body.selector\)/)
 assert.match(api,/createSessionSaveIntent\(config,access,body.operationId/)
 assert.match(api,/commitSessionSaveIntent\(config,getPrescriptionStore\(\),actor,path\[1\],proof\)/)
 assert.match(access,/grantId:grant.id,accessVersion:grant.access_version/)
 assert.match(save,/g.revoked_at is null and g.expires_at>now\(\)/)
 assert.match(save,/source.published_revision!==intent.source_revision/)
 assert.match(save,/source_session_grant_id/)
 assert.doesNotMatch(save,/bindLegacyClientToAccount/)
 assert.match(button,/sourceKind:'client_session',selector,operationId:crypto.randomUUID\(\)/)
 assert.doesNotMatch(button,/auto=1/)
})
test('saved viewer validates Google Account on every media/PDF request',()=>{
 const page=read('app/[locale]/app/sessions/[id]/page.jsx')
 const stream=read('app/api/app/saved-sessions/[id]/media/[assetId]/route.js')
 const pdf=read('app/api/app/saved-sessions/[id]/pdf/route.js')
 const service=read('lib/app/session-save-flow.js')
 const model=read('components/client-session-page.jsx')
 for(const src of [page,stream,pdf])assert.match(src,/readSavedSession/)
 for(const src of [stream,pdf])assert.match(src,/createRequestAuth\(request,config\).verified\(\)/)
 assert.match(service,/where id=\$1 and account_id=\$2 and removed_at is null/)
 assert.match(service,/getPublishedClientSession\(config,store,ref.legacy_client_id,ref.session_id\)/)
 assert.match(stream,/session.media.some\(item=>item.assetId===assetId&&item.scope==='client'\)/)
 assert.match(pdf,/getPublishedSessionReport/)
 assert.match(model,/mode==='saved'/)
 assert.match(model,/SaveSessionToCabinet/)
})
test('account archive only lists individual saved session IDs and supports separate removal',()=>{
 const repo=read('lib/app/repository.js')
 const profile=read('components/app/profile-domains.jsx')
 const workspace=read('components/app/app-workspace.jsx')
 const migration=read('sql/client-session-account-save-20261015.sql')
 assert.match(repo,/from app.saved_sessions where account_id=\$1 and removed_at is null/)
 assert.match(profile,/savedSessions.length>0/)
 assert.match(workspace,/savedSessions=\{data.savedSessions/)
 assert.match(workspace,/intent\?\.sourceKind === 'client_session'/)
 assert.match(migration,/UNIQUE\(id,legacy_client_id,session_id\)/)
 assert.match(migration,/saved_sessions_source_owner/)
 assert.match(migration,/source_kind='client_session'/)
 assert.match(migration,/own_saved_sessions_select/)
 assert.match(migration,/source_session_access_version/)
 assert.match(read('components/app/saved-session-management.jsx'),/saved-sessions\/'\+encodeURIComponent\(id\)\+'\/remove'/)
})
