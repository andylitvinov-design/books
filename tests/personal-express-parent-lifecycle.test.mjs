import test from 'node:test'
import assert from 'node:assert/strict'
import {expressFixture,read,turn,deferred,success,unknown,reference} from './helpers/personal-express-parent-fixture.mjs'
const phone=f=>f.find('input',p=>p.type==='tel'),consent=f=>f.find('input',p=>p.type==='checkbox')
const expanded=f=>f.find('section',p=>Object.hasOwn(p,'data-personal-express-enquiry')).props['data-expanded']
const text=n=>n==null||typeof n==='boolean'?'':Array.isArray(n)?n.map(text).join(''):typeof n==='object'?text(n.props?.children):String(n)
const service={en:'Free personal express review',ru:'Бесплатная личная экспресс-диагностика',es:'Revisión personal exprés gratuita'}
const tags={en:['Situation','Energy and wellbeing'],ru:['Ситуация','Энергия и самочувствие'],es:['Situación','Energía y bienestar']}
const prepare=f=>{f.phone('4165550123');f.consent()}
function saved(f,locale){
 const panel=f.find('div',p=>p.className==='compactReceipt'),status=f.find('p',p=>p.role==='status');assert.equal(panel.hidden,false);assert.equal(status.hidden,false)
 assert.equal(text(status),({en:'Thank you — your request was received',ru:'Спасибо! Ваша заявка получена',es:'¡Gracias! Hemos recibido tu solicitud'}[locale])+' · '+reference)
 const next=f.find('p',p=>p.className==='next');assert.equal(next.hidden,false);assert.equal(text(next),{en:'Request saved. Review the message and tap Send in your chat.',ru:'Заявка сохранена. Проверьте сообщение и нажмите «Отправить» в чате.',es:'Solicitud guardada. Revisa el mensaje y pulsa Enviar en el chat.'}[locale])
 assert.equal(f.links().length,2);assert.ok(text(f.tree).includes({en:'a chat opening is not a confirmed consultation.',ru:'Заявка не подтверждает запись.',es:'no confirma una cita.'}[locale]),'Actual parent keeps non-booking limitation')
}
for(const locale of ['en','ru','es'])for(const [index,focus]of ['situation','energy'].entries())for(const channel of ['whatsapp','telegram'])test(locale+' '+focus+' '+channel+': actual page has one service, current focus in CRM only and visible acknowledged receipt',async()=>{
 const f=expressFixture({locale});assert.equal(expanded(f),'false');assert.equal(phone(f).hidden,true);assert.equal(f.env.requests.length,0);f.reveal();f.select(focus);assert.equal(phone(f).props.value,'');assert.equal(consent(f).props.checked,false)
 f.phone('4165550123');f.send(channel);await turn(f);assert.equal(f.env.requests.length,0);assert.equal(f.env.popups.length,0);f.consent();const p=deferred();f.env.setRespond(()=>p.promise);f.send(channel)
 assert.equal(f.env.requests.length,1);const body=JSON.parse(f.env.requests[0]);assert.match(body.operationId,/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i)
 assert.deepEqual(body,{operationId:body.operationId,serviceTitle:service[locale],description:'Express review focus: '+tags[locale][index],sourcePath:'/'+locale+'/services/free-situation-review',locale,contact:{displayName:'',email:'',phone:'+14165550123'},contactConsent:true,website:''})
 assert.equal(f.env.writes.length,0);assert.equal(f.links().length,0);p.resolve(success());await turn(f);saved(f,locale);assert.equal(f.env.writes.length,1);assert.deepEqual(Object.keys(JSON.parse(f.env.writes[0][1])).sort(),['createdAt','referenceCode'])
 for(const link of f.links()){const url=new URL(link.props.href),draft=url.searchParams.get('text');assert.equal(url.hostname,link.props['data-contact-channel']==='whatsapp'?'wa.me':'t.me');assert.ok(draft.includes(service[locale]));assert.ok(draft.includes(reference));assert.ok(draft.includes('https://holistichouse.vercel.app'+body.sourcePath));assert.ok(!draft.includes('Express review focus:'));assert.ok(!draft.includes(tags[locale][index]));assert.ok(!draft.includes('14165550123'))}
 assert.equal(f.env.popups[0].destinations[0],f.links().find(n=>n.props['data-contact-channel']===channel).props.href);assert.equal(f.env.navigations.length,0);f.unmount()
})
for(const locale of ['en','ru','es'])test(locale+': actual page forwards intro, compact video props and conditional private children without a dialog',()=>{
 const f=expressFixture({locale});const visible=f.nodes().filter(n=>!n.hidden),ids=visible.filter(n=>n.type==='section').map(n=>n.props.id)
 assert.deepEqual(ids.filter(id=>['what-you-get','how-i-review','how-it-works','request-free-review'].includes(id)),['what-you-get','how-i-review','how-it-works','request-free-review']);assert.equal(f.nodes().filter(n=>Object.hasOwn(n.props,'data-diagnosis-offer')).length,0);assert.equal(f.nodes().filter(n=>n.props.role==='dialog'||n.props['aria-modal']).length,0);assert.equal(f.env.document.body.style.overflow,'auto')
 const video=f.find('video-leaf');assert.equal(video.props.locale,locale);assert.equal(video.props.compact,true);assert.equal(video.props.minimal,true);assert.equal(video.props.internalOnly,true)
 assert.equal(f.find('testimonials-leaf').props.variant,'all');assert.equal(f.find('private-intake-leaf').props.locale,locale)
 assert.equal(f.find('a',p=>p['data-source']==='coaching-questionnaire').props.href,'/'+locale+'/coaching/intake');assert.equal(f.find('details',p=>Object.hasOwn(p,'data-optional-written-review')).props.open,undefined)
 f.reveal();f.select('energy');assert.equal(f.nodes().filter(n=>n.type==='private-intake-leaf'||n.props['data-source']==='coaching-questionnaire').length,0);assert.equal(f.find('section',p=>p.id==='what-you-get').hidden,false);f.select('situation');assert.equal(f.find('private-intake-leaf').props.locale,locale);f.unmount()
})
test('initial hash, changed hash and repeated same-anchor click open the real in-flow region',()=>{
 const f=expressFixture({hash:'#request-free-review'});assert.equal(expanded(f),'true');f.reveal();assert.equal(expanded(f),'false');f.anchor();assert.equal(expanded(f),'true');f.reveal();f.hash('#unrelated');assert.equal(expanded(f),'false');f.hash('#request-free-review');assert.equal(expanded(f),'true');f.unmount();assert.equal(f.listeners.get('click').size,0);assert.equal(f.windowListeners.get('hashchange').size,0)
})
test('Escape only folds when focus is inside, restores reveal focus and never locks the page',()=>{
 const f=expressFixture();f.reveal();prepare(f);f.escape({inside:false});assert.equal(expanded(f),'true');f.escape();assert.equal(expanded(f),'false');assert.equal(f.env.document.activeElement.id,'express-reveal');assert.equal(f.env.document.body.style.overflow,'auto');f.reveal();assert.equal(phone(f).props.value,'4165550123');assert.equal(consent(f).props.checked,true);f.unmount()
})
test('fold is visibility-only: pending request and consent remain mounted; valid completion may finish while hidden',async()=>{
 const f=expressFixture();f.reveal();prepare(f);const p=deferred();f.env.setRespond(()=>p.promise);f.send();const body=f.env.requests[0];f.escape();assert.equal(expanded(f),'false');assert.equal(phone(f).hidden,true);assert.equal(f.env.popups[0].closed,false);assert.equal(phone(f).props.disabled,true)
 p.resolve(success());await turn(f);assert.equal(f.env.writes.length,1);assert.equal(f.env.popups[0].destinations.length,1);assert.equal(f.links().length,0,'Receipt hidden with folded region, not cancelled');f.reveal();saved(f,'en');assert.equal(f.env.requests.length,1);assert.equal(f.env.requests[0],body);f.unmount()
})
test('unknown response survives fold/reopen with frozen phone, consent, body and UUID on explicit retry',async()=>{
 const f=expressFixture();f.reveal();prepare(f);f.env.setRespond(unknown);f.send();await turn(f);const body=f.env.requests[0];f.reveal();assert.equal(phone(f).hidden,true);f.anchor();assert.equal(phone(f).props.value,'4165550123');assert.equal(consent(f).props.checked,true);assert.equal(phone(f).props.disabled,true);f.env.setRespond(success);f.send('telegram');await turn(f);assert.equal(f.env.requests[1],body);saved(f,'en');f.unmount()
})
for(const terminal of ['focus','unmount'])test(terminal+': actual replacement revokes pending completion and captured handler admission',async()=>{
 const f=expressFixture();f.reveal();prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick,p=deferred();f.env.setRespond(()=>p.promise);f.send();if(terminal==='focus')f.select('energy');else f.unmount();assert.equal(f.env.popups[0].closed,true);stale();p.resolve(success());await turn(f);assert.equal(f.env.requests.length,1);assert.equal(f.env.writes.length,0);assert.deepEqual(f.env.popups[0].destinations,[])
 if(terminal==='focus'){assert.equal(phone(f).props.value,'');assert.equal(consent(f).props.checked,false);f.send();await turn(f);assert.equal(f.env.requests.length,1);f.phone('4165550199');f.consent();f.env.setRespond(success);f.send();await turn(f);const current=JSON.parse(f.env.requests[1]);assert.equal(current.description,'Express review focus: Energy and wellbeing');assert.equal(current.contact.phone,'+14165550199');f.unmount()}
})
test('focus A→B→A cannot revive former consent or former captured submit handler',async()=>{
 const f=expressFixture();f.reveal();prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick;f.select('energy');f.select('situation');stale();await turn(f);assert.equal(f.env.requests.length,0);assert.equal(phone(f).props.value,'');assert.equal(consent(f).props.checked,false);f.unmount()
})
test('same-instance source A→B→A suppresses stale admission/completion but current explicit retry preserves bytes',async()=>{
 const f=expressFixture();f.reveal();prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick,p=deferred();f.env.setRespond(()=>p.promise);f.send();const body=f.env.requests[0];f.env.navigate('/en/services/free-consultation');f.update();f.env.navigate('/en/services/free-situation-review');f.update();stale();p.resolve(success());await turn(f);assert.equal(f.env.requests.length,1);assert.equal(f.env.writes.length,0);assert.deepEqual(f.env.popups[0].destinations,[]);f.env.setRespond(success);f.send();await turn(f);assert.equal(f.env.requests[1],body);saved(f,'en');f.unmount()
})
test('confirmed operation cannot be duplicated by captured pre-save handler before rerender',async()=>{
 const f=expressFixture();f.reveal();prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick;f.send();await new Promise(r=>setImmediate(r));assert.equal(f.env.writes.length,1);stale();await turn(f);assert.equal(f.env.requests.length,1);assert.equal(f.env.popups.length,1);saved(f,'en');f.unmount()
})
for(const [name,before,after]of [
 ['wrong service','service: t.service','service: "Wrong service"'],
 ['wrong topic','"Express review focus: " + t.areas[focus].tag','"Wrong focus"'],
])test('actual page payload detects '+name,async()=>{
 const source=read('components/personal-express-enquiry.tsx');assert.ok(source.includes(before));const f=expressFixture({parentSource:source.replace(before,after)});f.reveal();prepare(f);f.send();await turn(f);const body=JSON.parse(f.env.requests[0]);assert.throws(()=>assert.deepEqual([body.serviceTitle,body.description,body.sourcePath],[service.en,'Express review focus: Situation','/en/services/free-situation-review']));f.unmount()
})

test('actual page draft source mutation is detected separately from chooser-owned current CRM source',async()=>{
 const parentSource=read('components/personal-express-enquiry.tsx').replace('pagePath: pathname','pagePath: "/wrong"'),f=expressFixture({parentSource});f.reveal();prepare(f);f.send();await turn(f);assert.equal(JSON.parse(f.env.requests[0]).sourcePath,'/en/services/free-situation-review');assert.throws(()=>assert.ok(new URL(f.links()[0].props.href).searchParams.get('text').includes('https://holistichouse.vercel.app/en/services/free-situation-review')));f.unmount()
});

test('constant child key mutation cannot pass fresh focus phone/consent contract',()=>{
 const source=read('components/personal-express-enquiry.tsx');assert.ok(source.includes('key={focus}'));
 const f=expressFixture({parentSource:source.replace('key={focus}','key="fixed"')});f.reveal();prepare(f);f.select('energy');assert.throws(()=>{assert.equal(phone(f).props.value,'');assert.equal(consent(f).props.checked,false)},'A string topic revision alone must not masquerade as a keyed fresh form');f.unmount()
})
test('conditional-unmount mutation cannot pass same-focus fold persistence',()=>{
 const source=read('components/personal-express-enquiry.tsx');assert.ok(source.includes('<ContactChannelChooser key={focus}'));assert.ok(source.includes('publicTopic={"Express review focus: " + t.areas[focus].tag} />'));
 const parentSource=source.replace('<ContactChannelChooser key={focus}','{expanded ? <ContactChannelChooser key={focus}').replace('publicTopic={"Express review focus: " + t.areas[focus].tag} />','publicTopic={"Express review focus: " + t.areas[focus].tag} /> : null}');
 const f=expressFixture({parentSource});f.reveal();prepare(f);f.reveal();f.reveal();assert.throws(()=>{assert.equal(phone(f).props.value,'4165550123');assert.equal(consent(f).props.checked,true)});f.unmount()
})
test('focus-in-external-request mutation fails privacy despite an otherwise valid CRM body',async()=>{
 const source=read('components/personal-express-enquiry.tsx');assert.ok(source.includes('request: t.request'));
 const f=expressFixture({parentSource:source.replace('request: t.request','request: t.request + " " + t.areas[focus].tag')});f.reveal();f.select('energy');prepare(f);f.send();await turn(f);assert.equal(JSON.parse(f.env.requests[0]).description,'Express review focus: Energy and wellbeing');assert.throws(()=>assert.ok(!new URL(f.links()[0].props.href).searchParams.get('text').includes('Energy and wellbeing')));f.unmount()
})

for(const [name,before,after]of [
 ['hidden','<div className={styles.compactReceipt}>','<div hidden className={styles.compactReceipt}>'],
 ['missing status','<p className={styles.saved} role="status">{c.saved} · {saved.referenceCode}</p>','<p className={styles.saved}>{c.saved} · {saved.referenceCode}</p>'],
 ['wrong reference','{c.saved} · {saved.referenceCode}','{c.saved} · HH-FFFFFFFFFFFF'],
 ['false booking','{c.compactSaved}','Appointment and payment confirmed'],
])test('new actual page rejects receipt mutation '+name,async()=>{
 const source=read('components/contact-channel-chooser.tsx');assert.ok(source.includes(before));const f=expressFixture({chooserSource:source.replace(before,after)});f.reveal();prepare(f);f.send();await turn(f);assert.throws(()=>saved(f,'en'),error=>error?.code==='ERR_ASSERTION');f.unmount()
})
for(const terminal of ['focus','unmount'])test(terminal+': captured consented handler before admission cannot create a request after departure',async()=>{
 const f=expressFixture();f.reveal();prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick;if(terminal==='focus')f.select('energy');else f.unmount();stale();await turn(f);assert.equal(f.env.requests.length,0);assert.equal(f.env.popups.length,0);if(terminal==='focus')f.unmount()
})
test('same-instance A→B→A source restoration cannot revive an unsubmitted captured consented handler',async()=>{
 const f=expressFixture();f.reveal();prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick;f.env.navigate('/en/services/free-consultation');f.update();f.env.navigate('/en/services/free-situation-review');f.update();stale();await turn(f);assert.equal(f.env.requests.length,0);assert.equal(f.env.popups.length,0);f.send();await turn(f);assert.equal(f.env.requests.length,1);saved(f,'en');f.unmount()
})
async function revokedAdmission(chooserSource,kind){
 const f=expressFixture({chooserSource});f.reveal();prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick
 if(kind==='unmount')f.unmount();else{f.env.navigate('/en/services/free-consultation');f.update();f.env.navigate('/en/services/free-situation-review');f.update()}
 try{stale();await turn(f);assert.equal(f.env.requests.length,0,'Revoked pre-admission handler cannot write')}finally{if(kind!=='unmount')f.unmount()}
}
for(const [name,before,after,kind]of [
 ['mounted admission','if (!mounted.current || activeContext.current !== contextKey || contextRevision.current !== renderRevision)','if (activeContext.current !== contextKey || contextRevision.current !== renderRevision)','unmount'],
 ['monotonic revision admission',' || contextRevision.current !== renderRevision','','source'],
])test('new page negative control detects removed '+name,async()=>{
 const source=read('components/contact-channel-chooser.tsx');assert.ok(source.includes(before));await revokedAdmission(source,kind);await assert.rejects(revokedAdmission(source.replace(before,after),kind),error=>error?.code==='ERR_ASSERTION'&&/Revoked pre-admission/.test(error.message))
})
test('new page negative control detects removed completion revision gate after A→B→A',async()=>{
 const source=read('components/contact-channel-chooser.tsx'),before='contextRevision.current !== submittedRevision || ';assert.ok(source.includes(before));
 async function check(chooserSource){const f=expressFixture({chooserSource});f.reveal();prepare(f);const pending=deferred();f.env.setRespond(()=>pending.promise);f.send();f.env.navigate('/en/services/free-consultation');f.update();f.env.navigate('/en/services/free-situation-review');f.update();pending.resolve(success());await turn(f);try{assert.equal(f.env.writes.length,0,'Transient source change revokes old completion')}finally{f.unmount()}}
 await check(source);await assert.rejects(check(source.replace(before,'')),error=>error?.code==='ERR_ASSERTION'&&/Transient source change/.test(error.message))
})
test('new page negative control detects removed synchronous confirmed admission',async()=>{
 const source=read('components/contact-channel-chooser.tsx'),before=' || operation.current?.confirmed';assert.ok(source.includes(before));
 async function check(chooserSource){const f=expressFixture({chooserSource});f.reveal();prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick;f.send();await new Promise(r=>setImmediate(r));stale();await turn(f);try{assert.equal(f.env.requests.length,1,'Confirmed request cannot be submitted again')}finally{f.unmount()}}
 await check(source);await assert.rejects(check(source.replace(before,'')),error=>error?.code==='ERR_ASSERTION'&&/Confirmed request cannot/.test(error.message))
})
