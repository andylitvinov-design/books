// Conservative veto for obviously non-factual speech-control utterances.
// Not a complete semantic classifier, not consent, and not a persistence layer.
export function coachProtocolControlUtterance(value){
  if(typeof value!=='string')return false;
  const s=value.trim().replace(/\s+/gu,' ').replace(/[.!?¡¿]+$/gu,'').trim();
  if(!s)return false;
  // Only clear speech-repair or coaching-process instructions. This is a veto
  // for automatic fact extraction, not a claim that every other quote is true.
  // The actual transcript must always be preserved by its own lifecycle.
  return /^(?:say (?:it |that )?again|(?:please )?repeat(?: it| that| please)?|pardon(?: me)?|what did you say|(?:i (?:did not|didn't|can't) hear(?: you)?))$/iu.test(s)||
    /^(?:but\s+)?(?:i (?:want|need|would like) you to\s+|please\s+)?(?:never forget|do not forget|don't forget|remember|keep in mind)(?:$|[\s,:])/iu.test(s)||
    /^(?:ещ[её] раз|не слышно|не расслышал[аи]?|простите|извините|пожалуйста повторите|повтори(?:те)?(?: пожалуйста)?|скажи(?:те)? (?:ещ[её] раз|снова))$/iu.test(s)||
    /^(?:но\s+)?(?:я\s+(?:хочу|прошу),?\s+чтобы\s+(?:вы|ты)\s+)?(?:пожалуйста,?\s+)?(?:никогда\s+не\s+забыва(?:ли|л[аи]?|йте|й)|не\s+забыва(?:ли|л[аи]?|йте|й)|запомни(?:те)?)(?:$|[\s,:])/iu.test(s)||
    /^(?:otra vez|(?:por favor )?rep(?:ite|ita)(?: por favor)?|no (?:o[ií]|escuch[eé])|perd[oó]n|c[oó]mo)$/iu.test(s)||
    /^(?:pero\s+)?(?:quiero que\s+|por favor,?\s+)?(?:nunca olvid(?:es|e)|no olvid(?:es|e)|recuerda|recuerde)(?:$|[\s,:])/iu.test(s);
}

// Interface commands are retained verbatim in the transcript, but are not
// life facts. A prefixed "no" here is not refusal of the coaching session.
export function coachProtocolSessionControlUtterance(value){
 if(typeof value!=='string')return false
 const s=value.trim().normalize('NFKC').replace(/[’]/gu,"'").replace(/\s+/gu,' ').replace(/[.!?¡¿]+$/gu,'').trim()
 return /^(?:(?:no|yes|okay|ok|please)[,:\s]+)*(?:(?:i (?:want|need|would like) to|can (?:i|you)|could (?:i|you)|please)\s+)?(?:check|see|show(?: me)?|open|read|review|inspect|view|save|download|export|edit)\s+(?:(?:the|my|this)\s+)?(?:session\s+)?(?:protocol|transcript|session (?:notes|report|summary)|conversation history)(?:\s+(?:of|for|from)\s+(?:the |this |today's )?session)?(?:\s+(?:please|now|first))?$/iu.test(s)||
 /^(?:i (?:didn't|did not|couldn't|could not) (?:find|get|hear) (?:an |the )?answer (?:for|in|during) (?:the |this |today's )?session(?: today)?|(?:нет[,:\s]+)?(?:я (?:хочу|хотел[аи]? бы)|мне нужно)?\s*(?:проверить|посмотреть|открыть|покажи(?:те)?|сохранить|скачать|прочитать|проверь(?:те)?)\s+(?:мой |наш |этот )?(?:протокол|транскрипт|расшифровку|итог(?:и)?|отч[её]т)(?:\s+(?:этой |нашей )?сессии)?(?:\s+пожалуйста)?|(?:no[,:\s]+)?(?:quiero|necesito|quisiera|puedo|puedes|por favor)?\s*(?:ver|revisar|abrir|mostrar|guardar|descargar|leer)\s+(?:(?:el|mi|la)\s+)?(?:protocolo|transcripci[oó]n|informe|resumen)(?:\s+de (?:la |esta )?sesi[oó]n)?)$/iu.test(s)
}

// A conservative veto shared by the displayed card, Director, semantic hints
// and opening. Preserve literal transcript separately; veto is NOT erasure,
// and passing it is NOT a verified personal fact.
export function coachProtocolEvidenceVeto(value,{historicalReview=false}={}){
 if(typeof value!=='string'||!value.trim())return true
 const s=value.trim()
 if(coachProtocolControlUtterance(s)||(!historicalReview&&coachProtocolSessionControlUtterance(s))||/[?？¿]/u.test(s))return true
 // Withhold explicitly reported speech before splitting into clauses.
 if(/^["“«„]/u.test(s))return true
 return /(?:\b(?:he|she|they|my (?:friend|partner|mother|father|boss|colleague|sister|brother|child))\s+(?:said|says|told me|asked me)\b|(?:он|она|они|мой (?:друг|муж|коллега|отец|сын)|моя (?:подруга|жена|мама|сестра|дочь))\s+(?:сказал[аи]?|говорит|говорят|говорил[аи]?|ответил[аи]?)|(?:\b(?:él|ella|ellos|mi (?:amigo|amiga|pareja|madre|padre|jefe|hermano|hermana))\s+(?:dijo|dice|me dijo|preguntó)\b))/iu.test(s)
}
export const COACH_FIELD_FACT_STATES=Object.freeze(['confirmed','needs_confirmation','not_explored','skipped_by_client'])
export function coachProtocolCandidateStatus(value){
 return value?'needs_confirmation':'not_explored'
}

export const COACH_PROTOCOL_VERIFICATION_INSTRUCTION="PROTOCOL VERIFICATION: distinguish the literal client transcript from provisional extracted information and confirmed client facts. A request to repeat, a process instruction, a quotation about someone else, a question, hypothetical, uncertain ASR fragment or your own statement is not evidence of a personal name, goal, feeling, rating, decision or other profile fact. If a candidate is ambiguous, contradictory or no longer current, do not use it as a confirmed fact: reflect the possible meaning and ask one specific natural clarifying question when appropriate. Respect refusal and safety; do not mechanically re-ask clear answers. The latest explicit client correction supersedes earlier information; date transient states and verify relevance before referring to older session facts. Never claim the protocol was saved or an item confirmed unless the application actually verified that status. REQUIRED QUESTION CYCLE: A) capture the literal finalized client answer for the current protocol field as a candidate, not a fact; B) check relevance, meaning, consistency and required format. Do not use a bare yes/no as an open-ended answer; if ambiguity, ASR doubt, mismatch or correction remains, ask one natural clarification about that same field and wait for an unambiguous client confirmation of the exact meaning. C) only the application may acknowledge saving a validated answer or an explicit skip; never announce a save from model speech. Do not move to a new protocol field while the application reports pending clarification or save. For a clear explicit field-bound answer use the validated value without mechanically re-asking; no pressure, no invented values, no repeated confirmation after a valid receipt. A disconnect is not completion; no automatic homework. The client may refuse or stop, and safety always overrides the protocol."
