/**
 * Holistic Intelligence / Judgment Mind 1.1.
 * Pure, rule-based, non-clinical and ephemeral. No networking, tracking, billing
 * or persistence. Host safety and authorization are mandatory and separate.
 */
import {planEmotionalReaction} from "./emotional-reaction.mjs";
import {reviewPracticeBoundary} from "./practice-boundary.mjs";
import {understandConversationTurn} from "./conversation-intelligence.mjs";
import {reasonAboutConversationTurn} from "./reasoning-mind.mjs";
export const JUDGMENT_MIND_VERSION="hh-judgment-mind-v1.1";
export const PILOT_SITUATION_CODES=Object.freeze([
  "overload","starting","conflict","loneliness","self_criticism","uncertainty","fatigue","stress"
]);
const LANGS=new Set(["ru","en","es"]);
const norm=s=>String(s??"").toLocaleLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/gu,"").replace(/ё/g,"е")
  .replace(/[’']/g,"").replace(/\s+/g," ").trim();
const L=(ru,en,es)=>({ru,en,es});
const RULES=Object.freeze({
  overload:{
    patterns:L(/(?:не успеваю|слишком много дел|много задач|завал(?:ило| на работе)|перегружен(?:а)?|не справляюсь с делами)/u,
      /(?:i (?:cant|cannot) keep up|too much (?:to do|work)|overwhelmed (?:by|with) (?:tasks|work)|i have (?:so many|too many) tasks)/u,
      /(?:no (?:me )?da tiempo|demasiadas tareas|tengo demasiadas cosas que hacer|no doy abasto)/u),
    question:L("Похоже, сейчас трудно всё успеть. Больше давит количество дел или срочность?","It sounds hard to keep up. Is it the number of tasks or the urgency?","Parece difícil llegar a todo. ¿Pesa más la cantidad de tareas o la urgencia?"),
    options:L(["Много дел","Срочность"],["Too many tasks","Urgency"],["Muchas tareas","Urgencia"]),
    steps:L(["Можно выбрать одно посильное дело на пять минут.","Можно выделить пять минут для самого срочного дела."],
      ["You could pick one manageable task for five minutes.","You could give the most urgent task five minutes."],
      ["Puedes elegir una pequeña tarea para cinco minutos.","Puedes dedicar cinco minutos a la tarea más urgente."])
  },
  starting:{
    patterns:L(/(?:не могу начать|трудно начать|сложно начать|трудно приступить|откладываю (?:дело|задач|начало)|прокрастинирую)/u,
      /(?:i (?:cant|cannot) (?:get started|start)|hard to (?:begin|start)|keep putting (?:it|tasks|things) off)/u,
      /(?:me cuesta empezar|no puedo empezar|pospongo (?:todo|las tareas)|me cuesta ponerme)/u),
    question:L("Неясно, с чего начать, или трудно найти время?","Is the first step unclear, or is it hard to find time?","¿No está claro el primer paso o cuesta encontrar tiempo?"),
    options:L(["Первый шаг","Найти время"],["First step","Find time"],["Primer paso","Encontrar tiempo"]),
    steps:L(["Можно записать первый шаг, который займёт две минуты.","Можно выбрать короткое свободное окно, не обещая закончить всё."],
      ["You could write down a two-minute first step.","You could reserve a short window without committing to finishing."],
      ["Puedes apuntar un primer paso de dos minutos.","Puedes reservar un rato breve sin exigirte terminar."])
  },
  conflict:{
    patterns:L(/(?:мы поссорились|я поссорил(?:ся|ась)|поругались|у меня конфликт с|мы ссоримся)/u,
      /(?:we (?:argued|had an argument|fell out)|i (?:argued|had a conflict) with|we keep arguing)/u,
      /(?:nos peleamos|hemos discutido|tuve un conflicto con|discutimos mucho)/u),
    question:L("Сейчас важнее быть услышанным или восстановить контакт?","Would you rather be heard or try to reconnect?","¿Es más importante que te escuchen o recuperar el contacto?"),
    options:L(["Быть услышанным","Восстановить контакт"],["Be heard","Reconnect"],["Que me escuchen","Retomar contacto"]),
    steps:L(["Можно записать для себя одну фразу о важном, ничего не отправляя.","Можно черновиком написать спокойную фразу без обвинений, не отправляя её."],
      ["You could privately write one sentence about what matters, without sending it.","You could draft one calm sentence without sending it."],
      ["Puedes escribir para ti una frase importante sin enviarla.","Puedes redactar una frase tranquila sin enviarla."])
  },
  loneliness:{
    patterns:L(/(?:мне одиноко|я чувствую себя одиноко|нет с кем поговорить|чувствую одиночество)/u,
      /(?:i feel lonely|im lonely|i have no one to talk to|i feel alone)/u,
      /(?:me siento sol[oa]|estoy sol[oa] y triste|no tengo con quien hablar|siento soledad)/u),
    question:L("Вам хочется поговорить здесь или связаться с кем-то знакомым?","Would you rather talk here or consider reaching someone you know?","¿Prefieres hablar aquí o contactar con alguien conocido?"),
    options:L(["Поговорить здесь","Связаться с близким"],["Talk here","Reach someone"],["Hablar aquí","Contactar a alguien"]),
    steps:L(["Можем просто поговорить. Необязательно искать решение прямо сейчас.","Можно подумать об одном человеке и написать черновик сообщения без обязательства его отправлять."],
      ["We can just talk. You don't have to solve anything now.","You could think of one person and draft a message without having to send it."],
      ["Podemos simplemente hablar. No hace falta resolver nada ahora.","Puedes pensar en alguien y redactar un mensaje sin obligación de enviarlo."])
  },
  self_criticism:{
    patterns:L(/(?:я себя (?:ругаю|критикую|обвиняю)|постоянно себя ругаю|я все делаю неправильно|я считаю себя неудачник)/u,
      /(?:i keep blaming myself|i (?:always )?criticize myself|i feel like i do everything wrong)/u,
      /(?:me culpo (?:por todo|siempre)|me critico (?:mucho|todo el tiempo)|siento que hago todo mal)/u),
    question:L("Важнее разобрать конкретную ситуацию или поддержать себя?","Would you rather examine one event or find a kinder way to speak to yourself?","¿Prefieres revisar un hecho concreto o hablarte con más amabilidad?"),
    options:L(["Конкретная ситуация","Поддержка себе"],["Specific event","Self-support"],["Situación concreta","Apoyo personal"]),
    steps:L(["Можно назвать один факт, отдельно от оценки себя целиком.","Можно попробовать одну нейтральную фразу поддержки без принуждения."],
      ["You could name one fact without judging your whole self.","You could try one neutral, supportive sentence without forcing it."],
      ["Puedes nombrar un hecho sin juzgarte como persona.","Puedes probar una frase neutral de apoyo sin forzarte."])
  },
  uncertainty:{
    patterns:L(/(?:не знаю,? что делать|не понимаю,? что делать дальше|не могу определиться|не знаю,? как поступить|не знаю,? что выбрать)/u,
      /(?:i dont know what to do|im not sure what to do next|i cant decide what to do|i dont know which to choose)/u,
      /(?:no se que hacer|no se que elegir|no se como decidir)/u),
    question:L("Не хватает информации или трудно выбрать между вариантами?","Is information missing, or is choosing between options difficult?","¿Falta información o cuesta elegir entre opciones?"),
    options:L(["Не хватает данных","Трудно выбрать"],["Missing information","Hard to choose"],["Falta información","Cuesta elegir"]),
    steps:L(["Можно записать один вопрос, на который нужна информация.","Можно назвать один критерий выбора, который важен вам."],
      ["You could write down one question you need answered.","You could name one criterion that matters to you."],
      ["Puedes escribir una pregunta que necesita respuesta.","Puedes elegir un criterio que sea importante para ti."])
  },
  fatigue:{
    patterns:L(/(?:я (?:сильно |очень )?устал(?:а)?|мне не хватает сил|у меня нет сил|я постоянно устаю)/u,
      /(?:i feel (?:very )?(?:tired|exhausted)|im (?:very )?(?:tired|exhausted)|i have no energy|i keep feeling exhausted)/u,
      /(?:estoy (?:muy )?cansad[oa]|me siento (?:muy )?cansad[oa]|no tengo energia|estoy agotad[oa])/u),
    question:L("Хочется сейчас сделать паузу или подумать о поддержке?","Would you rather pause now or consider what support you need?","¿Prefieres hacer una pausa o pensar qué apoyo necesitas?"),
    options:L(["Сделать паузу","Подумать о поддержке"],["Take a pause","Consider support"],["Hacer una pausa","Pensar en apoyo"]),
    steps:L(["Можно сделать обычный перерыв без техник. При сильной или длительной слабости обратитесь к врачу.","Можно отметить доступную поддержку. Сильную или длительную усталость лучше обсудить с врачом."],
      ["An ordinary break may help. Seek medical advice for severe or persistent fatigue.","You could consider available support. Ask a clinician about severe or persistent fatigue."],
      ["Puedes hacer una pausa normal. Consulta a un médico si el cansancio es intenso o duradero.","Puedes pensar en qué apoyo tienes. Consulta a un médico si el cansancio persiste."])
  },
  stress:{
    patterns:L(/(?:я (?:сильно |очень )?нервничаю|я (?:в )?стрессе|я тревожусь|мне тревожно|я сильно переживаю)/u,
      /(?:i feel stressed|im stressed|i feel anxious|im anxious|i keep worrying)/u,
      /(?:estoy estresad[oa]|me siento estresad[oa]|tengo ansiedad por|estoy nervios[oa]|me siento ansios[oa])/u),
    question:L("Беспокоит конкретная ситуация или накопившаяся нагрузка?","Is one situation or a buildup of demands weighing on you?","¿Te preocupa una situación concreta o una carga acumulada?"),
    options:L(["Одна ситуация","Много всего"],["One situation","Buildup of demands"],["Una situación","Carga acumulada"]),
    steps:L(["Можно коротко назвать одну вещь в ситуации, которую вы контролируете.","Можно отложить одну необязательную нагрузку. Специальных упражнений не нужно."],
      ["You could name one thing within your control in that situation.","You could set aside one optional demand for now. No exercise is required."],
      ["Puedes nombrar algo que esté bajo tu control.","Puedes apartar una exigencia opcional. No necesitas hacer ejercicios."])
  }
});
const TEXT=L({
  accept:"Спасибо, услышал. ",correction:"Понял поправку. Что сейчас важнее прояснить?",pause:"Принято. Не буду предлагать шаги. Можем просто поговорить или остановиться.",
  yes:"Спасибо за отзыв. Оставьте этот шаг, если он вам подходит.",
  no:"Спасибо за отзыв. Не буду повторять этот шаг. Можем сменить тему.",
  handoff:"Здесь лучше обратиться за помощью к квалифицированному специалисту. При непосредственной опасности — в экстренную службу.",
  feedback:["Было полезно","Не подошло"]
},{
  accept:"Thanks, I understand. ",correction:"Thanks for correcting me. What would you like to clarify now?",pause:"Understood. I won't suggest steps. We can just talk or stop.",
  yes:"Thanks for the feedback. Keep this step if it suits you.",
  no:"Thanks for the feedback. I won't repeat it. We can change topics.",
  handoff:"A qualified professional would be better placed to help. If there is immediate danger, contact local emergency services.",
  feedback:["It helped","Not for me"]
},{
  accept:"Gracias, te escucho. ",correction:"Gracias por aclararlo. ¿Qué te gustaría entender ahora?",pause:"Entendido. No propondré pasos. Podemos hablar o parar.",
  yes:"Gracias por tu opinión. Mantén el paso si te resulta útil.",
  no:"Gracias por tu opinión. No lo repetiré. Podemos cambiar de tema.",
  handoff:"Conviene buscar ayuda profesional cualificada. Si hay un peligro inmediato, llama a emergencias locales.",
  feedback:["Me ayudó","No me sirvió"]
});
const DIRECT=/(?:\b(?:create|make|generate|download|book|find|play|order)\b.{0,60}\b(?:video|audio|meditation|test|order|booking|content|file)\b|\bwhere(?:s| is) my (?:order|video)|(?:создай|сделай|сгенерируй|скачай|запиши|отправь|найди|подбери|открой|покажи|где|статус|проверь).{0,65}(?:видео|видеорол|ролик|аудио|медитац|тест|заказ|ссылк|контент|запис)|(?:мой заказ|где заказ)|(?:crea|crear|haz|genera|descarga|encuentra|busca|donde esta|estado de).{0,65}(?:video|audio|meditacion|prueba|pedido|contenido))/u;
const NEGATION=/(?:не устал(?:а)?\b|не устаю\b|не чувствую (?:усталост|одиночеств|тревог)|не одинок(?:а)?\b|мне не одиноко\b|не тревожусь\b|не нервничаю\b|нет (?:стресса|проблем|конфликта)\b|не испытываю стресс|(?:im|i am) not (?:tired|lonely|stressed|anxious)|i (?:dont|do not) feel (?:tired|lonely|stressed|anxious)|no (?:estoy|me siento) (?:cansad[oa]|sol[oa]|estresad[oa]|ansios[oa])|no tengo (?:estres|ansiedad))/u;
const STOP=/(?:^(?:стоп|хватит|остановись|stop|basta|para|alto)(?:[.! ]|$)|не хочу (?:советов|упражнений|рекомендаций)|не предлагай (?:ничего|практики|советы)|не сейчас|не вспоминай об этом|no (?:quiero|necesito) consejos|no me (?:aconsejes|propongas)|dont (?:give me advice|suggest anything)|do not (?:advise|suggest)|not now|no advice|leave me alone)/u;
const UNSAFE=/(?:хочу умереть|не хочу жить|покончу с собой|суицид|боль в груди|не могу дышать|трудно дышать|физическое насилие|меня бьют|i want to die|kill myself|suicid|chest pain|cant breathe|cannot breathe|trouble breathing|domestic violence|quiero morir|me quiero matar|dolor en el pecho|no puedo respirar|violencia domestica)/u;
const CORRECTION=/(?:^(?:нет|не так|точнее|поправка|no|actually|rather|en realidad|mejor dicho)[\s,.!:;]+|не (?:из-за|про|по причине).{1,55}(?:,\s*а\b|\sа\s)|\b(?:i meant|not because|i mean|quise decir|no es por)\b)/u;
const FIRST_PERSON={
  ru:/(?:^|[^\p{L}])(?:я|мне|у меня|мы|не могу|не знаю|не понимаю|ничего не успеваю|нет с кем поговорить|трудно|сложно|постоянно)/u,
  en:/(?:\b(?:i|im|we)\b)/u,
  es:/(?:\b(?:estoy|me|tengo|nos|no se|no puedo)\b)/u
};
const RISK=(state,extra={})=>({
  schemaVersion:JUDGMENT_MIND_VERSION,status:"handled",state,situationCode:null,evidenceTier:"E0",
  hypotheses:[],uncertainty:"unconfirmed",turnId:null,conversationRevision:null,
  expiresInSeconds:300,choices:[],needsChoice:false,actionExecuted:false,
  clinicalConclusion:false,memorySaved:false,reply:"",pending:null,...extra
});
export function judgmentSituationCatalog() {
  return PILOT_SITUATION_CODES.map(code=>({code,active:true,clinical:false}));
}
const validPending=p=>p&&typeof p==="object"&&PILOT_SITUATION_CODES.includes(p.situationCode)
  &&["awaiting_choice","feedback"].includes(p.stage)
  &&(p.choiceId===undefined||["a","b"].includes(p.choiceId));
const classify=(text,lang)=>{
  let x=text;
  if(CORRECTION.test(x)&&/(?:,\s*а\s| а | but | sino | rather | instead )/u.test(x))
    x=x.split(/(?:,\s*|\s+)(?:а|but|sino|rather|instead)\s+/u).slice(-1)[0];
  if(NEGATION.test(x)||!FIRST_PERSON[lang].test(x))return null;
  return PILOT_SITUATION_CODES.find(code=>RULES[code].patterns[lang].test(x))||null;
};
const chosenStep=(code,id,lang)=>{
  const index=id==="a"?0:1,rule=RULES[code],copy=TEXT[lang];
  return RISK("step_offered",{evidenceTier:"E2",situationCode:code,uncertainty:"user_selected",
    hypotheses:[code+"."+id],reply:copy.accept+rule.steps[lang][index],
    choices:[{id:"helpful",label:copy.feedback[0]},{id:"not_helpful",label:copy.feedback[1]}],
    pending:{stage:"feedback",situationCode:code,choiceId:id}});
};
/** Only trusted server should pass pending from a signed owner-bound token. */
export function planJudgmentTurn({message="",locale="en",safety={},pending=null,choiceId=null,history=[]}={}) {
  const lang=LANGS.has(locale)?locale:"en",text=norm(message);
  if(!text||text.length>3000||safety?.status!=="clear")
    return RISK("abstained",{status:"abstain"});
  if(UNSAFE.test(text))return RISK("safety_handoff",{status:"handoff",reply:TEXT[lang].handoff});
  const practice=reviewPracticeBoundary(message,lang);
  if(practice)return RISK("safety_handoff",{status:"handoff",reply:practice.reply});
  if(STOP.test(text))return RISK("paused",{reply:TEXT[lang].pause,uncertainty:"user_declined"});
  if(DIRECT.test(text))return RISK("abstained",{status:"abstain"});
  const conversational=understandConversationTurn({message,locale:lang,history});
  const reasoning=reasonAboutConversationTurn({message,locale:lang,history});
  const knownSituation=classify(text,lang);
  const structuralActs=["correction","follow_up","ambivalence","feedback","topic_switch","forget_goal"];
  const reasoningRequiresRepair=["accept_correction_and_reframe","reflect_tradeoff_then_clarify",
    "repair_answer_style_or_relevance"].includes(reasoning.nextMove);
  if((structuralActs.includes(conversational.act)||reasoningRequiresRepair)&&conversational.replyFallback&&!knownSituation)
    return RISK("reframed",{evidenceTier:"E1",uncertainty:"explicit_conversation",
      reply:conversational.replyFallback,
      pending:!["correction","topic_switch","forget_goal"].includes(conversational.act)&&validPending(pending)?pending:null});
  const emotion=planEmotionalReaction({message,locale:lang,history,safety});
  if(!emotion&&!knownSituation&&["disclosure","uncertainty"].includes(conversational.act)&&conversational.replyFallback)
    return RISK("emotion_acknowledged",{evidenceTier:"E1",uncertainty:"tentative",
      reply:conversational.replyFallback,pending:validPending(pending)?pending:null,reasoning});
  if(emotion)return RISK("emotion_acknowledged",{
    evidenceTier:"E1",uncertainty:"tentative",reply:emotion.reply
  });
  if(validPending(pending)&&!CORRECTION.test(text)){
    if(pending.stage==="awaiting_choice"){
      const options=RULES[pending.situationCode].options[lang];
      // Signed button selection is subordinate to the current user words.
      const matched=text===norm(options[0])?"a":text===norm(options[1])?"b":null;
      const selected=choiceId===null||choiceId===undefined||choiceId===matched?matched:null;
      if(selected)return chosenStep(pending.situationCode,selected,lang);
    }
    if(pending.stage==="feedback"){
      const matched=text===norm(TEXT[lang].feedback[0])?"helpful":
        text===norm(TEXT[lang].feedback[1])?"not_helpful":null;
      const feedback=choiceId===null||choiceId===undefined||choiceId===matched?matched:null;
      if(feedback)return RISK("feedback_received",{
        evidenceTier:"E3",situationCode:pending.situationCode,uncertainty:"user_feedback",
        reply:feedback==="helpful"?TEXT[lang].yes:TEXT[lang].no
      });
    }
  }
  const code=classify(text,lang);
  if(!code){
    if(validPending(pending)&&CORRECTION.test(text))
      return RISK("reframed",{status:"handled",uncertainty:"user_declined",
        reply:TEXT[lang].correction});
    return RISK("abstained",{status:"abstain"});
  }
  const rule=RULES[code],reply=rule.question[lang];
  if(reply.length>235||(reply.match(/[?？]/g)||[]).length>1)
    return RISK("abstained",{status:"abstain"});
  return RISK("awaiting_choice",{
    evidenceTier:"E1",situationCode:code,uncertainty:"tentative",
    hypotheses:[code+".a",code+".b"],reply,needsChoice:true,
    choices:[{id:"a",label:rule.options[lang][0]},{id:"b",label:rule.options[lang][1]}],
    pending:{stage:"awaiting_choice",situationCode:code}
  });
}
export function continueJudgmentTurn(args={}) { return planJudgmentTurn(args); }
