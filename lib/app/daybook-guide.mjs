import {STAGES, stageReadable} from './daybook-stages.mjs'

// Stable task/answer keys keep each owner's notes separate by goal, week and level.
const copy = (ru, en, es) => ({en, ru, es})
const field = (id, label, type = 'text', required = true) => ({id, label, type, required})
const task = (id, title, description, fields, resources = []) => ({id, title, description, fields, resources})
const question = (stage, key) => {
  const index = stage.keys.indexOf(key)
  if (index < 0) throw new Error('GUIDE_STAGE_FIELD_INVALID')
  return field(key, Object.fromEntries(['en', 'ru', 'es'].map(locale => [locale, stage[locale][index + 2]])))
}

export const GUIDE_LEVELS = [
  {
    id: 1,
    title: copy('Самостоятельно', 'Self-guided', 'Por tu cuenta'),
    description: copy('Семь заданий: вопросы, дневник и небольшие действия. Ответы сохраняются для вашей цели.', 'Seven tasks with questions, journal reflections and small actions. Answers are saved for your goal.', 'Siete tareas con preguntas, reflexiones y pequeñas acciones. Las respuestas se guardan para tu meta.'),
    priceLabel: copy('Бесплатно', 'Free', 'Gratis'),
  },
  {
    id: 2,
    title: copy('С ИИ-коучем', 'With an AI coach', 'Con coach de IA'),
    description: copy('Подготовьте запрос для обсуждения с ИИ-коучем. Доступность и условия показаны при выборе коуча.', 'Prepare a question to discuss with an AI coach. Availability and terms are shown when choosing a coach.', 'Prepara una pregunta para hablar con un coach de IA. La disponibilidad y las condiciones se muestran al elegirlo.'),
    priceLabel: copy('Ориентир: 100 XP', 'Guide price: 100 XP', 'Precio orientativo: 100 XP'),
  },
  {
    id: 3,
    title: copy('Углублённая работа', 'Deeper work', 'Trabajo profundo'),
    description: copy('Подготовьте запрос на персональный материал или практику. Формат и стоимость уточняются до заказа.', 'Prepare a request for personal material or a practice. The format and price are confirmed before ordering.', 'Prepara una solicitud de material personal o una práctica. El formato y el precio se confirman antes del pedido.'),
    priceLabel: copy('Ориентир: 250 XP', 'Guide price: 250 XP', 'Precio orientativo: 250 XP'),
  },
  {
    id: 4,
    title: copy('Личная сессия', 'Personal session', 'Sesión personal'),
    description: copy('Подготовьте запрос на личную сессию с Andy, 60 минут. Запись оформляется отдельно.', 'Prepare a request for a 60-minute personal session with Andy. Booking is arranged separately.', 'Prepara una solicitud de sesión personal de 60 minutos con Andy. La reserva se realiza por separado.'),
    priceLabel: copy('1000 XP · €100 · 60 мин', '1000 XP · €100 · 60 min', '1000 XP · €100 · 60 min'),
  },
]

const stepsFor = stage => {
  const q = key => question(stage, key)
  switch (stage.id) {
    case 'discover': return [
      task('situation', copy('Моя точка сейчас', 'My starting point', 'Mi punto de partida'),
        copy('Опишите текущую ситуацию, связанную с уже выбранной целью. Достаточно нескольких конкретных наблюдений.', 'Describe your current situation in relation to the goal you have already chosen. A few specific observations are enough.', 'Describe tu situación actual en relación con la meta que ya elegiste. Bastan unas observaciones concretas.'), [q('situation')]),
      task('area', copy('Сфера жизни', 'Life area', 'Área de vida'),
        copy('Уточните, какой сферы жизни касается выбранная цель. При необходимости вернитесь к карте жизни или тестам.', 'Clarify which life area your chosen goal relates to. Return to the life map or tests if useful.', 'Aclara con qué área de vida se relaciona tu meta. Vuelve al mapa de vida o a los tests si te ayudan.'), [q('area')], ['vectors', 'tests']),
      task('axis', copy('Внутренний вектор', 'Inner direction', 'Dirección interior'),
        copy('Посмотрите на смысловые оси и выберите то, что важно вам внутри этой цели.', 'Review the meaning axes and choose what matters to you within this goal.', 'Revisa los ejes de sentido y elige lo que te importa dentro de esta meta.'), [q('axis')], ['vectors']),
      task('wish', copy('Моё желание', 'What I want', 'Lo que deseo'),
        copy('Сформулируйте желаемое изменение: что вы хотите видеть вместо нынешней ситуации?', 'Describe the change you want: what would you like instead of the current situation?', 'Describe el cambio que deseas: ¿qué quieres en lugar de la situación actual?'), [q('wish')]),
      task('direction', copy('Выбираю направление', 'Choose a direction', 'Elige una dirección'),
        copy('Проверьте формулировку выбранной цели: как в ней соединяются сфера жизни и внутренний вектор?', 'Review your chosen goal: how does it connect your life area and inner direction?', 'Revisa tu meta: ¿cómo conecta el área de vida con tu dirección interior?'), [q('direction')], ['goals']),
      task('first-action', copy('Маленькая проверка', 'A small experiment', 'Una pequeña prueba'),
        copy('Выберите одно небольшое действие, которое поможет проверить, подходит ли вам это направление.', 'Choose one small action to find out whether this direction feels right for you.', 'Elige una pequeña acción para comprobar si esta dirección encaja contigo.'), [field('firstAction', copy('Что я сделаю и когда?', 'What will I do, and when?', '¿Qué haré y cuándo?'))], ['today']),
      task('reflection', copy('Итоги недели', 'Weekly reflection', 'Balance semanal'),
        copy('После действия запишите, что стало яснее и что хотите прояснить на следующей неделе.', 'After the action, note what became clearer and what you want to explore next week.', 'Después de la acción, anota qué se aclaró y qué quieres explorar la próxima semana.'), [field('summary', copy('Что я понял о своей цели?', 'What did I learn about my goal?', '¿Qué aprendí sobre mi meta?'))]),
    ]
    case 'vision': return [
      task('vision', copy('Мой будущий день', 'A day in my future', 'Un día en mi futuro'),
        copy('Опишите обычный хороший день, в котором желаемое изменение уже произошло.', 'Describe an ordinary good day after your desired change has happened.', 'Describe un buen día cotidiano después del cambio que deseas.'), [q('vision')]),
      task('why', copy('Личный смысл', 'Why it matters', 'Por qué me importa'),
        copy('Объясните, почему эта мечта важна именно вам, без чужих ожиданий.', 'Explain why this dream matters to you personally, apart from other people’s expectations.', 'Explica por qué este sueño te importa a ti, al margen de las expectativas ajenas.'), [q('why')], ['vectors']),
      task('feeling', copy('Моё состояние', 'How I feel', 'Cómo me siento'),
        copy('Заметьте чувства и телесные ощущения, когда думаете об этом будущем.', 'Notice your feelings and body sensations as you imagine this future.', 'Observa tus emociones y sensaciones corporales al imaginar este futuro.'), [q('feeling')]),
      task('boundaries', copy('Мои границы', 'My boundaries', 'Mis límites'),
        copy('Отметьте важные отношения, ценности и условия, которые хотите сохранить на пути к цели.', 'Name the relationships, values and conditions you want to preserve as you work toward your goal.', 'Nombra las relaciones, valores y condiciones que deseas cuidar mientras avanzas.'), [q('boundaries')]),
      task('criteria', copy('Признаки движения', 'Signs of progress', 'Señales de avance'),
        copy('Выберите наблюдаемые признаки: что изменится в действиях или повседневной жизни?', 'Choose observable signs: what will change in your actions or daily life?', 'Elige señales observables: ¿qué cambiará en tus acciones o vida cotidiana?'), [q('criteria')], ['plan']),
      task('small-step', copy('Часть мечты сегодня', 'A piece of the dream today', 'Un poco del sueño hoy'),
        copy('Найдите маленький элемент желаемого будущего, который можно попробовать уже сейчас.', 'Find one small part of the future you want that you can try now.', 'Encuentra una pequeña parte del futuro deseado que puedas probar ahora.'), [field('smallStep', copy('Что я попробую и когда?', 'What will I try, and when?', '¿Qué probaré y cuándo?'))], ['today']),
      task('reflection', copy('Итоги недели', 'Weekly reflection', 'Balance semanal'),
        copy('Запишите, что опыт этой недели добавил к вашему образу мечты.', 'Write down what this week’s experience added to your vision.', 'Anota qué aportó la experiencia de esta semana a tu visión.'), [field('summary', copy('Что стало точнее в моём образе будущего?', 'What became clearer in my vision of the future?', '¿Qué se aclaró en mi visión del futuro?'))]),
    ]
    case 'plan': return [
      task('days90', copy('Горизонт 90 дней', '90-day horizon', 'Horizonte de 90 días'),
        copy('Выберите конкретный результат на ближайшие три месяца.', 'Choose a specific result for the next three months.', 'Elige un resultado concreto para los próximos tres meses.'), [q('days90')], ['goals']),
      task('days30', copy('Веха 30 дней', '30-day milestone', 'Hito de 30 días'),
        copy('Определите промежуточный результат, который поможет проверить направление через месяц.', 'Define a milestone that will help you check your direction in a month.', 'Define un hito que te permita revisar la dirección dentro de un mes.'), [q('days30')], ['plan']),
      task('days7', copy('План на неделю', 'This week’s plan', 'Plan semanal'),
        copy('Выберите посильный объём работы на ближайшие семь дней.', 'Choose a manageable amount of work for the next seven days.', 'Elige una cantidad de trabajo viable para los próximos siete días.'), [q('days7')], ['plan']),
      task('days1', copy('Ближайшие 24–48 часов', 'The next 24–48 hours', 'Próximas 24–48 horas'),
        copy('Сузьте план до одного действия, которое можно начать в ближайшие день-два.', 'Narrow the plan to one action you can start in the next day or two.', 'Reduce el plan a una acción que puedas iniciar en uno o dos días.'), [q('days1')], ['today']),
      task('levels', copy('Три варианта плана', 'Three versions of the plan', 'Tres versiones del plan'),
        copy('Подготовьте минимум для сложного дня, обычный вариант и расширенный вариант при наличии сил.', 'Prepare a minimum for a difficult day, a regular version and a stretch version when you have capacity.', 'Prepara un mínimo para un día difícil, una versión habitual y otra ampliada si tienes energía.'), [q('levels')]),
      task('fallback', copy('Если план сорвётся', 'If the plan slips', 'Si el plan falla'),
        copy('Заранее выберите способ вернуться к движению без необходимости начинать всё заново.', 'Choose a way to resume progress without needing to start everything over.', 'Elige una forma de retomar el avance sin empezar todo de nuevo.'), [q('fallback')]),
      task('firstStep', copy('Первый шаг и срок', 'First step and deadline', 'Primer paso y plazo'),
        copy('Соберите план в понятное решение: действие, срок и признак выполнения.', 'Turn the plan into a clear decision: an action, a deadline and a sign that it is done.', 'Convierte el plan en una decisión clara: una acción, un plazo y una señal de cumplimiento.'), [q('firstStep')], ['today', 'plan']),
    ]
    case 'resources': return [
      task('energy', copy('Мои силы сейчас', 'My energy now', 'Mi energía ahora'),
        copy('Оцените доступные силы от 0 до 10. Это самонаблюдение, а не диагностический тест.', 'Rate your available energy from 0 to 10. This is a personal check-in, not a diagnostic test.', 'Valora tu energía disponible de 0 a 10. Es una observación personal, no una prueba diagnóstica.'), [field('rating', copy('Доступные силы', 'Available energy', 'Energía disponible'), 'rating')]),
      task('successes', copy('Мой успешный опыт', 'My past successes', 'Mis logros anteriores'),
        copy('Вспомните три ситуации, в которых вы справились с важной задачей, и что помогло.', 'Recall three situations where you handled an important challenge and what helped.', 'Recuerda tres situaciones en las que superaste un reto importante y qué te ayudó.'), [q('successes')]),
      task('strengths', copy('Навыки и качества', 'Skills and qualities', 'Habilidades y cualidades'),
        copy('Отметьте способности, на которые уже можно опереться в этой цели.', 'Name the abilities you can already draw on for this goal.', 'Nombra las capacidades que ya puedes utilizar para esta meta.'), [q('strengths')], ['tests']),
      task('support', copy('Моя поддержка', 'My support', 'Mi apoyo'),
        copy('Запишите людей, привычки и условия, которые помогают вам двигаться.', 'List the people, habits and conditions that help you move forward.', 'Anota las personas, hábitos y condiciones que te ayudan a avanzar.'), [q('support')], ['vectors']),
      task('drains', copy('Что забирает силы', 'What drains my energy', 'Qué me quita energía'),
        copy('Заметьте основные источники перегрузки и то, что можно уменьшить.', 'Notice the main sources of overload and what you could reduce.', 'Observa las principales fuentes de sobrecarga y lo que puedes reducir.'), [q('drains')]),
      task('need', copy('Нужный ресурс', 'The resource I need', 'El recurso que necesito'),
        copy('Выберите одну конкретную опору, которой сейчас не хватает для следующего шага.', 'Choose one specific resource you currently need for your next step.', 'Elige un recurso concreto que necesitas ahora para tu próximo paso.'), [q('need')], ['courses']),
      task('practice', copy('Восстановить опору', 'Restore support', 'Recuperar apoyo'),
        copy('Выберите посильную практику или способ получить поддержку и запишите, как будете его использовать.', 'Choose a manageable practice or way to get support and write down how you will use it.', 'Elige una práctica viable o una forma de recibir apoyo y anota cómo la utilizarás.'), [q('practice')], ['courses', 'videos']),
    ]
    case 'obstacles': return [
      task('wish', copy('W · Желание', 'W · Wish', 'W · Deseo'),
        copy('Выберите одно важное и реалистичное желание для практики WOOP.', 'Choose one important, realistic wish for this WOOP reflection.', 'Elige un deseo importante y realista para esta reflexión WOOP.'), [q('wish')]),
      task('outcome', copy('O · Результат', 'O · Outcome', 'O · Resultado'),
        copy('Опишите лучший полезный результат исполнения этого желания.', 'Describe the most useful outcome of fulfilling this wish.', 'Describe el resultado más útil de cumplir este deseo.'), [q('outcome')]),
      task('obstacle', copy('O · Препятствие', 'O · Obstacle', 'O · Obstáculo'),
        copy('Назовите одно конкретное препятствие, которое чаще всего возникает на пути.', 'Name one specific obstacle that often gets in your way.', 'Nombra un obstáculo concreto que suele aparecer en tu camino.'), [q('obstacle')], ['tests']),
      task('facts', copy('Факты и предположения', 'Facts and assumptions', 'Hechos y suposiciones'),
        copy('Отделите то, что вы наблюдали, от того, что предполагаете или опасаетесь.', 'Separate what you observed from what you assume or fear.', 'Separa lo que observaste de lo que supones o temes.'), [q('facts')]),
      task('ifThen', copy('P · Если — то', 'P · If — then', 'P · Si — entonces'),
        copy('Подготовьте небольшой безопасный ответ на препятствие: «Если это случится, то я…».', 'Prepare a small, safe response to the obstacle: “If this happens, then I will…”.', 'Prepara una pequeña respuesta segura al obstáculo: «Si ocurre, entonces yo…».'), [q('ifThen')], ['courses']),
      task('experiment', copy('Попробовать иначе', 'Try another response', 'Prueba otra respuesta'),
        copy('Проверьте свой план в подходящей ситуации. При необходимости выберите ресурсную практику.', 'Try your plan in a suitable situation. Choose a supportive practice if useful.', 'Prueba tu plan en una situación adecuada. Elige una práctica de apoyo si te ayuda.'), [field('experiment', copy('Что я попробовал и что произошло?', 'What did I try, and what happened?', '¿Qué probé y qué ocurrió?'))], ['courses', 'videos']),
      task('reflection', copy('Итоги недели', 'Weekly reflection', 'Balance semanal'),
        copy('Запишите, какой ответ на препятствие стоит сохранить и что ещё требует внимания.', 'Note which response to the obstacle is worth keeping and what still needs attention.', 'Anota qué respuesta al obstáculo conviene conservar y qué necesita atención.'), [field('summary', copy('Что помогает мне двигаться дальше?', 'What helps me keep moving?', '¿Qué me ayuda a seguir avanzando?'))]),
    ]
    case 'options': return [
      task('problem', copy('Задача для перемен', 'A problem to approach differently', 'Un problema que abordar de otra forma'),
        copy('Выберите конкретную задачу, для которой привычный способ уже не подходит.', 'Choose a specific problem where your usual approach no longer works well.', 'Elige un problema concreto para el que tu forma habitual ya no funciona bien.'), [q('problem')]),
      task('simplify', copy('Вариант 1 · Упростить', 'Option 1 · Simplify', 'Opción 1 · Simplificar'),
        copy('Предложите вариант, который уменьшает сложность, объём или количество действий.', 'Suggest an option that reduces complexity, scope or the number of actions.', 'Propón una opción que reduzca la complejidad, el alcance o el número de acciones.'), [q('option1')]),
      task('share', copy('Вариант 2 · Разделить', 'Option 2 · Share', 'Opción 2 · Compartir'),
        copy('Подумайте, что можно сделать вместе, разделить на части или передать с согласия другого человека.', 'Consider what you could do together, divide into parts or delegate with the other person’s agreement.', 'Piensa qué puedes hacer en compañía, dividir en partes o delegar con el acuerdo de otra persona.'), [q('option2')]),
      task('test', copy('Вариант 3 · Проверить', 'Option 3 · Test', 'Opción 3 · Probar'),
        copy('Придумайте небольшой обратимый эксперимент, который даст новую информацию.', 'Think of a small, reversible experiment that will give you new information.', 'Piensa en una prueba pequeña y reversible que aporte información nueva.'), [q('option3')]),
      task('compare', copy('Сравнить варианты', 'Compare the options', 'Compara las opciones'),
        copy('Сопоставьте варианты по пользе, усилиям, риску и возможности изменить решение.', 'Compare the options by benefit, effort, risk and how easily you can change course.', 'Compara las opciones según su utilidad, esfuerzo, riesgo y facilidad para cambiar de rumbo.'), [q('comparison')], ['plan']),
      task('experiment', copy('Выбрать эксперимент', 'Choose an experiment', 'Elige una prueba'),
        copy('Выберите один вариант, срок проверки и признак полезного результата.', 'Choose one option, a review date and a sign of a useful result.', 'Elige una opción, una fecha de revisión y una señal de resultado útil.'), [q('experiment')], ['goals', 'plan']),
      task('reflection', copy('Что показал опыт', 'What the experiment showed', 'Qué mostró la prueba'),
        copy('После проверки запишите, что хотите продолжить, изменить или отбросить.', 'After trying it, note what you want to continue, change or let go.', 'Después de probarlo, anota qué quieres continuar, cambiar o dejar.'), [field('summary', copy('Что я узнал и какой вариант выбираю дальше?', 'What did I learn, and which option will I take next?', '¿Qué aprendí y qué opción elijo ahora?'))]),
    ]
    case 'progress': return [
      task('done', copy('Мои реальные действия', 'What I actually did', 'Lo que hice realmente'),
        copy('Перечислите сделанное с прошлого обзора, включая небольшие и частичные шаги.', 'List what you did since the last review, including small and partial steps.', 'Enumera lo que hiciste desde la última revisión, incluidos los pasos pequeños o parciales.'), [q('done')], ['today', 'goals']),
      task('evidence', copy('Признаки продвижения', 'Evidence of progress', 'Señales de avance'),
        copy('Сравните наблюдаемые результаты с признаками цели, которые выбрали раньше.', 'Compare observable results with the signs of success you chose earlier.', 'Compara los resultados observables con las señales que elegiste anteriormente.'), [field('evidence', copy('Что изменилось в действиях или повседневной жизни?', 'What changed in my actions or daily life?', '¿Qué cambió en mis acciones o vida cotidiana?'))]),
      task('learned', copy('Что я понял', 'What I learned', 'Lo que aprendí'),
        copy('Отметьте новое понимание себя, подходящих условий и работающих способов.', 'Note what you learned about yourself, helpful conditions and approaches that work.', 'Anota lo que aprendiste de ti, de las condiciones útiles y de los métodos que funcionan.'), [q('learned')]),
      task('barriers', copy('Что требует внимания', 'What needs attention', 'Qué necesita atención'),
        copy('Укажите реальные препятствия и изменения обстоятельств, которые стоит учесть.', 'Name actual obstacles and changes in circumstances to take into account.', 'Nombra los obstáculos reales y cambios de circunstancias que conviene tener en cuenta.'), [q('barriers')], ['videos']),
      task('adjust', copy('Продолжить или изменить', 'Continue or adjust', 'Continuar o ajustar'),
        copy('Выберите, что усиливать, что упростить и от чего отказаться, чтобы освободить силы.', 'Choose what to strengthen, simplify or stop doing to free up capacity.', 'Elige qué reforzar, simplificar o dejar de hacer para disponer de más energía.'), [q('adjust')], ['plan']),
      task('focus', copy('Ускорение к цели', 'Build momentum', 'Acelera hacia tu meta'),
        copy('Выберите одно действие с наибольшей ожидаемой пользой при посильных затратах.', 'Choose one action with the greatest expected benefit and manageable effort.', 'Elige una acción con el mayor beneficio esperado y un esfuerzo viable.'), [field('focus', copy('Какое действие больше всего продвинет меня к цели?', 'Which action will move me toward my goal most?', '¿Qué acción me acercará más a mi meta?'))], ['today']),
      task('nextReview', copy('Следующий шаг и обзор', 'Next step and review', 'Próximo paso y revisión'),
        copy('Назначьте следующий шаг и дату обзора. Затем можно перейти к итогам и новым перспективам.', 'Choose your next step and review date. You can then move to the final reflection and new directions.', 'Elige tu próximo paso y fecha de revisión. Después puedes pasar al balance final y nuevas perspectivas.'), [q('nextReview')], ['goals', 'plan']),
    ]
    default: throw new Error('GUIDE_STAGE_INVALID')
  }
}

export const GUIDE_WEEKS = STAGES.map((stage, index) => ({
  id: stage.id,
  number: index + 1,
  title: Object.fromEntries(['en', 'ru', 'es'].map(locale => [locale, stage[locale][0]])),
  subtitle: Object.fromEntries(['en', 'ru', 'es'].map(locale => [locale, stage[locale][1]])),
  steps: stepsFor(stage),
}))

const reviewTask = task('summary',
  copy('Итоги и новые перспективы', 'Reflection and new directions', 'Balance y nuevas perspectivas'),
  copy('Сравните начало и текущую ситуацию. Сохраните важные изменения и направление следующего периода.', 'Compare your starting point with your situation now. Save the changes that matter and your direction for the next period.', 'Compara tu punto de partida con tu situación actual. Guarda los cambios importantes y tu dirección para la siguiente etapa.'),
  [
    field('result', copy('Какого результата я достиг?', 'What result did I achieve?', '¿Qué resultado alcancé?')),
    field('changes', copy('Что изменилось во мне и моей жизни?', 'What changed in me and my life?', '¿Qué cambió en mí y en mi vida?')),
    field('direction', copy('Какое следующее направление я выбираю?', 'What direction do I choose next?', '¿Qué dirección elijo a continuación?')),
  ], ['goals', 'tests', 'vectors'])

const preparation = (title, description, resources = []) => task('preparation', title, description, [
  field('request', copy('С чем я хочу поработать на этой неделе?', 'What would I like to work on this week?', '¿Qué quiero trabajar esta semana?')),
  field('result', copy('Какой результат я хочу получить от этой работы?', 'What result would I like from this work?', '¿Qué resultado quiero obtener de este trabajo?')),
], resources)

const preparationTasks = {
  discover: {
    2: preparation(copy('Прояснить цель с ИИ', 'Clarify your goal with AI', 'Aclara tu meta con IA'),
      copy('Обсудите с ИИ-коучем выбранную цель, её личный смысл и признаки результата. Запишите вопрос для разговора.', 'Discuss your chosen goal, its personal meaning and signs of success with an AI coach. Write down your question.', 'Habla con un coach de IA sobre tu meta, su sentido personal y las señales de éxito. Anota tu pregunta.'), ['vectors', 'goals']),
    3: preparation(copy('Запрос на карту цели', 'Request a personal goal map', 'Solicita un mapa de tu meta'),
      copy('Подготовьте запрос на персональные вопросы и письменную карту цели, связывающую сферу жизни с внутренним вектором.', 'Prepare a request for personal questions and a written goal map connecting your life area with your inner direction.', 'Prepara una solicitud de preguntas personales y un mapa escrito que conecte tu área de vida con tu dirección interior.'), ['vectors', 'tests']),
    4: preparation(copy('Сессия: ясная цель', 'Session: a clear goal', 'Sesión: una meta clara'),
      copy('Подготовьте запрос на сессию с Andy: прояснить выбранную цель, её смысл и наблюдаемые признаки достижения.', 'Prepare a session request for Andy to clarify your chosen goal, its meaning and observable signs of achievement.', 'Prepara una solicitud de sesión con Andy para aclarar tu meta, su sentido y las señales observables de logro.'), ['goals']),
  },
  vision: {
    2: preparation(copy('Развить мечту с ИИ', 'Explore your dream with AI', 'Explora tu sueño con IA'),
      copy('Обсудите с ИИ-коучем желаемый день, важные чувства и границы. Уточните, какой образ будущего действительно ваш.', 'Discuss your desired day, important feelings and boundaries with an AI coach. Clarify which vision of the future feels like yours.', 'Habla con un coach de IA sobre el día deseado, tus emociones y límites. Aclara qué visión del futuro sientes tuya.'), ['vectors']),
    3: preparation(copy('Запрос на образ мечты', 'Request a written dream exercise', 'Solicita un ejercicio sobre tu sueño'),
      copy('Подготовьте запрос на персональное письменное упражнение: хороший день в будущем, его смысл и признаки приближения к мечте.', 'Prepare a request for a personal writing exercise about a good day in your future, its meaning and signs of progress.', 'Prepara una solicitud de ejercicio escrito sobre un buen día en tu futuro, su sentido y las señales de avance.'), ['plan', 'vectors']),
    4: preparation(copy('Сессия: образ будущего', 'Session: your future vision', 'Sesión: tu visión del futuro'),
      copy('Подготовьте запрос на сессию с Andy: сделать образ мечты конкретнее и соотнести его с вашими ценностями и границами.', 'Prepare a session request for Andy to make your dream more concrete and connect it with your values and boundaries.', 'Prepara una solicitud de sesión con Andy para concretar tu sueño y relacionarlo con tus valores y límites.'), ['goals']),
  },
  plan: {
    2: preparation(copy('Проверить план с ИИ', 'Review your plan with AI', 'Revisa tu plan con IA'),
      copy('Обсудите с ИИ-коучем маршрут 90 / 30 / 7 / 1, реалистичную нагрузку и запасной вариант при срыве плана.', 'Discuss your 90 / 30 / 7 / 1 roadmap, manageable workload and fallback plan with an AI coach.', 'Habla con un coach de IA sobre tu ruta 90 / 30 / 7 / 1, una carga viable y un plan alternativo.'), ['plan', 'today']),
    3: preparation(copy('Запрос на личный маршрут', 'Request a personal roadmap', 'Solicita una ruta personal'),
      copy('Подготовьте запрос на персональный план 90 / 30 / 7 / 1 с первым действием, сроком и критерием выполнения.', 'Prepare a request for a personal 90 / 30 / 7 / 1 plan with a first action, a deadline and a completion criterion.', 'Prepara una solicitud de plan personal 90 / 30 / 7 / 1 con una primera acción, un plazo y un criterio de cumplimiento.'), ['plan', 'goals']),
    4: preparation(copy('Сессия: рабочий план', 'Session: a workable plan', 'Sesión: un plan viable'),
      copy('Подготовьте запрос на сессию с Andy: согласовать реалистичные вехи, выбрать первый шаг и продумать возвращение к плану.', 'Prepare a session request for Andy to set realistic milestones, choose your first step and plan how to resume after setbacks.', 'Prepara una solicitud de sesión con Andy para definir hitos realistas, elegir el primer paso y prever cómo retomar el plan.'), ['plan', 'today']),
  },
  resources: {
    2: preparation(copy('Найти опоры с ИИ', 'Find your resources with AI', 'Encuentra apoyos con IA'),
      copy('Обсудите с ИИ-коучем успешный опыт, доступные силы и источники поддержки. Выберите один ресурс для ближайшего шага.', 'Discuss your successes, available energy and support with an AI coach. Choose one resource for your next step.', 'Habla con un coach de IA sobre tus logros, energía y apoyos. Elige un recurso para tu próximo paso.'), ['tests', 'vectors']),
    3: preparation(copy('Запрос на ресурсную практику', 'Request a supportive practice', 'Solicita una práctica de apoyo'),
      copy('Подготовьте запрос на персональную ресурсную практику: восстановить силы и опереться на доступную поддержку. Формат уточняется при заказе.', 'Prepare a request for a personal practice to restore energy and draw on available support. The format is confirmed when ordering.', 'Prepara una solicitud de práctica personal para recuperar energía y utilizar tus apoyos. El formato se confirma al hacer el pedido.'), ['courses', 'videos']),
    4: preparation(copy('Сессия: силы и поддержка', 'Session: strengths and support', 'Sesión: fortalezas y apoyo'),
      copy('Подготовьте запрос на сессию с Andy: определить сильные стороны, снизить перегрузку и выбрать доступную опору для движения.', 'Prepare a session request for Andy to identify strengths, reduce overload and choose support you can use to move forward.', 'Prepara una solicitud de sesión con Andy para reconocer fortalezas, reducir la sobrecarga y elegir un apoyo para avanzar.'), ['tests', 'courses']),
  },
  obstacles: {
    2: preparation(copy('Разобрать препятствие с ИИ', 'Explore an obstacle with AI', 'Explora un obstáculo con IA'),
      copy('Обсудите с ИИ-коучем одно препятствие по WOOP, отделите факты от предположений и уточните безопасный план «если — то».', 'Discuss one obstacle using WOOP with an AI coach, separate facts from assumptions and refine a safe if–then plan.', 'Habla con un coach de IA sobre un obstáculo mediante WOOP, separa hechos y suposiciones y concreta un plan seguro «si — entonces».'), ['tests', 'courses']),
    3: preparation(copy('Запрос на поддержку проработки', 'Request support for working through obstacles', 'Solicita apoyo para trabajar obstáculos'),
      copy('Подготовьте запрос на персональное упражнение для мягкой работы с выбранным препятствием и поддержки нового способа реагировать.', 'Prepare a request for a personal exercise to work gently with your chosen obstacle and support a new way to respond.', 'Prepara una solicitud de ejercicio personal para trabajar suavemente el obstáculo elegido y apoyar una nueva forma de responder.'), ['courses', 'videos']),
    4: preparation(copy('Сессия: внутренние препятствия', 'Session: inner obstacles', 'Sesión: obstáculos internos'),
      copy('Подготовьте запрос на сессию с Andy: исследовать конкретное препятствие, учесть границы и найти посильный способ двигаться дальше.', 'Prepare a session request for Andy to explore a specific obstacle, respect your boundaries and find a manageable way forward.', 'Prepara una solicitud de sesión con Andy para explorar un obstáculo concreto, respetar tus límites y encontrar una forma viable de avanzar.'), ['tests', 'courses']),
  },
  options: {
    2: preparation(copy('Сравнить варианты с ИИ', 'Compare your options with AI', 'Compara opciones con IA'),
      copy('Обсудите с ИИ-коучем три варианта решения, их пользу, затраты и обратимость. Выберите небольшой проверяемый эксперимент.', 'Discuss three options, their benefits, effort and reversibility with an AI coach. Choose a small experiment you can evaluate.', 'Habla con un coach de IA sobre tres opciones, sus beneficios, esfuerzo y reversibilidad. Elige una pequeña prueba que puedas evaluar.'), ['plan', 'goals']),
    3: preparation(copy('Запрос на карту решений', 'Request a decision worksheet', 'Solicita una hoja de decisiones'),
      copy('Подготовьте запрос на персональную таблицу решений: упростить, разделить или проверить малым шагом; сравнить варианты и выбрать эксперимент.', 'Prepare a request for a personal decision worksheet: simplify, share or test in a small step, compare options and choose an experiment.', 'Prepara una solicitud de hoja personal de decisiones: simplificar, compartir o probar en pequeño, comparar opciones y elegir una prueba.'), ['plan', 'goals']),
    4: preparation(copy('Сессия: новые возможности', 'Session: new possibilities', 'Sesión: nuevas posibilidades'),
      copy('Подготовьте запрос на сессию с Andy: выйти за пределы привычного решения, сравнить альтернативы и выбрать реалистичный эксперимент.', 'Prepare a session request for Andy to move beyond your usual solution, compare alternatives and choose a realistic experiment.', 'Prepara una solicitud de sesión con Andy para ir más allá de la solución habitual, comparar alternativas y elegir una prueba realista.'), ['plan', 'goals']),
  },
  progress: {
    2: preparation(copy('Усилить движение с ИИ', 'Build momentum with AI', 'Refuerza tu avance con IA'),
      copy('Обсудите с ИИ-коучем реальные результаты, работающие действия и лишнюю нагрузку. Выберите главный шаг и дату следующего обзора.', 'Discuss your actual results, useful actions and unnecessary effort with an AI coach. Choose your main next step and review date.', 'Habla con un coach de IA sobre tus resultados, acciones útiles y esfuerzos innecesarios. Elige el próximo paso principal y la fecha de revisión.'), ['today', 'plan']),
    3: preparation(copy('Запрос на поддержку фокуса', 'Request support for your focus', 'Solicita apoyo para tu enfoque'),
      copy('Подготовьте запрос на персональную практику поддержки фокуса и устойчивого движения к цели. Укажите действие, которое хотите закрепить.', 'Prepare a request for a personal practice to support focus and steady progress. Name the action you want to sustain.', 'Prepara una solicitud de práctica personal para apoyar tu enfoque y un avance constante. Indica la acción que deseas mantener.'), ['today', 'videos']),
    4: preparation(copy('Сессия: ускорение к цели', 'Session: progress toward your goal', 'Sesión: acelera hacia tu meta'),
      copy('Подготовьте запрос на сессию с Andy: оценить продвижение, усилить полезные действия и выбрать следующий этап движения к цели.', 'Prepare a session request for Andy to review progress, strengthen useful actions and choose the next stage toward your goal.', 'Prepara una solicitud de sesión con Andy para revisar avances, reforzar acciones útiles y elegir la siguiente etapa hacia tu meta.'), ['goals', 'plan']),
  },
}

export function getGuideTask(weekId, level, stepId) {
  if (!Number.isInteger(level) || level < 1 || level > 4) return null
  if (weekId === 'review') return level === 1 && stepId === 'summary' ? reviewTask : null
  const week = GUIDE_WEEKS.find(candidate => candidate.id === weekId)
  if (!week) return null
  if (level === 1) return week.steps.find(candidate => candidate.id === stepId) || null
  return stepId === 'preparation' ? preparationTasks[weekId]?.[level] || null : null
}

export function guideTag(weekId, level, stepId) {
  if (!getGuideTask(weekId, level, stepId)) throw new Error('GUIDE_TASK_INVALID')
  return `daybook-guide:${weekId}:${level}:${stepId}`
}

const MAX_ANSWER_LENGTH = 1200
const MAX_TEXT_LENGTH = 20000
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)

function cleanGuideData({weekId, level, stepId, answers, completed}) {
  const selectedTask = getGuideTask(weekId, level, stepId)
  if (!selectedTask) throw new Error('GUIDE_TASK_INVALID')
  if (typeof completed !== 'boolean' || !plainObject(answers)) throw new Error('GUIDE_ANSWERS_INVALID')
  if (level > 1 && completed) throw new Error('GUIDE_PREPARATION_ONLY')
  const fields = new Map(selectedTask.fields.map(item => [item.id, item]))
  const clean = {}
  for (const [key, value] of Object.entries(answers)) {
    const selectedField = fields.get(key)
    if (!selectedField || typeof value !== 'string') throw new Error('GUIDE_ANSWERS_INVALID')
    if (value.length > MAX_ANSWER_LENGTH) throw new Error('GUIDE_ANSWER_TOO_LONG')
    const trimmed = value.trim()
    if (selectedField.type === 'rating' && !/^(?:[0-9]|10)?$/.test(trimmed)) throw new Error('GUIDE_RATING_INVALID')
    if (trimmed) clean[key] = trimmed
  }
  if (completed && selectedTask.fields.some(item => item.required && !clean[item.id])) throw new Error('GUIDE_RESULT_REQUIRED')
  return {format: 'hh-guide-v1', week: weekId, level, step: stepId, completed, answers: clean}
}

export function guideText(input) {
  if (!plainObject(input)) throw new Error('GUIDE_ANSWERS_INVALID')
  const text = JSON.stringify(cleanGuideData(input))
  if (text.length >= MAX_TEXT_LENGTH) throw new Error('GUIDE_TEXT_TOO_LONG')
  return text
}

export function parseGuideEntry(entry) {
  if (entry?.kind !== 'note' || !Array.isArray(entry.tags) || typeof entry.text !== 'string' || entry.text.length >= MAX_TEXT_LENGTH) return null
  try {
    const data = JSON.parse(entry.text)
    if (!plainObject(data) || data.format !== 'hh-guide-v1' ||
      Object.keys(data).some(key => !['format', 'week', 'level', 'step', 'completed', 'answers'].includes(key))) return null
    const clean = cleanGuideData({weekId: data.week, level: data.level, stepId: data.step, answers: data.answers, completed: data.completed})
    return entry.tags.includes(guideTag(clean.week, clean.level, clean.step)) ? clean : null
  } catch {
    return null
  }
}

const sortValue = value => typeof value === 'string' ? value : ''

export function guideRecords(entries, goalId, weekId, level, stepId) {
  if (!Array.isArray(entries) || !(goalId === null || (typeof goalId === 'string' && goalId.trim())) || !getGuideTask(weekId, level, stepId)) return []
  const expectedTag = guideTag(weekId, level, stepId)
  return entries.filter(entry => {
    if (entry?.goalId !== goalId || !Array.isArray(entry.tags) || !entry.tags.includes(expectedTag)) return false
    const data = parseGuideEntry(entry)
    return data?.week === weekId && data.level === level && data.step === stepId
  }).sort((a, b) => sortValue(b.updatedAt).localeCompare(sortValue(a.updatedAt)) || sortValue(a.id).localeCompare(sortValue(b.id)))
}

export function guideReadable(entry, locale) {
  const data = parseGuideEntry(entry)
  // Legacy stage notes remain readable; they never grant seven completed tasks.
  if (!data) return stageReadable(entry, ['en', 'ru', 'es'].includes(locale) ? locale : 'en')
  const language = ['en', 'ru', 'es'].includes(locale) ? locale : 'en'
  const selectedTask = getGuideTask(data.week, data.level, data.step)
  const week = GUIDE_WEEKS.find(candidate => candidate.id === data.week)
  const level = GUIDE_LEVELS.find(candidate => candidate.id === data.level)
  return [
    ...(week ? [week.title[language]] : []),
    level.title[language],
    selectedTask.title[language],
    ...selectedTask.fields.flatMap(item => data.answers[item.id] !== undefined
      ? [`${item.label[language]}\n${data.answers[item.id]}${item.type === 'rating' ? '/10' : ''}`] : []),
  ].join('\n\n')
}

export function guideProgress(entries, goalId, weekId) {
  const week = GUIDE_WEEKS.find(candidate => candidate.id === weekId)
  return {
    completed: week ? week.steps.filter(step => parseGuideEntry(guideRecords(entries, goalId, weekId, 1, step.id)[0])?.completed === true).length : 0,
    total: 7,
  }
}
