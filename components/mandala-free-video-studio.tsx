"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Camera, Check, Coins, Download, Film, HandHeart, Heart, HeartPulse, Leaf, Sprout, Music2, Pause, Play, Share2, SlidersHorizontal, Sparkles, Target, TestTubeDiagonal, Zap, X } from "lucide-react";
import { moneyScenes } from "@/lib/mandala/money-flow-effects";
import { MandalaVideoAffirmations } from "./mandala-video-affirmations";
import { MandalaGuidedCourse } from "./mandala-guided-course";
import { defaultAffirmations, linesForVideoAffirmations, paintVideoAffirmations, suggestedVideoAffirmations } from "@/lib/mandala/video-affirmations";
import type { AffirmationSettings } from "@/lib/mandala/video-affirmations";
import { suggestPersonalVideoScene, buildFreePromptStoryboard, freeStoryboardFrameAt, captionFromWish, graphemeTrim } from "@/lib/mandala/personal-video-intent.mjs";
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
    storyboardAction:"Build a free scene sequence",storyboardTitle:"Your local video storyboard",
    storyboardHint:"Selected scenes change in the actual video. The first uses site HD footage; later scenes use original Canvas animation. No new AI footage or external upload. Tap Play to preview, then Create video to save.",
    storyboardNoMatch:"No specific scene matched; we kept your chosen theme.",storyboardClear:"Use one scene",storyboardShot:"Scene",
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
    storyboardAction:"Собрать ролик из сцен бесплатно",storyboardTitle:"Ваш сценарий видео",
    storyboardHint:"Сцены действительно сменяются в видео. Первая использует HD-видеофон сайта, следующие — авторскую Canvas-анимацию. Это не генерация новых AI-кадров. Нажмите Play для просмотра, затем «Создать видео» для сохранения.",
    storyboardNoMatch:"Конкретных сюжетов по словам не найдено — оставлена выбранная тема.",storyboardClear:"Одна сцена",storyboardShot:"Сцена",
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
    storyboardAction:"Montar escenas gratis",storyboardTitle:"Tu guion visual local",
    storyboardHint:"Las escenas change in the actual video. The first uses site HD footage and later scenes original Canvas animation. No AI footage or external upload. Pulsa Play y luego Crear vídeo.",
    storyboardNoMatch:"Sin coincidencias; conservamos el tema elegido.",storyboardClear:"Una escena",storyboardShot:"Escena",
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
    context:"For your video theme",automatic:"Match to theme",autoOn:"Auto-match on",
    type:"Sound type",mood:"Mood",pace:"Tempo",
    types:{all:"All sounds",tones:"Ambient tones",nature:"Nature textures",pulse:"Soft rhythm"},
    moods:{all:"Any mood",calm:"Calm",focus:"Focus",uplift:"Inspiration"},
    paces:{all:"Any pace",slow:"Slow",steady:"Steady",active:"Energizing"},
    voice:"Soft sound for a later voiceover",voiceInfo:"Quiet tracks at 30%. Only one soundtrack exports; voice and music are not mixed here.",
    suggested:"Best for this topic",browse:"Scroll to explore",count:"sounds",
    empty:"No sounds match these filters.",clear:"Clear filters",now:"Selected audio",
  },
  ru: {
    context:"Под вашу тему",automatic:"Подобрать по теме",autoOn:"Автоподбор включён",
    type:"Тип звука",mood:"Настрой",pace:"Темп",
    types:{all:"Все звуки",tones:"Музыка и тоны",nature:"Звуки природы",pulse:"Мягкий ритм"},
    moods:{all:"Любой",calm:"Успокоение",focus:"Концентрация",uplift:"Вдохновение"},
    paces:{all:"Любой",slow:"Медленный",steady:"Ровный",active:"Бодрый"},
    voice:"Мягкий фон для будущей озвучки",voiceInfo:"Спокойные треки, громкость 30%. Голос и музыка пока не накладываются одновременно.",
    suggested:"Лучше подходит",browse:"Листайте звуки",count:"звуков",
    empty:"По этим фильтрам звуков нет.",clear:"Сбросить фильтры",now:"Выбранная дорожка",
  },
  es: {
    context:"Para el tema elegido",automatic:"Elegir por tema",autoOn:"Selección activa",
    type:"Tipo de sonido",mood:"Ambiente",pace:"Ritmo",
    types:{all:"Todos",tones:"Tonos y música",nature:"Naturaleza sintética",pulse:"Ritmo suave"},
    moods:{all:"Cualquiera",calm:"Calma",focus:"Concentración",uplift:"Inspiración"},
    paces:{all:"Cualquiera",slow:"Lento",steady:"Regular",active:"Dinámico"},
    voice:"Fondo suave para añadir voz después",voiceInfo:"Pistas suaves al 30%. Por ahora solo se exporta una pista de audio.",
    suggested:"Recomendado",browse:"Desliza para explorar",count:"sonidos",
    empty:"No hay sonidos con estos filtros.",clear:"Restablecer filtros",now:"Audio elegido",
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

const effects: Effect[] = ["glow", "energy", "prosperity", "temple"];
const durations = [10, 20, 30, 60] as const;
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
    void video.play().catch(()=>{/* iPhone may need another direct tap. */});
    return ()=>video.pause();
  },[playing,visible,scene]);
  return <video ref={ref} muted playsInline loop preload="none"
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
    video.muted=true;
    void video.play().catch(()=>{/* iOS may require another direct tap. */});
    return ()=>video.pause();
  },[playing,visible,film.src]);
  return <video ref={ref} muted playsInline loop preload="none" src={film.src} poster={film.poster}
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

function paintFreeStoryboard(
  ctx:CanvasRenderingContext2D,image:HTMLImageElement|null,
  storyboard:ReturnType<typeof buildFreePromptStoryboard>,
  seconds:number,total:number,aspect:Aspect,speed:Speed,brightness:Brightness,
  effect:Effect,caption:string,selectedTheme:VideoTheme,selectedScene:string,
  realVideo:HTMLVideoElement|null,
) {
  const part=freeStoryboardFrameAt(storyboard.shots,total,seconds);
  const shot=part.scene;
  const nextTheme=shot.theme as VideoTheme;
  const nextMoney=nextTheme==="money"?shot.sceneId as MoneySceneId:null;
  const nextOther=nextTheme==="money"?"sun-flight":shot.sceneId as LocalSceneId;
  const video=nextTheme===selectedTheme&&shot.sceneId===selectedScene?realVideo:null;
  paint(ctx,image,effect,seconds,aspect,nextMoney,caption,nextTheme,nextOther,speed,brightness,video);
  if(part.shade>0) {
    ctx.save();ctx.fillStyle="rgba(5,28,26,"+part.shade.toFixed(3)+")";
    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();
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

export function MandalaFreeVideoStudio({ locale, frameUrl, photoUrl, onPickPhoto, photoError }: {
  locale: PublicLocale; frameUrl: string | null; photoUrl?: string | null;
  onPickPhoto: () => void; photoError?: string;
}) {
  const t = translations[locale];
  const ui = studioCopy[locale];
  const audioUi = audioCopy[locale];
  const supportUi = supportDesignCopy[locale];
  const layout = layoutCopy[locale];
  const [studioMode,setStudioMode] = useState<"pump"|"therapy">("pump");
  const [therapyJumpRequested,setTherapyJumpRequested] = useState(false);
  const [scores,setScores] = useState<Record<(typeof checkOrder)[number],number>>({energy:5,money:5,relationships:5,goals:5});
  const [touchedScores,setTouchedScores] = useState<Partial<Record<(typeof checkOrder)[number],number>>>({});
  const [theme, setTheme] = useState<VideoTheme>("energy");
  const [videoCategory, setVideoCategory] = useState<VideoCategory>("energy");
  const effect: Effect = "glow";
  const [moneyScene, setMoneyScene] = useState<MoneySceneId | null>("golden-rain");
  const [backgroundOnly,setBackgroundOnly]=useState(true);
  const [otherScene, setOtherScene] = useState<LocalSceneId>("solar-surge");
  const [showAllMoney, setShowAllMoney] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [aspect, setAspect] = useState<Aspect>("portrait");
  const [quality, setQuality] = useState<Quality>("hd");
  const [duration, setDuration] = useState<(typeof durations)[number]>(20);
  const [speed,setSpeed] = useState<Speed>("slow");
  const [brightness,setBrightness] = useState<Brightness>("soft");
  const [music,setMusic] = useState<AmbientMusic>("none");
  const [soundVolume,setSoundVolume] = useState(75);
  const [audioKind,setAudioKind] = useState("all");
  const [audioMood,setAudioMood] = useState("all");
  const [audioPace,setAudioPace] = useState("all");
  const [audioVoiceFriendly,setAudioVoiceFriendly] = useState(false);
  const [audioAuto,setAudioAuto] = useState(false);
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
  const [freeStoryboard,setFreeStoryboard] = useState<ReturnType<typeof buildFreePromptStoryboard>|null>(null);
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
  const activeFilm = activeMoneyFilm || activeThemedFilm;
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
  const signature = JSON.stringify([source,frameUrl,photoUrl,theme,moneyScene,otherScene,backgroundOnly,
    effect,aspect,duration,quality,speed,brightness,music,uploadedAudio?.url,soundVolume,caption,affirmations,
    freeStoryboard?.version,freeStoryboard?.shots]);
  const sourceRef = useRef(signature);
  sourceRef.current = signature;
  const canGenerate = Boolean(source) && (!activeFilm || premiumReady) &&
    (backgroundOnly || (Boolean(photoUrl) && photoConsent)) &&
    (!uploadedAudio || audioRights) && !preparing && !recording;
  const previewAudioUrl = uploadedAudio?.url || (music==="none" ? null : presetAudioUrl(music));
  // Context comes from the existing theme/filter on this very screen.
  // A typed wish influences ranking locally; no profile, tests or health data is read.
  const audioMatches = recommendMandalaAudio({
    theme,kind:audioKind,mood:audioMood,pace:audioPace,
    voiceFriendly:audioVoiceFriendly,wish,
  });
  const recommendedAudioId = audioMatches[0]?.id as AmbientMusic | undefined;
  const selectedAudio = mandalaAudioTracks.find(item=>item.id===music);
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
  useEffect(() => {
    if (audioAuto && !uploadedAudio) setMusic(recommendedAudioId||"none");
  },[audioAuto,uploadedAudio,recommendedAudioId]);
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
      if(freeStoryboard)paintFreeStoryboard(ctx,image,freeStoryboard,0,duration,aspect,speed,brightness,
          effect,caption,theme,theme==="money"?(moneyScene||"golden-rain"):otherScene,premiumVideoRef.current);
        else paint(ctx,image,effect,0,aspect,moneyScene,caption,theme,otherScene,speed,brightness,premiumVideoRef.current);
      paintVideoAffirmations(ctx,0,affirmationLines,affirmations);
      if (!previewPlaying) return;
      const draw = (now: number) => {
        if (cancelled || jobRef.current) return;
        if (!startedAt) startedAt = now;
        if (now - lastFrame >= 80 && !document.hidden) {
          if(freeStoryboard)paintFreeStoryboard(ctx,image,freeStoryboard,(now-startedAt)/1000,duration,aspect,speed,brightness,
              effect,caption,theme,theme==="money"?(moneyScene||"golden-rain"):otherScene,premiumVideoRef.current);
            else paint(ctx,image,effect,(now-startedAt)/1000,aspect,moneyScene,caption,theme,otherScene,speed,brightness,premiumVideoRef.current);
          paintVideoAffirmations(ctx,(now-startedAt)/1000,affirmationLines,affirmations);
          lastFrame = now;
        }
        animation = window.requestAnimationFrame(draw);
      };
      animation = window.requestAnimationFrame(draw);
    }).catch(() => { /* PNG preparation can be retried in the parent editor. */ });
    return () => { cancelled = true; window.cancelAnimationFrame(animation); };
  }, [source, effect, moneyScene, theme, otherScene, aspect, previewPlaying, speed, brightness, caption, affirmations, locale, duration, freeStoryboard]);

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
      musicSession = uploadedAudio
        ? await startUploadedAudio(uploadedAudio.file,soundVolume)
        : music === "none" ? null : await startPresetAudio(music,soundVolume);
      if((music !== "none" || uploadedAudio) && !musicSession) {
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
      if(freeStoryboard)paintFreeStoryboard(ctx,image,freeStoryboard,0,duration,aspect,speed,brightness,
          effect,caption,theme,theme==="money"?(moneyScene||"golden-rain"):otherScene,premiumVideoRef.current);
        else paint(ctx,image,effect,0,aspect,moneyScene,caption,theme,otherScene,speed,brightness,premiumVideoRef.current);
      paintVideoAffirmations(ctx,0,affirmationLines,affirmations);
      const framesPerSecond = affirmations.enabled && affirmations.visibility.includes("frame") && affirmationLines.length
        ? 25 : quality === "fullhd" ? 12 : 15;
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
          if(freeStoryboard)paintFreeStoryboard(ctx,image,freeStoryboard,Math.min(duration,(now-start)/1000),duration,aspect,speed,brightness,
            effect,caption,theme,theme==="money"?(moneyScene||"golden-rain"):otherScene,premiumVideoRef.current);
          else paint(ctx,image,effect,Math.min(duration,(now-start)/1000),aspect,moneyScene,caption,theme,otherScene,speed,brightness,premiumVideoRef.current);
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
    setAudioAuto(false);
    setAudioVoiceFriendly(false);
    setMusic("none");
    setSoundVolume(80);
    setMusicWarning("");
  }
  function chooseMusic(choice:AmbientMusic){
    clearUploadedAudio();
    setMusic(choice);
    setAudioPlaybackError(false);
    setMusicWarning("");
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
  // All planning happens on-device. A plan is NOT a render: Create remains
  // a separate user click that passes the actual shots to MediaRecorder.
  function buildLocalStoryboard() {
    if(!wish.trim()){setSuggestion(ui.wishMissing);return;}
    const availableByTheme=Object.fromEntries((["money","energy","relationships","goals","life","health"] as const)
      .map(key=>[key,key==="money"?moneyTemplates.map(x=>x.id):otherVideoScenes[key].map(x=>x.id)]));
    const plan=buildFreePromptStoryboard({
      prompt:wish,locale,preferredTheme:theme,availableByTheme,maxShots:3,
    });
    setFreeStoryboard(plan);
    const first=plan.shots[0];
    const firstTheme=first.theme as VideoTheme;
    setTheme(firstTheme);setVideoCategory(firstTheme as VideoCategory);
    if(firstTheme==="money")setMoneyScene(first.sceneId as MoneySceneId);
    else {setMoneyScene(null);setOtherScene(first.sceneId as LocalSceneId);}
    setShowAllMoney(true);
    if(plan.options.aspect)setAspect(plan.options.aspect as Aspect);
    if(plan.options.duration)setDuration(plan.options.duration as (typeof durations)[number]);
    if(plan.options.speed)setSpeed(plan.options.speed as Speed);
    setPreviewPlaying(false);
    setSuggestion(plan.matched?"":ui.storyboardNoMatch);
  }
  function suggestScene() {
    setFreeStoryboard(null);
    if (!wish.trim()) { setSuggestion(ui.wishMissing); return; }
    const options = theme === "money" ? moneyTemplates.map(scene=>scene.id) :
      otherVideoScenes[theme].map(scene=>scene.id);
    const recommended = suggestPersonalVideoScene({
      theme,wish,locale,availableScenes:options,
    });
    setPreviewPlaying(false);
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
    setFreeStoryboard(null);
    setTheme(next);setVideoCategory(next);setSuggestion("");setShowAllMoney(false);
    setPreviewPlaying(false); // Theme changes preserve the user's photo checkbox choice.
    if(next==="money")setMoneyScene("golden-rain");
    else {setMoneyScene(null);setOtherScene(otherVideoScenes[next][0].id);}
  };

  const resetVideoSettings=()=>{
    if(recording||preparing)return;
    setFreeStoryboard(null);
    clearUploadedAudio();
    setDuration(20);setAspect("portrait");setSpeed("slow");setBrightness("soft");
    setMusic("none");setSoundVolume(75);setCaptionMode("none");
    setAudioAuto(false);setAudioKind("all");setAudioMood("all");setAudioPace("all");
    setAudioVoiceFriendly(false);setCustomCaption("");setQuality("hd");
    setAffirmations(defaultAffirmations);
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
      document.querySelector("[data-video-photo-consent]")?.scrollIntoView({behavior:"smooth",block:"center"});
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

  return (
    <section className={videoStyles.studio} id="free-personal-video"
      data-mandala-free-video data-video-studio-mode={studioMode} lang={locale} aria-label={ui.title}>
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
        style={{position:"absolute",width:"1px",height:"1px",opacity:0,pointerEvents:"none"}}
      /> : null}


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
            onClick={()=>{setStudioMode(current=>current==="therapy"?"pump":"therapy");setNotice("");}}>
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



      <section className={videoStyles.hero} id="video-hero" data-video-mandala-hero
        data-hero-promo={!photoUrl&&!previewPlaying&&!recording?"true":"false"}
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
      {studioMode==="therapy" ? <div className={videoStyles.therapyCourse} id="guided-video-series">
      <MandalaGuidedCourse locale={locale} theme={theme}
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



      <nav className={videoStyles.editorJumpNav} data-video-editor-nav aria-label={layout.editorNavLabel}>
        <a href="#video-templates" data-video-editor-tab="design">
          <Film size={17} aria-hidden="true"/>{layout.designTab}
        </a>
        <a href="#video-audio" data-video-editor-tab="audio">
          <Music2 size={17} aria-hidden="true"/>{layout.audioTab}
        </a>
        <a href="#video-hypnosis" data-video-editor-tab="affirmations">
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
          onClick={()=>{setStudioMode("therapy");setTherapyJumpRequested(true);}}>
          {layout.therapyBannerAction}<ArrowRight size={19} aria-hidden="true"/>
        </button>
      </section>
      </> : null}

      {theme==="health" && <p data-video-health-disclaimer role="note" className={videoStyles.healthNote}>
        {locale==="ru"?"Эти спокойные видеосюжеты — для отдыха и внимания, не медицинские рекомендации.":
          locale==="es"?"Estos vídeos son para descansar y prestar atención, no son consejos médicos.":
          "These calm videos support reflection and rest; they are not medical advice."}
      </p>}
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
              onClick={()=>{setSuggestion("");if(moneyScene===money.id&&previewPlaying)setPreviewPlaying(false);
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
              onClick={()=>{setSuggestion("");setOtherScene(other.id);setPreviewPlaying(true);
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
                setSuggestion("");setPreviewPlaying(false);
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
              onChange={event=>setDuration(Number(event.currentTarget.value) as (typeof durations)[number])}>
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
        <div className={videoStyles.blockHeading}><h3 id="video-audio-heading">{layout.audioTitle}</h3>
          <p>{layout.audioHelp}</p></div>
        <fieldset className={videoStyles.musicCard} disabled={recording||preparing}>
          <legend><Music2 size={18} aria-hidden="true"/>{ui.music}</legend>
          <div className={videoStyles.audioSmartBar} data-video-audio-context>
            <div className={videoStyles.audioContextText}>
              <Sparkles size={16} aria-hidden="true"/>
              <span>{audioUi.context} <strong>{ui.themes[theme]}</strong></span>
            </div>
            <button type="button" data-video-audio-auto aria-pressed={audioAuto}
              disabled={!recommendedAudioId&&!audioAuto}
              onClick={()=>{
                if(audioAuto){setAudioAuto(false);return;}
                if(recommendedAudioId){chooseMusic(recommendedAudioId);setAudioAuto(true);}
              }}>{audioAuto?audioUi.autoOn:audioUi.automatic}</button>
          </div>
          <div className={videoStyles.audioFilters} data-video-audio-filters>
            <label>{audioUi.type}
              <select data-video-audio-kind value={audioKind}
                onChange={event=>setAudioKind(event.currentTarget.value)}>
                {Object.entries(audioUi.types).map(([id,name])=><option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label>{audioUi.mood}
              <select data-video-audio-mood value={audioMood}
                onChange={event=>setAudioMood(event.currentTarget.value)}>
                {Object.entries(audioUi.moods).map(([id,name])=><option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label>{audioUi.pace}
              <select data-video-audio-pace value={audioPace}
                onChange={event=>setAudioPace(event.currentTarget.value)}>
                {Object.entries(audioUi.paces).map(([id,name])=><option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          </div>
          <label className={videoStyles.audioVoiceOption}>
            <input data-video-audio-voice type="checkbox" checked={audioVoiceFriendly} disabled={Boolean(uploadedAudio)}
              onChange={event=>{
                const enabled=event.currentTarget.checked;
                setAudioVoiceFriendly(enabled);
                if(enabled){setSoundVolume(30);setAudioAuto(true);}
              }}/>
            <span><strong>{audioUi.voice}</strong><small>{audioUi.voiceInfo}</small></span>
          </label>
          <div className={videoStyles.audioCatalogHeading}>
            <strong>{audioMatches.length} {audioUi.count}</strong>
            <span>{audioUi.browse}</span>
          </div>
          {audioMatches.length?<div className={videoStyles.audioTrackGrid} data-video-audio-tracks>
            {audioMatches.map((track,index)=><button type="button" key={track.id}
              className={videoStyles.audioTrackTile} data-video-music={track.id}
              data-audio-kind={track.kind} aria-pressed={!uploadedAudio&&music===track.id}
              onClick={()=>{setAudioAuto(false);chooseMusic(track.id as AmbientMusic);}}>
              <span className={videoStyles.audioTileGlyph} aria-hidden="true">{track.icon}</span>
              <span className={videoStyles.audioTileText}>
                <strong>{track.name[locale]}</strong><small>{track.detail[locale]}</small>
              </span>
              {index===0?<span className={videoStyles.audioTopPick}>{audioUi.suggested}</span>:null}
              {!uploadedAudio&&music===track.id?<Check size={15} className={videoStyles.audioSelectedCheck} aria-hidden="true"/>:null}
            </button>)}
            <button type="button" className={videoStyles.audioSilentTile}
              data-video-music="none" aria-pressed={!uploadedAudio&&music==="none"}
              onClick={()=>{setAudioAuto(false);chooseMusic("none");}}>
              <span aria-hidden="true">×</span>{ui.noMusic}
            </button>
          </div>:<div className={videoStyles.audioEmpty} role="status">
            <span>{audioUi.empty}</span>
            <button type="button" onClick={()=>{setAudioKind("all");setAudioMood("all");setAudioPace("all");}}>
              {audioUi.clear}
            </button>
          </div>}
          <div className={videoStyles.audioNowPlaying} data-video-audio-now>
            <span>{audioUi.now}</span><strong>{uploadedAudio?uploadedAudio.file.name:selectedAudio?.name[locale]||ui.noMusic}</strong>
          </div>
          <div className={videoStyles.audioUpload}>
            <label htmlFor="personal-video-audio-upload" className={videoStyles.audioUploadLabel}>
              <Music2 size={16} aria-hidden="true"/>{ui.uploadAudio}
            </label>
            <input className={videoStyles.audioFileInput} id="personal-video-audio-upload" ref={audioInputRef}
              data-video-audio-upload type="file"
              accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,.mp3,.m4a,.wav,.aac,.mp4"
              disabled={recording||preparing}
              onChange={event=>chooseAudioFile(event.currentTarget.files?.[0])}/>
            <small>{ui.uploadAudioHint}</small>
            {uploadedAudio ? <div className={videoStyles.audioSelection} data-video-audio-selected>
              <span>{ui.audioFileSelected}: <strong>{uploadedAudio.file.name}</strong></span>
              <button type="button" onClick={clearUploadedAudio}
                disabled={recording||preparing}>{ui.audioRemove}</button>
            </div> : null}
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
                event.currentTarget.duration>180)setMusicWarning(ui.audioTooLong);
            }}/> : null}
          {audioPlaybackError && previewAudioUrl ? <div className={videoStyles.audioRecovery} role="alert">
            <button type="button" data-video-audio-retry className={videoStyles.audioDirectLink}
              onClick={()=>{setAudioPlaybackError(false);setMusicWarning("");}}>{ui.retryAudio}</button>
            {!uploadedAudio ? <a className={videoStyles.audioDirectLink}
              href={previewAudioUrl} target="_blank" rel="noopener noreferrer"
              data-video-audio-direct>{ui.openAudioDirect}</a> : null}
          </div> : null}
          {uploadedAudio ? <label className={videoStyles.audioRights}>
            <input type="checkbox" data-video-audio-rights checked={audioRights}
              onChange={event=>setAudioRights(event.currentTarget.checked)}
              disabled={recording||preparing}/>
            <span>{ui.audioRights}</span>
          </label> : null}
          <small>{ui.originalAudio}</small>
          <small>{ui.audioDeviceHelp}</small>
        </fieldset>
      </section>

      <section className={videoStyles.hypnosisSection} id="video-hypnosis" data-video-hypnosis-section aria-labelledby="video-hypnosis-heading">
        <div className={videoStyles.blockHeading}><h3 id="video-hypnosis-heading">{layout.hypnosisTitle}</h3>
          <p>{layout.hypnosisHelp}</p></div>
      <MandalaVideoAffirmations locale={locale} theme={theme} settings={affirmations}
        onChange={setAffirmations} disabled={recording||preparing}/>
      <section className={videoStyles.wishPanel} data-video-intent aria-labelledby="video-wish-heading">
        <label id="video-wish-heading" htmlFor="personal-video-wish">{ui.wishTitle}</label>
        <textarea id="personal-video-wish" data-video-wish rows={2} maxLength={160}
          value={wish} placeholder={ui.wishPlaceholder} disabled={recording||preparing}
          onChange={event=>{setWish(graphemeTrim(event.currentTarget.value));setSuggestion("");}} />
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
      <button type="button" className={videoStyles.affirmationPreviewAction}
        data-video-affirmation-preview disabled={recording||preparing} onClick={openAffirmationPreview}>
        <Play size={20} fill="currentColor" aria-hidden="true"/>
        {layout.previewCta}
        <ArrowRight size={20} aria-hidden="true"/>
      </button>
      <small className={videoStyles.affirmationPreviewHelp}>{layout.previewHelp}</small>
      </section>

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
                data-video-duration={n} onClick={()=>setDuration(n)}>{n} {ui.seconds}</button>)}
            </div>
          </fieldset>
          <fieldset className={videoStyles.settingCard} disabled={recording||preparing}>
            <legend>{ui.format}</legend>
            <div className={videoStyles.pills}>
              {(["portrait","square","landscape"] as Aspect[]).map((format,i)=>
                <button type="button" key={format} data-video-aspect={format}
                  aria-pressed={aspect===format}
                  onClick={()=>setAspect(format)} onPointerUp={()=>setAspect(format)}>
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
      {photoUrl && !backgroundOnly ? (
        <label className={videoStyles.consent}>
          <input type="checkbox" data-video-photo-consent checked={photoConsent}
            disabled={recording||preparing} onChange={event=>{
              const approved=event.target.checked;
              setPhotoConsent(approved);
              if(approved)primeNativeMasterFromUserGesture();
            }}/>
          <span>{ui.consent}</span>
        </label>
      ) : null}
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

      <section className={videoStyles.result} id="personal-video-result" data-video-result>
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
          </>
        ):<p>{ui.myVideosInfo}</p>}
      </section>


    </section>
  );
}
