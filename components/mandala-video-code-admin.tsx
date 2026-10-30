"use client";
import {useEffect,useState} from "react";
import {Check,Copy,LockKeyhole} from "lucide-react";
type Props={locale:"en"|"ru"|"es";enabled:boolean};
const wording={
 ru:{heading:"Коды Smart / Pro",off:"API выключен — выдача кодов заблокирована",
  ready:"Выпускать код только после проверки реального платежа владельцем. Не генерирует ролик и не списывает деньги.",
  tier:"Тариф",kind:"Основание",paid:"Оплачен",gift:"Первый Smart бесплатно",
  ref:"Проверенный номер платежа",refHint:"Square / PayPal / Wise — сначала проверить в сервисе, потом ввести номер.",
  channel:"Платёжный сервис",recipient:"ID подтверждённого аккаунта получателя подарка",
  checked:"Я лично проверил платеж / право на персональный подарок в кабинете.",
  issue:"Выпустить одноразовый код",copy:"Скопировать код",result:"Одноразовый код для клиента",
  denied:"Проверка не пройдена или код уже существует. Не отправляйте клиенту неподтверждённый код.",
  copied:"Скопировано. Передавайте код клиенту приватно, не в URL или общих чатах."},
 en:{heading:"Smart / Pro codes",off:"API disabled — code issuance blocked",
  ready:"Issue only after manually verifying payment with the provider. No render or charge on issuance.",
  tier:"Plan",kind:"Authorization",paid:"Verified payment",gift:"First Smart video gift",
  ref:"Verified payment reference",refHint:"Check Square / PayPal / Wise first, then enter receipt ID.",
  channel:"Payment processor",recipient:"Verified recipient account ID",
  checked:"I personally verified payment or gift eligibility.",
  issue:"Issue single-use code",copy:"Copy code",result:"One-time code for customer",
  denied:"Verification failed or duplicate receipt/gift. Do not issue an unverified code.",
  copied:"Copied. Send privately, never by URL or public message."},
 es:{heading:"Códigos Smart / Pro",off:"API desactivada — emisión bloqueada",
  ready:"Emitir solo tras verificar el pago en el proveedor. No genera vídeo ni cobra.",
  tier:"Plan",kind:"Autorización",paid:"Pago verificado",gift:"Primer Smart gratis",
  ref:"Referencia de pago",refHint:"Verifica Square / PayPal / Wise antes de introducir el comprobante.",
  channel:"Pasarela",recipient:"ID de cuenta verificada del destinatario",
  checked:"He verificado el pago o el derecho al regalo.",
  issue:"Emitir código único",copy:"Copiar código",result:"Código de un uso para el cliente",
  denied:"No se pudo verificar o el código ya existe. No entregues códigos no verificados.",
  copied:"Copiado. Envíalo de forma privada, nunca en enlaces públicos."}
};
export function MandalaVideoCodeAdmin({locale,enabled}:Props){
 const t=wording[locale];
 const [actor,setActor]=useState("");
 const [tier,setTier]=useState<"smart"|"pro">("smart");
 const [kind,setKind]=useState<"gift"|"paid">("gift");
 const [paymentChannel,setPaymentChannel]=useState<"paypal"|"wise"|"square">("paypal");
 const [paymentReference,setPaymentReference]=useState("");
 const [recipientId,setRecipientId]=useState("");
 const [verified,setVerified]=useState(false);
 const [working,setWorking]=useState(false),[code,setCode]=useState("");
 const [message,setMessage]=useState("");
 useEffect(()=>{if(!enabled)return;let alive=true;
  void fetch("/api/app/videos/generate/identity",{credentials:"same-origin",cache:"no-store"})
   .then(r=>r.ok?r.json():null).then(data=>{if(alive&&typeof data?.accountId==="string")setActor(data.accountId)})
   .catch(()=>{});return()=>{alive=false}},[enabled]);
 async function issue(){
  if(!enabled||!verified||!actor||working)return;
  setCode("");setMessage("");setWorking(true);
  try{
   const result=await fetch("/api/admin/videos/codes/route",{method:"POST",cache:"no-store",
    credentials:"same-origin",
    headers:{"Content-Type":"application/json","x-hh-account-id":actor},
    body:JSON.stringify({tier,kind,ownerVerified:true,...(kind==="gift"?{recipientId}:{
      paymentChannel,paymentReference})})});
   const data=await result.json();
   if(!result.ok||typeof data.code!=="string"){setMessage(t.denied);return}
   setCode(data.code);setVerified(false);setPaymentReference("");
  }catch{setMessage(t.denied)}
  finally{setWorking(false)}
 }
 return <section data-video-code-owner-admin style={{margin:"18px 0",padding:16,
  border:"1px solid #b8dfca",borderRadius:16,background:"#f4fbf2",color:"#204938"}}>
  <h2 style={{display:"flex",alignItems:"center",gap:10}}><LockKeyhole size={21}/>{t.heading}</h2>
  <p style={{fontSize:13}}>{enabled?t.ready:t.off}</p>
  <fieldset disabled={!enabled||!actor||working}
    style={{display:"grid",gap:10,maxWidth:600,border:0,padding:0,margin:0}}>
   <label>{t.tier} <select value={tier} onChange={e=>{
    const next=e.target.value as "smart"|"pro";setTier(next);if(next==="pro")setKind("paid");setVerified(false)}}>
    <option value="smart">Smart $2</option><option value="pro">Pro $9.90</option></select></label>
   <label>{t.kind} <select value={kind} onChange={e=>{
     const next=e.target.value as "gift"|"paid";setKind(next);if(next==="gift")setTier("smart");setVerified(false)}}>
     <option value="paid">{t.paid}</option><option value="gift">{t.gift}</option></select></label>
   {kind==="paid"?<>
    <label>{t.channel} <select value={paymentChannel}
      onChange={e=>setPaymentChannel(e.target.value as "paypal"|"wise"|"square")}>
     <option value="paypal">PayPal</option><option value="wise">Wise</option><option value="square">Square</option>
    </select></label>
    <label>{t.ref}<input value={paymentReference} onChange={e=>setPaymentReference(e.currentTarget.value)}
      autoComplete="off" maxLength={120}/><small>{t.refHint}</small></label>
   </>:<label>{t.recipient}<input value={recipientId} onChange={e=>setRecipientId(e.currentTarget.value)}
     autoComplete="off" maxLength={36}/></label>}
   <label style={{display:"flex",alignItems:"flex-start",gap:7}}>
    <input type="checkbox" checked={verified} onChange={e=>setVerified(e.currentTarget.checked)}/>
    <span>{t.checked}</span></label>
   <button type="button" onClick={()=>void issue()}
     disabled={!verified||(kind==="paid"?paymentReference.length<6:recipientId.length!==36)||working}
     style={{minHeight:44,padding:10,borderRadius:12,background:"#087d5d",color:"white",border:0}}>
     {t.issue}</button>
  </fieldset>
  {code?<div style={{marginTop:12,display:"grid",gap:7,maxWidth:600}}>
   <strong>{t.result}</strong><code style={{overflowWrap:"anywhere"}}>{code}</code>
   <button type="button" style={{minHeight:44,padding:9,borderRadius:10}}
    onClick={()=>{void navigator.clipboard?.writeText(code).then(()=>setMessage(t.copied)).catch(()=>setMessage(t.denied))}}>
    <Copy size={15} style={{display:"inline-block",verticalAlign:"middle",marginRight:6}}/>{t.copy}</button>
  </div>:null}
  {message?<p role="status">{message}</p>:null}
 </section>
}
