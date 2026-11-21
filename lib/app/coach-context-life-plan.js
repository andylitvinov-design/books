import 'server-only'
import { openSealed } from './crypto.js'
import { hasCoachContextGrant } from '../coaching/context-cloud-consent.mjs'
import { likelySensitiveDisclosure } from '../holistic-support/client-memory-core.mjs'

async function readLifePlanContextRows(db, actor, topicKey, goalIds, actionIds) {
  if (!goalIds.length && !actionIds.length) return []
  const { rows } = await db.query(
    `with active_goals as (
      select g.*, a.area_key, r.current_revision as report_revision
       from app_private.coaching_goals g
       join app_private.coaching_life_plan_areas a on a.id = g.area_id and a.account_id = g.account_id
       join app_private.coaching_life_plans p on p.id = a.plan_id and p.account_id = g.account_id
      left join app_private.coaching_reports r on r.id = g.source_report_id
        and r.account_id = g.account_id and r.status = 'confirmed' and r.report_kind = 'ai_coaching'
      where g.account_id = $1 and a.area_key = $2
        and g.status = 'active' and p.status = 'active'
        and ((g.source_report_id is null and g.source_session_id is null) or r.id is not null)
    )
    select id, revision, updated_at, title_ciphertext as ciphertext, area_key, 'goals' as category,
           source_report_id, report_revision
      from active_goals where id = any($3::uuid[])
    union all
    select i.id, i.revision, i.updated_at, i.description_ciphertext, g.area_key, 'actions',
           g.source_report_id, g.report_revision
      from app_private.coaching_action_items i
      join active_goals g on g.id = i.goal_id and g.account_id = i.account_id
     where i.account_id = $1 and i.id = any($4::uuid[])
       and i.status in ('accepted', 'active') and i.client_confirmed_at is not null
       and i.source_report_id is not distinct from g.source_report_id
       and i.source_session_id is not distinct from g.source_session_id`,
    [actor.id, topicKey, goalIds, actionIds],
  )
  return rows
}

function revisionFor(row) {
  return row.source_report_id === null ? String(row.revision) :
    `${row.revision}:report:${row.source_report_id}:${row.report_revision}`
}

function shareableText(config, actor, row) {
  const field = row.category === 'goals' ? 'goal.title' : 'action.description'
  const text = openSealed(row.ciphertext, {
    accountId: actor.id, recordId: row.id, field: 'coaching.life_plan.' + field,
  }, config)
  if (typeof text !== 'string' || !text.trim() || text.length > 240 ||
      likelySensitiveDisclosure(text)) return null
  return text
}

// Owner-only review surface. The same projection is checked again before use.
export async function reviewLifePlanContextItem(db, config, actor, { topicKey, category, itemId }) {
  if (!['goals', 'actions'].includes(category)) return null
  const [row] = await readLifePlanContextRows(db, actor, topicKey,
    category === 'goals' ? [itemId] : [], category === 'actions' ? [itemId] : [])
  if (!row) return null
  const text = shareableText(config, actor, row)
  return text ? { itemId: row.id, category: row.category, topicKey: row.area_key,
    sourceRevision: revisionFor(row), text } : null
}

export async function readApprovedLifePlanItems(db, config, actor, request, grants) {
  const idsFor = category => [...new Set(grants.filter(event => event.category === category &&
    event.itemId && event.decision === 'grant').map(event => event.itemId))]
  const rows = await readLifePlanContextRows(db, actor, request.topicKey, idsFor('goals'), idsFor('actions'))
  const items = []
  for (const row of rows) {
    const sourceRevision = revisionFor(row)
    const scope = { ...request, accountId: actor.id, category: row.category, itemId: row.id,
      sourceRevision, now: Date.now() }
    if (!hasCoachContextGrant(scope, grants)) continue
    const text = shareableText(config, actor, row)
    if (!text) continue
    items.push({
      id: row.id, accountId: actor.id, category: row.category, topicKey: row.area_key,
      sourceKind: 'saved_life_plan', sourceRevision, currentSourceRevision: sourceRevision,
      status: 'confirmed', sensitivity: 'coach_shareable', reviewedAt: new Date(row.updated_at).getTime(),
      expiresAt: null, text,
    })
  }
  return items
}
