"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AudioLines, Check, Download, LoaderCircle, Play, Volume2 } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { VOICE_STUDIO_MODEL, VOICE_STUDIO_SAMPLE, VOICE_STUDIO_VOICES } from "@/lib/mandala/voice-studio.mjs";
import {deletePublicVoiceSample,loadPublicVoiceSample,publicVoiceSampleKey,storePublicVoiceSample} from "@/lib/mandala/public-voice-sample-cache";
import {validatedPublicVoiceSampleDuration} from "@/lib/mandala/public-voice-sample-integrity.mjs";
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
  file:File;speechFile?:File;spokenText:string;voiceId:string;language:SpeechLanguage;
  speechSeconds:number;mixSeconds:number;bed:Bed;source?:"local";
};
const durationChoices=[10,20,30,60] as const;
const copy={
  ru:{
    title:"Озвучить аффирмации",lead:"Выберите утверждённую фразу и голос. Получите настоящую бесплатную озвучку и добавьте её в видео.",myVoiceLead:"Загрузите свою запись или запишите голос прямо здесь.",
    voice:"Голос",female:"Женский (3)",male:"Мужской (3)",own:"Мой голос",chooseVoice:"Выберите голос",phraseCount:"фраз",consentBrief:"Разрешаю отправить только выбранный утверждённый текст бесплатному сервису озвучки.",privacyDetails:"Как используется текст",generateApply:"Создать голос и добавить в видео",language:"Язык",background:"Фон",none:"Без фона",ocean:"Море",rain:"Дождь",breeze:"Ветер",
    phrase:"Фраза для озвучки",allPhrases:"Все утверждённые фразы",sample:"Прослушать",sampleBusy:"Загрузка…",sampleCancel:"Отменить",sampleBusyHelp:"Готовим короткий образец голоса. Вы можете отменить запрос или выбрать другой голос.",sampleCancelled:"Загрузка отменена. Нажмите «Прослушать», чтобы повторить.",sampleTimeout:"Голос не загрузился за 27 секунд. Попробуйте ещё раз — другие голоса доступны.",sampleAudioError:"Образец не воспроизвёлся. Нажмите «Прослушать» ещё раз — загрузим свежую запись.",sampleReady:"Образец готов. Если воспроизведение не началось, нажмите ▶ в плеере.",sampleError:"Не удалось прослушать образец. Повторите позже.",sampleQuota:"Лимит прослушиваний исчерпан — попробуйте позднее.",deviceSample:"Системный голос · пример текста",deviceNote:"Это голос устройства для примера чтения, НЕ выбранный голос Софии, Майи или Алисы. Системный пример не прикрепляется к видео.",deviceError:"Системный голос недоступен на этом устройстве.",sampleTitle:"Образец голоса",
    pendingText:"Сначала утвердите изменённые фразы выше.",
    preview:"Выбранная фраза",enable:"Сначала включите аффирмации и выберите фразы выше.",
    consent:"Разрешаю отправить только выбранный утверждённый текст в бесплатный Gemini или OpenRouter/Deepgram (только английский). Личные и медицинские данные не включаются. Правила провайдеров действуют; Google может использовать бесплатные запросы для улучшения сервисов. Платный резерв для этого действия отключён.",
    generate:"Бесплатно озвучить фразу",busy:"Генерируем голос…",mixing:"Смешиваем звук и природу…",ready:"Аудиодорожка создана и автоматически прикреплена к итоговому видео.",
    unavailable:"Бесплатный генератор ещё не активирован.",quota:"Лимит запросов исчерпан. Платёж с посетителя не взимается.",
    error:"Не удалось получить звук. Выберите другой голос или повторите позже.",tooLong:"Аудио длиннее 60 секунд: сократите количество аффирмаций.",
    download:"Скачать WAV",tip:"Вы сможете прослушать, скачать WAV или нажать «Создать видео» — голос уже добавлен. При изменении фраз понадобится новая озвучка.",
    limit:"До 3 бесплатных попыток в час с одного подключения; без регистрации.",review:"Проверьте текст перед отправкой.",
    finished:"Голос в видео",status:"Длительность речи",seconds:"сек.",backupUsed:" · OpenRouter/xAI",freeUsed:" · бесплатный OpenRouter/Deepgram"
  },
  en:{
    title:"Narrate affirmations",lead:"Choose an approved phrase and voice. Generate a free real voice track and attach it to your video.",myVoiceLead:"Upload an audio recording or record your voice here.",
    voice:"Voice",female:"Female (3)",male:"Male (3)",own:"My voice",chooseVoice:"Choose a voice",phraseCount:"phrases",consentBrief:"I agree to send only the selected approved text to a free voice provider.",privacyDetails:"How the text is used",generateApply:"Generate voice & apply to video",language:"Language",background:"Background",none:"Voice only",ocean:"Ocean",rain:"Rain",breeze:"Breeze",
    phrase:"Phrase to narrate",allPhrases:"All approved phrases",sample:"Listen",sampleBusy:"Loading…",sampleCancel:"Cancel",sampleBusyHelp:"Preparing a short voice sample. You can cancel or select another voice.",sampleCancelled:"Loading cancelled. Tap Listen to retry.",sampleTimeout:"The voice did not load within 27 seconds. Retry or choose another voice.",sampleAudioError:"The sample did not play. Tap Listen again to download a fresh voice sample.",sampleReady:"Voice sample ready. Tap ▶ in the player if it did not start.",sampleError:"Could not load the sample. Try again later.",sampleQuota:"Sample quota reached. Please try later.",deviceSample:"Device voice · text example",deviceNote:"This is your device voice for a reading example, NOT the selected Sofia, Maya or Alisa voice. It is not attached to the video.",deviceError:"Device voice playback is unavailable.",sampleTitle:"Voice sample",
    pendingText:"Approve the edited phrases above first.",
    preview:"Selected spoken phrase",enable:"First enable affirmations and select your phrases above.",
    consent:"I agree to send only the selected approved text to free Gemini or OpenRouter/Deepgram (English only). No identifying or medical details are included. Provider data policies apply; free Google inputs may improve services. Paid fallback is disabled here.",
    generate:"Narrate phrase for free",busy:"Generating speech…",mixing:"Mixing voice and nature…",ready:"Audio created and automatically attached to the final video.",
    unavailable:"Free voice generation has not been enabled yet.",quota:"Audio request limit reached. No visitor charges.",
    error:"Audio could not be generated. Try another voice or again later.",tooLong:"Speech is longer than 60 seconds; shorten the affirmations.",
    download:"Download WAV",tip:"Listen, download WAV, or select Create video — your voice is already attached. Changed phrases require new narration.",
    limit:"Up to 3 free requests per hour per connection; no sign-in.",review:"Review this text before sending.",
    finished:"Voice in video",status:"Speech duration",seconds:"sec",backupUsed:" · OpenRouter/xAI",freeUsed:" · free OpenRouter/Deepgram"
  },
  es:{
    title:"Poner voz a las afirmaciones",lead:"Elige una frase aprobada y una voz. Genera gratis una pista de voz real para tu vídeo.",myVoiceLead:"Sube una grabación o graba tu voz aquí.",
    voice:"Voz",female:"Femenino (3)",male:"Masculino (3)",own:"Mi voz",chooseVoice:"Elige una voz",phraseCount:"frases",consentBrief:"Autorizo enviar solo el texto aprobado seleccionado a un servicio de voz gratuito.",privacyDetails:"Cómo se utiliza el texto",generateApply:"Generar voz y añadir al vídeo",language:"Idioma",background:"Fondo",none:"Solo voz",ocean:"Mar",rain:"Lluvia",breeze:"Brisa",
    phrase:"Frase que se leerá",allPhrases:"Todas las frases aprobadas",sample:"Escuchar",sampleBusy:"Cargando…",sampleCancel:"Cancelar",sampleBusyHelp:"Preparando una muestra breve. Puedes cancelar o elegir otra voz.",sampleCancelled:"Carga cancelada. Pulsa Escuchar para reintentar.",sampleTimeout:"La voz no cargó en 27 segundos. Reintenta o elige otra voz.",sampleAudioError:"La muestra no se reprodujo. Pulsa Escuchar otra vez para descargar una voz nueva.",sampleReady:"Muestra lista. Pulsa ▶ en el reproductor si no empieza.",sampleError:"No se pudo reproducir la muestra. Inténtalo luego.",sampleQuota:"Límite de muestras alcanzado. Vuelve más tarde.",deviceSample:"Voz del dispositivo · ejemplo",deviceNote:"Es la voz del dispositivo, NO la voz seleccionada de Sofía, Maya o Alicia. No se añade al vídeo.",deviceError:"No se puede reproducir la voz del dispositivo.",sampleTitle:"Muestra de voz",
    pendingText:"Primero aprueba las frases editadas arriba.",
    preview:"Frase elegida",enable:"Activa las afirmaciones y selecciona tus frases arriba.",
    consent:"Autorizo enviar solo el texto aprobado elegido a Gemini gratuito o OpenRouter/Deepgram (solo inglés). No incluye datos médicos ni personales. Se aplican las políticas de cada proveedor; Google puede usar solicitudes gratuitas para mejorar servicios. El respaldo de pago está desactivado.",
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
  locale,lines,enabled,durationSeconds,disabled,approvalPending=false,initialPreferences,onAttach,onGenerating,onInvalidate,onPreferencesChange,onDetachLocal,compact=false,ownVoiceOnly=false,extraActions,
}:{
  locale:PublicLocale;lines:string[];enabled:boolean;durationSeconds:number;disabled:boolean;approvalPending?:boolean;
  initialPreferences?:AffirmationVoicePreferences;
  compact?:boolean;ownVoiceOnly?:boolean;extraActions?:ReactNode;
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
  const speechText=enabled?affirmationNarrationForSelection(lines,phraseChoice==="all"?"all":selectedIndex??0):"";
  const initialVoiceId=initialPreferences?.voiceId??"maya";
  const [language,setLanguage]=useState<SpeechLanguage>(()=>initialPreferences?.language??locale);
  const [voiceId,setVoiceId]=useState(initialVoiceId);
  const [voiceGender,setVoiceGender]=useState<"female"|"male"|"own">(()=>initialVoiceId.startsWith("local-")?"own":VOICE_STUDIO_VOICES.find(v=>v.id===initialVoiceId)?.gender==="male"?"male":"female");
  const [bed,setBed]=useState<Bed>(()=>initialPreferences?.bed??"none");
  const [voiceLevel,setVoiceLevel]=useState(90);
  const [musicLevel,setMusicLevel]=useState(12);
  const [consent,setConsent]=useState(false);
  // Mobile Safari in touch emulation can report a native input click without
  // toggling the checkbox. Use one real accessible button gesture, mirroring
  // the already-verified guest consent, and never grant permission on mount.
  const consentTouchStart=useRef<{x:number;y:number}|null>(null);
  const lastConsentTouchAt=useRef(0);
  const [available,setAvailable]=useState(false);
  const [availableLanguages,setAvailableLanguages]=useState<string[]>([]);
  const languageAvailable=available&&availableLanguages.includes(language);
  const [busy,setBusy]=useState(false);
  const [mixing,setMixing]=useState(false);
  const [generationPhase,setGenerationPhase]=useState<"idle"|"requesting"|"mixing"|"attached"|"cancelled"|"failed">("idle");
  const [audioUrl,setAudioUrl]=useState("");
  const [message,setMessage]=useState("");
  const [speechSeconds,setSpeechSeconds]=useState(0);
  // A sample speaks only the fixed server-owned public phrase. It is never the
  // visitor's unapproved affirmation text, and never attaches to a video.
  const [sampleUrl,setSampleUrl]=useState("");
  const [sampleVoiceId,setSampleVoiceId]=useState("");
  const [sampleBusyId,setSampleBusyId]=useState("");
  const [sampleMessage,setSampleMessage]=useState("");
  const [deviceSpeechAvailable,setDeviceSpeechAvailable]=useState(false);
  const deviceUtteranceRef=useRef<SpeechSynthesisUtterance|null>(null);
  const sampleAudioRef=useRef<HTMLAudioElement|null>(null);
  // A cached replay must not race the post-fetch autoplay effect in WebKit.
  const lastAutoPlayedSampleUrlRef=useRef("");
  const generatedAudioRef=useRef<HTMLAudioElement|null>(null);
  const playGeneratedAfterRequestRef=useRef(false);
  const sampleControllerRef=useRef<AbortController|null>(null);
  const sampleJobRef=useRef(0);
  const sampleCacheRef=useRef<Map<string,string>>(new Map());
  const sampleRejectedKeysRef=useRef<Set<string>>(new Set());
  const samplePendingPersistRef=useRef<{key:string;audio:Blob;uri:string}|null>(null);
  const jobRef=useRef(0);
  // macOS WebKit can deliver a real pointer-up without dispatching click.
  // Keep one consented request per physical gesture, not two paid-capable POSTs.
  const submitPointerStart=useRef<{x:number;y:number}|null>(null);
  const lastSubmitPointerAt=useRef(0);
  const submitTouchStart=useRef<{x:number;y:number}|null>(null);
  const lastSubmitTouchAt=useRef(0);
  const voiceRequestInFlight=useRef(false);
  const controllerRef=useRef<AbortController|null>(null);
  const audioUrlRef=useRef("");
  const balanceTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const voiceDataRef=useRef<{blob:Blob;seconds:number;mixSeconds:number;providerNotice?:string}|null>(null);
  const onInvalidateRef=useRef(onInvalidate);
  onInvalidateRef.current=onInvalidate;
  const originRef=useRef({speechText,voiceId,language});
  // Safari can defer the native <details> toggle until after React commits.
  // Preserve a visitor's real open state across a voice card or locale rerender.
  const voiceAdvancedOpenRef=useRef(false);
  const voiceAdvancedNodeRef=useRef<HTMLDetailsElement|null>(null);
  const bindVoiceAdvanced=useCallback((node:HTMLDetailsElement|null)=>{
    voiceAdvancedNodeRef.current=node;
    if(node)node.open=voiceAdvancedOpenRef.current;
  },[]);
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

  useLayoutEffect(()=>{
    const previous=originRef.current;
    // StrictMode can replay effects: identical approved input must never abort a WAV.
    if(previous.speechText===speechText && previous.voiceId===voiceId &&
       previous.language===language)return;
    const interrupted=Boolean(controllerRef.current)||busy||mixing;
    if(balanceTimerRef.current)clearTimeout(balanceTimerRef.current);
    const textChanged=previous.speechText!==speechText;
    originRef.current={speechText,voiceId,language};
    // Consent applies to the exact transcript; a changed spoken phrase revokes it.
    if(textChanged)setConsent(false);
    // The parent may still own the attached WAV after this panel remounts.
    // Invalidate on every spoken-input change, even without a local TTS Blob ref.
    onInvalidateRef.current?.();
    voiceDataRef.current=null;
    playGeneratedAfterRequestRef.current=false;
    const previousAudioUrl=audioUrlRef.current;
    if(previousAudioUrl){URL.revokeObjectURL(previousAudioUrl);audioUrlRef.current="";}
    jobRef.current++;
    controllerRef.current?.abort();
    setBusy(false);setMixing(false);setAudioUrl("");setSpeechSeconds(0);
    setGenerationPhase(interrupted?"cancelled":"idle");
    setMessage(interrupted?(locale==="ru"?"Фраза или голос изменились во время подготовки. Проверьте текст и создайте озвучку заново.":
      locale==="es"?"La frase o la voz cambió durante la generación. Revisa el texto y vuelve a crear el audio.":
      "The phrase or voice changed while preparing audio. Review the text and create the voice again."):"");
    onGeneratingRef.current(false);
  },[speechText,voiceId,language,busy,mixing,locale]);

  useEffect(()=>{
    setDeviceSpeechAvailable(typeof window!=="undefined" &&
      typeof window.speechSynthesis?.speak==="function" &&
      typeof SpeechSynthesisUtterance!=="undefined");
  },[]);

  useEffect(()=>()=> {
    if(deviceUtteranceRef.current){
      window.speechSynthesis?.cancel();
      deviceUtteranceRef.current=null;
    }
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
    setMixing(true);setGenerationPhase("mixing");
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
      const speechFile=new File([clip.blob],"holistic-house-affirmations-speech.wav",{type:"audio/wav"});
      onAttach({file,speechFile,spokenText:speechText,voiceId,language,speechSeconds:clip.seconds,mixSeconds:clip.mixSeconds,bed:selected.bed});
      setGenerationPhase("attached");
      setMessage(t.ready+(clip.providerNotice||""));
    }catch(error){
      if(job!==jobRef.current)return;
      const code=error instanceof Error?error.message:"";
      setGenerationPhase("failed");
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
    setAudioUrl("");setMixing(true);setGenerationPhase("mixing");setMessage(levels.remixing);
    onGeneratingRef.current(true);
    balanceTimerRef.current=setTimeout(()=>{balanceTimerRef.current=null;void renderBalance(clip,next,job);},250);
  }

  function resetSample(){
    lastAutoPlayedSampleUrlRef.current="";
    if(deviceUtteranceRef.current){
      window.speechSynthesis?.cancel();
      deviceUtteranceRef.current=null;
    }
    sampleJobRef.current++;
    sampleControllerRef.current?.abort();
    sampleControllerRef.current=null;
    if(sampleAudioRef.current){
      sampleAudioRef.current.pause();
      sampleAudioRef.current.removeAttribute("src");
      sampleAudioRef.current.load();
    }
    samplePendingPersistRef.current=null;
    setSampleUrl("");setSampleVoiceId("");setSampleBusyId("");setSampleMessage("");
  }
  function previewDeviceSample(){
    if(!deviceSpeechAvailable||disabled||busy)return;
    resetSample();
    try{
      // Fixed server-owned public sample only: never a visitor's sensitive text.
      // This is explicitly an OS voice and must not be confused with Gemini's
      // distinct Gacrux / Sulafat / Zephyr voice profiles.
      const utterance=new SpeechSynthesisUtterance(VOICE_STUDIO_SAMPLE[language]);
      utterance.lang=language==="ru"?"ru-RU":language==="es"?"es-ES":"en-US";
      utterance.rate=.88;
      const candidates=window.speechSynthesis.getVoices().filter(
        voice=>voice.lang.toLowerCase().startsWith(language));
      utterance.voice=candidates.find(voice=>voice.localService)??candidates[0]??null;
      utterance.onerror=()=>{if(deviceUtteranceRef.current===utterance){
        deviceUtteranceRef.current=null;setSampleMessage(t.deviceError);
      }};
      utterance.onend=()=>{if(deviceUtteranceRef.current===utterance)deviceUtteranceRef.current=null;};
      deviceUtteranceRef.current=utterance;
      setSampleMessage(t.deviceNote);
      // Called synchronously inside the actual tap for iOS Safari activation.
      window.speechSynthesis.speak(utterance);
      if(window.speechSynthesis.paused)window.speechSynthesis.resume();
    }catch{
      deviceUtteranceRef.current=null;
      setSampleMessage(t.deviceError);
    }
  }
  function sampleCanPlay(){
    const pending=samplePendingPersistRef.current;
    if(!pending||pending.uri!==sampleUrl)return;
    samplePendingPersistRef.current=null;
    sampleRejectedKeysRef.current.delete(pending.key);
    // Save only a validated, browser-decodable fixed public Gemini voice.
    void storePublicVoiceSample(pending.key,pending.audio);
  }
  function samplePlaybackError(){
    if(!sampleUrl||!sampleVoiceId)return;
    const memoryKey=language+":"+sampleVoiceId;
    const profile=VOICE_STUDIO_VOICES.find(voice=>voice.id===sampleVoiceId);
    const storageKey=publicVoiceSampleKey(language,sampleVoiceId,profile?.provider??"",
      VOICE_STUDIO_MODEL,VOICE_STUDIO_SAMPLE[language]);
    sampleRejectedKeysRef.current.add(storageKey);
    samplePendingPersistRef.current=null;
    const cached=sampleCacheRef.current.get(memoryKey);
    if(cached===sampleUrl){
      sampleCacheRef.current.delete(memoryKey);
      URL.revokeObjectURL(cached);
    }
    setSampleUrl("");setSampleVoiceId("");setSampleMessage(t.sampleAudioError);
    // No automatic paid or free provider retry; next Listen is intentional.
    void deletePublicVoiceSample(storageKey);
  }

  async function previewSample(id:string){
    if(disabled||busy)return;
    // A second tap while waiting cancels the in-flight request. Other voice
    // buttons remain usable, cancelling stale requests instead of freezing UI.
    if(sampleBusyId===id){
      resetSample();
      setSampleMessage(t.sampleCancelled);
      return;
    }
    // iPhone Safari rejects play() after an asynchronous network response.
    // Replaying an already fetched sample directly inside a tap is a real
    // user gesture and must never spend another free provider request.
    if(!sampleBusyId && sampleVoiceId===id && sampleUrl && sampleAudioRef.current){
      const player=sampleAudioRef.current;
      // User replay owns this gesture. A delayed effect must not call play() again.
      lastAutoPlayedSampleUrlRef.current=sampleUrl;
      try{player.currentTime=0;await player.play();}
      catch{/* Native audio controls remain available for a manual second tap. */}
      return;
    }
    resetSample();
    if(!languageAvailable){setSampleMessage(t.unavailable);return;}
    const job=sampleJobRef.current;
    const cacheKey=language+":"+id;
    const profile=VOICE_STUDIO_VOICES.find(voice=>voice.id===id);
    const persistentKey=publicVoiceSampleKey(language,id,profile?.provider??"",
      VOICE_STUDIO_MODEL,VOICE_STUDIO_SAMPLE[language]);
    setSampleBusyId(id);
    let timer:ReturnType<typeof setTimeout>|null=null;
    let timedOut=false;
    try{
      let uri=sampleCacheRef.current.get(cacheKey);
      if(!uri){
        // A previously heard fixed public Gemini demo survives reloads and
        // free-tier 429 responses. Never persist personal affirmation audio.
        const saved=sampleRejectedKeysRef.current.has(persistentKey)?null:await loadPublicVoiceSample(persistentKey);
        if(job!==sampleJobRef.current)return;
        if(saved){
          const seconds=validatedPublicVoiceSampleDuration(await saved.arrayBuffer());
          if(typeof seconds==="number"&&seconds>=.2&&seconds<=60){
            uri=URL.createObjectURL(saved);
            sampleCacheRef.current.set(cacheKey,uri);
          }
        }
      }
      if(!uri){
        const controller=new AbortController();
        sampleControllerRef.current=controller;
        // The server already bounds the free Gemini call at 20 seconds, but
        // the browser must also bound the entire HTTP/body read on slow mobile.
        timer=setTimeout(()=>{timedOut=true;controller.abort();},27000);
        const reply=await fetch("/api/holistic-support/voice",{
          method:"POST",headers:{"Content-Type":"application/json"},
          // Fixed public text only, never the visitor's unapproved phrases.
          body:JSON.stringify({mode:"sample",voiceId:id,language}),
          signal:controller.signal,cache:"no-store",
        });
        if(!reply.ok)throw new Error(reply.status===429?"QUOTA":"TTS");
        if(!/^audio\/wav(?:;|$)/i.test(reply.headers.get("content-type")||""))
          throw new Error("TTS");
        const audio=await reply.blob();
        const seconds=audio.size>=44&&audio.size<=8*1024*1024
          ?validatedPublicVoiceSampleDuration(await audio.arrayBuffer()):0;
        if(!seconds||seconds<.2||seconds>60)throw new Error("TTS");
        if(job!==sampleJobRef.current)return;
        // Cache only an authentic Gemini voice matching the selected profile.
        // Free English fallbacks may have different voices and must not be
        // mislabeled as Sofia/Maya/Alisa across future visits.
        uri=URL.createObjectURL(audio);
        if(reply.headers.get("x-hh-voice-provider")==="gemini")
          samplePendingPersistRef.current={key:persistentKey,audio,uri};
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
      if(timedOut)setSampleMessage(t.sampleTimeout);
      else if(error instanceof Error&&error.name==="AbortError")return;
      else setSampleMessage(error instanceof Error&&error.message==="QUOTA"?t.sampleQuota:t.sampleError);
    }finally{
      if(timer!==null)clearTimeout(timer);
      if(job===sampleJobRef.current){setSampleBusyId("");sampleControllerRef.current=null;}
    }
  }
  // Attempt playback only after an explicit user request. On iPhone Safari the
  // post-network play() may be denied; the visible native player is the fallback.
  useEffect(()=>{
    if(!sampleUrl||lastAutoPlayedSampleUrlRef.current===sampleUrl)return;
    lastAutoPlayedSampleUrlRef.current=sampleUrl;
    void sampleAudioRef.current?.play().catch(()=>{});
  },[sampleUrl]);

  // Attempt playback only after an explicit narration request. Native controls
  // remain available when Safari requires another user gesture.
  useEffect(()=>{
    if(audioUrl&&playGeneratedAfterRequestRef.current){
      playGeneratedAfterRequestRef.current=false;
      void generatedAudioRef.current?.play().catch(()=>{});
    }
  },[audioUrl]);

  async function createAudio(){
    if(!languageAvailable||disabled||approvalPending||busy||!speechText||!consent||voiceRequestInFlight.current)return;
    // Lock synchronously: React's disabled render may occur after pointerup.
    voiceRequestInFlight.current=true;
    const job=++jobRef.current;
    const controller=new AbortController();
    controllerRef.current=controller;
    playGeneratedAfterRequestRef.current=true;
    setBusy(true);setGenerationPhase("requesting");setMessage("");setAudioUrl("");setSpeechSeconds(0);
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
      setGenerationPhase("mixing");
      await renderBalance(clip,{bed,voiceLevel,musicLevel},job);
    } catch(e) {
      if(job!==jobRef.current)return;
      playGeneratedAfterRequestRef.current=false;
      const code=e instanceof Error?e.message:"";
      setGenerationPhase(code==="AbortError"?"cancelled":"failed");
      setMessage(code==="AbortError"?(locale==="ru"?"Генерация голоса прервана. Проверьте фразу и повторите запрос.":
        locale==="es"?"La generación de voz se interrumpió. Comprueba la frase antes de reintentar.":
        "Voice generation was interrupted. Review the phrase before retrying."):
        code==="QUOTA"?t.quota:code==="TOO_LONG"?t.tooLong:t.error);
    } finally {
      voiceRequestInFlight.current=false;
      if(job===jobRef.current){setBusy(false);controllerRef.current=null;onGeneratingRef.current(false);}
    }
  }
  const deviceSampleControl=deviceSpeechAvailable?<div className={css.deviceSampleGroup}>
    <button type="button" className={css.deviceSampleButton}
      data-video-affirmation-device-voice onClick={previewDeviceSample}
      disabled={busy||disabled||Boolean(sampleBusyId)}>
      <Volume2 size={16} aria-hidden="true"/>{t.deviceSample}
    </button><small className={css.sampleStatus}>{t.deviceNote}</small>
  </div>:null;
  return <section className={css.panel} data-voice-layout={compact?"compact":"default"} data-own-voice-only={ownVoiceOnly?"true":"false"}
    id="video-affirmation-voice" data-video-affirmation-voice data-video-affirmation-phase={generationPhase} aria-labelledby="video-affirmation-voice-title">
    <div className={css.heading}>
      <AudioLines size={20} aria-hidden="true"/>
      <div><h4 id="video-affirmation-voice-title">{ownVoiceOnly?t.own:t.title}</h4><p>{ownVoiceOnly?t.myVoiceLead:t.lead}</p></div>
    </div>
    {!ownVoiceOnly&&voiceGender!=="own" && !compact ? <div className={css.selectedPhrase} data-video-affirmation-selection-summary>
      <small>{t.phrase} · {t.voice}: <strong data-video-affirmation-selected-voice>{VOICE_STUDIO_VOICES.find(v=>v.id===voiceId)?.name[locale]}</strong></small>
      <p data-video-affirmation-selected-phrase>{approvalPending?t.pendingText:speechText||t.enable}</p>
    </div>:null}
    {!ownVoiceOnly&&voiceGender!=="own" && (!compact || phraseChoice==="all") ? <details className={css.transcriptDisclosure} data-video-affirmation-transcript-review>
      <summary>{t.preview} · {t.review}</summary>
      {speechText?<div className={css.transcript}>
        <p data-video-affirmation-spoken-text>{speechText}</p>
      </div>:<p className={css.hint} role="status">{t.enable}</p>}
    </details> : null}
    {!ownVoiceOnly&&voiceGender!=="own" && (compact||lines.length>1)?<label className={css.phrasePick}>
      <span className={css.phrasePickTitle}><span>{t.phrase}</span>
        {compact?<small data-video-affirmation-phrase-count>{phraseChoice==="all"?lines.length:lines.length?Math.min((selectedIndex??0)+1,lines.length):0} / {lines.length} {t.phraseCount}</small>:null}
      </span>
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
      <div className={css.voiceToolbar} hidden={ownVoiceOnly}>
        {compact?<strong className={css.chooseVoice}>{t.chooseVoice}</strong>:null}
        <div className={css.genderTabs} role="group" aria-label={t.voice}>
        {(["female","male","own"] as const).map(id=><button type="button" key={id}
          data-video-affirmation-gender={id} aria-pressed={voiceGender===id} hidden={compact&&id==="own"}
          disabled={busy||disabled} onClick={()=>{
            resetSample();setVoiceGender(id);
            if(id!=="own")setVoiceId(id==="female"?"maya":"mark");
            setConsent(false);
          }}>{id==="female"?t.female:id==="male"?t.male:t.own}</button>)}
        </div>
      </div>
      <div className={css.presetVoiceGroup} hidden={ownVoiceOnly||voiceGender==="own"}>
        <div className={css.voiceCards} role="group" aria-label={voiceGender==="female"?t.female:t.male}>
          {VOICE_STUDIO_VOICES.filter(v=>v.gender===voiceGender).map(v=><div className={css.voiceCard} key={v.id}>
            <button type="button" className={css.voiceCardSelect}
              data-video-affirmation-voice-card={v.id} aria-pressed={voiceId===v.id}
              disabled={busy||disabled} onClick={()=>{resetSample();setVoiceId(v.id);setConsent(false);}}>
              <span><strong>{v.name[locale]}</strong><small>{v.description[locale]}</small></span>
              <span aria-hidden="true">{voiceId===v.id?"✓":"○"}</span>
            </button>
            <button type="button" className={css.sampleButton} data-video-affirmation-voice-preview={v.id}
              aria-label={t.sample+" "+v.name[locale]} aria-busy={sampleBusyId===v.id} disabled={busy||disabled||!languageAvailable}
              onClick={()=>{
                // The voice heard in Preview is also the chosen voice for the
                // approved phrase and final WAV; no hidden mismatch on export.
                if(voiceId!==v.id){setVoiceId(v.id);setConsent(false);}
                void previewSample(v.id);
              }}>
              {sampleBusyId===v.id?<LoaderCircle size={16} aria-hidden="true"/>:<Play size={16} aria-hidden="true"/>}
              <span>{sampleBusyId===v.id?t.sampleCancel:t.sample}</span>
            </button>
          </div>)}
        </div>
        {sampleUrl?<div className={css.samplePlayer} data-video-affirmation-sample-ready>
          <strong>{t.sampleTitle} · {VOICE_STUDIO_VOICES.find(v=>v.id===sampleVoiceId)?.name[locale]}</strong>
          <audio ref={sampleAudioRef} controls preload="metadata" src={sampleUrl}
            aria-label={t.sampleTitle+" "+(VOICE_STUDIO_VOICES.find(v=>v.id===sampleVoiceId)?.name[locale]||"")}
            onCanPlay={sampleCanPlay} onError={samplePlaybackError}/>
        </div>:null}
        {(sampleBusyId||sampleMessage)?<small className={css.sampleStatus} role="status" aria-live="polite">{sampleBusyId?t.sampleBusyHelp:sampleMessage}</small>:null}
        {!compact?deviceSampleControl:null}
      </div>
      <MandalaLocalVoiceTracks locale={locale} hidden={!ownVoiceOnly&&voiceGender!=="own"}
        compact={ownVoiceOnly} uploadAction={ownVoiceOnly?extraActions:null}
        disabled={disabled||busy} approvalPending={approvalPending} onAttach={onAttach} onDetach={onDetachLocal}/>
    </div>
    {!ownVoiceOnly&&voiceGender!=="own" ? <>
    <details ref={bindVoiceAdvanced} className={css.voiceAdvanced} data-video-affirmation-voice-advanced
      onToggle={event=>{
        if(event.currentTarget===voiceAdvancedNodeRef.current)
          voiceAdvancedOpenRef.current=event.currentTarget.open;
      }}>
      <summary onClick={event=>{
        // Native summary toggling must be the *only* DOM toggle. WebKit may
        // commit its default action after React's event handler; toggling
        // node.open here as well can immediately close a genuine user tap.
        // Save the intended next state early for a concurrent React remount.
        const node=event.currentTarget.parentElement;
        if(node instanceof HTMLDetailsElement)
          voiceAdvancedOpenRef.current=!node.open;
      }}>{locale==="ru"?"Дополнительные настройки озвучки":locale==="es"?"Opciones de narración":"Voice options"}</summary>
    {compact?deviceSampleControl:null}
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
    <div className={css.consentRow}><button className={css.consent} type="button"
      data-video-affirmation-voice-consent role="checkbox" aria-checked={consent}
      disabled={busy||disabled||approvalPending||!speechText}
      onTouchStart={event=>{
        const finger=event.touches.length===1?event.touches[0]:null;
        consentTouchStart.current=finger?{x:finger.clientX,y:finger.clientY}:null;
      }}
      onTouchMove={event=>{
        const start=consentTouchStart.current,finger=event.touches[0];
        if(!start||event.touches.length!==1||!finger||
          Math.hypot(finger.clientX-start.x,finger.clientY-start.y)>14)
          consentTouchStart.current=null;
      }}
      onTouchCancel={()=>{consentTouchStart.current=null;}}
      onTouchEnd={event=>{
        const start=consentTouchStart.current,finger=event.changedTouches[0];
        consentTouchStart.current=null;
        if(!start||event.changedTouches.length!==1||!finger||
          Math.hypot(finger.clientX-start.x,finger.clientY-start.y)>14)return;
        lastConsentTouchAt.current=Date.now();
        setConsent(previous=>!previous);
      }}
      onClick={()=>{
        // Suppress Safari's compatibility click for the *same* real touch.
        // Keyboard and pointer clicks still toggle and can revoke consent.
        if(Date.now()-lastConsentTouchAt.current>=700)
          setConsent(previous=>!previous);
      }}>
      <span className={css.consentMark} aria-hidden="true">{consent?"✓":""}</span>
      <span>{compact?t.consentBrief:t.consent}</span>
    </button>
    {compact?<details className={css.consentDetails}><summary>{t.privacyDetails}</summary>
      <p>{t.consent}</p></details>:null}</div>
    <button type="button" className={css.action} data-video-generate-affirmation-audio
      disabled={!languageAvailable||!speechText||!consent||busy||mixing||disabled||approvalPending}
      // Mobile Safari may dispatch touchend but not pointerup or compatibility click.
      // Accept one short intentional touch, never a scroll or consent-free request.
      onTouchStart={event=>{
        const finger=event.touches.length===1?event.touches[0]:null;
        submitTouchStart.current=finger?{x:finger.clientX,y:finger.clientY}:null;
      }}
      onTouchMove={event=>{
        const start=submitTouchStart.current,finger=event.touches[0];
        if(!start||event.touches.length!==1||!finger||
          Math.hypot(finger.clientX-start.x,finger.clientY-start.y)>14)
          submitTouchStart.current=null;
      }}
      onTouchCancel={()=>{submitTouchStart.current=null;}}
      onTouchEnd={event=>{
        const start=submitTouchStart.current,finger=event.changedTouches[0];
        submitTouchStart.current=null;
        if(!start||event.changedTouches.length!==1||!finger||
          Math.hypot(finger.clientX-start.x,finger.clientY-start.y)>14)return;
        lastSubmitTouchAt.current=Date.now();
        void createAudio();
      }}
      onPointerDown={event=>{
        submitPointerStart.current=event.pointerType!=="touch"&&event.isPrimary&&event.button===0
          ?{x:event.clientX,y:event.clientY}:null;
      }}
      onPointerCancel={()=>{submitPointerStart.current=null;}}
      onPointerUp={event=>{
        const start=submitPointerStart.current;
        submitPointerStart.current=null;
        if(event.pointerType==="touch"||!start||!event.isPrimary||event.button!==0||
          Math.hypot(event.clientX-start.x,event.clientY-start.y)>14)return;
        lastSubmitPointerAt.current=Date.now();
        void createAudio();
      }}
      onClick={event=>{
        // A synthesized click immediately after pointerup is the same action.
        // detail=0 is a keyboard or accessibility activation: always permit.
        if(event.detail!==0&&Date.now()-lastSubmitTouchAt.current<950)return;
        if(event.detail!==0&&Date.now()-lastSubmitPointerAt.current<750)return;
        void createAudio();
      }}>
      {busy?<LoaderCircle size={18} aria-hidden="true"/>:<Volume2 size={18} aria-hidden="true"/>}
      {busy?mixing?t.mixing:t.busy:compact?t.generateApply:t.generate}
    </button>
    {!languageAvailable?<small className={css.warning} role="status">{t.unavailable}</small>:<small className={css.hint}>{t.limit}</small>}
    {audioUrl?<div className={css.result} data-video-affimations-audio-ready>
      <strong><Check size={16} aria-hidden="true"/>{t.finished} · {VOICE_STUDIO_VOICES.find(v=>v.id===voiceId)?.name[locale]} · {t.status}: {speechSeconds.toFixed(1)} {t.seconds}</strong>
      <audio ref={generatedAudioRef} controls preload="metadata" src={audioUrl} aria-label={t.finished+" · "+(VOICE_STUDIO_VOICES.find(v=>v.id===voiceId)?.name[locale]||"")}/>
      <a href={audioUrl} download={"holistic-house-affirmations-"+language+"-"+voiceId+".wav"}>
        <Download size={16} aria-hidden="true"/>{t.download}
      </a>
      <p>{t.tip}</p>
    </div>:null}
    </> : null}
    {!ownVoiceOnly&&message?<p className={css.message} role="status" aria-live="polite">{message}</p>:null}
  </section>;
}
