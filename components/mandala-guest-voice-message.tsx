"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import styles from "./mandala-guest-voice-message.module.css";

const MAX_RECORD_MS=30_000,MAX_BYTES=8*1024*1024;
type Locale="ru"|"en"|"es";
const words={
 ru:{title:"Настоящий голос близкого",intro:"Пригласите близкого записать короткие слова поддержки. Голос и текст остаются на устройстве — без облачного синтеза и платных запросов.",invite:"1. Отправить приглашение",hint:"Фраза, которую человек может произнести (до 200 символов)",example:"Я рядом. Ты можешь рассчитывать на меня.",copy:"Скопировать ссылку",copied:"Ссылка скопирована. Передайте её через Telegram или WhatsApp.",copyFail:"Скопируйте приглашение из поля ниже.",record:"2. Записать свой голос",consent:"Мне исполнилось 18 лет. Я добровольно записываю и передаю собственный голос.",start:"Начать запись",stop:"Завершить",download:"Сохранить аудиофайл",share:"Отправить через приложение",back:"Открыть видео и звук",invalid:"Введите короткую фразу без ссылок, телефонов или персональных данных.",mic:"Запись недоступна. Откройте эту страницу в Safari или Chrome и проверьте микрофон.",tooLarge:"Запись превышает лимит 30 секунд или 8 МБ.",ready:"Готово: это настоящая запись, не синтезированный голос.",help:"Получатель может прикрепить сохранённый файл через раздел «Звук» в видеоредакторе.",privacy:"Никакой файл не загружается на сервер. При закрытии страницы несохранённая запись исчезнет. Не записывайте чужой голос."},
 en:{title:"A loved one's real voice",intro:"Invite someone to record genuine words of support. Voice and text stay on the device — no cloud synthesis or paid API.",invite:"1. Share an invitation",hint:"Words the speaker may choose to say (up to 200 characters)",example:"I am here. You can count on me.",copy:"Copy invitation",copied:"Link copied. Share through Telegram or WhatsApp.",copyFail:"Copy the invitation from the field below.",record:"2. Record your own voice",consent:"I am at least 18 and freely consent to record and share my own voice.",start:"Start recording",stop:"Finish",download:"Save audio file",share:"Share through an app",back:"Open video and sound",invalid:"Use a short phrase without links, phone numbers or personal information.",mic:"Recording is unavailable. Open in Safari or Chrome and check microphone access.",tooLarge:"Recording exceeds the 30-second or 8 MB limit.",ready:"Done: this is a real recording, not a cloned voice.",help:"The recipient can attach the saved file under Sound in the video editor.",privacy:"No file is uploaded to a server. Unsaved audio disappears when this page closes. Do not record someone else's voice."},
 es:{title:"La voz real de un ser querido",intro:"Invita a alguien cercano a grabar palabras auténticas de apoyo. El audio queda en el dispositivo, sin IA ni pagos.",invite:"1. Enviar invitación",hint:"Frase que se puede decir (máximo 200 caracteres)",example:"Estoy aquí. Puedes contar conmigo.",copy:"Copiar enlace",copied:"Enlace copiado. Compártelo por Telegram o WhatsApp.",copyFail:"Copia el enlace del campo inferior.",record:"2. Grabar tu propia voz",consent:"Tengo al menos 18 años y acepto voluntariamente grabar y compartir mi propia voz.",start:"Empezar a grabar",stop:"Terminar",download:"Guardar audio",share:"Compartir desde una app",back:"Abrir vídeo y sonido",invalid:"Introduce una frase breve sin enlaces, teléfonos ni datos personales.",mic:"No se puede grabar. Abre en Safari o Chrome y revisa el micrófono.",tooLarge:"La grabación supera 30 segundos u 8 MB.",ready:"Listo: es una grabación real, no una voz clonada.",help:"El destinatario puede añadir el archivo desde Sonido en el editor de vídeo.",privacy:"No se sube ningún archivo al servidor. El audio no guardado desaparece al cerrar. No grabes la voz de otra persona."}
} as const;
function validPhrase(value:string){
 const t=value.trim().replace(/\s+/gu," ");
 return t.length>0&&[...t].length<=200&&!/[<>\u0000-\u001f]/u.test(t)&&!/https?:\/\/|www\.|(?:\+?\d[\d ()-]{8,}\d)/iu.test(t)?t:"";
}
function recordingMime(){
 if(typeof MediaRecorder==="undefined")return "";
 for(const m of ["audio/mp4","audio/webm;codecs=opus","audio/webm"]){
  if(MediaRecorder.isTypeSupported(m))return m;
 }
 return "";
}
export function MandalaGuestVoiceMessage({locale}:{locale:Locale}){
 const ui=words[locale]||words.en;
 const [phrase,setPhrase]=useState("");
 const [origin,setOrigin]=useState("");
 const [approved,setApproved]=useState(false);
 // Real iPhone taps can emit touchend without a synthesized click in headed WebKit.
 // Track an intentional short touch; keep keyboard/mouse click and prevent double toggles.
 const consentTouchOrigin=useRef<{x:number;y:number}|null>(null);
 const lastConsentTouchAt=useRef(0);
 const [busy,setBusy]=useState(false);
 const [audioUrl,setAudioUrl]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [message,setMessage]=useState("");
 const media=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const live=useRef(false),refUrl=useRef(""),discard=useRef(false),pending=useRef(false);
 function cleanup(){
  if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}
  stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;
 }
 useEffect(()=>{
  live.current=true;setOrigin(window.location.origin);
  try{if(window.location.hash.startsWith("#t=")){
    const decoded=decodeURIComponent(window.location.hash.slice(3));
    if(validPhrase(decoded))setPhrase(decoded);
  }}catch{/* Invalid fragment: no personal text surfaced */}
  return ()=>{
   live.current=false;discard.current=true;
   if(media.current&&media.current.state!=="inactive")media.current.stop();
   if(timer.current!==null)clearTimeout(timer.current);
   stream.current?.getTracks().forEach(track=>track.stop());
   if(refUrl.current)URL.revokeObjectURL(refUrl.current);
  };
 },[]);
 const good=validPhrase(phrase);
 const invitation=origin&&good?origin+"/"+locale+"/holistic-support/voice-message#t="+encodeURIComponent(good):"";
 async function copy(){
  if(!invitation){setMessage(ui.invalid);return;}
  try{await navigator.clipboard.writeText(invitation);setMessage(ui.copied);}
  catch{setMessage(ui.copyFail);}
 }
 async function start(){
  if(!approved||busy||pending.current||typeof navigator.mediaDevices?.getUserMedia!=="function"){setMessage(ui.mic);return;}
  const mime=recordingMime();if(!mime){setMessage(ui.mic);return;}
  pending.current=true;setMessage("");
  if(refUrl.current){URL.revokeObjectURL(refUrl.current);refUrl.current="";}
  setAudioUrl("");setFile(null);discard.current=false;
  let local:MediaStream;
  try{local=await navigator.mediaDevices.getUserMedia({audio:true,video:false});}
  catch{pending.current=false;setMessage(ui.mic);return;}
  pending.current=false;
  if(!live.current){local.getTracks().forEach(t=>t.stop());return;}
  stream.current=local;
  try{
   const recorder=new MediaRecorder(local,{mimeType:mime,audioBitsPerSecond:96_000});
   media.current=recorder;
   let total=0;
   const chunks:Blob[]=[];
   recorder.ondataavailable=e=>{
    if(!e.data?.size)return;total+=e.data.size;
    if(total>MAX_BYTES){discard.current=true;if(recorder.state!=="inactive")recorder.stop();}
    else chunks.push(e.data);
   };
   recorder.onerror=()=>{discard.current=true;setMessage(ui.mic);};
   recorder.onstop=()=>{
    cleanup();media.current=null;
    if(!live.current)return;
    setBusy(false);
    if(discard.current||!total||total>MAX_BYTES){setMessage(ui.tooLarge);return;}
    const actual=recorder.mimeType.startsWith("audio/mp4")?"audio/mp4":"audio/webm";
    const localFile=new File(chunks,actual==="audio/mp4"?"voice-message.m4a":"voice-message.webm",{type:actual});
    const url=URL.createObjectURL(localFile);refUrl.current=url;
    setFile(localFile);setAudioUrl(url);setMessage(ui.ready);
   };
   recorder.start(250);setBusy(true);
   timer.current=setTimeout(()=>{if(recorder.state!=="inactive")recorder.stop();},MAX_RECORD_MS);
  }catch{cleanup();setBusy(false);setMessage(ui.mic);}
 }
 function stop(){if(media.current&&media.current.state!=="inactive")media.current.stop();}
 async function share(){
  if(!file)return;
  if(typeof navigator.share!=="function"||
    (typeof navigator.canShare==="function"&&!navigator.canShare({files:[file]}))){
    setMessage(ui.copyFail);return;
  }
  try{await navigator.share({files:[file],title:ui.title});}
  catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))setMessage(ui.copyFail);}
 }
 return <div className={styles.page} data-guest-voice-message data-guest-voice-hydrated={origin?"true":"false"}>
  <div className={styles.layout}>
   <header className={styles.hero}><h1>{ui.title}</h1><p>{ui.intro}</p></header>
   <section className={styles.card}>
    <h2>{ui.invite}</h2>
    <label className={styles.field}>{ui.hint}
     <textarea rows={2} value={phrase} maxLength={200} disabled={!origin} placeholder={ui.example}
      onChange={e=>setPhrase(e.currentTarget.value)} data-guest-message-phrase/>
    </label>
    <div className={styles.actions}><button className={styles.button} type="button"
     disabled={!invitation} onClick={()=>void copy()} data-guest-message-copy>{ui.copy}</button></div>
    {invitation?<input className={styles.linkInput} type="text" readOnly value={invitation}
      aria-label={ui.copy} onFocus={e=>e.currentTarget.select()} data-guest-message-link/>:null}
   </section>
   <section className={styles.card}>
    <h2>{ui.record}</h2>
    <button className={styles.check} type="button" role="checkbox" aria-checked={approved}
     onTouchStart={event=>{
      const finger=event.touches[0];
      consentTouchOrigin.current=event.touches.length===1&&finger
       ?{x:finger.clientX,y:finger.clientY}:null;
     }}
     onTouchMove={event=>{
      const start=consentTouchOrigin.current,finger=event.touches[0];
      if(start&&finger&&Math.hypot(finger.clientX-start.x,finger.clientY-start.y)>12)
       consentTouchOrigin.current=null;
     }}
     onTouchCancel={()=>{consentTouchOrigin.current=null;}}
     onTouchEnd={event=>{
      const start=consentTouchOrigin.current,finger=event.changedTouches[0];
      consentTouchOrigin.current=null;
      if(!start||event.changedTouches.length!==1||!finger||
       Math.hypot(finger.clientX-start.x,finger.clientY-start.y)>12)return;
      lastConsentTouchAt.current=Date.now();
      setApproved(current=>!current);
     }}
     onClick={()=>{
      if(Date.now()-lastConsentTouchAt.current>=700)
       setApproved(current=>!current);
     }} data-guest-message-consent>
     <span className={styles.checkIcon} aria-hidden="true">{approved?"✓":""}</span>
     <span>{ui.consent}</span></button>
    <div className={styles.actions}>
     {busy?<button className={styles.button} type="button" onClick={stop} data-guest-message-stop>{ui.stop}</button>:
      <button className={styles.button} type="button" disabled={!approved}
       onClick={()=>void start()} data-guest-message-start>{ui.start}</button>}
    </div>
    {audioUrl&&file?<div>
     <audio className={styles.audio} controls preload="metadata" src={audioUrl} data-guest-message-play/>
     <div className={styles.actions}>
      <a className={styles.button} href={audioUrl} download={file.name} data-guest-message-save>{ui.download}</a>
      <button className={styles.secondary} type="button" onClick={()=>void share()}
       data-guest-message-share>{ui.share}</button>
     </div>
    </div>:null}
    {message?<div className={styles.notice} role="status" aria-live="polite">{message}</div>:null}
    <p className={styles.warning}>{ui.privacy}</p>
    <p>{ui.help}</p>
    <div className={styles.actions}>
     <Link className={styles.secondary} href={"/"+locale+"/holistic-support/mandala#video-audio"}>{ui.back}</Link>
    </div>
   </section>
  </div>
 </div>;
}