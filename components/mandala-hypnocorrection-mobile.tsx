"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import {
  ArrowRight, AudioLines, ChevronDown, Clock3, Eye, FileText, Headphones, Image as Picture,
  MapPin, Mic, Play, Quote, Repeat2, SlidersHorizontal, Sparkles, Sun, UserRound, Waves,
} from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { AffirmationSettings } from "@/lib/mandala/video-affirmations";
import styles from "./mandala-hypnocorrection-mobile.module.css";

export type HypnoLightSettings = { enabled: boolean; cyclesPerMinute: number; opacity: number };
type GroupId = "phrases" | "audio" | "visual" | "meditation";
type Props = {
  locale: PublicLocale;
  disabled: boolean;
  affirmations: AffirmationSettings;
  onAffirmationsChange: (settings: AffirmationSettings) => void;
  light: HypnoLightSettings;
  onLightChange: (next: HypnoLightSettings) => void;
  onOpenPhraseEditor: () => void;
  onOpenAudioEditor: () => void;
  onOpenScenes: () => void;
  onOpenMeditation: () => void;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  onPreview: () => void;
  onCreate: () => void;
  onWavePreset: () => void;
  hasPhoto: boolean;
  hasVoiceFile: boolean;
  posters: Record<GroupId,string>;
};

const copy = {
  ru: {
    title:"Гипнокоррекция",sub:"Добавьте медитацию, визуальные эффекты, звук и слова поддержки",
    wave:"Быстрая настройка с Wave",waveHelp:"Подберёт оптимальные эффекты на основе вашей цели",try:"Попробовать",
    suggested:"Предложен мягкий световой ритм и видимые фразы. Измените любой пункт или отключите его.",
    phrases:"Установки и внушения",phrasesHelp:"Фразы и способы их появления",
    text:"Текст на экране",textHelp:"Читаемые фразы из вашего набора",
    frame:"25-й кадр",frameHelp:"Краткие вставки · экспериментально",
    repeat:"Повторение в аудио",repeatHelp:"Паузы и частота речевых фраз",
    audio:"Аудиоэффекты",audioHelp:"Голос и специальные звуковые дорожки",
    speech:"Озвучка фраз",speechHelp:"Голос близкого или разрешённые записи вдохновляющих людей",
    whisper:"Гипнозвук",whisperHelp:"Тихие повторы обычной речи",
    binaural:"Бинауральные ритмы",binauralHelp:"Стереозвук для наушников · в разработке",
    visual:"Визуальные эффекты",visualHelp:"Мягкий свет, природные образы и движение",
    light:"Импульс энергии и света",lightHelp:"Волны, лучи и мандала без вспышек",
    places:"Места силы",placesHelp:"Выберите сцену из видеокаталога",
    photo:"Личное фото",photoHelp:"Ваш снимок с подтверждением прав",
    meditation:"Личная медитация",meditationHelp:"Персональный текст по цели и утверждённым фразам",
    generateMeditation:"Сгенерировать медитацию",meditationDetail:"Откроет существующий редактор текста и локального прослушивания.",
    settings:"Настроить",selected:"Включено",disabled:"Выключено",
    rhythm:"Темп плавных волн",intensity:"Интенсивность",cycles:"циклов/мин",
    voiceHint:"Озвучка возможна собственным голосом, с согласия близкого или из лицензированных оригинальных записей вдохновляющих людей. Загрузка и права — в настройках «Звук».",
    pending:"Пока недоступно в итоговом видео: нужна проверенная речевая дорожка и реальный аудиомикс. Настройки музыки остаются во вкладке «Звук».",
    science:"Короткие кадры — экспериментальный эффект; нет доказательств коррекции убеждений. Без мигания и медицинских обещаний.",
    meditationDuration:"Длительность",meditationTime:"3 / 5 / 8 / 12 мин",meditationStyle:"Стиль",meditationStyles:"Расслабление · Энергия",meditationVoice:"Голос",meditationVoices:"Голос устройства или свой",
    create:"Сформировать видео",credits:"0 кредитов · локальное создание",
    preview:"Проверить в основном видео",privacy:"Бесплатные эффекты выполняются локально. Персональные файлы не отправляются стороннему ИИ.",
  },
  en: {
    title:"Audio-visual support",sub:"Optional ways to present your personal video",
    wave:"Quick setup with Wave",waveHelp:"Suggests suitable effects based on your goal",try:"Try it",
    suggested:"Gentle light waves and visible phrases suggested. You can edit or disable any effect.",
    phrases:"Phrases and suggestions",phrasesHelp:"Your words and how they appear",
    text:"On-screen text",textHelp:"Readable phrases from your selection",
    frame:"Brief frame",frameHelp:"Short inserts · experimental",
    repeat:"Audio repetition",repeatHelp:"Pauses and speech frequency",
    audio:"Audio effects",audioHelp:"Voice and optional sound layers",
    speech:"Spoken phrases",speechHelp:"Your voice or an authorized close person's voice",
    whisper:"Quiet speech",whisperHelp:"Low-volume audible repetitions",
    binaural:"Binaural beats",binauralHelp:"Headphone stereo effect · in development",
    visual:"Visual effects",visualHelp:"Soft light, imagery and motion",
    light:"Light and energy pulse",lightHelp:"Waves, rays and mandala without flashes",
    places:"Meaningful places",placesHelp:"Choose from existing video scenes",
    photo:"Personal photo",photoHelp:"Your photo with rights confirmation",
    meditation:"Personal meditation",meditationHelp:"A personal script based on your goal and chosen phrases",
    generateMeditation:"Create meditation",meditationDetail:"Opens the existing script editor with local voice preview.",
    settings:"Configure",selected:"On",disabled:"Off",
    rhythm:"Smooth wave tempo",intensity:"Intensity",cycles:"cycles/min",
    voiceHint:"Record or upload authorized speech in existing Sound settings. No third-party voice cloning without verified consent.",
    pending:"Not yet available in exported video: requires a real recorded speech track and verified audio mixer. Music remains in Sound.",
    science:"Brief frames are experimental; no proven subconscious effects. No strobe flashes or clinical claims.",
    meditationDuration:"Duration",meditationTime:"3 / 5 / 8 / 12 min",meditationStyle:"Style",meditationStyles:"Calm · Energy",meditationVoice:"Voice",meditationVoices:"Device or your recording",
    create:"Create video",credits:"0 credits · created on your device",
    preview:"Preview in main video",privacy:"Free effects run on your device. Personal files are not sent to third-party AI.",
  },
  es: {
    title:"Apoyo audiovisual",sub:"Formas opcionales de presentar tu vídeo personal",
    wave:"Ajuste rápido con Wave",waveHelp:"Sugiere efectos adecuados según tu objetivo",try:"Probar",
    suggested:"Se sugieren ondas de luz suaves y frases visibles. Puedes cambiar o desactivar todo.",
    phrases:"Frases y sugerencias",phrasesHelp:"Tus palabras y su presentación",
    text:"Texto en pantalla",textHelp:"Frases legibles de tu selección",
    frame:"Fotograma breve",frameHelp:"Inserciones cortas · experimental",
    repeat:"Repetición en audio",repeatHelp:"Pausas y frecuencia de voz",
    audio:"Efectos de audio",audioHelp:"Voz y capas de sonido opcionales",
    speech:"Frases narradas",speechHelp:"Tu voz o voz autorizada de alguien cercano",
    whisper:"Voz tenue",whisperHelp:"Repeticiones audibles a bajo volumen",
    binaural:"Ritmos binaurales",binauralHelp:"Efecto estéreo con auriculares · en desarrollo",
    visual:"Efectos visuales",visualHelp:"Luz suave, imágenes y movimiento",
    light:"Pulso de luz y energía",lightHelp:"Ondas, rayos y mandala sin destellos",
    places:"Lugares especiales",placesHelp:"Elige una escena del catálogo existente",
    photo:"Foto personal",photoHelp:"Tu foto con confirmación de derechos",
    meditation:"Meditación personal",meditationHelp:"Guion personal según tu objetivo y frases elegidas",
    generateMeditation:"Crear meditación",meditationDetail:"Abre el editor de guiones y la vista previa de voz local.",
    settings:"Configurar",selected:"Sí",disabled:"No",
    rhythm:"Ritmo de ondas suaves",intensity:"Intensidad",cycles:"ciclos/min",
    voiceHint:"Graba o sube una voz autorizada en Sonido. Sin clonación de voz de terceros sin consentimiento verificado.",
    pending:"Aún no disponible en el vídeo exportado: requiere voz grabada y mezcla verificada. La música se configura en Sonido.",
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
  onOpenPhraseEditor,onOpenAudioEditor,onOpenScenes,onOpenMeditation,
  onPickPhoto,onRemovePhoto,onPreview,onCreate,onWavePreset,hasPhoto,hasVoiceFile,posters,
}:Props) {
  const t=copy[locale];
  const [open,setOpen]=useState<GroupId[]>(["audio","visual","meditation","phrases"]);
  const [showLightSettings,setShowLightSettings]=useState(false);
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
    {id:"audio",title:t.audio,help:t.audioHelp},
    {id:"visual",title:t.visual,help:t.visualHelp},
    {id:"meditation",title:t.meditation,help:t.meditationHelp},
    {id:"phrases",title:t.phrases,help:t.phrasesHelp},
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
    {groups.map(group=><section className={styles.group} data-hypno-group={group.id} key={group.id}>
      <button type="button" className={styles.groupHeader} aria-expanded={open.includes(group.id)}
        aria-controls={"hypno-group-"+group.id}
        onClick={()=>setOpen(current=>current.includes(group.id)?current.filter(id=>id!==group.id):[...current,group.id])}>
        {/* First-party scene posters; no duplicated player or third-party images. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={posters[group.id]} alt="" loading="lazy"/>
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
          <Feature icon={<Repeat2/>} title={t.repeat} help={t.repeatHelp}
            active={false} unavailable onToggle={()=>showNote("audio")}
            onConfigure={()=>showNote("audio")} disabled={disabled} settings={t.settings}/>
          {note==="frame"?<p role="note" className={styles.note}>{t.science}</p>:null}
          {note==="audio"?<p role="status" className={styles.note}>{t.pending}</p>:null}
        </>:null}
        {group.id==="audio"?<>
          <Feature icon={<Mic/>} title={t.speech} help={t.speechHelp}
            active={hasVoiceFile} onToggle={onOpenAudioEditor}
            onConfigure={onOpenAudioEditor} disabled={disabled} settings={t.settings}/>
          <Feature icon={<AudioLines/>} title={t.whisper} help={t.whisperHelp}
            active={false} unavailable onToggle={()=>showNote("audio")}
            onConfigure={()=>showNote("audio")} disabled={disabled} settings={t.settings}/>
          <Feature icon={<Headphones/>} title={t.binaural} help={t.binauralHelp}
            active={false} unavailable onToggle={()=>showNote("audio")}
            onConfigure={()=>showNote("audio")} disabled={disabled} settings={t.settings}/>
          <p className={styles.note}>{note==="audio"?t.pending:t.voiceHint}</p>
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
          <Feature icon={<MapPin/>} title={t.places} help={t.placesHelp} poster={posters.meditation}
            active={false} onConfigure={onOpenScenes} disabled={disabled} settings={t.settings}/>
          <Feature icon={<Picture/>} title={t.photo} help={t.photoHelp} poster={posters.audio}
            active={hasPhoto} onToggle={hasPhoto?onRemovePhoto:onPickPhoto}
            onConfigure={onPickPhoto} disabled={disabled} settings={t.settings}/>
        </>:null}
        {group.id==="meditation"?<div className={styles.meditation}>
          <button type="button" className={styles.meditationStart} onClick={onOpenMeditation} disabled={disabled}>
            <FileText size={27} aria-hidden="true"/>
            <span><strong>{t.generateMeditation}</strong><small>{t.meditationDetail}</small></span>
            <ArrowRight size={21} aria-hidden="true"/>
          </button>
          <div className={styles.meditationOptions}>
            <button type="button" onClick={onOpenMeditation} disabled={disabled}>
              <Clock3 size={19} aria-hidden="true"/><strong>{t.meditationDuration}</strong><small>{t.meditationTime}</small>
            </button>
            <button type="button" onClick={onOpenMeditation} disabled={disabled}>
              <SlidersHorizontal size={19} aria-hidden="true"/><strong>{t.meditationStyle}</strong><small>{t.meditationStyles}</small>
            </button>
            <button type="button" onClick={onOpenMeditation} disabled={disabled}>
              <UserRound size={19} aria-hidden="true"/><strong>{t.meditationVoice}</strong><small>{t.meditationVoices}</small>
            </button>
          </div>
        </div>:null}
      </div>
    </section>)}
    <button type="button" data-hypno-create className={styles.create} disabled={disabled}
      onClick={onCreate}><Play size={24} fill="currentColor" aria-hidden="true"/>
      <span><strong>{t.create}</strong><small>{t.credits}</small></span></button>
    <button type="button" data-hypno-preview className={styles.preview}
      disabled={disabled} onClick={onPreview}><Waves size={21} aria-hidden="true"/>
      {t.preview}<ArrowRight size={19} aria-hidden="true"/></button>
    <p className={styles.privacy}>{t.privacy}</p>
  </section>;
}
