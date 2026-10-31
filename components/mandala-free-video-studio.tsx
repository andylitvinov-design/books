"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { flushSync } from "react-dom";
import { ArrowRight, BarChart3, Camera, Check, ChevronDown, Coins, Download, Film, HandHeart, Heart, HeartPulse, Leaf, Sprout, Music2, AudioLines, Clock3, Smile, Paperclip, Search, Mic, Pause, Play, Share2, SlidersHorizontal, Sparkles, Target, TestTubeDiagonal, Zap, X } from "lucide-react";
import { moneyScenes } from "@/lib/mandala/money-flow-effects";
import { MandalaHypnoCompact } from "./mandala-hypno-compact";
import { MandalaGuidedCourse } from "./mandala-guided-course";
import { MandalaCinematicDirector } from "./mandala-cinematic-director";
import type { CinematicStoryboard } from "./mandala-cinematic-director";
import type { GuidedMeditationFocus } from "./mandala-guided-course";
import { MandalaPersonalMeditation } from "./mandala-personal-meditation";
import { defaultAffirmations, linesForVideoAffirmations, paintVideoAffirmations, suggestedVideoAffirmations } from "@/lib/mandala/video-affirmations";
import type { AffirmationSettings } from "@/lib/mandala/video-affirmations";
import { suggestPersonalVideoScene, captionFromWish, graphemeTrim } from "@/lib/mandala/personal-video-intent.mjs";
import { cinematicPreviewSeconds, buildCinematicStoryboard } from "@/lib/mandala/cinematic-director.mjs";
import { paintCinematicMoneyFrame, paintRealMoneyVideoFrame } from "@/lib/mandala/cinematic-money-video";
import { getRealMoneyFilm } from "@/lib/mandala/real-money-film-library";
import { getThemedRealFilm } from "@/lib/mandala/film-collection-v2";
import type { FilmSource } from "@/lib/mandala/film-collection-v2";
import { otherVideoScenes, paintThemedVideoFrame, paintRealThemedVideoFrame } from "@/lib/mandala/holistic-video-themes";
import type { LocalSceneId, OtherTheme, VideoTheme } from "@/lib/mandala/holistic-video-themes";
import { acquirePlaybackSession, isSupportedLocalAudio, presetAudioUrl, startPresetAudio, startUploadedAudio } from "@/lib/mandala/local-video-music";
import type { AmbientMusic, AmbientSession } from "@/lib/mandala/local-video-music";
import { mandalaAudioTracks, recommendMandalaAudio } from "@/lib/mandala/audio-recommendations.mjs";
import type { MoneySceneId } from "@/lib/mandala/money-flow-effects";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./mandala-meditation.module.css";
import videoStyles from "./mandala-video-mobile.module.css";

type Effect = "glow" | "energy" | "prosperity" | "temple";
const BACKGROUND_CLIP="local-money-background-only";
type Aspect = "square" | "portrait" | "landscape";
type Quality = "hd" | "fullhd";
type Result = { url: string; extension: "mp4" | "webm"; bytes: number; blob: Blob; mime: string };
type Speed = "slow" | "dynamic";
type Brightness = "soft" | "bright";
type CaptionMode = "none" | "theme" | "custom";
// A selected sound is only a preview; attaching it is a separate, explicit step.
type AttachedAudio = {kind:"preset";id:Exclude<AmbientMusic,"none">} | {kind:"file";file:File;id:string};
type Job = {
  recorder: MediaRecorder;
  stream: MediaStream;
  animation: number;
  timeout: number;
  cancelled: boolean;
  musicSession: AmbientSession | null;
};

const translations = {
  en: {
    heading: "Your cinematic personal video",
    description: "A large personal portrait, golden coins with depth and luminous moving scenery. Record a real video locally without AI fees.",
    photoNote: "Your photograph stays still; coins and scenery move. A clear portrait or transparent PNG looks best.",
    quality: "Video quality", hd: "HD · 720p (faster)", fullhd: "Full HD · 1080p",
    landscape: "Wide · 16:9",
    moneyHeading: "Money flow · 12 visual stories", moneyIntro: "Choose a symbolic flow around your own photograph. Four favourites first.",
    allMoney: "See all 12 looks", lessMoney: "Show four favourites", moneyNote: "A creative attention exercise, not a promise of income.",
    previewPlay: "Preview movement", previewPause: "Pause preview",
    effect: "Animation", effects: ["Golden light", "Energy flow", "Prosperity symbols", "Temple glow"],
    aspect: "Format", square: "Square · 1:1", portrait: "Vertical · 9:16",
    duration: "Duration", seconds: "sec",
    generate: "Create my free video", creating: "Recording on this device…",
    preparing: "Preparing your image…", ready: "Video ready. Save it to your device.",
    download: "Save video", cancel: "Cancel recording",
    imagePending: "The mandala image is being prepared. Choose your photo and wait for the preview.",
    unsupported: "This browser cannot record a canvas video. You can still save the PNG above. Try an updated Safari or Chrome for video.",
    failed: "Video creation failed or there was not enough memory. Try 10 seconds or a different browser.",
    privacy: "Free · processed only in your browser · no upload or account storage. Silent video; original guided recordings remain separate. Only use client photos with their permission.",
    formatHint: "MP4 or WebM depending on browser. On iPhone you can open the result and use Share → Save to Files.",
    preparingResult: "Recording…",
  },
  ru: {
    heading: "Ваше кинематографичное личное видео",
    description: "Крупный портрет, объёмные золотые монеты, светящиеся пейзажи и настоящее движение в видео. Бесплатная запись на устройстве.",
    photoNote: "Фото остаётся неподвижным, движутся монеты и окружение. Лучше подходит портрет или PNG без фона.",
    quality: "Качество видео", hd: "HD · 720p (быстрее)", fullhd: "Full HD · 1080p",
    landscape: "Горизонтальный · 16:9",
    moneyHeading: "Денежный поток · 16 сюжетов", moneyIntro: "Выберите движение золотого света вокруг своего фото. Сначала четыре популярных.",
    allMoney: "Показать все 12 вариантов", lessMoney: "Свернуть до четырёх", moneyNote: "Образная практика внимания, не обещание заработка.",
    previewPlay: "Посмотреть движение", previewPause: "Пауза",
    effect: "Эффект", effects: ["Золотой свет", "Поток энергии", "Символы процветания", "Сияние храма"],
    aspect: "Формат", square: "Квадрат · 1:1", portrait: "Вертикальный · 9:16",
    duration: "Длительность", seconds: "сек",
    generate: "Создать видео бесплатно", creating: "Запись на вашем устройстве…",
    preparing: "Подготавливаем изображение…", ready: "Видео готово. Сохраните его на устройство.",
    download: "Сохранить видео", cancel: "Отменить запись",
    imagePending: "Мандала ещё подготавливается. Выберите фото и дождитесь изображения.",
    unsupported: "Этот браузер не умеет записывать видео с холста. PNG можно сохранить выше. Для видео попробуйте обновлённый Safari или Chrome.",
    failed: "Не удалось создать видео или не хватило памяти. Попробуйте 10 секунд или другой браузер.",
    privacy: "Бесплатно · только в вашем браузере · без загрузки и сохранения в аккаунт. Видео без звука; авторские медитации отдельно. Используйте фото клиента только с его разрешения.",
    formatHint: "MP4 или WebM в зависимости от браузера. На iPhone откройте результат и выберите «Поделиться» → «Сохранить в Файлы».",
    preparingResult: "Запись…",
  },
  es: {
    heading: "Tu vídeo personal cinematográfico",
    description: "Retrato grande, monedas doradas con profundidad y paisajes luminosos en movimiento. Graba un vídeo real gratis en tu dispositivo.",
    photoNote: "Tu foto permanece inmóvil; se mueven las monedas y el entorno. Usa un retrato claro o un PNG sin fondo.",
    quality: "Calidad de vídeo", hd: "HD · 720p (más rápido)", fullhd: "Full HD · 1080p",
    landscape: "Horizontal · 16:9",
    moneyHeading: "Flujo de prosperidad · 16 escenas", moneyIntro: "Elige un movimiento simbólico alrededor de tu foto. Cuatro favoritos primero.",
    allMoney: "Ver las 16 escenas", lessMoney: "Mostrar cuatro favoritos", moneyNote: "Una práctica simbólica, no una promesa de ingresos.",
    previewPlay: "Ver movimiento", previewPause: "Pausar vista previa",
    effect: "Animación", effects: ["Luz dorada", "Flujo de energía", "Símbolos de prosperidad", "Luz del templo"],
    aspect: "Formato", square: "Cuadrado · 1:1", portrait: "Vertical · 9:16",
    duration: "Duración", seconds: "seg",
    generate: "Crear vídeo gratis", creating: "Grabando en este dispositivo…",
    preparing: "Preparando la imagen…", ready: "Vídeo listo. Guárdalo en tu dispositivo.",
    download: "Guardar vídeo", cancel: "Cancelar grabación",
    imagePending: "Se está preparando el mandala. Elige una foto y espera la vista previa.",
    unsupported: "Este navegador no permite grabar vídeo desde el lienzo. Puedes guardar la imagen PNG arriba. Prueba Safari o Chrome actualizado.",
    failed: "No se pudo crear el vídeo o falta memoria. Prueba 10 segundos u otro navegador.",
    privacy: "Gratis · procesado solo en tu navegador · sin subir ni guardar en tu cuenta. Vídeo sin sonido; las meditaciones están aparte. Usa fotos de clientes solo con su permiso.",
    formatHint: "MP4 o WebM según tu navegador. En iPhone abre el resultado y usa Compartir → Guardar en Archivos.",
    preparingResult: "Grabando…",
  },
} as const;


const studioCopy = {
  en: {
    title:"Video editor",renderMode:"Video output",withPortrait:"With my photo",backgroundOnly:"Animated background only",backgroundHint:"Reuse this moving background underneath your own footage.",sub:"Create your personal video",back:"Back to support",
    myVideos:"Current video",stepPhoto:"1. Add a photo",stepTheme:"2. Choose a theme",
    videoUnavailable:"The cinematic MP4 is unavailable. Please refresh this page.",
    stepTemplate:"3. Choose a template",stepSettings:"4. Customize your video",
    themes:{money:"Money",relationships:"Relationships",energy:"Energy",life:"Life",health:"Wellbeing",goals:"Goals & meaning"},
    replace:"Replace photo",addPhoto:"Add photo",noPhoto:"Your photo here",photoPrivate:"Only on your device",
    allTemplates:"All templates",fewTemplates:"Show less",templateHint:"Moving scenery; your face stays unchanged",
    format:"Format",duration:"Duration",seconds:"sec",speed:"Movement",slow:"Calm",dynamic:"Dynamic",
    brightness:"Brightness",soft:"Soft",bright:"Bright",music:"Sound ambience",noMusic:"Silent",
    musicNames:{harmony:"Harmony",prosperity:"Prosperity",energy:"Energy",love:"Love",meditation:"Meditation"},
    originalAudio:"13 original, locally synthesized WAV soundscapes on this site. No external streaming, AI processing or music licenses needed.",
    openAudioDirect:"Open soundtrack directly",retryAudio:"Retry playback",
    uploadAudio:"Add audio file",uploadAudioHint:"MP3, M4A, WAV or AAC · up to 15 MB · stored only on your device.",
    audioFileSelected:"Your audio file",audioRemove:"Remove",audioRights:"I have permission to use this audio in my video.",
    audioRightsHelp:"Confirm permission for the selected audio to export your video.",
    audioBadFile:"Choose an MP3, M4A, WAV or AAC file up to 15 MB.",
    audioTooLong:"For video export, select an audio file up to 3 minutes long.",
    audioDeviceHelp:"On iPhone, raise media volume with the side buttons. If the app is silent, open this page in Safari.",
    soundPreview:"Listen",soundStop:"Stop sound",soundVolume:"Volume",
    caption:"Video caption",noCaption:"No text",themeCaption:"Theme",myCaption:"My words",
    captionPlaceholder:"Your short phrase",quality:"Output quality",hd:"HD (fast)",fullhd:"Full HD",
    preview:"Preview animation",stopPreview:"Pause preview",videoPreview:"Your finished video",
    consent:"I own this photo or have permission to use it in my video.",
    consentHelp:"Please confirm permission to use the chosen photo.",
    create:"Create video for free",creating:"Creating your video",cancel:"Cancel",save:"Save video",
    share:"Share / Save to Files",shareUnsupported:"Sharing is unavailable on this device; download the video instead.",
    noStorage:"Free local creation · your photo is never uploaded or stored on our servers.",
    musicFallback:"This browser could not record an audio track. No silent video was substituted. Try another browser or select Silent.",
    soundUnavailable:"Could not start the sound. Check media volume or open the editor directly in Safari.",
    ready:"Video created. You can play, save or share it.",
    myVideosInfo:"Your current video stays on this page only. Download it to keep it; cloud saving is not active yet.",
    wishTitle:"My wish (optional)",wishPlaceholder:"For example: I welcome fair payment for my work.",
    wishHelp:"Private: the wish stays on this device. No AI service or account upload.",
    wishAction:"Suggest a scene for free",wishCaption:"Put my words on the video",
    wishReady:"Suggested scene",wishDefault:"No matching visual theme; we kept your chosen topic.",
    wishMissing:"Write a short wish first.",
    settings:"Settings",home:"Home",meditations:"Meditations",createTab:"Create",
    advanced:"Mandala & guided meditations",photoError:"Try a JPG, PNG or WebP image smaller than 10 MB.",
  },
  ru: {
    title:"Видеоредактор",renderMode:"Вариант ролика",withPortrait:"С моим фото",backgroundOnly:"Только видеофон",backgroundHint:"Фон без портрета, который можно добавить в свой видеомонтаж.",sub:"Создай своё персональное видео",back:"К поддержке",
    myVideos:"Текущий ролик",stepPhoto:"1. Загрузите фото",stepTheme:"2. Выберите тему",
    videoUnavailable:"Не удалось загрузить HD-видеоролик. Обновите страницу.",
    stepTemplate:"3. Выберите шаблон",stepSettings:"4. Настройте видео",
    themes:{money:"Деньги",relationships:"Отношения",energy:"Энергия",life:"Жизнь",health:"Здоровье",goals:"Цели и смыслы"},
    replace:"Заменить фото",addPhoto:"Загрузить фото",noPhoto:"Ваше фото",photoPrivate:"Только на устройстве",
    allTemplates:"Все шаблоны",fewTemplates:"Свернуть",templateHint:"Анимируется фон; лицо на фото не меняется",
    format:"Формат",duration:"Длительность",seconds:"сек",speed:"Движение",slow:"Спокойное",dynamic:"Динамичное",
    brightness:"Яркость",soft:"Мягкая",bright:"Яркая",music:"Звуковой фон",noMusic:"Без звука",
    musicNames:{harmony:"Гармония",prosperity:"Процветание",energy:"Энергия",love:"Любовь",meditation:"Медитация"},
    originalAudio:"13 оригинальных синтезированных WAV-подложек с нашего сайта. Без внешних сервисов; можно добавить свою музыку или голос.",
    openAudioDirect:"Открыть аудиофайл отдельно",retryAudio:"Повторить",
    uploadAudio:"Добавить аудиофайл",uploadAudioHint:"MP3, M4A, WAV или AAC · до 15 МБ · только на вашем устройстве.",
    audioFileSelected:"Ваш аудиофайл",audioRemove:"Удалить",audioRights:"Я имею право использовать эту запись в своём видео.",
    audioRightsHelp:"Подтвердите право на аудиозапись, чтобы сохранить видео со звуком.",
    audioBadFile:"Выберите MP3, M4A, WAV или AAC до 15 МБ.",
    audioTooLong:"Для видео выберите аудиофайл продолжительностью до 3 минут.",
    audioDeviceHelp:"На iPhone увеличьте громкость медиа боковыми кнопками. Если звука нет в приложении, откройте страницу в Safari.",
    soundPreview:"Прослушать",soundStop:"Остановить",soundVolume:"Громкость",
    caption:"Надпись на видео",noCaption:"Без текста",themeCaption:"Тема",myCaption:"Моя фраза",
    captionPlaceholder:"Напишите короткую фразу",quality:"Качество файла",hd:"HD (быстрее)",fullhd:"Full HD",
    preview:"Посмотреть анимацию",stopPreview:"Остановить предпросмотр",videoPreview:"Ваше готовое видео",
    consent:"Это моё фото или у меня есть разрешение использовать его в этом видео.",
    consentHelp:"Подтвердите право использовать выбранное фото.",
    create:"Создать видео бесплатно",creating:"Создаётся видео",cancel:"Отменить",save:"Сохранить видео",
    share:"Поделиться / Сохранить в Файлы",shareUnsupported:"Передача файла недоступна. Сохраните его кнопкой выше.",
    noStorage:"Бесплатно, прямо в браузере · фото не отправляется и не хранится на сервере.",
    musicFallback:"Браузер не может записать аудиодорожку. Видео без звука не подставляем. Попробуйте другой браузер или «Без звука».",
    soundUnavailable:"Не удалось включить звук. Проверьте громкость медиа или откройте редактор напрямую в Safari.",
    ready:"Видео создано. Можно посмотреть, сохранить или поделиться.",
    myVideosInfo:"Это результат текущей страницы. Чтобы сохранить надолго, скачайте файл; облачное «Мои видео» ещё не подключено.",
    wishTitle:"Моё пожелание (необязательно)",wishPlaceholder:"Например: спокойно принимаю достойную оплату за свой труд.",
    wishHelp:"Приватно: пожелание остаётся на устройстве, не отправляется в AI, CRM или кабинет.",
    wishAction:"Подобрать сцену бесплатно",wishCaption:"Добавить мою фразу на видео",
    wishReady:"Подходящий сюжет",wishDefault:"Сцена не найдена по словам; оставили выбранную вами тему.",
    wishMissing:"Сначала напишите краткое пожелание.",
    settings:"Настройки",home:"Главная",meditations:"Медитации",createTab:"Создать",
    advanced:"Мандала и авторские медитации",photoError:"Загрузите JPG, PNG или WebP до 10 МБ.",
  },
  es: {
    title:"Editor de vídeo",renderMode:"Tipo de vídeo",withPortrait:"Con mi foto",backgroundOnly:"Solo fondo animado",backgroundHint:"Fondo animado para usar debajo de otro vídeo.",sub:"Crea tu vídeo personal",back:"Volver a apoyo",
    myVideos:"Vídeo actual",stepPhoto:"1. Sube una foto",stepTheme:"2. Elige un tema",
    videoUnavailable:"No se pudo cargar el vídeo HD. Actualiza la página.",
    stepTemplate:"3. Elige una plantilla",stepSettings:"4. Personaliza el vídeo",
    themes:{money:"Dinero",relationships:"Relaciones",energy:"Energía",life:"Vida",health:"Bienestar",goals:"Metas y sentido"},
    replace:"Cambiar foto",addPhoto:"Subir foto",noPhoto:"Tu foto",photoPrivate:"Solo en tu dispositivo",
    allTemplates:"Todas las plantillas",fewTemplates:"Mostrar menos",templateHint:"Se anima el entorno; tu rostro no se altera",
    format:"Formato",duration:"Duración",seconds:"seg",speed:"Movimiento",slow:"Tranquilo",dynamic:"Dinámico",
    brightness:"Brillo",soft:"Suave",bright:"Vivo",music:"Ambiente sonoro",noMusic:"Sin sonido",
    musicNames:{harmony:"Armonía",prosperity:"Prosperidad",energy:"Energía",love:"Amor",meditation:"Meditación"},
    originalAudio:"13 fondos WAV sintetizados y originales de este sitio. Sin servicios externos; también puedes subir tu música o voz.",
    openAudioDirect:"Abrir el archivo de audio",retryAudio:"Reintentar",
    uploadAudio:"Añadir archivo de audio",uploadAudioHint:"MP3, M4A, WAV o AAC · máximo 15 MB · solo en tu dispositivo.",
    audioFileSelected:"Tu archivo de audio",audioRemove:"Eliminar",audioRights:"Tengo permiso para usar este audio en mi vídeo.",
    audioRightsHelp:"Confirma tus derechos sobre el audio para exportar el vídeo.",
    audioBadFile:"Elige un MP3, M4A, WAV o AAC de hasta 15 MB.",
    audioTooLong:"Para exportar, elige un audio de hasta 3 minutos.",
    audioDeviceHelp:"En iPhone, sube el volumen multimedia con los botones laterales. Si la app no suena, abre Safari.",
    soundPreview:"Escuchar",soundStop:"Detener sonido",soundVolume:"Volumen",
    caption:"Texto en el vídeo",noCaption:"Sin texto",themeCaption:"Tema",myCaption:"Mis palabras",
    captionPlaceholder:"Escribe una frase corta",quality:"Calidad de vídeo",hd:"HD (rápido)",fullhd:"Full HD",
    preview:"Ver animación",stopPreview:"Detener vista previa",videoPreview:"Tu vídeo terminado",
    consent:"Soy propietario de esta foto o tengo permiso para usarla en el vídeo.",
    consentHelp:"Confirma tu permiso para usar esta foto.",
    create:"Crear vídeo gratis",creating:"Creando vídeo",cancel:"Cancelar",save:"Guardar vídeo",
    share:"Compartir / Guardar en Archivos",shareUnsupported:"No se puede compartir; descarga el vídeo con el botón anterior.",
    noStorage:"Gratis, directamente en el navegador · tu foto nunca se envía ni se almacena.",
    musicFallback:"Este navegador no pudo grabar audio. No guardamos un vídeo silencioso. Prueba otro navegador o elige Sin sonido.",
    soundUnavailable:"No se pudo iniciar el sonido. Comprueba el volumen multimedia o abre Safari directamente.",
    ready:"Vídeo creado. Puedes verlo, guardarlo o compartirlo.",
    myVideosInfo:"Este vídeo solo existe en la página actual. Descárgalo para conservarlo; todavía no hay guardado en la nube.",
    wishTitle:"Mi deseo (opcional)",wishPlaceholder:"Por ejemplo: recibir una remuneración justa por mi trabajo.",
    wishHelp:"Privado: el texto queda en tu dispositivo; no se envía a IA ni CRM.",
    wishAction:"Sugerir escena gratis",wishCaption:"Poner mis palabras en el vídeo",
    wishReady:"Escena sugerida",wishDefault:"No hay coincidencias; mantenemos tu tema elegido.",
    wishMissing:"Escribe primero tu deseo.",
    settings:"Ajustes",home:"Inicio",meditations:"Meditaciones",createTab:"Crear",
    advanced:"Mandala y meditaciones originales",photoError:"Usa JPG, PNG o WebP de hasta 10 MB.",
  }
} as const;
const layoutCopy = {
  en: {
    modeLabel:"Choose a video mode",pump:"Video boost",therapy:"Video therapy",
    therapyHint:"An optional eight-session guided imagery journey for reflection, not medical or autonomous psychotherapy.",
    therapyJump:"Explore the 8 sessions",photoEnable:"My photo / goal",
    photoLink:"Choose photo",photoIncluded:"Photo chosen",
    previewOptions:"Optional video elements",affirmationsToggle:"Affirmations",configureAffirmations:"Choose phrases",previewTitle:"Personal video preview",
    therapyBannerLabel:"YOUR PERSONAL JOURNEY",therapyBannerTitle:"Eight gentle video sessions",therapyBannerHint:"Plan a guided imagery series. The first video is free; seven further sessions are previews.",therapyBannerAction:"Create a personal video-therapy programme",
    quickControls:"Video preview settings",extraFilters:"More visual styles and themes",
    extraThemes:"Other themes",audioTitle:"Audio track",audioHelp:"Choose an ambient sound or upload your own recording.",
    hypnosisTitle:"Hypnoaffirmations",hypnosisHelp:"Optional short, visible phrases and gentle imagery. No proven subliminal effects or clinical hypnosis are claimed.",
    extraSettings:"More video settings",personalFocus:"My focus and recommended theme",
    editorNavLabel:"Go to video settings",designTab:"Design",audioTab:"Audio",affirmationsTab:"Affirmations",
    previewCta:"Preview video",previewHelp:"Preview only — use Create video to save a file.",
     therapyHeading:"Your personal video therapy",therapySub:"8 guided imagery sessions · the first video is free",
  },
  ru: {
    modeLabel:"Выбор режима видео",pump:"Видео-подкачка",therapy:"Видео-терапия",
    therapyHint:"Бережная серия из 8 образных практик для самостоятельной поддержки, а не медицинская или автономная психотерапия.",
    therapyJump:"Программа из 8 сессий",photoEnable:"Своё фото / цель",
    photoLink:"Выбрать фото",photoIncluded:"Фото выбрано",
    previewOptions:"Дополнения к видео",affirmationsToggle:"Аффирмации",configureAffirmations:"Настроить фразы",previewTitle:"Просмотр видеоролика",
    therapyBannerLabel:"ЛИЧНАЯ ПРОГРАММА",therapyBannerTitle:"8 видеопрактик по вашему запросу",therapyBannerHint:"Бережные образные практики: первый ролик бесплатно, остальные пока в плане.",therapyBannerAction:"Создать персональную программу видеотерапии",
    quickControls:"Параметры видеопревью",extraFilters:"Другие стили и темы",
    extraThemes:"Другие темы",audioTitle:"Аудио-трек",audioHelp:"Подберите звуковую подложку или загрузите свою запись.",
    hypnosisTitle:"Гипноаффирмации",hypnosisHelp:"Короткие фразы и мягкие образы по желанию. Не заменяют клинический гипноз или лечение; скрытый эффект не доказан.",
    extraSettings:"Дополнительные настройки видео",personalFocus:"Мои акценты и рекомендации",
    editorNavLabel:"Перейти к настройкам видео",designTab:"Дизайн",audioTab:"Аудио",affirmationsTab:"Аффирмации",
    previewCta:"Просмотреть видео",previewHelp:"Это предпросмотр. Для сохранения файла нажмите «Создать видео».",
     therapyHeading:"Ваша персональная видеотерапия",therapySub:"8 образных сессий · первый ролик бесплатно",
  },
  es: {
    modeLabel:"Elige el modo de vídeo",pump:"Vídeo de impulso",therapy:"Videoterapia",
    therapyHint:"Una serie opcional de 8 sesiones de imágenes guiadas para reflexionar, sin tratamiento médico ni psicoterapia autónoma.",
    therapyJump:"Explorar 8 sesiones",photoEnable:"Mi foto / objetivo",
    photoLink:"Elegir foto",photoIncluded:"Foto elegida",
    previewOptions:"Elementos opcionales del vídeo",affirmationsToggle:"Afirmaciones",configureAffirmations:"Elegir frases",previewTitle:"Vista previa del vídeo",
    therapyBannerLabel:"TU PROGRAMA PERSONAL",therapyBannerTitle:"Ocho sesiones de vídeo guiado",therapyBannerHint:"Prepara una serie de visualizaciones. El primer vídeo es gratis; los otros siete son vistas previas.",therapyBannerAction:"Crear mi programa personal de videoterapia",
    quickControls:"Ajustes de vista previa",extraFilters:"Otros estilos y temas",
    extraThemes:"Otros temas",audioTitle:"Pista de audio",audioHelp:"Elige un sonido de ambiente o sube tu propia grabación.",
    hypnosisTitle:"Hipnoafirmaciones",hypnosisHelp:"Frases breves visibles e imágenes suaves opcionales. No sustituyen la hipnosis clínica ni un tratamiento; no hay evidencia de efectos subliminales.",
    extraSettings:"Más ajustes de vídeo",personalFocus:"Mis prioridades y recomendaciones",
    editorNavLabel:"Ir a los ajustes del vídeo",designTab:"Diseño",audioTab:"Audio",affirmationsTab:"Afirmaciones",
    previewCta:"Ver vídeo",previewHelp:"Solo vista previa. Usa Crear vídeo para guardar un archivo.",
     therapyHeading:"Tu videoterapia personal",therapySub:"8 sesiones guiadas · primer vídeo gratis",
  },
} as const;
const audioCopy = {
  en: {
    context:"For your video theme",automatic:"Smart match",autoOn:"Matched to theme",topic:"Theme",favorite:"Favorite",unfavorite:"Remove favorite",byFavorites:"Favorites first",
    type:"Sound type",mood:"Mood",pace:"Tempo",
    types:{all:"All sounds",tones:"Ambient tones",nature:"Nature textures",pulse:"Soft rhythm"},
    moods:{all:"Any mood",calm:"Calm",focus:"Focus",uplift:"Inspiration"},
    paces:{all:"Any pace",slow:"Slow",steady:"Steady",active:"Energizing"},
    voice:"Soft sound for a later voiceover",voiceInfo:"Quiet tracks at 30%. Only one soundtrack exports; voice and music are not mixed here.",
    suggested:"Best for this topic",browse:"Scroll to explore",count:"sounds",
    empty:"No sounds match these filters.",clear:"Clear filters",now:"Selected sound",
    search:"Find a sound…",sort:"Sort",byTopic:"Best match",byName:"Name A–Z",
    videoLength:"Video length",loop:"8-second loop",showMore:"Show all sounds",showLess:"Show fewer",
    pick:"Select",picked:"Selected",attach:"Attach to video",attached:"Attached to video",
    detach:"Remove from video",needsAttach:"Select a sound and tap Attach to video before export.",
    applied:"Sound is attached to this video setup. Create the video again to save a file with this sound.",
    chooseFirst:"Choose a sound",noAudioInfo:"No sound is attached. Select a sound or create a silent video.",
    attachedLabel:"On video",noAttached:"No sound attached",
    recordVoice:"Record my voice",stopVoice:"Finish recording",recordUnavailable:"Microphone is unavailable here. Try Safari or upload an audio file.",
    recordFailed:"Could not record audio. Check microphone permission or use Files.",
    recordTooLarge:"Recording exceeded 15 MB or 3 minutes. Please make a shorter recording.",
    fileReady:"Voice recorded locally. Confirm audio permission and attach it to the video.",helpTitle:"Audio playback help",
  },
  ru: {
    context:"Под вашу тему",automatic:"Умный подбор",autoOn:"Подобрано по теме",topic:"Тема",favorite:"В избранное",unfavorite:"Убрать из избранного",byFavorites:"Сначала избранные",
    type:"Тип звука",mood:"Настрой",pace:"Темп",
    types:{all:"Все звуки",tones:"Музыка и тоны",nature:"Звуки природы",pulse:"Мягкий ритм"},
    moods:{all:"Любой",calm:"Успокоение",focus:"Концентрация",uplift:"Вдохновение"},
    paces:{all:"Любой",slow:"Медленный",steady:"Ровный",active:"Бодрый"},
    voice:"Мягкий фон для будущей озвучки",voiceInfo:"Спокойные треки, громкость 30%. Голос и музыка пока не накладываются одновременно.",
    suggested:"Лучше подходит",browse:"Листайте звуки",count:"звуков",
    empty:"По этим фильтрам звуков нет.",clear:"Сбросить фильтры",now:"Выбранный звук",
    search:"Найти звук…",sort:"Сортировка",byTopic:"Подходящие",byName:"По названию",
    videoLength:"Длина видео",loop:"Цикл 8 секунд",showMore:"Показать все звуки",showLess:"Свернуть список",
    pick:"Выбрать",picked:"Выбран",attach:"Прикрепить к видео",attached:"Прикреплено к видео",
    detach:"Убрать звук из видео",needsAttach:"Выберите дорожку и нажмите «Прикрепить к видео» перед сохранением.",
    applied:"Дорожка прикреплена к настройкам ролика. Создайте видео заново, чтобы получить файл со звуком.",
    chooseFirst:"Выберите звук",noAudioInfo:"Звук не прикреплён. Выберите дорожку либо создайте видео без звука.",
    attachedLabel:"В видео",noAttached:"Без звука",
    recordVoice:"Записать голос",stopVoice:"Завершить запись",recordUnavailable:"Микрофон недоступен. Откройте Safari или загрузите аудио из «Файлов».",
    recordFailed:"Записать голос не удалось. Проверьте разрешение на микрофон или загрузите файл.",
    recordTooLarge:"Запись больше 15 МБ или 3 минут. Попробуйте короче.",
    fileReady:"Голос записан на устройстве. Подтвердите право и прикрепите его к видео.",helpTitle:"Если звук не слышен",
  },
  es: {
    context:"Para el tema elegido",automatic:"Selección inteligente",autoOn:"Según el tema",topic:"Tema",favorite:"Favorito",unfavorite:"Quitar favorito",byFavorites:"Primero favoritos",
    type:"Tipo de sonido",mood:"Ambiente",pace:"Ritmo",
    types:{all:"Todos",tones:"Tonos y música",nature:"Naturaleza sintética",pulse:"Ritmo suave"},
    moods:{all:"Cualquiera",calm:"Calma",focus:"Concentración",uplift:"Inspiración"},
    paces:{all:"Cualquiera",slow:"Lento",steady:"Regular",active:"Dinámico"},
    voice:"Fondo suave para añadir voz después",voiceInfo:"Pistas suaves al 30%. Por ahora solo se exporta una pista de audio.",
    suggested:"Recomendado",browse:"Desliza para explorar",count:"sonidos",
    empty:"No hay sonidos con estos filtros.",clear:"Restablecer filtros",now:"Audio elegido",
    search:"Buscar sonido…",sort:"Orden",byTopic:"Recomendados",byName:"Nombre A–Z",
    videoLength:"Duración del vídeo",loop:"Bucle de 8 segundos",showMore:"Ver todos los sonidos",showLess:"Mostrar menos",
    pick:"Elegir",picked:"Elegido",attach:"Adjuntar al vídeo",attached:"Adjunto al vídeo",
    detach:"Quitar sonido del vídeo",needsAttach:"Elige un sonido y pulsa Adjuntar antes de guardar el vídeo.",
    applied:"Audio adjunto a este vídeo. Créalo de nuevo para guardar el archivo con sonido.",
    chooseFirst:"Elige un sonido",noAudioInfo:"No hay audio adjunto. Elige un sonido o crea un vídeo sin él.",
    attachedLabel:"En el vídeo",noAttached:"Sin sonido",
    recordVoice:"Grabar voz",stopVoice:"Terminar grabación",recordUnavailable:"El micrófono no está disponible. Prueba Safari o sube un archivo.",
    recordFailed:"No se pudo grabar. Revisa los permisos o utiliza Archivos.",
    recordTooLarge:"La grabación supera 15 MB o 3 minutos. Hazla más corta.",
    fileReady:"Voz grabada localmente. Confirma los derechos y adjúntala al vídeo.",helpTitle:"Ayuda con el sonido",
  },
} as const;

const supportDesignCopy = {
  en: {
    check:"1. Check in with yourself", scoreGuide:"Rate each area from 1 to 10",
    help:"2. Choose what helps", test:"Tests", focus:"Focus",
    shortTools:{meditation:"Video",test:"Test",talisman:"Talisman",reiki:"Reiki"},
    mandala:"Video therapy",recommend:"Find my focus",
    meditation:"Meditation", testSession:"Session", talisman:"Talisman",
    reiki:"Reiki support", courses:"Courses", masters:"Masters",
    catalogTitle:"Video mandala",catalogIntro:"Choose a theme and create your own video",allScenes:"All scenes",health:"Wellbeing",
    filterStyle:"Visual style",filterMotion:"Movement",filterDuration:"Length",forGoal:"For your chosen theme",
    featureAnimation:"Moving scenery",more:"Details",categoryTitles:{
      energy:"Energy and harmony",money:"A flow of inspiration",relationships:"Warmth and connection",goals:"A path to your goals",life:"A celebration of life",health:"A gentle mindful pause"
    },categoryDescriptions:{
      energy:"A luminous visual scene for slowing down and finding your focus.",
      life:"Real nature footage for inspiration, renewal and reflection.",
      money:"Golden imagery for reflection on your intentions and plans.",
      relationships:"Warm light and gentle motion for a moment of reflection.",
      goals:"A moving landscape to help keep your intention in view.",
      health:"A calm symbolic scene for rest and mindful attention."
    },
    heroTabs:["Video mandala","Templates","Masters","Theme"],
    heroBadge:"Original ambient music · optional",heroTitle:"Create your personal video",
    heroIntro:"Add a photo, choose a theme and make your own moving video for free.",
    topThemes:"Video theme",popular:"Popular templates",reset:"Reset settings",
    quickPreview:"Watch animation", pausePreview:"Pause animation",heroConsent:"Confirm photo permission below to create the video.",
  },
  ru: {
    check:"1. Оцени себя сейчас", scoreGuide:"Поставь баллы от 1 до 10",
    help:"2. Выбери, что поможет",test:"Тесты",focus:"Фокус",
    shortTools:{meditation:"Видео",test:"Тест",talisman:"Талисман",reiki:"Рейки"},
    mandala:"Видео-терапия",recommend:"Подобрать",
    meditation:"Медитация", testSession:"Сессия",talisman:"Талисман",
    reiki:"Рейки поддержка",courses:"Курсы",masters:"Мастера",
    catalogTitle:"Видео-мандала",catalogIntro:"Выбери тему и создай своё видео",allScenes:"Все сюжеты",health:"Здоровье",
    filterStyle:"Стиль",filterMotion:"Анимация",filterDuration:"Длительность",forGoal:"По выбранной цели",
    featureAnimation:"Живой видеофон",more:"Подробнее",categoryTitles:{
      energy:"Источник энергии и гармонии",money:"Золотой поток вдохновения",relationships:"Тепло и близость",goals:"Путь к своим целям",life:"Красота и движение жизни",health:"Бережная пауза"
    },categoryDescriptions:{
      energy:"Светлая видео-мандала для спокойной паузы, внимания и внутреннего равновесия.",
      life:"Живые кадры природы для вдохновения, обновления и созерцания.",
      money:"Образы золотого света для размышления о желаниях и планах.",
      relationships:"Мягкое движение и тёплые образы для личной практики внимания.",
      goals:"Движущийся пейзаж как напоминание о выбранном намерении.",
      health:"Спокойный символический видеосюжет для отдыха и внимания к себе."
    },
    heroTabs:["Видео-мандала","Шаблоны","Мастера","Тема"],
    heroBadge:"Авторская музыка · по выбору",heroTitle:"Создай своё личное видео",
    heroIntro:"Загрузи фото, выбери тему и создай красивое видео бесплатно.",
    topThemes:"Тема видео",popular:"Популярные шаблоны",reset:"Сбросить настройки",
    quickPreview:"Смотреть анимацию", pausePreview:"Пауза",heroConsent:"Подтверди разрешение на фото ниже, чтобы создать видео.",
  },
  es: {
    check:"1. Evalúa cómo estás",scoreGuide:"Valora del 1 al 10",
    help:"2. Elige lo que te ayuda",test:"Pruebas",focus:"Enfoque",
    shortTools:{meditation:"Vídeo",test:"Test",talisman:"Talismán",reiki:"Reiki"},
    mandala:"Videoterapia",recommend:"Elegir tema",
    meditation:"Meditación",testSession:"Sesión",talisman:"Talismán",
    reiki:"Apoyo Reiki",courses:"Cursos",masters:"Guías",
    catalogTitle:"Vídeo mandala",catalogIntro:"Elige un tema y crea tu vídeo",allScenes:"Todas las escenas",health:"Bienestar",
    filterStyle:"Estilo",filterMotion:"Animación",filterDuration:"Duración",forGoal:"Según tu tema",
    featureAnimation:"Escena animada",more:"Detalles",categoryTitles:{
      energy:"Energía y armonía",money:"Flujo de inspiración",relationships:"Calidez y conexión",goals:"Camino hacia tus metas",life:"Belleza y movimiento vital",health:"Una pausa amable"
    },categoryDescriptions:{
      energy:"Una escena luminosa para hacer una pausa y concentrar la atención.",
      life:"Paisajes reales para inspirarte, renovarte y reflexionar.",
      money:"Imágenes doradas para reflexionar sobre tus intenciones y planes.",
      relationships:"Luz cálida y movimiento suave para reflexionar.",
      goals:"Un paisaje animado que acompaña tu intención personal.",
      health:"Una escena simbólica tranquila para descansar y prestar atención."
    },
    heroTabs:["Vídeo mandala","Plantillas","Guías","Tema"],
    heroBadge:"Música original · opcional",heroTitle:"Crea tu vídeo personal",
    heroIntro:"Sube tu foto, elige un tema y crea un vídeo animado gratis.",
    topThemes:"Tema del vídeo",popular:"Plantillas populares",reset:"Restablecer ajustes",
    quickPreview:"Ver animación",pausePreview:"Pausar animación",heroConsent:"Confirma el permiso para usar la foto antes de crear.",
  }
} as const;
const checkOrder = ["energy","money","relationships","goals"] as const;

const preferredMoney = ["golden-rain","abundance-tree","cosmic-flow","path-to-goals"] as const;
const moneyTemplateLabels: Partial<Record<MoneySceneId,Record<VideoLocale,string>>> = {
  "golden-rain":{en:"Money fountain",ru:"Фонтан денег",es:"Fuente de dinero"},
  "abundance-tree":{en:"Abundance tree",ru:"Дерево изобилия",es:"Árbol de abundancia"},
  "cosmic-flow":{en:"Prosperity flow",ru:"Поток процветания",es:"Flujo de prosperidad"},
  "path-to-goals":{en:"Golden portal",ru:"Золотой портал",es:"Portal dorado"},
};
type VideoLocale = PublicLocale;
const moneyTemplates = [
  ...preferredMoney.map(id => moneyScenes.find(scene=>scene.id===id)!),
  ...moneyScenes.filter(scene=>!preferredMoney.some(id=>id===scene.id)),
];


/** 24 CURATED EDITS of 32 existing licensed first-party MP4 masters:
 * no remote stock API and no fictional claims of new source footage. */
const FREE_FILM_PLAN_VERSION = "hh-local-stock-compilation-v1";
type FreeFilmPreset = {id:string;theme:VideoTheme;label:Record<VideoLocale,string>;clips:readonly string[]};
const FREE_FILM_PRESETS:readonly FreeFilmPreset[] = [
  {
    "id": "warm-prosperity",
    "theme": "money",
    "label": {
      "ru": "Тёплый рассвет",
      "en": "Warm sunrise",
      "es": "Amanecer cálido"
    },
    "clips": [
      "wealth-sunrise",
      "golden-harvest",
      "prosperity-coast",
      "radiant-portal"
    ]
  },
  {
    "id": "new-opportunities",
    "theme": "money",
    "label": {
      "ru": "Новые возможности",
      "en": "New opportunities",
      "es": "Nuevas posibilidades"
    },
    "clips": [
      "golden-rain",
      "cosmic-flow",
      "opportunity-falls",
      "path-to-goals"
    ]
  },
  {
    "id": "steady-foundation",
    "theme": "money",
    "label": {
      "ru": "Устойчивая опора",
      "en": "Steady foundation",
      "es": "Base estable"
    },
    "clips": [
      "golden-shield",
      "abundance-tree",
      "partners",
      "abundance-circle"
    ]
  },
  {
    "id": "inspiring-motion",
    "theme": "money",
    "label": {
      "ru": "Движение к мечте",
      "en": "Dreams in motion",
      "es": "Sueños en marcha"
    },
    "clips": [
      "money-magnet",
      "infinite-flow",
      "life-gifts",
      "dreams"
    ]
  },
  {
    "id": "morning-energy",
    "theme": "energy",
    "label": {
      "ru": "Энергия утра",
      "en": "Morning energy",
      "es": "Energía de la mañana"
    },
    "clips": [
      "solar-surge",
      "sunbeam-flow",
      "river-power",
      "mountain-air"
    ]
  },
  {
    "id": "ocean-breath",
    "theme": "energy",
    "label": {
      "ru": "Дыхание океана",
      "en": "Ocean breathing",
      "es": "Respiración del océano"
    },
    "clips": [
      "ocean-pulse",
      "calm-sea",
      "sea-breeze",
      "coastal-freedom"
    ]
  },
  {
    "id": "light-and-space",
    "theme": "energy",
    "label": {
      "ru": "Свет и простор",
      "en": "Light and space",
      "es": "Luz y espacio"
    },
    "clips": [
      "desert-light",
      "mountain-air",
      "meadow-morning",
      "solar-surge"
    ]
  },
  {
    "id": "flowing-vitality",
    "theme": "energy",
    "label": {
      "ru": "Живой поток",
      "en": "Living flow",
      "es": "Flujo vital"
    },
    "clips": [
      "river-power",
      "mossy-stream",
      "morning-dew",
      "sunbeam-flow"
    ]
  },
  {
    "id": "gentle-new-day",
    "theme": "life",
    "label": {
      "ru": "Начало нового дня",
      "en": "A gentle new day",
      "es": "Un nuevo día"
    },
    "clips": [
      "meadow-morning",
      "morning-dew",
      "wildflower-dance",
      "fern-awakening"
    ]
  },
  {
    "id": "rooted-freedom",
    "theme": "life",
    "label": {
      "ru": "Корни и свобода",
      "en": "Roots and freedom",
      "es": "Raíces y libertad"
    },
    "clips": [
      "lone-tree",
      "fern-awakening",
      "coastal-freedom",
      "mountain-air"
    ]
  },
  {
    "id": "coastal-renewal",
    "theme": "life",
    "label": {
      "ru": "Обновление у моря",
      "en": "Coastal renewal",
      "es": "Renovación costera"
    },
    "clips": [
      "sea-breeze",
      "calm-sea",
      "coastal-freedom",
      "wildflower-dance"
    ]
  },
  {
    "id": "forest-morning",
    "theme": "life",
    "label": {
      "ru": "Утро среди зелени",
      "en": "Green morning",
      "es": "Mañana verde"
    },
    "clips": [
      "mossy-stream",
      "fern-awakening",
      "meadow-morning",
      "lone-tree"
    ]
  },
  {
    "id": "gentle-rest",
    "theme": "health",
    "label": {
      "ru": "Мягкий отдых",
      "en": "Gentle rest",
      "es": "Descanso suave"
    },
    "clips": [
      "calm-sea",
      "sea-breeze",
      "mossy-stream",
      "gentle-falls"
    ]
  },
  {
    "id": "quiet-awakening",
    "theme": "health",
    "label": {
      "ru": "Тихое пробуждение",
      "en": "Quiet awakening",
      "es": "Despertar tranquilo"
    },
    "clips": [
      "morning-dew",
      "fern-awakening",
      "meadow-morning",
      "calm-sea"
    ]
  },
  {
    "id": "water-and-breath",
    "theme": "health",
    "label": {
      "ru": "Вода и дыхание",
      "en": "Water and breath",
      "es": "Agua y respiración"
    },
    "clips": [
      "river-power",
      "mossy-stream",
      "gentle-falls",
      "ocean-pulse"
    ]
  },
  {
    "id": "natural-stillness",
    "theme": "health",
    "label": {
      "ru": "Природная тишина",
      "en": "Natural stillness",
      "es": "Quietud natural"
    },
    "clips": [
      "lone-tree",
      "mountain-air",
      "sea-breeze",
      "morning-dew"
    ]
  },
  {
    "id": "warm-connection",
    "theme": "relationships",
    "label": {
      "ru": "Тёплая близость",
      "en": "Warm connection",
      "es": "Conexión cálida"
    },
    "clips": [
      "wildflower-dance",
      "meadow-morning",
      "coastal-freedom",
      "prosperity-coast"
    ]
  },
  {
    "id": "trust-and-space",
    "theme": "relationships",
    "label": {
      "ru": "Доверие и пространство",
      "en": "Trust and space",
      "es": "Confianza y espacio"
    },
    "clips": [
      "lone-tree",
      "morning-dew",
      "mountain-air",
      "calm-sea"
    ]
  },
  {
    "id": "open-hearted",
    "theme": "relationships",
    "label": {
      "ru": "Открытое сердце",
      "en": "Open-hearted",
      "es": "Corazón abierto"
    },
    "clips": [
      "sunbeam-flow",
      "fern-awakening",
      "wildflower-dance",
      "meadow-morning"
    ]
  },
  {
    "id": "calm-together",
    "theme": "relationships",
    "label": {
      "ru": "Спокойно вместе",
      "en": "Calm together",
      "es": "Calma compartida"
    },
    "clips": [
      "mossy-stream",
      "sea-breeze",
      "coastal-freedom",
      "gentle-falls"
    ]
  },
  {
    "id": "first-step",
    "theme": "goals",
    "label": {
      "ru": "Первый шаг",
      "en": "First step",
      "es": "Primer paso"
    },
    "clips": [
      "mountain-air",
      "river-power",
      "meadow-morning",
      "wealth-sunrise"
    ]
  },
  {
    "id": "clear-direction",
    "theme": "goals",
    "label": {
      "ru": "Ясное направление",
      "en": "Clear direction",
      "es": "Dirección clara"
    },
    "clips": [
      "sunbeam-flow",
      "desert-light",
      "lone-tree",
      "coastal-freedom"
    ]
  },
  {
    "id": "open-horizon",
    "theme": "goals",
    "label": {
      "ru": "Открытый горизонт",
      "en": "Open horizon",
      "es": "Horizonte abierto"
    },
    "clips": [
      "river-power",
      "gentle-falls",
      "mountain-air",
      "prosperity-coast"
    ]
  },
  {
    "id": "find-my-way",
    "theme": "goals",
    "label": {
      "ru": "Мой путь",
      "en": "Finding my way",
      "es": "Encontrar mi camino"
    },
    "clips": [
      "solar-surge",
      "meadow-morning",
      "wealth-sunrise",
      "radiant-portal"
    ]
  }
] as const;
const FREE_FILM_CLIP_THEMES:Record<string,VideoTheme> = {"golden-rain":"money","cosmic-flow":"money","abundance-tree":"money","opportunity-falls":"money","money-magnet":"money","path-to-goals":"money","partners":"money","infinite-flow":"money","golden-shield":"money","abundance-circle":"money","life-gifts":"money","dreams":"money","wealth-sunrise":"money","golden-harvest":"money","radiant-portal":"money","prosperity-coast":"money","solar-surge":"energy","ocean-pulse":"energy","sunbeam-flow":"energy","river-power":"energy","desert-light":"energy","mountain-air":"energy","wildflower-dance":"life","fern-awakening":"life","coastal-freedom":"life","lone-tree":"life","meadow-morning":"life","calm-sea":"health","morning-dew":"health","mossy-stream":"health","gentle-falls":"health","sea-breeze":"health"};
function firstPartyFilmFor(theme:VideoTheme,id:string):{src:string;poster:string}|null {
  if(theme==="money")return getRealMoneyFilm(id as MoneySceneId);
  return getThemedRealFilm(theme,id as LocalSceneId);
}
function compileFreeFilmPreset(preset:FreeFilmPreset,locale:VideoLocale,durationSeconds:number,aspect:Aspect):CinematicStoryboard {
  // Existing safe timing model, but every shot is an actual licensed MP4.
  // Stock edits use an independent plan version to FAIL-CLOSED paid AI prompts.
  if(![10,20,30,60].includes(durationSeconds))throw Error("unsupported_free_film_length");
  const base=buildCinematicStoryboard({
    theme:preset.theme,locale,style:"nature",aspect,
    durationSeconds:durationSeconds===10?20:durationSeconds
  });
  const step=Math.floor(durationSeconds/4),remainder=durationSeconds-step*4;
  let start=0;
  const shots=base.shots.map((shot:{id:string;number:number;title:string;startSeconds:number;durationSeconds:number},i:number)=>{
    const sceneId=preset.clips[i], shotTheme=FREE_FILM_CLIP_THEMES[sceneId];
    if(!shotTheme||!firstPartyFilmFor(shotTheme,sceneId))throw Error("unavailable_free_film_clip");
    const shotLength=step+(i<remainder?1:0);
    const result={...shot,sceneId,theme:shotTheme,visualCue:preset.label.en,
      startSeconds:start,durationSeconds:shotLength,
      providerPrompt:""}; // A montage never becomes a provider prompt.
    start+=shotLength;
    return result;
  });
  return {...base,version:FREE_FILM_PLAN_VERSION,durationSeconds,shots,
    sceneChoices:shots.map((shot:{sceneId:string;theme:VideoTheme})=>({
      sceneId:shot.sceneId,theme:shot.theme,visualCue:preset.label.en
    })),
    noExternalClientData:true,paidRenderApproved:false,localPreview:true} as CinematicStoryboard;
}

const effects: Effect[] = ["glow", "energy", "prosperity", "temple"];
const durations = [10, 15, 20, 30, 60] as const;
const themeChoices: VideoTheme[] = ["money","relationships","energy","life","health","goals"];
// Health reuses the real, locally rendered gentle-shield Energy scene.
const videoCategories = ["energy","money","relationships","goals","life","health"] as const;
type VideoCategory = (typeof videoCategories)[number];

function formatDimensions(aspect: Aspect, quality: Quality): [number, number] {
  const edge = quality === "fullhd" ? 1080 : 720;
  if (aspect === "square") return [edge, edge];
  if (aspect === "landscape") return [Math.round(edge * 16 / 9), edge];
  return [edge, Math.round(edge * 16 / 9)];
}

// Genuine still frames from the identical cinematic renderer used for video.
// No fake play icons or misleading pictures of actors.
// Tap to play exactly one visible thumbnail, without autoplay or 12 decoders.
function CinematicSceneThumbnail({ scene, photo, title, playing }: {
  scene: MoneySceneId; photo: HTMLImageElement | null; title: string; playing: boolean;
}) {
  const ref=useRef<HTMLVideoElement>(null);
  const [visible,setVisible]=useState(false);
  const film=getRealMoneyFilm(scene);
  useEffect(()=>{
    const el=ref.current;
    if(!el)return;
    if(typeof IntersectionObserver==="undefined"){setVisible(true);return;}
    const observer=new IntersectionObserver(([entry])=>setVisible(Boolean(entry?.isIntersecting)),
      {threshold:.05,rootMargin:"100px"});
    observer.observe(el);
    return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const video=ref.current;
    if(!video)return;
    if(!playing||!visible){video.pause();return;}
    // Genuine H.264 frames from first-party MP4: never start playback on
    // page load, never render a fake canvas loop as a video thumbnail.
    video.muted=true;
    // Safari may reject a play() attempted before a preload=none MP4 is
    // decoded. Request the selected clip only; other thumbnails stay posters.
    if(video.readyState<2)video.load();
    void video.play().catch(()=>{/* onCanPlay retries only the selected visible clip. */});
    return ()=>video.pause();
  },[playing,visible,scene]);
  return <video ref={ref} muted playsInline loop autoPlay={playing&&visible}
    preload={playing&&visible?"auto":"none"}
    onCanPlay={event=>{
      if(playing&&visible){event.currentTarget.muted=true;
        void event.currentTarget.play().catch(()=>{/* Safari can await another tap. */});}
    }}
    src={film.src} poster={film.poster}
    aria-label={title} data-mandala-scene-preview={scene}
    data-real-mp4={film.src} data-photo-overlay-available={photo?"true":"false"}
    data-scene-playing={playing&&visible?"true":"false"}
    className={styles.moneyFlowThumb}/>;
}

function ThemedSceneThumbnail({ theme, scene, photo, title }: {
  theme: OtherTheme; scene: LocalSceneId; photo: HTMLImageElement | null; title: string;
}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const context=ref.current?.getContext("2d", { alpha:false });
    if(context) paintThemedVideoFrame(context, photo, theme, scene, 3.2, title);
  },[theme,scene,photo,title]);
  return <canvas ref={ref} width={176} height={228} className={videoStyles.templateArt} aria-hidden="true"/>;
}

// Only one visible, explicitly selected real MP4 decodes in the gallery.
function ThemedFilmThumbnail({film,scene,photo,title,playing}: {
  film:Pick<FilmSource,"src"|"poster">;scene:LocalSceneId;
  photo:HTMLImageElement|null;title:string;playing:boolean;
}) {
  const ref=useRef<HTMLVideoElement>(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    if(typeof IntersectionObserver==="undefined"){setVisible(true);return;}
    const observer=new IntersectionObserver(([entry])=>setVisible(Boolean(entry?.isIntersecting)),
      {threshold:.05,rootMargin:"100px"});
    observer.observe(el);return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const video=ref.current;if(!video)return;
    if(!playing||!visible){video.pause();return;}
    // WebKit may signal playing on a preload=none thumbnail while the
    // decoded first frame remains stalled. Prime the selected local MP4
    // as a native muted autoplay video, matching working money thumbnails.
    video.muted=true;
    if(video.readyState<2)video.load();
    void video.play().catch(()=>{/* onCanPlay retries the selected visible clip. */});
    return ()=>video.pause();
  },[playing,visible,film.src]);
  return <video ref={ref} muted playsInline loop
    autoPlay={playing&&visible} preload={playing&&visible?"auto":"none"}
    onCanPlay={event=>{
      if(playing&&visible){event.currentTarget.muted=true;
        void event.currentTarget.play().catch(()=>{/* iOS can require a second gesture. */});}
    }}
    src={film.src} poster={film.poster}
    aria-label={title} data-mandala-scene-preview={scene} data-real-mp4={film.src}
    data-photo-overlay-available={photo?"true":"false"}
    data-scene-playing={playing&&visible?"true":"false"}
    className={styles.moneyFlowThumb}/>;
}

// A video-only codec string can silently drop the selected audio track on
// Safari. Prefer codecs that explicitly include AAC/Opus, then let the
// actual MediaRecorder constructor validate each candidate with this stream.
function recordingMimes(withAudio: boolean): string[] {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return [];
  const candidates = withAudio ? [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    "video/mp4",
    'video/webm;codecs="vp8,opus"',
    "video/webm",
  ] : [
    "video/mp4;codecs=avc1.42E01E", "video/mp4",
    "video/webm;codecs=vp8", "video/webm",
  ];
  return candidates.filter(mime => MediaRecorder.isTypeSupported(mime));
}

function loadLocalImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => image.naturalWidth ? resolve(image) : reject(new Error("Invalid image"));
    image.onerror = () => reject(new Error("Image not available"));
    image.src = url;
  });
}
function loadSceneImage(url:string):Promise<HTMLImageElement|null>{
  return url===BACKGROUND_CLIP?Promise.resolve(null):loadLocalImage(url);
}

// Fixed deterministic geometry gives motion without network imagery, AI credits,
// external services or third-party assets. The original user photograph is
// already composited in the local mandala PNG; no pixel is transmitted.
function paint(
  ctx: CanvasRenderingContext2D, art: HTMLImageElement | null,
  effect: Effect, time: number, aspect: Aspect, moneyScene: MoneySceneId | null, title: string,
  theme: VideoTheme = "money", otherScene: LocalSceneId = "sun-flight",
  speed: Speed = "slow", brightness: Brightness = "soft",
  realVideo: HTMLVideoElement | null = null,
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const adjustedTime = time * (speed === "dynamic" ? 1.45 : .76);
  if (theme !== "money") {
    if (realVideo && realVideo.readyState >= 2 && realVideo.videoWidth > 0 && getThemedRealFilm(theme, otherScene)) {
      paintRealThemedVideoFrame(ctx,art,theme,adjustedTime,title,realVideo);
    } else {
      paintThemedVideoFrame(ctx, art, theme, otherScene, adjustedTime, title);
    }
    if(brightness === "bright"){
      ctx.fillStyle="rgba(255,246,197,.075)";ctx.fillRect(0,0,width,height);
    }
    return;
  }
  if (moneyScene) {
    if (realVideo && realVideo.readyState >= 2 && realVideo.videoWidth > 0) {
      paintRealMoneyVideoFrame(ctx, art, moneyScene, adjustedTime, aspect, title, realVideo);
    } else {
      paintCinematicMoneyFrame(ctx, art, moneyScene, adjustedTime, aspect, title);
    }
    if(brightness === "bright"){
      ctx.fillStyle="rgba(255,241,197,.06)";ctx.fillRect(0,0,width,height);
    }
    return;
  }
  if (!art) return;
  const centerX = width / 2;
  const centerY = height / 2;
  const size = width * 0.96;
  const left = centerX - size / 2;
  const top = centerY - size / 2;
  const gold = effect === "energy" ? "116,222,187" : "246,205,130";

  ctx.fillStyle = "#1d302b";
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, height * 0.68);
  glow.addColorStop(0, "rgba(202,171,111,.32)");
  glow.addColorStop(1, "rgba(15,29,26,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Calm motion is outside the central portrait and does not alter identity.
  ctx.save();
  ctx.shadowColor = "rgba(" + gold + ",.45)";
  ctx.shadowBlur = 15;
  ctx.drawImage(art, left, top, size, size);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 48; i++) {
    const orbit = i * 2.399963 + time * (effect === "energy" ? 0.17 : 0.08);
    const radius = width * (0.23 + 0.22 * ((i * 17) % 13) / 13);
    const drift = Math.sin(time * 0.8 + i * 1.3) * 14;
    const x = centerX + Math.cos(orbit) * (radius + drift);
    const y = centerY + Math.sin(orbit) * (radius + drift);
    const alpha = 0.28 + 0.4 * (0.5 + 0.5 * Math.sin(time * 1.8 + i));
    ctx.fillStyle = "rgba(" + gold + "," + alpha.toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 2.2;
  if (effect === "energy" || effect === "glow") {
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = "rgba(" + gold + "," + (0.14 + i * 0.07) + ")";
      ctx.beginPath();
      const radius = width * (0.35 + i * 0.045) + Math.sin(time * 0.65 + i) * 11;
      ctx.ellipse(centerX, centerY, radius, radius, time * 0.07, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (effect === "prosperity") {
    const symbols = ["✧", "€", "✦", "✧"];
    for (let i = 0; i < 13; i++) {
      const x = width * (0.07 + (i * 0.193) % 0.86);
      const y = ((i * 157 + time * (20 + i % 5 * 3)) % (height + 100)) - 50;
      ctx.font = (18 + i % 4 * 5) + "px Georgia,serif";
      ctx.fillStyle = "rgba(250,215,146,.55)";
      ctx.fillText(symbols[i % symbols.length], x, y);
    }
  }
  if (effect === "temple") {
    ctx.strokeStyle = "rgba(247,220,168,.45)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const opening = width * (0.44 + i * 0.045);
      ctx.beginPath();
      ctx.moveTo(centerX - opening, height * 0.9);
      ctx.lineTo(centerX - opening, height * 0.14);
      ctx.quadraticCurveTo(centerX, -height * 0.08 + i * 12, centerX + opening, height * 0.14);
      ctx.lineTo(centerX + opening, height * 0.9);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (aspect === "portrait") {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(244,219,169,.85)";
    ctx.font = "32px Georgia,serif";
    ctx.fillText("✧  H O L I S T I C   H O U S E  ✧", centerX, height * 0.19, width - 40);
    ctx.fillStyle = "rgba(253,243,221,.65)";
    ctx.font = "24px Georgia,serif";
    ctx.fillText("✦   ✦   ✦", centerX, height * 0.86);
  }
}

// A genuine local multi-shot film, drawn by the existing Canvas recorder.
// The client's picture and detailed request are never uploaded to a provider.
function paintCinematicFrame(
  ctx: CanvasRenderingContext2D, image: HTMLImageElement | null,
  effect: Effect,time:number,aspect:Aspect,moneyScene:MoneySceneId|null,caption:string,
  theme:VideoTheme,otherScene:LocalSceneId,speed:Speed,brightness:Brightness,
  realVideo:HTMLVideoElement|null,storyboard:CinematicStoryboard|null,
  stockShotVideo:HTMLVideoElement|null = null,
) {
  if(storyboard?.version===FREE_FILM_PLAN_VERSION) {
    const second=cinematicPreviewSeconds(storyboard,time);
    const selected=storyboard.shots.find(shot=>second>=shot.startSeconds &&
      second<shot.startSeconds+shot.durationSeconds) || storyboard.shots.at(-1);
    if(selected) {
      // Reuse the original real-film compositors, not a JPG or Canvas stand-in.
      paint(ctx,image,effect,Math.max(0,second-selected.startSeconds),aspect,
        selected.theme==="money"?selected.sceneId as MoneySceneId:null,
        caption,selected.theme,selected.sceneId as LocalSceneId,speed,brightness,stockShotVideo);
      return;
    }
  }
  const filmSecond=storyboard?cinematicPreviewSeconds(storyboard,time):time;
  const shot=storyboard?.shots.find(s=>filmSecond>=s.startSeconds &&
    filmSecond<s.startSeconds+s.durationSeconds) || storyboard?.shots.at(-1);
  if(!storyboard || !shot){
    paint(ctx,image,effect,time,aspect,moneyScene,caption,theme,otherScene,
      speed,brightness,realVideo);
    return;
  }
  const localTime=Math.max(0,filmSecond-shot.startSeconds);
  paint(ctx,image,effect,localTime,aspect,
    shot.theme==="money"?shot.sceneId as MoneySceneId:null,
    caption,shot.theme,shot.sceneId as LocalSceneId,speed,brightness,null);
  // The visitor's visual-style filter changes actual local rendered frames,
  // not merely the premium-provider storyboard text. All four looks use
  // portable Canvas gradients, identical in preview and MediaRecorder.
  const w=ctx.canvas.width,h=ctx.canvas.height;
  ctx.save();
  if(storyboard.styleId==="warm"){
    const grade=ctx.createLinearGradient(0,0,w,h);
    grade.addColorStop(0,"rgba(246,181,80,.11)");
    grade.addColorStop(1,"rgba(122,63,15,.08)");
    ctx.fillStyle=grade;ctx.fillRect(0,0,w,h);
  }else if(storyboard.styleId==="nature"){
    const grade=ctx.createLinearGradient(0,h,0,0);
    grade.addColorStop(0,"rgba(17,112,62,.18)");
    grade.addColorStop(1,"rgba(135,209,170,.07)");
    ctx.fillStyle=grade;ctx.fillRect(0,0,w,h);
  }else if(storyboard.styleId==="dream"){
    const grade=ctx.createRadialGradient(w*.53,h*.36,0,w*.53,h*.45,Math.max(w,h)*.76);
    grade.addColorStop(0,"rgba(211,171,255,.17)");
    grade.addColorStop(.65,"rgba(91,87,172,.14)");
    grade.addColorStop(1,"rgba(27,29,67,.20)");
    ctx.fillStyle=grade;ctx.fillRect(0,0,w,h);
  }else if(storyboard.styleId==="minimal"){
    ctx.fillStyle="rgba(224,221,202,.16)";
    ctx.fillRect(0,0,w,h);
    const grade=ctx.createLinearGradient(0,0,w,h);
    grade.addColorStop(0,"rgba(252,245,220,.04)");
    grade.addColorStop(1,"rgba(5,24,24,.14)");
    ctx.fillStyle=grade;ctx.fillRect(0,0,w,h);
  }
  ctx.restore();
  const edge=Math.min(localTime,Math.max(0,shot.durationSeconds-localTime));
  if(edge<.35){
    ctx.fillStyle="rgba(17,36,30,"+(0.25*(1-edge/.35)).toFixed(3)+")";
    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
  }
}
function stopJob(job: Job, cancelled: boolean) {
  job.cancelled = cancelled;
  window.cancelAnimationFrame(job.animation);
  window.clearTimeout(job.timeout);
  if (job.recorder.state !== "inactive") job.recorder.stop();
  else job.stream.getTracks().forEach(track => track.stop());
  job.musicSession?.close();
}


/** Six concise, first-party controls for the owner's approved cream/emerald
 * mobile mock. Same state, films, native audio and MediaRecorder as below. */
const quickVideoCopy = {
  ru: {
    quickThemes:{energy:"Энергия",money:"Деньги",relationships:"Отношения",goals:"Цели",life:"Смыслы",health:"Здоровье"},
    title:"Создать видео",sub:"Персональное видео с нужной атмосферой, образами и звуком",
    smart:"Умный подбор",theme:"1. Тема и цель",myGoals:"Выбрать из своих целей",
    wish:"Что я хочу получить или изменить?",image:"2. Моё изображение",
    imageHelp:"Добавьте своё фото или выберите готовый сюжет (по желанию)",
    pick:"Загрузить фото",scene:"Выбрать образ",photoOn:"Вставить моё фото в видео",
    hypno:"3. Гипноаффирмации",hypnoHelp:"Короткие персональные фразы по теме и цели",
    readyPhrases:"Готовые фразы",byTests:"По тестам",ownPhrases:"Свои фразы",
    byTheme:"По теме",afterConsent:"Только с вашего согласия",write:"Написать вручную",
    visual:"4. Визуальный стиль",visualHelp:"Выберите атмосферу и движение видео",
    styles:["Природа","Золотой час","Сновидение","Минимализм","Поток воды","Свет и энергия"],
    audio:"5. Аудио-трек",audioHelp:"Звуковое сопровождение для готового видео",
    nature:"Природа",tones:"Медитация",pulse:"Ритм",all:"Все",
    attach:"Прикрепить",attached:"В видео",silent:"Без звука",voice:"Голос и свой трек",
    preview:"Прослушать выбранный трек",edit:"Изменить",montage:"6. Монтаж и формат",
    montageHelp:"Продолжительность, надписи и размер видео",
    format:"Формат",length:"Длительность",text:"Текст в видео",
    large:"Крупный",small:"Мелкий",brief:"Краткий кадр",
    experimental:"Краткие кадры — экспериментальная функция, эффект на убеждения не доказан.",
    seconds:"с",create:"Создать видео бесплатно",creating:"Создаём видео…",
    noAI:"Бесплатно · на устройстве · без платных AI-рендеров",
    more:"Расширенный редактор, подробные фильтры и предпросмотр",
    therapy:"Создать персональную программу видеотерапии",
    exitTherapy:"Вернуться к обычному видео",
    loading:"Подготавливаем видеокадры. После загрузки нажмите ещё раз.",
    disclaimer:"Практика для рефлексии, не медицинское лечение.",
    sceneHint:"Обложки показывают сюжет; кадр видео формируется выбранным шаблоном.",
  },
  en: {
    quickThemes:{energy:"Energy",money:"Money",relationships:"Relationships",goals:"Goals",life:"Meaning",health:"Wellbeing"},
    title:"Create video",sub:"Personal video with the right atmosphere, imagery and sound",
    smart:"Smart match",theme:"1. Theme & goal",myGoals:"Choose from my goals",
    wish:"What would I like to gain or change?",image:"2. My imagery",
    imageHelp:"Add your photo or pick a ready-made scene (optional)",
    pick:"Upload photo",scene:"Choose imagery",photoOn:"Include my photo in video",
    hypno:"3. Hypnoaffirmations",hypnoHelp:"Short personal phrases based on your goal",
    readyPhrases:"Ready phrases",byTests:"From tests",ownPhrases:"My phrases",
    byTheme:"Theme & goal",afterConsent:"Only with your consent",write:"Write myself",
    visual:"4. Visual style",visualHelp:"Choose the look and motion of your video",
    styles:["Nature","Golden hour","Dream","Minimal","Water flow","Light & energy"],
    audio:"5. Audio track",audioHelp:"Choose a soundtrack for your video",
    nature:"Nature",tones:"Meditation",pulse:"Rhythm",all:"All",
    attach:"Attach to video",attached:"In video",silent:"Silent",voice:"Voice / my track",
    preview:"Listen to selected track",edit:"Edit",montage:"6. Editing & format",
    montageHelp:"Duration, text and video dimensions",
    format:"Format",length:"Duration",text:"On-screen text",
    large:"Large",small:"Small",brief:"Brief frame",
    experimental:"Brief frames are experimental; belief-change claims are unproven.",
    seconds:"s",create:"Create free video",creating:"Recording video…",
    noAI:"Free · on device · no paid AI renders",
    more:"Advanced editor, detailed filters and video preview",
    therapy:"Create a personal video therapy programme",
    exitTherapy:"Back to regular video",
    loading:"Preparing video frames. Tap again after they load.",
    disclaimer:"A reflective practice, not medical treatment.",
    sceneHint:"Scene covers are illustrative; the selected renderer produces the actual frames.",
  },
  es: {
    quickThemes:{energy:"Energía",money:"Dinero",relationships:"Relaciones",goals:"Objetivos",life:"Sentido",health:"Bienestar"},
    title:"Crear vídeo",sub:"Vídeo personal con imágenes, ambiente y sonido adecuados",
    smart:"Selección inteligente",theme:"1. Tema y objetivo",myGoals:"Elegir mis objetivos",
    wish:"¿Qué me gustaría conseguir o cambiar?",image:"2. Mis imágenes",
    imageHelp:"Añade tu foto o elige una escena (opcional)",
    pick:"Subir foto",scene:"Elegir imagen",photoOn:"Incluir mi foto en el vídeo",
    hypno:"3. Hipnoafirmaciones",hypnoHelp:"Frases breves según tu tema y objetivo",
    readyPhrases:"Frases listas",byTests:"Por tests",ownPhrases:"Mis frases",
    byTheme:"Según el tema",afterConsent:"Solo con consentimiento",write:"Escribir mis frases",
    visual:"4. Estilo visual",visualHelp:"Elige la atmósfera y el movimiento",
    styles:["Naturaleza","Hora dorada","Sueño","Minimalista","Agua","Luz y energía"],
    audio:"5. Audio",audioHelp:"Música de fondo para tu vídeo",
    nature:"Naturaleza",tones:"Meditación",pulse:"Ritmo",all:"Todos",
    attach:"Añadir al vídeo",attached:"En vídeo",silent:"Silencio",voice:"Voz / mi pista",
    preview:"Escuchar pista elegida",edit:"Editar",montage:"6. Montaje y formato",
    montageHelp:"Duración, frases y formato",
    format:"Formato",length:"Duración",text:"Texto en vídeo",
    large:"Grande",small:"Pequeño",brief:"Fotograma breve",
    experimental:"Los fotogramas breves son experimentales; no hay evidencia de cambio de creencias.",
    seconds:"s",create:"Crear vídeo gratis",creating:"Grabando vídeo…",
    noAI:"Gratis · en tu dispositivo · sin IA de pago",
    more:"Editor avanzado, filtros y vista previa",
    therapy:"Crear un programa personal de videoterapia",
    exitTherapy:"Volver al vídeo normal",
    loading:"Preparando fotogramas. Toca de nuevo cuando estén listos.",
    disclaimer:"Práctica reflexiva, no tratamiento médico.",
    sceneHint:"Las portadas ilustran el tema; el vídeo utiliza el motor real elegido.",
  },
} as const;

/** Owner-approved 30 Oct mobile-first hierarchy. Tier availability is truthful:
 * only on-device Free is enabled; no unverified wallet or paid entitlement. */
const approvedMobileCopy = {
  ru: {
    introTitle:"Создать персональное видео",
    intro:"Персональное видео для поддержки энергии, мотивации и уверенности. Выберите цель, образы и звук.",
    disclosure:"Краткие кадры и гипноаффирмации — экспериментальные приёмы, их влияние на убеждения не доказано.",
    benefits:["На основе ваших целей","Личные установки","Аффирмации по выбору","Природные образы и звуки"],
    directions:"1. Выберите направление",
    themes:{energy:"Энергия и тело",money:"Деньги и карьера",relationships:"Любовь и отношения",goals:"Мотивация и уверенность",life:"Смысл и развитие",health:"Спокойствие и баланс"},
    formats:"2. Выберите формат",free:"Бесплатный",freeDetail:"Настоящее локальное видео",freeCount:"Без ограничений",
    smart:"Smart",smartDetail:"Персональные AI-сцены",pro:"Pro",proDetail:"Кинематографические AI-сцены",
    unavailable:"Не подключён",creditsNote:"Smart и Pro откроются после проверенной оплаты и учёта кредитов. Сейчас доступен реальный бесплатный экспорт.",
    preview:"Видеозаставка и моё фото",previewPlay:"Воспроизвести видеофон",previewPause:"Приостановить видеофон",
    previewBadge:"Видео с оригинальным движением",previewFallback:"Полный предпросмотр",
    covers:"Выберите видеозаставку",personal:"4. Настройте содержание",
    affirmations:"Аффирмации",photo:"Моё фото",voice:"Голос",music:"Музыка",extra:"5. Дополнительные параметры",
  },
  en: {
    introTitle:"Create your personal video",
    intro:"Support for energy, motivation and confidence with personal imagery and optional affirmations. Choose your goal, visuals and sound.",
    disclosure:"Brief frames and hypnoaffirmations are experimental; effects on beliefs are not proven.",
    benefits:["Based on your goals","Personal intentions","Optional affirmations","Nature visuals and sound"],
    directions:"1. Choose a direction",
    themes:{energy:"Energy & body",money:"Money & career",relationships:"Love & relationships",goals:"Motivation & confidence",life:"Meaning & growth",health:"Calm & balance"},
    formats:"2. Choose a format",free:"Free",freeDetail:"Real on-device video",freeCount:"Unlimited",
    smart:"Smart",smartDetail:"Personal AI scenes",pro:"Pro",proDetail:"Cinematic AI scenes",
    unavailable:"Not enabled",creditsNote:"Smart and Pro require verified payments and credit entitlements. Real free export works locally now.",
    preview:"Video cover & my photo",previewPlay:"Play video background",previewPause:"Pause video background",
    previewBadge:"Genuine moving footage",previewFallback:"Full preview",
    covers:"Choose a video cover",personal:"4. Customize the content",
    affirmations:"Affirmations",photo:"My photo",voice:"Voice",music:"Music",extra:"5. Additional settings",
  },
  es: {
    introTitle:"Crea tu vídeo personal",
    intro:"Imágenes y afirmaciones opcionales para apoyar la energía, la motivación y la confianza. Elige tu objetivo, imagen y sonido.",
    disclosure:"Los fotogramas breves y las hipnoafirmaciones son experimentales; no hay pruebas de que cambien las creencias.",
    benefits:["Según tus objetivos","Intenciones personales","Afirmaciones opcionales","Naturaleza y sonidos"],
    directions:"1. Elige la dirección",
    themes:{energy:"Energía y cuerpo",money:"Dinero y carrera",relationships:"Amor y relaciones",goals:"Motivación y confianza",life:"Sentido y desarrollo",health:"Calma y equilibrio"},
    formats:"2. Elige el formato",free:"Gratis",freeDetail:"Vídeo local real",freeCount:"Ilimitados",
    smart:"Smart",smartDetail:"Escenas IA personales",pro:"Pro",proDetail:"Escenas cinematográficas IA",
    unavailable:"No habilitado",creditsNote:"Smart y Pro requieren pagos y créditos verificados. La exportación gratuita local ya funciona.",
    preview:"Portada y mi foto",previewPlay:"Reproducir vídeo de fondo",previewPause:"Pausar vídeo de fondo",
    previewBadge:"Vídeo real en movimiento",previewFallback:"Vista previa completa",
    covers:"Elige una portada",personal:"4. Personaliza el contenido",
    affirmations:"Afirmaciones",photo:"Mi foto",voice:"Voz",music:"Música",extra:"5. Ajustes adicionales",
  },
} as const;


/* A service is WHAT the client gets; a video tier is HOW its scenes are made.
   Prices are draft comparisons only: paid execution remains server-gated/off. */
const formatPracticeCopy = {
  ru: {
    formats:"2. Выберите формат и качество",stylesTitle:"3. Стиль видео",
    names:{video:"Видео",meditation:"Видео + личная медитация",course:"Видеотерапия · 8 сессий"},
    durations:{video:"30–60 секунд",meditation:"3–5 минут",course:"8 занятий"},
    features:{
      video:["Короткое видео 30–60 секунд","Готовый видеоряд и звуковой фон","Текст и аффирмации"],
      meditation:["Личная медитация 3–5 минут","Голос, музыка и паузы","Персональный текст практики"],
      course:["8 последовательных видеосессий","Упражнения и личные задания","Отслеживание прогресса"],
    },
    quality:{basic:"Лёгкий",smart:"Smart",pro:"Pro"},
    from:"от",free:"Бесплатно",noQuote:"По расчёту",draft:"План",total:"Итоговая стоимость",noCredits:"Без списания кредитов",sample:"Посмотреть пример видеоряда",
    note:"Стоимость платных форматов предварительная. Оплата и платная генерация пока не подключены.",
    pending:"Пока недоступно",
  },
  en: {
    formats:"2. Choose format & quality",stylesTitle:"3. Video styles",
    names:{video:"Video",meditation:"Video + personal meditation",course:"Video support · 8 sessions"},
    durations:{video:"30–60 seconds",meditation:"3–5 minutes",course:"8 sessions"},
    features:{
      video:["Short 30–60-second video","Ready visuals and optional sound","Text and affirmations"],
      meditation:["Personal 3–5-minute meditation","Voice, music and pauses","Personal practice script"],
      course:["8 guided video sessions","Practice tasks and exercises","Progress check-ins"],
    },
    quality:{basic:"Light",smart:"Smart",pro:"Pro"},
    from:"from",free:"Free",noQuote:"Quote needed",draft:"Planned",total:"Estimated total",noCredits:"No credits charged",sample:"Watch visual sample",
    note:"Paid prices are proposals only. Paid checkout and AI rendering are not enabled yet.",
    pending:"Not available yet",
  },
  es: {
    formats:"2. Elige formato y calidad",stylesTitle:"3. Estilos de vídeo",
    names:{video:"Vídeo",meditation:"Vídeo + meditación personal",course:"Videoterapia · 8 sesiones"},
    durations:{video:"30–60 segundos",meditation:"3–5 minutos",course:"8 sesiones"},
    features:{
      video:["Vídeo breve de 30–60 segundos","Escenas y sonido opcional","Texto y afirmaciones"],
      meditation:["Meditación personal de 3–5 minutos","Voz, música y pausas","Guion personalizado"],
      course:["8 sesiones de vídeo guiadas","Ejercicios y tareas personales","Seguimiento del progreso"],
    },
    quality:{basic:"Ligero",smart:"Smart",pro:"Pro"},
    from:"desde",free:"Gratis",noQuote:"Por calcular",draft:"Previsto",total:"Total estimado",noCredits:"Sin gastar créditos",sample:"Ver ejemplo visual",
    note:"Los precios de pago son propuestas. El cobro y la generación IA no están activos.",
    pending:"Aún no disponible",
  },
} as const;
/* Optional human handoff only after a real local video file exists.
   Never attach a raw wish, photo, test result or generated media to the URL. */
const postVideoSupportCopy = {
  ru: {
    title:"Хотите продолжить работу с вашим запросом?",
    lead:"Медитация уже создана. Если нужна личная поддержка, выберите один из вариантов — это необязательно.",
    consultation:"Обсудить ситуацию лично",
    consultationText:"30 минут · €50 или 60 минут · €100. Прояснить запрос и следующий шаг с Андреем.",
    consultationAction:"Выбрать консультацию",
    energy:"Личная энергетическая поддержка",
    energyText:"Дистанционная практика или онлайн-сессия с мастером. Формат и актуальную цену выберите на странице услуги.",
    energyAction:"Подобрать поддержку",
    privacy:"Сохраните видео перед переходом: оно не хранится в кабинете автоматически. Ваши личные ответы, фото и медитация не передаются. Заявка — не бронь и не оплата.",
  },
  en: {
    title:"Would you like personal support with this intention?",
    lead:"Your video is ready. If you would value personal guidance, these optional services are separate.",
    consultation:"Discuss your situation personally",
    consultationText:"30 minutes · €50 or 60 minutes · €100. Clarify your question and next step with Andrey.",
    consultationAction:"Choose a consultation",
    energy:"Personal energy support",
    energyText:"Remote wellbeing practice or live online session with a practitioner. See the available format and listed price first.",
    energyAction:"Explore energy support",
    privacy:"Save your video first: it is not automatically stored in your account. Your words, photo and video are not transferred. A request is not a booking or payment.",
  },
  es: {
    title:"¿Quieres apoyo personal para tu intención?",
    lead:"Tu vídeo está listo. Si te gustaría contar con acompañamiento, estas opciones son independientes y voluntarias.",
    consultation:"Hablar de tu situación personalmente",
    consultationText:"30 minutos · 50 € o 60 minutos · 100 €. Aclarar tu situación y el siguiente paso con Andrey.",
    consultationAction:"Elegir una consulta",
    energy:"Apoyo energético personal",
    energyText:"Práctica de bienestar a distancia o sesión online con un profesional. Consulta el formato y precio publicados.",
    energyAction:"Explorar el apoyo energético",
    privacy:"Guarda tu vídeo antes de salir: no se almacena automáticamente en tu cuenta. No se comparten tus respuestas, foto ni vídeo. La solicitud no confirma reserva ni pago.",
  },
} as const;

type FormatPractice = "video" | "meditation" | "course";
type FormatQuality = "basic" | "smart" | "pro";
const formatPracticeOrder: FormatPractice[] = ["video","meditation","course"];
const formatQualityOrder: FormatQuality[] = ["basic","smart","pro"];
const draftFormatPrices: Record<FormatPractice,Record<FormatQuality,number|null>> = {
  video:{basic:0,smart:2,pro:9.90},
  meditation:{basic:2.90,smart:4.90,pro:null},
  course:{basic:19.90,smart:null,pro:39},
};

const quickStylePosters = [
  "mountain-air","golden-harvest","desert-light","morning-dew","gentle-falls","solar-surge",
] as const;
const quickStyleSceneIds: Record<VideoTheme, readonly string[]> = {
  energy:["mountain-air","solar-surge","desert-light","sunbeam-flow","river-power","sun-flight"],
  money:["prosperity-coast","golden-harvest","cosmic-flow","abundance-circle","opportunity-falls","radiant-portal"],
  relationships:["blossom-garden","heart-light","warm-connection","two-circles","warm-connection","heart-light"],
  goals:["light-path","open-door","guiding-stars","meaning-tree","light-path","open-door"],
  life:["meadow-morning","wildflower-dance","fern-awakening","lone-tree","coastal-freedom","meadow-morning"],
  health:["morning-dew","sea-breeze","calm-sea","mossy-stream","gentle-falls","morning-dew"],
};
const quickThemeOrder: VideoTheme[] = ["energy","money","relationships","goals","life","health"];

/** These Canvas-only animated scenes have NO standalone H.264 master.
 * Curated first-party JPGs in the gallery are illustrative, not fake MP4s. */
const quickCanvasScenePoster: Partial<Record<LocalSceneId,string>> = {
  "heart-light":"wildflower-dance", "warm-connection":"meadow-morning",
  "blossom-garden":"fern-awakening", "two-circles":"coastal-freedom",
  "light-path":"mountain-air", "open-door":"desert-light",
  "guiding-stars":"solar-surge", "meaning-tree":"lone-tree",
  "sun-flight":"solar-surge", "green-vortex":"river-power",
  "light-waterfall":"gentle-falls", "gentle-shield":"morning-dew",
};
const quickCanvasPoster=(scene:LocalSceneId)=>
  "/videos/holistic-house/film-collection-v2/"+(quickCanvasScenePoster[scene]||"mountain-air")+".jpg";


export function MandalaFreeVideoStudio({ locale, frameUrl, photoUrl, onPickPhoto, photoError }: {
  locale: PublicLocale; frameUrl: string | null; photoUrl?: string | null;
  onPickPhoto: () => void; photoError?: string;
}) {
  const t = translations[locale];
  const ui = studioCopy[locale];
  const audioUi = audioCopy[locale];
  const supportUi = supportDesignCopy[locale];
  const layout = layoutCopy[locale];
  const quick = quickVideoCopy[locale];
  const approved = approvedMobileCopy[locale];
  const practiceCopy = formatPracticeCopy[locale];
  const postSupport = postVideoSupportCopy[locale];
  const [practiceType,setPracticeType] = useState<FormatPractice>("video");
  const [practiceLevels,setPracticeLevels] = useState<Record<FormatPractice,FormatQuality>>({
    video:"basic",meditation:"smart",course:"pro",
  });
  const freeVideoSelected = practiceType==="video" && practiceLevels.video==="basic";
  const selectedDraftPrice=draftFormatPrices[practiceType][practiceLevels[practiceType]];
  const [quickStyleIndex,setQuickStyleIndex] = useState(0);
  const [quickDetailedOpen,setQuickDetailedOpen] = useState(false);
  const [studioMode,setStudioMode] = useState<"pump"|"therapy">("pump");
  const [therapyJumpRequested,setTherapyJumpRequested] = useState(false);
  const [scores,setScores] = useState<Record<(typeof checkOrder)[number],number>>({energy:5,money:5,relationships:5,goals:5});
  const [touchedScores,setTouchedScores] = useState<Partial<Record<(typeof checkOrder)[number],number>>>({});
  const [theme, setTheme] = useState<VideoTheme>("energy");
  const [videoCategory, setVideoCategory] = useState<VideoCategory>("energy");
  const effect: Effect = "glow";
  const [moneyScene, setMoneyScene] = useState<MoneySceneId | null>("golden-rain");
  const [backgroundOnly,setBackgroundOnly]=useState(true);
  const [otherScene, setOtherScene] = useState<LocalSceneId>("mountain-air");
  const [showAllMoney, setShowAllMoney] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [aspect, setAspect] = useState<Aspect>("portrait");
  const [quality, setQuality] = useState<Quality>("hd");
  const [duration, setDuration] = useState<(typeof durations)[number]>(30);
  const [speed,setSpeed] = useState<Speed>("slow");
  const [brightness,setBrightness] = useState<Brightness>("soft");
  const [music,setMusic] = useState<AmbientMusic>("none");
  const [soundVolume,setSoundVolume] = useState(75);
  const [audioKind,setAudioKind] = useState("all");
  const [audioMood,setAudioMood] = useState("all");
  const [audioPace,setAudioPace] = useState("all");
  const [audioVoiceFriendly,setAudioVoiceFriendly] = useState(false);
  const [audioAuto,setAudioAuto] = useState(false);
  const [audioSearch,setAudioSearch] = useState("");
  const [audioSort,setAudioSort] = useState<"best"|"name"|"favorites">("best");
  const [audioThemeOverride,setAudioThemeOverride] = useState<VideoTheme|null>(null);
  const [audioFavorites,setAudioFavorites] = useState<string[]>([]);
  const [showAllAudio,setShowAllAudio] = useState(false);
  const [audioDurationInvalid,setAudioDurationInvalid] = useState(false);
  const [attachedAudio,setAttachedAudio] = useState<AttachedAudio|null>(null);
  const [micRecording,setMicRecording] = useState(false);
  const micRef = useRef<{recorder:MediaRecorder;stream:MediaStream;chunks:Blob[];timeout:ReturnType<typeof setTimeout>}|null>(null);
  const [soundPreview,setSoundPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);
  const restoreAudioSessionRef = useRef<(() => void) | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [uploadedAudio,setUploadedAudio] = useState<{file:File;url:string}|null>(null);
  const uploadedAudioRef = useRef<{file:File;url:string}|null>(null);
  const [audioPlaybackError,setAudioPlaybackError] = useState(false);
  const [audioRights,setAudioRights] = useState(false);
  const [captionMode,setCaptionMode] = useState<CaptionMode>("none");
  const [customCaption,setCustomCaption] = useState("");
  const [wish,setWish] = useState("");
  const [cinematicPlan,setCinematicPlan] = useState<CinematicStoryboard|null>(null);
  const [activeFreeFilmPreset,setActiveFreeFilmPreset] = useState<string|null>(null);
  const [showAllFreeFilms,setShowAllFreeFilms] = useState(false);
  const [freeFilmReady,setFreeFilmReady] = useState(false);
  const freeFilmPlayerRefs=useRef<Record<string,HTMLVideoElement>>({});
  const activeFreeFilmShotRef=useRef<string|null>(null);
  const [meditationFocus,setMeditationFocus] = useState<GuidedMeditationFocus>({
    difficulty:"",goal:"",goals:[],details:[]
  });
  const updateMeditationFocus=useCallback((focus:GuidedMeditationFocus)=>{
    setMeditationFocus(focus);
  },[]);
  const [affirmations,setAffirmations] = useState<AffirmationSettings>(defaultAffirmations);
  const [suggestion,setSuggestion] = useState("");
  const [photoConsent,setPhotoConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [progress,setProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [musicWarning,setMusicWarning] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const premiumVideoRef = useRef<HTMLVideoElement>(null);
  const [premiumReady, setPremiumReady] = useState(false);
  const activeMoneyFilm = theme==="money" && moneyScene ? getRealMoneyFilm(moneyScene) : null;
  const activeThemedFilm = theme!=="money" ? getThemedRealFilm(theme, otherScene) : null;
  const activeFilm = cinematicPlan ? null : activeMoneyFilm || activeThemedFilm;
  const usingFreeFilmCompilation=cinematicPlan?.version===FREE_FILM_PLAN_VERSION;
  const freeFilmShots=usingFreeFilmCompilation
    ? cinematicPlan.shots.map(shot=>({
        sceneId:shot.sceneId,theme:shot.theme,
        film:firstPartyFilmFor(shot.theme,shot.sceneId)
      }))
    : [];
  const freeFilmPoster=usingFreeFilmCompilation&&freeFilmShots[0]
    ? firstPartyFilmFor(freeFilmShots[0].theme,freeFilmShots[0].sceneId)?.poster:null;
  const freeFilmOptions=showAllFreeFilms?FREE_FILM_PRESETS:
    FREE_FILM_PRESETS.filter(preset=>preset.theme===theme);
  // These are the SAME original, source-backed scenes as the full gallery.
  // The compact Hypno video-design rail is a shortcut, not a second editor.
  const hypnoScenes = theme === "money"
    ? moneyScenes.slice(0,5).map(item=>({id:item.id,label:item.label[locale],symbol:item.symbol,poster:getRealMoneyFilm(item.id).poster}))
    : otherVideoScenes[theme].slice(0,5).map(item=>({id:item.id,label:item.label[locale],symbol:item.symbol,poster:getThemedRealFilm(theme,item.id)?.poster||null}));
  const jobRef = useRef<Job | null>(null);
  const aliveRef = useRef(false);
  const preparingRef = useRef(false);
  const source = backgroundOnly ? BACKGROUND_CLIP : photoUrl || frameUrl || BACKGROUND_CLIP;
  const sceneName = theme === "money"
    ? moneyTemplateLabels[moneyScene || "golden-rain"]?.[locale] ||
      moneyScenes.find(item => item.id === moneyScene)?.label[locale] || ""
    : otherVideoScenes[theme].find(item => item.id === otherScene)?.label[locale] || "";
  const caption = captionMode==="none" ? "" :
    captionMode==="custom" ? customCaption.trim() : sceneName;
  const affirmationLines = linesForVideoAffirmations(locale,theme,affirmations);
  const selectedAudioKey=uploadedAudio?"file:"+uploadedAudio.url:music==="none"?"none":"preset:"+music;
  const attachedAudioKey=attachedAudio===null?"none":attachedAudio.kind==="preset"
    ?"preset:"+attachedAudio.id:"file:"+attachedAudio.id;
  const audioNeedsAttachment=selectedAudioKey!==attachedAudioKey;
  const signature = JSON.stringify([source,frameUrl,photoUrl,theme,moneyScene,otherScene,backgroundOnly,
    effect,aspect,duration,quality,speed,brightness,attachedAudioKey,attachedAudio?soundVolume:0,caption,affirmations,
    cinematicPlan?.version,cinematicPlan?.styleId,cinematicPlan?.shots.map(shot=>shot.sceneId)]);
  const sourceRef = useRef(signature);
  sourceRef.current = signature;
  const canGenerate = Boolean(source) && (!activeFilm || premiumReady) &&
    (!usingFreeFilmCompilation || (freeFilmShots.length===4 && freeFilmReady)) &&
    (backgroundOnly || (Boolean(photoUrl) && photoConsent)) &&
    (!uploadedAudio || audioRights) && !audioNeedsAttachment &&
    !audioDurationInvalid && !micRecording && !preparing && !recording;
  const previewAudioUrl = uploadedAudio?.url || (music==="none" ? null : presetAudioUrl(music));
  // Context comes from the existing theme/filter on this very screen.
  // A typed wish influences ranking locally; no profile, tests or health data is read.
  const audioTheme=audioThemeOverride||theme;
  const audioMatches = recommendMandalaAudio({
    theme:audioTheme,kind:audioKind,mood:audioMood,pace:audioPace,
    voiceFriendly:audioVoiceFriendly,wish,
  });
  const recommendedAudioId = audioMatches[0]?.id as Exclude<AmbientMusic, "none"> | undefined;
  const selectedAudio = mandalaAudioTracks.find(item=>item.id===music);
  const appliedAudioName=attachedAudio===null?audioUi.noAttached:attachedAudio.kind==="file"
    ?attachedAudio.file.name:mandalaAudioTracks.find(item=>item.id===attachedAudio.id)?.name[locale]||attachedAudio.id;
  const searchTerm=audioSearch.trim().toLocaleLowerCase(locale);
  const searchedAudio=audioMatches
    .filter(track=>!searchTerm || [track.name[locale],track.detail[locale],track.kind]
      .some(label=>label.toLocaleLowerCase(locale).includes(searchTerm)));
  const filteredAudio=audioSort==="name"
    ?[...searchedAudio].sort((a,b)=>a.name[locale].localeCompare(b.name[locale],locale))
    :audioSort==="favorites"?[...searchedAudio].sort((a,b)=>
      Number(audioFavorites.includes(b.id))-Number(audioFavorites.includes(a.id))):searchedAudio;
  const visibleAudio=showAllAudio?filteredAudio:filteredAudio.slice(0,5);
  const lowestTheme=checkOrder.reduce((min,part)=>scores[part]<scores[min]?part:min,checkOrder[0]);
  // Decode a user's photo once for all 12 preview cards. This avoids 12
  // duplicate high-resolution photo decodes and private portrait copies on iOS.
  const [thumbnailPhoto, setThumbnailPhoto] = useState<{ url: string; image: HTMLImageElement } | null>(null);
  const sharedThumbnailPhoto = thumbnailPhoto && thumbnailPhoto.url === photoUrl ? thumbnailPhoto.image : null;
  useEffect(() => {
    let disposed = false;
    if (!photoUrl) return;
    void loadLocalImage(photoUrl).then(image => {
      if (!disposed) setThumbnailPhoto({ url: photoUrl, image });
    }).catch(() => {
      if (!disposed) setThumbnailPhoto(null);
    });
    return () => { disposed = true; };
  }, [photoUrl]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      audioPreviewRef.current?.pause();
      restoreAudioSessionRef.current?.();
      restoreAudioSessionRef.current = null;
      if(uploadedAudioRef.current) URL.revokeObjectURL(uploadedAudioRef.current.url);
      if(micRef.current){
        clearTimeout(micRef.current.timeout);
        micRef.current.recorder.onstop=null;
        try{if(micRef.current.recorder.state!=="inactive")micRef.current.recorder.stop();}catch{}
        micRef.current.stream.getTracks().forEach(track=>track.stop());
        micRef.current=null;
      }
      aliveRef.current = false;
      const job = jobRef.current;
      if (job) {
        stopJob(job, true);
        job.stream.getTracks().forEach(track => track.stop());
        jobRef.current = null;
      }
    };
  }, []);

  useEffect(() => () => {
    if (result?.url) URL.revokeObjectURL(result.url);
  }, [result]);
  // A completed local recording lives in the existing result pane.
  // Reveal that pane before scrolling; a collapsed result is not delivery.
  useEffect(() => {
    if (!result) return;
    setQuickDetailedOpen(true);
    let nextFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      nextFrame = window.requestAnimationFrame(() => {
        document.getElementById("personal-video-result")?.scrollIntoView({
          behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",
          block:"start",
        });
      });
    });
    return () => { window.cancelAnimationFrame(firstFrame); window.cancelAnimationFrame(nextFrame); };
  }, [result]);
  useEffect(() => {
    if (audioAuto && !uploadedAudio) setMusic(recommendedAudioId||"none");
  },[audioAuto,uploadedAudio,recommendedAudioId]);
  // A new visual video topic resets the optional local audio-only suggestion override.
  useEffect(()=>setAudioThemeOverride(null),[theme]);
  // Built-in presets come from stable HTTPS WAV files, not a generated
  // blob: URL: Safari's in-app player reported a native "Error" for blobs.
  // The actual selected user audio remains a private, local File object.
  useEffect(() => {
    setAudioPlaybackError(false);
  },[previewAudioUrl]);
  useEffect(() => {
    const player=audioPreviewRef.current;
    if(!player) return;
    try { player.volume = Math.min(1,Math.max(0,soundVolume/100)); }
    catch { /* iOS controls hardware media volume, not audio.volume. */ }
  },[soundVolume,previewAudioUrl]);
  useEffect(() => {
    const stopHiddenPreview=()=>{
      if(!document.hidden) return;
      audioPreviewRef.current?.pause();
      restoreAudioSessionRef.current?.();
      restoreAudioSessionRef.current=null;
      setSoundPreview(false);
    };
    document.addEventListener("visibilitychange",stopHiddenPreview);
    return ()=>document.removeEventListener("visibilitychange",stopHiddenPreview);
  },[]);
  // A new visitor's photo must never inherit another person's consent.
  useEffect(() => { setPhotoConsent(false); }, [photoUrl]);
  // Native Photos/Files uploads also activate the photo overlay if the file
  // picker was used directly (not only through the compact photo toggle).
  // Unchecking the toggle later does not delete the local photo.
  const previousPhotoUrl = useRef(photoUrl);
  useEffect(() => {
    if (photoUrl && photoUrl !== previousPhotoUrl.current) setBackgroundOnly(false);
    previousPhotoUrl.current = photoUrl;
  }, [photoUrl]);

  useEffect(() => {
    if (!recording) return;
    const onBackground = () => {
      if (!document.hidden) return;
      const job = jobRef.current;
      if (job) stopJob(job, true);
      setNotice(ui.noStorage);
    };
    document.addEventListener("visibilitychange", onBackground);
    return () => document.removeEventListener("visibilitychange", onBackground);
  }, [recording, ui.noStorage]);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || jobRef.current) return;
    const [w,h] = formatDimensions(aspect, "hd");
    if(canvas.width !== w) canvas.width=w;
    if(canvas.height !== h) canvas.height=h;
  }, [aspect]);

  // Invalidate the result when the client photo, composition or preset changes.
  // The selected, SAME-ORIGIN MP4 is the sole footage source for preview
  // and final recording. A muted video may play on iPhone without audio
  // gesture; play is only attempted following a visitor's preview/render.
  useEffect(()=>{
    // The keyed HD element may finish decoding *before* this effect runs.
    // Resetting ready=false unconditionally then waiting only for a new
    // loadeddata/canplay event can leave Create disabled forever on Safari.
    // Reconcile the real current frame first; request a load only if needed.
    const master=premiumVideoRef.current;
    const decoded=Boolean(activeFilm && master && master.readyState>=2 &&
      master.videoWidth>0 && master.videoHeight>0);
    setPremiumReady(decoded);
    if(activeFilm && master && !decoded)master.load();
  },[activeFilm?.src]);
  useEffect(()=>{
    const video=premiumVideoRef.current;
    if(!video)return;
    if(!activeFilm || (!previewPlaying && !recording && !preparing)){
      video.pause();
      return;
    }
    video.muted=true;
    video.loop=true;
    void video.play().catch(()=>{if(aliveRef.current)setNotice(ui.videoUnavailable);});
  },[activeFilm?.src,previewPlaying,recording,preparing,ui.videoUnavailable]);

  // Invalidate stale exports, but DO NOT cancel a new clip the visitor just
  // tapped: selection itself is the explicit playback gesture.
  useEffect(() => {
    const job=jobRef.current;
    if (job) stopJob(job, true);
    setResult(null);
    setNotice("");
  }, [signature]);
  useEffect(() => {setPreviewPlaying(false);},[theme,backgroundOnly]);


  // Switch actual HTMLVideoElement decoders on the identical storyboard clock
  // used for both live preview and the final MediaRecorder capture.
  function freeFilmVideoAt(seconds:number):HTMLVideoElement|null {
    if(cinematicPlan?.version!==FREE_FILM_PLAN_VERSION)return null;
    const elapsed=cinematicPreviewSeconds(cinematicPlan,Math.max(0,seconds));
    const shot=cinematicPlan.shots.find(s=>elapsed>=s.startSeconds &&
      elapsed<s.startSeconds+s.durationSeconds)||cinematicPlan.shots.at(-1);
    if(!shot)return null;
    const video=freeFilmPlayerRefs.current[shot.sceneId];
    if(!video)return null;
    if(activeFreeFilmShotRef.current!==shot.sceneId){
      Object.entries(freeFilmPlayerRefs.current).forEach(([id,other])=>{
        if(id!==shot.sceneId && !other.paused)other.pause();
      });
      activeFreeFilmShotRef.current=shot.sceneId;
    }
    if(video.readyState>=2&&video.paused&&
      (previewPlaying||recording||preparingRef.current||Boolean(jobRef.current))){
      video.muted=true;
      void video.play().catch(()=>{});
    }
    return video.readyState>=2&&video.videoWidth>0?video:null;
  }
  function updateFreeFilmReadiness(){
    if(cinematicPlan?.version!==FREE_FILM_PLAN_VERSION){
      setFreeFilmReady(false);return;
    }
    setFreeFilmReady(cinematicPlan.shots.every(shot=>{
      const video=freeFilmPlayerRefs.current[shot.sceneId];
      return Boolean(video&&video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0);
    }));
  }
  useEffect(()=>{
    activeFreeFilmShotRef.current=null;
    updateFreeFilmReadiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[cinematicPlan]);
  useEffect(()=>{
    if(previewPlaying||recording||preparing)return;
    Object.values(freeFilmPlayerRefs.current).forEach(video=>video.pause());
    activeFreeFilmShotRef.current=null;
  },[previewPlaying,recording,preparing]);

  // No autoplay: paint a still scene, and animate only while a visitor
  // deliberately chooses preview. Throttle to ~12 fps on mobile Safari.
  useEffect(() => {
    if (!source || jobRef.current) return;
    let cancelled = false;
    let animation = 0;
    let startedAt = 0;
    let lastFrame = -1000;
    void loadSceneImage(source).then(image => {
      if (cancelled || jobRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const [width,height] = formatDimensions(aspect,"hd");
      canvas.width=width;canvas.height=height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      paintCinematicFrame(ctx,image,effect,0,aspect,moneyScene,caption,theme,otherScene,speed,brightness,premiumVideoRef.current,cinematicPlan,freeFilmVideoAt(0));
      paintVideoAffirmations(ctx,0,affirmationLines,affirmations);
      if (!previewPlaying) return;
      const previewCores=Number.isFinite(navigator.hardwareConcurrency)?navigator.hardwareConcurrency:4;
      const previewFps=window.innerWidth<=600
        ? (previewCores<=2?12:previewCores>=6?24:18):24;
      const draw = (now: number) => {
        if (cancelled || jobRef.current) return;
        if (!startedAt) startedAt = now;
        if (now - lastFrame >= 1000 / previewFps && !document.hidden) {
          const elapsed=(now-startedAt)/1000;
          const frameSecond=cinematicPlan?cinematicPreviewSeconds(cinematicPlan,elapsed):elapsed;
          paintCinematicFrame(ctx,image,effect,frameSecond,aspect,moneyScene,caption,theme,otherScene,speed,brightness,premiumVideoRef.current,cinematicPlan,freeFilmVideoAt(frameSecond));
          paintVideoAffirmations(ctx,frameSecond,affirmationLines,affirmations);
          lastFrame = now;
        }
        animation = window.requestAnimationFrame(draw);
      };
      animation = window.requestAnimationFrame(draw);
    }).catch(() => { /* PNG preparation can be retried in the parent editor. */ });
    return () => { cancelled = true; window.cancelAnimationFrame(animation); };
  }, [source, effect, moneyScene, theme, otherScene, aspect, previewPlaying, speed, brightness, caption, affirmations, locale, cinematicPlan]);

  async function createVideo() {
    if (!canGenerate || !source || jobRef.current || preparingRef.current) return;
    stopSoundPreview();
    const snapshot=source;
    const snapshotKey=signature;
    preparingRef.current=true;
    setPreparing(true);setProgress(0);setNotice(t.preparing);setMusicWarning("");
    setResult(null);setPreviewPlaying(false);
    let stream:MediaStream|null=null;
    let musicSession:AmbientSession|null=null;
    try {
      musicSession = attachedAudio?.kind==="file"
        ? await startUploadedAudio(attachedAudio.file,soundVolume)
        : attachedAudio?.kind==="preset" ? await startPresetAudio(attachedAudio.id,soundVolume) : null;
      if(attachedAudio && !musicSession) {
        setMusicWarning(ui.soundUnavailable);
        setNotice(ui.soundUnavailable);
        return;
      }
      const image=await loadSceneImage(snapshot);
      if (sourceRef.current !== snapshotKey || !aliveRef.current) return;
      if(activeFilm) {
        const master=premiumVideoRef.current;
        if(!master || master.readyState < 2)throw new Error("HD MP4 scene not loaded");
        await master.play();
      }
      setPreviewPlaying(false);
      const canvas = canvasRef.current;
      if (!canvas || typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
        setNotice(t.unsupported);
        return;
      }
      const [outputWidth, outputHeight] = formatDimensions(aspect, quality);
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas unsupported");
      paintCinematicFrame(ctx,image,effect,0,aspect,moneyScene,caption,theme,otherScene,speed,brightness,premiumVideoRef.current,cinematicPlan,freeFilmVideoAt(0));
      paintVideoAffirmations(ctx,0,affirmationLines,affirmations);
      // Device-aware capture targets smoother frames while keeping low-end
      // iPhone and timed subliminal-frame fallback bounded.
      const baselineFramesPerSecond = affirmations.enabled && affirmations.visibility.includes("frame") && affirmationLines.length
        ? 25 : quality === "fullhd" ? 12 : 15;
      const cores=Number.isFinite(navigator.hardwareConcurrency)
        ? Math.max(1,navigator.hardwareConcurrency) : 4;
      const phone = window.innerWidth<=600;
      const suggestedFps = phone
        ? (quality === "fullhd" ? (cores>=6 ? 20 : 16) : (cores>=6 ? 24 : 20))
        : (quality === "fullhd" ? (cores>=8 ? 25 : 20) : (cores>=8 ? 30 : 24));
      const framesPerSecond=baselineFramesPerSecond === 25 || (phone && cores<=2)
        ? baselineFramesPerSecond : suggestedFps;
      stream = canvas.captureStream(framesPerSecond);
      if (!stream.getVideoTracks().length) throw new Error("Canvas stream unavailable");
      if (musicSession) stream.addTrack(musicSession.track);

      const mimeTypes = recordingMimes(Boolean(musicSession));
      let mimeType = "";
      let recorder: MediaRecorder | null = null;
      for (const candidate of mimeTypes) {
        const recorderOptions={mimeType:candidate,videoBitsPerSecond:quality==="fullhd"?5_000_000:3_000_000,
          audioBitsPerSecond:128_000};
        try {
          recorder=new MediaRecorder(stream,recorderOptions);
          mimeType=candidate;
          break;
        } catch { /* Try another browser-supported audio/video codec. */ }
      }
      if (!recorder) {
        // Never silently drop a sound the visitor deliberately selected.
        if (musicSession) {
          setMusicWarning(ui.musicFallback);
          setNotice(ui.musicFallback);
          stream.getTracks().forEach(track => track.stop());
          stream=null;
          return;
        }
        throw new Error("Recording format unsupported");
      }
      const chunks: Blob[] = [];
      const job: Job = { recorder, stream, animation: 0, timeout: 0, cancelled: false, musicSession };
      musicSession=null;
      jobRef.current = job;

      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        stopJob(job,true);
        if (aliveRef.current) setNotice(t.failed);
      };
      recorder.onstop = () => {
        job.stream.getTracks().forEach(track => track.stop());
        job.musicSession?.close();
        if (jobRef.current !== job || !aliveRef.current) return;
        jobRef.current=null;
        setRecording(false);
        if(job.cancelled) return;
        setProgress(100);
        const type=recorder.mimeType || mimeType;
        const blob = new Blob(chunks, { type });
        if (!blob.size) {
          setNotice(t.failed);
          return;
        }
        setResult({
          url: URL.createObjectURL(blob),
          extension: type.includes("mp4") ? "mp4" : "webm",
          bytes: blob.size,blob,mime:type,
        });
        setNotice(t.ready);
      };

      // This user-triggered browser recorder never contacts a backend.
      recorder.start(500);
      const start = performance.now();
      let lastFrame = -1000;
      let lastProgress = 0;
      const animate = (now: number) => {
        if (jobRef.current !== job || job.recorder.state !== "recording") return;
        if (now - lastFrame >= 1000 / framesPerSecond) {
          if (now-start >= (duration-.8)*1000) job.musicSession?.fadeOut();
          paintCinematicFrame(ctx,image,effect,Math.min(duration,(now-start)/1000),aspect,moneyScene,caption,theme,otherScene,speed,brightness,premiumVideoRef.current,cinematicPlan,freeFilmVideoAt(Math.min(duration,(now-start)/1000)));
          paintVideoAffirmations(ctx,Math.min(duration,(now-start)/1000),affirmationLines,affirmations);
          lastFrame=now;
          if(now-lastProgress>650){
            lastProgress=now;
            setProgress(Math.min(99,Math.floor((now-start)*100/(duration*1000))));
          }
        }
        job.animation = requestAnimationFrame(animate);
      };
      job.animation = requestAnimationFrame(animate);
      job.timeout = window.setTimeout(() => stopJob(job, false), duration * 1000);
      setRecording(true);
      setNotice(t.creating);
    } catch {
      musicSession?.close();
      if(stream) stream.getTracks().forEach(track=>track.stop());
      jobRef.current=null;
      setRecording(false);
      setNotice(t.failed);
    } finally {
      preparingRef.current=false;
      if(aliveRef.current)setPreparing(false);
      musicSession?.close();
    }
  }

  function stopSoundPreview(){
    const player=audioPreviewRef.current;
    if(player && !player.paused) player.pause();
    restoreAudioSessionRef.current?.();
    restoreAudioSessionRef.current=null;
    setSoundPreview(false);
  }
  function toggleSoundPreview(){
    if(recording || preparing) return;
    const player=audioPreviewRef.current;
    if(!player || !previewAudioUrl) {setMusicWarning(ui.soundUnavailable);return;}
    if(!player.paused){stopSoundPreview();return;}
    try {
      if(!restoreAudioSessionRef.current)restoreAudioSessionRef.current=acquirePlaybackSession();
      player.muted=false;
      // iOS Safari may reject programmatic .volume assignments. Playback
      // must still be attempted from the user's tap.
      try { player.volume=Math.min(1,Math.max(0,soundVolume/100)); }
      catch { /* Use device hardware media volume instead. */ }
      void player.play().catch(()=>{
        stopSoundPreview();
        if(aliveRef.current)setMusicWarning(ui.soundUnavailable);
      });
    } catch {
      stopSoundPreview();
      setMusicWarning(ui.soundUnavailable);
    }
  }
  // The ONE shared native player starts under the same trusted tap in Safari.
  // This never silently attaches audio to the video or uploads client files.
  function playAudioTrack(choice: Exclude<AmbientMusic,"none">){
    if(recording||preparing||micRecording)return;
    if(!uploadedAudio&&music===choice){toggleSoundPreview();return;}
    flushSync(()=>{
      setAudioAuto(false);
      chooseMusic(choice);
    });
    const player=audioPreviewRef.current;
    if(!player){setMusicWarning(ui.soundUnavailable);return;}
    try{
      if(!restoreAudioSessionRef.current)restoreAudioSessionRef.current=acquirePlaybackSession();
      player.muted=false;
      try{player.volume=Math.min(1,Math.max(0,soundVolume/100));}
      catch{/* iOS hardware media volume is authoritative. */}
      void player.play().catch(()=>{
        stopSoundPreview();
        if(aliveRef.current)setMusicWarning(ui.soundUnavailable);
      });
    }catch{
      stopSoundPreview();
      setMusicWarning(ui.soundUnavailable);
    }
  }
  function clearUploadedAudio(){
    stopSoundPreview();
    if(uploadedAudioRef.current)URL.revokeObjectURL(uploadedAudioRef.current.url);
    uploadedAudioRef.current=null;
    setUploadedAudio(null);
    setAudioRights(false);
    if(audioInputRef.current)audioInputRef.current.value="";
  }
  function chooseAudioFile(file:File|undefined){
    if(!file)return;
    if(!isSupportedLocalAudio(file)) {setMusicWarning(ui.audioBadFile);return;}
    clearUploadedAudio();
    const entry={file,url:URL.createObjectURL(file)};
    uploadedAudioRef.current=entry;
    setUploadedAudio(entry);
    setAudioPlaybackError(false);
    setAudioDurationInvalid(false);
    setAudioAuto(false);
    setAudioVoiceFriendly(false);
    setMusic("none");
    setSoundVolume(80);
    setMusicWarning("");
  }
  function chooseMusic(choice:AmbientMusic){
    clearUploadedAudio();
    setMusic(choice);
    setAudioDurationInvalid(false);
    setAudioPlaybackError(false);
    setMusicWarning("");
  }
  function attachSelectedAudio(){
    if(recording||preparing||micRecording||audioDurationInvalid)return;
    if(uploadedAudio&&!audioRights){setMusicWarning(ui.audioRightsHelp);return;}
    if(uploadedAudio)setAttachedAudio({kind:"file",id:uploadedAudio.url,file:uploadedAudio.file});
    else if(music!=="none")setAttachedAudio({kind:"preset",id:music});
    else setAttachedAudio(null);
    setMusicWarning("");
  }
  function stopMicRecording(){
    const active=micRef.current;
    if(!active)return;
    clearTimeout(active.timeout);
    if(active.recorder.state!=="inactive")active.recorder.stop();
  }
  async function startMicRecording(){
    if(recording||preparing||micRef.current)return;
    if(typeof navigator==="undefined"||!navigator.mediaDevices?.getUserMedia||
      typeof MediaRecorder==="undefined"){setMusicWarning(audioUi.recordUnavailable);return;}
    let stream:MediaStream|null=null;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!aliveRef.current){stream.getTracks().forEach(track=>track.stop());return;}
      const formats=["audio/mp4","audio/webm;codecs=opus","audio/webm"];
      const mime=formats.find(format=>MediaRecorder.isTypeSupported(format));
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
      const chunks:Blob[]=[];
      const session={recorder,stream,chunks,timeout:setTimeout(stopMicRecording,180000)};
      micRef.current=session;
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onerror=()=>{setMusicWarning(audioUi.recordFailed);};
      recorder.onstop=()=>{
        clearTimeout(session.timeout);
        stream?.getTracks().forEach(track=>track.stop());
        if(micRef.current!==session)return;
        micRef.current=null;
        setMicRecording(false);
        if(!chunks.length||!aliveRef.current){setMusicWarning(audioUi.recordFailed);return;}
        const kind=recorder.mimeType||mime||"audio/mp4";
        const ext=kind.includes("webm")?"webm":"m4a";
        const file=new File(chunks,"my-voice."+ext,{type:kind});
        if(!isSupportedLocalAudio(file)){setMusicWarning(audioUi.recordTooLarge);return;}
        chooseAudioFile(file);
        setMusicWarning(audioUi.fileReady);
      };
      recorder.start(250);
      setMusicWarning("");
      setMicRecording(true);
    }catch{
      stream?.getTracks().forEach(track=>track.stop());
      setMusicWarning(audioUi.recordFailed);
    }
  }
  async function shareVideo(){
    if(!result)return;
    const file=new File([result.blob],"holistic-house-personal."+result.extension,{type:result.mime});
    if(typeof navigator.share!=="function" ||
      (typeof navigator.canShare==="function" && !navigator.canShare({files:[file]}))){
      setNotice(ui.shareUnsupported);return;
    }
    try{await navigator.share({files:[file],title:ui.title});}
    catch(e){if(!(e instanceof DOMException && e.name==="AbortError"))setNotice(ui.shareUnsupported);}
  }
  function suggestScene() {
    if (!wish.trim()) { setSuggestion(ui.wishMissing); return; }
    const options = theme === "money" ? moneyTemplates.map(scene=>scene.id) :
      otherVideoScenes[theme].map(scene=>scene.id);
    const recommended = suggestPersonalVideoScene({
      theme,wish,locale,availableScenes:options,
    });
    setPreviewPlaying(false);setCinematicPlan(null);
    if (recommended.theme === "money") setMoneyScene(recommended.sceneId as MoneySceneId);
    else setOtherScene(recommended.sceneId as LocalSceneId);
    const matchLabel = recommended.theme === "money"
      ? moneyTemplateLabels[recommended.sceneId as MoneySceneId]?.[locale] ||
        moneyScenes.find(x=>x.id===recommended.sceneId)?.label[locale]
      : otherVideoScenes[theme as OtherTheme].find(x=>x.id===recommended.sceneId)?.label[locale];
    setSuggestion(recommended.matched ? ui.wishReady + ": " + (matchLabel || recommended.sceneId) :
      ui.wishDefault);
  }
  function useWishAsCaption() {
    const caption = captionFromWish(wish);
    if (!caption) { setSuggestion(ui.wishMissing); return; }
    setCustomCaption(caption);
    setCaptionMode("custom");
  }
  const activeTemplates=theme==="money"?moneyTemplates:otherVideoScenes[theme];
  const visibleTemplates=activeTemplates.slice(0,showAllMoney?activeTemplates.length:4);
  const selectCategory=(next:VideoCategory)=>{
    setCinematicPlan(null);
    setTheme(next);setVideoCategory(next);setSuggestion("");setShowAllMoney(false);
    setPreviewPlaying(false); // Theme changes preserve the user's photo checkbox choice.
    if(next==="money")setMoneyScene("golden-rain");
    else {setMoneyScene(null);setOtherScene(otherVideoScenes[next][0].id);}
  };

  const resetVideoSettings=()=>{
    if(recording||preparing)return;
    clearUploadedAudio();
    setDuration(20);setAspect("portrait");setSpeed("slow");setBrightness("soft");
    setMusic("none");setAttachedAudio(null);setSoundVolume(75);setCaptionMode("none");
    setAudioAuto(false);setAudioKind("all");setAudioMood("all");setAudioPace("all");
    setAudioVoiceFriendly(false);setAudioSearch("");setAudioSort("best");setShowAllAudio(false);setAudioDurationInvalid(false);setAudioThemeOverride(null);
    setCustomCaption("");setQuality("hd");
    setAffirmations(defaultAffirmations);
    setCinematicPlan(null);
    setPreviewPlaying(false);
  };
  // iPhone WebKit can defer HD decoding for the hidden same-origin master.
  // Photo consent is a genuine user gesture: briefly unlock muted inline media
  // rather than marking Create ready without a decoded video frame.
  function primeNativeMasterFromUserGesture(){
    const video=premiumVideoRef.current;
    if(!activeFilm || !video || video.readyState>=2)return;
    video.muted=true;
    video.load();
    void video.play().then(()=>{
      if(video.readyState>=2 && video.videoWidth>0 && video.videoHeight>0)
        setPremiumReady(true);
      if(!previewPlaying && !recording && !preparing)video.pause();
    }).catch(()=>{
      // Keep Create gated: native loadeddata/canplay/error handlers decide readiness.
    });
  }

  const startFromHero=()=>{
    if(recording||preparing)return;
    if(!photoUrl&&!backgroundOnly){onPickPhoto();return;}
    if(photoUrl&&!backgroundOnly&&!photoConsent){
      setNotice(supportUi.heroConsent);
      // Reveal the single original consent control in the relocated cover panel.
      const coverOptions=document.querySelector<HTMLDetailsElement>("[data-video-cover-options]");
      if(coverOptions)coverOptions.open=true;
      window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
        document.querySelector("[data-video-photo-consent]")?.scrollIntoView({behavior:"smooth",block:"center"})));
      return;
    }
    if(audioNeedsAttachment){
      setNotice(audioUi.needsAttach);
      document.querySelector("[data-video-audio-attach-panel]")?.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }
    if(uploadedAudio && !audioRights){
      setNotice(ui.audioRightsHelp);
      document.querySelector("[data-video-audio-rights]")?.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }
    if(!source){onPickPhoto();return;}
    void createVideo();
  };

  // This is a local, non-persistent preview. A click also unlocks muted
  // same-origin footage on iOS before React's paint effect starts.
  const openAffirmationPreview = () => {
    if (recording || preparing) return;
    setPreviewPlaying(true);
    const film = premiumVideoRef.current;
    if (film && activeFilm) {
      film.muted = true;
      void film.play().catch(() => {
        if (aliveRef.current) setNotice(ui.videoUnavailable);
      });
    }
    document.getElementById("video-hero")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
  };

  // Only an explicit click opens and scrolls to the existing guided-image
  // planner; no treatment, API request, rendering or paid action is started.
  useEffect(()=>{
    if(!therapyJumpRequested || studioMode!=="therapy")return;
    document.getElementById("guided-video-series")?.scrollIntoView({
      behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",
      block:"start",
    });
    setTherapyJumpRequested(false);
  },[studioMode,therapyJumpRequested]);


  const quickPickStyle = (index:number) => {
    if(recording||preparing)return;
    setCinematicPlan(null);
    setQuickStyleIndex(index);
    setBrightness(index===1||index===5?"bright":"soft");
    setSpeed(index===2||index===5?"dynamic":"slow");
    const sceneId = quickStyleSceneIds[theme][index];
    if(!sceneId)return;
    if(theme==="money")setMoneyScene(sceneId as MoneySceneId);
    else setOtherScene(sceneId as LocalSceneId);
    setSuggestion("");
    setPreviewPlaying(false);
  };
  // Keep the deep editor tabs usable on mobile WebKit during rapid clicks.
  // One active request controls the fragment and scroll; no delayed scroll
  // from the previous tab can steal the next pointer's click target.
  const quickNavTokenRef=useRef(0);
  const [quickNavTarget,setQuickNavTarget]=useState("");
  const openQuickDetailed=(anchor:string)=>{
    const token=++quickNavTokenRef.current;
    const path=window.location.pathname+window.location.search;
    const desired="#"+anchor;
    const current=()=>token===quickNavTokenRef.current &&
      window.location.pathname+window.location.search===path;
    const setLocation=(push:boolean)=>{
      if(!current()||window.location.hash===desired)return;
      if(push)window.history.pushState(window.history.state,"",path+desired);
      else window.history.replaceState(window.history.state,"",path+desired);
    };
    setLocation(true);
    setQuickNavTarget(anchor);
    setQuickDetailedOpen(true);
    const jump=()=>{
      if(!current())return;
      setLocation(false);
      const section=document.getElementById(anchor);
      if(section && section.getClientRects().length)
        section.scrollIntoView({behavior:"instant" as ScrollBehavior,block:"nearest"});
    };
    window.requestAnimationFrame(()=>window.requestAnimationFrame(jump));
  };
  const createQuickVideo = () => {
    if(usingFreeFilmCompilation&&!freeFilmReady){
      setNotice(locale==="ru"?"Загрузка четырёх исходных видео ещё не завершилась.":
        locale==="es"?"Aún se están cargando los cuatro vídeos.":
        "Four original videos are still loading.");
      return;
    }
    if(audioNeedsAttachment){
      setNotice(audioUi.needsAttach);
      // Audio controls are inside the collapsed advanced editor.
      // Reveal the real attach action instead of scrolling to hidden content.
      openQuickDetailed("video-audio");
      return;
    }
    if(uploadedAudio&&!audioRights){
      setNotice(ui.audioRightsHelp);
      openQuickDetailed("video-audio");
      return;
    }
    if(activeFilm&&!premiumReady){
      primeNativeMasterFromUserGesture();
      setNotice(quick.loading);
      return;
    }
    startFromHero();
  };

  return (
    <section className={videoStyles.studio} id="free-personal-video"
      data-mandala-free-video data-video-studio-mode={studioMode} lang={locale} aria-label={ui.title}>



      <section className={videoStyles.quickBuilder} data-video-quick-builder
        aria-labelledby="video-quick-heading">
        <nav className={videoStyles.quickBrandBar} aria-label="Holistic House">
          <Link href={"/"+locale+"/"} prefetch={false} className={videoStyles.quickBrandBack}
            aria-label={locale==="ru"?"На главную":locale==="es"?"Volver al inicio":"Back to home"}>
            <ArrowRight size={20} aria-hidden="true"/>
          </Link>
          <strong><Leaf size={23} aria-hidden="true"/>Holistic House</strong>
          <span className={videoStyles.quickBrandFree}><Check size={15} aria-hidden="true"/>{practiceCopy.free}</span>
        </nav>
        <header className={videoStyles.quickHeader}>
          <div className={videoStyles.quickHeaderText}>
            <h2 id="video-quick-heading">{approved.introTitle}</h2>
            <p>{approved.intro}</p>
          </div>
          <div className={videoStyles.quickHeaderArt}>
            {/* Existing first-party portrait is a still. This Play button controls
                the ONE actual MP4 preview below; no duplicate player or autoplay. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/holistic-house/support-reference-avatar.webp" alt="" aria-hidden="true"/>
            <button type="button" className={videoStyles.quickHeaderPlay}
              data-video-quick-hero-play aria-label={approved.previewPlay}
              disabled={recording||preparing}
              onClick={()=>{
                // Keep React and the ONE native MP4 player synchronized on the
                // same actual user gesture. WebKit can leave a pending play()
                // promise unresolved; never postpone the UI state until then.
                openAffirmationPreview();
              }}>
              <Play size={24} fill="currentColor" aria-hidden="true"/>
            </button>
          </div>
          <button type="button" data-video-quick-smart disabled={recording||preparing}
            onClick={()=>{if(!uploadedAudio){setAudioAuto(true);if(recommendedAudioId)chooseMusic(recommendedAudioId);}
              if(wish.trim())suggestScene();}}>
            <Sparkles size={18} aria-hidden="true"/>{quick.smart}
          </button>
        </header>
        <div className={videoStyles.quickBenefits} aria-label={approvedMobileCopy[locale].introTitle}>
          {approved.benefits.map((benefit,index)=>{
            const Icon=[Sparkles,Heart,Leaf,Music2][index];
            return <span key={benefit}><Icon size={21} aria-hidden="true"/>{benefit}</span>;
          })}
        </div>
        <p className={videoStyles.quickDisclosure} role="note">{approved.disclosure}</p>

        <section className={videoStyles.quickSection} data-video-quick-section="1"
          aria-labelledby="quick-theme-title">
          <div className={videoStyles.quickSectionHeading}>
            <h3 id="quick-theme-title"><Leaf size={21} aria-hidden="true"/>{approved.directions}</h3>
            <Link href={"/"+locale+"/client/tests"} prefetch={false}>{quick.myGoals}<ArrowRight size={16} aria-hidden="true"/></Link>
          </div>
          <div className={videoStyles.quickThemeRail} role="group" aria-label={quick.theme}>
            {quickThemeOrder.map((value,index)=>{
              const Icon=[Zap,Coins,Heart,Target,Sprout,HeartPulse][index];
              const poster=value==="money"
                ?getRealMoneyFilm(quickStyleSceneIds[value][0] as MoneySceneId).poster
                :getThemedRealFilm(value,quickStyleSceneIds[value][0] as LocalSceneId)?.poster
                  ||quickCanvasPoster(quickStyleSceneIds[value][0] as LocalSceneId);
              return <button key={value} type="button" data-video-quick-theme={value}
                data-tone={value} aria-pressed={theme===value} disabled={recording||preparing}
                onClick={()=>{setQuickStyleIndex(0);selectCategory(value);
                  const id=quickStyleSceneIds[value][0];
                  if(value==="money")setMoneyScene(id as MoneySceneId);
                  else setOtherScene(id as LocalSceneId);
                }}>
                {/* First-party video posters; selecting a topic changes the real source. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster} alt="" loading="lazy"/>
                <span className={videoStyles.quickThemeIcon}><Icon size={23} aria-hidden="true"/></span>
                <span className={videoStyles.quickThemeName}>{approved.themes[value]}</span>
              </button>;
            })}
          </div>
        </section>




        {/* One original Canvas/MediaRecorder stage; it is now visible after topic selection.
            The source-backed MP4 below is a MINI source example, never a second renderer. */}
        <section className={[videoStyles.quickSection,videoStyles.catalogShell,videoStyles.previewStage].join(" ")}
          data-video-live-stage aria-labelledby="video-live-stage-title">
          <div className={videoStyles.previewStageHeading}>
            <div>
              <small>{locale==="ru"?"ВАШ ВИДЕОЭКРАН":locale==="es"?"TU PANTALLA DE VÍDEO":"YOUR VIDEO SCREEN"}</small>
              <h3 id="video-live-stage-title">{layout.therapyHeading}</h3>
              <p>{locale==="ru"?"Тема, сцены, аффирмации и выбранные параметры отражаются здесь. Нажмите Play для живого предпросмотра.":
                locale==="es"?"Tu tema, escenas, afirmaciones y ajustes se reflejan aquí. Pulsa Play para previsualizar.":"Your theme, scenes, affirmations and settings appear here. Press Play to preview."}</p>
            </div>
            <span className={videoStyles.previewStageBadge}>{studioMode==="therapy"?"01 — 08":layout.previewCta}</span>
          </div>
      <section className={videoStyles.hero} id="video-hero" data-video-mandala-hero
        data-hero-promo={!cinematicPlan&&!photoUrl&&!previewPlaying&&!recording?"true":"false"}
         data-video-therapy-preview={studioMode==="therapy"?"true":"false"}
        data-video-theme-active={videoCategory} data-preview-playing={previewPlaying?"true":"false"}
        aria-labelledby="video-hero-heading">
        <h2 id="video-hero-heading" className={videoStyles.srOnly}>{studioMode==="therapy"?layout.therapyHeading:layout.previewTitle}</h2>
        <div className={videoStyles.heroPromo} aria-hidden="true"
          style={activeFilm ? {backgroundImage:`linear-gradient(110deg,rgba(10,43,35,.12),rgba(6,28,29,.18)),url("${activeFilm.poster}")`} : undefined}/>
        <div className={videoStyles.heroCanvas} data-video-preview-frame>
          <canvas key={aspect} ref={canvasRef} width={formatDimensions(aspect,"hd")[0]}
            height={formatDimensions(aspect,"hd")[1]} data-mandala-cinematic-canvas
            aria-label={layout.previewTitle}/>
        </div>
        <div className={videoStyles.heroShade} aria-hidden="true"/>
        <button className={videoStyles.heroPlay} type="button" data-mandala-money-preview
          data-video-preview-toggle aria-pressed={previewPlaying}
          aria-label={previewPlaying?supportUi.pausePreview:supportUi.quickPreview}
          title={previewPlaying?supportUi.pausePreview:supportUi.quickPreview}
          disabled={!source||recording||preparing}
          onClick={()=>{if(previewPlaying)setPreviewPlaying(false);else openAffirmationPreview();}}>
          {previewPlaying?<Pause size={32} fill="currentColor" aria-hidden="true"/>:
            <Play size={32} fill="currentColor" aria-hidden="true"/>}
        </button>
      </section>

          <div className={videoStyles.previewMiniSource} data-video-mini-source>
            <div>
              <strong>{locale==="ru"?"Пример видеоряда":locale==="es"?"Ejemplo de vídeo":"Footage example"}</strong>
              <small>{activeFilm?"Full HD · MP4":usingFreeFilmCompilation?"4 MP4 · "+duration+quick.seconds:
                locale==="ru"?"Анимированная сцена":locale==="es"?"Escena animada":"Animated scene"}</small>
            </div>
            <div className={videoStyles.quickFormatDemo} data-video-quick-live-preview>
              {usingFreeFilmCompilation ? <div data-free-film-original-masters
                aria-hidden="true" style={{position:"absolute",width:1,height:1,overflow:"hidden",
                  opacity:0,pointerEvents:"none"}}>
                {freeFilmShots.map(shot=>shot.film ? <video key={shot.sceneId}
                  ref={node=>{if(node)freeFilmPlayerRefs.current[shot.sceneId]=node;
                    else delete freeFilmPlayerRefs.current[shot.sceneId];}}
                  src={shot.film.src} muted playsInline loop preload="auto"
                  data-free-film-source={shot.sceneId}
                  onLoadedData={updateFreeFilmReadiness}
                  onCanPlay={updateFreeFilmReadiness}
                  onError={()=>{setFreeFilmReady(false);setNotice(ui.videoUnavailable);}}/> : null)}
              </div> : null}
              {activeFilm ? <video
                key={activeFilm.src} ref={premiumVideoRef}
                src={activeFilm.src} poster={activeFilm.poster}
                muted playsInline loop preload="auto"
                data-mandala-master-mp4={activeFilm.src}
                onLoadedData={event=>{
                  if(event.currentTarget.readyState>=2 && event.currentTarget.videoWidth>0)
                    setPremiumReady(true);
                }}
                onCanPlay={()=>setPremiumReady(true)}
                onError={()=>{setPremiumReady(false);setNotice(ui.videoUnavailable);}}
                aria-hidden="true"
              /> : <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={freeFilmPoster||(theme==="money"?getRealMoneyFilm(moneyScene||"golden-rain").poster:
                  getThemedRealFilm(theme,otherScene)?.poster||quickCanvasPoster(otherScene))} alt=""/>
              </>}
              <button type="button" className={videoStyles.quickPreviewPlay}
                aria-label={previewPlaying?approved.previewPause:activeFilm?approved.previewPlay:approved.previewFallback}
                aria-pressed={previewPlaying} disabled={recording||preparing}
                onClick={()=>{
                  if(!activeFilm){
                    // Canvas-backed themes use the same original real renderer.
                    if(previewPlaying)setPreviewPlaying(false);
                    else openAffirmationPreview();
                    return;
                  }
                  if(!previewPlaying){
                    const video=premiumVideoRef.current;
                    if(video){video.muted=true;void video.play().catch(()=>setNotice(ui.videoUnavailable));}
                  }else{
                    premiumVideoRef.current?.pause();
                  }
                  setPreviewPlaying(current=>!current);
                }}>
                {previewPlaying?<Pause size={28} fill="currentColor" aria-hidden="true"/>:
                  <Play size={28} fill="currentColor" aria-hidden="true"/>}
              </button>
              <span className={videoStyles.quickPreviewMeta}>{duration}{quick.seconds} ·
                {aspect==="portrait"?"9:16":aspect==="square"?"1:1":"16:9"}</span>
            </div>

          </div>
        </section>

      {studioMode==="therapy" ? <div className={videoStyles.therapyCourse} id="guided-video-series">
      <button type="button" data-video-therapy-exit className={videoStyles.quickTherapy}
        disabled={recording||preparing}
        onPointerUp={()=>{setStudioMode("pump");setTherapyJumpRequested(false);setNotice("");}}
        onClick={()=>{setStudioMode("pump");setCinematicPlan(null);setTherapyJumpRequested(false);setNotice("");}}>
        <ArrowRight size={17} aria-hidden="true"/>{quick.exitTherapy}
      </button>
      <MandalaGuidedCourse locale={locale} theme={theme}
        onContextChange={updateMeditationFocus}
        selfRatings={touchedScores} disabled={recording||preparing}
        onApplyFreeVideo={session=>{
          // This is preparation, NOT a render or a claimed downloadable video.
          // Each session has a pre-existing, genuine symbolic film/Canvas scene.
          // First video: scenic meadow-morning master, not a generic money/energy clip.
          selectCategory(session.videoTheme);
          if (session.videoTheme!=="money") setOtherScene(session.videoScene as LocalSceneId);
          // Keep the visitor's photo choice: free course setup must not turn it off.
          if(!photoUrl)setBackgroundOnly(true);
          setDuration(60);
          setSpeed("slow");
          setCaptionMode("custom");
          setCustomCaption(session.title);
          // Preserve the chosen personal goal on the meadow visuals with
          // original, user-readable supportive phrases from that goal's theme.
          setAffirmations(current=>({...defaultAffirmations,enabled:current.enabled,selected:[],
            custom:suggestedVideoAffirmations[locale][session.theme].slice(0,3).join("\n"),
            visibility:["large"]}));
          setNotice(locale==="ru"?"Сюжет №1 перенесён. Создайте и скачайте видео в редакторе ниже.":
            locale==="es"?"Escena 1 preparada. Crea y descarga el vídeo en el editor de abajo.":
            "Session 1 scene is ready. Create and download the video in the editor below.");
          document.querySelector("[data-mandala-video-generate]")?.scrollIntoView({behavior:"smooth",block:"start"});
        }}/>
      </div> : null}

        {/* ONE shared library: the original real full-HD look gallery and 24
            licensed four-MP4 films. Both update the same main video stage. */}
        <section className={[videoStyles.quickSection,videoStyles.catalogShell,videoStyles.sceneLibrary].join(" ")}
          data-video-scene-library aria-labelledby="video-scene-library-title">
          <div className={videoStyles.sceneLibraryHeading}>
            <h3 id="video-scene-library-title"><Film size={21} aria-hidden="true"/>
              {locale==="ru"?"Видеосюжеты и шаблоны":locale==="es"?"Escenas y plantillas":"Scenes & templates"}</h3>
            <p>{locale==="ru"?"Выберите готовый видеосюжет. Он появится на большом экране выше.":
              locale==="es"?"Elige una escena real para verla en la pantalla superior.":
              "Pick a ready-made scene to see it in the large screen above."}</p>
          </div>
      <section className={videoStyles.templates} id="video-templates" data-mandala-money-effects
        aria-labelledby="video-templates-heading">
        <div className={videoStyles.sectionHeading}>
          <h3 id="video-templates-heading">{supportUi.popular}</h3>
          {activeTemplates.length>4 &&
            <button type="button" data-video-all-templates disabled={recording||preparing}
              aria-expanded={showAllMoney} onClick={()=>setShowAllMoney(value=>!value)}>
              {showAllMoney?ui.fewTemplates:ui.allTemplates}<ArrowRight size={17} aria-hidden="true"/>
            </button>}
        </div>
        <div className={videoStyles.templateRail} role="group" aria-label={ui.stepTemplate}>
          {theme==="money" ? visibleTemplates.map((scene,index)=>{
            const money=scene as (typeof moneyScenes)[number];
            const name=moneyTemplateLabels[money.id]?.[locale] || money.label[locale];
            return <button type="button" key={money.id}
              data-mandala-money-option={money.id} data-video-template={money.id}
              className={videoStyles.templateTile} disabled={recording||preparing}
              aria-pressed={moneyScene===money.id}
              onClick={()=>{setSuggestion("");setCinematicPlan(null);if(moneyScene===money.id&&previewPlaying)setPreviewPlaying(false);
                else{setMoneyScene(money.id);setPreviewPlaying(true);}}}>
              <CinematicSceneThumbnail scene={money.id} title={name}
                photo={backgroundOnly?null:sharedThumbnailPhoto}
                playing={moneyScene===money.id&&previewPlaying&&!recording}/>
              <span className={videoStyles.tileShade} aria-hidden="true"/>
              <span className={videoStyles.tileName}>{name}</span>
              {getRealMoneyFilm(money.id).src.includes("/film-collection-v2/") ? <span className={videoStyles.filmBadge}>FULL HD</span> : null}
               {moneyScene===money.id ? <span className={videoStyles.tileCheck}><Check size={14} aria-hidden="true"/></span>:null}
              <span className={videoStyles.srOnly}>{index+1}</span>
            </button>;
          }) : visibleTemplates.map(scene=>{
            const other=scene as (typeof otherVideoScenes)[OtherTheme][number];
            return <button type="button" key={other.id}
              data-video-template={other.id}
              className={videoStyles.templateTile} disabled={recording||preparing}
              aria-pressed={otherScene===other.id}
              onClick={()=>{setSuggestion("");setCinematicPlan(null);setOtherScene(other.id);setPreviewPlaying(true);
                }}>
              {getThemedRealFilm(theme,other.id) ?
                 <ThemedFilmThumbnail film={getThemedRealFilm(theme,other.id)!} scene={other.id}
                   title={other.label[locale]} photo={backgroundOnly?null:sharedThumbnailPhoto}
                   playing={otherScene===other.id&&previewPlaying&&!recording}/> :
                 <ThemedSceneThumbnail theme={theme} scene={other.id}
                   title={other.label[locale]} photo={backgroundOnly?null:sharedThumbnailPhoto}/>}
               {getThemedRealFilm(theme,other.id) ? <span className={videoStyles.filmBadge}>FULL HD</span> : null}
              <span className={videoStyles.tileShade} aria-hidden="true"/>
              <span className={videoStyles.tileName}>{other.label[locale]}</span>
              {otherScene===other.id ? <span className={videoStyles.tileCheck}><Check size={14} aria-hidden="true"/></span>:null}
            </button>;
          })}
        </div>
        <div className={videoStyles.templateFooter}>
          <small>{ui.templateHint}</small>
        </div>
      </section>

      <section className={videoStyles.quickSection} data-free-film-compilation-catalog
        aria-labelledby="free-film-catalog-title">
        <div className={videoStyles.quickSectionHeading}>
          <div>
            <h3 id="free-film-catalog-title"><Film size={19} aria-hidden="true"/>
              {locale==="ru"?"24 готовых видеосюжета":locale==="es"?"24 historias de vídeo":"24 ready-to-edit films"}</h3>
            <p>{locale==="ru"?"Каждый фильм — монтаж 4 разных MP4 из нашей лицензированной коллекции (32 исходника).":
              locale==="es"?"Cada montaje combina 4 MP4 distintos de 32 vídeos con licencia.":
              "Each montage combines 4 different MP4 clips from 32 licensed originals."}</p>
          </div>
          <button type="button" data-free-film-more disabled={recording||preparing}
            aria-expanded={showAllFreeFilms} onClick={()=>setShowAllFreeFilms(value=>!value)}>
            {showAllFreeFilms?(locale==="ru"?"По теме":locale==="es"?"Por tema":"By topic"):
              (locale==="ru"?"Все 24":locale==="es"?"Ver 24":"All 24")}
            <ArrowRight size={16} aria-hidden="true"/>
          </button>
        </div>
        <div className={videoStyles.templateRail} role="group"
          aria-label={locale==="ru"?"Каталог бесплатных видеомонтажей":locale==="es"?
            "Catálogo de montajes gratuitos":"Free film compilation catalogue"}>
          {freeFilmOptions.map(preset=>{
            const clipTheme=FREE_FILM_CLIP_THEMES[preset.clips[0]];
            const poster=firstPartyFilmFor(clipTheme,preset.clips[0])?.poster;
            return <button key={preset.id} type="button" data-free-film-preset={preset.id}
              aria-pressed={usingFreeFilmCompilation&&activeFreeFilmPreset===preset.id}
              disabled={recording||preparing} className={videoStyles.templateTile}
              onClick={()=>{
                const nextDuration=duration;
                const plan=compileFreeFilmPreset(preset,locale,nextDuration,aspect);
                setActiveFreeFilmPreset(preset.id);
                setTheme(preset.theme);setVideoCategory(preset.theme);
                setDuration(nextDuration);setCinematicPlan(plan);
                setPreviewPlaying(false);setSuggestion("");
                document.getElementById("video-hero")?.scrollIntoView({
                  behavior:"smooth",block:"nearest"});
              }}>
              {poster ? <img src={poster} alt="" loading="lazy"
                style={{width:"100%",height:"100%",objectFit:"cover"}}/> : null}
              <span className={videoStyles.tileShade} aria-hidden="true"/>
              <span className={videoStyles.tileName}>{preset.label[locale]}</span>
              <span className={videoStyles.filmBadge}>4 MP4</span>
              {usingFreeFilmCompilation&&activeFreeFilmPreset===preset.id?
                <span className={videoStyles.tileCheck}><Check size={14} aria-hidden="true"/></span>:null}
            </button>;
          })}
        </div>
        {usingFreeFilmCompilation ? <p role="status" data-free-film-readiness>
          {freeFilmReady
            ? (locale==="ru"?"Четыре видео готовы. Нажмите «Создать видео».":
              locale==="es"?"Los cuatro vídeos están listos. Pulsa Crear vídeo.":
              "All four clips are ready. Press Create video.")
            : (locale==="ru"?"Загружаем четыре MP4 для монтажа…":
              locale==="es"?"Cargando cuatro MP4…":"Loading four original MP4 clips…")}
        </p>:null}
      </section>

          <details className={videoStyles.previewCoverOptions} data-video-cover-options>
            <summary><Camera size={18} aria-hidden="true"/>
              {approved.preview}<ChevronDown size={18} aria-hidden="true"/></summary>
        <section className={videoStyles.quickSection} data-video-quick-section="7"
          aria-labelledby="quick-image-title">
          <div className={videoStyles.quickSectionHeading}>
            <div><h3 id="quick-image-title"><Camera size={20} aria-hidden="true"/>{approved.preview}</h3>
              <p>{approved.covers}</p></div>
            <button type="button" onClick={()=>{setBackgroundOnly(false);onPickPhoto();}}
              disabled={recording||preparing} className={videoStyles.quickEdit}>
              <Camera size={15} aria-hidden="true"/>{quick.pick}
            </button>
          </div>

          <div className={videoStyles.quickImageRail}>
            <button type="button" className={videoStyles.quickImageUpload} data-video-quick-photo
              disabled={recording||preparing} onClick={()=>{setBackgroundOnly(false);onPickPhoto();}}>
              {photoUrl ? <>
                {/* Only user-owned local Blob, never submitted to AI or CRM. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="" draggable={false}/>
              </> : <><Camera size={24} aria-hidden="true"/><span>{quick.pick}</span></>}
            </button>
            {activeTemplates.slice(0,6).map(scene=>{
              const current=theme==="money"?moneyScene===scene.id:otherScene===scene.id;
              const poster=theme==="money"?getRealMoneyFilm(scene.id as MoneySceneId).poster:
                getThemedRealFilm(theme,scene.id as LocalSceneId)?.poster||quickCanvasPoster(scene.id as LocalSceneId);
              return <button key={scene.id} type="button" className={videoStyles.quickImageTile}
                data-video-quick-scene={scene.id} aria-pressed={current} disabled={recording||preparing}
                aria-label={quick.scene+": "+(theme==="money"?
                  moneyTemplateLabels[scene.id as MoneySceneId]?.[locale]||scene.label[locale]:scene.label[locale])}
                onClick={()=>{setSuggestion("");setPreviewPlaying(false);
                  if(theme==="money")setMoneyScene(scene.id as MoneySceneId);
                  else setOtherScene(scene.id as LocalSceneId);}}>
                {/* Source-backed original scene posters, not user portraits. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster} alt="" loading="lazy"/>
                {current?<span className={videoStyles.quickTick}><Check size={14} aria-hidden="true"/></span>:null}
              </button>;
            })}
          </div>
          <label className={videoStyles.quickPhotoSwitch}>
            <input type="checkbox" data-video-quick-photo-enabled checked={!backgroundOnly}
              disabled={recording||preparing} onChange={event=>{
                const enabled=event.currentTarget.checked;
                setBackgroundOnly(!enabled);
                if(enabled&&!photoUrl)onPickPhoto();
              }}/><span>{quick.photoOn}</span>
          </label>
          {photoUrl&&!backgroundOnly?<label className={videoStyles.quickPhotoSwitch}>
            <input type="checkbox" data-video-photo-consent checked={photoConsent}
              disabled={recording||preparing} onChange={event=>{
                const approved=event.currentTarget.checked;
                setPhotoConsent(approved);
                if(approved)primeNativeMasterFromUserGesture();
              }}/><span>{ui.consent}</span>
          </label>:null}
          {photoError?<p role="alert" className={videoStyles.warning}>{ui.photoError}</p>:null}
        </section>

          </details>
        </section>

        <section className={videoStyles.quickSection} data-video-quick-tier data-video-quick-section="2" aria-labelledby="quick-tier-title">
          <div className={videoStyles.quickSectionHeading}>
            <h3 id="quick-tier-title"><Film size={21} aria-hidden="true"/>{practiceCopy.formats}</h3>
          </div>

          <div className={videoStyles.quickFormatGrid} role="group" aria-label={practiceCopy.formats}>
            {/* A single real first-party 16:9 master remains mounted when the
                expanded product changes; paid formats are only previews. */}
            <div className={videoStyles.quickFormatStack} data-video-practice-accordion>
              {formatPracticeOrder.map(format=>{
                const Icon=format==="video"?Film:format==="meditation"?AudioLines:BarChart3;
                const price=draftFormatPrices[format][practiceLevels[format]];
                const selected=practiceType===format;
                return <article key={format} className={videoStyles.quickFormatCard}
                  data-video-practice-card={format} data-selected={selected}>
                  <button type="button" className={videoStyles.quickFormatTitle}
                    data-video-practice-pick={format} aria-pressed={selected}
                    aria-expanded={selected} aria-controls={"video-practice-details-"+format}
                    disabled={recording||preparing}
                    onClick={()=>{
                      if(selected)return;
                      premiumVideoRef.current?.pause();
                      setPracticeType(format);
                      setPreviewPlaying(false);
                    }}>
                    <Icon size={18} aria-hidden="true"/>
                    <span className={videoStyles.quickFormatTitleLabel}>
                      <strong>{practiceCopy.names[format]}</strong>
                      {selected?<small>{practiceCopy.durations[format]}</small>:null}
                    </span>
                    {!selected?<span className={videoStyles.quickFormatFrom}>
                      {price===null?practiceCopy.noQuote:price===0?"$0":"$"+price.toFixed(2)}
                    </span>:null}
                    <ChevronDown className={videoStyles.quickFormatChevron} size={16} aria-hidden="true"/>
                  </button>
                  <div className={videoStyles.quickFormatDetails}
                    id={"video-practice-details-"+format} data-video-practice-details={format}
                    hidden={!selected}>
                    <ul className={videoStyles.quickFormatBenefits}>
                      {practiceCopy.features[format].map(feature=><li key={feature}>{feature}</li>)}
                    </ul>
                    <div className={videoStyles.quickFormatControls}>
                      <div className={videoStyles.quickFormatQuality} role="group"
                        aria-label={practiceCopy.names[format]}>
                        {formatQualityOrder.map(level=><button type="button" key={level}
                          data-video-quality-option={format+"-"+level}
                          aria-pressed={selected&&practiceLevels[format]===level}
                          disabled={recording||preparing||draftFormatPrices[format][level]===null}
                          onClick={()=>{
                            setPracticeType(format);
                            setPracticeLevels(previous=>({...previous,[format]:level}));
                          }}>{practiceCopy.quality[level]}</button>)}
                      </div>
                      <div className={videoStyles.quickFormatPrice} data-video-practice-price={format}
                        aria-live="polite">
                        <strong>{price===null?practiceCopy.noQuote:price===0?
                          "$0":"$"+price.toFixed(2)}</strong>
                        <small>{price===0?practiceCopy.free:practiceCopy.draft}</small>
                      </div>
                    </div>
                  </div>
                </article>;
              })}
            </div>
          </div>
          <p className={videoStyles.quickTierNote} role="note">{practiceCopy.note}</p>
        </section>

        <section className={videoStyles.quickSection} data-video-quick-section="4"
          aria-labelledby="quick-visual-title">
          <div className={videoStyles.quickSectionHeading}>
            <div><h3 id="quick-visual-title"><Film size={21} aria-hidden="true"/>{practiceCopy.stylesTitle}</h3>
              <p>{quick.visualHelp}</p></div>
            <button type="button" className={videoStyles.quickEdit}
              onClick={event=>{event.preventDefault();openQuickDetailed("video-templates");}}>{quick.edit}<ArrowRight size={16} aria-hidden="true"/></button>
          </div>
          <div className={videoStyles.quickStyles} role="group" aria-label={quick.visual}>
            {quickStylePosters.map((poster,index)=><button type="button" key={poster}
              data-video-quick-style={index} data-video-quick-scene={quickStyleSceneIds[theme][index]}
              aria-pressed={quickStyleIndex===index}
              disabled={recording||preparing} onClick={()=>quickPickStyle(index)}>
              {/* Curated first-party film artwork; no remote image requests. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={"/videos/holistic-house/film-collection-v2/"+poster+".jpg"}
                loading="lazy" alt=""/>
              <span>{quick.styles[index]}</span>
            </button>)}
          </div>
          <small className={videoStyles.quickHint}>{quick.sceneHint}</small>
        </section>


        <section className={videoStyles.quickSection} data-video-quick-personal aria-labelledby="quick-personal-title">
          <div className={videoStyles.quickSectionHeading}>
            <h3 id="quick-personal-title"><Sparkles size={21} aria-hidden="true"/>{approved.personal}</h3>
          </div>
          <label className={videoStyles.quickWish}>
            <span className={videoStyles.srOnly}>{quick.wish}</span>
            <Target size={18} aria-hidden="true"/>
            <input data-video-quick-wish type="text" maxLength={160} value={wish}
              disabled={recording||preparing} placeholder={quick.wish}
              onChange={event=>{setWish(graphemeTrim(event.currentTarget.value));setSuggestion("");setCinematicPlan(null);}}/>
          </label>
          <div className={videoStyles.quickPersonalActions}>
            <button type="button" data-video-personal-affirmations disabled={recording||preparing}
              aria-pressed={affirmations.enabled}
              onClick={()=>setAffirmations(current=>({...current,enabled:!current.enabled,
                selected:current.selected.length?current.selected:[0,1,2]}))}>
              <Sparkles size={21} aria-hidden="true"/>{approved.affirmations}
            </button>
            <button type="button" data-video-personal-photo disabled={recording||preparing}
              onClick={()=>{setBackgroundOnly(false);onPickPhoto();}}>
              <Camera size={21} aria-hidden="true"/>{approved.photo}
            </button>
            <button type="button" data-video-personal-voice onClick={()=>openQuickDetailed("video-audio")}>
              <AudioLines size={21} aria-hidden="true"/>{approved.voice}
            </button>
            <button type="button" data-video-personal-music onClick={()=>openQuickDetailed("video-audio")}>
              <Music2 size={21} aria-hidden="true"/>{approved.music}
            </button>
          </div>
        </section>

        {theme==="health"?<p className={videoStyles.quickHint} role="note">{quick.disclaimer}</p>:null}
        <details className={videoStyles.quickExtras} data-video-quick-extras>
          <summary><strong>{approved.extra}</strong><ChevronDown size={20} aria-hidden="true"/></summary>
          <div className={videoStyles.quickExtraActions}>
            <button type="button" onClick={()=>openQuickDetailed("video-settings")}>
              <SlidersHorizontal size={17} aria-hidden="true"/>{quick.format} · {quick.length}
            </button>
            <button type="button" onClick={()=>openQuickDetailed("video-audio")}>
              <Music2 size={17} aria-hidden="true"/>{quick.audio}
            </button>
            <button type="button" onClick={()=>openQuickDetailed("video-hypnosis")}>
              <Sparkles size={17} aria-hidden="true"/>{quick.hypno.replace(/^\d+\.\s*/,"")}
            </button>
          </div>
        </details>
        <div className={videoStyles.quickOrderBar} data-video-order-bar>
          <div className={videoStyles.quickOrderSummary} data-video-price-summary aria-live="polite">
            <small>{practiceCopy.total}</small>
            <strong>{selectedDraftPrice===null?practiceCopy.noQuote:
              selectedDraftPrice===0?practiceCopy.free:"$"+selectedDraftPrice.toFixed(2)}</strong>
            <small>{practiceCopy.names[practiceType]} · {practiceCopy.quality[practiceLevels[practiceType]]}
              {" · "}{selectedDraftPrice===0?practiceCopy.noCredits:practiceCopy.draft}</small>
          </div>
          <button type="button" className={videoStyles.quickGenerate} data-video-quick-generate
            disabled={recording||preparing||!freeVideoSelected||(usingFreeFilmCompilation&&!freeFilmReady)} onClick={createQuickVideo}>
            {recording||preparing?<span aria-hidden="true">◌</span>:<Play size={22} fill="currentColor" aria-hidden="true"/>}
            {recording||preparing?quick.creating:freeVideoSelected?quick.create:practiceCopy.pending}<ArrowRight size={20} aria-hidden="true"/>
          </button>
        </div>
        {recording?<div className={videoStyles.quickProgress} role="progressbar"
          aria-label={quick.creating} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{width:progress+"%"}}/></div>:null}
        {notice?<p role="status" className={videoStyles.quickStatus} aria-live="polite">{notice}</p>:null}
        <p className={videoStyles.quickPrivacy}><Check size={16} aria-hidden="true"/>{quick.noAI}</p>
        <button type="button" className={videoStyles.quickTherapy}
          data-video-quick-therapy disabled={recording||preparing}
          onClick={()=>{setCinematicPlan(null);setStudioMode("therapy");setQuickDetailedOpen(true);
            setTherapyJumpRequested(true);}}>
          <HandHeart size={18} aria-hidden="true"/>{practiceType==="video"?quick.therapy:quick.therapy}
        </button>
      </section>


      <details className={videoStyles.quickLegacy} data-video-quick-legacy
        open={quickDetailedOpen} onToggle={event=>setQuickDetailedOpen(event.currentTarget.open)}>
        <summary><SlidersHorizontal size={18} aria-hidden="true"/>{approved.extra} · {quick.more}</summary>
        <section className={videoStyles.quickSection} data-video-quick-section="3"
          aria-labelledby="quick-hypno-title">
          <div className={videoStyles.quickSectionHeading}>
            <div><h3 id="quick-hypno-title"><Sparkles size={21} aria-hidden="true"/>{quick.hypno}</h3>
              <p>{quick.hypnoHelp}</p></div>
            <button type="button" className={videoStyles.quickEdit}
              onClick={event=>{event.preventDefault();openQuickDetailed("video-hypnosis");}}>{quick.edit}<ArrowRight size={16} aria-hidden="true"/></button>
          </div>
          <div className={videoStyles.quickHypnoOptions}>
            <button type="button" data-video-quick-phrases="ready" aria-pressed={affirmations.enabled}
              disabled={recording||preparing}
              onClick={()=>setAffirmations(previous=>({...previous,enabled:!previous.enabled,
                selected:previous.selected.length?previous.selected:[0,1,2]}))}>
              <Sparkles size={23} aria-hidden="true"/><strong>{quick.readyPhrases}</strong><small>{quick.byTheme}</small>
            </button>
            <button type="button" data-video-quick-phrases="tests"
              onClick={()=>openQuickDetailed("video-hypnosis")}>
              <BarChart3 size={23} aria-hidden="true"/><strong>{quick.byTests}</strong><small>{quick.afterConsent}</small>
            </button>
            <button type="button" data-video-quick-phrases="own"
              onClick={()=>openQuickDetailed("video-hypnosis")}>
              <SlidersHorizontal size={23} aria-hidden="true"/><strong>{quick.ownPhrases}</strong><small>{quick.write}</small>
            </button>
          </div>
        </section>

        {/* One small audio status/action row replaces the second audio picker,
            extra native audio player and duplicate filters. The actual mic
            and soundtrack library remain exclusively in #video-audio. */}
        <section className={`${videoStyles.quickSection} ${videoStyles.quickAudioSummary}`}
          data-video-quick-section="5" data-video-quick-audio-summary aria-labelledby="quick-audio-title">
          <div className={videoStyles.quickSectionHeading}>
            <div><h3 id="quick-audio-title"><Music2 size={21} aria-hidden="true"/>{quick.audio}</h3>
              <p>{quick.audioHelp}</p></div>
            <button type="button" className={videoStyles.quickEdit}
              onClick={()=>openQuickDetailed("video-audio")}>{quick.edit}<ArrowRight size={16} aria-hidden="true"/></button>
          </div>
          <div className={videoStyles.quickAudioCompact}>
            <span className={videoStyles.quickAudioCurrent}>
              <Music2 size={18} aria-hidden="true"/>
              <span><small>{audioUi.attachedLabel}</small><strong>{appliedAudioName}</strong></span>
            </span>
            <button type="button" data-video-quick-attach className={videoStyles.quickAudioAction}
              disabled={recording||preparing||micRecording||audioDurationInvalid}
              onClick={()=>{
                setAudioAuto(false);
                if(uploadedAudio){attachSelectedAudio();return;}
                if(music!=="none"){attachSelectedAudio();return;}
                const id=recommendedAudioId||"ocean";
                chooseMusic(id);
                setAttachedAudio({kind:"preset",id});
              }}>
              {!audioNeedsAttachment&&attachedAudio?<Check size={15} aria-hidden="true"/>:<Paperclip size={15} aria-hidden="true"/>}
              {!audioNeedsAttachment&&attachedAudio?quick.attached:quick.attach}
            </button>
            <button type="button" className={videoStyles.quickAudioSilent}
              disabled={recording||preparing}
              onClick={()=>{setAudioAuto(false);chooseMusic("none");setAttachedAudio(null);}}>
              {quick.silent}
            </button>
          </div>
        </section>

        <section className={videoStyles.quickSection} data-video-quick-section="6"
          aria-labelledby="quick-format-title">
          <div className={videoStyles.quickSectionHeading}>
            <div><h3 id="quick-format-title"><SlidersHorizontal size={21} aria-hidden="true"/>{quick.montage}</h3>
              <p>{quick.montageHelp}</p></div>
            <button type="button" className={videoStyles.quickEdit}
              onClick={()=>openQuickDetailed("video-settings")}>{quick.edit}<ArrowRight size={16} aria-hidden="true"/></button>
          </div>
          <div className={videoStyles.quickMontageGrid}>
            <fieldset><legend>{quick.format}</legend><div>
              {(["portrait","landscape","square"] as const).map((value,index)=>
                <button type="button" key={value} data-video-quick-aspect={value}
                  disabled={recording||preparing} aria-pressed={aspect===value}
                  onClick={()=>{setAspect(value);setCinematicPlan(null);}}>{["9:16","16:9","1:1"][index]}</button>)}
            </div></fieldset>
            <fieldset><legend>{quick.length}</legend><div>
              {durations.map(value=><button type="button" key={value}
                data-video-quick-duration={value} disabled={recording||preparing}
                aria-pressed={duration===value} onClick={()=>{setDuration(value);setCinematicPlan(null);}}>
                {value}{quick.seconds}</button>)}
            </div></fieldset>
            <fieldset className={videoStyles.quickMontageText}><legend>{quick.text}</legend><div>
              {(["large","small","frame"] as const).map((value,index)=>
                <button type="button" key={value} data-video-quick-text={value}
                  disabled={recording||preparing} aria-pressed={affirmations.visibility.includes(value)}
                  onClick={()=>setAffirmations(previous=>{
                    const visibility=previous.visibility.includes(value)?
                      previous.visibility.filter(v=>v!==value):[...previous.visibility,value];
                    return {...previous,visibility,enabled:visibility.length>0};
                  })}>{[quick.large,quick.small,quick.brief][index]}</button>)}
            </div></fieldset>
          </div>
          {affirmations.visibility.includes("frame")?<small className={videoStyles.quickHint}>{quick.experimental}</small>:null}
        </section>

      <nav className={videoStyles.dailyPicks} data-video-daily-picks
        aria-label={locale==="ru"?"Рекомендации на сегодня":locale==="es"?"Recomendaciones de hoy":"Recommendations for today"}>
        <strong>Picks of the Day</strong>
        <div className={videoStyles.dailyPicksRail}>
          <Link href={"/"+locale+"/client/tests?focus="+
            (videoCategory==="goals"?"meaning":videoCategory==="relationships"?"relationships":videoCategory==="money"?"clarity":videoCategory==="health"?"health":"body")}
            prefetch={false}>{locale==="ru"?"Мои тесты":locale==="es"?"Mis tests":"My Test"}</Link>
          <Link href={"/"+locale+"/holistic-support/mobile?view=meditation#support-mobile-experience"}
            prefetch={false}>{locale==="ru"?"Медитация":locale==="es"?"Meditación":"Meditation"}</Link>
          <Link href={"/"+locale+"/services/free-situation-review"}
            prefetch={false}>{locale==="ru"?"Бесплатный разбор":locale==="es"?"Análisis gratis":"Free Diagnostic"}</Link>
          <Link href={"/"+locale+"/courses"}
            prefetch={false}>{locale==="ru"?"Программа обучения":locale==="es"?"Programa de estudio":"Study Program"}</Link>
        </div>
      </nav>
      <div className={videoStyles.supportTop} data-video-support-layout>
        <section className={videoStyles.assessmentCard} aria-labelledby="video-assessment-heading">
          <h2 id="video-assessment-heading">{supportUi.check}</h2>
          <p>{supportUi.scoreGuide}</p>
          <div className={videoStyles.assessmentScales}>
            {checkOrder.map(key=>{
              const Icon=key==="energy"?Zap:key==="money"?Coins:key==="relationships"?Heart:Target;
              return <label className={videoStyles.assessmentScale} key={key} data-tone={key}>
                <span>{ui.themes[key]}</span>
                <span className={videoStyles.scaleControls}>
                  <Icon size={16} aria-hidden="true"/>
                  <input type="range" min={1} max={10} step={1} value={scores[key]}
                    aria-label={ui.themes[key]}
                    onChange={event=>{const value=Number(event.currentTarget.value);setTouchedScores(prev=>({...prev,[key]:value}));setScores(prev=>({...prev,[key]:value}));}}/>
                  <output>{scores[key]}</output>
                </span>
              </label>;
            })}
          </div>
          <Link className={videoStyles.supportTestLink} href={"/"+locale+"/holistic-support/mobile?view=tests"} prefetch={false}>
            <BarChart3 size={17} aria-hidden="true"/>{supportUi.test}
          </Link>
        </section>

        <section className={videoStyles.centerProfile} aria-label={ui.stepPhoto}>
          <button type="button" className={videoStyles.photoPortrait} data-video-profile-photo-picker
            disabled={recording||preparing} aria-label={photoUrl?ui.replace:ui.addPhoto}
            onClick={onPickPhoto}>
            {photoUrl ? (
              // This is a private local blob, never optimized or uploaded.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" draggable={false}/>
            ) : <span className={videoStyles.photoEmpty}>
                {/* Approved reference artwork only; never used as a customer photo
                    or submitted to the video-generation renderer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={videoStyles.referencePortrait}
                  src="/images/holistic-house/support-reference-avatar.webp" alt="" aria-hidden="true" />
              </span>}
            <span className={videoStyles.cameraCircle}><Camera size={15} aria-hidden="true"/></span>
          </button>
          <div className={videoStyles.profileFocus}><small>{supportUi.focus}</small><strong>{ui.themes[lowestTheme]}</strong></div>
          <button type="button" className={videoStyles.recommendButton}
            disabled={recording||preparing} data-video-recommend-focus
            onClick={()=>selectCategory(lowestTheme)}>
            <Sparkles size={16} aria-hidden="true"/>{supportUi.recommend}
          </button>
          {photoError?<p role="alert" className={videoStyles.warning}>{ui.photoError}</p>:null}
        </section>

        <section className={videoStyles.supportTools} aria-labelledby="video-tools-heading">
          <h2 id="video-tools-heading">{supportUi.help}</h2>
          <div className={videoStyles.supportToolGrid}>
            <Link href={"/"+locale+"/holistic-support/mobile?view=meditation#support-mobile-experience"} prefetch={false}
              className={videoStyles.toolPrimary}><Play size={23} aria-hidden="true"/><span className={videoStyles.toolFull}>{supportUi.meditation}</span><span className={videoStyles.toolCompact}>{supportUi.shortTools.meditation}</span></Link>
            <Link href={"/"+locale+"/holistic-support/mobile?view=consultation"} prefetch={false}>
              <TestTubeDiagonal size={23} aria-hidden="true"/><span className={videoStyles.toolFull}>{supportUi.testSession}</span><span className={videoStyles.toolCompact}>{supportUi.shortTools.test}</span></Link>
            <Link href={"/"+locale+"/holistic-support/mobile?view=talisman"} prefetch={false}>
              <Sparkles size={24} aria-hidden="true"/><span className={videoStyles.toolFull}>{supportUi.talisman}</span><span className={videoStyles.toolCompact}>{supportUi.shortTools.talisman}</span></Link>
            <Link href={"/"+locale+"/holistic-support/mobile?view=healing#support-mobile-experience"} prefetch={false}>
              <HandHeart size={24} aria-hidden="true"/><span className={videoStyles.toolFull}>{supportUi.reiki}</span><span className={videoStyles.toolCompact}>{supportUi.shortTools.reiki}</span></Link>
          </div>
          <div className={videoStyles.supportShortcuts}>
            <Link href={"/"+locale+"/holistic-support/mobile?view=pump"} prefetch={false}>{supportUi.courses}</Link>
            <Link href={"/"+locale+"/holistic-support/mobile?view=masters"} prefetch={false}>{supportUi.masters}</Link>
          </div>
          <button type="button" className={videoStyles.videoMandalaChoice}
            data-video-therapy-toggle aria-pressed={studioMode==="therapy"}
            disabled={recording||preparing}
            onClick={()=>{setStudioMode(current=>current==="therapy"?"pump":"therapy");setCinematicPlan(null);setNotice("");}}>
            <Sparkles size={16} aria-hidden="true"/>{supportUi.mandala}
          </button>
        </section>
      </div>

      <div className={videoStyles.quickStart} data-video-quick-start>
        {studioMode==="therapy" ? <p className={videoStyles.therapyHint} role="note">
          {layout.therapyHint} <a href="#guided-video-series">{layout.therapyJump}</a>
        </p> : null}
        <div className={videoStyles.categoryRail} data-video-category-rail role="group" aria-label={supportUi.topThemes}>
          {(["energy","money","relationships","goals"] as const).map(item=>{
            const Icon=item==="energy"?Zap:item==="money"?Coins:item==="relationships"?Heart:Target;
            return <button type="button" key={item} data-video-category={item} data-video-theme={item}
              data-tone={item} aria-pressed={videoCategory===item}
              disabled={recording||preparing} onClick={()=>selectCategory(item)}>
              <Icon size={22} aria-hidden="true"/>
              <span>{item==="relationships"?(locale==="ru"?"Любовь":locale==="es"?"Amor":"Love"):ui.themes[item]}</span>
            </button>;
          })}
        </div>
      <div className={videoStyles.previewChoices} data-video-preview-choices data-mandala-output-mode
        role="group" aria-label={layout.previewOptions}>
        <div className={videoStyles.previewChoice}>
          <label className={videoStyles.previewChoiceLabel}>
            <input type="checkbox" data-video-photo-enabled checked={!backgroundOnly}
              disabled={recording||preparing} onChange={event=>{
                const enabled=event.currentTarget.checked;
                setBackgroundOnly(!enabled);
                if(enabled&&!photoUrl)onPickPhoto();
              }}/>
            <span>{layout.photoEnable}</span>
          </label>
          <button type="button" className={videoStyles.previewChoiceLink} data-video-photo-picker
            disabled={recording||preparing} onClick={()=>{setBackgroundOnly(false);onPickPhoto();}}>
            <Camera size={14} aria-hidden="true"/>{photoUrl?ui.replace:layout.photoLink}
          </button>
        </div>
        <div className={videoStyles.previewChoice}>
          <label className={videoStyles.previewChoiceLabel}>
            <input type="checkbox" data-video-affirmations-feature checked={affirmations.enabled}
              disabled={recording||preparing}
              onChange={event=>{
                const enabled=event.currentTarget.checked;
                setAffirmations(previous=>({...previous,enabled}));
              }}/>
            <span>{layout.affirmationsToggle}</span>
          </label>
          <a className={videoStyles.previewChoiceLink} href="#video-hypnosis">
            <Sparkles size={14} aria-hidden="true"/>{layout.configureAffirmations}
          </a>
        </div>
      </div>
        {photoError?<p className={videoStyles.warning} role="alert">{ui.photoError}</p>:null}
      </div>

      <section className={videoStyles.catalogShell} data-video-catalog aria-labelledby="video-catalog-heading">
        <header className={videoStyles.catalogHeading}>
          <div>
            <h2 id="video-catalog-heading">{studioMode==="therapy"?layout.therapyHeading:supportUi.catalogTitle}</h2>
            <p>{studioMode==="therapy"?layout.therapySub:supportUi.catalogIntro}</p>
          </div>
          {studioMode==="pump" ? <button type="button" onClick={()=>{
            setShowAllMoney(true);
            document.getElementById("video-templates")?.scrollIntoView({behavior:"smooth",block:"start"});
          }}>{supportUi.allScenes}<ArrowRight size={16} aria-hidden="true"/></button> :
           <span className={videoStyles.courseIndicator}>01 — 08</span>}
        </header>



      <nav className={videoStyles.editorJumpNav} data-video-editor-nav data-video-current-tab={quickNavTarget} aria-label={layout.editorNavLabel}>
        <a href="#video-templates" data-video-editor-tab="design"
          onPointerDown={event=>{
            // In WebKit, a fast second mouse click can be dropped while
            // the previous tab is still scrolling. Activate on down for
            // unmodified primary mouse clicks; the native click remains
            // the keyboard, touch and accessibility fallback.
            if(event.pointerType==="mouse"&&event.button===0&&
              !event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.shiftKey)
              openQuickDetailed("video-templates");
          }}
          onClick={event=>{event.preventDefault();openQuickDetailed("video-templates");}}>
          <Film size={17} aria-hidden="true"/>{layout.designTab}
        </a>
        <a href="#video-audio" data-video-editor-tab="audio"
          onPointerDown={event=>{
            // In WebKit, a fast second mouse click can be dropped while
            // the previous tab is still scrolling. Activate on down for
            // unmodified primary mouse clicks; the native click remains
            // the keyboard, touch and accessibility fallback.
            if(event.pointerType==="mouse"&&event.button===0&&
              !event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.shiftKey)
              openQuickDetailed("video-audio");
          }}
          onClick={event=>{event.preventDefault();openQuickDetailed("video-audio");}}>
          <Music2 size={17} aria-hidden="true"/>{layout.audioTab}
        </a>
        <a href="#video-hypnosis" data-video-editor-tab="affirmations"
          onPointerDown={event=>{
            // In WebKit, a fast second mouse click can be dropped while
            // the previous tab is still scrolling. Activate on down for
            // unmodified primary mouse clicks; the native click remains
            // the keyboard, touch and accessibility fallback.
            if(event.pointerType==="mouse"&&event.button===0&&
              !event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.shiftKey)
              openQuickDetailed("video-hypnosis");
          }}
          onClick={event=>{event.preventDefault();openQuickDetailed("video-hypnosis");}}>
          <Sparkles size={17} aria-hidden="true"/>{layout.affirmationsTab}
        </a>
      </nav>
      {studioMode==="pump" ? <>
      <div className={videoStyles.postHeroActions} data-video-hero-actions>
        <button type="button" className={videoStyles.heroCreate}
          data-video-hero-create disabled={recording||preparing} onClick={startFromHero}>
          <Play size={18} fill="currentColor" aria-hidden="true"/>{ui.create}
        </button>
      </div>
      <section className={videoStyles.therapyBanner} data-video-therapy-banner>
        <div className={videoStyles.therapyBannerCopy}>
          <small>{layout.therapyBannerLabel}</small>
          <h3>{layout.therapyBannerTitle}</h3>
          <p>{layout.therapyBannerHint}</p>
        </div>
        <button type="button" data-video-therapy-start
          disabled={recording||preparing}
          onClick={()=>{setCinematicPlan(null);setStudioMode("therapy");setTherapyJumpRequested(true);}}>
          {layout.therapyBannerAction}<ArrowRight size={19} aria-hidden="true"/>
        </button>
      </section>
      </> : null}

      {theme==="health" && <p data-video-health-disclaimer role="note" className={videoStyles.healthNote}>
        {locale==="ru"?"Эти спокойные видеосюжеты — для отдыха и внимания, не медицинские рекомендации.":
          locale==="es"?"Estos vídeos son para descansar y prestar atención, no son consejos médicos.":
          "These calm videos support reflection and rest; they are not medical advice."}
      </p>}
      <details className={videoStyles.moreFilters} data-video-advanced-filters>
        <summary>{layout.extraFilters}</summary>
        <div className={videoStyles.catalogFilters} data-video-catalog-filters>
          <label><span>{ui.format}</span>
            <select data-video-advanced-aspect value={aspect} disabled={recording||preparing}
              onChange={event=>setAspect(event.currentTarget.value as Aspect)}>
              <option value="portrait">9:16</option>
              <option value="square">1:1</option>
              <option value="landscape">16:9</option>
            </select>
          </label>
          <label><span>{supportUi.filterStyle}</span>
            <select data-video-style value={theme==="money"?(moneyScene||"golden-rain"):otherScene}
              disabled={recording||preparing}
              onChange={event=>{
                setSuggestion("");setPreviewPlaying(false);setCinematicPlan(null);
                // The style selector includes scenes beyond the first four tiles.
                // Reveal the selected film in the existing gallery, including legacy looks.
                setShowAllMoney(true);
                if(theme==="money")setMoneyScene(event.currentTarget.value as MoneySceneId);
                else {
                  const scene=event.currentTarget.value as LocalSceneId;
                  setOtherScene(scene);
                  // Wellness retains its independent category.
                }
              }}>
              {theme==="money"
                ? moneyTemplates.map(item=><option key={item.id} value={item.id}>
                    {moneyTemplateLabels[item.id]?.[locale]||item.label[locale]}</option>)
                : otherVideoScenes[theme].map(item=><option key={item.id} value={item.id}>{item.label[locale]}</option>)}
            </select>
          </label>
          <label><span>{supportUi.filterMotion}</span>
            <select data-video-motion value={speed} disabled={recording||preparing}
              onChange={event=>setSpeed(event.currentTarget.value as Speed)}>
              <option value="slow">{ui.slow}</option>
              <option value="dynamic">{ui.dynamic}</option>
            </select>
          </label>
          <label><span>{supportUi.filterDuration}</span>
            <select data-video-length value={duration} disabled={recording||preparing}
              onChange={event=>{setDuration(Number(event.currentTarget.value) as (typeof durations)[number]);setCinematicPlan(null);}}>
              {durations.map(item=><option key={item} value={item}>{item} {ui.seconds}</option>)}
            </select>
          </label>
        </div>
        <div className={videoStyles.extraCategoryRail} data-video-extra-categories role="group" aria-label={layout.extraThemes}>
          {(["life","health"] as const).map(item=>{
            const Icon=item==="life"?Sprout:HeartPulse;
            return <button type="button" key={item} data-video-category={item}
              data-tone={item} aria-pressed={videoCategory===item} disabled={recording||preparing}
              onClick={()=>selectCategory(item)}>
              <Icon size={16} aria-hidden="true"/>{item==="health"?supportUi.health:ui.themes[item]}
            </button>;
          })}
        </div>
      </details>
      </section>








      <section className={videoStyles.audioSection} id="video-audio" data-video-audio-section aria-labelledby="video-audio-heading">
        <div className={videoStyles.blockHeading}>
          <div className={videoStyles.audioHeroCopy}>
            <h3 id="video-audio-heading"><AudioLines size={22} aria-hidden="true"/>{layout.audioTitle}</h3>
            <p>{layout.audioHelp}</p>
          </div>
          <div className={videoStyles.audioSmartBar} data-video-audio-context>
            <div className={videoStyles.audioContextText}>
              <span>{audioUi.context} <strong>{ui.themes[audioTheme]}</strong></span>
            </div>
            <button type="button" data-video-audio-auto aria-pressed={audioAuto}
              disabled={recording||preparing||(!recommendedAudioId&&!audioAuto)}
              onClick={()=>{
                if(audioAuto){setAudioAuto(false);return;}
                if(recommendedAudioId){chooseMusic(recommendedAudioId);setAudioAuto(true);}
              }}><Sparkles size={15} aria-hidden="true"/>{audioAuto?audioUi.autoOn:audioUi.automatic}</button>
          </div>
        </div>
        <fieldset className={videoStyles.musicCard} disabled={recording||preparing}>
          <legend><Music2 size={17} aria-hidden="true"/>{ui.music}</legend>
          <div className={videoStyles.audioChipFilters} data-video-audio-filters>
            <div className={videoStyles.audioFilterRow}>
              <strong><Heart size={16} aria-hidden="true"/>{audioUi.topic}</strong>
              <div className={videoStyles.audioChipRail} role="group" aria-label={audioUi.topic}>
                {(["relationships","money","energy","goals","health","life"] as VideoTheme[]).map(item=>
                  <button key={item} type="button" data-video-audio-theme={item}
                    aria-pressed={audioTheme===item} onClick={()=>{
                      setAudioThemeOverride(item);setAudioAuto(false);setShowAllAudio(false);
                    }}>{ui.themes[item]}</button>)}
              </div>
            </div>
            <div className={videoStyles.audioFilterRow}>
              <strong><Leaf size={16} aria-hidden="true"/>{audioUi.type}</strong>
              <div className={videoStyles.audioChipRail} role="group" aria-label={audioUi.type}>
                {Object.entries(audioUi.types).map(([id,name])=>
                  <button type="button" key={id} data-video-audio-kind={id}
                    aria-pressed={audioKind===id} onClick={()=>{setAudioKind(id);setShowAllAudio(false);}}>
                    {name}</button>)}
              </div>
            </div>
            <div className={videoStyles.audioFilterRow}>
              <strong><Smile size={16} aria-hidden="true"/>{audioUi.mood}</strong>
              <div className={videoStyles.audioChipRail} role="group" aria-label={audioUi.mood}>
                {Object.entries(audioUi.moods).map(([id,name])=>
                  <button type="button" key={id} data-video-audio-mood={id}
                    aria-pressed={audioMood===id} onClick={()=>{setAudioMood(id);setShowAllAudio(false);}}>
                    {name}</button>)}
              </div>
            </div>
            <div className={videoStyles.audioFilterRow}>
              <strong><BarChart3 size={16} aria-hidden="true"/>{audioUi.pace}</strong>
              <div className={videoStyles.audioChipRail} role="group" aria-label={audioUi.pace}>
                {Object.entries(audioUi.paces).map(([id,name])=>
                  <button type="button" key={id} data-video-audio-pace={id}
                    aria-pressed={audioPace===id} onClick={()=>{setAudioPace(id);setShowAllAudio(false);}}>
                    {name}</button>)}
              </div>
            </div>
            <div className={videoStyles.audioFilterRow}>
              <strong><Clock3 size={16} aria-hidden="true"/>{audioUi.videoLength}</strong>
              <div className={videoStyles.audioChipRail} role="group" aria-label={audioUi.videoLength}>
                {durations.map(n=><button type="button" key={n} data-video-audio-length={n}
                  aria-pressed={duration===n} onClick={()=>{setDuration(n);setCinematicPlan(null);}}>
                  {n} {ui.seconds}</button>)}
              </div>
            </div>
          </div>
          <label className={videoStyles.audioVoiceOption}>
            <input data-video-audio-voice type="checkbox" checked={audioVoiceFriendly}
              disabled={Boolean(uploadedAudio)}
              onChange={event=>{
                const enabled=event.currentTarget.checked;
                setAudioVoiceFriendly(enabled);
                if(enabled){setSoundVolume(30);setAudioAuto(true);}
              }}/>
            <span><strong>{audioUi.voice}</strong><small>{audioUi.voiceInfo}</small></span>
          </label>
          <div className={videoStyles.audioSearchRow}>
            <label className={videoStyles.audioSearchInput}>
              <Search size={18} aria-hidden="true"/>
              <input data-video-audio-search type="search" value={audioSearch}
                onChange={event=>{setAudioSearch(event.currentTarget.value);setShowAllAudio(false);}}
                placeholder={audioUi.search} aria-label={audioUi.search}/>
            </label>
            <label className={videoStyles.audioSort}>
              <span className={videoStyles.srOnly}>{audioUi.sort}</span>
              <select data-video-audio-sort value={audioSort}
                onChange={event=>setAudioSort(event.currentTarget.value as "best"|"name"|"favorites")}>
                <option value="best">{audioUi.byTopic}</option>
                <option value="name">{audioUi.byName}</option>
                <option value="favorites">{audioUi.byFavorites}</option>
              </select>
            </label>
          </div>
          <div className={videoStyles.audioCatalogHeading}>
            <strong>{filteredAudio.length} {audioUi.count}</strong>
            <span>{audioUi.loop}</span>
          </div>
          {filteredAudio.length?<div className={videoStyles.audioTrackList} data-video-audio-tracks>
            {visibleAudio.map((track,index)=><div className={videoStyles.audioTrackRow}
              key={track.id} data-audio-id={track.id} data-audio-kind={track.kind}>
              <button type="button" className={videoStyles.audioTrackSelect}
                data-video-music={track.id} aria-pressed={!uploadedAudio&&music===track.id}
                onClick={()=>{setAudioAuto(false);chooseMusic(track.id as AmbientMusic);}}>
                <span className={videoStyles.audioTileGlyph} aria-hidden="true"/>
                <span className={videoStyles.audioTileText}>
                  <strong>{track.name[locale]}{index===0&&audioSort==="best"?<Sparkles size={14} aria-label={audioUi.suggested}/>:null}</strong>
                  <small>{track.detail[locale]}</small>
                  <span className={videoStyles.audioRowMeta}>
                    <em>{track.kind==="nature"?audioUi.types.nature:track.kind==="tones"?audioUi.types.tones:audioUi.types.pulse}</em>
                    <span className={videoStyles.audioWave} aria-hidden="true">
                      {Array.from({length:15},(_,i)=><i key={i}/>)}
                    </span>
                  </span>
                </span>
                <span className={videoStyles.audioTrackPick}>
                  {!uploadedAudio&&music===track.id?<><Check size={15} aria-hidden="true"/>{audioUi.picked}</>:audioUi.pick}
                </span>
              </button>
              <button type="button" className={videoStyles.audioTrackPlay}
                data-video-audio-play={track.id}
                aria-pressed={Boolean(!uploadedAudio&&music===track.id&&soundPreview)}
                aria-label={(soundPreview&&!uploadedAudio&&music===track.id?ui.soundStop:ui.soundPreview)+" — "+track.name[locale]}
                disabled={recording||preparing||micRecording}
                onClick={()=>playAudioTrack(track.id as Exclude<AmbientMusic,"none">)}>
                {soundPreview&&!uploadedAudio&&music===track.id
                  ?<Pause size={20} fill="currentColor" aria-hidden="true"/>
                  :<Play size={20} fill="currentColor" aria-hidden="true"/>}
              </button>
              <button type="button" className={videoStyles.audioFavorite}
                aria-pressed={audioFavorites.includes(track.id)}
                aria-label={(audioFavorites.includes(track.id)?audioUi.unfavorite:audioUi.favorite)+" — "+track.name[locale]}
                data-video-audio-favorite={track.id}
                onClick={()=>setAudioFavorites(list=>list.includes(track.id)
                  ?list.filter(x=>x!==track.id):[...list,track.id])}>
                <Heart size={19} fill={audioFavorites.includes(track.id)?"currentColor":"none"}
                  aria-hidden="true"/>
              </button>
            </div>)}
          </div>:<div className={videoStyles.audioEmpty} role="status">
            <span>{audioUi.empty}</span>
            <button type="button" onClick={()=>{setAudioKind("all");setAudioMood("all");setAudioPace("all");setAudioSearch("");}}>
              {audioUi.clear}
            </button>
          </div>}
          {filteredAudio.length>5?<button type="button" data-video-audio-more
            className={videoStyles.audioMore} aria-expanded={showAllAudio}
            onClick={()=>setShowAllAudio(value=>!value)}>
            {showAllAudio?audioUi.showLess:audioUi.showMore} · {filteredAudio.length}
          </button>:null}
          <div className={videoStyles.audioUpload}>
            <label htmlFor="personal-video-audio-upload" className={videoStyles.audioUploadLabel}>
              <Music2 size={16} aria-hidden="true"/>{ui.uploadAudio}
            </label>
            <input className={videoStyles.audioFileInput} id="personal-video-audio-upload" ref={audioInputRef}
              data-video-audio-upload type="file"
              accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,audio/webm,.mp3,.m4a,.wav,.aac,.mp4,.webm"
              disabled={recording||preparing}
              onChange={event=>chooseAudioFile(event.currentTarget.files?.[0])}/>
            <button type="button" className={videoStyles.audioMicButton}
              data-video-audio-mic disabled={recording||preparing}
              aria-pressed={micRecording} onClick={()=>{if(micRecording)stopMicRecording();else void startMicRecording();}}>
              <Mic size={17} aria-hidden="true"/>{micRecording?audioUi.stopVoice:audioUi.recordVoice}
            </button>
            <small>{ui.uploadAudioHint}</small>
            {uploadedAudio ? <div className={videoStyles.audioSelection} data-video-audio-selected>
              <span>{ui.audioFileSelected}: <strong>{uploadedAudio.file.name}</strong></span>
              <button type="button" onClick={clearUploadedAudio}
                disabled={recording||preparing}>{ui.audioRemove}</button>
            </div> : null}
          </div>

          <div className={videoStyles.audioPlayerDock} data-video-audio-dock>
          <div className={videoStyles.audioNowPlaying} data-video-audio-now>
            <span>{audioUi.now}</span>
            <strong>{uploadedAudio?uploadedAudio.file.name:selectedAudio?.name[locale]||ui.noMusic}</strong>
            <button type="button" data-video-music="none" onClick={()=>{setAudioAuto(false);chooseMusic("none");}}
              aria-pressed={!uploadedAudio&&music==="none"}>{ui.noMusic}</button>
          </div>
          <div className={videoStyles.musicTools}>
            <button type="button" data-video-music-preview disabled={!previewAudioUrl||audioPlaybackError||recording||preparing}
              onClick={toggleSoundPreview} aria-pressed={soundPreview}>
              {soundPreview?ui.soundStop:ui.soundPreview}
            </button>
            <label>{ui.soundVolume} · {soundVolume}%
              <input type="range" data-video-music-volume min={0} max={100} step={5}
                value={soundVolume} disabled={recording||preparing}
                onChange={event=>setSoundVolume(Number(event.currentTarget.value))}/>
            </label>
          </div>
          {previewAudioUrl && !audioPlaybackError ? <audio key={previewAudioUrl} ref={audioPreviewRef}
            src={previewAudioUrl} controls preload="metadata" loop={!uploadedAudio}
            data-video-audio-player data-video-audio-source={uploadedAudio?"user-file":"site-preset"}
            aria-label={uploadedAudio?.file.name||selectedAudio?.name[locale]||ui.music}
            onPlay={()=>{if(!restoreAudioSessionRef.current)restoreAudioSessionRef.current=acquirePlaybackSession();
              setSoundPreview(true);setMusicWarning("");}}
            onPause={()=>{restoreAudioSessionRef.current?.();restoreAudioSessionRef.current=null;setSoundPreview(false);}}
            onEnded={()=>{restoreAudioSessionRef.current?.();restoreAudioSessionRef.current=null;setSoundPreview(false);}}
            onError={()=>{
              restoreAudioSessionRef.current?.();restoreAudioSessionRef.current=null;
              setAudioPlaybackError(true);setSoundPreview(false);setMusicWarning(ui.soundUnavailable);
            }}
            onLoadedMetadata={event=>{
              if(uploadedAudio && Number.isFinite(event.currentTarget.duration) &&
                event.currentTarget.duration>180){
                setAudioDurationInvalid(true);
                setMusicWarning(ui.audioTooLong);
              }
            }}/> : null}
          </div>
          {audioPlaybackError && previewAudioUrl ? <div className={videoStyles.audioRecovery} role="alert">
            <button type="button" data-video-audio-retry className={videoStyles.audioDirectLink}
              onClick={()=>{setAudioPlaybackError(false);setMusicWarning("");}}>{ui.retryAudio}</button>
            {!uploadedAudio ? <a className={videoStyles.audioDirectLink}
              href={previewAudioUrl} target="_blank" rel="noopener noreferrer"
              data-video-audio-direct>{ui.openAudioDirect}</a> : null}
          </div> : null}
          {uploadedAudio ? <label className={videoStyles.audioRights}>
            <input type="checkbox" data-video-audio-rights checked={audioRights}
              onChange={event=>{
                const checked=event.currentTarget.checked;
                setAudioRights(checked);
                if(!checked&&attachedAudio?.kind==="file"&&attachedAudio.id===uploadedAudio.url)
                  setAttachedAudio(null);
              }}
              disabled={recording||preparing}/>
            <span>{ui.audioRights}</span>
          </label> : null}
          <div className={videoStyles.audioAttachPanel} data-video-audio-attach-panel>
            <div className={videoStyles.audioApplied} data-video-audio-attached>
              <small>{audioUi.attachedLabel}</small><strong>{appliedAudioName}</strong>
            </div>
            <button type="button" data-video-audio-attach
              className={videoStyles.audioAttachButton}
              disabled={!audioNeedsAttachment||audioDurationInvalid||micRecording||(Boolean(uploadedAudio)&&!audioRights)}
              onClick={attachSelectedAudio}>
              {audioNeedsAttachment?<Paperclip size={18} aria-hidden="true"/>:<Check size={18} aria-hidden="true"/>}
              {audioNeedsAttachment?(!uploadedAudio&&music==="none"?audioUi.detach:audioUi.attach):attachedAudio?audioUi.attached:audioUi.chooseFirst}
            </button>
          </div>
          <small className={videoStyles.audioAttachHelp} data-video-audio-attach-help aria-live="polite">
            {audioNeedsAttachment?audioUi.needsAttach:attachedAudio?audioUi.applied:audioUi.noAudioInfo}
          </small>
          <details className={videoStyles.audioHelpDetails}>
            <summary>{audioUi.helpTitle}</summary>
            <small>{ui.audioDeviceHelp}</small>
            <small>{ui.originalAudio}</small>
          </details>
        </fieldset>
      </section>

      <section className={videoStyles.hypnosisSection} id="video-hypnosis" data-video-hypnosis-section aria-labelledby="video-hypnosis-heading">
        <div className={videoStyles.blockHeading}><h3 id="video-hypnosis-heading">{layout.hypnosisTitle}</h3>
          <p>{layout.hypnosisHelp}</p></div>
      <MandalaHypnoCompact key={theme} locale={locale} theme={theme} settings={affirmations}
        onChange={setAffirmations} disabled={recording||preparing}
        scenes={hypnoScenes} activeScene={theme==="money"?(moneyScene||"golden-rain"):otherScene}
        activePoster={activeFilm?.poster||null} onSelectTheme={selectCategory}
        onSelectScene={id=>{
          setCinematicPlan(null);
          if(theme==="money")setMoneyScene(id as MoneySceneId);
          else setOtherScene(id as LocalSceneId);
          setPreviewPlaying(false);
        }} onPreview={openAffirmationPreview} onCreate={startFromHero}/>
      <details className={videoStyles.hypnoOptionalWish} data-video-wish-disclosure>
        <summary>{ui.wishTitle}</summary>
      <section className={videoStyles.wishPanel} data-video-intent aria-labelledby="video-wish-heading">
        <label id="video-wish-heading" htmlFor="personal-video-wish">{ui.wishTitle}</label>
        <textarea id="personal-video-wish" data-video-wish rows={2} maxLength={160}
          value={wish} placeholder={ui.wishPlaceholder} disabled={recording||preparing}
          onChange={event=>{setWish(graphemeTrim(event.currentTarget.value));setSuggestion("");setCinematicPlan(null);}} />
        <p>{ui.wishHelp}</p>
        <div className={videoStyles.wishActions}>
          <button type="button" data-video-suggest disabled={recording||preparing} onClick={suggestScene}>
            <Target size={17} aria-hidden="true"/>{ui.wishAction}
          </button>
          <button type="button" disabled={!wish.trim()||recording||preparing} onClick={useWishAsCaption}>
            {ui.wishCaption}
          </button>
        </div>
        {suggestion && <p role="status" data-video-suggestion className={videoStyles.wishResult}>{suggestion}</p>}
      </section>
      </details>
      </section>

      <MandalaCinematicDirector locale={locale} theme={theme} intentText={wish}
        onIntentTextChange={value=>{setWish(value);setSuggestion("");setCinematicPlan(null);}}
        onMusicPreference={choice=>{
          if(uploadedAudio)return;
          setAudioAuto(false);setMusic(choice==="calm"?"meditation":choice==="energetic"?"energy":"none");
          setMusicWarning("");
        }}
        onCaptionPreference={choice=>setCaptionMode(choice==="none"?"none":"theme")}
        therapyMode={studioMode==="therapy"}
        onInvalidateStoryboard={()=>setCinematicPlan(null)}
        disabled={recording||preparing} onApplyStoryboard={plan=>{
          // Four or six locally rendered shots are approved source-backed
          // motifs; raw client wishes, profile scores and photos remain here.
          setTheme(plan.theme);setVideoCategory(plan.theme);
          if(plan.theme==="money")setMoneyScene(plan.shots[0].theme==="money"
            ? plan.shots[0].sceneId as MoneySceneId:"golden-rain");
          else{setMoneyScene(null);setOtherScene(plan.shots[0].theme===plan.theme
            ? plan.shots[0].sceneId as LocalSceneId:otherVideoScenes[plan.theme][0].id);}
          setAspect(plan.aspect);
          setDuration(plan.durationSeconds as (typeof durations)[number]);
          setCinematicPlan(plan);
          setPreviewPlaying(false);
          setNotice(locale==="ru"
            ?(plan.shotCount===6?"Шесть сцен подготовлены. Нажмите «Создать видео».":"Четыре сцены подготовлены. Нажмите «Создать видео».")
            :locale==="es"?(plan.shotCount===6?"Seis escenas listas. Pulsa Crear vídeo.":"Cuatro escenas listas. Pulsa Crear vídeo.")
            :plan.shotCount===6?"Six shots are ready. Select Create video to render them.":"Four shots are ready. Select Create video to render them.");
          document.getElementById("video-hero")?.scrollIntoView({behavior:"smooth",block:"start"});
        }}/>

      <details className={videoStyles.extraControls} data-video-extra-settings>
        <summary>{layout.extraSettings}</summary>
      <section id="video-settings" className={videoStyles.settings} aria-labelledby="video-settings-heading">
        <div className={videoStyles.sectionHeading}>
          <h3 id="video-settings-heading">{ui.stepSettings}</h3>
          <button type="button" data-video-reset-settings disabled={recording||preparing}
            onClick={resetVideoSettings}>{supportUi.reset} ↻</button>
        </div>
        <div className={videoStyles.settingsGrid}>
          <fieldset className={videoStyles.settingCard} disabled={recording||preparing}>
            <legend>{ui.duration}</legend>
            <div className={videoStyles.pills}>
              {durations.map(n=><button key={n} type="button" aria-pressed={duration===n}
                data-video-duration={n} onClick={()=>{setDuration(n);setCinematicPlan(null);}}>{n} {ui.seconds}</button>)}
            </div>
          </fieldset>
          <fieldset className={videoStyles.settingCard} disabled={recording||preparing}>
            <legend>{ui.format}</legend>
            <div className={videoStyles.pills}>
              {(["portrait","square","landscape"] as Aspect[]).map((format,i)=>
                <button type="button" key={format} data-video-aspect={format}
                  aria-pressed={aspect===format}
                  onClick={()=>{setAspect(format);setCinematicPlan(null);}} onPointerUp={()=>{setAspect(format);setCinematicPlan(null);}}>
                  <span className={videoStyles.formatIcon} data-format={format} aria-hidden="true"/>
                  {["9:16","1:1","16:9"][i]}
                </button>)}
            </div>
          </fieldset>
          <fieldset className={videoStyles.settingCard} disabled={recording||preparing}>
            <legend>{ui.speed}</legend>
            <div className={videoStyles.pills}>
              <button type="button" aria-pressed={speed==="slow"} onClick={()=>setSpeed("slow")}>{ui.slow}</button>
              <button type="button" aria-pressed={speed==="dynamic"} onClick={()=>setSpeed("dynamic")}>{ui.dynamic}</button>
            </div>
          </fieldset>
          <fieldset className={videoStyles.settingCard} disabled={recording||preparing}>
            <legend>{ui.brightness}</legend>
            <div className={videoStyles.pills}>
              <button type="button" aria-pressed={brightness==="soft"} onClick={()=>setBrightness("soft")}>{ui.soft}</button>
              <button type="button" aria-pressed={brightness==="bright"} onClick={()=>setBrightness("bright")}>{ui.bright}</button>
            </div>
          </fieldset>
        </div>

        <fieldset className={videoStyles.captionCard} disabled={recording||preparing}>
          <legend>{ui.caption}</legend>
          <div className={videoStyles.captionLayout}>
            <div className={videoStyles.captionModes}>
              {(["none","theme","custom"] as CaptionMode[]).map((mode,i)=>
                <button type="button" key={mode} aria-pressed={captionMode===mode}
                  data-video-caption-mode={mode} onClick={()=>setCaptionMode(mode)}>
                  {["⊘","✣","✎"][i]}<span>{[ui.noCaption,ui.themeCaption,ui.myCaption][i]}</span>
                </button>)}
            </div>
            <input type="text" maxLength={60} disabled={captionMode!=="custom"||recording||preparing}
              aria-label={ui.caption} placeholder={ui.captionPlaceholder}
              value={captionMode==="custom"?customCaption:captionMode==="theme"?sceneName:""}
              onChange={event=>setCustomCaption(event.currentTarget.value)}/>
          </div>
        </fieldset>

        <details className={videoStyles.qualityDetails}>
          <summary><SlidersHorizontal size={17} aria-hidden="true"/>{ui.quality}</summary>
          <div className={videoStyles.pills} data-mandala-quality>
            <button type="button" disabled={recording||preparing} aria-pressed={quality==="hd"}
              onClick={()=>setQuality("hd")}>{ui.hd}</button>
            <button type="button" disabled={recording||preparing} aria-pressed={quality==="fullhd"}
              onClick={()=>setQuality("fullhd")}>{ui.fullhd}</button>
          </div>
        </details>
      </section>
      </details>
      {photoUrl&&!backgroundOnly&&!photoConsent?<p role="status" className={videoStyles.warning}>{ui.consentHelp}</p>:null}

      {recording ? (
        <div className={videoStyles.recording}>
          <div className={videoStyles.progress}><span style={{width:progress+"%"}}/></div>
          <button type="button" className={videoStyles.generate} onClick={()=>{
            const job=jobRef.current;
            if(job)stopJob(job,true);
            setNotice("");
          }}><X size={20} aria-hidden="true"/>{ui.cancel} · {progress}%</button>
        </div>
      ):(
        <button type="button" className={videoStyles.generate} data-mandala-video-generate
          disabled={!canGenerate} onClick={createVideo}>
          <Play size={21} fill="currentColor" aria-hidden="true"/>{ui.create}
        </button>
      )}
      {!source?<p role="status" className={videoStyles.warning}>{t.imagePending}</p>:null}
      {notice?<p role="status" className={videoStyles.notice} aria-live="polite">{notice}</p>:null}
      {musicWarning?<p role="status" className={videoStyles.warning}>{musicWarning}</p>:null}
      <p className={videoStyles.privacy}><Check size={15} aria-hidden="true"/>{ui.noStorage}</p>

      </details>
      <section className={videoStyles.result} id="personal-video-result" data-video-result hidden={!result}>
        <h3>{ui.videoPreview}</h3>
        {result ? (
          <>
            <video src={result.url} controls playsInline preload="metadata"
              data-mandala-video-preview/>
            <div className={videoStyles.resultActions}>
              <a className={videoStyles.download} href={result.url}
                download={"holistic-house-"+(backgroundOnly?(theme==="money"?"money-background":theme+"-background"):"personal-mandala")+"."+result.extension}
                data-mandala-video-download>
                <Download size={18} aria-hidden="true"/>{ui.save} · {Math.max(1,Math.round(result.bytes/1024))} KB
              </a>
              <button type="button" onClick={shareVideo} data-video-share>
                <Share2 size={18} aria-hidden="true"/>{ui.share}
              </button>
            </div>
            <aside className={videoStyles.postVideoSupport} data-video-post-generation-offers
              aria-labelledby="video-post-support-title">
              <h4 id="video-post-support-title">{postSupport.title}</h4>
              <p className={videoStyles.postVideoSupportLead}>{postSupport.lead}</p>
              <div className={videoStyles.postVideoSupportGrid}>
                <div className={videoStyles.postVideoSupportItem} data-video-upsell="consultation">
                  <div className={videoStyles.postVideoSupportIcon}><Heart size={18} aria-hidden="true"/></div>
                  <div className={videoStyles.postVideoSupportBody}>
                    <strong>{postSupport.consultation}</strong>
                    <p>{postSupport.consultationText}</p>
                    <Link prefetch={false} href={"/"+locale+"/services#consultation"}
                      target="_blank" rel="noopener noreferrer"
                      data-video-upsell-action="consultation">
                      {postSupport.consultationAction}<ArrowRight size={16} aria-hidden="true"/>
                    </Link>
                  </div>
                </div>
                <div className={videoStyles.postVideoSupportItem} data-video-upsell="energy">
                  <div className={videoStyles.postVideoSupportIcon}><HandHeart size={18} aria-hidden="true"/></div>
                  <div className={videoStyles.postVideoSupportBody}>
                    <strong>{postSupport.energy}</strong>
                    <p>{postSupport.energyText}</p>
                    <Link prefetch={false} href={"/"+locale+"/services/remote-energy-support"}
                      target="_blank" rel="noopener noreferrer"
                      data-video-upsell-action="energy">
                      {postSupport.energyAction}<ArrowRight size={16} aria-hidden="true"/>
                    </Link>
                  </div>
                </div>
              </div>
              <p className={videoStyles.postVideoSupportPrivacy}>{postSupport.privacy}</p>
            </aside>
          </>
        ):<p>{ui.myVideosInfo}</p>}
      </section>
      {studioMode==="therapy" ? <MandalaPersonalMeditation
        locale={locale} theme={theme} wish={wish} scene={sceneName} caption={caption}
        sound={attachedAudio?.kind==="file" ? attachedAudio.file.name :
          attachedAudio?.kind==="preset" ?
          (mandalaAudioTracks.find(item=>item.id===attachedAudio.id)?.name[locale]||"") : ""}
        audioSrc={attachedAudio?.kind==="file" ? (audioRights ? uploadedAudio?.url||null : null) :
          attachedAudio?.kind==="preset" ? presetAudioUrl(attachedAudio.id) : null}
        pace={speed} brightness={brightness}
        affirmations={affirmationLines} affirmationsEnabled={affirmations.enabled}
        focus={meditationFocus} disabled={recording||preparing}/> : null}



    </section>
  );
}
