// Signed-in *synthetic* Messages UI only. No Google, production, customer data or real sends.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const require=createRequire(import.meta.url)
const {chromium,webkit}=require(process.env.HH_PLAYWRIGHT_PACKAGE||'playwright')
const origin=process.env.HH_MESSAGES_QA_ORIGIN||'http://127.0.0.1:3127'
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error('Loopback browser environment only')
const dir='artifacts/messages-wellness'
await mkdir(dir,{recursive:true})
const accountId='11111111-1111-4111-8111-111111111111'
const orderId='22222222-2222-4222-8222-222222222222'
const requestId='33333333-3333-4333-8333-333333333333'
const synthetic={
  id:orderId,status:'in_progress',createdAt:'2026-10-27T14:02:00Z',
  practitionerName:'Test Practitioner',unread:1,serviceCopy:{
    ru:{title:'Тестовый разбор'},en:{title:'Synthetic review'},es:{title:'Revisión sintética'}},
  message:'Synthetic-only enquiry, no private data',durationMinutes:45,
}
const client={
  id:requestId,requestKind:'practice',contact:{displayName:'Synthetic Client'},
  createdAt:'2026-10-27T15:12:00Z',lastConversationAt:'2026-10-28T11:22:00Z',
  message:'Synthetic-only client enquiry',needsReply:true,newMessageCount:1,status:'requested',
}
const json=(route,status,body)=>route.fulfill({status,contentType:'application/json',
  headers:{'Cache-Control':'no-store'},body:JSON.stringify(body)})
async function intercept(page){
 await page.route('**/api/app/**',async route=>{
   const url=new URL(route.request().url()),path=url.pathname
   if(route.request().method()!=='GET')return json(route,403,{error:'SYNTHETIC_READ_ONLY'})
   if(path==='/api/app/messages/my-orders')
     return json(route,200,{accountId,orders:[synthetic],hasPractice:true,hasMore:false})
   if(path==='/api/app/messages/requests')
     return json(route,200,url.searchParams.get('view')==='owner'
       ?{accountId,ownerMessenger:true}
       :{accountId,ownerMessenger:true,ownerAuthorized:true,hasPractice:true,
         requests:[client],businessEnquiries:[],services:[],freeExpressV2Enabled:false})
   if(path==='/api/app/crm/messenger')
     return json(route,200,{accountId,threads:[],messages:[],nextThreadsCursor:null,nextMessagesCursor:null})
   if(path==='/api/app/direct-messages')
     return json(route,200,{accountId,threads:[]})
   if(path==='/api/app/practitioner-client-messages')
     return json(route,200,{requestId:url.searchParams.get('requestId'),actorRole:'client',
       canReply:true,canNote:false,unseenCount:0,messages:[],nextCursor:null})
   return json(route,401,{error:'SYNTHETIC_FIXTURE_ONLY'})
 })
}
const report=[]
const labels={
 ru:{orders:'Мои заказы',clients:'Мои клиенты',name:'Тестовый разбор'},
 en:{orders:'My orders',clients:'My clients',name:'Synthetic review'},
 es:{orders:'Mis pedidos',clients:'Mis clientes',name:'Revisión sintética'},
}
for(const browserType of [chromium,webkit]){
 const browser=await browserType.launch({headless:true})
 try{
  for(const locale of ['ru','en','es'])for(const width of [320,354,390,430]){
   const key=[browserType.name(),locale,width].join('-')
   const page=await browser.newPage({viewport:{width,height:844},
     deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'})
   const errors=[]
   page.on('pageerror',e=>errors.push(e.message))
   try{
    await intercept(page)
    const result=await page.goto(origin+'/'+locale+'/app/messages',
      {waitUntil:'domcontentloaded',timeout:90000})
    assert.equal(result?.status(),200,key+' route')
    const root=page.locator('[data-orders-clients-hub]')
    await root.waitFor({state:'visible',timeout:40000})
    const orderTab=root.getByRole('tab',{name:new RegExp(labels[locale].orders)})
    await orderTab.waitFor({state:'visible',timeout:30000})
    await root.locator('#hh-orders-panel > button').filter({hasText:labels[locale].name})
      .first().waitFor({state:'visible',timeout:35000})
    assert.equal(await orderTab.getAttribute('aria-selected'),'true',key+' order default')
    const metrics=await page.evaluate(()=>{
      const doc=document.documentElement
      const root=document.querySelector('[data-orders-clients-hub]')
      const box=el=>{if(!el)return null;const r=el.getBoundingClientRect()
        return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}}
      return {clientWidth:doc.clientWidth,scrollWidth:doc.scrollWidth,
        heading:box(root.querySelector('header')),intro:box(root.querySelector('[class*="introCard"]')),
        tabs:box(root.querySelector('[role="tablist"]')),
        search:box(root.querySelector('input[type="search"]')),
        card:box(root.querySelector('#hh-orders-panel > button'))}
    })
    assert.ok(metrics.scrollWidth<=metrics.clientWidth+3,key+' horizontal overflow '+JSON.stringify(metrics))
    assert.ok(metrics.heading.bottom<=metrics.intro.top+4&&
      metrics.intro.bottom<=metrics.tabs.top+4&&metrics.tabs.bottom<=metrics.search.top+4,
      key+' section order '+JSON.stringify(metrics))
    assert.ok(metrics.card.width>200&&metrics.card.right<=width+3,
      key+' order card fits '+JSON.stringify(metrics))
    if(width===390)await page.screenshot({path:dir+'/'+key+'-orders.png',fullPage:false})
    await root.getByRole('tab',{name:new RegExp(labels[locale].clients)}).click()
    const customer=page.locator('[data-embedded="true"][data-simple-messages]')
    await customer.waitFor({state:'visible',timeout:30000})
    await customer.getByRole('button',{name:/Synthetic Client/}).waitFor({state:'visible',timeout:25000})
    assert.equal(await root.getByRole('tab',{name:new RegExp(labels[locale].clients)})
      .getAttribute('aria-selected'),'true')
    assert.equal(await customer.locator('[role="tablist"]').count(),0,
      key+' no nested tabs')
    const clientWidth=await page.evaluate(()=>document.documentElement.scrollWidth)
    assert.ok(clientWidth<=width+3,key+' clients overflow '+clientWidth)
    if(width===390)await page.screenshot({path:dir+'/'+key+'-clients.png',fullPage:false})
    await customer.getByRole('button',{name:/Synthetic Client/}).click()
    assert.equal(await customer.getAttribute('data-detail-open'),'true',key+' client detail')
    await root.getByRole('tab',{name:new RegExp(labels[locale].orders)}).click()
    const orderButton=root.locator('#hh-orders-panel > button').filter({hasText:labels[locale].name}).first()
    await orderButton.click()
    const orderChat=root.locator('[class*="conversation"]').first()
    await orderChat.waitFor({state:'visible',timeout:25000})
    await orderChat.locator('textarea').first().waitFor({state:'visible',timeout:30000})
    assert.equal(await orderChat.locator('input[type="file"]').count()>=2,true,
      key+' photo/audio/video composer')
    if(width===390)await page.screenshot({path:dir+'/'+key+'-chat.png',fullPage:false})
    report.push({key,status:'pass',metrics,clientWidth})
    if(errors.length)throw Error(key+' page errors: '+JSON.stringify(errors))
   }finally{await page.close()}
  }
 }finally{await browser.close()}
}
await writeFile(dir+'/results.json',JSON.stringify(report,null,2))
console.log('Messages wellness synthetic screenshots / geometry:',report.length)
