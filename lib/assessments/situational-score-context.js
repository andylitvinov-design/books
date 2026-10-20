// Context cues for self-reflection scores, never clinical norms.
// Labels and prompts describe what each immutable HH questionnaire actually asks.
// This file does not change scoring, reverse responses, or infer causes.

const ROWS = [
  ['state.problem_intensity', 'Когда основная трудность сильнее и в каких обстоятельствах она ослабевает?', 'When does the main difficulty intensify, and when does it ease?'],
  ['state.resource', 'Что прямо сегодня добавляет сил или ощущения внутренней опоры?', 'What gives you more energy or inner support today?'],
  ['state.tension', 'В каких ситуациях нарастает напряжение и что помогает вернуть комфорт?', 'When does tension rise, and what helps you feel more comfortable?'],
  ['state.fatigue', 'Как меняется усталость после сна, нагрузки и доступного отдыха?', 'How does tiredness change with sleep, effort and rest?'],
  ['state.life_impact', 'Какое конкретное повседневное дело стало труднее и что могло бы его облегчить?', 'Which everyday task is harder, and what could make it easier?'],
  ['weekly.mood', 'Какие события недели поддерживали настроение, а какие ухудшали его?', 'Which events during the week helped or lowered your mood?'],
  ['weekly.tension', 'В какие дни тревога ощущалась сильнее и что помогало снизить напряжение?', 'On which days did tension feel stronger, and what helped?'],
  ['weekly.load', 'Какую нагрузку недели можно уменьшить, перенести или разделить?', 'Which demand from the week could be reduced, delayed or shared?'],
  ['weekly.recovery', 'После какого отдыха вы чувствовали больше восстановления на следующий день?', 'After which kind of rest did you feel more restored the next day?'],
  ['weekly.energy', 'В какой части дня сил обычно хватало больше и когда нужен перерыв?', 'When during the day was energy more available, and when was a pause useful?'],
  ['weekly.clarity', 'При каких условиях получалось яснее думать и удерживать внимание?', 'Under what conditions was thinking clearer and focus easier?'],
  ['weekly.connection', 'Где и с кем контакт ощущался поддерживающим, добровольным и комфортным?', 'Where and with whom did contact feel supportive, voluntary and comfortable?'],
  ['weekly.functioning', 'Какое небольшое дело получалось и что мешало другим делам?', 'Which small task was manageable, and what hindered other tasks?'],
  ['resource.energy', 'На какое небольшое дело хватает сил сейчас и где стоит оставить запас?', 'Which small activity feels manageable now, and where is a buffer needed?'],
  ['resource.self_support', 'Какие слова самоподдержки доступны в трудной ситуации?', 'Which kind words to yourself feel possible during a difficult moment?'],
  ['resource.support', 'Кто или что доступно, если потребуется практическая или эмоциональная помощь?', 'Who or what is accessible if practical or emotional support is needed?'],
  ['resource.connection', 'Какая форма общения сейчас действительно желанна и безопасна?', 'What form of connection genuinely feels welcome and safe right now?'],
  ['resource.agency', 'Какая часть следующего шага остаётся в зоне вашего влияния?', 'Which part of your next step remains within your control?'],
  ['resource.meaning', 'Какая ценность важна сейчас и какой небольшой выбор ей соответствует?', 'What matters to you now, and what small choice supports that value?'],
  ['resources.overall', 'Какие отдельные ресурсы доступны и что скрывается за их средним баллом?', 'Which specific resources are available, and what does their average conceal?'],
  ['resources.monthly.self', 'В каких ситуациях за месяц было легче поддерживать себя?', 'In which situations this month was self-support easier?'],
  ['resources.monthly.relationships', 'Где в отношениях хватало поддержки и где были важны границы?', 'Where were relationships supportive, and where did boundaries matter?'],
  ['resources.monthly.body', 'Что помогало телу восстанавливаться и какие физические жалобы стоит обсудить с врачом?', 'What supported recovery, and which physical concerns warrant medical advice?'],
  ['resources.monthly.work', 'Какие рабочие задачи удавалось делать в посильном темпе?', 'Which work tasks were manageable at a realistic pace?'],
  ['resources.monthly.meaning', 'Какие дела месяца были согласованы с важными ценностями?', 'Which activities this month reflected your priorities and values?'],
  ['resources.monthly.support', 'К какому человеку или ресурсу можно обратиться за конкретной помощью?', 'Who or what could provide concrete support if requested?'],
  ['resources.monthly.overall', 'Какие сферы месяца отличаются: среднее не показывает сильные и слабые стороны отдельно.', 'Which life areas differ? The average does not show strengths and difficulties separately.'],
  ['state.money_pressure.difficulty', 'Когда финансовые мысли занимают слишком много внимания и что в ситуации известно точно?', 'When do financial worries take over attention, and which facts are actually known?'],
  ['resources.money_pressure.coping', 'Удаётся ли отделить финансовые факты от предположений и наметить один посильный шаг?', 'Can financial facts be separated from fears and one manageable action chosen?'],
  ['state.overthinking_loop.difficulty', 'Какие ситуации запускают повторяющиеся мысли и как они влияют на дела?', 'What triggers repetitive thoughts, and how do they affect daily tasks?'],
  ['resources.overthinking_loop.interruptibility', 'Какая безопасная пауза или переключение помогает прервать круг размышлений?', 'Which comfortable pause or shift helps interrupt repetitive thinking?'],
  ['state.screen_saturation.difficulty', 'Когда экраны усиливают перегрузку или мешают отдыху?', 'When do screens contribute to overload or interfere with rest?'],
  ['context.screen_saturation.offline_relief', 'Что меняется в самочувствии после добровольного времени без экрана?', 'What changes after choosing some time away from screens?'],
  ['hh-social-battery', 'Как менять продолжительность общения и время для восстановления под свои возможности?', 'How can you adjust social time and recovery to your actual energy?'],
  ['hh-focus-mode', 'Какую небольшую задачу удаётся начать и какое отвлечение мешает?', 'Which small task can you start, and which distraction gets in the way?'],
  ['hh-stress-weather', 'Как текущие требования отражаются на напряжении и посильности дня?', 'How do current demands affect tension and the manageability of the day?'],
  ['hh-recharge-decoder', 'Какая конкретная активность помогает восстановиться, а какая лишь занимает время?', 'Which activity actually restores you, and which just takes time?'],
  ['hh-boundary-radar', 'В каком безопасном контакте легче сказать «да», «нет» или «пауза»?', 'In which safe interaction is it easier to say yes, no or pause?'],
  ['hh-tiny-joys', 'Какие небольшие приятные моменты замечаются даже в непростой день?', 'Which small enjoyable moments are noticeable even on a hard day?'],
  ['hh-sleep-reset', 'Какие вечерние условия помогают легче уснуть и почувствовать отдых?', 'Which evening conditions make falling asleep and feeling rested easier?'],
  ['hh-morning-battery', 'Какие утренние действия сохраняют силы, а какие расходуют их сразу?', 'Which morning choices preserve energy, and which drain it early?'],
  ['hh-evening-landing', 'Что помогает закончить день и перестать решать задачи перед сном?', 'What helps you finish the day and stop solving tasks before sleep?'],
  ['hh-decision-fog', 'В каких решениях возникает застой и можно ли выбрать один небольшой шаг?', 'Which decisions feel stuck, and can you choose one small next step?'],
  ['hh-start-button', 'Какой первый шаг настолько мал, что его реально начать сейчас?', 'What first step is small enough to begin right now?'],
  ['hh-screen-saturation', 'Что связано с усталостью от экранов, а что помогает после паузы?', 'What is linked to screen fatigue, and what helps after a break?'],
  ['hh-inner-critic', 'В каких ситуациях внутренние оценки становятся особенно жёсткими?', 'When does your inner commentary become especially harsh?'],
  ['hh-inner-ally', 'Как можно поддержать себя после ошибки без отрицания сложности?', 'How can you support yourself after a mistake without denying difficulty?'],
  ['hh-meaning-compass', 'Какой небольшой выбор соответствует вашему текущему направлению?', 'Which small choice fits the direction that matters to you?'],
  ['hh-motivation-spark', 'Что даёт интерес к делу и помогает перейти от намерения к действию?', 'What sparks interest and helps turn an intention into action?'],
  ['hh-change-readiness', 'Что хочется изменить и какой минимальный шаг можно попробовать без давления?', 'What would you like to change, and what tiny step could you try without pressure?'],
  ['hh-workload-weather', 'Какая нагрузка сейчас посильна и где нужны более реалистичные ожидания?', 'What workload is manageable and where are more realistic expectations needed?'],
  ['hh-body-signals', 'Какие телесные сигналы удаётся замечать без поспешных выводов о причинах?', 'Which bodily signals can you notice without jumping to conclusions about causes?'],
  ['hh-rest-permission', 'Можно ли позволить себе короткий отдых до полного истощения?', 'Can you permit a short rest before becoming exhausted?'],
  ['hh-closeness-compass', 'Какой темп близости и личного пространства подходит именно вам?', 'Which pace of closeness and personal space genuinely suits you?'],
  ['hh-confidence-pulse', 'Когда удаётся опираться на собственное решение без обязательного одобрения?', 'When can you trust your choice without requiring universal approval?'],
  ['hh-playfulness-pulse', 'Что вызывает любопытство и удовольствие без требования продуктивности?', 'What brings curiosity or enjoyment without a productivity goal?'],
  ['hh-daily-rhythm', 'Какой небольшой ритуал поддерживает устойчивость дня?', 'Which small routine helps the day feel more manageable?'],
  ['hh-money-pressure', 'Можно ли различить напряжение из-за денег и доступные способы справляться с ним?', 'Can you distinguish money-related strain from the coping options available?'],
  ['hh-overthinking-loop', 'Где повторяющиеся мысли мешают и что помогает прерваться?', 'Where do repetitive thoughts get in the way, and what helps interrupt them?'],
  ['hh-felt-safety', 'Когда тело чувствует больше комфорта и как сохранять возможность сказать «нет»?', 'When does your body feel more comfortable, and how can you keep the right to say no?'],
  ['hh-emotion-clarity', 'Как назвать чувство и заметить ситуацию, с которой оно связано?', 'How can you name a feeling and notice the situation around it?'],
  ['hh-loss-adjustment', 'Где находится место для переживаний потери и безопасной поддержки?', 'Where is there space for grief and safe support?'],
  ['hh-belonging', 'В каком контакте можно оставаться собой без необходимости заслуживать принятие?', 'Where can you stay authentic without needing to earn acceptance?'],
  ['hh-conflict-repair', 'Какая пауза позволяет решить, нужен ли разговор после конфликта?', 'Which pause helps you decide whether a conversation after conflict is useful?'],
  ['hh-family-roles', 'Какие ожидания в семье можно принять, а где важен собственный выбор?', 'Which family expectations fit, and where is personal choice important?'],
  ['hh-inner-imagery', 'Как использовать воображение добровольно и остановиться, если некомфортно?', 'How can imagination be used by choice and stopped when uncomfortable?'],
  ['hh-values-direction', 'Какая реальная задача выражает личную ценность?', 'Which real action expresses a personal value?'],
  ['hh-life-transition', 'Что остаётся опорой во время перемен и где можно замедлиться?', 'What stays supportive during change, and where can you slow down?'],
  ['hh-speaking-up', 'Как можно выразить просьбу или несогласие безопасно и уважительно?', 'How can a request or disagreement be expressed safely and respectfully?'],
  ['hh-sustainable-pace', 'Как соотнести список дел с доступными силами сегодня?', 'How can the task list fit the energy available today?'],
  ['hh-support-seeking', 'Как сформулировать маленькую конкретную просьбу о помощи?', 'How could you make one small, specific request for support?'],
  ['hh-sensory-comfort', 'Какие изменения звука, света или пространства повышают комфорт?', 'Which changes to light, sound or space improve comfort?'],
  ['hh-goal-obstacles', 'Как отделить препятствие от цели и выбрать шаг, который возможен?', 'How can you separate an obstacle from the goal and choose a workable action?'],
  ['hh-body-mind-context', 'Как различить ощущения тела, обстоятельства и тревогу, не предполагая причину?', 'How can you separate body sensations, context and worry without presuming a cause?'],
  ['hh-energy-drains', 'На что уходят силы и что из нагрузки можно уменьшить?', 'What uses your energy, and which demand could be reduced?'],
  ['hh-social-ease', 'В каком формате общения легче оставаться в удобном темпе?', 'Which kind of social contact is easier at your own pace?'],
  ['hh-solitude-choice', 'Чем восстанавливающее уединение отличается от нежелательной изоляции?', 'What distinguishes restorative solitude from unwanted isolation?'],
  ['hh-relationship-balance', 'Когда обмен поддержкой в отношениях ощущается взаимным?', 'When does giving and receiving support feel reciprocal?'],
  ['hh-approval-pressure', 'Где можно сделать безопасный выбор без обязательного одобрения?', 'Where can you safely choose without seeking approval?'],
  ['hh-perfectionism-pressure', 'Как заранее определить «достаточно хорошо» для одного дела?', 'How could you define good enough before starting a task?'],
  ['hh-uncertainty-flexibility', 'Что точно известно в неопределённой ситуации и какой следующий шаг доступен?', 'What is known in an uncertain situation, and which next step is possible?'],
  ['hh-role-freedom', 'Какая привычная роль полезна, а где хочется действовать по-другому?', 'Which familiar role helps, and where would you prefer another choice?'],
  ['hh-work-boundaries', 'Какую реалистичную границу нагрузки можно спокойно обсудить?', 'Which realistic workload boundary could you communicate?'],
]

export const SITUATION_OBSERVATION = Object.freeze(Object.fromEntries(
  ROWS.map(([key, ru, en]) => [key, Object.freeze({ru, en})]),
))
export const SITUATION_OBSERVATION_KEYS = Object.freeze(ROWS.map(row=>row[0]))

export const CONTEXT_LABELS = Object.freeze({
  ru: {
    difficulty: ['Почти не отмечается', 'Отмечается немного', 'Заметно в ответах', 'Выражено в ответах', 'Очень выражено в ответах'],
    resource: ['Почти недоступно', 'Доступно в малой мере', 'Доступно частично', 'Достаточно доступно', 'Отмечается устойчиво'],
    neutral: ['Ближе к нижней границе', 'Ниже середины', 'В средней части', 'Выше середины', 'Ближе к верхней границе'],
  },
  en: {
    difficulty: ['Hardly reported', 'Reported to a lesser degree', 'Noticeable in responses', 'Strongly reported', 'Very strongly reported'],
    resource: ['Barely available', 'Available to a lesser degree', 'Partly available', 'Largely available', 'Consistently reported'],
    neutral: ['Near the lower end', 'Below the midpoint', 'In the middle', 'Above the midpoint', 'Near the upper end'],
  },
})

export function situationLevelNote({mode, construct, index, locale = 'en'}) {
  const ru = locale === 'ru'
  const label = '«' + construct + '»'
  const difficultyRu = [
    'По вашим ответам сложности по теме ' + label + ' почти не отмечаются. Это не исключает отдельных непростых эпизодов.',
    'Сложности по теме ' + label + ' отражены в небольшой части ответов. Важно заметить конкретные условия, а не судить только по среднему.',
    'Сложности по теме ' + label + ' заметно представлены в ответах. Полезно сопоставить разные ситуации и доступные способы справляться.',
    'Ответы довольно сильно отражают трудности по теме ' + label + '. Посмотрите, где они особенно мешают и какая поддержка доступна.',
    'Сложности по теме ' + label + ' очень сильно отражены в ответах. При заметном влиянии на жизнь стоит обсудить трудности с подходящим специалистом.',
  ]
  const difficultyEn = [
    'Your responses show little difficulty around ' + label + '. This does not rule out particular hard moments.',
    'A lesser degree of difficulty around ' + label + ' is reflected in the answers. Look for situations behind the average.',
    'Difficulty around ' + label + ' is clearly reflected in the answers. Compare different situations and available ways to cope.',
    'Difficulty around ' + label + ' is strongly reflected. Notice where it interferes and what support is available.',
    'Difficulty around ' + label + ' is very strongly reflected in the answers. Consider qualified support if it interferes with daily life.',
  ]
  const resourceRu = [
    'По ответам возможности в сфере ' + label + ' сейчас отмечаются слабо. Это не дефект и не доказательство, что они недоступны во всех ситуациях.',
    'Возможности в сфере ' + label + ' пока отмечены в небольшой мере. Найдите одно исключение, где опираться на них получается легче.',
    'Возможности в сфере ' + label + ' частично доступны. Сравните, что помогает им проявляться и что ограничивает их в разных условиях.',
    'Возможности в сфере ' + label + ' хорошо отражены в ответах. Отметьте условия, которые помогают пользоваться ими без давления.',
    'Возможности в сфере ' + label + ' устойчиво отражены в ответах. Это не означает, что ресурс должен быть доступен постоянно.',
  ]
  const resourceEn = [
    'Resources around ' + label + ' are weakly endorsed in these answers. That is not a defect or proof they are absent everywhere.',
    'Resources around ' + label + ' are reported to a lesser degree. Look for one situation in which they are more accessible.',
    'Resources around ' + label + ' are partly available. Compare what supports or limits them in different settings.',
    'Resources around ' + label + ' are well reflected in the answers. Notice what helps you use them without pressure.',
    'Resources around ' + label + ' are consistently reflected in the answers. They need not be available all the time.',
  ]
  const neutralRu = [
    'Ответы по теме ' + label + ' находятся ближе к нижней границе. Сама эта позиция не говорит о пользе или вреде особенности.',
    'По теме ' + label + ' ответы ниже середины. Отмечайте, когда выбранная особенность проявляется иначе.',
    'По теме ' + label + ' ответы близки к средней части. Разные обстоятельства и отдельные вопросы могут давать разные оценки.',
    'По теме ' + label + ' ответы выше середины. Высокий балл не означает автоматически лучший или худший результат.',
    'По теме ' + label + ' ответы близки к верхней границе. Значение отражает самоописание, а не норму или цель развития.',
  ]
  const neutralEn = [
    'Responses around ' + label + ' are near the lower end. This is not inherently a benefit or a flaw.',
    'Responses around ' + label + ' are below the midpoint. Notice where the tendency appears differently.',
    'Responses around ' + label + ' fall near the middle. Different situations and individual items may vary.',
    'Responses around ' + label + ' are above the midpoint. More is not automatically better or worse.',
    'Responses around ' + label + ' are near the upper end. This describes self-report, not a norm or development target.',
  ]
  const choices = mode === 'difficulty'
    ? ru ? difficultyRu : difficultyEn
    : mode === 'resource'
      ? ru ? resourceRu : resourceEn
      : ru ? neutralRu : neutralEn
  return choices[index]
}
