import part1 from '../../data/assessments/research-directory-2026/chunk-01.json' with { type: 'json' }
import part2 from '../../data/assessments/research-directory-2026/chunk-02.json' with { type: 'json' }
import part3 from '../../data/assessments/research-directory-2026/chunk-03.json' with { type: 'json' }
import part4 from '../../data/assessments/research-directory-2026/chunk-04.json' with { type: 'json' }
import part5 from '../../data/assessments/research-directory-2026/chunk-05.json' with { type: 'json' }
import part6 from '../../data/assessments/research-directory-2026/chunk-06.json' with { type: 'json' }
import part7 from '../../data/assessments/research-directory-2026/chunk-07.json' with { type: 'json' }
import part8 from '../../data/assessments/research-directory-2026/chunk-08.json' with { type: 'json' }
import part9 from '../../data/assessments/research-directory-2026/chunk-09.json' with { type: 'json' }
import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { MIND_BODY_MONITOR_REGISTRY } from '../../data/assessments/mind-body-monitor-registry.js'

// Research metadata only: NO item texts, response options, scoring keys,
// normative tables, patient data, or clinical diagnostic cutoffs are imported.
const KNOWN_KEYS = new Set([...MONITORING_CATALOG, ...MIND_BODY_MONITOR_REGISTRY].map(v => v.key))
const NORMALIZE = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim()
const SAFE_LINK = link => typeof link === 'string' && /^https:\/\/[^/\s]+(?:\/[^\s]*)?$/i.test(link) ? link : null
const sourceRows = [part1, part2, part3, part4, part5, part6, part7, part8, part9].flat()
const seen = new Set()
export const RESEARCH_CATALOGUE = Object.freeze(sourceRows.map(cols => {
  const key = cols[0]
  if (!/^[a-z0-9][a-z0-9._-]+$/i.test(key) || seen.has(key))
    throw Error('Duplicate/invalid psychometric research key: '+key)
  seen.add(key)
  return Object.freeze({
    key, title: cols[1], acronym: cols[2], area: cols[3], category: cols[4],
    itemCount: cols[5], measuredDomains: cols[6], rightsStatus: cols[7],
    access: 'research_only', sourceUrl: SAFE_LINK(cols[9]),
    targetPopulation: cols[10], evidenceNote: cols[11], safetyNote: cols[12],
    // External publication/translation is NOT an item-specific independent
    // validation audit, and is NOT a digital commercial use license.
    psychometricStatus: 'pending_exact_edition_review',
    commercialDigitalRightsCleared: false,
    alreadyInCoreIndex: KNOWN_KEYS.has(key),
  })
}))
export const RESEARCH_CATALOGUE_TOTAL = RESEARCH_CATALOGUE.length
export const RESEARCH_DISCOVERY_TOTAL = RESEARCH_CATALOGUE.filter(r => !r.alreadyInCoreIndex).length
if (RESEARCH_CATALOGUE_TOTAL !== 2973)
  throw Error('Research catalogue import incomplete: '+RESEARCH_CATALOGUE_TOTAL+'/2973')
const queryIndex = RESEARCH_CATALOGUE.map(row => NORMALIZE(
  [row.key,row.title,row.acronym,row.area,row.category,row.measuredDomains,row.targetPopulation].join(' ')
))
// Presentation translations are NOT validated test editions. These curated query
// aliases translate public search *intent* only, never instrument contents,
// scoring or permission status. Keep this explicit rather than translating all
// source text dynamically (which would conflate research language with UI).
const QUERY_CONCEPTS = Object.freeze([
  ['anxiety', ['тревога','тревожность','тревожн','ansiedad','ansioso','ansiosa']],
  ['stress', ['стресс','стрес','estres','estrés','tension','tensión']],
  ['depression', ['депрессия','депрессивность','депрессивн','depresion','depresión','depresivo']],
  ['sleep', ['сон','сна','сне','бессонница','sueno','sueño','insomnio']],
  ['burnout', ['выгорание','выгор','agotamiento']],
  ['trauma', ['травма','травмы','травмат','trauma']],
  ['attachment', ['привязанность','привязан','apego']],
  ['relationship', ['отношения','отношений','relaciones','relacion','relación']],
  ['emotion', ['эмоции','эмоция','эмоциональный','эмоцион','emocion','emociones','emoción']],
  ['mindfulness', ['осознанность','осознан','atencionplena','atenciónplena','mindfulness']],
  ['personality', ['личность','личности','personalidad']],
  ['coping', ['копинг','совладание','совлада','afrontamiento']],
  ['resilience', ['устойчивость','устойчив','резильентность','resiliencia']],
  ['attention', ['внимание','внимания','atencion','atención']],
  ['child', ['дети','ребенок','ребёнок','ребенка','ребёнка','niño','niña','nino','nina','infancia']],
  ['esteem', ['самооценка','самооцен','autoestima']],
  ['empathy', ['эмпатия','эмпати','empatia','empatía']],
  ['motivation', ['мотивация','мотивац','motivacion','motivación']],
  ['fatigue', ['усталость','утомление','cansancio','fatiga']],
  ['pain', ['боль','боли','dolor']],
  ['anger', ['гнев','злость','ira','enfado']],
  ['fear', ['страх','страхи','miedo']],
  ['body', ['тело','телесность','телесн','cuerpo','corporal']],
  ['resource', ['ресурсы','ресурс','recursos','recurso']],
  ['therap', ['терапия','терапевт','психотерапия','психотерапевт','terapia','terapeuta','psicoterapia']],
  ['meaning', ['смысл','смысла','sentido']],
])
const conceptTerm = token => {
  for (const [canonical, labels] of QUERY_CONCEPTS) {
    if (labels.some(label => {
      const norm = NORMALIZE(label)
      return norm === token || (token.length >= 4 && norm.length > token.length && norm.startsWith(token))
    })) return canonical
  }
  return token
}

const safePage = (value,max) => Math.max(1,Math.min(max,Number.parseInt(value,10)||1))
export function searchResearchCatalogue({q='',page=1,pageSize=12}={}) {
  const query = NORMALIZE(String(q).slice(0,120))
  const terms=query.split(/\s+/).filter(Boolean).map(conceptTerm)
  const results=[]
  for(let i=0;i<RESEARCH_CATALOGUE.length;i++){
    const row=RESEARCH_CATALOGUE[i]
    if(row.alreadyInCoreIndex)continue
    if(terms.length && !terms.every(term=>queryIndex[i].includes(term)))continue
    results.push(row)
  }
  const limit=safePage(pageSize,24)
  const total=results.length
  const pages=Math.max(1,Math.ceil(total/limit))
  const safe=safePage(page,pages)
  return Object.freeze({
    total, page:safe, pageSize:limit, pages,
    sourceCount:RESEARCH_CATALOGUE_TOTAL, uniqueResearchExtras:RESEARCH_DISCOVERY_TOTAL,
    results:results.slice((safe-1)*limit,safe*limit),
  })
}
