import 'server-only'
import { transaction } from './database.js'
import { seal, openSealed } from './crypto.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { DEVELOPMENT_GOALS_VERSION, DEFAULT_DEVELOPMENT_TARGETS, normalizeDevelopmentGoals } from '../profile/development-program.js'

// Account-owned, encrypted, optimistic-revision private goal preferences.
// Neither raw test answers nor assessment results are copied into this table.
const context = actor => ({ accountId: actor.id, recordId: actor.id, field: 'development.goals' })
const empty = () => ({
  version: DEVELOPMENT_GOALS_VERSION,
  targets: { ...DEFAULT_DEVELOPMENT_TARGETS },
  details: {},
})
async function assertActiveAccount(db, actor) {
  const found = (await db.query(
    "select id from app.accounts where id=$1 and status='active' and onboarding_state='active'",
    [actor.id],
  )).rows[0]
  if (!found) throw new AppError('ACCOUNT_REQUIRED', 401)
}
export async function readDevelopmentGoals(config, actor) {
  return transaction(config, actor, async db => {
    await assertActiveAccount(db, actor)
    const row = (await db.query(
      'select targets_ciphertext,revision,updated_at from app_private.development_goals where account_id=$1',
      [actor.id],
    )).rows[0]
    if (!row) return { goals: empty(), revision: 0, updatedAt: null }
    const goals = normalizeDevelopmentGoals(openSealed(row.targets_ciphertext, context(actor), config))
    if (!goals) throw new AppError('PRIVATE_DATA_UNAVAILABLE', 503)
    return { goals, revision: row.revision, updatedAt: row.updated_at }
  })
}
export async function saveDevelopmentGoals(config, actor, input) {
  onlyKeys(input, ['version', 'targets', 'details', 'goalCheckin', 'vectors', 'lifeContext', 'supportProfile', 'revision'])
  const goals = normalizeDevelopmentGoals(input)
  if (!goals || !Number.isSafeInteger(input.revision) || input.revision < 0)
    throw new AppError('INVALID_DEVELOPMENT_GOALS', 400)
  return transaction(config, actor, async db => {
    await assertActiveAccount(db, actor)
    // Legacy clients omit independently stored vectors or narrative context.
    // Preserve both under the same expected revision; never overwrite concurrent edits.
    let nextGoals=goals
    const preserveVectors=!Object.prototype.hasOwnProperty.call(input,'vectors')
    const preserveLifeContext=!Object.prototype.hasOwnProperty.call(input,'lifeContext')
    const preserveSupportProfile=!Object.prototype.hasOwnProperty.call(input,'supportProfile')
    if(input.revision>0&&(preserveVectors||preserveLifeContext||preserveSupportProfile)){
      const previous=(await db.query(
        'select targets_ciphertext from app_private.development_goals where account_id=$1 and revision=$2',
        [actor.id,input.revision],
      )).rows[0]
      if(previous){
        const prior=normalizeDevelopmentGoals(openSealed(previous.targets_ciphertext,context(actor),config))
        if(!prior)throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
        if(preserveVectors&&prior.vectors)nextGoals={...nextGoals,vectors:prior.vectors}
        if(preserveLifeContext&&prior.lifeContext)nextGoals={...nextGoals,lifeContext:prior.lifeContext}
        if(preserveSupportProfile&&prior.supportProfile)nextGoals={...nextGoals,supportProfile:prior.supportProfile}
      }
    }
    const cipher = seal(nextGoals, context(actor), config)
    let row
    if (input.revision === 0) {
      row = (await db.query(
        'insert into app_private.development_goals(account_id,targets_ciphertext,revision) values($1,$2,1) on conflict(account_id) do nothing returning revision,updated_at',
        [actor.id, cipher],
      )).rows[0]
    } else {
      row = (await db.query(
        'update app_private.development_goals set targets_ciphertext=$2,revision=revision+1,updated_at=now() where account_id=$1 and revision=$3 returning revision,updated_at',
        [actor.id, cipher, input.revision],
      )).rows[0]
    }
    if (!row) throw new AppError('DEVELOPMENT_GOALS_CONFLICT', 409)
    return { goals: nextGoals, revision: row.revision, updatedAt: row.updated_at, saved: true }
  })
}
