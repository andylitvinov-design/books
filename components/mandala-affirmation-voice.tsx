"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Check, Download, LoaderCircle, Play, Volume2 } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { VOICE_STUDIO_VOICES } from "@/lib/mandala/voice-studio.mjs";
import { affirmationNarrationForSelection, wavDurationFromHeader } from "@/lib/mandala/affirmation-voice.mjs";
import { mixVoiceWithNature } from "@/lib/mandala/voice-audio-mix";
import { VOICE_BED_PRESETS } from "@/lib/mandala/voice-audio-mix";
import type { NatureBed } from "@/lib/mandala/voice-audio-mix";
import css from "./mandala-affirmation-voice.module.css";
import { MandalaLocalVoiceTracks } from "./mandala-local-voice-tracks";

type SpeechLanguage="ru"|"en"|"es";
type Bed="none"|NatureBed;
export type AffirmationVoicePreferences={voiceId:string;language:SpeechLanguage;bed:Bed};
export type AffirmationVoiceResult={
  file:File;spokenText:string;voiceId:string;language:SpeechLanguage;
  speechSeconds:number;mixSeconds:number;bed:Bed;source?:"local";
};
const durationChoices=[10,20,30,60] as const;
const copy={
  ru:{
    title:"Озвучить аффирмации",lead:"Одна кнопка превратит выбранные выше фразы в настоящий голосовой аудиотрек для вашего видео.",
    voice:"Голос",female:"Женский (3)",male:"Мужской (3)",own:"Мой голос",language:"Язык",background:"Фон",none:"Без фона",ocean:"Море",rain:"Дождь",breeze:"Ветер",
    phrase:"Фраза для озвучки",allPhrases:"Все утверждённые фразы",sample:"Прослушать",sampleBusy:"Загрузка…",sampleReady:"Образец готов. Если воспроизведение не началось, нажмите ▶ в плеере.",sampleError:"Не удалось прослушать образец. Повторите позже.",sampleQuota:"Лимит прослушиваний исчерпан — попробуйте позднее.",sampleTitle:"Образец голоса",
    preview:"Текст для озвучки",enable:"Сначала включите аффирмации и выберите фразы выше.",
    consent:"Разрешаю отправить только эти фразы в Gemini или через OpenRouter к Deepgram (бесплатно для английского) либо xAI (если разрешён платный резерв). Не включаю личных или медицинских данных. Правила обработки данных зависят от провайдера; Google может использовать бесплатные запросы для улучшения сервисов.",
    generate:"Бесплатно озвучить фразу",busy:"Генерируем голос…",mixing:"Смешиваем звук и природу…",ready:"Аудиодорожка создана и автоматически прикреплена к итоговому видео.",
    unavailable:"Бесплатный генератор ещё не активирован.",quota:"Лимит запросов исчерпан. Платёж с посетителя не взимается.",
    error:"Не удалось получить звук. Выберите другой голос или повторите позже.",tooLong:"Аудио длиннее 60 секунд: сократите количество аффирмаций.",
    download:"Скачать WAV",tip:"Вы сможете прослушать, скачать WAV или нажать «Создать видео» — голос уже добавлен. При изменении фраз понадобится новая озвучка.",
    limit:"До 3 бесплатных попыток в час с одного подключения; без регистрации.",review:"Проверьте текст перед отправкой.",
    finished:"Голос в видео",status:"Длительность речи",seconds:"сек.",backupUsed:" · OpenRouter/xAI",freeUsed:" · бесплатный OpenRouter/Deepgram"
  },
  en:{
    title:"Narrate affirmations",lead:"Turn the exact phrases chosen above into a real AI voice track for your video.",
    voice:"Voice",female:"Female (3)",male:"Male (3)",own:"My voice",language:"Language",background:"Background",none:"Voice only",ocean:"Ocean",rain:"Rain",breeze:"Breeze",
    phrase:"Phrase to narrate",allPhrases:"All approved phrases",sample:"Listen",sampleBusy:"Loading…",sampleReady:"Voice sample ready. Tap ▶ in the player if it did not start.",sampleError:"Could not load the sample. Try again later.",sampleQuota:"Sample quota reached. Please try later.",sampleTitle:"Voice sample",
    preview:"Text that will be spoken",enable:"First enable affirmations and select your phrases above.",
    consent:"I agree to send only the displayed phrases to Gemini or to Deepgram (free English backup) or xAI (operator-funded backup) via OpenRouter. No identifying or medical data are included. Provider data policies apply; free Google inputs may improve services.",
    generate:"Narrate phrase for free",busy:"Generating speech…",mixing:"Mixing voice and nature…",ready:"Audio created and automatically attached to the final video.",
    unavailable:"Free voice generation has not been enabled yet.",quota:"Audio request limit reached. No visitor charges.",
    error:"Audio could not be generated. Try another voice or again later.",tooLong:"Speech is longer than 60 seconds; shorten the affirmations.",
    download:"Download WAV",tip:"Listen, download WAV, or select Create video — your voice is already attached. Changed phrases require new narration.",
    limit:"Up to 3 free requests per hour per connection; no sign-in.",review:"Review this text before sending.",
    finished:"Voice in video",status:"Speech duration",seconds:"sec",backupUsed:" · OpenRouter/xAI",freeUsed:" · free OpenRouter/Deepgram"
  },
  es:{
    title:"Poner voz a las afirmaciones",lead:"Convierte las frases elegidas arriba en una pista de voz real para tu vídeo.",
    voice:"Voz",female:"Femenino (3)",male:"Masculino (3)",own:"Mi voz",language:"Idioma",background:"Fondo",none:"Solo voz",ocean:"Mar",rain:"Lluvia",breeze:"Brisa",
    phrase:"Frase que se leerá",allPhrases:"Todas las frases aprobadas",sample:"Escuchar",sampleBusy:"Cargando…",sampleReady:"Muestra lista. Pulsa ▶ en el reproductor si no empieza.",sampleError:"No se pudo reproducir la muestra. Inténtalo luego.",sampleQuota:"Límite de muestras alcanzado. Vuelve más tarde.",sampleTitle:"Muestra de voz",
    preview:"Texto que se leerá",enable:"Activa las afirmaciones y selecciona tus frases arriba.",
    consent:"Autorizo enviar solo estas frases a Gemini o a Deepgram (gratis en inglés) o xAI (respaldo de pago autorizado) mediante OpenRouter. No contienen datos médicos ni personales. Se aplican sus políticas; Google puede usar datos gratuitos para mejorar servicios.",
    generate:"Narrar frase gratis",busy:"Generando voz…",mixing:"Mezclando voz y naturaleza…",ready:"Pista creada y añadida automáticamente al vídeo.",
    unavailable:"La generación gratuita todavía no está activa.",quota:"Cuota agotada; no hay cobros al visitante.",
    error:"No se pudo generar el sonido. Elige otra voz.",tooLong:"La voz dura más de 60 segundos; reduce las afirmaciones.",
    download:"Descargar WAV",tip:"Escucha, descarga el WAV o pulsa Crear vídeo. Si cambias las frases, genera la voz de nuevo.",
    limit:"Hasta 3 solicitudes gratuitas por hora y conexión, sin registro.",review:"Revisa el texto antes de enviarlo.",
    finished:"Voz en el vídeo",status:"Duración",seconds:"s",backupUsed:" · OpenRouter/xAI",freeUsed:" · OpenRouter/Deepgram gratis"
  }
} as const;
const levelCopy={
  ru:{voice:"Голос",music:"Музыка",balanced:"Изменение громкости не расходует бесплатные запросы.",remixing:"Обновляем баланс без повторного вызова Gemini…"},
  en:{voice:"Voice",music:"Music",balanced:"Changing volume does not consume another free voice request.",remixing:"Updating the balance without calling Gemini again…"},
  es:{voice:"Voz",music:"Música",balanced:"Cambiar el volumen no consume otra solicitud gratuita.",remixing:"Ajustando el volumen sin llamar a Gemini…"}
} as const;
const backgroundNames:Record<string,{ru:string;en:string;es:string}>={
  meditation:{ru:"Медитация",en:"Meditation",es:"Meditación"},
  harmony:{ru:"Гармония",en:"Harmony",es:"Armonía"},
  prosperity:{ru:"Процветание",en:"Prosperity",es:"Prosperidad"},
  energy:{ru:"Энергия",en:"Energy",es:"Energía"},
  love:{ru:"Любовь",en:"Love",es:"Amor"},
  focus:{ru:"Концентрация",en:"Focus",es:"Concentración"},
  grounding:{ru:"Заземление",en:"Grounding",es:"Arraigo"},
  breath:{ru:"Дыхание",en:"Breathing",es:"Respiración"},
  sunrise:{ru:"Рассвет",en:"Sunrise",es:"Amanecer"},
  pulse:{ru:"Ритм",en:"Pulse",es:"Pulso"}
};

export function MandalaAffirmationVoice({
  locale,lines,enabled,durationSeconds,disabled,approvalPending=false,onAttach,onGenerating,onInvalidate,onPreferencesChange,onDetachLocal,
}:{
  locale:PublicLocale;lines:string[];enabled:boolean;durationSeconds:number;disabled:boolean;approvalPending?:boolean;
  onAttach:(result:AffirmationVoiceResult)=>void;
  onGenerating:(value:boolean)=>void;
  onInvalidate?:()=>void;
  onDetachLocal?:(file:File)=>void;
  onPreferencesChange:(prefs:AffirmationVoicePreferences)=>void;
}) {
  const t=copy[locale];
  const levels=levelCopy[locale];
  const [phraseChoice,setPhraseChoice]=useState<number|"all">(0);
  const selectedIndex=phraseChoice==="all"?null:Math.min(phraseChoice,Math.max(0,lines.length-1));
  // Default to one approved phrase. Never send an unapproved draft, topic or
  // private profile to an external provider; explicit consent is still required.
  const speechText=enabled?affirmationNarrationForSelection(lines,phraseChoice==="all"?"all":selectedIndex??0):"";
  const [language,setLanguage]=useState<SpeechLanguage>(locale);
  const [voiceId,setVoiceId]=useState("maya");
  const [voiceGender,setVoiceGender]=useState<"female"|"male"|"own">("female");
  const [bed,setBed]=useState<Bed>("none");
  const [voiceLevel,setVoiceLevel]=useState(90);
  const [musicLevel,setMusicLevel]=useState(12);
  const [consent,setConsent]=useState(false);
  const [available,setAvailable]=useState(false);
  const [availableLanguages,setAvailableLanguages]=useState<string[]>([]);
  const languageAvailable=available&&availableLanguages.includes(language);
  const [busy,setBusy]=useState(false);
  const [mixing,setMixing]=useState(false);
  const [audioUrl,setAudioUrl]=useState("");
  const [message,setMessage]=useState("");
  const [speechSeconds,setSpeechSeconds]=useState(0);
  // A sample speaks only the fixed server-owned public phrase. It is never the
  // visitor's unapproved affirmation text, and never attaches to a video.
  const [sampleUrl,setSampleUrl]=useState("");
  const [sampleVoiceId,setSampleVoiceId]=useState("");
  const [sampleBusyId,setSampleBusyId]=useState("");
  const [sampleMessage,setSampleMessage]=useState("");
  const sampleAudioRef=useRef<HTMLAudioElement|null>(null);
  const sampleControllerRef=useRef<AbortController|null>(null);
  const sampleJobRef=useRef(0);
  const sampleCacheRef=useRef<Map<string,string>>(new Map());
  const jobRef=useRef(0);
  const controllerRef=useRef<AbortController|null>(null);
  const audioUrlRef=useRef("");
  const balanceTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const voiceDataRef=useRef<{blob:Blob;seconds:number;mixSeconds:number;providerNotice?:string}|null>(null);
  const onInvalidateRef=useRef(onInvalidate);
  onInvalidateRef.current=onInvalidate;
  const originRef=useRef({speechText,voiceId,language});
  useEffect(()=>onPreferencesChange({voiceId,language,bed}),[voiceId,language,bed,onPreferencesChange]);
  const onGeneratingRef=useRef(onGenerating);
  onGeneratingRef.current=onGenerating;

  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/holistic-support/voice",{cache:"no-store",signal:controller.signal})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(data=>{
        setAvailable(data.enabled===true&&data.publicAffirmationsEnabled===true);
        setAvailableLanguages(Array.isArray(data.languages)?data.languages.filter(
          (value:unknown)=>value==="ru"||value==="en"||value==="es"):[]);
      })
      .catch(()=>{if(!controller.signal.aborted){setAvailable(false);setAvailableLanguages([]);}});
    return ()=>controller.abort();
  },[]);

  useEffect(()=>{
    if(balanceTimerRef.current)clearTimeout(balanceTimerRef.current);
    const textChanged=originRef.current.speechText!==speechText;
    originRef.current={speechText,voiceId,language};
    // Consent applies to the exact approved transcript, not to future edits.
    // Public fixed voice samples remain available before new approval.
    if(textChanged)setConsent(false);
    // Existing video marks a changed spoken script as STALE and shows
    // a regenerate warning. Do not suppress that explicit safety feedback.
    // A voice/language change with identical text instead detaches the file.
    if(voiceDataRef.current&&!textChanged)onInvalidateRef.current?.();
    voiceDataRef.current=null;
    const previous=audioUrlRef.current;
    if(previous){URL.revokeObjectURL(previous);audioUrlRef.current="";}
    jobRef.current++;
    controllerRef.current?.abort();
    setBusy(false);setMixing(false);setAudioUrl("");setMessage("");setSpeechSeconds(0);
    onGeneratingRef.current(false);
  },[speechText,voiceId,language]);

  useEffect(()=>()=> {
    jobRef.current++;
    if(balanceTimerRef.current)clearTimeout(balanceTimerRef.current);
    controllerRef.current?.abort();
    if(audioUrlRef.current)URL.revokeObjectURL(audioUrlRef.current);
    sampleJobRef.current++;
    sampleControllerRef.current?.abort();
    sampleAudioRef.current?.pause();
    for(const uri of sampleCacheRef.current.values())URL.revokeObjectURL(uri);
    sampleCacheRef.current.clear();
    onGeneratingRef.current(false);
  },[]);

  async function renderBalance(
    clip:{blob:Blob;seconds:number;mixSeconds:number;providerNotice?:string},
    selected:{bed:Bed;voiceLevel:number;musicLevel:number},
    job:number,
  ){
    setMixing(true);
    onGeneratingRef.current(true);
    try{
      // Offline remix is deterministic: it never asks Google to synthesize again.
      const audio=await mixVoiceWithNature(clip.blob,selected.bed,clip.mixSeconds,selected);
      if(audio.size>15*1024*1024)throw new Error("TOO_LONG");
      if(job!==jobRef.current)return;
      const file=new File([audio],"holistic-house-affirmations-"+language+"-"+voiceId+".wav",{type:"audio/wav"});
      const uri=URL.createObjectURL(file);
      if(audioUrlRef.current)URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current=uri;setAudioUrl(uri);setSpeechSeconds(clip.seconds);
      onAttach({file,spokenText:speechText,voiceId,language,speechSeconds:clip.seconds,mixSeconds:clip.mixSeconds,bed:selected.bed});
      setMessage(t.ready+(clip.providerNotice||""));
    }catch(error){
      if(job!==jobRef.current)return;
      const code=error instanceof Error?error.message:"";
      setMessage(code==="TOO_LONG"?t.tooLong:t.error);
    }finally{
      if(job===jobRef.current){setMixing(false);onGeneratingRef.current(false);}
    }
  }
  function updateBalance(next:{bed:Bed;voiceLevel:number;musicLevel:number}){
    setBed(next.bed);setVoiceLevel(next.voiceLevel);setMusicLevel(next.musicLevel);
    const clip=voiceDataRef.current;
    if(!clip)return;
    const job=++jobRef.current;
    if(balanceTimerRef.current)clearTimeout(balanceTimerRef.current);
    onInvalidateRef.current?.();
    if(audioUrlRef.current){URL.revokeObjectURL(audioUrlRef.current);audioUrlRef.current="";}
    setAudioUrl("");setMixing(true);setMessage(levels.remixing);
    onGeneratingRef.current(true);
    balanceTimerRef.current=setTimeout(()=>{balanceTimerRef.current=null;void renderBalance(clip,next,job);},250);
  }

  function resetSample(){
    sampleJobRef.current++;
    sampleControllerRef.current?.abort();
    sampleControllerRef.current=null;
    if(sampleAudioRef.current){
      sampleAudioRef.current.pause();
      sampleAudioRef.current.removeAttribute("src");
      sampleAudioRef.current.load();
    }
    setSampleUrl("");setSampleVoiceId("");setSampleBusyId("");setSampleMessage("");
  }
  async function previewSample(id:string){
    if(disabled||busy||sampleBusyId)return;
    resetSample();
    if(!languageAvailable){setSampleMessage(t.unavailable);return;}
    const job=sampleJobRef.current;
    const cacheKey=language+":"+id;
    setSampleBusyId(id);
    try{
      let uri=sampleCacheRef.current.get(cacheKey);
      if(!uri){
        const controller=new AbortController();
        sampleControllerRef.current=controller;
        const reply=await fetch("/api/holistic-support/voice",{
          method:"POST",headers:{"Content-Type":"application/json"},
          // Server chooses an impersonal fixed transcript. Never transmit lines.
          body:JSON.stringify({mode:"sample",voiceId:id,language}),
          signal:controller.signal,cache:"no-store",
        });
        if(!reply.ok)throw new Error(reply.status===429?"QUOTA":"TTS");
        const audio=await reply.blob();
        const seconds=audio.size>=44&&audio.size<=8*1024*1024
          ?wavDurationFromHeader(await audio.slice(0,256).arrayBuffer()):0;
        if(!seconds||seconds<.2||seconds>60)throw new Error("TTS");
        if(job!==sampleJobRef.current)return;
        uri=URL.createObjectURL(audio);
        const cache=sampleCacheRef.current;
        cache.set(cacheKey,uri);
        // Bound retained WAV memory (six profiles across language choices).
        if(cache.size>8){
          const oldest=cache.keys().next().value;
          if(oldest){const oldUri=cache.get(oldest);if(oldUri)URL.revokeObjectURL(oldUri);cache.delete(oldest);}
        }
      }
      if(job!==sampleJobRef.current)return;
      setSampleVoiceId(id);setSampleUrl(uri);setSampleMessage(t.sampleReady);
    }catch(error){
      if(job!==sampleJobRef.current)return;
      if(error instanceof Error&&error.name==="AbortError")return;
      setSampleMessage(error instanceof Error&&error.message==="QUOTA"?t.sampleQuota:t.sampleError);
    }finally{
      if(job===sampleJobRef.current){setSampleBusyId("");sampleControllerRef.current=null;}
    }
  }
  // Attempt playback only after an explicit user request. On iPhone Safari the
  // post-network play() may be denied; the visible native player is the fallback.
  useEffect(()=>{
    if(sampleUrl)void sampleAudioRef.current?.play().catch(()=>{});
  },[sampleUrl]);

  async function createAudio(){
    if(!languageAvailable||disabled||approvalPending||busy||!speechText||!consent)return;
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
      const providerNotice=reply.headers.get("X-HH-Voice-Provider")==="openrouter" ? t.backupUsed :
        reply.headers.get("X-HH-Voice-Provider")==="openrouter-free" ? t.freeUsed : "";
      const clip={blob:voice,seconds,mixSeconds,providerNotice};
      voiceDataRef.current=clip;
      await renderBalance(clip,{bed,voiceLevel,musicLevel},job);
    } catch(e) {
      if(job!==jobRef.current)return;
      const code=e instanceof Error?e.message:"";
      if(code!=="AbortError")setMessage(code==="QUOTA"?t.quota:code==="TOO_LONG"?t.tooLong:t.error);
    } finally {
      if(job===jobRef.current){setBusy(false);controllerRef.current=null;onGeneratingRef.current(false);}
    }
  }
  return <section className={css.panel} id="video-affirmation-voice" data-video-affirmation-voice aria-labelledby="video-affirmation-voice-title">
    <div className={css.heading}>
      <AudioLines size={20} aria-hidden="true"/>
      <div><h4 id="video-affirmation-voice-title">{t.title}</h4><p>{t.lead}</p></div>
    </div>
    {voiceGender!=="own" ? <details className={css.transcriptDisclosure}>
      <summary>{t.preview} · {t.review}</summary>
      {speechText?<div className={css.transcript}>
        <p data-video-affirmation-spoken-text>{speechText}</p>
      </div>:<p className={css.hint} role="status">{t.enable}</p>}
    </details> : null}
    {voiceGender!=="own" && lines.length>1?<label className={css.phrasePick}>
      <span>{t.phrase}</span>
      <select data-video-affirmation-phrase value={phraseChoice==="all"?"all":selectedIndex??0}
        disabled={disabled||busy} onChange={event=>{
          // An attached older voice must never be reused for a newly chosen line.
          if(voiceDataRef.current)onInvalidateRef.current?.();
          const value=event.currentTarget.value;
          setPhraseChoice(value==="all"?"all":Number(value));
          setConsent(false);
        }}>
        {lines.map((line,index)=><option key={index} value={index}>{index+1}. {line}</option>)}
        <option value="all">{t.allPhrases}</option>
      </select>
    </label>:null}
    <div className={css.voiceChoices} data-video-affirmation-voice-select role="group" aria-label={t.voice}>
      <div className={css.genderTabs} role="group" aria-label={t.voice}>
        {(["female","male","own"] as const).map(id=><button type="button" key={id}
          data-video-affirmation-gender={id} aria-pressed={voiceGender===id}
          disabled={busy||disabled} onClick={()=>{
            resetSample();setVoiceGender(id);
            if(id!=="own")setVoiceId(id==="female"?"maya":"mark");
            setConsent(false);
          }}>{id==="female"?t.female:id==="male"?t.male:t.own}</button>)}
      </div>
      <div className={css.presetVoiceGroup} hidden={voiceGender==="own"}>
        <div className={css.voiceCards} role="group" aria-label={voiceGender==="female"?t.female:t.male}>
          {VOICE_STUDIO_VOICES.filter(v=>v.gender===voiceGender).map(v=><div className={css.voiceCard} key={v.id}>
            <button type="button" className={css.voiceCardSelect}
              data-video-affirmation-voice-card={v.id} aria-pressed={voiceId===v.id}
              disabled={busy||disabled} onClick={()=>{resetSample();setVoiceId(v.id);setConsent(false);}}>
              <span><strong>{v.name[locale]}</strong><small>{v.description[locale]}</small></span>
              <span aria-hidden="true">{voiceId===v.id?"✓":"○"}</span>
            </button>
            <button type="button" className={css.sampleButton} data-video-affirmation-voice-preview={v.id}
              aria-label={t.sample+" "+v.name[locale]} disabled={busy||disabled||!languageAvailable||Boolean(sampleBusyId)}
              onClick={()=>void previewSample(v.id)}>
              {sampleBusyId===v.id?<LoaderCircle size={16} aria-hidden="true"/>:<Play size={16} aria-hidden="true"/>}
              <span>{sampleBusyId===v.id?t.sampleBusy:t.sample}</span>
            </button>
          </div>)}
        </div>
        {sampleUrl?<div className={css.samplePlayer} data-video-affirmation-sample-ready>
          <strong>{t.sampleTitle} · {VOICE_STUDIO_VOICES.find(v=>v.id===sampleVoiceId)?.name[locale]}</strong>
          <audio ref={sampleAudioRef} controls preload="metadata" src={sampleUrl}
            aria-label={t.sampleTitle+" "+(VOICE_STUDIO_VOICES.find(v=>v.id===sampleVoiceId)?.name[locale]||"")}/>
        </div>:null}
        {sampleMessage?<small className={css.sampleStatus} role="status" aria-live="polite">{sampleMessage}</small>:null}
      </div>
      <MandalaLocalVoiceTracks locale={locale} hidden={voiceGender!=="own"}
        disabled={disabled||busy} approvalPending={approvalPending} onAttach={onAttach} onDetach={onDetachLocal}/>
    </div>
    {voiceGender!=="own" ? <>
    <details className={css.voiceAdvanced}>
      <summary>{locale==="ru"?"Дополнительные настройки озвучки":locale==="es"?"Opciones de narración":"Voice options"}</summary>
    <div className={css.controls}>
      <label>{t.language}
        <select data-video-affirmation-language value={language} disabled={busy||disabled}
          onChange={event=>{resetSample();setLanguage(event.currentTarget.value as SpeechLanguage);setConsent(false);}}>
          <option value="ru">Русский</option><option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </label>
      <label>{t.background}
        <select data-video-affirmation-bed value={bed} disabled={busy||disabled}
          onChange={event=>updateBalance({bed:event.currentTarget.value as Bed,voiceLevel,musicLevel})}>
          <option value="none">{t.none}</option>
          {VOICE_BED_PRESETS.map(p=><option key={p} value={p}>
            {p==="ocean"||p==="rain"||p==="breeze"?t[p]:backgroundNames[p]?.[locale]||p}
          </option>)}
        </select>
      </label>
    </div>
    <div className={css.levels} role="group" aria-label={levels.voice+" / "+levels.music}>
      <label>{levels.voice} · {voiceLevel}%
        <input data-video-voice-volume type="range" min={0} max={100} step={5}
          disabled={disabled||busy} value={voiceLevel}
          onChange={event=>updateBalance({bed,voiceLevel:Number(event.currentTarget.value),musicLevel})}/>
      </label>
      <label>{levels.music} · {musicLevel}%
        <input data-video-bed-volume type="range" min={0} max={100} step={5}
          disabled={disabled||busy||bed==="none"} value={musicLevel}
          onChange={event=>updateBalance({bed,voiceLevel,musicLevel:Number(event.currentTarget.value)})}/>
      </label>
    </div>
    <small className={css.hint}>{levels.balanced}</small>
    </details>
    <label className={css.consent}>
      <input data-video-affirmation-voice-consent type="checkbox" checked={consent}
        disabled={busy||disabled||approvalPending||!speechText} onChange={e=>setConsent(e.currentTarget.checked)}/>
      <span>{t.consent}</span>
    </label>
    <button type="button" className={css.action} data-video-generate-affirmation-audio
      disabled={!languageAvailable||!speechText||!consent||busy||mixing||disabled||approvalPending}
      onClick={()=>void createAudio()}>
      {busy?<LoaderCircle size={18} aria-hidden="true"/>:<Volume2 size={18} aria-hidden="true"/>}
      {busy?mixing?t.mixing:t.busy:t.generate}
    </button>
    {!languageAvailable?<small className={css.warning} role="status">{t.unavailable}</small>:<small className={css.hint}>{t.limit}</small>}
    {audioUrl?<div className={css.result} data-video-affimations-audio-ready>
      <strong><Check size={16} aria-hidden="true"/>{t.finished} · {t.status}: {speechSeconds.toFixed(1)} {t.seconds}</strong>
      <audio controls preload="metadata" src={audioUrl} aria-label={t.finished}/>
      <a href={audioUrl} download={"holistic-house-affirmations-"+language+"-"+voiceId+".wav"}>
        <Download size={16} aria-hidden="true"/>{t.download}
      </a>
      <p>{t.tip}</p>
    </div>:null}
    </> : null}
    {message?<p className={css.message} role="status" aria-live="polite">{message}</p>:null}
  </section>;
}
