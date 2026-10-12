// Draft adapter for the new course. The released 14-day library remains immutable.
import { lessonFor as legacyLessonFor, COURSE_CONTENT_VERSION as LEGACY_VERSION, TRACKS }  from './lesson-library.js'
import { WEEK_THREE_DAYS, WEEK_THREE_CONTENT_STATUS } from '../../data/inner-growth/week-three-days.js'
import { courseWeek, courseTrackForDay } from './course-progression-21.js'
import { CURRICULUM_21 } from '../../data/inner-growth/curriculum-21.js'

export const COURSE_CONTENT_21_VERSION='hh-growth-21-v1-draft'
export const COURSE_CONTENT_21_STATUS='ORIGINAL_DRAFT_REVIEW_REQUIRED'
export function courseOutline21(locale='en',journey=null) {
  if(!['en','ru'].includes(locale))return null
  if(journey && journey.contentVersion!==COURSE_CONTENT_21_VERSION)return null
  return {version:CURRICULUM_21.version,mode:journey?'personal':'overview',contentVersion:journey?.contentVersion??null,clinicalValidation:false,
    weeks:CURRICULUM_21.weeks.map(w=>({week:w.week,title:w.title[locale],goal:w.goal[locale],
      days:CURRICULUM_21.route.filter(d=>d.week===w.week).map(d=>{
        if(!journey)return {day:d.day,review:d.review,skill:d.skill[locale]}
        const track=courseTrackForDay(journey,d.day),lesson=lessonFor21(track,d.day,locale)
        return {day:d.day,review:d.review,track,lessonId:lesson.id,skill:lesson.title,learningOutcome:lesson.curriculum.learningOutcome}
      })})),
    sources:CURRICULUM_21.sources.map(s=>({id:s.id,url:s.url,title:s.title,principle:s.principle[locale]}))}
}
const INTERIM = Object.freeze({
  calm_regulation:[['A pause to review grounding','Пауза для обзора способов опоры'],['Notice which grounding options fitted ordinary situations. A change in a questionnaire score would not establish that the exercise caused it. The next week is another opportunity to choose and adapt.','Заметьте, какие способы опоры подошли в обычных ситуациях. Изменение балла опросника не доказывает, что причиной было упражнение. На следующей неделе можно продолжить выбор и настройку практики.']],
  inner_support:[['Reviewing how I support myself','Как я поддерживаю себя: промежуточный обзор'],['Which supportive words or small choices felt believable? Keep one, adjust another, or leave an unhelpful practice behind. You can make these choices again next week.','Какие поддерживающие слова или небольшие решения были убедительны для вас? Одно можно сохранить, другое изменить, а неподходящую практику оставить. На следующей неделе выбор остаётся за вами.']],
  emotional_flexibility:[['Reviewing my responses to feelings','Промежуточный обзор реакции на чувства'],['Notice one situation where naming a feeling or pausing gave you a choice. A difficult emotion is not a failed lesson. Next week you can refine the response that fits you.','Вспомните ситуацию, где обозначение чувства или пауза дали возможность выбора. Трудная эмоция не означает провал урока. На следующей неделе можно уточнять подходящую вам реакцию.']],
  attention_clarity:[['Reviewing conditions for attention','Промежуточный обзор условий для внимания'],['Look for one condition that helped you begin, and one distraction you could reduce. Use this observation to choose a smaller or clearer task next week; it is not a test of willpower.','Отметьте одно условие, которое помогло начать, и один отвлекающий фактор, который можно уменьшить. Это наблюдение поможет выбрать более ясную или небольшую задачу на следующую неделю; это не проверка силы воли.']],
  connection_boundaries:[['Reviewing comfortable contact','Промежуточный обзор комфортного общения'],['Notice a request, a boundary or a form of contact that felt appropriate. You do not need to approach someone unsafe. Next week can focus on choosing a comfortable pace.','Отметьте просьбу, границу или вид общения, которые были уместны. Не нужно сближаться с небезопасным человеком. На следующей неделе можно выбирать комфортный темп.']],
  energy_agency:[['Reviewing effort and recovery','Промежуточный обзор нагрузки и отдыха'],['Notice one manageable action and one useful pause. Carry their practical details into next week without increasing effort to catch up. Continuing or unexplained physical symptoms deserve appropriate professional advice.','Отметьте посильное действие и полезную паузу. Возьмите их конкретные детали на следующую неделю, не увеличивая усилия ради наверстывания. Стойкие или необъяснимые физические симптомы стоит обсудить с подходящим специалистом.']],
})
const GROUNDING = Object.freeze({
  calm_regulation:['Keep your eyes open and find one neutral colour in the room. Rest your attention there briefly. You may stop without waiting for tension to change.','Оставьте глаза открытыми и найдите нейтральный цвет в комнате. Ненадолго направьте внимание на него. Можно остановиться, не дожидаясь изменения напряжения.'],
  inner_support:['Look at an ordinary object near you. Choose one fair phrase you could say to yourself about today, such as “One small choice is enough.” You do not have to feel convinced or positive.','Посмотрите на обычный предмет рядом. Выберите справедливую фразу о сегодняшнем дне, например «Одного небольшого выбора достаточно». Не обязательно чувствовать уверенность или оптимизм.'],
  emotional_flexibility:['Look at a neutral object and describe its shape. If comfortable, name the current feeling in one word; otherwise stay with the visible shape. Naming is optional and does not require changing the feeling.','Посмотрите на нейтральный предмет и опишите его форму. Если комфортно, назовите чувство одним словом; иначе оставайтесь с видимой формой. Называть чувство необязательно, менять его не требуется.'],
  attention_clarity:['Choose one visible object and notice a single detail, then look away. Decide on one small task or on a break. Wandering attention needs no penalty or extra repetitions.','Выберите видимый предмет, заметьте одну деталь и отведите взгляд. Решите, что сейчас подходит: небольшое дело или пауза. За отвлечение не нужны штраф или дополнительные повторения.'],
  connection_boundaries:['Look around your present space. Choose a short boundary phrase you could write privately, such as “I will answer later.” No message needs to be sent and no contact is required.','Оглядите пространство вокруг. Выберите короткую фразу о границе, которую можно записать для себя, например «Я отвечу позже». Отправлять сообщение или вступать в контакт не требуется.'],
  energy_agency:['Look for a comfortable place to rest. Decide whether one small action or a pause fits your available energy. You may choose rest without earning it first.','Найдите глазами удобное место для отдыха. Решите, что соответствует вашим силам: небольшое действие или пауза. Отдых можно выбрать, не заслуживая его заранее.'],
})
const COPY = {
  en:{arrive:'You may keep your eyes open and breathe naturally. Notice one neutral detail in your current surroundings. Any step can be skipped or stopped.',finish:'Look around once more. Choose what comes next, including rest. No particular emotion or result is required.',titles:['Arrive','Today’s idea','Gentle guided attention','One everyday invitation','Finish at your pace']},
  ru:{arrive:'Можно оставить глаза открытыми и дышать естественно. Заметьте нейтральную деталь вокруг. Любой шаг можно пропустить или остановить.',finish:'Ещё раз оглядитесь. Выберите следующий шаг, в том числе отдых. Определённое чувство или результат не требуются.',titles:['Начало','Идея дня','Мягкое направленное внимание','Небольшое предложение на сегодня','Завершение в своём темпе']},
}
export function lessonFor21(domain,day,locale='en',variant='standard') {
  if(!Object.hasOwn(WEEK_THREE_DAYS,domain)||!Number.isInteger(day)||day<1||day>21||!['en','ru'].includes(locale)||!['standard','quick','grounding'].includes(variant))return null
  const i=locale==='ru'?1:0,t=COPY[locale],quick=variant!=='standard'
  let lesson
  if(day<=14){
    lesson=structuredClone(legacyLessonFor(domain,day,locale,quick?'quick':'standard'))
    if(day===14){
      lesson.title=INTERIM[domain][0][i]
      lesson.sections.find(s=>s.kind==='learn').text=INTERIM[domain][1][i]
    }
  }else{
    const entry=WEEK_THREE_DAYS[domain][day-15]
    if(!entry)return null
    const texts=[t.arrive,entry.teaching[i],entry.guide[i],entry.action[i],t.finish]
    lesson={domain,day,title:entry.title[i],aphorism:entry.aphorism[i],reflection:entry.reflection[i],ritual:entry.action[i],
      sections:['arrive','learn','meditation','ritual','finish'].map((kind,k)=>({kind,title:t.titles[k],text:texts[k],seconds:(quick?[10,20,45,20,10]:[20,40,110,50,20])[k]})),
      accessibility:{eyesOpen:true,naturalBreathing:true,textVersion:true,stopAnytime:true},
      source:'Holistic House original self-help education',
      disclaimer:locale==='ru'?'Практика самопомощи не заменяет профессиональную помощь.':'Self-help practice does not replace professional support.'}
  }
  if(quick){
    // Shorter really means less text and fewer instructions, not a shorter timer
    // wrapped around the full script. The day's idea and one action stay specific.
    lesson.sections.find(s=>s.kind==='arrive').text=t.arrive
    if(day<14)lesson.sections.find(s=>s.kind==='learn').text=TRACKS[domain][day-1].teaching[i]
    lesson.sections.find(s=>s.kind==='meditation').text=GROUNDING[domain][i]
    lesson.sections.find(s=>s.kind==='ritual').text=lesson.ritual
    lesson.sections.find(s=>s.kind==='finish').text=t.finish
  }
  if(variant==='grounding'){
    // A separately prepared eyes-open option, not renamed visualization.
    const exercise=lesson.sections.find(s=>s.kind==='meditation')
    exercise.text=GROUNDING[domain][i]
    exercise.seconds=45
  }
  const route=CURRICULUM_21.route.find(r=>r.day===day),outcome=CURRICULUM_21.variants.find(v=>v.domain===domain&&v.day===day)
  if(!route||!outcome||!CURRICULUM_21.recaps[domain])return null
  const curriculum={version:CURRICULUM_21.version,skill:route.skill[locale],objective:route.objective[locale],
    learningOutcome:outcome.learningOutcome[locale],recap:CURRICULUM_21.recaps[domain][locale],
    weekGoal:CURRICULUM_21.weeks[route.week-1].goal[locale],requiresPreviousTopicLesson:false}
  return {...lesson,id:`hh-growth-21-${domain}-${String(day).padStart(2,'0')}-${COURSE_CONTENT_21_VERSION}`,
    version:COURSE_CONTENT_21_VERSION,sourceContentVersion:day<=14?LEGACY_VERSION:COURSE_CONTENT_21_VERSION,sourceContentStatus:WEEK_THREE_CONTENT_STATUS,
    contentStatus:COURSE_CONTENT_21_STATUS,requiresEditorialReview:true,...courseWeek(day),variant,
    length:quick?'quick':'standard',durationSeconds:lesson.sections.reduce((n,s)=>n+s.seconds,0),
    durationIsEstimate:true,completionTimerRequired:false,scope:'supportive-skills-not-treatment',generativeAI:false,curriculum}
}
