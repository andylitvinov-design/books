// Authored self-guided practice, not evidence of a coaching session or entitlement.
const days={
 en:[
 ['My request','What matters to me right now? Write one request in your own words and choose a small action.'],
 ['What matters','Which value or need matters in this situation? Notice it without having to take a test.'],
 ['My resources','Name one available source of support. How could you use it today?'],
 ['What gets in the way','Describe a real obstacle or circumstance without judging yourself.'],
 ['A small step','Try one manageable action or a smaller version of it. What did you choose?'],
 ['What helped','What actually happened? What helped, and what could you adjust?'],
 ['My next choice','Review your request, actions and experience. Choose what to continue, change or leave open.']
 ],
 ru:[
 ['Мой запрос','Что для меня сейчас важно? Сформулируйте запрос своими словами и выберите один небольшой шаг.'],
 ['Что для меня важно','Какая ценность или потребность важна в этой ситуации? Заметьте её без обязательного теста.'],
 ['Мои ресурсы','Назовите один доступный ресурс или источник поддержки. Как им воспользоваться сегодня?'],
 ['Что мешает','Опишите реальное препятствие или обстоятельство без осуждения себя.'],
 ['Маленький шаг','Попробуйте одно посильное действие или его облегчённый вариант. Что вы выбрали?'],
 ['Что помогло','Что произошло на самом деле? Что помогло и что можно изменить?'],
 ['Мой следующий выбор','Пересмотрите запрос, действия и опыт. Что хотите продолжить, изменить или пока оставить открытым?']
 ],
 es:[
 ['Mi petición','¿Qué me importa ahora? Expresa una petición con tus propias palabras y elige un pequeño paso.'],
 ['Lo que importa','¿Qué valor o necesidad importa en esta situación? Obsérvalo sin tener que realizar una prueba.'],
 ['Mis recursos','Nombra una fuente de apoyo disponible. ¿Cómo podrías utilizarla hoy?'],
 ['Lo que me frena','Describe un obstáculo o una circunstancia real sin juzgarte.'],
 ['Un pequeño paso','Prueba una acción manejable o una versión más sencilla. ¿Qué elegiste?'],
 ['Lo que ayudó','¿Qué ocurrió realmente? ¿Qué ayudó y qué podrías ajustar?'],
 ['Mi siguiente elección','Revisa tu petición, acciones y experiencia. Elige qué continuar, cambiar o dejar abierto.']
 ]
}
export const DISCOVER_DAY_COUNT=7
export function discoverDayTag(day){
 if(!Number.isInteger(day)||day<1||day>DISCOVER_DAY_COUNT)throw new Error('INVALID_DISCOVER_DAY')
 return 'discover-v1-day-'+day
}
export function discoverPractices(locale){
 const copy=days[Object.hasOwn(days,locale)?locale:'en']
 return copy.map(([title,prompt],index)=>({day:index+1,tag:discoverDayTag(index+1),title,prompt}))
}
export function discoverNotes(entries,day){
 const tag=discoverDayTag(day)
 return (Array.isArray(entries)?entries:[]).filter(entry=>
  entry?.kind==='note'&&entry.goalId===null&&
  Number.isSafeInteger(entry.revision)&&entry.revision>0&&
  typeof entry.id==='string'&&entry.id.length>0&&
  Array.isArray(entry.tags)&&entry.tags.includes(tag)&&
  typeof entry.text==='string'&&entry.text.trim().length>0
 )
}
export function discoverRecordedDays(entries){
 return Array.from({length:DISCOVER_DAY_COUNT},(_,i)=>i+1).filter(day=>discoverNotes(entries,day).length>0)
}
