/**
 * Generate seven approved NEXT topics, not seven fake meditation scripts.
 * One Psychologist Mind programme is the authoritative eight-day source.
 */
export const EIGHT_DAY_COURSE_VERSION="meditation-course-outline-v1";
const LABELS=Object.freeze({
 ru:{
  intro:"День 1. Знакомство с опорой",
  descriptions:{
   orientation:"Уточнить, что для вас важно, без давления и оценок.",
   support:"Замечать доступную поддержку и повседневные ресурсы.",
   pattern:"Мягко узнавать привычные реакции без принуждения к переменам.",
   imagery:"Исследовать один безопасный образ только по желанию.",
   beliefs:"Относиться к мыслям с любопытством, сохраняя выбор.",
   boundaries:"Уважать свои границы и выбирать способ общения.",
   self_talk:"Пробовать более добрый внутренний диалог.",
   values:"Выбирать то, что действительно важно для вас.",
   options:"Рассматривать доступные варианты без спешки.",
   practice:"Попробовать небольшой необязательный шаг.",
   transfer:"Перенести один полезный навык в повседневность.",
   integration:"Замечать изменения и решать, что сохранить дальше.",
  },
 },
 en:{
  intro:"Day 1. Finding a starting point",
  descriptions:{
   orientation:"Clarify what matters to you without judgment or pressure.",
   support:"Notice available support and everyday resources.",
   pattern:"Notice familiar patterns without forcing a change.",
   imagery:"Explore a safe resource image only if it suits you.",
   beliefs:"Observe thoughts with curiosity and freedom to choose.",
   boundaries:"Respect boundaries and choose how to communicate.",
   self_talk:"Try a kinder inner conversation.",
   values:"Explore what feels meaningful to you.",
   options:"Consider available options without pressure.",
   practice:"Try one small optional step.",
   transfer:"Bring one useful skill into everyday life.",
   integration:"Review observations and choose what to keep.",
  },
 },
 es:{
  intro:"Día 1. Encontrar un punto de partida",
  descriptions:{
   orientation:"Aclara lo que te importa sin presión ni juicios.",
   support:"Reconoce el apoyo disponible y los recursos cotidianos.",
   pattern:"Observa reacciones conocidas sin forzar cambios.",
   imagery:"Explora una imagen segura de apoyo solo si lo deseas.",
   beliefs:"Observa pensamientos con curiosidad y libertad de elegir.",
   boundaries:"Respeta tus límites y elige cómo comunicarte.",
   self_talk:"Prueba un diálogo interior más amable.",
   values:"Explora aquello que tiene sentido para ti.",
   options:"Considera opciones sin presión.",
   practice:"Prueba un pequeño paso opcional.",
   transfer:"Lleva una habilidad útil a la vida diaria.",
   integration:"Reflexiona sobre lo observado y decide qué conservar.",
  },
 },
});
export function buildEightDayCourseOutline({program,prepared}={}) {
 const brief=prepared?.brief;
 if(prepared?.status!=="brief_ready" || !brief ||
    program?.status!=="ready" || program.mode!=="self_guided" ||
    program.requiresHumanReview===true ||
    program.focus!==brief.focus || program.locale!==brief.locale ||
    !Object.hasOwn(LABELS,brief.locale) ||
    !Array.isArray(program.sessions) || program.sessions.length!==8 ||
    brief.sessionNumber!==1 ||
    !Array.isArray(program.sessions[0]?.methodIds) ||
    !program.sessions[0].methodIds.includes(brief.practice?.methodId))
   return Object.freeze({status:"unavailable",reason:"COURSE_NOT_ELIGIBLE"});
 const l=LABELS[brief.locale];
 for(let i=0;i<8;i++){
   const s=program.sessions[i];
   if(!s || s.number!==i+1 || s.focus!==program.focus ||
      typeof s.title!=="string" || s.title.length<3 ||
      !Object.hasOwn(l.descriptions,s.objectiveCode) ||
      s.requiresHumanApproval===true || s.clinicianMethodsRunnableByAI!==false ||
      s.needsSessionSafetyCheck!==true)
     return Object.freeze({status:"unavailable",reason:"COURSE_SESSION_REJECTED"});
 }
 const nextTopics=Object.freeze(program.sessions.slice(1).map((s,i)=>Object.freeze({
   day:i+2,title:s.title,objectiveCode:s.objectiveCode,
   description:l.descriptions[s.objectiveCode],status:"topic_only",
   meditationGenerated:false,requiresFreshPreflight:true,
 })));
 return Object.freeze({
   status:"ready",version:EIGHT_DAY_COURSE_VERSION,
   origin:"psychologist_mind_eight_session_program",
   locale:brief.locale,focus:brief.focus,goalCode:brief.goal,
   totalDays:8,dayOne:Object.freeze({day:1,title:l.intro,goalCode:brief.goal,
     approvedSkillId:brief.practice.methodId}),
   nextTopics,generatedScripts:1,additionalScriptsGenerated:false,
   audioGenerated:false,orderPlaced:false,needsSeparateCourseConsent:true,
 });
}
