import ts from 'typescript'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {BUSINESS_FORMATS,validateBusinessEnquiry} from '../lib/business-consulting/intake-policy.js'

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

function assertBusinessEntryDelegation(explorer, finder, browser) {
  const parse = text => ts.createSourceFile('entry.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const all = root => { const result=[];const visit=node=>{result.push(node);ts.forEachChild(node,visit)};visit(root);return result }
  const tree=parse(explorer)
  for (const [name,path] of [['BusinessConsultationFinder','@/components/business-consultation-finder'],['BusinessServiceBrowser','@/components/business-service-browser']]) {
    const imports=tree.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text===path)
    assert.equal(imports.length,1,'Unique actual Business child import: '+name)
    assert.ok(imports[0].importClause.namedBindings.elements.some(node=>node.name.text===name&&!node.propertyName),'Exact Business child binding: '+name)
    const tags=all(tree).filter(node=>(ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node))&&node.tagName.getText(tree)===name)
    assert.equal(tags.length,1,'Render one actual Business child: '+name)
    const locale=tags[0].attributes.properties.find(node=>ts.isJsxAttribute(node)&&node.name.text==='locale')
    assert.equal(locale?.initializer?.expression?.getText(tree),'language','Pass the validated locale to '+name)
    let parent=tags[0].parent,guarded=false
    while(parent){if(ts.isConditionalExpression(parent)&&parent.condition.getText(tree)==="journey.id === 'business'"&&tags[0].pos>=parent.whenTrue.pos&&tags[0].end<=parent.whenTrue.end)guarded=true;parent=parent.parent}
    assert.ok(guarded,'Keep the child in the Business-only branch: '+name)
  }
  for(const [name,text,guard,format,context] of [
    ['finder',finder,'selected','selected','context'],
    ['service browser',browser,'item.format','item.format','item.id'],
  ]){
    const child=parse(text),nodes=all(child)
    const attrs=node=>Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(item=>[item.name.text,item.initializer]))
    const links=nodes.filter(node=>ts.isJsxOpeningElement(node)&&node.tagName.getText(child)==='AcquisitionEventLink'&&attrs(node).event?.text==='service_request_start')
    assert.equal(links.length,1,'One direct-form request link in '+name)
    const link=links[0],a=attrs(link)
    assert.equal(a.href?.text,'#business-direct-request','Exact consent-form destination in '+name)
    assert.equal(a.prefetch?.expression?.kind,ts.SyntaxKind.FalseKeyword,'Do not prefetch the request action in '+name)
    assert.ok(ts.isJsxExpression(a.attributes)&&ts.isObjectLiteralExpression(a.attributes.expression),'Structured direct-form metadata in '+name)
    const metadata=Object.fromEntries(a.attributes.expression.properties.map(item=>[item.name.text,item.initializer.getText(child)]))
    assert.equal(metadata['data-business-direct-option'],format,'Preserve the chosen format in '+name)
    assert.equal(metadata[name==='finder'?'data-business-finder-context':'data-business-service-request'],context,'Preserve the public selection context in '+name)
    let parent=link.parent,guarded=false
    while(parent){if(ts.isConditionalExpression(parent)&&parent.condition.getText(child)===guard&&link.pos>=parent.whenTrue.pos&&link.end<=parent.whenTrue.end)guarded=true;parent=parent.parent}
    assert.ok(guarded,'Only a selected approved format reaches the form in '+name)
  }
}

test('shareable locale pages and direct form links use existing Business route',()=>{
  const page=read('app/[locale]/explore/[theme]/page.tsx')
  const form=read('components/business-website-enquiry.tsx')
  const explorer=read('components/topic-journey-selector.tsx')
  assert.match(page,/theme === 'business'/)
  assert.match(page,/<BusinessWebsiteEnquiry locale=/)
  assertBusinessEntryDelegation(explorer,read('components/business-consultation-finder.tsx'),read('components/business-service-browser.tsx'))
  assert.match(form,/id="business-direct-request"/)
  assert.match(form,/new URLSearchParams\(window.location.search\).get\("businessFormat"\)/)
  for(const kind of ['free','express','full','mentoring']){
    assert.ok(BUSINESS_FORMATS.includes(kind))
    assert.match(form,new RegExp('chosen==="'+kind+'"'))
    for(const lang of ['en','ru','es']) {
      const url=new URL('https://holistichouse.vercel.app/'+lang+'/explore/business?businessFormat='+kind+'#business-direct-request')
      assert.equal(url.pathname,'/'+lang+'/explore/business')
      assert.equal(url.searchParams.get('businessFormat'),kind)
      assert.equal(url.hash,'#business-direct-request')
    }
  }
})

test('Business child links reject missing wiring, wrong route, locale and selection guard',()=>{
  const explorer=read('components/topic-journey-selector.tsx'),finder=read('components/business-consultation-finder.tsx'),browser=read('components/business-service-browser.tsx')
  const nominal=()=>assertBusinessEntryDelegation(explorer,finder,browser)
  const cases=[
    [explorer.replace("'@/components/business-consultation-finder'","'@/components/other'"),finder,browser,/Unique actual Business child import/],
    [explorer.replace('<BusinessConsultationFinder locale={language}/>','<BusinessConsultationFinder locale="en"/>'),finder,browser,/Pass the validated locale/],
    [explorer.replace('<BusinessServiceBrowser locale={language}/>','null'),finder,browser,/Render one actual Business child/],
    [explorer,finder.replace('href="#business-direct-request"','href="https://example.invalid/send"'),browser,/Exact consent-form destination/],
    [explorer,finder,browser.replace('href="#business-direct-request"','href="#wrong-request"'),/Exact consent-form destination/],
    [explorer,finder.replace(': selected ? <div',': true ? <div'),browser,/Only a selected approved format/],
    [explorer,finder,browser.replace('{item.format ?\n            <AcquisitionEventLink','{true ?\n            <AcquisitionEventLink'),/Only a selected approved format/],
    [explorer,finder,browser.replace("'data-business-direct-option': item.format","'data-business-direct-option': 'free'"),/Preserve the chosen format/],
  ]
  for(const [e,f,b,reason] of cases){nominal();assert.ok(e!==explorer||f!==finder||b!==browser,'Mutation changes its intended source');assert.throws(()=>assertBusinessEntryDelegation(e,f,b),reason)}
})

test('public website request is opt-in, bounded, resilient to failures and stays in private CRM',()=>{
  const form=read('components/business-website-enquiry.tsx')
  const endpoint=read('app/api/services/business-consulting/route.js')
  const store=read('lib/business-consulting/enquiry-store.js')
  const review=read('components/business-consulting-landing.tsx')
  assert.match(form,/contactConsent:consent/)
  assert.match(form,/type="checkbox" required/)
  assert.match(form,/method:"POST"/)
  assert.match(form,/credentials:"same-origin"/)
  assert.match(form,/if\(body\?\.received===true\)setSuccess\(true\)/)
  assert.match(form,/href=\{"\/"\+locale\+"\/services\/business-consulting#business-offers"\}/)
  assert.match(form,/manualFallback/)
  assert.match(review,/ContactChannelChooser/)
  assert.match(endpoint,/requireSameOrigin/)
  assert.match(endpoint,/consumeRate/)
  assert.match(store,/payload_ciphertext/)
  assert.match(store,/seal\(payload/)
  assert.match(store,/business_consulting_requests/)
  assert.match(store,/on conflict do nothing/)
  assert.doesNotMatch(form,/automatic booking confirmed|payment successful/i)
  const payload={operationId:'d8929678-5c86-4ad5-95ad-6dfd7086ca71',locale:'en',format:'express',name:'Test Client',
    email:'example@example.org',question:'Please clarify a business decision.',contactConsent:true}
  assert.equal(validateBusinessEnquiry(payload).format,'express')
  assert.throws(()=>validateBusinessEnquiry({...payload,contactConsent:false}),/CONSENT_REQUIRED/)
})

test('private CRM can open directly, but still only renders for verified owner',()=>{
  const workspace=read('components/app/practice-workspace.jsx')
  const appPage=read('app/[locale]/app/[[...path]]/page.jsx')
  const crm=read('components/app/crm-manager.jsx')
  const inbox=read('components/app/crm-business-enquiries.jsx')
  assert.match(appPage,/['"]practice['"]/)
  assert.match(workspace,/params\.get\('panel'\)==='crm'/)
  assert.match(workspace,/activePanel==='crm'&&isOwner&&accountId/)
  assert.match(workspace,/if\(!activePanel\|\|!hasPracticeData\)return undefined/)
  assert.match(workspace,/\[activePanel,newServiceRequest,hasPracticeData\]/)
  assert.match(workspace,/onClick=\{\(\)=>choosePanel\('crm'\)\}/)
  assert.match(workspace,/CrmManager key=\{accountId\}/)
  assert.match(crm,/CrmBusinessEnquiries/)
  assert.match(inbox,/data-business-crm-inbox/)
  assert.match(inbox,/update_business_enquiry/)
  assert.match(inbox,/import_business_contact/)
})
