const TYPE_KINDS = Object.freeze({'hh-socionics-32':'socionics','hh-enneagram-36':'enneagram','hh-disc-style-20':'disc','hh-temperaments-16':'temperament'})
export const storedPersonalityKind = key => TYPE_KINDS[key] || null
const text = value => typeof value === 'string' && value.trim().length > 0 && !['undefined','null'].includes(value)
export function validStoredPersonalityRules(result,rules) {
  const kind=storedPersonalityKind(result.definitionKey)
  if(!kind || !rules || rules.kind!==kind || rules.prefix!=='trait.hh_'+kind+'.' || rules.nearDifference!==2 || !text(rules.warning))return false
  const keys=result.dimensions.map(d=>d.key.slice(rules.prefix.length)).sort()
  if(kind==='socionics') {
    const pairs=[['e','i'],['n','s'],['l','f'],['j','p']],polarity={e:'E',i:'I',n:'N',s:'S',l:'L',f:'F',j:'J',p:'P'}
    if(JSON.stringify(rules.pairs)!==JSON.stringify(pairs) || Object.keys(polarity).some(key=>rules.polarity?.[key]!==polarity[key]) ||
      JSON.stringify(keys)!==JSON.stringify(pairs.flat().sort()) || !rules.types || Object.keys(rules.types).length!==16)return false
    if(!['headlinePrefix','noMatchHeadline','descriptionNear','descriptionFar','alternativePrefix'].every(key=>text(rules[key])) ||
      !Array.isArray(rules.tiedAlternatives) || !rules.tiedAlternatives.length || !rules.tiedAlternatives.every(text))return false
    return Object.entries(rules.types).every(([key,value])=>/^[EI][NS][LF][JP]$/.test(key)&&value&&/^[A-Z]{3}$/.test(value.code)&&text(value.title))
  }
  return rules.labels && JSON.stringify(Object.keys(rules.labels).sort())===JSON.stringify(keys) && Object.values(rules.labels).every(text) &&
    ['tiedHeadline','headlinePrefix','description','alternativePrefix'].every(key=>text(rules[key]))
}
// Pure selection algorithm. Every displayed name, phrase and parameter comes
// from the exact stored content record, never from an imported text catalogue.
export function resolveStoredPersonalityType(result, rules) {
  const scores=new Map(result.dimensions.map(d=>[d.key.replace(rules.prefix,''),d.value]))
  if(rules.kind==='socionics') {
    const pairs=rules.pairs.map(([left,right])=>({left,right,delta:scores.get(left)-scores.get(right)}))
    if(pairs.some(p=>!Number.isFinite(p.delta)))throw new Error('INVALID_TYPE_RULES')
    const ambiguous=pairs.filter(p=>p.delta===0),near=pairs.filter(p=>Math.abs(p.delta)<=rules.nearDifference)
    const letters=pairs.map(p=>rules.polarity[p.delta>=0?p.left:p.right]).join('')
    const match=ambiguous.length?null:rules.types[letters]||null
    const weakest=[...pairs].sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta))[0]
    const alternativeLetters=[...letters]
    alternativeLetters[pairs.indexOf(weakest)]=rules.polarity[weakest.delta>=0?weakest.right:weakest.left]
    const alternative=rules.types[alternativeLetters.join('')]
    if(!alternative)throw new Error('INVALID_TYPE_RULES')
    return {kind:rules.kind,
      headline:match?rules.headlinePrefix+match.code+' — '+match.title:rules.noMatchHeadline,
      description:near.length?rules.descriptionNear:rules.descriptionFar,
      alternatives:ambiguous.length?rules.tiedAlternatives:near.length?[rules.alternativePrefix+alternative.code+' — '+alternative.title]:[],
      code:match?.code??null,possibleCodes:[...new Set([match?.code,alternative.code].filter(Boolean))],warning:rules.warning}
  }
  const items=Object.entries(rules.labels).map(([key,label])=>({key,label,value:scores.get(key)}))
  if(items.length<2||items.some(row=>!Number.isFinite(row.value)))throw new Error('INVALID_TYPE_RULES')
  items.sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key))
  const[first,second]=items,tie=first.value===second.value,close=first.value-second.value<=rules.nearDifference
  return{kind:rules.kind,headline:tie?rules.tiedHeadline:rules.headlinePrefix+first.label,description:rules.description,
    alternatives:close?[rules.alternativePrefix+second.label]:[],code:tie?null:first.key,
    possibleCodes:close?[first.key,second.key]:[first.key],warning:rules.warning}
}
