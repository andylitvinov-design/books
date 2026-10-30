"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Headphones, Leaf, LoaderCircle, Play, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { presetAudioUrl } from "@/lib/mandala/local-video-music";
import { mixVoiceWithNature } from "@/lib/mandala/voice-audio-mix";
import { VOICE_BED_PRESETS } from "@/lib/mandala/voice-audio-mix";
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
    consent:"Я разрешаю отправить именно этот текст в Google для генерации голоса. Я понимаю, что данные бесплатного тарифа могут использоваться Google для улучшения продуктов. Не отправляю личные и медицинские сведения.",
    register:"Для озвучки собственного текста необходим вход в личный кабинет. Бесплатные образцы можно прослушивать без входа.",
    background:"Природный фон",none:"Без фона",ocean:"Море",rain:"Дождь",breeze:"Ветер",
    generate:"Создать голос по API",loading:"Генерация аудио…",voice:"Только голос · WAV",mixed:"Скачать WAV с природой",prepareMix:"Подготовить WAV с природой",mixing:"Смешиваем дорожки…",
    unavailable:"Облачная генерация пока не активирована: нужен отдельный ключ Google AI Studio из проекта без биллинга.",
    ready:"Бесплатный API подключён. Создайте короткий образец.",error:"Не удалось создать запись. Попробуйте другой голос.",quota:"Бесплатная квота исчерпана. Платный рендер не запускается.",signIn:"Для своего текста войдите в кабинет.",privacy:"Превью образца не отправляет личные данные. Свой текст передаётся Google только после отдельного согласия и нажатия кнопки.",
    mixedError:"Невозможно создать звуковую смесь в этом браузере. Скачайте голос отдельно.",audio:"Прослушивание с выбранным фоном",notice:"Голоса — выбранные профили; итоговое звучание требует прослушивания на обоих языках.",
    noText:"Напишите текст или выберите фрагмент из медитации.",noConsent:"Для передачи своего текста требуется согласие.",general:"API временно недоступен.",
    sourceAdded:"Добавлен короткий фрагмент медитации. Проверьте текст перед отправкой."
  },
  en:{
    title:"Voices for your meditation",eyebrow:"VOICE STUDIO · FREE PILOT",
    intro:"Compare six English and Russian voices, then create a short spoken recording. Nature tracks are original Holistic House audio.",
    language:"Language",male:"Male voices",female:"Female voices",low:"Low",medium:"Medium",high:"High",
    sample:"Public sample, no personal text",custom:"My own script",personal:"Use my meditation text",
    customLabel:"Narration text (up to 650 characters)",customPlaceholder:"Write a short, gentle passage…",
    consent:"I explicitly consent to sending this exact text to Google for voice generation. I understand free-tier data may be used to improve Google's products. I will not send medical or identifying information.",
    register:"Sign in to your account for your own text. Public voice samples do not require an account.",
    background:"Nature background",none:"No background",ocean:"Ocean",rain:"Rain",breeze:"Breeze",
    generate:"Generate voice via API",loading:"Generating audio…",voice:"Download voice · WAV",mixed:"Download nature WAV",prepareMix:"Prepare nature WAV",mixing:"Mixing audio…",
    unavailable:"Cloud generation is not enabled yet: a separate Google AI Studio key from a billing-disabled project is required.",
    ready:"Free API is connected. Generate a short sample.",error:"Could not generate audio. Please try another voice.",quota:"Free quota is exhausted. No paid rendering will be used.",signIn:"Sign in to generate your own script.",privacy:"Public samples never transmit personal text. Your script is sent to Google only after separate consent and a button click.",
    mixedError:"Could not mix audio in this browser. You can still download voice-only WAV.",audio:"Preview with selected background",notice:"Voices are curated profiles, pending real listening checks in both languages.",
    noText:"Enter your text or use a meditation excerpt.",noConsent:"Your explicit consent is required before transmitting text.",general:"API is temporarily unavailable.",
    sourceAdded:"A short excerpt was copied from your meditation. Review it before sending."
  },
  es:{
    title:"Voces para tu meditación",eyebrow:"VOICE STUDIO · PILOTO GRATUITO",
    intro:"Compara seis voces en inglés y ruso y crea una grabación corta. Los sonidos naturales pertenecen a Holistic House.",
    language:"Idioma",male:"Voces masculinas",female:"Voces femeninas",low:"Grave",medium:"Media",high:"Aguda",
    sample:"Prueba pública sin datos privados",custom:"Mi propio texto",personal:"Usar el texto de mi meditación",
    customLabel:"Texto narrado (máximo 650 caracteres)",customPlaceholder:"Escribe un pasaje breve y tranquilo…",
    consent:"Autorizo enviar exactamente este texto a Google. Sé que el nivel gratuito puede usar datos para mejorar sus productos. No enviaré datos médicos ni personales.",
    register:"Debes iniciar sesión para generar tu propio texto. Las pruebas públicas no lo requieren.",
    background:"Sonido natural",none:"Sin sonido",ocean:"Mar",rain:"Lluvia",breeze:"Brisa",
    generate:"Generar voz por API",loading:"Generando audio…",voice:"Descargar voz · WAV",mixed:"Descargar WAV con naturaleza",prepareMix:"Preparar WAV con naturaleza",mixing:"Mezclando audio…",
    unavailable:"La generación aún no está habilitada; hace falta una clave independiente de Google AI Studio sin facturación.",
    ready:"El API gratuito está conectado. Genera una prueba.",error:"No se pudo generar audio. Prueba otra voz.",quota:"Cuota gratuita agotada. No se ejecutarán renders de pago.",signIn:"Inicia sesión para usar texto propio.",privacy:"Las muestras públicas no envían datos personales. Tu texto solo se envía con consentimiento explícito.",
    mixedError:"No se pudo mezclar en este navegador. Descarga la voz por separado.",audio:"Escuchar con sonido natural",notice:"Los perfiles deben verificarse auditivamente en ambos idiomas.",
    noText:"Escribe un texto o usa tu meditación.",noConsent:"Necesitas dar consentimiento explícito.",general:"El API no está disponible.",
    sourceAdded:"Se copió un fragmento de tu meditación. Revísalo antes de enviar."
  }
} as const;
const balanceCopy={
  ru:{voice:"Громкость голоса",music:"Громкость музыки",mix:"Подготовить WAV с выбранным балансом",save:"Скачать сведённый WAV",other:"Другие авторские фоны",note:"Баланс сохраняется в скачиваемом WAV. Для итогового видео прикрепите этот WAV через «Добавить аудиофайл»."},
  en:{voice:"Voice volume",music:"Music volume",mix:"Prepare balanced WAV",save:"Download balanced WAV",other:"More original soundtracks",note:"Your levels are embedded in the WAV. To use it in a video, attach this WAV with Add audio file."},
  es:{voice:"Volumen de voz",music:"Volumen de música",mix:"Preparar WAV equilibrado",save:"Descargar WAV mezclado",other:"Otros fondos originales",note:"Los niveles se guardan en el WAV. Para usarlo en un vídeo, adjunta el archivo en Añadir audio."}
} as const;
const extraBeds = VOICE_BED_PRESETS.filter(value=>!["ocean","rain","breeze"].includes(value));
const bedNames:Record<string,{ru:string;en:string;es:string}>={
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

export function MandalaCloudVoiceStudio({locale,sourceText="",ambientSrc=null}:{
  locale:PublicLocale;sourceText?:string;ambientSrc?:string|null
}) {
  const t=text[locale];
  const b=balanceCopy[locale];
  const [language,setLanguage]=useState<VoiceLanguage>(initialLanguage(locale));
  const [voiceId,setVoiceId]=useState("mark");
  const [mode,setMode]=useState<Mode>("sample");
  const [script,setScript]=useState("");
  const [consent,setConsent]=useState(false);
  const [background,setBackground]=useState<Background>("ocean");
  const [voiceLevel,setVoiceLevel]=useState(90);
  const [musicLevel,setMusicLevel]=useState(12);
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
  useEffect(()=>{
    if(audioRef.current)audioRef.current.volume=mixedUrl?1:voiceLevel/100;
    if(natureRef.current)natureRef.current.volume=musicLevel/100;
  },[voiceLevel,musicLevel,mixedUrl]);
  function invalidateMix(stop=false){
    mixJobRef.current++;
    setMixing(false);
    if(stop){audioRef.current?.pause();stopNature();}
    if(mixedRef.current){URL.revokeObjectURL(mixedRef.current);mixedRef.current="";}
    setMixedUrl("");
  }
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
    setMode("custom");setScript(excerpt);setConsent(false);
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
      const body=mode==="sample"?{mode,voiceId,language}:
        {mode,voiceId,language,text:script.trim(),consent:true};
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
      urlRef.current=next;setWav(blob);setAudioUrl(next);setNotice("");
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
    player.volume=musicLevel/100;player.loop=true;player.preload="auto";
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
    if(!wav||mixing)return;
    setMixing(true);setNotice("");
    const token=++mixJobRef.current;
    try{
      const mixed=await mixVoiceWithNature(wav,background,undefined,{voiceLevel,musicLevel});
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
    invalidateMix(true);setBackground(value);
  }
  function changeLevel(kind:"voice"|"music",value:number){
    invalidateMix();
    if(kind==="voice"){
      setVoiceLevel(value);
      if(audioRef.current)audioRef.current.volume=value/100;
    } else {
      setMusicLevel(value);
      if(natureRef.current)natureRef.current.volume=value/100;
    }
  }
  const groups=["male","female"] as const;
  return (
    <section className={css.shell} data-voice-studio lang={locale} aria-labelledby="voice-studio-title">
      <header className={css.heading}>
        <div className={css.emblem}><Headphones size={22} aria-hidden="true"/></div>
        <div><small>{t.eyebrow}</small><h2 id="voice-studio-title">{t.title}</h2></div>
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
            onClick={()=>{resetAudio();setMode("custom");setConsent(false);}}>{t.custom}</button>
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
          <p className={css.hint}>{t.register}</p>
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
        <label className={css.moreBeds}>{b.other}
          <select data-voice-background-extra value={extraBeds.includes(background as NatureBed)?background:""}
            onChange={event=>{if(event.currentTarget.value)chooseBackground(event.currentTarget.value as NatureBed);}}>
            <option value="">—</option>
            {extraBeds.map(value=><option key={value} value={value}>{bedNames[value]?.[locale]||value}</option>)}
          </select>
        </label>
      </div>
      <div className={css.levels} role="group" aria-label={b.voice+" / "+b.music}>
        <label>{b.voice} · {voiceLevel}%
          <input data-voice-volume type="range" min={0} max={100} step={5} value={voiceLevel}
            onChange={event=>changeLevel("voice",Number(event.currentTarget.value))}/>
        </label>
        <label>{b.music} · {musicLevel}%
          <input data-music-volume type="range" min={0} max={100} step={5} value={musicLevel}
            disabled={background==="none"}
            onChange={event=>changeLevel("music",Number(event.currentTarget.value))}/>
        </label>
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
          {mixedUrl?<a className={css.downloadLink} href={mixedUrl}
            download={"holistic-house-"+language+"-"+voiceId+"-"+background+".wav"}>
            <Download size={16} aria-hidden="true"/>{b.save}
          </a>:<button type="button" disabled={mixing} onClick={()=>void downloadMixed()}>
            <Download size={16} aria-hidden="true"/>{mixing?t.mixing:b.mix}
          </button>}
        </div>
      </div>:null}
      {notice?<p role="status" aria-live="polite" className={css.error}>{notice}</p>:null}
      <p className={css.hint}>{b.note}</p>
      <p className={css.hint}>{t.privacy}</p>
      <p className={css.hint}>{t.notice}</p>
    </section>
  );
}
