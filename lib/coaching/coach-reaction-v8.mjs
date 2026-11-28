import {COACH_REACTION_V8_MANIFEST} from './coach-reaction-v8-manifest.mjs'
import {COACH_REACTION_V8_STAGED} from './coach-reaction-v8-staged.mjs'
import {releasedReactionMedia,coachPresentationOpening} from './coach-reaction-v4-registry.mjs'
import {COACH_REACTION_QUALITY_REVIEW_THRESHOLD} from './coach-reaction-quality.mjs'
const byId=new Map(COACH_REACTION_V8_MANIFEST.map(x=>[x.id,x]))
const ready=(id,staged)=>Boolean(byId.has(id)&&Object.hasOwn(staged||{},id)&&staged[id]===byId.get(id).sha256)
export function merlinV8Ready(staged=COACH_REACTION_V8_STAGED){
 return ready('MER-01',staged)&&ready('MER-N02',staged)
}
function v8Block(id,media,staged){
 const item=byId.get(id)
 if(!item||!media||!ready(id,staged)||item.coach!==media.coach||item.group!==media.group||
 item.anchorHash!==media.anchorHash||item.width!==media.width||item.height!==media.height||
 item.ratio<COACH_REACTION_QUALITY_REVIEW_THRESHOLD||item.frames>244)return null
 return {id:item.id,src:'/images/holistic-house/my-coach-motion/reaction-v8/'+item.file,duration:item.frames/24,
 width:item.width,height:item.height,anchorHash:item.anchorHash,sha256:item.sha256,
 group:media.group,poster:media.poster,revision:'exact-v8'}
}
export function withStagedV8Reactions(screened,staged=COACH_REACTION_V8_STAGED){
 if(!screened||screened.group!=='primary')return screened
 const ids=screened.coach==='mira'?['MIR-02']:screened.coach==='merlin'&&merlinV8Ready(staged)?['MER-01','MER-N02']:[]
 const candidates=ids.map(id=>v8Block(id,screened,staged)).filter(Boolean)
 if(candidates.length!==ids.length||!candidates.length)return screened
 const replacements=new Set(candidates.map(x=>x.id))
 return {...screened,blocks:[...screened.blocks.filter(b=>!replacements.has(b.id)),...candidates]}
}
export function stagedV8CameraGroup(coach,released,staged=COACH_REACTION_V8_STAGED){
 return coach==='merlin'&&merlinV8Ready(staged)&&releasedReactionMedia(coach,released,'primary')?'primary':null
}
export function stagedV8Presentation(coach,released,fallback,staged=COACH_REACTION_V8_STAGED){
 if(!fallback||!stagedV8CameraGroup(coach,released,staged))return fallback
 return v8Block('MER-N02',releasedReactionMedia(coach,released,'primary'),staged)||fallback
}
export function stagedV8Return(coach,released,presence,opening,staged=COACH_REACTION_V8_STAGED){
 if(coach!=='merlin'||!merlinV8Ready(staged)||!opening||!presence)return null
 const original=coachPresentationOpening(coach),media=releasedReactionMedia(coach,released,'primary')
 const neutral=v8Block('MER-N02',media,staged),bridge=v8Block('MER-01',media,staged)
 if(!original||!neutral||!bridge||opening.videoBlob!==original.videoBlob||opening.src!==original.src||
 presence.id!==neutral.id||presence.src!==neutral.src||presence.sha256!==neutral.sha256||presence.anchorHash!==neutral.anchorHash)return null
 return {...bridge,id:'MER-01-return',sourceId:'MER-01',startTime:121/24}
}
