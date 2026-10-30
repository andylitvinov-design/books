import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import ts from 'typescript'

// Render only the actual native disclosure subtree. Never import the app module,
// its server actions, connection healthcheck, Redis store, or provider adapters.
const source=readFileSync(new URL('../components/growth-studio.jsx',import.meta.url),'utf8')
const file=ts.createSourceFile('growth-studio.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
const matches=[]
const visit=node=>{
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(file)==='details'&&
    node.openingElement.attributes.properties.some(attribute=>
      ts.isJsxAttribute(attribute)&&attribute.name.getText(file)==='className'&&
      ts.isJsxExpression(attribute.initializer)&&
      attribute.initializer.expression?.getText(file)==='styles.composerOptions'))matches.push(node)
  ts.forEachChild(node,visit)
}
visit(file)
assert.equal(matches.length,1,'Extract exactly one real composer options disclosure')
const jsx=matches[0].getText(file)
const extracted=ts.transpileModule(`function ComposerOptions({
  editing,isEditing,styles,t,form,ready,storageVerified,busy,set,
  GROWTH_BRANDS,BRANDS,GROWTH_LANGUAGES,locale,applyPublicSource,suggestManualTime,
  GrowthStudioSourcePicker,CalendarDays
}) { return (${jsx}) }`,{
  compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},
  reportDiagnostics:true,
})
assert.equal(extracted.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0)
const ComposerOptions=new Function('React',extracted.outputText+';return ComposerOptions')(React)
const noop=()=>{}
const messages=['moreOptions','advancedHint','brand','language','campaign','media','mediaAlt',
  'mediaHint','source','sourceHint','schedule','scheduleNote','planNext','captionHint']
const fixture=({editing=null,locale='en',ready=true,storageVerified=true,busy=false}={})=>({
  editing,isEditing:Boolean(editing),locale,ready,storageVerified,busy,
  styles:{composerOptions:'composer-options',hint:'hint',pair:'pair',manualSlotActions:'manual-slot-actions'},
  t:Object.fromEntries(messages.map(key=>[key,key])),
  form:{brand:'holistic_house',locale:'ru',campaign:'synthetic_campaign',
    mediaUrl:'https://example.invalid/public-test.jpg',mediaAlt:'Synthetic public illustration',
    sourceUrl:'https://example.invalid/public-source',scheduledAt:'2026-11-01T10:00'},
  GROWTH_BRANDS:{holistic_house:'https://example.invalid'},
  BRANDS:{holistic_house:'Synthetic owner brand'},GROWTH_LANGUAGES:['en','ru','es'],
  set:()=>noop,applyPublicSource:noop,suggestManualTime:noop,
  GrowthStudioSourcePicker:()=>React.createElement('span',{'data-synthetic-picker':true}),
  CalendarDays:()=>null,
})
const render=options=>renderToStaticMarkup(React.createElement(ComposerOptions,fixture(options)))
const openingTag=markup=>markup.match(/^<details\b[^>]*>/)?.[0]||''
const isOpen=markup=>/\sopen(?:=""|(?=[\s>]))/.test(openingTag(markup))

test('new draft renders the actual native details closed',()=>{
  const markup=render()
  assert.match(markup,/^<details\b/)
  assert.equal(isOpen(markup),false)
  assert.doesNotMatch(openingTag(markup),/defaultopen/i)
})

test('saved-post editing renders native details open with preserved advanced values in EN and RU',()=>{
  for(const locale of ['en','ru']){
    const markup=render({editing:{id:'synthetic-post',revision:3},locale})
    assert.equal(isOpen(markup),true,locale+' saved-post disclosure must have native open attribute')
    assert.match(markup,/value="synthetic_campaign"/)
    assert.match(markup,/value="https:\/\/example.invalid\/public-test.jpg"/)
    assert.match(markup,/value="Synthetic public illustration"/)
    assert.match(markup,/value="https:\/\/example.invalid\/public-source"/)
    assert.match(markup,/value="2026-11-01T10:00"/)
    assert.match(markup,/<option value="ru" selected="">RU<\/option>/)
  }
})

test('actual disclosure retains keyed new-post and saved-post remount identities',()=>{
  assert.equal(ComposerOptions(fixture()).key,'new')
  assert.equal(ComposerOptions(fixture({editing:{id:'synthetic-a',revision:1}})).key,'synthetic-a')
  assert.equal(ComposerOptions(fixture({editing:{id:'synthetic-b',revision:2}})).key,'synthetic-b')
})

test('opening edit options does not weaken existing readiness, storage verification, or busy guards',()=>{
  for(const options of [{ready:false},{storageVerified:false},{busy:true}]){
    const markup=render({...options,editing:{id:'synthetic-post',revision:3}})
    assert.equal(isOpen(markup),true)
    const controls=markup.match(/<(?:input|select|button)\b[^>]*>/g)||[]
    assert.ok(controls.length>=8)
    for(const control of controls)assert.match(control,/\sdisabled=""/)
  }
  const writable=render({editing:{id:'synthetic-post',revision:3}})
  assert.doesNotMatch(writable,/\sdisabled=""/)
})

test('Growth Studio delegates only duplicate production PR Next build to fail-closed core', () => {
  const workflow = readFileSync(new URL('../.github/workflows/hh-growth-studio.yml', import.meta.url), 'utf8')
  const core = readFileSync(new URL('../.github/workflows/hh-pr-core-release.yml', import.meta.url), 'utf8')
  assert.match(core, /^  release-ready:/m)
  assert.match(core, /run: npm run build/)
  assert.ok(workflow.includes("if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}"))
  assert.match(workflow, /- name: Next\.js build[\s\S]*?run: npm run build/)
  assert.match(workflow, /node --test tests\/growth-studio-composer-details-render\.test\.mjs/)
  assert.match(workflow, /Check editorial transitions, URL and Redis guards/)
  assert.match(workflow, /^  workflow_dispatch:/m)
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/)
})
