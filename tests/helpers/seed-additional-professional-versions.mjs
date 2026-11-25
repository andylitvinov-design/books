// Actual source-cleared immutable forms in the isolated CI registry only.
import { ADDITIONAL_PROFESSIONAL_DEFINITIONS } from '../../data/assessments/professional-additions-2026.js'
import { canonicalJSON } from '../../lib/assessments/contracts.js'
export async function seedAdditionalProfessionalTestVersions(db){
 const url=new URL(process.env.HH_TEST_ADMIN_DATABASE_URL||'http://invalid')
 if(process.env.CI !== 'true'||process.env.HH_APP_TEST_RUNTIME !== 'isolated'||process.env.VERCEL||
    !['localhost','127.0.0.1'].includes(url.hostname)||url.pathname !== '/hh_app_test')
  throw new Error('Isolated loopback test database required')
 if(ADDITIONAL_PROFESSIONAL_DEFINITIONS.length!==5)throw new Error('EXPECTED_FIVE_INSTRUMENTS')
 const rows=ADDITIONAL_PROFESSIONAL_DEFINITIONS.map(d=>{
  if(!/^[0-9a-f-]{36}$/.test(d.id)||!/^sha256:[0-9a-f]{64}$/.test(d.contentHash)||
     d.instrumentLocale!=='en'||d.version!=='v1')throw new Error('INVALID_PROFESSIONAL_SOURCE_VERSION')
  return {id:d.id,definition_key:d.key,definition_version:d.version,instrument_locale:d.instrumentLocale,
    translation_version:d.translationVersion,definition:d,questions:d.questions,
    answer_schema:{type:'integer',minimum:d.answerScale.min,maximum:d.answerScale.max},
    scoring_key:d.scoringKey,scoring_version:d.scoringVersion,result_schema:{version:d.resultVersion},
    timeframe:d.timeframe,source_metadata:d.source,content_hash:d.contentHash,status:'published'}
 })
 await db.query('begin')
 try{
  for(const row of rows){
   const check=await db.query('select id from app.assessment_versions where id=$1 or content_hash=$2 or (definition_key=$3 and definition_version=$4 and instrument_locale=$5)',[row.id,row.content_hash,row.definition_key,row.definition_version,row.instrument_locale])
   if(check.rows.length)throw new Error('HH_PROFESSIONAL_FIXTURE_CONFLICT')
  }
  for(const row of rows){
   const cols=Object.keys(row)
   const params=cols.map(k=>['definition','questions','answer_schema','result_schema','source_metadata'].includes(k)?JSON.stringify(row[k]):row[k])
   await db.query('insert into app.assessment_versions ('+cols.join(',')+') values ('+cols.map((_,i)=>'$'+(i+1)).join(',')+')',params)
   const stored=(await db.query('select * from app.assessment_versions where id=$1',[row.id])).rows[0]
   if(!stored||cols.some(k=>canonicalJSON(stored[k])!==canonicalJSON(row[k])))
     throw new Error('HH_PROFESSIONAL_FIXTURE_READBACK_MISMATCH')
  }
  await db.query('commit')
 }catch(e){await db.query('rollback');throw e}
}
