// Build-time extraction from the reviewed HH-original hypotheses; not norms.
import {TYPE_KEYS,SOCIONICS_TYPES,SOCIONICS_PAIRS,POLARITY,LABELS,personalityTypeHypothesis} from '../lib/assessments/personality-type-interpretation.js'
export function preparePersonalityRules(result,locale) {
  const kind=TYPE_KEYS[result.definitionKey]
  if(!kind)return null
  const prefix='trait.hh_'+kind+'.', labels=LABELS[kind]
  const probe=values=>personalityTypeHypothesis({...result,dimensions:result.dimensions.map(d=>({...d,value:values[d.key.slice(prefix.length)]??d.min}))},locale)
  const baseline=probe({})
  if(kind==='socionics') {
    const values=Object.fromEntries(SOCIONICS_PAIRS.flatMap(([left,right])=>[[left,20],[right,4]]))
    const far=probe(values),near=probe({...values,e:5,i:4})
    const types=Object.fromEntries(Object.entries(SOCIONICS_TYPES).map(([key,t])=>[key,{code:t.code,title:t[locale]}]))
    const first=Object.values(types).find(t=>t.code===far.code),alternative=Object.values(types).find(t=>t.code===near.possibleCodes[1])
    return{kind,prefix,pairs:SOCIONICS_PAIRS,polarity:POLARITY,types,nearDifference:2,
      headlinePrefix:far.headline.slice(0,-(first.code+' — '+first.title).length),noMatchHeadline:baseline.headline,
      descriptionNear:baseline.description,descriptionFar:far.description,tiedAlternatives:baseline.alternatives,
      alternativePrefix:near.alternatives[0].slice(0,-(alternative.code+' — '+alternative.title).length),warning:baseline.warning}
  }
  const names=Object.fromEntries(Object.entries(labels).map(([key,parts])=>[key,parts[locale==='ru'?1:0]]))
  const[first,second]=Object.keys(names),max=kind==='disc'?25:20
  const far=probe({[first]:max}),near=probe({[first]:max,[second]:max-1})
  return{kind,prefix,labels:names,nearDifference:2,tiedHeadline:baseline.headline,
    headlinePrefix:far.headline.slice(0,-names[first].length),description:baseline.description,
    alternativePrefix:near.alternatives[0].slice(0,-names[second].length),warning:baseline.warning}
}
