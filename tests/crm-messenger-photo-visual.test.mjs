import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import vm from 'node:vm'
import ts from 'typescript'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

// Execute the current source predicates and img-src composition, not a second
// implementation of the CSP. This checks existing route scope; it neither
// changes middleware nor establishes approval for unrelated public features.
function assertImagePreviewScope(source){
  const ast=ts.createSourceFile('middleware.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
  assert.equal(ast.parseDiagnostics.length,0,'middleware must parse')
  const middleware=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='middleware')
  assert.equal(middleware.length,1,'one actual middleware function')
  const declarations=middleware[0].body.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations])
  function initializer(name){
    const matches=declarations.filter(node=>ts.isIdentifier(node.name)&&node.name.text===name)
    assert.equal(matches.length,1,'one actual '+name+' declaration')
    assert.ok(matches[0].initializer,'initializer required for '+name)
    return matches[0].initializer
  }
  function predicate(name){
    const node=initializer(name)
    assert.ok(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&
      node.expression.name.text==='test'&&node.expression.expression.kind===ts.SyntaxKind.RegularExpressionLiteral&&
      node.arguments.length===1&&ts.isIdentifier(node.arguments[0])&&node.arguments[0].text==='pathname',
      name+' must remain a pure pathname regex predicate')
    return node.getText(ast)
  }
  const owner=predicate('ownerMessengerImages'),mandala=predicate('publicMandalaLocalImages')
  const csp=initializer('csp')
  assert.ok(ts.isCallExpression(csp)&&ts.isPropertyAccessExpression(csp.expression)&&
    csp.expression.name.text==='join'&&ts.isArrayLiteralExpression(csp.expression.expression),
    'extract img-src from the actual joined CSP array')
  function hasImageDirective(node){
    if(ts.isStringLiteral(node)&&node.text.startsWith('img-src '))return true
    return ts.forEachChild(node,hasImageDirective)||false
  }
  const images=csp.expression.expression.elements.filter(hasImageDirective)
  assert.equal(images.length,1,'one actual img-src directive')
  const script=new vm.Script(`const ownerMessengerImages=${owner}; const publicMandalaLocalImages=${mandala};
    ({owner:ownerMessengerImages,mandala:publicMandalaLocalImages,image:${images[0].getText(ast)}})`)
  function check(pathname,expectedOwner=false,expectedMandala=false){
    // Unrelated image-origin capabilities are neutralized, never evaluated.
    const result=script.runInNewContext({pathname,academyVideoPage:false,publicVideoDocument:false,
      listingImageOrigin:'',eventsPosterImageOrigin:'',practitionerCourseMediaOrigin:'',reikiPhotoOrigin:'',directMessageStorageOrigin:''},{timeout:100})
    assert.equal(result.owner,expectedOwner,'owner route scope: '+pathname)
    assert.equal(result.mandala,expectedMandala,'existing public route scope: '+pathname)
    assert.equal(result.image,"img-src 'self' data: https://www.google-analytics.com"+
      (expectedOwner||expectedMandala?' blob:':''),'actual image directive: '+pathname)
  }
  for(const locale of ['en','ru','es']){
    for(const suffix of ['','/']){
      check('/'+locale+'/app/messages'+suffix,true)
      check('/'+locale+'/app/practice'+suffix,true)
      check('/'+locale+'/holistic-support/mandala'+suffix,false,true)
    }
    for(const path of ['app','app/profile','app/messages-old','app/messages/child','app/messages//',
      'app/practice-old','app/practice/child','app/practice//','holistic-support',
      'holistic-support/mandala-old','holistic-support/mandala/child','holistic-support/mandala//',
      'holistic-support/mandala%2Fchild','masters/synthetic','client/messages'])check('/'+locale+'/'+path)
  }
  for(const path of ['/','/app/messages','/holistic-support/mandala','/fr/app/messages','/fr/app/practice',
    '/fr/holistic-support/mandala','/EN/app/messages','/en/APP/messages','/en/holistic-support/Mandala',
    '/prefix/en/app/messages','/prefix/en/holistic-support/mandala','//en/app/messages'])check(path)
}

test('Telegram photo blob previews are allowed only on the two owner messenger routes',()=>{
  const middleware=read('middleware.ts')
  const declaration=middleware.match(/const ownerMessengerImages = (\/\^.+\/)\.test\(pathname\)/)
  assert.ok(declaration,'private owner-messenger image route guard exists')
  const guardedPaths=runInNewContext(declaration[1])
  for(const path of ['/en/app/messages','/ru/app/messages','/es/app/messages',
    '/en/app/practice','/ru/app/practice/','/es/app/practice']){
    assert.equal(guardedPaths.test(path),true,path)
  }
  for(const path of ['/','/en','/en/services/free-situation-review','/en/client/123',
    '/en/app/reports','/en/app/portrait','/api/app/crm/messenger/photo',
    '/en/app/messages/someone-else','/admin']){
    assert.equal(guardedPaths.test(path),false,path)
  }
  assertImagePreviewScope(middleware)
  assert.match(middleware,/\(ownerMessengerImages \|\| publicMandalaLocalImages \? ' blob:' : ''\)/)
  assert.match(middleware,/directMessageStorageOrigin/)
  assert.match(middleware,/directMessageStorageOrigin,\n    "font-src/)
  assert.doesNotMatch(middleware,/img-src[^\n]* https:\/\/\*\./)
  assert.match(middleware,/"frame-src 'none'"/)
  assert.match(middleware,/"object-src 'none'"/)
})

test('Photos are resolved only in authenticated owner CRM thread and have retries and image error states',()=>{
  const ui=read('components/app/crm-telegram-photo.jsx')
  const css=read('components/app/crm-telegram-photo.module.css')
  assert.match(ui,/fetch\('\/api\/app\/crm\/messenger\/photo\?'/)
  assert.match(ui,/credentials:'same-origin',cache:'no-store'/)
  assert.match(ui,/'X-HH-Account-Id':accountId/)
  assert.match(ui,/new URLSearchParams\(\{threadId,messageId\}\)/)
  assert.match(ui,/URL\.createObjectURL\(blob\)/)
  assert.match(ui,/URL\.revokeObjectURL\(objectUrl\)/)
  assert.match(ui,/onLoad=\{\(\)=>setState\('ready'\)\}/)
  assert.match(ui,/onError=\{\(\)=>setState\('error'\)\}/)
  assert.match(ui,/setRetry\(value=>value\+1\)/)
  assert.match(ui,/<PrivateChatPhoto src=\{src\}/)
  const viewer=read('components/app/private-chat-photo.jsx')
  const viewerCss=read('components/app/private-chat-photo.module.css')
  assert.match(viewer,/aria-expanded=\{open\}/)
  assert.match(viewer,/role="dialog" aria-modal="true"/)
  assert.match(viewer,/event.key==='Escape'/)
  assert.match(viewer,/trigger.current\?\.focus\(\)/)
  assert.match(viewer,/createPortal\(/)
  assert.match(viewerCss,/position:fixed;inset:0/)
  assert.match(viewerCss,/safe-area-inset-top/)
  assert.doesNotMatch(viewer,/api.telegram.org|file_id|sessionStorage|localStorage/)
  assert.doesNotMatch(ui,/api\.telegram\.org|file_id|telegramPhotoFileId/)
})

test('Private photos remain linked to the new one-screen customer messenger',()=>{
  const chat=read('components/app/crm-messenger.jsx')
  const css=read('components/app/crm-messenger.module.css')
  const inbox=read('components/app/messages-simple-inbox.jsx')
  assert.match(chat,/photoOnlyMessage=/)
  for(const marker of ['Voluntary photo attached for private review',
    'Client portrait photo, shared voluntarily for private review',
    'ME-GOAL-OBSTACLE drawing, shared voluntarily for private review'])
    assert.ok(chat.includes(marker),marker)
  assert.match(chat,/!m\.photo\|\|!photoOnlyMessage\.test\(String\(m\.text\|\|''\)\.trim\(\)\)/)
  assert.match(chat,/m\.photo&&selected\.channel==='telegram'&&<CrmTelegramPhoto/)
  assert.match(chat,/purpose=\{m\.photoPurpose==='drawing'\?'drawing':'portrait'\}/)
  assert.match(chat,/placeholder=\{conversationOnly\|\|compact\?/)
  assert.match(inbox,/function PrivateAvatar\(/)
  assert.match(inbox,/portrait=\{selected\.kind==='crm'/)
  assert.match(inbox,/conversationOnly onThreadsLoaded=\{onCrmThreads\}/)
  assert.match(css,/\.detailConversation \.compose textarea\{grid-column:1/)
  assert.match(css,/\.detailConversation \.compose>button\{grid-column:2/)
})
