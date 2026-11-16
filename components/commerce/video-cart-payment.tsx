"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, CreditCard, ShoppingBasket, Trash2, X } from "lucide-react";
import { createVideoCartSelection, restoreVideoCart, videoCartProduct,
  VIDEO_CART_STORAGE_KEY, SERVICE_CART_UPDATED_EVENT } from "@/lib/commerce/cart";
import { PERSONAL_PAYPAL_PAYEE } from "@/lib/commerce/paypal-personal";
import type { ServiceLocale } from "@/lib/commerce/catalog";
import styles from "./video-cart-payment.module.css";

const copy={
 en:{
   tag:"VIDEO STUDIO · ONE-TIME REQUEST", title:"Your video", price:"Video total",remove:"Remove",
   edit:"Return to Video Studio", pay:"Pay", paypal:"Pay with PayPal", confirm:"Review PayPal payment",
   brief:"Your video directions", privateBrief:"Only saved in this browser session. Not sent to PayPal or the master.",
   receipt:"After paying", after:"PayPal.Me cannot confirm a transaction to this website. Send the PayPal transaction reference to the master; work begins only after the recipient verifies payment and accepts the brief.",
   messaging:"Contact the master on Telegram", contact:"Send only your payment reference in messenger. Keep personal or health details in the secure cabinet.",
   note:"One-off payment, not a subscription. This is a manually verified video request; €3/€5 AI rendering and automatic file delivery are not enabled.",
   popupTitle:"PayPal payment", close:"Close", recipient:"Recipient", method:"Goods & Services — never Friends & Family",
   agree:"I understand that PayPal.Me opens an external payment page, the transfer requires manual verification, and video generation is NOT automatic.",
   continue:"Continue to PayPal", disabled:"PayPal is currently unavailable. No money was taken.",
   opened:"PayPal opened in another window or tab. This does not confirm a payment.",
   blocked:"Your browser blocked the window. Open PayPal directly with the link below.",
   fallback:"Open PayPal in a new tab", code:"PayPal transaction ID",codeHint:"Copy the receipt reference from PayPal, not your card details.",
   copy:"Copy receipt message", copied:"Copied · paste into Telegram", copyFailed:"Copy unavailable — send the reference manually.",
   missingCode:"Enter your PayPal transaction ID first.", receiptMessage:"Hello! Please verify my PayPal payment for the video",
 },
 ru:{
   tag:"ВИДЕОСТУДИЯ · РАЗОВЫЙ ЗАКАЗ",title:"Ваше видео",price:"Стоимость видео",remove:"Убрать",
   edit:"Вернуться в видеостудию",pay:"Оплатить",paypal:"Оплатить через PayPal",confirm:"Проверить заказ",
   brief:"Ваши пожелания",privateBrief:"Сохранены только в этой вкладке браузера. Не передаются PayPal или мастеру.",
   receipt:"После перевода",after:"PayPal.Me не передаёт сайту подтверждение. Отправьте мастеру номер транзакции; работа начнётся только после проверки поступления и согласования задания.",
   messaging:"Связаться с мастером в Telegram",contact:"В мессенджере передавайте только номер платежа. Личные и медицинские сведения остаются в защищённом кабинете.",
   note:"Разовая оплата, без подписки. Заявка проверяется вручную; автоматическая AI-генерация €3/€5 и доставка видео пока не включены.",
   popupTitle:"Оплата PayPal",close:"Закрыть",recipient:"Получатель",method:"Товары и услуги — не «Друзья и семья»",
   agree:"Я понимаю: откроется внешний PayPal.Me, перевод проверяется вручную, видео НЕ создаётся автоматически.",
   continue:"Продолжить в PayPal",disabled:"PayPal сейчас недоступен. Деньги не списаны.",
   opened:"PayPal открыт в отдельном окне или вкладке. Это ещё не подтверждение оплаты.",
   blocked:"Браузер заблокировал окно. Откройте PayPal по ссылке ниже.",
   fallback:"Открыть PayPal в новой вкладке",code:"Номер транзакции PayPal",codeHint:"Укажите номер платежа из PayPal, не данные карты.",
   copy:"Скопировать сообщение с номером",copied:"Скопировано · вставьте в Telegram",copyFailed:"Не удалось скопировать — отправьте номер вручную.",
   missingCode:"Сначала укажите номер транзакции.",receiptMessage:"Здравствуйте! Проверьте мой PayPal-перевод за видео",
 },
 es:{
   tag:"ESTUDIO DE VÍDEO · PEDIDO ÚNICO",title:"Tu vídeo",price:"Total del vídeo",remove:"Quitar",
   edit:"Volver al estudio",pay:"Pagar",paypal:"Pagar con PayPal",confirm:"Revisar el pago",
   brief:"Tus indicaciones",privateBrief:"Guardadas solo en esta sesión del navegador. No se envían a PayPal ni al profesional.",
   receipt:"Después del pago",after:"PayPal.Me no confirma transacciones al sitio. Envía la referencia al profesional; el trabajo comienza tras verificar la recepción y aceptar las instrucciones.",
   messaging:"Contactar por Telegram",contact:"Envía solo el número del pago en mensajería. Los datos privados o de salud se quedan en el área segura.",
   note:"Pago único, sin suscripción. Solicitud con revisión manual: la generación IA de €3/€5 y la entrega automática no están disponibles.",
   popupTitle:"Pago PayPal",close:"Cerrar",recipient:"Destinatario",method:"Bienes y servicios, nunca Amigos y familiares",
   agree:"Entiendo que PayPal.Me se abre fuera del sitio, el pago se verifica manualmente y el vídeo NO se genera automáticamente.",
   continue:"Continuar a PayPal",disabled:"PayPal no está disponible. No se ha cobrado nada.",
   opened:"PayPal se ha abierto en otra ventana o pestaña. No confirma el pago.",
   blocked:"El navegador bloqueó la ventana. Abre PayPal con el enlace siguiente.",
   fallback:"Abrir PayPal en otra pestaña",code:"ID de transacción PayPal",codeHint:"Usa la referencia de PayPal, nunca los datos de tu tarjeta.",
   copy:"Copiar mensaje de recibo",copied:"Copiado · pega en Telegram",copyFailed:"No se pudo copiar. Envía el número manualmente.",
   missingCode:"Escribe primero el ID de transacción.",receiptMessage:"Hola. Verifica mi pago PayPal del vídeo",
 },
} as const;

export function VideoCartPayment({locale,paypalEnabled}:{locale:ServiceLocale;paypalEnabled:boolean}) {
 const t=copy[locale];
 const [selection,setSelection]=useState<{id:string;brief:string}|null>(null);
 const [open,setOpen]=useState(false);
 const [agreed,setAgreed]=useState(false);
 const [paypalOpened,setPaypalOpened]=useState(false);
 const [popupBlocked,setPopupBlocked]=useState(false);
 const [reference,setReference]=useState("");
 const [feedback,setFeedback]=useState("");
 const openButton=useRef<HTMLButtonElement|null>(null);
 const closeButton=useRef<HTMLButtonElement|null>(null);

 useEffect(()=>{
   const sync=()=>{
     let saved:null|{id:string;brief:string}=null;
     try{saved=restoreVideoCart(window.sessionStorage.getItem(VIDEO_CART_STORAGE_KEY));}catch{}
     const fromUrl=new URLSearchParams(window.location.search).get("video");
     const next=fromUrl&&videoCartProduct(fromUrl)
       ? (saved?.id===fromUrl?saved:createVideoCartSelection(fromUrl))
       : saved;
     setSelection(next);
     if(next&&fromUrl&&next.id===fromUrl) {
       try{window.sessionStorage.setItem(VIDEO_CART_STORAGE_KEY,JSON.stringify(next));}catch{}
     }
   };
   sync();
   window.addEventListener(SERVICE_CART_UPDATED_EVENT,sync);
   window.addEventListener("pageshow",sync);
   return()=>{window.removeEventListener(SERVICE_CART_UPDATED_EVENT,sync);
     window.removeEventListener("pageshow",sync);};
 },[]);
 useEffect(()=>{
   if(!open)return;
   closeButton.current?.focus();
   const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
   window.addEventListener("keydown",onEscape);
   return()=>{window.removeEventListener("keydown",onEscape);openButton.current?.focus();};
 },[open]);

 const product=selection?videoCartProduct(selection.id):null;
 if(!product)return null;
 const title=product.title[locale],price="€"+String(product.amountMinor/100);
 const redirect="/api/payments/paypal/video/"+product.id;

 function remove() {
   try{window.sessionStorage.removeItem(VIDEO_CART_STORAGE_KEY);}catch{}
   window.history.replaceState(window.history.state,"",window.location.pathname);
   setSelection(null);setOpen(false);setAgreed(false);setFeedback("");setReference("");
   window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT));
 }
 function startPayPal() {
   if(!agreed||!paypalEnabled)return;
   const popup=window.open(redirect,"hh_video_paypal","popup=yes,width=510,height=760");
   if(popup){try{popup.opener=null;}catch{}setPaypalOpened(true);setPopupBlocked(false);}
   else {setPopupBlocked(true);setPaypalOpened(false);}
 }
 async function copyReceipt() {
   const cleaned=reference.trim();
   if(!/^[A-Za-z0-9][A-Za-z0-9_.:/-]{5,119}$/.test(cleaned)){setFeedback("missingCode");return;}
   const message=t.receiptMessage+" · "+title+" · "+price+" · "+cleaned+".";
   try{await navigator.clipboard.writeText(message);setFeedback("copied");}
   catch{setFeedback("copyFailed");}
 }

 return <section className={styles.card} data-video-cart-item={product.id} aria-label={t.title}>
   <p className={styles.tag}><ShoppingBasket size={17} aria-hidden="true"/>{t.tag}</p>
   <div className={styles.product}>
     <div><strong>{t.title}</strong><p>{title}</p></div>
     <b>{price}</b>
     <button type="button" onClick={remove} aria-label={t.remove} data-video-cart-remove>
       <Trash2 size={18} aria-hidden="true"/>
     </button>
   </div>
   {selection?.brief?<div className={styles.brief} data-video-cart-local-brief>
     <strong>{t.brief}</strong><p>{selection.brief}</p><small>{t.privateBrief}</small>
   </div>:null}
   <div className={styles.total}><strong>{t.price}</strong><b>{price}</b></div>
   <p className={styles.note}>{t.note}</p>
   <div className={styles.actions}>
     <Link href={"/"+locale+"/holistic-support/mandala"} className={styles.edit}>{t.edit}</Link>
     <button ref={openButton} type="button" data-video-cart-pay onClick={()=>{setOpen(true);setAgreed(false);setFeedback("");}}>
       <CreditCard size={19} aria-hidden="true"/>{t.pay}<ArrowRight size={18} aria-hidden="true"/>
     </button>
   </div>
   {paypalOpened||popupBlocked?<p role="status" className={styles.status} data-video-cart-payment-pending>
     {popupBlocked?t.blocked:t.opened}
     {popupBlocked&&paypalEnabled?<a href={redirect} target="_blank" rel="noopener noreferrer"
       referrerPolicy="no-referrer">{t.fallback}</a>:null}
   </p>:null}
   <section className={styles.followup} data-video-cart-receipt>
     <strong>{t.receipt}</strong><p>{t.after}</p>
     <label htmlFor="video-paypal-receipt">{t.code}</label>
     <input id="video-paypal-receipt" value={reference} onChange={e=>setReference(e.currentTarget.value)}
       maxLength={120} autoComplete="off" placeholder={t.codeHint}/>
     <div className={styles.followActions}>
       <button type="button" data-video-cart-copy-receipt onClick={()=>void copyReceipt()}>
         <Copy size={16} aria-hidden="true"/>{t.copy}
       </button>
       <a href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
         {t.messaging}<ArrowRight size={16} aria-hidden="true"/>
       </a>
     </div>
     <small>{t.contact}</small>
     {feedback?<p role="status">{feedback==="missingCode"?t.missingCode:
       feedback==="copied"?t.copied:t.copyFailed}</p>:null}
   </section>
   {open?<div className={styles.overlay} data-video-cart-paypal-overlay onMouseDown={event=>{
     if(event.target===event.currentTarget)setOpen(false);
   }}>
     <section role="dialog" aria-modal="true" aria-labelledby="video-cart-paypal-title"
       className={styles.dialog} data-video-cart-paypal-dialog>
       <header><h2 id="video-cart-paypal-title">{t.popupTitle}</h2>
         <button ref={closeButton} type="button" onClick={()=>setOpen(false)} aria-label={t.close}>
           <X size={21} aria-hidden="true"/>
         </button>
       </header>
       <div className={styles.dialogAmount}><span>{title}</span><b>{price}</b></div>
       <p><strong>{t.recipient}:</strong> {PERSONAL_PAYPAL_PAYEE}</p>
       <p className={styles.method}><Check size={16} aria-hidden="true"/>{t.method}</p>
       <p className={styles.note}>{t.note}</p>
       <label className={styles.ack}><input type="checkbox" checked={agreed}
         onChange={event=>setAgreed(event.currentTarget.checked)}/>{t.agree}</label>
       <button type="button" className={styles.confirm} disabled={!agreed||!paypalEnabled||paypalOpened}
         data-video-cart-paypal-open onClick={startPayPal}>
         <CreditCard size={18} aria-hidden="true"/>{t.continue}<ArrowRight size={17} aria-hidden="true"/>
       </button>
       {!paypalEnabled?<p role="status">{t.disabled}</p>:null}
       {(paypalOpened||popupBlocked)&&<p role="status" className={styles.status}>
         {popupBlocked?t.blocked:t.opened}
         {popupBlocked&&paypalEnabled?<a href={redirect} target="_blank" rel="noopener noreferrer"
           referrerPolicy="no-referrer">{t.fallback}</a>:null}
       </p>}
     </section>
   </div>:null}
 </section>;
}
