import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
import * as navigation from '../scripts/helpers/cabinet-navigation-verifier.mjs'
const {openCabinetMyTests}=navigation
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const workspace=read('components/app/app-workspace.jsx')
const css=read('app/[locale]/app/[[...path]]/workspace.css')
const all=(root,predicate)=>{const found=[];const visit=n=>{if(predicate(n))found.push(n);ts.forEachChild(n,visit)};visit(root);return found}
const one=items=>{assert.equal(items.length,1);return items[0]}
const attr=(node,name)=>node.attributes.properties.find(x=>ts.isJsxAttribute(x)&&x.name.text===name)?.initializer
const unwrap=n=>ts.isParenthesizedExpression(n)?unwrap(n.expression):n
const jsx=(tag,props,...children)=>({tag,props:props||{},children:children.flat(Infinity).filter(x=>x!==false&&x!=null)})
const nodes=n=>n&&typeof n==='object'?[n,...n.children.flatMap(nodes)]:[]
const text=n=>typeof n==='string'||typeof n==='number'?String(n):(n?.children||[]).map(text).join('')
function producer(source=workspace,locale='en',current='portrait'){
 const file=ts.createSourceFile('workspace.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
 assert.equal(file.parseDiagnostics.length,0)
 const component=one(file.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='AppWorkspace'&&n.modifiers?.some(x=>x.kind===ts.SyntaxKind.ExportKeyword)&&n.modifiers?.some(x=>x.kind===ts.SyntaxKind.DefaultKeyword)))
 const statements=component.body.statements,returned=statements.at(-1)
 assert.ok(ts.isReturnStatement(returned)&&ts.isJsxElement(unwrap(returned.expression)))
 assert.equal(unwrap(returned.expression).openingElement.tagName.getText(file),'SubscriptionProvider')
 const guards=statements.filter(ts.isIfStatement)
 assert.deepEqual(guards.map(n=>n.expression.getText(file).replace(/\s/g,'')),["deleted||state==='deletion'","state==='loading'","state==='ready'&&!data","state!=='ready'&&page==='course'&&state!=='unavailable'","state!=='ready'&&page==='portrait'&&!stressSignup","state!=='ready'"])
 assert.ok(guards.every(n=>!n.elseStatement&&ts.isReturnStatement(n.thenStatement)))
 const exits=[];const visit=n=>{if(ts.isFunctionLike(n))return;if(ts.isReturnStatement(n)||ts.isThrowStatement(n))exits.push(n);ts.forEachChild(n,visit)};statements.forEach(visit)
 const expected=[...guards.map(n=>n.thenStatement),returned];assert.equal(exits.length,expected.length);assert.ok(exits.every((n,i)=>n===expected[i]))
 const declarations=statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations])
 const nav=one(declarations.filter(n=>n.name.getText(file)==='nav'))
 const mobileNav=one(declarations.filter(n=>n.name.getText(file)==='mobileNav'))
 assert.ok(ts.isArrayLiteralExpression(nav.initializer)&&ts.isArrayLiteralExpression(mobileNav.initializer))
 const menu=one(all(returned,n=>ts.isJsxElement(n)&&attr(n.openingElement,'className')?.text==='hh-account-menu'))
 assert.equal(menu.openingElement.tagName.getText(file),'details')
 const menuGuards=[]
 for(let n=menu.parent;n!==returned;n=n.parent){assert.ok(n&&!ts.isFunctionLike(n));assert.ok(!ts.isConditionalExpression(n));if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken)menuGuards.push(n.left.getText(file).replace(/\s/g,''))}
 assert.ok(menuGuards.length === 1 && ['!documentReader', '!documentReader&&!practiceInner'].includes(menuGuards[0]))
 assert.equal(menu.children.filter(n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText(file)==='summary').length,1)
 const holder=one(menu.children.filter(n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText(file)==='div'))
 const map=one(holder.children.filter(ts.isJsxExpression).map(n=>n.expression).filter(n=>n&&ts.isCallExpression(n)&&n.expression.getText(file)==='nav.map'))
 assert.ok(ts.isArrowFunction(map.arguments[0]));const link=unwrap(map.arguments[0].body)
 assert.ok(ts.isJsxElement(link)&&link.openingElement.tagName.getText(file)==='Link')
 assert.equal(attr(link.openingElement,'href').expression.getText(file),'href')
 assert.equal(attr(link.openingElement,'prefetch').expression.kind,ts.SyntaxKind.FalseKeyword)
 const primary=className=>one(all(returned,n=>ts.isJsxElement(n)&&attr(n.openingElement,'className')?.text===className))
 const desktop=primary('hh-nav'),mobile=primary('hh-mobile-app-nav')
 const active=one(declarations.filter(n=>n.name.getText(file)==='navIsActive'))
 const bindings={locale,page:current,recordId:null,root:'/'+locale+'/app',data:{account:{displayName:'Synthetic account'}},c:{account:'Account',history:'History',monitoring:'Monitoring',settings:'Settings',signout:'Sign out'},busy:false,logout:()=>{throw Error('No auth operation')},Link:'a',jsx}
 for(const name of ['House','UserRound','BookOpen','ClipboardList','Users','MessageCircle','BarChart3','SlidersHorizontal'])bindings[name]='icon'
 const code='const nav='+nav.initializer.getText(file)+';const mobileNav='+mobileNav.initializer.getText(file)+';const navIsActive='+active.initializer.getText(file)+';globalThis.result={nav,mobileNav,desktop:('+desktop.getText(file)+'),mobile:('+mobile.getText(file)+'),menu:('+menu.getText(file)+')};'
 const compiled=ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.React,jsxFactory:'jsx',target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
 vm.runInNewContext(compiled,bindings,{timeout:1000});const result=bindings.result
 assert.deepEqual(Array.from(result.mobileNav,x=>x.id),['practice','messages','portfolio','settings'])
 const direct=one(result.menu.children.filter(n=>n?.tag==='div')).children.filter(n=>n?.tag==='a')
 assert.equal(direct.length,6)
 return {desktop:result.desktop,mobile:result.mobile,links:direct,summary:one(result.menu.children.filter(n=>n?.tag==='summary'))}
}
function fixture(locale='en',{width=390,initialOpen=false,source=workspace,broken={},destination='tests'}={}){
 const p=producer(source,locale),events=[],origin='http://127.0.0.1:3100',path='/'+locale+'/app/'+destination
 let open=initialOpen,url=origin+'/'+locale+'/app/portrait'
 const locator=(kind,list,visible=true)=>({kind,list,visible,
  first(){return locator(kind,list.slice(0,1),visible)},
  locator(selector){
   if(kind==='menu'&&selector===':scope > summary')return locator('summary',[p.summary],!broken.hiddenSummary)
   assert.equal(kind,'menu');const match=/^:scope > div > a\[href="([^"]+)"\]$/.exec(selector);assert.ok(match)
   const found=p.links.filter(n=>n.props.href===match[1]);return locator('link',broken.duplicateLink?[...found,...found]:found,open&&!broken.hiddenLink)
  },
  async getAttribute(name){assert.equal(kind,'menu');assert.equal(name,'open');return open?'':null},
  async click(...args){assert.deepEqual(args,[],'real unforced user click');assert.equal(list.length,1);assert.ok(visible);events.push('click:'+kind)
   if(kind==='summary'){if(!broken.noOpen)open=!open;return}
   if(kind==='nav-link'){url=origin+list[0].props.href;return}
   assert.equal(kind,'link');assert.ok(open);list[0].props.onClick({currentTarget:{closest:s=>{assert.equal(s,'details.hh-account-menu');return {removeAttribute:n=>{assert.equal(n,'open');open=false;events.push('close-menu')}}}}});url=broken.wrongNavigation?origin+'/en/app/portrait':origin+list[0].props.href
  }})
 const page={url:()=>url,locator(selector){
  if(selector==='details.hh-account-menu:visible')return locator('menu',broken.missingMenu?[]:broken.duplicateMenu?[p.menu,p.menu]:[p.menu])
  if(selector==='nav a[href="'+path+'"]:visible')return locator('nav-link',width<=760?[]:p.desktop.children.filter(n=>n?.tag==='a'&&n.props.href===path))
  assert.equal(selector,'[data-my-tests-dashboard]');return locator('dashboard',[{}],url===origin+path&&!broken.missingDashboard)
 }}
 const expect=target=>({
  async toHaveCount(n){assert.equal(target.list.length,n);events.push('count:'+target.kind)},
  async toBeVisible(){assert.equal(target.list.length,1);assert.ok(target.visible);events.push('visible:'+target.kind)},
  async toHaveText(value){assert.equal(text(target.list[0]),value);events.push('label')},
  async toHaveAttribute(name,value){if(target.kind==='menu'){assert.equal(name,'open');assert.equal(open,true);assert.equal(value,'');events.push('open-checked')}else{assert.equal(name,'href');assert.equal(target.list[0].props.href,value);events.push('href')}},
  async toHaveURL(value,options){assert.equal(target,page);assert.equal(value,url);if(destination==='tests')assert.equal(options.timeout,30000);else assert.equal(options,undefined);events.push('url')},
 })
 return {page,expect,origin,events,isOpen:()=>open}
}
test('actual account menu is the current localized Tests surface; mobile nav has no Tests',()=>{
 assert.match(css,/@media\(max-width:760px\)\{\s*\.hh-app\{[^}]*\}\s*\.hh-app \.hh-nav\{display:none!important\}/)
 assert.match(css,/\.hh-app \.hh-account-menu summary\{display:flex;/)
 assert.match(css,/\.hh-mobile-app-nav\{\s*display:grid;/)
 for(const locale of ['en','ru']){const p=producer(workspace,locale);const link=one(p.links.filter(n=>n.props.href==='/'+locale+'/app/tests'));assert.equal(text(link),locale==='ru'?'Тесты':'Tests')}
})
for(const locale of ['en','ru'])for(const width of [390,820])for(const initialOpen of [false,true])test(`${locale} ${width} actual account-menu gesture, initially ${initialOpen?'open':'closed'}`,async()=>{
 const f=fixture(locale,{width,initialOpen});await openCabinetMyTests(f.page,f.expect,{origin:f.origin,locale})
 assert.deepEqual(f.events,['count:menu','visible:menu','count:summary','visible:summary',...(initialOpen?[]:['click:summary']),'open-checked','count:link','visible:link','label','href','click:link','close-menu','url','visible:dashboard'])
 assert.equal(f.events.filter(x=>x==='click:summary').length,initialOpen?0:1);assert.equal(f.events.filter(x=>x==='click:link').length,1)
 assert.ok(f.events.indexOf('open-checked')<f.events.indexOf('click:link'));assert.ok(f.events.indexOf('href')>=0&&f.events.indexOf('href')<f.events.indexOf('click:link'))
 assert.ok(f.events.includes('close-menu'));assert.equal(f.isOpen(),false);assert.deepEqual(f.events.slice(-2),['url','visible:dashboard'])
})
test('missing, ambiguous, hidden, inert and wrong-route navigation cannot pass',async()=>{
 for(const name of ['missingMenu','duplicateMenu','hiddenSummary','noOpen','duplicateLink','hiddenLink','wrongNavigation','missingDashboard']){const f=fixture('en',{broken:{[name]:true}});await assert.rejects(()=>openCabinetMyTests(f.page,f.expect,{origin:f.origin}),{code:'ERR_ASSERTION'})}
 for(const [before,after] of [["href: root + '/tests'","href: root + '/elsewhere'"],["'Тесты' : 'Tests'","'Тесты' : 'Wrong'"],['<Link key={id} href={href}','<Link key={id} href={root}'],[workspace.includes('!documentReader && !practiceInner && <header') ? '!documentReader && !practiceInner && <header' : '!documentReader && <header','false && <header'],['  return (\n    <SubscriptionProvider','  return null;\n  return (\n    <SubscriptionProvider']]){
  assert.ok(workspace.includes(before));await assert.rejects(async()=>{const f=fixture('en',{source:workspace.replace(before,after)});await openCabinetMyTests(f.page,f.expect,{origin:f.origin})},{code:'ERR_ASSERTION'})
 }
})
for(const locale of ['en','ru'])test(locale+' repeated Tests use the actual account disclosure without direct navigation',async()=>{
 for(const initialOpen of [false,true]){
  const f=fixture(locale,{initialOpen})
  await openCabinetMyTests(f.page,f.expect,{origin:f.origin,locale});await openCabinetMyTests(f.page,f.expect,{origin:f.origin,locale})
  assert.equal(f.events.filter(x=>x==='click:summary').length,initialOpen?1:2)
  assert.equal(f.events.filter(x=>x==='click:link').length,2);assert.equal(f.isOpen(),false)
 }
})

test('old nav-only Tests selector has no mobile match while desktop still has its real link',async()=>{
 for(const locale of ['en','ru']){
  const selector='nav a[href="/'+locale+'/app/tests"]:visible'
  const mobile=fixture(locale,{width:390});await assert.rejects(()=>mobile.expect(mobile.page.locator(selector).first()).toBeVisible(),{code:'ERR_ASSERTION'})
  const desktop=fixture(locale,{width:820});await desktop.expect(desktop.page.locator(selector).first()).toBeVisible()
 }
})
