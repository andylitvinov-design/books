// Owner-only, deterministic SalesBot graph editing helpers.
// Clean-room functional patterns: step insertion, branching and button choices.
// This module NEVER executes external send/webhook/payment/AI actions.
import { validateSalesbotFlow, SALESBOT_TOPICS, SALESBOT_OFFER_IDS } from './salesbot-flow.mjs'

export const SALESBOT_EDITOR_NODE_TYPES = Object.freeze(['say', 'choice', 'branch', 'offer', 'handoff'])
const localized = (en, ru, es) => ({ en, ru, es })
const LABEL = Object.freeze({
  say: localized('A useful next step', 'Следующий полезный шаг', 'Un siguiente paso útil'),
  choice: localized('What would you prefer?', 'Что вам больше подходит?', '¿Qué prefieres?'),
  branch: localized('Which topic?', 'Какая тема?', '¿Qué tema?'),
  offer: localized('Explore this available option', 'Посмотрите доступный вариант', 'Explora esta opción'),
  handoff: localized('Request a personal reply using the existing form',
    'Запросить личный ответ через существующую форму',
    'Solicita una respuesta personal mediante el formulario existente'),
})
const OPT = Object.freeze([
  localized('Option one', 'Первый вариант', 'Primera opción'),
  localized('Option two', 'Второй вариант', 'Segunda opción'),
  localized('Another option', 'Другой вариант', 'Otra opción'),
])

function reject(reason) { throw new Error(reason) }
const copy = value => JSON.parse(JSON.stringify(value))
function getNode(graph, nodeId) {
  const node = graph.nodes.find(item => item.id === nodeId)
  if (!node) reject('SALESBOT_EDITOR_NODE_NOT_FOUND')
  return node
}
function chooseNodeId(graph) {
  for (let i = 1; i <= 50; i++) {
    const id = 'step_' + i
    if (!graph.nodes.some(node => node.id === id)) return id
  }
  reject('SALESBOT_EDITOR_CAPACITY')
}
function chooseOptionId(node) {
  for (let i = 1; i <= 10; i++) {
    const id = 'option_' + i
    if (!node.options.some(option => option.id === id)) return id
  }
  reject('SALESBOT_EDITOR_CAPACITY')
}
function readEdge(node, slot) {
  if (['start', 'say', 'offer', 'handoff'].includes(node.type) && slot === 'next') return node.next
  if (node.type === 'branch' && (slot === 'yes' || slot === 'no')) return node[slot]
  if (node.type === 'choice' && typeof slot === 'string' && slot.startsWith('choice:')) {
    const option = node.options.find(opt => opt.id === slot.slice(7))
    if (option) return option.next
  }
  reject('INVALID_SALESBOT_EDITOR_EDGE')
}
function writeEdge(node, slot, target) {
  readEdge(node, slot)
  if (node.type === 'choice') {
    const option = node.options.find(opt => opt.id === slot.slice(7))
    option.next = target
  } else node[slot] = target
}
function newStep(type, nodeId, nextId) {
  if (!SALESBOT_EDITOR_NODE_TYPES.includes(type)) reject('INVALID_SALESBOT_EDITOR_TYPE')
  if (type === 'choice') return {
    id: nodeId, type, text: copy(LABEL.choice),
    options: [
      { id: 'option_1', text: copy(OPT[0]), next: nextId },
      { id: 'option_2', text: copy(OPT[1]), next: nextId },
    ],
  }
  if (type === 'branch') return {
    id: nodeId, type, field: 'topic', equals: 'work', yes: nextId, no: nextId,
  }
  const base = { id: nodeId, type, text: copy(LABEL[type]), next: nextId }
  if (type === 'offer') base.offer = 'free_review'
  return base
}
export function salesbotEditorEdges(node) {
  if (['start', 'say', 'offer', 'handoff'].includes(node?.type)) return ['next']
  if (node?.type === 'branch') return ['yes', 'no']
  if (node?.type === 'choice') return node.options.map(x => 'choice:' + x.id)
  return []
}

// Inject a safe node into ONE exact path without changing its downstream target.
// All paths must remain reachable and cycle-free; the server revalidates again.
export function insertSalesbotStep(rawFlow, { nodeId, slot, type }) {
  const graph = copy(validateSalesbotFlow(rawFlow))
  const node = getNode(graph, nodeId)
  const next = readEdge(node, slot)
  const newId = chooseNodeId(graph)
  const step = newStep(type, newId, next)
  writeEdge(node, slot, newId)
  graph.nodes.splice(graph.nodes.indexOf(node) + 1, 0, step)
  return { flow: validateSalesbotFlow(graph), selectedNodeId: newId }
}

// Add an opt-in answer button. It initially shares the existing next step;
// each answer can be extended with its own safe subpath.
export function addSalesbotChoice(rawFlow, nodeId) {
  const graph = copy(validateSalesbotFlow(rawFlow))
  const node = getNode(graph, nodeId)
  if (node.type !== 'choice') reject('INVALID_SALESBOT_EDITOR_CHOICE')
  if (node.options.length >= 5) reject('SALESBOT_EDITOR_CHOICE_LIMIT')
  node.options.push({
    id: chooseOptionId(node),
    text: copy(OPT[2]),
    next: node.options[0].next,
  })
  return validateSalesbotFlow(graph)
}
export function removeSalesbotChoice(rawFlow, nodeId, optionId) {
  const graph = copy(validateSalesbotFlow(rawFlow))
  const node = getNode(graph, nodeId)
  if (node.type !== 'choice') reject('INVALID_SALESBOT_EDITOR_CHOICE')
  if (node.options.length <= 2) reject('SALESBOT_EDITOR_MIN_CHOICES')
  if (!node.options.some(option => option.id === optionId)) reject('INVALID_SALESBOT_EDITOR_CHOICE')
  node.options = node.options.filter(option => option.id !== optionId)
  return validateSalesbotFlow(graph) // fail closed if removing an option orphans a branch
}
export function setSalesbotTopicCondition(rawFlow, nodeId, topic) {
  if (!SALESBOT_TOPICS.includes(topic)) reject('INVALID_SALESBOT_BRANCH')
  const graph = copy(validateSalesbotFlow(rawFlow))
  const node = getNode(graph, nodeId)
  if (node.type !== 'branch') reject('INVALID_SALESBOT_EDITOR_TYPE')
  node.equals = topic
  return validateSalesbotFlow(graph)
}
export function setSalesbotOfferTarget(rawFlow, nodeId, offerId) {
  if (!SALESBOT_OFFER_IDS.includes(offerId)) reject('INVALID_SALESBOT_OFFER')
  const graph = copy(validateSalesbotFlow(rawFlow))
  const node = getNode(graph, nodeId)
  if (node.type !== 'offer') reject('INVALID_SALESBOT_EDITOR_TYPE')
  node.offer = offerId
  return validateSalesbotFlow(graph)
}
// Only a linear node with exactly ONE incoming edge may be removed.
// Never drop a question/condition because it could orphan an entire branch.
export function removeSalesbotLinearStep(rawFlow, nodeId) {
  const graph = copy(validateSalesbotFlow(rawFlow))
  const selected = getNode(graph, nodeId)
  if (!['say', 'offer', 'handoff'].includes(selected.type)) reject('INVALID_SALESBOT_EDITOR_DELETE')
  const incoming = []
  for (const item of graph.nodes) {
    for (const slot of salesbotEditorEdges(item)) {
      if (readEdge(item, slot) === nodeId) incoming.push({ item, slot })
    }
  }
  if (incoming.length !== 1) reject('SALESBOT_EDITOR_SHARED_NODE')
  writeEdge(incoming[0].item, incoming[0].slot, selected.next)
  graph.nodes = graph.nodes.filter(node => node.id !== nodeId)
  return validateSalesbotFlow(graph)
}

// Allow import ONLY as strict JSON data, never evaluated source or a script.
// This uses the identical allowlist validator as preview and encrypted storage.
export function importSalesbotJson(text) {
  if (typeof text !== 'string' || text.length === 0 || text.length > 24576)
    reject('INVALID_SALESBOT_IMPORT_SIZE')
  let graph
  try { graph = JSON.parse(text) } catch { reject('INVALID_SALESBOT_JSON') }
  return validateSalesbotFlow(graph)
}
