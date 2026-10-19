import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as enquiries from '../lib/whatsapp-enquiry.js'

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8')
test('public Client Cabinet includes the same interactive Test Explorer before account login', () => {
  const cabinet = read('components/app/cabinet-landing.jsx')
  const publicExplorer = read('components/app/public-test-explorer.jsx')
  const explorer = read('components/app/test-explorer.jsx')
  const styles = read('components/app/test-explorer.module.css')
  assert.match(cabinet, /<PublicTestExplorer locale=\{locale\} embedded onGuestStart=\{beginGuestBattery\} \/>/)
  assert.ok(cabinet.indexOf('<PublicTestExplorer') < cabinet.indexOf('className="cabinet-signin-strip'), 'one-click start must precede secondary account entry')
  assert.doesNotMatch(cabinet, /MoodCheckIn|handleGuestMoodChange|latestGuestMood/, 'public guest start has no mood gate')
  assert.match(cabinet, /Take available tests without registering\./, 'guest tests must be accessible before Google sign-in')
  assert.match(cabinet, /See your scores and gauges first; free explanations and advice are available in your Cabinet\./,
    'pre-login copy must explain the score-first result and where the full analysis is available')
  assert.match(publicExplorer, /<TestExplorer locale=\{locale\} audience="guest" embedded=\{embedded\}/)
  assert.match(explorer, /embedded \? styles\.embedded/)
  assert.match(styles, /\.explorer \.battery\{position:static/)
  assert.match(styles, /\.customizer\[hidden\]\{display:none/)
  assert.match(explorer, /openFiltersInitially = false/)
  assert.match(explorer, /initialFilterGroup = null/)
  assert.match(explorer, /\[customizeOpen, setCustomizeOpen\] = useState\(Boolean\(openFiltersInitially\)\)/)
  assert.match(explorer, /\[activeFilterGroup, setActiveFilterGroup\] = useState\(initialFilterGroup\)/)
  assert.match(explorer, /onStart\(activeBattery, \{/)
  assert.match(explorer, /aria-expanded=\{customizeOpen\}/)
  assert.match(explorer, /showAll \? visibleCatalog : visibleCatalog\.slice\(0, 8\)/)
  assert.match(explorer, /if \(aSelected !== bSelected\) return aSelected \? -1 : 1/)
  assert.match(explorer, /selectedKeys\.includes\(a\.key\)/)
  assert.match(explorer, /selectedKeys\.includes\(b\.key\)/)
  const workspace = read('components/app/app-workspace.jsx')
  assert.equal((workspace.match(/<MoodCheckIn\b/g) || []).length, 1, 'mood check-in remains available once in the signed-in workspace')
  assert.match(workspace, /<details className="hh-tests-mood-disclosure" data-cabinet-mood-checkin>/)
})

test('public Client entry shows the photo portrait immediately with Booking-style quick filters', () => {
  const explorer = read('components/app/test-explorer.jsx')
  const visual = read('components/app/test-explorer-visual.jsx')
  const styles = read('components/app/test-explorer.module.css')
  // One click must start the existing rights-cleared guest battery without OAuth.
  assert.match(explorer, /<button type="button" className=\{styles\.quickPrimary\}/)
  assert.match(explorer, /buildStarterBattery\(/)
  assert.match(explorer, /onStart\(activeBattery, \{/)
  // Fast thematic, duration and professional filters share existing state.
  assert.match(explorer, /QUICK_FOCUS\.map/)
  assert.match(explorer, /setFocus\(\(current\) => toggle\(current, key\)\)/)
  assert.match(explorer, /setMaxMinutes\(\(current\)/)
  assert.match(explorer, /setKinds\(\(current\)/)
  assert.match(explorer, /data-test-kind-checkbox/)
  assert.match(explorer, /<b>\{matchCount\}<\/b>/)
  assert.match(explorer, /aria-live="polite"/)
  assert.match(explorer, /<TestExplorerVisual compact/)
  assert.ok(explorer.indexOf('<TestExplorerVisual compact') < explorer.indexOf('id="hh-test-customizer"'),
    'photo portrait must precede optional advanced customizer')
  assert.doesNotMatch(explorer, /<details className=\{styles\.visualDetails\}>/,
    'portrait must not be hidden in a disclosure')
  assert.doesNotMatch(explorer, /Math\.round\(entry\.score \/ 1\.2\)/,
    'do not suggest unvalidated match scores are a medical percentage')
  assert.match(visual, /holistic-house-test-brain-concept\.png/)
  assert.match(visual, /compact = false/)
  assert.match(visual, /compact && !portrait && <div className=\{styles\.compactAxes\}/)
  assert.match(styles, /\.explorerHero\{display:grid;grid-template-columns:/)
  assert.match(styles, /@media\(max-width:960px\)/)
  assert.match(styles, /\.quickFilterChips button\[aria-pressed=true\]/)
  assert.match(styles, /\.explorer \.list\{border:0;display:grid/)
})

test('mobile design keeps head and one-click CTA above horizontally scrollable chips', () => {
  const explorer = read('components/app/test-explorer.jsx')
  const visual = read('components/app/test-explorer-visual.jsx')
  const css = read('components/app/test-explorer.module.css')
  assert.ok(explorer.indexOf('className={styles.quickStart}') < explorer.indexOf('className={styles.heroPortrait}'))
  assert.ok(explorer.indexOf('className={styles.heroPortrait}') < explorer.indexOf('className={styles.quickDiscovery}'))
  assert.ok(explorer.indexOf('className={styles.quickDiscovery}') < explorer.indexOf('id="hh-test-customizer"'))
  assert.match(css, /grid-template-areas:"start" "portrait" "discovery"/)
  assert.match(css, /quickFilterChips\{display:flex;flex-wrap:nowrap;overflow-x:auto/)
  assert.match(css, /@media\(max-width:600px\)/)
  assert.match(css, /\.visualCompact \.portraitSource\{width:1019px!important/)
  assert.match(css, /\.explorer \.row\{padding:14px 11px;gap:10px;grid-template-columns:/)
  assert.match(explorer, /<TestArtwork entry=\{entry\} \/>/)
  assert.match(explorer, /import \{[^}]*\bGraduationCap\b[^}]*\} from 'lucide-react'/)
  assert.match(explorer, /import \{[^}]*\bFileDown\b[^}]*\} from 'lucide-react'/)
  assert.match(explorer, /data-test-kind-badge/)
  assert.match(visual, /className=\{styles\.focusRays\}/)
  assert.match(visual, /topicCount > 0 \|\| selectedCount > 0/)
  assert.match(css, /\.visualCompact \.focusRays/)
  // Styles hide the advanced panel by default but never the portrait.
  assert.match(css, /\.customizer\[hidden\]\{display:none!important\}/)
})


test('matching test cards and search remain visible while expert filters are collapsed', () => {
  const explorer = read('components/app/test-explorer.jsx')
  const css = read('components/app/test-explorer.module.css')
  const client = read('app/[locale]/client/page.tsx')
  const header = read('components/public-site-header.tsx')
  const closedCustomizer = explorer.indexOf('    </section>\n    </div>\n    <section id="hh-test-list"')
  assert.ok(closedCustomizer > explorer.indexOf('id="hh-test-customizer"'),
    'optional advanced disclosure should end before the public test catalog')
  assert.ok(explorer.indexOf('className={styles.workspace}') > closedCustomizer,
    'test cards must not be inside the hidden advanced disclosure')
  assert.ok(explorer.indexOf('className={styles.catalogControls}') > closedCustomizer,
    'search and sort should be reachable without revealing advanced filters')
  assert.match(explorer, /id="hh-test-list"/)
  assert.match(explorer, /<TestArtwork entry=\{entry\} \/>/)
  assert.match(css, /\.catalogTopbar\{/)
  assert.match(css, /\.catalogControls\{/)
  assert.match(client, /showAssessmentStrip=\{false\}/)
  assert.match(client, /<ClientAssessmentInvite locale=\{typedLocale\} \/>/)
  assert.doesNotMatch(header, /MindBodyMonitorStrip|showAssessmentStrip = true/)
})


test('guided filter first shows topic categories then a single matching option panel', () => {
  const explorer = read('components/app/test-explorer.jsx')
  const styles = read('components/app/test-explorer.module.css')
  assert.match(explorer, /const GUIDED_FILTER_GROUPS = \[/)
  assert.match(explorer, /activeFilterGroup \? \(/)
  assert.match(explorer, /!activeFilterGroup \? \(/)
  assert.match(explorer, /GUIDED_FILTER_GROUPS\.map/)
  assert.match(explorer, /setActiveFilterGroup\(group\.key\)/)
  assert.match(explorer, /setActiveFilterGroup\(null\)/)
  assert.match(explorer, /activeFilterGroup === 'topics'/)
  assert.match(explorer, /activeFilterGroup === 'concerns'/)
  assert.match(explorer, /activeFilterGroup === 'areas'/)
  assert.match(explorer, /activeFilterGroup === 'scales'/)
  assert.match(explorer, /activeFilterGroup === 'timing'/)
  assert.match(explorer, /activeFilterGroup === 'format'/)
  assert.match(explorer, /activeFilterGroup === 'language'/)
  assert.match(explorer, /activeFilterGroup === 'goal'/)
  assert.match(explorer, /activeFilterGroup === 'describe'/)
  assert.doesNotMatch(explorer, /open=\{filtersOpen\}/)
  assert.match(explorer, /<strong>\{matchCount\}<\/strong>/)
  assert.match(styles, /\.guidedCategories\{/)
  assert.match(styles, /\.guidedDetail\{/)
  assert.match(styles, /\.guidedChoices \.filter button\[aria-pressed=true\]/)
  assert.match(explorer, /document\.getElementById\('hh-test-list'\)\?\.scrollIntoView/)
  assert.match(explorer, /onStart\(activeBattery, \{/)
})

test('Client lead block offers local choice and pre-fills existing reviewed enquiry form', () => {
  const client = read('app/[locale]/client/page.tsx')
  const invite = read('components/client-assessment-invite.tsx')
  const css = read('components/client-assessment-invite.module.css')
  const form = read('components/free-situation-review-form.tsx')
  assert.match(client, /<ClientAssessmentInvite locale=\{typedLocale\} \/>/)
  assert.match(invite, /data-client-assessment-invite/)
  assert.match(invite, /aria-pressed=\{topic === option\}/)
  assert.match(invite, /services\/free-situation-review\?topic=/)
  const intake = read('components/free-drawing-intake.tsx')
  assert.match(form, /<FreeDrawingIntake locale=\{locale\}/)
  assert.match(intake, /new URLSearchParams\(window.location.search\).get\("topic"\)/)
  assert.match(intake, /setTopic\(requested as Topic\)/)
  const chooser = read('components/contact-channel-chooser.tsx')
  assert.match(invite, /<ContactChannelChooser[\s\S]*?whatsappUrl=\{whatsappUrl\}/)
  assert.match(chooser, /Your selected request is prepared in the chat\. You review it and press Send yourself\./)
  assert.match(chooser, /<small className=\{styles\.note\}>\{c\.note\}<\/small>/)
  for (const channel of ['whatsapp', 'telegram']) assert.ok(chooser.includes('"data-contact-channel": "' + channel + '"'))
  assert.doesNotMatch(invite + chooser, /fetch\(|sendBeacon|autoSubmit|assessmentAnswers|testResults|sessionStorage|localStorage/)
  assert.match(css, /background:linear-gradient\(120deg,#edf9ff 0%,#e2f3f7 55%,#e1f7ed 100%\)/)
  assert.match(css, /@media\(max-width:720px\)/)
  assert.match(css, /\.options\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:7px\}/)
  assert.match(css, /\.order\{width:100%\}/)
})

test('signed-in and full database test selector use the same monitoring CTA as the easy pre-login picker', () => {
  const full = read('components/app/test-explorer.jsx')
  const simple = read('components/app/simple-test-picker.jsx')
  for (const label of [
    'Start free monitoring',
    'Начать бесплатный мониторинг',
    'Iniciar monitoreo gratuito',
  ]) {
    assert.ok(full.includes(label), 'Full explorer: ' + label)
    assert.ok(simple.includes(label), 'Simple explorer: ' + label)
  }
  assert.doesNotMatch(full, /Start free testing|Пройти тестирование бесплатно|Comenzar pruebas gratuitas/)
})

 test('VIA family collapse preserves explicit selections and search, with independent expansion',()=>{
 const explorer=read('components/app/test-explorer.jsx')
 const expression=explorer.match(/const visibleCatalog = visible\.filter\(\(entry\) =>\s*([^\n]+)\)/)[1]
 const filter=new Function('visible','showStandaloneVia','query','selectedKeys','isStandaloneVia',`return visible.filter(entry=>${expression})`)
 const rows=[{key:'ipip-via-r-curiosity-4'},{key:'ipip-via-r-strengths-96'},{key:'gad-7'}]
 const standalone=key=>/^ipip-via-r-(?!strengths-96$).+-(4|6)$/.test(key)
 assert.deepEqual(filter(rows,false,'',[],standalone),rows.slice(1))
 assert.deepEqual(filter(rows,false,'',['ipip-via-r-curiosity-4'],standalone),rows)
 assert.deepEqual(filter(rows,false,'curiosity',[],standalone),rows)
 assert.deepEqual(filter(rows,true,'',[],standalone),rows)
 assert.match(explorer,/aria-expanded=\{showStandaloneVia\} onClick=\{\(\) => setShowStandaloneVia\(\(value\) => !value\)\}/)
})


const jsx = (type, props) => ({ type, props: props || {} })
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)]
function compile(source, modules, globals = {}) {
 const exports = {}
 const output = ts.transpileModule(source, { fileName:'component.tsx', compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText
 runInNewContext(output,{exports,...globals,require:name=>{assert.ok(Object.hasOwn(modules,name),name);return modules[name]}})
 return exports
}

test('actual public catalog render offers one guest picker before secondary Google entry',()=>{
 const cabinet=read('components/app/cabinet-landing.jsx')
 const start=cabinet.indexOf('  return (\n    <>',cabinet.indexOf('  async function continuePlan()'))
 assert.ok(start>0)
 const scope={phase:'catalog',locale:'en',busy:false,error:'',legacySelector:null,c:{},beginGuestBattery:()=>{},signIn:()=>{},PublicTestExplorer:'public-picker',ChevronRight:'chevron',ClientCabinetEntry:'legacy-entry'}
 const {render}=compile('export function render(){'+cabinet.slice(start),{'react/jsx-runtime':{jsx,jsxs:jsx}},scope)
 const rendered=nodes(render())
 const picker=rendered.filter(node=>node.type==='public-picker')
 const signin=rendered.filter(node=>node.props.className==='cabinet-signin-strip cabinet-signin-hero')
 assert.equal(picker.length,1);assert.equal(signin.length,1)
 assert.ok(rendered.indexOf(picker[0])<rendered.indexOf(signin[0]))
 assert.equal(picker[0].props.onGuestStart,scope.beginGuestBattery)
 assert.equal(picker[0].props.embedded,true);assert.equal(picker[0].props.locale,'en')
 assert.equal(nodes(signin[0]).filter(node=>node.type==='button').length,1)
 assert.equal(rendered.filter(node=>node.props.role==='dialog'||node.props['aria-modal']).length,0,'no pre-test consent or mood modal')
})

test('actual gift invitation keeps each topic local and prepares matching EN/RU/ES messenger drafts',()=>{
 for(const locale of ['en','ru','es']){
  let topic
  const modules={
   'react/jsx-runtime':{jsx,jsxs:jsx},
   react:{useId:()=> 'invite-title',useState:initial=>[topic??initial,value=>{topic=value}]},
   'next/link':{default:'details-link'},'lucide-react':{ArrowUpRight:'arrow',Check:'check',HeartHandshake:'heart'},
   '@/components/contact-channel-chooser':{ContactChannelChooser:'contact-chooser'},
   '@/lib/whatsapp-enquiry':enquiries,'./client-assessment-invite.module.css':{default:{}},
  }
  const {ClientAssessmentInvite}=compile(read('components/client-assessment-invite.tsx'),modules)
  const render=()=>nodes(ClientAssessmentInvite({locale}))
  assert.equal(render().filter(node=>node.type==='button'&&node.props['aria-pressed']).length,1)
  for(const key of ['personal','goal','business','wellbeing']){
   const choices=render().filter(node=>node.type==='button')
   assert.equal(choices.length,4)
   const button=choices[['personal','goal','business','wellbeing'].indexOf(key)]
   assert.equal(button.props.type,'button');button.props.onClick()
   const current=render(),selected=current.filter(node=>node.type==='button'&&node.props['aria-pressed'])
   assert.equal(selected.length,1)
   const chooser=current.filter(node=>node.type==='contact-chooser')
   const details=current.filter(node=>node.type==='details-link')
   assert.equal(chooser.length,1);assert.equal(details.length,1)
   assert.equal(chooser[0].props.locale,locale)
   assert.equal(chooser[0].props.attributes['data-gift-assessment-topic'],key)
   assert.equal(chooser[0].props.event,'service_request_start')
   assert.equal(details[0].props.href,'/'+locale+'/services/free-situation-review?topic='+key)
   const whatsapp=new URL(chooser[0].props.whatsappUrl),telegram=new URL(enquiries.telegramEnquiryUrlFromWhatsApp(whatsapp.href))
   assert.equal(whatsapp.origin,'https://wa.me');assert.equal(telegram.origin,'https://t.me')
   assert.equal(telegram.searchParams.get('text'),whatsapp.searchParams.get('text'))
   assert.ok(whatsapp.searchParams.get('text').includes(selected[0].props.children.at(-1)))
   assert.ok(whatsapp.searchParams.get('text').includes('/'+locale+'/services/free-situation-review'))
   assert.doesNotMatch(whatsapp.searchParams.get('text'),/\?topic=|[?&](?:run|plan|token|private)=/)
   assert.equal(current.filter(node=>node.type==='form'||node.type==='input'||node.type==='textarea').length,0,'choosing a topic must not submit personal answers')
  }
 }
})
