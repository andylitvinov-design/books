/**
 * A user-edited My Goal is not an implicit external-provider prompt.
 * On the next explicit Send or consented voice turn, make the exact authored
 * goal part of the visible user message (and therefore the existing validated
 * request). Nothing persists to the account, CRM or another session.
 */
import {understandCoachingTurn} from '../personal-coaching/coaching-turn-understanding.mjs'
import {coachingBrainSafety,coachingBrainBoundary} from '../personal-coaching/coaching-brain.mjs'
const prefix={en:'My goal: ',ru:'Моя цель: ',es:'Mi objetivo: '}
const badText=/[\u0000-\u001f\u007f]/
const unchanged=message=>({message,goalIncluded:false,goal:'',clearGoal:false,deferredGoal:false})
export function coachGoalTurn({message='',goal='',lastSharedGoal='',locale='en',turns=[],skip=false}={}){
  const spoken=typeof message==='string'?message.trim():''
  const cleanGoal=typeof goal==='string'?goal.trim().replace(/\s+/gu,' '):''
  if(!spoken || skip)return unchanged(spoken)
  const safeLocale=Object.hasOwn(prefix,locale)?locale:'en'
  const history=Array.isArray(turns)?turns:[]
  const input={message:spoken,locale:safeLocale,turns:history}
  // A new topic wins over the old goal, even when that goal was just edited.
  if(understandCoachingTurn(input).act==='topic_shift')
    return {...unchanged(spoken),clearGoal:cleanGoal.length>0}
  // No goal attachment to a stop, skip, crisis or other safety interruption.
  if(coachingBrainSafety(input)||coachingBrainBoundary(input))return unchanged(spoken)
  if(!cleanGoal||cleanGoal===lastSharedGoal||cleanGoal.length>180||badText.test(cleanGoal))
    return unchanged(spoken)
  const appended=prefix[safeLocale]+cleanGoal+'\n'+spoken
  // Never truncate the client's spoken words or bypass the 1200-char server gate.
  if(appended.length>1200)return {...unchanged(spoken),deferredGoal:true}
  return {message:appended,goalIncluded:true,goal:cleanGoal,clearGoal:false,deferredGoal:false}
}
