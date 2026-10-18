import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import {verifyInterpretationSource,interpretationSourceHashes} from '../scripts/interpretation-source-proof.mjs'
test('source proof rejects semantic drift and excludes only named generated C2 artifacts',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hh-source-proof-test-'))
 try{
  const names=['lib/assessments/interpretation-registry.js','lib/assessments/interpretation-context.js','lib/assessments/definitions.js','lib/assessments/scoring.js','lib/assessments/interpretation-storage.js','lib/assessments/ipip-report-locales.js','scripts/export-assessment-interpretations.mjs','scripts/interpretation-source-proof.mjs','scripts/prepare-interpretation-seed.mjs','scripts/compact-interpretation-sql.mjs','package.json','package-lock.json','data/assessments/synthetic.js','lib/assessments/interpretation-approved-digests.js','data/assessments/interpretation-registry-release.json','supabase/seeds/assessment-interpretations-2026-10-17.v1.sql']
  const files=[]
  for(const name of names){const target=path.join(root,name);await fs.mkdir(path.dirname(target),{recursive:true});const bytes=name==='scripts/interpretation-source-proof.mjs'?await fs.readFile(new URL('../scripts/interpretation-source-proof.mjs',import.meta.url)):Buffer.from('synthetic-test-only\n');await fs.writeFile(target,bytes);files.push({path:name,sha:crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex')})}
  const args={root,sourceCommit:'0'.repeat(40),proofInput:{commit:'0'.repeat(40),files},executingExporter:path.join(root,'scripts/export-assessment-interpretations.mjs'),executingStorage:path.join(root,'lib/assessments/interpretation-storage.js')}
  assert.equal(await verifyInterpretationSource(args),true)
  const initialHashes=await interpretationSourceHashes(root)
  assert.ok(initialHashes['lib/assessments/interpretation-context.js'])
  assert.ok(initialHashes['data/assessments/synthetic.js'])
  assert.ok(initialHashes['scripts/prepare-interpretation-seed.mjs'])
  assert.ok(initialHashes['scripts/compact-interpretation-sql.mjs'])
  assert.equal(initialHashes['lib/assessments/interpretation-approved-digests.js'],undefined)
  await fs.writeFile(path.join(root,'lib/assessments/new-semantic-guidance.js'),'new prose')
  const expandedHashes=await interpretationSourceHashes(root)
  assert.ok(expandedHashes['lib/assessments/new-semantic-guidance.js'])
  await fs.writeFile(path.join(root,'lib/assessments/new-semantic-guidance.js'),'changed prose')
  assert.notEqual((await interpretationSourceHashes(root))['lib/assessments/new-semantic-guidance.js'],expandedHashes['lib/assessments/new-semantic-guidance.js'])
  await fs.rm(path.join(root,'lib/assessments/new-semantic-guidance.js'))
  for(const name of ['lib/assessments/interpretation-approved-digests.js','data/assessments/interpretation-registry-release.json','supabase/seeds/assessment-interpretations-2026-10-17.v1.sql'])await fs.writeFile(path.join(root,name),'generated C2 replacement')
  assert.equal(await verifyInterpretationSource(args),true)
  await fs.writeFile(path.join(root,'lib/assessments/scoring.js'),'unexpected semantic edit')
  await assert.rejects(verifyInterpretationSource(args),/Source blob mismatch lib\/assessments\/scoring.js/)
  await fs.writeFile(path.join(root,'lib/assessments/scoring.js'),'synthetic-test-only\n')
  await fs.writeFile(path.join(root,'lib/assessments/unregistered.js'),'new semantic module')
  await assert.rejects(verifyInterpretationSource(args),/Missing source proof/)
 }finally{await fs.rm(root,{recursive:true,force:true})}
})
