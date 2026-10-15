import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {canAutoContinueSave,savedResourcePath} from '../lib/app/client-handoff.js'
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const sid='29e2a748-ea4c-4cb4-9561-5224482f9b44'

test('individual session saving requires an explicit account-specific confirmation',()=>{
  assert.equal(savedResourcePath('ru','client_session',sid),'/ru/app/sessions/'+sid)
  assert.equal(canAutoContinueSave({automatic:true,authStatus:'',intent:{sourceKind:'client_session',
    status:'pending',expired:false}}),false)
  assert.match(source('components/save-client-session-to-account.jsx'),/sourceKind:'client_session'/)
  assert.match(source('components/save-client-session-to-account.jsx'),/checked=\{consent\}/)
  assert.match(source('components/app/app-workspace.jsx'),/Save one consultation/)
  assert.match(source('components/app/app-workspace.jsx'),/No other client records/)
})
test('guest save requires viewer cookie, and cabinet save reauthorizes exact Session ID',()=>{
  const api=source('app/api/app/[...path]/route.js')
  assert.match(api,/readSessionViewerCookie\(request.cookies,\s*body.selector\)/)
  assert.match(api,/authorizeSessionGuest\(config,store,body.selector/)
  assert.match(api,/authorizeCabinetRequest\(body.selector\)/)
  assert.match(api,/getPublishedClientSession\(config,store,owner.client.id,body.sourceId\)/)
  assert.match(api,/commitSessionSaveIntent/)
  assert.doesNotMatch(source('lib/app/client-session-save-flow.js'),/bindLegacyClientToAccount/)
})
test('account has its own session list, reader, independent PDF and per-file authorization',()=>{
  const service=source('lib/app/client-session-save-flow.js')
  const media=source('app/api/app/saved-sessions/[id]/media/[assetId]/route.js')
  const pdf=source('app/api/app/saved-sessions/[id]/pdf/route.js')
  const page=source('app/[locale]/app/sessions/[id]/page.jsx')
  const client=source('components/client-session-page.jsx')
  assert.match(service,/sourceHash\(src\)!==intent.source_hash/)
  assert.match(service,/where app.saved_sessions.account_id=excluded.account_id/)
  assert.match(service,/published_revision!==ref.source_revision/)
  assert.match(media,/await readSavedSession\(config,getPrescriptionStore\(\),actor,id/)
  assert.match(media,/privateMediaStream/)
  assert.match(pdf,/await readSavedSession\(config,store,actor,id/)
  assert.match(page,/createRequestAuth/)
  assert.match(client,/mode==='saved'/)
  assert.match(source('components/app/personal-analysis-panel.jsx'),/SavedSessionsPanel/)
  assert.match(source('components/app/app-workspace.jsx'),/savedSessions=\{data.savedSessions \|\| \[\]\}/)
})
