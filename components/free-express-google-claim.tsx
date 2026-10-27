"use client";

import {useEffect, useRef, useState} from "react";
import {usePathname} from "next/navigation";
import type {PublicLocale} from "@/lib/public-locales";
import {
  EXPRESS_GOOGLE_CLAIM_PENDING_KEY, validExpressGoogleClaimIntent,
} from "@/lib/practitioners/free-express-google-claim.mjs";
import styles from "./free-express-google-claim.module.css";

const copy = {
  en: {
    button: "Save request to my Google account",
    intro: "Keep this free request and Andrey's eventual report in your private Holistic House account. Your chat is not linked automatically.",
    pending: "Connecting your private account…",
    done: "Saved to your private account. Any report Andrey sends will appear in My Reports and Messages.",
    failed: "Account linking was not confirmed. Your original enquiry is still saved. You can retry while the secure request is valid.",
  },
  ru: {
    button: "Сохранить заявку в Google-кабинете",
    intro: "Заявка и будущий отчёт Андрея будут доступны в личном кабинете Holistic House. Telegram при этом не привязывается автоматически.",
    pending: "Привязываем защищённый аккаунт…",
    done: "Заявка привязана к вашему аккаунту. Отчёт появится в «Моих отчётах» и «Сообщениях».",
    failed: "Связь с аккаунтом не подтверждена. Сама заявка сохранена. Повторите попытку, пока защищённое продолжение действительно.",
  },
  es: {
    button: "Guardar solicitud en mi cuenta Google",
    intro: "Tu solicitud y el futuro informe estarán en tu cuenta privada de Holistic House. Telegram no se vincula automáticamente.",
    pending: "Vinculando tu cuenta privada…",
    done: "Solicitud vinculada. El informe aparecerá en Mis informes y Mensajes.",
    failed: "No se confirmó la vinculación. La solicitud original sigue guardada. Puedes reintentar durante el plazo seguro.",
  },
} as const;

const REF = /^HH-[A-F0-9]{12}$/;
type Props = {
  locale: PublicLocale;
  referenceCode: string | null;
  onRestored: (referenceCode: string) => void;
};

export function FreeExpressGoogleClaim({locale,referenceCode,onRestored}:Props) {
  const pathname=usePathname();
  const t=copy[locale];
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState(false);
  const [error,setError]=useState(false);
  const [resumeReference,setResumeReference]=useState<string | null>(null);
  const attempted=useRef(false);
  const activeReference=referenceCode || resumeReference;

  async function confirmClaim(ref:string) {
    const response=await fetch("/api/free-express/claim", {
      method:"POST", credentials:"same-origin", cache:"no-store",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({consent:true,referenceCode:ref}),
    });
    if(response.ok){
      const result=await response.json().catch(()=>null);
      if(result?.saved!==true || result.referenceCode!==ref)
        throw new Error("CLAIM_UNCONFIRMED");
      try {sessionStorage.removeItem(EXPRESS_GOOGLE_CLAIM_PENDING_KEY);}catch{}
      onRestored(ref);
      setSaved(true);
      setError(false);
      return true;
    }
    if(response.status!==401)throw new Error("CLAIM_UNCONFIRMED");
    return false;
  }

  async function start() {
    if(busy || saved || !activeReference || !REF.test(activeReference))return;
    setBusy(true);setError(false);
    try{
      if(await confirmClaim(activeReference))return;
      // Only a user-initiated Google action may set this same-tab marker.
      const auth=await fetch("/api/app/auth/start",{
        method:"POST", credentials:"same-origin", cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({locale,continueTo:"enquiry",returnPath:pathname}),
      });
      const payload=await auth.json().catch(()=>null);
      if(!auth.ok || typeof payload?.redirectUrl!=="string"
        || new URL(payload.redirectUrl).protocol!=="https:")
        throw new Error("GOOGLE_UNAVAILABLE");
      const intent={referenceCode:activeReference,locale,path:pathname,createdAt:Date.now()};
      // If session storage is blocked, do not redirect to an unresumable claim.
      sessionStorage.setItem(EXPRESS_GOOGLE_CLAIM_PENDING_KEY,JSON.stringify(intent));
      window.location.assign(payload.redirectUrl);
    }catch{
      setError(true);
    }finally{setBusy(false);}
  }

  useEffect(()=>{
    if(attempted.current)return;
    let pending:unknown=null;
    try{pending=JSON.parse(sessionStorage.getItem(EXPRESS_GOOGLE_CLAIM_PENDING_KEY)||"null");}
    catch{/* The receipt is never an account credential. */}
    if(!validExpressGoogleClaimIntent(pending,locale,pathname))return;
    const claim=pending as {referenceCode:string};
    attempted.current=true;
    const url=new URL(window.location.href);
    const authFailed=url.searchParams.has("auth");
    url.searchParams.delete("hh_enquiry");url.searchParams.delete("auth");
    window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
    setResumeReference(claim.referenceCode);
    if(authFailed){setError(true);return;}
    setBusy(true);
    void confirmClaim(claim.referenceCode).then(confirmed=>{
      if(!confirmed)setError(true);
    }).catch(()=>setError(true)).finally(()=>setBusy(false));
  },[locale,pathname]);

  if(!activeReference && !busy && !error)return null;
  return <section className={styles.panel} data-express-google-claim>
    {saved?<p className={styles.success} role="status">{t.done}</p>:<>
      <button type="button" className={styles.button} disabled={busy || !activeReference}
        data-express-save-to-google onClick={()=>{void start();}}>
        {busy?t.pending:t.button}
      </button>
      <p className={styles.note}>{t.intro}</p>
      {error&&<p role="alert" className={styles.error}>{t.failed}</p>}
    </>}
  </section>;
}
