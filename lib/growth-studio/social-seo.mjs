const STOPWORDS={
  en:new Set('the and for with from that this your you our are was have has how why what when where into about their they them its can will best more less'.split(' ')),
  ru:new Set('это как для что или при над под про ваш ваша ваши наше наши они она оно его ее кто где когда если без более менее'.split(' ')),
  es:new Set('el la los las de del y o para por con sin que como tu tus su sus una uno unos unas este esta estos estas'.split(' ')),
}
const CTA={
  en:/\b(learn|discover|try|book|join|save|read|explore|start|comment|share|visit|follow|register|download|choose)\b/i,
  ru:/(узнай|изучи|попробуй|запишись|присоединяйся|сохрани|читай|выбери|начни|напиши|поделись|перейди|подпишись|скачай)/i,
  es:/\b(descubre|aprende|prueba|reserva|únete|guarda|lee|explora|comienza|comenta|comparte|visita|sigue|regístrate|descarga|elige)\b/i,
}
const COPY={
  en:{
    title:'Use a specific, readable title of roughly 2–10 words.',
    keywords:'Bring one or more important title terms naturally into the caption.',
    hashtags:'Use 3–8 distinct, relevant hashtags; avoid duplicates and generic tag piles.',
    alt:'Describe what is actually visible in the image in clear, specific alt text.',
    cta:'Add one clear next step, invitation or question.',
  },
  ru:{
    title:'Сделайте название конкретным и читаемым — примерно 2–10 слов.',
    keywords:'Естественно включите в текст один или несколько ключевых терминов из названия.',
    hashtags:'Используйте 3–8 разных тематических хештегов без повторов и длинных наборов общих тегов.',
    alt:'Опишите, что действительно изображено на фото, конкретным альтернативным текстом.',
    cta:'Добавьте один понятный следующий шаг, приглашение или вопрос.',
  },
  es:{
    title:'Use un título específico y claro de aproximadamente 2–10 palabras.',
    keywords:'Incluya de forma natural uno o más términos importantes del título en el texto.',
    hashtags:'Use 3–8 hashtags distintos y relevantes; evite duplicados y listas genéricas.',
    alt:'Describa con precisión lo que realmente aparece en la imagen.',
    cta:'Añada un siguiente paso, una invitación o una pregunta clara.',
  },
}
const tokens=value=>(String(value||'').normalize('NFKC').toLocaleLowerCase()
  .match(/[\p{L}\p{N}]{3,}/gu)||[])
export function analyzeGrowthSocialSeo({title='',caption='',mediaUrl='',mediaAlt='',locale='en'}={}){
  const language=['en','ru','es'].includes(locale)?locale:'en'
  const copy=COPY[language]
  const titleTokens=[...new Set(tokens(title).filter(word=>!STOPWORDS[language].has(word)))].slice(0,6)
  const captionTokens=new Set(tokens(caption))
  const matching=titleTokens.filter(word=>captionTokens.has(word))
  const rawHashtags=Array.from(String(caption||'').matchAll(/#([\p{L}\p{N}_]{2,30})/gu),match=>match[1].toLocaleLowerCase())
  const uniqueHashtags=[...new Set(rawHashtags)]
  const checks=[
    {code:'title',passed:tokens(title).length>=2&&tokens(title).length<=10,points:20,maxPoints:20},
    {code:'keywords',passed:titleTokens.length>0&&matching.length>0,points:matching.length>0?30:0,maxPoints:30},
    {code:'hashtags',passed:uniqueHashtags.length>=3&&uniqueHashtags.length<=8&&rawHashtags.length===uniqueHashtags.length,points:uniqueHashtags.length>=3&&uniqueHashtags.length<=8&&rawHashtags.length===uniqueHashtags.length?20:0,maxPoints:20},
    {code:'cta',passed:(CTA[language]||CTA.en).test(String(caption||'')),points:(CTA[language]||CTA.en).test(String(caption||''))?15:0,maxPoints:15},
  ]
  const hasMedia=Boolean(String(mediaUrl||'').trim())
  if(hasMedia){
    const alt=String(mediaAlt||'').trim()
    const descriptive=alt.length>=20&&alt.length<=200&&
      !/^(image|photo|picture|изображение|фото|imagen|fotografía)\s*\d*$/i.test(alt)
    checks.push({code:'alt',passed:descriptive,points:descriptive?15:0,maxPoints:15})
  }
  const earned=checks.reduce((sum,check)=>sum+check.points,0)
  const possible=checks.reduce((sum,check)=>sum+check.maxPoints,0)
  const recommendations=checks.filter(check=>!check.passed).map(check=>copy[check.code])
  return {
    score:possible?Math.round(earned/possible*100):0,
    outOf:100,
    checks,
    recommendations,
    titleKeywordCount:titleTokens.length,
    matchedKeywordCount:matching.length,
    hashtagCount:uniqueHashtags.length,
    hasMedia,
    disclaimer:language==='ru'
      ?'Редакционная эвристика, а не оценка алгоритма Instagram и не прогноз охвата.'
      :language==='es'
        ?'Heurística editorial; no mide el algoritmo de Instagram ni predice el alcance.'
        :'Editorial heuristic only; it does not measure Instagram ranking or predict reach.',
  }
}
