import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateExpressReportTransition} from '../lib/practitioners/express-report-contracts.js'
import {expressReportNeutralNotice,expressReportCabinetUrl} from '../lib/app/express-report-notice.mjs'
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8')

test('report link notifications never include report id, content, session token or client private data',()=>{
  for(const locale of ['en','ru','es']){
    const text=expressReportNeutralNotice(locale)
    assert.match(text,/Holistic House/)
    assert.ok(text.endsWith(expressReportCabinetUrl(locale)))
    assert.match(text,/https:\/\/holistichouse\.vercel\.app\/(en|ru|es)\/app\/reports$/)
    assert.ok(!text.includes('?')&&!text.includes('#'))
    assert.ok(!text.includes('12345678-'))
  }
})

test('send action is explicit and validates a revision; no unapproved transitions',()=>{
  assert.deepEqual(validateExpressReportTransition({action:'send',expectedRevision:1}),
    {action:'send',expectedRevision:1})
  assert.throws(()=>validateExpressReportTransition({action:'dispatch',expectedRevision:1}),/INVALID_REPORT_ACTION/)
})

test('claimed guest report flow checks verified linkage, never contact similarity',()=>{
  const repository=read('lib/practitioners/express-report-repository.js')
  const claim=read('app/api/free-express/claim/route.js')
  const practice=read('lib/practitioners/repository.js')
  const migration=read('supabase/migrations/20261026162258_hh_express_report_claimed_enquiry_delivery.sql')
  assert.match(repository,/JOIN app_private\.free_express_account_links l ON l\.enquiry_id=e\.id/)
  assert.match(repository,/l\.recipient_practitioner_id=p\.id/)
  assert.match(repository,/record\.public_enquiry_id/)
  assert.match(repository,/sent_at=CASE WHEN/)
  assert.match(claim,/recipient_practitioner_id/)
  assert.match(practice,/reportEligible:claimedIds\.has/)
  assert.match(migration,/hh_express_report_exactly_one_request/)
  assert.match(migration,/FORCE ROW LEVEL SECURITY/)
  assert.match(migration,/free_express_account_links_practitioner_read/)
  assert.doesNotMatch(repository,/WHERE.*email_hash.*client_account_id/)
})

test('the sent report also appears in first-party inbox, never as unverified Telegram delivery',()=>{
  const dispatcher=read('lib/app/express-report-telegram-dispatch.js')
  const api=read('app/api/app/[...path]/route.js')
  const messages=read('components/app/direct-message-inbox.jsx')
  const report=read('components/app/practice-express-reports.jsx')
  assert.match(dispatcher,/telegramClientSendReady/)
  assert.match(dispatcher,/express_report_tg_claim/)
  assert.match(dispatcher,/express_report_tg_allowed/)
  assert.match(dispatcher,/express_report_tg_finish/)
  assert.match(api,/result\.dispatchRequested === true/)
  assert.match(messages,/ClientExpressReportNotices/)
  assert.match(report,/perform\('send'\)/)
  assert.match(report,/current\.sentAt/)
})
