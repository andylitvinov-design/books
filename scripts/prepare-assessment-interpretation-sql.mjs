import {STORED_INTERPRETATION_VERSION as version} from '../lib/assessments/stored-interpretation.js'
// Offline release compiler. No database connection or live mutation.
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {canonicalJSON} from '../lib/assessments/contracts.js'
import {preparedInterpretationRecords,assertPreparedRecord} from './seed-assessment-interpretations.mjs'

const digest=text=>createHash('sha256').update(text).digest('hex')
export function interpretationSeedSql(records,{transaction=true}={}) {
 const seen=new Set()
 const entries=records.map(record=>{
  const definition=assertPreparedRecord(record),key=record.definitionId+'/'+record.uiLocale+'/'+record.interpretationVersion
  if(seen.has(key))throw new Error('DUPLICATE_INTERPRETATION_KEY');seen.add(key)
  return {definition,payloadCanonical:canonicalJSON(record.payload),payloadHash:record.payloadHash}
 })
 const json=JSON.stringify(entries),tag='$hh_content_'+digest(json).slice(0,16)+'$'
 if(json.includes(tag)||json.includes('$hh_seed$'))throw new Error('UNSAFE_SQL_DELIMITER')
 return `${transaction?'begin;\n':''}-- Prepared non-personal content only; exact identity/hash; insert-only and repeatable.
lock table app.assessment_interpretation_versions in share row exclusive mode;
do $hh_seed$
declare e jsonb; d jsonb; p jsonb; h text; registered app.assessment_versions%rowtype; prior app.assessment_interpretation_versions%rowtype;
begin
 for e in select value from jsonb_array_elements(${tag}${json}${tag}::jsonb) loop
  d := e->'definition'; p := (e->>'payloadCanonical')::jsonb; h := e->>'payloadHash';
  if h is distinct from 'sha256:' || encode(sha256(convert_to(e->>'payloadCanonical','UTF8')),'hex') then
   raise exception 'INTERPRETATION_PAYLOAD_HASH_MISMATCH';
  end if;
  select * into registered from app.assessment_versions where id=(d->>'id')::uuid for share;
  if not found or registered.status <> 'published' or registered.definition is distinct from d
   or registered.definition_key is distinct from d->>'key' or registered.definition_version is distinct from d->>'version'
   or registered.instrument_locale is distinct from d->>'instrumentLocale' or registered.translation_version is distinct from d->>'translationVersion'
   or registered.content_hash is distinct from d->>'contentHash' or registered.scoring_key is distinct from d->>'scoringKey'
   or registered.scoring_version is distinct from d->>'scoringVersion' or registered.timeframe is distinct from d->>'timeframe'
   or p->'identity' is distinct from jsonb_build_object('definitionId',d->>'id','definitionKey',d->>'key','definitionVersion',d->>'version',
    'instrumentLocale',d->>'instrumentLocale','translationVersion',d->>'translationVersion','contentHash',d->>'contentHash',
    'scoringKey',d->>'scoringKey','scoringVersion',d->>'scoringVersion','resultVersion',d->>'resultVersion','timeframe',d->>'timeframe')
   or p->>'uiLocale' not in ('en','ru') or p->>'interpretationVersion' is distinct from '${version}' then
   raise exception 'REGISTERED_INSTRUMENT_MISMATCH: %',d->>'id';
  end if;
  select * into prior from app.assessment_interpretation_versions
   where assessment_version_id=(d->>'id')::uuid and ui_locale=p->>'uiLocale' and interpretation_version=p->>'interpretationVersion';
  if found then
   if prior.status <> 'published' or prior.payload_hash is distinct from h or prior.payload is distinct from p
    or prior.definition_key is distinct from d->>'key' or prior.definition_version is distinct from d->>'version'
    or prior.instrument_locale is distinct from d->>'instrumentLocale' or prior.translation_version is distinct from d->>'translationVersion'
    or prior.instrument_content_hash is distinct from d->>'contentHash' or prior.scoring_key is distinct from d->>'scoringKey'
    or prior.scoring_version is distinct from d->>'scoringVersion' or prior.result_version is distinct from d->>'resultVersion' then
    raise exception 'IMMUTABLE_INTERPRETATION_CONFLICT: %/%',d->>'id',p->>'uiLocale';
   end if;
  else
   insert into app.assessment_interpretation_versions
    (assessment_version_id,definition_key,definition_version,instrument_locale,translation_version,instrument_content_hash,
     scoring_key,scoring_version,result_version,ui_locale,interpretation_version,payload,payload_hash)
   values ((d->>'id')::uuid,d->>'key',d->>'version',d->>'instrumentLocale',d->>'translationVersion',d->>'contentHash',
    d->>'scoringKey',d->>'scoringVersion',d->>'resultVersion',p->>'uiLocale',p->>'interpretationVersion',p,h);
  end if;
 end loop;
end $hh_seed$;
${transaction?'commit;\n':''}`
}

export async function prepareInterpretationRelease(directory) {
 const records=await preparedInterpretationRecords(),files=[]
 await mkdir(directory,{recursive:true})
 const save=async(name,body,extra={})=>{await writeFile(resolve(directory,name),body);files.push({name,bytes:Buffer.byteLength(body),sha256:digest(body),...extra})}
 await save('01-schema.sql',await readFile(new URL('./sql/assessment-interpretations-schema.sql',import.meta.url),'utf8'))
 await save('02-all-content-atomic.sql',interpretationSeedSql(records),{records:records.length})
 // Optional transport-sized batches. Each is idempotent; a partial set is NOT release-ready.
 for(let i=0;i<records.length;i+=4)await save(`batch-${String(i/4+1).padStart(3,'0')}.sql`,interpretationSeedSql(records.slice(i,i+4)),{records:Math.min(4,records.length-i)})
 const expected=records.map(r=>({id:r.definitionId,locale:r.uiLocale,version:r.interpretationVersion,hash:r.payloadHash,payload:r.payload}))
 const readback=`-- Exact technical content only. Expected/present/matching must all equal 356 before runtime deployment.\nwith expected as (select * from jsonb_to_recordset($hh_expected$${JSON.stringify(expected)}$hh_expected$::jsonb) as e(id uuid,locale text,version text,hash text,payload jsonb))\nselect count(*) expected, count(v.assessment_version_id) present, count(*) filter(where v.status='published' and v.payload_hash=e.hash and v.payload=e.payload\n and v.definition_key=e.payload->'identity'->>'definitionKey' and v.definition_version=e.payload->'identity'->>'definitionVersion'\n and v.instrument_locale=e.payload->'identity'->>'instrumentLocale' and v.translation_version=e.payload->'identity'->>'translationVersion'\n and v.instrument_content_hash=e.payload->'identity'->>'contentHash' and v.scoring_key=e.payload->'identity'->>'scoringKey'\n and v.scoring_version=e.payload->'identity'->>'scoringVersion' and v.result_version=e.payload->'identity'->>'resultVersion') matching\n from expected e left join app.assessment_interpretation_versions v on v.assessment_version_id=e.id and v.ui_locale=e.locale and v.interpretation_version=e.version;\n`
 await save('03-readback.sql',readback)
 const manifest={records:records.length,definitions:new Set(records.map(r=>r.definitionId)).size,liveApplied:false,files}
 await writeFile(resolve(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
 return manifest
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const directory=process.argv[2];if(!directory)throw new Error('Provide an offline output directory; no database will be opened.')
 const manifest=await prepareInterpretationRelease(directory)
 console.log(JSON.stringify({directory,records:manifest.records,definitions:manifest.definitions,files:manifest.files.length,liveApplied:false}))
}
