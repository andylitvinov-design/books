import {verifyInterpretationSource,interpretationSourceHashes} from './interpretation-source-proof.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { parse, version as acornVersion } from 'acorn'
if(acornVersion!=='8.16.0')throw Error('Pinned Acorn 8.16.0 is required')
import { storedInterpretationForDimension } from '../lib/assessments/interpretation-storage.js'
const [sourceRoot, dbPath, outputDir, sourceCommit, requestedInterpretationVersion] = process.argv.slice(2)
if (!sourceRoot || !dbPath || !outputDir || !/^[0-9a-f]{40}$/.test(sourceCommit || '')) throw Error('Usage: node export... <source-root> <technical-db-json> <output> <commit> [interpretation-version]')
const root = path.resolve(sourceRoot)
let sourceTreeVerified=false
if(process.env.HH_SOURCE_TREE_MANIFEST)sourceTreeVerified=await verifyInterpretationSource({root,sourceCommit,proofInput:JSON.parse(await fs.readFile(process.env.HH_SOURCE_TREE_MANIFEST,'utf8')),executingExporter:fileURLToPath(import.meta.url),executingStorage:fileURLToPath(new URL('../lib/assessments/interpretation-storage.js',import.meta.url))})

const load = file => import(pathToFileURL(path.join(root, file)))
const { ASSESSMENT_DEFINITIONS: defs, provenance } = await load('lib/assessments/definitions.js')
const { MONITORING_CATALOG: catalog } = await load('data/assessments/catalog.js')
const { testKindFor } = await load('lib/assessments/test-kinds.js')
const discoveryPolicyHash='sha256:'+crypto.createHash('sha256').update(await fs.readFile(path.join(root,'lib/assessments/test-kinds.js'))).digest('hex')
const { scoreAssessment } = await load('lib/assessments/scoring.js')
const { canonicalJSON } = await load('lib/assessments/contracts.js')
const original = await load('lib/assessments/interpretation-registry.js')
const { STORED_INTERPRETATION_VERSION } = await load('lib/assessments/interpretation-resolution.js')
const interpretationVersion = requestedInterpretationVersion || STORED_INTERPRETATION_VERSION
if (interpretationVersion !== STORED_INTERPRETATION_VERSION) throw Error('Export version must match the source runtime version; never rewrite historical interpretation identities')
const { CFPB_SHORT_2017_LOOKUP } = await load('lib/assessments/cfpb-short-scoring.js')
const db = JSON.parse(await fs.readFile(dbPath, 'utf8'))
const sha = x => 'sha256:' + crypto.createHash('sha256').update(canonicalJSON(x)).digest('hex')
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'hh-interpretation-templates-'))
await fs.cp(path.join(root, 'lib'), path.join(scratch, 'lib'), { recursive: true })
await fs.cp(path.join(root, 'data'), path.join(scratch, 'data'), { recursive: true })
await fs.writeFile(path.join(scratch, 'package.json'), '{"type":"module"}')
// Numeric interpolations only. Branches, validation, scores and thresholds remain executable source code.
// This isolated build step generates data; consumers never execute source fetched from the database.
const substitutions = [
 ['lib/assessments/interpretation-registry.js', new Map([['value', 2], ['dimension.value', 1]])],
 ['lib/assessments/interpretation-context.js', new Map([['n(dimension.value)', 8]])],
]
const sourceHashes = await interpretationSourceHashes(root)
for (const [file, expected] of substitutions) {
 const source = await fs.readFile(path.join(root, file), 'utf8')
 sourceHashes[file] = 'sha256:' + crypto.createHash('sha256').update(source).digest('hex')
 const ast = parse(source, {ecmaVersion: 'latest', sourceType: 'module'})
 const edits=[], counts=new Map()
 function walk(node) {
  if (!node || typeof node !== 'object') return
  if (node.type === 'TemplateLiteral') for (const expr of node.expressions) {
   const expression = source.slice(expr.start,expr.end)
   if (expected.has(expression)) {
    const from=expr.start-2,to=expr.end+1
    if (source.slice(from,to) !== '${'+expression+'}') throw Error('Unexpected template token boundaries')
    edits.push({from,to});counts.set(expression,(counts.get(expression)||0)+1)
   }
  }
  for (const value of Object.values(node)) if(Array.isArray(value)) value.forEach(walk);else if(value && typeof value==='object') walk(value)
 }
 walk(ast)
 for(const [expression,count] of expected) if(counts.get(expression)!==count) throw Error(`Source drift: ${file}: ${expression}: expected ${count}, found ${counts.get(expression)||0}`)
 let changed=source
 for(const edit of edits.sort((a,b)=>b.from-a.from)) changed=changed.slice(0,edit.from)+'{{value}}'+changed.slice(edit.to)
 await fs.writeFile(path.join(scratch,file),changed)
}
const compiled = await import(pathToFileURL(path.join(scratch, 'lib/assessments/interpretation-registry.js')))
function traumaContext(def) {
 if (def.key === 'pcl-5') return {event_timing:'Synthetic one year',criterion_a:'No',exposure_modes:'["Other, please describe"]',death_type:'Natural causes',adult_confirmed:'Yes',event_anchored:'Yes'}
 if (def.key === 'itq-adult') return {event_timing:'1 to 5 years ago',adult_confirmed:'Yes',event_anchored:'Yes'}
 return {}
}
function domain(def, dim) {
 const spec = def.scoring?.dimensions?.find(s => s.key === dim.key)
 if (spec?.method === 'mean') {
  const bounds = spec.items.map(id => def.questions.find(q => q.id === id)).map(q => [q.min ?? def.answerScale.min, q.max ?? def.answerScale.max])
  const min = bounds.reduce((s,x) => s+x[0],0), max = bounds.reduce((s,x) => s+x[1],0)
  return [...new Set(Array.from({length:max-min+1},(_,i)=>Math.round(((min+i)/bounds.length)*(spec.multiplier??1)*100)/100))]
 }
 if (def.scoringKey === 'cfpb-short-2017') return [...new Set(CFPB_SHORT_2017_LOOKUP.flat())].sort((a,b)=>a-b)
 if (def.scoringKey === 'bach-flower') {
  // DP over exact integer answers and occupied section sets, preserving scorer bonuses.
  const questions = def.questions.filter(q => q.remedy === dim.sourceConstruct)
  let states = new Set(['0:0'])
  const weights = {situation:2,character:2,control:3}, bits={situation:1,character:2,control:4}
  for (const q of questions) {
   const next = new Set()
   for(const state of states) {const [points,mask]=state.split(':').map(Number);for(let v=0;v<=5;v++) next.add(`${points+v*weights[q.section]+(v===4?2:v===5?4:0)}:${mask|(v?bits[q.section]:0)}`)}
   states=next
  }
  return [...new Set([...states].map(state=>{const [points,mask]=state.split(':').map(Number);const n=[1,2,4].filter(b=>mask&b).length;return (points+(n===3?8:n===2?4:0)+(mask&4?3:0))/2}))].sort((a,b)=>a-b)
 }
 if (!Number.isInteger(dim.min) || !Number.isInteger(dim.max)) throw Error(`Unmodeled domain: ${def.key}/${dim.key}`)
 return Array.from({length:dim.max-dim.min+1},(_,i)=>dim.min+i)
}
const scaleModel = model => Object.fromEntries(Object.entries(model).filter(([key]) => !['registrySource','interpretationVersion','interpretationSourceCommit'].includes(key)))
const rows=[], failures=[];let parityChecks=0
const sigKeys = ['key','min','max','unit','timeframe','direction','dimensionClass','sourceConstruct','displayKind']
for (const def of defs) {
 const registered=db.find(r=>r.definition_key===def.key&&r.definition_version===def.version&&r.instrument_locale===def.instrumentLocale)
 if (!registered || registered.status!=='published' || canonicalJSON(registered.definition)!==canonicalJSON(def)) throw Error(`DB/source mismatch: ${def.key}/${def.version}/${def.instrumentLocale}`)
 const baseline=scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,q.min??def.answerScale.min])),traumaContext(def))
 const p=provenance(def)
 const identity={assessmentVersionId:p.definitionId,definitionKey:p.definitionKey,definitionVersion:p.definitionVersion,instrumentLocale:p.instrumentLocale,translationVersion:p.translationVersion,scoringKey:p.scoringKey,scoringVersion:p.scoringVersion,resultVersion:p.resultVersion,contentHash:p.contentHash}
 for(const locale of ['en','ru']) {
  const payload={schemaVersion:'hh-interpretation.v1',interpretationVersion,reportLocale:locale,provenance:identity,timeframe:def.timeframe,sourceCommit,rulesEngineVersion:original.INTERPRETATION_RULES_VERSION,rendererStrategy:'finite-domain-template.v1',sourceHashes,templateCompiler:'acorn-8.16.0-numeric-template-v1',catalogActive:catalog.some(c=>c.startable&&c.key===def.key&&c.version===def.version),source:def.source,discoveryClassification:{kind:testKindFor({key:def.key,catalog:catalog.find(c=>c.key===def.key),definition:def}),basis:'discovery-only-not-clinical-validation',policySource:'lib/assessments/test-kinds.js',policySourceCommit:sourceCommit,policySourceSha256:discoveryPolicyHash},dimensions:[]}
  for(const d of baseline.dimensions) {
   const values=domain(def,d),variants=new Map()
   for(const value of values) {
    const dimension={...d,value},result={...baseline,dimensions:baseline.dimensions.map(x=>x.key===d.key?dimension:x)}
    const expected=scaleModel(original.interpretationBandModel(result,dimension,locale))
    const template=scaleModel(compiled.interpretationBandModel(result,dimension,locale))
    if(!expected.verified||!template.verified) throw Error(`Invalid enumerated output: ${def.key}/${d.key}/${value}`)
    const key=canonicalJSON(template)
    if(!variants.has(key)) variants.set(key,{values:[],template})
    variants.get(key).values.push(value)
   }
   payload.dimensions.push({signature:Object.fromEntries(sigKeys.filter(k=>d[k]!==undefined).map(k=>[k,d[k]])),allowedValues:values,mode:[...variants.values()][0].template.basis,source:def.source.scoringUrl||def.source.url||null,variants:[...variants.values()]})
  }
  // Exhaustive finite-domain validation, not arbitrary score sampling.
  for(const d of baseline.dimensions) for(const value of payload.dimensions.find(s=>s.signature.key===d.key).allowedValues) {
   const dimension={...d,value},result={...baseline,dimensions:baseline.dimensions.map(x=>x.key===d.key?dimension:x)}
   const expected=scaleModel(original.interpretationBandModel(result,dimension,locale))
   const actual=storedInterpretationForDimension(payload,result,dimension,locale,interpretationVersion)
   parityChecks++
   if(canonicalJSON(expected)!==canonicalJSON(actual)) {failures.push({key:def.key,version:def.version,locale,dimension:d.key,value});if(failures.length>20)throw Error('Parity failed: '+JSON.stringify(failures))}
  }
  rows.push({assessment_version_id:def.id,interpretation_version:interpretationVersion,report_locale:locale,definition_content_hash:def.contentHash,provenance:identity,source_commit:sourceCommit,rules_engine_version:original.INTERPRETATION_RULES_VERSION,payload_sha256:sha(payload),payload_canonical:canonicalJSON(payload),payload})
 }
}
if(failures.length)throw Error('Parity failed: '+JSON.stringify(failures))
if(rows.length!==db.length*2)throw Error('DB/code coverage mismatch')
await fs.mkdir(outputDir,{recursive:true})
await fs.writeFile(path.join(outputDir,'records.json'),JSON.stringify(rows))
const manifest={schemaVersion:'hh-interpretation-export.v1',sourceCommit,interpretationVersion,draft:!sourceTreeVerified,sourceTreeVerified,scope:'scale-level-interpretationBandModel-not-whole-report',recordCount:rows.length,activeRecordCount:rows.filter(r=>r.payload.catalogActive).length,historicalRecordCount:rows.filter(r=>!r.payload.catalogActive).length,parityChecks,failures,records:rows.map(({assessment_version_id,interpretation_version,report_locale,definition_content_hash,payload_sha256})=>({assessment_version_id,interpretation_version,report_locale,definition_content_hash,payload_sha256}))}
await fs.writeFile(path.join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2))
console.log(JSON.stringify({...manifest,records:undefined},null,2))
await fs.rm(scratch,{recursive:true,force:true})
