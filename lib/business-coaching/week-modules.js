// Business & Career — weekly learning outcomes. Additive curriculum v2:
// existing day numbers, original exercise wording and stored legacy completions survive.
// Daily proof is a CLIENT-AUTHORED result, not verified employment/income performance.
import { BUSINESS_WEEKS, businessDay } from './program.js'

export const BUSINESS_WEEKLY_CONTENT_VERSION = 'weekly-results-v2'

// For each module: outcome RU/EN; capstone artifact RU/EN; 7 concrete daily
// outputs and plain acceptance criteria. Week 13 is a six-day integration module.
// Avoid compulsory financial disclosure, exposure of third parties or fabricated results.
const rows = [
  {
    outcome:['Карта исходной ситуации: 3 факта, работающие ресурсы, ограничения и первый показатель для наблюдения.',
      'Starting-point map with three facts, usable resources, constraints and one indicator to observe.'],
    capstone:['Карта «Точка А»','My Point A baseline map'],
    days:[
      ['Три факта о текущем положении','Three dated starting facts','Укажи минимум 3 проверяемых наблюдения, без оценки личности.','Record at least three observable facts, not a judgement about yourself.'],
      ['Список работы, приносящей ценность','List of value-producing activities','Назови две конкретные деятельности и кому от них польза.','Name two specific activities and who benefits from them.'],
      ['Карта времени за прошлую неделю','Last-week time map','Назови 3 категории времени с приблизительными часами или отметкой «не знаю».','Record three time categories with approximate hours or explicitly mark unknown.'],
      ['Исходный показатель и период','One baseline metric and period','Выбери показатель, единицу измерения и период; неизвестное не подменяй нулём.','Choose a metric, unit and reference period; do not turn missing data into zero.'],
      ['Карточка обратной связи','Feedback record','Запиши один реальный ответ или кому и какой вопрос направил(а).','Record actual feedback or who you asked and what question you used.'],
      ['Ресурсы и ограничения','Resources and constraints table','Укажи два ресурса, два ограничения и что можно сделать с одним из них.','List two resources, two constraints and one manageable response.'],
      ['Итоговая карта Точки А','Completed Point A snapshot','Собери главные факты, показатель, ресурсы и следующую гипотезу в одном обзоре.','Combine baseline facts, indicator, resources and a next hypothesis in one summary.'],
    ],
  },
  {
    outcome:['Одна главная цель на 90 дней, два вспомогательных ориентира и первая контрольная точка.',
      'One chosen 90-day outcome, two supporting aims and the first milestone.'],
    capstone:['Карточка цели на 90 дней','90-day goal card'],
    days:[
      ['Черновик желаемого изменения','Draft of the desired change','Опиши, что конкретно станет иначе к концу курса.','Write what would be observably different at the end of the course.'],
      ['Одна приоритетная цель','Single priority goal','Сформулируй одну цель в действии или результате, а не списком пожеланий.','Write one action- or outcome-based objective, not a wish list.'],
      ['Признак достижения цели','Observable success indicator','Укажи единицу, источник и период проверки или отметь качественный результат.','Specify a unit, source and period, or an observable qualitative result.'],
      ['Два поддерживающих ориентира','Two supporting milestones','Запиши не более двух вспомогательных целей и цену компромисса.','Name up to two supporting aims and an acceptable trade-off.'],
      ['Карта зоны влияния','Influence map','Раздели хотя бы два действия под контролем и факторы вне контроля.','Separate at least two controllable actions from outside factors.'],
      ['Первый измеримый шаг','First measurable small step','Запиши действие, срок и критерий выполнения.','Record a next action, date and completion criterion.'],
      ['Готовая карточка Точки Б','Final Point B goal card','Собери главную цель, показатель, две опоры и первый шаг.','Combine primary goal, indicator, two supports and first step.'],
    ],
  },
  {
    outcome:['Карта ключевого препятствия с небольшим испытанным экспериментом и следующим действием.',
      'A bottleneck map with one tested small experiment and a next step.'],
    capstone:['Карта препятствия и эксперимента','Obstacle-to-experiment map'],
    days:[
      ['Одна конкретная отложенная задача','One postponed task','Назови задачу и когда в последний раз пытался(лась) начать.','Name the task and the last time you tried to start it.'],
      ['Причина задержки и подтверждение','Bottleneck hypothesis with evidence','Опиши один возможный барьер и наблюдение, которое его подтверждает.','Write one possible obstacle and an observable supporting clue.'],
      ['План из трёх малых шагов','Three-step task breakdown','Разбей исходную задачу на три доступных действия.','Split the task into three manageable actions.'],
      ['Результат двухминутного начала','Two-minute start result','Запиши, какое начало удалось или что помешало — обе записи считаются наблюдением.','Record what began or what prevented it; both are valid observations.'],
      ['Факт проверки гипотезы','Evidence from one obstacle test','Опиши попытку, её результат и что теперь понятно.','Describe the attempt, actual result and what became clearer.'],
      ['Запрос помощи или уточнения','Support or clarification request','Сформулируй отправленный запрос либо готовый черновик для подходящего человека.','Record an actual respectful request or a draft for a suitable person.'],
      ['Рабочая карта препятствия','Final bottleneck action map','Собери препятствие, проверку, результат и корректировку следующего шага.','Summarize obstacle, test, observation and revised next step.'],
    ],
  },
  {
    outcome:['Список того, что прекращаем делать, плюс защищённый блок времени и оценка первой попытки.',
      'A stop-doing list, one protected focus block and evidence from a first attempt.'],
    capstone:['Недельный план освобождения времени','Weekly time-recovery plan'],
    days:[
      ['Три занятия с неясной отдачей','Three low-value activities','Запиши 3 регулярных дела и почему их польза неочевидна.','List three recurring activities whose benefit is uncertain.'],
      ['Одно добровольное «стоп»','One optional stop decision','Назови дело, которое можно безопасно убрать или сократить.','Identify a task you can safely stop or reduce.'],
      ['Завтрашний главный приоритет','Tomorrow’s top priority','Запиши одну задачу и признак её завершения.','Choose one priority with a specific done criterion.'],
      ['Решение по незавершённому делу','Decision about an open task','Укажи: завершено, перенесено с датой либо отменено.','Mark it completed, rescheduled with a date or deliberately cancelled.'],
      ['Защищённый фокус-блок','Protected focus-block entry','Назови день, длительность и задачу для одного реалистичного блока.','Record day, duration and task for a workable focus block.'],
      ['Проверка нагрузки и отдыха','Capacity-and-rest check','Укажи, что стало легче, а что требует отдыха или изменения темпа.','Record what became easier and what needs rest or less pressure.'],
      ['Итог первого месяца','Month-one evidence review','Запиши 2 наблюдаемых изменения, 1 сохранённый приоритет и 1 нерешённый вопрос.','Record two observations, one retained priority and one open question.'],
    ],
  },
  {
    outcome:['Гибкий недельный рабочий ритм: 3 приоритета, календарные блоки и правило восстановления.',
      'A sustainable weekly system: three priorities, scheduled blocks and a restart rule.'],
    capstone:['Мой рабочий недельный ритм','My sustainable weekly rhythm'],
    days:[
      ['День и время обзора недели','Weekly review appointment','Определи день, время и продолжительность обзора.','Choose a day, time and duration for weekly review.'],
      ['Три результата на неделю','Three weekly outcomes','Запиши три достижимых результата, не три общих намерения.','Write three achievable deliverables rather than vague intentions.'],
      ['Календарь с буферами','Buffered weekly calendar','Зафиксируй минимум два блока времени и резерв для непредвиденного.','Schedule at least two work blocks and contingency time.'],
      ['Двухминутный запасной шаг','Two-minute fallback plan','Запиши короткую версию наиболее трудной задачи.','Write a two-minute alternative for the hardest task.'],
      ['Один выполненный блок внимания','One focus-block observation','Отметь фактическую длительность и выполненный фрагмент или помеху.','Record actual duration and completed segment or interruption.'],
      ['Корректировка плана без самообвинения','Revised weekly plan','Назови то, что не сработало, и одно конкретное изменение.','Name what did not work and one concrete adjustment.'],
      ['Чек-лист устойчивой недели','Sustainable-week checklist','Собери три опоры режима и правило возвращения после пропуска.','Summarize three rhythm anchors and a restart rule.'],
    ],
  },
  {
    outcome:['Одностраничное предложение ценности: кому, какую пользу и в каком формате приносит работа.',
      'A one-page value proposition identifying audience, benefit and delivery format.'],
    capstone:['Одностраничное описание предложения','One-page value proposition'],
    days:[
      ['Портрет одного получателя пользы','One audience profile','Опиши конкретную ситуацию и задачу клиента или коллеги без личных данных.','Describe one audience situation and need without third-party personal data.'],
      ['Сформулированная потребность','A real-world need statement','Запиши проблему словами пользователя или отметь, что это пока гипотеза.','State the need in the person’s words or label it an unverified hypothesis.'],
      ['Предлагаемый результат','Plain-language outcome statement','Объясни пользу одной фразой без гарантии результата.','Describe the potential benefit in one sentence without a guarantee.'],
      ['Факты обратной связи','Offer feedback notes','Запиши один полученный отзыв либо 2 вопроса для его будущей проверки.','Record feedback received or two questions for future validation.'],
      ['Описание услуги в двух фразах','Two-sentence offer','Напиши кому предлагаешь помощь и что именно входит.','In two sentences say who it is for and what is included.'],
      ['Список непонятных формулировок','Clarity feedback list','Отметь 1–2 уточнения от человека или вопросы для проверки.','Record one or two clarifications or questions to test with someone.'],
      ['Финальная версия ценностного предложения','Final one-page offer','Собери аудиторию, потребность, формат, пользу и ограничения.','Combine audience, need, format, benefit and limitations.'],
    ],
  },
  {
    outcome:['Этичная карта профессиональных контактов и согласованных следующих шагов.',
      'A consent-respecting opportunity map and agreed next steps.'],
    capstone:['Карта профессиональных возможностей','Professional opportunity map'],
    days:[
      ['Три типа полезных отношений','Three types of useful relationships','Назови три роли или типа контактов без приватных чужих данных.','Name three relationship roles without storing private third-party details.'],
      ['Один уместный канал контакта','One appropriate contact channel','Запиши контекст, канал и почему обращение уместно.','Record context, channel and why contact would be welcome.'],
      ['Три открытых вопроса','Three discovery questions','Подготовь вопросы без давления или скрытого продающего сценария.','Draft three curiosity-led questions without manipulative pressure.'],
      ['Фактический разговор или готовый сценарий','Conversation or prepared script','Запиши реальную тему беседы либо черновик без выдуманной отправки.','Describe an actual conversation or a draft without claiming outreach happened.'],
      ['Согласованный следующий шаг','Agreed next step or none','Отметь согласованное действие и дату или прямо напиши «пока нет».','Record genuinely agreed action and date or explicitly state none yet.'],
      ['Три вывода о потребностях собеседника','Three needs insights','Запиши три наблюдения или гипотезы без личных деталей собеседника.','Note three observations or hypotheses without sensitive personal details.'],
      ['Сводка возможностей и план продолжения','Opportunity map and follow-up plan','Собери каналы, договорённости и одно уместное продолжение.','Summarize channels, agreements and one appropriate follow-up.'],
    ],
  },
  {
    outcome:['Приватная финансово-ресурсная карта: период, известные затраты и решение на основе фактов.',
      'A private money-and-resources map with time period, known costs and one evidence-based decision.'],
    capstone:['Моя финансовая и ресурсная карта','My money-and-resources snapshot'],
    days:[
      ['Выбранный безопасный уровень учёта','Chosen financial tracking scope','Отметь «категории», «суммы» или «не указываю цифры» — любой вариант допустим.','Choose categories, figures or no numbers; all options are valid.'],
      ['Период и единицы финансового учёта','Money-tracking reference period','Укажи период, валюту (если нужна) и что именно измеряешь.','State timeframe, currency if relevant and exactly what is measured.'],
      ['Перечень источников ресурсов','Resource or income-source list','Назови доступные источники без раскрытия сумм, если не хочешь.','List relevant resources without disclosing amounts if you prefer.'],
      ['Карта трёх расходов или затрат времени','Three cost/time categories','Запиши три категории и отметь неизвестные значения как неизвестные.','Record three categories, keeping missing values explicitly unknown.'],
      ['Разбор цены или себестоимости','One price or work-cost review','Зафиксируй факторы стоимости или времени, не придумывая итоговых сумм.','Document cost or time factors without inventing totals.'],
      ['Решение, требующее данных','One evidence-dependent decision','Назови решение, нужные данные и как их безопасно получить.','Name a decision, missing evidence and how to gather it safely.'],
      ['Итог второго месяца','Month-two resources review','Запиши 2 факта, одно ограничение и следующий финансовый/ресурсный шаг.','Summarize two facts, one constraint and the next resource-related action.'],
    ],
  },
  {
    outcome:['Этичный сценарий делового разговора, прозрачного предложения и следующего шага.',
      'An ethical conversation, transparent offer and follow-up script.'],
    capstone:['План делового разговора','Ethical business conversation plan'],
    days:[
      ['Три вопроса о потребностях','Three needs-assessment questions','Запиши три открытых вопроса до обсуждения услуги или вакансии.','Write three open questions before pitching an offer or role.'],
      ['Границы моего предложения','Offer boundaries','Укажи три элемента, которые входят, и один, который не входит.','List three inclusions and at least one honest exclusion.'],
      ['Прозрачное описание условий','Transparent terms summary','Подготовь краткие слова о цене, сроках или ресурсах без скрытых условий.','Draft transparent wording about price, timeline or resource terms.'],
      ['Уважительный ответ на сомнение','Non-pressuring response','Запиши ответ, допускающий паузу и право собеседника отказаться.','Draft a response that respects hesitation and the right to decline.'],
      ['Один уместный следующий шаг','One ethical next-step proposal','Опиши реальную отправку либо неотправленный черновик, не преувеличивая факт.','Log a real invitation or clearly label an unsent draft.'],
      ['Один урок из беседы или тренировки','One conversation lesson','Запиши, что было понятно и что стоит изменить после разговора или репетиции.','Record what became clearer after a meeting or rehearsal.'],
      ['Чек-лист этичных переговоров','Ethical conversation checklist','Собери вопросы, границы предложения и правило follow-up.','Combine questions, offer boundaries and a follow-up rule.'],
    ],
  },
  {
    outcome:['Один повторяемый рабочий процесс с чек-листом и проверкой первой итерации.',
      'One repeatable workflow documented as a checklist and tested once.'],
    capstone:['Рабочий шаблон или чек-лист','Reusable workflow checklist'],
    days:[
      ['Выбранный повторяющийся процесс','One recurring workflow','Назови процесс, частоту и зачем его улучшать.','Name one repeatable process, frequency and reason to improve it.'],
      ['Карта фактических шагов','Current workflow map','Перечисли 4–6 реальных последовательных шагов.','List four to six actual sequential steps.'],
      ['Точка потери времени','Observed time-loss point','Запиши место задержки и приблизительную цену времени или ошибку.','Identify a bottleneck and approximate time cost or error.'],
      ['Черновик рабочего чек-листа','Draft practical checklist','Составь 4–6 коротких проверяемых пунктов.','Make a checklist with four to six observable items.'],
      ['Пробное применение шаблона','One real checklist trial','Отметь, что проверено на практике, и что ещё осталось гипотезой.','Record what was actually tested and what remains hypothetical.'],
      ['Сравнение одной рабочей метрики','One simple process comparison','Укажи время, ошибки или качество до/после — либо отсутствие измерения.','Record time, errors or quality before/after, or state not measured.'],
      ['Финальная версия рабочего процесса','Final repeatable process','Сохрани порядок шагов, критерий готовности и один вывод проверки.','Document steps, definition of done and one observation from testing.'],
    ],
  },
  {
    outcome:['Один небольшой эксперимент роста с заранее заданной метрикой, журналом и выводом.',
      'A small growth experiment with a preselected measure, observation log and decision.'],
    capstone:['Карточка эксперимента и его итог','Growth experiment log and conclusion'],
    days:[
      ['Одна проверяемая идея','One testable growth idea','Сформулируй одно предполагаемое изменение без обещания результата.','State one proposed change without promising an outcome.'],
      ['Гипотеза в формате «если — то»','If–then hypothesis','Запиши действие, ожидаемый сигнал и что опровергнет предположение.','Write action, expected signal and evidence that would challenge it.'],
      ['Показатель и срок эксперимента','Experiment metric and timeframe','Определи период, источник и измерение до начала проверки.','Choose period, source and measure before testing.'],
      ['Дневник первого действия','First experiment action record','Запиши фактически выполненный шаг или честно укажи препятствие.','Record what actually happened or describe the obstacle.'],
      ['Полученная обратная связь или данные','Observed feedback or data','Отметь факт, дату и источник без чужих персональных данных.','Record evidence, date and source without private third-party details.'],
      ['Сопоставление с гипотезой','Hypothesis-versus-observation review','Укажи совпадения, расхождения и неизвестные данные.','Name matches, mismatches and missing evidence.'],
      ['Решение о следующем цикле','Continue/change/stop decision','Выбери продолжить, изменить или остановить и объясни почему.','Choose continue, revise or stop and record the reason.'],
    ],
  },
  {
    outcome:['Итоговый обзор по бизнес-результатам, действиям и добровольной самооценке, плюс план на новый квартал.',
      'Evidence-based quarter review separating outcomes, activity and optional self-reflection, plus the next-quarter direction.'],
    capstone:['Отчёт за 12 недель и план дальше','12-week review and next plan'],
    days:[
      ['Сравнение с исходной целью','Goal-to-reality comparison','Перечисли исходную цель и два наблюдения, не ставя оценку личности.','Restate the initial goal and two observations without self-judgment.'],
      ['Сопоставимые бизнес-показатели','Comparable business measures','Укажи периоды и единицы, а при отсутствии данных прямо отметь пропуск.','Record matching periods and units, explicitly marking missing evidence.'],
      ['Фактически освоенные действия','Skills practised in reality','Назови три действия, которые действительно были опробованы.','Name three actions you actually tried.'],
      ['Карта поддерживающих и мешающих условий','Helpful/hard conditions map','Назови по два условия, которые поддерживали или затрудняли выполнение.','List two enabling and two limiting conditions.'],
      ['Решение о повторной самооценке','Optional retest decision','Отметь «повторил(а)», «позже» или «не хочу», не подставляя баллы.','Choose retaken, later or not now, without inventing scores.'],
      ['Одна привычка на следующий квартал','Next-quarter habit commitment','Запиши привычку, частоту и первое напоминание без самонаказания.','Choose one habit, feasible frequency and a gentle reminder.'],
      ['Итоговый 12-недельный отчёт','12-week evidence summary','Объедини цель, факты, выполненные шаги, пробелы и план на 30 дней.','Combine goal, evidence, actions, gaps and a 30-day next plan.'],
    ],
  },
  {
    outcome:['Спокойная интеграция результатов и добровольное решение о следующем этапе.',
      'Gentle integration of results and a voluntary next-step decision.'],
    capstone:['Пакет финальных записей и план продолжения','Final reflections and continuation plan'],
    days:[
      ['Список сохранённых полезных практик','What I want to keep','Назови две практики, которые реально подходят и не истощают.','Identify two practices you can sustain without overloading yourself.'],
      ['Два наблюдения из первого месяца','Two month-one observations','Запиши два факта из своих записей, не додумывая данные.','Record two actual month-one observations without filling missing gaps.'],
      ['Одна устойчивая опора из второго месяца','Month-two working habit','Назови один рабочий ритм и где нужна корректировка.','Name one useful rhythm and an adjustment you still need.'],
      ['Три итога третьего месяца','Three month-three observations','Раздели достигнутое, неизвестное и задачу для дальнейшей проверки.','Separate achieved results, unknowns and evidence still needed.'],
      ['Карта дальнейшей поддержки','Next-support map','Запиши одну доступную помощь и один ресурс без обязательств покупать услуги.','Identify one optional support and one available resource without purchase pressure.'],
      ['Итоговая карточка решения','Close-or-continue decision card','Зафиксируй: завершить, продолжить своими силами или выбрать новую цель.','Choose finish, continue independently or select a new voluntary goal.'],
    ],
  },
]

export const BUSINESS_WEEK_MODULES = Object.freeze(rows.map((row,index)=>{
  const prior=BUSINESS_WEEKS[index]
  const count=index===12?6:7
  if(row.days.length!==count)throw new Error('BUSINESS_MODULE_DAYS_MISMATCH')
  return Object.freeze({
    week:index+1,id:'business-week-'+(index+1),
    title:Object.freeze(prior?.title||{ru:'Закрепление и итоги',en:'Integration and review'}),
    introduction:Object.freeze(prior?.introduction||{ru:'Спокойное завершение курса.',en:'A gentle close to the course.'}),
    outcome:Object.freeze({ru:row.outcome[0],en:row.outcome[1]}),
    capstone:Object.freeze({ru:row.capstone[0],en:row.capstone[1]}),
    days:Object.freeze(row.days.map(([ru,en,criterionRu,criterionEn],i)=>{
      const day=index*7+i+1
      return Object.freeze({
        day,id:'business-day-'+day,
        result:Object.freeze({ru,en}),
        criterion:Object.freeze({ru:criterionRu,en:criterionEn}),
      })
    })),
  })
}))

export function businessWeekModule(week,locale='en'){
  if(!Number.isInteger(week)||week<1||week>13)return null
  const m=BUSINESS_WEEK_MODULES[week-1],lang=locale==='ru'?'ru':'en'
  return {id:m.id,week:m.week,title:m.title[lang],intro:m.introduction[lang],
    outcome:m.outcome[lang],capstone:m.capstone[lang],days:m.days.map(d=>businessDayResult(d.day,lang))}
}
export function businessDayResult(day,locale='en'){
  const original=businessDay(day,locale)
  if(!original)return null
  const lang=locale==='ru'?'ru':'en'
  const module=BUSINESS_WEEK_MODULES[original.week-1]
  const output=module.days.find(d=>d.day===day)
  if(!output)return null
  return {...original,moduleId:module.id,
    moduleTitle:module.title[lang],weeklyOutcome:module.outcome[lang],
    weeklyCapstone:module.capstone[lang],
    resultLabel:output.result[lang],doneWhen:output.criterion[lang],
    contentVersion:BUSINESS_WEEKLY_CONTENT_VERSION}
}
export function businessWeekProgress(course,week){
  const m=BUSINESS_WEEK_MODULES[week-1]
  if(!m)return null
  const records=m.days.map(d=>course?.days?.[d.day])
  return {
    week,complete:records.filter(d=>d?.done===true).length,
    documented:records.filter(d=>d?.done===true && typeof d.result==='string' && d.result.trim().length>=6).length,
    drafts:records.filter(d=>d?.done!==true && typeof d?.result==='string' && d.result.trim()).length,
    total:m.days.length,
  }
}
