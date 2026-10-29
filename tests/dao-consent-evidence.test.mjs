import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { canonicalDaoConsentEvidence, serializeDaoConsentEvidence, isIsolatedDaoEvidenceRuntime,
  DAO_CONSENT_EVIDENCE_PATH, DAO_CONSENT_EVIDENCE_MAX_BYTES } from '../scripts/helpers/dao-consent-evidence.mjs'
import { daoConsentDiagnostics, installDaoInteractionProbe } from '../scripts/helpers/dao-free-entry-verifier.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const helper = read('scripts/helpers/dao-free-entry-verifier.mjs')
const writer = read('scripts/helpers/dao-consent-evidence.mjs')
const env = { CI: 'true', HH_APP_TEST_RUNTIME: 'isolated',
  HH_TEST_ADMIN_DATABASE_URL: 'postgres://synthetic@127.0.0.1:5432/hh_app_test' }
const bools = names => Object.fromEntries(names.map(name => [name, false]))
const snapshot = () => bools(['contactPropsPresent', 'buttonPropsPresent', 'contactOnChangeBound', 'buttonOnClickBound', 'contactPropMatches'])
const rect = () => ({ left: 12.5, top: 700, right: 162.5, bottom: 749, width: 150, height: 49 })
const event = () => ({ kind: 7, ...bools(['trusted', 'defaultPrevented', 'navVisible', 'navPointerEventsNone',
  'activeContact', 'activeButton', 'targetContact', 'targetButton', 'targetForm', 'targetNavigation', 'hitButton', 'hitNavigation']),
  button: rect(), navigation: null, point: { x: 20, y: 720 },
  bodyPaddingBottom: 0, scrollY: 4000, viewportHeight: 844, documentHeight: 5000 })
function fixture() {
  return { locale: 'en', state: { ...bools(['formConnected', 'documentComplete', 'contactMatches', 'contactDisabled',
    'consentChecked', 'consentRequired', 'consentMissing', 'buttonPresent', 'buttonTypeIsButton', 'buttonDisabled', 'expectedConsentAlert']), alertCount: 0 },
  interaction: { initial: snapshot(), clickCapture: null, clickBubble: null, current: snapshot(),
    counts: { inputCapture: 1, inputBubble: 1, clickCapture: 0, clickBubble: 0, trustedClicks: 0 },
    ...bools(['defaultPrevented', 'originalFormConnected', 'sameForm', 'sameContact', 'sameButton']),
    pointer: { events: [event()], dropped: 0, errors: 0 } }, syntheticSubmissions: 0, blockedRequests: 0 }
}
function assertScalars(value) {
  if (value === null) return
  if (typeof value === 'object') { for (const child of Object.values(value)) assertScalars(child); return }
  assert.ok(typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))
}
function parse(source, file = 'source.mjs') { return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS) }
function oneFunction(source, name) {
  const tree = parse(source)
  const found = tree.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.equal(found.length, 1)
  return { tree, fn: found[0] }
}
function selectedFunction(source, name, context) {
  const { tree, fn } = oneFunction(source, name)
  const js = ts.transpileModule(fn.getText(tree).replace(/^export\s+/, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
  return new vm.Script(js + '\n' + name).runInNewContext(context, { timeout: 500 })
}

test('DAO canonical record retains bounded scalar meaning and no string values', () => {
  for (const locale of ['en', 'ru']) {
    const input = fixture(); input.locale = locale
    const output = canonicalDaoConsentEvidence(input)
    assert.equal(output.schemaVersion, 1); assert.equal(output.localeCode, locale === 'en' ? 1 : 2)
    assert.deepEqual(output.state, input.state); assert.deepEqual(output.interaction, input.interaction)
    assertScalars(output)
    const text = serializeDaoConsentEvidence(input)
    assert.ok(Buffer.byteLength(text) <= DAO_CONSENT_EVIDENCE_MAX_BYTES)
    assert.deepEqual(JSON.parse(text), output)
    input.interaction.pointer.events[0].point.x = 999
    assert.equal(output.interaction.pointer.events[0].point.x, 20, 'No input object references retained')
  }
  const input = fixture(); input.state = null; input.interaction = null
  assert.deepEqual(canonicalDaoConsentEvidence(input), { schemaVersion: 1, localeCode: 1,
    state: null, interaction: null, syntheticSubmissions: 0, blockedRequests: 0 })
})

test('actual existing DAO state and interaction producers satisfy the new closed schema', () => {
  const producerTests = read('tests/dao-free-entry-verifier.test.mjs')
  const makeInteraction = selectedFunction(producerTests, 'interactionFixture', { assert })
  const makePointer = selectedFunction(producerTests, 'pointerFixture', { assert, interactionFixture: makeInteraction })
  const f = makePointer()
  installDaoInteractionProbe(f.form, { contact: 'SYNTHETIC_CONTACT_NOT_RETAINED' })
  f.dispatch('input', f.contact, true)
  f.dispatch('pointerdown', f.button, true, { clientX: 30, clientY: 780 })
  f.dispatch('click', f.button, true, { clientX: 30, clientY: 780 })
  const input = fixture()
  input.interaction = f.win.__hhDaoInteractionProbe.read(f.form)
  input.state = daoConsentDiagnostics({ isConnected: true, ownerDocument: { readyState: 'complete' },
    querySelector: key => key.includes('contact') ? { value: 'PRIVATE', disabled: false }
      : key.includes('checkbox') ? { checked: false, required: true, validity: { valueMissing: true } }
        : { type: 'button', disabled: false }, querySelectorAll: () => [] }, { contact: 'PRIVATE', required: 'PRIVATE_ALERT' })
  const output = canonicalDaoConsentEvidence(input)
  assert.ok(output); assert.deepEqual(output.interaction, input.interaction); assert.deepEqual(output.state, input.state)
  assertScalars(output); assert.doesNotMatch(serializeDaoConsentEvidence(input), /PRIVATE|SYNTHETIC|example|https?:/)
  f.win.__hhDaoInteractionProbe.dispose()
})

test('unknown, accessor, proxy and prototype fields fail closed at every nested boundary without invocation', () => {
  const targets = [x => x, x => x.state, x => x.interaction, x => x.interaction.initial,
    x => x.interaction.counts, x => x.interaction.pointer, x => x.interaction.pointer.events,
    x => x.interaction.pointer.events[0], x => x.interaction.pointer.events[0].button,
    x => x.interaction.pointer.events[0].point]
  for (const target of targets) {
    for (const kind of ['unknown', 'symbol', 'accessor', 'prototype']) {
      const input = fixture(), object = target(input)
      let invoked = 0
      if (kind === 'unknown') object.privateText = 'NEVER_RETAIN'
      if (kind === 'symbol') object[Symbol('secret')] = 'NEVER_RETAIN'
      if (kind === 'accessor') {
        const key = Object.keys(object)[0]
        Object.defineProperty(object, key, { configurable: true, get() { invoked++; throw new Error('DO_NOT_READ') } })
      }
      if (kind === 'prototype') Object.setPrototypeOf(object, { inherited: 'secret' })
      assert.equal(canonicalDaoConsentEvidence(input), null, kind)
      assert.equal(invoked, 0)
    }
  }
  const replace = [ (x,p) => p, (x,p) => (x.state=p,x), (x,p) => (x.interaction=p,x),
    (x,p) => (x.interaction.pointer=p,x), (x,p) => (x.interaction.pointer.events=p,x),
    (x,p) => (x.interaction.pointer.events[0]=p,x), (x,p) => (x.interaction.pointer.events[0].point=p,x) ]
  for (const replaceAt of replace) {
    let traps = 0
    const proxy = new Proxy({}, { get() { traps++; throw new Error('blocked') }, ownKeys() { traps++; throw new Error('blocked') },
      getPrototypeOf() { traps++; throw new Error('blocked') }, getOwnPropertyDescriptor() { traps++; throw new Error('blocked') } })
    assert.equal(canonicalDaoConsentEvidence(replaceAt(fixture(), proxy)), null)
    assert.equal(traps, 0)
  }
  const revoked = Proxy.revocable({}, {}); revoked.revoke()
  assert.equal(canonicalDaoConsentEvidence(revoked.proxy), null)
})

test('count, geometry, event-kind, sparse-array and total-size limits are exact', () => {
  const mutations = [x => { x.locale='es' }, x => { x.syntheticSubmissions=1000001 }, x => { x.blockedRequests=-1 },
    x => { x.state.alertCount=0.5 }, x => { x.state.contactMatches='true' },
    x => { x.interaction.pointer.dropped=Infinity }, x => { x.interaction.pointer.errors=NaN },
    x => { x.interaction.counts.trustedClicks='1' }, x => { x.interaction.pointer.events[0].kind=0 },
    x => { x.interaction.pointer.events[0].kind=8 }, x => { x.interaction.pointer.events[0].kind=1.5 },
    x => { x.interaction.pointer.events[0].point.x=10000001 }, x => { x.interaction.pointer.events[0].button.width=NaN },
    x => { x.interaction.pointer.events[0].scrollY='secret' }, x => { x.interaction.pointer.events=Array.from({length:25},event) },
    x => { x.interaction.pointer.events=new Array(1) }, x => { delete x.state.formConnected }]
  for (const change of mutations) { const input=fixture(); change(input); assert.equal(serializeDaoConsentEvidence(input),null) }
  const input=fixture(); input.interaction.pointer.events=Array.from({length:24},event)
  input.syntheticSubmissions=1000000; input.interaction.pointer.events[0].point.x=-10000000
  const text=serializeDaoConsentEvidence(input); assert.ok(text); assert.ok(Buffer.byteLength(text)<=32768)
  assert.equal(JSON.parse(text).interaction.pointer.events.length,24)
})

test('isolated writer boundary accepts only existing local test DB and never coerces hostile values', () => {
  assert.equal(isIsolatedDaoEvidenceRuntime(env),true)
  for (const change of [{CI:'false'},{HH_APP_TEST_RUNTIME:'production'},{VERCEL:'1'},{VERCEL:false},{VERCEL:0},{VERCEL:null},
    {HH_TEST_ADMIN_DATABASE_URL:'postgres://db.example.test/hh_app_test'},
    {HH_TEST_ADMIN_DATABASE_URL:'postgres://localhost/production'},
    {HH_TEST_ADMIN_DATABASE_URL:'https://localhost/hh_app_test'},
    {HH_TEST_ADMIN_DATABASE_URL:'postgres://localhost/hh_app_test?x=1'},
    {HH_TEST_ADMIN_DATABASE_URL:'postgres://localhost/hh_app_test#x'},
    {HH_TEST_ADMIN_DATABASE_URL:{toString(){throw new Error('no coercion')}}}])
    assert.equal(isIsolatedDaoEvidenceRuntime({...env,...change}),false)
  const accessor={...env}; Object.defineProperty(accessor,'CI',{get(){throw new Error('no getter')}})
  assert.equal(isIsolatedDaoEvidenceRuntime(accessor),false)
  assert.equal(isIsolatedDaoEvidenceRuntime(new Proxy(env,{ownKeys(){throw new Error('no proxy')}})),false)
})

function writerReplay(source=writer, failure=false, environment=env) {
  const writes=[]
  const persist=selectedFunction(source,'persistDaoConsentEvidence',{isIsolatedDaoEvidenceRuntime,serializeDaoConsentEvidence,
    process:{env:environment},DAO_CONSENT_EVIDENCE_PATH,writeFileSync(...args){writes.push(args);if(failure)throw new Error('IO_PRIVATE')}})
  return {persist,writes}
}
function assertWriterContract(source=writer) {
  const normal=writerReplay(source); assert.equal(normal.persist(fixture()),true);assert.equal(normal.writes.length,1)
  const [path,text,options]=normal.writes[0]
  assert.equal(path,'artifacts/app-r1/dao-consent-evidence-v1.json')
  assert.equal(options.encoding,'utf8');assert.equal(options.flag,'wx');assert.equal(options.mode,0o600)
  assert.equal(Object.keys(options).length,3);assert.deepEqual(JSON.parse(text),canonicalDaoConsentEvidence(fixture()))
}

test('actual writer uses only the fixed exclusive 0600 file and failures remain inert', () => {
  assertWriterContract()
  const failed=writerReplay(writer,true);assert.equal(failed.persist(fixture()),false);assert.equal(failed.writes.length,1)
  const invalid=writerReplay();assert.equal(invalid.persist({...fixture(),path:'/arbitrary'}),false);assert.equal(invalid.writes.length,0)
  const production=writerReplay(writer,false,{...env,HH_APP_TEST_RUNTIME:'production'})
  assert.equal(production.persist(fixture()),false);assert.equal(production.writes.length,0)
})

function catchSource(source=helper) {
  const {tree,fn}=oneFunction(source,'assertDaoFreeEntryCapture')
  const clauses=[]
  const visit=node=>{if(ts.isTryStatement(node)&&node.catchClause&&node.tryBlock.getText(tree).includes("await expect(form.getByRole('alert')).toHaveText(t.required)"))clauses.push(node);ts.forEachChild(node,visit)}
  visit(fn);assert.equal(clauses.length,1)
  assert.match(fn.getText(tree),/await contact.fill\(CONTACT\)\s*await whatsapp.click\(\)\s*try/)
  const imports=tree.statements.filter(ts.isImportDeclaration).filter(node=>node.moduleSpecifier.text==='./dao-consent-evidence.mjs')
  assert.equal(imports.length,1);assert.equal(imports[0].importClause.namedBindings.elements.length,1)
  assert.equal(imports[0].importClause.namedBindings.elements[0].name.text,'persistDaoConsentEvidence')
  assert.equal(imports[0].importClause.namedBindings.elements[0].propertyName,undefined)
  return clauses[0].catchClause.getText(tree)
}
async function replayCatch({source=helper,throwWriter=false,throwProbe=false,throwImage=false}={}) {
  const raw=fixture(),primary={},calls=[],screens=[]
  const form={evaluate:async fn=>{if(throwProbe)throw new Error('PROBE_PRIVATE');return fn.name==='daoConsentDiagnostics'?raw.state:raw.interaction},
    locator:selector=>{assert.equal(selector,'input, textarea');return 'MASKED_INPUTS'},
    screenshot:async options=>{screens.push(options);if(throwImage)throw new Error('IMAGE_PRIVATE')}}
  const context={PRIMARY:primary,form,daoConsentDiagnostics,installDaoInteractionProbe,CONTACT:'FIXED_SYNTHETIC',t:{required:'STATIC_COPY'},locale:'en',
    guard:{submissions:[],blocked:[]},failureScreenshotPath:'artifacts/app-r1/dao-consent-en-form.png',
    boundedBestEffort:async fn=>{try{await fn();return 'completed'}catch{return 'rejected'}},console:{error(){}},
    persistDaoConsentEvidence:value=>{calls.push({...value});if(throwWriter)throw new Error('WRITER_PRIVATE')}}
  const fn=new vm.Script('(async()=>{try{throw PRIMARY}'+catchSource(source)+'})').runInNewContext(context,{timeout:500})
  let caught;try{await fn()}catch(error){caught=error}
  assert.equal(caught,primary,'Exact primary assertion object retained')
  assert.equal(calls.length,1,'Actual failure catch persists once')
  assert.deepEqual(canonicalDaoConsentEvidence(calls[0]),canonicalDaoConsentEvidence(throwProbe?{...raw,state:null,interaction:null}:raw))
  assert.equal(screens.length,1);assert.equal(screens[0].mask[0],'MASKED_INPUTS');assert.equal(screens[0].timeout,2500)
}
test('actual DAO failure catch persists existing scalars without changing original error or screenshot mask',async()=>{
  for(const options of [{},{throwWriter:true},{throwProbe:true},{throwImage:true},{throwWriter:true,throwProbe:true,throwImage:true}])await replayCatch(options)
  assert.equal((helper.match(/await whatsapp.click\(\)/g)||[]).length,2)
  assert.doesNotMatch(helper,/force:\s*true|waitForTimeout|dispatchEvent|requestSubmit|\.onClick\(/)
})

test('actual-call-site and fixed-writer mutants are rejected by the same contracts',async()=>{
  const drop=helper.replace('persistDaoConsentEvidence({ locale, state, interaction,','void ({ locale, state, interaction,')
  const hidden=helper.replace('persistDaoConsentEvidence({ locale, state, interaction,','false && persistDaoConsentEvidence({ locale, state, interaction,')
  const wrong=helper.replace('syntheticSubmissions: guard.submissions.length, blockedRequests: guard.blocked.length })\n      } catch','syntheticSubmissions: 999, blockedRequests: guard.blocked.length })\n      } catch')
  const replaced=helper.replace('      throw error\n','      throw new Error("REPLACED")\n')
  for(const source of [drop,hidden,wrong,replaced]){assert.notEqual(source,helper);await assert.rejects(()=>replayCatch({source}))}
  const moved=writer.replace('writeFileSync(DAO_CONSENT_EVIDENCE_PATH, serialized,','writeFileSync("/arbitrary", serialized,')
  assert.throws(()=>assertWriterContract(moved))
  const overwrite=writer.replace("flag: 'wx'","flag: 'w'")
  const readable=writer.replace('mode: 0o600','mode: 0o644')
  for(const source of [overwrite,readable]){assert.notEqual(source,writer);assert.throws(()=>assertWriterContract(source))}
})
