"use client";
import {useState, type ReactNode} from "react";
import {AudioLines, BookOpen, ChevronDown, ChevronRight, Film, Leaf, Mic2, Sparkles} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-therapy-studio.module.css";

type Pane="meditation"|"voice"|"practice"|"course";
type Props={locale:PublicLocale;disabled:boolean;initialFormat?:"single"|"course";editor:(course:boolean,onApproved:()=>void)=>ReactNode;voiceEditor:ReactNode;advancedEffects:ReactNode;onVideoPhrases:()=>void};
const dict={
 en:{title:"Therapy Studio",tag:"PERSONAL PRACTICES",intro:"Meditation, voice and guided practice.",
  meditation:"Meditation",voice:"Voice",practice:"Practice",course:"My Course",
  voiceTitle:"Voice for video phrases",voiceHint:"Choose or record a permitted voice for your phrases.",
  voiceEmpty:"To revise your meditation, return to the Meditation tab.",voiceBack:"Edit meditation text",
  practiceTitle:"Create your practice",practiceHint:"Pick your next step. Nothing is rendered or purchased automatically.",
  speak:"Spoken meditation",speakHint:"Approve your text in Meditation, then choose a voice.",
  speakButton:"Choose voice & narrate",phrases:"Phrases for video",phrasesHint:"Prepare short phrases in the existing Ideas editor.",
  phrasesButton:"Create video phrases",effects:"Optional visual and audio effects",
  effectsHint:"Original optional effects are preserved; opening them does not render a video.",
  safety:"A gentle reflective practice, not medical treatment. My Course keeps the existing eight-session plan; further scripts are created only on request."},
 ru:{title:"Therapy Studio",tag:"ЛИЧНЫЕ ПРАКТИКИ",intro:"Медитация, голос и практика.",
  meditation:"Медитация",voice:"Голос",practice:"Практика",course:"Мой курс",
  voiceTitle:"Голос для видеофраз",voiceHint:"Выберите или запишите голос с необходимыми правами.",
  voiceEmpty:"Изменить сценарий можно на вкладке «Медитация».",voiceBack:"Изменить текст",
  practiceTitle:"Создайте практику",practiceHint:"Выберите следующий шаг. Рендер и оплата автоматически не запускаются.",
  speak:"Озвученная медитация",speakHint:"Утвердите текст и выберите голос.",
  speakButton:"Выбрать голос и озвучить",phrases:"Фразы для видео",phrasesHint:"Подготовьте короткие фразы в существующем редакторе Ideas.",
  phrasesButton:"Создать видеофразы",effects:"Дополнительные видео- и аудиоэффекты",
  effectsHint:"Прежние настройки сохранены; их открытие не запускает рендер.",
  safety:"Бережная практика для рефлексии, не лечение. «Мой курс» сохраняет план восьми сессий; следующие тексты создаются только по запросу."},
 es:{title:"Therapy Studio",tag:"PRÁCTICAS PERSONALES",intro:"Meditación, voz y práctica guiada.",
  meditation:"Meditación",voice:"Voz",practice:"Práctica",course:"Mi curso",
  voiceTitle:"Voz para frases de vídeo",voiceHint:"Elige o graba una voz con permiso.",
  voiceEmpty:"Para cambiar el guion, vuelve a Meditación.",voiceBack:"Editar texto",
  practiceTitle:"Crea tu práctica",practiceHint:"Elige el siguiente paso. No hay pagos ni renders automáticos.",
  speak:"Meditación narrada",speakHint:"Aprueba tu texto y elige una voz.",
  speakButton:"Elegir voz y narrar",phrases:"Frases para vídeo",phrasesHint:"Prepara frases breves en el editor Ideas.",
  phrasesButton:"Crear frases",effects:"Efectos opcionales de audio y vídeo",
  effectsHint:"Se mantienen los controles originales y no se renderiza nada al abrirlos.",
  safety:"Práctica reflexiva, no tratamiento médico. Mi curso mantiene ocho sesiones y los próximos guiones se crean solo a petición."}
} as const;

export function MandalaTherapyStudio({locale,disabled,initialFormat="single",editor,voiceEditor,advancedEffects,onVideoPhrases}:Props){
 const [pane,setPane]=useState<Pane>(initialFormat==="course"?"course":"meditation");
 const [isCourse,setIsCourse]=useState(initialFormat==="course");
 const [effectsOpen,setEffectsOpen]=useState(false);
 const t=dict[locale];
 const navigate=(next:Pane)=>{
  if(next==="meditation")setIsCourse(false);
  if(next==="course")setIsCourse(true);
  setPane(next);
 };
 return <div className={css.shell} data-therapy-studio data-therapy-course={isCourse?"true":"false"}>
  <header className={css.hero}>
   <span className={css.eyebrow}><Leaf size={17} aria-hidden="true"/>{t.tag}</span>
   <h3>{t.title}</h3><p>{t.intro}</p>
  </header>
  <div className={css.tabs} data-therapy-tabs role="tablist" aria-label="Therapy Studio">
   {(["meditation","voice","practice","course"] as const).map((id,i)=>{
    const Icon=[Leaf,Mic2,Film,BookOpen][i];
    return <button key={id} type="button" role="tab" aria-selected={pane===id}
     id={"therapy-tab-"+id} aria-controls="therapy-tab-content" data-therapy-subtab={id}
     disabled={disabled} onClick={()=>navigate(id)}>
     <Icon size={19} aria-hidden="true"/><span>{t[id]}</span>
    </button>;
   })}
  </div>
  <div className={css.main} role="tabpanel" id="therapy-tab-content" aria-labelledby={"therapy-tab-"+pane}>
   <div className={css.scriptHost} data-therapy-script-host data-pane={pane}>
    {editor(isCourse,()=>navigate("voice"))}
   </div>
   {pane==="voice"?<div className={css.voiceArea} data-therapy-voice>
    <details className={css.advanced}>
     <summary><Mic2 size={18} aria-hidden="true"/>{t.voiceTitle}<ChevronDown size={16} aria-hidden="true"/></summary>
     <p>{t.voiceHint}</p>{voiceEditor}
    </details>
    <p className={css.voiceEmpty}>{t.voiceEmpty} <button type="button" onClick={()=>navigate("meditation")}>{t.voiceBack}</button></p>
   </div>:null}
   {pane==="practice"?<section className={css.practice} data-therapy-practice>
    <h4>{t.practiceTitle}</h4><p>{t.practiceHint}</p>
    <div className={css.option}><span><AudioLines size={23}/></span><div><strong>{t.speak}</strong><p>{t.speakHint}</p></div>
     <button type="button" disabled={disabled} onClick={()=>navigate("voice")}>{t.speakButton}<ChevronRight size={18}/></button></div>
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
