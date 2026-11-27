import 'server-only'
import {randomUUID} from 'node:crypto'
import {normalizeDevelopmentVectors} from '../profile/development-vectors.mjs'
import {vectorFingerprint} from '../profile/self-discovery-vector-history.mjs'
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
const historyContext=(actor,id)=>({accountId:actor.id,recordId:id,field:'development.vector_history'})
async function appendVectorSnapshot(db,config,actor,vectors,revision,savedAt){
 if(!vectors||revision<1)return
 const id=randomUUID()
 await db.query(
  'insert into app_private.development_vector_history(id,account_id,revision,payload_ciphertext,saved_at) values($1,$2,$3,$4,$5) on conflict(account_id,revision) do nothing',
  [id,actor.id,revision,seal(vectors,historyContext(actor,id),config),savedAt])
}
async function readVectorHistory(db,config,actor,row,goals){
 if(!row)return []
 const stored=(await db.query(
  'select id,revision,payload_ciphertext,saved_at from app_private.development_vector_history where account_id=$1 and revision<=$2 order by revision',
  [actor.id,row.revision])).rows
 const snapshots=stored.map(item=>{
  const vectors=normalizeDevelopmentVectors(openSealed(item.payload_ciphertext,historyContext(actor,item.id),config))
  if(!vectors)throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
  return {revision:item.revision,savedAt:item.saved_at,vectors}
 })
 // Only surviving legacy data may become a baseline; no fabricated values.
 if(goals.vectors&&!snapshots.some(item=>item.revision===row.revision))
  snapshots.push({revision:row.revision,savedAt:row.updated_at,vectors:goals.vectors})
 return snapshots
}
export async function readDevelopmentGoals(config, actor, {includeHistory=false}={}) {
  return transaction(config, actor, async db => {
    await assertActiveAccount(db, actor)
    const row = (await db.query(
      'select targets_ciphertext,revision,updated_at from app_private.development_goals where account_id=$1',
      [actor.id],
    )).rows[0]
    if (!row) return { goals: empty(), revision: 0, updatedAt: null, ...(includeHistory?{vectorHistory:[]}:{} ) }
    const goals = normalizeDevelopmentGoals(openSealed(row.targets_ciphertext, context(actor), config))
    if (!goals) throw new AppError('PRIVATE_DATA_UNAVAILABLE', 503)
    return { goals, revision: row.revision, updatedAt: row.updated_at, ...(includeHistory?{vectorHistory:await readVectorHistory(db,config,actor,row,goals)}:{}) }
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
    let previous=null,prior=null
    if(input.revision>0){
      previous=(await db.query(
        'select targets_ciphertext,revision,updated_at from app_private.development_goals where account_id=$1 and revision=$2',
        [actor.id,input.revision],
      )).rows[0]
      if(!previous)throw new AppError('DEVELOPMENT_GOALS_CONFLICT',409)
      prior=normalizeDevelopmentGoals(openSealed(previous.targets_ciphertext,context(actor),config))
      if(!prior)throw new AppError('PRIVATE_DATA_UNAVAILABLE',503)
      if(preserveVectors&&prior.vectors)nextGoals={...nextGoals,vectors:prior.vectors}
      if(preserveLifeContext&&prior.lifeContext)nextGoals={...nextGoals,lifeContext:prior.lifeContext}
      if(preserveSupportProfile&&prior.supportProfile)nextGoals={...nextGoals,supportProfile:prior.supportProfile}
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
    // Archive both sides of successful CAS atomically; history failure rolls back.
    if(vectorFingerprint(prior?.vectors)!==vectorFingerprint(nextGoals.vectors)){
      if(previous&&prior?.vectors)await appendVectorSnapshot(db,config,actor,prior.vectors,previous.revision,previous.updated_at)
      await appendVectorSnapshot(db,config,actor,nextGoals.vectors,row.revision,row.updated_at)
    }
    return { goals: nextGoals, revision: row.revision, updatedAt: row.updated_at, saved: true }
  })
}
