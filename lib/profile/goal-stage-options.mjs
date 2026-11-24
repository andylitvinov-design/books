// Public, localized recommendations only. Opening a stage never starts a paid
// service, sends a goal to a provider, or marks progress complete.
const option=(route,en,ru,es)=>({route,copy:{en,ru,es}})
export const GOAL_STAGE_OPTIONS={
 result:[
  option('plan',['Define my result','Review your goal and desired outcome'],['Определить результат','Уточнить цель и желаемый результат'],['Definir mi resultado','Revisa la meta y el resultado deseado']),
  option('coach',['Goal coaching','Explore a specific, measurable goal with an AI coach'],['Коучинг цели','Уточнить конкретную и измеримую цель с ИИ-коучем'],['Coaching de metas','Aclara una meta concreta y medible con un coach IA']),
  option('selfDiscovery',['Self-discovery','Review your life balance and meaning axes'],['Самопознание','Проверить баланс жизни и смысловые оси'],['Autoconocimiento','Revisa tu equilibrio y tus ejes de significado']),
  option('consultation',['Personal consultation','Choose a personal consultation to clarify the result'],['Личная консультация','Выбрать консультацию для прояснения результата'],['Consulta personal','Elige una consulta para aclarar el resultado']),
 ],
 motivation:[
  option('daybook',['My Why','Reflect on why this goal matters in your journal'],['Моё «Зачем»','Осмыслить важность цели в дневнике'],['Mi porqué','Reflexiona sobre la importancia de tu meta en el diario']),
  option('coach',['Motivation coaching','Explore your values, desires and intention'],['Коучинг мотивации','Исследовать ценности, желания и намерение'],['Coaching de motivación','Explora tus valores, deseos e intención']),
  option('selfDiscovery',['My meaning axes','Review the values behind your goal'],['Мои смысловые оси','Вернуться к ценностям, стоящим за целью'],['Mis ejes de sentido','Revisa los valores que sostienen tu meta']),
  option('imagery',['Guided imagery session','Explore a desired future with a practitioner'],['Образная сессия','Исследовать образ желаемого будущего со специалистом'],['Sesión de imaginación guiada','Explora el futuro deseado con un profesional']),
 ],
 resources:[
  option('meditation',['Resource meditation','Choose a guided practice for grounding and support'],['Ресурсная медитация','Выбрать практику опоры и восстановления'],['Meditación de recursos','Elige una práctica de apoyo y estabilidad']),
  option('coach',['Resource mapping','Explore skills, strengths and supportive people'],['Карта ресурсов','Исследовать навыки, сильные стороны и поддержку'],['Mapa de recursos','Explora tus fortalezas y redes de apoyo']),
  option('courses',['Courses & practices','Choose a personal-development practice'],['Курсы и практики','Выбрать практику личного развития'],['Cursos y prácticas','Elige una práctica de desarrollo personal']),
  option('energy',['Personal energy support','Explore available remote support sessions'],['Энергетическая поддержка','Выбрать формат дистанционной поддержки'],['Apoyo energético','Explora sesiones de apoyo a distancia']),
 ],
 plan:[
  option('daybook',['My action plan','Record concrete next actions in your journal'],['Мой план действий','Записать конкретные следующие действия в дневнике'],['Mi plan de acción','Anota los próximos pasos concretos en tu diario']),
  option('coach',['Planning with an AI coach','Explore milestones, obstacles and a realistic plan'],['План с ИИ-коучем','Наметить этапы, препятствия и реалистичный план'],['Plan con coach IA','Explora hitos, obstáculos y un plan realista']),
  option('plan',['Review my goal','Open the saved goal and its actions'],['Уточнить цель','Открыть сохранённую цель и её действия'],['Revisar mi meta','Abre la meta guardada y sus acciones']),
  option('constellations',['Systemic constellation session','Explore the path and alternatives with a practitioner'],['Расстановочная сессия','Исследовать путь и альтернативы со специалистом'],['Sesión de constelaciones','Explora el camino y las alternativas con un profesional']),
 ],
 obstacles:[
  option('daybook',['Reflect on obstacles','Describe what is getting in the way privately'],['Мои препятствия','Описать, что мешает, в личном дневнике'],['Reflexionar sobre obstáculos','Describe en privado lo que te dificulta avanzar']),
  option('coach',['Explore inner blocks','Discuss limiting patterns and possible next steps'],['Внутренние блоки','Обсудить ограничивающие реакции и дальнейшие шаги'],['Explorar bloqueos','Reflexiona sobre patrones limitantes y próximos pasos']),
  option('video',['Personal supportive video','Explore a video for encouragement and reflection'],['Поддерживающее видео','Выбрать видео для поддержки и рефлексии'],['Vídeo de apoyo','Explora un vídeo de aliento y reflexión']),
  option('imagery',['Guided imagery therapy','Explore difficulties with a practitioner'],['Образная терапия','Исследовать трудности вместе со специалистом'],['Terapia de imaginación guiada','Explora las dificultades con un profesional']),
 ],
 possibilities:[
  option('daybook',['New possibilities','Write down alternative ideas and next experiments'],['Новые возможности','Записать альтернативные идеи и эксперименты'],['Nuevas posibilidades','Anota ideas alternativas y próximos experimentos']),
  option('coach',['AI brainstorming','Explore alternative paths and perspectives'],['Поиск решений с ИИ','Исследовать альтернативные пути и точки зрения'],['Ideas con IA','Explora caminos y perspectivas alternativas']),
  option('review',['Situation review','Request an existing written review of your situation'],['Разбор ситуации','Запросить существующий письменный анализ ситуации'],['Revisión de situación','Solicita una revisión escrita de tu situación']),
  option('practitioner',['Expert coaching session','Choose a practitioner to explore new directions'],['Сессия со специалистом','Выбрать специалиста для поиска новых направлений'],['Sesión con profesional','Elige un profesional para explorar nuevas direcciones']),
 ],
 acceleration:[
  option('plan',['Review my actions','Keep effective steps and adjust the next milestone'],['Пересмотреть действия','Сохранить работающие шаги и уточнить ближайший рубеж'],['Revisar mis acciones','Conserva los pasos eficaces y ajusta el próximo hito']),
  option('coach',['Coaching for momentum','Find a realistic way to move forward with more focus'],['Коучинг ускорения','Выбрать посильный способ двигаться к цели быстрее'],['Coaching para avanzar','Elige una forma realista de avanzar con más enfoque']),
  option('daybook',['Notice what works','Review your daily steps and repeat useful habits'],['Что уже работает','Оценить ежедневные шаги и повторять полезные привычки'],['Reconocer lo que funciona','Revisa tus pasos diarios y repite hábitos útiles']),
  option('practitioner',['Personal action review','Review your progress and next actions with a coach'],['Личная сессия','Разобрать прогресс и следующие действия с коучем'],['Sesión personal','Revisa tus avances y próximas acciones con un coach']),
 ],
 integration:[
  option('daybook',['Progress reflection','Record results, lessons and next actions'],['Дневник результата','Записать итоги, выводы и следующие действия'],['Reflexión sobre el progreso','Anota resultados, aprendizajes y próximos pasos']),
  option('newDirection',['Choose the next direction','Start stage zero and save a separate new goal'],['Выбрать новое направление','Пройти нулевой этап и сохранить отдельную новую цель'],['Elegir un nuevo rumbo','Completa la etapa cero y guarda otra meta']),
  option('video',['Reinforce your progress','Explore a supportive video for your next chapter'],['Закрепить результат','Выбрать поддерживающее видео для следующего этапа'],['Consolidar el progreso','Explora un vídeo de apoyo para tu siguiente etapa']),
  option('practitioner',['Personal review session','Choose a coach to review and sustain your result'],['Итоговая сессия','Выбрать коуча для оценки и закрепления результата'],['Sesión de revisión','Elige un coach para revisar y consolidar el resultado']),
 ],
}
export function goalStageOptions(stage,locale='en'){
 const lang=['en','ru','es'].includes(locale)?locale:'en'
 return (GOAL_STAGE_OPTIONS[stage]||[]).map(({route,copy})=>({route,title:copy[lang][0],detail:copy[lang][1]}))
}
export function goalOptionHref(route,{lang='en',root='/en/app',planLink=root+'/my-coaching-plan'}={}){
 const publicRoot='/'+lang
 return ({
  plan:planLink,coach:publicRoot+'/my-coach',daybook:root+'/daybook',newDirection:root+'/daybook?start=vector',
  courses:root+'/course?view=courses',selfDiscovery:publicRoot+'/development-vectors',
  meditation:publicRoot+'/meditations',video:publicRoot+'/holistic-support/mandala',
  consultation:publicRoot+'/services/free-consultation',imagery:publicRoot+'/services/imagery-therapy',
  constellations:publicRoot+'/services/systemic-constellations',energy:publicRoot+'/services/remote-energy-support',
  review:publicRoot+'/services/free-situation-review',practitioner:publicRoot+'/coaching',
 })[route]||null
}
