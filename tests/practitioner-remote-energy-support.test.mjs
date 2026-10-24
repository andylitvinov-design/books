import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { getSiteNavigation, getCompactNavigation } from '../lib/site-navigation-model.js'
import {
  REMOTE_SUPPORT_DRAFT_KEY,
  readRemoteSupportDraft,
  formatRemoteSupportDraft,
} from '../lib/practitioners/remote-energy-support.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const example = {
  version: 1,
  serviceId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  practitioner: 'Andy',
  goal: 'Inner balance and calm',
  method: 'Reiki',
  format: 'asynchronous',
  duration: 30,
  date: '2026-10-21',
  time: '15:30',
  timezone: 'America/Toronto',
  savedAt: 10000,
}
const storage = (value) => ({getItem: (key) => key === REMOTE_SUPPORT_DRAFT_KEY ? JSON.stringify(value) : null})

test('only the matching unexpired practitioner-service booking draft is accepted', () => {
  assert.deepEqual(readRemoteSupportDraft(storage(example), example.serviceId, 10000), example)
  assert.equal(readRemoteSupportDraft(storage(example), 'different-service', 10000), null)
  assert.equal(readRemoteSupportDraft(storage(example), example.serviceId, 10000 + 25 * 3600000), null)
  assert.equal(readRemoteSupportDraft(storage({...example, format:'invalid'}), example.serviceId, 10000), null)
  assert.equal(readRemoteSupportDraft(storage({...example, duration:45}), example.serviceId, 10000), null)
  assert.equal(readRemoteSupportDraft(storage({...example, date:'not-a-date'}), example.serviceId, 10000), null)
  assert.equal(readRemoteSupportDraft(storage({...example, time:'15:30\nfoo'}), example.serviceId, 10000), null)
  assert.equal(readRemoteSupportDraft({ getItem(){ throw Error('blocked') } }, example.serviceId), null)
})

test('booking summary is explicit about non-confirmed time and price', () => {
  const summary = formatRemoteSupportDraft(example)
  assert.match(summary, /not confirmed/)
  assert.match(summary, /America\/Toronto/)
  assert.match(summary, /2026-10-21 15:30/)
  assert.match(summary, /before any payment/)
  assert.ok(summary.split('\n').length >= 7)
})

test('Practitioners remains compact, and the separate energy-support request flow is unchanged', () => {
  const page = read('app/[locale]/masters/page.tsx')
  const pageCss = read('app/[locale]/masters/masters-page.module.css')
  const finder = read('components/master-network-explorer.tsx')
  const finderCss = read('components/master-network-explorer.module.css')
  const supportRoute = read('app/[locale]/services/remote-energy-support/page.tsx')
  const wizard = read('components/remote-energy-support-booking.tsx')
  const cabinet = read('components/app/app-workspace.jsx')
  assert.match(page, /<MarketplaceMasterFinder practitioners=/)
  // #1868 deliberately removed the redundant Masters hero. The actual entry
  // is now in the existing Holistic Support hub (#1856), rendered below.
  assert.match(pageCss, /@media \(max-width: 700px\)/)
  assert.match(finder, /MASTER_TOPICS/)
  assert.match(finder, /More filters/)
  assert.match(finder, /<details className=\{styles.masterExtra\}>/)
  assert.match(finderCss, /\.compactMaster/)
  assert.match(supportRoute, /areaKey === "energy_spiritual"/)
  assert.match(supportRoute, /locales?/i)
  assert.match(wizard, /America\/Toronto/)
  assert.match(wizard, /window\.sessionStorage\.setItem/)
  assert.match(wizard, /Continue to request/)
  assert.match(wizard, /not a confirmed appointment/)
  assert.match(wizard, /not medical treatment/)
  assert.match(wizard, /masters\.length === 0/)
  assert.match(cabinet, /readRemoteSupportDraft\(window\.sessionStorage, service\.id\)/)
  assert.match(cabinet, /formatRemoteSupportDraft\(draft\)/)
  assert.match(cabinet, /await appFetch\('requests', body\)/)
  assert.doesNotMatch(wizard, /checkout|stripe|createPaymentIntent/i)
})

// Execute only the public page boundary. Repository reads are synthetic and
// cannot reach a database; child forms remain explicit component markers.
async function renderSupport(locale,{unavailable=false,source=read('app/[locale]/holistic-support/page.tsx')}={}){
 const element=(type,props)=>{assert.equal(typeof type,'string','Undefined public-page component');return {type,props:props||{}}}
 const reads=[]
 const imports={
  'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'fragment'},
  'next/image':{default:'img'},'next/link':{default:'a'},
  'next/navigation':{notFound:()=>{throw Error('NOT_FOUND')}},
  '@/components/compact-lead-capture':{CompactLeadCapture:'capture'},
  '@/components/ideas-discovery':{IdeasDiscovery:'ideas'},
  '@/components/master-network-explorer':{MarketplaceMasterFinder:'finder'},
  '@/components/public-site-header':{PublicSiteHeader:'header'},
  '@/data/academy/catalog':{isPublicLocale:value=>['en','ru','es'].includes(value)},
  '@/data/site-metadata':{metadataBaseFor:()=>new URL('https://fixture.invalid')},
  '@/lib/app/config':{getAppConfig:()=>({fixture:true})},
  '@/lib/practitioners/repository':{createPractitionerRepository:config=>{
   assert.equal(config.fixture,true)
   return {listPublicPractitioners:async language=>{reads.push(language);if(unavailable)throw Error('FICTIONAL_UNAVAILABLE');return []}}
  }},
  './holistic-support.module.css':{default:{}},
 }
 const module={exports:{}}
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  module,exports:module.exports,require:id=>{assert.ok(Object.hasOwn(imports,id),'Unexpected public-page import: '+id);return imports[id]},URL,
 })
 const tree=await module.exports.default({params:Promise.resolve({locale})})
 const nodes=[]
 const visit=(node,parents=[])=>{if(Array.isArray(node))return node.forEach(n=>visit(n,parents));if(!node||typeof node!=='object'||!('type'in node))return;nodes.push({...node,parents});visit(node.props.children,[...parents,node])}
 visit(tree);return {nodes,reads}
}
async function assertSupportEntry(locale,options){
 for(const navigation of [getSiteNavigation(locale),getCompactNavigation(locale)]){
  const entry=navigation.filter(item=>item.href===`/${locale}/holistic-support`)
  assert.equal(entry.length,1,'One localized public navigation entry reaches Holistic Support')
  assert.equal(entry[0].external,false)
 }
 const {nodes,reads}=await renderSupport(locale,options)
 assert.deepEqual(reads,[locale])
 const offers=nodes.filter(n=>n.props['data-holistic-offer']==='energy')
 assert.equal(offers.length,1,'The energy offer remains distinct from paid Temple Insights')
 const links=nodes.filter(n=>n.type==='a'&&n.parents.some(p=>p.props['data-holistic-offer']==='energy'))
 assert.equal(links.length,1,'One genuine link, not a text-only or payment action')
 assert.equal(links[0].props.href,`/${locale}/services/remote-energy-support`)
 assert.equal(links[0].props.prefetch,false)
 assert.ok(links[0].parents.some(p=>p.props.id==='holistic-healing-support'))
 assert.equal(links[0].props.children[0],{
  en:'Request distant energy support',ru:'Запросить дистанционную поддержку',es:'Solicitar apoyo a distancia',
 }[locale])
}
for(const locale of ['en','ru','es'])for(const unavailable of [false,true])test(`${locale}: actual Holistic Support energy link reaches the existing request route (directory unavailable=${unavailable})`,async()=>{
 await assertSupportEntry(locale,{unavailable})
})
test('support entry detects a removed offer, non-link CTA, wrong service or forced English route',async()=>{
 const source=read('app/[locale]/holistic-support/page.tsx')
 const href='href={"/" + locale + "/services/remote-energy-support"}'
 const mutations=[
  source.replace('data-holistic-offer="energy"','data-holistic-offer="missing-energy"'),
  source.replace(href,'href={"/" + locale + "/services/alchemy-of-soul"}'),
  source.replace(href,'href="/en/services/remote-energy-support"'),
  source.replace('<Link '+href,'<span '+href).replace('{t.energyAction}<span aria-hidden="true">→</span>\n                </Link>','{t.energyAction}<span aria-hidden="true">→</span>\n                </span>'),
 ]
 for(const changed of mutations){
  assert.notEqual(changed,source)
  const parsed=ts.createSourceFile('support.tsx',changed,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  assert.equal(parsed.parseDiagnostics.length,0,'Negative control must remain valid JSX')
  await assert.rejects(()=>assertSupportEntry('ru',{source:changed}),error=>error.code==='ERR_ASSERTION')
 }
})
