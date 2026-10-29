"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowRight, Check, ChevronRight, Download, Film, ShieldCheck, Sparkles, X} from "lucide-react";
import {buildCinematicStoryboard,CINEMATIC_STYLES,CINEMATIC_THEMES} from "@/lib/mandala/cinematic-director.mjs";
import {buildCinematicAssemblyManifest,listCinematicRoutes} from "@/lib/mandala/cinematic-production.mjs";
import {graphemeTrim} from "@/lib/mandala/personal-video-intent.mjs";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-cinematic-director.module.css";

export type CinematicShot={number:number;title:string;theme:VideoTheme;sceneId:string;
  startSeconds:number;durationSeconds:number;camera:string;providerPrompt:string;visualCue:string};
export type CinematicStoryboard={version:string;theme:VideoTheme;locale:string;styleId:string;
  durationSeconds:number;aspect:"portrait"|"square"|"landscape";shots:CinematicShot[];
  shotCount:number;noExternalClientData:boolean;paidRenderApproved:boolean;localPreview:boolean};
type Field="theme"|"difficulty"|"goal"|"style"|"avoid";
type Props={locale:PublicLocale;theme:VideoTheme;disabled:boolean;onApplyStoryboard:(plan:CinematicStoryboard)=>void};
const copy={
  en:{title:"Cinematic director",tag:"NEW · LOCAL & PRIVATE",
    intro:"Describe the atmosphere and change you would like to explore. Get four connected scenes, not a random AI clip.",
    open:"Plan my film",close:"Close director",edit:"Edit",done:"Done",back:"Back",
    theme:"Topic",difficulty:"Main challenge",goal:"Desired change",style:"Visual style",avoid:"Avoid these images",
    choose:"Choose a visual direction",custom:"In your own words",goalHint:"A voluntary, realistic next step, not a promise.",
    difficultyPlaceholder:"For example, feeling unsure at work",
    goalPlaceholder:"For example, approach a conversation more calmly",
    avoidPlaceholder:"For example, dark forests or water",
    format:"Format",length:"Length",seconds:"sec",plan:"Create storyboard",refresh:"Update storyboard",
    shots:"Four connected scenes",camera:"Camera",privacy:"Only pre-approved visual words may be used in an external AI prompt. Your problem, goals, photo and test results stay in this browser.",
    safe:"Provider-safe visual prompt",local:"Use as free moving montage",localHint:"Applies four animated scenes to the EXISTING local recorder. Press Create video below; no provider render or charge is started.",
    download:"Save safe storyboard",quote:"AI Premium · estimate required",quoteHelp:"Kling/Runway/Higgsfield remain quote-only: payment, owner approval and verified provider delivery are not enabled here.",
    myVideos:"My videos",myVideosHint:"Private account saving is available only after separate consent and cloud activation.",
    applied:"Montage selected. Use the existing Create video button to record it.",noData:"No information is sent to a provider.",
    themes:{energy:"Energy",money:"Money & work",relationships:"Relationships",goals:"Goals & purpose",life:"Everyday life",health:"Rest & wellbeing"}},
  ru:{title:"Кинорежиссёр",tag:"НОВОЕ · ЛОКАЛЬНО И ПРИВАТНО",
    intro:"Опишите желаемые изменения и атмосферу. Получите четыре связанных сюжета вместо случайных кадров.",
    open:"Спланировать фильм",close:"Закрыть режиссёра",edit:"Изменить",done:"Готово",back:"Назад",
    theme:"Тема",difficulty:"Главная сложность",goal:"Желаемое изменение",style:"Визуальный стиль",avoid:"Нежелательные образы",
    choose:"Выберите художественное направление",custom:"Своими словами",goalHint:"Посильный желаемый шаг, без гарантий результата.",
    difficultyPlaceholder:"Например, неуверенность в рабочем разговоре",
    goalPlaceholder:"Например, говорить спокойнее и свободнее",
    avoidPlaceholder:"Например, тёмный лес или вода",
    format:"Формат",length:"Длительность",seconds:"сек",plan:"Сформировать раскадровку",refresh:"Обновить раскадровку",
    shots:"Четыре связанные сцены",camera:"Камера",privacy:"Внешнему AI допускаются только проверенные описания образов. Проблема, цели, фото и результаты тестов остаются в браузере.",
    safe:"Безопасный визуальный промпт",local:"Применить бесплатный видеомонтаж",localHint:"Четыре анимированные сцены подготовятся в СУЩЕСТВУЮЩЕМ редакторе. Нажмите ниже «Создать видео». Платного рендера нет.",
    download:"Сохранить раскадровку",quote:"AI Premium · нужна смета",quoteHelp:"Kling/Runway/Higgsfield пока только для оценки возможностей: оплата, утверждение расходов и доставка AI-фильма здесь не включены.",
    myVideos:"Мои видео",myVideosHint:"Приватное облачное хранение включается отдельно, с согласием владельца.",
    applied:"Монтаж подготовлен. Нажмите существующую кнопку «Создать видео».",noData:"Ничего не отправлено внешнему сервису.",
    themes:{energy:"Энергия",money:"Деньги и работа",relationships:"Отношения",goals:"Цели и смыслы",life:"Жизнь",health:"Отдых и самочувствие"}},
  es:{title:"Director cinematográfico",tag:"NUEVO · LOCAL Y PRIVADO",
    intro:"Describe los cambios y el ambiente que deseas explorar. Crea cuatro escenas conectadas.",
    open:"Planificar mi película",close:"Cerrar director",edit:"Editar",done:"Listo",back:"Volver",
    theme:"Tema",difficulty:"Dificultad principal",goal:"Cambio deseado",style:"Estilo visual",avoid:"Evitar estas imágenes",
    choose:"Elige una dirección visual",custom:"Con tus palabras",goalHint:"Un paso voluntario y posible, sin promesas.",
    difficultyPlaceholder:"Por ejemplo, inseguridad en una conversación",
    goalPlaceholder:"Por ejemplo, hablar con más calma",
    avoidPlaceholder:"Por ejemplo, bosque oscuro o agua",
    format:"Formato",length:"Duración",seconds:"s",plan:"Crear guion visual",refresh:"Actualizar guion visual",
    shots:"Cuatro escenas conectadas",camera:"Cámara",privacy:"Solo se pueden compartir descripciones visuales aprobadas con IA. Tus dificultades, metas, fotos y tests permanecen en el navegador.",
    safe:"Prompt visual seguro",local:"Usar montaje animado gratis",localHint:"Aplica cuatro escenas animadas al grabador LOCAL existente. Pulsa Crear vídeo; sin costes externos.",
    download:"Guardar guion visual",quote:"AI Premium · presupuesto requerido",quoteHelp:"Kling/Runway/Higgsfield solo para cotización: el pago, la aprobación y la entrega externa aún no están habilitados.",
    myVideos:"Mis vídeos",myVideosHint:"El almacenamiento privado requiere consentimiento y activación.",
    applied:"Montaje preparado. Pulsa el botón existente Crear vídeo.",noData:"No se enviaron datos a proveedores.",
    themes:{energy:"Energía",money:"Dinero y trabajo",relationships:"Relaciones",goals:"Metas y sentido",life:"Vida",health:"Descanso y bienestar"}},
} as const;
const FIELDS:Field[]=["theme","difficulty","goal","style","avoid"];
export function MandalaCinematicDirector({locale,theme,disabled,onApplyStoryboard}:Props){
  const t=copy[locale]||copy.en;
  const [expanded,setExpanded]=useState(false);
  const [editing,setEditing]=useState<Field|null>(null);
  const [topic,setTopic]=useState<VideoTheme>(theme);
  const [difficulty,setDifficulty]=useState("");
  const [goal,setGoal]=useState("");
  const [avoid,setAvoid]=useState("");
  const [style,setStyle]=useState("warm");
  const [aspect,setAspect]=useState<"portrait"|"square"|"landscape">("landscape");
  const [seconds,setSeconds]=useState<20|30|60>(20);
  const [generated,setGenerated]=useState(false);
  const [applied,setApplied]=useState(false);
  const editRef=useRef<HTMLButtonElement>(null);
  const plan=useMemo(()=>buildCinematicStoryboard({
    locale,theme:topic,style,aspect,durationSeconds:seconds,wish:goal+" "+difficulty,avoid,
  }),[locale,topic,style,aspect,seconds,goal,difficulty,avoid]);
  const manifest=useMemo(()=>buildCinematicAssemblyManifest(plan),[plan]);
  const candidates=useMemo(()=>listCinematicRoutes({visibility:"client_private"}),[]);
  // A local storyboard survives Apply when its chosen topic becomes the parent topic.
  // A genuinely external topic change resets the stale draft instead.
  const parentThemeRef=useRef(theme);
  useEffect(()=>{
    if(parentThemeRef.current===theme)return;
    parentThemeRef.current=theme;
    if(topic!==theme){setTopic(theme);setGenerated(false);setApplied(false);}
  },[theme,topic]);
  useEffect(()=>{
    if(!editing)return;
    editRef.current?.focus();
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setEditing(null);};
    window.addEventListener("keydown",escape);
    return()=>window.removeEventListener("keydown",escape);
  },[editing]);
  const values:Record<Field,string>={
    theme:t.themes[topic],difficulty:difficulty||"—",goal:goal||"—",
    style:CINEMATIC_STYLES[style].name[locale],avoid:avoid||"—",
  };
  const fieldValue=(field:Field)=>field==="difficulty"?difficulty:field==="goal"?goal:avoid;
  const fieldChange=(field:Field,value:string)=>{
    const clean=graphemeTrim(value,160);
    if(field==="difficulty")setDifficulty(clean);
    else if(field==="goal")setGoal(clean);
    else if(field==="avoid")setAvoid(clean);
    setGenerated(false);setApplied(false);
  };
  const selectTopic=(next:VideoTheme)=>{setTopic(next);setGenerated(false);setApplied(false);};
  const selectStyle=(next:string)=>{setStyle(next);setGenerated(false);setApplied(false);};
  const onPlan=()=>{setGenerated(true);setApplied(false);};
  const apply=()=>{
    onApplyStoryboard(plan as CinematicStoryboard);
    setApplied(true);
  };
  const save=()=>{
    const safeManifest={...manifest,shots:plan.shots.map(s=>({title:s.title,camera:s.camera,
      visualCue:s.visualCue,providerPrompt:s.providerPrompt,...manifest.clips[s.number-1]}))};
    const url=URL.createObjectURL(new Blob([JSON.stringify(safeManifest,null,2)+"\n"],
      {type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="holistic-house-cinematic-storyboard.json";
    document.body.appendChild(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1200);
  };
  return <section className={css.root} id="cinematic-director" data-cinematic-director
    data-director-open={expanded?"true":"false"} aria-label={t.title}>
    <div className={css.hero}>
      <span className={css.icon}><Film size={22} aria-hidden="true"/></span>
      <div className={css.heading}><small>{t.tag}</small><h3>{t.title}</h3><p>{t.intro}</p></div>
      <button type="button" className={css.open} disabled={disabled}
        aria-expanded={expanded} aria-controls="cinematic-director-content"
        onClick={()=>{setExpanded(o=>!o);setEditing(null);}}>
        {expanded?t.close:t.open}<ChevronRight size={16} aria-hidden="true"/>
      </button>
    </div>
    {expanded?<div id="cinematic-director-content" className={css.body}>
      <div className={css.fields}>
        {FIELDS.map(field=><button type="button" key={field} className={css.field}
          data-director-field={field} disabled={disabled} onClick={()=>setEditing(field)}>
          <span><small>{t[field]}</small><strong>{values[field]}</strong></span>
          <span className={css.edit}>{t.edit}<ChevronRight size={15} aria-hidden="true"/></span>
        </button>)}
      </div>
      <div className={css.options}>
        <fieldset disabled={disabled}><legend>{t.format}</legend>
          <div className={css.chips}>
            {(["landscape","portrait","square"] as const).map((v,i)=><button type="button" key={v}
              aria-pressed={aspect===v} onClick={()=>{setAspect(v);setGenerated(false);}}>
              {["16:9","9:16","1:1"][i]}</button>)}
          </div>
        </fieldset>
        <fieldset disabled={disabled}><legend>{t.length}</legend>
          <div className={css.chips}>{([20,30,60] as const).map(v=>
            <button key={v} type="button" aria-pressed={seconds===v}
              onClick={()=>{setSeconds(v);setGenerated(false);}}>{v} {t.seconds}</button>)}
          </div>
        </fieldset>
      </div>
      <button type="button" className={css.primary} data-director-create-plan disabled={disabled}
        onClick={onPlan}><Sparkles size={17} aria-hidden="true"/>{generated?t.refresh:t.plan}</button>
      <p className={css.privacy}><ShieldCheck size={15} aria-hidden="true"/>{t.privacy}</p>
      {generated?<div className={css.story} data-director-storyboard>
        <h4>{t.shots} · {manifest.durationSeconds} {t.seconds}</h4>
        <div className={css.shots}>{plan.shots.map(shot=><article key={shot.id}
          className={css.shot} data-director-shot={shot.number}>
          <span className={css.number}>{String(shot.number).padStart(2,"0")}</span>
          <div><strong>{shot.title}</strong><p>{shot.visualCue}</p>
            <small>{shot.startSeconds}–{shot.startSeconds+shot.durationSeconds} {t.seconds} · {shot.sceneId}</small>
            <details><summary>{t.safe}</summary><p>{shot.providerPrompt}</p></details></div>
        </article>)}</div>
        <button type="button" className={css.primary} data-director-apply-montage
          disabled={disabled} onClick={apply}><Check size={18} aria-hidden="true"/>{t.local}</button>
        <p className={css.helper}>{applied?t.applied:t.localHint}</p>
        <div className={css.secondary}>
          <button type="button" onClick={save}><Download size={16} aria-hidden="true"/>{t.download}</button>
          <Link prefetch={false} href={"/"+locale+"/app/videos"}>{t.myVideos}<ArrowRight size={14} aria-hidden="true"/></Link>
        </div><p className={css.helper}>{t.myVideosHint}</p>
        <div className={css.quote} data-director-provider-quote><strong>{t.quote}</strong>
          <p>{t.quoteHelp}</p><small>{candidates.filter(c=>c.id!=="local").map(c=>c.label).join(" · ")}</small></div>
      </div>:null}
    </div>:null}
    {editing?<div className={css.backdrop} role="presentation">
      <div className={css.sheet} role="dialog" aria-modal="true" aria-labelledby="director-edit-title">
        <div className={css.sheetHead}><h3 id="director-edit-title">{t[editing]}</h3>
          <button type="button" ref={editRef} onClick={()=>setEditing(null)} aria-label={t.back}>
            <X size={20} aria-hidden="true"/></button></div>
        {editing==="theme"?<div className={css.sheetChoices} role="group" aria-label={t.theme}>
          {(CINEMATIC_THEMES as VideoTheme[]).map(item=><button type="button" key={item}
            aria-pressed={topic===item} onClick={()=>selectTopic(item)}>{t.themes[item]}</button>)}
        </div>:editing==="style"?<div className={css.sheetChoices} role="group" aria-label={t.choose}>
          {Object.entries(CINEMATIC_STYLES).map(([id,item])=><button type="button" key={id}
            aria-pressed={style===id} onClick={()=>selectStyle(id)}>{item.name[locale]}</button>)}
        </div>:<label className={css.freeText}><span>{t.custom}</span>
          <textarea rows={5} maxLength={160} value={fieldValue(editing)}
            placeholder={editing==="difficulty"?t.difficultyPlaceholder:editing==="goal"?t.goalPlaceholder:t.avoidPlaceholder}
            onChange={event=>fieldChange(editing,event.target.value)}/>
          {editing==="goal"?<small>{t.goalHint}</small>:null}
        </label>}
        <p className={css.privacy}>{t.noData}</p>
        <button type="button" className={css.primary} onClick={()=>setEditing(null)}>
          <Check size={17} aria-hidden="true"/>{t.done}</button>
      </div>
    </div>:null}
  </section>;
}
