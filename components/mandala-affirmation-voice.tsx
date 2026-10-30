"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Check, Download, LoaderCircle, Play, Volume2 } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { VOICE_STUDIO_VOICES } from "@/lib/mandala/voice-studio.mjs";
import { affirmationNarrationText, wavDurationFromHeader } from "@/lib/mandala/affirmation-voice.mjs";
import { mixVoiceWithNature } from "@/lib/mandala/voice-audio-mix";
import type { NatureBed } from "@/lib/mandala/voice-audio-mix";
import css from "./mandala-affirmation-voice.module.css";

type SpeechLanguage="ru"|"en"|"es";
type Bed="none"|NatureBed;
export type AffirmationVoiceResult={
  file:File;spokenText:string;voiceId:string;language:SpeechLanguage;
  speechSeconds:number;mixSeconds:number;bed:Bed;
};
const durationChoices=[10,20,30,60] as const;
const copy={
  ru:{
    title:"Озвучить аффирмации",lead:"Одна кнопка превратит выбранные выше фразы в настоящий голосовой аудиотрек для вашего видео.",
    voice:"Голос",language:"Язык",background:"Фон",none:"Без фона",ocean:"Море",rain:"Дождь",breeze:"Ветер",
    preview:"Текст для озвучки",enable:"Сначала включите аффирмации и выберите фразы выше.",
    consent:"Разрешаю отправить только показанный текст аффирмаций в Google Gemini для озвучки. Не включаю в него личные или медицинские данные. На бесплатном тарифе Google может использовать данные для улучшения своих сервисов.",
    generate:"Создать аудиодорожку",busy:"Генерируем голос…",mixing:"Смешиваем звук и природу…",ready:"Аудиодорожка создана и автоматически прикреплена к итоговому видео.",
    unavailable:"Бесплатный генератор ещё не активирован.",quota:"Лимит бесплатных запросов исчерпан. Платная генерация не запускается.",
    error:"Не удалось получить звук. Выберите другой голос или повторите позже.",tooLong:"Аудио длиннее 60 секунд: сократите количество аффирмаций.",
    download:"Скачать WAV",tip:"Вы сможете прослушать, скачать WAV или нажать «Создать видео» — голос уже добавлен. При изменении фраз понадобится новая озвучка.",
    limit:"До 3 бесплатных попыток в час с одного подключения; без регистрации.",review:"Проверьте текст перед отправкой.",
    finished:"Голос в видео",status:"Длительность речи",seconds:"сек."
  },
  en:{
    title:"Narrate affirmations",lead:"Turn the exact phrases chosen above into a real AI voice track for your video.",
    voice:"Voice",language:"Language",background:"Background",none:"Voice only",ocean:"Ocean",rain:"Rain",breeze:"Breeze",
    preview:"Text that will be spoken",enable:"First enable affirmations and select your phrases above.",
    consent:"I agree to send only the displayed affirmation text to Google Gemini for speech generation. It contains no identifying or medical data. Free-tier submissions may be used by Google to improve its products.",
    generate:"Generate voice track",busy:"Generating speech…",mixing:"Mixing voice and nature…",ready:"Audio created and automatically attached to the final video.",
    unavailable:"Free voice generation has not been enabled yet.",quota:"Free usage limit reached. Paid generation will not be started.",
    error:"Audio could not be generated. Try another voice or again later.",tooLong:"Speech is longer than 60 seconds; shorten the affirmations.",
    download:"Download WAV",tip:"Listen, download WAV, or select Create video — your voice is already attached. Changed phrases require new narration.",
    limit:"Up to 3 free requests per hour per connection; no sign-in.",review:"Review this text before sending.",
    finished:"Voice in video",status:"Speech duration",seconds:"sec"
  },
  es:{
    title:"Poner voz a las afirmaciones",lead:"Convierte las frases elegidas arriba en una pista de voz real para tu vídeo.",
    voice:"Voz",language:"Idioma",background:"Fondo",none:"Solo voz",ocean:"Mar",rain:"Lluvia",breeze:"Brisa",
    preview:"Texto que se leerá",enable:"Activa las afirmaciones y selecciona tus frases arriba.",
    consent:"Autorizo enviar solo estas frases a Google Gemini para generar voz. No incluyen datos médicos ni de identificación. Google puede usar datos del nivel gratuito para mejorar sus productos.",
    generate:"Generar pista de voz",busy:"Generando voz…",mixing:"Mezclando voz y naturaleza…",ready:"Pista creada y añadida automáticamente al vídeo.",
    unavailable:"La generación gratuita todavía no está activa.",quota:"Cuota gratuita agotada; no se usará un servicio de pago.",
    error:"No se pudo generar el sonido. Elige otra voz.",tooLong:"La voz dura más de 60 segundos; reduce las afirmaciones.",
    download:"Descargar WAV",tip:"Escucha, descarga el WAV o pulsa Crear vídeo. Si cambias las frases, genera la voz de nuevo.",
    limit:"Hasta 3 solicitudes gratuitas por hora y conexión, sin registro.",review:"Revisa el texto antes de enviarlo.",
    finished:"Voz en el vídeo",status:"Duración",seconds:"s"
  }
} as const;

export function MandalaAffirmationVoice({
  locale,lines,enabled,durationSeconds,disabled,onAttach,onGenerating,
}:{
  locale:PublicLocale;lines:string[];enabled:boolean;durationSeconds:number;disabled:boolean;
  onAttach:(result:AffirmationVoiceResult)=>void;
  onGenerating:(value:boolean)=>void;
}) {
  const t=copy[locale];
  const speechText=enabled?affirmationNarrationText(lines):"";
  const [language,setLanguage]=useState<SpeechLanguage>(locale);
  const [voiceId,setVoiceId]=useState("maya");
  const [bed,setBed]=useState<Bed>("none");
  const [consent,setConsent]=useState(false);
  const [available,setAvailable]=useState(false);
  const [busy,setBusy]=useState(false);
  const [mixing,setMixing]=useState(false);
  const [audioUrl,setAudioUrl]=useState("");
  const [message,setMessage]=useState("");
  const [speechSeconds,setSpeechSeconds]=useState(0);
  const jobRef=useRef(0);
  const controllerRef=useRef<AbortController|null>(null);
  const audioUrlRef=useRef("");
  const onGeneratingRef=useRef(onGenerating);
  onGeneratingRef.current=onGenerating;

  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/holistic-support/voice",{cache:"no-store",signal:controller.signal})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(data=>setAvailable(data.enabled===true&&data.publicAffirmationsEnabled===true))
      .catch(()=>{if(!controller.signal.aborted)setAvailable(false);});
    return ()=>controller.abort();
  },[]);

  useEffect(()=>{
    const previous=audioUrlRef.current;
    if(previous){URL.revokeObjectURL(previous);audioUrlRef.current="";}
    jobRef.current++;
    controllerRef.current?.abort();
    setBusy(false);setMixing(false);setAudioUrl("");setMessage("");setSpeechSeconds(0);
    onGeneratingRef.current(false);
  },[speechText,voiceId,language,bed]);

  useEffect(()=>()=> {
    jobRef.current++;
    controllerRef.current?.abort();
    if(audioUrlRef.current)URL.revokeObjectURL(audioUrlRef.current);
    onGeneratingRef.current(false);
  },[]);

  async function createAudio(){
    if(!available||disabled||busy||!speechText||!consent)return;
    const job=++jobRef.current;
    const controller=new AbortController();
    controllerRef.current=controller;
    setBusy(true);setMessage("");setAudioUrl("");setSpeechSeconds(0);
    onGeneratingRef.current(true);
    try {
      // No wishes, photos, client tests or profile fields in this request.
      const reply=await fetch("/api/holistic-support/voice",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({mode:"affirmations",voiceId,language,text:speechText,consent:true}),
        signal:controller.signal,cache:"no-store",
      });
      if(!reply.ok){
        if(reply.status===429)throw new Error("QUOTA");
        throw new Error("TTS");
      }
      const voice=await reply.blob();
      if(voice.size<44||voice.size>8*1024*1024)throw new Error("TTS");
      const header=await voice.slice(0,256).arrayBuffer();
      const seconds=wavDurationFromHeader(header);
      if(!seconds||seconds<.2)throw new Error("TTS");
      if(seconds>59)throw new Error("TOO_LONG");
      const mixSeconds=durationChoices.find(candidate=>candidate>=Math.ceil(seconds+0.4)&&candidate>=durationSeconds) || 60;
      if(job!==jobRef.current)return;
      let audio=voice;
      if(bed!=="none"){
        setMixing(true);
        audio=await mixVoiceWithNature(voice,bed,mixSeconds);
        if(audio.size>15*1024*1024)throw new Error("TOO_LONG");
      }
      if(job!==jobRef.current)return;
      const file=new File([audio],"holistic-house-affirmations-"+language+"-"+voiceId+".wav",{type:"audio/wav"});
      const uri=URL.createObjectURL(file);
      if(audioUrlRef.current)URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current=uri;setAudioUrl(uri);setSpeechSeconds(seconds);
      onAttach({file,spokenText:speechText,voiceId,language,speechSeconds:seconds,mixSeconds,bed});
      setMessage(t.ready);
    } catch(e) {
      if(job!==jobRef.current)return;
      const code=e instanceof Error?e.message:"";
      if(code!=="AbortError")setMessage(code==="QUOTA"?t.quota:code==="TOO_LONG"?t.tooLong:t.error);
    } finally {
      if(job===jobRef.current){setBusy(false);setMixing(false);controllerRef.current=null;onGeneratingRef.current(false);}
    }
  }
  return <section className={css.panel} id="video-affirmation-voice" data-video-affirmation-voice aria-labelledby="video-affirmation-voice-title">
    <div className={css.heading}>
      <AudioLines size={20} aria-hidden="true"/>
      <div><h4 id="video-affirmation-voice-title">{t.title}</h4><p>{t.lead}</p></div>
    </div>
    {speechText?<div className={css.transcript}>
      <small>{t.preview} · {t.review}</small>
      <p data-video-affirmation-spoken-text>{speechText}</p>
    </div>:<p className={css.hint} role="status">{t.enable}</p>}
    <div className={css.controls}>
      <label>{t.voice}
        <select data-video-affirmation-voice-select value={voiceId} disabled={busy||disabled}
          onChange={event=>{setVoiceId(event.currentTarget.value);setConsent(false);}}>
          {VOICE_STUDIO_VOICES.map(v=><option key={v.id} value={v.id}>{v.name[locale]} · {v.description[locale]}</option>)}
        </select>
      </label>
      <label>{t.language}
        <select data-video-affirmation-language value={language} disabled={busy||disabled}
          onChange={event=>{setLanguage(event.currentTarget.value as SpeechLanguage);setConsent(false);}}>
          <option value="ru">Русский</option><option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </label>
      <label>{t.background}
        <select data-video-affirmation-bed value={bed} disabled={busy||disabled}
          onChange={event=>setBed(event.currentTarget.value as Bed)}>
          {(["none","ocean","rain","breeze"] as const).map(p=><option key={p} value={p}>{t[p]}</option>)}
        </select>
      </label>
    </div>
    <label className={css.consent}>
      <input data-video-affirmation-voice-consent type="checkbox" checked={consent}
        disabled={busy||disabled||!speechText} onChange={e=>setConsent(e.currentTarget.checked)}/>
      <span>{t.consent}</span>
    </label>
    <button type="button" className={css.action} data-video-generate-affirmation-audio
      disabled={!available||!speechText||!consent||busy||disabled}
      onClick={()=>void createAudio()}>
      {busy?<LoaderCircle size={18} aria-hidden="true"/>:<Volume2 size={18} aria-hidden="true"/>}
      {busy?mixing?t.mixing:t.busy:t.generate}
    </button>
    {!available?<small className={css.warning} role="status">{t.unavailable}</small>:<small className={css.hint}>{t.limit}</small>}
    {audioUrl?<div className={css.result} data-video-affimations-audio-ready>
      <strong><Check size={16} aria-hidden="true"/>{t.finished} · {t.status}: {speechSeconds.toFixed(1)} {t.seconds}</strong>
      <audio controls preload="metadata" src={audioUrl} aria-label={t.finished}/>
      <a href={audioUrl} download={"holistic-house-affirmations-"+language+"-"+voiceId+".wav"}>
        <Download size={16} aria-hidden="true"/>{t.download}
      </a>
      <p>{t.tip}</p>
    </div>:null}
    {message?<p className={css.message} role="status" aria-live="polite">{message}</p>:null}
  </section>;
}
