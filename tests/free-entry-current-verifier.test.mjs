import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import * as verifier from '../scripts/helpers/free-entry-current-verifier.mjs'
import * as model from '../lib/site-videos/model.js'
import * as whatsapp from '../lib/whatsapp-enquiry.js'
import {environment,mount,turn,compileContactModule} from './helpers/contact-channel-verifier-fixture.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const origin='http://127.0.0.1:3100',reference='HH-ABCD1234EF56'
const chooserSource=read('components/contact-channel-chooser.tsx'),offersSource=read('components/free-diagnosis-offers.tsx')
const nodes=tree=>{const all=[];function walk(v){if(Array.isArray(v))return v.forEach(walk);if(!v?.props)return;all.push(v);walk(v.props.children)}walk(tree);return all}
const nodeText=n=>typeof n==='string'?n:Array.isArray(n)?n.map(nodeText).join(''):n?.props?nodeText(n.props.children):''

// Actual TSX state and click handlers; composition leaves are explicit stubs.
// This is not a browser, native focus/layout/playback or popup gesture test.
function renderComponent(source,exportName,props,extra={},effects=false) {
 const values=[],pending=[];let index=0,dirty=true,tree
 const slot=init=>{const i=index++;return values[i]||(values[i]=init())}
 const react={useState(value){const s=slot(()=>({value}));return[s.value,next=>{s.value=typeof next==='function'?next(s.value):next;dirty=true}]},
  useRef(value){return slot(()=>({current:value}))},useId(){return slot(()=>({id:'synthetic-id-'+index})).id},
  useEffect(fn,deps){const s=slot(()=>({deps:null}));if(effects&&JSON.stringify(s.deps)!==JSON.stringify(deps)){s.deps=deps;pending.push(fn)}}}
 const element=(type,props)=>({type,props:props||{}})
 const env=environment(props.locale);env.window.setTimeout=()=>1;env.window.clearTimeout=()=>{}
 const imports={react,'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'fragment'},
  'next/image':{default:'img'},'next/navigation':{usePathname:()=>'/'+props.locale+'/services/free-consultation'},
  'lucide-react':Object.fromEntries(['ArrowRight','MessageCircle','ShieldCheck','X','ChevronDown','ExternalLink','Film','Play'].map(n=>[n,'icon-'+n])),
  '@/components/contact-channel-chooser':{ContactChannelChooser:'chooser'},'@/lib/whatsapp-enquiry':whatsapp,
  '@/components/static-portrait':{StaticPortrait:'portrait'},'@/lib/site-videos/model':model,
  './free-diagnosis-offers.module.css':{default:{}},'./site-video-minimal.module.css':{default:{}},...extra}
 const loaded=compileContactModule(source,imports,env)
 function expand(v){if(Array.isArray(v))return v.map(expand);if(!v?.props)return v;if(typeof v.type==='function')return expand(v.type(v.props));return{...v,props:{...v.props,children:expand(v.props.children)}}}
 const f={flush(){for(let i=0;dirty;i++){assert.ok(i<20);dirty=false;index=0;pending.length=0;tree=expand(loaded[exportName](props));for(const fn of pending)fn()}},
  nodes(){return nodes(tree)},find(type,predicate=()=>true){const found=f.nodes().filter(n=>n.type===type&&predicate(n.props));assert.equal(found.length,1,'One actual '+type);return found[0]},
  click(type,predicate){f.find(type,predicate).props.onClick();f.flush()}}
 f.flush();return f
}

test('production caller separates the current free review and paid hub, with unchanged locale/width loops and boundaries',()=>{
 const script=read('scripts/verify-public-services-production.mjs'),free=read('components/free-entry-landing.tsx')
 assert.match(script,/serviceWorkers: "block"/)
 assert.match(script,/for \(const locale of \["en", "ru", "es"\]\)/)
 assert.match(script,/for \(const width of \[320, 360, 390, 1188\]\)/)
 assert.match(script,/await verifyFreeReviewCurrentFlow\(page, expect, \{\s*origin, locale, inspectPrivateIntake: width === 390/)
 assert.doesNotMatch(script,/await hub\.goto\(/)
 assert.match(script,/await verifyFreeDiagnosisHub\(hub, expect, \{origin, locale\}\)/)
 assert.match(script,/assertViewport\(hub,/)
 assert.match(script,/assertNoDevIssueOverlay\(hub,/)
 assert.doesNotMatch(script,/data-featured-constellations-video|data-free-diagnostic-start|chooser\.locator\("select"\)/)
 assert.match(free,/data-free-review-intro-video data-intro-audio-language=\{locale\}/)
 assert.match(free,/<SiteVideoPlayer video=\{situationVideo.video\} locale=\{locale\} compact minimal/)
 assert.match(free,/getServiceVideoMedia\("overview", locale\)/)
 assert.match(free,/<PersonalExpressEnquiry locale=\{locale\}/)
 assert.doesNotMatch(free,/FreeDiagnosisOffers|data-diagnosis-offer/)
 assert.match(read('app/[locale]/services/free-consultation/page.tsx'),/<FreeDiagnosisOffers locale=\{lang\} \/>/)
 const helper=read('scripts/helpers/free-entry-current-verifier.mjs')
 const hub=helper.slice(helper.indexOf('export async function verifyFreeDiagnosisHub'))
 assert.equal((helper.match(/await page\.goto\(/g)||[]).length,1)
 assert.match(hub,/await context\.route\('\*\*\/\*',guard\.route\)\n try \{\n  await page\.goto\(origin \+ "\/" \+ locale \+ "\/services\/free-consultation", \{waitUntil: "domcontentloaded"\}\);/)
 assert.ok(hub.indexOf('await page.goto(')<hub.indexOf("assert.equal(page.url(),origin+'/'+locale+'/services/free-consultation')"))
 assert.match(hub,/finally \{ if\(popup\) await popup.close\(\); await context.unroute\('\*\*\/\*',guard.route\) \}/)
 assert.match(helper,/await expect\(intro.locator\('iframe'\)\).toHaveCount\(0\)/)
 assert.match(helper,/await play\.click\(\)/)
 assert.match(helper,/await consent\.check\(\)/)
 assert.match(helper,/page.waitForEvent\('popup'\)/)
 assert.doesNotMatch(helper,/force:\s*true|dispatchEvent|setChecked|window\.open\s*=|storage.*throw/)
})

const videoCases={
 en:{youtubeId:'s30Y42IwPcg',language:'en',title:'How I Choose the Right Method'},
 ru:{youtubeId:'Cz6SxXJNZbw',language:'ru',title:'Как я выбираю подходящий метод'},
 es:{youtubeId:'',heygenId:'2c251709aba74fd96ae8be43257a080b',language:'es',title:'Mi enfoque de la alquimia psíquica'},
}
for(const locale of ['en','ru','es']) test(locale+' actual player remains click-to-mount with exact source/title/audio',()=>{
 const video=videoCases[locale],contract=verifier.freeReviewVideos[locale]
 assert.equal(contract.id,video.heygenId||video.youtubeId);assert.equal(contract.audio,video.language);assert.equal(contract.title,video.title)
 if(locale!=='es'){
  const library=compileContactModule(read('data/service-video-library.ts'),{'@/lib/site-videos/model':model},environment(locale))
  const actual=library.getServiceVideoMedia('overview',locale).video
  assert.equal(actual.youtubeId,video.youtubeId);assert.equal(actual.language,video.language);assert.equal(actual.title,video.title)
 } else assert.match(read('components/free-entry-landing.tsx'),/heygenId: "2c251709aba74fd96ae8be43257a080b",\s*language: "es" as const,\s*title: "Mi enfoque de la alquimia psíquica"/)
 const f=renderComponent(read('components/site-video-player.tsx'),'SiteVideoPlayer',{video,locale,compact:true,minimal:true},{},true)
 assert.equal(f.nodes().filter(n=>n.type==='iframe').length,0)
 assert.equal(f.find('button',p=>p.className==='site-video-play').props.disabled,false)
 f.click('button',p=>p.className==='site-video-play')
 const iframe=f.find('iframe').props
 verifier.assertFreeReviewVideoSource(iframe.src,locale)
 assert.equal(iframe.title,video.title);assert.equal(iframe['data-video-playback'],contract.provider)
 assert.equal(f.nodes().filter(n=>n.type==='button'&&n.props.className==='site-video-play').length,0)
})

async function paidJourney(locale,{offerSource=offersSource,contactSource=chooserSource}={}) {
 const c=verifier.diagnosisOffers[locale]
 const rendered=renderComponent(offerSource,'FreeDiagnosisOffers',{locale})
 const articles=rendered.nodes().filter(n=>n.type==='article')
 assert.equal(articles.length,3)
 assert.deepEqual(articles.map(n=>nodes(n).find(c=>c.type==='strong').props.children),[c.free,c.free,c.price])
 assert.equal(rendered.nodes().filter(n=>n.type==='chooser').length,0)
 rendered.click('button',p=>p['data-diagnosis-order']==='personal-session-30-eur50')
 const props=rendered.find('chooser').props
 assert.equal(props.resetKey,'personal-session-30-eur50');assert.equal(props.compactPhone,true);assert.equal(props.stayAfterSave,true)
 assert.equal(props.publicTopic,c.label+' · '+c.price)
 const env=environment(locale,{pathname:'/'+locale+'/services/free-consultation'}),guard=verifier.createFreeEntryGuard(origin,locale)
 env.window.open=(url,target)=>{assert.equal(url,'about:blank');assert.equal(target,'_blank');env.popups.push(url);return{opener:null,closed:false,location:{replace:href=>{verifier.assertDiagnosisDraft(href,locale);env.popups.push(href)}},close(){}}}
 env.setRespond(()=>new Promise((resolve,reject)=>guard.route({
  request:()=>({url:()=>origin+'/api/service-enquiries',method:()=> 'POST',postDataJSON:()=>JSON.parse(env.requests.at(-1)),resourceType:()=> 'fetch'}),
  fulfill:async r=>resolve({ok:true,status:r.status,json:async()=>JSON.parse(r.body)}),
  abort:async()=>reject(Error('synthetic blocked')),continue:async()=>assert.fail('No HTTP'),
 }).catch(reject)))
 const f=mount('contact-channel-chooser','ContactChannelChooser',props,env,{sourceOverride:contactSource})
 const submit=()=>f.click('button',p=>p['data-contact-channel-submit']==='whatsapp')
 submit();await turn(f);assert.equal(env.requests.length,0);assert.equal(nodeText(f.find('p',p=>p.role==='alert')),c.phoneError)
 f.change('select',()=>true,'CA');f.change('input',p=>p.type==='tel','4165550123')
 submit();await turn(f);assert.equal(env.requests.length,0);assert.equal(nodeText(f.find('p',p=>p.role==='alert')),c.consentError)
 f.change('input',p=>p.type==='checkbox',true);guard.enquiryArmed=true
 submit();await turn(f)
 assert.equal(env.requests.length,1);verifier.assertDiagnosisPayload(JSON.parse(env.requests[0]),locale)
 assert.equal(guard.submissions.length,1);assert.deepEqual(guard.blocked,[])
 assert.equal(env.popups.length,2);assert.deepEqual(env.navigations,[])
 assert.equal(env.writes.length,1)
 assert.deepEqual(Object.keys(JSON.parse(env.writes[0][1])).sort(),['createdAt','referenceCode'])
 assert.equal(JSON.parse(env.writes[0][1]).referenceCode,reference)
 const urls=f.nodes().filter(n=>n.type==='acquisition-link').map(n=>n.props.href)
 assert.equal(urls.length,2)
 assert.equal(verifier.assertDiagnosisDraft(urls[0],locale),verifier.assertDiagnosisDraft(urls[1],locale,'telegram'))
}
for(const locale of ['en','ru','es']) test(locale+' actual selected paid modal and chooser handlers preserve €50, contact consent and opaque receipt',()=>paidJourney(locale))

test('actual handler mutations reject removed consent and lost selected paid price',async()=>{
 await assert.rejects(()=>paidJourney('en',{contactSource:chooserSource.replace('if (!consent)', 'if (false)')}))
 await assert.rejects(()=>paidJourney('en',{offerSource:offersSource.replace('publicTopic={activeOffer.label + " · " + activeOffer.price}', 'publicTopic={activeOffer.label}')}))
 await assert.rejects(()=>paidJourney('en',{offerSource:offersSource.replace('setSelected(id)', 'setSelected("situation-written-free")')}))
})

test('embed validation rejects wrong audio, source, privacy host and every extra parameter',()=>{
 for(const locale of ['en','ru','es']) {
  const c=verifier.freeReviewVideos[locale]
  const good=c.provider==='youtube'?`https://www.youtube-nocookie.com/embed/${c.id}?autoplay=1&playsinline=1&rel=0&hl=${locale}&cc_lang_pref=${locale}`:`https://app.heygen.com/embeds/${c.id}`
  verifier.assertFreeReviewVideoSource(good,locale)
  for(const wrong of [' '+good,good+' ',good.replace(c.id,c.id+'x'),good.replace('https:','http:'),good.replace('https://','https://private@'),good+'#secret',good+(good.includes('?')?'&':'?')+'email=synthetic',good.replace('www.youtube-nocookie.com','www.youtube.com')].filter(x=>x!==good))assert.throws(()=>verifier.assertFreeReviewVideoSource(wrong,locale))
  if(c.provider==='youtube')for(const wrong of [good.replace('cc_lang_pref='+locale,'cc_lang_pref=wrong'),good+'&hl='+locale,good.replace('autoplay=1','autoplay=0')])assert.throws(()=>verifier.assertFreeReviewVideoSource(wrong,locale))
 }
})

test('routing is exact, armed only after consent/Play and never forwards APIs, writes or providers',async()=>{
 assert.throws(()=>verifier.createFreeEntryGuard('https://holistichouse.vercel.app','en'))
 const guard=verifier.createFreeEntryGuard(origin,'en')
 async function request(url,{method='GET',type='document',payload}={}){
  let outcome
  await guard.route({request:()=>({url:()=>url,method:()=>method,resourceType:()=>type,postDataJSON:()=>payload}),fulfill:async r=>{outcome=['fulfilled',r.status]},abort:async()=>{outcome=['blocked']},continue:async()=>{outcome=['continued']}})
  return outcome
 }
 assert.deepEqual(await request(origin+'/_next/static/x.js'),['continued'])
 const embed='https://www.youtube-nocookie.com/embed/s30Y42IwPcg?autoplay=1&playsinline=1&rel=0&hl=en&cc_lang_pref=en'
 assert.deepEqual(await request(embed),['blocked']);guard.videoArmed=true
 assert.deepEqual(await request(embed),['fulfilled',200]);assert.equal(guard.videos,1)
 for(const [url,method] of [[origin+'/api/service-enquiries','GET'],[origin+'/api/private','GET'],[origin+'/api/service-enquiries?extra=1','POST'],[origin+'/api/other','POST'],['https://example.invalid/private','GET'],[origin+'/anywhere','POST']])assert.deepEqual(await request(url,{method}),['blocked'])
 guard.enquiryArmed=true
 const c=verifier.diagnosisOffers.en,payload={operationId:'00000000-0000-4000-8000-000000000001',serviceTitle:'Personal consultation',description:c.label+' · 30 MIN · €50',sourcePath:'/en/services/free-consultation',locale:'en',contact:{displayName:'',email:'',phone:'+14165550123'},contactConsent:true,website:''}
 assert.deepEqual(await request(origin+'/api/service-enquiries',{method:'POST',payload:{...payload,contactConsent:false}}),['blocked'])
 assert.deepEqual(await request(origin+'/api/service-enquiries',{method:'POST',payload}),['fulfilled',201])
 assert.deepEqual(await request(origin+'/api/service-enquiries',{method:'POST',payload}),['blocked'])
 const draftUrl=new URL(whatsapp.whatsappEnquiryUrl({locale:'en',service:'Personal consultation',option:'30 MIN · €50',request:'I would like to request this service. Please tell me the next step.',pagePath:'/en/services/free-consultation'}))
 draftUrl.searchParams.set('text',draftUrl.searchParams.get('text')+'\n\nEnquiry: '+reference)
 const draft=draftUrl.href
 assert.deepEqual(await request(draft),['fulfilled',200]);assert.equal(guard.handoffs,1)
 assert.throws(()=>verifier.assertDiagnosisDraft(draft.replace(reference,'+14165550123'),'en'))
 assert.deepEqual(await request(draft+'&phone=14165550123'),['blocked'])
})


// Positive fixtures use the actual existing generator. The verifier's complete
// message oracle is independently literal and must reject mutations of any line.
test('all localized drafts reject appended private content, private URLs, changed public source or extra URL data',async()=>{
 const copy={
  en:['Personal consultation','30 MIN · €50','I would like to request this service. Please tell me the next step.','Enquiry'],
  ru:['Личная консультация','30 МИН · €50','Хочу заказать эту услугу. Подскажите, пожалуйста, следующий шаг.','Заявка'],
  es:['Consulta personal','30 MIN · €50','Quisiera solicitar este servicio. Indícame, por favor, el siguiente paso.','Solicitud'],
 }
 for(const locale of ['en','ru','es']) {
  const [service,option,request,label]=copy[locale],base=new URL(whatsapp.whatsappEnquiryUrl({locale,service,option,request,pagePath:'/'+locale+'/services/free-consultation'}))
  base.searchParams.set('text',base.searchParams.get('text')+'\n\n'+label+': '+reference)
  const message=base.searchParams.get('text'),guard=verifier.createFreeEntryGuard(origin,locale)
  // Establish the permitted stage through the same strict synthetic POST gate.
  guard.enquiryArmed=true
  const payload={operationId:'00000000-0000-4000-8000-000000000001',serviceTitle:service,description:verifier.diagnosisOffers[locale].label+' · '+option,sourcePath:'/'+locale+'/services/free-consultation',locale,contact:{displayName:'',email:'',phone:'+14165550123'},contactConsent:true,website:''}
  async function route(url,{method='GET',payload}={}) {
   let result;await guard.route({request:()=>({url:()=>url,method:()=>method,resourceType:()=> 'document',postDataJSON:()=>payload}),fulfill:async()=>{result='fulfilled'},abort:async()=>{result='blocked'},continue:async()=>assert.fail('No HTTP')});return result
  }
  assert.equal(await route(origin+'/api/service-enquiries',{method:'POST',payload}),'fulfilled')
  assert.equal(verifier.assertDiagnosisDraft(base.href,locale),message)
  assert.equal(await route(base.href),'fulfilled');assert.equal(guard.handoffs,1)
  const mutations=[
   message+'\nPrivate answer: SYNTHETIC_PRIVATE_NOTE',
   message+'\nhttps://holistichouse.vercel.app/'+locale+'/client/report?token=SYNTHETIC_TOKEN',
   message.replace('/services/free-consultation','/services/another-offer'),
   message.replace('/services/free-consultation','/app/results?token=SYNTHETIC_TOKEN'),
   message.replace('€50','€0'),message.replace(reference,'HH-000000000000'),
   message.replace(request,request+' SYNTHETIC_PRIVATE_NOTE'),
   message.split('\n').filter((_,i)=>i!==4).join('\n'),
  ]
  for(const channel of ['whatsapp','telegram']) {
   const good=channel==='whatsapp'?base.href:whatsapp.telegramEnquiryUrlFromWhatsApp(base.href)
   assert.equal(verifier.assertDiagnosisDraft(good,locale,channel),message)
   for(const text of mutations) {
    const wrong=new URL(good);wrong.searchParams.set('text',text)
    assert.throws(()=>verifier.assertDiagnosisDraft(wrong.href,locale,channel))
    assert.equal(await route(wrong.href),'blocked');assert.equal(guard.handoffs,1)
   }
   for(const wrong of [good+'&token=SYNTHETIC_TOKEN',good+'&text='+encodeURIComponent(message),good.replace(channel==='whatsapp'?'14376066502':'AndyTherapist','other-recipient'),good.replace('https://','https://private@'),good+'#PRIVATE']) {
    assert.throws(()=>verifier.assertDiagnosisDraft(wrong,locale,channel))
    assert.equal(await route(wrong),'blocked');assert.equal(guard.handoffs,1)
   }
  }
 }
})

test('actual authored handler mutations cannot leak arbitrary request text or private report URLs',async()=>{
 for(const privateText of ['SYNTHETIC_PRIVATE_NOTE','https://holistichouse.vercel.app/en/client/report?token=SYNTHETIC_TOKEN']) {
  const mutated=offersSource.replace('I would like to request this service. Please tell me the next step.','I would like to request this service. Please tell me the next step. '+privateText)
  assert.notEqual(mutated,offersSource)
  await assert.rejects(()=>paidJourney('en',{offerSource:mutated}))
 }
})
