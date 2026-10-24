// Private, on-device matching of a client's question to the non-sensitive DB catalog.
// The question itself never leaves the browser for recommendations. Editorial topic
// lexicon and model fit comments come from app_private via authenticated GET.
// Not a diagnosis, sentiment model, LLM call or claim that one coaching method is best.

const fallbackKeys=['tgrow_compass_v1','grow_quick_v1','solution_focus_quick_v1']
const urgentPatterns=[
  // Safety-sensitive sexual coercion and underage exploitation are never routed to a coaching card.
  /\b(?:rape|raped|sexual(?:ly)?\s+assault(?:ed)?|sexual(?:ly)?\s+abus(?:e|ed)|forced\s+sex|sexual\s+coerci\w*|underage\s+sex|sex\s+with\s+a\s+minor|domestic\s+violence)\b/u,
  /(?:изнасил|сексуальн[\p{L}\p{N}]*\s+(?:насили|принужд)|принужд[\p{L}\p{N}]*\s+к\s+сексу|секс[\p{L}\p{N}]*\s+с\s+ребенк|домашн[\p{L}\p{N}]*\s+насили)/u,
  /(?:violacion|abuso\s+sexual|sexo\s+forzado|coaccion\s+sexual|violencia\s+sexual)/u,
  /\b(?:suicid\w*|kill\s+myself|self[- ]harm|immediate\s+danger)\b/u,
  /(?:суицид|самоубийств|убить себя|покончить с собой|прямо сейчас опасн)/u,
  /(?:suicid|quiero morir|hacerme dano|peligro inmediato)/u,
]
const toPlain=value=>(typeof value==='string'?value:'')
const norm=s=>toPlain(s).toLowerCase().replace(/ё/g,'е').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim()
function stemMatch(words,stem){
  const seq=norm(stem).split(' ').filter(Boolean)
  if(!seq.length||(seq.length===1&&seq[0].length<3))return false
  for(let i=0;i<=words.length-seq.length;i++){
    if(seq.every((part,j)=>words[i+j].startsWith(part)))return true
  }
  return false
}
export function coachingQuestionTopics(question,signals=[]){
  const normalized=norm(toPlain(question).slice(0,700))
  const words=normalized.split(' ').filter(Boolean)
  if(!words.length||!Array.isArray(signals))return []
  const matched=[]
  for(const signal of signals){
    if(typeof signal?.tag!=='string'||!signal.stems)continue
    const wordsByLanguage=['en','ru','es'].flatMap(lang=>
      Array.isArray(signal.stems[lang])?signal.stems[lang]:[])
    if(wordsByLanguage.some(stem=>stemMatch(words,stem)))matched.push(signal.tag)
  }
  return [...new Set(matched)].slice(0,8)
}
export function recommendCoachingForQuestion(question,catalog,options={}){
  const clean=toPlain(question).trim().slice(0,600)
  // Unicode NFD strips Cyrillic й's combining breve; screen both original and
  // normalized forms so Russian safety phrases are not silently missed.
  const raw=clean.toLowerCase().replace(/ё/g,'е')
  if(urgentPatterns.some(pattern=>pattern.test(raw)||pattern.test(norm(raw))))return {
    blocked:true,recognized:false,tags:[],suggestions:[],
  }
  const tags=coachingQuestionTopics(clean,catalog?.signals)
  const byModel=new Map((catalog?.models||[]).map(model=>[model.modelKey,model]))
  const duration=Number.isInteger(options.minutes)?Math.min(90,Math.max(5,options.minutes)):20
  const style=options.style==='reflective'?'reflective':'quick'
  const signalMap=new Map((catalog?.signals||[]).map(s=>[s.tag,s]))
  const schemes=(catalog?.schemes||[]).filter(s=>
    typeof s?.schemeKey==='string'&&byModel.has(s.modelKey)&&
    Array.isArray(s.tags)&&Array.isArray(s.questions)&&s.questions.length>0
  )
  const ranked=schemes.map(s=>{
    const matchedTags=s.tags.filter(x=>tags.includes(x))
    const fit=s.minutes<=duration?3:-Math.min(12,s.minutes-duration)
    const semanticScore=matchedTags.reduce((total,tag)=>{
      const signal=signalMap.get(tag)
      const weight=Number.isInteger(signal?.priority)?Math.max(1,Math.min(5,signal.priority)):1
      const rank=Array.isArray(signal?.preferredModels)?signal.preferredModels.indexOf(s.modelKey):-1
      return total+weight*10+(rank===0?8:rank>0?4:0)
    },0)
    const score=semanticScore+fit+(s.style===style?3:0)
    return {schemeKey:s.schemeKey,modelKey:s.modelKey,matchedTags,score,
      fallback:matchedTags.length===0,scheme:s,model:byModel.get(s.modelKey)}
  }).sort((a,b)=>b.score-a.score||b.matchedTags.length-a.matchedTags.length||
    a.scheme.minutes-b.scheme.minutes||a.schemeKey.localeCompare(b.schemeKey))
  const selected=[],used=new Set()
  for(const row of ranked){
    if(!row.matchedTags.length||used.has(row.modelKey))continue
    selected.push(row);used.add(row.modelKey)
    if(selected.length===3)break
  }
  // A short or unrecognized question does not justify claiming personalization.
  // Fill remaining slots with clearly marked alternatives, never fake "matched" tags.
  const optionsByKey=new Map(schemes.map(s=>[s.schemeKey,s]))
  for(const key of fallbackKeys){
    if(selected.length>=3)break
    const s=optionsByKey.get(key)
    if(!s||used.has(s.modelKey))continue
    selected.push({schemeKey:s.schemeKey,modelKey:s.modelKey,
      matchedTags:[],score:0,fallback:true,scheme:s,model:byModel.get(s.modelKey)})
    used.add(s.modelKey)
  }
  for(const s of ranked){
    if(selected.length>=3)break
    if(used.has(s.modelKey))continue
    selected.push({...s,fallback:true,matchedTags:[]})
    used.add(s.modelKey)
  }
  return {blocked:false,recognized:tags.length>0,tags,suggestions:selected.slice(0,3)}
}
