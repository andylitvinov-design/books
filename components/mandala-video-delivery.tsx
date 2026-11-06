"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {Download,Send,RefreshCw,MessageCircle,CheckCircle2} from "lucide-react";
import {appFetch} from "@/lib/app/client-fetch";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-video-delivery.module.css";
import CommunityVideoPublishPanel from "./community-video-publish-panel";

type State={
 cloudAvailable:boolean;
 telegram:{linkAvailable:boolean;linked:boolean;sendingAvailable:boolean;automatic:boolean;consentSaved:boolean};
 whatsapp:{manualShare:boolean;automatic:boolean};
};
type Props={
 locale:PublicLocale;open:boolean;onClose:()=>void;
 blob:Blob;url:string;extension:"mp4"|"webm";mime:string;bytes:number;
 theme:string;aspect:"portrait"|"landscape"|"square";duration:number;
};
const COPY={
 ru:{
  title:"Куда отправить видео?",device:"Скачать файл",telegram:"Telegram",
  whatsapp:"WhatsApp",close:"Закрыть",hint:"Для WhatsApp и Telegram откроется меню телефона — выберите нужный мессенджер.",
  noShare:"Этот браузер не умеет передавать видео в приложения. Скачайте файл и отправьте его из Telegram или WhatsApp вручную.",
  guest:"Для автоматической доставки в Telegram войдите в Holistic House и привяжите бота.",
  login:"Войти и подключить Telegram",connect:"Подключить Telegram-бота",
  bot:"Продолжить в Telegram",connected:"Telegram подключён",
  refresh:"Проверить подключение",direct:"Отправить готовое MP4 ботом",
  automatic:"Автоматически отправлять будущие ролики в мой Telegram",
  consent:"Разрешаю загружать готовые MP4 в мой приватный кабинет и отправлять их моему подтверждённому Telegram-боту. Исходные фото и запросы не передаются отдельно.",
  cloudOff:"Автоотправка пока не активирована на сервере. Отправка через меню телефона доступна.",
  unsupported:"Для автоотправки требуется проверенный MP4 не больше 12 МБ. Этот ролик можно скачать и поделиться им вручную.",
  wait:"Подготавливаем приватную доставку…",
  accepted:"Telegram принял видео к отправке. Это ещё не подтверждение получения или просмотра.",
  duplicate:"Отправка этого ролика уже обрабатывалась. Повторного сообщения не создаём.",
  saved:"Настройка автоматической доставки изменена.",
  error:"Не удалось подтвердить отправку или сохранить настройки. Видео осталось на устройстве; проверьте кабинет и попробуйте позже.",
  cancelled:"Поделиться отменено.",
  privacy:"Файл загружается на сервер только после разрешения на доставку. Автоотправку можно отключить здесь в любое время.",
  house:"Сохранить в My House",community:"На общий YouTube Holistic House",
  houseSaved:"Готовый MP4 сохранён только в вашем приватном кабинете. YouTube не получал этот файл.",
 },
 en:{
  title:"Where should we send your video?",device:"Download file",telegram:"Telegram",
  whatsapp:"WhatsApp",close:"Close",hint:"Telegram and WhatsApp use your device's Share menu. Select the app there.",
  noShare:"File sharing is unavailable in this browser. Download the video, then share it manually from Telegram or WhatsApp.",
  guest:"Sign in to Holistic House and link your Telegram bot to enable automatic delivery.",
  login:"Sign in and connect Telegram",connect:"Connect Telegram bot",
  bot:"Continue in Telegram",connected:"Telegram linked",
  refresh:"Check connection",direct:"Send finished MP4 via bot",
  automatic:"Automatically send future videos to my Telegram",
  consent:"I allow finished MP4 files to be saved privately and sent to my verified Telegram chat. Original photos and personal requests are not uploaded separately.",
  cloudOff:"Automatic delivery is not enabled on the server yet. Device sharing is still available.",
  unsupported:"Automatic delivery requires a playable MP4 under 12 MB. You can still download and share this file manually.",
  wait:"Preparing private delivery…",
  accepted:"Telegram accepted the video for sending. This does not confirm delivery or viewing.",
  duplicate:"A delivery attempt already exists for this video. No duplicate message was sent.",
  saved:"Automatic delivery preference updated.",
  error:"Could not verify delivery or save preferences. Your local video remains available; review your account before trying again.",
  cancelled:"Sharing cancelled.",
  privacy:"The video is uploaded only after you agree to delivery. You can disable automatic delivery here.",
  house:"Save in My House",community:"Holistic House community YouTube",
  houseSaved:"The final MP4 was saved only in your private cabinet. Nothing was sent to YouTube.",
 },
 es:{
  title:"¿Dónde enviar tu vídeo?",device:"Descargar archivo",telegram:"Telegram",
  whatsapp:"WhatsApp",close:"Cerrar",hint:"Telegram y WhatsApp usan el menú Compartir del teléfono. Elige allí la aplicación.",
  noShare:"Este navegador no puede compartir archivos. Descarga el vídeo y envíalo desde Telegram o WhatsApp manualmente.",
  guest:"Inicia sesión en Holistic House y conecta el bot de Telegram para activar el envío automático.",
  login:"Entrar y conectar Telegram",connect:"Conectar bot de Telegram",
  bot:"Continuar en Telegram",connected:"Telegram conectado",
  refresh:"Comprobar conexión",direct:"Enviar MP4 con el bot",
  automatic:"Enviar automáticamente los próximos vídeos a mi Telegram",
  consent:"Autorizo guardar los MP4 terminados de forma privada y enviarlos a mi chat de Telegram verificado. Las fotos y solicitudes originales no se suben por separado.",
  cloudOff:"El envío automático aún no está habilitado en el servidor. Puedes compartir desde tu teléfono.",
  unsupported:"El envío automático requiere un MP4 válido de hasta 12 MB. Puedes descargar y compartir el archivo manualmente.",
  wait:"Preparando entrega privada…",
  accepted:"Telegram aceptó el vídeo para envío, pero no ha confirmado su entrega o visualización.",
  duplicate:"Este vídeo ya tiene un intento de envío. No enviamos duplicados.",
  saved:"Preferencia de envío automático actualizada.",
  error:"No se pudo verificar el envío o guardar la preferencia. El vídeo local sigue disponible; revisa tu cuenta antes de reintentarlo.",
  cancelled:"Compartir cancelado.",
  privacy:"El vídeo solo se sube cuando autorizas el envío. Puedes desactivar el envío automático aquí.",
  house:"Guardar en Mi Casa",community:"YouTube comunitario de Holistic House",
  houseSaved:"El MP4 terminado está solo en tu biblioteca privada. No se envió a YouTube.",
 }
} as const;
const MAX_BYTES=12_000_000;
const VALID_DURATIONS=[10,15,20,30,60];
function errorCode(error:unknown){
 return typeof error==="object"&&error!==null&&"code" in error?String(error.code):"";
}

export function MandalaVideoDelivery({locale,open,onClose,blob,url,extension,mime,bytes,theme,aspect,duration}:Props){
 const t=COPY[locale]||COPY.en;
 const [state,setState]=useState<State|null>(null);
 const [session,setSession]=useState<"checking"|"signed_in"|"guest"|"unavailable">("checking");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 const [botUrl,setBotUrl]=useState("");
 const [communityAssetId,setCommunityAssetId]=useState<string|null>(null);
 const [showCommunity,setShowCommunity]=useState(false);
 const inFlight=useRef<Promise<string>|null>(null);
 const autoAttempted=useRef(false);
 // A new video may auto-send only if opt-in was already active when this result loaded.
 // Turning on delivery beside an existing video must not upload that file silently.
 const automaticAtResultLoad=useRef(false);
 const readyMp4=extension==="mp4"&&mime==="video/mp4"&&bytes>=1024&&
  bytes<=MAX_BYTES&&VALID_DURATIONS.includes(duration);
 const fileName="holistic-house-personal."+extension;

 const refresh=useCallback(async()=>{
  try{
   const next=await appFetch("personal-videos/delivery") as State;
   setState(next);setSession("signed_in");
   return next;
  }catch(error){
   setSession(errorCode(error)==="SIGN_IN_REQUIRED"?"guest":"unavailable");
   return null;
  }
 },[]);
 useEffect(()=>{
  let active=true;
  // Read-only opt-in state. No media upload before an explicit choice.
  void (async()=>{
   const next=await appFetch("personal-videos/delivery").catch(error=>{
    if(active)setSession(errorCode(error)==="SIGN_IN_REQUIRED"?"guest":"unavailable");
    return null;
   }) as State|null;
   if(active&&next){
    automaticAtResultLoad.current=next.telegram.automatic===true;
    setState(next);setSession("signed_in");
   }
  })();
  return()=>{active=false};
 },[]);
 async function shareFromDevice(){
  try{
   // File construction and navigator.canShare may themselves throw in older
   // iPhone WebKit. Preserve the working direct-download fallback.
   const file=new File([blob],fileName,{type:mime});
   if(typeof navigator.share!=="function"||
     (typeof navigator.canShare==="function"&&!navigator.canShare({files:[file]}))){
    setNotice(t.noShare);return;
   }
   await navigator.share({files:[file],title:"Holistic House video"});
   setNotice("");
  }catch(error){
   setNotice(error instanceof DOMException&&error.name==="AbortError"?t.cancelled:t.noShare);
  }
 }
 function privateUpload(){
  if(inFlight.current)return inFlight.current;
  const task=(async()=>{
   if(!readyMp4)throw new Error("VIDEO_FORMAT_UNSUPPORTED");
   const header=new Uint8Array(await blob.slice(0,12).arrayBuffer());
   if(String.fromCharCode(...header.slice(4,8))!=="ftyp")throw new Error("VIDEO_FORMAT_UNSUPPORTED");
   const chosenTheme=["money","relationships","energy","goals","health","life"].includes(theme)?theme:"energy";
   const created=await appFetch("personal-videos",{
    theme:chosenTheme,sceneId:"personal-film",aspect,duration,bytes:blob.size,consent:true
   },"POST");
   const {createClient}=await import("@supabase/supabase-js");
   const supabase=createClient(created.supabaseUrl,created.publishableKey,{
    auth:{persistSession:false,autoRefreshToken:false}
   });
   const {error}=await supabase.storage.from(created.bucket).uploadToSignedUrl(
    created.objectKey,created.token,blob,{contentType:"video/mp4",upsert:false});
   if(error)throw new Error("VIDEO_UPLOAD_FAILED");
   await appFetch("personal-videos/"+created.id,undefined,"POST");
   return created.id as string;
  })();
  inFlight.current=task;
  void task.catch(()=>{if(inFlight.current===task)inFlight.current=null;});
  return task;
 }
  async function saveToMyHouse(showEditor:boolean){
   if(busy||!readyMp4)return;
   setBusy(true);setNotice("");
   try{
    // Only an explicit tap may trigger private upload. This is NOT consent for YouTube.
    const id=await privateUpload();
    setCommunityAssetId(id);setShowCommunity(showEditor);
    setNotice(t.houseSaved);
   }catch{setNotice(t.error)}finally{setBusy(false)}
  }
  async function sendViaBot(automatic:boolean){
  if(busy||!readyMp4)return;
  if(!automatic){
   // A manual send supersedes this result's pending automatic delivery.
   automaticAtResultLoad.current=false;
   autoAttempted.current=true;
  }
  setBusy(true);setNotice(t.wait);
  try{
   const id=await privateUpload();
   const result=await appFetch("personal-videos/"+id+"/delivery",{
    channel:"telegram",automatic,consent:!automatic,locale
   },"POST");
   setNotice(result.status==="accepted"?t.accepted:
    result.duplicate||result.status==="claimed"?t.duplicate:t.error);
  }catch{
   setNotice(t.error);
  }finally{setBusy(false);}
 }
 useEffect(()=>{
  // Every newly rendered, verified video mounts a fresh instance (result URL
  // key in Studio). The user must previously opt in to this exact verified chat.
  if(busy||!automaticAtResultLoad.current||!state?.telegram.automatic||!state.telegram.sendingAvailable||
   !readyMp4||autoAttempted.current)return;
  autoAttempted.current=true;
  void sendViaBot(true);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[state?.telegram.automatic,state?.telegram.sendingAvailable,readyMp4,busy]);

 async function connect(){
  if(busy)return;
  setBusy(true);setNotice("");
  try{
   const data=await appFetch("personal-videos/delivery",{
    action:"connect",locale,consent:true
   },"POST");
   const link=String(data.linkUrl||"");
   if(!/^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=[A-Za-z0-9_-]{32}$/.test(link))
    throw new Error("INVALID_BOT_LINK");
   setBotUrl(link);
  }catch{setNotice(t.error);}
  finally{setBusy(false);}
 }
 async function changeAutomatic(enabled:boolean){
  if(busy)return;
  // A permission change applies to later renders, not the already completed MP4.
  // Explicit 'Send via bot' remains available for this existing file.
  automaticAtResultLoad.current=false;
  setBusy(true);setNotice("");
  try{
   const next=await appFetch("personal-videos/delivery",{
    action:"automatic",enabled,consent:true
   },"POST") as State;
   setState(next);
   setNotice(t.saved);
  }catch{setNotice(t.error);}
  finally{setBusy(false);}
 }
 if(!open)return notice?<p className={css.notice} role="status" aria-live="polite" data-video-delivery-status>{notice}</p>:null;
 const accountLocale=locale==="es"?"en":locale;
 return <section className={css.root} aria-label={t.title} data-video-messenger-delivery>
  <div className={css.heading}><h4>{t.title}</h4>
   <button type="button" onClick={onClose} className={css.close}>{t.close}</button>
  </div>
  <div className={css.choices}>
   <a className={css.device} href={url} download={fileName} data-video-save-direct-choice>
    <Download size={18} aria-hidden="true"/>{t.device}
   </a>
   <button type="button" onClick={()=>void shareFromDevice()} data-video-telegram-share>
    <Send size={18} aria-hidden="true"/>{t.telegram}
   </button>
   <button type="button" onClick={()=>void shareFromDevice()} data-video-whatsapp-share>
    <MessageCircle size={18} aria-hidden="true"/>{t.whatsapp}
   </button>
  </div>
  <p className={css.help}>{t.hint}</p>
  {session==="signed_in"&&state?.cloudAvailable&&readyMp4?<div className={css.choices}>
   <button type="button" disabled={busy} data-video-save-my-house
    onClick={()=>void saveToMyHouse(false)}>{t.house}</button>
   <button type="button" disabled={busy} data-video-community-youtube
    onClick={()=>void saveToMyHouse(true)}>{t.community}</button>
  </div>:null}
  {communityAssetId&&showCommunity?<CommunityVideoPublishPanel
   videoId={communityAssetId} locale={locale}/>:null}
  {session==="guest"?<p className={css.hint}>{t.guest}{" "}
   <Link href={"/"+accountLocale+"/app/settings#hh-telegram-connect"} prefetch={false}>{t.login}</Link></p>:null}
  {session==="signed_in"&&state?.telegram.linkAvailable?
   <div className={css.bot}>
    {state.telegram.linked?<div className={css.linked}>
     <CheckCircle2 size={17} aria-hidden="true"/><strong>{t.connected}</strong>
    </div>:<button type="button" onClick={()=>void connect()} disabled={busy}>
      {t.connect}
    </button>}
    {botUrl?<a href={botUrl} target="_blank" rel="noopener noreferrer">{t.bot}</a>:null}
    <button type="button" onClick={()=>void refresh()} className={css.secondary} disabled={busy}>
     <RefreshCw size={16} aria-hidden="true"/>{t.refresh}
    </button>
    {state.telegram.linked&&state.telegram.sendingAvailable&&readyMp4?
     <button type="button" onClick={()=>void sendViaBot(false)} disabled={busy} data-video-telegram-bot-send>
      <Send size={17} aria-hidden="true"/>{t.direct}
     </button>:null}
    {state.telegram.linked?
     <label className={css.consent}>
      <input type="checkbox" checked={state.telegram.automatic}
       disabled={busy||(!state.telegram.sendingAvailable&&!state.telegram.automatic)}
       onChange={e=>void changeAutomatic(e.target.checked)}/>
      <span><strong>{t.automatic}</strong><small>{t.consent}</small></span>
     </label>:null}
    {!readyMp4?<p className={css.hint}>{t.unsupported}</p>:null}
    {!state.telegram.sendingAvailable?<p className={css.hint}>{t.cloudOff}</p>:null}
   </div>:null}
  {session==="signed_in"&&!state?.telegram.linkAvailable?<p className={css.hint}>{t.cloudOff}</p>:null}
  {notice?<p className={css.notice} role="status" aria-live="polite">{notice}</p>:null}
  <small className={css.privacy}>{t.privacy}</small>
 </section>;
}
