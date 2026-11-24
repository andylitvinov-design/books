"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {AudioLines,BookOpen,ChevronDown,ChevronRight,Film,Leaf,Mic2,Sparkles,Volume2} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import type {GuidedMeditationFocus} from "./mandala-guided-course";
import {MandalaCloudVoiceStudio} from "./mandala-cloud-voice-studio";
import {MandalaTherapyTextPicker} from "./mandala-therapy-text-picker";
import css from "./mandala-therapy-studio.module.css";

type Pane="meditation"|"voice"|"practice"|"course";
type Props={locale:PublicLocale;disabled:boolean;theme:VideoTheme;wish:string;focus:GuidedMeditationFocus;scenarioId?:string|null;
 initialFormat?:"single"|"course";editor:(course:boolean)=>ReactNode;voiceEditor:ReactNode;
 advancedEffects:ReactNode;onVideoPhrases:()=>void;onNarrationReady?:(file:File)=>Promise<boolean>;
 onNarrationInvalidated?:()=>void};
const dict={
 en:{
  title:"Therapy Studio",stepsA11y:"Therapy Studio steps",intro:"Meditation, voice and guided practice.",
  meditation:"Meditation",voice:"Voice",practice:"Practice",course:"My Course",
  voiceTitle:"Voice for your meditation",voiceHint:"Only your approved text is offered for narration. External speech requires a separate choice and consent.",
  voiceEmpty:"Choose one of the two short meditation texts first.",voiceBack:"Choose meditation",
  phraseDetails:"Other voice options for video phrases",practiceTitle:"Create your practice",
  practiceHint:"Choose what to do next. No voice or paid video starts automatically.",
  speak:"Spoken meditation",speakHint:"Approve a text, then set up the narration.",
  speakButton:"Choose voice & narrate",phrases:"Phrases for video",
  phrasesHint:"Prepare short phrases in the existing Ideas editor.",phrasesButton:"Create video phrases",
  effects:"Optional visual and audio effects",effectsHint:"Existing effects stay available; opening them never renders a video.",
  safety:"A gentle reflective practice, not medical treatment."
 },
 ru:{
  title:"Therapy Studio",stepsA11y:"Этапы Therapy Studio",intro:"Медитация, голос и бережная практика.",
  meditation:"Медитация",voice:"Голос",practice:"Практика",course:"Мой курс",
  voiceTitle:"Голос вашей медитации",voiceHint:"Для озвучки предлагается только утверждённый текст. Облачная озвучка требует отдельного выбора и согласия.",
  voiceEmpty:"Сначала выберите один из двух коротких текстов медитации.",voiceBack:"Выбрать медитацию",
  phraseDetails:"Другие голоса для видеофраз",practiceTitle:"Создайте практику",
  practiceHint:"Выберите следующий шаг. Озвучка и платный рендер автоматически не запускаются.",
  speak:"Озвученная медитация",speakHint:"Утвердите текст, затем настройте голос.",
  speakButton:"Выбрать голос и озвучить",phrases:"Фразы для видео",
  phrasesHint:"Подготовьте короткие фразы в редакторе Ideas.",phrasesButton:"Создать фразы для видео",
  effects:"Дополнительные видео- и аудиоэффекты",effectsHint:"Существующие эффекты сохранены. Открытие не запускает генерацию видео.",
  safety:"Бережная рефлексивная практика, не медицинское лечение."
 },
 es:{
  title:"Therapy Studio",stepsA11y:"Pasos de Therapy Studio",intro:"Meditación, voz y práctica guiada.",
  meditation:"Meditación",voice:"Voz",practice:"Práctica",course:"Mi curso",
  voiceTitle:"Voz para tu meditación",voiceHint:"Solo el texto aprobado puede narrarse. La voz externa exige una elección y consentimiento aparte.",
  voiceEmpty:"Primero elige uno de los dos textos breves.",voiceBack:"Elegir meditación",
  phraseDetails:"Otras voces para frases del vídeo",practiceTitle:"Crea tu práctica",
  practiceHint:"Elige el siguiente paso. No se inicia ninguna voz o vídeo de pago automáticamente.",
  speak:"Meditación narrada",speakHint:"Aprueba un texto y luego configura la voz.",
  speakButton:"Elegir voz y narrar",phrases:"Frases para vídeo",
  phrasesHint:"Prepara frases breves en el editor Ideas.",phrasesButton:"Crear frases para vídeo",
  effects:"Efectos opcionales de audio y vídeo",effectsHint:"Los efectos existentes siguen disponibles; abrirlos no genera vídeo.",
  safety:"Práctica de reflexión, no tratamiento médico."
 }
} as const;

export function MandalaTherapyStudio({locale,disabled,theme,wish,focus,scenarioId=null,initialFormat="single",editor,voiceEditor,advancedEffects,onVideoPhrases,onNarrationReady,onNarrationInvalidated}:Props){
 const [pane,setPane]=useState<Pane>(initialFormat==="course"?"course":"meditation");
 const [isCourse,setIsCourse]=useState(initialFormat==="course");
 const [effectsOpen,setEffectsOpen]=useState(false);
 const [approved,setApproved]=useState<{signature:string;text:string}|null>(null);
 const scenarioSignature=JSON.stringify([locale,theme,wish,focus.goal,focus.difficulty,focus.goals,focus.details,scenarioId]);
 const approvedText=approved?.signature===scenarioSignature?approved.text:"";
 const lastScenario=useRef(scenarioSignature);
 const t=dict[locale];
 useEffect(()=>{
  if(lastScenario.current===scenarioSignature)return;
  lastScenario.current=scenarioSignature;
  onNarrationInvalidated?.();
 },[scenarioSignature,onNarrationInvalidated]);
 const switchPane=(id:Pane)=>{
  if(id==="course"||id==="meditation")setIsCourse(id==="course");
  setPane(id);
 };
 const invalidate=()=>{setApproved(null);onNarrationInvalidated?.();};
 const openFromVoice=(target:"practice"|"course")=>{
  setPane(target);if(target==="course")setIsCourse(true);
  window.requestAnimationFrame(()=>document.getElementById("therapy-tab-"+target)?.scrollIntoView({behavior:"auto",block:"start"}));
 };
 return <div className={css.shell} data-therapy-studio data-therapy-course={isCourse?"true":"false"} data-active-therapy-pane={pane} data-therapy-scenario-id={scenarioId||undefined}>
  <header className={css.hero}><h3>{t.title}</h3><p>{t.intro}</p></header>
  <div className={css.tabs} data-therapy-tabs role="tablist" aria-label={t.stepsA11y}>
   {(["meditation","voice","practice","course"] as const).map((id,i)=>{
    const Icon=[Leaf,Mic2,Film,BookOpen][i];
    return <button key={id} type="button" role="tab" aria-selected={pane===id}
      id={"therapy-tab-"+id} aria-controls="therapy-tab-content" data-therapy-subtab={id}
      disabled={disabled} onClick={()=>switchPane(id)}><Icon size={17}/><span>{t[id]}</span></button>;
   })}
  </div>
  <div className={css.main} role="tabpanel" id="therapy-tab-content" aria-labelledby={"therapy-tab-"+pane}>
   <div className={css.scriptHost} data-therapy-script-host data-pane={pane} hidden={!isCourse}>
    {isCourse?editor(true):null}
   </div>
   {!isCourse?<div className={css.textHost} data-therapy-text-host hidden={pane!=="meditation"}>
    <MandalaTherapyTextPicker key={(scenarioId||"personal")+"-"+locale} locale={locale} theme={theme} scenarioId={scenarioId} request={wish||focus.goal||focus.difficulty||""}
      disabled={disabled} onInvalidate={invalidate} onApprove={text=>{
       setApproved({signature:scenarioSignature,text});setPane("voice");
      }}/>
   </div>:null}
   {pane==="voice"?<div className={css.voiceArea} data-therapy-voice>
    <div className={css.voiceHint}><Mic2 size={20}/><div><strong>{t.voiceTitle}</strong><p>{t.voiceHint}</p></div></div>
    {!isCourse?(approvedText?
      <div className={css.approvedAudio} data-therapy-approved-voice>
       <MandalaCloudVoiceStudio locale={locale} sourceText={approvedText}
         onAudioReady={onNarrationReady} onAudioInvalidated={onNarrationInvalidated}/>
      </div>:
      <p className={css.voiceEmpty} data-therapy-voice-empty>{t.voiceEmpty} <button type="button" onClick={()=>switchPane("meditation")}>{t.voiceBack}</button></p>):null}
    <details className={css.voiceDisclosure}>
      <summary>{t.phraseDetails}<ChevronDown size={17} aria-hidden="true"/></summary>
      {voiceEditor}
    </details>
    <div className={css.voiceNextActions} data-therapy-voice-next role="group" aria-label={locale==="ru"?"Следующий шаг":locale==="es"?"Siguiente paso":"Next step"}>
     <button type="button" className={css.voicePrimaryNext} data-therapy-voice-to-practice disabled={disabled} onClick={()=>openFromVoice("practice")}>
      <Volume2 size={21} aria-hidden="true"/><span>{locale==="ru"?"Озвучить медитацию (20 EXP)":locale==="es"?"Narrar meditación (20 EXP)":"Narrate meditation (20 EXP)"}</span><ChevronRight size={21} aria-hidden="true"/>
     </button>
     <button type="button" className={css.voiceSecondaryNext} data-therapy-voice-to-course disabled={disabled} onClick={()=>openFromVoice("course")}>
      <Film size={21} aria-hidden="true"/><span>{locale==="ru"?"Создать видео без озвучки":locale==="es"?"Crear vídeo sin narración":"Create video without narration"}</span><ChevronRight size={21} aria-hidden="true"/>
     </button>
    </div>
   </div>:null}
   {pane==="practice"?<section className={css.practice} data-therapy-practice>
    <h4>{t.practiceTitle}</h4><p>{t.practiceHint}</p>
    <div className={css.option}><span><AudioLines size={23}/></span><div><strong>{t.speak}</strong><p>{t.speakHint}</p></div>
     <button type="button" disabled={disabled} onClick={()=>switchPane("voice")}>{t.speakButton}<ChevronRight size={18}/></button></div>
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
