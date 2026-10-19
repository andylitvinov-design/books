// A private, explainable ranking aid for the practitioner report editor.
// Runs in the browser against public catalogue metadata. It makes no network
// calls, never chooses tests on behalf of the practitioner and does not diagnose.
export const REPORT_TEST_SUGGESTION_COUNT = 5

const CONCEPTS = Object.freeze([
  { key:'stress', ru:'стресс и напряжение', en:'stress and tension',
    roots:['стресс','напряж','перегруз','давлен','нервн','stress','tens','overwhelm','pressure','burnout'] },
  { key:'anxiety', ru:'тревожность', en:'anxiety',
    roots:['тревог','беспок','страх','паник','волнени','anxiet','anxious','worr','fear','panic','apprehens'] },
  { key:'mood', ru:'настроение', en:'mood',
    roots:['настроени','подавлен','груст','печал','депресс','апат','тоск','mood','sadness','depress','lowmood','apath'] },
  { key:'sleep', ru:'сон', en:'sleep',
    roots:['бессон','сон','сна','сплю','просып','засып','sleep','insomnia','nightmare','awakening'] },
  { key:'energy', ru:'энергия и усталость', en:'energy and fatigue',
    roots:['энерг','устал','истощ','утомл','выгорани','сил','слабост','fatigue','exhaust','tired','energy','burnout'] },
  { key:'focus', ru:'внимание и концентрация', en:'attention and focus',
    roots:['внимани','концентрац','рассеян','сосредоточ','забывчив','focus','concentrat','distract','attention','adhd'] },
  { key:'clarity', ru:'ясность мышления', en:'mental clarity',
    roots:['ясност','затуман','путаниц','решени','нерешител','clarity','brainfog','confusion','indecisi'] },
  { key:'emotional_regulation', ru:'регуляция эмоций', en:'emotion regulation',
    roots:['эмоци','эмоцион','раздраж','злост','гнев','вспыш','стыд','обид','emotion','anger','irritab','regulat','shame'] },
  { key:'relationships', ru:'отношения', en:'relationships',
    roots:['отношени','партнер','партнёр','семь','семьи','общени','одиноч','отверж','relationship','partner','family','lonely','loneliness','rejection'] },
  { key:'boundaries', ru:'границы', en:'boundaries',
    roots:['границ','отказат','конфликт','согласи','boundar','consent','assertiv'] },
  { key:'intimacy', ru:'близость', en:'intimacy',
    roots:['близост','интим','довер','привязан','intimac','closeness','attachment','trust'] },
  { key:'sexual_wellbeing', ru:'сексуальное благополучие', en:'sexual wellbeing',
    roots:['сексуал','либидо','полов','эротич','sexual','libido','arousal'] },
  { key:'embodiment', ru:'телесное самочувствие', en:'body awareness',
    roots:['телес','сомат','дыхани','зажим','мышечн','ощущени','bodyawareness','somatic','breath','muscle','body'] },
  { key:'resource', ru:'ресурсы и поддержка', en:'support and resources',
    roots:['ресурс','поддерж','опор','помощ','восстанов','coping','resilien','resource','support','recover'] },
  { key:'self_support', ru:'самоподдержка', en:'self-support',
    roots:['самооцен','самоподдерж','уверен','самокрит','самосострад','selfesteem','selfcompassion','selfcare','selfsupport','confidence'] },
  { key:'functioning', ru:'повседневная активность', en:'daily functioning',
    roots:['работоспособ','повседнев','обязанност','учеб','учёб','продуктив','задач','functioning','productiv','dailyactivities','workload'] },
  { key:'personality', ru:'личностные особенности', en:'personality',
    roots:['личност','характер','темперамент','привычк','черт','personality','temperament','personalitytrait','trait'] },
  { key:'meaning', ru:'смысл и цели', en:'meaning and goals',
    roots:['смысл','ценност','предназнач','ориентир','намерени','жизненнцель','meaning','purpose','values','life-goal'] },
])

const RELATED = Object.freeze({
  resource: ['resource','resources'],
  self_support: ['self_support','self-care','self_care','self_compassion'],
  emotional_regulation: ['emotional_regulation','emotions'],
  embodiment: ['embodiment','body'],
  sexual_wellbeing: ['sexual_wellbeing','sexuality'],
  relationships: ['relationships','relationship'],
})

const STOP = new Set([
  'test','tests','scale','profile','result','monitor','measure','screening','questionnaire',
  'опросник','тест','шкала','профиль','анализ','исследование','состояние','уровень',
  'client','practitioner','клиент','отчет','отчёт','session','сессии','assessment',
])

function words(text) {
  return (String(text || '').normalize('NFKC').toLocaleLowerCase()
    .match(/[a-zа-яё0-9]+/gu) || [])
}
function wordMatches(token,root) {
  return token === root || token.startsWith(root)
}
function conceptSignals({ analysis='', additionalNotes='', generalInstructions='' }={}) {
  const sources=[
    { words:words(analysis), weight:3 },
    { words:words(additionalNotes), weight:1.4 },
    { words:words(generalInstructions), weight:0.65 },
  ]
  return CONCEPTS.flatMap(concept=>{
    const strength=sources.reduce((total,source)=>{
      const hits=concept.roots.filter(root=>source.words.some(token=>wordMatches(token,root)))
      return total + Math.min(3,hits.length)*source.weight
    },0)
    return strength > 0 ? [{...concept,strength}] : []
  }).sort((a,b)=>b.strength-a.strength)
}

function relevance(test,signals,reportWords) {
  const measured=new Set(test.measurementAxes || [])
  const topics=new Set(test.topics || [])
  const analysis=new Set(test.analysisAxes || [])
  const matched=[]
  let score=0
  for(const signal of signals){
    const variants=RELATED[signal.key] || [signal.key]
    const has=values=>variants.some(key=>values.has(key))
    const quality=has(measured)?5:has(topics)?3:has(analysis)?1.65:0
    if(quality>0){
      score+=quality*signal.strength
      matched.push({signal,quality})
    }
  }
  const titleWords=words(test.title).filter(token=>token.length>=4&&
    /^[a-zа-яё]+$/u.test(token)&&!STOP.has(token))
  const overlap=titleWords.filter(word=>
    reportWords.some(other=>other===word||(word.length>=6&&other.startsWith(word))))
  if(overlap.length)score+=Math.min(3,overlap.length)*2
  const bonus=Number.isFinite(test.durationMinutes)&&test.durationMinutes<=6?0.35:0
  const main=matched.sort((a,b)=>b.quality*b.signal.strength-a.quality*a.signal.strength)
  return {score:score?score+bonus:0,concepts:main.map(item=>item.signal.key),
    reasonRu:main.slice(0,2).map(item=>item.signal.ru).join(', '),
    reasonEn:main.slice(0,2).map(item=>item.signal.en).join(', ')}
}

/**
 * Suggest up to five genuinely matching, already-eligible tests. The owner
 * alone ticks boxes to attach them; this function never mutates selectedKeys.
 * If text lacks matching themes it returns no arbitrary recommendations.
 */
export function suggestReportTests({analysis='',additionalNotes='',generalInstructions='',options=[],locale='en'}={}) {
  if(!Array.isArray(options)||!options.length)return []
  const signals=conceptSignals({analysis,additionalNotes,generalInstructions})
  const reportWords=words([analysis,additionalNotes,generalInstructions].join(' '))
  if(!reportWords.length)return []
  const candidates=options.filter(item=>typeof item?.key==='string'&&
      typeof item?.title==='string'&&typeof item?.href==='string'&&
      item.href.startsWith('/') && !item.href.startsWith('//'))
    .map(item=>({...item,...relevance(item,signals,reportWords)}))
    .filter(item=>item.score>0)
  const picked=[]
  const pickedPrimaryConcepts=[]
  const used=new Set()
  while(picked.length<REPORT_TEST_SUGGESTION_COUNT&&candidates.length){
    candidates.sort((a,b)=>{
      const adjusted=item=>{
        const primary=item.concepts[0] || item.key
        // Returned suggestion objects deliberately omit the internal concept
        // arrays. Count already-picked concepts in a separate private list.
        const count=pickedPrimaryConcepts.filter(value=>value===primary).length
        return item.score - count*2.8
      }
      return adjusted(b)-adjusted(a) ||
        (a.durationMinutes??90)-(b.durationMinutes??90) ||
        a.title.localeCompare(b.title,locale==='ru'?'ru':'en')
    })
    const item=candidates.shift()
    if(used.has(item.key))continue
    used.add(item.key)
    pickedPrimaryConcepts.push(item.concepts[0]||item.key)
    picked.push({
      key:item.key,title:item.title,href:item.href,startLocale:item.startLocale,
      reason:item.concepts.length ?
        (locale==='ru'?'Темы отчёта: ':'Report themes: ')+(locale==='ru'?item.reasonRu:item.reasonEn) :
        (locale==='ru'?'Совпадение с названием теста':'Matches language in the report'),
    })
  }
  return picked
}
