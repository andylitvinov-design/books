"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import type {VideoGiftAspect,VideoGiftSubject} from "@/lib/mandala/video-gift-contract.mjs";

type Locale="en"|"ru"|"es";
type Entry={id:string;status:string;orientation:VideoGiftAspect;motion:string;reusable?:boolean};
type Selected={id:string;blob:Blob;orientation:VideoGiftAspect};
type Props={
  locale:Locale;photoUrl:string|null;aspect:VideoGiftAspect;sourceOwner:VideoGiftSubject;
  rightsConfirmed:boolean;subjectConsent:boolean;
  selectedId:string|null;disabled:boolean;onSelect:(clip:Selected)=>void;
};
const COPY={
  en:{title:"HeyGen opening · 5 seconds",hint:"Choose a private, already animated clip or explicitly create one. The next 20 seconds will use four approved moving scenes; no second HeyGen charge.",
    signIn:"Sign in to My House to access private animated clips.",unavailable:"Live Photos are not enabled on this site yet. The free photo MP4 is still available.",
    empty:"No ready HeyGen clips for this format.",refresh:"Refresh library",use:"Use this opening",selected:"Selected for 0–5 seconds",loading:"Checking your private clips…",
    motion:"Face movement",smile:"Soft smile",greeting:"Hello",wave:"Small wave",blink:"Blink",turn:"Head turn",
    consent:"I authorize sending this photograph and the person's likeness to HeyGen to animate it.",
    xp:"I approve a 500 XP hold for ONE new 5-second HeyGen animation. Reusing a saved clip costs 0 XP.",
    create:"Create new 5s HeyGen opening · 500 XP",pending:"Requested. Refresh to check HeyGen status; do not resubmit a pending job.",
    blocked:"New paid animations are disabled until the provider and XP wallet are verified.",minor:"New HeyGen animations of children are not available.",
    error:"Could not load a verified private MP4. No substitute animation has been created.",createError:"HeyGen request was not confirmed. Check the existing library before trying again.",
    createElsewhere:"Manage my AI avatars",none:"Use free photo montage instead"},
  ru:{title:"Вступление HeyGen · 5 секунд",hint:"Выберите уже готовую приватную анимацию или явно закажите новую. Далее — четыре разрешённых видеофрагмента по 5 секунд, без повторной оплаты HeyGen.",
    signIn:"Войдите в My House, чтобы открыть личные анимации.",unavailable:"Live Photos пока не активированы. Бесплатный MP4 из фотографии доступен.",
    empty:"Нет готовых HeyGen-анимаций этого формата.",refresh:"Обновить библиотеку",use:"Вставить в начало",selected:"Выбрано для 0–5-й секунды",loading:"Проверяем личные видео…",
    motion:"Движение лица",smile:"Улыбка",greeting:"Приветствие",wave:"Помахать рукой",blink:"Моргание",turn:"Поворот головы",
    consent:"Разрешаю передать эту фотографию и внешность изображённого человека в HeyGen для анимации.",
    xp:"Разрешаю резервировать 500 XP за ОДНУ новую 5-секундную анимацию. Повторное использование сохранённого клипа — 0 XP.",
    create:"Создать новое вступление HeyGen · 500 XP",pending:"Заявка отправлена. Обновите статус; повторно не отправляйте незавершённый заказ.",
    blocked:"Новые платные анимации выключены до проверки провайдера и XP-кошелька.",minor:"Новые HeyGen-анимации несовершеннолетних недоступны.",
    error:"Не удалось загрузить проверенный приватный MP4. Подмена анимации не выполняется.",createError:"Отправка в HeyGen не подтверждена. Проверьте библиотеку перед повторной попыткой.",
    createElsewhere:"Управление AI-аватарами",none:"Оставить бесплатный монтаж"},
  es:{title:"Inicio HeyGen · 5 segundos",hint:"Elige una animación privada existente o solicita una nueva con autorización explícita. Después se montan cuatro clips autorizados de 5 segundos sin otro cobro de HeyGen.",
    signIn:"Inicia sesión en Mi Casa para acceder a tus animaciones.",unavailable:"Live Photos aún no está activo. Puedes crear un MP4 gratuito con la foto.",
    empty:"No hay animaciones HeyGen disponibles en este formato.",refresh:"Actualizar biblioteca",use:"Usar como inicio",selected:"Elegido para los segundos 0–5",loading:"Buscando clips privados…",
    motion:"Movimiento facial",smile:"Sonrisa",greeting:"Saludo",wave:"Saludar con la mano",blink:"Parpadeo",turn:"Girar la cabeza",
    consent:"Autorizo enviar esta fotografía y la imagen de la persona a HeyGen para animarla.",
    xp:"Autorizo reservar 500 XP por UNA nueva animación HeyGen de 5 segundos. Reutilizar un clip guardado cuesta 0 XP.",
    create:"Crear inicio HeyGen de 5s · 500 XP",pending:"Solicitud enviada. Actualiza el estado sin repetir el pedido pendiente.",
    blocked:"La animación de pago está desactivada hasta verificar el proveedor y el monedero XP.",minor:"No se admiten nuevas animaciones HeyGen de menores.",
    error:"No se pudo cargar el MP4 privado verificado. No se usará una falsa animación.",createError:"La solicitud no está confirmada. Revisa la biblioteca antes de reintentar.",
    createElsewhere:"Mis avatares IA",none:"Mantener montaje gratuito"}
} as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function MandalaGiftLiveIntro({locale,photoUrl,aspect,sourceOwner,rightsConfirmed,
  subjectConsent,selectedId,disabled,onSelect}:Props){
  const t=COPY[locale];
  const [entries,setEntries]=useState<Entry[]>([]);
  const [state,setState]=useState<"loading"|"ready"|"unavailable">("loading");
  const [creationEnabled,setCreationEnabled]=useState(false);
  const [motion,setMotion]=useState<"smile"|"greeting"|"wave"|"blink"|"turn">("smile");
  const [aiConsent,setAiConsent]=useState(false);
  const [xpConsent,setXpConsent]=useState(false);
  const [working,setWorking]=useState(false);
  const [notice,setNotice]=useState("");
  const requestId=useRef<string|null>(null);
  const mounted=useRef(true);
  const refresh=useCallback(async()=>{
    const res=await fetch("/api/app/live-photos",{credentials:"same-origin",cache:"no-store"});
    if(!res.ok)throw new Error("PRIVATE_LIVE_LIBRARY_NOT_AVAILABLE");
    const data=await res.json();
    if(!mounted.current)return;
    setEntries(Array.isArray(data.items)?data.items.filter((item:Entry)=>item&&UUID.test(item.id)&&
      ["ready","pending","submitted","submitting","finalizing","unknown","failed"].includes(item.status)):[]);
    setCreationEnabled(data.creationEnabled===true);
    setState("ready");
  },[]);
  useEffect(()=>{
    mounted.current=true;
    void refresh().catch(()=>{if(mounted.current)setState("unavailable");});
    return()=>{mounted.current=false;};
  },[refresh]);
  const active=entries.some(item=>["pending","submitted","submitting","finalizing"].includes(item.status));
  useEffect(()=>{
    if(!active)return;
    const interval=window.setInterval(()=>void refresh().catch(()=>{}),20000);
    return()=>window.clearInterval(interval);
  },[active,refresh]);
  const ready=entries.filter(item=>item.status==="ready"&&item.reusable===true&&item.orientation===aspect);
  const canCreate=creationEnabled&&!working&&!disabled&&Boolean(photoUrl)&&rightsConfirmed&&
    sourceOwner!=="minor"&&(sourceOwner==="self"||subjectConsent)&&aiConsent&&xpConsent;
  async function select(item:Entry){
    if(working||disabled||!UUID.test(item.id)||item.status!=="ready"||item.orientation!==aspect)return;
    setWorking(true);setNotice("");
    try{
      const response=await fetch("/api/app/live-photos/"+encodeURIComponent(item.id),
        {credentials:"same-origin",cache:"no-store"});
      if(!response.ok)throw new Error("PRIVATE_LIVE_CLIP_UNAVAILABLE");
      const data=await response.json();
      if(data.status!=="ready"||typeof data.url!=="string")throw new Error("PRIVATE_LIVE_CLIP_UNAVAILABLE");
      const url=new URL(data.url);
      if(url.protocol!=="https:"||!url.pathname.includes("/storage/v1/object/sign/hh-client-private-media/live-photos/"))
        throw new Error("PRIVATE_LIVE_CLIP_INVALID_URL");
      const download=await fetch(url.href,{credentials:"omit",mode:"cors",cache:"no-store"});
      if(!download.ok)throw new Error("PRIVATE_LIVE_CLIP_UNAVAILABLE");
      const declaredBytes=Number(download.headers.get("content-length")||0);
      if(declaredBytes>12_000_000)throw new Error("PRIVATE_LIVE_CLIP_TOO_LARGE");
      const raw=await download.blob();
      if(raw.size<2048||raw.size>12_000_000)throw new Error("PRIVATE_LIVE_CLIP_INVALID_MP4");
      const header=new Uint8Array(await raw.slice(0,12).arrayBuffer());
      if(String.fromCharCode(...header.slice(4,8))!=="ftyp")throw new Error("PRIVATE_LIVE_CLIP_INVALID_MP4");
      onSelect({id:item.id,blob:new Blob([raw],{type:"video/mp4"}),orientation:item.orientation});
    }catch{setNotice(t.error);}
    finally{setWorking(false);}
  }
  async function create(){
    if(!canCreate||!photoUrl)return;
    setWorking(true);setNotice("");
    // Keep the SAME request id when a provider submission response is ambiguous;
    // never automatically resubmit a paid job.
    if(!requestId.current)requestId.current=crypto.randomUUID();
    try{
      const imageResponse=await fetch(photoUrl);
      if(!imageResponse.ok)throw new Error("PRIVATE_PHOTO_NOT_AVAILABLE");
      const image=await imageResponse.blob();
      if(image.size<128||image.size>3_000_000)throw new Error("PHOTO_SIZE_INVALID");
      const form=new FormData();
      form.set("photo",new File([image],"consented-gift-photo.jpg",{type:"image/jpeg"}));
      form.set("motion",motion);
      form.set("orientation",aspect);
      form.set("subject",sourceOwner);
      form.set("consentAi","true");form.set("consentSubject","true");form.set("consentXp","true");
      form.set("requestId",requestId.current);
      const response=await fetch("/api/app/live-photos",
        {method:"POST",credentials:"same-origin",cache:"no-store",body:form});
      const data=await response.json();
      if(!response.ok||!UUID.test(data.id))throw new Error("HEYGEN_REQUEST_UNCONFIRMED");
      requestId.current=null;setXpConsent(false);setAiConsent(false);
      setNotice(t.pending);
      await refresh();
    }catch{setNotice(t.createError);await refresh().catch(()=>{});}
    finally{setWorking(false);}
  }
  return <section data-video-gift-live-intro style={{padding:13,border:"1px solid #b9d0c4",
    borderRadius:14,background:"rgba(250,252,247,.95)",display:"grid",gap:9}}>
    <strong style={{fontSize:16}}>{t.title}</strong>
    <p style={{fontSize:13,margin:0,lineHeight:1.5}}>{t.hint}</p>
    {state==="loading"?<small role="status">{t.loading}</small>:null}
    {state==="unavailable"?<small role="status">{t.signIn} {t.unavailable}</small>:null}
    {state==="ready"&&ready.length===0?<small>{t.empty}</small>:null}
    {ready.map(item=><button type="button" key={item.id} onClick={()=>void select(item)}
      disabled={working||disabled} aria-pressed={selectedId===item.id}
      style={{padding:12,minHeight:44,borderRadius:10,border:"1px solid #82a98b",
        background:selectedId===item.id?"#dceee0":"#fff",textAlign:"left",color:"#244733"}}>
      {t.use} · {item.motion} · 5s {selectedId===item.id?"✓":""}
    </button>)}
    {selectedId?<small role="status">{t.selected}</small>:null}
    <button type="button" disabled={working} onClick={()=>void refresh().catch(()=>setState("unavailable"))}
      style={{padding:10,border:"1px solid #bfd3c2",borderRadius:9,background:"#fff",color:"#264b38"}}>
      {t.refresh}
    </button>
    {state==="ready"&&creationEnabled&&sourceOwner!=="minor"?<>
      <label style={{fontSize:13}}>{t.motion}
        <select value={motion} disabled={working||disabled} onChange={event=>{
          setMotion(event.target.value as typeof motion);requestId.current=null;setXpConsent(false);
        }} style={{display:"block",width:"100%",padding:10,marginTop:4}}>
          {(["smile","greeting","wave","blink","turn"] as const).map(key=>
            <option key={key} value={key}>{t[key]}</option>)}
        </select>
      </label>
      <label style={{display:"flex",gap:8,fontSize:13}}>
        <input type="checkbox" checked={aiConsent} disabled={working||disabled}
          onChange={event=>setAiConsent(event.target.checked)}/>{t.consent}
      </label>
      <label style={{display:"flex",gap:8,fontSize:13}}>
        <input type="checkbox" checked={xpConsent} disabled={working||disabled}
          onChange={event=>setXpConsent(event.target.checked)}/>{t.xp}
      </label>
      <button type="button" disabled={!canCreate} onClick={()=>void create()}
        style={{padding:12,minHeight:44,border:0,borderRadius:10,background:"#315a40",
          color:"white",fontWeight:650,opacity:canCreate?1:.5}}>
        {working?"…":t.create}
      </button>
    </>:<small>{sourceOwner==="minor"?t.minor:t.blocked}</small>}
    {notice?<small role="status">{notice}</small>:null}
    <Link href={"/"+locale+"/app/videos?tab=avatars"} style={{fontSize:13}}>{t.createElsewhere}</Link>
  </section>;
}
