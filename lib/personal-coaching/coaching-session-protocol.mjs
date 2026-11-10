// Evidence-led five-phase protocol for the existing Coaching Brain.
export const COACHING_PROTOCOL_VERSION='hh-coaching-protocol-v2'
export const COACHING_PHASES=Object.freeze(['contract','discovery','exploration','possibilities','action','review'])
const p={
 goal:/\b(?:i want|i would like|my goal|i need to|i hope to|i'm trying to)\b|хочу|мне важно|моя цель|мне нужно|хотел(?:а|ось) бы|\b(?:quiero|me gustaría|mi objetivo|necesito)\b/iu,
 concrete:/\b(?:for example|for instance|yesterday|last week|last time|this morning|when i|at work|recently)\b|например|вчера|на прошлой неделе|в последний раз|сегодня утром|когда я|на работе|недавно|\b(?:por ejemplo|ayer|la semana pasada|la última vez|esta mañana|cuando yo|recientemente)\b/iu,
 obstacle:/\b(?:because|i avoid|i freeze|i froze|i get stuck|i'm afraid|i am afraid|i was afraid|i worry|it stops me|i keep|again|always|conflict|overwhelmed)\b|потому что|избегаю|замираю|застрева|боюсь|боял|опасаюсь|мешает|останавливает|постоянно|снова|всегда|противореч|перегруз|\b(?:porque|evito|me bloqueo|tengo miedo|tenía miedo|me preocupa|me detiene|siempre|otra vez|conflicto|abrumad)\b/iu,
 options:/\b(?:option|alternative|could try|might try|one way|another way|i could|i can choose|i'm considering|what if)\b|вариант|альтернатив|могу попробовать|можно попробовать|один из способов|другой способ|могу выбрать|рассматриваю|а если|\b(?:opción|alternativa|podría intentar|puedo elegir|estoy considerando|y si)\b/iu,
 action:/\b(?:i will|i'll|i am going to|i'm going to|tomorrow i|by friday i|on monday i|i have decided to)\b|я сделаю|я начну|я попробую|завтра я|в понедельник я|к пятнице я|я решил(?:а)?|я выбираю|\b(?:voy a|mañana voy|he decidido|el lunes voy)\b/iu,
 time:/\b(?:today|tomorrow|tonight|this week|next week|on monday|by friday)\b|сегодня|завтра|вечером|на этой неделе|на следующей неделе|в понедельник|к пятнице|\b(?:hoy|mañana|esta semana|la próxima semana|el lunes|antes del viernes)\b/iu
}
const a={contract:['clarify_goal','desired_outcome_not_yet_clear'],discovery:['request_concrete_example','need_a_specific_recent_situation'],exploration:['test_obstacle_or_pattern','need_to_understand_what_blocks_or_repeats'],possibilities:['open_options','situation_is_clear_enough_to_explore_routes'],action:['shape_small_client_chosen_step','a_direction_has_been_named_but_not_scheduled'],review:['confirm_and_integrate','client_named_a_time_bound_action']}
const q={
 en:['What would you like to be different by the end of this conversation?','Can you describe the most recent specific moment when this happened?','What seemed to get in the way at that moment, and what did you notice?','Given what you have described, what possible ways forward do you see?','Which small step do you choose, and when would you realistically do it?','What have you chosen, and what remains uncertain?'],
 ru:['Что именно вы хотели бы прояснить или изменить за этот разговор?','Можете описать последний конкретный случай, когда это произошло?','Что именно тогда помешало или повторилось? Что вы заметили?','Учитывая то, что вы рассказали, какие возможные пути вы видите?','Какой небольшой шаг вы выбираете и когда реально сможете его сделать?','Что вы выбрали? Что уже решено, а что пока остаётся открытым?'],
 es:['¿Qué te gustaría aclarar o cambiar al terminar esta conversación?','¿Puedes describir el momento concreto más reciente en que ocurrió?','¿Qué se interpuso entonces o qué patrón observaste?','Teniendo en cuenta lo que has contado, ¿qué caminos posibles ves?','¿Qué pequeño paso eliges y cuándo podrías hacerlo de forma realista?','¿Qué has elegido y qué sigue abierto?']
}
function userText(input={}){const t=(Array.isArray(input.turns)?input.turns:[]).filter(x=>x?.role==='user'&&typeof x.content==='string').map(x=>x.content.slice(0,900));if(typeof input.message==='string'&&input.message.trim())t.push(input.message.slice(0,1200));return t.join('\n')}
export function analyzeCoachingProtocol(input={}){
 const fullText=userText(input),latest=typeof input.message==='string'?input.message:''
 // An explicit correction supersedes an earlier lexical cue instead of preserving a contradicted hypothesis.
 const correction=/(?:^\s*(?:no\b|нет\b|no es así)|\bnot\b.{0,35}\b(?:afraid|fear|anxious|scared)\b|не\s+(?:боюсь|страшно|тревожно)|no\s+tengo\s+miedo)/iu.test(latest)
 const t=correction?latest.replace(/\b(?:i am not afraid|i'm not afraid|i do not fear|i don't fear|no tengo miedo|no estoy asustado)\b|не\s+(?:боюсь|боялся|страшно|тревожно)/giu,' '):fullText,lang=['en','ru','es'].includes(input.locale)?input.locale:'en'
 const s={goal:p.goal.test(t),concrete_example:p.concrete.test(t),obstacle_or_pattern:p.obstacle.test(t),options_considered:p.options.test(t),client_action:p.action.test(t),time_anchor:p.time.test(t)}
 let phase='contract'
 if(s.goal)phase='discovery'
 if(s.goal&&s.concrete_example)phase='exploration'
 if(s.goal&&s.concrete_example&&s.obstacle_or_pattern)phase='possibilities'
 if(s.goal&&s.concrete_example&&s.obstacle_or_pattern&&s.options_considered)phase='action'
 if(s.goal&&s.concrete_example&&s.obstacle_or_pattern&&s.options_considered&&s.client_action&&s.time_anchor)phase='review'
 const completion={contract:s.goal,discovery:s.concrete_example,exploration:s.obstacle_or_pattern,possibilities:s.options_considered,action:s.client_action&&s.time_anchor,review:s.client_action&&s.time_anchor}
 const unresolved=COACHING_PHASES.filter(k=>k!=='review'&&!completion[k])
 const index=COACHING_PHASES.indexOf(phase)
 return {version:COACHING_PROTOCOL_VERSION,phase,
  legacyStage:{contract:'clarify',discovery:'explore',exploration:'explore',possibilities:'options',action:'decision',review:'review'}[phase],
  signals:s,completion,unresolved,
  timebox:{contract:[0,120],discovery:[120,300],exploration:[300,600],possibilities:[600,900],action:[900,1140],review:[1140,1200]}[phase],
  nextBestAction:{type:a[phase][0],reason:a[phase][1],phase,question:q[lang][index]}}
}
export function coachingProtocolPrompt(x){return ['Five-phase 20-minute protocol; adapt the path, do not follow a fixed questionnaire.','Current phase: '+x.phase+'. Next-best-action: '+x.nextBestAction.type+'. Reason: '+x.nextBestAction.reason+'.','Suggested single question: '+x.nextBestAction.question,'Milestones are evidence-led. Never advance because of turn count or elapsed time.','Lexical signals are routing hints, not facts or psychological conclusions.','If the client corrects an interpretation, accept the correction and re-evaluate.','A partial or unresolved outcome is valid; never manufacture a commitment.'].join('\n')}
