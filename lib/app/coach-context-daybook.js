import 'server-only'
import { openSealed } from './crypto.js'
import { onlyKeys } from '../assessments/contracts.js'
import { journalWrite } from './daybook-journal-contract.mjs'
import { daybookCoachExcerpt, parseDaybookCoachExcerptRevision } from './daybook-coach-excerpt.mjs'
import {readCoachMaterialVersion} from './coach-material-source.js'
import { hasCoachContextGrant } from '../coaching/context-cloud-consent.mjs'

async function sourceRows(db, actor, ids) {
  if (!ids.length) return []
  return (await db.query(
    'select id,payload_ciphertext,revision,updated_at from app_private.daybook_entries where account_id=$1 and id=any($2::uuid[])',
    [actor.id, ids],
  )).rows
}
async function excerptFor(db, row, config, actor, selection) {
  const {materialVersion:storedVersion,...payload}=openSealed(row.payload_ciphertext,
    { accountId: actor.id, recordId: row.id, field: 'daybook.entry' }, config)
  const entry = journalWrite({ ...payload, id: row.id, revision: row.revision, operationId: row.id })
  const materialVersion=entry.material?await readCoachMaterialVersion(db,config,actor,entry.material):undefined
  if(entry.material&&(!storedVersion||storedVersion!==materialVersion))return null
  return daybookCoachExcerpt(entry, selection, materialVersion)
}
// The caller must already have verified the current account/session and provider.
export async function reviewDaybookContextItem(db, config, actor, input) {
  onlyKeys(input.excerpt, ['revision', 'start', 'end'])
  const [row] = await sourceRows(db, actor, [input.itemId])
  if (!row) return null
  const excerpt = await excerptFor(db, row, config, actor, {...input.excerpt,topicKey:input.topicKey})
  return excerpt?{itemId:row.id,category:'journal_excerpt',topicKey:input.topicKey,...excerpt}:null
}
export async function readApprovedDaybookItems(db, config, actor, request, grants) {
  if (request.includeJournal !== true || !request.sessionId || request.sessionOnly !== true || request.accountWideOnly) return []
  const now = Date.now()
  const eligible = grants.filter(grant => grant.category === 'journal_excerpt' &&
    grant.decision === 'grant' && parseDaybookCoachExcerptRevision(grant.sourceRevision)?.topicKey === request.topicKey &&
    hasCoachContextGrant({ ...request, accountId: actor.id, now, category: 'journal_excerpt',
      itemId: grant.itemId, sourceRevision: grant.sourceRevision }, grants))
    .sort((a, b) => b.revision - a.revision)
  const seen = new Set()
  const chosen = eligible.filter(grant => {
    if (seen.has(grant.itemId)) return false
    seen.add(grant.itemId)
    return true
  }).slice(0, 6)
  const rows = await sourceRows(db, actor, chosen.map(grant => grant.itemId))
  const items = []
  for (const grant of chosen) {
    const row = rows.find(source => source.id === grant.itemId)
    if (!row) continue
    try {
      const {revision,topicKey,start,end}=parseDaybookCoachExcerptRevision(grant.sourceRevision)
      const selection={revision,topicKey,start,end}
      const excerpt=await excerptFor(db,row,config,actor,selection)
      if (excerpt?.sourceRevision !== grant.sourceRevision) continue
      items.push({ id: row.id, accountId: actor.id, category: 'journal_excerpt', topicKey: selection.topicKey,
        sourceKind: 'selected_daybook_excerpt', ...excerpt, currentSourceRevision: excerpt.sourceRevision,
        status: 'confirmed', sensitivity: 'coach_shareable', reviewedAt: grant.occurredAt, expiresAt: grant.expiresAt })
    } catch {
      // Deleted, revised, unreadable or newly non-shareable sources never reach a provider.
    }
  }
  return items
}
