import assert from 'node:assert/strict'
import test from 'node:test'
import {diagnosisFixture,turn,deferred,success,unknown,reference} from './helpers/diagnosis-parent-fixture.mjs'
const ids=['situation-written-free','wu-xing-free','personal-session-30-eur50']
const titles={en:['Free situation diagnosis','Free energy & wellbeing review — Wu Xing (Five Elements)','Personal consultation'],ru:['Бесплатная диагностика ситуации','Диагностика энергии и здоровья по У-Син (Пять стихий)','Личная консультация'],es:['Diagnóstico gratuito de tu situación','Revisión de energía y bienestar Wu Xing (Cinco Elementos)','Consulta personal']}
const phone= f=>f.find('input',p=>p.type==='tel')
const checkbox=f=>f.find('input',p=>p.type==='checkbox')
const prepare=f=>{f.phone('4165550123');f.consent()}
const text=node=>node==null||typeof node==='boolean'?'':Array.isArray(node)?node.map(text).join(''):typeof node==='object'?text(node.props?.children):String(node)
function assertSavedUI(f,locale='en') {
 const panel=f.find('div',p=>p.className==='compactReceipt');assert.equal(panel.hidden,false,'Confirmed receipt panel remains visible')
 const status=f.find('p',p=>p.role==='status');assert.equal(status.hidden,false,'Confirmed status remains visible')
 assert.equal(text(status),({en:'Thank you — your request was received',ru:'Спасибо! Ваша заявка получена',es:'¡Gracias! Hemos recibido tu solicitud'}[locale])+' · '+reference,'Confirmed status shows exact actual saved reference')
 const next=f.find('p',p=>p.className==='next');assert.equal(next.hidden,false);assert.equal(text(next),({en:'Request saved. Review the message and tap Send in your chat.',ru:'Заявка сохранена. Проверьте сообщение и нажмите «Отправить» в чате.',es:'Solicitud guardada. Revisa el mensaje y pulsa Enviar en el chat.'}[locale]),'Receipt explains explicit remaining chat step')
 const lead=f.find('p',p=>p.className==='formLead');assert.ok(text(lead).includes({en:'No appointment or payment is confirmed.',ru:'Запись и оплата ещё не подтверждены.',es:'Aún no hay cita ni pago confirmado.'}[locale]),'Current sheet keeps separate booking/payment limitation')
 assert.equal(f.links().length,2,'Both confirmed messenger links remain visible')
}
for(const locale of ['en','ru','es'])for(const [i,id]of ids.entries())for(const channel of ['whatsapp','telegram'])test(locale+' '+id+' '+channel+': actual parent submits only current phone and consented offer; receipt follows acknowledgement',async()=>{
 const f=diagnosisFixture({locale});assert.equal(f.nodes().filter(n=>n.type==='input').length,0);assert.equal(f.env.requests.length,0)
 f.select(id);assert.equal(checkbox(f).props.checked,false);assert.equal(phone(f).props.value,'');f.phone('4165550123');f.send(channel);await turn(f);assert.equal(f.env.requests.length,0);assert.equal(f.env.popups.length,0)
 f.consent();const pending=deferred();f.env.setRespond(()=>pending.promise);f.send(channel);assert.equal(f.env.requests.length,1);assert.equal(f.links().length,0);assert.equal(f.env.writes.length,0);assert.deepEqual(f.env.popups[0].destinations,[])
 const body=JSON.parse(f.env.requests[0]);assert.match(body.operationId,/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i)
 assert.deepEqual(body,{operationId:body.operationId,serviceTitle:titles[locale][i],description:({en:['01 · SITUATION REVIEW · FREE','02 · FIVE ELEMENTS · FREE','03 · LIVE WITH ANDREY · 30 MIN · €50'],ru:['01 · РАЗБОР СИТУАЦИИ · БЕСПЛАТНО','02 · ПЯТЬ СТИХИЙ · БЕСПЛАТНО','03 · ВСТРЕЧА С АНДРЕЕМ · 30 МИН · €50'],es:['01 · SITUACIÓN · GRATIS','02 · CINCO ELEMENTOS · GRATIS','03 · CON ANDREY · 30 MIN · €50']}[locale])[i],sourcePath:'/'+locale+'/services/free-situation-review',locale,contact:{displayName:'',email:'',phone:'+14165550123'},contactConsent:true,website:''})
 pending.resolve(success());await turn(f);assertSavedUI(f,locale);assert.equal(f.links().length,2);assert.equal(f.env.writes.length,1);assert.equal(f.env.navigations.length,0)
 const saved=JSON.parse(f.env.writes[0][1]);assert.deepEqual(Object.keys(saved).sort(),['createdAt','referenceCode']);assert.equal(saved.referenceCode,reference)
 for(const link of f.links()){const url=new URL(link.props.href);assert.equal(url.hostname,link.props['data-contact-channel']==='whatsapp'?'wa.me':'t.me');const draft=url.searchParams.get('text');assert.ok(draft.includes(body.serviceTitle));assert.ok(draft.includes(reference));assert.ok(draft.includes('https://holistichouse.vercel.app'+body.sourcePath));assert.ok(!draft.includes('14165550123'))}
 assert.equal(f.env.popups[0].destinations[0],f.links().find(n=>n.props['data-contact-channel']===''+channel).props.href);f.unmount();assert.equal(f.env.popups[0].closed,false)
})
for(const terminal of ['close','offer','unmount'])test(terminal+': actual current parent revokes late receipt and messenger completion',async()=>{
 const f=diagnosisFixture();f.select(ids[1]);prepare(f);const pending=deferred();f.env.setRespond(()=>pending.promise);f.send();
 if(terminal==='close')f.close();else if(terminal==='offer')f.select(ids[2]);else f.unmount()
 assert.equal(f.env.popups[0].closed,true);pending.resolve(success());await turn(f);assert.equal(f.env.writes.length,0);assert.deepEqual(f.env.popups[0].destinations,[]);assert.equal(f.links().length,0);if(terminal!=='unmount')f.unmount()
})
test('same-instance unknown retry uses byte-identical body and UUID after locked controls',async()=>{
 const f=diagnosisFixture();f.select(ids[1]);prepare(f);f.env.setRespond(unknown);f.send();await turn(f);const body=f.env.requests[0];assert.equal(phone(f).props.disabled,true);assert.equal(checkbox(f).props.disabled,true);assert.equal(f.env.writes.length,0);assert.equal(f.links().length,0)
 f.env.setRespond(success);f.send('telegram');await turn(f);assert.equal(f.env.requests.length,2);assert.equal(f.env.requests[1],body);assert.equal(f.env.writes.length,1);f.unmount()
})
test('new keyed offer has fresh consent and current phone rather than the departed form values',async()=>{
 const f=diagnosisFixture();f.select(ids[1]);prepare(f);f.select(ids[2]);assert.equal(phone(f).props.value,'');assert.equal(checkbox(f).props.checked,false);f.send();await turn(f);assert.equal(f.env.requests.length,0)
 f.phone('4165550199');f.consent();f.send();await turn(f);const body=JSON.parse(f.env.requests[0]);assert.equal(body.serviceTitle,titles.en[2]);assert.equal(body.contact.phone,'+14165550199');f.unmount()
})
for(const action of ['close','offer','unmount'])test('stale handler after '+action+' cannot start another request',async()=>{
 const f=diagnosisFixture();f.select(ids[1]);prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick
 if(action==='close')f.close();else if(action==='offer')f.select(ids[2]);else f.unmount()
 stale();await turn(f);assert.equal(f.env.requests.length,0,'Departed handler must not admit a write');assert.equal(f.env.popups.length,0);if(action!=='unmount')f.unmount()
})

test('focus restoration and body overflow cleanup preserve canonical dialog behavior',()=>{
 const f=diagnosisFixture();for(const id of ids){f.select(id);assert.equal(f.env.document.body.style.overflow,'hidden');assert.equal(f.env.document.activeElement.id,'Close form');assert.equal(f.listeners.get('keydown').size,1);f.close();assert.equal(f.env.document.body.style.overflow,'auto');assert.equal(f.env.document.activeElement.id,id);assert.equal(f.listeners.get('keydown').size,0)}f.select(ids[0]);f.unmount();assert.equal(f.env.document.activeElement.id,ids[0]);assert.equal(f.env.document.body.style.overflow,'auto')
})
test('A→B→A source restoration cannot revive a captured pre-change submit handler',async()=>{
 const f=diagnosisFixture();f.select(ids[1]);prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick
 f.env.navigate('/en/services/free-consultation');f.update();f.env.navigate('/en/services/free-situation-review');f.update();stale();await turn(f)
 assert.equal(f.env.requests.length,0,'Restored string context must not revive a revoked handler');assert.equal(f.env.popups.length,0);f.unmount()
})
test('A→B→A source restoration cannot revive pending response; current explicit retry keeps original bytes',async()=>{
 const f=diagnosisFixture();f.select(ids[1]);prepare(f);const pending=deferred();f.env.setRespond(()=>pending.promise);f.send();const body=f.env.requests[0]
 f.env.navigate('/en/services/free-consultation');f.update();f.env.navigate('/en/services/free-situation-review');f.update();pending.resolve(success());await turn(f)
 assert.equal(f.env.writes.length,0,'Transient context replacement must revoke response side effects');assert.deepEqual(f.env.popups[0].destinations,[]);assert.equal(f.links().length,0)
 f.env.setRespond(success);f.send();await turn(f);assert.equal(f.env.requests.length,2);assert.equal(f.env.requests[1],body);f.unmount()
})
test('unchanged current-parent context rerender does not revoke explicit same-body retry',async()=>{
 const f=diagnosisFixture();f.select(ids[1]);prepare(f);f.env.setRespond(unknown);f.send();await turn(f);const body=f.env.requests[0]
 f.update();f.env.setRespond(success);f.send();await turn(f);assert.equal(f.env.requests.length,2);assert.equal(f.env.requests[1],body);assert.equal(f.env.writes.length,1);f.unmount()
})
test('pending source change prevents wrong-context retry but returning with current handler preserves original request',async()=>{
 const f=diagnosisFixture();f.select(ids[1]);prepare(f);f.env.setRespond(unknown);f.send();await turn(f);const body=f.env.requests[0]
 f.env.navigate('/en/services/free-consultation');f.update();f.send();await turn(f);assert.equal(f.env.requests.length,1);assert.equal(f.env.writes.length,0)
 f.env.navigate('/en/services/free-situation-review');f.update();f.env.setRespond(success);f.send();await turn(f);assert.equal(f.env.requests.length,2);assert.equal(f.env.requests[1],body);f.unmount()
})
for(const stage of ['pending','unknown','late-success'])test(stage+': canonical close/reopen is a fresh form, never an automatic retry or late receipt',async()=>{
 const f=diagnosisFixture();f.select(ids[1]);prepare(f);const pending=deferred();f.env.setRespond(()=>pending.promise);f.send();const oldBody=f.env.requests[0]
 if(stage==='unknown'){pending.resolve(unknown());await turn(f)}
 f.close();assert.equal(f.env.popups[0].closed,true);assert.equal(f.nodes().filter(n=>n.type==='input').length,0);f.select(ids[1]);assert.equal(phone(f).props.value,'');assert.equal(checkbox(f).props.checked,false)
 if(stage!=='unknown'){pending.resolve(stage==='late-success'?success():unknown());await turn(f)}
 assert.equal(f.env.requests.length,1);assert.equal(f.env.writes.length,0);assert.equal(f.links().length,0);assert.deepEqual(f.env.popups[0].destinations,[])
 f.phone('4165550199');f.send();await turn(f);assert.equal(f.env.requests.length,1,'Closing does not transfer earlier consent into fresh form')
 f.consent();f.env.setRespond(success);f.send();await turn(f);const current=JSON.parse(f.env.requests[1]);assert.equal(current.contact.phone,'+14165550199');assert.equal(current.serviceTitle,titles.en[1]);assert.notEqual(current.operationId,JSON.parse(oldBody).operationId,'Canonical remount has no cross-remount persistence guarantee');assert.equal(f.env.writes.length,1);f.unmount()
})
for(const locale of ['en','ru','es'])test(locale+': current alternate diagnosis route is both source payload and safe public draft',async()=>{
 const pathname='/'+locale+'/services/free-consultation',f=diagnosisFixture({locale,pathname});f.select(ids[2]);prepare(f);f.send();await turn(f);const body=JSON.parse(f.env.requests[0]);assert.equal(body.sourcePath,pathname);assert.equal(body.contact.phone,'+14165550123');assert.equal(body.serviceTitle,titles[locale][2]);for(const link of f.links())assert.ok(new URL(link.props.href).searchParams.get('text').includes('https://holistichouse.vercel.app'+pathname));f.unmount()
})
async function rejectsDepartedHandler(chooserSource) {
 const f=diagnosisFixture({chooserSource});f.select(ids[1]);prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick;f.close();stale();await turn(f);assert.equal(f.env.requests.length,0,'Departed handler admits no write');f.unmount()
}
async function rejectsRestoredHandler(chooserSource) {
 const f=diagnosisFixture({chooserSource});f.select(ids[1]);prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick;f.env.navigate('/en/services/free-consultation');f.update();f.env.navigate('/en/services/free-situation-review');f.update();stale();await turn(f);assert.equal(f.env.requests.length,0,'Restored context cannot revive old handler');f.unmount()
}
async function rejectsRestoredResponse(chooserSource) {
 const f=diagnosisFixture({chooserSource});f.select(ids[1]);prepare(f);const p=deferred();f.env.setRespond(()=>p.promise);f.send();f.env.navigate('/en/services/free-consultation');f.update();f.env.navigate('/en/services/free-situation-review');f.update();p.resolve(success());await turn(f);assert.equal(f.env.writes.length,0,'Restored context cannot revive old response');f.unmount()
}
const {read}=await import('./helpers/diagnosis-parent-fixture.mjs')
const chooserSource=read('components/contact-channel-chooser.tsx')
for(const [name,before,after,check,reason] of [
 ['removed mounted admission guard','!mounted.current || activeContext.current !== contextKey || contextRevision.current !== renderRevision','activeContext.current !== contextKey || contextRevision.current !== renderRevision',rejectsDepartedHandler,/Departed handler admits no write/],
 ['removed captured revision guard',' || contextRevision.current !== renderRevision','',rejectsRestoredHandler,/Restored context cannot revive old handler/],
 ['non-monotonic context revision','contextRevision.current += 1;','contextRevision.current = 0;',rejectsRestoredHandler,/Restored context cannot revive old handler/],
 ['removed submitted revision check','contextRevision.current !== submittedRevision || ','',rejectsRestoredResponse,/Restored context cannot revive old response/],
])test('actual-parent mutation rejects '+name,async()=>{assert.equal(chooserSource.split(before).length-1,1,'Unique exact mutation anchor');await assert.rejects(check(chooserSource.replace(before,after)),error=>error?.code==='ERR_ASSERTION'&&reason.test(error.message))})
async function rejectsConfirmedResubmit(chooserSource) {
 const f=diagnosisFixture({chooserSource});f.select(ids[1]);prepare(f);const stale=f.find('button',p=>p['data-contact-channel-submit']==='whatsapp').props.onClick;f.send();await turn(f)
 assert.equal(f.env.requests.length,1);assert.equal(f.env.writes.length,1);assert.equal(f.links().length,2);stale();await turn(f)
 assert.equal(f.env.requests.length,1,'Confirmed attempt cannot resubmit through stale handler');assert.equal(f.env.writes.length,1);assert.equal(f.env.popups.length,1);f.unmount()
}
test('confirmed receipt cannot be resubmitted by a captured pre-save handler',()=>rejectsConfirmedResubmit(chooserSource))

test('actual-parent mutation rejects removed confirmed-attempt admission guard',async()=>{const before=' || operation.current?.confirmed';assert.equal(chooserSource.split(before).length-1,1);await assert.rejects(rejectsConfirmedResubmit(chooserSource.replace(before,'')),error=>error?.code==='ERR_ASSERTION'&&/Confirmed attempt cannot resubmit through stale handler/.test(error.message))})

async function visibleReceipt(chooserSource){const f=diagnosisFixture({chooserSource});f.select(ids[1]);prepare(f);f.send();await turn(f);assertSavedUI(f);f.unmount()}
for(const [name,before,after,reason]of [
 ['hidden receipt panel','<div className={styles.compactReceipt}>','<div hidden className={styles.compactReceipt}>',/Confirmed receipt panel remains visible/],
 ['missing visible status','<p className={styles.saved} role="status">{c.saved} · {saved.referenceCode}</p>','<p className={styles.saved}>{c.saved} · {saved.referenceCode}</p>',/One actual p/],
 ['wrong visible reference','{c.saved} · {saved.referenceCode}','{c.saved} · HH-FFFFFFFFFFFF',/Confirmed status shows exact actual saved reference/],
 ['false booking step','{c.compactSaved}','Appointment and payment confirmed',/Receipt explains explicit remaining chat step/],
])test('actual-parent receipt mutation rejects '+name,async()=>{assert.ok(chooserSource.includes(before),'Exact current compact receipt anchor');await assert.rejects(visibleReceipt(chooserSource.replace(before,after)),error=>error?.code==='ERR_ASSERTION'&&reason.test(error.message))})
