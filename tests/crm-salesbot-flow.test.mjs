import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  SALESBOT_TEMPLATES, SALESBOT_OFFER_IDS, SALESBOT_LOCALES,
  salesbotOfferPath, validateSalesbotFlow, simulateSalesbotFlow,
} from '../lib/crm/salesbot-flow.mjs'

const clone = value => JSON.parse(JSON.stringify(value))
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('all shipped templates validate, pause or finish, and cannot create anything', () => {
  for (const flow of SALESBOT_TEMPLATES) {
    assert.deepEqual(validateSalesbotFlow(flow), flow)
    for (const locale of SALESBOT_LOCALES) {
      const preview = simulateSalesbotFlow(flow, { locale })
      assert.equal(preview.mode, 'dry_run')
      assert.equal(preview.sent, false)
      assert.equal(preview.leadCreated, false)
      assert.equal(preview.bookingConfirmed, false)
      assert.equal(preview.paymentReceived, false)
      assert.ok(preview.trace.length > 0)
      if (preview.waiting) {
        assert.equal(preview.status, 'waiting_for_choice')
        for (const option of preview.waiting.options) {
          const answered = simulateSalesbotFlow(flow, {
            locale, answers: { [preview.waiting.nodeId]: option.id },
          })
          assert.equal(answered.status, 'completed')
          assert.equal(answered.sent, false)
          assert.equal(answered.leadCreated, false)
        }
      } else assert.equal(preview.status, 'completed')
    }
  }
})

test('customer choices are explicit and never create a lead from a click', () => {
  const flow = SALESBOT_TEMPLATES[0]
  const waiting = simulateSalesbotFlow(flow, { locale: 'ru' })
  assert.equal(waiting.status, 'waiting_for_choice')
  assert.equal(waiting.waiting.nodeId, 'choice')
  const free = simulateSalesbotFlow(flow, { locale: 'ru', answers: { choice: 'review' } })
  const paid = simulateSalesbotFlow(flow, { locale: 'en', answers: { choice: 'session' } })
  assert.equal(free.trace.find(x => x.kind === 'offer').href, '/ru/services/free-situation-review')
  assert.equal(paid.trace.find(x => x.kind === 'offer').href, '/en/services#consultation')
  assert.deepEqual(paid.trace.map(x => x.kind), ['message', 'choice', 'offer', 'end'])
  assert.equal(paid.leadCreated, false)
  assert.equal(paid.paymentReceived, false)
  assert.equal(paid.bookingConfirmed, false)
})

test('offer destinations use only trusted existing routes, without URL injection', () => {
  assert.deepEqual(SALESBOT_OFFER_IDS, ['free_review', 'consultation', 'tests', 'business', 'academy'])
  assert.equal(salesbotOfferPath('tests', 'es'), '/en/client/tests')
  assert.equal(salesbotOfferPath('business', 'es'), '/en/app/business')
  assert.equal(salesbotOfferPath('academy', 'ru'), '/ru/academy')
  assert.throws(() => salesbotOfferPath('https://evil.example/?token=secret'), /INVALID_SALESBOT_OFFER/)
})

test('graph uses deterministic topic branch and non-executable owner preview handoff', () => {
  const graph = {
    schemaVersion: 1, id: 'triage', title: { en: 'Triage', ru: 'Выбор', es: 'Orientación' }, start: 'start',
    nodes: [
      { id: 'start', type: 'start', next: 'branch' },
      { id: 'branch', type: 'branch', field: 'topic', equals: 'work', yes: 'business', no: 'human' },
      { id: 'business', type: 'offer', text: { en: 'Business course', ru: 'Бизнес', es: 'Negocios' },
        offer: 'business', next: 'done' },
      { id: 'human', type: 'handoff', text: { en: 'Manual review', ru: 'Проверка', es: 'Revisión' }, next: 'done' },
      { id: 'done', type: 'end', text: { en: 'Finish', ru: 'Конец', es: 'Fin' } },
    ],
  }
  assert.equal(simulateSalesbotFlow(graph, { topic: 'work' }).trace[0].kind, 'offer')
  const manual = simulateSalesbotFlow(graph, { topic: 'stress' })
  assert.equal(manual.trace[0].kind, 'handoff')
  assert.equal(manual.trace[0].action, 'owner_manual_review_preview')
  assert.equal(manual.leadCreated, false)
})

test('invalid scripts, arbitrary HTTP nodes, send actions and unknown keys fail closed', () => {
  for (const type of ['send', 'http', 'script', 'payment', 'ai', '__proto__']) {
    const flow = clone(SALESBOT_TEMPLATES[2])
    flow.nodes[1].type = type
    assert.throws(() => validateSalesbotFlow(flow), /INVALID_SALESBOT_NODE_TYPE/)
  }
  const extra = clone(SALESBOT_TEMPLATES[2])
  extra.nodes[1].webhook = 'https://evil.example'
  assert.throws(() => validateSalesbotFlow(extra), /INVALID_SALESBOT_GRAPH/)
  const extras = clone(SALESBOT_TEMPLATES[2])
  extras.nodes[1].purpose = 'broadcast'
  assert.throws(() => validateSalesbotFlow(extras), /INVALID_SALESBOT_GRAPH/)
  const badOffer = clone(SALESBOT_TEMPLATES[0])
  badOffer.nodes.find(x => x.id === 'free').offer = '/evil'
  assert.throws(() => validateSalesbotFlow(badOffer), /INVALID_SALESBOT_OFFER/)
})

test('duplicate IDs, edges, orphan branches and cycles are rejected before execution', () => {
  const make = () => clone(SALESBOT_TEMPLATES[0])
  const duplicate = make(); duplicate.nodes[3].id = 'choice'
  assert.throws(() => validateSalesbotFlow(duplicate), /DUPLICATE_SALESBOT_NODE/)
  const missing = make(); missing.nodes[3].next = 'missing'
  assert.throws(() => validateSalesbotFlow(missing), /MISSING_SALESBOT_EDGE/)
  const orphan = make(); orphan.nodes[2].options = orphan.nodes[2].options.slice(0, 1)
  assert.throws(() => validateSalesbotFlow(orphan), /INVALID_SALESBOT_CHOICES/)
  const cycle = make(); cycle.nodes.find(x => x.id === 'free').next = 'choice'
  assert.throws(() => validateSalesbotFlow(cycle), /SALESBOT_CYCLE/)
  const noTerminal = make(); noTerminal.nodes.find(x => x.id === 'done').type = 'say'
  noTerminal.nodes.find(x => x.id === 'done').next = 'start'
  assert.throws(() => validateSalesbotFlow(noTerminal), /INVALID_SALESBOT_TERMINAL/)
  const tooMany = make()
  tooMany.nodes = [...tooMany.nodes, ...Array.from({ length: 25 }, (_, index) => ({
    id: 'extra' + index, type: 'end', text: { en: 'x', ru: 'x', es: 'x' },
  }))]
  assert.throws(() => validateSalesbotFlow(tooMany), /INVALID_SALESBOT_NODE_COUNT/)
})

test('translations, untrusted choices, forged input and sensitive free text are not exported', () => {
  const make = () => clone(SALESBOT_TEMPLATES[0])
  const locale = make(); delete locale.nodes[1].text.es
  assert.throws(() => validateSalesbotFlow(locale), /INVALID_SALESBOT_COPY/)
  const bad = make(); bad.nodes[1].text.en = 'x'.repeat(361)
  assert.throws(() => validateSalesbotFlow(bad), /INVALID_SALESBOT_COPY/)
  const newline = make(); newline.nodes[1].text.en = 'hi\u0000there'
  assert.throws(() => validateSalesbotFlow(newline), /INVALID_SALESBOT_COPY/)
  assert.throws(() => simulateSalesbotFlow(make(), { answers: { choice: 'fake' } }),
    /INVALID_SALESBOT_CHOICE_ANSWER/)
  assert.throws(() => simulateSalesbotFlow(make(), { answers: { other: 'review' } }),
    /INVALID_SALESBOT_ANSWERS/)
  assert.throws(() => simulateSalesbotFlow(make(), { locale: 'fr' }), /INVALID_SALESBOT_LOCALE/)
  assert.throws(() => simulateSalesbotFlow(make(), { question: 'my personal health details' }),
    /INVALID_SALESBOT_INPUT/)
  assert.ok(!JSON.stringify(simulateSalesbotFlow(make())).includes('my personal health details'))
})

test('CRM UI and simulator API use the existing authenticated practitioner boundary', () => {
  const route = read('app/api/app/crm/salesbot/route.js')
  assert.match(route, /createRequestAuth/)
  assert.match(route, /auth\.verified\(\)/)
  assert.match(route, /practitionerEmailAllowed\(actor\)/)
  assert.match(route, /requireSameOrigin/)
  assert.match(route, /x-hh-account-id/)
  assert.match(route, /simulateSalesbotFlow/)
  assert.doesNotMatch(route, /sendOneMessengerMessage|sendCrmSms|sendCrmMessage|createPublicServiceEnquiry/)
  const manager = read('components/app/crm-manager.jsx')
  assert.match(manager, /CrmSalesbot/)
  assert.match(manager, /'automations'/)
  const client = read('components/app/crm-salesbot.jsx')
  assert.match(client, /mode.*dry_run|dry.run|preview|Предпросмотр/)
  assert.doesNotMatch(client, /sendOneMessengerMessage|createPublicServiceEnquiry/)
})
