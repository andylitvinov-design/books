/**
 * My Coach's two-stage, narrow, untrusted context projection.
 * No raw transcript, whole profile, assessment answer or AI-only suggestion.
 * Source data is already client-reviewed and owner-scoped before projection.
 */
import {coachIsNameRepairUtterance} from './coach-opening-protocol.mjs'
import {projectCoachPreconsultation,projectCoachReviewedFields} from './coach-preconsulting.mjs'

export const COACH_STAGED_MEMORY_VERSION = 'hh-my-coach-staged-memory-v1'
const text = (value, limit) => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
  : ''
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  ? new Date(value).toISOString() : null

export function projectCoachPriorSessions(protocols, accountName = '', foundation = null, confirmedIdentity = null) {
  // Only the server's explicitly confirmed account preference may override
  // reviewed history. An autosaved draft's name is not provider consent.
  const confirmedName=confirmedIdentity?.source==='confirmed_preference'&&
    !coachIsNameRepairUtterance(confirmedIdentity.preferredName)?text(confirmedIdentity.preferredName,60):''
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
  const scanned=foundation?.provenance==='client_reviewed_dialogue'&&iso(foundation.completedAt)?foundation:null
  // A bounded oldest-first scan may miss a real introduction visible on the
  // newest page. Prefer that explicit marker over an unrelated legacy record,
  // but never claim the earliest introduction has been established.
  const recentIntro=eligible.filter(row=>row.courseSessionId==='introductory').sort((a,b)=>
    Date.parse(a.savedAt||a.completedAt)-Date.parse(b.savedAt||b.completedAt)||String(a.id||'').localeCompare(String(b.id||'')))[0]
  const useRecent=Boolean(recentIntro&&scanned?.courseSessionId!=='introductory'&&scanned?.foundationSearchComplete!==true)
  const first=useRecent?recentIntro:scanned
  const previous=eligible.slice(0,3).map(recap)
  return Object.freeze({
    foundation:first?recap(first):null,
    foundationKind:first?(first.courseSessionId==='introductory'?'introductory':
      first.courseSessionId?'earliest_reviewed':'legacy_untyped'):'none',
    foundationSearchComplete:!useRecent&&first?.foundationSearchComplete===true,
    hasPreviousSession: previous.length > 0||Boolean(first),
    preferredName: confirmedName || text([...eligible,...(first?[first]:[])].find(row => text(row.opening?.name, 60) && !coachIsNameRepairUtterance(row.opening.name))?.opening?.name || (coachIsNameRepairUtterance(accountName) ? '' : accountName), 60),
    previous,
    preconsultation:projectCoachPreconsultation(eligible[0]||first),
    reviewedFields:projectCoachReviewedFields(eligible[0]||first),
  })
}

// A session's role is metadata, not authority about client facts. Never label
// an ordinary or untyped earlier session as the actual introduction.
export function coachPriorRecapRole(prior,recap){
 if(!recap||recap!==prior?.foundation)return 'previous_reviewed'
 if(prior.foundationKind==='introductory')return prior.foundationSearchComplete===true?'introductory':'introductory_earliest_unverified'
 return prior.foundationKind==='earliest_reviewed'?'earliest_reviewed_not_introductory':'early_reviewed_type_unverified'
}

// Prefer the latest reviewed conversation before optional historical context.
export function coachPriorRecaps(prior){
  if(prior?.hasPreviousSession!==true)return []
  const recent=Array.isArray(prior.previous)?prior.previous.slice(0,2):[]
  const foundation=prior.foundation
  const seen=new Set(),result=[]
  for(const candidate of [recent[0],foundation,...recent.slice(1)]){
    if(candidate?.provenance!=='client_reviewed_dialogue')continue
    if(![candidate.topic,candidate.clientConclusions,candidate.clientNextStep].some(value=>typeof value==='string'&&value.trim()))continue
    const key=JSON.stringify(candidate)
    if(seen.has(key))continue
    seen.add(key)
    result.push(foundation&&JSON.stringify(foundation)===key?foundation:candidate)
  }
  return result
}

const sourceKinds = Object.freeze({
  goals: 'saved_life_plan',
  actions: 'saved_life_plan',
  test_results: 'selected_assessment',
  journal_excerpt: 'selected_daybook_excerpt',
})

// Both callers pass a priority-ordered list of already authorized projections.
export function packCoachDialogueContext(authorizedItems, { ownerPreview = false } = {}) {
  const packet = {
    version: 2,
    purpose: 'coaching_dialogue',
    ...(ownerPreview ? { status: 'non_authoritative_reviewed_client_data' } : {}),
    items: [],
  }
  const encoder = new TextEncoder()
  for (const item of authorizedItems) {
    const candidate = { ...packet, items: [...packet.items, item] }
    if (encoder.encode(JSON.stringify(candidate)).byteLength > 1200) continue
    packet.items.push(item)
    if (packet.items.length === 6) break
  }
  return packet
}

// Defense in depth after the server-side item grant/revision checks.
export function projectCoachSelectedContext(snapshot, { goals = false, assessments = false } = {}) {
  const allowed = Array.isArray(snapshot?.items) ? snapshot.items : []
  const items = []
  for (const row of allowed) {
    if (!row || sourceKinds[row.kind] !== row.sourceKind) continue
    if (row.kind === 'test_results' ? !assessments : !goals) continue
    const value = text(row.text, 240)
    if (!value || value !== row.text?.trim()) continue
    items.push({ kind: row.kind, sourceKind: row.sourceKind, text: value })
  }
  return Object.freeze(packCoachDialogueContext(items, { ownerPreview: true }))
}
