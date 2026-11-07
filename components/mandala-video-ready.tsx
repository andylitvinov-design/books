"use client";

import {useMemo,useState} from "react";
import type {ReactNode} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,Download,Flower2,FolderOpen,Headphones,LockKeyhole,Play,RefreshCw,Send,ShieldCheck,Sparkles,UserRound} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import type {GuidedMeditationFocus} from "./mandala-guided-course";
import {selectResourcePractice} from "@/lib/mandala/resource-practice-selector.mjs";
import css from "./mandala-video-ready.module.css";

type VideoFile={url:string;extension:"mp4"|"webm";bytes:number;duration:number};
type View="home"|"login"|"meditation"|"ritual"|"journey";
type Props={
  locale:PublicLocale;theme:VideoTheme;wish:string;focus:GuidedMeditationFocus;
  video:VideoFile|null;verified:boolean;checking:boolean;signedIn:boolean;
  loginUnavailable:boolean;disabled:boolean;meditationEditor:ReactNode;
  onOpenDelivery:()=>void;onRefreshLogin:()=>void;onOpenCourse:()=>void;onReturnToPro:()=>void;
};
const COPY={
  en:{
    ready:"Your video is ready",preview:"Preview, save or continue your journey.",
    notReady:"Your video is not ready yet",createFirst:"Create and verify a video in PRO first.",
    verifying:"Checking playback on this device…",failed:"No playable exported video is available yet.",
    signIn:"Sign in to save and download",save:"Save to My Videos",download:"Download",
    telegram:"Telegram",house:"My House",continue:"Continue with this video",
    meditation:"Personal meditation",meditationHint:"Turn your video into a gentle guided practice.",
    ritual:"Personal ritual",ritualHint:"Build a simple symbolic practice for your intention.",
    journey:"8-session journey",journeyHint:"Develop your goal through eight connected steps.",
    choose:"Create",back:"Back to Ready",backPro:"Generate a video in PRO",
    authTitle:"Save your video",authHint:"Open your existing Holistic House account in a new tab. Return here so your locally generated video is not lost.",
    authAction:"Sign in to My House",authBack:"Continue to save and share",authRefresh:"Check sign-in",
    authPrivacy:"Your video is private and remains on this device until you explicitly choose to upload it.",
    authFailure:"Account status is unavailable. Your local video remains here. Try again when the connection returns.",
    medTitle:"Create your meditation",medHint:"Your selected focus carries into the existing personal meditation editor.",
    selected:"Based on your chosen goal",medNote:"Generate a script first. Voice, sound and a new video require separate actions and consent.",
    ritTitle:"Create your ritual",ritHint:"A gentle, editable practice generated locally, without AI billing.",
    intention:"Intention",bestMoment:"Best moment",setting:"Setting",action:"Ritual action",phrase:"Anchor phrase (optional)",
    morning:"Morning",evening:"Evening",any:"Any time",quiet:"Quiet corner",nature:"Outdoors",desk:"At my desk",
    observe:"Notice three objects",hand:"Rest a hand on a stable surface",pause:"Take a short pause",
    phrasePlaceholder:"For example: I can choose my pace",generateRitual:"Create personal ritual",
    ritualResult:"Your ritual",structure:"Prepare · Practise · Integrate",
    copy:"Copy ritual text",copied:"Ritual copied to clipboard.",copyError:"Copy unavailable. Select the text instead.",
    another:"Try another gentle variation",ritualPrivacy:"This is a local reflective text, not a recorded video, clinical treatment or scheduled reminder.",
    courseTitle:"Create your 8-session journey",courseHint:"Your chosen focus is used by our existing course planner.",
    openPlanner:"Create my 8-session programme",courseNote:"This prepares eight scripts and scene previews, not eight paid or automatically rendered videos.",
    themes:["Explore","Support","Flexibility","Resources","Boundaries","Steps","Choice","Integration"],
    themesHints:["Name your starting point","Find accessible support","Allow new options","Notice your resources","Choose your boundaries","Try one small step","Make your own choice","Reflect and integrate"],
    settingLabel:"Place",momentLabel:"Moment",actionLabel:"Action",
  },
  ru:{
    ready:"Ваше видео готово",preview:"Посмотрите, сохраните или продолжите практику.",
    notReady:"Видео пока не готово",createFirst:"Сначала создайте ролик в PRO и проверьте воспроизведение.",
    verifying:"Проверяем воспроизведение на устройстве…",failed:"Пока нет проверенного готового видео.",
    signIn:"Войдите, чтобы сохранить и скачать",save:"В Мои видео",download:"Скачать",
    telegram:"Telegram",house:"Мой дом",continue:"Продолжить с этим видео",
    meditation:"Личная медитация",meditationHint:"Превратите видео в бережную практику с сопровождением.",
    ritual:"Личный ритуал",ritualHint:"Создайте небольшую символическую практику под вашу цель.",
    journey:"Курс из 8 занятий",journeyHint:"Восемь связанных шагов для развития вашей темы.",
    choose:"Создать",back:"Назад к Ready",backPro:"Создать видео в PRO",
    authTitle:"Сохранение видео",authHint:"Откройте существующий кабинет Holistic House в новой вкладке. Вернитесь сюда, чтобы локальное видео не потерялось.",
    authAction:"Войти в Мой дом",authBack:"Продолжить сохранение",authRefresh:"Проверить вход",
    authPrivacy:"Видео остаётся на устройстве, пока вы сами не разрешите приватную загрузку.",
    authFailure:"Не удалось проверить вход. Ваше локальное видео осталось здесь. Повторите позже.",
    medTitle:"Создать медитацию",medHint:"Выбранная цель передаётся в действующий редактор медитаций.",
    selected:"По вашей выбранной цели",medNote:"Сначала формируется текст. Голос, музыка и новый ролик — отдельные действия с согласием.",
    ritTitle:"Создать личный ритуал",ritHint:"Бережная локальная практика без платной генерации ИИ.",
    intention:"Намерение",bestMoment:"Удобное время",setting:"Обстановка",action:"Действие",phrase:"Короткая фраза (необязательно)",
    morning:"Утро",evening:"Вечер",any:"Когда удобно",quiet:"Спокойное место",nature:"На природе",desk:"За столом",
    observe:"Замечать три предмета",hand:"Коснуться устойчивой поверхности",pause:"Сделать паузу",
    phrasePlaceholder:"Например: Я могу выбрать свой темп",generateRitual:"Создать личный ритуал",
    ritualResult:"Ваш ритуал",structure:"Подготовка · Практика · Закрепление",
    copy:"Скопировать ритуал",copied:"Текст ритуала скопирован.",copyError:"Не удалось скопировать. Выделите текст вручную.",
    another:"Другой бережный вариант",ritualPrivacy:"Это локальный текст практики, а не готовый видеофайл, лечение или установленное напоминание.",
    courseTitle:"Создать курс из 8 занятий",courseHint:"Выбранная цель используется в существующем конструкторе курса.",
    openPlanner:"Составить мою программу из 8 занятий",courseNote:"Формируются сценарии и превью, а не восемь автоматически созданных или оплаченных видео.",
    themes:["Исследование","Поддержка","Гибкость","Ресурсы","Границы","Шаги","Выбор","Интеграция"],
    themesHints:["Уточнить исходную точку","Найти доступную поддержку","Рассмотреть варианты","Заметить свои опоры","Выбрать границы","Сделать небольшой шаг","Принять своё решение","Осмыслить результат"],
    settingLabel:"Место",momentLabel:"Время",actionLabel:"Действие",
  },
  es:{
    ready:"Tu vídeo está listo",preview:"Míralo, guárdalo o continúa tu camino.",
    notReady:"Tu vídeo todavía no está listo",createFirst:"Primero crea y verifica un vídeo en PRO.",
    verifying:"Verificando el vídeo en tu dispositivo…",failed:"Aún no hay un vídeo reproducible verificado.",
    signIn:"Inicia sesión para guardar y descargar",save:"Mis vídeos",download:"Descargar",
    telegram:"Telegram",house:"Mi espacio",continue:"Continúa con este vídeo",
    meditation:"Meditación personal",meditationHint:"Convierte el vídeo en una práctica guiada y suave.",
    ritual:"Ritual personal",ritualHint:"Crea una pequeña práctica simbólica para tu intención.",
    journey:"Curso de 8 sesiones",journeyHint:"Ocho pasos conectados para trabajar tu objetivo.",
    choose:"Crear",back:"Volver a Ready",backPro:"Crear vídeo en PRO",
    authTitle:"Guarda tu vídeo",authHint:"Abre tu cuenta existente de Holistic House en otra pestaña. Vuelve aquí para no perder el vídeo local.",
    authAction:"Iniciar sesión en Mi espacio",authBack:"Continuar y guardar",authRefresh:"Comprobar sesión",
    authPrivacy:"El vídeo queda en tu dispositivo hasta que autorices expresamente la carga privada.",
    authFailure:"No podemos verificar tu cuenta. Tu vídeo local sigue aquí. Inténtalo de nuevo más tarde.",
    medTitle:"Crea tu meditación",medHint:"Tu objetivo se utiliza en el editor de meditación ya existente.",
    selected:"Según tu objetivo elegido",medNote:"Primero se crea un texto. Voz, música y otro vídeo requieren acciones separadas y consentimiento.",
    ritTitle:"Crea tu ritual",ritHint:"Una práctica local suave sin gastos de generación de IA.",
    intention:"Intención",bestMoment:"Momento",setting:"Entorno",action:"Acción",phrase:"Frase breve (opcional)",
    morning:"Mañana",evening:"Tarde",any:"Cuando quieras",quiet:"Lugar tranquilo",nature:"Naturaleza",desk:"En mi mesa",
    observe:"Observar tres objetos",hand:"Apoyar una mano en una superficie",pause:"Hacer una pausa breve",
    phrasePlaceholder:"Por ejemplo: Puedo elegir mi ritmo",generateRitual:"Crear ritual personal",
    ritualResult:"Tu ritual",structure:"Preparar · Practicar · Integrar",
    copy:"Copiar texto",copied:"Texto del ritual copiado.",copyError:"No se pudo copiar. Selecciona el texto.",
    another:"Otra variante suave",ritualPrivacy:"Es un texto local, no un vídeo grabado, tratamiento clínico ni recordatorio programado.",
    courseTitle:"Crea tu programa de 8 sesiones",courseHint:"Usaremos tu objetivo en el planificador de cursos existente.",
    openPlanner:"Crear mi programa de 8 sesiones",courseNote:"Son guiones y vistas previas, no ocho vídeos renderizados ni pagados automáticamente.",
    themes:["Explorar","Apoyo","Flexibilidad","Recursos","Límites","Pasos","Elección","Integración"],
    themesHints:["Clarifica tu punto de partida","Encuentra apoyo","Considera opciones","Identifica recursos","Elige tus límites","Da un pequeño paso","Elige con libertad","Reflexiona e integra"],
    settingLabel:"Lugar",momentLabel:"Momento",actionLabel:"Acción",
  },
} as const;

export function MandalaVideoReady({
  locale,theme,wish,focus,video,verified,checking,signedIn,loginUnavailable,disabled,
  meditationEditor,onOpenDelivery,onRefreshLogin,onOpenCourse,onReturnToPro
}:Props){
  const t=COPY[locale];
  const [view,setView]=useState<View>("home");
  const [moment,setMoment]=useState("morning");
  const [setting,setSetting]=useState("quiet");
  const [action,setAction]=useState("observe");
  const [anchor,setAnchor]=useState("");
  const [revision,setRevision]=useState(0);
  const [ritualGenerated,setRitualGenerated]=useState(false);
  const [notice,setNotice]=useState("");
  const accountLocale=locale==="es"?"en":locale;
  const myVideos="/"+accountLocale+"/app/videos";
  const selectedGoal=(focus.goal||wish).trim().slice(0,100);
  const ritual=useMemo(()=>selectResourcePractice({
    locale,theme,kind:"ritual",revision,
    focus:{difficulty:focus.difficulty,goal:focus.goal||wish,goals:focus.goals,details:focus.details}
  }),[locale,theme,revision,focus.difficulty,focus.goal,focus.goals,focus.details,wish]);
  const momentText=moment==="morning"?t.morning:moment==="evening"?t.evening:t.any;
  const placeText=setting==="nature"?t.nature:setting==="desk"?t.desk:t.quiet;
  const actionText=action==="hand"?t.hand:action==="pause"?t.pause:t.observe;
  const ritualText=ritual.status==="ready"?[
    ritual.title,ritual.topic,t.momentLabel+": "+momentText,t.settingLabel+": "+placeText,
    t.actionLabel+": "+actionText,anchor.trim().slice(0,140),
    ...ritual.steps,ritual.transfer
  ].filter(Boolean).join("\n\n"):"";
  function chooseDelivery(){
    if(!verified||!video||disabled)return;
    if(!signedIn){setView("login");return;}
    onOpenDelivery();
  }
  function selectView(next:View){setView(next);setNotice("");}
  async function copyRitual(){
    if(!ritualGenerated||ritual.status!=="ready")return;
    try{await navigator.clipboard.writeText(ritualText);setNotice(t.copied);}
    catch{setNotice(t.copyError);}
  }
  const back=<button type="button" className={css.back} onClick={()=>selectView("home")}
    data-ready-back><ArrowLeft size={18} aria-hidden="true"/>{t.back}</button>;
  const header=<div className={css.selectedVideo}>
    {video&&verified?<video key={video.url} src={video.url} playsInline controls preload="metadata"
      aria-label={t.ready}/>:
    /* Approved first-party example, never labelled an exported personal movie. */
    <div className={css.example}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/videos/holistic-house/film-collection-v2/meadow-morning.jpg" alt=""/>
      <span>{checking?t.verifying:t.notReady}</span>
    </div>}
    {video&&verified?<span className={css.duration}>{video.duration}s · {video.extension.toUpperCase()}</span>:null}
  </div>;
  return <section className={css.root} data-video-ready data-ready-view={view}
    aria-label={view==="home"?t.ready:view==="login"?t.authTitle:view==="meditation"?t.medTitle:view==="ritual"?t.ritTitle:t.courseTitle}>
    {view==="home"?<>
      {header}
      <div className={css.title}>
        <h2>{verified&&video?t.ready:t.notReady}</h2>
        <p>{verified&&video?t.preview:checking?t.verifying:t.createFirst}</p>
      </div>
      {verified&&video?<>
        <p className={css.signin}><LockKeyhole size={19} aria-hidden="true"/>
          {signedIn?t.preview:t.signIn}</p>
        <div className={css.actions} data-ready-save-choices>
          <button type="button" onClick={chooseDelivery} disabled={disabled}
            data-ready-save><FolderOpen size={23} aria-hidden="true"/><span>{t.save}</span></button>
          <button type="button" onClick={chooseDelivery} disabled={disabled}
            data-ready-download><Download size={23} aria-hidden="true"/><span>{t.download}</span></button>
          <button type="button" onClick={chooseDelivery} disabled={disabled}
            data-ready-telegram><Send size={23} aria-hidden="true"/><span>{t.telegram}</span></button>
          {signedIn?<Link href={myVideos} prefetch={false} target="_blank" rel="noopener noreferrer"
            data-ready-house><UserRound size={23} aria-hidden="true"/><span>{t.house}</span></Link>:
          <button type="button" onClick={()=>selectView("login")} data-ready-house>
            <UserRound size={23} aria-hidden="true"/><span>{t.house}</span></button>}
        </div>
      </>:<button type="button" className={css.primary} disabled={disabled}
        onClick={onReturnToPro} data-ready-generate><Play size={19} aria-hidden="true"/>
        {t.backPro}<ArrowRight size={18} aria-hidden="true"/></button>}
      <h3 className={css.nextTitle}>{t.continue}</h3>
      <div className={css.journey}>
        <button type="button" onClick={()=>selectView("meditation")} data-ready-meditation>
          <div className={css.thumbnail}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/videos/holistic-house/film-collection-v2/meadow-morning.jpg" alt=""/>
          </div>
          <Headphones size={22} aria-hidden="true"/>
          <span><strong>{t.meditation}</strong><small>{t.meditationHint}</small></span>
          <ArrowRight size={21} aria-hidden="true"/>
        </button>
        <button type="button" onClick={()=>selectView("ritual")} data-ready-ritual>
          <div className={css.thumbnail}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt=""/>
          </div>
          <Flower2 size={22} aria-hidden="true"/>
          <span><strong>{t.ritual}</strong><small>{t.ritualHint}</small></span>
          <ArrowRight size={21} aria-hidden="true"/>
        </button>
        <button type="button" onClick={()=>selectView("journey")} data-ready-journey>
          <div className={css.thumbnail}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt=""/>
          </div>
          <BookOpen size={22} aria-hidden="true"/>
          <span><strong>{t.journey}</strong><small>{t.journeyHint}</small></span>
          <ArrowRight size={21} aria-hidden="true"/>
        </button>
      </div>
    </>:null}
    {view==="login"?<>
      {back}{header}
      <div className={css.title}><h2>{t.authTitle}</h2><p>{t.authHint}</p></div>
      <Link className={css.primary} href={myVideos} target="_blank" rel="noopener noreferrer" prefetch={false}
        data-ready-sign-in><UserRound size={21} aria-hidden="true"/>{t.authAction}<ArrowRight size={19}/></Link>
      <button className={css.secondary} type="button" onClick={onRefreshLogin}
        data-ready-refresh-login><RefreshCw size={18} aria-hidden="true"/>{t.authRefresh}</button>
      {signedIn?<button className={css.primary} type="button" onClick={()=>{
        setView("home");onOpenDelivery();
      }}>{t.authBack}<ArrowRight size={19} aria-hidden="true"/></button>:null}
      {loginUnavailable?<p role="alert" className={css.note}>{t.authFailure}</p>:null}
      <p className={css.note}><ShieldCheck size={18} aria-hidden="true"/>{t.authPrivacy}</p>
    </>:null}
    {view==="meditation"?<>
      {back}
      <div className={css.title}><h2>{t.medTitle}</h2><p>{t.medHint}</p></div>
      <p className={css.context}><CheckCircle2 size={19}/><strong>{t.selected}:</strong>{" "}{selectedGoal||t.meditation}</p>
      <div className={css.reused} data-ready-meditation-editor>{meditationEditor}</div>
      <p className={css.note}><ShieldCheck size={17} aria-hidden="true"/>{t.medNote}</p>
    </>:null}
    {view==="ritual"?<>
      {back}
      <div className={css.title}><h2>{t.ritTitle}</h2><p>{t.ritHint}</p></div>
      <p className={css.context}><Sparkles size={19} aria-hidden="true"/><strong>{t.intention}:</strong>{" "}{selectedGoal||ritual.topic}</p>
      {ritual.status==="blocked"?<p className={css.note} role="alert">{ritual.message}</p>:<>
        <div className={css.ritualFields}>
          <label>{t.bestMoment}<select value={moment} onChange={event=>{setMoment(event.target.value);setRitualGenerated(false)}}>
            <option value="morning">{t.morning}</option><option value="evening">{t.evening}</option>
            <option value="any">{t.any}</option></select></label>
          <label>{t.setting}<select value={setting} onChange={event=>{setSetting(event.target.value);setRitualGenerated(false)}}>
            <option value="quiet">{t.quiet}</option><option value="nature">{t.nature}</option>
            <option value="desk">{t.desk}</option></select></label>
          <label>{t.action}<select value={action} onChange={event=>{setAction(event.target.value);setRitualGenerated(false)}}>
            <option value="observe">{t.observe}</option><option value="hand">{t.hand}</option>
            <option value="pause">{t.pause}</option></select></label>
          <label>{t.phrase}<input type="text" maxLength={140} value={anchor}
            placeholder={t.phrasePlaceholder} onChange={event=>{setAnchor(event.target.value);setRitualGenerated(false)}}/></label>
        </div>
        <button type="button" className={css.primary} disabled={disabled}
          onClick={()=>{setRitualGenerated(true);setNotice("");}} data-ready-create-ritual>
          <Sparkles size={19}/>{t.generateRitual}<ArrowRight size={19}/></button>
        {ritualGenerated?<div className={css.ritualResult} data-ready-ritual-result>
          <h3>{t.ritualResult}: {ritual.title}</h3>
          <p>{t.structure}</p>
          <ol>{ritual.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>
          <p>{ritual.transfer}</p>
          {anchor.trim()?<p className={css.context}>{anchor.trim()}</p>:null}
          <div className={css.ritualActions}>
            <button type="button" onClick={()=>void copyRitual()}><BookOpen size={17}/>{t.copy}</button>
            <button type="button" onClick={()=>{setRevision(value=>value+1);setRitualGenerated(false);setNotice("");}}>
              <RefreshCw size={17}/>{t.another}</button>
          </div>
        </div>:null}
        {notice?<p role="status" className={css.note}>{notice}</p>:null}
      </>}
      <p className={css.note}><ShieldCheck size={17}/>{t.ritualPrivacy}</p>
    </>:null}
    {view==="journey"?<>
      {back}
      <div className={css.title}><h2>{t.courseTitle}</h2><p>{t.courseHint}</p></div>
      <p className={css.context}><CheckCircle2 size={18}/><strong>{t.selected}:</strong>{" "}{selectedGoal||t.journey}</p>
      <div className={css.sessions} data-ready-eight-sessions>
        {t.themes.map((name,index)=><div key={name} className={css.session}>
          <span>{index+1}</span><div><strong>{name}</strong><small>{t.themesHints[index]}</small></div>
        </div>)}
      </div>
      <p className={css.note}><ShieldCheck size={17}/>{t.courseNote}</p>
      <button className={css.primary} type="button" disabled={disabled} onClick={onOpenCourse}
        data-ready-create-course><BookOpen size={19}/>{t.openPlanner}<ArrowRight size={19}/></button>
    </>:null}
  </section>;
}
