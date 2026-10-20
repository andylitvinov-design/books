// This module is intentionally pure: it is also used by offline contract tests.
// Events are names of generic controls only; never accept URLs, form contents,
// report section names, test scores, health details or arbitrary click targets.
export const ENGAGEMENT_ACTIONS = Object.freeze([
  'opened','active','next_step','pdf_preview','pdf_download',
  'tests','cabinet','media_attempt','materials',
])
export const ENGAGEMENT_NOTICE_VERSION='hh-session-engagement-v1'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const shape=(input,names)=>input&&typeof input==='object'&&!Array.isArray(input)&&
  Object.keys(input).every(name=>names.includes(name))
export function parseEngagementCommand(input) {
  if(input?.op==='consent'&&shape(input,['op','accepted'])&&typeof input.accepted==='boolean')
    return {op:'consent',accepted:input.accepted}
  if(input?.op==='event'&&shape(input,['op','id','kind','seconds'])&&
     uuid.test(input.id)&&ENGAGEMENT_ACTIONS.includes(input.kind)) {
    if(input.kind==='active'&&Number.isInteger(input.seconds)&&input.seconds>=1&&input.seconds<=60)
      return {op:'event',id:input.id,kind:input.kind,seconds:input.seconds}
    if(input.kind!=='active'&&(input.seconds===undefined||input.seconds===0))
      return {op:'event',id:input.id,kind:input.kind,seconds:0}
  }
  throw new Error('INVALID_ENGAGEMENT_EVENT')
}
