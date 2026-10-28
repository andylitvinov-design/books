import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire, registerHooks } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

// Execute complete production repository modules with a closed import boundary.
// No database driver, server graph, credentials or network module is loaded.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = process.env.ONS_SOURCE_ROOT || root
const ts = createRequire(resolve(sourceRoot, 'package.json'))('typescript')
const key = 'ons-personal-wellbeing-4'
function load(path, modules) {
  const source = readFileSync(path, 'utf8')
  const compiled = ts.transpileModule(source, {fileName:path, compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const runtime = {exports:{}, Object, Array, JSON, require(specifier) {
    assert.ok(Object.hasOwn(modules,specifier), `Unapproved import ${specifier}`)
    return modules[specifier]
  }}
  vm.runInNewContext(compiled, runtime, {filename:path})
  return runtime.exports
}
const contracts = load(resolve(sourceRoot,'lib/assessments/contracts.js'), {})
const additions = load(resolve(root,'data/assessments/professional-additions-2026.js'), {'../../lib/assessments/contracts.js':contracts})
const catalog = additions.ADDITIONAL_PROFESSIONAL_CATALOG.find(x=>x.key===key)
const definition = additions.ADDITIONAL_PROFESSIONAL_DEFINITIONS.find(x=>x.key===key)
const plain = x => JSON.parse(JSON.stringify(x))
const blocked = new Proxy({}, {get(_,name){throw new Error(`Forbidden dependency call ${String(name)}`)}})
function repository(kind, item) {
  let transactions=0
  const transaction=()=>{ transactions++; throw new Error('TRANSACTION_REACHED') }
  const path=resolve(sourceRoot,`lib/app/${kind==='account'?'repository':'guest-repository'}.js`)
  // Parse import declarations to explicitly deny execution of dependencies not needed
  // for the real startRun pre-transaction guard. Named lookups occur only on use.
  const imports={}
  const ast=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
  for(const stmt of ast.statements) if(ts.isImportDeclaration(stmt)) imports[stmt.moduleSpecifier.text]=blocked
  Object.assign(imports, {
    'server-only':{},
    '../assessments/contracts.js':contracts,
    '../../data/assessments/catalog.js':{monitoringCatalogItem:k=>k===key?item:null},
    '../assessments/definitions.js':{getAssessmentDefinition:(k,v,l)=>{
      assert.equal(k,key); assert.equal(v,'v1'); assert.equal(l,'en'); return definition
    }},
    './database.js':{transaction},
  })
  const repositoryModule=load(path,imports)
  return {repo:kind==='account'?repositoryModule.createAppRepository({}, {transaction}):repositoryModule.createGuestRepository({}), count:()=>transactions}
}
const input={definitionKey:key,definitionVersion:'v1',instrumentLocale:'en',operationId:'00000000-0000-4000-8000-000000000001'}
async function rejectBeforeTransaction(kind,item=catalog) {
  const h=repository(kind,item)
  await assert.rejects(h.repo.startRun({},input), e=>e.code===(kind==='account'?'TEST_UNAVAILABLE':'GUEST_TEST_UNAVAILABLE'))
  assert.equal(h.count(),0,'No transaction/query/write, even if a matching registry row exists')
}

test('ONS remains an explicitly held reference, not guest/starter runnable',()=>{
  assert.equal(catalog.startable,false)
  assert.equal(catalog.registrationRequired,true)
  assert.equal(catalog.guestEligible,false)
  assert.equal(catalog.starterEligible,false)
  assert.equal(catalog.rightsStatus,'cleared') // Availability hold is not a new licence conclusion.
  assert.equal(catalog.sourceUrl,definition.source.url)
  for(const locale of ['en','ru','es']) assert.ok(catalog.description[locale])
})
for(const kind of ['account','guest']) test(`${kind} direct-key start rejects before any transaction`,()=>rejectBeforeTransaction(kind))

test('immutable ONS definition remains byte-equivalent in canonical JSON',()=>{
  const hash=createHash('sha256').update(contracts.canonicalJSON(definition)).digest('hex')
  assert.equal(hash,'994f3982b9e91875db39d55b974da73b41351c5713434b0a6ac3705ed7cac76f')
})

test('account counterexample: startable false without registrationRequired reaches forbidden transaction',async()=>{
  const h=repository('account',{...catalog,registrationRequired:false})
  await assert.rejects(h.repo.startRun({},input),/TRANSACTION_REACHED/)
  assert.equal(h.count(),1)
})
test('account counterexample: restoring startable reopens pre-transaction guard',async()=>{
  const h=repository('account',{...catalog,startable:true})
  await assert.rejects(h.repo.startRun({},input),/TRANSACTION_REACHED/)
  assert.equal(h.count(),1)
})
test('guest counterexample: restoring both launch flags reaches forbidden transaction',async()=>{
  const h=repository('guest',{...catalog,startable:true,guestEligible:true})
  await assert.rejects(h.repo.startRun({},input),/TRANSACTION_REACHED/)
  assert.equal(h.count(),1)
})

// Closed pure-source graph: the actual explorer/catalog implementations, not a
// reimplementation of selectable logic. All transport/server imports forbidden.
const pureRoots=['data/assessments/','lib/assessments/'].map(p=>pathToFileURL(resolve(sourceRoot,p)+'/').href)
const hooks=registerHooks({
  resolve(specifier,context,nextResolve) {
    const result=nextResolve(specifier,context)
    assert.ok(pureRoots.some(prefix=>result.url.startsWith(prefix)), 'Pure graph boundary: '+result.url)
    return result
  },
  load(url,context,nextLoad) {
    for (const path of ['data/assessments/professional-additions-2026.js','lib/assessments/assessment-methodology.js'])
      if(url===pathToFileURL(resolve(sourceRoot,path)).href)
        return {format:'module',source:readFileSync(resolve(root,path),'utf8'),shortCircuit:true}
    return nextLoad(url,context)
  }
})
let explorer
try { explorer=await import(pathToFileURL(resolve(sourceRoot,'lib/assessments/test-explorer.js')).href) }
finally { hooks.deregister() }
for(const locale of ['en','ru','es']) for(const audience of ['guest','account']) {
  test(`actual explorer retains nonselectable ONS reference: ${locale}/${audience}`,()=>{
    const entries=explorer.buildExplorerEntries({locale,audience})
    const entry=entries.find(x=>x.key===key)
    assert.ok(entry)
    assert.equal(entry.selectable,false)
    assert.equal(entry.startable,false)
    assert.equal(entry.definition,null)
    assert.equal(entry.scaleGuide,null)
    assert.equal(entry.keyAudit.status,'reference')
    assert.equal(entry.testKind,'professional')
    assert.equal(entry.description,catalog.description[locale])
    assert.equal(entry.methodologySourceUrl,definition.source.url)
    assert.equal(entry.validity.group,'reference_only')
    assert.ok(entries.filter(x=>x.selectable).length>=42)
    assert.ok(explorer.filterExplorerEntries(entries,{availability:'full'}).some(x=>x.key===key))
    assert.ok(!explorer.filterExplorerEntries(entries,{availability:'available'}).some(x=>x.key===key))
    assert.ok(!explorer.buildStarterBattery(entries).some(x=>x.key===key))
    assert.ok(!explorer.buildPublicStarterBattery([entry]).some(x=>x.key===key))
  })
}

test('all definitions, non-ONS catalog metadata and interpretation/dimension rows remain pinned',()=>{
  const pins={
    ADDITIONAL_PROFESSIONAL_DEFINITIONS:'a242d6b77eeb010a5c8b965a89c1d1d97acab13321cbd745e289f935b17187e7',
    ADDITIONAL_PROFESSIONAL_CATALOG:'2e2960a4529c65c5b9d51ac1f8719e8555c15086c5f7e7eede139674dea1dd70',
    ADDITIONAL_PROFESSIONAL_INTERPRETATION_ROWS:'d387f19089afa8e3857556c97e093ea4ebe08a82d574f8e588366a2661a71fde',
    ADDITIONAL_PROFESSIONAL_DIMENSION_ROWS:'8df86d79b2e0bcc186dfe4675c511bc71376764282d7caca5f5486afa9abba28',
  }
  for(const [name,hash] of Object.entries(pins)) {
    const value=name==='ADDITIONAL_PROFESSIONAL_CATALOG'?additions[name].filter(x=>x.key!==key):additions[name]
    assert.equal(createHash('sha256').update(contracts.canonicalJSON(value)).digest('hex'),hash,name)
  }
})
