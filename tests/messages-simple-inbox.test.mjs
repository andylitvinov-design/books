import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
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

// Read-only execution of the actual media CSP expression. Existing independent
// media capabilities are false/empty here so owner and live routes are isolated.
function assertMediaPreviewScope(source){
  const ast=ts.createSourceFile('middleware.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
  assert.equal(ast.parseDiagnostics.length,0)
  const functions=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='middleware')
  assert.equal(functions.length,1)
  const declarations=functions[0].body.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations])
  function initializer(name){
    const matches=declarations.filter(node=>ts.isIdentifier(node.name)&&node.name.text===name)
    assert.equal(matches.length,1,'one actual '+name)
    assert.ok(matches[0].initializer)
    return matches[0].initializer
  }
  function predicate(name){
    const node=initializer(name)
    assert.ok(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&
      node.expression.name.text==='test'&&node.expression.expression.kind===ts.SyntaxKind.RegularExpressionLiteral&&
      node.arguments.length===1&&ts.isIdentifier(node.arguments[0])&&node.arguments[0].text==='pathname',
      name+' remains a pure pathname regex')
    return node.getText(ast)
  }
  const owner=predicate('ownerMessengerImages'),live=predicate('liveAudioPage'),csp=initializer('csp')
  assert.ok(ts.isCallExpression(csp)&&ts.isPropertyAccessExpression(csp.expression)&&
    csp.expression.name.text==='join'&&ts.isArrayLiteralExpression(csp.expression.expression))
  function hasMediaDirective(node){
    if(ts.isStringLiteral(node)&&node.text.startsWith('media-src '))return true
    return ts.forEachChild(node,hasMediaDirective)||false
  }
  const media=csp.expression.expression.elements.filter(hasMediaDirective)
  assert.equal(media.length,1,'one actual media-src directive')
  const script=new vm.Script(`const ownerMessengerImages=${owner}; const liveAudioPage=${live};
    ({owner:ownerMessengerImages,live:liveAudioPage,media:${media[0].getText(ast)}})`)
  function check(pathname,expectedOwner=false,expectedLive=false){
    const result=script.runInNewContext({pathname,tantraReikiPage:false,ownerRecorderPage:false,
      reportNarrationReader:false,reikiIntroAudioManager:false,coachingOwnerAudioManager:false,
      practitionerCourseEditor:false,publicMandalaLocalImages:false,supportMobilePublishedMedia:false,
      deliveryOrigin:'',reikiIntroAudioOrigin:'',practitionerCourseMediaOrigin:'',listingImageOrigin:'',directMessageStorageOrigin:''},{timeout:100})
    assert.equal(result.owner,expectedOwner,'owner media scope: '+pathname)
    assert.equal(result.live,expectedLive,'live media scope: '+pathname)
    assert.equal(result.media,"media-src 'self'"+(expectedOwner||expectedLive?' blob:':''),'actual media directive: '+pathname)
  }
  for(const locale of ['en','ru','es']){
    for(const suffix of ['','/']){
      check('/'+locale+'/app/messages'+suffix,true)
      check('/'+locale+'/app/practice'+suffix,true)
      check('/'+locale+'/live'+suffix,false,true)
      check('/'+locale+'/live/host'+suffix,false,true)
    }
    for(const path of ['app','app/profile','app/messages/child','app/practice/child','client/tests',
      'live-old','live/child','live/host/child','live//','live/host//','live%2Fhost','live?host=true'])check('/'+locale+'/'+path)
  }
  for(const path of ['/','/live','/live/host','/fr/live','/fr/live/host','/EN/live','/en/LIVE',
    '/prefix/en/live','//en/live','/api/live-audio/token','/admin/live','/en/client/live'])check(path)
}

test('owner sees one compact messenger rather than nested Requests + CRM + automation panels',()=>{
  const hub=read('components/app/messages-hub.jsx')
  const simple=read('components/app/messages-simple-inbox.jsx')
  const css=read('components/app/messages-simple-inbox.module.css')
  assert.match(hub,/if\(ownerAccountId\)return <div[\s\S]*?<MessagesSimpleInbox/)
  assert.match(hub,/ownerBootstrapPending&&!data/)
  assert.match(simple,/data-simple-messages/)
  assert.match(simple,/className=\{styles\.window\}/)
  assert.match(simple,/className=\{selectedKey===row\.key\?styles\.personSelected:styles\.person\}/)
  assert.match(simple,/setSelectedKey\(item\.key\)/)
  assert.match(simple,/className=\{styles\.back\}/)
  assert.match(simple,/data-detail-open=\{openDetail\?'true':'false'\}/)
  assert.match(css,/@media\(max-width:700px\)/)
  assert.match(css,/data-detail-open="true"/)
  assert.match(css,/\.peopleScroll\{[^}]*overflow-y:auto/)
  assert.match(css,/\.detail\{[^}]*display:flex/)
  assert.doesNotMatch(simple,/CrmBusinessEnquiries|CrmSalesbot|CrmLeadTriage|CrmMessagesNavigation/)
})
test('simple list retains correct source-specific identities and unread counts, no raw Telegram identity',()=>{
  const simple=read('components/app/messages-simple-inbox.jsx')
  assert.match(simple,/key:'crm:'\+item\.id/)
  assert.match(simple,/key:'direct:'\+item\.id/)
  assert.match(simple,/key:'request:'\+item\.id/)
  assert.match(simple,/key:'business:'\+item\.id/)
  assert.match(simple,/thread\.name|item\.name/)
  assert.match(simple,/row\.unread>0(?:&&|\?)<span/)
  assert.match(simple,/String\(name\|\|'\?'\)/)
  assert.doesNotMatch(simple,/api\.telegram\.org|HH_CRM_MSG_TELEGRAM_TOKEN|telegramPhotoFileId|service_role|body_ciphertext/)
  assert.match(simple,/onCrmThreads=useCallback/)
  assert.match(simple,/onDirectThreads=useCallback/)
  assert.match(simple,/new Intl\.DateTimeFormat\(locale/)
})
test('select CRM person opens authorized chat and full reply composer without hidden pipeline widgets',()=>{
  const simple=read('components/app/messages-simple-inbox.jsx')
  const crm=read('components/app/crm-messenger.jsx')
  const css=read('components/app/crm-messenger.module.css')
  assert.match(simple,/<CrmMessengerPanel key=\{accountId/)
  assert.match(simple,/conversationOnly onThreadsLoaded=\{onCrmThreads\}/)
  assert.match(simple,/initialThreadId=\{crmThreadId\}/)
  assert.match(crm,/conversationOnly=false/)
  assert.match(crm,/!conversationOnly&&\(!compact\|\|showSettings\)&&<div id="hh-crm-channel-settings"/)
  assert.match(crm,/!conversationOnly&&\(!compact\|\|showTools\)&&<div className=\{styles\.workflowActions\}/)
  assert.match(crm,/!conversationOnly&&<div className=\{styles\.contactActions\}/)
  assert.match(crm,/!conversationOnly&&\(!compact\|\|showQuickReplies\)&&<div id="hh-crm-quick-replies"/)
  assert.match(crm,/conversationOnly\?styles\.detailConversation:styles\.conversation/)
  assert.match(crm,/onClick=\{send\}/)
  assert.match(crm,/CrmTelegramPhoto/)
  assert.match(css,/\.detailConversation \.compose/)
  assert.match(css,/\.detailConversation \.messages/)
  assert.doesNotMatch(simple,/sendOneMessengerMessage\(|ensureTelegramWebhook\(|HH_CRM_MSG_PRODUCTION_APPROVED/)
})
test('first-party private messages retain their separate secure API and detail presentation',()=>{
  const simple=read('components/app/messages-simple-inbox.jsx')
  const direct=read('components/app/direct-message-inbox.jsx')
  assert.match(simple,/<DirectMessageInbox key=\{accountId/)
  assert.match(simple,/simpleDetail expectedAccountId=\{accountId\} initialThreadId=\{directThreadId\}/)
  assert.match(direct,/data-simple-detail=\{simpleDetail\|\|undefined\}/)
  assert.match(direct,/onThreadsLoaded\?\.\(data\.threads\|\|\[\]\)/)
  assert.match(direct,/if\(simpleDetail&&accountId&&initialThreadId/)
  assert.match(direct,/<div className=\{styles\.chat\}>/)
  assert.match(direct,/await post\(\{action:'send',threadId:activeId/)
})
test('website consultation remains accessible and manual WhatsApp/email are never auto-sent',()=>{
  const simple=read('components/app/messages-simple-inbox.jsx')
  const portal=read('components/app/practice-request-conversation.jsx')
  assert.match(simple,/<PracticeRequestConversation key=\{selected\.id\} inline autoOpen/)
  assert.match(simple,/requestKind!=='public'/)
  assert.match(simple,/app\/practice\?panel=clients&requestId=/)
  assert.match(simple,/selected\.item\.replyChannel==='whatsapp'/)
  assert.match(simple,/selected\.item\.replyChannel==='email'/)
  assert.match(simple,/cleanPhone\(selected\.item\.phone\)/)
  assert.match(portal,/if\(props\.inline\)return <MessageConversation/)
  assert.match(portal,/!inline&&view\.canNote/)
  assert.doesNotMatch(simple,/action:'send'|POST \/api\/app\/crm|sendMessage\(/)
})

test('owner account change remounts one-screen inbox before old private conversation state can render',()=>{
  const hub=read('components/app/messages-hub.jsx')
  const simple=read('components/app/messages-simple-inbox.jsx')
  assert.match(hub,/if\(ownerAccountId\)return <div[\s\S]*?<MessagesSimpleInbox key=\{ownerAccountId\}/)
  assert.match(hub,/const sameAccount=!data\|\|!ownerInfo\|\|data\.accountId===ownerInfo\.accountId/)
  assert.match(simple,/setSelectedKey\(''\);setOpenDetail\(false\)/)
  assert.match(simple,/setDirectThreads\(\[\]\);setPortraits\(\{\}\)/)
  assert.match(simple,/<CrmMessengerPanel key=\{accountId/)
  assert.match(simple,/<DirectMessageInbox key=\{accountId/)
})

test('client card is available in the owner one-screen chat and existing full CRM',()=>{
  const simple=read('components/app/messages-simple-inbox.jsx')
  const legacy=read('components/app/crm-messenger.jsx')
  const card=read('components/app/messages-contact-card.jsx')
  const css=read('components/app/messages-contact-card.module.css')
  assert.match(simple,/setShowCard\(value=>!value\)/)
  assert.match(simple,/contactId:item\.contactId/)
  assert.match(simple,/showCard&&selected&&<MessagesContactCard/)
  assert.match(simple,/hidden=\{showCard\|\|selected\?\.kind!=='crm'\}/)
  assert.match(simple,/hidden=\{showCard\|\|\(selected\?\.kind!=='direct'&&!recipient\)\}/)
  assert.match(legacy,/showContactCard&&!conversationOnly/)
  assert.match(legacy,/onBack=\{\(\)=>setShowContactCard\(false\)\}/)
  assert.match(card,/data-messages-client-card/)
  assert.match(card,/\/api\/app\/crm\/contact/)
  assert.match(card,/\/api\/app\/crm\/messenger\?/)
  assert.match(card,/function threadMatches\(data,item\)/)
  assert.match(card,/row.id===item.id&&row.contactId===item.contactId/)
  assert.match(card,/threadMatches\(threadData,item\)/)
  assert.match(card,/data\.accountId!==accountId\|\|data\.threadId!==item\.id/)
  assert.match(card,/abort\.abort\(\)/)
  assert.match(card,/state\.key===stateKey/)
  assert.match(card,/CrmTelegramPhoto/)
  assert.match(card,/\/api\/app\/direct-messages\/media/)
  assert.match(card,/panel=clients&requestId=/)
  assert.match(css,/@media\(max-width:430px\)/)
  assert.doesNotMatch(card,/telegramPhotoFileId|api\.telegram\.org|service_role|localStorage|mailto:/)
})
test('master link uses only a verified approved practitioner, never a name guess',()=>{
  const store=read('lib/practitioners/direct-messages.js')
  const card=read('components/app/messages-contact-card.jsx')
  const simple=read('components/app/messages-simple-inbox.jsx')
  const middleware=read('middleware.ts')
  assert.match(store,/master\.trusted_auth_user_id=t\.sender_account_id/)
  assert.match(store,/master\.status='approved'/)
  assert.match(store,/recipient_status==='approved'/)
  assert.match(store,/peerMasterSlug:/)
  assert.match(simple,/peerMasterSlug:item\.peerMasterSlug\|\|''/)
  assert.match(card,/kind==='direct'&&validSlug\(item\.peerMasterSlug\)/)
  assert.match(card,/\/masters\/'\+masterSlug/)
  assertImagePreviewScope(middleware)
  assert.match(middleware,/const ownerMessengerImages =/)
  assert.match(middleware,/ownerMessengerImages \|\| publicMandalaLocalImages \? ' blob:' : ''/)
  assert.match(middleware,/directMessageStorageOrigin/)
  assertMediaPreviewScope(middleware)
  assert.match(middleware,/directMessageStorageOrigin = \(\(\) => \{\s*if \(!ownerMessengerImages\) return ''/)
  assert.match(middleware,/\+ directMessageStorageOrigin \+ externalVideoUploadOrigin/)
  assert.doesNotMatch(store,/master\.display_name=t\.sender_display_name/)
})

// Evaluate the callbacks extracted from current JSX, not a parallel model.
function sourceCallable(path,name,context){
  const source=read(path),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.equal(ast.parseDiagnostics.length,0)
  const found=[]
  const visit=node=>{
    if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found.push(node)
    if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name&&node.initializer){
      const init=node.initializer
      found.push(ts.isCallExpression(init)&&init.expression.getText(ast)==='useCallback'?init.arguments[0]:init)
    }
    ts.forEachChild(node,visit)
  };visit(ast);assert.equal(found.length,1,name+' uniquely extracted')
  return vm.runInNewContext('('+found[0].getText(ast)+')',context)
}
function scopeHarness(){
  const scope={current:{accountId:'owner-a',slug:'master-one'}},events=[]
  const ctx={accountId:'owner-a',recipientScope:scope,onRecipientConsumed:()=>events.push('consume'),
    setSelectedKey:value=>events.push(value),setOpenDetail:value=>events.push(['open',value]),setShowCard:()=>{}}
  ctx.consumeRecipient=sourceCallable('components/app/messages-simple-inbox.jsx','consumeRecipient',ctx)
  ctx.isRecipientCurrent=sourceCallable('components/app/messages-simple-inbox.jsx','isRecipientCurrent',ctx)
  const started=sourceCallable('components/app/messages-simple-inbox.jsx','onRecipientStarted',ctx)
  return {ctx,scope,events,started}
}
test('actual owner recipient callback consumes once and rejects replay, wrong recipient and account switch',()=>{
  const h=scopeHarness()
  assert.equal(h.started('thread-one','wrong-master','owner-a'),false)
  assert.equal(h.started('thread-one','master-one','owner-b'),false)
  assert.deepEqual(h.events,[])
  assert.equal(h.started('thread-one','master-one','owner-a'),true)
  assert.equal(h.scope.current,null)
  assert.equal(h.started('thread-one','master-one','owner-a'),false)
  assert.equal(h.events.filter(value=>value==='consume').length,1)
  assert.equal(h.events.filter(value=>value==='direct:thread-one').length,1)
  const switched=scopeHarness();switched.ctx.accountId='owner-b'
  assert.equal(switched.started('thread-one','master-one','owner-a'),false)
  assert.deepEqual(switched.events,[])
})
function directStartHarness(){
  let resolvePost
  const h=scopeHarness(),events=[]
  const ctx={busy:false,startPending:{current:false},destination:'master-one',accountId:'owner-a',
    lifetime:{current:1},recipientSlug:'master-one',expectedAccountId:'owner-a',
    isRecipientCurrent:h.ctx.isRecipientCurrent,onRecipientStarted:h.started,
    setBusy:value=>events.push(['busy',value]),setError:value=>events.push(['error',value]),
    post:()=>{events.push('post');return new Promise(resolve=>{resolvePost=resolve})},
    getThreads:async()=>{events.push('threads');return {threads:[{id:'thread-one'}]}},
    openThread:()=>{throw new Error('controlled flow must not open an unguarded detail')},
    setDestination:()=>{throw new Error('parent owns controlled consumption')}}
  return {h,ctx,events,start:sourceCallable('components/app/direct-message-inbox.jsx','start',ctx),
    resolve:()=>resolvePost({threadId:'thread-one'})}
}
test('actual direct start ignores double click and replay after successful one-shot handoff',async()=>{
  const x=directStartHarness(),pending=x.start()
  await x.start();assert.equal(x.events.filter(v=>v==='post').length,1)
  x.resolve();await pending
  assert.equal(x.h.events.filter(v=>v==='direct:thread-one').length,1)
  await x.start();assert.equal(x.events.filter(v=>v==='post').length,1)
})
test('actual direct start discards pending response on account switch, cancellation and unmount',async()=>{
  for(const invalidate of [x=>{x.h.ctx.accountId='owner-b'},x=>{x.h.ctx.consumeRecipient()},x=>{x.ctx.lifetime.current++}]){
    const x=directStartHarness(),pending=x.start();invalidate(x);x.resolve();await pending
    assert.equal(x.events.filter(v=>v==='threads').length,0)
    assert.equal(x.h.events.filter(v=>v==='direct:thread-one').length,0)
  }
})
test('owner order wrapper retains explicit back navigation and a single keyed guarded inbox',()=>{
  const hub=read('components/app/messages-hub.jsx')
  const owner=hub.slice(hub.indexOf('if(ownerAccountId)return'),hub.indexOf('if(ownerBootstrapPending'))
  assert.equal((owner.match(/<MessagesSimpleInbox\b/g)||[]).length,1)
  assert.match(owner,/key=\{ownerAccountId\}/)
  assert.match(owner,/href=\{'\/'\+locale\+'\/app\/messages\?section=clients'\}/)
  assert.match(owner,/onRecipientConsumed=\{consumeRecipient\}/)
  assert.match(owner,/recipientIntent=\{recipientIntent\?\.accountId===ownerAccountId\?recipientIntent:null\}/)
  assert.doesNotMatch(owner,/<DirectMessageInbox|directDestination/)
})
function sourceEffect(path,marker,context){
  const source=read(path),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX),found=[]
  const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes(marker))found.push(node.arguments[0]);ts.forEachChild(node,visit)}
  visit(ast);assert.equal(found.length,1,marker+' unique effect')
  return vm.runInNewContext('('+found[0].getText(ast)+')',context)
}
test('actual direct lifecycle cleanup invalidates pending start and clears account-scoped drafts',async()=>{
  const x=directStartHarness(),cleared=[]
  Object.assign(x.ctx,{readGeneration:{current:0},setDraft:v=>cleared.push(['draft',v]),setFile:v=>cleared.push(['file',v]),
    setAllowPublicReuse:v=>cleared.push(['reuse',v]),uploadRef:{current:'old-upload'},operationRef:{current:'old-op'}})
  const cleanup=sourceEffect('components/app/direct-message-inbox.jsx','const life=lifetime',x.ctx)()
  assert.deepEqual(cleared,[['draft',''],['file',null],['reuse',false]])
  assert.equal(x.ctx.uploadRef.current,null);assert.equal(x.ctx.operationRef.current,null)
  const pending=x.start();cleanup();x.resolve();await pending
  assert.equal(x.ctx.readGeneration.current,1)
  assert.equal(x.events.filter(v=>v==='threads').length,0)
  assert.equal(x.h.events.filter(v=>v==='direct:thread-one').length,0)
})
test('actual recipient effect cleanup invalidates pending handoff without consuming a newer scope',()=>{
  const h=scopeHarness(),replaced=[]
  Object.assign(h.ctx,{recipient:'master-one',setTab:()=>{},URL,
    window:{location:{href:'https://example.invalid/en/app/messages?to=master-one&tab=requests'},
    history:{state:null,replaceState:(_s,_t,url)=>replaced.push(url)}}})
  const effect=sourceEffect('components/app/messages-simple-inbox.jsx','const scope={accountId,slug:recipient}',h.ctx)
  const cleanup=effect();cleanup()
  assert.equal(h.scope.current,null)
  assert.equal(h.started('thread-one','master-one','owner-a'),false)
  assert.equal(replaced[0],'/en/app/messages?to=master-one')
  const oldCleanup=effect();const newer={accountId:'owner-a',slug:'master-two'};h.scope.current=newer;oldCleanup()
  assert.equal(h.scope.current,newer)
})
test('actual hub consumption removes recipient from URL, preserving unrelated section and fragment',()=>{
  let intent='pending',next=''
  const consume=sourceCallable('components/app/messages-hub.jsx','consumeRecipient',{
    setRecipientIntent:value=>{intent=value},URL,
    window:{location:{href:'https://example.invalid/en/app/messages?to=master-one&section=clients#thread'},
      history:{state:{synthetic:true},replaceState:(_s,_t,url)=>{next=url}}}})
  consume();assert.equal(intent,null);assert.equal(next,'/en/app/messages?section=clients#thread')
})
test('actual audio preview effect uses browser URL even when API URL constant shadows it, and revokes on cleanup',()=>{
  const events=[],file={type:'audio/webm',name:'synthetic.webm'}
  const ctx={URL:'/api/app/direct-messages',globalThis:{URL:{createObjectURL:value=>{assert.equal(value,file);events.push('create');return 'blob:synthetic'},revokeObjectURL:value=>events.push(['revoke',value])}},
    file,AUDIO_MIMES:new Set(['audio/webm']),directMediaMime:value=>value.type,setAudioPreview:value=>events.push(['preview',value])}
  const effect=sourceEffect('components/app/direct-message-inbox.jsx','createObjectURL(file)',ctx)
  const cleanup=effect();assert.deepEqual(events,['create',['preview','blob:synthetic']]);cleanup()
  assert.deepEqual(events.at(-1),['revoke','blob:synthetic'])
  ctx.file=null;assert.equal(effect(),undefined);assert.deepEqual(events.at(-1),['preview',''])
})

test('actual media preview CSP preserves owners and limits live blob permission to anchored locale routes',()=>{
  const source=read('middleware.ts')
  assertMediaPreviewScope(source)
  for(const [name,from,to] of [
    ['global media permission','||ownerMessengerImages||liveAudioPage)','||ownerMessengerImages||true)'],
    ['removed owner media permission','||ownerMessengerImages||liveAudioPage)','||liveAudioPage)'],
    ['global live predicate',"const liveAudioPage = /^\\/(en|ru|es)\\/live(?:\\/host)?\\/?$/.test(pathname)",'const liveAudioPage = true'],
    ['unanchored live route',"/^\\/(en|ru|es)\\/live(?:\\/host)?\\/?$/","/\\/(en|ru|es)\\/live/"],
  ]){
    assert.equal(source.split(from).length,2,'unique '+name+' mutation target')
    assert.throws(()=>assertMediaPreviewScope(source.replace(from,to)),name)
  }
})
