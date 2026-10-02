import {CURRENT_STATE_EN_V1,CURRENT_STATE_RU_V1} from '../../data/assessments/current-state-v1.js'
import {MINI_IPIP_20_EN_V1} from '../../data/assessments/mini-ipip-20-en-v1.js'
import {assertObject,onlyKeys,fail,text,deepFreeze} from './contracts.js'
export const ASSESSMENT_DEFINITIONS=deepFreeze([CURRENT_STATE_EN_V1,CURRENT_STATE_RU_V1,MINI_IPIP_20_EN_V1])
const definitions=new Map(ASSESSMENT_DEFINITIONS.map(d=>[`${d.key}:${d.version}:${d.instrumentLocale}`,d]))
export function getAssessmentDefinition(key,version='v1',locale='en'){const d=definitions.get(`${key}:${version}:${locale}`);if(!d)fail('UNKNOWN_INSTRUMENT');return d}
export function getDefinitionById(id){const d=ASSESSMENT_DEFINITIONS.find(d=>d.id===id);if(!d)fail('UNKNOWN_INSTRUMENT');return d}
export function validateAnswers(definition,answers,{requireComplete=true}={}){
 assertObject(answers);onlyKeys(answers,definition.questions.map(q=>q.id));const result={}
 for(const question of definition.questions){const value=answers[question.id];if(value===undefined||value===null){if(requireComplete&&question.required!==false)fail('REQUIRED_ANSWER');continue}const min=question.min??definition.answerScale?.min,max=question.max??definition.answerScale?.max;if(!Number.isInteger(value)||!Number.isInteger(min)||!Number.isInteger(max)||value<min||value>max)fail('INVALID_ANSWER');result[question.id]=value}
 return result
}
export function validateContext(definition,context={}){onlyKeys(context,definition.optionalContext.map(q=>q.id));return Object.fromEntries(Object.entries(context).map(([key,value])=>[key,text(value,1000)]))}
export function provenance(definition){return{definitionId:definition.id,definitionKey:definition.key,definitionVersion:definition.version,instrumentLocale:definition.instrumentLocale,translationVersion:definition.translationVersion,contentHash:definition.contentHash,scoringKey:definition.scoringKey,scoringVersion:definition.scoringVersion,resultVersion:definition.resultVersion,timeframe:definition.timeframe}}
export function validateProvenance(value){assertObject(value);const def=getAssessmentDefinition(value.definitionKey,value.definitionVersion,value.instrumentLocale);if(Object.entries(provenance(def)).some(([key,part])=>value[key]!==part))fail('INVALID_PROVENANCE');return def}
