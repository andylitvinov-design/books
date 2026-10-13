// Offline audit of public prepared content. Uses synthetic endpoints, never client data.
import {readFileSync,writeFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {ASSESSMENT_DEFINITIONS,getAssessmentDefinition} from '../lib/assessments/definitions.js'
import {MONITORING_CATALOG} from '../data/assessments/catalog.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {resolveStoredInterpretation,STORED_INTERPRETATION_VERSION as version} from '../lib/assessments/stored-interpretation.js'
const bytes=readFileSync(new URL('../data/assessment-interpretations/'+version+'.json.gz',import.meta.url)),decoded=gunzipSync(bytes),rows=JSON.parse(decoded).records
const active=MONITORING_CATALOG.filter(c=>c.startable), matrix=[]
for(const c of active){const d=ASSESSMENT_DEFINITIONS.find(d=>d.key===c.key&&d.version===c.version&&d.instrumentLocale==='en');if(!d)throw Error(c.key)
 for(const locale of ['en','ru']){const row=rows.find(r=>r.definitionId===d.id&&r.uiLocale===locale),result=scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,q.min??d.answerScale.min]))),report=resolveStoredInterpretation(result,row.payload,locale,row.payloadHash);if(report.status!=='available')throw Error(c.key)
 for(const s of report.sections)matrix.push({testKey:c.key,dimensionKey:s.key,uiLocale:locale,definitionId:d.id,definitionVersion:d.version,instrumentLocale:d.instrumentLocale,interpretationVersion:version,sourceReview:s.explanation?.sourceReview||{status:'preserved-instrument-specific'},bandBasis:s.bandBasis||'traditional',status:s.compact.status,meaning:s.compact.meaning,recommendation:s.compact.recommendation,nextStep:s.compact.nextStep,about:report.presentation.about,course:s.compact.course,calculation:s.explanation?.calculation||null,anchors:s.explanation?.anchors||null})
 }}
const matches=new Set(matrix.filter(r=>r.course).map(r=>r.testKey)),stats={version,recordCount:rows.length,runnableKeys:active.length,scaleLocaleSlots:matrix.length,relatedGeneralPracticeKeys:matches.size,noRelatedPracticeKeys:active.length-matches.size,directPersonalisedOrAiCourseKeys:0,gzipSHA256:createHash('sha256').update(bytes).digest('hex'),decodedSHA256:createHash('sha256').update(decoded).digest('hex')}
writeFileSync(new URL('../docs/assessments/2026-10-12-compact-coverage.json',import.meta.url),JSON.stringify({stats,note:'Public questionnaire identities and synthetic minimum-score examples only. Course matches are existing general-practice tracks, not AI-generated or score-prescribed programmes.',matrix},null,2)+'\n')
const examples=[]
for(const key of ['cbi-personal','phq-9','erq']){const d=getAssessmentDefinition(key,'v1','en'),answers=Object.fromEntries(d.questions.map((q,i)=>[q.id,key==='cbi-personal'?(i<2?3:2):key==='phq-9'?(i<6?2:0):(i%2?6:3)])),result=scoreAssessment(d,answers)
 for(const locale of ['en','ru']){const row=rows.find(r=>r.definitionId===d.id&&r.uiLocale===locale),report=resolveStoredInterpretation(result,row.payload,locale,row.payloadHash);if(report.status!=='available')throw Error(key);examples.push({synthetic:true,testKey:key,uiLocale:locale,interpretationVersion:version,blocks:[{label:report.presentation.labels[0],scales:report.sections.map(s=>({key:s.key,score:s.value,status:s.compact.status}))},{label:report.presentation.labels[1],scales:report.sections.map(s=>({key:s.key,meaning:s.compact.meaning}))},{label:report.presentation.labels[2],selectedScale:report.sections[0].key,recommendation:report.sections[0].compact.recommendation,course:report.sections[0].compact.course},{label:report.presentation.labels[3],nextStep:report.sections[0].compact.nextStep},{label:report.presentation.labels[4],...report.presentation.about}]})}}
writeFileSync(new URL('../docs/assessments/2026-10-12-compact-synthetic-examples.json',import.meta.url),JSON.stringify(examples,null,2)+'\n');console.log(JSON.stringify(stats,null,2))
