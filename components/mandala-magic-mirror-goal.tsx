"use client";

import {useRef,useState} from "react";
import {ArrowLeft,ArrowRight,Briefcase,Check,ChevronDown,Clapperboard,Ellipsis,Film,Flower2,Gift,Heart,ImagePlus,Mic,Play,Plus,Sparkles,TrendingUp,UserRound,WandSparkles,Zap} from "lucide-react";
import type {VideoLocale} from "@/lib/mandala/holistic-video-themes";
import {listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics,getMyTubeTopic} from "@/lib/mandala/mytube-content-taxonomy.mjs";
import {classifyMyTubeRequest} from "@/lib/mandala/mytube-prompt-classifier.mjs";
import {buildPersonalVideoGoalOptions} from "@/lib/mandala/video-personal-goal-composer.mjs";
import {MandalaVideoIdeaGoal} from "./mandala-video-idea-goal";
import css from "./mandala-magic-mirror-goal.module.css";

export type MirrorScope="me"|"business"|"present";
export type MirrorCategory="goals-money"|"love-relationships"|"energy-confidence"|"stress-anxiety";
export type WorkVideoFormat="insta-reels"|"video-about-me"|"service-presentation"|"client-video-offer";
type Theme="energy"|"money"|"relationships"|"goals"|"health";
export type MirrorVideoFormat="basic"|"pro"|"vip";
export type MirrorResolution={
 scope:MirrorScope;categoryId:MirrorCategory;subcategoryId:string;topicId:string;
 theme:Theme;wish:string;goalChoiceId:string;workFormat?:WorkVideoFormat;videoFormat?:MirrorVideoFormat;goalPurposeId?:string;
};
type GoalOption={
 id:string;theme:Theme;categoryId:MirrorCategory;image:string;defaultTopicId:string;
 request:Record<VideoLocale,string>;label?:Record<VideoLocale,string>;workFormat?:WorkVideoFormat;
};
const choices:Record<MirrorScope,GoalOption[]>={
 me:[
  {id:"stress",theme:"health",categoryId:"stress-anxiety",image:"/videos/holistic-house/film-collection-v3/sun-warm-ocean-dawn.jpg",defaultTopicId:"low-energy",
   request:{en:"I want to release stress and restore my energy.",ru:"Хочу снизить стресс и восстановить энергию.",es:"Quiero aliviar el estrés y recuperar energía."}},
  {id:"love",theme:"relationships",categoryId:"love-relationships",image:"/videos/holistic-house/film-collection-v3/heart-flow.jpg",defaultTopicId:"emotional-intimacy",
   request:{en:"I want loving, trusting relationships.",ru:"Хочу тёплых и доверительных отношений.",es:"Quiero relaciones amorosas y de confianza."}},
  {id:"money",theme:"money",categoryId:"goals-money",image:"/videos/holistic-house/film-collection-v2/lone-tree.jpg",defaultTopicId:"financial-stability",
   request:{en:"I want greater confidence and financial stability.",ru:"Хочу уверенности и финансовой устойчивости.",es:"Quiero más confianza y estabilidad financiera."}},
  {id:"growth",theme:"goals",categoryId:"energy-confidence",image:"/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg",defaultTopicId:"personal-growth",
   request:{en:"I want personal growth and a clearer direction.",ru:"Хочу личностного развития и ясного направления.",es:"Quiero crecer personalmente y tener una dirección clara."}},
 ],
 business:[
  // Work is one level of four concrete formats, not the 4×4×4 wellness taxonomy.
  // Four distinct approved first-party film stills: no external image request or tracking.
  {id:"insta-reels",theme:"goals",categoryId:"energy-confidence",image:"/videos/holistic-house/film-collection-v3/sun-leaves-canopy.jpg",defaultTopicId:"entrepreneurship",workFormat:"insta-reels",
   label:{en:"Insta Reels",ru:"Insta Reels",es:"Insta Reels"},
   request:{en:"Create an Instagram Reel about my work with captions and a clear call to action.",ru:"Создать Instagram Reels о моей работе с титрами и призывом к действию.",es:"Crear un Reel de Instagram sobre mi trabajo con subtítulos y una llamada a la acción."}},
  {id:"video-about-me",theme:"goals",categoryId:"energy-confidence",image:"/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg",defaultTopicId:"personal-growth",workFormat:"video-about-me",
   label:{en:"Video About Me",ru:"Видео обо мне",es:"Vídeo sobre mí"},
   request:{en:"Create a video about me, my expertise and why clients can trust my work.",ru:"Создать видеовизитку обо мне, моём опыте и о том, почему мне можно доверять.",es:"Crear un vídeo sobre mí, mi experiencia y por qué pueden confiar en mi trabajo."}},
  {id:"service-presentation",theme:"goals",categoryId:"energy-confidence",image:"/videos/holistic-house/film-collection-v3/sun-golden-aspen.jpg",defaultTopicId:"entrepreneurship",workFormat:"service-presentation",
   label:{en:"Service Presentation",ru:"Презентация услуги",es:"Presentación del servicio"},
   request:{en:"Create a video presenting my service, how it works and the next step.",ru:"Создать видеопрезентацию моей услуги: как она работает и как начать.",es:"Crear una presentación de mi servicio, cómo funciona y cómo empezar."}},
  {id:"client-video-offer",theme:"money",categoryId:"goals-money",image:"/videos/holistic-house/film-collection-v3/sun-warm-ocean-dawn.jpg",defaultTopicId:"income-growth",workFormat:"client-video-offer",
   label:{en:"Client Video Offer",ru:"Видео-предложение клиенту",es:"Oferta en vídeo para clientes"},
   request:{en:"Create a personal video offer to a client, with clear value and a respectful next step.",ru:"Создать персональное видео-предложение клиенту с пользой и деликатным следующим шагом.",es:"Crear una oferta personal en vídeo para un cliente, con valor claro y un siguiente paso respetuoso."}},
 ],
 present:[
  {id:"stress",theme:"health",categoryId:"stress-anxiety",image:"/videos/holistic-house/film-collection-v3/sun-warm-ocean-dawn.jpg",defaultTopicId:"recovery-after-load",
   request:{en:"I want to offer rest and support to someone I care about.",ru:"Хочу подарить отдых и поддержку близкому человеку.",es:"Quiero regalar descanso y apoyo a alguien querido."}},
  {id:"love",theme:"relationships",categoryId:"love-relationships",image:"/videos/holistic-house/film-collection-v3/heart-flow.jpg",defaultTopicId:"emotional-intimacy",
   request:{en:"I want to express love and gratitude.",ru:"Хочу выразить любовь и благодарность.",es:"Quiero expresar amor y gratitud."}},
  {id:"money",theme:"money",categoryId:"goals-money",image:"/videos/holistic-house/film-collection-v2/lone-tree.jpg",defaultTopicId:"self-confidence",
   request:{en:"I want to encourage someone's confidence and success.",ru:"Хочу поддержать уверенность и успех близкого.",es:"Quiero animar la confianza y el éxito de alguien."}},
  {id:"growth",theme:"goals",categoryId:"energy-confidence",image:"/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg",defaultTopicId:"life-transitions",
   request:{en:"I want to celebrate a new chapter and personal growth.",ru:"Хочу поздравить с новым этапом и развитием.",es:"Quiero celebrar una nueva etapa y el crecimiento personal."}},
 ],
};
const categoryTheme:Record<MirrorCategory,Theme>={
 "goals-money":"money","love-relationships":"relationships",
 "energy-confidence":"goals","stress-anxiety":"health",
};
const labels={
 en:{subtitle:"Create Your Transformative Video",hint:"Answer a few simple questions and let the Mirror create a video-journey for your goal or wish.",
  question:"What is your main goal now?",me:"For Me",business:"For Work",present:"Present",
  placeholder:"Describe your goal or wish…",alternative:"Or choose what matters now",
  sub:"Choose a subcategory",topic:"Choose a topic",next:"Next",back:"Back",
  advanced:"Advanced choices",dictation:"Use your phone keyboard microphone to dictate",workQuestion:"What video would you like to create?",workPlaceholder:"Describe your video or service…",workAlternative:"Or choose a video format",format:"Format"},
 ru:{subtitle:"Создайте своё ресурсное видео",hint:"Несколько простых вопросов — и видео для вашей цели или желания.",
  question:"Какая у вас сейчас главная цель?",me:"Для себя",business:"Для работы",present:"Подарок",
  placeholder:"Опишите цель или желание…",alternative:"Или выберите то, что актуально",
  sub:"Выберите подкатегорию",topic:"Выберите тему",next:"Далее",back:"Назад",
  advanced:"Расширенные настройки",dictation:"Для диктовки используйте микрофон клавиатуры",workQuestion:"Какое видео вы хотите создать?",workPlaceholder:"Опишите видео или услугу…",workAlternative:"Или выберите формат видео",format:"Формат"},
 es:{subtitle:"Crea tu vídeo de transformación",hint:"Unas preguntas sencillas para crear un vídeo sobre tu meta o deseo.",
  question:"¿Cuál es tu objetivo principal?",me:"Para mí",business:"Para el trabajo",present:"Regalo",
  placeholder:"Describe tu objetivo o deseo…",alternative:"O elige lo que importa ahora",
  sub:"Elige una subcategoría",topic:"Elige un tema",next:"Siguiente",back:"Atrás",
  advanced:"Opciones avanzadas",dictation:"Usa el micrófono del teclado para dictar",workQuestion:"¿Qué vídeo quieres crear?",workPlaceholder:"Describe tu vídeo o servicio…",workAlternative:"O elige un formato de vídeo",format:"Formato"},
} as const;

const formatOptions=[{id:"basic",credits:250,Icon:Film,image:"/videos/holistic-house/film-collection-v3/sun-warm-ocean-dawn.jpg"},{id:"pro",credits:500,Icon:UserRound,image:"/images/holistic-house/reiki-approved-sunrise-v3.webp"},{id:"vip",credits:2000,Icon:Clapperboard,image:"/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg"}] as const;
const mirrorPosterUrl=(image:string)=>image.startsWith("/")?image:"/videos/holistic-house/film-collection-v2/"+image;

export function MandalaMagicMirrorTitle({locale}:{locale:VideoLocale}){
 const t=labels[locale];
 return <header className={css.title} data-hh-mirror-title>
  <Sparkles size={22} aria-hidden="true"/>
  <h2>Magic Mirror</h2>
  <strong>{t.subtitle}</strong>
  <p>{t.hint}</p><span className={css.heroSwoosh} aria-hidden="true"/>
 </header>;
}

const onboardingCopy={
 en:{therapy:"Videos for Myself",other:"Videos for Others",work:"Videos for Work",therapyHint:"Emotional support and personal growth.",otherHint:"Personal gifts, greetings and support for loved ones.",workHint:"Personal Reels, presentations and videos about your services.",formatTitle:"Choose a Creation Format",formatNote:"Format selection is a planning preference. Credits are confirmed before generation.",basic:"Simple Video",pro:"Live Photo",vip:"Cinematographic Video",basicHelp:"Quick & easy video with your message",proHelp:"Turn your photo into a living video with a natural smile and movement",vipHelp:"A cinematic story with music, scenes and special effects",plan:"Plan & Generate Video",back:"Magic Mirror",step:"Step 1 of 3",topic:"Topic",script:"Script & Style",create:"Create",describe:"Describe your situation or goal…",example:"Example: “I feel stressed and need to restore my energy”",ideas:"AI Ideas",guide:"Guide me",guideHelp:"Choose one of four directions below, then a subcategory and topic. Or describe your situation and continue directly.",quiz:"Or choose a topic through a short quiz",next:"Get AI Suggestions & Script",watch:"Watch example video",media:"Open media options",keyboard:"Focus the text field for keyboard dictation"},
 ru:{therapy:"Видео для себя",other:"Видео для других",work:"Видео для работы",therapyHint:"Эмоциональная поддержка и развитие важных качеств.",otherHint:"Личные подарки, поздравления и поддержка близких.",workHint:"Персональные рилзы, презентации и видео об услугах.",formatTitle:"Выберите формат видео",formatNote:"Выбор формата пока задаёт предпочтение. Кредиты подтверждаются перед генерацией.",basic:"Простое видео",pro:"Живое фото",vip:"Кинематографическое видео",basicHelp:"Короткое поддерживающее видео",proHelp:"Оживление фото с разрешения",vipHelp:"История с видеосценами",plan:"Спланировать и создать видео",back:"Magic Mirror",step:"Шаг 1 из 3",topic:"Тема",script:"Сценарий и стиль",create:"Создание",describe:"Опишите ситуацию или цель…",example:"Пример: «Испытываю стресс и хочу восстановить силы»",ideas:"ИИ-идеи",guide:"Помоги мне",guideHelp:"Выберите одно из четырёх направлений, затем подтему и тему. Или опишите запрос и переходите дальше.",quiz:"Или выберите тему через короткий квиз",next:"Предложить тему и сценарий",watch:"Смотреть пример видео",media:"Открыть медианастройки",keyboard:"Открыть клавиатуру для диктовки"},
 es:{therapy:"Vídeos para mí",other:"Vídeos para otros",work:"Vídeos para el trabajo",therapyHint:"Apoyo emocional y crecimiento personal.",otherHint:"Regalos personales, felicitaciones y apoyo a tus seres queridos.",workHint:"Reels personales, presentaciones y vídeos sobre tus servicios.",formatTitle:"Elige un formato de vídeo",formatNote:"El formato es una preferencia de planificación. Los créditos se confirman antes de generar.",basic:"Vídeo sencillo",pro:"Foto animada",vip:"Vídeo cinematográfico",basicHelp:"Vídeo breve de apoyo",proHelp:"Anima tu foto con permiso",vipHelp:"Historia con escenas cinematográficas",plan:"Planificar y generar vídeo",back:"Magic Mirror",step:"Paso 1 de 3",topic:"Tema",script:"Guion y estilo",create:"Crear",describe:"Describe tu situación u objetivo…",example:"Ejemplo: «Me siento estresado y quiero recuperar energía»",ideas:"Ideas de IA",guide:"Guíame",guideHelp:"Elige una de las cuatro categorías, después una subcategoría y un tema, o describe tu objetivo.",quiz:"O elige un tema con un cuestionario corto",next:"Sugerir ideas y guion",watch:"Ver vídeo de ejemplo",media:"Abrir opciones multimedia",keyboard:"Enfocar el campo para dictar"},
} as const;
export function MandalaMagicMirrorGoal({locale,wish,disabled,onWishChange,onSelectCategory,
 onStepChange,onScopeChange,onComplete,onExpand}:{
 locale:VideoLocale;wish:string;disabled:boolean;
 onWishChange:(value:string)=>void;onSelectCategory:(theme:Theme)=>void;
 onStepChange:(step:1|2|3)=>void;onScopeChange:(scope:MirrorScope)=>void;
 onComplete:(value:MirrorResolution)=>boolean|void;onExpand:()=>void;
}){
 const [scope,setScope]=useState<MirrorScope>("me");
 const [screen,setScreen]=useState<"landing"|"purpose"|"format"|"topic">("landing");
 const [goalPurposeId,setGoalPurposeId]=useState<string|null>(null);
 const [videoFormat,setVideoFormat]=useState<MirrorVideoFormat|undefined>(undefined);
 const [formatMenuOpen,setFormatMenuOpen]=useState(false);
 const [guideOpen,setGuideOpen]=useState(false);
 const [introExpanded,setIntroExpanded]=useState(false);
 const [selectedId,setSelectedId]=useState("stress");
 // Each intent keeps its own local wish, avoiding accidental cross-purpose reuse.
 const [scopeWishes,setScopeWishes]=useState<Record<MirrorScope,string>>(()=>({me:wish,business:"",present:""}));
 const [step,setStep]=useState<1|2|3>(1);
 const [subcategoryId,setSubcategoryId]=useState("");
 const [blocked,setBlocked]=useState(false);
 const inputRef=useRef<HTMLTextAreaElement>(null);
 const t=labels[locale],copy=onboardingCopy[locale],available=choices[scope];
 const categoryLabels=listMyTubeCategories(locale);
 const selected=available.find(item=>item.id===selectedId)??available[0];
 const subcategories=listMyTubeSubcategories(selected.categoryId,locale);
 const topics=subcategoryId?listMyTubeTopics(selected.categoryId,subcategoryId,locale):[];
 // Screen 2 reuses the real three-purpose Ideas Goal composer, not a copy.
 const purposeOptions=buildPersonalVideoGoalOptions({locale,wish,theme:selected.theme,
  selectedTopic:{topicId:selected.defaultTopicId}});
 const changeStep=(next:1|2|3)=>{setStep(next);onStepChange(next);setBlocked(false);};
 const closeExistingIntro=()=>{
  // Leaving the page must stop the original MP4, not keep audio playing hidden.
  document.querySelector<HTMLButtonElement>('[data-video-therapy-intro-close]')?.click();
  setIntroExpanded(false);
 };
 const switchScope=(next:MirrorScope)=>{
  if(disabled||scope===next)return;
  closeExistingIntro();
  setScopeWishes(prev=>({...prev,[scope]:wish}));
  setScope(next);setSelectedId(choices[next][0].id);setSubcategoryId("");
  setGoalPurposeId(null);setVideoFormat(undefined);
  onWishChange(scopeWishes[next]||"");
  onScopeChange(next);onSelectCategory(choices[next][0].theme);changeStep(1);
 };
 // Direct card → original Goal → Format. No render or credit debit here.
 const enterScreen=(next:MirrorScope)=>{
  if(disabled)return;
  if(next!==scope)switchScope(next);
  else changeStep(1);
  closeExistingIntro();
  setScreen("purpose");setFormatMenuOpen(false);setGuideOpen(false);
 };
 const continueFromGoal=()=>{
  if(disabled||!purposeOptions.goals.some(goal=>goal.id===goalPurposeId))return;
  closeExistingIntro();setScreen("format");
 };
 const chooseFormat=(next:MirrorVideoFormat)=>{
  if(disabled||!goalPurposeId)return;
  setVideoFormat(next);closeExistingIntro();changeStep(1);
  setScreen("topic");setFormatMenuOpen(false);setGuideOpen(false);
 };
 const playExistingIntro=()=>{
  // This is a poster button, NOT a second video element. Reuse the real
  // owner-provided intro player already mounted by MandalaFreeVideoStudio.
  setIntroExpanded(true);
  const player=document.querySelector<HTMLButtonElement>('[data-video-therapy-intro="ready"]');
  if(player&&!player.disabled){player.click();window.requestAnimationFrame(()=>
    document.getElementById("video-hero")?.scrollIntoView({behavior:"smooth",block:"center"}));}
  else document.getElementById("video-hero")?.scrollIntoView({behavior:"smooth",block:"center"});
 };
 const finish=(categoryId:MirrorCategory,subId:string,topicId:string,goalText:string,workFormat?:WorkVideoFormat)=>{
  const found=getMyTubeTopic(topicId);
  if(!found||found.category.id!==categoryId||found.subcategory.id!==subId){
   setBlocked(true);return;
  }
  const theme=scope==="business"?categoryTheme[categoryId]:
    categoryId===selected.categoryId?selected.theme:categoryTheme[categoryId];
  const accepted=onComplete({scope,categoryId,subcategoryId:subId,topicId,theme,
    wish:goalText.slice(0,500),goalChoiceId:workFormat||selected.id,workFormat,videoFormat,
    goalPurposeId:goalPurposeId||undefined});
  if(accepted===false){setBlocked(true);return;}
  closeExistingIntro();
  setSubcategoryId("");changeStep(1);
 };
 const autoNext=()=>{
  if(disabled)return;
  const goalText=wish.trim()||selected.request[locale];
  // Existing local taxonomy classifier: no API, invented diagnosis or render.
  // An ambiguous request uses the visibly selected card as a reversible default.
  if(scope==="business"){
   // Keyboard Next chooses the obvious video format locally; no AI/API call.
   const text=wish.toLowerCase();
   const formatId=/instagram|reels?|рил[сз]/iu.test(text)?"insta-reels":
    /about me|обо мне|о себе|sobre m[ií]|presentarme/iu.test(text)?"video-about-me":
    /client.*offer|offer.*client|клиент.*предлож|предлож.*клиент|oferta.*cliente/iu.test(text)?"client-video-offer":
    /service|услуг|servicio|презентац/iu.test(text)?"service-presentation":selected.id;
   const format=choices.business.find(item=>item.id===formatId)||selected;
   const match=getMyTubeTopic(format.defaultTopicId);
   if(!match){setBlocked(true);return;}
   setSelectedId(format.id);
   finish(match.category.id as MirrorCategory,match.subcategory.id,match.topic.id,
    wish.trim()||format.request[locale],format.workFormat);
   return;
  }
  const classified=wish.trim()?classifyMyTubeRequest(wish,locale):null;
  const match=classified?.topicId?getMyTubeTopic(classified.topicId):null;
  const curated=getMyTubeTopic(selected.defaultTopicId);
  const valid=match&&match.category.id===classified?.categoryId&&
   match.subcategory.id===classified?.subcategoryId;
  // Explicitly approved category-specific defaults, never array[0] from an
  // unrelated subcategory. A typed wish can select another canonical topic.
  const inferred=valid?match:curated;
  if(!inferred||!["goals-money","love-relationships","energy-confidence","stress-anxiety"]
    .includes(inferred.category.id)){setBlocked(true);return;}
  const categoryId=inferred.category.id as MirrorCategory;
  const subId=inferred.subcategory.id;
  const topicId=inferred.topic.id;
  finish(categoryId,subId,topicId,goalText);
 };
 if(screen==="landing")return <section className={css.goals+" "+css.landing} data-hh-mirror-goals
  data-hh-mirror-screen="landing" data-hh-mirror-mode={scope} data-hh-mirror-step={1}
  aria-label={locale==="ru"?"Выберите, для кого видео":locale==="es"?"Elige para quién es el vídeo":"Choose who the video is for"}>
  <div className={css.destinationCards} role="group"
    aria-label={locale==="ru"?"Три вида видео":locale==="es"?"Tres tipos de vídeo":"Three video categories"}>
   <button type="button" data-hh-mirror-enter="me" className={css.destination}
    disabled={disabled} onClick={()=>enterScreen("me")}>
    <img src="/images/holistic-house/magic-mirror-lotus.webp" alt="" loading="eager" decoding="async"/>
    <span className={css.destinationCopy}><Flower2 size={26} aria-hidden="true"/>
      <strong>{copy.therapy}</strong><small>{copy.therapyHint}</small></span>
    <span className={css.destinationArrow} aria-hidden="true"><ArrowRight size={24}/></span>
   </button>
   <button type="button" data-hh-mirror-enter="others" className={css.destination}
    disabled={disabled} onClick={()=>enterScreen("present")}>
    <img src="/images/holistic-house/magic-mirror-gift.webp" alt="" loading="eager" decoding="async"/>
    <span className={css.destinationCopy}><Gift size={26} aria-hidden="true"/>
      <strong>{copy.other}</strong><small>{copy.otherHint}</small></span>
    <span className={css.destinationArrow} aria-hidden="true"><ArrowRight size={24}/></span>
   </button>
   <button type="button" data-hh-mirror-enter="work" className={css.destination}
    disabled={disabled} onClick={()=>enterScreen("business")}>
    <img src="/images/holistic-house/magic-mirror-work.svg" alt="" loading="eager" decoding="async"/>
    <span className={css.destinationCopy}><TrendingUp size={26} aria-hidden="true"/>
      <strong>{copy.work}</strong><small>{copy.workHint}</small></span>
    <span className={css.destinationArrow} aria-hidden="true"><ArrowRight size={24}/></span>
   </button>
  </div>
 </section>;
 if(screen==="purpose")return <section className={css.goals+" "+css.purposeScreen}
  data-hh-mirror-goals data-hh-mirror-screen="purpose" data-hh-mirror-mode={scope}
  data-hh-mirror-step={1} aria-label={locale==="ru"?"Зачем вам видео?":locale==="es"?"¿Para qué quieres este vídeo?":"Why do you want this video?"}>
  <button type="button" data-hh-mirror-back-purpose className={css.formatBack}
    disabled={disabled} onClick={()=>{closeExistingIntro();setScreen("landing");changeStep(1);}}>
    <ArrowLeft size={17} aria-hidden="true"/>{copy.back}
  </button>
  <div data-hh-mirror-purpose-step>
   <MandalaVideoIdeaGoal locale={locale} options={purposeOptions}
    headingId="hh-mirror-purpose-heading"
    introOverride={locale==="ru"?"Выберите, что хотите получить от видео.":
      locale==="es"?"Elige lo que deseas recibir del vídeo.":"Choose what you want from this video."}
    continueLabel={locale==="ru"?"Выбрать формат видео":
      locale==="es"?"Elegir formato de vídeo":"Choose video format"}
    selectedId={goalPurposeId} onSelect={setGoalPurposeId}
    onContinue={continueFromGoal} disabled={disabled}/>
  </div>
 </section>;
 if(screen==="format")return <section className={css.goals+" "+css.formatScreen} data-hh-mirror-goals
  data-hh-mirror-screen="format" data-hh-mirror-mode={scope} data-hh-mirror-step={1}
  aria-label={copy.formatTitle}>
  <button type="button" data-hh-mirror-back-format className={css.formatBack}
   onClick={()=>{closeExistingIntro();setScreen("purpose");changeStep(1);}}>
   <ArrowLeft size={17} aria-hidden="true"/>{copy.back}
  </button>
  <header className={css.formatHero}>
   <span className={css.formatHeroKicker}><Sparkles size={20} aria-hidden="true"/>{copy.formatTitle}</span>
   <p>{scope==="me"?copy.therapy:scope==="business"?copy.work:copy.other}</p>
  </header>
  <div className={css.formatRows} role="group" aria-label={copy.formatTitle}>
   {formatOptions.map(option=><button type="button" key={option.id}
    className={css.formatRow} data-hh-mirror-video-format={option.id}
    aria-pressed={videoFormat===option.id} disabled={disabled}
    onClick={()=>chooseFormat(option.id)}>
    <img src={option.image} alt="" loading="eager" decoding="async"/>
    <span className={css.formatRowCopy}>
     <strong>{copy[option.id]}</strong>
     <small>{copy[(option.id+"Help") as "basicHelp"|"proHelp"|"vipHelp"]}</small>
     <span className={css.formatRowPrice}><Sparkles size={16} aria-hidden="true"/>
      {option.credits.toLocaleString("en-US").replaceAll(","," ")} XP</span>
    </span>
    <span className={css.formatRowArrow} aria-hidden="true"><ArrowRight size={22}/></span>
   </button>)}
  </div>
  <p className={css.formatPlanningNote}>{copy.formatNote}</p>
 </section>;
 return <section className={css.goals} data-hh-mirror-screen="topic" data-hh-mirror-goals data-hh-mirror-mode={scope}
  data-hh-mirror-step={step} data-hh-mirror-video-preview={introExpanded?"open":"closed"} aria-label={scope==="business"?t.workQuestion:t.question}>
  <button type="button" data-hh-mirror-back-landing className={css.backLanding}
   onClick={()=>{closeExistingIntro();setScreen("format");changeStep(1);}}><ArrowLeft size={16}/>{copy.formatTitle}</button>
  <header className={css.therapyHero}>
   <span className={css.therapyEyebrow}><Sparkles size={23} aria-hidden="true"/>{scope==="me"?copy.therapy:scope==="business"?copy.work:copy.other}</span>
   <p>{scope==="me"?copy.therapyHint:scope==="business"?copy.workHint:copy.otherHint}</p>
  </header>
  <button type="button" className={css.exampleVideo} data-hh-mirror-play-example
    aria-label={copy.watch} onClick={playExistingIntro}>
   <img src="/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg"
    alt="" loading="eager"/>
   <span className={css.videoPlay}><Play size={31} fill="currentColor" aria-hidden="true"/></span>
   <span className={css.videoCaption}>{copy.watch}</span>
  </button>
  <div className={css.audience} role="group" aria-label={t.question}>
   {(["me","business","present"] as const).map(item=>{
    const Icon=item==="me"?UserRound:item==="business"?Briefcase:Gift;
    return <button type="button" key={item} data-hh-mirror-audience={item}
     aria-pressed={scope===item} disabled={disabled} onClick={()=>enterScreen(item)}>
     <Icon size={17} aria-hidden="true"/>{t[item]}
    </button>;
   })}
  </div>
  <div className={css.progress} data-hh-mirror-progress
    aria-label={(locale==="ru"?"Шаг ":locale==="es"?"Paso ":"Step ")+"1 / 3"}>
   <strong data-hh-mirror-stage-label>{copy.step}</strong>
   <span className={css.progressStages}>
    <span aria-current="step"><b>1</b>{copy.topic}</span>
    <i aria-hidden="true">—</i>
    <span><b>2</b>{copy.script}</span>
    <i aria-hidden="true">—</i>
    <span><b>3</b>{copy.create}</span>
   </span>
  </div>
  {step>1?<button type="button" className={css.back} data-hh-mirror-back
    disabled={disabled} onClick={()=>changeStep(step===3?2:1)}>
    <ArrowLeft size={17} aria-hidden="true"/>{t.back}
   </button>:<button type="button" className={css.more} data-hh-mirror-more-goals
     disabled={disabled} onClick={onExpand} aria-label={t.advanced} title={t.advanced}>
     <Ellipsis size={20} aria-hidden="true"/>
   </button>}
  <h3 className={css.question}>{scope==="business"?t.workQuestion:step===1?t.question:step===2?t.sub:t.topic}</h3>
  {step===1?<>
   <div className={css.composer} data-hh-mirror-composer>
    <textarea id="hh-mirror-own-wish" ref={inputRef} rows={3} maxLength={500} autoComplete="off"
     data-hh-mirror-wish disabled={disabled} value={wish}
     onChange={event=>{const value=event.currentTarget.value;
      setScopeWishes(prev=>({...prev,[scope]:value}));onWishChange(value);}}
     onKeyDown={event=>{if((event.metaKey||event.ctrlKey)&&event.key==="Enter"){event.preventDefault();autoNext();}}}
     placeholder={scope==="business"?t.workPlaceholder:copy.describe}
     aria-label={scope==="business"?t.workPlaceholder:copy.describe}/>
    <div className={css.composerToolbar}>
     <button type="button" className={css.toolIcon} data-hh-mirror-open-advanced="true" disabled={disabled}
      aria-label={t.advanced} onClick={onExpand}><Plus size={23} aria-hidden="true"/></button>
     <button type="button" className={css.toolIcon} disabled={disabled}
      aria-label={copy.media} onClick={onExpand}><ImagePlus size={21} aria-hidden="true"/></button>
     <button type="button" className={css.toolIcon} disabled={disabled}
      aria-label={copy.keyboard} onClick={()=>inputRef.current?.focus()}><Mic size={22} aria-hidden="true"/></button>
     <button type="button" className={css.toolbarMenu} data-hh-mirror-ideas-menu
      aria-expanded={formatMenuOpen} aria-controls="hh-mirror-format-menu"
      onClick={()=>{setFormatMenuOpen(value=>!value);setGuideOpen(false);}}>
      <Sparkles size={18} aria-hidden="true"/>{copy.ideas}<ChevronDown size={16} aria-hidden="true"/>
     </button>
     <button type="button" className={css.toolbarMenu} aria-expanded={guideOpen}
      onClick={()=>{setGuideOpen(value=>!value);setFormatMenuOpen(false);}}>
      {copy.guide}<ChevronDown size={16} aria-hidden="true"/>
     </button>
     <button type="button" className={css.send} data-hh-mirror-next
      disabled={disabled} onClick={autoNext} aria-label={t.next}><ArrowRight size={22} aria-hidden="true"/></button>
    </div>
    {formatMenuOpen?<div className={css.formatMenu} id="hh-mirror-format-menu" role="group" aria-label={copy.formatTitle}>
     {formatOptions.map(option=><button type="button" key={option.id} aria-pressed={videoFormat===option.id}
      data-hh-mirror-tier-option={option.id} onClick={()=>{setVideoFormat(option.id);setFormatMenuOpen(false);}}>
       <option.Icon size={22} aria-hidden="true"/>
       <span><strong>{option.id.toUpperCase()}</strong><small>{copy[(option.id+"Help") as "basicHelp"|"proHelp"|"vipHelp"]}</small></span>
       <b>{option.credits.toLocaleString("en-US")} XP</b>
      </button>)}
     <small className={css.formatDisclosure}>{copy.formatNote}</small>
    </div>:null}
    {guideOpen?<p className={css.guide}>{copy.guideHelp}</p>:null}
   </div>
   <p className={css.example}>{copy.example}</p>
   <p className={css.alternative}>{copy.quiz}</p>
   <div className={css.cards} role="group" aria-label={t.alternative}>
    {available.map(item=><button type="button" key={item.id} className={css.card}
      data-hh-mirror-goal-choice={item.id} disabled={disabled}
      aria-pressed={selectedId===item.id}
      onClick={()=>{setSelectedId(item.id);setSubcategoryId("");
       onSelectCategory(item.theme);
       if(scope==="business"){
        const match=getMyTubeTopic(item.defaultTopicId);
        if(!match){setBlocked(true);return;}
        finish(match.category.id as MirrorCategory,match.subcategory.id,match.topic.id,
         wish.trim()||item.request[locale],item.workFormat);
       }else changeStep(2);}}>
      <img src={item.image.startsWith("/")?item.image:
        "/videos/holistic-house/film-collection-v2/"+item.image}
       alt="" aria-hidden="true" loading="lazy" decoding="async"
       referrerPolicy={scope==="business"?"no-referrer":undefined}/>
      <span className={css.cardLabel}>
       {scope==="business"?<Briefcase className={css.choiceIcon} size={20} aria-hidden="true"/>:
        item.id==="stress"?<Zap className={css.choiceIcon} size={20} aria-hidden="true"/>:
        item.id==="love"?<Heart className={css.choiceIcon} size={20} aria-hidden="true"/>:
        item.id==="money"?<TrendingUp className={css.choiceIcon} size={20} aria-hidden="true"/>:
        <Flower2 className={css.choiceIcon} size={20} aria-hidden="true"/>}
       <span>{scope==="business"?item.label?.[locale]:categoryLabels.find(category=>category.id===item.categoryId)?.label||item.id}</span>
      </span>
      {selectedId===item.id?<Check className={css.check} size={18} aria-hidden="true"/>:null}
    </button>)}
   </div>
   <button type="button" data-hh-mirror-ideas-cta className={css.primaryAction}
     disabled={disabled} onClick={autoNext}><WandSparkles size={22} aria-hidden="true"/>{copy.next}<ArrowRight size={21} aria-hidden="true"/></button>
  </>:<div className={css.cards} role="group" aria-label={step===2?t.sub:t.topic}>
   {step===2?subcategories.map((item,index)=><button type="button" className={css.card}
     key={item.id} data-hh-mirror-subcategory={item.id} disabled={disabled}
     onClick={()=>{setSubcategoryId(item.id);changeStep(3);}}>
     <img src={mirrorPosterUrl(available[index%available.length].image)} alt="" loading="lazy"/>
     <span className={css.cardLabel}>{item.label}</span>
    </button>):topics.map((item,index)=><button type="button" className={css.card}
     key={item.id} data-hh-mirror-topic={item.id} disabled={disabled}
     onClick={()=>finish(selected.categoryId,subcategoryId,item.id,
      wish.trim()||selected.request[locale])}>
     <img src={mirrorPosterUrl(available[index%available.length].image)} alt="" loading="lazy"/>
     <span className={css.cardLabel}>{item.label}</span>
    </button>)}
   </div>}
  {blocked?<p className={css.error} role="alert">
   {locale==="ru"?"Пожалуйста, выберите тему ещё раз.":
    locale==="es"?"Selecciona el tema otra vez.":"Please select the topic again."}
  </p>:null}
 </section>;
}
