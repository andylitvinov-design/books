"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CreditCard, Gift, LoaderCircle, RefreshCw, Wallet } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./mandala-credit-wallet.module.css";

type Offer = { sku:string;kind:"audio"|"video";minor:number;available:boolean };
type WalletResult = {
  enabled:boolean;authenticated:boolean;currency:"USD";
  welcomeMinor:number;bonusMinor?:number;purchasedMinor?:number;balanceMinor?:number;debtMinor?:number;
  offers:Offer[];packs:number[];payments:{card:boolean;paypal:boolean};
};
const usd=(minor:number)=>"$"+(minor/100).toFixed(2);
const messages={
  ru:{
    title:"Ваши кредиты",welcome:"Бонус новым участникам",bonus:"Бонусные",purchased:"Пополненные",
    balance:"Доступно",signIn:"Войти и получить бонус",loading:"Загружаем баланс…",
    refill:"Пополнить кредиты",add:"Пополнение",offerLabel:"Стоимость одной генерации",
    videos:"Видео",audios:"Аудио",basic:"Basic · сборка на устройстве",smart:"Smart · AI",pro:"Pro · AI",
    free:"Бесплатно",notActive:"Скоро",charges:"Списание только за реально выполненную платную генерацию",
    proposed:"AI-генерация ещё подключается: эти цены предварительные, списаний сейчас нет.",
    waiting:"Кошелёк готовится к запуску. Начисление бонуса станет доступно после подключения.",
    card:"Оплатить картой",paypal:"Оплатить PayPal",paymentOff:"Приём платежей временно не подключён.",
    notice:"Кредиты нельзя вывести или перевести другому пользователю.",
    success:"Оплата проверяется. Обновите баланс после подтверждения платежа.",
    cancelled:"Платёж отменён, средства не списаны.",paypalTry:"Проверяем оплату PayPal…",
    error:"Не удалось получить баланс. Попробуйте обновить.",
    paymentError:"Не удалось подтвердить оплату. Кредиты не начислены.",
    processing:"Открываем защищённую оплату…",refresh:"Обновить",debt:"Операции приостановлены до проверки платежа.",
    exhausted:"Бонусные кредиты закончились. Выберите сумму пополнения.",
    savings:"Используем бонусные кредиты в первую очередь.",
  },
  en:{
    title:"Your credits",welcome:"New member welcome bonus",bonus:"Bonus",purchased:"Purchased",
    balance:"Available",signIn:"Sign in to claim",loading:"Loading balance…",
    refill:"Add credits",add:"Top up",offerLabel:"Price per generation",
    videos:"Video",audios:"Audio",basic:"Basic · on-device",smart:"Smart · AI",pro:"Pro · AI",
    free:"Free",notActive:"Coming soon",charges:"Only successfully delivered paid jobs use credits",
    proposed:"AI generation is not live yet: prices are provisional and no credits are charged.",
    waiting:"Wallet activation is pending. The welcome grant will become available once enabled.",
    card:"Pay by card",paypal:"Pay with PayPal",paymentOff:"Payments have not yet been activated.",
    notice:"Credits cannot be withdrawn or transferred to other users.",
    success:"Payment is being verified. Refresh your balance when it is confirmed.",
    cancelled:"Payment cancelled. No credits have been added.",paypalTry:"Verifying PayPal payment…",
    error:"Unable to load your balance. Please refresh.",
    paymentError:"Unable to verify payment. No credits were added.",
    processing:"Opening secure checkout…",refresh:"Refresh",debt:"Credits are on hold pending payment review.",
    exhausted:"You've used your welcome credits. Choose a top-up amount.",
    savings:"Bonus credits are used first.",
  },
  es:{
    title:"Tus créditos",welcome:"Bono de bienvenida",bonus:"Bono",purchased:"Comprados",
    balance:"Disponibles",signIn:"Inicia sesión para activar",loading:"Cargando saldo…",
    refill:"Recargar créditos",add:"Recargar",offerLabel:"Precio por generación",
    videos:"Vídeo",audios:"Audio",basic:"Basic · en dispositivo",smart:"Smart · IA",pro:"Pro · IA",
    free:"Gratis",notActive:"Próximamente",charges:"Solo las generaciones de pago completadas consumen créditos",
    proposed:"La generación IA aún no está activa: los precios son provisionales, sin cargos.",
    waiting:"La cartera está pendiente de activación. El bono llegará al habilitar el servicio.",
    card:"Pagar con tarjeta",paypal:"Pagar con PayPal",paymentOff:"Los pagos todavía no están activos.",
    notice:"Los créditos no se pueden retirar ni transferir.",
    success:"Estamos comprobando el pago. Actualiza el saldo tras la confirmación.",
    cancelled:"Pago cancelado, no se añadieron créditos.",paypalTry:"Comprobando PayPal…",
    error:"No se pudo cargar el saldo. Actualiza.",
    paymentError:"No se pudo confirmar el pago. No se han añadido créditos.",
    processing:"Abriendo el pago seguro…",refresh:"Actualizar",debt:"Créditos bloqueados hasta revisar el pago.",
    exhausted:"Se agotaron tus créditos de bienvenida. Elige un importe.",
    savings:"Primero se utilizan los créditos de bonificación.",
  },
} as const;
const fallbackOffers:Offer[]=[
  {sku:"video-basic",kind:"video",minor:0,available:true},
  {sku:"video-smart",kind:"video",minor:200,available:false},
  {sku:"video-pro",kind:"video",minor:990,available:false},
  {sku:"audio-basic",kind:"audio",minor:0,available:true},
  {sku:"audio-smart",kind:"audio",minor:50,available:false},
  {sku:"audio-pro",kind:"audio",minor:150,available:false},
];
function offerTier(sku:string):"basic"|"smart"|"pro" {
  return sku.endsWith("basic")?"basic":sku.endsWith("pro")?"pro":"smart";
}
export function MandalaCreditWallet({locale}:{locale:PublicLocale}) {
  const t=messages[locale]||messages.en;
  const [wallet,setWallet]=useState<WalletResult|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [opened,setOpened]=useState(false);
  const [chosen,setChosen]=useState(500);
  const [alert,setAlert]=useState("");
  const initial=useRef(false);
  const load=useCallback(async()=>{
    try{
      const response=await fetch("/api/app/media-credits",{credentials:"same-origin",cache:"no-store"});
      if(!response.ok)throw new Error("STATUS");
      const result=await response.json() as WalletResult;
      setWallet(result);setAlert("");
    }catch{setAlert(t.error);}finally{setLoading(false);}
  },[t.error]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(initial.current)return;
    initial.current=true;
    const p=new URLSearchParams(window.location.search);
    const status=p.get("credits");
    const topup=p.get("topup");
    if(status==="cancelled")setAlert(t.cancelled);
    else if(status==="success"&&topup&&/^[0-9a-f-]{36}$/i.test(topup)){
      setBusy(true);setAlert(t.success);
      void (async()=>{
        try{
          const response=await fetch("/api/app/media-credits/reconcile",{
            method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({topupId:topup}),
          });
          if(!response.ok)throw new Error("PAYMENT");
          await load();setAlert(t.success);
        }catch{setAlert(t.paymentError);}finally{setBusy(false);}
      })();
    } else if(status==="success")setAlert(t.success);
    else if(status==="paypal"&&topup&&/^[0-9a-f-]{36}$/i.test(topup)){
      setBusy(true);setAlert(t.paypalTry);
      void (async()=>{
        try{
          const response=await fetch("/api/app/media-credits/paypal-capture",{
            method:"POST",credentials:"same-origin",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({topupId:topup}),
          });
          if(!response.ok)throw new Error("PAYMENT");
          await load();
          setAlert(t.success);
        }catch{setAlert(t.paymentError);}finally{setBusy(false);}
      })();
    }
    if(status){
      p.delete("credits");p.delete("topup");
      const rest=p.toString();
      window.history.replaceState(null,"",window.location.pathname+(rest?"?"+rest:"")+window.location.hash);
    }
  },[load,t.cancelled,t.success,t.paypalTry,t.paymentError]);
  async function checkout(provider:"stripe"|"paypal") {
    if(busy||!wallet?.authenticated||!wallet.enabled||wallet.debtMinor)return;
    setBusy(true);setAlert(t.processing);
    try{
      const response=await fetch("/api/app/media-credits/checkout",{
        method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({operationId:crypto.randomUUID(),provider,amountMinor:chosen,locale}),
      });
      if(!response.ok)throw new Error("CHECKOUT");
      const data=await response.json() as {checkoutUrl:string};
      const url=new URL(data.checkoutUrl);
      if(url.protocol!=="https:"||!["checkout.stripe.com","www.paypal.com","www.sandbox.paypal.com"].includes(url.hostname))
        throw new Error("URL");
      window.location.assign(url.href);
    }catch{setAlert(t.paymentError);setBusy(false);}
  }
  const offers=wallet?.offers?.length?wallet.offers:fallbackOffers;
  const balance=wallet?.enabled&&wallet.authenticated?wallet.balanceMinor:null;
  const canPay=Boolean(wallet?.payments?.card||wallet?.payments?.paypal);
  return <section className={styles.wallet} aria-label={t.title} data-media-credit-wallet>
    <div className={styles.top}>
      <div className={styles.intro}>
        <span className={styles.symbol}><Wallet size={20} aria-hidden="true"/></span>
        <div><h2>{t.title}</h2><p><Gift size={14} aria-hidden="true"/>{t.welcome}: <strong>{usd(wallet?.welcomeMinor??200)}</strong></p></div>
      </div>
      <div className={styles.balance}>
        <span>{t.balance}</span>
        <strong aria-live="polite">{loading?"…":balance===null?"—":usd(balance)}</strong>
        {wallet?.authenticated&&wallet.enabled&&<small>{t.bonus} {usd(wallet.bonusMinor??0)} · {t.purchased} {usd(wallet.purchasedMinor??0)}</small>}
      </div>
      <button type="button" className={styles.refill} disabled={busy}
        onClick={()=>setOpened(v=>!v)} aria-expanded={opened}>
        <CreditCard size={16} aria-hidden="true"/>{t.refill}
      </button>
    </div>
    {loading&&<p className={styles.info} role="status">{t.loading}</p>}
    {!loading&&!wallet?.authenticated&&<p className={styles.info}><Link href={"/"+locale+"/app"}>{t.signIn}</Link></p>}
    {!loading&&wallet&&!wallet.enabled&&<p className={styles.info}>{t.waiting}</p>}
    {wallet?.debtMinor? <p role="status" className={styles.warning}>{t.debt}</p>:null}
    {balance===0&&<p className={styles.warning}>{t.exhausted}</p>}
    <details className={styles.prices}>
      <summary>{t.offerLabel} <span>{t.videos} · {t.audios}</span></summary>
      <div className={styles.groups}>
        {(["video","audio"] as const).map(kind=><div key={kind} className={styles.group}>
          <h3>{kind==="video"?t.videos:t.audios}</h3>
          {offers.filter(o=>o.kind===kind).map(o=><div className={styles.price} key={o.sku}>
            <span>{t[offerTier(o.sku)]}</span>
            <strong>{o.minor===0?t.free:usd(o.minor)}</strong>
            {!o.available&&<small>{t.notActive}</small>}
          </div>)}
        </div>)}
      </div>
      <p className={styles.disclaimer}>{t.proposed}</p>
    </details>
    {opened&&<div className={styles.panel} data-media-credit-topup>
      <div className={styles.topupTitle}><strong>{t.add}</strong>
        <button type="button" aria-label={t.refresh} disabled={busy} onClick={()=>{setLoading(true);void load();}}><RefreshCw size={16}/></button>
      </div>
      <div className={styles.packs} role="group" aria-label={t.add}>
        {(wallet?.packs||[500,1000,2000]).map(minor=><button key={minor} type="button"
          aria-pressed={chosen===minor} disabled={busy}
          onClick={()=>setChosen(minor)}>{usd(minor)}</button>)}
      </div>
      {canPay&&wallet?.authenticated&&wallet.enabled&& !wallet?.debtMinor?
        <div className={styles.providers}>
          {wallet.payments.card&&<button type="button" disabled={busy} onClick={()=>void checkout("stripe")}>{t.card}</button>}
          {wallet.payments.paypal&&<button type="button" disabled={busy} onClick={()=>void checkout("paypal")}>{t.paypal}</button>}
        </div>:<p className={styles.info}>{wallet?.authenticated?t.paymentOff:t.signIn}</p>}
      <p className={styles.disclaimer}>{t.notice}</p>
    </div>}
    <p className={styles.foot}>{t.charges} · {t.savings}</p>
    {alert&&<p className={styles.warning} role="status" aria-live="polite">{busy&&<LoaderCircle size={13} aria-hidden="true"/>}{alert}</p>}
  </section>;
}
