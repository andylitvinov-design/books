import {compactInterpretationInsert} from './compact-interpretation-sql.mjs'
// Offline generator only; no database connection or credential use.
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import {validInterpretationRecord} from '../lib/assessments/interpretation-record-integrity.js'
const [exportDir, outDir]=process.argv.slice(2)
if(!exportDir||!outDir)throw Error('Usage: node prepare... <export-dir> <output-dir>')
const rows=JSON.parse(await fs.readFile(path.join(exportDir,'records.json'),'utf8'))
const manifest=JSON.parse(await fs.readFile(path.join(exportDir,'manifest.json'),'utf8'))
if(manifest.sourceTreeVerified!==true && process.env.HH_ALLOW_DRAFT_SEED!=='1')throw Error('Unverified draft source: no production seed allowed')
if(manifest.sourceTreeVerified===true && manifest.draft!==false)throw Error('Verified production export must explicitly be non-draft')
const keys=new Set()
for(const row of rows){const key=[row.assessment_version_id,row.interpretation_version,row.report_locale].join(':');if(keys.has(key))throw Error('Duplicate identity');keys.add(key);if(!validInterpretationRecord(row,{definitionId:row.assessment_version_id,contentHash:row.definition_content_hash,interpretationVersion:row.interpretation_version,reportLocale:row.report_locale}))throw Error('Invalid record '+key);const entry=manifest.records.find(r=>r.assessment_version_id===row.assessment_version_id&&r.report_locale===row.report_locale&&r.interpretation_version===row.interpretation_version);if(!entry||entry.payload_sha256!==row.payload_sha256||entry.definition_content_hash!==row.definition_content_hash||row.source_commit!==manifest.sourceCommit||row.interpretation_version!==manifest.interpretationVersion)throw Error('Manifest mismatch')}
if(rows.length!==manifest.recordCount||manifest.records.length!==rows.length)throw Error('Manifest coverage mismatch')
await fs.mkdir(outDir,{recursive:true})
// Clear prior approval outputs before generating a new candidate; failed runs cannot retain stale runtime approval.
for(const name of ['interpretation-approved-digests.js','approved-digests-manifest.json','interpretation-registry-release.json'])await fs.rm(path.join(outDir,name),{force:true})
const escape=x=>"'"+String(x).replaceAll("'","''")+"'"
const statements=rows.map(row=>`INSERT INTO app.assessment_interpretation_versions (assessment_version_id,interpretation_version,report_locale,definition_content_hash,provenance,source_commit,rules_engine_version,payload_sha256,payload_canonical,payload) SELECT ${escape(row.assessment_version_id)}::uuid,${escape(row.interpretation_version)},${escape(row.report_locale)},${escape(row.definition_content_hash)},${escape(JSON.stringify(row.provenance))}::jsonb,${escape(row.source_commit)},${escape(row.rules_engine_version)},${escape(row.payload_sha256)},v.payload_canonical,v.payload_canonical::jsonb FROM (VALUES (${escape(row.payload_canonical)})) AS v(payload_canonical);`)
// Plain INSERT only: conflicts abort; no UPSERT or alteration of existing records.
const testGuard = manifest.sourceTreeVerified===true ? '' : "-- DRAFT / PGLITE TEST ONLY. Refuses every regular PostgreSQL target.\nDO $isolated$ BEGIN IF pg_catalog.strpos(pg_catalog.version(), 'PGlite 0.5.10') = 0 OR pg_catalog.strpos(pg_catalog.version(), 'wasm32-unknown-emscripten') = 0 THEN RAISE EXCEPTION 'DRAFT_INTERPRETATION_SEED_PGLITE_ONLY'; END IF; END $isolated$;\n"
const compact=compactInterpretationInsert(rows)
const sql="BEGIN;\nSET LOCAL standard_conforming_strings = on;\n"+testGuard+compact.sql+'\nCOMMIT;\n'
await fs.writeFile(path.join(outDir,'insert-all.sql'),sql)
// Optional bounded transport: each immutable batch is its own transaction. Complete
// registry activation is a separate step only after every expected digest is read back.
const batchLimit=Number(process.env.HH_SEED_BATCH_MAX_BYTES||524288)
if(!Number.isSafeInteger(batchLimit)||batchLimit<1024)throw Error('Invalid batch byte bound')
const prefix="BEGIN;\nSET LOCAL standard_conforming_strings = on;\n"+testGuard,suffix='\nCOMMIT;\n'
const batches=[];let indexes=[],parts=[]
const flush=()=>{if(parts.length){batches.push({indexes,sql:prefix+parts.join('\n')+suffix});indexes=[];parts=[]}}
for(let i=0;i<statements.length;i++){
 if(Buffer.byteLength(prefix+statements[i]+suffix)>batchLimit)throw Error('Single immutable record exceeds batch bound; increase bound or use approved native import: '+rows[i].assessment_version_id)
 if(parts.length&&Buffer.byteLength(prefix+[...parts,statements[i]].join('\n')+suffix)>batchLimit)flush()
 indexes.push(i);parts.push(statements[i])
}
flush()
const batchDir=path.join(outDir,'batches');await fs.rm(batchDir,{recursive:true,force:true});await fs.mkdir(batchDir)
const batchManifest=[]
for(let i=0;i<batches.length;i++){
 const batch=batches[i],filename=String(i+1).padStart(3,'0')+'.sql';await fs.writeFile(path.join(batchDir,filename),batch.sql)
 batchManifest.push({file:'batches/'+filename,bytes:Buffer.byteLength(batch.sql),sha256:'sha256:'+crypto.createHash('sha256').update(batch.sql).digest('hex'),records:batch.indexes.map(index=>{const row=rows[index];return{assessment_version_id:row.assessment_version_id,interpretation_version:row.interpretation_version,report_locale:row.report_locale,definition_content_hash:row.definition_content_hash,payload_sha256:row.payload_sha256}})})
}
await fs.writeFile(path.join(outDir,'batch-manifest.json'),JSON.stringify({sourceCommit:manifest.sourceCommit,interpretationVersion:manifest.interpretationVersion,draft:manifest.sourceTreeVerified!==true,maxBatchBytes:batchLimit,rowCount:rows.length,batches:batchManifest,execution:'Preflight absence/conflicts globally. INSERT only. After each batch read exact identities and hashes. Unknown outcome: read back first; never blind retry or upsert. Stop on conflict. Do not activate until complete registry readback.'},null,2))

await fs.writeFile(path.join(outDir,'seed-manifest.json'),JSON.stringify({sourceCommit:manifest.sourceCommit,interpretationVersion:manifest.interpretationVersion,draft:manifest.sourceTreeVerified!==true,rowCount:rows.length,encoding:'canonical-json-fragments.v1',dictionaryEntries:compact.dictionaryEntries,sqlSha256:'sha256:'+crypto.createHash('sha256').update(sql).digest('hex'),note:'Execute as one transaction only after schema and exact payload approval. No partial upsert/retry. Re-read all stored hashes afterward.'},null,2))
// The C2 runtime allowlist is created only from a fully verified C1 source export.
// Draft test data must never become executable runtime approval, even with the test SQL flag.
if(manifest.sourceTreeVerified===true){
 const approvals=Object.fromEntries(rows.map(row=>[JSON.stringify([row.assessment_version_id,row.definition_content_hash,row.interpretation_version,row.report_locale]),row.payload_sha256]).sort(([a],[b])=>a.localeCompare(b)))
 const approvalSource='// Generated from verified source commit '+manifest.sourceCommit+'. Do not edit individual digests.\nexport const APPROVED_INTERPRETATION_DIGESTS = Object.freeze('+JSON.stringify(approvals,null,2)+')\n'
 await fs.writeFile(path.join(outDir,'interpretation-approved-digests.js'),approvalSource)
 await fs.writeFile(path.join(outDir,'interpretation-registry-release.json'),JSON.stringify({status:'approved',sourceCommit:manifest.sourceCommit,interpretationVersion:manifest.interpretationVersion,seedPath:'supabase/seeds/assessment-interpretations-'+manifest.interpretationVersion+'.sql',recordCount:rows.length,seedSha256:'sha256:'+crypto.createHash('sha256').update(sql).digest('hex')},null,2)+'\n')
 await fs.writeFile(path.join(outDir,'approved-digests-manifest.json'),JSON.stringify({sourceCommit:manifest.sourceCommit,interpretationVersion:manifest.interpretationVersion,rowCount:rows.length,sha256:'sha256:'+crypto.createHash('sha256').update(approvalSource).digest('hex'),records:manifest.records},null,2))
}else{
 // Avoid leaving stale production approvals if a directory is reused for an isolated draft.
 await fs.rm(path.join(outDir,'interpretation-approved-digests.js'),{force:true})
 await fs.rm(path.join(outDir,'approved-digests-manifest.json'),{force:true})
 await fs.rm(path.join(outDir,'interpretation-registry-release.json'),{force:true})
}
console.log({rowCount:rows.length,bytes:Buffer.byteLength(sql),runtimeApprovalGenerated:manifest.sourceTreeVerified===true})
