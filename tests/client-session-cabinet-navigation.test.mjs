import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {runInNewContext} from 'node:vm'

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('private consultation uses site navigation and two consent-safe next actions on both access paths',()=>{
  const component=read('components/client-session-page.jsx')
  const save=read('components/save-client-session-to-account.jsx')
  const entry=read('components/client-session-cabinet-entry.jsx')
  const guest=read('app/[locale]/client/session/[shareSelector]/page.js')
  const cabinet=read('app/[locale]/client/[selector]/sessions/[sessionId]/page.js')
  assert.match(component,/PublicSiteHeader/)
  assert.match(component,/sessionBottomActions/)
  assert.match(component,/SaveClientSessionToAccount/)
  assert.match(component,/href=\{'\/'\+locale\+'\/client'\}/)
  assert.match(save,/navigation\?\.requestSave\(\)/)
  assert.doesNotMatch(component,/variant="header"|variant="footer"/)
  assert.match(component,/cabinetSessionPage/)
  for(const section of ["'my-tests'","'my-courses'","reports","cabinet"])
    assert.ok(entry.includes(section),section)
  assert.match(guest,/authorizeSessionGuest/)
  assert.match(cabinet,/authorizeCabinetRequest/)
  assert.match(guest,/appAvailable=\{appEnabled\(\)\}/)
  assert.match(cabinet,/appAvailable=\{appEnabled\(\)\}/)
})

test('session buttons reuse verified OAuth, without creating a private-cabinet claim or leaking guest selectors',()=>{
  const entry=read('components/client-session-cabinet-entry.jsx')
  assert.match(entry,/appFetch\('bootstrap'\)/)
  assert.match(entry,/e\?\.status!==401/)
  assert.match(entry,/appFetch\('auth\/start',\{locale,continueTo:kind\}\)/)
  assert.match(entry,/window\.location\.assign\(destination\.href\)/)
  assert.match(entry,/Signing in with Google does not automatically import/)
  assert.doesNotMatch(entry,/clientId|shareSelector|sourceConsultationId|shareSecret|sessionSecret|sessionId/)
  // Known cabinet destinations only; no open redirect return URL accepted.
  assert.match(entry,/cabinet:\{path:'portrait'/)
  assert.match(entry,/'my-tests':\{path:'tests'/)
  assert.match(entry,/'my-courses':\{path:'course'/)
  assert.match(entry,/reports:\{path:'portrait#personal-reports'/)
})

// Inspect only the actual web OAuth callback; evaluate URL expressions, never the route.
function assertOAuthFailureRedirects(route) {
 const ast=ts.createSourceFile('route.js',route,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
 assert.equal(ast.parseDiagnostics.length,0)
 const strip=n=>ts.isParenthesizedExpression(n)?strip(n.expression):n
 const text=n=>n.getText(ast).replace(/\s+/g,'')
 const equal=(n,key,value)=>ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.EqualsEqualsEqualsToken&&
  ts.isIdentifier(n.left)&&n.left.text===key&&ts.isStringLiteral(n.right)&&n.right.text===value
 const callbacks=[]
 const visit=n=>{if(ts.isIfStatement(n)&&ts.isBinaryExpression(n.expression)&&
  n.expression.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken&&
  equal(n.expression.left,'joined','auth/callback')&&equal(n.expression.right,'method','GET'))callbacks.push(n);ts.forEachChild(n,visit)}
 visit(ast);assert.equal(callbacks.length,1,'one actual web OAuth callback')
  // Bind the selected callback to the real exported handler, not a dead decoy.
 const handlers=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='handle')
 assert.equal(handlers.length,1)
 const handler=handlers[0]
 assert.ok(handler.modifiers?.some(n=>n.kind===ts.SyntaxKind.AsyncKeyword))
 const exports=ast.statements.filter(ts.isExportDeclaration).flatMap(n=>n.exportClause&&ts.isNamedExports(n.exportClause)?[...n.exportClause.elements]:[])
 for(const name of ['GET','HEAD','POST']){
  const matches=exports.filter(n=>n.name.text===name)
  assert.equal(matches.length,1);assert.equal(matches[0].propertyName?.text,'handle')
 }
 assert.equal(handler.body.statements.length,2,'no extra handler early exit')
 assert.equal(text(handler.body.statements[0]),'letauth')
 const guarded=handler.body.statements[1]
 assert.ok(ts.isTryStatement(guarded)&&guarded.catchClause&&!guarded.finallyBlock)
 assert.ok(callbacks[0].parent===guarded.tryBlock,'callback is directly reachable in actual handler try block')
 const preceding=[...guarded.tryBlock.statements].slice(0,guarded.tryBlock.statements.indexOf(callbacks[0]))
 assert.equal(preceding.length,5,'no extra path before callback dispatch')
 assert.ok(ts.isVariableStatement(preceding[0])&&ts.isExpressionStatement(preceding[2])&&ts.isVariableStatement(preceding[3]))
 assert.ok(ts.isIfStatement(preceding[1])&&ts.isIfStatement(preceding[4]))
 assert.equal(text(preceding[1].expression),"method!=='GET'&&method!=='HEAD'")
 assert.equal(text(preceding[4].expression),"joined==='auth/start'&&method==='POST'")
 // Close the GET dispatch spine: no alternate live branch or executable
 // initializer can intercept the callback before its reviewed error legs.
 assert.equal(handler.parameters.map(text).join(','),'request,{params}')
 assert.ok(!preceding[1].elseStatement&&!preceding[4].elseStatement&&!callbacks[0].elseStatement)
 assert.equal(text(preceding[0]),"constconfig=getAppConfig(),origin=requestOrigin(request,config),path=(awaitparams).path||[],method=request.method,joined=path.join('/')")
 assert.equal(text(preceding[1].thenStatement),'requireSameOrigin(request,config)')
 assert.equal(text(preceding[2]),'auth=createRequestAuth(request,config)')
 assert.equal(text(preceding[3]),'constjson=(data,status=200)=>auth.apply(NextResponse.json(data,{status,headers:PRIVATE_HEADERS}))')
 assert.ok(ts.isBlock(callbacks[0].thenStatement))
 const statements=callbacks[0].thenStatement.statements
 const declarations=new Map(),declarationStatements=new Map()
 for(const statement of statements)if(ts.isVariableStatement(statement))for(const d of statement.declarationList.declarations)
  if(ts.isIdentifier(d.name)){assert.ok(!declarations.has(d.name.text));declarations.set(d.name.text,d.initializer);declarationStatements.set(d.name.text,statement)}
 assert.ok(declarations.has('destination'))
 assert.ok(declarationStatements.get('destination').declarationList.flags&ts.NodeFlags.Const)
 const redirect=statement=>{
  assert.ok(ts.isReturnStatement(statement)&&statement.expression)
  const wrapped=statement.expression
  assert.ok(ts.isCallExpression(wrapped)&&text(wrapped.expression)==='auth.apply'&&wrapped.arguments.length===1,'cookie wrapper retained')
  const call=wrapped.arguments[0]
  assert.ok(ts.isCallExpression(call)&&text(call.expression)==='NextResponse.redirect'&&call.arguments.length===2)
  const options=call.arguments[1]
  assert.ok(ts.isObjectLiteralExpression(options)&&options.properties.length===2)
  const fields=new Map(options.properties.map(p=>{assert.ok(ts.isPropertyAssignment(p)&&ts.isIdentifier(p.name));return[p.name.text,p.initializer]}))
  assert.equal(fields.size,2);assert.ok(fields.has('status')&&fields.has('headers'))
  assert.ok(ts.isNumericLiteral(fields.get('status'))&&fields.get('status').text==='303')
  assert.ok(ts.isIdentifier(fields.get('headers'))&&fields.get('headers').text==='PRIVATE_HEADERS')
  return call.arguments[0]
 }
 const legs=[]
 for(const statement of statements)if(ts.isIfStatement(statement)&&ts.isReturnStatement(statement.thenStatement)){
  const returnText=text(statement.thenStatement)
  if(!returnText.startsWith('returnauth.apply(NextResponse.redirect('))continue
  const result=redirect(statement.thenStatement)
  assert.ok(ts.isCallExpression(result)&&result.arguments.length===1&&ts.isStringLiteral(result.arguments[0]))
  const label=result.arguments[0].text
  assert.ok(['cancelled','failed'].includes(label))
  if(label==='cancelled')assert.equal(text(statement.expression),"url.searchParams.has('error')||!code||code.length>4096")
  else assert.ok(ts.isIdentifier(statement.expression)&&statement.expression.text==='error')
  const fn=strip(result.expression)
  assert.ok(ts.isArrowFunction(fn)&&fn.parameters.length===1&&ts.isIdentifier(fn.parameters[0].name)&&ts.isBlock(fn.body))
  const value=fn.parameters[0].name.text,body=fn.body.statements
  assert.equal(body.length,3)
  assert.ok(ts.isVariableStatement(body[0])&&body[0].declarationList.declarations.length===1)
  const d=body[0].declarationList.declarations[0]
  assert.ok(ts.isIdentifier(d.name)&&ts.isNewExpression(d.initializer)&&text(d.initializer.expression)==='URL'&&d.initializer.arguments.length===1)
  const target=d.initializer.arguments[0]
  assert.ok(ts.isIdentifier(target)&&declarations.has(target.text),'URL target bound to actual local producer')
  assert.ok(declarationStatements.get(target.text).declarationList.flags&ts.NodeFlags.Const)
  assert.ok(statements.indexOf(declarationStatements.get(target.text))<statements.indexOf(statement),'target initialized before error leg')
  assert.equal(text(body[1]),`${d.name.text}.searchParams.set('auth',${value});`)
  assert.ok(ts.isReturnStatement(body[2])&&text(body[2].expression)===`${d.name.text}.href`)
  legs.push({label,target:target.text,expression:result,exit:statement.thenStatement})
 }
 assert.deepEqual(legs.map(x=>x.label),['cancelled','failed'],'both real error legs in order')
 const last=statements.at(-1),success=redirect(last)
 assert.ok(ts.isIdentifier(success)&&success.text==='destination','success preserves selected destination')
 assert.equal(text(statements.at(-3)), 'constactor=awaitauth.verified()')
 assert.equal(text(statements.at(-2)), 'awaitcreateAppRepository(config).ensureAccount(actor)')
 // Every direct-lifetime exit must belong to the reviewed validation/native/web
 // spine. Nested function returns (the pure URL IIFEs) have separate lifetimes.
 const destinationIndex=statements.indexOf(declarationStatements.get('destination'))
 const beforeWeb=[...statements].slice(1,destinationIndex)
 const validationGuards=[
  "coachingMode!==null&&(continueTo!=='coaching'||!['egyptian','greek'].includes(coachingMode))",
  "coachingLang!==null&&(continueTo!=='coaching'||coachingLang!=='es'||coachingMode===null)",
  text(declarations.get('destination')).includes('PRACTICE_PREVIEW_ACTIONS')
   ? '!validPracticeContinuation(continueTo,profi)'
   : "profi!==null&&(continueTo!=='my-practice'||!['session','intro','workshop','diagnostic','energy','personal','course','profile','requests'].includes(profi))",
  "(continueTo==='enquiry'&&!safeEnquiryReturnPath(returnPath,locale))||(continueTo!=='enquiry'&&returnPath!==null)",
  "program!==null&&(continueTo!=='course'||!['stress','confidence','focus'].includes(program))",
  'intentId','serviceId','requestId!==null',
  "(continueTo==='consultations')!==Boolean(requestId)",
  "(intentId&&serviceId)||(continueTo&&(!['tests','course','consultations','business','coaching','cabinet','my-practice','practice-preview','my-tests','my-courses','reports','practitioner-growth','practitioner-seo','practitioner-acquisition','practitioner-tools','practitioner-youtubeConnect','energywork','practitioner','enquiry','coaching-intake'].includes(continueTo)||intentId||serviceId))",
  "url.searchParams.get('native')==='1'",
 ]
 assert.ok(ts.isVariableStatement(statements[0]))
 assert.deepEqual(statements[0].declarationList.declarations.map(d=>d.name.getText(ast)),
  ['url','locale','code','intentId','serviceId','continueTo','program','requestId','returnPath','profi','coachingMode','coachingLang'])
 assert.equal(beforeWeb.length,validationGuards.length)
 const expectedExits=[]
 for(const [index,guard]of beforeWeb.entries()){
  assert.ok(ts.isIfStatement(guard)&&!guard.elseStatement)
  assert.equal(text(guard.expression),validationGuards[index])
  if(index<10){
   if(index>=5&&index<=7){
    assert.ok(ts.isExpressionStatement(guard.thenStatement))
    assert.equal(text(guard.thenStatement),`requireUUID(${['intentId','serviceId','requestId'][index-5]})`)
   }else{
    assert.ok(ts.isThrowStatement(guard.thenStatement))
    assert.equal(text(guard.thenStatement.expression),"newAppError('INVALID_CONTINUATION',400)")
    expectedExits.push(guard.thenStatement)
   }
  }else{
   assert.ok(ts.isBlock(guard.thenStatement))
   const native=guard.thenStatement.statements,validation=native[0],nativeReturn=native.at(-1)
   assert.ok(ts.isIfStatement(validation)&&text(validation.expression)==="continueTo==='enquiry'"&&!validation.elseStatement)
   assert.ok(ts.isThrowStatement(validation.thenStatement)&&text(validation.thenStatement.expression)==="newAppError('INVALID_CONTINUATION',400)")
   assert.equal(text(redirect(nativeReturn)),'handoff.toString()')
   expectedExits.push(validation.thenStatement,nativeReturn)
  }
 }
 expectedExits.push(...legs.map(leg=>leg.exit),last)
 const exits=[]
 const collect=node=>{if(ts.isFunctionLike(node))return;if(ts.isReturnStatement(node)||ts.isThrowStatement(node))exits.push(node);ts.forEachChild(node,collect)}
 statements.forEach(collect)
 assert.equal(exits.length,expectedExits.length,'no unreviewed live return or throw')
 assert.ok(exits.every((node,index)=>node===expectedExits[index]),'only reviewed exits retain their actual order')
 const names=new Set(['origin','locale','intentId','serviceId','continueTo','requestId','returnPath','program','coachingMode','coachingLang','profi','destination','PRACTICE_PREVIEW_ACTIONS'])
 const operators=new Set([ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.PlusToken,ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken])
 function audit(n){
  n=strip(n)
  if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||n.kind===ts.SyntaxKind.NullKeyword)return
  if(ts.isIdentifier(n)){assert.ok(names.has(n.text),'closed pure expression binding');return}
  if(ts.isConditionalExpression(n)){audit(n.condition);audit(n.whenTrue);audit(n.whenFalse);return}
  if(ts.isBinaryExpression(n)){assert.ok(operators.has(n.operatorToken.kind));audit(n.left);audit(n.right);return}
  if(ts.isTemplateExpression(n)){for(const s of n.templateSpans)audit(s.expression);return}
  if(ts.isArrayLiteralExpression(n)){for(const e of n.elements){assert.ok(ts.isStringLiteral(e))}return}
  if(ts.isCallExpression(n)){
   if(ts.isIdentifier(n.expression)&&n.expression.text==='encodeURIComponent'){assert.equal(n.arguments.length,1);audit(n.arguments[0]);return}
   if(ts.isPropertyAccessExpression(n.expression)&&text(n.expression)==='Object.hasOwn'){
    assert.equal(n.arguments.length,2);assert.equal(text(n.arguments[0]),'PRACTICE_PREVIEW_ACTIONS');audit(n.arguments[1]);return
   }
   if(ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='includes'&&ts.isArrayLiteralExpression(n.expression.expression)){
    audit(n.expression.expression);assert.equal(n.arguments.length,1);audit(n.arguments[0]);return
   }
  }
  assert.fail('non-pure URL expression: '+ts.SyntaxKind[n.kind])
 }
 const destination=declarations.get('destination');audit(destination)
 const targets=[...new Set(legs.map(x=>x.target))]
 for(const target of targets)if(target!=='destination')audit(declarations.get(target))
 // The only optional external binding is an actual static action dictionary.
 let actions=Object.create(null)
 if(text(destination).includes('PRACTICE_PREVIEW_ACTIONS')){
  const matches=ast.statements.filter(ts.isVariableStatement).flatMap(s=>[...s.declarationList.declarations])
   .filter(d=>ts.isIdentifier(d.name)&&d.name.text==='PRACTICE_PREVIEW_ACTIONS')
  assert.equal(matches.length,1)
  const init=matches[0].initializer
  assert.ok(ts.isCallExpression(init)&&text(init.expression)==='Object.freeze'&&init.arguments.length===1&&ts.isObjectLiteralExpression(init.arguments[0]))
  for(const p of init.arguments[0].properties){
   assert.ok(ts.isPropertyAssignment(p)&&(ts.isIdentifier(p.name)||ts.isStringLiteral(p.name))&&ts.isStringLiteral(p.initializer))
   assert.ok(!Object.hasOwn(actions,p.name.text));actions[p.name.text]=p.initializer.text
  }
  assert.ok(Object.hasOwn(actions,'session')&&Object.hasOwn(actions,'course'))
 }
 const evaluate=(expression,bindings)=>runInNewContext('('+expression.getText(ast)+')',bindings,{timeout:100})
 let cases=0
 for(const locale of ['en','ru','es'])for(const spec of [
  {continueTo:'practice-preview',profi:null,path:'practice'},
  {continueTo:'practice-preview',profi:'session',path:'practice'},
  {continueTo:'practice-preview',profi:'course',path:'practice'},
  {continueTo:'tests',path:'app/tests?selection=pending'},
  {continueTo:'course',program:'stress',path:'app/course?program=stress'},
  {continueTo:'reports',path:'app/portrait#personal-reports'},
  {continueTo:'cabinet',path:'app/portrait'},
 ]){
  const origin='https://example.test',bindings={origin,locale,intentId:null,serviceId:null,requestId:null,returnPath:null,
   program:null,coachingMode:null,coachingLang:null,profi:null,...spec,PRACTICE_PREVIEW_ACTIONS:actions,encodeURIComponent,URL}
  bindings.destination=evaluate(destination,bindings)
  for(const target of targets)if(target!=='destination')bindings[target]=evaluate(declarations.get(target),bindings)
  for(const leg of legs){
   const expected=new URL(`${origin}/${locale}/${spec.path}`);expected.searchParams.set('auth',leg.label)
   assert.equal(evaluate(leg.expression,bindings),expected.href,`${locale} ${spec.continueTo} ${spec.profi||''} ${leg.label}`)
   cases++
  }
 }
 assert.equal(cases,42)
}

test('OAuth server continues only to fixed first-party screens and preserves existing course/test handoff',()=>{
 const route=read('app/api/app/[...path]/route.js')
 for(const value of ["'tests'","'course'","'cabinet'","'my-tests'","'my-courses'","'reports'"])
   assert.ok(route.includes(value),value)
 assert.match(route,/INVALID_CONTINUATION/)
 assert.match(route,/if \(program !== null/)
 assert.match(route,/continueTo === 'reports'/)
 assertOAuthFailureRedirects(route)
 assert.match(route,/scopes: 'openid email profile'/)
 assert.doesNotMatch(route,/continueTo.*client\/session/)
})

test('recipe reuses warm paper/terra-cotta Google cabinet styling with compact mobile controls',()=>{
 const css=read('components/client-session.module.css')
 const workspace=read('app/[locale]/app/[[...path]]/workspace.css')
 for(const token of ['#3e342e','#bf4f2e','#fffdf7','#e6dbcc'])
   assert.ok(css.includes(token)&&workspace.includes(token),token)
 for(const name of ['.cabinetHeaderButton','.cabinetBridge','.cabinetBridgeLinks',
  '.cabinetBridgePrimary','.cabinetSessionPage','.cabinetBridgePrivacy'])
   assert.ok(css.includes(name),name)
 assert.match(css,/max-width:700px/)
 assert.match(css,/min-height:48px/)
})

test('report save CTA has one short primary action and a separate Google explanation in EN/RU/ES',()=>{
  const page=read('components/client-session-page.jsx')
  const save=read('components/save-client-session-to-account.jsx')
  const copy=read('lib/clients/session-save-copy.js')
  const modal=read('components/session-exit-save-guard.jsx')
  const css=read('components/client-session.module.css')
  assert.match(page,/sessionBottomDescription/)
  assert.match(page,/mode==='saved'\?saveCopy\.savedTitle:saveCopy\.title/)
  assert.match(page,/SESSION_SAVE_COPY\[locale\]/)
  assert.match(copy,/Сохранить мой отчёт/)
  assert.match(copy,/Save my report/)
  assert.match(copy,/Guardar mi informe/)
  assert.match(copy,/Через Google · без нового пароля/)
  assert.match(copy,/With Google · no new password/)
  assert.match(copy,/Con Google · sin crear otra contraseña/)
  assert.match(save,/sessionBottomPrimaryCopy/)
  assert.match(save,/navigation\?\.requestSave\(\)/)
  assert.doesNotMatch(save,/Войти в мой кабинет и сохранить отчёт/)
  assert.match(modal,/saveCopy\.modalTitle/)
  assert.match(modal,/onClick=\{confirmAndSave\}/)
  assert.match(css,/\.sessionBottomTrust/)
  assert.match(css,/\.sessionBottomDescription/)
  assert.match(css,/@media\(max-width:700px\)/)
})
