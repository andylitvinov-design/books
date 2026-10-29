import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const parse=text=>ts.createSourceFile('source.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
const all=(node,predicate)=>{const out=[];const walk=x=>{if(predicate(x))out.push(x);ts.forEachChild(x,walk)};walk(node);return out}
const one=(nodes)=>{assert.equal(nodes.length,1);return nodes[0]}
const named=(file,name)=>one(all(file,x=>ts.isVariableDeclaration(x)&&x.name.getText()===name))
const fn=(file,name)=>one(file.statements.filter(x=>ts.isFunctionDeclaration(x)&&x.name?.text===name))
const jsx=(tag,props,...children)=>({tag,props:props||{},children:children.flat(Infinity).filter(x=>x!==false&&x!=null)})
const evaluate=(text,bindings={})=>{
 const output=ts.transpileModule('const result=('+text+');',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None,jsx:ts.JsxEmit.React,jsxFactory:'jsx',jsxFragmentFactory:'Fragment'}}).outputText
 return new Function(...Object.keys(bindings),'jsx','Fragment',output+';return result')(...Object.values(bindings),jsx,'fragment')
}
const attr=(node,name)=>node.attributes.properties.find(x=>ts.isJsxAttribute(x)&&x.name.getText()===name)
const literalAttr=(node,name)=>attr(node,name)?.initializer?.text
const textContent=node=>typeof node==='string'?node:(node?.children||[]).map(textContent).join('')
const producer=parse(read('components/app/profile-domains.jsx'))
const profileFn=fn(producer,'ProfileDomains')
const profileRoot=one(all(profileFn,x=>ts.isJsxElement(x)&&attr(x.openingElement,'data-profile-domains')))
const legacyHeader=one(all(profileRoot,x=>ts.isJsxElement(x)&&literalAttr(x.openingElement,'className')==='hh-domain-hero'))
const reportArchive=one(all(profileRoot,x=>ts.isJsxElement(x)&&attr(x.openingElement,'data-profile-report-archive')))
const legacyH1=one(all(legacyHeader,x=>ts.isJsxElement(x)&&x.openingElement.tagName.getText(producer)==='h1'))
const accountH1=one(all(reportArchive,x=>ts.isJsxElement(x)&&literalAttr(x.openingElement,'id')==='hh-account-report-title'))
const helperSource=read('scripts/helpers/cabinet-navigation-verifier.mjs')
const helper=s=>evaluate(fn(parse(s),'assertCabinetPortrait').getText(parse(s)).replace(/^export\s+/,''))
function profileView(locale,mode='account'){
 const b={locale,mode,interactive:true,reportsContent:jsx('synthetic-reports',{})}
 b.WORDS=evaluate(named(producer,'WORDS').initializer.getText(producer))
 for(const name of ['ru','t','external'])b[name]=evaluate(named(profileFn,name).initializer.getText(producer),b)
 const legacyGuard=legacyHeader.parent
 assert.ok(ts.isBinaryExpression(legacyGuard))
 assert.equal(legacyGuard.operatorToken.kind,ts.SyntaxKind.AmpersandAmpersandToken)
 const showLegacy=evaluate(legacyGuard.left.getText(producer),b)
 const reportGuard=reportArchive.parent
 assert.ok(ts.isBinaryExpression(reportGuard))
 const showArchive=evaluate(reportGuard.left.getText(producer),b)
 const conditional=one(all(reportArchive,x=>ts.isConditionalExpression(x)&&x.condition.getText(producer)==='external'&&ts.isJsxFragment(x.whenFalse)&&x.whenFalse.getText(producer).includes('hh-account-report-title')))
 const account=showArchive&&!evaluate(conditional.condition.getText(producer),b)
 const heading=showLegacy?legacyH1:account?accountH1:null
 return evaluate(profileRoot.openingElement.getText(producer)+(heading?heading.getText(producer):'')+'</section>',b)
}
function mockPage(view,locale){
 const page={url:'http://127.0.0.1:3100/'+locale+'/app/portrait',locator(selector){
  const match=selector.includes('[data-profile-domains]')&&view.props['data-profile-domains']===true&&view.props['data-profile-interactive']==='true'&&(!selector.includes('[data-profile-mode="account"]')||view.props['data-profile-mode']==='account')
  return {present:match,getByRole(role,options){return{present:match&&role==='heading'&&options.level===1&&options.exact===true&&view.children.some(h=>h.tag==='h1'&&textContent(h)===options.name)}}}
 }}
 return page
}
const expect=target=>({async toHaveURL(value,options){assert.equal(target.url,value);assert.equal(options.timeout,30000)},async toBeVisible(){assert.equal(target.present,true)},async toHaveCount(n){assert.equal(target.count ?? (target.present?1:0),n)},async toHaveAttribute(name,value){assert.equal(target.view.props[name],value)}})
const assertProfile=helper(helperSource)
for(const locale of ['en','ru'])test('actual account '+locale+' JSX matches signed-in helper; legacy stays separate',async()=>{
 const account=profileView(locale)
 assert.equal(textContent(account),locale==='ru'?'Мои отчёты':'My reports')
 await assertProfile(mockPage(account,locale),expect,{origin:'http://127.0.0.1:3100',locale})
 const legacy=profileView(locale,'legacy')
 assert.equal(textContent(legacy),locale==='ru'?'Мой профиль и отчёты':'My profile & reports')
 await assert.rejects(assertProfile(mockPage(legacy,locale),expect,{origin:'http://127.0.0.1:3100',locale}),{code:'ERR_ASSERTION'})
})
test('actual account producer wiring and readiness remain; stale heading and noninteractive controls fail',async()=>{
 const workspace=parse(read('components/app/app-workspace.jsx'))
 const call=one(all(workspace,x=>ts.isJsxSelfClosingElement(x)&&x.tagName.getText(workspace)==='ProfileDomains'))
 assert.equal(literalAttr(call,'mode'),'account')
 assert.ok(ts.isJsxFragment(attr(call,'reportsContent').initializer.expression))
 const view=profileView('en');view.props['data-profile-interactive']='false'
 await assert.rejects(assertProfile(mockPage(view,'en'),expect,{origin:'http://127.0.0.1:3100'}),{code:'ERR_ASSERTION'})
 const wrongMode=profileView('en');wrongMode.props['data-profile-mode']='legacy'
 await assert.rejects(assertProfile(mockPage(wrongMode,'en'),expect,{origin:'http://127.0.0.1:3100'}),{code:'ERR_ASSERTION'})
 await assert.rejects(assertProfile(mockPage(profileView('en'),'en'),expect,{origin:'http://127.0.0.1:3101'}),{code:'ERR_ASSERTION'})
 const stale=helper(helperSource.replace("'My reports'","'My profile & reports'"))
 await assert.rejects(stale(mockPage(profileView('en'),'en'),expect,{origin:'http://127.0.0.1:3100'}),{code:'ERR_ASSERTION'})
 const wrongLocale=helper(helperSource.replace("'Мои отчёты'","'My reports'"))
 await assert.rejects(wrongLocale(mockPage(profileView('ru'),'ru'),expect,{origin:'http://127.0.0.1:3100',locale:'ru'}),{code:'ERR_ASSERTION'})
})
const verifier=parse(read('scripts/verify-app-r1.mjs'))
const journey=fn(verifier,'verifyPublicServiceConversionJourneys')
const daoBranch=one(all(journey,x=>ts.isIfStatement(x)&&x.expression.getText(verifier)==="kind==='dao'"&&x.thenStatement.getText(verifier).includes('data-free-entry-landing')))
const serviceOracle=(source=daoBranch.getText(verifier))=>new Function('servicePage','expect','locale','kind','return(async()=>{'+source+'})()')
function serviceView(locale,kind){
 const path=kind==='dao'?'components/free-entry-landing.tsx':'components/alchemy-soul-landing.tsx'
 const file=parse(read(path));const component=fn(file,kind==='dao'?'FreeEntryLanding':'AlchemySoulLanding')
 const main=one(all(component,x=>ts.isJsxElement(x)&&x.openingElement.tagName.getText(file)==='main'))
 const h1=one(all(main,x=>ts.isJsxElement(x)&&x.openingElement.tagName.getText(file)==='h1'))
 const b={locale,kind,styles:{page:'inert-page'},copy:evaluate(named(file,'copy').initializer.getText(file))}
 b.t=evaluate(named(component,'t').initializer.getText(file),b)
 return evaluate(main.openingElement.getText(file)+h1.getText(file)+'</main>',b)
}
function servicePage(input){const views=Array.isArray(input)?input:[input];return{locator(selector){
 const dao=selector==='main[data-free-entry-landing="dao"]'
 const alchemy=selector==='main[data-core-service-detail="alchemy"] h1'
 const matched=views.filter(view=>view.tag==='main'&&(dao?view.props['data-free-entry-landing']==='dao':alchemy?view.props['data-core-service-detail']==='alchemy'&&view.children.some(h=>h.tag==='h1'):false))
 const view=matched[0],present=matched.length>0
 return{view,present,count:matched.length,getByRole(role,options){return{present:present&&role==='heading'&&options.level===1&&options.exact===true&&view.children.some(h=>h.tag==='h1'&&textContent(h)===options.name)}}}
}}}
for(const locale of ['en','ru'])test('actual DAO '+locale+' route/main/heading matches focused verifier branch',async()=>{
 const route=parse(read('app/[locale]/services/dao-health-profile/page.tsx'))
 const entry=one(all(route,x=>ts.isJsxSelfClosingElement(x)&&x.tagName.getText(route)==='FreeEntryLanding'))
 assert.equal(literalAttr(entry,'kind'),'dao')
 const view=serviceView(locale,'dao')
 await serviceOracle()(servicePage(view),expect,locale,'dao')
 await assert.rejects(serviceOracle()(servicePage([view,view]),expect,locale,'dao'),{code:'ERR_ASSERTION'})
 const old="await expect(servicePage.locator('main[data-core-service-detail=\"'+kind+'\"] h1')).toBeVisible({timeout:30000})"
 await assert.rejects(serviceOracle(old)(servicePage(view),expect,locale,'dao'),{code:'ERR_ASSERTION'})
 await assert.rejects(serviceOracle()(servicePage(view),expect,locale==='ru'?'en':'ru','dao'),{code:'ERR_ASSERTION'})
 const missing={...view,props:{...view.props,'data-free-entry-landing':'wrong'}}
 await assert.rejects(serviceOracle()(servicePage(missing),expect,locale,'dao'),{code:'ERR_ASSERTION'})
 const stale={...view,children:[jsx('h1',{},'stale title')]}
 await assert.rejects(serviceOracle()(servicePage(stale),expect,locale,'dao'),{code:'ERR_ASSERTION'})
})
test('analogous Alchemy producer still matches unchanged else path; no broad selector replacement',async()=>{
 const route=parse(read('app/[locale]/services/alchemy-of-soul/page.tsx'))
 assert.equal(all(route,x=>ts.isJsxSelfClosingElement(x)&&x.tagName.getText(route)==='AlchemySoulLanding').length,1)
 for(const locale of ['en','ru'])await serviceOracle()(servicePage(serviceView(locale,'alchemy')),expect,locale,'alchemy')
 assert.equal(daoBranch.elseStatement.getText(verifier),"await expect(servicePage.locator('main[data-core-service-detail=\"'+kind+'\"] h1')).toBeVisible({timeout:30000})")
 assert.match(daoBranch.thenStatement.getText(verifier),/timeout:30000/)
})
