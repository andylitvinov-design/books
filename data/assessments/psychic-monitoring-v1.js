import { deepFreeze } from '../../lib/assessments/contracts.js'

const optionalContext = [
  { id: 'current_focus', maxLength: 1000 },
  { id: 'trigger', maxLength: 1000 },
  { id: 'what_helps', maxLength: 1000 },
  { id: 'desired_change', maxLength: 1000 },
  { id: 'note', maxLength: 1000 },
]

const PHQ_RESPONSE = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']
const K6_RESPONSE = ['None of the time', 'A little of the time', 'Some of the time', 'Most of the time', 'All of the time']

export const PHQ4_EN_V1 = deepFreeze({
  id: '2c1c78ad-b4f1-4d15-8b18-37e3f2f55a41',
  key: 'phq-4',
  version: 'v1',
  instrumentLocale: 'en',
  translationVersion: 'official-en-v1',
  timeframe: 'past-2-weeks',
  scoringKey: 'configured',
  scoringVersion: 'v1',
  resultVersion: 'v1',
  title: 'Mood & anxiety — 1 minute',
  source: {
    title: 'Patient Health Questionnaire 4 (PHQ-4)',
    url: 'https://www.nih.gov/node/21506',
    permission: 'copyright-no',
    retrievedAt: '2026-10-05',
  },
  answerScale: { min: 0, max: 3 },
  responseAnchors: PHQ_RESPONSE,
  scoring: {
    dimensions: [
      { key: 'symptoms.phq4.total', method: 'sum', items: ['phq4.01','phq4.02','phq4.03','phq4.04'], min: 0, max: 12, dimensionClass: 'symptoms', sourceConstruct: 'Mood and anxiety symptoms' },
      { key: 'symptoms.phq4.depression', method: 'sum', items: ['phq4.01','phq4.02'], min: 0, max: 6, dimensionClass: 'symptoms', sourceConstruct: 'Depression screening signal' },
      { key: 'symptoms.phq4.anxiety', method: 'sum', items: ['phq4.03','phq4.04'], min: 0, max: 6, dimensionClass: 'symptoms', sourceConstruct: 'Anxiety screening signal' },
    ],
  },
  questions: [
    { id: 'phq4.01', text: 'Little interest or pleasure in doing things', required: true },
    { id: 'phq4.02', text: 'Feeling down, depressed, or hopeless', required: true },
    { id: 'phq4.03', text: 'Feeling nervous, anxious, or on edge', required: true },
    { id: 'phq4.04', text: 'Not being able to stop or control worrying', required: true },
  ],
  optionalContext: [],
  suggestedRepeatDays: 14,
  contentHash: 'sha256:fbc77f2ee5aa303b67c706f3661fb0d86a5751b5d1cf8287c5efaecf4538ffad',
})

export const K6_EN_V1 = deepFreeze({
  id: '531f52bf-39df-4149-a0e1-03b89f90aa85',
  key: 'k6',
  version: 'v1',
  instrumentLocale: 'en',
  translationVersion: 'official-en-v1',
  timeframe: 'past-30-days',
  scoringKey: 'configured',
  scoringVersion: 'v1',
  resultVersion: 'v1',
  title: 'Mental Load',
  source: {
    title: 'Kessler Psychological Distress Scale (K6)',
    url: 'https://rckessler.scholars.harvard.edu/k10-and-k6-scales',
    permission: 'free-with-citation-and-copyright',
    retrievedAt: '2026-10-05',
  },
  answerScale: { min: 0, max: 4 },
  responseAnchors: K6_RESPONSE,
  scoring: {
    dimensions: [
      { key: 'symptoms.k6.total', method: 'sum', items: ['k6.01','k6.02','k6.03','k6.04','k6.05','k6.06'], min: 0, max: 24, dimensionClass: 'symptoms', sourceConstruct: 'Non-specific psychological distress' },
    ],
  },
  questions: [
    { id: 'k6.01', text: 'During the past 30 days, about how often did you feel nervous?', required: true },
    { id: 'k6.02', text: 'During the past 30 days, about how often did you feel hopeless?', required: true },
    { id: 'k6.03', text: 'During the past 30 days, about how often did you feel restless or fidgety?', required: true },
    { id: 'k6.04', text: 'During the past 30 days, about how often did you feel so depressed that nothing could cheer you up?', required: true },
    { id: 'k6.05', text: 'During the past 30 days, about how often did you feel that everything was an effort?', required: true },
    { id: 'k6.06', text: 'During the past 30 days, about how often did you feel worthless?', required: true },
  ],
  optionalContext: [],
  suggestedRepeatDays: 30,
  contentHash: 'sha256:834b0c9ea9190f123857664e5ff8051eec19522ae607f560fbd2c6c1a487d5ad',
})

export const PHQ9_EN_V1 = deepFreeze({
  id: 'a251ab33-c65a-4eaf-a74c-43e4cb219c4c',
  key: 'phq-9',
  version: 'v1',
  instrumentLocale: 'en',
  translationVersion: 'official-en-v1',
  timeframe: 'past-2-weeks',
  scoringKey: 'configured',
  scoringVersion: 'v1',
  resultVersion: 'v1',
  title: 'Mood Deep Dive',
  source: {
    title: 'Patient Health Questionnaire 9 (PHQ-9)',
    url: 'https://cde.nlm.nih.gov/formView?tinyId=mJsGoMU1m',
    permission: 'no-permission-required-to-reproduce-translate-display-distribute',
    retrievedAt: '2026-10-05',
  },
  answerScale: { min: 0, max: 3 },
  responseAnchors: PHQ_RESPONSE,
  scoring: {
    dimensions: [
      { key: 'symptoms.phq9.total', method: 'sum', items: ['phq9.01','phq9.02','phq9.03','phq9.04','phq9.05','phq9.06','phq9.07','phq9.08','phq9.09'], min: 0, max: 27, dimensionClass: 'symptoms', sourceConstruct: 'Depressive symptom burden' },
    ],
  },
  questions: [
    { id: 'phq9.01', text: 'Little interest or pleasure in doing things', required: true },
    { id: 'phq9.02', text: 'Feeling down, depressed, or hopeless', required: true },
    { id: 'phq9.03', text: 'Trouble falling or staying asleep, or sleeping too much', required: true },
    { id: 'phq9.04', text: 'Feeling tired or having little energy', required: true },
    { id: 'phq9.05', text: 'Poor appetite or overeating', required: true },
    { id: 'phq9.06', text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down', required: true },
    { id: 'phq9.07', text: 'Trouble concentrating on things, such as reading the newspaper or watching television', required: true },
    { id: 'phq9.08', text: 'Moving or speaking so slowly that other people could have noticed, or the opposite — being so fidgety or restless that you have been moving around a lot more than usual', required: true },
    { id: 'phq9.09', text: 'Thoughts that you would be better off dead, or of hurting yourself in some way', required: true, safety: { type: 'self_harm', triggerMin: 1 } },
  ],
  optionalContext: [],
  suggestedRepeatDays: 14,
  contentHash: 'sha256:0526afb5336369322766c783e03e811de8608ca6c903b0000373a23200371930',
})

export const GAD7_EN_V1 = deepFreeze({
  id: 'b60ae0a9-7cf6-44d8-9e18-3e8d9cbcdd29',
  key: 'gad-7',
  version: 'v1',
  instrumentLocale: 'en',
  translationVersion: 'official-en-v1',
  timeframe: 'past-2-weeks',
  scoringKey: 'configured',
  scoringVersion: 'v1',
  resultVersion: 'v1',
  title: 'Anxiety Deep Dive',
  source: {
    title: 'Generalized Anxiety Disorder 7 (GAD-7)',
    url: 'https://www.nih.gov/node/19876',
    permission: 'copyright-no',
    retrievedAt: '2026-10-05',
  },
  answerScale: { min: 0, max: 3 },
  responseAnchors: PHQ_RESPONSE,
  scoring: {
    dimensions: [
      { key: 'symptoms.gad7.total', method: 'sum', items: ['gad7.01','gad7.02','gad7.03','gad7.04','gad7.05','gad7.06','gad7.07'], min: 0, max: 21, dimensionClass: 'symptoms', sourceConstruct: 'Anxiety symptom burden' },
    ],
  },
  questions: [
    { id: 'gad7.01', text: 'Feeling nervous, anxious, or on edge', required: true },
    { id: 'gad7.02', text: 'Not being able to stop or control worrying', required: true },
    { id: 'gad7.03', text: 'Worrying too much about different things', required: true },
    { id: 'gad7.04', text: 'Trouble relaxing', required: true },
    { id: 'gad7.05', text: 'Being so restless that it is hard to sit still', required: true },
    { id: 'gad7.06', text: 'Becoming easily annoyed or irritable', required: true },
    { id: 'gad7.07', text: 'Feeling afraid as if something awful might happen', required: true },
  ],
  optionalContext: [],
  suggestedRepeatDays: 14,
  contentHash: 'sha256:c31134e7976c600976c5aedbc2a79360ff2220c6319e8d58efc7e4e78fde760f',
})

const weeklyQuestions = {
  en: [
    ['weekly.mood','Mood','How supported and emotionally steady have you felt this week?','higher-reported-resource'],
    ['weekly.tension','Tension','How much inner tension or anxiety have you felt this week?','lower-reported-difficulty'],
    ['weekly.stress','Mental load','How overloaded or under pressure have you felt this week?','lower-reported-difficulty'],
    ['weekly.sleep','Sleep','How restorative has your sleep felt this week?','higher-reported-resource'],
    ['weekly.energy','Energy','How much usable energy have you had this week?','higher-reported-resource'],
    ['weekly.clarity','Clarity','How clear and focused has your mind felt this week?','higher-reported-resource'],
    ['weekly.connection','Connection','How connected and supported by other people have you felt this week?','higher-reported-resource'],
    ['weekly.function','Functioning','How able have you been to do the things that matter to you this week?','higher-reported-resource'],
  ],
  ru: [
    ['weekly.mood','Настроение','Насколько эмоционально устойчиво и поддержанно вы чувствовали себя на этой неделе?','higher-reported-resource'],
    ['weekly.tension','Напряжение','Насколько сильными были внутреннее напряжение или тревога на этой неделе?','lower-reported-difficulty'],
    ['weekly.stress','Нагрузка','Насколько перегруженным или под давлением вы чувствовали себя на этой неделе?','lower-reported-difficulty'],
    ['weekly.sleep','Сон','Насколько восстанавливающим был ваш сон на этой неделе?','higher-reported-resource'],
    ['weekly.energy','Энергия','Сколько доступной энергии у вас было на этой неделе?','higher-reported-resource'],
    ['weekly.clarity','Ясность','Насколько ясным и собранным было ваше мышление на этой неделе?','higher-reported-resource'],
    ['weekly.connection','Связь','Насколько связанным с другими и поддержанным вы чувствовали себя на этой неделе?','higher-reported-resource'],
    ['weekly.function','Функционирование','Насколько вы могли делать важные для себя вещи на этой неделе?','higher-reported-resource'],
  ],
}

function weeklyDefinition(locale, id, hash) {
  const questions = weeklyQuestions[locale].map(([qid,label,text,direction]) => ({ id: qid, label, text, min: 0, max: 10, required: true, direction }))
  return deepFreeze({
    id,
    key: 'hh-weekly-pulse',
    version: 'v1',
    instrumentLocale: locale,
    translationVersion: 'hh-' + locale + '-v1',
    timeframe: 'past-7-days',
    scoringKey: 'configured',
    scoringVersion: 'v1',
    resultVersion: 'v1',
    title: locale === 'ru' ? 'Психическое состояние за неделю' : 'Weekly Psychic Health',
    source: { title: 'Holistic House Weekly Psychic Health Pulse', status: 'original-non-diagnostic-self-monitoring', reviewedAt: '2026-10-05' },
    scoring: {
      dimensions: questions.map((q) => ({ key: q.id, method: 'value', items: [q.id], min: 0, max: 10, dimensionClass: q.id === 'weekly.function' ? 'function' : q.id === 'weekly.connection' || q.id === 'weekly.energy' || q.id === 'weekly.sleep' || q.id === 'weekly.clarity' || q.id === 'weekly.mood' ? 'resources' : 'state', sourceConstruct: q.label, direction: q.direction })),
    },
    questions,
    optionalContext,
    suggestedRepeatDays: 7,
    contentHash: hash,
  })
}

export const HH_WEEKLY_EN_V1 = weeklyDefinition('en','918a6d1c-a0d4-4dbb-9eca-6d040b70ed61','sha256:58df841d4ee95b7253a69ef9b12b3cd6fb331c5ea9614ee98ce0024211cd2ce8')
export const HH_WEEKLY_RU_V1 = weeklyDefinition('ru','ed045c44-073b-4d47-8468-6a3cfb39170f','sha256:6caf07be03df5e0b35b65d2559c44863aa5d6f239bef0ba2834d7689e8af51da')

const resourceQuestions = {
  en: [
    ['resource.energy','Energy','I have enough energy for what matters to me.'],
    ['resource.self_support','Inner support','I can treat myself with care when something is difficult.'],
    ['resource.support','Support','I feel I have people or places I can turn to for support.'],
    ['resource.connection','Connection','I feel meaningfully connected with other people.'],
    ['resource.agency','Agency','I feel able to influence the next step in my life.'],
    ['resource.meaning','Meaning','I feel a sense of meaning or direction in what I am doing.'],
  ],
  ru: [
    ['resource.energy','Энергия','У меня достаточно энергии для того, что для меня важно.'],
    ['resource.self_support','Внутренняя опора','Когда мне трудно, я могу относиться к себе бережно.'],
    ['resource.support','Поддержка','Я чувствую, что есть люди или места, к которым я могу обратиться за поддержкой.'],
    ['resource.connection','Связь','Я чувствую значимую связь с другими людьми.'],
    ['resource.agency','Влияние','Я чувствую, что могу влиять на следующий шаг в своей жизни.'],
    ['resource.meaning','Смысл','Я чувствую смысл или направление в том, что делаю.'],
  ],
}

function resourceDefinition(locale,id,hash) {
  const questions=resourceQuestions[locale].map(([qid,label,text])=>({id:qid,label,text,min:0,max:10,required:true,direction:'higher-reported-resource'}))
  return deepFreeze({
    id,key:'hh-resource-pulse',version:'v1',instrumentLocale:locale,translationVersion:'hh-'+locale+'-v1',
    timeframe:'right-now',scoringKey:'configured',scoringVersion:'v1',resultVersion:'v1',
    title: locale==='ru'?'Ресурс и внутренняя опора':'Resources & inner support',
    source:{title:'Holistic House Resource Pulse',status:'original-non-diagnostic-self-monitoring',reviewedAt:'2026-10-05'},
    scoring:{dimensions:[
      ...questions.map(q=>({key:q.id,method:'value',items:[q.id],min:0,max:10,dimensionClass:'resources',sourceConstruct:q.label,direction:q.direction})),
      {key:'resources.overall',method:'mean',items:questions.map(q=>q.id),min:0,max:10,dimensionClass:'resources',sourceConstruct:locale==='ru'?'Общий ресурс':'Overall resources',direction:'higher-reported-resource'},
    ]},
    questions,optionalContext:[],suggestedRepeatDays:14,contentHash:hash,
  })
}
export const HH_RESOURCE_EN_V1=resourceDefinition('en','435985a5-94fc-4c2b-9a7f-a2e6c33f94be','sha256:839d2bc20e99f3d4bb125fe84d2706f57c04021e01de5dc16064ceb512f63f48')
export const HH_RESOURCE_RU_V1=resourceDefinition('ru','aa30b3c7-f35a-4b52-a335-9a74366c2927','sha256:af701277ff655b330c2a973ec818bba86f5504f2aa76752f4d04c37d5e79861e')

const monthlyDomains = {
  en: [
    ['self','Self','I feel emotionally grounded.','I can be kind to myself when I struggle.','I know what I need next.'],
    ['relationships','Relationships','I feel connected with people who matter to me.','My important relationships feel safe enough to be myself.','I can ask for support or set a boundary when I need to.'],
    ['body','Body','My body feels reasonably comfortable.','My sleep and recovery are supporting me.','I have enough physical energy for daily life.'],
    ['work','Work & activity','I can focus on important tasks.','My workload feels manageable enough.','I feel effective in the things I am responsible for.'],
    ['meaning','Meaning','My life has a sense of direction.','I am connected with something meaningful to me.','I can see at least one thing I want to move toward.'],
    ['support','Support','I have practical support when I need it.','I have emotional support when I need it.','I feel less alone with difficult things.'],
  ],
  ru: [
    ['self','Я','Я чувствую внутреннюю устойчивость.','Когда мне трудно, я могу относиться к себе бережно.','Я понимаю, что мне сейчас нужно дальше.'],
    ['relationships','Отношения','Я чувствую связь с важными для меня людьми.','В важных отношениях мне достаточно безопасно быть собой.','Я могу попросить о поддержке или обозначить границу, когда это нужно.'],
    ['body','Тело','Моё тело в целом ощущается достаточно комфортно.','Сон и восстановление поддерживают меня.','У меня достаточно физической энергии для повседневной жизни.'],
    ['work','Работа и деятельность','Я могу сосредоточиться на важных задачах.','Моя нагрузка ощущается достаточно управляемой.','Я чувствую себя эффективным в своих обязанностях.'],
    ['meaning','Смысл','В моей жизни есть ощущение направления.','Я связан с тем, что имеет для меня смысл.','Я вижу хотя бы одну вещь, к которой хочу двигаться.'],
    ['support','Поддержка','У меня есть практическая поддержка, когда она нужна.','У меня есть эмоциональная поддержка, когда она нужна.','Я меньше чувствую себя один на один с трудностями.'],
  ],
}
function monthlyDefinition(locale,id,hash){
  const questions=[]
  const dimensions=[]
  for(const [domain,label,...texts] of monthlyDomains[locale]){
    const ids=[]
    texts.forEach((text,index)=>{
      const qid='monthly.'+domain+'.'+(index+1)
      ids.push(qid)
      questions.push({id:qid,label,text,min:0,max:4,required:true,direction:'higher-reported-resource'})
    })
    dimensions.push({key:'resources.monthly.'+domain,method:'mean',items:ids,min:0,max:4,dimensionClass:domain==='work'||domain==='body'?'function':'resources',sourceConstruct:label,direction:'higher-reported-resource'})
  }
  dimensions.push({key:'resources.monthly.overall',method:'mean',items:questions.map(q=>q.id),min:0,max:4,dimensionClass:'resources',sourceConstruct:locale==='ru'?'Общий профиль месяца':'Overall monthly profile',direction:'higher-reported-resource'})
  return deepFreeze({
    id,key:'hh-monthly-profile',version:'v1',instrumentLocale:locale,translationVersion:'hh-'+locale+'-v1',
    timeframe:'past-month',scoringKey:'configured',scoringVersion:'v1',resultVersion:'v1',
    title:locale==='ru'?'Профиль месяца':'Monthly Life Profile',
    source:{title:'Holistic House Monthly Life Domains Review',status:'original-non-diagnostic-self-monitoring',reviewedAt:'2026-10-05'},
    answerScale:{min:0,max:4},
    responseAnchors: locale==='ru'?['Совсем нет','Немного','Умеренно','В значительной степени','Очень сильно']:['Not at all','A little','Moderately','Quite a lot','Very much'],
    scoring:{dimensions},questions,optionalContext,suggestedRepeatDays:30,contentHash:hash,
  })
}
export const HH_MONTHLY_EN_V1=monthlyDefinition('en','b84c55bf-4872-4271-8dd7-261861697bea','sha256:916212aa4f201d0da2726e30d1a28995dc9a90b734edef1917df7d3ab0ddee51')
export const HH_MONTHLY_RU_V1=monthlyDefinition('ru','c87d81ea-2ab4-4ad4-923d-5598a9239d08','sha256:1100b8e8cbb1aa99b09c5f6a541b3daffd5c562cc689576c47a09356310f38c6')
