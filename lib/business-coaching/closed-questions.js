// Holistic House 90-day Business & Career: optional, non-scored, one-tap coaching v1.
// A completed learning check means the client answered; it does NOT verify a
// business action, customer contact, sale, income change or skill improvement.
// Every micro-action is doable without typing, sharing a customer's data, or buying anything.
export const BUSINESS_ONE_TAP_VERSION = 'hh-business-one-tap-v1'

export const BUSINESS_GOAL_CHOICES = Object.freeze({
  idea: [
    {id:'idea-test',en:'Test my business idea',ru:'Проверить бизнес-идею'},
    {id:'idea-offer',en:'Clarify what I can offer',ru:'Понять, что могу предложить'},
    {id:'idea-first',en:'Find the first interested people',ru:'Найти первых заинтересованных людей'},
    {id:'idea-rhythm',en:'Build a calm working rhythm',ru:'Наладить спокойный рабочий ритм'},
  ],
  owner: [
    {id:'owner-clients',en:'Attract more suitable enquiries',ru:'Получать больше подходящих обращений'},
    {id:'owner-offer',en:'Make my offer clearer',ru:'Сделать предложение понятнее'},
    {id:'owner-focus',en:'Get the important work done',ru:'Успевать делать главное'},
    {id:'owner-money',en:'Understand my business resources',ru:'Лучше понимать ресурсы бизнеса'},
  ],
  career: [
    {id:'career-direction',en:'Choose my next career direction',ru:'Выбрать следующее карьерное направление'},
    {id:'career-skills',en:'Strengthen useful work skills',ru:'Укрепить нужные рабочие навыки'},
    {id:'career-contacts',en:'Build professional connections',ru:'Развить профессиональные контакты'},
    {id:'career-balance',en:'Find a sustainable work rhythm',ru:'Найти устойчивый рабочий ритм'},
  ],
})

export function businessGoalLabel(value,lang='en'){
  return Object.values(BUSINESS_GOAL_CHOICES).flat().find(row=>row.en===value||row.ru===value)?.[lang]||value
}

export const BUSINESS_DAY_CHOICES = Object.freeze([
  {id:'tried',en:'Yes, I tried it',ru:'Да, я попробовал(а)'},
  {id:'small',en:'I took a small step',ru:'Сделал(а) небольшой шаг'},
  {id:'later',en:'Not yet — I will return to it',ru:'Пока нет — вернусь позже'},
  {id:'not-for-me',en:'Not relevant to me right now',ru:'Сейчас мне не подходит'},
])
export function businessOneTapResult(choiceId){
  const row=BUSINESS_DAY_CHOICES.find(item=>item.id===choiceId)
  return row?'Self-reported learning check: '+row.en:''
}
export function businessChoiceLabel(record,lang='en'){
  const row=BUSINESS_DAY_CHOICES.find(item=>item.id===record?.choiceId)
  return row?row[lang]:(record?.result||'')
}

// One tiny action for every numbered day (12 x 7 + 6 integration days).
// These replace mandatory essays and written weekly documents in the learner flow.
const weeks=[
  [
    ['Notice one factual detail about your work today.','Заметьте один конкретный факт о своей работе.'],
    ['Think of one way your work helps someone.','Вспомните один способ, которым ваша работа полезна человеку.'],
    ['Notice which type of task used most time recently.','Заметьте, какие дела занимали больше всего времени.'],
    ['Choose one thing worth observing over time.','Выберите один показатель, за которым полезно наблюдать.'],
    ['Think of a person whose feedback could be useful.','Подумайте, чья обратная связь может быть полезна.'],
    ['Notice one resource that is already available.','Заметьте один ресурс, который уже есть.'],
    ['Choose the clearest fact about your starting point.','Выберите самый ясный факт о своей отправной точке.'],
  ],
  [
    ['Imagine one realistic change in the next 90 days.','Представьте одно реальное изменение за 90 дней.'],
    ['Choose the one goal that matters most now.','Выберите самую важную цель на сегодня.'],
    ['Notice one sign that could show progress.','Заметьте один признак будущего прогресса.'],
    ['Choose one supporting priority.','Выберите один вспомогательный приоритет.'],
    ['Separate one thing you control from what you cannot control.','Отделите одно своё действие от того, что не в вашей власти.'],
    ['Pick one small step for this week.','Выберите один маленький шаг на эту неделю.'],
    ['Check whether the chosen goal fits your real time and energy.','Проверьте, соответствует ли цель вашему времени и силам.'],
  ],
  [
    ['Recall one task you have been postponing.','Вспомните одно дело, которое откладываете.'],
    ['Notice whether time, clarity or resources are the main obstacle.','Заметьте, мешает время, ясность или ресурсы.'],
    ['Imagine the very first tiny part of that task.','Представьте самую маленькую часть этого дела.'],
    ['Try a two-minute start if it is safe and feasible.','Попробуйте начать на две минуты, если это возможно.'],
    ['Check which assumption about the obstacle may be wrong.','Проверьте, какое предположение о препятствии может быть неверным.'],
    ['Consider one appropriate person to ask for help.','Подумайте, у кого уместно попросить помощь.'],
    ['Choose the simplest adjustment for next time.','Выберите самое простое изменение на следующий раз.'],
  ],
  [
    ['Notice one repetitive task whose value is uncertain.','Заметьте повторяющееся дело с неясной пользой.'],
    ['Consider one optional task you could reduce safely.','Подумайте, какое необязательное дело можно сократить.'],
    ['Choose one priority for tomorrow.','Выберите один приоритет на завтра.'],
    ['Decide whether one unfinished task can wait.','Решите, может ли одно незавершённое дело подождать.'],
    ['Notice when a short focus block would fit.','Заметьте, когда удобен короткий блок внимания.'],
    ['Check whether your plan leaves room for rest.','Проверьте, есть ли в плане время для отдыха.'],
    ['Choose one useful change from the past month.','Выберите одно полезное изменение за месяц.'],
  ],
  [
    ['Choose a comfortable day for a weekly review.','Выберите удобный день для обзора недели.'],
    ['Choose one realistic result for the coming week.','Выберите один реальный результат на неделю.'],
    ['Consider where you could leave a buffer in your schedule.','Подумайте, где оставить запас времени.'],
    ['Imagine a two-minute version of a difficult step.','Представьте двухминутную версию сложного шага.'],
    ['Try a short uninterrupted focus period if practical.','Попробуйте короткий период внимания без отвлечений.'],
    ['Notice one thing to simplify next week.','Заметьте, что можно упростить на будущей неделе.'],
    ['Choose one habit that feels sustainable.','Выберите привычку, которую реально поддерживать.'],
  ],
  [
    ['Choose who benefits most from your work.','Выберите, кому ваша работа полезнее всего.'],
    ['Notice a problem that person would recognize.','Заметьте проблему, которую человек сам считает важной.'],
    ['Think of one genuine benefit without guaranteeing a result.','Подумайте об одной пользе без обещания результата.'],
    ['Separate real feedback from your own assumption.','Отделите настоящую обратную связь от предположений.'],
    ['Find one sentence in your offer that could be simpler.','Найдите одну фразу в предложении, которую можно упростить.'],
    ['Consider who could give kind, useful feedback.','Подумайте, кто может дать полезную обратную связь.'],
    ['Check if your offer is understandable to a new person.','Проверьте, понятна ли ваша услуга новому человеку.'],
  ],
  [
    ['Think of one useful professional relationship.','Вспомните один полезный профессиональный контакт.'],
    ['Choose a respectful way to reach out, if welcome.','Выберите уместный способ связаться, если это желанно.'],
    ['Think of one genuine question about another person’s needs.','Подумайте об одном искреннем вопросе о потребностях.'],
    ['Notice how to listen without pushing an offer.','Заметьте, как слушать без давления и продажи.'],
    ['Check whether a next step was actually agreed.','Проверьте, был ли следующий шаг действительно согласован.'],
    ['Notice one thing you learned from a conversation.','Заметьте, что вы узнали из разговора.'],
    ['Review which opportunities are real rather than assumed.','Проверьте, какие возможности реальные, а не предполагаемые.'],
  ],
  [
    ['Choose how private you want to keep your financial details.','Выберите комфортный уровень приватности финансов.'],
    ['Choose a period for thinking about work-related resources.','Выберите период для оценки рабочих ресурсов.'],
    ['Notice one source of income or available support.','Заметьте один источник дохода или доступной поддержки.'],
    ['Notice one significant cost or time commitment.','Заметьте одну важную статью расходов или затрат времени.'],
    ['Think about one factor affecting your price or working cost.','Подумайте об одном факторе стоимости вашей работы.'],
    ['Identify one decision that needs actual data.','Найдите решение, для которого нужны реальные данные.'],
    ['Choose one resource decision to revisit later.','Выберите ресурсное решение, к которому стоит вернуться.'],
  ],
  [
    ['Choose one respectful question for a potential client or colleague.','Выберите один уважительный вопрос клиенту или коллеге.'],
    ['Notice what your offer does and does not include.','Заметьте, что входит и не входит в ваше предложение.'],
    ['Think of a calm, clear way to explain a price or resource need.','Подумайте, как спокойно объяснить цену или затраты.'],
    ['Notice what a useful conversation would sound like.','Представьте, как звучит полезный деловой разговор.'],
    ['Distinguish a real agreement from a tentative possibility.','Отделите реальную договорённость от предположения.'],
    ['Choose a follow-up that is welcome and appropriate.','Выберите уместное продолжение разговора.'],
    ['Review what felt clear or uncertain in recent conversations.','Заметьте, что в разговорах было ясно, а что нет.'],
  ],
  [
    ['Notice one task that repeats in your working week.','Заметьте одно повторяющееся дело на неделе.'],
    ['Consider whether a short checklist could help.','Подумайте, поможет ли короткий чек-лист.'],
    ['Choose a small part that could be simplified.','Выберите маленькую часть работы для упрощения.'],
    ['Notice which task needs your personal attention.','Заметьте, где необходимо именно ваше участие.'],
    ['Consider one safe way to reduce switching between tasks.','Подумайте, как безопасно уменьшить переключения.'],
    ['Try a simplified version of a familiar process.','Попробуйте упрощённую версию знакомого процесса.'],
    ['Choose a process improvement worth keeping.','Выберите улучшение процесса, которое стоит сохранить.'],
  ],
  [
    ['Choose one small idea worth testing.','Выберите одну маленькую идею для проверки.'],
    ['Notice what an observable sign of success would be.','Заметьте наблюдаемый признак успешной проверки.'],
    ['Choose an experiment small enough for this week.','Выберите эксперимент по силам на эту неделю.'],
    ['Consider one safe first step with no unwanted outreach.','Подумайте о безопасном первом шаге без навязчивых контактов.'],
    ['Notice a real observation rather than a prediction.','Заметьте реальное наблюдение вместо прогноза.'],
    ['Check whether the experiment taught you something.','Проверьте, чему эксперимент мог научить.'],
    ['Choose whether to repeat, change or stop the experiment.','Решите: повторить, изменить или остановить эксперимент.'],
  ],
  [
    ['Recall the most useful action from this course.','Вспомните самое полезное действие за курс.'],
    ['Notice which result is actually supported by evidence.','Заметьте результат, подтверждённый фактами.'],
    ['Distinguish real change from a hoped-for change.','Отделите реальные изменения от желаемых.'],
    ['Choose a practice worth continuing next quarter.','Выберите практику, которую стоит продолжать.'],
    ['Notice what has not changed yet, without judgement.','Заметьте, что пока не изменилось, без самооценки.'],
    ['Choose one realistic next-quarter priority.','Выберите один реальный приоритет на следующий квартал.'],
    ['Review your goal and choose one next step.','Пересмотрите цель и выберите один следующий шаг.'],
  ],
  [
    ['Notice one useful habit from the last 12 weeks.','Заметьте полезную привычку последних 12 недель.'],
    ['Choose something to keep doing at a comfortable pace.','Выберите, что продолжать в комфортном темпе.'],
    ['Consider one area where more support would be welcome.','Подумайте, где поддержка была бы уместна.'],
    ['Choose one thing to stop doing without regret.','Выберите, от чего можно спокойно отказаться.'],
    ['Notice one strength you have actually demonstrated.','Заметьте сильную сторону, проявленную в деле.'],
    ['Choose your next small step — or a well-earned pause.','Выберите маленький следующий шаг или заслуженную паузу.'],
  ],
]
export const BUSINESS_ONE_TAP_DAYS = Object.freeze(weeks.flat().map(([en,ru],index)=>
  Object.freeze({day:index+1,en,ru})))
export function businessTinyAction(day,lang='en'){
  return BUSINESS_ONE_TAP_DAYS[day-1]?.[lang]||null
}
export const BUSINESS_WEEK_REVIEW_CHOICES = Object.freeze([
  {id:'clearer',en:'The direction feels clearer',ru:'Направление стало понятнее'},
  {id:'tried',en:'I tried at least one small step',ru:'Я попробовал(а) хотя бы один маленький шаг'},
  {id:'simpler',en:'I need a simpler pace',ru:'Мне нужен более простой темп'},
  {id:'not-sure',en:'I am not sure yet',ru:'Пока не могу оценить'},
])
const REVIEW_TAG=/\s*\[\[hh-week-review:([a-z-]+)\]\]\s*$/
export function businessWeekReviewChoice(note=''){
  const id=String(note).match(REVIEW_TAG)?.[1]
  return BUSINESS_WEEK_REVIEW_CHOICES.some(row=>row.id===id)?id:''
}
export function businessWeekReviewNote(oldNote,id){
  if(!BUSINESS_WEEK_REVIEW_CHOICES.some(row=>row.id===id))return oldNote
  const previous=String(oldNote||'').replace(REVIEW_TAG,'').trim()
  return (previous?previous+'\n':'')+'[[hh-week-review:'+id+']]'
}
export function businessWeekReviewLabel(note,lang='en'){
  const option=BUSINESS_WEEK_REVIEW_CHOICES.find(row=>row.id===businessWeekReviewChoice(note))
  const legacy=String(note||'').replace(REVIEW_TAG,'').trim()
  return [legacy,option?.[lang]].filter(Boolean).join(' · ')
}
