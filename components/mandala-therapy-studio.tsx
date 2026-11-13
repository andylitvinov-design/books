"use client";
import {useState, type ReactNode} from "react";
import {AudioLines, BookOpen, ChevronDown, ChevronRight, Film, Heart, Leaf, Mic2, Sparkles} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-therapy-studio.module.css";
type Pane="meditation"|"voice"|"practice";
type Props={locale:PublicLocale;disabled:boolean;editor:(course:boolean)=>ReactNode;voiceEditor:ReactNode;advancedEffects:ReactNode;onVideoPhrases:()=>void};
const dict={
 en:{title:"Therapy Studio",tag:"PERSONAL PRACTICES",intro:"Create a guided meditation or an eight-session practice course.",
  single:"Single practice",singleHint:"One meditation",course:"8-session course",courseHint:"Eight connected themes",
  meditation:"Meditation",voice:"Voice",practice:"Practice",voiceTitle:"Voice for video phrases",voiceHint:"Choose or record a permitted voice for your phrases.",
  voiceEmpty:"Create your meditation text first, then return here to choose a narrator.",voiceBack:"Create meditation text",
  practiceTitle:"Create your practice",practiceHint:"Pick your next step. No narration or paid video starts automatically.",
  speak:"Spoken meditation",speakHint:"Preview your text and choose a voice before creating audio.",speakButton:"Choose voice & narrate",
  phrases:"Phrases for video",phrasesHint:"Prepare short, meaningful phrases in the existing Ideas editor.",phrasesButton:"Create video phrases",
  effects:"Optional visual and audio effects",effectsHint:"Preserved original settings; no video is rendered when these are opened.",
  safety:"Gentle reflective practice, not medical treatment. Eight-session mode initially creates a plan and the first editable script."},
 ru:{title:"Therapy Studio",tag:"ЛИЧНЫЕ ПРАКТИКИ",intro:"Создайте медитацию или курс из восьми последовательных практик.",
  single:"Одна практика",singleHint:"Одна медитация",course:"Курс из 8 сессий",courseHint:"Восемь связанных тем",
  meditation:"Медитация",voice:"Голос",practice:"Практика",voiceTitle:"Голос для видеофраз",voiceHint:"Выберите или запишите свой разрешённый голос.",
  voiceEmpty:"Сначала создайте текст медитации, затем выберите голос для озвучки.",voiceBack:"Создать текст медитации",
  practiceTitle:"Создайте практику",practiceHint:"Выберите дальнейшее действие. Платная генерация автоматически не начинается.",
  speak:"Озвученная медитация",speakHint:"Проверьте текст и выберите голос перед озвучкой.",speakButton:"Выбрать голос и озвучить",
  phrases:"Фразы для видео",phrasesHint:"Подготовьте фразы в существующем редакторе Ideas.",phrasesButton:"Создать фразы для видео",
  effects:"Дополнительные видео- и аудиоэффекты",effectsHint:"Старые настройки сохранены; открытие не запускает рендер.",
  safety:"Мягкая практика для рефлексии, не лечение. Курс сначала создаёт план из 8 сессий и текст первой медитации."},
 es:{title:"Therapy Studio",tag:"PRÁCTICAS PERSONALES",intro:"Crea una meditación o un curso de ocho sesiones conectadas.",
  single:"Una práctica",singleHint:"Una meditación",course:"Curso de 8 sesiones",courseHint:"Ocho temas relacionados",
  meditation:"Meditación",voice:"Voz",practice:"Práctica",voiceTitle:"Voz para frases de vídeo",voiceHint:"Elige o graba una voz con permiso.",
  voiceEmpty:"Primero crea el texto y luego elige la voz.",voiceBack:"Crear texto de meditación",
  practiceTitle:"Crea tu práctica",practiceHint:"Elige el siguiente paso. No hay pagos ni generaciones automáticas.",
  speak:"Meditación narrada",speakHint:"Revisa tu texto y elige una voz antes de narrar.",speakButton:"Elegir voz y narrar",
  phrases:"Frases para vídeo",phrasesHint:"Prepara frases cortas en el editor Ideas existente.",phrasesButton:"Crear frases para vídeo",
  effects:"Efectos opcionales de audio y vídeo",effectsHint:"Controles originales conservados, sin render automático.",
  safety:"Práctica reflexiva, no tratamiento médico. El curso primero crea un plan de ocho temas y el primer guion."}
} as const;
export function MandalaTherapyStudio({locale,disabled,editor,voiceEditor,advancedEffects,onVideoPhrases}:Props){
 const [pane,setPane]=useState<Pane>("meditation");
 const [isCourse,setIsCourse]=useState(false);
 const [effectsOpen,setEffectsOpen]=useState(false);
 const t=dict[locale];
 return <div className={css.shell} data-therapy-studio>
  <header className={css.hero}><span className={css.eyebrow}><Leaf size={17}/>{t.tag}</span><h3>{t.title}</h3><p>{t.intro}</p></header>
  <div className={css.format} data-therapy-format-switch role="group" aria-label="Practice format">
   <button type="button" data-therapy-format="single" disabled={disabled} aria-pressed={!isCourse} onClick={()=>{setIsCourse(false);setPane("meditation");}}>
    <Heart size={22}/><span><strong>{t.single}</strong><small>{t.singleHint}</small></span></button>
   <button type="button" data-therapy-format="course" disabled={disabled} aria-pressed={isCourse} onClick={()=>{setIsCourse(true);setPane("meditation");}}>
    <BookOpen size={22}/><span><strong>{t.course}</strong><small>{t.courseHint}</small></span></button>
  </div>
  <div className={css.tabs} data-therapy-tabs role="tablist" aria-label="Therapy Studio">
   {(["meditation","voice","practice"] as const).map((id,i)=>{
    const Icon=[Leaf,Mic2,Film][i];
    return <button key={id} type="button" role="tab" aria-selected={pane===id}
       id={"therapy-tab-"+id} aria-controls="therapy-tab-content" data-therapy-subtab={id}
       disabled={disabled} onClick={()=>setPane(id)}><Icon size={20}/><span>{t[id]}</span></button>;
   })}
  </div>
  <div className={css.main} role="tabpanel" id="therapy-tab-content" aria-labelledby={"therapy-tab-"+pane}>
   <div className={css.scriptHost} data-therapy-script-host data-pane={pane}>
    {editor(isCourse)}
   </div>
   {pane==="voice"?<div className={css.voiceArea} data-therapy-voice>
     <div className={css.voiceHint}><Mic2 size={20}/><div><strong>{t.voiceTitle}</strong><p>{t.voiceHint}</p></div></div>
     {voiceEditor}
     <p className={css.voiceEmpty} data-therapy-voice-empty>{t.voiceEmpty} <button type="button" onClick={()=>setPane("meditation")}>{t.voiceBack}</button></p>
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
  <p className={css.safety}>{t.safety}</p>
 </div>;
}
