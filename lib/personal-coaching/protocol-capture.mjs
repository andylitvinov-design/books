/** Bounded append-only capture of the existing private coaching transcript.
 * Do not apply the smaller provider context window to the retained archive.
 * Reserve room for a complete text exchange before accepting the user turn.
 */
import {MY_COACH_PROTOCOL_MAX_TURNS,MY_COACH_PROTOCOL_MAX_CHARS,MY_COACH_PROTOCOL_MAX_TURN_CHARS} from './session-protocol.mjs'
function storedChars(row){
 if(!row||typeof row.content!=='string'||!row.content.trim()||row.content.length>MY_COACH_PROTOCOL_MAX_TURN_CHARS)return Infinity
 return row.content.length+(row.role==='assistant'&&typeof row.suggestion==='string'?Math.min(300,row.suggestion.length):0)
}
export function coachProtocolCanAppend(rows,addition){
 if(!Array.isArray(rows)||!Array.isArray(addition)||rows.length+addition.length>MY_COACH_PROTOCOL_MAX_TURNS)return false
 return [...rows,...addition].reduce((sum,row)=>sum+storedChars(row),0)<=MY_COACH_PROTOCOL_MAX_CHARS
}
export function coachProtocolRoomForExchange(rows,message){
 if(typeof message!=='string')return false
 return coachProtocolCanAppend(rows,[{role:'user',content:message},
  {role:'assistant',content:'x'.repeat(900),suggestion:'x'.repeat(300)}])
}
