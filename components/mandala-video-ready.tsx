"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import type {ReactNode} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowRight,BookOpen,CheckCircle2,Clock3,Download,Flower2,FolderOpen,Headphones,Play,RefreshCw,Send,ShieldCheck,Sparkles,UserRound} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import type {GuidedMeditationFocus} from "./mandala-guided-course";
import type {VideoDeliveryStatus} from "./mandala-video-delivery";
import {selectResourcePractice} from "@/lib/mandala/resource-practice-selector.mjs";
import {buildPersonalMeditationScript} from "@/lib/mandala/personal-meditation-script.mjs";
import {buildPersonalImageryCourse} from "@/lib/mandala/personal-guided-course.mjs";
import {appFetch} from "@/lib/app/client-fetch";
import {createVideoCartSelection,VIDEO_CART_STORAGE_KEY,SERVICE_CART_UPDATED_EVENT} from "@/lib/commerce/cart";
import css from "./mandala-video-ready.module.css";

type VideoFile={url:string;extension:"mp4"|"webm";bytes:number;duration:number};
type View="home"|"login";
type Offer="meditation"|"ritual"|"journey";
type VideoTier="basic"|"photo"|"character";
type CourseText={number:number;title:string;motif:string;script:string};
type Props={
  locale:PublicLocale;theme:VideoTheme;wish:string;focus:GuidedMeditationFocus;aspect:"portrait"|"landscape"|"square";
  video:VideoFile|null;verified:boolean;checking:boolean;signedIn:boolean;
  loginUnavailable:boolean;disabled:boolean;meditationEditor:ReactNode;
  onOpenDelivery:()=>void;onRefreshLogin:()=>void;onOpenCourse:()=>void;onReturnToPro:()=>void;
  onGenerateBasicVideo:()=>boolean;onStartNewVideo:()=>void;onVerifyPlayback:(player:HTMLVideoElement)=>void;
  onSaveDirect:()=>void;saveStatus:VideoDeliveryStatus;basicFreeAvailable:boolean;
  basicFreeIssue:"checking"|"unavailable"|"guest_used"|"insufficient"|null;basicCreditCost:number;
};
const COPY={
  en:{
    saveGateTitle:"Save your video free",saveGateLead:"Your video is ready. Sign in to save it in My Videos, download it or send it to Telegram.",saveGateTag:"YOUR VIDEO · YOUR CHOICE",saveGateBenefitSave:"Keep in My Videos",saveGateBenefitDownload:"Download to device",saveGateBenefitTelegram:"Send to Telegram",saveGateBenefitPractice:"Meditation or course",saveGateLogin:"Sign in to My House",saveGateTelegram:"Open Telegram · tap Start",saveGateTelegramConnect:"Get secure Telegram link",saveGateTelegramChecking:"Checking Telegram link…",saveGateTelegramUnavailable:"Telegram linking is unavailable. You can still use My House.",saveGateTelegramPending:"Tap Start in the Telegram chat, then return here.",saveGateTelegramLinked:"Telegram linked to your account.",saveGateTelegramVerify:"Check Telegram connection",saveGateContinue:"Continue saving",saveGateOr:"or",saveGateClose:"Close",saveGatePrivacy:"Free within available limits · Sent only with consent · Private by choice",saveGateSignInHint:"First sign in to My House. Open it in a new tab so your video stays here. Then check your sign-in.",saveGateTelegramHint:"Start connects the bot to your signed-in account. It does not send or save the video automatically.",saveGateRefresh:"Check sign-in",saveGateUnavailable:"Could not verify your account. The video stays on your device.",
    ready:"Your video is ready!",nextSteps:"Next steps: create a deeper practice",nextLead:"Continue your video as a gentle practice or a series.",newVideo:"Generate New Video",sendTelegram:"Send to Telegram",meditationNext:"Add a Guided Meditation",meditationNextHint:"Add voice and music to your video.",journeyNext:"Create an 8-Session Video Therapy",journeyNextHint:"Eight connected steps for your goal.",preview:"Preview, save or continue your journey.",
    notReady:"Your video is not ready yet",createFirst:"Create and verify a video in PRO first.",
    videoChooseTitle:"Choose a video option",videoChooseHint:"Choose a format, then generate your video.",
    videoBasic:"Basic video",videoBasicHint:"Quality video from our library.",videoPhoto:"Animated photo",videoPhotoHint:"Your photo or character with gentle motion.",
    videoCharacter:"Character video",videoCharacterHint:"Personalized animated story with a character.",videoFree:"FREE",
    videoGenerate:"Generate video",videoCartAction:"Add to cart",videoPaidInfo:"Paid videos are confirmed manually after payment. This does not start an AI render.",videoCartError:"Please choose this video in PRO instead.",
    videoFreeHold:"Video credits cannot be checked right now. Try again shortly.",
    videoChecking:"Checking your video credits. Try again shortly.",
    videoGuestUsed:"Your first free guest video has been used. Sign in to use your included video credits.",
    videoInsufficient:"You do not have enough included video credits for this export. Check your balance in PRO.",
    videoGuestSignIn:"Sign in to use video credits",
    videoIncludedCredit:"included video credits for this export · no payment",
    videoSetup:"Finish the required video settings in PRO, then generate.",videoIdeas:"More ideas for this video",
    verifying:"Checking playback on this device…",failed:"No playable exported video is available yet.",
    signIn:"Sign in to save and download",save:"Save to My Videos",download:"Download",
    telegram:"Telegram",house:"My House",continue:"Continue with this video",
    meditation:"Personal meditation",meditationHint:"Turn your video into a gentle guided practice.",
    ritual:"Personal ritual",ritualHint:"Build a simple symbolic practice for your intention.",
    journey:"8-session journey",journeyHint:"Develop your goal through eight connected steps.",
    choose:"Create",generateText:"Generate",textReady:"Your texts are ready below.",customize:"Adjust ritual details (optional)",editMeditation:"Customize narration and meditation",medText:"Your meditation text",sessionText:"Your session texts",backPro:"Generate a video in PRO",
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
    copy:"Copy ritual text",copied:"Ritual copied to clipboard.",copyText:"Copy text",copiedText:"Text copied.",copyError:"Copy unavailable. Select the text instead.",
    another:"Try another gentle variation",ritualPrivacy:"This is a local reflective text, not a recorded video, clinical treatment or scheduled reminder.",
    courseTitle:"Create your 8-session journey",courseHint:"Your chosen focus is used by our existing course planner.",
    openPlanner:"Open advanced course planner",courseNote:"This prepares eight scripts and scene previews, not eight paid or automatically rendered videos.",
    themes:["Explore","Support","Flexibility","Resources","Boundaries","Steps","Choice","Integration"],
    themesHints:["Name your starting point","Find accessible support","Allow new options","Notice your resources","Choose your boundaries","Try one small step","Make your own choice","Reflect and integrate"],
    settingLabel:"Place",momentLabel:"Moment",actionLabel:"Action",
  },
  ru:{
    saveGateTitle:"Сохраните видео бесплатно",saveGateLead:"Видео уже готово. Войдите, чтобы сохранить его в «Моих видео», скачать или отправить себе в Telegram.",saveGateTag:"ВАШЕ ВИДЕО · ВАШ ВЫБОР",saveGateBenefitSave:"В Мои видео",saveGateBenefitDownload:"Скачать на телефон",saveGateBenefitTelegram:"Отправить в Telegram",saveGateBenefitPractice:"Медитация или курс",saveGateLogin:"Войти в Мой дом",saveGateTelegram:"Открыть Telegram · нажать «Старт»",saveGateTelegramConnect:"Получить ссылку в Telegram",saveGateTelegramChecking:"Проверяем Telegram…",saveGateTelegramUnavailable:"Подключение Telegram недоступно. Сохранить видео можно через кабинет.",saveGateTelegramPending:"Нажмите «Старт» в Telegram и вернитесь на эту страницу.",saveGateTelegramLinked:"Telegram подключён к кабинету.",saveGateTelegramVerify:"Проверить Telegram",saveGateContinue:"Продолжить сохранение",saveGateOr:"или",saveGateClose:"Закрыть",saveGatePrivacy:"Бесплатно в рамках лимитов · Только с согласия · Приватно",saveGateSignInHint:"Сначала войдите в «Мой дом». Откроется новая вкладка, ваше видео останется здесь. Затем проверьте вход.",saveGateTelegramHint:"«Старт» привязывает бота к вашему кабинету, но не отправляет и не сохраняет видео автоматически.",saveGateRefresh:"Проверить вход",saveGateUnavailable:"Не удалось проверить вход. Видео осталось на вашем устройстве.",
    ready:"Ваше видео готово!",nextSteps:"Следующий шаг: углубите практику",nextLead:"Дополните ролик медитацией или программой занятий.",newVideo:"Создать новое видео",sendTelegram:"Отправить в Telegram",meditationNext:"Добавить медитацию с голосом",meditationNextHint:"Озвучка и музыка к вашему ролику.",journeyNext:"Создать 8 видео-сессий",journeyNextHint:"Восемь связанных этапов вашей практики.",preview:"Посмотрите, сохраните или продолжите практику.",
    notReady:"Видео пока не готово",createFirst:"Сначала создайте ролик в PRO и проверьте воспроизведение.",
    videoChooseTitle:"Выберите вариант видео",videoChooseHint:"Выберите формат и нажмите «Создать видео».",
    videoBasic:"Базовое видео",videoBasicHint:"Качественный видеоряд из нашей библиотеки.",videoPhoto:"Анимированное фото",videoPhotoHint:"Ваше фото или персонаж с мягкой анимацией.",
    videoCharacter:"Видео с персонажем",videoCharacterHint:"Индивидуальный анимированный ролик с персонажем.",videoFree:"БЕСПЛАТНО",
    videoGenerate:"Создать видео",videoCartAction:"В корзину",videoPaidInfo:"Платный заказ подтверждается вручную после проверки оплаты. Генерация ИИ здесь не запускается.",videoCartError:"Выберите этот формат во вкладке PRO.",
    videoFreeHold:"Сейчас не удалось проверить видеокредиты. Попробуйте немного позже.",
    videoChecking:"Проверяем ваши видеокредиты. Повторите попытку чуть позже.",
    videoGuestUsed:"Первое бесплатное видео без входа уже использовано. Войдите, чтобы использовать включённые видеокредиты.",
    videoInsufficient:"Для экспорта недостаточно видеокредитов. Проверьте баланс во вкладке PRO.",
    videoGuestSignIn:"Войти и использовать видеокредиты",
    videoIncludedCredit:"включённых видеокредитов за экспорт · без оплаты",
    videoSetup:"Завершите настройки во вкладке PRO, затем создайте видео.",videoIdeas:"Другие идеи для этого видео",
    verifying:"Проверяем воспроизведение на устройстве…",failed:"Пока нет проверенного готового видео.",
    signIn:"Войдите, чтобы сохранить и скачать",save:"В Мои видео",download:"Скачать",
    telegram:"Telegram",house:"Мой дом",continue:"Продолжить с этим видео",
    meditation:"Личная медитация",meditationHint:"Превратите видео в бережную практику с сопровождением.",
    ritual:"Личный ритуал",ritualHint:"Создайте небольшую символическую практику под вашу цель.",
    journey:"Курс из 8 занятий",journeyHint:"Восемь связанных шагов для развития вашей темы.",
    choose:"Создать",generateText:"Сгенерировать",textReady:"Тексты готовы — они ниже.",customize:"Настроить ритуал (необязательно)",editMeditation:"Настроить медитацию и озвучку",medText:"Текст медитации",sessionText:"Тексты занятий",backPro:"Создать видео в PRO",
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
    copy:"Скопировать ритуал",copied:"Текст ритуала скопирован.",copyText:"Скопировать текст",copiedText:"Текст скопирован.",copyError:"Не удалось скопировать. Выделите текст вручную.",
    another:"Другой бережный вариант",ritualPrivacy:"Это локальный текст практики, а не готовый видеофайл, лечение или установленное напоминание.",
    courseTitle:"Создать курс из 8 занятий",courseHint:"Выбранная цель используется в существующем конструкторе курса.",
    openPlanner:"Открыть расширенный редактор курса",courseNote:"Формируются сценарии и превью, а не восемь автоматически созданных или оплаченных видео.",
    themes:["Исследование","Поддержка","Гибкость","Ресурсы","Границы","Шаги","Выбор","Интеграция"],
    themesHints:["Уточнить исходную точку","Найти доступную поддержку","Рассмотреть варианты","Заметить свои опоры","Выбрать границы","Сделать небольшой шаг","Принять своё решение","Осмыслить результат"],
    settingLabel:"Место",momentLabel:"Время",actionLabel:"Действие",
  },
  es:{
    saveGateTitle:"Guarda tu vídeo gratis",saveGateLead:"Tu vídeo está listo. Inicia sesión para guardarlo en Mis vídeos, descargarlo o enviártelo por Telegram.",saveGateTag:"TU VÍDEO · TU ELECCIÓN",saveGateBenefitSave:"Mis vídeos",saveGateBenefitDownload:"Descarga al móvil",saveGateBenefitTelegram:"Enviar a Telegram",saveGateBenefitPractice:"Meditación o curso",saveGateLogin:"Entrar a Mi espacio",saveGateTelegram:"Abrir Telegram · pulsar Start",saveGateTelegramConnect:"Obtener enlace de Telegram",saveGateTelegramChecking:"Comprobando Telegram…",saveGateTelegramUnavailable:"No se puede conectar Telegram. Puedes guardar desde Mi espacio.",saveGateTelegramPending:"Pulsa Start en Telegram y vuelve a esta página.",saveGateTelegramLinked:"Telegram conectado a tu cuenta.",saveGateTelegramVerify:"Comprobar Telegram",saveGateContinue:"Continuar y guardar",saveGateOr:"o",saveGateClose:"Cerrar",saveGatePrivacy:"Gratis dentro de los límites · Solo con consentimiento · Privado",saveGateSignInHint:"Primero entra a Mi espacio. Se abrirá otra pestaña y el vídeo seguirá aquí. Después comprueba el acceso.",saveGateTelegramHint:"Start vincula el bot a tu cuenta, no guarda ni envía automáticamente el vídeo.",saveGateRefresh:"Comprobar acceso",saveGateUnavailable:"No se pudo comprobar la sesión. El vídeo sigue en tu dispositivo.",
    ready:"¡Tu vídeo está listo!",nextSteps:"Siguiente paso: profundiza en tu práctica",nextLead:"Continúa con una meditación o un programa.",newVideo:"Crear otro vídeo",sendTelegram:"Enviar a Telegram",meditationNext:"Añadir meditación guiada",meditationNextHint:"Voz y música para tu vídeo.",journeyNext:"Crear 8 sesiones de vídeo",journeyNextHint:"Ocho pasos conectados con tu objetivo.",preview:"Míralo, guárdalo o continúa tu camino.",
    notReady:"Tu vídeo todavía no está listo",createFirst:"Primero crea y verifica un vídeo en PRO.",
    videoChooseTitle:"Elige una opción de vídeo",videoChooseHint:"Elige el formato y pulsa «Generar vídeo».",
    videoBasic:"Vídeo básico",videoBasicHint:"Vídeo de calidad de nuestra biblioteca.",videoPhoto:"Foto animada",videoPhotoHint:"Tu foto o personaje con movimiento suave.",
    videoCharacter:"Vídeo con personaje",videoCharacterHint:"Historia animada personalizada con personaje.",videoFree:"GRATIS",
    videoGenerate:"Generar vídeo",videoCartAction:"Añadir al carrito",videoPaidInfo:"El pedido se confirma manualmente tras verificar el pago. No se inicia ninguna generación de IA.",videoCartError:"Selecciona este formato en PRO.",
    videoFreeHold:"No se pueden comprobar los créditos de vídeo ahora. Inténtalo más tarde.",
    videoChecking:"Comprobando tus créditos de vídeo. Vuelve a intentarlo pronto.",
    videoGuestUsed:"Ya usaste tu primer vídeo gratis como invitado. Inicia sesión para usar tus créditos incluidos.",
    videoInsufficient:"No tienes suficientes créditos de vídeo incluidos. Comprueba tu saldo en PRO.",
    videoGuestSignIn:"Iniciar sesión y usar créditos",
    videoIncludedCredit:"créditos de vídeo incluidos para exportar · sin pago",
    videoSetup:"Completa la configuración en PRO y genera el vídeo.",videoIdeas:"Más ideas para este vídeo",
    verifying:"Verificando el vídeo en tu dispositivo…",failed:"Aún no hay un vídeo reproducible verificado.",
    signIn:"Inicia sesión para guardar y descargar",save:"Mis vídeos",download:"Descargar",
    telegram:"Telegram",house:"Mi espacio",continue:"Continúa con este vídeo",
    meditation:"Meditación personal",meditationHint:"Convierte el vídeo en una práctica guiada y suave.",
    ritual:"Ritual personal",ritualHint:"Crea una pequeña práctica simbólica para tu intención.",
    journey:"Curso de 8 sesiones",journeyHint:"Ocho pasos conectados para trabajar tu objetivo.",
    choose:"Crear",generateText:"Generar",textReady:"Tus textos están listos debajo.",customize:"Ajustar el ritual (opcional)",editMeditation:"Personalizar meditación y voz",medText:"Texto de meditación",sessionText:"Textos de las sesiones",backPro:"Crear vídeo en PRO",
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
    copy:"Copiar texto",copied:"Texto del ritual copiado.",copyText:"Copiar texto",copiedText:"Texto copiado.",copyError:"No se pudo copiar. Selecciona el texto.",
    another:"Otra variante suave",ritualPrivacy:"Es un texto local, no un vídeo grabado, tratamiento clínico ni recordatorio programado.",
    courseTitle:"Crea tu programa de 8 sesiones",courseHint:"Usaremos tu objetivo en el planificador de cursos existente.",
    openPlanner:"Abrir el editor avanzado del curso",courseNote:"Son guiones y vistas previas, no ocho vídeos renderizados ni pagados automáticamente.",
    themes:["Explorar","Apoyo","Flexibilidad","Recursos","Límites","Pasos","Elección","Integración"],
    themesHints:["Clarifica tu punto de partida","Encuentra apoyo","Considera opciones","Identifica recursos","Elige tus límites","Da un pequeño paso","Elige con libertad","Reflexiona e integra"],
    settingLabel:"Lugar",momentLabel:"Momento",actionLabel:"Acción",
  },
} as const;

export function MandalaVideoReady({
  locale,theme,wish,focus,aspect,video,verified,checking,signedIn,loginUnavailable,disabled,
  meditationEditor,onOpenDelivery,onRefreshLogin,onOpenCourse,onReturnToPro,
  onGenerateBasicVideo,onStartNewVideo,onVerifyPlayback,onSaveDirect,saveStatus,
  basicFreeAvailable,basicFreeIssue,basicCreditCost
}:Props){
  const t=COPY[locale];
  const router=useRouter();
  const [view,setView]=useState<View>("home");
  const [videoTier,setVideoTier]=useState<VideoTier>("basic");
  const [videoGenerationNotice,setVideoGenerationNotice]=useState("");
  useEffect(()=>{if(basicFreeAvailable)setVideoGenerationNotice("");},[basicFreeAvailable]);
  // Three continuation offers expand within Ready; the login dialog is independent.
  const [activeOffer,setActiveOffer]=useState<Offer|null>(null);
  const [generatedOffer,setGeneratedOffer]=useState<Offer|null>(null);
  const [meditationScript,setMeditationScript]=useState("");
  const [courseTexts,setCourseTexts]=useState<CourseText[]>([]);
  const [meditationAdvancedOpen,setMeditationAdvancedOpen]=useState(false);
  const offerRef=useRef<HTMLElement|null>(null);
  const [gateIntent,setGateIntent]=useState<"save"|"download"|"telegram"|"house">("save");
  const gateRef=useRef<HTMLElement|null>(null);
  const gateCloseRef=useRef<HTMLButtonElement|null>(null);
  const gateLauncherRef=useRef<HTMLElement|null>(null);
  const [telegramLink,setTelegramLink]=useState("");
  const [telegramStatus,setTelegramStatus]=useState<"idle"|"loading"|"linked"|"unlinked"|"unavailable">("idle");
  const [telegramError,setTelegramError]=useState("");
  // This is an action-triggered dialog; never display it automatically on page load.
  useEffect(()=>{
    if(view!=="login")return;
    const oldOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    gateCloseRef.current?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();setView("home");return;}
      if(event.key!=="Tab"||!gateRef.current)return;
      const options=[...gateRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )].filter(item=>item.getClientRects().length>0);
      if(!options.length)return;
      const first=options[0],last=options[options.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    window.addEventListener("keydown",onKey);
    return()=>{window.removeEventListener("keydown",onKey);
      document.body.style.overflow=oldOverflow;
      gateLauncherRef.current?.focus({preventScroll:true});};
  },[view]);
  // Existing private endpoint verifies session + bot link server side. Start is NOT login.
  useEffect(()=>{
    if(view!=="login"||!signedIn)return;
    let alive=true;
    setTelegramStatus("loading");setTelegramLink("");setTelegramError("");
    void appFetch("personal-videos/delivery").then((res:{telegram?:{linked?:boolean;linkAvailable?:boolean}})=>{
      if(!alive)return;
      setTelegramStatus(res.telegram?.linked?"linked":res.telegram?.linkAvailable?"unlinked":"unavailable");
    }).catch(()=>{if(alive)setTelegramStatus("unavailable")});
    return()=>{alive=false};
  },[view,signedIn]);
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
    focus:{difficulty:focus.difficulty,goal:focus.goal||wish,goals:focus.goals,
      // The optional anchor is user text, so validate it before showing or copying a ritual.
      details:[anchor,...focus.details]}
  }),[locale,theme,revision,focus.difficulty,focus.goal,focus.goals,focus.details,anchor,wish]);
  const momentText=moment==="morning"?t.morning:moment==="evening"?t.evening:t.any;
  const placeText=setting==="nature"?t.nature:setting==="desk"?t.desk:t.quiet;
  const actionText=action==="hand"?t.hand:action==="pause"?t.pause:t.observe;
  const ritualText=ritual.status==="ready"?[
    ritual.title,t.ritual,t.momentLabel+": "+momentText,t.settingLabel+": "+placeText,
    t.actionLabel+": "+actionText,anchor.trim().slice(0,140),
    ...ritual.steps,ritual.transfer
  ].filter(Boolean).join("\n\n"):"";
  function closeSaveGate(){setView("home");setTelegramLink("");setTelegramError("");}
  function openDelivery(){closeSaveGate();onOpenDelivery();}
  function chooseDelivery(intent:"save"|"download"|"telegram"|"house"="save"){
    if(!verified||!video||disabled)return;
    if(!signedIn||intent==="telegram"||intent==="house"){
      gateLauncherRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
      setGateIntent(intent);setView("login");return;
    }
    if(intent==="save"){onSaveDirect();return;}
    onOpenDelivery();
  }
  async function requestTelegramLink(){
    if(!signedIn||telegramStatus==="loading")return;
    setTelegramStatus("loading");setTelegramError("");setTelegramLink("");
    try{
      const response=await appFetch("personal-videos/delivery",{
        action:"connect",locale,consent:true
      },"POST") as {linkUrl?:unknown};
      const url=String(response.linkUrl||"");
      // Only the bot challenge URL issued by our server may leave this page.
      if(!/^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=[A-Za-z0-9_-]{32}$/.test(url))
        throw new Error("INVALID_TELEGRAM_LINK");
      setTelegramLink(url);setTelegramStatus("unlinked");
    }catch{setTelegramStatus("unavailable");setTelegramError(t.saveGateTelegramUnavailable);}
  }
  async function refreshTelegramLink(){
    if(!signedIn)return;
    setTelegramStatus("loading");setTelegramError("");
    try{
      const data=await appFetch("personal-videos/delivery") as {telegram?:{linked?:boolean;linkAvailable?:boolean}};
      setTelegramStatus(data.telegram?.linked?"linked":data.telegram?.linkAvailable?"unlinked":"unavailable");
    }catch{setTelegramStatus("unavailable");setTelegramError(t.saveGateTelegramUnavailable);}
  }
  function selectOffer(next:Offer){
    const opening=activeOffer!==next;
    setActiveOffer(opening?next:null);
    setGeneratedOffer(null);setRitualGenerated(false);setNotice("");
    setMeditationAdvancedOpen(false);
    if(opening)window.requestAnimationFrame(()=>offerRef.current?.scrollIntoView({
      block:"nearest",
      behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"
    }));
  }
  function generateOffer(){
    if(!activeOffer||disabled||ritual.status==="blocked")return;
    setNotice("");
    if(activeOffer==="meditation"){
      setMeditationScript(buildPersonalMeditationScript({
        locale,theme,wish,focus,length:5,image:"video",tone:"gentle"
      }));
    }else if(activeOffer==="journey"){
      const plan=buildPersonalImageryCourse({
        locale,theme,goals:focus.goals,keyDifficulty:focus.difficulty,
        keyGoal:focus.goal||wish,detailGoals:focus.details
      });
      setCourseTexts(plan.sessions.map((session:CourseText)=>({
        number:session.number,title:session.title,motif:session.motif,script:session.script
      })));
    }else{
      setRitualGenerated(true);
    }
    setGeneratedOffer(activeOffer);
  }
  async function copyGenerated(){
    if(!generatedOffer)return;
    const text=generatedOffer==="meditation"?meditationScript:
      generatedOffer==="ritual"&&ritual.status==="ready"?ritualText:
      courseTexts.map(session=>session.number+". "+session.title+"\n\n"+session.script).join("\n\n");
    if(!text)return;
    try{await navigator.clipboard.writeText(text);setNotice(t.copiedText);}
    catch{setNotice(t.copyError);}
  }
  function generateSelectedVideo(){
    if(disabled||checking)return;
    if(videoTier!=="basic"){
      // Keep exactly the same fixed-SKU manual checkout as PRO; no provider render or paid-state mutation.
      const id=videoTier==="photo"?"video-extra":"video-pro";
      const selection=createVideoCartSelection(id);
      if(!selection){setVideoGenerationNotice(t.videoCartError);return;}
      try{
        window.sessionStorage.setItem(VIDEO_CART_STORAGE_KEY,JSON.stringify(selection));
        window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT));
      }catch{
        // The cart restores the fixed SKU from the URL when session storage is blocked.
      }
      router.push("/"+locale+"/cart?video="+id);
      return;
    }
    if(!basicFreeAvailable){
      setVideoGenerationNotice(basicFreeIssue==="guest_used"?t.videoGuestUsed:
        basicFreeIssue==="insufficient"?t.videoInsufficient:
        basicFreeIssue==="checking"?t.videoChecking:t.videoFreeHold);
      return;
    }
    setVideoGenerationNotice(onGenerateBasicVideo()?"":t.videoSetup);
  }
  const completed=Boolean(verified&&video);
  const videoTime=video?`${Math.floor(video.duration/60)}:${String(Math.round(video.duration%60)).padStart(2,"0")}`:"0:00";
  const videoTiers=[
    {id:"basic" as VideoTier,title:t.videoBasic,description:t.videoBasicHint,price:t.videoFree,
      image:"/videos/holistic-house/film-collection-v2/meadow-morning.jpg"},
    {id:"photo" as VideoTier,title:t.videoPhoto,description:t.videoPhotoHint,price:"€3",
      image:"/images/holistic-house/reiki-approved-sunrise-v3.webp"},
    {id:"character" as VideoTier,title:t.videoCharacter,description:t.videoCharacterHint,price:"€5",
      image:"/images/holistic-house/ready-save-sunrise-portrait.jpg"},
  ];
  const header=<div className={css.selectedVideo} data-aspect={aspect}>
    {video?<video key={video.url} src={video.url} playsInline controls preload="auto"
      onLoadedData={event=>onVerifyPlayback(event.currentTarget)}
      onCanPlay={event=>onVerifyPlayback(event.currentTarget)}
      aria-label={completed?t.ready:t.verifying}/>:
    /* Approved first-party example, never labelled an exported personal movie. */
    <div className={css.example}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/videos/holistic-house/film-collection-v2/meadow-morning.jpg" alt=""/>
      <span>{checking?t.verifying:t.notReady}</span>
    </div>}
  </div>;
  return <section className={css.root} data-video-ready data-ready-view={view}
    data-ready-state={completed?"complete":"choose"}
    aria-label={view==="login"?t.authTitle:t.ready}>
    {(view==="home"||view==="login")?<>
      {completed?<p className={css.readyStatus} role="status" data-ready-status>
        <CheckCircle2 size={19} aria-hidden="true"/><strong>{t.ready}</strong>
        <span className={css.readyTime}><Clock3 size={15} aria-hidden="true"/>{videoTime}</span>
      </p>:null}
      {header}
      {!completed?<div className={css.title}>
        <h2>{t.videoChooseTitle}</h2>
        <p>{checking?t.verifying:t.videoChooseHint}</p>
      </div>:null}
      {completed?<>
        <div className={css.actions} data-ready-save-choices>
          <button type="button" onClick={()=>chooseDelivery("save")}
            disabled={disabled||saveStatus.busy} aria-busy={saveStatus.busy}
            data-ready-save><Download size={21} aria-hidden="true"/><span>{t.save}</span></button>
          <button type="button" onClick={()=>chooseDelivery("telegram")} disabled={disabled}
            data-ready-telegram><Send size={21} aria-hidden="true"/><span>{t.sendTelegram}</span></button>
        </div>
        {saveStatus.notice?<div className={css.saveStatus} role="status" aria-live="polite"
          data-ready-save-status>
          <span>{saveStatus.busy&&saveStatus.uploadPercent!==null
            ?saveStatus.notice+" "+saveStatus.uploadPercent+"%":saveStatus.notice}</span>
          {saveStatus.savedId?<Link href={myVideos} target="_blank" rel="noopener noreferrer"
            prefetch={false} data-ready-saved-video-link>{t.house}</Link>:null}
          {saveStatus.cloudAvailable===false&&!saveStatus.savedId&&video?
            <a href={video.url} download={"holistic-house-personal."+video.extension}
              data-ready-download-fallback>{t.download}</a>:null}
        </div>:null}
      </>:<>
        <div className={css.tierList} role="radiogroup" aria-label={t.videoChooseTitle}
          data-ready-video-tiers>
          {videoTiers.map(tier=><label key={tier.id}
            className={css.tierOption} data-ready-video-tier={tier.id}
            data-selected={videoTier===tier.id?"true":"false"}>
            <input type="radio" name="ready-video-tier" value={tier.id}
              checked={videoTier===tier.id}
              disabled={disabled||checking}
              onChange={()=>{setVideoTier(tier.id);setVideoGenerationNotice("");}}/>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tier.image} alt="" loading="lazy"/>
            <span className={css.tierCopy}><strong>{tier.title}</strong>
              <small>{tier.description}</small></span>
            <span className={css.tierPrice}>{tier.price}</span>
          </label>)}
        </div>
        <button type="button" className={css.primary} disabled={disabled||checking}
          onClick={generateSelectedVideo} data-ready-generate>
          <Play size={19} aria-hidden="true"/>{videoTier==="basic"?t.videoGenerate:t.videoCartAction}<ArrowRight size={18} aria-hidden="true"/>
        </button>
        {videoTier==="basic"&&basicFreeAvailable&&basicCreditCost>0?
          <p className={css.note} data-ready-video-credit-cost>
            <ShieldCheck size={17} aria-hidden="true"/>{basicCreditCost} {t.videoIncludedCredit}
          </p>:null}
        {videoTier!=="basic"?<p className={css.note} data-ready-video-payment-disclosure>
          <ShieldCheck size={17} aria-hidden="true"/>{t.videoPaidInfo}
        </p>:null}
        {videoGenerationNotice?<p className={css.tierNotice} role="status"
          data-ready-video-tier-notice>{videoGenerationNotice}</p>:null}
        {videoGenerationNotice&&videoTier==="basic"&&basicFreeIssue==="guest_used"?
          <Link className={css.secondary} href={myVideos} prefetch={false}
            target="_blank" rel="noopener noreferrer" data-ready-sign-in-credits>
            {t.videoGuestSignIn}<ArrowRight size={17} aria-hidden="true"/>
          </Link>:videoGenerationNotice&&videoTier==="basic"?<button type="button"
          className={css.secondary} onClick={onReturnToPro} data-ready-review-pro>
          {t.backPro}<ArrowRight size={17} aria-hidden="true"/>
        </button>:null}
      </>}
      <h3 className={css.nextTitle}>{completed?t.nextSteps:t.videoIdeas}</h3>
      {completed?<p className={css.nextLead}>{t.nextLead}</p>:null}
      <div className={css.journey}>
        <button type="button" onClick={()=>selectOffer("meditation")} data-ready-meditation
          aria-expanded={activeOffer==="meditation"} aria-controls="ready-inline-offer">
          <div className={css.thumbnail}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={completed?"/images/holistic-house/reiki-approved-sunrise-v3.webp":"/videos/holistic-house/film-collection-v2/meadow-morning.jpg"} alt=""/>
          </div>
          <Headphones size={22} aria-hidden="true"/>
          <span><strong>{completed?t.meditationNext:t.meditation}</strong><small>{completed?t.meditationNextHint:t.meditationHint}</small></span>
          <ArrowRight size={21} aria-hidden="true"/>
        </button>
        {!completed?<button type="button" onClick={()=>selectOffer("ritual")} data-ready-ritual
          aria-expanded={activeOffer==="ritual"} aria-controls="ready-inline-offer">
          <div className={css.thumbnail}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt=""/>
          </div>
          <Flower2 size={22} aria-hidden="true"/>
          <span><strong>{t.ritual}</strong><small>{t.ritualHint}</small></span>
          <ArrowRight size={21} aria-hidden="true"/>
        </button>:null}
        <button type="button" onClick={()=>selectOffer("journey")} data-ready-journey
          aria-expanded={activeOffer==="journey"} aria-controls="ready-inline-offer">
          <div className={css.thumbnail}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={completed?"/images/holistic-house/course-focus-mountain-boy.webp":"/images/holistic-house/reiki-approved-sunrise-v3.webp"} alt=""/>
          </div>
          <BookOpen size={22} aria-hidden="true"/>
          <span><strong>{completed?t.journeyNext:t.journey}</strong><small>{completed?t.journeyNextHint:t.journeyHint}</small></span>
          <ArrowRight size={21} aria-hidden="true"/>
        </button>
      </div>
      {activeOffer?<section ref={offerRef} id="ready-inline-offer" className={css.offerPanel}
        role="region" data-ready-offer-panel data-ready-offer={activeOffer}
        aria-label={activeOffer==="meditation"?t.meditation:activeOffer==="ritual"?t.ritual:t.journey}>
        <div className={css.offerHeader}>
          <h4>{activeOffer==="meditation"?t.medTitle:activeOffer==="ritual"?t.ritTitle:t.courseTitle}</h4>
          <p>{activeOffer==="meditation"?t.medHint:activeOffer==="ritual"?t.ritHint:t.courseHint}</p>
        </div>
        <p className={css.context}><CheckCircle2 size={19} aria-hidden="true"/>
          <strong>{t.selected}:</strong>{" "}{selectedGoal||t.meditation}</p>
        {ritual.status==="blocked"?<p className={css.note} role="alert">{ritual.message}</p>:<>
          {activeOffer==="ritual"?<details className={css.offerOptions} data-ready-ritual-options>
            <summary>{t.customize}</summary>
            <div className={css.ritualFields}>
              <label>{t.bestMoment}<select value={moment} onChange={event=>{setMoment(event.target.value);setRitualGenerated(false);setGeneratedOffer(null)}}>
                <option value="morning">{t.morning}</option><option value="evening">{t.evening}</option>
                <option value="any">{t.any}</option></select></label>
              <label>{t.setting}<select value={setting} onChange={event=>{setSetting(event.target.value);setRitualGenerated(false);setGeneratedOffer(null)}}>
                <option value="quiet">{t.quiet}</option><option value="nature">{t.nature}</option>
                <option value="desk">{t.desk}</option></select></label>
              <label>{t.action}<select value={action} onChange={event=>{setAction(event.target.value);setRitualGenerated(false);setGeneratedOffer(null)}}>
                <option value="observe">{t.observe}</option><option value="hand">{t.hand}</option>
                <option value="pause">{t.pause}</option></select></label>
              <label>{t.phrase}<input type="text" maxLength={140} value={anchor}
                placeholder={t.phrasePlaceholder} onChange={event=>{setAnchor(event.target.value);setRitualGenerated(false);setGeneratedOffer(null)}}/></label>
            </div>
          </details>:null}
          <button className={css.primary} type="button" disabled={disabled}
            onClick={generateOffer} data-ready-generate-text>
            <Sparkles size={19} aria-hidden="true"/>{t.generateText}<ArrowRight size={19} aria-hidden="true"/>
          </button>
          {generatedOffer===activeOffer?<div className={css.generated} data-ready-generated-text>
            <p className={css.generatedNote} role="status"><CheckCircle2 size={17} aria-hidden="true"/>{t.textReady}</p>
            {activeOffer==="meditation"?<>
              <h5>{t.medText}</h5>
              <pre className={css.scriptText} data-ready-meditation-text>{meditationScript}</pre>
              <p className={css.note}><ShieldCheck size={17} aria-hidden="true"/>{t.medNote}</p>
              <button type="button" className={css.secondary} data-ready-expand-meditation-editor
                aria-expanded={meditationAdvancedOpen}
                onClick={()=>setMeditationAdvancedOpen(open=>!open)}>{t.editMeditation}</button>
              {meditationAdvancedOpen?<div className={css.reused} data-ready-meditation-editor>
                {meditationEditor}</div>:null}
            </>:activeOffer==="ritual"&&ritual.status==="ready"&&ritualGenerated?<>
              <div className={css.ritualResult} data-ready-ritual-result>
                <h5>{t.ritualResult}: {ritual.title}</h5>
                <p>{t.structure}</p>
                <ol>{ritual.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>
                <p>{ritual.transfer}</p>
                {anchor.trim()?<p className={css.context}>{anchor.trim()}</p>:null}
              </div>
              <p className={css.note}><ShieldCheck size={17} aria-hidden="true"/>{t.ritualPrivacy}</p>
              <button type="button" className={css.secondary}
                onClick={()=>{setRevision(value=>value+1);setNotice("");}}>
                <RefreshCw size={17} aria-hidden="true"/>{t.another}</button>
            </>:activeOffer==="journey"?<>
              <h5>{t.sessionText}</h5>
              <div className={css.courseScripts} data-ready-eight-sessions>
                {courseTexts.map((session,index)=><details key={session.number}
                  open={index===0} className={css.courseSession} data-ready-session-text={session.number}>
                  <summary><span>{session.number}</span><strong>{session.title}</strong></summary>
                  <small>{session.motif}</small>
                  <pre className={css.scriptText}>{session.script}</pre>
                </details>)}
              </div>
              <p className={css.note}><ShieldCheck size={17} aria-hidden="true"/>{t.courseNote}</p>
              <button className={css.secondary} type="button" disabled={disabled}
                onClick={onOpenCourse} data-ready-create-course>
                <BookOpen size={19} aria-hidden="true"/>{t.openPlanner}</button>
            </>:null}
            <button type="button" className={css.secondary} onClick={()=>void copyGenerated()}
              data-ready-copy-generated><BookOpen size={17} aria-hidden="true"/>{t.copyText}</button>
          </div>:null}
          {notice?<p role="status" className={css.note}>{notice}</p>:null}
        </>}
      </section>:null}
      {completed?<button type="button" className={css.primary} disabled={disabled}
        data-ready-generate-new onClick={onStartNewVideo}>
        <Sparkles size={20} aria-hidden="true"/>{t.newVideo}<ArrowRight size={20} aria-hidden="true"/>
      </button>:null}
    </>:null}
    {view==="login"?<div className={css.gateBackdrop} data-ready-save-gate-overlay
      onMouseDown={event=>{if(event.target===event.currentTarget)closeSaveGate();}}>
      <section ref={gateRef} className={css.gateDialog} role="dialog" aria-modal="true"
        data-ready-save-intent={gateIntent}
        aria-labelledby="ready-save-gate-title" aria-describedby="ready-save-gate-description"
        data-ready-save-gate>
        <button type="button" className={css.gateClose} ref={gateCloseRef}
          onClick={closeSaveGate} aria-label={t.saveGateClose} data-ready-save-close>×</button>
        <div className={css.gateTop}>
          <div className={css.gatePortrait} aria-hidden="true"/>
          <div className={css.gateBrand}><Flower2 size={29} aria-hidden="true"/>
            <span><strong>Holistic House</strong><small>VIDEO STUDIO</small></span></div>
          <small className={css.gateEyebrow}>{t.saveGateTag}</small>
          <h2 id="ready-save-gate-title">{t.saveGateTitle}</h2>
          <span className={css.gateUnderline} aria-hidden="true"/>
        </div>
        <p className={css.gateLead} id="ready-save-gate-description">{t.saveGateLead}</p>
        <div className={css.gateBenefits}>
          <div><FolderOpen size={21} aria-hidden="true"/><span>{t.saveGateBenefitSave}</span></div>
          <div><Download size={21} aria-hidden="true"/><span>{t.saveGateBenefitDownload}</span></div>
          <div><Send size={21} aria-hidden="true"/><span>{t.saveGateBenefitTelegram}</span></div>
          <div><BookOpen size={21} aria-hidden="true"/><span>{t.saveGateBenefitPractice}</span></div>
        </div>
        {!signedIn?<>
          <Link className={css.gatePrimary} href={myVideos} target="_blank"
            rel="noopener noreferrer" prefetch={false} data-ready-save-gate-signin>
            <UserRound size={22} aria-hidden="true"/><span>{t.saveGateLogin}</span><ArrowRight size={20} aria-hidden="true"/>
          </Link>
          <p className={css.gateInstruction}>{t.saveGateSignInHint}</p>
          <button type="button" className={css.gateSecondary}
            onClick={onRefreshLogin} data-ready-save-gate-refresh-login>
            <RefreshCw size={18} aria-hidden="true"/>{t.saveGateRefresh}
          </button>
          {loginUnavailable?<p className={css.gateError} role="alert">{t.saveGateUnavailable}</p>:null}
        </>:<>
          {telegramStatus==="linked"?<p className={css.gateConnected} role="status">
            <CheckCircle2 size={20} aria-hidden="true"/>{t.saveGateTelegramLinked}</p>:null}
          {telegramLink?<a href={telegramLink} className={css.gatePrimary}
              target="_blank" rel="noopener noreferrer" data-ready-save-gate-telegram-start>
            <Send size={22} aria-hidden="true"/><span>{t.saveGateTelegram}</span><ArrowRight size={19} aria-hidden="true"/>
          </a>:telegramStatus==="linked"?<button className={css.gatePrimary} type="button"
              onClick={openDelivery} data-ready-save-gate-telegram-delivery>
            <Send size={22} aria-hidden="true"/><span>{t.saveGateContinue}</span><ArrowRight size={19} aria-hidden="true"/>
          </button>:<button className={css.gatePrimary} type="button"
              onClick={()=>void requestTelegramLink()}
              disabled={telegramStatus==="loading"}
              data-ready-save-gate-connect>
            <Send size={22} aria-hidden="true"/><span>{telegramStatus==="loading"?t.saveGateTelegramChecking:t.saveGateTelegramConnect}</span>
            <ArrowRight size={19} aria-hidden="true"/>
          </button>}
          <p className={css.gateInstruction}>{telegramLink?t.saveGateTelegramPending:t.saveGateTelegramHint}</p>
          {telegramStatus==="unavailable"||telegramError?<p role="status" className={css.gateError}>
            {telegramError||t.saveGateTelegramUnavailable}</p>:null}
          {telegramLink?<button type="button" className={css.gateSecondary}
            onClick={()=>void refreshTelegramLink()} data-ready-save-gate-verify-telegram>
            <RefreshCw size={18} aria-hidden="true"/>{t.saveGateTelegramVerify}</button>:null}
          <div className={css.gateDivider}><span>{t.saveGateOr}</span></div>
          <button type="button" className={css.gateSecondary} onClick={openDelivery}
            data-ready-save-gate-continue><FolderOpen size={20} aria-hidden="true"/>
            {t.saveGateContinue}</button>
        </>}
        <p className={css.gatePrivacy}><ShieldCheck size={18} aria-hidden="true"/>{t.saveGatePrivacy}</p>
      </section>
    </div>:null}
  </section>;
}
