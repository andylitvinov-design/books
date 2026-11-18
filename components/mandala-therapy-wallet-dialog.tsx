"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {ArrowRight,CreditCard,ShieldCheck,Wallet,X} from "lucide-react";
import {appFetch,getCabinetBootstrap} from "@/lib/app/client-fetch";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-video-ready.module.css";

type Provider="square_api"|"paypal_personal";
type Props={locale:PublicLocale;signedIn:boolean;onClose:()=>void;onRefreshLogin:()=>void};
const copy={
 en:{title:"Top up your wallet",lead:"Choose a secure CAD top-up amount.",other:"Other amount",amount:"Amount to pay",
  course:"8-video course price",pending:"Confirmed before your order",method:"Payment method",
  card:"Card · Square",pay:"Continue to payment",waiting:"Checking wallet access…",
  unavailable:"Wallet funding is not enabled. No payment has been made.",
  noMethod:"No verified payment method is connected. No payment has been made.",
  signin:"Sign in to fund your own account.",login:"Sign in to My House",refresh:"Check sign-in",
  invalid:"Enter CA$1–1,000 with at most two decimals.",error:"Checkout is unavailable. No amount has been charged.",
  ready:"Secure payment link prepared. Your top-up is pending until verified by the provider.",
  open:"Open secure payment",note:"A top-up does not buy or automatically generate eight videos.",
  close:"Close wallet"},
 ru:{title:"Пополнить кошелёк",lead:"Выберите сумму пополнения в CAD.",other:"Своя сумма",amount:"Сумма к оплате",
  course:"Цена курса из 8 видео",pending:"Уточняется до оформления заказа",method:"Способ оплаты",
  card:"Карта · Square",pay:"Перейти к оплате",waiting:"Проверяем доступность кошелька…",
  unavailable:"Пополнение ещё не подключено. Списаний не было.",
  noMethod:"Подтверждённые способы оплаты не подключены. Списаний не было.",
  signin:"Войдите в кабинет для пополнения своего счёта.",login:"Войти в Мой дом",refresh:"Проверить вход",
  invalid:"Введите от CA$1 до CA$1 000, до двух знаков после запятой.",error:"Оплата недоступна. Деньги не списаны.",
  ready:"Ссылка на оплату готова. Пополнение остаётся ожидающим до проверки провайдером.",
  open:"Открыть защищённую оплату",note:"Пополнение не покупает курс и не запускает автоматически восемь видео.",
  close:"Закрыть кошелёк"},
 es:{title:"Recargar monedero",lead:"Elige el importe en CAD.",other:"Otro importe",amount:"Importe a pagar",
  course:"Precio del curso de 8 vídeos",pending:"Se confirma antes del pedido",method:"Método de pago",
  card:"Tarjeta · Square",pay:"Ir al pago",waiting:"Comprobando el acceso al monedero…",
  unavailable:"La recarga aún no está activada. No se ha cobrado nada.",
  noMethod:"No hay métodos de pago verificados. No se ha cobrado nada.",
  signin:"Inicia sesión para recargar tu cuenta.",login:"Entrar en Mi casa",refresh:"Comprobar sesión",
  invalid:"Introduce CA$1–1.000, con hasta dos decimales.",error:"El pago no está disponible. No se ha cobrado nada.",
  ready:"Enlace de pago preparado. La recarga queda pendiente hasta la verificación.",
  open:"Abrir pago seguro",note:"Recargar no compra el curso ni genera automáticamente ocho vídeos.",
  close:"Cerrar monedero"}
} as const;
const valid=(s:string)=>/^(?:0|[1-9][0-9]{0,3})(?:\.[0-9]{1,2})?$/.test(s)&&Number(s)>=1&&Number(s)<=1000;
const providerType=(p:unknown):p is Provider=>p==="square_api"||p==="paypal_personal";
function trustedPaymentUrl(value:unknown,provider:Provider,amount:string){
 if(typeof value!=="string"||value.length>500||!valid(amount))return "";
 try{
  const url=new URL(value);
  if(url.protocol!=="https:"||url.username||url.password||url.port||url.search||url.hash||
      url.origin+url.pathname!==value)return "";
  if(provider==="paypal_personal")
   return url.hostname==="paypal.me"&&url.pathname==="/psitrends/"+Number(amount).toFixed(2)+"CAD"?value:"";
  if(url.hostname==="square.link"&&/^\/u\/[A-Za-z0-9_-]{5,120}$/.test(url.pathname))return value;
  if(url.hostname==="checkout.square.site"&&/^\/[A-Za-z0-9_-]{5,120}$/.test(url.pathname))return value;
 }catch{/* No untrusted URLs. */}
 return "";
}
export function MandalaTherapyWalletDialog({locale,signedIn,onClose,onRefreshLogin}:Props){
 const t=copy[locale];
 const [amount,setAmount]=useState("10.00");
 const [custom,setCustom]=useState(false);
 const [status,setStatus]=useState<"loading"|"available"|"unavailable">("loading");
 const [providers,setProviders]=useState<Provider[]>([]);
 const [accountId,setAccountId]=useState<string|null>(null);
 const [refreshIndex,setRefreshIndex]=useState(0);
 const [provider,setProvider]=useState<Provider>("square_api");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [paymentUrl,setPaymentUrl]=useState("");
 const operation=useRef<{key:string;id:string}|null>(null);
 const dialog=useRef<HTMLElement|null>(null);
 const closeButton=useRef<HTMLButtonElement|null>(null);
 const selected=providers.includes(provider)?provider:providers[0]||null;
 const amountValid=valid(amount);
 const amountLabel=amountValid?"CA$"+Number(amount).toFixed(2):"—";
 useEffect(()=>{
  const overflow=document.body.style.overflow;
  const active=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.body.style.overflow="hidden";
  closeButton.current?.focus();
  const handleKey=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();onClose();return;}
   if(event.key!=="Tab"||!dialog.current)return;
   const nodes=[...dialog.current.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
   )].filter(node=>node.getClientRects().length>0);
   if(!nodes.length)return;
   if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes[nodes.length-1].focus();}
   else if(!event.shiftKey&&document.activeElement===nodes[nodes.length-1]){event.preventDefault();nodes[0].focus();}
  };
  document.addEventListener("keydown",handleKey);
  return()=>{document.removeEventListener("keydown",handleKey);document.body.style.overflow=overflow;
    active?.focus({preventScroll:true});};
 },[onClose]);
 useEffect(()=>{
  if(!signedIn){setStatus("unavailable");setProviders([]);setAccountId(null);return;}
  let active=true;
  setStatus("loading");
  void getCabinetBootstrap("portrait",{refresh:true}).then(async (snapshot:{account?:{id?:string}})=>{
   const id=snapshot?.account?.id;
   if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))throw Error("WALLET_ACCOUNT_UNAVAILABLE");
   const result=await appFetch("wallet/status",undefined,"GET",{accountId:id});
   if(active)setAccountId(id);
   return result;
  }).then((result:unknown)=>{
   if(!active)return;
   const data=result as {enabled?:boolean;currency?:string;providers?:unknown};
   if(data.enabled!==true||data.currency!=="CAD"){setStatus("unavailable");setProviders([]);return;}
   const verified=Array.isArray(data.providers)?data.providers.filter(providerType):[];
   setStatus("available");setProviders(verified);
  }).catch(()=>{if(active){setStatus("unavailable");setProviders([]);setAccountId(null);}});
  return()=>{active=false;};
 },[signedIn,refreshIndex]);
 function updateAmount(next:string,other=false){
  setAmount(next);setCustom(other);setPaymentUrl("");setError("");operation.current=null;
 }
 async function openPayment(){
  if(!signedIn||!accountId||status!=="available"||!selected||!amountValid||busy)return;
  const key=selected+":"+amount;
  if(operation.current?.key!==key)operation.current={key,id:crypto.randomUUID()};
  setBusy(true);setError("");setPaymentUrl("");
  try{
   const result=await appFetch("wallet/create",{
    operationId:operation.current.id,amount,provider:selected,locale
   },"POST",{accountId}) as {redirectUrl?:unknown};
   const url=trustedPaymentUrl(result.redirectUrl,selected,amount);
   if(!url)throw Error("UNVERIFIED_PAYMENT_URL");
   setPaymentUrl(url);
  }catch{setError(t.error);}finally{setBusy(false);}
 }
 return <div className={css.gateBackdrop} data-course-wallet-backdrop
   onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
  <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="therapy-wallet-title"
   className={[css.gateDialog,css.walletDialog].join(" ")} data-therapy-wallet>
   <button type="button" ref={closeButton} className={css.gateClose} onClick={onClose}
    aria-label={t.close}><X size={22}/></button>
   <div className={css.walletHeading}><Wallet size={27}/><h2 id="therapy-wallet-title">{t.title}</h2></div>
   <p className={css.walletLead}>{t.lead}</p>
   <div className={css.walletPresets} role="group" aria-label={t.amount}>
    {(["5.00","10.00","20.00"] as const).map(p=><button type="button" key={p}
     aria-pressed={!custom&&amount===p} onClick={()=>updateAmount(p)}>{"CA$"+Number(p).toFixed(0)}</button>)}
    <button type="button" aria-pressed={custom} onClick={()=>updateAmount("",true)}>{t.other}</button>
   </div>
   {custom?<label className={css.walletCustom}>{t.other}
    <span>CA$ <input inputMode="decimal" type="text" maxLength={7} value={amount}
     placeholder="15.00" aria-invalid={amount.length>0&&!amountValid}
     onChange={event=>updateAmount(event.currentTarget.value.replace(",","."),true)}/></span>
   </label>:null}
   <div className={css.walletAmount} data-course-topup-total><span>{t.amount}</span><strong>{amountLabel}</strong></div>
   <p className={css.walletQuote}><span>{t.course}</span><strong>{t.pending}</strong></p>
   {!signedIn?<div className={css.walletInfo}><p>{t.signin}</p>
    <Link href={"/"+(locale==="es"?"en":locale)+"/app/videos"} target="_blank" rel="noopener noreferrer"
     prefetch={false}>{t.login}<ArrowRight size={17}/></Link>
    <button type="button" onClick={()=>{onRefreshLogin();setRefreshIndex(i=>i+1);}}>{t.refresh}</button></div>:
    status==="loading"?<p className={css.walletInfo} role="status">{t.waiting}</p>:
    status==="unavailable"?<div className={css.walletInfo} role="status"><p>{t.unavailable}</p>
       <button type="button" onClick={()=>setRefreshIndex(i=>i+1)}>{t.refresh}</button></div>:
    providers.length===0?<p className={css.walletInfo} role="status">{t.noMethod}</p>:<>
      <strong className={css.walletMethodLabel}>{t.method}</strong>
      <div className={css.walletMethods} role="group" aria-label={t.method}>
       <button type="button" aria-pressed={selected==="square_api"}
        disabled={!providers.includes("square_api")} onClick={()=>{setProvider("square_api");setPaymentUrl("");}}>
        <CreditCard size={17}/>{t.card}</button>
       <button type="button" aria-pressed={selected==="paypal_personal"}
        disabled={!providers.includes("paypal_personal")} onClick={()=>{setProvider("paypal_personal");setPaymentUrl("");}}>
        PayPal</button>
      </div></>}
   {amount.length>0&&!amountValid?<p className={css.gateError} role="alert">{t.invalid}</p>:null}
   {error?<p className={css.gateError} role="alert">{error}</p>:null}
   {paymentUrl?<div className={css.walletInfo} role="status"><p>{t.ready}</p>
    <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className={css.gatePrimary}>
     {t.open}<ArrowRight size={17}/></a></div>:
    <button type="button" className={css.gatePrimary} data-course-wallet-checkout
     disabled={!signedIn||!accountId||status!=="available"||!selected||!amountValid||busy}
     onClick={()=>void openPayment()}>{busy?t.waiting:t.pay}<ArrowRight size={17}/></button>}
   <p className={css.walletPrivacy}><ShieldCheck size={16}/>{t.note}</p>
  </section>
 </div>;
}
