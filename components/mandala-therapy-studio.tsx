"use client";
import {useState, type ReactNode} from "react";
import {AudioLines, BookOpen, ChevronDown, ChevronRight, Film, Leaf, Mic2, Sparkles, Volume2} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-therapy-studio.module.css";
type Pane="meditation"|"voice"|"practice"|"course";
type Props={locale:PublicLocale;disabled:boolean;initialFormat?:"single"|"course";editor:(course:boolean)=>ReactNode;voiceEditor:ReactNode;advancedEffects:ReactNode;onVideoPhrases:()=>void};
const dict={
 en:{title:"Therapy Studio",tag:"PERSONAL PRACTICES",intro:"Create a guided meditation or an eight-session practice course.",
  single:"Single practice",singleHint:"One meditation",course:"My Course",courseHint:"Eight connected themes",
  meditation:"Meditation",voice:"Voice",practice:"Practice",voiceTitle:"Voice for video phrases",voiceHint:"Choose or record a permitted voice for your phrases.",
  voiceEmpty:"To revise the meditation text or preferences, return to the Meditation tab.",voiceBack:"Edit meditation text",voiceToPractice:"Narrate meditation (20 EXP)",voiceToCourse:"Create video without narration",voiceActions:"Next step",
  practiceTitle:"Create your practice",practiceHint:"Pick your next step. No narration or paid video starts automatically.",
  speak:"Spoken meditation",speakHint:"Preview your text and choose a voice before creating audio.",speakButton:"Choose voice & narrate",
  phrases:"Phrases for video",phrasesHint:"Prepare short, meaningful phrases in the existing Ideas editor.",phrasesButton:"Create video phrases",
  effects:"Optional visual and audio effects",effectsHint:"Preserved original settings; no video is rendered when these are opened.",
  safety:"Gentle reflective practice, not medical treatment. Eight-session mode starts with a plan and one script; other scripts are created locally only on request."},
 ru:{title:"Therapy Studio",tag:"ЛИЧНЫЕ ПРАКТИКИ",intro:"Создайте медитацию или курс из восьми последовательных практик.",
  single:"Одна практика",singleHint:"Одна медитация",course:"Мой курс",courseHint:"Восемь связанных тем",
  meditation:"Медитация",voice:"Голос",practice:"Практика",voiceTitle:"Голос для видеофраз",voiceHint:"Выберите или запишите свой разрешённый голос.",
  voiceEmpty:"Текст медитации и фильтры можно изменить на вкладке «Медитация».",voiceBack:"Изменить текст медитации",voiceToPractice:"Озвучить медитацию (20 EXP)",voiceToCourse:"Создать видео без озвучки",voiceActions:"Следующий шаг",
  practiceTitle:"Создайте практику",practiceHint:"Выберите дальнейшее действие. Платная генерация автоматически не начинается.",
  speak:"Озвученная медитация",speakHint:"Проверьте текст и выберите голос перед озвучкой.",speakButton:"Выбрать голос и озвучить",
  phrases:"Фразы для видео",phrasesHint:"Подготовьте фразы в существующем редакторе Ideas.",phrasesButton:"Создать фразы для видео",
  effects:"Дополнительные видео- и аудиоэффекты",effectsHint:"Старые настройки сохранены; открытие не запускает рендер.",
  safety:"Мягкая практика для рефлексии, не лечение. Курс начинается с плана и первого текста; остальные создаются локально только по запросу."},
 es:{title:"Therapy Studio",tag:"PRÁCTICAS PERSONALES",intro:"Crea una meditación o un curso de ocho sesiones conectadas.",
  single:"Una práctica",singleHint:"Una meditación",course:"Mi curso",courseHint:"Ocho temas relacionados",
  meditation:"Meditación",voice:"Voz",practice:"Práctica",voiceTitle:"Voz para frases de vídeo",voiceHint:"Elige o graba una voz con permiso.",
  voiceEmpty:"Para revisar el guion y los filtros, vuelve a Meditación.",voiceBack:"Editar texto de meditación",voiceToPractice:"Narrar meditación (20 EXP)",voiceToCourse:"Crear vídeo sin narración",voiceActions:"Siguiente paso",
  practiceTitle:"Crea tu práctica",practiceHint:"Elige el siguiente paso. No hay pagos ni generaciones automáticas.",
  speak:"Meditación narrada",speakHint:"Revisa tu texto y elige una voz antes de narrar.",speakButton:"Elegir voz y narrar",
  phrases:"Frases para vídeo",phrasesHint:"Prepara frases cortas en el editor Ideas existente.",phrasesButton:"Crear frases para vídeo",
  effects:"Efectos opcionales de audio y vídeo",effectsHint:"Controles originales conservados, sin render automático.",
  safety:"Práctica reflexiva, no tratamiento médico. El curso comienza con un plan y el primer guion; los demás se crean localmente solo si los solicitas."}
} as const;
export function MandalaTherapyStudio({locale,disabled,initialFormat="single",editor,voiceEditor,advancedEffects,onVideoPhrases}:Props){
 const [pane,setPane]=useState<Pane>(initialFormat==="course"?"course":"meditation");
 const [isCourse,setIsCourse]=useState(initialFormat==="course");
 const [effectsOpen,setEffectsOpen]=useState(false);
 const t=dict[locale];
 // Navigation only: “20 EXP” is the displayed offer, never an automatic deduction.
 const openFromVoice=(target:"practice"|"course")=>{
  setPane(target);
  if(target==="course")setIsCourse(true);
  window.requestAnimationFrame(()=>document.getElementById("therapy-tab-"+target)
    ?.scrollIntoView({behavior:"auto",block:"start"}));
 };
 return <div className={css.shell} data-therapy-studio data-therapy-course={isCourse?"true":"false"} data-active-therapy-pane={pane}>
  <header className={css.hero}><span className={css.eyebrow}><Leaf size={17}/>{t.tag}</span><h3>{t.title}</h3><p>{t.intro}</p></header>
  <div className={css.tabs} data-therapy-tabs role="tablist" aria-label="Therapy Studio">
   {(["meditation","voice","practice","course"] as const).map((id,i)=>{
    const Icon=[Leaf,Mic2,Film,BookOpen][i];
    return <button key={id} type="button" role="tab" aria-selected={pane===id}
       id={"therapy-tab-"+id} aria-controls="therapy-tab-content" data-therapy-subtab={id}
       disabled={disabled} onClick={()=>{setPane(id);if(id==="course")setIsCourse(true);else if(id==="meditation")setIsCourse(false);}}><Icon size={20}/><span>{t[id]}</span></button>;
   })}
  </div>
  <div className={css.main} role="tabpanel" id="therapy-tab-content" aria-labelledby={"therapy-tab-"+pane}>
   <div className={css.scriptHost} data-therapy-script-host data-pane={pane}>
    {editor(isCourse)}
   </div>
   {pane==="voice"?<div className={css.voiceArea} data-therapy-voice>
     
     {voiceEditor}
     <p className={css.voiceEmpty} data-therapy-voice-empty><button type="button" onClick={()=>setPane("meditation")}>{t.voiceBack}</button></p>
     <div className={css.voiceNextActions} data-therapy-voice-next role="group" aria-label={t.voiceActions}>
      <button type="button" className={css.voicePrimaryNext} data-therapy-voice-to-practice
        disabled={disabled} onClick={()=>openFromVoice("practice")}>
        <Volume2 size={21} aria-hidden="true"/><span>{t.voiceToPractice}</span><ChevronRight size={21} aria-hidden="true"/>
      </button>
      <button type="button" className={css.voiceSecondaryNext} data-therapy-voice-to-course
        disabled={disabled} onClick={()=>openFromVoice("course")}>
        <Film size={21} aria-hidden="true"/><span>{t.voiceToCourse}</span><ChevronRight size={21} aria-hidden="true"/>
      </button>
     </div>
   </div>:null}
   {pane==="practice"?<section className={css.practice} data-therapy-practice>
    <h4>{t.practiceTitle}</h4><p>{t.practiceHint}</p>
    <div className={css.option}><span><AudioLines size={23}/></span><div><strong>{t.speak}</strong><p>{t.speakHint}</p></div>
      <button type="button" disabled={disabled} onClick={()=>setPane("voice")}>{t.speakButton}<ChevronRight size={18}/></button></div>
    <div className={css.option}><span><Film size={23}/></span><div><strong>{t.phrases}</strong><p>{t.phrasesHint}</p></div>
      <button type="button" disabled={disabled} onClick={onVideoPhrases}>{t.phrasesButton}<ChevronRight size={18}/></button></div>
    <details className={css.advanced} data-therapy-advanced-effects onToggle={event=>setEffectsOpen(event.currentTarget.open)}>
      <summary data-therapy-effects-toggle><Sparkles size={19}/>{t.effects}<ChevronDown size={17}/></summary>
      <p>{t.effectsHint}</p>{effectsOpen?advancedEffects:null}
    </details>
   </section>:null}
  </div>
  {pane==="voice"?null:<p className={css.safety}>{t.safety}</p>}
 </div>;
}
