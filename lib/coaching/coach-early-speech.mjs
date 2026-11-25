// Pure conservative per-sentence gate. No extra model request or stored audio.
const sentence=/^([\s\S]{20,220}?[.!?。！？])(?=\s|$)/u
const unsafeShape=/[<>{}*\x60]|https?:\/\/|www\./iu
export function firstCoachEarlySentence(draft){
  if(typeof draft!=='string'||draft.length>700)return ''
  const match=draft.trimStart().match(sentence)
  if(!match)return ''
  const phrase=match[1].trim()
  if(phrase.includes('\n')||unsafeShape.test(phrase)||
     (phrase.match(/[?？]/gu)||[]).length>1)return ''
  return phrase
}
/** Complete candidate receives the SAME conversation parser and server Director.
 * The rest stays provisional until the full-turn validation succeeds. */
export function approveCoachEarlySentence({draft,input,directive,parseReply,enforceDirective}={}){
  const phrase=firstCoachEarlySentence(draft)
  if(!phrase||typeof parseReply!=='function'||typeof enforceDirective!=='function'||
     !directive?.methodId||!directive?.stage)return ''
  try{
    const parsed=parseReply(JSON.stringify({
      message:phrase,planSuggestion:'',evidenceQuote:'',
      clientEvidence:{kind:'none',quote:''}
    }),input,directive.methodId,directive.stage)
    const checked=enforceDirective(parsed,directive)
    return checked?.mode==='ai'&&checked.message===phrase?phrase:''
  }catch{return ''}
}
