"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import {
  ArrowRight, AudioLines, ChevronDown, Eye, Headphones, Image as Picture,
  MapPin, Mic, Play, Quote, Sparkles, Sun, Waves,
} from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { AffirmationSettings } from "@/lib/mandala/video-affirmations";
import styles from "./mandala-hypnocorrection-mobile.module.css";

export type HypnoLightSettings = { enabled: boolean; cyclesPerMinute: number; opacity: number };
type GroupId = "phrases" | "visual" | "audio";
type Props = {
  locale: PublicLocale;
  disabled: boolean;
  affirmations: AffirmationSettings;
  onAffirmationsChange: (settings: AffirmationSettings) => void;
  light: HypnoLightSettings;
  onLightChange: (next: HypnoLightSettings) => void;
  onOpenPhraseEditor: () => void;
  voiceEditor?: ReactNode;
  onToggleVoice: () => void;
  whisperEnabled: boolean;
  binauralEnabled: boolean;
  beatHz: number;
  repeatEverySeconds: number;
  whisperGain: number;
  audioEffectBusy: boolean;
  onToggleWhisper: () => void;
  onToggleBinaural: () => void;
  onBeatHzChange: (value: number) => void;
  onRepeatEveryChange: (value: number) => void;
  onWhisperGainChange: (value: number) => void;
  onOpenScenes: () => void;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  onPreview: () => void;
  onCreate: () => void;
  onWavePreset: () => void;
  hasPhoto: boolean;
  hasVoiceFile: boolean;
  voiceActive: boolean;
  posters: Record<GroupId,string>;
};

const copy = {
  ru: {
    title:"Гипнокоррекция",sub:"Добавьте медитацию, визуальные эффекты, звук и слова поддержки",
    wave:"Быстрая настройка с Wave",waveHelp:"Подберёт мягкие эффекты по вашей цели",try:"Попробовать",
    suggested:"Предложен мягкий световой ритм и видимые фразы. Измените любой пункт или отключите его.",
    phrases:"Установки и внушения",phrasesHelp:"Слова поддержки и настройки",
    text:"Текст на экране",textHelp:"Фразы в вашем видео",
    frame:"25-й кадр",frameHelp:"Короткие вставки",
    repeat:"Повторы в аудио",repeatHelp:"Частота и паузы",
    audio:"Аудио",audioHelp:"Голос, гипнозвук и ритмы",
    speech:"Озвучка фраз",speechHelp:"Ваш голос или разрешённая запись",
    whisper:"Гипнозвук",whisperHelp:"Тихие повторы речи",
    binaural:"Бинауральные ритмы",binauralHelp:"Тихий стереоритм для наушников",
    visual:"Визуальные эффекты",visualHelp:"Образы, свет и движение",
    light:"Импульс света",lightHelp:"Волны, лучи и мандала",
    places:"Места силы",placesHelp:"Сцены из каталога",
    photo:"Личное фото",photoHelp:"Ваш снимок с правами",
    meditation:"Личная медитация",meditationHelp:"Текст под вашу цель",
    generateMeditation:"Создать личную медитацию",meditationDetail:"Текст по вашей цели и утверждённым фразам.",
    settings:"Настроить",selected:"Включено",disabled:"Выключено",
    rhythm:"Темп плавных волн",intensity:"Интенсивность",cycles:"циклов/мин",
    voiceHint:"Сначала создайте голосовую дорожку выбранных фраз. Она будет добавлена прямо в это видео.",
    pending:"Для тихих повторов сначала создайте и прослушайте озвучку фраз выше.",
    beatHint:"Нужны стереонаушники. Эффект добавляется в звуковую дорожку; это не медицинская процедура и не гарантирует изменения состояния.",
    effectBusy:"Подготавливаем аудиодорожку…",
    science:"Короткие кадры — экспериментальный эффект; нет доказательств коррекции убеждений. Без мигания и медицинских обещаний.",
    meditationDuration:"Длительность",meditationTime:"3 / 5 / 8 / 12 мин",meditationStyle:"Стиль",meditationStyles:"Расслабление · Энергия",meditationVoice:"Голос",meditationVoices:"Голос устройства или свой",
    create:"Сформировать видео",credits:"0 кредитов · локальное создание",
    preview:"Проверить в основном видео",privacy:"Бесплатные эффекты выполняются локально. Персональные файлы не отправляются стороннему ИИ.",
  },
  en: {
    title:"Audio-visual support",sub:"Optional ways to present your personal video",
    wave:"Quick setup with Wave",waveHelp:"Suggests suitable effects based on your goal",try:"Try it",
    suggested:"Gentle light waves and visible phrases suggested. You can edit or disable any effect.",
    phrases:"Phrases and suggestions",phrasesHelp:"Supportive words and timing",
    text:"On-screen text",textHelp:"Readable phrases from your selection",
    frame:"Brief frame",frameHelp:"Short inserts · experimental",
    repeat:"Audio repetition",repeatHelp:"Pauses and speech frequency",
    audio:"Audio",audioHelp:"Voice and sound layers",
    speech:"Spoken phrases",speechHelp:"Your voice or permitted audio",
    whisper:"Quiet speech",whisperHelp:"Low-volume audible repetitions",
    binaural:"Binaural beats",binauralHelp:"Quiet stereo beat for headphones",
    visual:"Visual effects",visualHelp:"Light, images and motion",
    light:"Light and energy pulse",lightHelp:"Waves, rays and mandala without flashes",
    places:"Meaningful places",placesHelp:"Choose from existing video scenes",
    photo:"Personal photo",photoHelp:"Your photo with rights confirmation",
    meditation:"Personal meditation",meditationHelp:"A script for your goal",
    generateMeditation:"Create meditation",meditationDetail:"Opens the existing script editor with local voice preview.",
    settings:"Configure",selected:"On",disabled:"Off",
    rhythm:"Smooth wave tempo",intensity:"Intensity",cycles:"cycles/min",
    voiceHint:"Create a voice track from your selected phrases first. It will be attached directly to this video.",
    pending:"Create and listen to the spoken phrases above before enabling quiet repetitions.",
    beatHint:"Stereo headphones are required. This is an optional audio effect, not a medical treatment or a guaranteed way to change your state.",
    effectBusy:"Preparing the audio track…",
    science:"Brief frames are experimental; no proven subconscious effects. No strobe flashes or clinical claims.",
    meditationDuration:"Duration",meditationTime:"3 / 5 / 8 / 12 min",meditationStyle:"Style",meditationStyles:"Calm · Energy",meditationVoice:"Voice",meditationVoices:"Device or your recording",
    create:"Create video",credits:"0 credits · created on your device",
    preview:"Preview in main video",privacy:"Free effects run on your device. Personal files are not sent to third-party AI.",
  },
  es: {
    title:"Apoyo audiovisual",sub:"Formas opcionales de presentar tu vídeo personal",
    wave:"Ajuste rápido con Wave",waveHelp:"Sugiere efectos adecuados según tu objetivo",try:"Probar",
    suggested:"Se sugieren ondas de luz suaves y frases visibles. Puedes cambiar o desactivar todo.",
    phrases:"Frases y sugerencias",phrasesHelp:"Palabras de apoyo y ritmo",
    text:"Texto en pantalla",textHelp:"Frases legibles de tu selección",
    frame:"Fotograma breve",frameHelp:"Inserciones cortas · experimental",
    repeat:"Repetición en audio",repeatHelp:"Pausas y frecuencia de voz",
    audio:"Audio",audioHelp:"Voz y efectos de sonido",
    speech:"Frases narradas",speechHelp:"Tu voz o voz autorizada de alguien cercano",
    whisper:"Voz tenue",whisperHelp:"Repeticiones audibles a bajo volumen",
    binaural:"Ritmos binaurales",binauralHelp:"Ritmo estéreo suave para auriculares",
    visual:"Efectos visuales",visualHelp:"Luz, imágenes y movimiento",
    light:"Pulso de luz y energía",lightHelp:"Ondas, rayos y mandala sin destellos",
    places:"Lugares especiales",placesHelp:"Elige una escena del catálogo existente",
    photo:"Foto personal",photoHelp:"Tu foto con confirmación de derechos",
    meditation:"Meditación personal",meditationHelp:"Texto según tu objetivo",
    generateMeditation:"Crear meditación",meditationDetail:"Abre el editor de guiones y la vista previa de voz local.",
    settings:"Configurar",selected:"Sí",disabled:"No",
    rhythm:"Ritmo de ondas suaves",intensity:"Intensidad",cycles:"ciclos/min",
    voiceHint:"Primero crea la pista de voz con tus frases elegidas. Se añadirá directamente a este vídeo.",
    pending:"Primero crea y escucha la voz de tus frases para poder repetirlas suavemente.",
    beatHint:"Se necesitan auriculares estéreo. Es un efecto de audio opcional, no un tratamiento médico ni garantiza cambios de estado.",
    effectBusy:"Preparando la pista de audio…",
    science:"Los fotogramas breves son experimentales y no tienen un efecto subliminal probado. Sin destellos.",
    meditationDuration:"Duración",meditationTime:"3 / 5 / 8 / 12 min",meditationStyle:"Estilo",meditationStyles:"Calma · Energía",meditationVoice:"Voz",meditationVoices:"Dispositivo o tu grabación",
    create:"Crear vídeo",credits:"0 créditos · creación local",
    preview:"Ver en el vídeo principal",privacy:"Los efectos gratuitos se ejecutan en tu dispositivo, sin enviar archivos a IA externa.",
  },
} as const;

function Feature({icon,title,help,active,onToggle,onConfigure,disabled,unavailable,settings,poster}:{
  icon:ReactNode;title:string;help:string;active:boolean;settings:string;poster?:string;
  onToggle?:()=>void;onConfigure:()=>void;disabled:boolean;unavailable?:boolean;
}){
  return <div className={styles.feature} data-hypno-card={title} data-photo={Boolean(poster)}>
    {poster?<>
      {/* First-party catalog preview, never a second video player. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.featurePoster} src={poster} alt="" loading="lazy"/>
    </>:<span className={styles.featureIcon} aria-hidden="true">{icon}</span>}
    <button type="button" className={styles.featureText} onClick={onConfigure}
      disabled={disabled} aria-label={title+": "+help}>
      <strong>{title}</strong><span>{help}</span>
      <span className={styles.configureLink}>{settings}<ArrowRight size={14} aria-hidden="true"/></span>
    </button>
    {onToggle?<button type="button" role="switch" className={styles.switch} aria-checked={active}
      aria-label={title} data-on={active} disabled={disabled||unavailable} onClick={onToggle}>
      <span/>
    </button>:<button type="button" className={styles.featureArrow} onClick={onConfigure}
      disabled={disabled} aria-label={title}><ArrowRight size={21}/></button>}
  </div>;
}

export function MandalaHypnocorrectionMobile({
  locale,disabled,affirmations,onAffirmationsChange,light,onLightChange,
  onOpenPhraseEditor,onOpenScenes,
  onPickPhoto,onRemovePhoto,onPreview,onCreate,onWavePreset,hasPhoto,hasVoiceFile,voiceActive,posters,
  voiceEditor,whisperEnabled,binauralEnabled,beatHz,repeatEverySeconds,whisperGain,audioEffectBusy,
  onToggleVoice,onToggleWhisper,onToggleBinaural,onBeatHzChange,onRepeatEveryChange,onWhisperGainChange,
}:Props) {
  const t=copy[locale];
  const [open,setOpen]=useState<GroupId[]>(["phrases","visual","audio"]);
  const [showLightSettings,setShowLightSettings]=useState(false);
  const [showSpeechSettings,setShowSpeechSettings]=useState(false);
  const [showWhisperSettings,setShowWhisperSettings]=useState(false);
  const [showBinauralSettings,setShowBinauralSettings]=useState(false);
  const [note,setNote]=useState<"wave"|"audio"|"voice"|"frame"|"">("");
  const [introTarget,setIntroTarget]=useState<HTMLElement|null>(null);
  useLayoutEffect(()=>{
    setIntroTarget(document.querySelector<HTMLElement>("[data-hypno-intro-slot]"));
  },[]);
  const visible=affirmations.enabled&&affirmations.visibility.includes("large");
  const briefFrame=affirmations.enabled&&affirmations.visibility.includes("frame");
  const toggleVisibility=(mode:"large"|"frame")=>{
    const visibility=affirmations.visibility.includes(mode)
      ?affirmations.visibility.filter(value=>value!==mode)
      :[...affirmations.visibility,mode];
    onAffirmationsChange({...affirmations,visibility,enabled:visibility.length>0});
  };
  const showNote=(value:"audio"|"voice"|"frame")=>{setNote(value);};
  const groups: {id:GroupId;title:string;help:string}[]=[
    {id:"phrases",title:t.phrases,help:t.phrasesHelp},
    {id:"visual",title:t.visual,help:t.visualHelp},
    {id:"audio",title:t.audio,help:t.audioHelp},
  ];
  const intro=<div className={styles.intro} data-hypno-intro>
    <div className={styles.heading}><h3>{t.title}</h3><p>{t.sub}</p></div>
    <section className={styles.wave}>
      <div className={styles.waveTop}><Sparkles size={29} aria-hidden="true"/>
        <div><strong>{t.wave}</strong><p>{t.waveHelp}</p></div></div>
      <button type="button" onClick={()=>{
        onWavePreset();setOpen(current=>current.includes("visual")?current:[...current,"visual"]);setShowLightSettings(true);setNote("wave");
      }} disabled={disabled} data-hypno-wave>
        {t.try}<ArrowRight size={20} aria-hidden="true"/>
      </button>
      {note==="wave"?<p role="status" className={styles.note}>{t.suggested}</p>:null}
    </section>
  </div>;
  return <section className={styles.panel} data-hypno-mobile lang={locale}
    aria-label={t.title}>
    {introTarget?createPortal(intro,introTarget):intro}
    {groups.map((group,index)=><section className={styles.group} data-hypno-group={group.id} key={group.id}>
      <button type="button" className={styles.groupHeader} aria-expanded={open.includes(group.id)}
        aria-controls={"hypno-group-"+group.id}
        onClick={()=>setOpen(current=>current.includes(group.id)?current.filter(id=>id!==group.id):[...current,group.id])}>
        {/* First-party scene posters; no duplicated player or third-party images. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={posters[group.id]} alt="" loading="lazy"/>
        <span className={styles.groupNumber} aria-hidden="true">{index+2}</span>
        <span className={styles.groupTitle}><strong>{group.title}</strong><small>{group.help}</small></span>
        <ChevronDown size={23} className={open.includes(group.id)?styles.expanded:styles.chevron} aria-hidden="true"/>
      </button>
      <div className={styles.groupContent} data-hypno-options id={"hypno-group-"+group.id} hidden={!open.includes(group.id)}>
        {group.id==="phrases"?<>
          <Feature icon={<Quote/>} title={t.text} help={t.textHelp}
            active={visible} onToggle={()=>toggleVisibility("large")} onConfigure={onOpenPhraseEditor} disabled={disabled} settings={t.settings}/>
          <Feature icon={<Eye/>} title={t.frame} help={t.frameHelp}
            active={briefFrame} onToggle={()=>{toggleVisibility("frame");showNote("frame");}}
            onConfigure={()=>showNote("frame")} disabled={disabled} settings={t.settings}/>
          {note==="frame"?<p role="note" className={styles.note}>{t.science}</p>:null}
        </>:null}
        {group.id==="audio"?<>
          <Feature icon={<Mic/>} title={t.speech} help={t.speechHelp}
            active={voiceActive} onToggle={()=>{
              if(!hasVoiceFile){setShowSpeechSettings(true);return;}
              onToggleVoice();
            }}
            onConfigure={()=>setShowSpeechSettings(value=>!value)} disabled={disabled||audioEffectBusy} settings={t.settings}/>
          {showSpeechSettings?<div className={styles.settings} data-hypno-speech-settings style={{gridColumn:"1 / -1"}}>
            {voiceEditor||<p className={styles.note}>{t.voiceHint}</p>}
          </div>:null}
          <Feature icon={<AudioLines/>} title={t.whisper} help={t.whisperHelp}
            active={whisperEnabled} onToggle={()=>{
              if(!hasVoiceFile){setShowSpeechSettings(true);setNote("voice");return;}
              onToggleWhisper();
            }} onConfigure={()=>setShowWhisperSettings(value=>!value)}
            disabled={disabled||audioEffectBusy} settings={t.settings}/>
          {showWhisperSettings?<div className={styles.settings} data-hypno-whisper-settings style={{gridColumn:"1 / -1"}}>
            <label>{locale==="ru"?"Пауза между повторами":locale==="es"?"Pausa entre repeticiones":"Pause between repetitions"} · {repeatEverySeconds} {locale==="ru"?"сек":"sec"}
              <input type="range" min="4" max="20" step="1" value={repeatEverySeconds}
                disabled={disabled||audioEffectBusy} onChange={event=>onRepeatEveryChange(Number(event.currentTarget.value))}/>
            </label>
            <label>{locale==="ru"?"Громкость повторов":locale==="es"?"Volumen de repeticiones":"Repetition volume"} · {whisperGain}%
              <input type="range" min="5" max="30" step="1" value={whisperGain}
                disabled={disabled||audioEffectBusy} onChange={event=>onWhisperGainChange(Number(event.currentTarget.value))}/>
            </label>
            <p className={styles.note}>{hasVoiceFile?locale==="ru"?"Фразы повторяются тихо, с паузой после каждой полной фразы.":locale==="es"?"Las frases se repiten suavemente, con una pausa después de cada frase completa.":"Phrases repeat quietly, with a pause after each complete phrase.":t.voiceHint}</p>
          </div>:null}
          <Feature icon={<Headphones/>} title={t.binaural} help={t.binauralHelp}
            active={binauralEnabled} onToggle={onToggleBinaural}
            onConfigure={()=>setShowBinauralSettings(value=>!value)} disabled={disabled||audioEffectBusy} settings={t.settings}/>
          {showBinauralSettings?<div className={styles.settings} data-hypno-binaural-settings style={{gridColumn:"1 / -1"}}>
            <label>{locale==="ru"?"Частота биения":locale==="es"?"Frecuencia del pulso":"Beat frequency"} · {beatHz} Hz
              <input type="range" min="1" max="12" step="1" value={beatHz}
                disabled={disabled||audioEffectBusy} onChange={event=>onBeatHzChange(Number(event.currentTarget.value))}/>
            </label>
            <p className={styles.note}>{t.beatHint}</p>
          </div>:null}
          {audioEffectBusy?<p className={styles.note} role="status" aria-live="polite" data-hypno-audio-effect-busy>{t.effectBusy}</p>:null}
          {note==="voice"?<p className={styles.note}>{t.voiceHint}</p>:null}
        </>:null}
        {group.id==="visual"?<>
          <Feature icon={<Sun/>} title={t.light} help={t.lightHelp} poster={posters.visual}
            active={light.enabled}
            onToggle={()=>onLightChange({...light,enabled:!light.enabled})}
            onConfigure={()=>setShowLightSettings(value=>!value)} disabled={disabled} settings={t.settings}/>
          {showLightSettings?<div className={styles.settings} data-hypno-light-settings>
            <label>{t.rhythm} <strong>{light.cyclesPerMinute} {t.cycles}</strong>
              <input type="range" min="5" max="8" step="1" value={light.cyclesPerMinute}
                disabled={disabled} onChange={event=>onLightChange({...light,cyclesPerMinute:Number(event.currentTarget.value)})}/>
            </label>
            <label>{t.intensity} <strong>{Math.round(light.opacity*100)}%</strong>
              <input type="range" min="5" max="35" step="5" value={Math.round(light.opacity*100)}
                disabled={disabled} onChange={event=>onLightChange({...light,opacity:Number(event.currentTarget.value)/100})}/>
            </label>
          </div>:null}
          <Feature icon={<MapPin/>} title={t.places} help={t.placesHelp} poster={posters.visual}
            active={false} onConfigure={onOpenScenes} disabled={disabled} settings={t.settings}/>
          <Feature icon={<Picture/>} title={t.photo} help={t.photoHelp} poster={posters.audio}
            active={hasPhoto} onToggle={hasPhoto?onRemovePhoto:onPickPhoto}
            onConfigure={onPickPhoto} disabled={disabled} settings={t.settings}/>
        </>:null}

      </div>
    </section>)}
    <div className={styles.actions} data-hypno-actions>
      <button type="button" data-hypno-create className={styles.create} disabled={disabled}
      onClick={onCreate}><Play size={24} fill="currentColor" aria-hidden="true"/>
      <span><strong>{t.create}</strong><small>{t.credits}</small></span></button>
    </div>
    <button type="button" data-hypno-preview className={styles.preview}
      disabled={disabled} onClick={onPreview}><Waves size={21} aria-hidden="true"/>
      {t.preview}<ArrowRight size={19} aria-hidden="true"/></button>
    <p className={styles.privacy}>{t.privacy}</p>
  </section>;
}
