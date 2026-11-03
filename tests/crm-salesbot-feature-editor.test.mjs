import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  SALESBOT_TEMPLATES, simulateSalesbotFlow, validateSalesbotFlow,
} from '../lib/crm/salesbot-flow.mjs'
import {
  SALESBOT_EDITOR_NODE_TYPES, salesbotEditorEdges, insertSalesbotStep,
  addSalesbotChoice, removeSalesbotChoice, setSalesbotTopicCondition,
  setSalesbotOfferTarget, removeSalesbotLinearStep, importSalesbotJson,
} from '../lib/crm/salesbot-editor.mjs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const clone = value => JSON.parse(JSON.stringify(value))

test('clean-room step editor exposes only safe node types', () => {
  assert.deepEqual(SALESBOT_EDITOR_NODE_TYPES, ['say', 'choice', 'branch', 'offer', 'handoff'])
  for (const t of ['send', 'email', 'webhook', 'script', 'javascript', 'payment', 'ai']) {
    assert.throws(() => insertSalesbotStep(SALESBOT_TEMPLATES[0],
      { nodeId: 'welcome', slot: 'next', type: t }), /INVALID_SALESBOT_EDITOR_TYPE/)
  }
})

test('insert message along exactly one path with safe default copy in all languages', () => {
  const baseline = clone(SALESBOT_TEMPLATES[0])
  const { flow, selectedNodeId } = insertSalesbotStep(baseline,
    { nodeId: 'welcome', slot: 'next', type: 'say' })
  assert.notEqual(flow, baseline)
  assert.equal(baseline.nodes.length + 1, flow.nodes.length)
  assert.ok(selectedNodeId.startsWith('step_'))
  const node = flow.nodes.find(x => x.id === selectedNodeId)
  assert.deepEqual(Object.keys(node.text).sort(), ['en', 'es', 'ru'])
  assert.equal(node.next, 'choice')
  assert.equal(flow.nodes.find(x => x.id === 'welcome').next, selectedNodeId)
  assert.equal(simulateSalesbotFlow(flow).trace[1].kind, 'message')
  assert.deepEqual(validateSalesbotFlow(flow), flow)
})

test('choice can be introduced into an existing linear path and extend each answer branch', () => {
  const first = insertSalesbotStep(SALESBOT_TEMPLATES[2],
    { nodeId: 'intro', slot: 'next', type: 'choice' })
  const choice = first.flow.nodes.find(x => x.id === first.selectedNodeId)
  assert.deepEqual(salesbotEditorEdges(choice),
    ['choice:option_1', 'choice:option_2'])
  const second = insertSalesbotStep(first.flow, {
    nodeId: choice.id, slot: 'choice:option_2', type: 'offer',
  })
  const waiting = simulateSalesbotFlow(second.flow)
  assert.equal(waiting.status, 'waiting_for_choice')
  const one = simulateSalesbotFlow(second.flow, { answers: { [choice.id]: 'option_1' } })
  const two = simulateSalesbotFlow(second.flow, { answers: { [choice.id]: 'option_2' } })
  assert.equal(one.trace.some(step => step.kind === 'offer'), false)
  assert.equal(two.trace.some(step => step.kind === 'offer'), true)
  assert.equal(two.leadCreated, false)
  assert.equal(two.sent, false)
  assert.equal(two.paymentReceived, false)
})

test('topic conditions branch into two independent safe paths', () => {
  const first = insertSalesbotStep(SALESBOT_TEMPLATES[2],
    { nodeId: 'intro', slot: 'next', type: 'branch' })
  const id = first.selectedNodeId
  const specific = setSalesbotTopicCondition(first.flow, id, 'relationships')
  const extra = insertSalesbotStep(specific, { nodeId: id, slot: 'yes', type: 'offer' })
  const other = insertSalesbotStep(extra.flow, { nodeId: id, slot: 'no', type: 'say' })
  const loves = simulateSalesbotFlow(other.flow, { topic: 'relationships' })
  const works = simulateSalesbotFlow(other.flow, { topic: 'work' })
  assert.equal(loves.trace.some(step => step.kind === 'offer'), true)
  assert.equal(works.trace.some(step => step.kind === 'offer'), false)
  assert.throws(() => setSalesbotTopicCondition(other.flow, id, 'user.id'),
    /INVALID_SALESBOT_BRANCH/)
  assert.ok(other.flow.nodes.every(n => Object.keys(n).every(k => !k.startsWith('onClick'))))
})

test('multiple button choices are bounded at five; must preserve reachable paths', () => {
  let flow = clone(SALESBOT_TEMPLATES[0])
  flow = addSalesbotChoice(flow, 'choice')
  assert.equal(flow.nodes.find(x => x.id === 'choice').options.length, 3)
  flow = addSalesbotChoice(flow, 'choice')
  flow = addSalesbotChoice(flow, 'choice')
  assert.equal(flow.nodes.find(x => x.id === 'choice').options.length, 5)
  assert.throws(() => addSalesbotChoice(flow, 'choice'), /SALESBOT_EDITOR_CHOICE_LIMIT/)
  flow = removeSalesbotChoice(flow, 'choice', 'option_1')
  assert.equal(flow.nodes.find(x => x.id === 'choice').options.length, 4)
  flow = removeSalesbotChoice(flow, 'choice', 'option_2')
  assert.equal(flow.nodes.find(x => x.id === 'choice').options.length, 3)
  flow = removeSalesbotChoice(flow, 'choice', 'option_3')
  assert.equal(flow.nodes.find(x => x.id === 'choice').options.length, 2)
  assert.throws(() => removeSalesbotChoice(flow, 'choice', 'review'),
    /SALESBOT_EDITOR_MIN_CHOICES/)
  assert.throws(() => removeSalesbotChoice(flow, 'choice', '__proto__'),
    /INVALID_SALESBOT_EDITOR_CHOICE/)
})

test('safe offer selector rejects arbitrary external links and unverified pricing', () => {
  const next = setSalesbotOfferTarget(SALESBOT_TEMPLATES[0], 'free', 'academy')
  const ran = simulateSalesbotFlow(next, { answers: { choice: 'review' }, locale: 'es' })
  assert.equal(ran.trace.find(t => t.kind === 'offer').href, '/es/academy')
  assert.throws(() => setSalesbotOfferTarget(next, 'free', 'https://evil.com/?token=1'),
    /INVALID_SALESBOT_OFFER/)
})

test('delete only exact one-incoming linear step; never strip a shared target', () => {
  const added = insertSalesbotStep(SALESBOT_TEMPLATES[2],
    { nodeId: 'intro', slot: 'next', type: 'say' })
  const prior = removeSalesbotLinearStep(added.flow, added.selectedNodeId)
  assert.deepEqual(prior, SALESBOT_TEMPLATES[2])
  assert.throws(() => removeSalesbotLinearStep(added.flow, 'start'), /INVALID_SALESBOT_EDITOR_DELETE/)
  assert.throws(() => removeSalesbotLinearStep(SALESBOT_TEMPLATES[0], 'done'),
    /INVALID_SALESBOT_EDITOR_DELETE/)
  const removedWelcome = removeSalesbotLinearStep(SALESBOT_TEMPLATES[0], 'welcome')
  assert.equal(removedWelcome.nodes.some(node => node.id === 'welcome'), false)
  assert.equal(removedWelcome.nodes.find(node => node.id === 'start').next, 'choice')
})

test('invalid edge identifiers, capacity limit, and strict imports fail closed', () => {
  const t = SALESBOT_TEMPLATES[0]
  assert.throws(() => insertSalesbotStep(t, {
    nodeId: 'choice', slot: 'next', type: 'say',
  }), /INVALID_SALESBOT_EDITOR_EDGE/)
  assert.throws(() => insertSalesbotStep(t, {
    nodeId: 'choice', slot: 'choice:fake', type: 'say',
  }), /INVALID_SALESBOT_EDITOR_EDGE/)
  let flow = clone(SALESBOT_TEMPLATES[2])
  while (flow.nodes.length < 24) {
    flow = insertSalesbotStep(flow, { nodeId: 'intro', slot: 'next', type: 'say' }).flow
  }
  assert.throws(() => insertSalesbotStep(flow, { nodeId: 'intro', slot: 'next', type: 'say' }),
    /INVALID_SALESBOT_NODE_COUNT/)
  assert.deepEqual(importSalesbotJson(JSON.stringify(t)), t)
  assert.throws(() => importSalesbotJson('globalThis.hacked=true'), /INVALID_SALESBOT_JSON/)
  assert.throws(() => importSalesbotJson(JSON.stringify({ script:'throw new Error("owned")' })),
    /INVALID_SALESBOT_GRAPH/)
  assert.throws(() => importSalesbotJson('a'.repeat(25000)), /INVALID_SALESBOT_IMPORT_SIZE/)
})

test('graph builder is local to owner editor; no new customer API writes', () => {
  const editor = read('components/app/crm-salesbot.jsx')
  const source = read('lib/crm/salesbot-editor.mjs')
  assert.match(editor, /insertSalesbotStep/)
  assert.match(editor, /importSalesbotJson/)
  assert.match(editor, /salesbotEditorEdges/)
  assert.match(editor, /setSalesbotOfferTarget/)
  assert.match(editor, /addSalesbotChoice/)
  assert.match(source, /validateSalesbotFlow/)
  assert.doesNotMatch(source, /eval\(|Function\(|fetch\(|sendOneMessengerMessage|service-enquiries|process\.env/)
  assert.doesNotMatch(editor, /sendOneMessengerMessage|sendCrmSms|sendCrmMessage/)
})
