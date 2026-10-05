import pg from 'pg'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {CURRENT_STATE_EN_V1,CURRENT_STATE_RU_V1} from '../data/assessments/current-state-v1.js'
import {CURRENT_STATE_EN_V2,CURRENT_STATE_RU_V2} from '../data/assessments/current-state-v2.js'
import {MINI_IPIP_20_EN_V1} from '../data/assessments/mini-ipip-20-en-v1.js'
import {APP_SERVICES,PRACTITIONER_ID} from '../data/app-services.js'
import {canonicalJSON} from '../lib/assessments/contracts.js'
export async function seedApp(db){
 await db.query('begin')
 try{
  for(const definition of [CURRENT_STATE_EN_V1,CURRENT_STATE_RU_V1,CURRENT_STATE_EN_V2,CURRENT_STATE_RU_V2,MINI_IPIP_20_EN_V1]){
   const{contentHash,...source}=definition
   if('sha256:'+createHash('sha256').update(canonicalJSON(source)).digest('hex')!==contentHash)throw new Error('Definition content hash mismatch')
   const existing=(await db.query('select content_hash from app.assessment_versions where id=$1',[definition.id])).rows[0]
   if(existing){if(existing.content_hash!==contentHash)throw new Error('Published definition differs; publish a new version');continue}
   const answerSchema={type:'integer',minimum:definition.answerScale?.min??0,maximum:definition.answerScale?.max??10}
   await db.query('insert into app.assessment_versions(id,definition_key,definition_version,instrument_locale,translation_version,definition,questions,answer_schema,scoring_key,scoring_version,result_schema,timeframe,source_metadata,content_hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',[definition.id,definition.key,definition.version,definition.instrumentLocale,definition.translationVersion,definition,JSON.stringify(definition.questions),answerSchema,definition.scoringKey,definition.scoringVersion,{version:definition.resultVersion},definition.timeframe,definition.source,contentHash])
  }
  await db.query('insert into app.practitioners(id,public_profile) values($1,$2) on conflict(id) do nothing',[PRACTITIONER_ID,{name:'Andrii Litvinov',displayName:'Andy',contactUrl:'https://wa.me/14376066502'}])
  for(const service of APP_SERVICES)await db.query('insert into app.service_offerings(id,practitioner_id,category,localized_copy) values($1,$2,$3,$4) on conflict(id) do nothing',[service.id,PRACTITIONER_ID,service.category,service.copy])
  await db.query('commit')
 }catch(e){await db.query('rollback');throw e}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const url=new URL(process.env.HH_APP_MIGRATION_DATABASE_URL||'http://invalid')
 if(!process.argv.includes('--approved-isolated')||process.env.VERCEL_ENV==='production'||!process.env.HH_APP_APPROVED_DB_HOST||url.hostname!==process.env.HH_APP_APPROVED_DB_HOST)throw new Error('An explicitly approved isolated database is required')
 const db=new pg.Client({connectionString:url.toString(),ssl:['localhost','127.0.0.1'].includes(url.hostname)?false:{rejectUnauthorized:true}})
 await db.connect();try{await seedApp(db);console.log('Three immutable instrument versions and service catalog seeded.')}finally{await db.end()}
}
