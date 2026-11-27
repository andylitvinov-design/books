import {STAGES} from './app/daybook-stages.mjs'

// Public display copy only. Actual week IDs, exercises and persisted answers stay in Daybook.
const COPY={
 en:{heading:'8 stages to my goal',subtitle:'A practical path from intention to results.',week:'Week',practice:'In this session',result:'Your takeaway',benefits:'What you’ll gain',
 benefitsList:[['Clarity & direction','Understand what matters'],['Energy & motivation','Find your inner drive'],['Action plan','Choose your next steps'],['Real progress','Track meaningful changes']],
 lessons:[
 ['Define the Result',['Review your current situation and life areas','Explore what you want instead','Choose a direction and formulate your goal'],'A personal goal and a clear direction.'],
 ['Ignite Motivation',['Imagine a meaningful day in your desired future','Explore why this goal matters to you','Identify your values, boundaries and signs of progress'],'Your personal vision and reasons to move forward.'],
 ['Build an Action Plan',['Map your 90-, 30- and 7-day milestones','Choose one realistic action for the next 24–48 hours','Plan a manageable fallback if things change'],'A personal roadmap with a first step and deadline.'],
 ['Activate Resources',['Recall successes and existing strengths','Identify people, skills and sources of support','Choose one resource to use or restore'],'A resource map and a practical way to draw on support.'],
 ['Overcome Inner Blocks',['Explore a wish, desired outcome and obstacle (WOOP)','Separate facts from assumptions','Create a safe if–then response to the obstacle'],'A realistic plan for responding to a specific obstacle.'],
 ['Find New Opportunities',['Generate three alternative approaches','Compare benefit, effort, risk and reversibility','Choose one small experiment and how to assess it'],'A chosen option and a concrete experiment.'],
 ['Accelerate Toward the Goal',['Review what you actually did and learned','Adjust the plan and focus on what helps most','Choose a next action and review date'],'A revised action plan that builds on your experience.'],
 ['Results & New Perspectives',['Compare your starting point with where you are now','Reflect on what changed in you and your life','Choose your next direction'],'A personal reflection on results and your next direction.']
 ]},
 ru:{heading:'8 этапов к моей цели',subtitle:'Практический путь от намерения к результату.',week:'Неделя',practice:'На этом занятии',result:'Ваш итог',benefits:'Что даст программа',
 benefitsList:[['Ясность и направление','Понять, что важно'],['Энергия и мотивация','Найти внутреннюю силу'],['План действий','Выбрать следующие шаги'],['Реальный прогресс','Отследить изменения']],
 lessons:[
 ['Определить результат',['Рассмотреть текущую ситуацию и сферы жизни','Уточнить, чего хочется вместо этого','Выбрать направление и сформулировать цель'],'Личная цель и ясное направление.'],
 ['Зажечь мотивацию',['Представить желаемый день в будущем','Понять, почему эта цель важна лично вам','Определить ценности, границы и признаки прогресса'],'Личный образ будущего и причины двигаться вперёд.'],
 ['Построить план',['Наметить вехи на 90, 30 и 7 дней','Выбрать реальное действие на ближайшие 24–48 часов','Продумать посильный запасной вариант'],'Личный маршрут, первый шаг и срок.'],
 ['Активировать ресурсы',['Вспомнить успехи и свои сильные стороны','Найти людей, навыки и источники поддержки','Выбрать один ресурс для использования или восстановления'],'Карта ресурсов и способ опереться на поддержку.'],
 ['Преодолеть препятствия',['Исследовать желание, результат и препятствие по WOOP','Отделить факты от предположений','Составить безопасный план «если — то»'],'Реалистичный план ответа на конкретное препятствие.'],
 ['Найти возможности',['Найти три альтернативных подхода','Сравнить пользу, затраты, риск и обратимость','Выбрать небольшой эксперимент и способ его оценки'],'Выбранный вариант и конкретный эксперимент.'],
 ['Ускорение к цели',['Обозначить реальные действия и полученный опыт','Скорректировать план и выбрать наиболее полезное действие','Определить следующий шаг и дату обзора'],'Обновлённый план с опорой на собственный опыт.'],
 ['Итоги и новые перспективы',['Сравнить начало пути и текущую ситуацию','Осмыслить изменения в себе и жизни','Выбрать следующее направление'],'Личное подведение итогов и направление следующего этапа.']
 ]},
 es:{heading:'8 etapas hacia mi meta',subtitle:'Un camino práctico hacia los resultados.',week:'Semana',practice:'En esta sesión',result:'Tu resultado',benefits:'Qué conseguirás',
 benefitsList:[['Claridad y dirección','Comprender lo que importa'],['Energía y motivación','Encontrar tu impulso'],['Plan de acción','Elegir tus próximos pasos'],['Progreso real','Observar cambios significativos']],
 lessons:[
 ['Definir el resultado',['Revisar tu situación actual y áreas de vida','Explorar qué deseas en su lugar','Elegir una dirección y formular tu meta'],'Una meta personal y una dirección clara.'],
 ['Encender la motivación',['Imaginar un día significativo en tu futuro deseado','Explorar por qué esta meta te importa','Identificar valores, límites y señales de progreso'],'Tu visión personal y motivos para avanzar.'],
 ['Construir un plan',['Definir hitos de 90, 30 y 7 días','Elegir una acción realista para las próximas 24–48 horas','Prever una alternativa viable si algo cambia'],'Una ruta personal con primer paso y plazo.'],
 ['Activar recursos',['Recordar logros y fortalezas existentes','Identificar personas, capacidades y apoyos','Elegir un recurso para utilizar o recuperar'],'Un mapa de recursos y una forma práctica de apoyarte.'],
 ['Superar obstáculos',['Explorar deseo, resultado y obstáculo con WOOP','Distinguir hechos de suposiciones','Preparar una respuesta segura «si — entonces»'],'Un plan realista para responder a un obstáculo concreto.'],
 ['Encontrar posibilidades',['Generar tres enfoques alternativos','Comparar beneficio, esfuerzo, riesgo y reversibilidad','Elegir un pequeño experimento y cómo evaluarlo'],'Una alternativa elegida y un experimento concreto.'],
 ['Acelerar hacia la meta',['Revisar qué hiciste y aprendiste','Ajustar el plan y priorizar la acción más útil','Elegir el siguiente paso y fecha de revisión'],'Un plan revisado basado en tu experiencia.'],
 ['Resultados y nuevas perspectivas',['Comparar el punto de partida y la situación actual','Reflexionar sobre cambios en ti y en tu vida','Elegir tu próxima dirección'],'Una reflexión personal y una nueva dirección.']
 ]}
}
const REVIEW={en:'Reflection and new directions',ru:'Итоги и новые перспективы',es:'Balance y nuevas perspectivas'}
export function getGoalLanding(locale='en'){
 const lang=Object.hasOwn(COPY,locale)?locale:'en',t=COPY[lang]
 return {...t,lessons:t.lessons.map(([title,points,outcome],index)=>({
  id:STAGES[index]?.id??'review',number:index+1,title,subtitle:STAGES[index]?.[lang][1]??REVIEW[lang],points,outcome
 }))}
}
