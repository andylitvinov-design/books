// Private local replay only: reconstruct the original six-step intake scope
// from the saved opening and actual client utterances. Never send this marker
// or use it as evidence of a real historical topic or provider consent.
import {coachOpeningProgress,coachOpeningProtocolSnapshot} from '../coaching/coach-opening-protocol.mjs'
const openingKeys=['invitation','name','continuity','focus','feelings','confirmation']
const matches=(a,b)=>Boolean(a&&b&&a.version===b.version&&
 ['completed','declined','name','continuity','focus','feelings','invitationQuote','confirmedQuote'].every(k=>a[k]===b[k])&&
 openingKeys.every(k=>a.checkmarks?.[k]===b.checkmarks?.[k]))
export function recoverPrivateOpeningScope(protocol){
 const saved=protocol?.opening
 const history=(protocol?.turns||[]).filter(row=>row.role==='user'&&row.unanswered!==true)
   .slice(0,32).map(row=>String(row.content||'').slice(0,160))
 const plain={allowPrior:false,priorSession:null}
 const candidateName=typeof saved?.name==='string'?saved.name:''
 const candidates=[plain,...[candidateName,''].flatMap(name=>['','private-resume-continuity-marker'].map(topic=>({allowPrior:true,priorSession:{name,topic}})))]
 for(const scope of candidates){
  const result=coachOpeningProgress({...scope,turns:history,personaId:protocol?.personaId,locale:protocol?.locale})
  if(matches(coachOpeningProtocolSnapshot(result),saved))return {...scope,matched:true}
 }
 // Old drafts may predate the corrected parser. Re-clarify rather than
 // manufacture earlier permission/identity or force their old checkmarks.
 return {...plain,matched:false}
}
