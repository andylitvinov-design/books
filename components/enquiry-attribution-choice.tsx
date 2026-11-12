"use client";

import {useEffect,useState} from "react";
import {setEnquiryAttributionConsent} from "./analytics-consent";

const copy = {
  en:{label:"Optional: link public pages recorded after consent, general source and an approved campaign to your enquiries from this browser. The practitioner can see this context; you can withdraw consent in Privacy settings.",excluded:"Source linking is disabled for this browser."},
  ru:{label:"Необязательно: связывать с заявками из этого браузера публичные страницы после согласия, общий источник и разрешённую кампанию. Мастер увидит этот контекст; согласие можно отозвать в настройках приватности.",excluded:"Связывание источника отключено для этого браузера."},
  es:{label:"Opcional: vincular las páginas públicas registradas tras el consentimiento, el origen general y una campaña aprobada a tus solicitudes desde este navegador. El profesional verá este contexto; puedes retirar el consentimiento en Privacidad.",excluded:"La vinculación del origen está desactivada en este navegador."},
} as const;
const cookieHas=(name: string,value: string)=>document.cookie.split("; ").some(part=>part===name+"="+value);

export function EnquiryAttributionChoice({locale,disabled=false}:{locale:"en"|"ru"|"es";disabled?:boolean}) {
  const [allowed,setAllowed]=useState(false);
  const [excluded,setExcluded]=useState(false);
  useEffect(()=>{
    const sync=()=>{
      setAllowed(cookieHas("hh_enquiry_attribution_consent","v1"));
      setExcluded(cookieHas("hh_public_stats_skip","1"));
    };
    sync();
    window.addEventListener("holistic-house:public-stats-consent",sync);
    window.addEventListener("focus",sync);
    return ()=>{
      window.removeEventListener("holistic-house:public-stats-consent",sync);
      window.removeEventListener("focus",sync);
    };
  },[]);
  const t=copy[locale];
  return <label data-enquiry-attribution-choice style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:"0.8125rem",lineHeight:1.4,margin:"8px 0"}}>
    <input type="checkbox" checked={allowed&&!excluded} disabled={disabled||excluded}
      onChange={event=>setEnquiryAttributionConsent(event.target.checked)} />
    <span>{t.label}{excluded?" "+t.excluded:""}</span>
  </label>;
}
