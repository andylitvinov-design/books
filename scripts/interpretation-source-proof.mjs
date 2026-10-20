import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import {fileURLToPath} from 'node:url'
// These C2-generated artifacts are data outputs, never template/scorer inputs.
const generatedReleasePaths=new Set(['lib/assessments/interpretation-approved-digests.js','data/assessments/interpretation-registry-release.json','supabase/seeds/assessment-interpretations-2026-10-17.v1.sql'])
// Keep explicit payload provenance broader than the numeric compiler's edit list.
// New semantic modules automatically participate; generated C2 outputs do not.
export async function interpretationSourceHashes(root) {
 const names=new Set(['scripts/export-assessment-interpretations.mjs','scripts/interpretation-source-proof.mjs','scripts/prepare-interpretation-seed.mjs','scripts/compact-interpretation-sql.mjs','package.json','package-lock.json'])
 for(const folder of ['lib/assessments','data/assessments'])for(const file of await fs.readdir(path.join(root,folder),{recursive:true}))if(file.endsWith('.js')&&!generatedReleasePaths.has(folder+'/'+file))names.add(folder+'/'+file)
 const hashes={}
 for(const name of [...names].sort())hashes[name]='sha256:'+crypto.createHash('sha256').update(await fs.readFile(path.join(root,name))).digest('hex')
 return hashes
}
export async function verifyInterpretationSource({root,sourceCommit,proofInput,executingExporter,executingStorage}) {
 const proof=proofInput
 if(proof.commit!==sourceCommit||!Array.isArray(proof.files))throw Error('Source tree manifest mismatch')
 const required=['lib/assessments/interpretation-registry.js','lib/assessments/interpretation-context.js','lib/assessments/definitions.js','lib/assessments/scoring.js','lib/assessments/interpretation-storage.js','lib/assessments/ipip-report-locales.js','scripts/export-assessment-interpretations.mjs','scripts/interpretation-source-proof.mjs','scripts/prepare-interpretation-seed.mjs','scripts/compact-interpretation-sql.mjs','package.json','package-lock.json']
 for(const folder of ['lib/assessments','data/assessments'])for(const file of await fs.readdir(path.join(root,folder),{recursive:true}))if(file.endsWith('.js')&&!generatedReleasePaths.has(folder+'/'+file))required.push(folder+'/'+file)
 for(const file of required)if(!proof.files.some(f=>f.path===file))throw Error('Missing source proof '+file)
 for(const [local,registered] of [[fileURLToPath(import.meta.url),'scripts/interpretation-source-proof.mjs'],[executingExporter,'scripts/export-assessment-interpretations.mjs'],[executingStorage,'lib/assessments/interpretation-storage.js']])if((await fs.readFile(local,'utf8'))!==(await fs.readFile(path.join(root,registered),'utf8')))throw Error('Executing builder differs from pinned source '+registered)
 for(const file of proof.files){if(generatedReleasePaths.has(file.path))continue;const bytes=await fs.readFile(path.join(root,file.path));const blob=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');if(blob!==file.sha)throw Error('Source blob mismatch '+file.path)}
 return true
}
