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
export const COACH_PROTOCOL_VERIFICATION_INSTRUCTION="PROTOCOL VERIFICATION: distinguish the literal client transcript from provisional extracted information and confirmed client facts. A request to repeat, a process instruction, a quotation about someone else, a question, hypothetical, uncertain ASR fragment or your own statement is not evidence of a personal name, goal, feeling, rating, decision or other profile fact. If a candidate is ambiguous, contradictory or no longer current, do not use it as a confirmed fact: reflect the possible meaning and ask one specific natural clarifying question when appropriate. Respect refusal and safety; do not mechanically re-ask clear answers. The latest explicit client correction supersedes earlier information; date transient states and verify relevance before referring to older session facts. Never claim the protocol was saved or an item confirmed unless the application actually verified that status."
