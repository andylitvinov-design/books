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
    previewButton:"Preview real video", use:"In video", privacy:"Your words stay in this browser. No AI/CRM upload.",
    themeNames:{energy:"Energy",money:"Money",relationships:"Love",goals:"Goals",life:"Life",health:"Wellbeing"},
    enabledNote:"Switch on to include the chosen phrases in the video",
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
    previewButton:"Просмотреть видео", use:"В видео", privacy:"Ваши фразы остаются в браузере. Без отправки в AI и CRM.",
    themeNames:{energy:"Энергия",money:"Деньги",relationships:"Отношения",goals:"Цели",life:"Жизнь",health:"Самочувствие"},
    enabledNote:"Включите, чтобы выбранные фразы вошли в видео",
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
    previewButton:"Ver vídeo real", use:"En vídeo", privacy:"Tus frases permanecen en este navegador. Sin envío a IA ni CRM.",
    themeNames:{energy:"Energía",money:"Dinero",relationships:"Relaciones",goals:"Metas",life:"Vida",health:"Bienestar"},
    enabledNote:"Activa para incluir las frases seleccionadas en tu vídeo",
  },
} as const;

export function MandalaHypnoCompact({
  locale, theme, settings, onChange, disabled=false, scenes, activeScene, activePoster,
  onSelectScene, onSelectTheme, onPreview,
}: {
  locale:VideoLocale; theme:VideoTheme; settings:AffirmationSettings;
  onChange:(next:AffirmationSettings)=>void; disabled?:boolean;
  scenes:SceneOption[]; activeScene:string; activePoster?:string|null;
  onSelectScene:(id:string)=>void; onSelectTheme:(next:VideoTheme)=>void; onPreview:()=>void;
}) {
  const ui=copy[locale];
  const [open,setOpen]=useState<EditPanel>(null);
  const [problemIndex,setProblemIndex]=useState(0);
  const [goalId,setGoalId]=useState<VideoAffirmationGoal>(topicGoals[theme][0]);
  const [problemNote,setProblemNote]=useState("");
  const [goalNote,setGoalNote]=useState("");
  const [selectionSource,setSelectionSource]=useState<"smart"|"ready"|"tests">("ready");
  const issue=hypnoRequestProblems[locale][theme][problemIndex] || hypnoRequestProblems[locale][theme][0];
  const goal=affirmationGoalCatalog[locale].find(item=>item.id===goalId) || affirmationGoalCatalog[locale][0];
  const lines=linesForVideoAffirmations(locale,theme,settings);
  const position=settings.position||"center";
  const scale=settings.textScale||"medium";
  const selectedCount=settings.selected.length;
  const [showHint,setShowHint]=useState(false);

  const toggle=(panel:Exclude<EditPanel,null>)=>setOpen(current=>current===panel?null:panel);
  const propose=()=>{
    const suggestions=buildHypnoRequestPhrases(locale,theme,problemIndex,goalId);
    onChange({...settings,enabled:true,presetOverride:suggestions,selected:[0,1,2]});
    setSelectionSource("smart");setOpen(null);
  };
  const ready=()=>{
    onChange({...settings,enabled:true,presetOverride:undefined,selected:[0,1,2]});
    setSelectionSource("ready");setOpen(null);
  };
  const changeTheme=(next:VideoTheme)=>{
    if(next===theme)return;
    onSelectTheme(next);
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
            aria-pressed={selectionSource==="tests"} onClick={()=>{setSelectionSource("tests");setOpen("phrases");setShowHint(true);}}>{ui.tests}</button>
        </div>
        <div className={css.phraseCounter}>{selectedCount}/5 {ui.selected}<span>{selectionSource==="smart"?ui.byRequest:""}</span></div>
        <div className={css.selectedPhrases}>
          {lines.slice(0,3).map((sentence,i)=><span key={i}><Check size={14} aria-hidden="true"/>{sentence}</span>)}
        </div>
        <div className={css.phraseFoot}>
          <button type="button" disabled={disabled} onClick={()=>toggle("phrases")}>{ui.choices}<ChevronDown size={14}/></button>
          <Link href={"/"+locale+"/tests"} prefetch={false}>{locale==="ru"?"Пройти тест":locale==="es"?"Hacer una prueba":"Take a test"}</Link>
        </div>
        {open==="phrases"&&<div className={css.legacyEditor} id="hypno-phrase-options" data-hypno-phrase-editor>
          {showHint&&<p className={css.contextNote}>{ui.testsHelp}</p>}
          <MandalaVideoAffirmations locale={locale} theme={theme} settings={settings} onChange={onChange} disabled={disabled}/>
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

      <section className={css.preview} data-hypno-preview style={activePoster?{backgroundImage:"linear-gradient(95deg,rgba(5,38,34,.93),rgba(5,38,34,.28)),url("+activePoster+")"}:undefined}>
        <div>
          <small>{ui.preview}</small>
          <strong>{lines[0]||suggestedVideoAffirmations[locale][theme][0]}</strong>
          <span>{selectedCount}/5 {ui.selected} · {settings.frequency===1?8:settings.frequency===3?3:5} {locale==="ru"?"сек":"s"}</span>
        </div>
        <button type="button" data-video-affirmation-preview disabled={disabled}
          onClick={onPreview}><CirclePlay size={19} aria-hidden="true"/>{ui.previewButton}<ChevronRight size={15}/></button>
      </section>
      <label className={css.enable}>
        <input type="checkbox" data-hypno-overview-enable checked={settings.enabled} disabled={disabled}
          onChange={event=>onChange({...settings,enabled:event.target.checked})}/>
        <span>{ui.use}</span>
        {!settings.enabled&&<small>{ui.enabledNote}</small>}
      </label>
      <p className={css.privacy}>{ui.privacy} <span>{ui.previewHint}</span></p>
    </section>
  );
}
