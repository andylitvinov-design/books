import {AppError,requireUUID} from '../assessments/contracts.js'
export async function assertCoachingGoalNotErased(db,actor,sourceKey){
 requireUUID(sourceKey)
 if((await db.query('select 1 from app_private.coaching_erased_goal_receipts where account_id=$1 and source_idempotency_key=$2',[actor.id,sourceKey])).rows.length)throw new AppError('COACHING_PLAN_GOAL_DELETED',410)
}
