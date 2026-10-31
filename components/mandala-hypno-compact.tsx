"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, CirclePlay, Film, Pencil, SlidersHorizontal, Sparkles, Target, WandSparkles } from "lucide-react";
import type { VideoLocale, VideoTheme } from "@/lib/mandala/holistic-video-themes";
import {
  affirmationGoalCatalog, buildHypnoRequestPhrases, hypnoRequestProblems,
  linesForVideoAffirmations, suggestedVideoAffirmations,
} from "@/lib/mandala/video-affirmations";
import type { AffirmationSettings, VideoAffirmationGoal } from "@/lib/mandala/video-affirmations";
import { MandalaVideoAffirmations } from "./mandala-video-affirmations";
import { resolvePrivateHypnoCodes } from "@/lib/mandala/hypno-private-signals.mjs";
import css from "./mandala-hypno-compact.module.css";

type SceneOption = { id:string; label:string; symbol:string; poster:string|null };
type EditPanel = "request"|"phrases"|"display"|"design"|null;
type Position = "top"|"center"|"bottom";
type TextScale = "small"|"medium"|"large";

const topicGoals: Record<VideoTheme, VideoAffirmationGoal[]> = {
  energy:["rhythm","recovery","strength"], money:["value","planning","stability"],
  relationships:["connection","boundaries","dialogue"], goals:["clarity","progress","meaning"],
  life:["meaning","rhythm","connection"], health:["recovery","rhythm","strength"],
};
const primaryThemes: VideoTheme[] = ["energy","money","relationships","goals"];
const copy = {
  en: {
    request:"My request", requestHint:"Difficulty and goal in one place", current:"Now", desired:"My goal",
    change:"Edit", problem:"What feels difficult?", goal:"What would you like instead?",
    optional:"Optional details (stay in this browser)", problemPlaceholder:"If useful, describe a situation in your own words…",
    goalPlaceholder:"Add your own goal, if you wish…", theme:"Theme", apply:"Suggest phrases from my choices",
    phrases:"My phrases", phraseHint:"Choose phrases or refine your suggestions",
    smart:"Smart match", ready:"Ready phrases", tests:"From my tests", byRequest:"From selected issue and goal",
    selected:"selected", choices:"Other options", own:"My phrase", testsHelp:"For saved-test matching, choose the secure consented button below. No profile is loaded automatically.",
    display:"Show in video", displayHint:"How and when the words appear", every:"Every", size:"Size",
    position:"Position", placements:["Top","Centre","Bottom"], sizes:["Small","Medium","Large"],
    additional:"Other display controls (density, visibility and experimental short frame)",
    design:"Video design", designHint:"Scene, atmosphere and original sound", sound:"Audio", adjustAudio:"Choose sound",
    scenery:"Choose a scene", moreScenes:"All video scenes", preview:"Preview", previewHint:"Preview only — no export or account save",
    previewButton:"Preview real video", create:"Create video", use:"In video", privacy:"Your own notes and phrases remain in this browser. Only selected generic codes go to free AI with your consent; no CRM upload.",
    themeNames:{energy:"Energy",money:"Money",relationships:"Love",goals:"Goals",life:"Life",health:"Wellbeing"},
    enabledNote:"Switch on to include the chosen phrases in the video",
    aiConsent:"I agree to send only selected generic theme, difficulty, goal and tone codes to free Google or OpenRouter AI. My notes, tests, profile and personal phrases are NOT sent. Free providers may use prompts to improve models.",
    aiRun:"Generate five AI phrases",aiBusy:"Writing phrases…",
    aiFallback:"Free AI is unavailable; showing editable local suggestions.",aiSignIn:"Sign in for free AI. Local suggestions work without an account.",
    aiReady:"AI draft: review and edit five phrases ·",aiLocalNote:"Wishes were interpreted on this device; raw text was not shared.",aiTone:"Tone",
    aiTones:["Gentle","Grounded","Encouraging"],
    aiProvider:"AI provider",aiProviders:["Auto · Gemini → OpenRouter","Gemini","OpenRouter"],
  },
  ru: {
    request:"Мой запрос", requestHint:"Проблема и цель в одном месте", current:"Сейчас", desired:"Моя цель",
    change:"Изменить", problem:"Что сейчас беспокоит?", goal:"К чему хотите прийти?",
    optional:"Описание своими словами · необязательно", problemPlaceholder:"Если хотите, опишите, в какой ситуации возникает трудность…",
    goalPlaceholder:"При желании уточните, что хотите изменить…", theme:"Тема", apply:"Подобрать по моему запросу",
    phrases:"Мои фразы", phraseHint:"Выберите фразы или уточните подбор",
    smart:"Умный подбор", ready:"Готовые", tests:"По тестам", byRequest:"По выбранной проблеме и цели",
    selected:"выбрано", choices:"Другие варианты", own:"Своя фраза", testsHelp:"Чтобы использовать сохранённые тесты, нажмите отдельную кнопку согласованного подбора ниже. Автозагрузки профиля нет.",
    display:"Показ в видео", displayHint:"Как и когда появляются фразы", every:"Каждые", size:"Размер",
    position:"Расположение", placements:["Сверху","По центру","Снизу"], sizes:["Малый","Средний","Крупный"],
    additional:"Другие настройки: плотность, видимость и экспериментальный короткий кадр",
    design:"Дизайн видео", designHint:"Сцена, атмосфера и оригинальные звуки", sound:"Звук", adjustAudio:"Выбрать звук",
    scenery:"Выберите сцену", moreScenes:"Все видеосцены", preview:"Предпросмотр", previewHint:"Только просмотр, без сохранения и рендера",
    previewButton:"Просмотреть видео", create:"Создать видео", use:"В видео", privacy:"Ваши заметки и фразы остаются в браузере. Только с согласием общие коды идут в бесплатный AI; в CRM не отправляются.",
    themeNames:{energy:"Энергия",money:"Деньги",relationships:"Отношения",goals:"Цели",life:"Жизнь",health:"Самочувствие"},
    enabledNote:"Включите, чтобы выбранные фразы вошли в видео",
    aiConsent:"Согласен отправить только общие коды темы, трудности, цели и тона в бесплатный AI Google или OpenRouter. Мои заметки, тесты, профиль и личные фразы НЕ передаются. Бесплатные провайдеры могут использовать запросы для улучшения моделей.",
    aiRun:"Сгенерировать 5 AI-фраз",aiBusy:"Создаём фразы…",
    aiFallback:"Бесплатный AI недоступен: показан редактируемый локальный подбор.",aiSignIn:"Войдите в кабинет для бесплатного AI. Локальный подбор работает без входа.",
    aiReady:"AI-черновик: проверьте и измените 5 фраз ·",aiLocalNote:"Описание распознано на устройстве; текст не отправлялся.",aiTone:"Тон",
    aiTones:["Мягкий","Практичный","Вдохновляющий"],
    aiProvider:"Система генерации",aiProviders:["Авто · Gemini → OpenRouter","Gemini","OpenRouter"],
  },
  es: {
    request:"Mi intención", requestHint:"Dificultad y objetivo en un lugar", current:"Ahora", desired:"Mi objetivo",
    change:"Cambiar", problem:"¿Qué te preocupa?", goal:"¿Qué deseas conseguir?",
    optional:"Detalles opcionales (solo en este navegador)", problemPlaceholder:"Si quieres, describe la situación con tus palabras…",
    goalPlaceholder:"Puedes aclarar tu objetivo si quieres…", theme:"Tema", apply:"Sugerir frases para mi objetivo",
    phrases:"Mis frases", phraseHint:"Elige o ajusta tus frases",
    smart:"Sugerir frases", ready:"Preparadas", tests:"Mis pruebas", byRequest:"Según la dificultad y la meta",
    selected:"elegidas", choices:"Más opciones", own:"Mi frase", testsHelp:"Para usar tus tests guardados, toca el botón de consentimiento seguro de abajo. Nunca cargamos tu perfil sin pedirlo.",
    display:"Texto en vídeo", displayHint:"Cuándo y cómo aparecen las frases", every:"Cada", size:"Tamaño",
    position:"Posición", placements:["Arriba","Centro","Abajo"], sizes:["Pequeño","Mediano","Grande"],
    additional:"Más ajustes: densidad, visibilidad y fotograma breve experimental",
    design:"Diseño de vídeo", designHint:"Escena, ambiente y sonidos originales", sound:"Audio", adjustAudio:"Elegir audio",
    scenery:"Elige una escena", moreScenes:"Todas las escenas", preview:"Vista previa", previewHint:"Solo vista previa, sin exportar",
    previewButton:"Ver vídeo real", create:"Crear vídeo", use:"En vídeo", privacy:"Tus notas y frases se quedan en el navegador. Solo con permiso se envían códigos generales a la IA gratuita; nunca a CRM.",
    themeNames:{energy:"Energía",money:"Dinero",relationships:"Relaciones",goals:"Metas",life:"Vida",health:"Bienestar"},
    enabledNote:"Activa para incluir las frases seleccionadas en tu vídeo",
    aiConsent:"Acepto enviar solo códigos generales de tema, dificultad, meta y tono a la IA gratuita de Google u OpenRouter. NO se envían notas, pruebas, perfil ni frases personales. Los proveedores gratuitos pueden usar solicitudes para mejorar modelos.",
    aiRun:"Generar cinco frases de IA",aiBusy:"Creando frases…",
    aiFallback:"La IA gratuita no está disponible. Se usaron sugerencias locales editables.",aiSignIn:"Inicia sesión para usar IA gratuita. Las frases locales no lo requieren.",
    aiReady:"Borrador de IA: revisa y edita las cinco frases ·",aiLocalNote:"Las notas se interpretaron en el dispositivo; no se envió texto personal.",aiTone:"Tono",
    aiTones:["Suave","Práctico","Inspirador"],
    aiProvider:"Proveedor de IA",aiProviders:["Auto · Gemini → OpenRouter","Gemini","OpenRouter"],
  },
} as const;

export function MandalaHypnoCompact({
  locale, theme, settings, onChange, disabled=false, scenes, activeScene, activePoster,
  onSelectScene, onSelectTheme, onPreview, onCreate,
}: {
  locale:VideoLocale; theme:VideoTheme; settings:AffirmationSettings;
  onChange:(next:AffirmationSettings)=>void; disabled?:boolean;
  scenes:SceneOption[]; activeScene:string; activePoster?:string|null;
  onSelectScene:(id:string)=>void; onSelectTheme:(next:VideoTheme)=>void; onPreview:()=>void; onCreate:()=>void;
}) {
  const ui=copy[locale];
  const [open,setOpen]=useState<EditPanel>(null);
  const [problemIndex,setProblemIndex]=useState(0);
  const [goalId,setGoalId]=useState<VideoAffirmationGoal>(topicGoals[theme][0]);
  const [problemNote,setProblemNote]=useState("");
  const [goalNote,setGoalNote]=useState("");
  const [selectionSource,setSelectionSource]=useState<"smart"|"ready"|"tests"|"ai">("ready");
  const [aiConsent,setAiConsent]=useState(false);
  const [aiBusy,setAiBusy]=useState(false);
  const [aiTone,setAiTone]=useState<"gentle"|"grounded"|"inspiring">("gentle");
  const [aiProvider,setAiProvider]=useState<"auto"|"gemini"|"openrouter">("auto");
  const [aiMessage,setAiMessage]=useState("");
  const issue=hypnoRequestProblems[locale][theme][problemIndex] || hypnoRequestProblems[locale][theme][0];
  const goal=affirmationGoalCatalog[locale].find(item=>item.id===goalId) || affirmationGoalCatalog[locale][0];
  const lines=linesForVideoAffirmations(locale,theme,settings);
  const position=settings.position||"center";
  const scale=settings.textScale||"medium";
  const selectedCount=settings.selected.length;
  const [showHint,setShowHint]=useState(false);

  const toggle=(panel:Exclude<EditPanel,null>)=>setOpen(current=>current===panel?null:panel);
  const applyLocal=(issueIndex:number,goal:VideoAffirmationGoal)=>{
    const suggestions=buildHypnoRequestPhrases(locale,theme,issueIndex,goal);
    onChange({...settings,enabled:true,presetOverride:suggestions,selected:[0,1,2]});
    setSelectionSource("smart");setOpen(null);
  };
  const propose=()=>applyLocal(problemIndex,goalId);
  const generateAiPhrases=async()=>{
    if(disabled||aiBusy||!aiConsent)return;
    setAiBusy(true);setAiMessage("");
    try{
      const local=resolvePrivateHypnoCodes({
        locale,theme,problemNote,goalNote,problemIndex,goalId,
      });
      if(local.privateDescriptionInterpreted){
        setProblemIndex(local.problemIndex);
        setGoalId(local.goalId);
      }
      // Only selected non-identifying codes. NEVER transmit problemNote,
      // goalNote, test results, custom phrases, client profile or symptoms.
      const response=await fetch("/api/holistic-support/meditation-writer/affirmations",{
        method:"POST",cache:"no-store",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({locale,theme,problemIndex:local.problemIndex,goalId:local.goalId,tone:aiTone,
          focus:"agency",providerPreference:aiProvider,externalModelOptIn:true}),
      });
      const result=await response.json() as {
        status?:string;phrases?:string[];provider?:string;
      };
      if(!response.ok || result.status!=="draft_review_required" ||
         !Array.isArray(result.phrases) || result.phrases.length!==5 ||
         result.phrases.some(line=>typeof line!=="string"||
           Array.from(line).length>36)){
        applyLocal(local.problemIndex,local.goalId);
        setAiMessage((response.status===401?ui.aiSignIn:ui.aiFallback)+
          (local.privateDescriptionInterpreted?" "+ui.aiLocalNote:""));
        return;
      }
      onChange({...settings,enabled:true,presetOverride:result.phrases,
        selected:[0,1,2,3,4]});
      setSelectionSource("ai");
      setAiMessage(ui.aiReady+" "+(result.provider==="openrouter_free"?
        "OpenRouter Free":"Gemini Free")+
        (local.privateDescriptionInterpreted?" · "+ui.aiLocalNote:""));
    }catch{
      propose();setAiMessage(ui.aiFallback);
    }finally{setAiBusy(false);}
  };
  const ready=()=>{
    onChange({...settings,enabled:true,presetOverride:undefined,selected:[0,1,2]});
    setSelectionSource("ready");setOpen(null);
  };
  const changeTheme=(next:VideoTheme)=>{
    if(next===theme)return;
    onSelectTheme(next);
    setProblemIndex(0);setGoalId(topicGoals[next][0]);
    onChange({...settings,enabled:settings.enabled,presetOverride:undefined,selected:[0,1,2]});
    setSelectionSource("ready");
    setOpen("request");
  };

  return (
    <section className={css.overview} data-hypno-overview aria-label={locale==="ru"?"Персональные гипноаффирмации":ui.phrases}>
      <section className={css.card} data-hypno-request>
        <div className={css.cardHead}>
          <span className={css.emblem}><Target size={20} aria-hidden="true"/></span>
          <div className={css.heading}><h4>{ui.request}</h4><p>{ui.requestHint}</p></div>
          <button type="button" className={css.edit} data-hypno-request-edit
            disabled={disabled} aria-expanded={open==="request"} aria-controls="hypno-request-options"
            onClick={()=>toggle("request")}>{ui.change}<Pencil size={14} aria-hidden="true"/></button>
        </div>
        <div className={css.requestPreview}>
          <div><span className={css.micro}>{ui.current}</span><strong>{issue.label}</strong></div>
          <ChevronRight size={19} color="#8da99d" aria-hidden="true"/>
          <div><span className={css.micro}>{ui.desired}</span><strong>{goal.label}</strong></div>
        </div>
        {open==="request"&&<div className={css.editPane} id="hypno-request-options" data-hypno-request-options>
          <label className={css.fieldLabel} htmlFor="hypno-quick-theme">{ui.theme}</label>
          <select id="hypno-quick-theme" value={theme} disabled={disabled}
            onChange={event=>changeTheme(event.target.value as VideoTheme)}>
            {primaryThemes.map(item=><option key={item} value={item}>{ui.themeNames[item]}</option>)}
            {(["life","health"] as const).map(item=><option key={item} value={item}>{ui.themeNames[item]}</option>)}
          </select>
          <strong className={css.fieldLabel}>{ui.problem}</strong>
          <div className={css.chipGrid}>
            {hypnoRequestProblems[locale][theme].map((item,i)=><button key={item.label}
              type="button" data-hypno-problem={i} aria-pressed={problemIndex===i}
              disabled={disabled} onClick={()=>setProblemIndex(i)}>{item.label}</button>)}
          </div>
          <textarea rows={2} value={problemNote} maxLength={400} disabled={disabled}
            aria-label={ui.optional} placeholder={ui.problemPlaceholder}
            onChange={event=>setProblemNote(event.target.value)}/>
          <strong className={css.fieldLabel}>{ui.goal}</strong>
          <div className={css.chipGrid}>
            {topicGoals[theme].map(id=>{
              const row=affirmationGoalCatalog[locale].find(entry=>entry.id===id);
              return row?<button type="button" key={id} aria-pressed={goalId===id}
                data-hypno-goal={id} disabled={disabled} onClick={()=>setGoalId(id)}>{row.label}</button>:null;
            })}
          </div>
          <textarea rows={2} value={goalNote} maxLength={400} disabled={disabled}
            aria-label={ui.goalPlaceholder} placeholder={ui.goalPlaceholder}
            onChange={event=>setGoalNote(event.target.value)}/>
          <small className={css.contextNote}>{ui.optional}</small>
          <button type="button" className={css.apply} data-hypno-apply-request
            disabled={disabled} onClick={propose}><WandSparkles size={17} aria-hidden="true"/>{ui.apply}</button>
        </div>}
      </section>

      <section className={css.card} data-hypno-phrases>
        <div className={css.cardHead}>
          <span className={css.emblem}><Sparkles size={20} aria-hidden="true"/></span>
          <div className={css.heading}><h4>{ui.phrases}</h4><p>{ui.phraseHint}</p></div>
          <button type="button" className={css.edit} data-hypno-phrases-edit
            disabled={disabled} aria-expanded={open==="phrases"} aria-controls="hypno-phrase-options"
            onClick={()=>toggle("phrases")}>{ui.change}<Pencil size={14} aria-hidden="true"/></button>
        </div>
        <div className={css.modeRail} role="group" aria-label={ui.phrases}>
          <button type="button" data-hypno-smart disabled={disabled}
            aria-pressed={selectionSource==="smart"} onClick={propose}><Sparkles size={16} aria-hidden="true"/>{ui.smart}</button>
          <button type="button" data-hypno-ready disabled={disabled}
            aria-pressed={selectionSource==="ready"} onClick={ready}>{ui.ready}</button>
          <button type="button" data-hypno-tests disabled={disabled}
            aria-pressed={selectionSource==="tests"} onClick={()=>{setOpen("phrases");setShowHint(true);}}>{ui.tests}</button>
        </div>
        <div className={css.aiWriter} data-hypno-ai-writer>
          <div className={css.aiWriterRow}>
            <label className={css.aiConsent}>
              <input type="checkbox" checked={aiConsent} disabled={disabled||aiBusy}
                onChange={event=>setAiConsent(event.target.checked)}/>
              <span>{ui.aiConsent}</span>
            </label>
            <label className={css.aiTone}>{ui.aiTone}
              <select value={aiTone} disabled={disabled||aiBusy}
                onChange={event=>setAiTone(event.target.value as typeof aiTone)}>
                {(["gentle","grounded","inspiring"] as const).map((tone,i)=>
                  <option key={tone} value={tone}>{ui.aiTones[i]}</option>)}
              </select>
            </label>
            <label className={css.aiProvider}>{ui.aiProvider}
              <select value={aiProvider} data-hypno-ai-provider
                disabled={disabled||aiBusy} onChange={event=>{
                  setAiProvider(event.target.value as typeof aiProvider);setAiMessage("");
                }}>
                {(["auto","gemini","openrouter"] as const).map((id,i)=>
                  <option key={id} value={id}>{ui.aiProviders[i]}</option>)}
              </select>
            </label>
          </div>
          <button type="button" className={css.aiRun} data-hypno-ai-generate
            disabled={disabled||aiBusy||!aiConsent}
            onClick={()=>{void generateAiPhrases();}}>
            <Sparkles size={16} aria-hidden="true"/>
            {aiBusy?ui.aiBusy:ui.aiRun}
          </button>
          {aiMessage&&<p className={css.aiMessage} role="status"
            data-hypno-ai-feedback>{aiMessage}</p>}
        </div>
        <div className={css.phraseCounter}>{selectedCount}/5 {ui.selected}<span>{selectionSource==="smart"||selectionSource==="ai"?ui.byRequest:""}</span></div>
        <div className={css.selectedPhrases}>
          {lines.slice(0,3).map((sentence,i)=><span key={i}><Check size={14} aria-hidden="true"/>{sentence}</span>)}
        </div>
        <div className={css.phraseFoot}>
          <button type="button" disabled={disabled} onClick={()=>toggle("phrases")}>{ui.choices}<ChevronDown size={14}/></button>
          <Link href={"/"+locale+"/tests"} prefetch={false}>{locale==="ru"?"Пройти тест":locale==="es"?"Hacer una prueba":"Take a test"}</Link>
        </div>
        {open==="phrases"&&<div className={css.legacyEditor} id="hypno-phrase-options" data-hypno-phrase-editor>
          {showHint&&<div className={css.testEntry}>
            <p className={css.contextNote}>{ui.testsHelp}</p>
            <div className={css.designFoot}>
              <Link href={"/"+locale+"/tests"} prefetch={false}>{locale==="ru"?"Пройти тест":locale==="es"?"Hacer una prueba":"Take a test"}</Link>
              <Link href={"/"+locale+"/personality-profiles"} prefetch={false}>{locale==="ru"?"Заполнить профиль":locale==="es"?"Completar perfil":"Build my profile"}</Link>
            </div>
          </div>}
          <MandalaVideoAffirmations locale={locale} theme={theme} settings={settings} onChange={onChange} disabled={disabled}
            onTestPersonalization={()=>setSelectionSource("tests")}/>
        </div>}
      </section>

      <section className={css.card} data-hypno-display>
        <div className={css.cardHead}>
          <span className={css.emblem}><SlidersHorizontal size={20} aria-hidden="true"/></span>
          <div className={css.heading}><h4>{ui.display}</h4><p>{ui.displayHint}</p></div>
          <button type="button" className={css.edit} disabled={disabled}
            data-hypno-display-edit aria-expanded={open==="display"} aria-controls="hypno-display-options"
            onClick={()=>toggle("display")}>{ui.change}<Pencil size={14} aria-hidden="true"/></button>
        </div>
        <div className={css.metaGrid}>
          <div><small>{ui.every}</small><strong>{settings.frequency===1?"8":settings.frequency===3?"3":"5"} {locale==="ru"?"сек":locale==="es"?"s":"sec"}</strong></div>
          <div><small>{ui.size}</small><strong>{ui.sizes[scale==="small"?0:scale==="large"?2:1]}</strong></div>
          <div><small>{ui.position}</small><strong>{ui.placements[position==="top"?0:position==="bottom"?2:1]}</strong></div>
        </div>
        {open==="display"&&<fieldset className={css.editPane} id="hypno-display-options" disabled={disabled} data-hypno-display-options>
          <strong className={css.fieldLabel}>{ui.every}</strong>
          <div className={css.chipGrid}>{([1,2,3] as const).map((v,i)=><button type="button" key={v}
            data-hypno-frequency={v} aria-pressed={settings.frequency===v}
            onClick={()=>onChange({...settings,frequency:v})}>{[8,5,3][i]} {locale==="ru"?"сек":"s"}</button>)}</div>
          <strong className={css.fieldLabel}>{ui.size}</strong>
          <div className={css.chipGrid}>{(["small","medium","large"] as TextScale[]).map((value,i)=><button type="button" key={value}
            data-hypno-size={value} aria-pressed={scale===value}
            onClick={()=>onChange({...settings,textScale:value})}>{ui.sizes[i]}</button>)}</div>
          <strong className={css.fieldLabel}>{ui.position}</strong>
          <div className={css.chipGrid}>{(["top","center","bottom"] as Position[]).map((value,i)=><button type="button" key={value}
            data-hypno-position={value} aria-pressed={position===value}
            onClick={()=>onChange({...settings,position:value})}>{ui.placements[i]}</button>)}</div>
          <small className={css.contextNote}>{ui.additional}</small>
          <button type="button" className={css.secondaryAction} onClick={()=>setOpen("phrases")}>{ui.change} · {ui.additional}<ChevronRight size={14}/></button>
        </fieldset>}
      </section>

      <section className={css.card} data-hypno-design>
        <div className={css.cardHead}>
          <span className={css.emblem}><Film size={20} aria-hidden="true"/></span>
          <div className={css.heading}><h4>{ui.design}</h4><p>{ui.designHint}</p></div>
          <button type="button" className={css.edit} disabled={disabled}
            data-hypno-design-edit aria-expanded={open==="design"} aria-controls="hypno-design-options"
            onClick={()=>toggle("design")}>{ui.change}<Pencil size={14} aria-hidden="true"/></button>
        </div>
        <div className={css.sceneRail} aria-label={ui.scenery}>
          {scenes.map(scene=><button type="button" key={scene.id} disabled={disabled}
            aria-pressed={activeScene===scene.id} data-hypno-scene={scene.id}
            onClick={()=>onSelectScene(scene.id)}>
            <span className={css.scenePhoto}>
              {scene.poster?<Image src={scene.poster} width={100} height={74} unoptimized alt=""/>:<span className={css.sceneFallback}>{scene.symbol}</span>}
              {activeScene===scene.id&&<Check className={css.sceneCheck} size={18} aria-hidden="true"/>}
            </span>
            <span className={css.sceneLabel}>{scene.label}</span>
          </button>)}
        </div>
        <div className={css.designFoot}>
          <a href="#video-templates">{ui.moreScenes}<ChevronRight size={14}/></a>
          <a href="#video-audio">{ui.sound} · {ui.adjustAudio}<ChevronRight size={14}/></a>
        </div>
        {open==="design"&&<div className={css.editPane} id="hypno-design-options">
          <p className={css.contextNote}>{ui.scenery}</p>
          <div className={css.chipGrid}>
            {primaryThemes.map(item=><button key={item} type="button" disabled={disabled}
              aria-pressed={theme===item} onClick={()=>changeTheme(item)}>{ui.themeNames[item]}</button>)}
          </div>
          <div className={css.designFoot}><a href="#video-templates">{ui.moreScenes}</a><a href="#video-audio">{ui.adjustAudio}</a></div>
        </div>}
      </section>

      <label className={css.enable}>
        <input type="checkbox" data-hypno-overview-enable checked={settings.enabled} disabled={disabled}
          onChange={event=>onChange({...settings,enabled:event.target.checked})}/>
        <span>{ui.use}</span>
        {!settings.enabled&&<small>{ui.enabledNote}</small>}
      </label>
      <section className={css.preview} data-hypno-preview style={activePoster?{backgroundImage:"linear-gradient(95deg,rgba(5,38,34,.93),rgba(5,38,34,.28)),url("+activePoster+")"}:undefined}>
        <div>
          <small>{ui.preview}</small>
          <strong>{lines[0]||suggestedVideoAffirmations[locale][theme][0]}</strong>
          <span>{selectedCount}/5 {ui.selected} · {settings.frequency===1?8:settings.frequency===3?3:5} {locale==="ru"?"сек":"s"}</span>
        </div>
        <button type="button" data-video-affirmation-preview disabled={disabled}
          onClick={onPreview}><CirclePlay size={19} aria-hidden="true"/>{ui.previewButton}<ChevronRight size={15}/></button>
      </section>
      <button type="button" className={css.create} data-hypno-create-video disabled={disabled||!settings.enabled}
        onClick={onCreate}><Sparkles size={18} aria-hidden="true"/>{ui.create}<ChevronRight size={16}/></button>
      <p className={css.privacy}>{ui.privacy} <span>{ui.previewHint}</span></p>
    </section>
  );
}
