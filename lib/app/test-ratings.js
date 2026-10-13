import 'server-only'
import { AppError, onlyKeys, requireUUID, revision } from '../assessments/contracts.js'
import { STORED_INTERPRETATION_VERSION } from '../assessments/stored-interpretation.js'
import { transaction } from './database.js'
import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { getAssessmentDefinition } from '../assessments/definitions.js'
import { ratingSummary, RATING_MINIMUM_COUNT, RATING_RANKING_METHOD, validateRatingInput } from '../assessments/test-ratings.js'

function view(row, sourceVersionId) {
  return { stars: row?.source_version_id === sourceVersionId ? row.stars : null, revision: row?.revision || 0 }
}
async function eligible(db, actor, resultId, write) {
  const account = (await db.query(`select status,onboarding_state from app.accounts where id=$1 ${write ? 'for update' : 'for share'}`, [actor.id])).rows[0]
  if (account?.status !== 'active' || account?.onboarding_state !== 'active') throw new AppError('CONSENT_REQUIRED', 403)
  // Do not select answers, dimensions, names or interpretation contents.
  const row = (await db.query(`select r.source_version_id,v.definition_key,r.scoring_version,r.result_version
    from app.assessment_results r
    join app.assessment_runs run on run.id=r.run_id and run.account_id=r.account_id
    join app.assessment_versions v on v.id=r.source_version_id
    where r.id=$1 and r.account_id=$2 and run.status='completed'`, [resultId, actor.id])).rows[0]
  if (!row) throw new AppError('NOT_FOUND', 404)
  return row
}
async function requirePublishedInterpretation(db, source, uiLocale) {
  // Check only non-personal catalog metadata; never load answers, scores or payloads.
  const readable = (await db.query("select coalesce(has_table_privilege(current_user,to_regclass('app.assessment_interpretation_versions'),'SELECT'),false) as available")).rows[0]?.available
  if (!readable) throw new AppError('INTERPRETATION_UNAVAILABLE', 503)
  const available = (await db.query(`select exists (
    select 1 from app.assessment_interpretation_versions i
    join app.assessment_versions v on v.id=i.assessment_version_id
    where i.assessment_version_id=$1 and i.ui_locale=$2 and i.interpretation_version=$3 and i.status='published'
      and i.definition_key=v.definition_key and i.definition_version=v.definition_version
      and i.instrument_locale=v.instrument_locale and i.translation_version=v.translation_version
      and i.instrument_content_hash=v.content_hash and i.scoring_key=v.scoring_key
      and i.scoring_version=$4 and i.scoring_version=v.scoring_version
      and i.result_version=$5 and i.result_version=v.definition->>'resultVersion'
  ) as available`, [source.source_version_id, uiLocale, STORED_INTERPRETATION_VERSION, source.scoring_version, source.result_version])).rows[0]?.available
  if (!available) throw new AppError('INTERPRETATION_UNAVAILABLE', 503)
}
export function createTestRatingRepository(config) {
  return {
    async summaries() {
      return transaction(config, null, async db => {
        const rows = (await db.query('select * from app_private.test_rating_summaries()')).rows
        const allowed = new Set()
        for (const item of MONITORING_CATALOG.filter(item => item.startable && item.rightsStatus === 'cleared')) {
          for (const locale of ['en', 'ru']) {
            try { allowed.add(getAssessmentDefinition(item.key, item.version, item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale).id) } catch { /* Not all versions have both languages. */ }
          }
        }
        const summaries = {}
        for (const row of rows) {
          const summary = ratingSummary(row)
          if (allowed.has(row.definition_id) && summary) summaries[row.definition_id] = summary
        }
        return { summaries, minimumCount: RATING_MINIMUM_COUNT, rankingMethod: RATING_RANKING_METHOD }
      }, { server: true })
    },
    async read(actor, resultId) {
      requireUUID(resultId)
      return transaction(config, actor, async db => {
        const source = await eligible(db, actor, resultId, false)
        const row = (await db.query('select stars,revision,source_version_id from app_private.test_ratings where account_id=$1 and definition_key=$2', [actor.id, source.definition_key])).rows[0]
        return view(row, source.source_version_id)
      })
    },
    async save(actor, resultId, input) {
      requireUUID(resultId)
      validateRatingInput(input)
      return transaction(config, actor, async db => {
        // Account lock serializes both first votes and edits across tabs/results.
        const source = await eligible(db, actor, resultId, true)
        await requirePublishedInterpretation(db, source, input.uiLocale)
        const current = (await db.query('select stars,revision,source_version_id from app_private.test_ratings where account_id=$1 and definition_key=$2 for update', [actor.id, source.definition_key])).rows[0]
        // A lost successful response can be retried without adding a vote.
        if (current?.stars === input.stars && current.source_version_id === source.source_version_id) return view(current, source.source_version_id)
        if ((current?.revision || 0) !== input.expectedRevision) throw new AppError('RATING_CONFLICT', 409)
        const row = (await db.query(`insert into app_private.test_ratings(account_id,definition_key,source_version_id,source_result_id,stars)
          values($1,$2,$3,$4,$5) on conflict(account_id,definition_key) do update
          set source_version_id=excluded.source_version_id,source_result_id=excluded.source_result_id,stars=excluded.stars,
            revision=test_ratings.revision+1,updated_at=now()
          returning stars,revision,source_version_id`, [actor.id, source.definition_key, source.source_version_id, resultId, input.stars])).rows[0]
        return view(row, source.source_version_id)
      })
    },
    async remove(actor, resultId, input) {
      requireUUID(resultId)
      onlyKeys(input, ['expectedRevision']); revision(input.expectedRevision)
      return transaction(config, actor, async db => {
        const source = await eligible(db, actor, resultId, true)
        const row = (await db.query('select stars,revision,source_version_id from app_private.test_ratings where account_id=$1 and definition_key=$2 for update', [actor.id, source.definition_key])).rows[0]
        if (!row) return { stars: null, revision: 0 }
        if (row.stars === null) return { stars: null, revision: row.revision }
        if (row.revision !== input.expectedRevision) throw new AppError('RATING_CONFLICT', 409)
        await db.query('update app_private.test_ratings set stars=null,revision=revision+1,updated_at=now() where account_id=$1 and definition_key=$2', [actor.id, source.definition_key])
        return { stars: null, revision: row.revision + 1 }
      })
    },
    async export(actor) {
      try {
        return await transaction(config, actor, async db => (await db.query('select definition_key,source_version_id,stars,created_at,updated_at from app_private.test_ratings where account_id=$1 and stars is not null order by definition_key', [actor.id])).rows)
      } catch (error) {
        // Keep existing exports available during an app-before-migration rollout.
        if (error.code === '42P01') return null
        throw error
      }
    },
  }
}
