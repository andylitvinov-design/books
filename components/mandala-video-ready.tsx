"use client";

import {PublishedStandardMotionFilm, getPublishedStandardMotionFilm} from "./published-standard-motion-film";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import type {ReactNode} from "react";
import Link from "next/link";
import {ArrowRight,BookOpen,CheckCircle2,Clock3,Download,Flower2,FolderOpen,Headphones,Play,RefreshCw,Send,MessageCircle,ShieldCheck,Sparkles,UserRound} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import type {GuidedMeditationFocus} from "./mandala-guided-course";
import type {VideoDeliveryStatus} from "./mandala-video-delivery";
import {selectResourcePractice} from "@/lib/mandala/resource-practice-selector.mjs";
import {buildPersonalMeditationScript} from "@/lib/mandala/personal-meditation-script.mjs";
import {buildPersonalImageryCourse} from "@/lib/mandala/personal-guided-course.mjs";
import {appFetch} from "@/lib/app/client-fetch";
import css from "./mandala-video-ready.module.css";
import {ReadyGenerationCheckIn} from "./mandala-video-ready-checkin";
import {isAppleMobileDevice} from "@/lib/mandala/recording-codecs.mjs";
import {MandalaTherapyWalletDialog} from "./mandala-therapy-wallet-dialog";

type VideoFile={url:string;extension:"mp4"|"webm";bytes:number;duration:number;blob?:Blob};
type View="home"|"login";
type Offer="meditation"|"ritual"|"journey";
type CourseText={number:number;title:string;motif:string;script:string};
type Props={
  locale:PublicLocale;theme:VideoTheme;wish:string;focus:GuidedMeditationFocus;aspect:"portrait"|"landscape"|"square";
  video:VideoFile|null;verified:boolean;checking:boolean;rendering:boolean;renderProgress:number;
  previewSourceCanvasRef?:{readonly current:HTMLCanvasElement|null};
  previewAvailable:boolean;previewPlaying:boolean;previewDurationSeconds:number;previewPositionSeconds:number;
  onPreviewToggle:()=>void;onPreviewSeek:(seconds:number)=>void;
  progressQuestionnaire:ReactNode;generationNotice:string;signedIn:boolean;
  exportFailed:boolean;canRetryExport:boolean;onRetryExport:()=>void;nativeIphoneMp4Retry?:boolean;
  onPlaybackError:(player:HTMLVideoElement)=>void;onCancelExport?:()=>void;
  loginUnavailable:boolean;disabled:boolean;meditationEditor:ReactNode;
  onOpenDelivery:()=>void;onRefreshLogin:()=>void;onOpenCourse:()=>void;onOpenTherapy:(format:"single"|"course")=>void;onReturnToPro:()=>void;
  onGenerateBasicVideo:()=>boolean;onStartNewVideo:()=>void;onVerifyPlayback:(player:HTMLVideoElement)=>void;
  onSaveDirect:()=>void;onSendTelegramDirect:()=>void;onShareWhatsApp:(consentApproved?:boolean)=>void;
  saveStatus:VideoDeliveryStatus;exportMode?:"personal"|"openmotion"|"express";basicFreeAvailable:boolean;
  basicFreeIssue:"checking"|"unavailable"|"guest_used"|"insufficient"|null;basicCreditCost:number;courseFlow?:boolean;
};
const COPY={
  en:{
    saveGateTitle:"Save your video free",saveGateLead:"Your video is ready. Sign in to save it in My Videos, download it or send it to Telegram.",saveGateTag:"YOUR VIDEO · YOUR CHOICE",saveGateBenefitSave:"Keep in My Videos",saveGateBenefitDownload:"Download to device",saveGateBenefitTelegram:"Send to Telegram",saveGateBenefitPractice:"Meditation or course",saveGateLogin:"Sign in to My House",saveGateTelegram:"Open Telegram · tap Start",saveGateTelegramConnect:"Get secure Telegram link",saveGateTelegramChecking:"Checking Telegram link…",saveGateTelegramUnavailable:"Telegram linking is unavailable. You can still use My House.",saveGateTelegramPending:"Tap Start in the Telegram chat, then return here.",saveGateTelegramLinked:"Telegram linked to your account.",saveGateTelegramVerify:"Check Telegram connection",saveGateContinue:"Continue saving",saveGateOr:"or",saveGateClose:"Close",saveGatePrivacy:"Free within available limits · Sent only with consent · Private by choice",saveGateSignInHint:"First sign in to My House. Open it in a new tab so your video stays here. Then check your sign-in.",saveGateTelegramHint:"Start connects the bot to your signed-in account. It does not send or save the video automatically.",saveGateRefresh:"Check sign-in",saveGateUnavailable:"Could not verify your account. The video stays on your device.",
    ready:"Your video is ready!",nextSteps:"Next steps: create a deeper practice",nextLead:"Expand your video into a guided practice or a full program.",newVideo:"Generate New Video",sendTelegram:"Send to Telegram",connectWhatsApp:"Connect WhatsApp",whatsapp:"WhatsApp",openTelegramStart:"Open Telegram · Start",telegramVerifySend:"Check link & send",openWhatsAppStart:"Open WhatsApp · verify",whatsappVerify:"Check WhatsApp",waLinkConsent:"I agree to link my own WhatsApp to this account for private practitioner messages. No marketing subscription or automatic video delivery.",whatsappLimit:"WhatsApp uses the device Share menu after linking your own account. Select your own chat; direct automated MP4 sending is not enabled.",meditationNext:"Add a Guided Meditation",meditationNextHint:"Turn your video into a full meditation with voice and music.",journeyNext:"Create an 8-Session Video Therapy",journeyNextHint:"A step-by-step program to work deeply with your goal.",preview:"Preview, save or continue your journey.",
    generating:"Your video is being generated on this device…",
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
    verifying:"Checking playback on this device…",failed:"No playable exported video is available yet.",retryCompatible:"Retry in compatibility mode",
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
    ready:"Ваше видео готово!",nextSteps:"Следующий шаг: углубите практику",nextLead:"Дополните ролик медитацией или программой занятий.",newVideo:"Создать новое видео",sendTelegram:"Отправить в Telegram",connectWhatsApp:"Привязать WhatsApp",whatsapp:"WhatsApp",openTelegramStart:"Открыть Telegram · Start",telegramVerifySend:"Проверить и отправить",openWhatsAppStart:"Открыть WhatsApp · подтвердить",whatsappVerify:"Проверить WhatsApp",waLinkConsent:"Я разрешаю привязать мой WhatsApp к кабинету для личных сообщений со специалистом. Без рассылок и автоматической отправки видео.",whatsappLimit:"После привязки WhatsApp выберите свой чат в меню телефона. Прямая автоматическая отправка MP4 пока недоступна.",meditationNext:"Добавить медитацию с голосом",meditationNextHint:"Озвучка и музыка к вашему ролику.",journeyNext:"Создать 8 видео-сессий",journeyNextHint:"Восемь связанных этапов вашей практики.",preview:"Посмотрите, сохраните или продолжите практику.",
    generating:"Видео создаётся на вашем устройстве…",
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
    verifying:"Проверяем воспроизведение на устройстве…",failed:"Пока нет проверенного готового видео.",retryCompatible:"Повторить в совместимом режиме",
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
    ready:"¡Tu vídeo está listo!",nextSteps:"Siguiente paso: profundiza en tu práctica",nextLead:"Continúa con una meditación o un programa.",newVideo:"Crear otro vídeo",sendTelegram:"Enviar a Telegram",connectWhatsApp:"Conectar WhatsApp",whatsapp:"WhatsApp",openTelegramStart:"Abrir Telegram · Start",telegramVerifySend:"Comprobar y enviar",openWhatsAppStart:"Abrir WhatsApp · verificar",whatsappVerify:"Comprobar WhatsApp",waLinkConsent:"Acepto vincular mi WhatsApp a esta cuenta para mensajes privados con el profesional. Sin anuncios ni envío automático de vídeos.",whatsappLimit:"Tras vincular WhatsApp, elige tu propio chat en el menú Compartir. El envío automático directo de MP4 no está activado.",meditationNext:"Añadir meditación guiada",meditationNextHint:"Voz y música para tu vídeo.",journeyNext:"Crear 8 sesiones de vídeo",journeyNextHint:"Ocho pasos conectados con tu objetivo.",preview:"Míralo, guárdalo o continúa tu camino.",
    generating:"Se está creando el vídeo en tu dispositivo…",
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
    verifying:"Verificando el vídeo en tu dispositivo…",failed:"Aún no hay un vídeo reproducible verificado.",retryCompatible:"Reintentar en modo compatible",
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

const courseActionCopy={
 en:{free:"Generate 1 video free",paid:"Create my personal video therapy course · 8 videos",
  note:"Eight videos need a confirmed quote and verified payment. Funding the wallet is a separate step."},
 ru:{free:"Сгенерировать 1 видео бесплатно",paid:"Создать личный курс видеотерапии · 8 видео",
  note:"Цена полного курса подтверждается отдельно. Пополнение кошелька не является заказом."},
 es:{free:"Generar 1 vídeo gratis",paid:"Crear mi curso personal · 8 vídeos",
  note:"El curso requiere precio y pago verificados. Recargar el monedero no equivale a un pedido."}
} as const;

export function MandalaVideoReady({
  locale,theme,wish,focus,aspect,video,verified,checking,rendering,renderProgress,
  previewSourceCanvasRef,previewAvailable,previewPlaying,previewDurationSeconds,previewPositionSeconds,
  onPreviewToggle,onPreviewSeek,
  generationNotice,exportFailed,canRetryExport,onRetryExport,onPlaybackError,onCancelExport,nativeIphoneMp4Retry=false,
  signedIn,loginUnavailable,disabled,
  meditationEditor,onOpenDelivery,onRefreshLogin,onOpenCourse,onOpenTherapy,onReturnToPro,
  onGenerateBasicVideo,onStartNewVideo,onVerifyPlayback,onSaveDirect,
  onSendTelegramDirect,onShareWhatsApp,saveStatus,
  basicFreeAvailable,basicFreeIssue,basicCreditCost,courseFlow=false,exportMode="personal"
}:Props){
  const t=COPY[locale];
  const courseActions=courseActionCopy[locale];
  const expressMaster=exportMode==="express"?getPublishedStandardMotionFilm("anti-stress-30s",locale):undefined;
  const [view,setView]=useState<View>("home");
  const [walletOpen,setWalletOpen]=useState(false);
  const closeWallet=useCallback(()=>setWalletOpen(false),[]);
  const [videoGenerationNotice,setVideoGenerationNotice]=useState("");
  const [checkinEngaged,setCheckinEngaged]=useState(false);
  const [checkinDismissed,setCheckinDismissed]=useState(false);
  // Exactly ONE decodable video is mounted in Ready. iPhone Safari supports
  // direct Blob srcObject, avoiding a second blob: URL decoder and unnecessary
  // Range/memory pressure. The exported bytes stay on this device.
  const readyPlayerRef=useRef<HTMLVideoElement|null>(null);
  const readySourceModeRef=useRef<"safari-blob"|"object-url">("object-url");
  const readyUrlRecoveryRef=useRef<string|null>(null);
  const sequencePreviewRef=useRef<HTMLCanvasElement|null>(null);
  // Mirror the one existing Studio painter. No encode, upload or credit hold.
  useEffect(()=>{
    if(video||!previewAvailable||exportMode==="express")return;
    let animation=0,last=0;
    const paint=(now:number)=>{
      if(now-last>=1000/15&&!document.hidden){
        const source=previewSourceCanvasRef?.current,target=sequencePreviewRef.current;
        if(source&&target&&source.width>0&&source.height>0){
          if(target.width!==source.width||target.height!==source.height){
            target.width=source.width;target.height=source.height;
          }
          try{target.getContext("2d",{alpha:false})?.drawImage(source,0,0);}
          catch{/* Unavailable source cannot count as exported video. */}
        }
        last=now;
      }
      animation=window.requestAnimationFrame(paint);
    };
    animation=window.requestAnimationFrame(paint);
    return()=>window.cancelAnimationFrame(animation);
  },[video,previewAvailable,previewSourceCanvasRef,exportMode]);
  useEffect(()=>{
    const player=readyPlayerRef.current;
    if(!video||!player)return;
    readyUrlRecoveryRef.current=null;
    let attached=false;
    if(typeof navigator!=="undefined"&&video.blob?.type==="video/mp4"&&
      isAppleMobileDevice(navigator.userAgent,navigator.maxTouchPoints)){
      try{
        player.srcObject=video.blob;
        attached=true;
      }catch{/* Safari can still use the original local Blob URL. */}
    }
    readySourceModeRef.current=attached?"safari-blob":"object-url";
    player.dataset.readyMediaTransport=attached?"blob-srcobject":"blob-url";
    if(!attached){player.src=video.url;player.load();}
    return ()=>{
      player.pause();
      if(attached&&player.srcObject===video.blob){
        try{player.srcObject=null;}catch{/* Unmount still releases the player. */}
      }
    };
  },[video?.url,video?.blob]);
  const handleReadyPlaybackError=(player:HTMLVideoElement)=>{
    if(!video)return;
    // The same encoded MP4 gets ONE alternate Safari transport, not a
    // second movie generation, held credit, upload or WebM export.
    if(readySourceModeRef.current==="safari-blob"&&
      readyUrlRecoveryRef.current!==video.url){
      readyUrlRecoveryRef.current=video.url;
      readySourceModeRef.current="object-url";
      try{
        player.srcObject=null;
        player.src=video.url;
        player.dataset.readyMediaTransport="blob-url";
        player.load();
        return;
      }catch{/* The existing native error handler will release held credit. */}
    }
    onPlaybackError(player);
  };

  useEffect(()=>{if(basicFreeAvailable)setVideoGenerationNotice("");},[basicFreeAvailable]);
  // Three continuation offers expand within Ready; the login dialog is independent.
  const [activeOffer,setActiveOffer]=useState<Offer|null>(null);
  const [generatedOffer,setGeneratedOffer]=useState<Offer|null>(null);
  const [meditationScript,setMeditationScript]=useState("");
  const [courseTexts,setCourseTexts]=useState<CourseText[]>([]);
  const [meditationAdvancedOpen,setMeditationAdvancedOpen]=useState(false);
  const offerRef=useRef<HTMLElement|null>(null);
  const [gateIntent,setGateIntent]=useState<"save"|"download"|"telegram"|"whatsapp"|"house">("save");
  const [whatsappConsent,setWhatsAppConsent]=useState(false);
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
  function openDelivery(){
    closeSaveGate();
    if(gateIntent==="save"){onSaveDirect();return;}
    if(gateIntent==="telegram"){onSendTelegramDirect();return;}
    if(gateIntent==="whatsapp"){onShareWhatsApp();return;}
    onOpenDelivery();
  }
  function chooseDelivery(intent:"save"|"download"|"telegram"|"whatsapp"|"house"="save"){
    if(!verified||!video||disabled)return;
    if(!signedIn||intent==="house"){
      gateLauncherRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
      setGateIntent(intent);setView("login");return;
    }
    if(intent==="save"){onSaveDirect();return;}
    if(intent==="telegram"){onSendTelegramDirect();return;}
    if(intent==="whatsapp"){onShareWhatsApp();return;}
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
    if(!basicFreeAvailable){
      setVideoGenerationNotice(basicFreeIssue==="guest_used"?t.videoGuestUsed:
        basicFreeIssue==="insufficient"?t.videoInsufficient:
        basicFreeIssue==="checking"?t.videoChecking:t.videoFreeHold);
      return;
    }
    if(onGenerateBasicVideo()){
      setVideoGenerationNotice("");setActiveOffer(null);setGeneratedOffer(null);
      setCheckinEngaged(false);setCheckinDismissed(false);
    }else setVideoGenerationNotice(t.videoSetup);
  }
  const completed=Boolean(verified&&video);
  const videoTime=video?`${Math.floor(video.duration/60)}:${String(Math.round(video.duration%60)).padStart(2,"0")}`:"0:00";
  const waiting=rendering||checking;
  const pendingStatus=rendering?t.generating:checking?t.verifying:
    previewAvailable
      ?(locale==="ru"?"Предпросмотр готов · MP4 ещё не создан":
        locale==="es"?"Vista previa lista · MP4 sin crear":"Preview ready · MP4 not created yet")
      :t.notReady;
  const header=<div className={css.selectedVideo} data-aspect={aspect}
    data-video-file={video?"true":undefined}
    data-personal-preview={!video&&previewAvailable?"true":undefined}>
    {video?<video key={video.url} ref={readyPlayerRef} playsInline controls preload="auto"
      data-mandala-video-preview data-ready-native-player="true"
      onLoadedData={event=>onVerifyPlayback(event.currentTarget)}
      onCanPlay={event=>onVerifyPlayback(event.currentTarget)}
      onError={event=>handleReadyPlaybackError(event.currentTarget)}
      aria-label={completed?t.ready:t.verifying}/>:
    previewAvailable?<canvas ref={sequencePreviewRef} data-ready-sequence-canvas
      aria-label={locale==="ru"?"Персональный предпросмотр, не готовый MP4":
        locale==="es"?"Vista previa personalizada, no es un MP4":"Personal preview, not an exported MP4"}/>:
    /* Approved first-party example, never labelled an exported personal movie. */
    <div className={css.example}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/videos/holistic-house/film-collection-v2/meadow-morning.jpg" alt=""/>

    </div>}
  </div>;
  return <section className={css.root} data-video-ready data-ready-view={view}
    data-ready-state={completed?"complete":"choose"}
    data-ready-has-video={video?"true":"false"}
    aria-label={view==="login"?t.authTitle:t.ready}>
    {(view==="home"||view==="login")?<>
      <p className={css.readyStatus} role="status" data-ready-status
        data-ready-status-phase={completed?"complete":rendering?"rendering":checking?"verifying":"idle"}>
        {completed?<CheckCircle2 size={19} aria-hidden="true"/>:<Clock3 size={19} aria-hidden="true"/>}
        <strong>{exportMode==="express"?"Express":completed?t.ready:pendingStatus}</strong>
        {completed?<span className={css.readyTime}><Clock3 size={15} aria-hidden="true"/>{videoTime}</span>:
          rendering?<span className={css.readyTime} aria-hidden="true">{Math.round(Math.max(0,Math.min(100,renderProgress)))}%</span>:null}
      </p>
      {rendering&&onCancelExport?<button type="button" className={css.secondary}
        data-ready-cancel-export onClick={onCancelExport}>
        {locale==="ru"?"Отменить экспорт":locale==="es"?"Cancelar exportación":"Cancel export"}
      </button>:null}
      {exportFailed&&!waiting&&!completed?<div className={css.exportFailure}
        role="alert" data-ready-export-failed>
        <strong>{t.failed}</strong>
        <p>{generationNotice||t.failed}</p>
        {canRetryExport?<button type="button" onClick={onRetryExport}
          data-ready-retry-compatible>{nativeIphoneMp4Retry?
            (locale==="ru"?"Повторить через Safari MP4":locale==="es"?"Reintentar con MP4 nativo de Safari":"Retry with native Safari MP4"):
            t.retryCompatible}<ArrowRight size={17} aria-hidden="true"/></button>:null}
      </div>:null}
      {exportMode!=="express"?header:null}
      {exportMode!=="express"&&!video&&previewAvailable?<div className={css.sequenceControls} data-ready-sequence-controls>
        <p>{locale==="ru"?"Ваши сцены и текст · предпросмотр без экспорта":
          locale==="es"?"Tus escenas y textos · vista previa sin exportar":
          "Your scenes and captions · preview without exporting"}</p>
        <button type="button" onClick={onPreviewToggle}
          disabled={disabled||waiting} data-ready-sequence-play aria-pressed={previewPlaying}>
          {previewPlaying?(locale==="ru"?"Пауза":locale==="es"?"Pausa":"Pause"):
            locale==="ru"?"Смотреть персональную историю":
              locale==="es"?"Reproducir mi historia":"Play my personal story"}
        </button>
        <input type="range" min={0} max={Math.max(1,previewDurationSeconds)}
          step={0.5} value={Math.min(previewDurationSeconds,previewPositionSeconds)}
          aria-label={locale==="ru"?"Позиция предпросмотра":
            locale==="es"?"Posición de vista previa":"Preview position"}
          disabled={disabled||waiting}
          onChange={event=>onPreviewSeek(Number(event.currentTarget.value))}
          data-ready-sequence-seek/>
        <small>{Math.floor(previewPositionSeconds)} / {Math.floor(previewDurationSeconds)} s · Preview ≠ MP4</small>
      </div>:null}
      {checking&&video&&!rendering?<button type="button" data-ready-play-verify
        className={css.secondary} onClick={()=>{
          const player=readyPlayerRef.current;
          if(!player||player.error)return;
          void player.play().then(()=>onVerifyPlayback(player))
            .catch(()=>{/* Native onError handles unsupported media. */});
        }}>
        <Play size={16} aria-hidden="true"/>
        {locale==="ru"?"Воспроизвести и проверить":locale==="es"?"Reproducir y comprobar":"Play & verify video"}
      </button>:null}
      {!completed&&!waiting&&exportMode==="openmotion"?<button type="button" className={css.secondary}
        data-ready-open-motion-picker onClick={onStartNewVideo}>
        {locale==="ru"?"Выбрать шаблон OpenMotion":locale==="es"?"Elegir plantilla OpenMotion":"Choose OpenMotion template"}
        <ArrowRight size={17} aria-hidden="true"/>
      </button>:null}
      {!completed&&!waiting&&exportMode==="express"?expressMaster?
        <div data-ready-express-standard><PublishedStandardMotionFilm locale={locale} master={expressMaster}/></div>:
        <p className={css.note} role="status" data-ready-express-unavailable>
          {locale==="ru"?"Готовый Express MP4 на русском пока недоступен.":
            locale==="es"?"Todavía no hay un MP4 Express terminado en español.":
            "No finished verified Express MP4 is available."}
        </p>:null}
      {!completed&&!waiting&&!exportFailed&&!courseFlow&&exportMode==="personal"?<button type="button" className={css.primary}
        disabled={disabled||checking} onClick={generateSelectedVideo} data-ready-generate>
        <Play size={19} aria-hidden="true"/>{t.videoGenerate}<ArrowRight size={18} aria-hidden="true"/>
      </button>:null}
      {courseFlow&&!waiting&&exportMode==="personal"?<div className={css.courseChoices} data-ready-course-choices>
        <button type="button" className={css.courseFree} data-ready-course-free
          disabled={disabled||checking} onClick={generateSelectedVideo}>
          <Play size={19} aria-hidden="true"/>{courseActions.free}</button>
        <button type="button" className={css.coursePaid} data-ready-course-paid
          disabled={disabled} onClick={()=>setWalletOpen(true)}>
          <BookOpen size={19} aria-hidden="true"/>{courseActions.paid}</button>
        <p>{courseActions.note}</p>
      </div>:null}
      {exportMode==="personal"&&!completed&&basicFreeAvailable&&basicCreditCost>0&&!waiting?
        <p className={css.note} data-ready-video-credit-cost>
          <ShieldCheck size={17} aria-hidden="true"/>{basicCreditCost} {t.videoIncludedCredit}
        </p>:null}
      {waiting&&!completed&&rendering?<div className={css.generateProgress} data-ready-generating>
        <progress max={100} value={Math.min(100,Math.max(0,renderProgress))}
          aria-label={t.generating}/>
      </div>:null}
      {!checkinDismissed&&((waiting&&!completed)||checkinEngaged)?
        <div className={css.progressQuestionnaire} data-ready-checkin>
          <ReadyGenerationCheckIn locale={locale}
            onFirstAnswer={()=>setCheckinEngaged(true)}
            onDismiss={()=>setCheckinDismissed(true)}/>
        </div>:null}
      {(videoGenerationNotice||generationNotice)&&!rendering&&!exportFailed?
        <p className={css.tierNotice} role="status" data-ready-video-tier-notice>
          {videoGenerationNotice||generationNotice}</p>:null}
      {videoGenerationNotice&&basicFreeIssue==="guest_used"?
        <Link className={css.secondary} href={myVideos} prefetch={false}
          target="_blank" rel="noopener noreferrer" data-ready-sign-in-credits>
          {t.videoGuestSignIn}<ArrowRight size={17} aria-hidden="true"/>
        </Link>:videoGenerationNotice&&basicFreeIssue!=="guest_used"?
        <button type="button" className={css.secondary}
          onClick={onReturnToPro} data-ready-review-pro>
          {t.backPro}<ArrowRight size={17} aria-hidden="true"/>
        </button>:null}
      {completed?<>
        <div className={css.actions} data-ready-save-choices>
          <button type="button" onClick={()=>chooseDelivery("save")}
            disabled={disabled||saveStatus.busy} aria-busy={saveStatus.busy}
            data-ready-save><Download size={21} aria-hidden="true"/><span>{t.save}</span></button>
          <button type="button" onClick={()=>chooseDelivery("telegram")} disabled={disabled||saveStatus.busy}
            data-ready-telegram><Send size={21} aria-hidden="true"/><span>{t.sendTelegram}</span></button>
          <button type="button" onClick={()=>chooseDelivery("whatsapp")} disabled={disabled||saveStatus.busy}
            data-ready-whatsapp><MessageCircle size={19} aria-hidden="true"/>
            <span>{saveStatus.whatsappLinked===false?t.connectWhatsApp:t.whatsapp}</span></button>
        </div>
        {saveStatus.telegramConnectUrl?<div className={css.linkActions} data-ready-telegram-link-step>
          <a href={saveStatus.telegramConnectUrl} target="_blank" rel="noopener noreferrer"
            data-ready-open-telegram>{t.openTelegramStart}</a>
          <button type="button" onClick={onSendTelegramDirect} disabled={saveStatus.busy}
            data-ready-verify-telegram>{t.telegramVerifySend}</button>
        </div>:null}
        {saveStatus.whatsappConsentRequired&&!saveStatus.whatsappLinked&&!saveStatus.whatsappConnectUrl?
          <div className={css.linkConsent} data-ready-whatsapp-link-consent>
            <label><input type="checkbox" checked={whatsappConsent}
              onChange={event=>setWhatsAppConsent(event.currentTarget.checked)}/>
              <span>{t.waLinkConsent}</span></label>
            <button type="button" onClick={()=>{if(whatsappConsent)onShareWhatsApp(true);}}
              disabled={!whatsappConsent||saveStatus.busy}
              data-ready-whatsapp-confirm-link>{t.connectWhatsApp}</button>
          </div>:null}
        {saveStatus.whatsappConnectUrl?<div className={css.linkActions} data-ready-whatsapp-link-step>
          <a href={saveStatus.whatsappConnectUrl} target="_blank" rel="noopener noreferrer"
            data-ready-open-whatsapp>{t.openWhatsAppStart}</a>
          <button type="button" onClick={()=>onShareWhatsApp()} disabled={saveStatus.busy}
            data-ready-verify-whatsapp>{t.whatsappVerify}</button>
        </div>:null}
        <p className={css.whatsappLimit}>{t.whatsappLimit}</p>
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
      </>:null}
      {!waiting||completed?<>
      <h3 className={css.nextTitle}>{completed?t.nextSteps:t.videoIdeas}</h3>
      {completed?<p className={css.nextLead}>{t.nextLead}</p>:null}
      <div className={css.journey}>
        <button type="button" onClick={()=>onOpenTherapy("single")} data-ready-meditation
          data-ready-therapy-format="single" disabled={disabled}>
          <div className={css.thumbnail}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={completed?"/images/holistic-house/ready-save-sunrise-portrait.jpg":"/videos/holistic-house/film-collection-v2/meadow-morning.jpg"} alt=""/>
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
        <button type="button" onClick={()=>onOpenTherapy("course")} data-ready-journey
          data-ready-therapy-format="course" disabled={disabled}>
          <div className={css.thumbnail}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={completed?"/images/holistic-house/messenger-zen-stones.svg":"/images/holistic-house/reiki-approved-sunrise-v3.webp"} alt=""/>
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
      {completed?<button type="button" data-ready-generate-new onClick={onStartNewVideo}>
        <Sparkles size={23} aria-hidden="true"/>
        <strong>{t.newVideo}</strong>
        <ArrowRight size={22} aria-hidden="true"/>
      </button>:null}
      </>:null}
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
    {walletOpen?<MandalaTherapyWalletDialog locale={locale} signedIn={signedIn}
      onClose={closeWallet} onRefreshLogin={onRefreshLogin}/>:null}
  </section>;
}
