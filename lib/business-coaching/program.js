// Holistic House Business & Career 90-day course — reviewed educational content v1.
// Self-reported business reflections are formative, NOT a validated psychological instrument.
// All tasks are voluntary; no income, career or health outcome is promised.
export const BUSINESS_COURSE_VERSION = 1
export const BUSINESS_SNAPSHOT_VERSION = 'hh-business-snapshot-v1'
export const BUSINESS_TRACKS = Object.freeze([
  { id: 'idea', en: 'Planning a business', ru: 'Планирую открыть дело' },
  { id: 'owner', en: 'Self-employed / business owner', ru: 'Работаю на себя / веду бизнес' },
  { id: 'career', en: 'Career development', ru: 'Развиваю карьеру' },
])
export const BUSINESS_DOMAINS = Object.freeze([
  { id: 'clarity', en: 'Direction and value', ru: 'Цели и ценность' },
  { id: 'planning', en: 'Priorities and planning', ru: 'Планирование и приоритеты' },
  { id: 'execution', en: 'Consistent action', ru: 'Регулярность действий' },
  { id: 'customers', en: 'Customer / stakeholder understanding', ru: 'Понимание клиентов и партнёров' },
  { id: 'opportunities', en: 'Opportunities and conversations', ru: 'Контакты и возможности' },
  { id: 'money', en: 'Financial visibility', ru: 'Финансовая ясность' },
])
// Last 14 days; 0=never, 1=rarely, 2=sometimes, 3=often, 4=consistently.
// Statements refer to behaviors, NOT intrinsic personality, diagnosis or financial fitness.
const questions = [
  ['clarity','I could describe the single most important result I was working toward.','Я мог(ла) назвать главный результат, к которому стремился(лась).'],
  ['clarity','I could explain who benefits from my work and why.','Я мог(ла) объяснить, кому и почему полезна моя работа.'],
  ['clarity','I could distinguish my own goals from outside expectations.','Я различал(а) собственные цели и ожидания других.'],
  ['planning','I set realistic priorities for the week.','Я выбирал(а) реалистичные приоритеты на неделю.'],
  ['planning','I reserved time for the highest-value task.','Я выделял(а) время на наиболее важную задачу.'],
  ['planning','I adjusted my plan when circumstances changed.','Я корректировал(а) план при изменении обстоятельств.'],
  ['execution','I completed a meaningful next step on my chosen priority.','Я выполнял(а) значимый шаг по выбранному приоритету.'],
  ['execution','I could restart after an interrupted or difficult day.','Я мог(ла) вернуться к делу после сложного или прерванного дня.'],
  ['execution','I finished a small task before switching to something else.','Я завершал(а) небольшую задачу до переключения на другую.'],
  ['customers','I asked about the real needs of people affected by my work.','Я выяснял(а) реальные потребности людей, которым полезна моя работа.'],
  ['customers','I used feedback to improve an offer or work result.','Я использовал(а) обратную связь для улучшения услуги или результата работы.'],
  ['customers','I could state a concrete benefit rather than just a list of features.','Я мог(ла) назвать конкретную пользу, а не только перечень функций.'],
  ['opportunities','I took an appropriate action to develop a useful professional contact.','Я предпринимал(а) уместные действия для развития полезных профессиональных контактов.'],
  ['opportunities','I clearly communicated a next step in a business or career conversation.','Я ясно обозначал(а) следующий шаг в деловом разговоре.'],
  ['opportunities','I followed up when it was appropriate and welcome.','Я возвращался(лась) к обсуждению, когда это было уместно и желанно.'],
  ['money','I knew what income or resources were available for my work.','Я понимал(а), какие доходы или ресурсы доступны для моей работы.'],
  ['money','I tracked relevant costs, expenses or time investments.','Я учитывал(а) расходы, затраты или время на работу.'],
  ['money','I used actual numbers rather than guesses when making a work decision.','Я опирался(лась) на реальные цифры, а не на догадки, принимая рабочие решения.'],
]
export const BUSINESS_QUESTIONS = Object.freeze(questions.map(([domain,en,ru],i)=>Object.freeze({
  id: 'b' + (i + 1), domain, en, ru,
})))
export const BUSINESS_RESPONSE_LABELS = Object.freeze({
  en: ['Never','Rarely','Sometimes','Often','Consistently'],
  ru: ['Никогда','Редко','Иногда','Часто','Почти всегда'],
})
// Missing answers remain missing; at least 2 of 3 items are needed per domain.
// These mean positions are a descriptive editorial aid, not validated norms.
export function businessSnapshotScores(answers = {}) {
  return BUSINESS_DOMAINS.map(domain => {
    const scored = BUSINESS_QUESTIONS.filter(q=>q.domain===domain.id)
      .map(q=>answers?.[q.id]).filter(v=>Number.isInteger(v) && v>=0 && v<=4)
    return { id:domain.id, count:scored.length, maxCount:3,
      mean:scored.length >= 2 ? Math.round(scored.reduce((s,n)=>s+n,0)/scored.length*10)/10 : null }
  })
}
export function businessSuggestions(answers = {}, track = 'owner') {
  const scores = businessSnapshotScores(answers).filter(s=>s.mean!==null)
    .sort((a,b)=>a.mean-b.mean || a.id.localeCompare(b.id))
  // Display up to three directions as OPTIONAL client-confirmed learning priorities.
  const result = scores.slice(0,3).map(s=>s.id)
  if(!result.length) return track==='idea' ? ['clarity','customers','planning'] :
    track==='career' ? ['clarity','opportunities','execution'] : ['clarity','execution','customers']
  return result
}
const weekRows = [
  {
    ru:'Точка А: моя реальность', en:'Point A: where I am',
    ruIntro:'Описываем текущие обстоятельства, ресурсы и реальные результаты без самокритики.',
    enIntro:'Map the current situation, resources and real results without self-judgment.',
    prompts:[
      ['Запиши три наблюдаемых факта о работе сейчас.','Write down three observable facts about your work today.'],
      ['Назови работу, которая действительно создаёт ценность.','Name the work that genuinely creates value.'],
      ['Отметь, куда уходили часы на прошлой неделе.','Map where your hours went last week.'],
      ['Выбери один показатель для дальнейшего наблюдения.','Choose one practical indicator to follow.'],
      ['Поговори с человеком, который знает твою работу, и попроси конкретную обратную связь.','Ask someone who knows your work for concrete feedback.'],
      ['Запиши доступные ресурсы и ограничения.','List your available resources and constraints.'],
      ['Составь короткую карту текущего положения.','Write a short summary of your starting point.'],
    ],
  },
  {
    ru:'Точка Б: моя цель', en:'Point B: my desired outcome',
    ruIntro:'Выбираем личный результат, сроки и первые контрольные точки.',
    enIntro:'Choose a meaningful outcome, practical milestones and a timeframe.',
    prompts:[
      ['Опиши, что должно измениться за 90 дней.','Describe what you want to change in 90 days.'],
      ['Выдели одну главную цель вместо длинного списка.','Choose one primary outcome instead of a long wish list.'],
      ['Укажи, как можно наблюдать прогресс без самооценочных догадок.','Choose an observable sign of progress.'],
      ['Определи две поддерживающие цели и допустимые компромиссы.','Define two supporting aims and acceptable trade-offs.'],
      ['Проверь: цель зависит от твоих действий или от выбора других людей?','Check what is within your influence and what depends on others.'],
      ['Наметь первый малый шаг на следующую неделю.','Choose a manageable step for next week.'],
      ['Сохрани карточку цели и пересмотри её реалистичность.','Save your goal card and review whether it is realistic.'],
    ],
  },
  {
    ru:'Что меня задерживает', en:'What slows me down',
    ruIntro:'Исследуем препятствия как условия и навыки, а не недостатки личности.',
    enIntro:'Explore obstacles as conditions and workable skills, not character defects.',
    prompts:[
      ['Вспомни одну задачу, которую откладываешь.','Choose one task you have been postponing.'],
      ['Определи реальное препятствие: время, ясность, ресурсы или информация.','Identify the actual obstacle: time, clarity, resources or information.'],
      ['Раздели большую задачу на выполнимые части.','Break a large task into manageable steps.'],
      ['Попробуй начать с двух минут без требования закончить всё.','Try a two-minute start without requiring a complete result.'],
      ['Проверь одну гипотезу о препятствии в реальной ситуации.','Test one assumption about the obstacle in practice.'],
      ['Попроси помощь или уточнение там, где это уместно.','Ask for help or clarification where appropriate.'],
      ['Запиши, что сработало, и выбери следующее изменение.','Write what worked and choose the next adjustment.'],
    ],
  },
  {
    ru:'Освобождаем пространство', en:'Clear the unnecessary',
    ruIntro:'Снижаем ненужную нагрузку и защищаем время для действительно важного.',
    enIntro:'Reduce low-value work and protect capacity for what matters.',
    prompts:[
      ['Составь список повторяющихся дел без понятного результата.','List recurring activities with unclear value.'],
      ['Отметь, от какого необязательного дела можно отказаться.','Choose one optional activity to stop.'],
      ['Оставь один главный приоритет на завтра.','Keep one main priority for tomorrow.'],
      ['Закрой или перенеси одну незавершённую мелкую задачу.','Close or deliberately reschedule one small unfinished task.'],
      ['Создай спокойный блок внимания в календаре.','Protect one realistic focus block in your calendar.'],
      ['Проверь, не лишил ли новый режим необходимого отдыха.','Check that the new plan preserves necessary rest.'],
      ['Подведи итоги первого месяца по фактам.','Review month one using observable facts.'],
    ],
  },
  {
    ru:'Неделя, на которую можно опереться', en:'Build a reliable week',
    ruIntro:'Формируем гибкую систему планирования с возможностью пауз и возвращения.',
    enIntro:'Build a flexible planning rhythm that allows rest and recovery.',
    prompts:[
      ['Выбери день для спокойного недельного обзора.','Choose a day for your weekly review.'],
      ['Наметь три реалистичных результата на неделю.','Plan three realistic outcomes for the week.'],
      ['Размести ключевые задачи в календаре с запасом времени.','Schedule priority tasks with realistic buffers.'],
      ['Подготовь двухминутную версию самого трудного шага.','Prepare a two-minute alternative for the hardest task.'],
      ['Попробуй начать один фокус-блок без отвлекающих уведомлений.','Try one focus block with notifications muted.'],
      ['Отметь, что следует пересмотреть без самокритики.','Notice what needs adjustment without self-blame.'],
      ['Выбери привычку, которую действительно хочется продолжать.','Choose one habit you genuinely want to keep.'],
    ],
  },
  {
    ru:'Ценность моего предложения', en:'Clarify the value I offer',
    ruIntro:'Уточняем, кому и какой конкретный результат приносит работа.',
    enIntro:'Clarify who your work helps and the outcome it supports.',
    prompts:[
      ['Назови одного конкретного клиента или получателя результата.','Choose one specific customer or stakeholder.'],
      ['Запиши проблему, которую человек сам считает важной.','Write a problem that person actually considers important.'],
      ['Сформулируй результат простыми словами без обещаний гарантии.','Express the outcome in plain language without guarantees.'],
      ['Сопоставь предложение с обратной связью, а не предположениями.','Compare your offer with real feedback, not assumptions.'],
      ['Сократи описание ценности до двух предложений.','Condense your value proposition to two sentences.'],
      ['Покажи черновик подходящему человеку и спроси, что непонятно.','Show a draft to a relevant person and ask what is unclear.'],
      ['Сохрани одностраничное описание предложения.','Save a one-page description of your offer.'],
    ],
  },
  {
    ru:'Контакты и новые возможности', en:'Build meaningful opportunities',
    ruIntro:'Создаём систему уместного общения, основанного на взаимной пользе и уважении.',
    enIntro:'Build respectful relationships and a practical opportunity pipeline.',
    prompts:[
      ['Запиши, какие профессиональные отношения для тебя важны.','Map the professional relationships that matter.'],
      ['Выбери один уместный способ начать разговор.','Choose one appropriate way to begin a conversation.'],
      ['Подготовь открытый вопрос о потребностях собеседника.','Prepare an open question about the other person’s needs.'],
      ['Проведи разговор без давления и навязчивых предложений.','Have a conversation without pressure or unsolicited pitching.'],
      ['Запиши договорённый следующий шаг, если он действительно есть.','Record a next step only if one was genuinely agreed.'],
      ['Разбери, что узнал(а) о задачах другого человека.','Reflect on what you learned about the other person’s needs.'],
      ['Обнови список возможностей без выдуманных лидов.','Update the opportunity list without counting invented leads.'],
    ],
  },
  {
    ru:'Финансовая ясность', en:'Understand the numbers',
    ruIntro:'Учимся видеть доходы, расходы, время и риски без финансовых обещаний.',
    enIntro:'Understand revenue, costs, invested time and uncertainty without financial promises.',
    prompts:[
      ['Выбери безопасный для себя уровень учёта: цифры или только категории.','Choose a comfortable tracking level: numbers or categories only.'],
      ['Зафиксируй период и валюту для будущих сравнений.','Choose a clear period and currency for comparison.'],
      ['Перечисли основные виды доходов или доступных ресурсов.','List the main income streams or available resources.'],
      ['Назови три заметные статьи расходов или затрат времени.','Identify three meaningful costs or time investments.'],
      ['Проверь одну цену, стоимость работы или важный ресурс.','Review one price, work cost or relevant resource.'],
      ['Выдели решение, где нужны данные, а не интуиция.','Identify a decision that requires real data rather than guesses.'],
      ['Сделай короткий обзор второго месяца и уточни финансовую цель.','Review month two and refine your money-related goal.'],
    ],
  },
  {
    ru:'Деловые разговоры и решения', en:'Ethical sales and conversations',
    ruIntro:'Практикуем ясные вопросы, предложения и договорённости без давления.',
    enIntro:'Practise clear questions, offers and agreed next steps without pressure.',
    prompts:[
      ['Запиши три вопроса для выяснения потребностей.','Write three discovery questions.'],
      ['Сформулируй, что входит и не входит в твоё предложение.','Describe what your offer includes and excludes.'],
      ['Подготовь прозрачный разговор о цене или ресурсах.','Prepare a transparent conversation about price or resources.'],
      ['Потренируйся отвечать на вопрос, если решения пока нет.','Practise responding when a decision is not yet made.'],
      ['Предложи следующий шаг только заинтересованному собеседнику.','Offer a next step only to someone who is interested.'],
      ['Запиши один урок из реальной встречи или собеседования.','Record one lesson from a meeting or interview.'],
      ['Сохрани личный план делового общения.','Save your own ethical conversation checklist.'],
    ],
  },
  {
    ru:'Процессы, которые работают', en:'Make work repeatable',
    ruIntro:'Снижаем ненужные повторения без дорогих систем и лишней автоматизации.',
    enIntro:'Reduce avoidable repetition without costly or unnecessary automation.',
    prompts:[
      ['Найди процесс, который повторяется чаще всего.','Identify a task that repeats frequently.'],
      ['Опиши его фактические шаги без идеализации.','Write down its actual steps.'],
      ['Отметь этап, где чаще всего теряется время.','Identify where time is commonly lost.'],
      ['Создай короткий шаблон или чек-лист.','Make a short template or checklist.'],
      ['Испытай новый порядок на одном случае.','Test the revised process once.'],
      ['Сравни необходимое время или число ошибок с исходным наблюдением.','Compare observed time or errors with your earlier observation.'],
      ['Сохрани полезный шаблон и убери лишнюю сложность.','Keep what helps and remove unnecessary complexity.'],
    ],
  },
  {
    ru:'Эксперимент роста', en:'Run one growth experiment',
    ruIntro:'Проверяем одну небольшую гипотезу, а не пытаемся изменить всё сразу.',
    enIntro:'Test one manageable idea with a pre-defined observation.',
    prompts:[
      ['Выбери одно изменение, которое хочется проверить.','Choose one change you want to test.'],
      ['Запиши ожидаемый результат как гипотезу, не обещание.','Write the expected result as a hypothesis, not a promise.'],
      ['Выбери измеримый сигнал и срок наблюдения.','Choose an observable measure and a timeframe.'],
      ['Проведи первый небольшой шаг эксперимента.','Run the first small experiment action.'],
      ['Собери обратную связь или фактические данные.','Gather relevant feedback or actual data.'],
      ['Сравни наблюдения с исходной гипотезой.','Compare observations with your original hypothesis.'],
      ['Реши: продолжить, изменить или остановить эксперимент.','Decide whether to continue, adjust or stop.'],
    ],
  },
  {
    ru:'Итоги и следующий квартал', en:'Review and plan the next quarter',
    ruIntro:'Разделяем реальные бизнес-изменения, практики и ответы опросника.',
    enIntro:'Separate actual business changes, practice activity and self-reported reflections.',
    prompts:[
      ['Вернись к исходной цели и перечитай её без оценок личности.','Revisit the original goal without judging yourself.'],
      ['Сверь бизнес-показатели только за сопоставимые периоды.','Compare business indicators only across comparable periods.'],
      ['Запиши, какие навыки ты практиковал(а) на самом деле.','List the skills you genuinely practised.'],
      ['Проверь, какие условия помогали и мешали действиям.','Review what helped and hindered action.'],
      ['Повтори короткий авторский опросник, если готов(а).','Repeat the optional self-reflection survey if you wish.'],
      ['Выбери одну полезную привычку на будущий квартал.','Choose one habit for the next quarter.'],
      ['Подготовь итоговый обзор и следующий небольшой шаг.','Prepare your review and next manageable step.'],
    ],
  },
]
export const BUSINESS_WEEKS = Object.freeze(weekRows.map((w,i)=>Object.freeze({
  week:i+1, title:{ru:w.ru,en:w.en}, introduction:{ru:w.ruIntro,en:w.enIntro},
  tasks:Object.freeze(w.prompts.map(([ru,en],j)=>Object.freeze({day:i*7+j+1,ru,en}))),
})))
const finalDays = [
  ['Отдохни и вспомни, что получилось сохранить.','Rest and note what you have retained.'],
  ['Просмотри записи за первый месяц и отметь изменения.','Review month-one notes and identify changes.'],
  ['Просмотри второй месяц и пересмотри рабочий ритм.','Review month two and reconsider your working rhythm.'],
  ['Просмотри третий месяц и запиши измеримые итоги.','Review month three and record observable outcomes.'],
  ['Выбери поддержку или ресурс, необходимый дальше.','Choose the support or resources you need next.'],
  ['Заверши цикл или определи новую добровольную цель.','Finish the cycle or choose a new goal voluntarily.'],
]
export function businessDay(day,locale='en') {
  if(!Number.isInteger(day)||day<1||day>90)return null
  const lang=locale==='ru'?'ru':'en'
  if(day<=84) {
    const week=BUSINESS_WEEKS[Math.floor((day-1)/7)]
    return { day,week:week.week,title:week.title[lang],intro:week.introduction[lang],action:week.tasks[(day-1)%7][lang] }
  }
  return {day,week:13,title:lang==='ru'?'Закрепление и итоги':'Integration and review',
    intro:lang==='ru'?'Шесть спокойных дней на закрепление и обзор.':'Six gentle days to review and integrate.',
    action:finalDays[day-85][lang==='ru'?0:1]}
}
export const BUSINESS_METRICS = Object.freeze([
  {id:'enquiries',en:'Enquiries / conversations',ru:'Заявки / переговоры',unit:'count'},
  {id:'sales',en:'Completed sales / deals',ru:'Продажи / сделки',unit:'count'},
  {id:'focus_hours',en:'Focused work hours',ru:'Часы сосредоточенной работы',unit:'hours'},
  {id:'applications',en:'Job applications / interviews',ru:'Отклики / собеседования',unit:'count'},
  {id:'revenue',en:'Revenue',ru:'Выручка',unit:'money'},
  {id:'expenses',en:'Expenses',ru:'Расходы',unit:'money'},
])
export function businessProgress(state) {
  const completed=Object.entries(state?.days||{}).filter(([k,v])=>Number(k)>=1&&Number(k)<=90&&v?.done===true).length
  return { completed, total:90, percent:Math.round(completed/90*100) }
}
