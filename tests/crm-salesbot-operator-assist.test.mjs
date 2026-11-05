import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  SALESBOT_TEMPLATES, simulateSalesbotFlow, salesbotOfferPath,
} from '../lib/crm/salesbot-flow.mjs'
import {
  approvedSalesbotOperatorFlows, salesbotOperatorSuggestions,
} from '../lib/crm/salesbot-operator.mjs'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const id = '638c3828-90de-48c4-91a6-3c4b263600d1'
const approved = { id, status:'approved_preview', version:1, flow:SALESBOT_TEMPLATES[0] }

test('only valid, explicitly approved saved owner flows enter the manual reply helper', () => {
  assert.deepEqual(approvedSalesbotOperatorFlows([approved]).map(x => x.id), [id])
  assert.deepEqual(approvedSalesbotOperatorFlows([{...approved,status:'active_internal'}]).map(x => x.id), [id])
  assert.equal(approvedSalesbotOperatorFlows([{...approved,status:'draft'}]).length, 0)
  assert.equal(approvedSalesbotOperatorFlows([{...approved,status:'paused'}]).length, 0)
  assert.equal(approvedSalesbotOperatorFlows([{...approved,version:0}]).length, 0)
  assert.equal(approvedSalesbotOperatorFlows([{...approved,id:'not-an-id'}]).length, 0)
  assert.equal(approvedSalesbotOperatorFlows([{...approved,flow:{...approved.flow,nodes:[]}}]).length, 0)
  assert.equal(approvedSalesbotOperatorFlows([{...approved,flow:{...approved.flow,
    autoSend:true}}]).length, 0)
  assert.deepEqual(approvedSalesbotOperatorFlows(null), [])
})

test('simulated branches yield deterministic EN/RU/ES drafts; never a sent message', () => {
  for(const locale of ['en','ru','es']) {
    const waiting = simulateSalesbotFlow(SALESBOT_TEMPLATES[0], { locale })
    const waitingReplies = salesbotOperatorSuggestions(waiting, locale)
    assert.deepEqual(waitingReplies.map(x=>x.kind), ['message','choice'])
    const accepted = simulateSalesbotFlow(SALESBOT_TEMPLATES[0], {
      locale, answers:{choice:'session'},
    })
    const replies = salesbotOperatorSuggestions(accepted, locale)
    assert.deepEqual(replies.map(x=>x.kind), ['message','choice','offer'])
    const offer = replies.find(x=>x.kind==='offer')
    assert.equal(offer.text.endsWith('https://holistichouse.vercel.app' +
      salesbotOfferPath('consultation',locale)), true)
    assert.equal(accepted.sent, false)
    assert.equal(accepted.leadCreated, false)
    assert.equal(accepted.paymentReceived, false)
  }
})

test('fake send flags, forged URLs, malformed traces, hidden handoffs never enter a reply', () => {
  const base = simulateSalesbotFlow(SALESBOT_TEMPLATES[0], {
    locale:'en', answers:{choice:'session'},
  })
  assert.deepEqual(salesbotOperatorSuggestions({...base,sent:true},'en'), [])
  assert.deepEqual(salesbotOperatorSuggestions({...base,bookingConfirmed:true},'en'), [])
  assert.deepEqual(salesbotOperatorSuggestions({...base,mode:'live'},'en'), [])
  assert.deepEqual(salesbotOperatorSuggestions({...base,status:'executing'},'en'), [])
  assert.deepEqual(salesbotOperatorSuggestions({...base,trace:null},'en'), [])
  assert.deepEqual(salesbotOperatorSuggestions(base,'zz'), [])
  const withEvilLink = structuredClone(base)
  withEvilLink.trace.find(x=>x.kind==='offer').href = 'https://evil.invalid/private-token'
  const offer = salesbotOperatorSuggestions(withEvilLink,'en').find(x=>x.kind==='offer')
  assert.ok(offer.text.includes('https://holistichouse.vercel.app/en/services'))
  assert.ok(!offer.text.includes('evil.invalid'))
  const manualHandoff = simulateSalesbotFlow(SALESBOT_TEMPLATES[2], { locale:'en' })
  assert.ok(manualHandoff.trace.some(x=>x.kind==='handoff'))
  assert.ok(!salesbotOperatorSuggestions(manualHandoff,'en').some(x=>x.kind==='handoff'))
})

test('the existing secured CRM endpoints are reused; no separate bot, mass send or background enrollment', () => {
  const ui = read('components/app/crm-salesbot-assist.jsx')
  const crm = read('components/app/crm-messenger.jsx')
  const endpoint = read('app/api/app/crm/salesbot/drafts/route.js')
  const manual = read('app/api/app/crm/salesbot/route.js')
  assert.match(ui,/\/api\/app\/crm\/salesbot\/drafts/)
  assert.match(ui,/\/api\/app\/crm\/salesbot'/)
  assert.match(ui,/X-HH-Account-Id/)
  assert.match(ui,/credentials: 'same-origin'/)
  assert.match(ui,/AbortController/)
  assert.match(ui,/data-salesbot-operator-mode="manual-only"/)
  assert.match(ui,/onInsert\?\.\(item\.text\)/)
  assert.doesNotMatch(ui,/\/api\/app\/crm\/messenger|action:'send'|action:"send"/)
  assert.match(crm,/import CrmSalesbotAssist from/)
  assert.match(crm,/pendingRequest\.current=null[\s\S]{0,60}setText\(draft\)/)
  assert.match(crm,/activeRef\.current!==selected\.id/)
  assert.match(crm,/!window\.confirm/)
  assert.match(crm,/type="button" onClick=\{send\}/)
  assert.match(endpoint,/sendsEnabled: false/)
  assert.match(manual,/ONLY simulation/)
})
