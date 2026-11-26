/**
 * My Coach's two-stage, narrow, untrusted context projection.
 * No raw transcript, whole profile, assessment answer or AI-only suggestion.
 * Source data is already client-reviewed and owner-scoped before projection.
 */
import {coachIsNameRepairUtterance} from './coach-opening-protocol.mjs'

export const COACH_STAGED_MEMORY_VERSION = 'hh-my-coach-staged-memory-v1'
const text = (value, limit) => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
  : ''
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  ? new Date(value).toISOString() : null

export function projectCoachPriorSessions(protocols, accountName = '', foundation = null) {
  const eligible = (Array.isArray(protocols) ? protocols : [])
    .filter(row => row && row.provenance === 'client_reviewed_dialogue' && iso(row.completedAt))
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
  const recap = row => Object.freeze({
    date: iso(row.completedAt).slice(0, 10),
    topic: text(row.goal, 120) || (row.opening?.focus === 'profile' ? 'Personal profile' : ''),
    clientConclusions: text(row.clientSummary, 420),
    clientNextStep: text(row.clientNextStep, 240),
    provenance: 'client_reviewed_dialogue',
  })
  const first=foundation?.provenance==='client_reviewed_dialogue'&&iso(foundation.completedAt)?foundation:null
  const previous=eligible.slice(0,3).map(recap)
  return Object.freeze({
    foundation:first?recap(first):null,
    foundationKind:first?(first.courseSessionId==='introductory'?'introductory':
      first.courseSessionId?'earliest_reviewed':'legacy_untyped'):'none',
    foundationSearchComplete:first?.foundationSearchComplete===true,
    hasPreviousSession: previous.length > 0||Boolean(first),
    preferredName: text([...eligible,...(first?[first]:[])].find(row => text(row.opening?.name, 60) && !coachIsNameRepairUtterance(row.opening.name))?.opening?.name || (coachIsNameRepairUtterance(accountName) ? '' : accountName), 60),
    previous,
  })
}

const sourceKinds = Object.freeze({
  goals: 'saved_life_plan',
  actions: 'saved_life_plan',
  test_results: 'selected_assessment',
  journal_excerpt: 'selected_daybook_excerpt',
})

// Defense in depth after the server-side item grant/revision checks.
export function projectCoachSelectedContext(snapshot, { goals = false, assessments = false } = {}) {
  const allowed = Array.isArray(snapshot?.items) ? snapshot.items : []
  const items = []
  for (const row of allowed) {
    if (!row || sourceKinds[row.kind] !== row.sourceKind) continue
    if (row.kind === 'test_results' ? !assessments : !goals) continue
    const value = text(row.text, 240)
    if (!value || value !== row.text?.trim()) continue
    const candidate = { kind: row.kind, sourceKind: row.sourceKind, text: value }
    if (Buffer.byteLength(JSON.stringify({ items: [...items, candidate] })) > 1200) break
    items.push(candidate)
    if (items.length === 6) break
  }
  return Object.freeze({ version: 2, purpose: 'coaching_dialogue',
    status: 'non_authoritative_reviewed_client_data', items })
}
