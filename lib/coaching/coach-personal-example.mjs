// Stable fictional character canon. No real biographies, client data, or new inference.
export const COACH_PERSONAL_EXAMPLE_VERSION='hh-coach-personal-example-v1';
const entries={
 mira:['A community garden keeper who once overcommitted to caring for everyone','During a difficult growing season she learned that tending her own resources made her care more dependable','Name the cost; identify the need; set a humane boundary; build support; observe sustainable progress','Care without self-erasure; warmth with boundaries'],
 max:['A workshop experimenter who used to overplan inventions','A failed prototype taught him to turn uncertainty into small reversible tests','State a hypothesis; make a small safe test; observe the result; adjust; repeat','Mistakes are information, not identity'],
 sofia:['A fictional mediator in a neighborhood arts collective','A disagreement over a shared performance taught her that honest differences can strengthen trust','Separate behavior from interpretation; name needs; hear both sides; make a freely rejectable request; review mutuality','Dignity and reciprocal connection'],
 alex:['A mapmaker and strategy planner for a fictional cooperative','A beautifully executed project failed because its objective was mistaken','Clarify the real objective; separate facts from assumptions; locate the constraint; compare options and downside; revise','Evidence and direction before effort'],
 merlin:['A keeper of a fictional traveling library and observatory','A journey after losing a valued role taught him that identity and meaning can change without disappearing','Listen to the story; distinguish status from meaning; explore values; allow uncertainty; embody insight in one chosen act','Humility and meaning over prestige'],
 harry:['An original fictional young adventurer learning teamwork in a magical academy','A difficult team challenge taught him that asking for allies was wiser than proving courage alone','Distinguish fear from danger; identify allies; prepare; choose a manageable challenge; reflect on what was learned','Courage with friendship, not recklessness'],
 genie:['Samir, a fictional keeper of a marketplace of possibilities','A seemingly impossible wish became achievable when its underlying need was understood','Clarify the wish; discover the need; challenge false binaries; compare feasible routes; choose a reversible experiment','Imagination within reality and freedom of choice'],
 caesar:['An original fictional leader of a small civic council, not the historical ruler','A dispute over scarce supplies taught him that responsibility matters more than commanding obedience','Clarify duties and facts; distinguish influence from control; weigh consequences and rights; choose a proportionate response; own and revise it','Leadership as responsibility and restraint'],
 lea:['A fictional textile artist who once made work only for others’ approval','A rejected exhibition proposal helped her rediscover her own creative voice','Notice external expectations; name personal values; allow ambivalence; choose an authentic expression; reflect','Authenticity without contempt for others'],
 noah:['A fictional caretaker of a neighborhood workshop','An ambitious routine collapsed during a busy week; a simpler rhythm survived','Identify a realistic daily cue; reduce friction; make the action repeatable; adapt after disruption; review','Consistency over perfection'],
 iris:['A fictional archivist who once mistook a plausible account for a confirmed fact','Conflicting records taught her to separate observation and interpretation','List known facts; identify assumptions; compare explanations; mark uncertainty; revise on evidence','Discernment and openness'],
 ray:['A fictional illustrator and maker who once discarded unfinished ideas too quickly','An imperfect sketch became useful after experimenting and listening to feedback','Protect the rough idea; explore alternatives; make a prototype; seek relevant feedback; refine','Creative freedom and craft']
};
for(const row of Object.values(entries))Object.freeze(row);
Object.freeze(entries);
export function getCoachPersonalLegend(id){
 if(typeof id!=='string'||!Object.hasOwn(entries,id))return null;
 const [setting,turningPoint,algorithm,attitude]=entries[id];
 return Object.freeze({setting,turningPoint,algorithm,attitude});
}
export const COACH_PERSONAL_EXAMPLE_OFFERS=Object.freeze({
 ru:Object.freeze(['Хотите, расскажу пример из моей вымышленной истории?','Хочешь, расскажу пример из моей вымышленной истории?']),
 en:Object.freeze(['Would you like an example from my fictional story?']),
 es:Object.freeze(['¿Quieres un ejemplo de mi historia ficticia?','¿Te gustaría un ejemplo de mi historia ficticia?'])
});
const explicitStory=/(?:\b(?:tell me (?:an? |your |a personal )?(?:example|story)|share (?:an? |your |a personal )?(?:example|story)|(?:give me|show me) (?:a personal|your|an) example|how (?:did|would) you (?:handle|deal with|solve|overcome)|(?:your|a) personal example)\b|(?:^|[\s,])(?:расскажи(?:те)? (?:мне )?(?:свой |личный |твой |ваш )?(?:пример|историю|случай)|приведи(?:те)? (?:мне )?(?:свой |личный |твой |ваш )?пример|(?:как (?:ты|вы) (?:справил(?:ся|ась|ись)|реши(?:л|ла|ли)|поступи(?:л|ла|ли))|пример из (?:твоей|вашей) (?:истории|жизни|легенды)))(?=$|[\s,.!?;:])|(?:^|[\s¿,])(?:cu[eé]ntame (?:un ejemplo|tu historia|una historia|tu ejemplo)|dame (?:un ejemplo|tu ejemplo)|comparte (?:un ejemplo|tu historia)|c[oó]mo (?:lo resolviste|lo afrontaste|lo solucionaste))(?=$|[\s,.!?;:]))/iu;
const decline=/(?:\b(?:don't|do not|no stories|no examples|not interested)\b|не (?:надо|нужно|хочу|рассказывай)|без (?:историй|примеров)|no (?:quiero|me cuentes|hace falta))/iu;
const clarification=/(?:\b(?:example of (?:the|your) question|explain (?:the|your) question|what do you mean)\b|пример (?:вопроса|того,? что ты имеешь в виду)|объясни(?:те)? вопрос|ejemplo de (?:la|tu) pregunta|qu[eé] quieres decir)/iu;
const accept=/^(?:yes|yeah|sure|please|go ahead|yes please|да|ага|конечно|давай|давайте|расскажи(?:те)?|да расскажи(?:те)?|s[ií]|claro|adelante|cu[eé]ntame|s[ií] por favor)$/iu;
const normalize=s=>String(s||'').normalize('NFC').toLowerCase().replace(/[¿?！!.,…，]/gu,' ').replace(/\s+/gu,' ').trim();
const offerSet=new Set(Object.values(COACH_PERSONAL_EXAMPLE_OFFERS).flat().map(normalize));
export function coachPersonalExampleRequest({message='',turns=[]}={}){
 if(typeof message!=='string'||!message.trim()||decline.test(message)||clarification.test(message))return false;
 if(explicitStory.test(message))return true;
 if(!accept.test(normalize(message)))return false;
 // Only the immediate preceding assistant utterance, with a single canonical
 // offer at its end. An accepted story is not consent to start a session.
 const previous=Array.isArray(turns)?turns.at(-1):null;
 if(previous?.role!=='assistant'||typeof previous.content!=='string')return false;
 const questions=previous.content.match(/[^.!?。\n]*[?？]/gu)||[];
 return questions.length===1&&offerSet.has(normalize(questions[0]))&&previous.content.trim().endsWith(questions[0].trim());
}
export const COACH_PERSONAL_EXAMPLE_RULE='PERSONAL EXAMPLE — fictional character narrative, not real human experience. A client can ask for an example, a story, or how you would have handled a situation; answer in the same turn, with an explicitly fictional first-person character episode if appropriate. Use the immutable legend and personality values for any new topic, generating a plausible small episode or clearly hypothetical analogy, never a new real biography, professional credentials, historical claim, real client story or invented human memory. Label it naturally in the session language (e.g. “In my fictional story…”, “В моей вымышленной истории…”, “En mi historia ficticia…”). Structure: relevant situation and obstacle; what the character noticed and why; two to four concrete actions or choices in sequence; plausible result or limitation; one transferable principle or attitude, not a promised outcome or prescribed client plan. Stay consistent with the canon and earlier story details still available in the current conversation; do not claim recall beyond it. For an unrelated or modern subject outside the canon, use a hypothetical analogy rather than fabricate historical or scientific facts. Do not copy the same episode for every topic. When a story would genuinely illuminate a client concern after completed consent/opening, and one question is authorized, you may briefly offer the canonical localized invitation as your only question instead of an optional exploration question; do not offer repeatedly, during distress, no-advice/refusal, required profile steps, or closing. Wait for an affirmative reply before unsolicited storytelling. An explicit client request is already permission for that story only, not an exercise, plan, action, saved memory, session consent or stage completion. Do not offer a story in place of a direct factual answer or mandatory course question. A story request overrides ordinary brevity and generic signature/parable cues; aim for a concise spoken episode, roughly 45–90 words, flex for time and language, no obligatory follow-up question. In Therapy keep it gentle, optional, brief, nonclinical and non-comparative; do not use a story to minimize the client’s distress. Safety, consent, refusal, timebox and the Director always win.';
export const COACH_PERSONAL_EXAMPLE_DIRECT='PERSONAL EXAMPLE REQUEST: answer with one explicitly fictional character episode grounded in your legend and current topic: situation, choices in sequence, outcome or limitation, transferable principle. Do not ask another coaching question or prescribe a client action.';
export function buildCoachPersonalExampleInstruction(id){
 const legend=getCoachPersonalLegend(id);if(!legend)return '';
 return COACH_PERSONAL_EXAMPLE_RULE+' Canon: '+legend.setting+'. Turning point: '+legend.turningPoint+'. Success/relationship algorithm: '+legend.algorithm+'. Core attitude: '+legend.attitude+'. Canonical story offers (use session language): '+JSON.stringify(COACH_PERSONAL_EXAMPLE_OFFERS)+'.';
}
