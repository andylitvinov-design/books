/**
 * Local, resource-only eight-day meditation roadmap.
 * This is a topic outline, not eight generated treatments or audio assets.
 * It reuses the existing consent-free first-party guided imagery planner.
 */
import {buildPersonalImageryCourse, COURSE_THEMES} from "./personal-guided-course.mjs";

const themedTitles=Object.freeze({
  ru:{
    energy:["Найти спокойную опору","Сад восстановления сил","Ритм без спешки","Дерево устойчивости","Бережные границы энергии","Шаг к доступному ресурсу","Выбрать посильный ритм","Сохранить то, что поддерживает"],
    money:["Ясность без спешки","Сад личных ресурсов","Гибкость в решениях","Опора в работе","Границы справедливого обмена","Шаг к финансовой ясности","Мост нового выбора","Интеграция и устойчивость"],
    relationships:["Пространство, где можно быть собой","Сад тёплых контактов","Удобная дистанция","Опора внутри себя","Дом личных границ","Небольшой честный разговор","Мост доверия и выбора","Близость и свобода"],
    goals:["Найти своё направление","Ресурсы для начала","Гибкость перед переменами","Опора на свои способности","Выбрать важное","Один посильный шаг","Мост к новому действию","Продолжить в своём темпе"],
    life:["Место для себя","Сад повседневных смыслов","Принять естественное движение","Дерево ценностей","Дом того, что важно","Тропа личного выбора","Новый взгляд на будущее","Внести смысл в обычный день"],
    health:["Доступное чувство комфорта","Сад заботы о себе","Ритм отдыха","Телесная опора","Право на удобные границы","Маленький шаг заботы","Выбор поддержки","Мягкое возвращение к дню"]
  },
  en:{
    energy:["A calm place to begin","A garden of renewal","An unhurried rhythm","A tree of steadiness","Kind limits for energy","A step toward support","Choose a manageable pace","Carry forward what helps"],
    money:["Clarity without haste","A garden of resources","Flexibility in decisions","Support in your work","Boundaries in fair exchange","A small step toward clarity","A bridge of choices","Steadiness to carry forward"],
    relationships:["A place to be yourself","A garden of connection","A comfortable distance","Support within yourself","A house of boundaries","One gentle honest conversation","A bridge of trust and choice","Connection with freedom"],
    goals:["Finding direction","Resources for a beginning","Flexibility through change","A tree of strengths","Choosing what matters","One manageable step","A bridge toward action","Continue at your pace"],
    life:["A place of your own","A garden of everyday meaning","Allowing movement","A tree of values","A house of what matters","A path of personal choices","A wider horizon","Meaning in an ordinary day"],
    health:["A moment of comfort","A garden of self-care","A rhythm of rest","Physical support","Comfortable boundaries","A small act of care","Choosing support","Returning gently to your day"]
  },
  es:{
    energy:["Un lugar tranquilo para empezar","Un jardín para renovarte","Un ritmo sin prisa","Un árbol de estabilidad","Límites amables para tu energía","Un paso hacia el apoyo","Elegir un ritmo posible","Conservar lo que ayuda"],
    money:["Claridad sin prisa","Un jardín de recursos","Flexibilidad al decidir","Apoyo en el trabajo","Límites del intercambio justo","Un paso hacia la claridad","Un puente de elecciones","Integrar la estabilidad"],
    relationships:["Un lugar donde ser tú","Un jardín de vínculos","Una distancia cómoda","Apoyo en tu interior","Una casa con límites","Una conversación sincera y suave","Un puente de confianza","Cercanía y libertad"],
    goals:["Encontrar dirección","Recursos para comenzar","Flexibilidad ante cambios","Un árbol de fortalezas","Elegir lo importante","Un pequeño paso posible","Un puente hacia la acción","Continuar a tu ritmo"],
    life:["Un lugar propio","Un jardín de sentido cotidiano","Permitir el movimiento","Un árbol de valores","Una casa para lo importante","Un camino de elecciones","Un horizonte más amplio","Sentido en lo cotidiano"],
    health:["Un momento de comodidad","Un jardín de autocuidado","Un ritmo de descanso","Apoyo corporal","Límites cómodos","Un pequeño acto de cuidado","Elegir apoyo","Volver suavemente al día"]
  }
});
const matchers=[
 ["relationships",/отношен|партнер|партнёр|семь|родител|близк|общен|ссор|разговор|одиночеств|relationship|partner|family|parent|communicat|conflict|lonely|relaci[oó]n|pareja|familia|comunicaci[oó]n/iu],
 ["money",/работ|деньг|финанс|зарплат|доход|гонорар|карьер|клиент|work|salary|money|income|finance|job|career|trabajo|dinero|ingreso|finanzas/iu],
 ["health",/сон|засып|отдых|устал|выгор|самочувств|расслаб|спать|sleep|rest|tired|burnout|wellbeing|relax|dormir|sue[nñ]o|descans|cansad/iu],
 ["goals",/цель|решени|проект|выступ|выбор|прокрастинац|план|goal|decision|project|presentation|choice|purpose|meta|decisi[oó]n|proyecto|elecci[oó]n/iu],
 ["life",/смысл|ценност|зачем|путь|будущ|meaning|values|purpose|future|sentido|valores|futuro/iu],
 ["energy",/энерг|сил|напряж|тревог|стресс|спокой|energy|stress|calm|tense|energi[aí]|estr[eé]s|calma/iu],
];
export function chooseMeditationCourseTheme({request="",theme="energy",explicitTheme=false}={}){
  if(explicitTheme && COURSE_THEMES.includes(theme))return theme;
  const text=typeof request==="string"?request.slice(0,600):"";
  if(text.trim().length>=3){
    const selected=matchers.find(([,pattern])=>pattern.test(text));
    if(selected)return selected[0];
  }
  return COURSE_THEMES.includes(theme)?theme:"energy";
}
/**
 * @param {{locale?: string, theme?: string, explicitTheme?: boolean, request?: string, difficulty?: string, details?: string[]}} [options]
 * @returns {{locale: string, focusTheme: string, days: Array<{id: string, number: number, title: string, motif: string, theme: string, ready: string}>, sessionCount: number, requiresPractitionerReview: boolean, remainingAudioGenerated: boolean, remainingScriptsPublished: boolean}}
 */
export function buildAdaptiveMeditationOutline({
  locale="en",theme="energy",explicitTheme=false,request="",difficulty="",details=[]
}={}){
  const lang=Object.hasOwn(themedTitles,locale)?locale:"en";
  const chosen=chooseMeditationCourseTheme({request,theme,explicitTheme});
  const source=buildPersonalImageryCourse({
    locale:lang,theme:chosen,goals:[chosen],
    keyGoal:request,keyDifficulty:difficulty,detailGoals:details
  });
  const titles=themedTitles[lang][chosen];
  const days=source.sessions.map((day,i)=>({
    id:day.id,number:i+1,title:titles[i],motif:day.motif,theme:chosen,
    ready:i===0?"day1-script-available":"topic-preview",
  }));
  return {locale:lang,focusTheme:chosen,days,sessionCount:8,
    requiresPractitionerReview:true,
    remainingAudioGenerated:false,remainingScriptsPublished:false,
  };
}
