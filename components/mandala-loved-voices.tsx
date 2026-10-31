"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import type {PublicLocale} from "@/lib/public-locales";
import {LOVED_VOICE_CONSENT_PHRASES} from "@/lib/mandala/loved-voices.mjs";

const words={
  ru:{
    title:"Голоса близких",description:"Озвучьте короткие слова поддержки собственным или добровольно предоставленным голосом. Регистрация в других сервисах не нужна.",
    source:"1. Голосовой образец",sourceHint:"Чистая речь владельца голоса, 10–30 секунд. Выберите файл из WhatsApp, Telegram или телефона.",
    consent:"2. Голосовое согласие владельца",consentHint:"Тот же совершеннолетний человек должен отдельно записать точную фразу:",
    text:"3. Текст для озвучки",textHint:"До 240 символов, не больше трёх коротких фраз. Покажите итоговый текст владельцу голоса до генерации.",
    sample:"Я рядом. Ты заслуживаешь заботы. Ты можешь идти своим путём.",
    checkbox:"Подтверждаю: владелец голоса старше 18 лет, самостоятельно записал согласие и одобрил именно эти фразы.",
    privacy:"Сервис использует Google Gemini. При бесплатном тарифе Google может применять переданные аудиозаписи и текст для улучшения продуктов. Исходники и временный голосовой ключ не сохраняются в Holistic House.",
    choose:"Выбрать аудио",generate:"Создать фразы голосом",creating:"Подготавливаем и синтезируем…",play:"Слушать синтетическую запись",download:"Скачать WAV",
    unavailable:"Функция пока выключена: требуется проверка условий бесплатного Voice Replication и разрешение на обработку голоса. Файлы никуда не отправляются.",
    loading:"Проверяем доступность синтеза…",invalid:"Проверьте обе записи и текст. Если Telegram OGG/Opus не декодируется на iPhone, попросите M4A или MP3.",
    provider:"Генерация не удалась или бесплатная квота исчерпана. Голос не был заменён другим.",ready:"Готово: это синтетическая запись, а не настоящие слова близкого человека.",
    use:"Вставить в видео",useHint:"Скачайте WAV и прикрепите его через существующий раздел «Звук» видеоредактора. Автоматическая передача будет добавлена после выхода голосового микшера.",
    share:"Пригласить близкого",shared:"Ссылка скопирована",send:"Отправить готовое WAV",how:"Близкий может открыть эту же страницу без регистрации, записать согласие и создать фразу либо передать вам оба разрешённых аудиофайла.",
    warning:"Синтезированные фразы не являются реальным высказыванием близкого. Не используйте их для обмана или публичной имитации человека.",
  },
  en:{
    title:"Loved Ones Voices",description:"Create short supportive phrases in your voice or a voice voluntarily provided by its owner. No external registration.",
    source:"1. Voice sample",sourceHint:"10–30 seconds of clean speech. Choose a file from WhatsApp, Telegram, or your phone.",
    consent:"2. Owner's recorded consent",consentHint:"The same adult speaker must separately read this exact statement:",
    text:"3. Phrases to speak",textHint:"Up to 240 characters, three short phrases. Show the exact text to the speaker before generating.",
    sample:"I am here. You deserve care. You can follow your path.",
    checkbox:"I confirm the voice owner is 18+, recorded the consent themselves, and approved these exact phrases.",
    privacy:"Google Gemini processes the files. On its free tier, Google may use submitted audio and text to improve products. Holistic House does not persist the samples or temporary voice key.",
    choose:"Choose audio",generate:"Generate spoken phrases",creating:"Preparing and synthesizing…",play:"Play synthetic audio",download:"Download WAV",
    unavailable:"This pilot is disabled pending free-tier Voice Replication and data-processing verification. No files are sent.",
    loading:"Checking availability…",invalid:"Check both recordings and the text. If Safari cannot decode Telegram OGG/Opus, use M4A or MP3.",
    provider:"Generation failed or free quota exhausted. No substitute voice was used.",ready:"Ready: synthetic speech, not words the person actually said.",
    use:"Use in video",useHint:"Download WAV, then attach it in the existing Video Studio sound section. Automatic attachment follows the pending mixer release.",
    share:"Invite the speaker",shared:"Link copied",send:"Share the finished WAV",how:"The speaker can use this same page without an account to record consent and generate the phrase, or share both approved audio files with you.",
    warning:"Synthetic phrases are not genuine statements from the person. Never use this to deceive or impersonate others.",
  },
  es:{
    title:"Voces de seres queridos",description:"Crea frases de apoyo con tu propia voz o una voz entregada voluntariamente. Sin registro externo.",
    source:"1. Muestra de voz",sourceHint:"10–30 segundos de voz clara. Selecciona un audio de WhatsApp, Telegram o el teléfono.",
    consent:"2. Consentimiento grabado",consentHint:"La misma persona adulta debe leer exactamente esta declaración:",
    text:"3. Frases",textHint:"Hasta 240 caracteres y tres frases cortas. Muestra el texto a la persona antes de generar.",
    sample:"Estoy aquí. Mereces cariño. Puedes seguir tu camino.",
    checkbox:"Confirmo que la persona tiene más de 18 años, grabó su consentimiento y aprobó estas frases exactas.",
    privacy:"Google Gemini procesa el audio. En el plan gratuito, Google puede usarlo para mejorar sus productos. Holistic House no guarda muestras ni la clave de voz temporal.",
    choose:"Elegir audio",generate:"Generar frases",creating:"Preparando y generando…",play:"Escuchar voz sintética",download:"Descargar WAV",
    unavailable:"Función desactivada hasta verificar el plan gratuito y el procesamiento de datos. No se envían archivos.",
    loading:"Comprobando disponibilidad…",invalid:"Comprueba los dos audios y el texto. Si Safari no acepta OGG/Opus, usa M4A o MP3.",
    provider:"No se pudo generar o se agotó la cuota gratuita. No se utilizó otra voz.",ready:"Listo: es audio sintético, no palabras realmente dichas por esa persona.",
    use:"Usar en vídeo",useHint:"Descarga el WAV y adjúntalo en la sección de sonido del editor. La integración automática llegará después del mezclador.",
    share:"Invitar a la persona",shared:"Enlace copiado",send:"Compartir WAV",how:"La persona puede abrir esta página sin cuenta, grabar su consentimiento y crear el audio, o compartir contigo ambas grabaciones aprobadas.",
    warning:"No es una declaración auténtica de la persona. No lo uses para engañar ni suplantar.",
  },
} as const;

/* Decode on device and send only short 24-kHz mono PCM WAV. No local storage. */
async function toPcmWav(file:File,minSeconds:number,maxSeconds:number):Promise<File> {
  if(file.size<=0 || file.size>15*1024*1024)throw Error("INVALID_AUDIO_SIZE");
  const context=new AudioContext();
  let decoded:AudioBuffer;
  try{decoded=await context.decodeAudioData(await file.arrayBuffer());}
  finally{await context.close().catch(()=>{});}
  if(decoded.duration<minSeconds || decoded.duration>maxSeconds || !decoded.numberOfChannels)
    throw Error("INVALID_AUDIO_DURATION");
  const frames=Math.floor(decoded.duration*24000),buf=new ArrayBuffer(44+frames*2);
  const view=new DataView(buf);
  const str=(pos:number,v:string)=>{for(let i=0;i<v.length;i++)view.setUint8(pos+i,v.charCodeAt(i));};
  str(0,"RIFF");view.setUint32(4,36+frames*2,true);str(8,"WAVE");str(12,"fmt ");
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,24000,true);view.setUint32(28,48000,true);
  view.setUint16(32,2,true);view.setUint16(34,16,true);
  str(36,"data");view.setUint32(40,frames*2,true);
  const channels=Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i));
  for(let i=0;i<frames;i++){
    const pos=i*decoded.sampleRate/24000,prev=Math.floor(pos),frac=pos-prev;
    let sample=0;
    for(const ch of channels)sample+=(ch[prev]||0)*(1-frac)+(ch[Math.min(ch.length-1,prev+1)]||0)*frac;
    const value=Math.max(-1,Math.min(1,sample/channels.length));
    view.setInt16(44+i*2,Math.round(value<0?value*32768:value*32767),true);
  }
  return new File([buf],"voice.wav",{type:"audio/wav"});
}

export function MandalaLovedVoices({locale}: {locale:PublicLocale}) {
  const ui=words[locale], [available,setAvailable]=useState(false);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [source,setSource]=useState<File|null>(null),[consent,setConsent]=useState<File|null>(null);
  const [text,setText]=useState<string>(ui.sample),[approved,setApproved]=useState(false);
  const [status,setStatus]=useState(""),[url,setUrl]=useState(""),[shared,setShared]=useState(false);
  const [audioBlob,setAudioBlob]=useState<Blob|null>(null);
  useEffect(()=>{
    let cancelled=false;
    fetch("/api/holistic-support/loved-voices",{cache:"no-store"})
      .then(r=>r.json()).then(data=>{if(!cancelled)setAvailable(data.enabled===true);})
      .catch(()=>{if(!cancelled)setAvailable(false);})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[]);
  useEffect(()=>{
    // Fragment-only handoff: text never becomes a server query parameter.
    const phrase=new URLSearchParams(window.location.hash.slice(1)).get("t");
    if(phrase && [...phrase].length<=240 && !/[<>]/.test(phrase))setText(phrase);
  },[]);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  async function generate(){
    if(busy||!available||!source||!consent||!approved||!text.trim())return;
    setBusy(true);setStatus("");setUrl("");setAudioBlob(null);
    try{
      const [a,b]=await Promise.all([toPcmWav(source,10,30),toPcmWav(consent,2,22)]);
      const form=new FormData();
      form.set("source",a);form.set("consent",b);form.set("text",text.trim());
      form.set("language",locale);form.set("adult","yes");form.set("permission","yes");
      const res=await fetch("/api/holistic-support/loved-voices",{
        method:"POST",body:form,cache:"no-store",credentials:"same-origin",
      });
      if(!res.ok){
        const response=await res.json().catch(()=>({}));
        throw Error(response?.error==="LOVED_VOICE_FREE_QUOTA_EXHAUSTED"?"quota":"provider");
      }
      const audio=await res.blob();
      if(audio.size<48 || !audio.type.includes("audio/"))throw Error("provider");
      setAudioBlob(audio);setUrl(URL.createObjectURL(audio));setStatus(ui.ready);
    }catch(error){
      setStatus(error instanceof Error && /INVALID_AUDIO|decode|EncodingError/.test(error.message)
        ?ui.invalid:ui.provider);
    }finally{setBusy(false);}
  }
  async function invite(){
    const link=window.location.origin+window.location.pathname+"#t="+encodeURIComponent(text.trim().slice(0,240));
    try {
      if(navigator.share)await navigator.share({title:ui.title,text:ui.how,url:link});
      else{await navigator.clipboard.writeText(link);setShared(true);}
    }catch{ /* User cancelled share. */ }
  }
  async function shareAudio(){
    if(!audioBlob)return;
    const file=new File([audioBlob],"holistic-house-synthetic-support.wav",{type:"audio/wav"});
    if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
      try{await navigator.share({files:[file],title:ui.title,text:ui.ready});}catch{/* User cancelled sharing. */}
    }else{
      const anchor=document.createElement("a");anchor.href=url;
      anchor.download=file.name;anchor.click();
    }
  }
  const clear=()=>{setUrl("");setAudioBlob(null);setStatus("");setApproved(false);};
  return (
    <section data-loved-voice-mvp className="mx-auto max-w-3xl rounded-3xl border border-emerald-900/15 bg-white/90 p-5 shadow-lg sm:p-8">
      <h1 className="text-2xl font-bold text-emerald-950">{ui.title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-700">{ui.description}</p>
      <button type="button" onClick={invite} className="mt-4 rounded-xl border border-emerald-700 px-4 py-3 text-sm font-semibold text-emerald-900">{shared?ui.shared:ui.share}</button>
      <p className="mt-2 text-xs leading-5 text-slate-600">{ui.how}</p>
      <div className="mt-6 space-y-5">
        <label className="block text-sm font-semibold text-slate-800">
          {ui.source}
          <span className="mt-1 block text-xs font-normal text-slate-600">{ui.sourceHint}</span>
          <input aria-label={ui.source} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.opus,.oga,.webm" className="mt-2 block w-full rounded-xl border p-3 text-sm" onChange={e=>{setSource(e.target.files?.[0]||null);clear();}}/>
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          {ui.consent}
          <span className="mt-1 block text-xs font-normal text-slate-600">{ui.consentHint}</span>
          <span className="mt-2 block rounded-xl bg-emerald-50 p-3 text-sm font-medium leading-6 text-emerald-950" data-loved-voice-consent-text>{LOVED_VOICE_CONSENT_PHRASES[locale]}</span>
          <input aria-label={ui.consent} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.opus,.oga,.webm" className="mt-2 block w-full rounded-xl border p-3 text-sm" onChange={e=>{setConsent(e.target.files?.[0]||null);clear();}}/>
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          {ui.text}
          <span className="mt-1 block text-xs font-normal text-slate-600">{ui.textHint}</span>
          <textarea rows={3} maxLength={240} value={text} onChange={e=>{setText(e.target.value);clear();}} className="mt-2 block w-full rounded-xl border p-3 text-sm leading-6" />
        </label>
      </div>
      <div className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-950">
        <p>{ui.privacy}</p><p className="mt-2">{ui.warning}</p>
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6">
        <input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)} className="mt-1 h-5 w-5"/>
        <span>{ui.checkbox}</span>
      </label>
      <button type="button" data-loved-voice-generate disabled={!available||loading||busy||!approved||!source||!consent||!text.trim()}
        onClick={generate} className="mt-5 w-full rounded-xl bg-emerald-800 px-5 py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
        {busy?ui.creating:ui.generate}
      </button>
      {loading?<p role="status" className="mt-3 text-sm">{ui.loading}</p>:
       !available?<p role="status" className="mt-3 text-sm text-amber-800">{ui.unavailable}</p>:null}
      {status?<p role="status" className="mt-3 text-sm text-slate-800">{status}</p>:null}
      {url?<div className="mt-5 space-y-3 rounded-xl bg-emerald-50 p-4">
        <label className="block text-sm font-semibold">{ui.play}</label>
        <audio controls src={url} className="w-full" preload="metadata"/>
        <a href={url} download="holistic-house-synthetic-support.wav" className="inline-block rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white">{ui.download}</a>
        <button type="button" onClick={shareAudio} className="ml-2 rounded-xl border border-emerald-700 px-4 py-3 text-sm font-semibold text-emerald-900">{ui.send}</button>
      </div>:null}
      <div className="mt-6 border-t pt-5">
        <Link href={"/"+locale+"/holistic-support/mandala#video-audio"} className="font-semibold text-emerald-900 underline">{ui.use}</Link>
        <p className="mt-2 text-xs leading-6 text-slate-600">{ui.useHint}</p>
      </div>
    </section>
  );
}
