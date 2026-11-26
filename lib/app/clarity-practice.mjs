// Session one: independent workbook, not coaching-session completion or entitlement.
export const CLARITY_PRACTICE_COUNT=7
const copy={
 ru:[
 ['Вход в ресурс','Устройтесь удобно. Заметьте опору под ногами или спиной. Оставьте дыхание естественным. Посмотрите вокруг и найдите один предмет, на который приятно смотреть. Если хочется, прикройте глаза. Заметьте своё состояние без необходимости его менять. Если становится неприятно, остановитесь и вернитесь к окружающему пространству.','Что я сейчас чувствую? Что мне поможет быть здесь?','sunrise'],
 ['Колесо баланса','Откройте карту жизни. Сравните текущие и желаемые оценки четырёх сфер. Выберите одну сферу, которая действительно требует внимания. Не стремитесь к идеальным оценкам.','Какая сфера важнее сейчас? Моя текущая и желаемая оценка (0–10) и почему.','mountain','vectors'],
 ['Восемь смысловых осей','Откройте существующую карту смысловых осей. Выберите одну важную для вас потребность или ценность. Сравните её текущее и желаемое состояние.','Какая ось мне важна, что есть сейчас и чего мне хочется?','lotus','vectors'],
 ['Мой личный запрос','Посмотрите на выбранную сферу и ось. Заметьте, что в вашей ситуации уже известно, а что ещё хочется понять. Сформулируйте запрос в своих словах.','Что я хочу лучше понять о себе? Что мне сейчас особенно важно?','mountain','profile'],
 ['Мои сильные стороны','Вспомните один реальный момент, когда вам удалось справиться с трудностью. Назовите качество, навык или человека, который помог. Выберите доступный ресурс.','Какая моя сильная сторона проявилась? На что или на кого я могу опереться сейчас?','stones'],
 ['Маленький шаг','Выберите одно бережное действие на ближайшие 24 часа. Оно должно быть небольшим, конкретным и зависеть от вас. Если выполнить его сложно, уменьшите задачу.','Что я сделаю, когда и по какому признаку пойму, что шаг сделан?','sunrise'],
 ['Итоги практики','Просмотрите сохранённые ответы. Это ваши наблюдения и самостоятельная практика, а не заключение или протокол коуча.','Что стало яснее? Что я хочу сохранить для следующего занятия?','sunrise']
 ],
 en:[
 ['Reconnect with yourself','Sit comfortably. Notice the support under your feet or back. Let your breathing stay natural. Look around and find one object you enjoy seeing. Close your eyes only if you wish. Notice how you feel without needing to change it. If you feel uncomfortable, stop and return your attention to your surroundings.','How do I feel right now? What would help me be present?','sunrise'],
 ['Life balance wheel','Open the life map. Compare your current and desired ratings in the four life areas. Choose one area that truly needs attention. There is no ideal score you have to reach.','Which area matters now? My current and desired rating (0–10), and why.','mountain','vectors'],
 ['Eight meaning axes','Open the existing meaning axes map. Choose one value or need that matters to you. Compare its current and desired state.','Which axis matters to me, where am I now and what do I want?','lotus','vectors'],
 ['My personal request','Look at your chosen life area and axis. Notice what you already know about your situation and what you want to understand. Put your request into your own words.','What do I want to understand about myself? What matters most right now?','mountain','profile'],
 ['My strengths','Remember one real moment when you handled a difficulty. Name a quality, skill or person who helped. Identify a resource available now.','Which strength showed up? What or whom can I rely on now?','stones'],
 ['A small step','Choose one gentle action for the next 24 hours. Make it small, concrete and within your control. If it feels difficult, make the task smaller.','What will I do, when, and how will I know I have done it?','sunrise'],
 ['Practice results','Review your saved answers. These are your observations and independent practice, not a coach’s assessment or protocol.','What became clearer? What do I want to keep for the next session?','sunrise']
 ],
 es:[
 ['Conecta contigo','Siéntate con comodidad. Nota el apoyo bajo los pies o la espalda. Deja que la respiración siga su ritmo natural. Mira alrededor y encuentra un objeto que te guste mirar. Cierra los ojos solo si lo deseas. Observa tu estado sin tener que cambiarlo. Si te incomodas, detente y vuelve a mirar a tu alrededor.','¿Cómo me siento ahora? ¿Qué me ayudaría a estar presente?','sunrise'],
 ['Rueda del equilibrio','Abre el mapa de vida. Compara las valoraciones actuales y deseadas de las cuatro áreas. Elige una que realmente necesite atención. No hay una puntuación ideal obligatoria.','¿Qué área importa ahora? Mi valoración actual y deseada (0–10), y por qué.','mountain','vectors'],
 ['Ocho ejes de significado','Abre el mapa existente de ejes de significado. Elige un valor o una necesidad importante. Compara su estado actual y deseado.','¿Qué eje me importa, dónde estoy y qué deseo?','lotus','vectors'],
 ['Mi petición personal','Mira el área y el eje elegidos. Observa qué sabes de tu situación y qué deseas comprender. Expresa tu petición con tus propias palabras.','¿Qué quiero comprender mejor de mí? ¿Qué me importa más ahora?','mountain','profile'],
 ['Mis fortalezas','Recuerda un momento real en que afrontaste una dificultad. Nombra una cualidad, habilidad o persona que te ayudó. Identifica un recurso disponible ahora.','¿Qué fortaleza apareció? ¿En qué o quién puedo apoyarme ahora?','stones'],
 ['Un pequeño paso','Elige una acción amable para las próximas 24 horas. Que sea pequeña, concreta y bajo tu control. Si es difícil, reduce la tarea.','¿Qué haré, cuándo y cómo sabré que lo hice?','sunrise'],
 ['Resultados de la práctica','Revisa tus respuestas guardadas. Son tus observaciones y tu práctica autónoma, no una evaluación ni un protocolo del coach.','¿Qué se aclaró? ¿Qué quiero conservar para la siguiente sesión?','sunrise']
 ]
}
export const clarityPracticeSteps=locale=>(Object.hasOwn(copy,locale)?copy[locale]:copy.en).map(([title,body,question,art,tool],index)=>({number:index+1,title,body,question,art,tool}))
export function clarityPracticeTag(step){
 if(!Number.isInteger(step)||step<1||step>CLARITY_PRACTICE_COUNT)throw new Error('INVALID_CLARITY_PRACTICE_STEP')
 return 'clarity-practice-v1-step-'+step
}
export function clarityPracticeNotes(entries,step){
 const tag=clarityPracticeTag(step)
 return (Array.isArray(entries)?entries:[]).filter(e=>e?.kind==='note'&&e.goalId===null&&Number.isSafeInteger(e.revision)&&e.revision>0&&typeof e.id==='string'&&e.id.length>0&&Array.isArray(e.tags)&&e.tags.includes(tag)&&e.tags.filter(t=>typeof t==='string'&&t.startsWith('clarity-practice-v1-step-')).length===1&&typeof e.text==='string'&&e.text.trim().length>0)
}
export function clarityPracticeProgress(entries){
 const valid=Array.from({length:CLARITY_PRACTICE_COUNT},(_,i)=>clarityPracticeNotes(entries,i+1).length===1)
 // A final reflection cannot turn missing or ambiguous earlier notes into completion.
 const firstMissing=valid.indexOf(false)
 const done=firstMissing===-1?CLARITY_PRACTICE_COUNT:valid.slice(0,-1).filter(Boolean).length
 return {done,total:CLARITY_PRACTICE_COUNT,firstMissing:firstMissing===-1?CLARITY_PRACTICE_COUNT:firstMissing+1,complete:firstMissing===-1,valid}
}
