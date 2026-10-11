// Public topic -> concern suggestions used for questionnaire discovery.
// These are self-described difficulties, never inferred diagnoses or health scores.
// Each item maps to topics and dimensions present in the rights-cleared catalog.
const list = [
  // Stress
  ['work-overload',['stress'],['stress','work'],['stress','functioning'],'Workload feels overwhelming','Перегрузка на работе','Demasiado trabajo'],
  ['exhaustion',['stress','body'],['stress','energy','recovery'],['stress','energy','resource'],'Feeling exhausted','Истощение и усталость','Agotamiento'],
  ['body-tension',['stress','anxiety','body'],['stress','body','anxiety'],['stress','anxiety'],'Tension in my body','Напряжение в теле','Tensión corporal'],
  ['relaxation',['stress'],['stress','recovery'],['stress','emotional_regulation'],'Difficulty relaxing','Трудно расслабиться','Dificultad para relajarse'],
  // Anxiety
  ['constant-worry',['anxiety'],['anxiety','stress'],['anxiety','emotional_regulation'],'Persistent worrying','Постоянное беспокойство','Preocupación constante'],
  ['social-anxiety',['anxiety','relationships'],['anxiety','relationships','support'],['anxiety','relationships'],'Anxiety around people','Тревога при общении','Ansiedad social'],
  ['uncertainty',['anxiety'],['anxiety','stress'],['anxiety','resource'],'Uncertainty and apprehension','Страх неопределённости','Temor a la incertidumbre'],
  // Mood
  ['low-mood',['mood'],['mood'],['mood'],'Feeling down','Подавленное настроение','Ánimo bajo'],
  ['motivation',['mood','body'],['mood','energy','motivation'],['mood','energy','functioning'],'Little motivation','Недостаток мотивации','Poca motivación'],
  ['emotions',['mood','resources'],['mood','recovery'],['emotional_regulation','mood'],'Emotions feel hard to regulate','Трудно управлять эмоциями','Dificultad para regular emociones'],
  // Sleep
  ['falling-asleep',['sleep'],['sleep'],['sleep'],'Trouble falling asleep','Трудно заснуть','Dificultad para dormir'],
  ['waking-often',['sleep'],['sleep'],['sleep','functioning'],'Waking up at night','Частые пробуждения','Despertares nocturnos'],
  ['unrested',['sleep','body'],['sleep','energy','recovery'],['sleep','energy'],'Not feeling rested','Не чувствую отдыха после сна','Sueño no reparador'],
  // Energy / body
  ['fatigue',['body'],['energy','body','recovery'],['energy','functioning'],'Low energy during the day','Мало энергии днём','Poca energía'],
  ['physical-discomfort',['body'],['body','stress'],['stress','functioning'],'Physical discomfort','Телесный дискомфорт','Malestar físico'],
  ['mental-fog',['body','attention'],['attention','energy','body'],['clarity','focus'],'Mental fog','Туман в голове','Niebla mental'],
  // Relationships
  ['loneliness',['relationships'],['relationships','support'],['relationships','self_support'],'Feeling lonely','Чувство одиночества','Soledad'],
  ['relationship-stress',['relationships'],['relationships','stress'],['relationships','stress'],'Difficult conversations','Сложности в общении','Conversaciones difíciles'],
  ['low-support',['relationships','resources'],['support','relationships','recovery'],['relationships','resource'],'Not enough support','Недостаточно поддержки','Poco apoyo'],
  ['boundaries',['relationships','resources'],['relationships','self-support'],['relationships','self_support'],'Difficulty with boundaries','Трудно выстраивать границы','Dificultad para poner límites'],
  // Inner support
  ['self-doubt',['resources'],['self-support','personality','resources'],['self_support','personality'],'Self-doubt','Неуверенность в себе','Inseguridad'],
  ['self-criticism',['resources'],['self-support','mood'],['self_support','mood'],'Being hard on myself','Самокритика','Autocrítica'],
  ['coping',['resources','stress'],['recovery','resources','stress'],['resource','emotional_regulation'],'Difficulty recovering after stress','Трудно восстановиться после стресса','Dificultad para recuperarse'],
  // Attention
  ['distracted',['attention'],['attention','function'],['focus','clarity'],'Easily distracted','Легко отвлекаюсь','Fácil distracción'],
  ['organizing',['attention'],['function','work','attention'],['focus','functioning'],'Difficulty organizing tasks','Трудно организовать дела','Dificultad para organizarse'],
  ['concentration',['attention','mood'],['attention','mood'],['focus','clarity'],'Difficulty concentrating','Трудно сосредоточиться','Falta de concentración'],
]

export const PUBLIC_TEST_PROBLEMS = Object.freeze(list.map(([key,topics,signals,axes,en,ru,es]) =>
  Object.freeze({
    key, topics:Object.freeze(topics), signals:Object.freeze(signals),
    axes:Object.freeze(axes), label:Object.freeze({en,ru,es}),
  })))
const map = new Map(PUBLIC_TEST_PROBLEMS.map(problem=>[problem.key,problem]))
const once = values => [...new Set(Array.isArray(values) ? values.filter(x=>typeof x==='string') : [])]

/** Only show concerns derived from topics the visitor explicitly selected. */
export function problemsForTopics(topics=[]) {
 const chosen=new Set(once(topics))
 return chosen.size
  ? PUBLIC_TEST_PROBLEMS.filter(problem=>problem.topics.some(topic=>chosen.has(topic)))
  : []
}
export function normalizeProblemsForTopics(keys=[],topics=[]) {
 const valid=new Set(problemsForTopics(topics).map(problem=>problem.key))
 return once(keys).filter(key=>valid.has(key)).slice(0,12)
}

/** Catalog-coverage heuristic used for matching tests, not medical inference. */
export function testProblemRelevance(entry,problemKey) {
 const problem=map.get(problemKey)
 if(!problem || !entry?.selectable)return 0
 const topics=Array.isArray(entry.topics)?entry.topics:[]
 const dimensions=Array.isArray(entry.analysisAxes)?entry.analysisAxes:[]
 const topicFit=problem.signals.length
  ? problem.signals.filter(topic=>topics.includes(topic)).length/problem.signals.length
  : 0
 const axesFit=problem.axes.length
  ? problem.axes.reduce((sum,key)=>sum+Math.max(0,...dimensions.filter(axis=>axis.key===key).map(axis=>Math.min(1,Number(axis.weight)||0))),0)/problem.axes.length
  : 0
 return Math.min(1,0.6*topicFit+0.4*axesFit)
}
export function relevanceForSelectedProblems(entry,selected=[]) {
 const keys=once(selected).filter(key=>map.has(key))
 return keys.length?keys.reduce((sum,key)=>sum+testProblemRelevance(entry,key),0)/keys.length:0
}
export function matchesSelectedProblems(entry,selected=[]) {
 const keys=once(selected).filter(key=>map.has(key))
 return !keys.length || keys.some(key=>testProblemRelevance(entry,key)>0)
}
