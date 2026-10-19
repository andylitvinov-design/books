import { deepFreeze } from '../../lib/assessments/contracts.js'

// Five additive, source-permitted English questionnaires. Immutable v1 forms:
// four full IPIP Barchard (2001) component scales and the ONS4 survey standard.
// Fingerprints: SHA-256 of JSON.stringify({key,items,positiveCount}) for IPIP
// and JSON.stringify({key,items}) for ONS4. Immutable after publication.
// No invented cutoffs or diagnostic interpretations.
const IPIP_FORMS = [
  {
    "key": "ipip-emotion-decision-making-9",
    "id": "13deba1e-e350-5593-85c7-30f2c9815cbd",
    "name": "Emotion-based decision-making",
    "ru": "Решения с опорой на чувства · EN",
    "dimension": "trait.ipip.emotion_based_decision_making",
    "positiveCount": 5,
    "hash": "85ba815ae4a2a57da10a5fbf0136fc0bbfbe0e5a32fc3011fe8ef0a34003d35b",
    "topics": [
      "personality",
      "mood",
      "meaning",
      "function"
    ],
    "axes": [
      {
        "key": "personality",
        "weight": 0.85
      },
      {
        "key": "emotional_regulation",
        "weight": 0.55
      },
      {
        "key": "clarity",
        "weight": 0.4
      }
    ],
    "description": "Nine IPIP items describe preferences for feeling-led versus analytical decisions; neither approach is inherently better. Original English only.",
    "descriptionRu": "9 оригинальных вопросов IPIP о роли чувств и логики в решениях. Это описание предпочтений, а не оценка качества решений; вопросы EN.",
    "advice": "Consider situations where emotion and practical evidence each help you make a thoughtful choice.",
    "adviceRu": "Отметьте, в каких решениях помогают чувства, а в каких — проверяемые факты.",
    "items": [
      "Listen to my feelings when making important decisions.",
      "Base my goals in life on inspiration, rather than logic.",
      "Plan my life based on how I feel.",
      "Believe emotions give direction to life.",
      "Listen to my heart rather than my brain.",
      "Plan my life logically.",
      "Believe important decisions should be based on logical reasoning.",
      "Listen to my brain rather than my heart.",
      "Make decisions based on facts, not feelings."
    ]
  },
  {
    "key": "ipip-responsive-joy-10",
    "id": "00089afb-3905-5e84-8efb-f0566342aff5",
    "name": "Responsive joy",
    "ru": "Отклик на радость других · EN",
    "dimension": "trait.ipip.responsive_joy",
    "positiveCount": 6,
    "hash": "191b04f9610931d98dab5270fc733c687a8bd05c5cc21cf052ce5e952397538c",
    "topics": [
      "personality",
      "relationships",
      "mood"
    ],
    "axes": [
      {
        "key": "personality",
        "weight": 0.8
      },
      {
        "key": "relationships",
        "weight": 0.8
      },
      {
        "key": "mood",
        "weight": 0.5
      }
    ],
    "description": "Ten original IPIP items on emotional resonance with other people's positive feelings; not an empathy diagnosis or required level of happiness.",
    "descriptionRu": "10 вопросов IPIP об эмоциональном отклике на радость других. Это не диагноз и не требование быть счастливым; вопросы EN.",
    "advice": "Notice when other people's good moods affect you, without judging stronger or quieter reactions.",
    "adviceRu": "Замечайте, как на вас влияет радость других людей, не оценивая силу реакции.",
    "items": [
      "Like to watch children open presents.",
      "Usually end up laughing if the people around me are laughing.",
      "Feel other people's joy.",
      "Get caught up in the excitement when others are celebrating.",
      "Am strongly influenced by the good moods of others.",
      "Find it hard to stay in a bad mood if the people around me are happy.",
      "Dislike being around happy people when I'm feeling sad.",
      "Am unaffected by other people's happiness.",
      "Rarely get caught up in the excitement.",
      "Dislike children's birthday parties."
    ]
  },
  {
    "key": "ipip-responsive-distress-10",
    "id": "eea5bd21-9620-5fd6-bc2a-9809e590fbd2",
    "name": "Responsive distress",
    "ru": "Отклик на чужие трудности · EN",
    "dimension": "trait.ipip.responsive_distress",
    "positiveCount": 5,
    "hash": "3f6e099c8027c79bc1fe1d8d46910d0f56c63ed08989714e984d04addde8b282",
    "topics": [
      "personality",
      "relationships",
      "stress",
      "mood"
    ],
    "axes": [
      {
        "key": "personality",
        "weight": 0.8
      },
      {
        "key": "relationships",
        "weight": 0.8
      },
      {
        "key": "emotional_regulation",
        "weight": 0.45
      }
    ],
    "description": "Ten original IPIP items describing personal emotional reactions to others' distress. Higher scores do not establish healthier coping or clinical distress.",
    "descriptionRu": "10 вопросов IPIP о личном отклике на чужие трудности. Более высокий балл не означает лучшее совладание; вопросы EN.",
    "advice": "Reflect on when others' emotions affect you and which boundaries make caring sustainable.",
    "adviceRu": "Отметьте, как вы реагируете на переживания других и какие границы помогают.",
    "items": [
      "Am deeply moved by others' misfortunes.",
      "Am easily moved to tears.",
      "Suffer from others' sorrows.",
      "Am upset by the misfortunes of strangers.",
      "Would be upset if I saw an injured animal.",
      "Am calm even in tense situations.",
      "Am not easily disturbed by events.",
      "Am unaffected by the suffering of others.",
      "Rarely cry during sad movies.",
      "Remain calm during emergencies."
    ]
  },
  {
    "key": "ipip-empathic-concern-10",
    "id": "608dce45-8984-51bc-9f1d-5dc8aa9eac8e",
    "name": "Empathic concern",
    "ru": "Эмпатическая забота · EN",
    "dimension": "trait.ipip.empathic_concern",
    "positiveCount": 5,
    "hash": "e8661dad68762e77e466943ab40231675c2447a6872176063c3a74165067558f",
    "topics": [
      "personality",
      "relationships",
      "support"
    ],
    "axes": [
      {
        "key": "personality",
        "weight": 0.85
      },
      {
        "key": "relationships",
        "weight": 0.9
      }
    ],
    "description": "Ten original IPIP items about concern for other people. A descriptive trait questionnaire, not a clinical test of empathy.",
    "descriptionRu": "10 оригинальных вопросов IPIP об участии и сочувствии другим. Описательная методика, не клинический тест эмпатии; вопросы EN.",
    "advice": "Consider how concern for others can be expressed with respect for your own capacity and boundaries.",
    "adviceRu": "Подумайте, как выражать заботу о других, учитывая собственные силы и границы.",
    "items": [
      "Am concerned about others.",
      "Feel sympathy for those who are worse off than myself.",
      "Sympathize with the homeless.",
      "Believe that criminals should receive help rather than punishment.",
      "Believe that the poor deserve our sympathy.",
      "Feel little concern for others.",
      "Have no sympathy for criminals.",
      "Look down on any weakness.",
      "Don't like to get involved in other people's problems.",
      "Have little sympathy for the unemployed."
    ]
  }
]

const IPIP_ANCHORS = Object.freeze([
  'Very Inaccurate', 'Moderately Inaccurate', 'Neither Inaccurate nor Accurate',
  'Moderately Accurate', 'Very Accurate',
])
const itemIds = (form) => form.items.map((_, i) => form.key + '.' + String(i + 1).padStart(2, '0'))
const ipipDefinition = (form) => {
  const ids = itemIds(form)
  return {
    id: form.id, key: form.key, version: 'v1', instrumentLocale: 'en',
    translationVersion: 'original-en-v1', timeframe: 'general-self-description',
    scoringKey: 'configured', scoringVersion: 'v1', resultVersion: 'v1',
    title: 'IPIP — ' + form.name,
    source: {
      title: 'IPIP: Barchard (2001), components related to Emotional Intelligence',
      url: 'https://ipip.ori.org/newEmotionalIntelligenceKey.htm',
      scoringUrl: 'https://ipip.ori.org/newScoringInstructions.htm',
      permissionUrl: 'https://ipip.ori.org/newPermission.htm',
      permission: 'Public-domain original IPIP scales; commercial and non-commercial use explicitly permitted.',
      citation: 'Barchard, K. A. (2001). Seven components potentially related to emotional intelligence, as published in the IPIP scale keys.',
      reviewedAt: '2026-10-19',
      nonDiagnostic: true,
      interpretation: 'A self-description trait sum; higher is not inherently healthier. Do not label clinical ability, percentile or diagnosis.',
    },
    answerScale: {min: 1, max: 5}, responseAnchors: IPIP_ANCHORS,
    scoring: {dimensions: [{
      key: form.dimension, method: 'sum', items: ids, reverseItems: ids.slice(form.positiveCount),
      min: ids.length, max: ids.length * 5, dimensionClass: 'trait',
      sourceConstruct: form.name, direction: 'non-normative',
    }]},
    questions: form.items.map((text, i) => ({id: ids[i], text, required: true})),
    optionalContext: [], suggestedRepeatDays: 90, contentHash: 'sha256:' + form.hash,
  }
}

const ONS_KEY = 'ons-personal-wellbeing-4'
const ONS_QUESTIONS = [
  'Overall, how satisfied are you with your life nowadays?',
  'Overall, to what extent do you feel that the things you do in your life are worthwhile?',
  'Overall, how happy did you feel yesterday?',
  'On a scale where 0 is "not at all anxious" and 10 is "completely anxious", overall, how anxious did you feel yesterday?',
]
const ONS_ENDPOINTS = [
  ['Not at all satisfied', 'Completely satisfied'],
  ['Not at all worthwhile', 'Completely worthwhile'],
  ['Not at all happy', 'Completely happy'],
  ['Not at all anxious', 'Completely anxious'],
]
const ONS_DIMENSIONS = [
  ['resources.ons4.life_satisfaction', 'Life satisfaction', 'resources'],
  ['resources.ons4.worthwhile', 'Feeling life is worthwhile', 'resources'],
  ['resources.ons4.happiness', 'Happiness yesterday', 'resources'],
  ['symptoms.ons4.anxiety', 'Anxiety yesterday', 'symptoms'],
]
const ONS_DEFINITION = {
  id: '78e257f3-7d2d-5feb-a317-d39f8c2a8e19', key: ONS_KEY, version: 'v1',
  instrumentLocale: 'en', translationVersion: 'official-en-v1',
  timeframe: 'general-and-yesterday', scoringKey: 'configured', scoringVersion: 'v1',
  resultVersion: 'v1', title: 'ONS4 — Personal Well-being',
  source: {
    title: 'Office for National Statistics: Personal well-being questions (ONS4)',
    url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/wellbeing/methodologies/personalwellbeingsurveyuserguide',
    permissionUrl: 'https://www.ons.gov.uk/peoplepopulationandcommunity/wellbeing/methodologies/surveysusingthe4officefornationalstatisticspersonalwellbeingquestions',
    permission: 'ONS encourages reuse of the four standardised personal wellbeing questions. Source: Office for National Statistics.',
    citation: 'Office for National Statistics. Personal well-being survey user guide, four harmonised questions; source acknowledged.',
    reviewedAt: '2026-10-19', nonDiagnostic: true,
    notes: 'Four separate 0–10 answers. Never combine into an ONS4 total score: ONS expressly advises against it. Anxiety is not reverse scored.',
  },
  answerScale: {min: 0, max: 10},
  responseAnchors: ['0 — Not at all', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10 — Completely'],
  scoring: {dimensions: ONS_DIMENSIONS.map(([key, sourceConstruct, dimensionClass], i) => ({
    key, method: 'value', items: ['ons4.' + String(i + 1).padStart(2, '0')],
    min: 0, max: 10, dimensionClass, sourceConstruct,
    direction: i === 3 ? 'lower-reported-difficulty' : 'higher-reported-resource',
  }))},
  questions: ONS_QUESTIONS.map((text, i) => ({
    id: 'ons4.' + String(i + 1).padStart(2, '0'), text, required: true,
    inputType: 'scale-select',
    responseAnchors: Array.from({length: 11}, (_, n) => n === 0 ? ONS_ENDPOINTS[i][0] : n === 10 ? ONS_ENDPOINTS[i][1] : null),
  })),
  optionalContext: [], suggestedRepeatDays: 30,
  contentHash: 'sha256:8597bc30247ea6505a7521df9f0dd4d51c13cb86776a5abc6d493fc170df6689',
}

export const ADDITIONAL_PROFESSIONAL_DEFINITIONS = deepFreeze([
  ...IPIP_FORMS.map(ipipDefinition),
  ONS_DEFINITION,
])
export const ADDITIONAL_PROFESSIONAL_CATALOG = deepFreeze([
  ...IPIP_FORMS.map((form) => ({
    key: form.key, version: 'v1', instrumentLocale: 'en', axis: 'baseline',
    resultAxes: ['baseline'], topics: form.topics, moodAffinities: ['neutral','sad','happy'],
    categoryAffinities: ['emotions','relationships','other'],
    questionCount: form.items.length, durationMinutes: 3, testStyle: 'professional',
    testLength: 'medium', suggestedRepeatDays: 90, cooldownDays: 30,
    startable: true, access: 'account', rightsStatus: 'cleared',
    guestEligible: true, starterEligible: true, free: true,
    analysisAxes: form.axes, title: {en: 'IPIP — ' + form.name, ru: form.ru, es: 'IPIP — ' + form.name + ' (EN)'},
    description: {en: form.description, ru: form.descriptionRu, es: form.description},
  })),
  {
    key: ONS_KEY, version: 'v1', instrumentLocale: 'en', axis: 'resources',
    resultAxes: ['resources','symptoms'], topics: ['mood','anxiety','meaning','resources','function'],
    moodAffinities: ['neutral','sad','happy'], categoryAffinities: ['emotions','other'],
    questionCount: 4, durationMinutes: 2, testStyle: 'professional',
    testLength: 'short', suggestedRepeatDays: 30, cooldownDays: 14,
    startable: true, access: 'account', rightsStatus: 'cleared',
    guestEligible: true, starterEligible: true, free: true,
    analysisAxes: [{key:'mood',weight:0.9},{key:'anxiety',weight:0.8},
      {key:'meaning',weight:0.85},{key:'resource',weight:0.8}],
    title: {en:'ONS4 — Personal Well-being',ru:'ONS4 — личное благополучие · EN',es:'ONS4 — bienestar personal · EN'},
    description: {
      en:'Four standard ONS questions on life satisfaction, purpose, happiness and anxiety. Four separate 0–10 answers, never one invented total.',
      ru:'4 стандартизированных вопроса ONS об удовлетворённости жизнью, смысле, радости и тревоге. Четыре отдельных балла, без общего индекса; вопросы EN.',
      es:'Cuatro preguntas originales de la ONS sobre satisfacción, propósito, felicidad y ansiedad. Cuatro respuestas separadas de 0 a 10; preguntas EN.',
    },
  },
])
export const ADDITIONAL_PROFESSIONAL_INTERPRETATION_ROWS = deepFreeze([
  ...IPIP_FORMS.map((form) => [form.key,'personality',form.advice,
    form.adviceRu + ' Вопросы только на английском.']),
  [ONS_KEY,'general',
    'Look at the four domains separately and note the circumstances; neither one number nor the sum is a diagnosis.',
    'Рассматривайте четыре ответа отдельно и учитывайте обстоятельства; ни один балл не является диагнозом.'],
])
export const ADDITIONAL_PROFESSIONAL_DIMENSION_ROWS = deepFreeze([
  ...IPIP_FORMS.map((form) => [form.key,form.dimension,'personality',form.name,
    form.ru.replace(' · EN',''),form.advice,form.adviceRu]),
  [ONS_KEY, 'resources.ons4.life_satisfaction', 'general',
    'Life satisfaction','Удовлетворённость жизнью',
    'Compare your satisfaction across life circumstances rather than giving yourself a grade.',
    'Сопоставляйте удовлетворённость с жизненными обстоятельствами, а не ставьте себе оценку.'],
  [ONS_KEY, 'resources.ons4.worthwhile', 'general',
    'Life feels worthwhile','Ощущение смысла',
    'Reflect on what feels worthwhile in your everyday life without comparing it with others.',
    'Отметьте, что придаёт повседневной жизни смысл, не сравнивая себя с другими.'],
  [ONS_KEY, 'resources.ons4.happiness', 'mood',
    'Happiness yesterday','Радость вчера',
    'This answer concerns yesterday only; consider the events around that day.',
    'Ответ относится только ко вчерашнему дню; учитывайте его обстоятельства.'],
  [ONS_KEY, 'symptoms.ons4.anxiety', 'anxiety',
    'Anxiety yesterday','Тревога вчера',
    'This is a single recollection of yesterday, not a diagnostic anxiety score.',
    'Это один ответ о вчерашнем дне, а не диагностическая шкала тревоги.'],
])
