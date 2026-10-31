"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, Headphones, Leaf, LoaderCircle, Play, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { presetAudioUrl } from "@/lib/mandala/local-video-music";
import { mixVoiceWithNature } from "@/lib/mandala/voice-audio-mix";
import type { NatureBed } from "@/lib/mandala/voice-audio-mix";
import { VOICE_STUDIO_MAX_CHARS, VOICE_STUDIO_VOICES, studioExcerpt } from "@/lib/mandala/voice-studio.mjs";
import css from "./mandala-cloud-voice-studio.module.css";

type VoiceLanguage = "ru" | "en";
type Mode = "sample" | "custom";
type Background = "none" | NatureBed;
const initialLanguage = (locale:PublicLocale):VoiceLanguage => locale==="ru"?"ru":"en";
const text = {
  ru:{
    title:"Голоса для вашей медитации",eyebrow:"VOICE STUDIO · БЕСПЛАТНЫЙ ПИЛОТ",
    intro:"Сравните шесть голосов на русском и английском, затем создайте короткий аудиофрагмент. Для фонового звука используем собственные дорожки Holistic House.",
    language:"Язык",male:"Мужские голоса",female:"Женские голоса",low:"Низкий",medium:"Средний",high:"Высокий",
    sample:"Образец без личных данных",custom:"Мой текст",personal:"Взять текст из моей медитации",
    customLabel:"Текст озвучки (до 650 знаков)",customPlaceholder:"Напишите небольшой спокойный отрывок…",
    consent:"Разрешаю отправить этот текст в Google Gemini или, если Google недоступен, через OpenRouter к xAI. Не отправляю личные и медицинские сведения. У провайдеров разные правила обработки данных; бесплатные запросы Google могут использоваться для улучшения сервисов.",
    register:"Для озвучки персональной медитации необходим вход в личный кабинет. Бесплатные образцы можно слушать без входа.",guestText:"Короткий собственный текст доступен без входа: до 3 попыток в час с одного подключения. Не вводите личные или медицинские сведения.",
    background:"Природный фон",none:"Без фона",ocean:"Море",rain:"Дождь",breeze:"Ветер",
    generate:"Создать голос по API",loading:"Генерация аудио…",voice:"Только голос · WAV",mixed:"Скачать WAV с природой",prepareMix:"Подготовить WAV с природой",mixing:"Смешиваем дорожки…",
    unavailable:"Генерация сейчас недоступна. Проверьте подключение Gemini и бесплатный тариф проекта.",
    ready:"Озвучка настроена. Создайте короткий образец, чтобы проверить доступность.",error:"Не удалось создать запись. Попробуйте другой голос.",quota:"Бесплатная квота исчерпана. Платный рендер не запускается.",signIn:"Для своего текста войдите в кабинет.",privacy:"Превью образца не отправляет личные данные. Свой текст передаётся Google только после отдельного согласия и нажатия кнопки.",
    mixedError:"Невозможно создать звуковую смесь в этом браузере. Скачайте голос отдельно.",audio:"Прослушивание с выбранным фоном",notice:"Голоса — выбранные профили; итоговое звучание требует прослушивания на обоих языках.",
    noText:"Напишите текст или выберите фрагмент из медитации.",noConsent:"Для передачи своего текста требуется согласие.",general:"API временно недоступен.",
    sourceAdded:"Добавлен короткий фрагмент медитации. Проверьте текст перед отправкой.",backupUsed:"Использован резерв OpenRouter/xAI."
  },
  en:{
    title:"Voices for your meditation",eyebrow:"VOICE STUDIO · FREE PILOT",
    intro:"Compare six English and Russian voices, then create a short spoken recording. Nature tracks are original Holistic House audio.",
    language:"Language",male:"Male voices",female:"Female voices",low:"Low",medium:"Medium",high:"High",
    sample:"Public sample, no personal text",custom:"My own script",personal:"Use my meditation text",
    customLabel:"Narration text (up to 650 characters)",customPlaceholder:"Write a short, gentle passage…",
    consent:"I agree to send this text to Google Gemini or, if unavailable, to xAI through OpenRouter. I will not include medical or identifying details. Provider privacy policies apply; free Google inputs may be used to improve services.",
    register:"Sign in to generate a personal meditation excerpt. Public samples require no account.",guestText:"Short original text works without sign-in, up to 3 requests per connection per hour. Do not include identifying or medical information.",
    background:"Nature background",none:"No background",ocean:"Ocean",rain:"Rain",breeze:"Breeze",
    generate:"Generate voice via API",loading:"Generating audio…",voice:"Download voice · WAV",mixed:"Download nature WAV",prepareMix:"Prepare nature WAV",mixing:"Mixing audio…",
    unavailable:"Cloud generation is unavailable. Check the Gemini connection and free-tier settings.",
    ready:"Voice generation is configured. Generate a short sample to check availability.",error:"Could not generate audio. Please try another voice.",quota:"Free quota is exhausted. No paid rendering will be used.",signIn:"Sign in to generate your own script.",privacy:"Public samples never transmit personal text. Your script is sent to Google only after separate consent and a button click.",
    mixedError:"Could not mix audio in this browser. You can still download voice-only WAV.",audio:"Preview with selected background",notice:"Voices are curated profiles, pending real listening checks in both languages.",
    noText:"Enter your text or use a meditation excerpt.",noConsent:"Your explicit consent is required before transmitting text.",general:"API is temporarily unavailable.",
    sourceAdded:"A short excerpt was copied from your meditation. Review it before sending.",backupUsed:"OpenRouter/xAI backup was used."
  },
  es:{
    title:"Voces para tu meditación",eyebrow:"VOICE STUDIO · PILOTO GRATUITO",
    intro:"Compara seis voces en inglés y ruso y crea una grabación corta. Los sonidos naturales pertenecen a Holistic House.",
    language:"Idioma",male:"Voces masculinas",female:"Voces femeninas",low:"Grave",medium:"Media",high:"Aguda",
    sample:"Prueba pública sin datos privados",custom:"Mi propio texto",personal:"Usar el texto de mi meditación",
    customLabel:"Texto narrado (máximo 650 caracteres)",customPlaceholder:"Escribe un pasaje breve y tranquilo…",
    consent:"Autorizo enviar este texto a Google Gemini o, si falla, a xAI mediante OpenRouter. No incluyo datos médicos ni privados. Se aplican las políticas de los proveedores; Google puede usar los datos gratuitos para mejorar servicios.",
    register:"Inicia sesión para generar un fragmento de tu meditación personal.",guestText:"Un texto breve funciona sin registro, hasta 3 intentos por hora por conexión. No incluyas datos personales ni médicos.",
    background:"Sonido natural",none:"Sin sonido",ocean:"Mar",rain:"Lluvia",breeze:"Brisa",
    generate:"Generar voz por API",loading:"Generando audio…",voice:"Descargar voz · WAV",mixed:"Descargar WAV con naturaleza",prepareMix:"Preparar WAV con naturaleza",mixing:"Mezclando audio…",
    unavailable:"La generación aún no está habilitada; hace falta una clave independiente de Google AI Studio sin facturación.",
    ready:"La generación de voz está configurada. Crea una muestra para comprobar su disponibilidad.",error:"No se pudo generar audio. Prueba otra voz.",quota:"Cuota gratuita agotada. No se ejecutarán renders de pago.",signIn:"Inicia sesión para usar texto propio.",privacy:"Las muestras públicas no envían datos personales. Tu texto solo se envía con consentimiento explícito.",
    mixedError:"No se pudo mezclar en este navegador. Descarga la voz por separado.",audio:"Escuchar con sonido natural",notice:"Los perfiles deben verificarse auditivamente en ambos idiomas.",
    noText:"Escribe un texto o usa tu meditación.",noConsent:"Necesitas dar consentimiento explícito.",general:"El API no está disponible.",
    sourceAdded:"Se copió un fragmento de tu meditación. Revísalo antes de enviar.",backupUsed:"Se usó el respaldo OpenRouter/xAI."
  }
} as const;

export function MandalaCloudVoiceStudio({locale,sourceText="",ambientSrc=null}:{
  locale:PublicLocale;sourceText?:string;ambientSrc?:string|null
}) {
  const t=text[locale];
  const titleId=useId();
  const [language,setLanguage]=useState<VoiceLanguage>(initialLanguage(locale));
  const [voiceId,setVoiceId]=useState("mark");
  const [mode,setMode]=useState<Mode>("sample");
  const [script,setScript]=useState("");
  const [personalText,setPersonalText]=useState(false);
  const [consent,setConsent]=useState(false);
  const [background,setBackground]=useState<Background>("ocean");
  const [available,setAvailable]=useState(false);
  const [checking,setChecking]=useState(true);
  const [busy,setBusy]=useState(false);
  const [mixing,setMixing]=useState(false);
  const [audioUrl,setAudioUrl]=useState("");
  const [mixedUrl,setMixedUrl]=useState("");
  const [wav,setWav]=useState<Blob|null>(null);
  const [notice,setNotice]=useState("");
  const latestRef=useRef(0);
  const mixJobRef=useRef(0);
  const urlRef=useRef("");
  const mixedRef=useRef("");
  const natureRef=useRef<HTMLAudioElement|null>(null);
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const controllerRef=useRef<AbortController|null>(null);

  useEffect(()=>{
    const abort=new AbortController();
    void fetch("/api/holistic-support/voice",{signal:abort.signal,cache:"no-store"})
      .then(async result=>{if(!result.ok)throw new Error("STATUS");return result.json();})
      .then(data=>setAvailable(data.enabled===true))
      .catch(()=>{if(!abort.signal.aborted)setAvailable(false);})
      .finally(()=>{if(!abort.signal.aborted)setChecking(false);});
    return ()=>abort.abort();
  },[]);
  useEffect(()=>()=> {
    controllerRef.current?.abort();
    latestRef.current++;
    mixJobRef.current++;
    natureRef.current?.pause();
    audioRef.current?.pause();
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    if(mixedRef.current)URL.revokeObjectURL(mixedRef.current);
  },[]);
  function resetAudio(){
    latestRef.current++;
    mixJobRef.current++;
    setMixing(false);
    controllerRef.current?.abort();
    audioRef.current?.pause();
    natureRef.current?.pause();
    if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current="";}
    if(mixedRef.current){URL.revokeObjectURL(mixedRef.current);mixedRef.current="";}
    setMixedUrl("");setAudioUrl("");setWav(null);setNotice("");
    setBusy(false);
  }
  function sourceToText(){
    resetAudio();
    const excerpt=studioExcerpt(sourceText);
    setMode("custom");setPersonalText(true);setScript(excerpt);setConsent(false);
    setNotice(excerpt?t.sourceAdded:t.noText);
  }
  async function generate(){
    if(!available||busy)return;
    if(mode==="custom"&&!script.trim()){setNotice(t.noText);return;}
    if(mode==="custom"&&!consent){setNotice(t.noConsent);return;}
    resetAudio();
    setBusy(true);
    const token=++latestRef.current;
    const abort=new AbortController();
    controllerRef.current=abort;
    try{
      const apiMode=mode==="sample"?"sample":personalText?"custom":"short_text";
      const body=apiMode==="sample"?{mode:apiMode,voiceId,language}:
        {mode:apiMode,voiceId,language,text:script.trim(),consent:true};
      const response=await fetch("/api/holistic-support/voice",{
        method:"POST",signal:abort.signal,cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
      });
      if(!response.ok){
        const payload=await response.json().catch(()=>({error:""}));
        const code=payload?.error;
        if(response.status===401||code==="SIGN_IN_REQUIRED")throw new Error("SIGN_IN");
        if(response.status===429||code==="TTS_FREE_QUOTA_EXHAUSTED")throw new Error("QUOTA");
        throw new Error("PROVIDER");
      }
      const blob=await response.blob();
      if(!blob.type.includes("audio/")||blob.size<48)throw new Error("PROVIDER");
      if(token!==latestRef.current)return;
      const next=URL.createObjectURL(blob);
      urlRef.current=next;setWav(blob);setAudioUrl(next);
      setNotice(response.headers.get("X-HH-Voice-Provider")==="openrouter"?t.backupUsed:"");
    }catch(error){
      if(token!==latestRef.current)return;
      const code=error instanceof Error?error.message:"";
      if(code==="SIGN_IN")setNotice(t.signIn);
      else if(code==="QUOTA")setNotice(t.quota);
      else if(code!=="AbortError")setNotice(t.error);
    }finally {
      if(token===latestRef.current){setBusy(false);controllerRef.current=null;}
    }
  }
  function stopNature(){natureRef.current?.pause();natureRef.current=null;}
  function playNature(){
    stopNature();
    if(background==="none")return;
    const player=new Audio(presetAudioUrl(background));
    player.volume=0.14;player.loop=true;player.preload="auto";
    natureRef.current=player;
    void player.play().catch(()=>{stopNature();});
  }
  function downloadVoice(){
    if(!audioUrl)return;
    const link=document.createElement("a");
    link.href=audioUrl;link.download="holistic-house-"+language+"-"+voiceId+".wav";
    document.body.append(link);link.click();link.remove();
  }
  async function downloadMixed(){
    if(!wav||background==="none"||mixing)return;
    setMixing(true);setNotice("");
    const token=++mixJobRef.current;
    try{
      const mixed=await mixVoiceWithNature(wav,background);
      if(token!==mixJobRef.current)return;
      const uri=URL.createObjectURL(mixed);
      if(mixedRef.current)URL.revokeObjectURL(mixedRef.current);
      mixedRef.current=uri;
      setMixedUrl(uri);
      // Safari needs a genuine second tap on an <a download> element; an
      // asynchronous synthetic click after OfflineAudioContext is unreliable.
    }catch{if(token===mixJobRef.current)setNotice(t.mixedError);}
    finally{if(token===mixJobRef.current)setMixing(false);}
  }
  function chooseBackground(value:Background) {
    mixJobRef.current++;
    setMixing(false);
    audioRef.current?.pause();stopNature();
    if(mixedRef.current){URL.revokeObjectURL(mixedRef.current);mixedRef.current="";}
    setMixedUrl("");setBackground(value);
  }
  const groups=["male","female"] as const;
  return (
    <section className={css.shell} data-voice-studio lang={locale} aria-labelledby={titleId}>
      <header className={css.heading}>
        <div className={css.emblem}><Headphones size={22} aria-hidden="true"/></div>
        <div><small>{t.eyebrow}</small><h2 id={titleId}>{t.title}</h2></div>
      </header>
      <p className={css.intro}>{t.intro}</p>
      <div className={css.language} role="group" aria-label={t.language}>
        {(["ru","en"] as const).map(lang=>
          <button key={lang} type="button" aria-pressed={lang===language}
            onClick={()=>{resetAudio();setLanguage(lang);}}>
            {lang==="ru"?"Русский":"English"}
          </button>)}
      </div>
      {groups.map(group=>(
        <div key={group} className={css.group}>
          <h3>{group==="male"?t.male:t.female}</h3>
          <div className={css.voices}>
            {VOICE_STUDIO_VOICES.filter(voice=>voice.gender===group).map(voice=>
              <button type="button" key={voice.id} data-voice-id={voice.id}
                aria-pressed={voice.id===voiceId} onClick={()=>{resetAudio();setVoiceId(voice.id);}}
                className={css.voice}>
                <span className={css.voiceTop}><span>{voice.name[locale]}</span>
                  <small>{voice.pitch==="low"?t.low:voice.pitch==="high"?t.high:t.medium}</small>
                </span>
                <span className={css.voiceDescription}>{voice.description[locale]}</span>
                <span className={css.provider}>{voice.provider}</span>
              </button>)}
          </div>
        </div>
      ))}
      <fieldset className={css.options}>
        <legend>{t.customLabel}</legend>
        <div className={css.language} role="group" aria-label={t.customLabel}>
          <button type="button" aria-pressed={mode==="sample"}
            onClick={()=>{resetAudio();setMode("sample");setConsent(false);}}>{t.sample}</button>
          <button type="button" aria-pressed={mode==="custom"}
            onClick={()=>{resetAudio();setMode("custom");setPersonalText(false);setConsent(false);}}>{t.custom}</button>
        </div>
        {mode==="custom"?<>
          {sourceText?<button type="button" className={css.fromMeditation} onClick={sourceToText}>
            <Sparkles size={15} aria-hidden="true"/>{t.personal}
          </button>:null}
          <label className={css.textLabel}>{t.customLabel}
            <textarea value={script} maxLength={VOICE_STUDIO_MAX_CHARS} rows={5}
              placeholder={t.customPlaceholder} onChange={event=>{resetAudio();setScript(event.currentTarget.value);setConsent(false);}}/>
          </label>
          <span className={css.count}>{Array.from(script).length} / {VOICE_STUDIO_MAX_CHARS}</span>
          <label className={css.consent}><input type="checkbox" checked={consent}
            onChange={event=>setConsent(event.currentTarget.checked)}/><span>{t.consent}</span></label>
          <p className={css.hint}>{personalText?t.register:t.guestText}</p>
        </>:null}
      </fieldset>
      <div className={css.background}>
        <h3><Leaf size={16} aria-hidden="true"/>{t.background}</h3>
        <div className={css.language} role="group" aria-label={t.background}>
          {(["none","ocean","rain","breeze"] as const).map(value=>
            <button key={value} type="button" aria-pressed={background===value}
              onClick={()=>chooseBackground(value)}>
              {t[value]}
            </button>)}
        </div>
      </div>
      {ambientSrc?<p className={css.hint}>{locale==="ru"?"В этой версии природный фон берётся из авторской библиотеки; выбранная ранее дорожка не отправляется провайдеру.":"This pilot uses the first-party nature library; existing editor audio is never uploaded to Google."}</p>:null}
      <p role="status" className={available?css.ready:css.unavailable}>
        {checking?t.general:available?t.ready:t.unavailable}
      </p>
      <button type="button" className={css.primary} data-voice-studio-generate
        disabled={!available||busy||mixing||(mode==="custom"&&(!consent||!script.trim()))}
        onClick={()=>void generate()}>
        {busy?<LoaderCircle size={19} aria-hidden="true"/>:<Play size={19} aria-hidden="true"/>}
        {busy?t.loading:t.generate}
      </button>
      {audioUrl?<div className={css.result} data-voice-studio-audio>
        <strong>{t.audio}</strong>
        <audio ref={audioRef} controls preload="none" src={mixedUrl||audioUrl} onPlay={mixedUrl?undefined:playNature}
          onPause={stopNature} onEnded={stopNature} aria-label={t.audio}/>
        <div className={css.downloads}>
          <button type="button" onClick={downloadVoice}><Download size={16} aria-hidden="true"/>{t.voice}</button>
          {background!=="none"?(mixedUrl?<a className={css.downloadLink} href={mixedUrl}
            download={"holistic-house-"+language+"-"+voiceId+"-"+background+".wav"}>
            <Download size={16} aria-hidden="true"/>{t.mixed}
          </a>:<button type="button" disabled={mixing} onClick={()=>void downloadMixed()}>
            <Download size={16} aria-hidden="true"/>{mixing?t.mixing:t.prepareMix}
          </button>):null}
        </div>
      </div>:null}
      {notice?<p role="status" aria-live="polite" className={css.error}>{notice}</p>:null}
      <p className={css.hint}>{t.privacy}</p>
      <p className={css.hint}>{t.notice}</p>
    </section>
  );
}
