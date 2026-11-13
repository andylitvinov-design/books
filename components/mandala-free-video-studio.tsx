"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { flushSync } from "react-dom";
import { ArrowRight, Brain, BarChart3, Camera, Check, ChevronDown, ChevronRight, ListVideo, RefreshCw, Coins, Download, Film, HandHeart, Headphones, Heart, HeartPulse, Leaf, Sprout, Music2, AudioLines, Clock3, Smile, Paperclip, Search, Mic, Pause, Play, Share2, Scissors, SlidersHorizontal, Sparkles, Target, TestTubeDiagonal, Zap, X, Save, FolderOpen, Type, MessageCircleQuestion } from "lucide-react";
import { moneyScenes } from "@/lib/mandala/money-flow-effects";
import freeSceneTaxonomy from "@/data/video-catalog/scene-taxonomy.json";
import originalMotionLibrary from "@/data/video-catalog/original-motion-scenes-v1.json";
import extraFreeFilmPresets from "@/data/video-catalog/free-film-presets-v2.json";
import { MandalaHypnoCompact } from "./mandala-hypno-compact";
import { MandalaVideoIdeas } from "./mandala-video-ideas";
import {MandalaVideoPersonalization,DEFAULT_VIDEO_GOAL_PROFILE,summarizeVideoGoalProfile,type VideoGoalProfile} from "./mandala-video-personalization";
import { HeaderCreditProfile } from "./header-credit-profile";
import { MandalaVideoConcept, type ApprovedVideoConcept } from "./mandala-video-concept";

import type { HypnoLightSettings } from "./mandala-hypnocorrection-mobile";
import { paintHypnoLightOverlay, recommendHypnoLight } from "@/lib/mandala/hypno-visual-overlay.mjs";
import { MandalaFreeVideoGenerator } from "./mandala-free-video-generator";
import {planAudioVisualStoryboard} from "@/lib/mandala/audio-visual-storyboard.mjs";
import {suggestVideoConcept} from "@/lib/mandala/auto-video-concept.mjs";
import {createPreviewGainGroup} from "@/lib/mandala/preview-volume";
import type {PreviewGainGroup} from "@/lib/mandala/preview-volume";
import {deriveAudioVideoConcept} from "@/lib/mandala/audio-concept-director.mjs";
import {consumeVoiceStudioHandoff} from "@/lib/mandala/voice-studio-handoff.mjs";
import {requestConsentedTimedTranscript} from "@/lib/mandala/consented-audio-stt";
import {startDeviceVoiceCapture,transcribeDeviceAudioFile} from "@/lib/mandala/device-audio-stt.mjs";
import type {TimedSpeechTranscript,AudioVisualPlan} from "@/lib/mandala/audio-visual-storyboard.mjs";
import { MandalaVideoDelivery } from "./mandala-video-delivery";
import { MandalaVideoReady } from "./mandala-video-ready";
import {appFetch} from "@/lib/app/client-fetch";
import {paintVideoBrandStamp,resolveVideoExportVariant,canOfferOriginalVideoSource} from "@/lib/mandala/video-branding.mjs";
import type {VideoExportVariant,VideoExportCapability} from "@/lib/mandala/video-branding.mjs";
import { MandalaVideoEffectJourney } from "./mandala-video-effect-journey";
import { paintFreeVideoFrame } from "@/lib/mandala/free-video-renderer";
import type { FreeVideoPlan } from "@/lib/mandala/free-video-renderer";
import { MandalaAutoVideoDirector } from "./mandala-auto-video-director";

import { MandalaProfessionalPromo } from "./mandala-professional-promo";
import type { MandalaProfessionalSource } from "./mandala-meditation-client";
import { availableStoryScene, storySelectionItems } from "@/lib/mandala/story-addon-catalog";
import type { StorySelection, StoryAddonKind } from "@/lib/mandala/story-addon-catalog";
import { paintFreeGreeting, FREE_GREETING_DURATION } from "@/lib/mandala/free-greeting-overlay.mjs";
import type { FreeGreetingCharacter } from "@/lib/mandala/free-greeting-overlay.mjs";
import { MandalaFreeGreeting } from "./mandala-free-greeting";
import type { CinematicStoryboard } from "./mandala-cinematic-director";
import type { GuidedMeditationFocus } from "./mandala-guided-course";


import { MandalaAffirmationVoice } from "./mandala-affirmation-voice";
import type { AffirmationVoiceResult, AffirmationVoicePreferences } from "./mandala-affirmation-voice";
import { createHypnoAudioEffectFile } from "@/lib/mandala/hypno-audio-effects";
import { affirmationNarrationText, isApprovedAffirmationNarration, wavDurationFromHeader } from "@/lib/mandala/affirmation-voice.mjs";
import { defaultAffirmations, linesForVideoAffirmations, paintVideoAffirmations, suggestedVideoAffirmations } from "@/lib/mandala/video-affirmations";
import type { AffirmationSettings } from "@/lib/mandala/video-affirmations";
import { suggestPersonalVideoScene, captionFromWish, graphemeTrim } from "@/lib/mandala/personal-video-intent.mjs";
import { cinematicPreviewSeconds, buildCinematicStoryboard } from "@/lib/mandala/cinematic-director.mjs";
import { FIRST_VIDEO_FOOD_CANVAS_PLAN_VERSION } from "@/lib/mandala/first-video-director.mjs";
import { allocateFreeFilmTimeline, allocateAdaptiveFilmTimeline, allocateSourceBoundedFilmTimeline, allocateVariableFilmTimeline, shiftAdaptiveFilmBoundary, shiftVariableFilmBoundary, reframeCinematicPlan } from "@/lib/mandala/free-film-timeline.mjs";
import {validateMontageClips,isSafeMontageScene} from "@/lib/mandala/video-montage-sources.mjs";
import {isReviewedFilmedStoryScene} from "@/lib/mandala/reviewed-filmed-story.mjs";
import {autoFillApprovedFilm} from "@/lib/mandala/auto-fill-approved-film.mjs";
import {normalizeStageCaption,stageCaptionAt} from "@/lib/mandala/stage-caption-track.mjs";
import {pickSingleVideoTextSource} from "@/lib/mandala/single-video-text-track.mjs";
import {clampTrackSecond,timedCaptionAt,splitTimelineCaption,duplicateTimelineCaption} from "@/lib/mandala/editable-timeline.mjs";
import {distributeMontageSetups,isMontageSetupClip,reorderMontageSetups,retimeMontageSetups} from "@/lib/mandala/creative-editor-setups.mjs";
import {paintCreativeTimelineShot,CREATIVE_TRANSITIONS,CREATIVE_LOOKS} from "@/lib/mandala/creative-timeline-effects.mjs";
import {emptyMyTubeEditorHistory,recordMyTubeEditorUndo,undoMyTubeEditor,redoMyTubeEditor} from "@/lib/mandala/creative-editor-history.mjs";
import {createMyTubeEditorDraft,parseMyTubeEditorDraft,MYTUBE_DRAFT_MAX_BYTES} from "@/lib/mandala/creative-editor-draft.mjs";
import {captionAnimationFrame,importSrtCaptionClips,exportSrtCaptionClips,CAPTION_SRT_BYTES} from "@/lib/mandala/creative-editor-captions.mjs";
import {audioTransientScores,recommendSmartAudioCuts,SMART_CUT_MAX_AUDIO_BYTES} from "@/lib/mandala/creative-editor-smart-cut.mjs";
import {extractMyTubeWaveform,MYTUBE_WAVEFORM_MAX_FILE_BYTES,
  MYTUBE_WAVEFORM_MAX_AUDIO_SECONDS} from "@/lib/mandala/creative-editor-waveform.mjs";
import {MYTUBE_MUSIC_BEDS,MYTUBE_REVIEWED_MUSIC_BEDS,MYTUBE_BED_FADES,validateMyTubeMusicBed} from "@/lib/mandala/creative-editor-audio-lanes.mjs";
import type {MyTubeMusicBed} from "@/lib/mandala/creative-editor-audio-lanes.mjs";
import {paintMyTubeMotion,validateMyTubeMotion} from "@/lib/mandala/creative-editor-keyframes.mjs";
import type {MyTubeMotion} from "@/lib/mandala/creative-editor-keyframes.mjs";
import type {TimelineTextClip,TimelineTransition,TimelineLook} from "./mandala-multitrack-timeline";
import { paintCinematicMoneyFrame, paintRealMoneyVideoFrame } from "@/lib/mandala/cinematic-money-video";
import { getRealMoneyFilm } from "@/lib/mandala/real-money-film-library";
import { getThemedRealFilm } from "@/lib/mandala/film-collection-v2";
import type { FilmSource } from "@/lib/mandala/film-collection-v2";
import { otherVideoScenes, paintThemedVideoFrame, paintRealThemedVideoFrame } from "@/lib/mandala/holistic-video-themes";
import type { LocalSceneId, OtherTheme, VideoTheme } from "@/lib/mandala/holistic-video-themes";
import { acquirePlaybackSession, isSupportedLocalAudio, presetAudioUrl, startPresetAudio, startPresetMixAudio, startUploadedAudio, startLayeredVideoAudio } from "@/lib/mandala/local-video-music";
import {consumeMessengerAudio} from "@/lib/mandala/messenger-audio-video-handoff.mjs";
import type { AmbientMusic, AmbientSession } from "@/lib/mandala/local-video-music";
import { mandalaAudioTracks } from "@/lib/mandala/audio-recommendations.mjs";
import { SCENARIO_AUDIO_REGISTRY, scenarioAudioTracks, classicalAudioTracks } from "@/lib/mandala/scenario-audio-catalog.mjs";
import {rankPersonalMusic} from "@/lib/mandala/music-match.mjs";
import { getGoalTreeAudioChoices } from "@/lib/mandala/goal-tree-audio-playlists.mjs";
import {curatedAudioTracks,recommendCuratedAudio,curatedAudioMatchesCategory,inferVideoAudioCategory} from "@/lib/mandala/curated-audio-recommendations.mjs";
import type { MoneySceneId } from "@/lib/mandala/money-flow-effects";
import { orderRecordingMimes, proceduralMp4Route, selectWebCodecsForRecording, shouldAutoRecoverSafariPlayback } from "@/lib/mandala/recording-codecs.mjs";
import { prepareFourFilmSources } from "@/lib/mandala/free-film-source-loader.mjs";
import {verifiedCategorySource,verifiedSceneAspect,canonicalSourceMasterKey} from "@/lib/mandala/category-video-storyboard.mjs";
import { ensureDecodedVideoOnUserIntent } from "@/lib/mandala/intent-video-loading.mjs";
import { resolveLicensedSourceFrame, assessLicensedSourceFrame,validateLicensedSourcePlayback } from "@/lib/mandala/free-film-source-clock.mjs";

import type { PublicLocale } from "@/lib/public-locales";
import {fetchVideoCreditCatalog,fetchVideoCreditStatus,
  postVideoCreditAction,releaseVideoCreditOnExit} from "@/lib/video-credits/client.mjs";
import {readyBasicVideoAccess} from "@/lib/video-credits/ready-basic-eligibility.mjs";
import { SUPPORT_PHOTO_ACCEPT } from "@/lib/mandala/prepare-browser-photo";
import {getStoryFormatCopy} from "@/lib/mandala/stories-studio.mjs";
import styles from "./mandala-meditation.module.css";
import videoStyles from "./mandala-video-mobile.module.css";

// First-screen player and Auto Video Director remain eager. Optional workspaces
// and collapsed tools download on interaction, reducing initial JS on mobile.
const MandalaHypnocorrectionMobile = dynamic(() => import("./mandala-hypnocorrection-mobile").then(module => module.MandalaHypnocorrectionMobile));
const MandalaGuidedCourse = dynamic(() => import("./mandala-guided-course").then(module => module.MandalaGuidedCourse));
const MandalaCinematicDirector = dynamic(() => import("./mandala-cinematic-director").then(module => module.MandalaCinematicDirector));
const MandalaAutomaticStoryboard = dynamic(() => import("./mandala-automatic-storyboard").then(module => module.MandalaAutomaticStoryboard));
const MandalaVideoDirectorChat = dynamic(() => import("./mandala-video-director-chat").then(module => module.MandalaVideoDirectorChat));
const MandalaFirstVideoStart = dynamic(() => import("./mandala-first-video-start").then(module => module.MandalaFirstVideoStart));
const MandalaStoriesCharacters = dynamic(() => import("./mandala-stories-characters").then(module => module.MandalaStoriesCharacters));
const MandalaProEnhance = dynamic(() => import("./mandala-pro-enhance").then(module => module.MandalaProEnhance));
const MandalaMontageProOffer = dynamic(() => import("./mandala-montage-pro-offer").then(module => module.MandalaMontageProOffer));
const MandalaPersonalMeditation = dynamic(() => import("./mandala-personal-meditation").then(module => module.MandalaPersonalMeditation));
const MandalaCloudVoiceStudio = dynamic(() => import("./mandala-cloud-voice-studio").then(module => module.MandalaCloudVoiceStudio));
const MandalaPhraseCatalog = dynamic(() => import("./mandala-phrase-catalog").then(module => module.MandalaPhraseCatalog));
const MandalaMultiTrackTimeline = dynamic(() => import("./mandala-multitrack-timeline").then(module => module.MandalaMultiTrackTimeline));

type Effect = "glow" | "energy" | "prosperity" | "temple";
const BACKGROUND_CLIP="local-money-background-only";
type Aspect = "square" | "portrait" | "landscape";
type Quality = "hd" | "fullhd";
type Result =
  | { url: string; extension: "mp4" | "webm"; bytes: number; blob: Blob; mime: string; brandVariant: VideoExportVariant; mode?: never }
  | { url: string; extension: "mp4"; bytes: 0; mime: "video/mp4"; mode: "catalog" };
type StudioWorkspace = "video" | "phrases" | "effects" | "practices" | "pro" | "editor" | "ready";
type Speed = "slow" | "dynamic";
type Brightness = "soft" | "bright";
type CaptionMode = "none" | "theme" | "custom";
type EditorHistorySnapshot={
  plan:CinematicStoryboard|null;
  captions:TimelineTextClip[]|null;
  audioOffset:number;
  aspect:Aspect;
  duration:10|15|20|30|60;
  musicBed:MyTubeMusicBed;
};
type EditorHistoryState={
  past:EditorHistorySnapshot[];future:EditorHistorySnapshot[];
  lastKind:string|null;lastAt:number;
};
type ImportedEditorDraft={
  presetId:string;aspect:Aspect;durationSeconds:10|15|20|30|60;
  shots:{sceneId:string;startSeconds:number;durationSeconds:number;captionText:string;
    transitionIn:TimelineTransition;colorLook:TimelineLook;motion?:MyTubeMotion|null;
    sourcePhasePercent?:number;sourceSpeed?:number}[];
  captions:TimelineTextClip[]|null;audioStartSeconds:number;
  musicBed?:MyTubeMusicBed;
};
// A selected sound is only a preview; attaching it is a separate, explicit step.
type PresetId = Exclude<AmbientMusic,"none">;
type AttachedAudio = {kind:"preset";id:PresetId} | {kind:"presets";ids:PresetId[]} | {kind:"file";file:File;id:string;narration?:true;spokenText?:string;speechSeconds?:number;mixSeconds?:number;nonLoop?:true;voiceId?:string;language?:string;bed?:string};
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


const workspaceCopy = {
 ru:{
  video:{tab:"Цель",title:"Цель видео",desc:"Реальные видеосюжеты, атмосфера и оформление."},
  phrases:{tab:"Идеи",title:"Идеи для видео",desc:"Мой запрос, фразы поддержки и, по желанию, голос и музыка."},
  effects:{tab:"Гипноэффект",title:"Гипноэффекты",desc:"Мягкие визуальные и звуковые эффекты с честной пометкой экспериментальных функций."},
  practices:{tab:"Курс практик",title:"Курсы и практики",desc:"Выберите фокус, создайте медитацию, практику и личную программу из восьми сессий."},
  pro:{tab:"PRO",title:"PRO генерация",desc:"Персонажи, сюжеты, места и профессиональный режиссёрский бриф."},
  ready:{tab:"Ready",title:"Видео готово",desc:"Просмотр, сохранение и развитие практики."},
  editor:{tab:"Монтаж",title:"Быстрая генерация",desc:"Видеостиль, фото, голос и музыка — основные настройки видео."}
 },
 en:{
  video:{tab:"Goal",title:"Video goal",desc:"Real film scenes, atmosphere and visual direction."},
  phrases:{tab:"Ideas",title:"Video ideas",desc:"Your intention, support phrases and optional voice or music."},
  effects:{tab:"Hypno effect",title:"Hypno effects",desc:"Optional gentle visual and sound effects, with experimental features labelled."},
  practices:{tab:"Practice course",title:"Courses & practices",desc:"Choose your focus, create a meditation and practice, then explore eight guided sessions."},
  pro:{tab:"PRO",title:"PRO generation",desc:"Characters, stories, locations and advanced direction."},
  ready:{tab:"Ready",title:"Your video is ready",desc:"Preview, save and continue your practice."},
  editor:{tab:"Montage",title:"Quick generation",desc:"Video styles, photo, voice and music — the essential settings."}
 },
 es:{
  video:{tab:"Objetivo",title:"Objetivo del vídeo",desc:"Escenas reales, ambiente y estilo visual."},
  phrases:{tab:"Ideas",title:"Ideas para vídeo",desc:"Tu intención, frases de apoyo y voz o música opcionales."},
  effects:{tab:"Efecto hipno",title:"Efectos de hipnosis",desc:"Efectos suaves y opcionales claramente identificados."},
  practices:{tab:"Curso práctico",title:"Cursos y prácticas",desc:"Elige tu enfoque, crea una meditación y una práctica, y descubre ocho sesiones guiadas."},
  pro:{tab:"PRO",title:"Generación PRO",desc:"Personajes, historias, lugares y dirección avanzada."},
  ready:{tab:"Ready",title:"Tu vídeo está listo",desc:"Mira, guarda y continúa tu práctica."},
  editor:{tab:"Montaje",title:"Generación rápida",desc:"Estilos de vídeo, foto, voz y música."}
 }
} as const;
// One row, six real existing workspace destinations. No anchor-only navigation.
const workspaceTabs=[
 {id:"video",Icon:Film},{id:"phrases",Icon:Heart},
 {id:"editor",Icon:Scissors},{id:"effects",Icon:Sparkles},
 {id:"pro",Icon:Zap},{id:"ready",Icon:Check}
] as const;
const mobileWorkspaceCopy={
 ru:{video:"Цель",editor:"Монтаж",phrases:"Идеи",effects:"Гипно",practices:"Курс",pro:"PRO",ready:"Ready"},
 en:{video:"Goal",editor:"Montage",phrases:"Ideas",effects:"Hypno",practices:"Course",pro:"PRO",ready:"Ready"},
 es:{video:"Objetivo",editor:"Montaje",phrases:"Ideas",effects:"Hipno",practices:"Curso",pro:"PRO",ready:"Ready"}
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
    brightness:"Brightness",soft:"Soft",bright:"Bright",music:"Original instrumental music",noMusic:"Silent",
    musicNames:{harmony:"Harmony",prosperity:"Prosperity",energy:"Energy",love:"Love",meditation:"Meditation"},
    originalAudio:"Only reviewed, licensed music recordings are offered for new videos. Add your own audio with rights confirmation; older soundtracks remain in saved projects.",
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
    advanced:"Mandala & guided meditations",photoError:"Try a JPG, PNG, WebP or HEIC/HEIF photo up to 25 MB, supported by this device.",
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
    brightness:"Яркость",soft:"Мягкая",bright:"Яркая",music:"Красивая инструментальная музыка",noMusic:"Без звука",
    musicNames:{harmony:"Гармония",prosperity:"Процветание",energy:"Энергия",love:"Любовь",meditation:"Медитация"},
    originalAudio:"Для новых видео доступны только проверенные лицензированные музыкальные записи. Можно загрузить своё аудио с подтверждением прав; старые дорожки сохраняются в проектах.",
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
    advanced:"Мандала и авторские медитации",photoError:"Загрузите JPG, PNG, WebP или HEIC/HEIF до 25 МБ при поддержке устройства.",
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
    brightness:"Brillo",soft:"Suave",bright:"Vivo",music:"Melodías instrumentales",noMusic:"Sin sonido",
    musicNames:{harmony:"Armonía",prosperity:"Prosperidad",energy:"Energía",love:"Amor",meditation:"Meditación"},
    originalAudio:"Los vídeos nuevos ofrecen solo grabaciones musicales revisadas y autorizadas. Puedes añadir audio propio con derechos confirmados; las pistas antiguas siguen en tus proyectos.",
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
    advanced:"Mandala y meditaciones originales",photoError:"Usa JPG, PNG, WebP o HEIC/HEIF de hasta 25 MB si tu dispositivo lo admite.",
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
    type:"Music and accompaniment",mood:"Mood",pace:"Tempo",
    types:{all:"All tracks",melody:"Beautiful melodies",tones:"Ambient textures",nature:"Nature sounds · optional",pulse:"Soft rhythm · optional"},
    moods:{all:"Any mood",calm:"Calm",focus:"Focus",uplift:"Inspiration"},
    paces:{all:"Any pace",slow:"Slow",steady:"Steady",active:"Energizing"},
    voice:"Soft sound for a later voiceover",voiceInfo:"Quiet tracks at 30%. Only one soundtrack exports; voice and music are not mixed here.",
    suggested:"Best for this topic",browse:"Explore the melodies",count:"tracks",melodyCount:"melodies",
    empty:"No melodies match these filters.",clear:"Clear filters",now:"Selected music",
    search:"Find a melody…",sort:"Sort",byTopic:"Best match",byName:"Name A–Z",
    videoLength:"Video length",loop:"32-second original compositions · gentle looping",showMore:"More melodies",showLess:"Show fewer",
    pick:"Select",picked:"Selected",attach:"Attach to video",attached:"Attached to video",
    detach:"Remove from video",needsAttach:"Select a sound and tap Attach to video before export.",
    applied:"Sound is attached to this video setup. Create the video again to save a file with this sound.",
    chooseFirst:"Choose a melody",noAudioInfo:"No melody attached. Choose music or create a silent video.",
    attachedLabel:"On video",noAttached:"No sound attached",
    recordVoice:"Record my voice",stopVoice:"Finish recording",recordUnavailable:"Microphone is unavailable here. Try Safari or upload an audio file.",
    recordFailed:"Could not record audio. Check microphone permission or use Files.",
    recordTooLarge:"Recording exceeded 15 MB or 3 minutes. Please make a shorter recording.",
    fileReady:"Voice recorded locally. Confirm audio permission and attach it to the video.",helpTitle:"Audio playback help",
  },
  ru: {
    context:"Под вашу тему",automatic:"Умный подбор",autoOn:"Подобрано по теме",topic:"Тема",favorite:"В избранное",unfavorite:"Убрать из избранного",byFavorites:"Сначала избранные",
    type:"Музыкальный стиль",mood:"Настрой",pace:"Темп",
    types:{all:"Все дорожки",melody:"Красивые мелодии",tones:"Звуковые фактуры",nature:"Звуки природы · дополнительно",pulse:"Ритм · дополнительно"},
    moods:{all:"Любой",calm:"Успокоение",focus:"Концентрация",uplift:"Вдохновение"},
    paces:{all:"Любой",slow:"Медленный",steady:"Ровный",active:"Бодрый"},
    voice:"Мягкий фон для будущей озвучки",voiceInfo:"Спокойные треки, громкость 30%. Голос и музыка пока не накладываются одновременно.",
    suggested:"Лучше подходит",browse:"Послушайте мелодии",count:"дорожек",melodyCount:"мелодии",
    empty:"По этим настройкам мелодий нет.",clear:"Сбросить фильтры",now:"Выбранная мелодия",
    search:"Найти мелодию…",sort:"Сортировка",byTopic:"Подходящие",byName:"По названию",
    videoLength:"Длина видео",loop:"Авторские музыкальные композиции по 32 секунды",showMore:"Больше мелодий",showLess:"Свернуть список",
    pick:"Выбрать",picked:"Выбран",attach:"Прикрепить к видео",attached:"Прикреплено к видео",
    detach:"Убрать звук из видео",needsAttach:"Выберите дорожку и нажмите «Прикрепить к видео» перед сохранением.",
    applied:"Дорожка прикреплена к настройкам ролика. Создайте видео заново, чтобы получить файл со звуком.",
    chooseFirst:"Выберите мелодию",noAudioInfo:"Мелодия не прикреплена. Выберите музыку или создайте видео без звука.",
    attachedLabel:"В видео",noAttached:"Без звука",
    recordVoice:"Записать голос",stopVoice:"Завершить запись",recordUnavailable:"Микрофон недоступен. Откройте Safari или загрузите аудио из «Файлов».",
    recordFailed:"Записать голос не удалось. Проверьте разрешение на микрофон или загрузите файл.",
    recordTooLarge:"Запись больше 15 МБ или 3 минут. Попробуйте короче.",
    fileReady:"Голос записан на устройстве. Подтвердите право и прикрепите его к видео.",helpTitle:"Если звук не слышен",
  },
  es: {
    context:"Para el tema elegido",automatic:"Selección inteligente",autoOn:"Según el tema",topic:"Tema",favorite:"Favorito",unfavorite:"Quitar favorito",byFavorites:"Primero favoritos",
    type:"Música y acompañamiento",mood:"Ambiente",pace:"Ritmo",
    types:{all:"Todas las pistas",melody:"Melodías bonitas",tones:"Texturas suaves",nature:"Naturaleza · opcional",pulse:"Ritmo · opcional"},
    moods:{all:"Cualquiera",calm:"Calma",focus:"Concentración",uplift:"Inspiración"},
    paces:{all:"Cualquiera",slow:"Lento",steady:"Regular",active:"Dinámico"},
    voice:"Fondo suave para añadir voz después",voiceInfo:"Pistas suaves al 30%. Por ahora solo se exporta una pista de audio.",
    suggested:"Recomendado",browse:"Explora las melodías",count:"pistas",melodyCount:"melodías",
    empty:"No hay melodías con estos filtros.",clear:"Restablecer filtros",now:"Melodía elegida",
    search:"Buscar melodía…",sort:"Orden",byTopic:"Recomendados",byName:"Nombre A–Z",
    videoLength:"Duración del vídeo",loop:"Composiciones originales de 32 segundos",showMore:"Más melodías",showLess:"Mostrar menos",
    pick:"Elegir",picked:"Elegido",attach:"Adjuntar al vídeo",attached:"Adjunto al vídeo",
    detach:"Quitar sonido del vídeo",needsAttach:"Elige un sonido y pulsa Adjuntar antes de guardar el vídeo.",
    applied:"Audio adjunto a este vídeo. Créalo de nuevo para guardar el archivo con sonido.",
    chooseFirst:"Elige una melodía",noAudioInfo:"No hay melodía adjunta. Elige música o crea un vídeo sin sonido.",
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
type FreeFilmPreset = {id:string;theme:VideoTheme;label:Record<VideoLocale,string>;clips:readonly string[];portraitClips?:readonly string[]};
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
  },
  ...(extraFreeFilmPresets.presets as FreeFilmPreset[]),
  ...(originalMotionLibrary.presets as unknown as FreeFilmPreset[]),
] as const;
const ORIGINAL_MOTION_SCENES = originalMotionLibrary.scenes as unknown as typeof freeSceneTaxonomy.scenes;
const FREE_FILM_CATALOG = [...freeSceneTaxonomy.scenes,...ORIGINAL_MOTION_SCENES];
const FREE_FILM_CATALOG_BY_ID = new Map(FREE_FILM_CATALOG.map(scene=>[scene.id,scene]));
const FREE_FILM_CLIP_THEMES:Record<string,VideoTheme> = Object.fromEntries(
  FREE_FILM_CATALOG.filter(scene=>scene.status==="approved").map(scene=>[scene.id,scene.theme])
) as Record<string,VideoTheme>;
function firstPartyFilmFor(theme:VideoTheme,id:string):{src:string;poster:string}|null {
  // Preserve photographed stock and expose original procedural motion separately.
  const motion=ORIGINAL_MOTION_SCENES.find(s=>s.id===id&&s.theme===theme&&s.status==="approved");
  if(motion)return {src:motion.video,poster:motion.poster};
  if(theme==="money")return getRealMoneyFilm(id as MoneySceneId)||getThemedRealFilm(theme,id as LocalSceneId);
  return getThemedRealFilm(theme,id as LocalSceneId);
}
type EmotionalCutMetadata={sceneId:string;beatIndex:number;strategyId:string;requiredTags:readonly string[]};
type EmotionalVideoEdit={pathId:string;emotionalAxisId:string;pace:"gentle"|"steady";
  shots:readonly EmotionalCutMetadata[]};
type FreeFilmCompilationEdit={
  clipIds:readonly string[];durationSecondsByStage:readonly number[];
  captionTexts:readonly string[];excludedMotifs?:readonly string[];
  semanticScenePlan?:EmotionalVideoEdit;
};
function compileFreeFilmPreset(
  preset:FreeFilmPreset,locale:VideoLocale,durationSeconds:number,aspect:Aspect,
  edit?:FreeFilmCompilationEdit,
):CinematicStoryboard {
  // Both legacy four cuts and adaptive 4–12 cuts use the SAME Canvas/MP4 engine.
  // A semantic plan cannot bypass trusted physical source, format or rights checks.
  // Prefer the owner's four approved beats, but never stretch a short MP4.
  // Unedited presets can add vetted, separate source masters in 9:16. User
  // edits/semantic plots are never silently replaced with a different film.
  let clipIds:readonly string[]=edit?.clipIds??
    (aspect==="portrait"&&preset.portraitClips?preset.portraitClips:preset.clips);
  let adaptive=clipIds.length!==4;
  if(!edit&&clipIds.length===4){
    const certified=FREE_FILM_CATALOG.flatMap(source=>{
      const scene=verifiedCategorySource(source);
      if(!scene||!isSafeMontageScene(source)||!verifiedSceneAspect(scene,aspect)||
         !firstPartyFilmFor(source.theme as VideoTheme,scene.id))return [];
      const masterKey=canonicalSourceMasterKey(scene);
      if(!masterKey)return [];
      return [{
        id:scene.id,theme:source.theme,durationSeconds:scene.durationSeconds,
        certified:true,masterKey,media:source.media,
        sourceId:"sourceId" in source&&typeof source.sourceId==="string"?source.sourceId:"", 
        origins:Array.isArray(scene.originMasterKeys)?scene.originMasterKeys:[],
        group:typeof scene.perceptualGroupId==="string"?scene.perceptualGroupId:null,
        tags:[...source.tags],motifs:[...source.motifs]
      }];
    });
    const legacyStageSeconds=allocateAdaptiveFilmTimeline(durationSeconds,[...clipIds])
      .map(shot=>shot.durationSeconds);
    const filled=autoFillApprovedFilm({initialIds:[...clipIds],scenes:certified,
      theme:preset.theme,durationSeconds,legacyStageSeconds});
    if(!filled.ok)throw Error("AUTO_FILM_"+filled.code);
    clipIds=filled.clipIds;
    adaptive=filled.usedVariableTiming||clipIds.length!==4;
  }
  if(!validateMontageClips([...clipIds],FREE_FILM_CATALOG,
    [...(edit?.excludedMotifs??[])],aspect,adaptive))
    throw Error("invalid_free_film_replacement");
  if(edit&&(!Array.isArray(edit.captionTexts)||edit.captionTexts.length!==clipIds.length||
     edit.captionTexts.some(value=>typeof value!=="string")))
    throw Error("invalid_stage_caption_track");
  const semantic=edit?.semanticScenePlan;
  if(semantic){
    if(!/^[a-z0-9_-]+(?:::[a-z0-9_-]+){3}$/.test(semantic.pathId)||
      !/^ev64:[a-z_]+>[a-z_]+$/.test(semantic.emotionalAxisId)||
      !["gentle","steady"].includes(semantic.pace)||
      !Array.isArray(semantic.shots)||semantic.shots.length!==clipIds.length||
      semantic.shots.some((shot,index)=>shot.sceneId!==clipIds[index]||
        !Number.isInteger(shot.beatIndex)||shot.beatIndex<1||shot.beatIndex>4||
        !/^S0[1-8]$/.test(shot.strategyId)||
        !Array.isArray(shot.requiredTags)||shot.requiredTags.length===0||
        shot.requiredTags.length>12||shot.requiredTags.some((tag:string)=>typeof tag!=="string"||
          !/^[a-z][a-z0-9-]{1,32}$/.test(tag))))
      throw Error("invalid_emotional_video_scene_script");
  }
  const captions=edit?.captionTexts??Array.from({length:clipIds.length},()=>"");
  const verified=clipIds.map(id=>verifiedCategorySource(FREE_FILM_CATALOG_BY_ID.get(id)));
  const timings=adaptive
    ?allocateVariableFilmTimeline(durationSeconds,[...clipIds],edit?.durationSecondsByStage??null)
    :allocateSourceBoundedFilmTimeline(durationSeconds,[...clipIds],
      verified.map(scene=>scene?.durationSeconds??NaN),edit?.durationSecondsByStage??null);
  if(verified.some((scene,index)=>!scene||!verifiedSceneAspect(scene,aspect)||
    !Number.isFinite(scene.durationSeconds)||
    scene.durationSeconds<timings[index].durationSeconds))
    throw Error("UNVERIFIED_FOOTAGE_ASPECT_DURATION_OR_REUSE");
  if(semantic&&!semantic.shots.every((shot,index)=>{
    const source=verified[index];
    if(!source)return false;
    const mediaTags=new Set([...(source.tags||[]),...(source.motifs||[]),
      source.label?.en||"",source.description?.en||""].join(" ")
      .toLowerCase().match(/[a-z][a-z0-9]{2,}/g)||[]);
    return shot.requiredTags.some(tag=>mediaTags.has(tag));
  }))throw Error("emotional_stage_media_tag_mismatch");
  const originKeys=verified.map(scene=>canonicalSourceMasterKey(scene));
  if(originKeys.some(key=>!key)||new Set(originKeys).size!==clipIds.length)
    throw Error("UNVERIFIED_FOOTAGE_ASPECT_DURATION_OR_REUSE");
  // Cropped copies of the SAME filmed source can have different file hashes.
  // Enforce every declared master key, not only the chosen canonical key.
  const allOrigins=verified.flatMap(scene=>Array.from(new Set(
    Array.isArray(scene?.originMasterKeys)&&scene.originMasterKeys.length
      ?scene.originMasterKeys:[canonicalSourceMasterKey(scene)])));
  const visualGroups=verified.map(scene=>scene?.perceptualGroupId)
    .filter((id):id is string=>typeof id==="string"&&Boolean(id));
  if(new Set(allOrigins).size!==allOrigins.length||
     new Set(visualGroups).size!==visualGroups.length)
    throw Error("UNVERIFIED_FOOTAGE_ASPECT_DURATION_OR_REUSE");
  const base=buildCinematicStoryboard({
    theme:preset.theme,locale,style:"nature",aspect,durationSeconds:20
  });
  if(base.shots.length!==4)throw Error("invalid_free_film_base_shot_count");
  const count=clipIds.length;
  const shots=timings.map((timing,i)=>{
    const frame=base.shots[Math.min(3,Math.floor(i*4/count))];
    const sceneId=timing.sceneId,shotTheme=FREE_FILM_CLIP_THEMES[sceneId];
    if(!shotTheme||!firstPartyFilmFor(shotTheme,sceneId))
      throw Error("unavailable_free_film_clip");
    return {...frame,id:"licensed-cut-"+(i+1),number:i+1,sceneId,theme:shotTheme,
      visualCue:preset.label.en,
      startSeconds:timing.startSeconds,durationSeconds:timing.durationSeconds,
      overlayText:normalizeStageCaption(captions[i]),providerPrompt:"",
      ...(semantic?{emotionalStageId:semantic.shots[i].strategyId,
        beatIndex:semantic.shots[i].beatIndex,
        requiredTags:[...semantic.shots[i].requiredTags]}:{})};
  });
  return {...base,shotCount:count,version:FREE_FILM_PLAN_VERSION,timelineMode:"adaptive",
    durationSeconds,shots,
    sceneChoices:shots.map(shot=>({
      sceneId:shot.sceneId,theme:shot.theme,visualCue:shot.visualCue
    })),
    noExternalClientData:true,paidRenderApproved:false,localPreview:true,
    ...(semantic?{emotionalPathId:semantic.pathId,
      emotionalAxisId:semantic.emotionalAxisId,
      emotionalPace:semantic.pace}:{})} as CinematicStoryboard;
}

// Story formats may show only camera-filmed footage with reviewed provenance.
// Related wellness nature themes are allowed; business/goals MUST NOT fall back
// to unrelated nature, procedural animation or generic composite MP4.
const STORY_REVIEWED_THEME_COMPATIBILITY:Record<VideoTheme,readonly VideoTheme[]>={
  money:["money"],goals:["goals"],relationships:["relationships"],
  health:["health","life","energy"],life:["life","health","energy"],
  energy:["energy","health","life"]
};
function selectFiveStoryClips(theme:VideoTheme,aspect:Aspect,durationSeconds=20,format:"visual"|"motion"="visual"):string[]{
  const compatible=STORY_REVIEWED_THEME_COMPATIBILITY[theme];
  const requiredClipDuration=durationSeconds/5;
  const ranked=FREE_FILM_CATALOG.flatMap(source=>{
    const verified=verifiedCategorySource(source);
    if(!compatible.includes(source.theme as VideoTheme)||
      !isReviewedFilmedStoryScene(source,aspect)||!isSafeMontageScene(source)||
      !verified||!verifiedSceneAspect(verified,aspect)||
      verified.durationSeconds<requiredClipDuration||
      !firstPartyFilmFor(source.theme as VideoTheme,source.id))return [];
    const key=canonicalSourceMasterKey(verified);
    if(!key)return [];
    return [{id:source.id,key,priority:compatible.indexOf(source.theme as VideoTheme),
      group:"perceptualGroupId" in source&&typeof source.perceptualGroupId==="string"?source.perceptualGroupId:
        "sourceOriginalGroupId" in source&&typeof source.sourceOriginalGroupId==="string"?source.sourceOriginalGroupId:null}];
  }).sort((a,b)=>a.priority-b.priority||
    (format==="motion"?b.id.localeCompare(a.id):a.id.localeCompare(b.id)));
  const selected:typeof ranked=[];
  const keys=new Set<string>(),groups=new Set<string>();
  for(const source of ranked){
    if(keys.has(source.key)||(source.group&&groups.has(source.group)))continue;
    selected.push(source);keys.add(source.key);if(source.group)groups.add(source.group);
    if(selected.length===5)break;
  }
  return selected.map(source=>source.id);
}
const effects: Effect[] = ["glow", "energy", "prosperity", "temple"];
const durations = [10, 15, 20, 30, 60] as const;
const MUSIC_BED_NAMES:Record<typeof MYTUBE_MUSIC_BEDS[number],Record<PublicLocale,string>>={
  "warm-morning":{ru:"Тёплое утро",en:"Warm Morning",es:"Mañana cálida"},
  "wings-of-light":{ru:"Крылья света",en:"Wings of Light",es:"Alas de luz"},
  "heart-harmony":{ru:"Гармония сердца",en:"Heart Harmony",es:"Armonía del corazón"},
  "quiet-stars":{ru:"Тихие звёзды",en:"Quiet Stars",es:"Estrellas tranquilas"},
  "bright-path":{ru:"Светлый путь",en:"Bright Path",es:"Camino luminoso"},
};
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
function recordingMimes(withAudio: boolean, preferWebm = false, forceMp4ForRetry = false): string[] {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return [];
  const mp4 = withAudio ? [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', "video/mp4",
  ] : ["video/mp4;codecs=avc1.42E01E", "video/mp4"];
  const webm = withAudio ? [
    'video/webm;codecs="vp8,opus"', "video/webm",
  ] : ["video/webm;codecs=vp8", "video/webm"];
  // MediaRecorder support does not prove final native playback. Choose a
  // Safari native MP4 first on iPhone, then expose an explicit alternate retry.
  const isApplePhone=typeof navigator!=="undefined" &&
    /iPhone|iPad|iPod/.test(navigator.userAgent);
  // The reported iPhone fails to decode a finalized WebM. Try an explicitly
  // AVC/AAC-capable MP4 recorder first there; keep the alternate format for
  // a real playback failure, without claiming that MIME support guarantees it.
  const candidates = orderRecordingMimes({
    mp4, webm, preferWebm, forceMp4:forceMp4ForRetry||(isApplePhone&&!preferWebm),
    userAgent:typeof navigator==="undefined"?"":navigator.userAgent,
    maxTouchPoints:typeof navigator==="undefined"?0:navigator.maxTouchPoints,
  });
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
    if (realVideo && realVideo.readyState >= 2 && realVideo.videoWidth > 0 && firstPartyFilmFor(theme, otherScene)) {
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

function paintStudioVisualGrade(ctx:CanvasRenderingContext2D,styleId:string|null):void{
  if(!styleId)return;
  // The visitor's visual-style filter changes actual local rendered frames,
  // not merely the premium-provider storyboard text. All four looks use
  // portable Canvas gradients, identical in preview and MediaRecorder.
  const w=ctx.canvas.width,h=ctx.canvas.height;
  ctx.save();
  if(styleId==="warm"){
    const grade=ctx.createLinearGradient(0,0,w,h);
    grade.addColorStop(0,"rgba(246,181,80,.11)");
    grade.addColorStop(1,"rgba(122,63,15,.08)");
    ctx.fillStyle=grade;ctx.fillRect(0,0,w,h);
  }else if(styleId==="nature"){
    const grade=ctx.createLinearGradient(0,h,0,0);
    grade.addColorStop(0,"rgba(17,112,62,.18)");
    grade.addColorStop(1,"rgba(135,209,170,.07)");
    ctx.fillStyle=grade;ctx.fillRect(0,0,w,h);
  }else if(styleId==="dream"){
    const grade=ctx.createRadialGradient(w*.53,h*.36,0,w*.53,h*.45,Math.max(w,h)*.76);
    grade.addColorStop(0,"rgba(211,171,255,.17)");
    grade.addColorStop(.65,"rgba(91,87,172,.14)");
    grade.addColorStop(1,"rgba(27,29,67,.20)");
    ctx.fillStyle=grade;ctx.fillRect(0,0,w,h);
  }else if(styleId==="minimal"){
    ctx.fillStyle="rgba(224,221,202,.16)";
    ctx.fillRect(0,0,w,h);
    const grade=ctx.createLinearGradient(0,0,w,h);
    grade.addColorStop(0,"rgba(252,245,220,.04)");
    grade.addColorStop(1,"rgba(5,24,24,.14)");
    ctx.fillStyle=grade;ctx.fillRect(0,0,w,h);
  }else if(styleId==="water"){
    const grade=ctx.createLinearGradient(0,0,w,h);
    grade.addColorStop(0,"rgba(36,164,191,.11)");
    grade.addColorStop(1,"rgba(12,75,143,.17)");
    ctx.fillStyle=grade;ctx.fillRect(0,0,w,h);
  }else if(styleId==="light"){
    const grade=ctx.createRadialGradient(w*.55,h*.35,0,w*.55,h*.42,Math.max(w,h)*.8);
    grade.addColorStop(0,"rgba(255,244,181,.20)");
    grade.addColorStop(1,"rgba(246,184,93,.08)");
    ctx.fillStyle=grade;ctx.fillRect(0,0,w,h);
  }
  ctx.restore();
}

// Paint selected real MP4 artwork, rather than only applying a color tint.
// Center crop is presentation; it never changes physical master verification.
function paintSelectedStyleShot(ctx:CanvasRenderingContext2D,video:HTMLVideoElement|null):boolean{
  if(!video||video.readyState<2||video.videoWidth<1||video.videoHeight<1)return false;
  const w=ctx.canvas.width,h=ctx.canvas.height,sw=video.videoWidth,sh=video.videoHeight;
  const scale=Math.max(w/sw,h/sh),cw=w/scale,ch=h/scale;
  ctx.drawImage(video,(sw-cw)/2,(sh-ch)/2,cw,ch,0,0,w,h);
  return true;
}
// A still assigned to one storyboard beat is drawn into the same Canvas used
// by preview, MediaRecorder and WebCodecs. No image URL is fetched by JS.
function paintStoryboardStill(ctx:CanvasRenderingContext2D,image:HTMLImageElement,time:number,duration:number){
  const width=ctx.canvas.width,height=ctx.canvas.height;
  if(!width||!height||!image.naturalWidth||!image.naturalHeight)throw new Error("invalid_storyboard_still");
  const base=Math.max(width/image.naturalWidth,height/image.naturalHeight);
  const progress=Math.max(0,Math.min(1,time/Math.max(1,duration)));
  const scale=base*(1+0.045*progress);
  const sw=width/scale,sh=height/scale;
  const sx=Math.max(0,Math.min(image.naturalWidth-sw,(image.naturalWidth-sw)*0.5));
  const sy=Math.max(0,Math.min(image.naturalHeight-sh,(image.naturalHeight-sh)*0.5));
  ctx.drawImage(image,sx,sy,sw,sh,0,0,width,height);
}
// A genuine local multi-shot film, drawn by the existing Canvas recorder.
// The client's picture and detailed request are never uploaded to a provider.
function paintCinematicFrame(
  ctx: CanvasRenderingContext2D, image: HTMLImageElement | null,
  effect: Effect,time:number,aspect:Aspect,moneyScene:MoneySceneId|null,caption:string,
  theme:VideoTheme,otherScene:LocalSceneId,speed:Speed,brightness:Brightness,
  realVideo:HTMLVideoElement|null,storyboard:CinematicStoryboard|null,
  stockShotVideo:HTMLVideoElement|null = null,
  proceduralPlan:FreeVideoPlan|null = null,
  permittedLocalPortrait:HTMLImageElement|null = null,
  montageStyleId:string|null = null,
  styleVideo:HTMLVideoElement|null = null,
  storyboardPhotos:Readonly<Record<string,HTMLImageElement>> = {},
) {
  if(proceduralPlan){paintFreeVideoFrame(ctx,proceduralPlan,time,permittedLocalPortrait);return;}
  // A full source-verified compilation must retain every selected physical MP4,
  // including shot #1. Style may grade the frame but never replace a licensed
  // timeline source in either preview, MediaRecorder, or WebCodecs export.
  // On the no-compilation style preview the selected first-beat visual remains.
  const firstBeatSeconds=storyboard?.shots[0]?.durationSeconds??5;
  if(storyboard?.version!==FREE_FILM_PLAN_VERSION &&
    montageStyleId&&time>=0&&time<firstBeatSeconds&&paintSelectedStyleShot(ctx,styleVideo)){
    paintStudioVisualGrade(ctx,montageStyleId);
    return;
  }
  const filmSecond=storyboard?cinematicPreviewSeconds(storyboard,time):time;
  const shot=storyboard?.shots.find(s=>filmSecond>=s.startSeconds &&
    filmSecond<s.startSeconds+s.durationSeconds) || storyboard?.shots.at(-1);
  if(!storyboard || !shot){
    paint(ctx,image,effect,time,aspect,moneyScene,caption,theme,otherScene,
      speed,brightness,realVideo);
    paintStudioVisualGrade(ctx,montageStyleId);
    return;
  }
  const localTime=Math.max(0,filmSecond-shot.startSeconds);
  const paintShot=()=>paint(ctx,image,effect,localTime,aspect,
    shot.theme==="money"?shot.sceneId as MoneySceneId:null,
    caption,shot.theme,shot.sceneId as LocalSceneId,speed,brightness,
    storyboard.version===FREE_FILM_PLAN_VERSION?stockShotVideo:null);
  // The original local scene is transformed BEFORE captions and finishing.
  // Preview, WebCodecs and MediaRecorder all use this same function.
  const still=storyboard.version===FREE_FILM_PLAN_VERSION?storyboardPhotos[shot.sceneId]:undefined;
  if(still?.complete&&still.naturalWidth>0&&still.naturalHeight>0){
    paintStoryboardStill(ctx,still,localTime,shot.durationSeconds);
  }else if(storyboard.version===FREE_FILM_PLAN_VERSION&&shot.motion){
    paintMyTubeMotion(ctx,shot.motion,localTime,shot.durationSeconds,paintShot);
  }else{
    paintShot();
  }
  paintStudioVisualGrade(ctx,montageStyleId||storyboard.styleId);
  // Non-destructive per-shot finishing: preview and encoded export use this Canvas.
  paintCreativeTimelineShot(ctx,storyboard.shots,storyboard.shots.indexOf(shot),localTime);
}
/** One Canvas text compositor for preview and every exported format. */
function paintSingleVideoTextOverlay(
  ctx:CanvasRenderingContext2D,time:number,
  source:"affirmations"|"stage"|"caption"|"none",
  lines:readonly string[],settings:AffirmationSettings,totalSeconds:number,
  plan:CinematicStoryboard|null,clips:readonly TimelineTextClip[]|null,
):void{
  if(source==="affirmations"){
    // Legacy medium/high density could draw 2-3 sentences simultaneously.
    // Present one readable phrase and only one selected size/visibility.
    const visibility=settings.visibility.includes("large")?"large":
      settings.visibility.includes("small")?"small":"frame";
    paintVideoAffirmations(ctx,time,lines,{...settings,density:"low",visibility:[visibility]},totalSeconds);
  }else if(source==="stage"){
    paintStageCaptionOverlay(ctx,time,plan,clips);
  }
}
/** Each authored caption is rendered locally on the same Canvas as MediaRecorder. */
function paintStageCaptionOverlay(
  ctx:CanvasRenderingContext2D,time:number,plan:CinematicStoryboard|null,
  editedCaptions:readonly TimelineTextClip[]|null=null,
){
  if(editedCaptions===null&&(!plan||plan.version!==FREE_FILM_PLAN_VERSION))return;
  const frame=editedCaptions===null
    ?stageCaptionAt(plan,cinematicPreviewSeconds(plan!,time))
    :timedCaptionAt(editedCaptions,time);
  if(!frame||frame.alpha<=0)return;
  const w=ctx.canvas.width,h=ctx.canvas.height;
  const font=Math.max(18,Math.min(w*.055,h*.036,54));
  const maxTextWidth=w*.84;
  ctx.save();
  ctx.globalAlpha=frame.alpha;
  ctx.font="600 "+Math.round(font)+"px system-ui, sans-serif";
  const animation=captionAnimationFrame(frame,frame.localTime,frame.durationSeconds,frame.alpha);
  const visible=animation.reveal>=1?frame.text:
    Array.from(frame.text).slice(0,Math.floor(Array.from(frame.text).length*animation.reveal)).join("");
  const words=visible.split(/\s+/u).filter(Boolean);
  const lines:string[]=[];
  let line="";
  for(const word of words){
    const next=line?line+" "+word:word;
    if(line&&ctx.measureText(next).width>maxTextWidth&&lines.length<2){
      lines.push(line);line=word;
    }else line=next;
  }
  if(line)lines.push(line);
  const centerY=animation.positionId==="top"?h*.16:
    animation.positionId==="center"?h*.49:h*.80;
  const top=centerY-(lines.length-1)*font*.67;
  const bandHeight=lines.length*font*1.25+font*.8;
  ctx.globalAlpha=animation.alpha;
  ctx.translate(animation.translateX*w,animation.translateY*h);
  ctx.translate(w/2,centerY);
  ctx.rotate(animation.rotation);
  ctx.scale(animation.scale,animation.scale);
  ctx.translate(-w/2,-centerY);
  if(animation.styleId!=="minimal"){
    ctx.fillStyle=animation.styleId==="cinema"?"rgba(10,12,18,.82)":
      animation.styleId==="glow"?"rgba(31,21,58,.56)":"rgba(9,31,29,.68)";
    ctx.fillRect(w*.055,top-font*.76,w*.89,bandHeight);
  }
  ctx.fillStyle=animation.styleId==="glow"?"#fcf0ff":"#fffdf7";
  if(animation.styleId==="glow"){
    ctx.shadowColor="rgba(207,133,255,.95)";
    ctx.shadowBlur=Math.max(6,font*.42);
  }
  if(animation.styleId==="minimal"){
    ctx.shadowColor="rgba(4,16,18,.85)";
    ctx.shadowBlur=Math.max(4,font*.13);
  }
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  for(let i=0;i<lines.length;i++){
    ctx.fillText(lines[i],w/2,top+i*font*1.25,maxTextWidth);
  }
  ctx.restore();
}
// A deliberately SIMPLE first-party symbolic overlay, not a fictional talking AI avatar.
// It is drawn in the exact same Canvas preview + MediaRecorder export path. No PHI or API.
function paintStoryMotifs(ctx:CanvasRenderingContext2D,time:number,selection:StorySelection){
  if(!selection.character&&!selection.story&&!selection.symbol)return;
  const w=ctx.canvas.width,h=ctx.canvas.height,t=Math.max(0,time);
  ctx.save();
  if(selection.character==="C01"){
    const x=w*.78+Math.sin(t*.65)*w*.01,y=h*.30+Math.sin(t*.9)*h*.01;
    const r=Math.max(25,Math.min(w,h)*.095);
    const halo=ctx.createRadialGradient(x,y,0,x,y,r*2.8);
    halo.addColorStop(0,"rgba(255,251,215,.88)");
    halo.addColorStop(.3,"rgba(246,211,121,.32)");
    halo.addColorStop(1,"rgba(246,211,121,0)");
    ctx.fillStyle=halo;ctx.fillRect(x-r*2.8,y-r*2.8,r*5.6,r*5.6);
    ctx.strokeStyle="rgba(255,241,194,.65)";
    ctx.lineWidth=Math.max(1.5,w*.002);
    ctx.beginPath();ctx.arc(x,y,r*(.54+.04*Math.sin(t*.7)),0,Math.PI*2);ctx.stroke();
    for(let i=0;i<4;i++){
      const angle=t*.24+i*Math.PI/2;
      const px=x+Math.cos(angle)*r*.9,py=y+Math.sin(angle)*r*.9;
      ctx.fillStyle="rgba(255,240,179,.85)";
      ctx.beginPath();ctx.arc(px,py,r*.07,0,Math.PI*2);ctx.fill();
    }
  }
  if(selection.story==="S01"){
    // A clear, non-verbal path motif at the very bottom of the video.
    const y=h*.84;
    const start=w*.22,end=w*.55;
    ctx.strokeStyle="rgba(255,234,171,.78)";ctx.lineWidth=Math.max(2,w*.003);
    ctx.setLineDash([Math.max(4,w*.01),Math.max(5,w*.012)]);
    ctx.beginPath();ctx.moveTo(start,y);ctx.quadraticCurveTo(w*.37,y-h*.08,end,y-h*.025);ctx.stroke();
    ctx.setLineDash([]);
  }
  if(selection.symbol==="O01"){
    const x=w*.19,y=h*.22,r=Math.max(14,Math.min(w,h)*.035);
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.2)*.08);
    ctx.fillStyle="rgba(255,229,164,.87)";
    ctx.shadowColor="rgba(255,218,134,.6)";ctx.shadowBlur=r*.75;
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*Math.PI/5,rr=i%2===0?r:r*.44;
      const px=Math.cos(a)*rr,py=Math.sin(a)*rr;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.fill();ctx.restore();
  }
  ctx.restore();
}

function stopJob(job: Job, cancelled: boolean) {
  job.cancelled = cancelled;
  window.cancelAnimationFrame(job.animation);
  window.clearTimeout(job.timeout);
  if (job.recorder.state !== "inactive") {
    // Safari needs its audio/video tracks alive until the MP4/WebM muxer has
    // emitted its final dataavailable event. onstop owns final cleanup.
    job.recorder.stop();
  } else {
    job.stream.getTracks().forEach(track => track.stop());
    job.musicSession?.close();
  }
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

const quickStyleGradeIds = ["nature","warm","dream","minimal","water","light"] as const;
const quickStylePosters = [
  "mountain-air","golden-harvest","desert-light","morning-dew","gentle-falls","solar-surge",
] as const;
const quickStyleSceneIds:Record<VideoTheme,readonly string[]>={
  energy:["mountain-air","solar-surge","desert-light","sunbeam-flow","river-power","sun-leaves-canopy"],
  money:["prosperity-coast","golden-harvest","cosmic-flow","abundance-circle","opportunity-falls","radiant-portal"],
  relationships:["garden-acceptance","warm-clouds-sunset","heart-flow","sun-warm-ocean-dawn","soft-horizon","sun-leaves-canopy"],
  goals:["soft-horizon","sun-autumn-hills","sun-leaves-canopy","sun-golden-aspen","gentle-falls","solar-surge"],
  life:["meadow-morning","wildflower-dance","fern-awakening","lone-tree","coastal-freedom","sun-golden-aspen"],
  health:["morning-dew","sea-breeze","calm-sea","mossy-stream","gentle-falls","sun-trees-forest"],
};
// One verified first-party MP4 and poster is shared by every style surface.
function quickStyleFilmFor(theme:VideoTheme,index:number){
  const id=quickStyleSceneIds[theme]?.[index];
  const candidate=id?FREE_FILM_CATALOG_BY_ID.get(id):null;
  const trusted=candidate?verifiedCategorySource(candidate):null;
  if(!trusted||!candidate)return null;
  // The verification helper's narrow return type intentionally does not
  // include editorial theme; read it from the already-approved catalog entry.
  const film=firstPartyFilmFor(candidate.theme as VideoTheme,candidate.id);
  return film?{...film,sceneId:candidate.id,theme:candidate.theme as VideoTheme}:null;
}
const quickThemeOrder: VideoTheme[] = ["energy","health","relationships","money","goals","life"];
const effectsThemeOrder: VideoTheme[] = ["life","energy","relationships","goals","money","health"];
const effectsThemeNames: Record<PublicLocale,Record<VideoTheme,string>> = {
  ru:{life:"Спокойствие",energy:"Энергия",relationships:"Отношения",goals:"Цели",money:"Изобилие",health:"Здоровье"},
  en:{life:"Calm",energy:"Energy",relationships:"Relationships",goals:"Goals",money:"Abundance",health:"Wellbeing"},
  es:{life:"Calma",energy:"Energía",relationships:"Relaciones",goals:"Objetivos",money:"Abundancia",health:"Bienestar"},
};

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


// On iOS the input itself (not a hidden input's scripted .click) must receive
// the user's trusted tap, including in standalone Add-to-Home-Screen mode.
function NativePhotoInput({ label, disabled, onPhotoFileSelected }: {
  label: string; disabled: boolean; onPhotoFileSelected: (photo: File) => void;
}) {
  return <input type="file" accept={SUPPORT_PHOTO_ACCEPT} aria-label={label}
    data-video-native-photo-input className={videoStyles.nativePhotoInput}
    disabled={disabled} onChange={event => {
      const photo = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (photo) onPhotoFileSelected(photo);
    }}/>;
}

export function MandalaFreeVideoStudio({ locale, frameUrl, photoUrl, onPickPhoto, onPhotoFileSelected, photoError, photoPending = false, professionalSource = null, professionalMode = false }: {
  locale: PublicLocale; frameUrl: string | null; photoUrl?: string | null;
  onPickPhoto: () => void; onPhotoFileSelected: (photo: File) => void;
  photoError?: string; photoPending?: boolean;
  professionalSource?: MandalaProfessionalSource | null; professionalMode?: boolean;
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
  const [activeMontageStyleId,setActiveMontageStyleId] = useState<(typeof quickStyleGradeIds)[number]|null>(null);
  const [quickDetailedOpen,setQuickDetailedOpen] = useState(false);
  // First screen shows the goal and request; film scenarios are the next mobile step.
  const [videoScenarioOpen,setVideoScenarioOpen] = useState(false);
  const goalContinueRef=useRef<(()=>boolean)|null>(null);
  const [firstVideoAdvancedActivated,setFirstVideoAdvancedActivated] = useState(false);
  const [voiceStudioActivated,setVoiceStudioActivated] = useState(false);
  const [phraseCatalogActivated,setPhraseCatalogActivated] = useState(false);
  const [studioMode,setStudioMode] = useState<"pump"|"therapy">("pump");
  const [activeWorkspace,setActiveWorkspace] = useState<StudioWorkspace>("video");
  const [proCatalogKind,setProCatalogKind]=useState<StoryAddonKind>("character");
  const [ideasVoiceAdvancedOpen,setIdeasVoiceAdvancedOpen] = useState(false);
  const [ideasSubtab,setIdeasSubtab] = useState<"personalization"|"concept">("personalization");
  const [ideasVoiceMode,setIdeasVoiceMode] = useState<"voice"|"my-voice">("voice");
  const [ideasProfile,setIdeasProfile] = useState<VideoGoalProfile>(DEFAULT_VIDEO_GOAL_PROFILE);
  // Do not misread initial preselected chips as answers until the visitor
  // actually confirms the Personalization step.
  const [ideasProfileConfirmed,setIdeasProfileConfirmed] = useState(false);
  const [basicPanelTab,setBasicPanelTab] = useState<"style"|"photo"|"voice"|"music">("style");
  const [showAdvancedVideo,setShowAdvancedVideo] = useState(false);
  const [montageStyleSettingsOpen,setMontageStyleSettingsOpen] = useState(false);
  // Montage is a preference-first wizard: detailed timeline is available only under Text.
  const [montagePanel,setMontagePanel] = useState<"settings"|"effects"|"text"|"concept"|"audio"|"promo">("effects");
  const [hypnoEntryGroup,setHypnoEntryGroup] = useState<"visual"|"audio"|"effects">("visual");
  const [storyFormat,setStoryFormat] = useState<"visual"|"motion"|"talking_character"|"ai_cinematic">("visual");
  const [approvedVideoConcept,setApprovedVideoConcept] = useState<ApprovedVideoConcept|null>(null);
  const [selectedConceptTopic,setSelectedConceptTopic] = useState<{categoryId:string;subcategoryId:string;topicId:string;brief?:string}|null>(null);
  const [appliedStoryKey,setAppliedStoryKey]=useState<string|null>(null);
  const [audioLibraryOpen,setAudioLibraryOpen] = useState(false);
  const audioLibraryCloseRef=useRef<HTMLButtonElement>(null);
  const audioLibraryTriggerRef=useRef<HTMLButtonElement>(null);
  const audioLibraryInitialMusicRef=useRef<AmbientMusic>("none");
  const audioLibraryInitialAttachedRef=useRef<AttachedAudio|null>(null);
  const openAudioLibrary=()=>{
    audioLibraryInitialMusicRef.current=music;
    audioLibraryInitialAttachedRef.current=attachedAudio;
    setAudioLibraryOpen(true);
  };
  const closeAudioLibrary=(restore=false)=>{
    stopSoundPreview();
    if(restore){
      setMusic(audioLibraryInitialMusicRef.current);
      setAttachedAudio(audioLibraryInitialAttachedRef.current);
    }
    setAudioLibraryOpen(false);
    window.requestAnimationFrame(()=>audioLibraryTriggerRef.current?.focus());
  };
  useEffect(()=>{
    if(!audioLibraryOpen)return;
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();closeAudioLibrary(true);}
      if(event.key!=="Tab")return;
      const dialog=document.querySelector<HTMLElement>("[data-video-audio-library-dialog]");
      if(!dialog)return;
      const focusables=Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]'
      )).filter(element=>element.getClientRects().length>0);
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener("keydown",onKey);
    window.requestAnimationFrame(()=>audioLibraryCloseRef.current?.focus());
    return()=>document.removeEventListener("keydown",onKey);
  },[audioLibraryOpen]);
  const [audioCategoryOverride,setAudioCategoryOverride] = useState<"all"|"wellbeing"|"focus"|"calm"|"energy"|"love"|null>(null);
  const [montageTransition,setMontageTransition] = useState<TimelineTransition>("soft");
  // Real browser interactions are safe only after client event handlers hydrate.
  const [studioHydrated,setStudioHydrated] = useState(false);
  useEffect(()=>setStudioHydrated(true),[]);
  const [directorChatOpen,setDirectorChatOpen] = useState(false);
  const [videoIHelpOpen,setVideoIHelpOpen] = useState(false);
  const [studioIntroOpen,setStudioIntroOpen] = useState(false);
  const videoIHelpCloseRef=useRef<HTMLButtonElement|null>(null);
  // Sitewide iHelp opens the SAME Director, without resetting Studio state,
  // previously selected clips, text, audio or video settings.
  useEffect(()=>{
    const openVideoHelp=(event:Event)=>{
      const request=event as CustomEvent<{handled?:boolean}>;
      if(request.detail)request.detail.handled=true;
      setDirectorChatOpen(true);
      setVideoIHelpOpen(true);
    };
    window.addEventListener("hh:ihelp-open-video-director",openVideoHelp);
    return ()=>{
      window.removeEventListener("hh:ihelp-open-video-director",openVideoHelp);
      window.dispatchEvent(new CustomEvent("hh:ihelp-video-director-state",{detail:{open:false}}));
    };
  },[]);
  function closeVideoIHelp(){
    setVideoIHelpOpen(false);
    window.requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(
      "[data-video-ihelp-header-trigger], [data-hh-ihelp-trigger]")?.focus({preventScroll:true}));
  }
  useEffect(()=>{
    window.dispatchEvent(new CustomEvent("hh:ihelp-video-director-state",
      {detail:{open:videoIHelpOpen}}));
    if(!videoIHelpOpen)return;
    const overflowBefore=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const focusFrame=window.requestAnimationFrame(()=>videoIHelpCloseRef.current?.focus({preventScroll:true}));
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        event.preventDefault();closeVideoIHelp();return;
      }
      if(event.key!=="Tab")return;
      const dialog=document.querySelector<HTMLElement>("[data-video-director-chat-details][role='dialog']");
      const focusable=Array.from(dialog?.querySelectorAll<HTMLElement>(
        "button:not([disabled]),a[href],textarea:not([disabled]),input:not([disabled]),select:not([disabled])"
      )||[]).filter(el=>el.getClientRects().length>0);
      if(!focusable.length){event.preventDefault();return;}
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&(document.activeElement===first||!dialog?.contains(document.activeElement))){
        event.preventDefault();last.focus();
      }else if(!event.shiftKey&&(document.activeElement===last||!dialog?.contains(document.activeElement))){
        event.preventDefault();first.focus();
      }
    };
    document.addEventListener("keydown",onKey);
    return ()=>{
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown",onKey);
      document.body.style.overflow=overflowBefore;
    };
  },[videoIHelpOpen]);
  const [phraseAudioExpanded,setPhraseAudioExpanded] = useState(false);
  const [phrasePending,setPhrasePending] = useState(false);
  const [catalogPhraseDraft,setCatalogPhraseDraft] = useState<string|null>(null);
  const [hypnoLight,setHypnoLight] = useState<HypnoLightSettings>({enabled:false,cyclesPerMinute:6,opacity:.18});
  const [therapyJumpRequested,setTherapyJumpRequested] = useState(false);
  const [scores,setScores] = useState<Record<(typeof checkOrder)[number],number>>({energy:5,money:5,relationships:5,goals:5});
  const [touchedScores,setTouchedScores] = useState<Partial<Record<(typeof checkOrder)[number],number>>>({});
  const [theme, setTheme] = useState<VideoTheme>("energy");
  const [videoCategory, setVideoCategory] = useState<VideoCategory>("energy");
  const effect: Effect = "glow";
  const [moneyScene, setMoneyScene] = useState<MoneySceneId | null>("golden-rain");
  const [backgroundOnly,setBackgroundOnly]=useState(true);
  const selectNativePhoto = (photo: File) => {
    // Canceled picker preserves the previous choice; no upload takes place.
    setBackgroundOnly(false);
    onPhotoFileSelected(photo);
  };
  const [otherScene, setOtherScene] = useState<LocalSceneId>("mountain-air");
  const [showAllMoney, setShowAllMoney] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewSeekSeconds,setPreviewSeekSeconds]=useState(0);
  const [previewPlayhead,setPreviewPlayhead]=useState(0);
  const [previewFrameRevision,setPreviewFrameRevision]=useState(0);
  // Exact owner-approved captioned media masters: EN on EN, RU on RU.
  // Spanish UI falls back to EN with an explicit English-audio label.
  const introVideo = locale==="ru" ? {
    src:"https://resource2.heygen.ai/movio/video/72e3e6f45c3664b0b8d75281b1b413a5/2e30e44294964059b57670860ee3828b/caption.mp4",
    locale:"ru" as const,durationSeconds:96.862,
  } : {
    src:"https://resource2.heygen.ai/movio/video/8d998c778af3b563aa63233aa4fb4a06/89b101dc9dbb4fcea06aab3eb6ce5094/caption.mp4",
    locale:"en" as const,durationSeconds:91.2457,
  };
  const introVideoRef=useRef<HTMLVideoElement>(null);
  const [introPlaying,setIntroPlaying] = useState(false);
  const [introDismissed,setIntroDismissed] = useState(false);
  const [introFailed,setIntroFailed] = useState(false);
  const playIntro=()=>{
    stopMovieSound();premiumVideoRef.current?.pause();setPreviewPlaying(false);
    setStudioIntroOpen(false);setIntroDismissed(false);setIntroFailed(false);
    const media=introVideoRef.current;
    if(media){media.currentTime=0;const task=media.play();if(task)void task.catch(()=>setIntroFailed(true));}
    setIntroPlaying(true);
  };
  const closeIntro=()=>{
    introVideoRef.current?.pause();
    if(introVideoRef.current)introVideoRef.current.currentTime=0;
    setIntroPlaying(false);setIntroDismissed(true);setIntroFailed(false);
  };
  useEffect(()=>{
    if(!introPlaying){const media=introVideoRef.current;if(media){media.pause();media.currentTime=0;}}
  },[introPlaying]);
  const [aspect, setAspect] = useState<Aspect>("landscape");
  const [quality, setQuality] = useState<Quality>("hd");
  const [duration, setDuration] = useState<(typeof durations)[number]>(30);
  const [speed,setSpeed] = useState<Speed>("slow");
  const [brightness,setBrightness] = useState<Brightness>("soft");
  const [music,setMusic] = useState<AmbientMusic>("none");
  const [soundVolume,setSoundVolume] = useState(75);
  const [audioKind,setAudioKind] = useState("melody");
  const [audioMood,setAudioMood] = useState("all");
  const [audioPace,setAudioPace] = useState("all");
  const [audioVoiceFriendly,setAudioVoiceFriendly] = useState(false);
  const [audioAuto,setAudioAuto] = useState(true);
  const [audioSearch,setAudioSearch] = useState("");
  const [audioSort,setAudioSort] = useState<"best"|"name"|"favorites">("best");
  const [audioThemeOverride,setAudioThemeOverride] = useState<VideoTheme|null>(null);
  const [audioFavorites,setAudioFavorites] = useState<string[]>([]);
  const [showAllAudio,setShowAllAudio] = useState(false);
  const [audioDurationInvalid,setAudioDurationInvalid] = useState(false);
  const [attachedAudio,setAttachedAudio] = useState<AttachedAudio|null>(null);
  const [musicBed,setMusicBed]=useState<MyTubeMusicBed>({
    id:"none",volumePercent:30,fadeSeconds:1
  });
  const [hypnoSpeechSource,setHypnoSpeechSource] = useState<File|null>(null);
  const [hypnoSpeechText,setHypnoSpeechText] = useState("");
  const [hypnoWhisperEnabled,setHypnoWhisperEnabled] = useState(false);
  const [hypnoBinauralEnabled,setHypnoBinauralEnabled] = useState(false);
  const [hypnoBeatHz,setHypnoBeatHz] = useState(4);
  const [hypnoRepeatEvery,setHypnoRepeatEvery] = useState(7);
  const [hypnoWhisperGain,setHypnoWhisperGain] = useState(16);
  const [hypnoAudioBusy,setHypnoAudioBusy] = useState(false);
  const previousHypnoAudioRef = useRef<{audio:AttachedAudio|null;rights:boolean}|null>(null);
  const [audioStartSeconds,setAudioStartSeconds]=useState(0);
  const [micRecording,setMicRecording] = useState(false);
  const micRef = useRef<{recorder:MediaRecorder;stream:MediaStream;chunks:Blob[];timeout:ReturnType<typeof setTimeout>}|null>(null);
  const micSpeechRef=useRef<ReturnType<typeof startDeviceVoiceCapture>|null>(null);
  const [soundPreview,setSoundPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);
  const auditionGainRef = useRef<{player:HTMLAudioElement;mixer:PreviewGainGroup}|null>(null);
  // Safari may keep playing a keyed native audio node after React detaches it.
  const activeAudioPreviewRef=useRef<HTMLAudioElement|null>(null);
  const [samplePreviewId,setSamplePreviewId] = useState<PresetId|null>(null);
  // Virtual players exist only during a user-initiated film preview.
  // The visible native player and microphone stay single instances.
  const movieSoundRef=useRef<{players:HTMLAudioElement[];restore:()=>void;fileUrl:string|null;timer:number|null;mixer:PreviewGainGroup|null;primaryCount:number;masterPercent:number}|null>(null);
  const stopMovieSound=useCallback(()=>{
    const session=movieSoundRef.current;
    movieSoundRef.current=null;
    if(!session)return;
    if(session.timer!==null)window.clearTimeout(session.timer);
    for(const player of session.players){
      player.pause();
      try{player.currentTime=0;}catch{/* Media may still be loading. */}
      player.removeAttribute("src");
      player.load();
    }
    session.mixer?.close();
    session.restore();
    if(session.fileUrl)URL.revokeObjectURL(session.fileUrl);
  },[]);
  // Prime media in the visitor gesture: WebKit often rejects delayed play()
  // called from a timer. An initially silent source is unmuted at its offset.
  function startMovieSound(attached:AttachedAudio|null,volume:number,fromSeconds=previewSeekSeconds){
    // Film voice + bed are an intentional mix. A separate audition is not.
    stopSoundPreview();
    stopMovieSound();
    if(!attached||(attached.kind==="file"&&!audioRights))return;
    const fileUrl=attached.kind==="file"?URL.createObjectURL(attached.file):null;
    const ids=attached.kind==="preset"?[attached.id]:attached.kind==="presets"?attached.ids:[];
    const urls=fileUrl?[fileUrl]:ids.map(presetAudioUrl);
    const activeBed=attached.kind==="file"&&audioRights&&musicBed.id!=="none";
    const bedUrl=activeBed?presetAudioUrl(musicBed.id as Exclude<AmbientMusic,"none">):null;
    if(!urls.length)return;
    const restore=acquirePlaybackSession();
    const delayed=audioStartSeconds>fromSeconds;
    const isNonLoop=attached.kind==="file"&&(attached.narration===true||attached.nonLoop===true);
    const masterVolume=Math.min(1,Math.max(0,volume/100))/Math.sqrt(urls.length+(bedUrl?1:0));
    const players=urls.map(src=>{
      const player=new Audio(src);
      player.preload="auto";
      // A delayed voice stays alive silently until the scheduled transition.
      player.loop=delayed||!isNonLoop;
      // iPhone Safari can ignore programmatic volume but honors muted.
      // Never leak a delayed voice before its user-selected timecode.
      player.muted=delayed;
      try{player.volume=delayed?0:masterVolume;}
      catch{/* iOS hardware volume remains authoritative. */}
      if(!delayed&&fromSeconds>audioStartSeconds){
        const seek=()=>{
          try{
            const elapsed=fromSeconds-audioStartSeconds;
            player.currentTime=player.loop&&Number.isFinite(player.duration)&&player.duration>0
              ?elapsed%player.duration:elapsed;
          }catch{/* Metadata may arrive after playback begins. */}
        };
        if(player.readyState>=1)seek();
        else player.addEventListener("loadedmetadata",seek,{once:true});
      }
      return player;
    });
    // Background melody is a separate native player; only the primary voice
    // gets narration delay/unmute. Preview volume is browser-dependent on iOS.
    const bedPlayer=bedUrl?new Audio(bedUrl):null;
    if(bedPlayer){
      bedPlayer.loop=true;bedPlayer.preload="auto";bedPlayer.muted=false;
      try{bedPlayer.volume=masterVolume*(musicBed.volumePercent/100);}
      catch{/* Native volume policy is controlled by the browser. */}
      if(fromSeconds>0){
        const seek=()=>{
          try{if(bedPlayer.duration>0)bedPlayer.currentTime=fromSeconds%bedPlayer.duration;}
          catch{/* The next playback advances naturally. */}
        };
        if(bedPlayer.readyState>=1)seek();
        else bedPlayer.addEventListener("loadedmetadata",seek,{once:true});
      }
    }
    const session={players:bedPlayer?[...players,bedPlayer]:players,
      restore,fileUrl,timer:null as number|null,mixer:null as PreviewGainGroup|null,
      primaryCount:players.length,masterPercent:volume};
    // Web Audio GainNode controls iPhone Safari sound, including mixed film preview.
    session.mixer=createPreviewGainGroup(session.players,
      session.players.map((player,index)=>index<players.length
        ?(player.muted?0:masterVolume):masterVolume*(musicBed.volumePercent/100)));
    if(session.mixer)session.players.forEach(player=>{try{player.volume=1;}catch{}});
    movieSoundRef.current=session;
    // Play from the trusted click, never from an asynchronous callback.
    players.forEach(player=>void player.play().catch(()=>{
      if(movieSoundRef.current===session){
        stopMovieSound();
        if(aliveRef.current)setMusicWarning(ui.soundUnavailable);
      }
    }));
    if(bedPlayer)void bedPlayer.play().catch(()=>{
      if(movieSoundRef.current===session){
        stopMovieSound();
        if(aliveRef.current)setMusicWarning(ui.soundUnavailable);
      }
    });
    if(delayed)session.timer=window.setTimeout(()=>{
      if(movieSoundRef.current!==session)return;
      players.forEach(player=>{
        try{
          player.currentTime=0;
          if(!session.mixer)player.volume=session.masterPercent/100/Math.sqrt(session.players.length);
        }catch{/* Native browser fallback. */}
        player.muted=false;
        player.loop=!isNonLoop;
      });
      if(session.mixer){
        const level=Math.min(1,Math.max(0,session.masterPercent/100))/Math.sqrt(session.players.length);
        session.mixer.setGains(session.players.map((_,index)=>index<session.primaryCount
          ?level:level*(musicBed.volumePercent/100)));
      }
      session.timer=null;
    },(audioStartSeconds-fromSeconds)*1000);
  }
  const restoreAudioSessionRef = useRef<(() => void) | null>(null);
  // Pause the old native audio *during* React's keyed replacement/unmount.
  // Delayed media events from the old player must not affect the new session.
  const setAudioPreviewNode=useCallback((node:HTMLAudioElement|null)=>{
    const previous=audioPreviewRef.current;
    if(previous&&previous!==node){
      previous.pause();
      if(auditionGainRef.current?.player===previous){
        auditionGainRef.current.mixer.close();auditionGainRef.current=null;
      }
      if(activeAudioPreviewRef.current===previous){
        activeAudioPreviewRef.current=null;
        restoreAudioSessionRef.current?.();
        restoreAudioSessionRef.current=null;
        setSoundPreview(false);
      }
    }
    audioPreviewRef.current=node;
  },[]);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [uploadedAudio,setUploadedAudio] = useState<{file:File;url:string}|null>(null);
  const [importedAudioSeconds,setImportedAudioSeconds]=useState<number|null>(null);
  const messengerAudioHandoffRef=useRef<{locale:PublicLocale;promise:ReturnType<typeof consumeMessengerAudio>}|null>(null);
  const uploadedAudioRef = useRef<{file:File;url:string}|null>(null);
  const [audioPlaybackError,setAudioPlaybackError] = useState(false);
  const [audioRights,setAudioRights] = useState(false);
  // Temporary user-owned voice transcript: never place it in browser storage.
  const [sttBusy,setSttBusy]=useState(false);
  const [sttError,setSttError]=useState("");
  const [manualTranscript,setManualTranscript]=useState("");
  const [voiceTranscript,setVoiceTranscript]=useState<TimedSpeechTranscript|null>(null);
  const [voiceVisualPlan,setVoiceVisualPlan]=useState<AudioVisualPlan|null>(null);
  // The speech-derived proposal is local, provisional and never grants export.
  const voiceConcept=useMemo(()=>deriveAudioVideoConcept({
    transcript:voiceTranscript??undefined,plan:voiceVisualPlan??undefined,locale
  }),[voiceTranscript,voiceVisualPlan,locale]);
  const [audioPlanApplied,setAudioPlanApplied]=useState(false);
  const [recipientAudioSelected,setRecipientAudioSelected]=useState(false);
  const [pendingAutoVoice,setPendingAutoVoice]=useState<TimedSpeechTranscript|null>(null);
  const sttAbortRef=useRef<AbortController|null>(null);
  useEffect(()=>()=>sttAbortRef.current?.abort(),[]);
  // Same-tab iHelp handoff is read once; the IndexedDB record is deleted.
  useEffect(()=>{
    if(!studioHydrated)return;
    let active=true;
    void consumeVoiceStudioHandoff().then(voice=>{
      if(!active||!voice||uploadedAudioRef.current)return;
      const entry=chooseAudioFile(voice.file);
      if(!entry)return;
      setVoiceTranscript(voice.transcript);
      // The visitor already chose the expressly consented voice-to-video action.
      // Keep the original voice non-looping and do not ask the Goal wizard again.
      setAudioRights(true);
      setAttachedAudio({kind:"file",file:entry.file,id:entry.url,nonLoop:true});
      setImportedAudioSeconds(voice.transcript.durationSeconds);
      setSttError("");
      setActiveWorkspace("editor");
      setMontagePanel("audio");
      setShowAdvancedVideo(true);
      setVideoScenarioOpen(true);
      setPendingAutoVoice(voice.transcript);
      setNotice(locale==="ru"?"Расшифровка получена. Подбираем видеоряд по моментам речи…":
        locale==="es"?"Transcripción recibida. Preparando escenas según el audio…":
          "Transcript received. Matching licensed footage to your spoken moments…");
      window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
        const details=document.querySelector<HTMLDetailsElement>("[data-video-audio-details]");
        if(details)details.open=true;
        document.querySelector("[data-video-audio-storyboard]")?.scrollIntoView({block:"nearest",behavior:"smooth"});
      }));
    });
    return()=>{active=false;};
  },[studioHydrated]);
  const [audioWaveform,setAudioWaveform]=useState<readonly number[]|null>(null);
  const waveformFile=attachedAudio?.kind==="file"&&audioRights?attachedAudio.file:null;
  useEffect(()=>{
    let active=true;
    setAudioWaveform(null);
    if(!waveformFile||waveformFile.size<44||
       waveformFile.size>MYTUBE_WAVEFORM_MAX_FILE_BYTES)
      return ()=>{active=false};
    // Read-only offline decode; neither audio playback nor uploaded media.
    // Only normalized peaks survive; decoded PCM is discarded.
    const analyze=async()=>{
      try{
        if(typeof OfflineAudioContext==="undefined")return;
        const context=new OfflineAudioContext(1,1,44100);
        const decoded=await context.decodeAudioData(await waveformFile.arrayBuffer());
        if(!active||!decoded.length||!Number.isFinite(decoded.duration)||
           decoded.duration>MYTUBE_WAVEFORM_MAX_AUDIO_SECONDS)return;
        const peaks=extractMyTubeWaveform(decoded.getChannelData(0));
        if(active)setAudioWaveform(peaks);
      }catch{if(active)setAudioWaveform(null);}
    };
    void analyze();
    return ()=>{active=false};
  },[waveformFile]);
  const [captionMode,setCaptionMode] = useState<CaptionMode>("none");
  const [customCaption,setCustomCaption] = useState("");
  const [wish,setWish] = useState("");
  const [montageScriptText,setMontageScriptText]=useState("");
  const [cinematicPlan,setCinematicPlan] = useState<CinematicStoryboard|null>(null);
  // Scene photographs stay in this browser session only; no upload or provider handoff.
  const storyboardPhotoAssetsRef=useRef<Record<string,{image:HTMLImageElement;url:string;name:string;width:number;height:number}>>({});
  const [storyboardPhotoRevision,setStoryboardPhotoRevision]=useState(0);
  const storyboardPhotos=useMemo(()=>Object.fromEntries(Object.entries(storyboardPhotoAssetsRef.current)
    .map(([key,value])=>[key,value.image])),[storyboardPhotoRevision]);
  useEffect(()=>()=>{
    Object.values(storyboardPhotoAssetsRef.current).forEach(asset=>URL.revokeObjectURL(asset.url));
    storyboardPhotoAssetsRef.current={};
  },[]);
  const [creationMode,setCreationMode] = useState<"catalog"|"generated">("catalog");
  const [freeVideoPlan,setFreeVideoPlan] = useState<FreeVideoPlan|null>(null);
  const currentFreeVideoPlan=creationMode==="generated"?freeVideoPlan:null;
  // Null preserves original stage captions until the visitor edits the independent text lane.
  const [timelineTextClips,setTimelineTextClips]=useState<TimelineTextClip[]|null>(null);
  const timelineTextSerial=useRef(0);
  const editorDraftInputRef=useRef<HTMLInputElement>(null);
  const subtitleFileInputRef=useRef<HTMLInputElement>(null);
  const [smartCutBusy,setSmartCutBusy]=useState(false);
  const editorDraftEpochRef=useRef(0);
  const localEditorHistoryRef=useRef<EditorHistoryState>(emptyMyTubeEditorHistory() as EditorHistoryState);
  const [editorHistoryAvailability,setEditorHistoryAvailability]=useState({undo:false,redo:false});
  const [appliedStory,setAppliedStory] = useState<StorySelection>({});
  const [greetingCharacter,setGreetingCharacter] = useState<FreeGreetingCharacter>("none");
  const [activeFreeFilmPreset,setActiveFreeFilmPreset] = useState<string|null>(null);
  const [goalTreeAudioScenarioId,setGoalTreeAudioScenarioId] = useState<string|null>(null);
  const [showAllFreeFilms,setShowAllFreeFilms] = useState(false);
  const [readyFreeFilmKey,setReadyFreeFilmKey] = useState("");
  const freeFilmPlayerRefs=useRef<Record<string,HTMLVideoElement>>({});
  const activeFreeFilmShotRef=useRef<string|null>(null);
  const [courseMeditationDraft,setCourseMeditationDraft] = useState("");
  // A deferred opener must never override a later explicit "Do not add" choice.
  const meditationDisclosureEpochRef=useRef(0);
  const [courseMeditationIncluded,setCourseMeditationIncluded]=useState(false);
  const [courseMeditationOmitted,setCourseMeditationOmitted]=useState(false);
  // Commit native <details> after React has committed the corresponding script
  // choice. WebKit can drop an rAF opener when the parent state rerenders.
  // Include and omit share one deterministic, post-commit disclosure owner.
  useLayoutEffect(()=>{
    const details=document.querySelector("[data-video-therapy-meditation-audio]");
    if(!(details instanceof HTMLDetailsElement))return;
    if(courseMeditationOmitted)details.open=false;
    else if(courseMeditationIncluded&&courseMeditationDraft)details.open=true;
  },[courseMeditationIncluded,courseMeditationOmitted,courseMeditationDraft]);
  const [meditationFocus,setMeditationFocus] = useState<GuidedMeditationFocus>({
    difficulty:"",goal:"",goals:[],details:[]
  });
  const updateMeditationFocus=useCallback((focus:GuidedMeditationFocus)=>{
    setMeditationFocus(focus);
  },[]);
  const [affirmations,setAffirmations] = useState<AffirmationSettings>(defaultAffirmations);
  const [voiceGenerating,setVoiceGenerating] = useState(false);
  const [voicePreferences,setVoicePreferences] = useState<AffirmationVoicePreferences>({voiceId:"maya",language:locale,bed:"none"});
  const [suggestion,setSuggestion] = useState("");
  const [photoConsent,setPhotoConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [progress,setProgress] = useState(0);
  const [videoEffectSession,setVideoEffectSession] = useState(0);
  const [videoEffectStarted,setVideoEffectStarted] = useState(false);
  const [videoEffectEnded,setVideoEffectEnded] = useState(false);
  const [notice, setNotice] = useState("");
  const [portraitRetry,setPortraitRetry]=useState<{
    presetId:string;seconds:10|15|20|30|60;edit?:FreeFilmCompilationEdit
  }|null>(null);
  // Zero-cash video XP: separate from Growth Points and unmerged paid CAD wallet.
  const [creditCatalog,setCreditCatalog]=useState<{
    chargeRequired:boolean;ready:boolean;blocked:boolean;priceCredits:number
  }|null>(null);
  const [creditBalance,setCreditBalance]=useState<number|null>(null);
  const [creditSession,setCreditSession]=useState<"checking"|"guest"|"signed_in"|"unavailable">("checking");
  const [guestFirstVideoUsed,setGuestFirstVideoUsed]=useState(false);
  const guestRenderRef=useRef(false);
  const creditSessionProbe=useRef(0);
  const refreshCreditSession=useCallback(async()=>{
    const epoch=++creditSessionProbe.current;
    try{
      const data=await fetchVideoCreditStatus();
      if(epoch!==creditSessionProbe.current)return;
      setCreditBalance(data.balanceCredits);
      setCreditSession("signed_in");
    }catch(error){
      if(epoch!==creditSessionProbe.current)return;
      setCreditBalance(null);
      // 401 is explicit; an outage, timeout or 500 cannot bypass the XP ledger.
      setCreditSession(error instanceof Error&&error.message==="SIGN_IN_REQUIRED"?"guest":"unavailable");
    }
  },[]);
  // Preview-only eligibility: the original server ledger still authorizes every debit.
  const basicVideoAccess=readyBasicVideoAccess({
    catalog:creditCatalog,session:creditSession,balanceCredits:creditBalance,guestFirstVideoUsed
  });
  const [creditConfirmed,setCreditConfirmed]=useState(true);
  const [creditRetry,setCreditRetry]=useState(false);
  const creditOpRef=useRef<string|null>(null);
  const creditValidRef=useRef(false);
  const creditCompletingRef=useRef(false);
  useEffect(()=>{
    let active=true;
    void fetchVideoCreditCatalog()
      .then(data=>{if(active)setCreditCatalog(data);})
      .catch(()=>{if(active)setCreditCatalog({chargeRequired:true,ready:false,blocked:true,priceCredits:10});});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(!creditCatalog?.ready)return;
    void refreshCreditSession();
    // OAuth runs in a separate tab so the original on-device Blob survives.
    const onFocus=()=>{void refreshCreditSession();};
    const onVisible=()=>{if(document.visibilityState==="visible")void refreshCreditSession();};
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onVisible);
    return()=>{
      creditSessionProbe.current++;
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onVisible);
    };
  },[creditCatalog?.ready,refreshCreditSession]);
  const [musicWarning,setMusicWarning] = useState("");
  // Declare before the guest-first useEffect: TS/Next validates this
  // hook state before it is referenced, even when effect runs later.
  // A nonempty MediaRecorder blob does NOT prove Safari can decode it.
  const [playbackStatus, setPlaybackStatus] = useState<"checking"|"ready"|"failed">("checking");
  const [result, setResult] = useState<Result | null>(null);
  useEffect(()=>{
    // Consume the anonymous local trial only once a real encoded Blob exists.
    // A failed preflight/export does not consume it.
    if(result&&result.mode!=="catalog"&&guestRenderRef.current&&playbackStatus==="ready")
      setGuestFirstVideoUsed(true);
  },[result,playbackStatus]);
  const [deliveryChooserOpen,setDeliveryChooserOpen] = useState(false);
  const [exportUnavailable, setExportUnavailable] = useState(false);
  // Browser-only non-personal diagnostic; the user opts in to lower-res retry.
  const [webkitRecoveryReason,setWebkitRecoveryReason] = useState<string|null>(null);
  const [pendingCompatibleRetry,setPendingCompatibleRetry]=useState<string|null>(null);
  const autoWebmRetryForRef=useRef<string|null>(null);
  const autoWebmRetryUrlRef=useRef<string|null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultVideoRef=useRef<HTMLVideoElement>(null);
  const shownReadyResultRef=useRef<string|null>(null);
  useEffect(()=>{
    // Only a native, decodable exported video opens Ready automatically.
    if(!result||result.mode==="catalog"||playbackStatus!=="ready"||!creditConfirmed)return;
    const player=resultVideoRef.current;
    if(!player||player.error||player.readyState<2||player.videoWidth<1||player.videoHeight<1)return;
    if(shownReadyResultRef.current===result.url)return;
    shownReadyResultRef.current=result.url;
    setStudioMode("pump");setActiveWorkspace("ready");
    window.requestAnimationFrame(()=>document.getElementById("free-personal-video")
      ?.scrollIntoView({block:"start",behavior:"auto"}));
  },[result,playbackStatus,creditConfirmed]);
  const quickThemeAdvancedRef=useRef<HTMLDetailsElement>(null);
  const premiumVideoRef = useRef<HTMLVideoElement>(null);
  const [premiumReady, setPremiumReady] = useState(false);
  const activeMoneyFilm = theme==="money" && moneyScene ? getRealMoneyFilm(moneyScene) : null;
  const activeThemedFilm = theme!=="money" ? getThemedRealFilm(theme, otherScene) : null;
  const activeFilm = creationMode==="generated" || cinematicPlan ? null : activeMoneyFilm || activeThemedFilm;
  const styleFilmRef=useRef<HTMLVideoElement>(null);
  const [styleFilmReady,setStyleFilmReady]=useState(false);
  const selectedStyleFilm=activeMontageStyleId?quickStyleFilmFor(theme,quickStyleIndex):null;
  useEffect(()=>{setStyleFilmReady(false);},[selectedStyleFilm?.src]);
  useEffect(()=>{
    const video=styleFilmRef.current;if(!video)return;
    if(previewPlaying||preparing||recording){
      video.muted=true;void video.play().catch(()=>{/* retry on native canplay */});
    }else video.pause();
    return ()=>video.pause();
  },[selectedStyleFilm?.src,previewPlaying,preparing,recording]);
  const usingFreeFilmCompilation=creationMode==="catalog"&&cinematicPlan?.version===FREE_FILM_PLAN_VERSION;
  const freeFilmShots=usingFreeFilmCompilation
    ? cinematicPlan.shots.map(shot=>({
        sceneId:shot.sceneId,theme:shot.theme,
        film:firstPartyFilmFor(shot.theme,shot.sceneId)
      }))
    : [];
  const freeFilmKey=usingFreeFilmCompilation
    ? JSON.stringify(freeFilmShots.map(shot=>[shot.theme,shot.sceneId])) : "";
  const freeFilmReady=Boolean(freeFilmKey && readyFreeFilmKey===freeFilmKey);
  // Safari may postpone decoding hidden MP4 until a trusted Create gesture.
  // Presence of all four verified catalogue sources unlocks the button;
  // the actual decoded-frame check remains mandatory during export.
  const freeFilmSourcesListed=freeFilmShots.length>=4&&freeFilmShots.length<=12&&
    freeFilmShots.every((shot,index)=>{
      const verified=verifiedCategorySource(FREE_FILM_CATALOG_BY_ID.get(shot.sceneId));
      return Boolean(shot.film&&verified&&verifiedSceneAspect(verified,aspect)&&
        verified.durationSeconds>=cinematicPlan!.shots[index].durationSeconds);
    })&&new Set(freeFilmShots.map(shot=>
      canonicalSourceMasterKey(verifiedCategorySource(FREE_FILM_CATALOG_BY_ID.get(shot.sceneId))))).size===freeFilmShots.length;
  // If iOS rejects a finalized Canvas recording, preserve a real, public,
  // licensed MP4 source as an explicitly UNEDITED escape hatch. Never present
  // it as the personal montage, with applied music/photo/text or duration.
  const originalFallbackCandidate=creationMode==="generated"?null:cinematicPlan?.shots[0]
    ? firstPartyFilmFor(cinematicPlan.shots[0].theme,cinematicPlan.shots[0].sceneId)?.src
    : activeFilm?.src;
  const originalFallbackMp4=canOfferOriginalVideoSource(professionalMode) && originalFallbackCandidate &&
    /^\/videos\/holistic-house\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\.mp4$/.test(originalFallbackCandidate)
    ? originalFallbackCandidate : null;
  const freeFilmPoster=usingFreeFilmCompilation&&freeFilmShots[0]
    ? firstPartyFilmFor(freeFilmShots[0].theme,freeFilmShots[0].sceneId)?.poster:null;
  const aspectFilmPresets:readonly FreeFilmPreset[]=FREE_FILM_PRESETS.map(preset=>aspect==="portrait"&&preset.portraitClips
    ?{...preset,clips:preset.portraitClips}:preset);
  const freeFilmOptions=showAllFreeFilms?aspectFilmPresets:
    aspectFilmPresets.filter(preset=>preset.theme===theme);
  const effectiveAudioStartSeconds=clampTrackSecond(audioStartSeconds,Math.max(0,duration-.1));
  const timelineCaptions:TimelineTextClip[]=timelineTextClips??(
    usingFreeFilmCompilation&&cinematicPlan
      ?cinematicPlan.shots.flatMap((shot,index)=>shot.overlayText
        ?[{id:"stage-"+index,text:normalizeStageCaption(shot.overlayText),
          startSeconds:shot.startSeconds,durationSeconds:shot.durationSeconds}]
        :[]):[]);
  const currentEditorSnapshot=():EditorHistorySnapshot=>({
    plan:cinematicPlan,captions:timelineTextClips,audioOffset:audioStartSeconds,
    aspect,duration,musicBed
  });
  const syncEditorHistory=()=>{
    const h=localEditorHistoryRef.current;
    setEditorHistoryAvailability({undo:h.past.length>0,redo:h.future.length>0});
  };
  const resetEditorHistory=()=>{
    editorDraftEpochRef.current++;
    localEditorHistoryRef.current=emptyMyTubeEditorHistory() as EditorHistoryState;
    setEditorHistoryAvailability({undo:false,redo:false});
  };
  const recordBeforeEditorChange=(kind:string)=>{
    if(recording||preparing||cinematicPlan?.version!==FREE_FILM_PLAN_VERSION)return;
    editorDraftEpochRef.current++;
    localEditorHistoryRef.current=recordMyTubeEditorUndo(
      localEditorHistoryRef.current,currentEditorSnapshot(),kind,Date.now()
    ) as EditorHistoryState;
    syncEditorHistory();
  };
  const restoreEditorSnapshot=(snapshot:EditorHistorySnapshot)=>{
    setCinematicPlan(snapshot.plan);
    setTimelineTextClips(snapshot.captions);
    setAudioStartSeconds(snapshot.audioOffset);
    setAspect(snapshot.aspect);setDuration(snapshot.duration);
    setMusicBed(snapshot.musicBed);
    stopMovieSound();setPreviewPlaying(false);
    setPreviewFrameRevision(value=>value+1);
  };
  const undoEditorChange=()=>{
    if(recording||preparing||!usingFreeFilmCompilation)return;
    const result=undoMyTubeEditor(localEditorHistoryRef.current,currentEditorSnapshot()) as {
      history:EditorHistoryState;snapshot:EditorHistorySnapshot|null};
    if(!result.snapshot)return;
    localEditorHistoryRef.current=result.history;
    restoreEditorSnapshot(result.snapshot);syncEditorHistory();
  };
  const redoEditorChange=()=>{
    if(recording||preparing||!usingFreeFilmCompilation)return;
    const result=redoMyTubeEditor(localEditorHistoryRef.current,currentEditorSnapshot()) as {
      history:EditorHistoryState;snapshot:EditorHistorySnapshot|null};
    if(!result.snapshot)return;
    localEditorHistoryRef.current=result.history;
    restoreEditorSnapshot(result.snapshot);syncEditorHistory();
  };
  const editorDraftAllowlist=()=>{
    return {approvedSceneIds:FREE_FILM_CATALOG.filter(scene=>scene.status==="approved")
      .map(scene=>scene.id),
      approvedPresetIds:FREE_FILM_PRESETS.map(preset=>preset.id),
      approvedAudioIds:[...MYTUBE_MUSIC_BEDS,...MYTUBE_REVIEWED_MUSIC_BEDS]};
  };
  const saveEditorDraft=()=>{
    if(recording||preparing||!usingFreeFilmCompilation||!cinematicPlan||!activeFreeFilmPreset)
      return;
    try{
      const json=createMyTubeEditorDraft({
        presetId:activeFreeFilmPreset,aspect,durationSeconds:duration,
        shots:cinematicPlan.shots,captions:timelineTextClips,
        audioStartSeconds:effectiveAudioStartSeconds,musicBed,
      },editorDraftAllowlist());
      const url=URL.createObjectURL(new Blob([json],{type:"application/json"}));
      const link=document.createElement("a");
      link.href=url;link.download="mytube-video-draft.json";
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),5000);
      setNotice(locale==="ru"?"Черновик сохранён на устройстве. Фото и аудиофайлы в него не включаются.":
        locale==="es"?"Borrador guardado localmente; no incluye fotos ni archivos de audio.":
        "Draft saved on your device, without photo or audio files.");
    }catch{
      setNotice(locale==="ru"?"Не удалось сохранить черновик монтажа.":
        locale==="es"?"No se pudo guardar el borrador.":"Could not save the montage draft.");
    }
  };
  const importEditorDraft=async(file:File)=>{
    if(recording||preparing)return;
    const epoch=++editorDraftEpochRef.current;
    try{
      if(file.size<2||file.size>MYTUBE_DRAFT_MAX_BYTES)throw Error("invalid_file_size");
      const json=await file.text();
      if(recording||preparing||epoch!==editorDraftEpochRef.current)return;
      const draft=parseMyTubeEditorDraft(json,editorDraftAllowlist()) as ImportedEditorDraft;
      const preset=FREE_FILM_PRESETS.find(item=>item.id===draft.presetId);
      if(!preset)throw Error("unapproved_preset");
      // The real licensed-source compiler is mandatory: JSON cannot introduce
      // new MP4 paths, third-party media, unlicensed effects or provider prompts.
      const clean=compileFreeFilmPreset(preset,locale,draft.durationSeconds,draft.aspect,{
        clipIds:draft.shots.map(shot=>shot.sceneId),
        durationSecondsByStage:draft.shots.map(shot=>shot.durationSeconds),
        captionTexts:draft.shots.map(shot=>shot.captionText),
      });
      const plan={...clean,shots:clean.shots.map((shot,index)=>({
        ...shot,transitionIn:draft.shots[index].transitionIn,
        colorLook:draft.shots[index].colorLook,
        motion:draft.shots[index].motion??null,
        sourcePhasePercent:draft.shots[index].sourcePhasePercent??0,
        sourceSpeed:draft.shots[index].sourceSpeed??1,
      }))} as CinematicStoryboard;
      resetEditorHistory();stopMovieSound();setPreviewPlaying(false);
      setTheme(preset.theme);setVideoCategory(preset.theme);
      if(preset.theme==="money"){
        setMoneyScene(preset.id.startsWith("motion-film-")?null:preset.clips[0] as MoneySceneId);
      }else{
        setMoneyScene(null);setOtherScene(otherVideoScenes[preset.theme][0].id);
      }
      setPracticeType("video");setPracticeLevels(value=>({...value,video:"basic"}));
      setCreationMode("catalog");setActiveFreeFilmPreset(preset.id);
      setCinematicPlan(plan);setTimelineTextClips(draft.captions);
      setAspect(draft.aspect);setDuration(draft.durationSeconds);
      setAudioStartSeconds(draft.audioStartSeconds);
      setMusicBed(draft.musicBed??{id:"none",volumePercent:30,fadeSeconds:1});
      // A portable draft contains metadata only; previous narration/music must
      // never be misrepresented as attached to the newly imported film.
      setAttachedAudio(null);setMusic("none");setAudioAuto(false);
      setAudioDurationInvalid(false);setMusicWarning("");
      setPreviewSeekSeconds(0);setPreviewPlayhead(0);
      setReadyFreeFilmKey("");setPreviewFrameRevision(value=>value+1);
      setActiveWorkspace("editor");
      for(const clip of draft.captions??[]){
        const match=clip.id.match(/^timeline-text-(\d+)$/);
        if(match){
          const serial=Number(match[1]);
          if(Number.isSafeInteger(serial))timelineTextSerial.current=Math.max(timelineTextSerial.current,serial);
        }
      }
      setNotice(locale==="ru"?"Монтаж восстановлен. Фото, голос и музыка не входят в файл черновика — при необходимости добавьте их снова.":
        locale==="es"?"Montaje restaurado. Vuelve a adjuntar la foto, voz y música si las necesitas.":
        "Montage restored. Reattach photo, voice or music as needed; media is not stored in the draft.");
    }catch{
      setNotice(locale==="ru"?"Черновик не подходит: разрешены только сохранённые здесь лицензированные сцены и корректные параметры.":
        locale==="es"?"Borrador inválido: solo se admiten escenas autorizadas y ajustes válidos.":
        "Invalid draft: only approved scenes and valid settings can be restored.");
    }finally{
      if(epoch===editorDraftEpochRef.current&&editorDraftInputRef.current)
        editorDraftInputRef.current.value="";
    }
  };
  const importEditorSubtitles=async(file:File)=>{
    if(recording||preparing||file.size<2||file.size>CAPTION_SRT_BYTES)return;
    try{
      const oldSignature=sourceRef.current;
      const srt=await file.text();
      if(oldSignature!==sourceRef.current)return;
      const captions=importSrtCaptionClips(srt,duration) as TimelineTextClip[];
      recordBeforeEditorChange("srt-import");
      setTimelineTextClips(captions);
      stopMovieSound();setPreviewPlaying(false);
      setNotice(locale==="ru"?"Субтитры SRT добавлены на монтажную шкалу.":
        locale==="es"?"Subtítulos SRT añadidos a la línea de tiempo.":
        "SRT subtitles added to the editable timeline.");
    }catch{
      setNotice(locale==="ru"?"Ошибка SRT: нужны корректные таймкоды и не более 16 надписей.":
        locale==="es"?"SRT inválido: marcas de tiempo y máximo de 16 líneas.":
        "Invalid SRT: check timecodes and the 16-caption limit.");
    }finally{
      if(subtitleFileInputRef.current)subtitleFileInputRef.current.value="";
    }
  };
  const exportEditorSubtitles=()=>{
    if(recording||preparing||!timelineCaptions.length)return;
    try{
      const srt=exportSrtCaptionClips(timelineCaptions,duration);
      const url=URL.createObjectURL(new Blob([srt],{type:"text/plain;charset=utf-8"}));
      const link=document.createElement("a");link.href=url;
      link.download="mytube-subtitles.srt";
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),5000);
    }catch{
      setNotice(locale==="ru"?"Не удалось экспортировать субтитры.":
        locale==="es"?"No se pudieron exportar los subtítulos.":
        "Subtitles could not be exported.");
    }
  };
  const smartCutFromAudio=async()=>{
    if(recording||preparing||smartCutBusy||!usingFreeFilmCompilation||
       !cinematicPlan||attachedAudio?.kind!=="file")return;
    const file=attachedAudio.file;
    if(!file.size||file.size>Math.min(SMART_CUT_MAX_AUDIO_BYTES,8*1024*1024)){
      setNotice(locale==="ru"?"Для анализа ритма выберите аудиофайл до 8 МБ.":
        locale==="es"?"Selecciona un archivo de audio de hasta 8 MB.":
        "Choose an audio file up to 8 MB for beat analysis.");return;
    }
    setSmartCutBusy(true);
    const sourceSignature=sourceRef.current;
    let ctx:AudioContext|null=null;
    try{
      ctx=new AudioContext();
      const audio=await ctx.decodeAudioData(await file.arrayBuffer());
      if(sourceRef.current!==sourceSignature)return;
      const pulses=audioTransientScores(audio.getChannelData(0),audio.sampleRate,duration);
      const proposal=recommendSmartAudioCuts(duration,cinematicPlan.shots,pulses);
      if(proposal.status!=="audio_aligned"){
        setNotice(locale==="ru"?"В аудио нет достаточно чётких ритмических акцентов: исходный монтаж сохранён.":
          locale==="es"?"No se detectó un ritmo claro: el montaje no cambia.":
          "No clear beats detected; your current edit is unchanged.");return;
      }
      recordBeforeEditorChange("smart-audio-cut");
      setCinematicPlan(current=>{
        if(current?.version!==FREE_FILM_PLAN_VERSION)return current;
        const nextShots=current.shots.map((shot,i)=>({...shot,
          startSeconds:proposal.shots[i].startSeconds,
          durationSeconds:proposal.shots[i].durationSeconds}));
        return {...current,shots:nextShots} as CinematicStoryboard;
      });
      stopMovieSound();setPreviewPlaying(false);setPreviewFrameRevision(v=>v+1);
      setNotice(locale==="ru"?"Четыре видеосцены выровнены по ритмическим акцентам аудио. Проверьте результат.":
        locale==="es"?"Cuatro escenas ajustadas a los acentos musicales; revisa el resultado.":
        "Four scenes aligned to audio transients. Review the resulting cuts.");
    }catch{
      setNotice(locale==="ru"?"Не удалось проанализировать аудио на этом устройстве.":
        locale==="es"?"No se pudo analizar este audio en el dispositivo.":
        "Could not analyze this audio on this device.");
    }finally{
      if(ctx)void ctx.close().catch(()=>{});
      setSmartCutBusy(false);
    }
  };
  const freeFilmClipLabel=(id:string)=>{
    const origin=FREE_FILM_CLIP_THEMES[id];
    return origin==="money"
      ?moneyTemplateLabels[id as MoneySceneId]?.[locale]||
        moneyScenes.find(scene=>scene.id===id)?.label[locale]||id
      :origin?otherVideoScenes[origin].find(scene=>scene.id===id)?.label[locale]||FREE_FILM_CATALOG_BY_ID.get(id)?.label[locale]||id:id;
  };
  // These are the SAME original, source-backed scenes as the full gallery.
  // The compact Hypno video-design rail is a shortcut, not a second editor.
  const hypnoScenes = theme === "money"
    ? moneyScenes.slice(0,5).map(item=>({id:item.id,label:item.label[locale],symbol:item.symbol,poster:getRealMoneyFilm(item.id).poster}))
    : otherVideoScenes[theme].slice(0,5).map(item=>({id:item.id,label:item.label[locale],symbol:item.symbol,poster:getThemedRealFilm(theme,item.id)?.poster||null}));
  const jobRef = useRef<Job | null>(null);
  // Same cancellation authority for the Safari H.264/AAC encoder.
  const webCodecJobRef = useRef<AbortController|null>(null);
  const firstVideoRequestRef=useRef(false);
  useEffect(()=>{
    if(!result||!firstVideoRequestRef.current)return;
    firstVideoRequestRef.current=false;
    window.requestAnimationFrame(()=>document.getElementById("personal-video-result")?.scrollIntoView({
      behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start",
    }));
  },[result]);
  const aliveRef = useRef(false);
  const preparingRef = useRef(false);
  const source = backgroundOnly ? BACKGROUND_CLIP : photoUrl || frameUrl || BACKGROUND_CLIP;
  const sceneName = theme === "money"
    ? moneyTemplateLabels[moneyScene || "golden-rain"]?.[locale] ||
      moneyScenes.find(item => item.id === moneyScene)?.label[locale] || ""
    : otherVideoScenes[theme].find(item => item.id === otherScene)?.label[locale] || "";
  // One local script shared with the selected Style video scene / confirmed
  // four-clip montage; selection changes seed the editor, not a paid provider.
  const selectedStyleScenario=timelineTextClips?.length
    ?timelineTextClips.map((clip,index)=>`${index+1}. ${clip.text}`).join("\n")
    :cinematicPlan?.shots.length
      ?cinematicPlan.shots.map((shot,index)=>`${index+1}. ${shot.overlayText||freeFilmClipLabel(shot.sceneId)}`).join("\n")
      :[sceneName,wish.trim()].filter(Boolean).join(" — ");
  useEffect(()=>setMontageScriptText(selectedStyleScenario),[selectedStyleScenario]);
  const caption = captionMode==="none" ? "" :
    captionMode==="custom" ? customCaption.trim() : sceneName;
  const affirmationLines = linesForVideoAffirmations(locale,theme,affirmations);
  // Authored setup clips suppress the original transient duplicate overlays.
  const currentAffirmationSpeech=affirmations.enabled?affirmationNarrationText(affirmationLines):"";
  // Phrase selection is part of the approved narration itself: removing a spoken
  // line invalidates its WAV immediately, even while the phrase editor is pending.
  // Other changes (duration/voice preferences) wait until pending edits are approved.
  const narrationPhraseMismatch=attachedAudio?.kind==="file"&&attachedAudio.narration&&
    !isApprovedAffirmationNarration(affirmationLines,attachedAudio.spokenText,affirmations.enabled);
  const narrationDurationMismatch=attachedAudio?.kind==="file"&&attachedAudio.narration&&
    Math.abs((attachedAudio.mixSeconds??0)-duration)>0.35;
  const narrationInvalid=Boolean(attachedAudio?.kind==="file"&&attachedAudio.narration&&
    (narrationPhraseMismatch || (!phrasePending&&(narrationDurationMismatch ||
      attachedAudio.voiceId!==voicePreferences.voiceId || attachedAudio.language!==voicePreferences.language ||
      attachedAudio.bed!==voicePreferences.bed ||
      (attachedAudio.speechSeconds||0)>duration-effectiveAudioStartSeconds-0.35))));
  // Select one client-appropriate text source before any Canvas frame is drawn.
  // Explicit edits and already-approved speech are protected from replacement.
  const singleTextSource=pickSingleVideoTextSource({
    affirmationsEnabled:affirmations.enabled,affirmationLines,
    affirmationVisibility:affirmations.visibility,timelineCaptions:timelineTextClips,
    storyboardCaptions:cinematicPlan?.version===FREE_FILM_PLAN_VERSION
      ?cinematicPlan.shots.map(shot=>shot.overlayText||""):[],
    captionMode,caption,wish,
    approvedNarration:Boolean(attachedAudio?.kind==="file"&&attachedAudio.narration&&!narrationInvalid),
  });
  const visibleCaption=singleTextSource==="caption"?caption:"";
  const attachedPresetIds:PresetId[]=attachedAudio?.kind==="presets"?attachedAudio.ids
    :attachedAudio?.kind==="preset"?[attachedAudio.id]:[];
  const selectedAudioKey=uploadedAudio?"file:"+uploadedAudio.url:music==="none"?"none"
    :attachedAudio?.kind==="presets"&&attachedAudio.ids.includes(music)
      ?"presets:"+attachedAudio.ids.join(","):"preset:"+music;
  const attachedAudioKey=attachedAudio===null?"none":attachedAudio.kind==="preset"
    ?"preset:"+attachedAudio.id:attachedAudio.kind==="presets"
      ?"presets:"+attachedAudio.ids.join(","):"file:"+attachedAudio.id;
  // An automatic music recommendation is not an explicit visitor attachment.
  // Effects may export a silent local movie; manual and uploaded audio still
  // require the normal attachment and rights checks.
  const hypnoUnattachedAutoSuggestion=activeWorkspace==="effects" &&
    audioAuto && !uploadedAudio && attachedAudio===null;
  const audioNeedsAttachment=selectedAudioKey!==attachedAudioKey &&
    !hypnoUnattachedAutoSuggestion;
  // For background-only video, async mandala/photo frame updates are
  // intentionally unrelated. Do not abort an active free export when
  // a decorative image finishes loading in a different editor panel.
  const greetingSceneKey=cinematicPlan?.shots.slice(-1)[0]?.sceneId || (theme==="money"?moneyScene||otherScene:otherScene);
  const signature = JSON.stringify([source,backgroundOnly?null:frameUrl,backgroundOnly?null:photoUrl,theme,moneyScene,otherScene,backgroundOnly,
    effect,aspect,duration,quality,speed,brightness,attachedAudioKey,attachedAudio?soundVolume:0,
    audioStartSeconds,timelineTextClips,caption,singleTextSource,wish,affirmations,hypnoLight,
    attachedAudio?.kind==="file"?musicBed:null,
    cinematicPlan?.version,cinematicPlan?.styleId,cinematicPlan?.shots.map(shot=>[shot.sceneId,shot.startSeconds,shot.durationSeconds,shot.overlayText||"",
       shot.transitionIn||"soft",shot.colorLook||"original",shot.motion??null,
       shot.sourcePhasePercent??0,shot.sourceSpeed??1]),appliedStory,
    creationMode,activeMontageStyleId,currentFreeVideoPlan?.seed,currentFreeVideoPlan?.family,currentFreeVideoPlan?.palette,
    currentFreeVideoPlan?.motion,currentFreeVideoPlan?.variation,currentFreeVideoPlan?.reducedMotion,professionalMode,greetingCharacter,greetingSceneKey,storyboardPhotoRevision]);
  const sourceRef = useRef(signature);
  sourceRef.current = signature;
  // Keep the real Create button reachable when user must attach/authorize audio.
  const canStartSelectedFilm=freeVideoSelected && freeFilmSourcesListed &&
    !micRecording && !preparing && !recording && !photoPending;
  // Create remains available before optional MP4 decoding: the trusted Create
  // tap performs the bounded decode, rather than disabling this action forever.
  const canGenerate = Boolean(source) && (creationMode!=="generated" || Boolean(currentFreeVideoPlan)) &&
    (!usingFreeFilmCompilation || freeFilmSourcesListed) &&
    (backgroundOnly || (Boolean(photoUrl) && photoConsent)) &&
    (!uploadedAudio || audioRights) && !audioNeedsAttachment &&
    !audioDurationInvalid && !micRecording && !preparing && !recording && !voiceGenerating && !narrationInvalid && !phrasePending && !photoPending &&
    creditCatalog!==null && (!creditCatalog.chargeRequired||creditCatalog.ready) &&
    (!creditCatalog.chargeRequired||creditSession==="signed_in"||
      (creditSession==="guest"&&!guestFirstVideoUsed)) &&
    !creditOpRef.current;
  const previewAudioUrl = samplePreviewId ? presetAudioUrl(samplePreviewId) : uploadedAudio?.url || (music==="none" ? null : presetAudioUrl(music));
  // Context comes from the existing theme/filter on this very screen.
  // A typed wish influences ranking locally; no profile, tests or health data is read.
  const audioCategory=audioCategoryOverride||inferVideoAudioCategory({theme,concept:approvedVideoConcept,wish});
  const categoryTheme:VideoTheme=audioCategory==="wellbeing"?"health":audioCategory==="focus"?"goals":
    audioCategory==="calm"?"life":audioCategory==="love"?"relationships":"energy";
  const audioTheme=audioThemeOverride||(audioCategory==="all"?theme:categoryTheme);
  // The existing 48 scenario packs each provide four original, distinct tracks.
  // Preserve the canonical scenario/classical collection in this compact UI.
  const goalTreeTracks=goalTreeAudioScenarioId?getGoalTreeAudioChoices(goalTreeAudioScenarioId):[];
  const filmScenarioTracks=activeFreeFilmPreset&&usingFreeFilmCompilation?scenarioAudioTracks(activeFreeFilmPreset):[];
  // The phrase catalog's explicit storyboard selection outranks the generic
  // film preset recommendation. Every choice is a real, prebuilt first-party MP3.
  const scenarioTracks=goalTreeTracks.length?goalTreeTracks:filmScenarioTracks;
  const curatedMatches=recommendCuratedAudio({
    theme:audioTheme,kind:audioKind,mood:audioMood,pace:audioPace,
    voiceFriendly:audioVoiceFriendly,
  }).filter(track=>curatedAudioMatchesCategory(track,audioCategory));
  // Offer every approved first-party score, not only this storyboard's four.
  // The active story still ranks first; other scores keep their actual IDs.
  const libraryScenarioTracks=useMemo(
    ()=>SCENARIO_AUDIO_REGISTRY.flatMap((scene:{id:string})=>scenarioAudioTracks(scene.id)),[]);
  // Only reviewed first-party-hosted, rights-cleared MP3 recordings are new choices.
  // Keep generated historical IDs below solely for previously saved projects.
  const audioCandidates=[...curatedMatches];
  const seenAudioSearchIds=new Set<string>();
  // Retain all 196 approved tracks and full deduplicated theme-filtered catalogue.
  const filteredLibraryAudio=audioCandidates.filter(track=>{
    if(seenAudioSearchIds.has(track.id))return false;
    seenAudioSearchIds.add(track.id);
    return !audioThemeOverride||track.themes.includes(audioThemeOverride);
  });
  // Local ranking uses only the current goal and explicitly consented speech.
  const musicContext={
    theme:audioTheme,wish,transcript:voiceTranscript?.text||"",
    scenarioId:activeFreeFilmPreset||"",
    priorityIds:scenarioTracks.map(track=>track.id),
    voiceFriendly:audioVoiceFriendly||Boolean(voiceTranscript),
  };
  const rankedAudioPool=filteredLibraryAudio.filter(track=>track.kind==="melody");
  const rankedAudioMelodies=rankPersonalMusic({tracks:rankedAudioPool,
    ...musicContext,kind:audioKind,mood:audioMood,pace:audioPace,limit:300});
  const audioMatches=audioKind==="all"?[...rankedAudioMelodies,
      ...filteredLibraryAudio.filter(track=>track.kind!=="melody")]:
    audioKind==="melody"?rankedAudioMelodies:filteredLibraryAudio;
  // Keep every licensed track addressable by the SAME existing player/export,
  // even after changing the search filters or moving between storyboards.
  const availableAudioCandidates=[...scenarioTracks,...filmScenarioTracks,
    ...curatedAudioTracks,...libraryScenarioTracks,...classicalAudioTracks,...mandalaAudioTracks];
  const seenAvailableAudioIds=new Set<string>();
  const availableAudioTracks=availableAudioCandidates.filter(track=>{
    if(seenAvailableAudioIds.has(track.id))return false;
    seenAvailableAudioIds.add(track.id);
    return true;
  });
  // New music suggestions require fully reviewed performances, not just a license.
  // With narration attached, fail closed until acoustic quality is approved;
  // users can still explicitly select a licensed bed in Voice Background.
  const voiceBedMode=attachedAudio?.kind==="file";
  const featuredMelodies=rankPersonalMusic({
    tracks:voiceBedMode?[]:rankedAudioPool,
    ...musicContext,kind:"melody",mood:"all",pace:"all",
    voiceFriendly:voiceBedMode||musicContext.voiceFriendly,limit:3,
  });
  const recommendedAudioId = (voiceBedMode?featuredMelodies[0]:
    audioMatches[0]||featuredMelodies[0])?.id as Exclude<AmbientMusic, "none"> | undefined;
  const selectedAudio = availableAudioTracks.find(item=>item.id===music);
  const reviewedRecording=curatedAudioTracks.find(item=>item.id===music);
  const appliedAudioName=attachedAudio===null?audioUi.noAttached:attachedAudio.kind==="file"
    ?attachedAudio.file.name:attachedAudio.kind==="presets"
      ?attachedAudio.ids.map(id=>availableAudioTracks.find(item=>item.id===id)?.name[locale]||id).join(" + ")
      :availableAudioTracks.find(item=>item.id===attachedAudio.id)?.name[locale]||attachedAudio.id;
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
      auditionGainRef.current?.mixer.close();auditionGainRef.current=null;
      stopMovieSound();
      restoreAudioSessionRef.current?.();
      restoreAudioSessionRef.current = null;
      if(uploadedAudioRef.current) URL.revokeObjectURL(uploadedAudioRef.current.url);
      micSpeechRef.current?.abort();micSpeechRef.current=null;
      if(micRef.current){
        clearTimeout(micRef.current.timeout);
        micRef.current.recorder.onstop=null;
        try{if(micRef.current.recorder.state!=="inactive")micRef.current.recorder.stop();}catch{}
        micRef.current.stream.getTracks().forEach(track=>track.stop());
        micRef.current=null;
      }
      aliveRef.current = false;
      const unusedCredit=creditOpRef.current;
      creditOpRef.current=null;
      creditValidRef.current=false;
      if(unusedCredit){
        releaseVideoCreditOnExit(unusedCredit);
      }
      webCodecJobRef.current?.abort();
      const job = jobRef.current;
      if (job) {
        stopJob(job, true);
        job.stream.getTracks().forEach(track => track.stop());
        jobRef.current = null;
      }
    };
  }, []);

  useEffect(() => () => {
    if (result?.url && result.mode!=="catalog") URL.revokeObjectURL(result.url);
  }, [result]);
  // iOS can delay media decoding until the inline player becomes visible or
  // the visitor taps Play. Never expose a broken file as a finished download.
  useEffect(() => {
    if (!result || playbackStatus !== "checking") return;
    const timer=window.setTimeout(()=>{
      // A Safari decoder may wait for physical Play; elapsed time is NOT
      // evidence of a corrupt MP4 and cannot authorize/discard an XP charge.
      setNotice(locale==="ru"?"Нажмите «Воспроизвести и проверить» для проверки видео.":
        locale==="es"?"Pulsa «Reproducir y verificar» para comprobar el vídeo.":
        "Tap Play & verify video before saving.");
    },20000);
    return ()=>window.clearTimeout(timer);
  },[result,playbackStatus,locale]);
  // Keep downloadable files gated until the native player decodes the output
  // and the authenticated server confirms the EXACT reserved operation.
  useEffect(()=>{
    if(!result||result.mode==="catalog")return;
    if(playbackStatus==="failed"){
      const held=creditOpRef.current;
      const recoverAsWebm=autoWebmRetryUrlRef.current===result.url;
      if(!held&&!recoverAsWebm)return;
      // Release the old operation before another export: never debit for an
      // MP4 that the native player rejected, or race the duplicate hold guard.
      void (async()=>{
        if(held&&creditValidRef.current)await releaseCredit(held);
        if(recoverAsWebm&&aliveRef.current&&sourceRef.current===signature)
          setPendingCompatibleRetry(signature);
      })();
    }else if(playbackStatus==="ready"&&creditOpRef.current&&creditValidRef.current){
      void confirmCredit();
    }
  },[result,playbackStatus]);

  useEffect(()=>{
    if(!pendingCompatibleRetry||pendingCompatibleRetry!==signature||!canGenerate||
      preparingRef.current||jobRef.current||webCodecJobRef.current)return;
    setPendingCompatibleRetry(null);
    // The original on-device Canvas renderer keeps the same scenes and audio.
    // WebM is a distinct MediaRecorder path, never a second Safari MP4.
    void createVideo(true);
  },[pendingCompatibleRetry,signature,canGenerate]);

  // A completed local recording stays in the Ready workspace. Keep the
  // original verifier mounted for WebKit recovery without navigating to PRO.
  useEffect(() => {
    if (!result) return;
    if(result.mode!=="catalog"){
      setActiveWorkspace("ready");
      setStudioMode("pump");
      setIntroPlaying(false);
    }
    setQuickDetailedOpen(true);
    const target=result.mode==="catalog"?"personal-video-result":"free-personal-video";
    let nextFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      nextFrame = window.requestAnimationFrame(() => {
        document.getElementById(target)?.scrollIntoView({
          behavior:"auto",
          block:"start",
        });
      });
    });
    return () => { window.cancelAnimationFrame(firstFrame); window.cancelAnimationFrame(nextFrame); };
  }, [result]);
  // Auto-music must be ATTACHED before the Montage Generate tap and Ready Basic.
  // Previously Ready suggested a track but left it unattached; Create then
  // opened the large Audio overlay instead of rendering. Uploaded tracks,
  // manual choices, silence and rights checks retain their existing gates.
  useEffect(() => {
    if(!audioAuto||uploadedAudio||attachedAudio?.kind==="file"||
       attachedAudio?.kind==="presets")return;
    const recommended=recommendedAudioId||"none";
    setMusic(current=>current===recommended?current:recommended);
    if(activeWorkspace!=="editor"&&activeWorkspace!=="ready")return;
    setAttachedAudio(current=>{
      if(current?.kind==="file"||current?.kind==="presets")return current;
      if(recommended==="none")return null;
      return current?.kind==="preset"&&current.id===recommended?
        current:{kind:"preset",id:recommended};
    });
  },[audioAuto,uploadedAudio,recommendedAudioId,activeWorkspace,attachedAudio?.kind]);
  // A paused film, hidden tab or unmount must not leave a soundtrack playing.
  useEffect(()=>{if(!previewPlaying)stopMovieSound();},[previewPlaying,stopMovieSound]);
  useEffect(()=>()=>stopMovieSound(),[stopMovieSound]);
  useEffect(()=>{
    const session=movieSoundRef.current;
    if(!session)return;
    session.masterPercent=soundVolume;
    const level=Math.min(1,Math.max(0,soundVolume/100))/Math.sqrt(session.players.length);
    const levels=session.players.map((player,index)=>index<session.primaryCount
      ?(player.muted?0:level):level*(musicBed.volumePercent/100));
    if(session.mixer)session.mixer.setGains(levels);
    else session.players.forEach((player,index)=>{try{player.volume=levels[index];}catch{}});
  },[soundVolume,musicBed.volumePercent]);
  // A new visual video topic resets the optional local audio-only suggestion override.
  useEffect(()=>{
    // A revised video goal/concept changes the recommended chip, not manually attached sound.
    setAudioCategoryOverride(null);setAudioThemeOverride(null);
    setAudioMood("all");setAudioPace("all");setShowAllAudio(false);
  },[theme,approvedVideoConcept?.signature]);
  // Built-in presets come from stable HTTPS WAV files, not a generated
  // blob: URL: Safari's in-app player reported a native "Error" for blobs.
  // The actual selected user audio remains a private, local File object.
  useEffect(() => {
    setAudioPlaybackError(false);
  },[previewAudioUrl]);
  useEffect(() => {
    const player=audioPreviewRef.current;
    if(!player)return;
    const audition=auditionGainRef.current;
    if(audition?.player===player)audition.mixer.setGains([soundVolume/100]);
    else try{player.volume=Math.min(1,Math.max(0,soundVolume/100));}
      catch{/* Native fallback without Web Audio. */}
  },[soundVolume,previewAudioUrl]);
  useEffect(() => {
    const stopHiddenPreview=()=>{
      if(!document.hidden) return;
      stopMovieSound();setPreviewPlaying(false);
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
      webCodecJobRef.current?.abort();
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
    // Reconcile a previously user-decoded frame without fetching on page mount.
    const master=premiumVideoRef.current;
    const decoded=Boolean(activeFilm && master && master.readyState>=2 &&
      master.videoWidth>0 && master.videoHeight>0);
    setPremiumReady(decoded);
    // An initial page view must not automatically download the 1 MB MP4.
    // Play/Create or photo-consent user gestures initiate the decoder.
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
    if(previewPlaying&&!recording&&!preparing&&video.readyState<2){
      // A style tap can key in a NEW source element after its original
      // gesture. Unlock that verified MP4 only for an active preview.
      video.playsInline=true;
      video.preload="auto";
      if(video.networkState!==2)video.load();
    }
    void video.play().catch(()=>{if(aliveRef.current)setNotice(ui.videoUnavailable);});
  },[activeFilm?.src,previewPlaying,recording,preparing,ui.videoUnavailable]);

  // A freshly edited storyboard invalidates only an OLD recording. Run the
  // invalidation before paint/click so a delayed passive effect cannot cancel
  // the visitor's new MediaRecorder session on the next animation frame.
  useLayoutEffect(() => {
    const job=jobRef.current;
    if (job) stopJob(job, true);
    webCodecJobRef.current?.abort();
    setResult(null);
    setNotice("");
    setExportUnavailable(false);
    setWebkitRecoveryReason(null);
    autoWebmRetryForRef.current=null;
    autoWebmRetryUrlRef.current=null;
    setPendingCompatibleRetry(null);
  }, [signature]);
  useEffect(() => {setPreviewPlaying(false);},[theme,backgroundOnly]);
  // Changing the film goal or editor mode returns to the real local composer.
  useEffect(()=>setIntroPlaying(false),[theme,studioMode,locale]);
  // Locale changes and editing revoke a presentation playback session.
  useEffect(()=>{setIntroPlaying(false);setIntroDismissed(false);},[locale]);
  useEffect(()=>{
    if(activeWorkspace!=="video"){setIntroPlaying(false);setIntroDismissed(true);}
  },[activeWorkspace]);
  useEffect(()=>{
    if(previewPlaying||videoScenarioOpen||result){setIntroPlaying(false);setIntroDismissed(true);}
  },[previewPlaying,videoScenarioOpen,result]);

  // The canonical theme selector is collapsed on small Video screens,
  // expanded on desktop, and always visible in the third Effects workspace.
  // Keep this DOM state in sync with the React open prop and media-query events.
  useEffect(()=>{
    const large=window.matchMedia("(min-width: 760px)");
    const sync=()=>{if(quickThemeAdvancedRef.current)
      quickThemeAdvancedRef.current.open=large.matches||activeWorkspace==="effects";};
    sync();
    large.addEventListener("change",sync);
    return()=>large.removeEventListener("change",sync);
  },[activeWorkspace]);


  // A successful recording (or a codec failure) must be immediately visible
  // after the client creates the film. Safari otherwise leaves the result
  // below the fold and gives the impression that nothing was generated.
  useEffect(()=>{
    if(!result || playbackStatus==="checking")return;
    const frame=window.requestAnimationFrame(()=>{
      document.getElementById("personal-video-result")?.scrollIntoView({
        behavior:"smooth",block:"nearest"
      });
    });
    return ()=>window.cancelAnimationFrame(frame);
  },[result,playbackStatus]);


  // The SAME project-to-source clock drives both live preview and the final
  // MediaRecorder/WebCodecs painter. A previously viewed scene must not leak
  // an old frame into a new stage merely because readyState is nonzero.
  // Native playback starts only for an actual preview or a recorder/encoder
  // frame. Preflight, audio decode and the first still preview cannot advance
  // source clocks before the storyboard's zero timestamp.
  const setStoryboardPhoto=(sceneId:string,file:File|null)=>{
    if(recording||preparing||!sceneId)return;
    const previous=storyboardPhotoAssetsRef.current[sceneId];
    if(!file){
      if(previous)URL.revokeObjectURL(previous.url);
      const next={...storyboardPhotoAssetsRef.current};delete next[sceneId];
      storyboardPhotoAssetsRef.current=next;setStoryboardPhotoRevision(value=>value+1);
      setReadyFreeFilmKey("");setResult(null);stopMovieSound();setPreviewPlaying(false);
      return;
    }
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>15*1024*1024){
      setNotice(locale==="ru"?"Нужно фото JPG, PNG или WebP не больше 15 МБ.":"Choose a JPG, PNG or WebP photo up to 15 MB.");
      return;
    }
    const url=URL.createObjectURL(file),image=new Image();
    image.onload=()=>{
      if(image.naturalWidth<160||image.naturalHeight<160){
        URL.revokeObjectURL(url);
        setNotice(locale==="ru"?"Размер фото должен быть не меньше 160×160 пикселей.":"Photo must be at least 160×160 pixels.");
        return;
      }
      const current=storyboardPhotoAssetsRef.current[sceneId];
      if(current)URL.revokeObjectURL(current.url);
      storyboardPhotoAssetsRef.current={...storyboardPhotoAssetsRef.current,
        [sceneId]:{image,url,name:file.name,width:image.naturalWidth,height:image.naturalHeight}};
      setStoryboardPhotoRevision(value=>value+1);setReadyFreeFilmKey("");setResult(null);
      stopMovieSound();setPreviewPlaying(false);
      setNotice(locale==="ru"?"Фото прикреплено к этому кадру. Оно останется на устройстве и войдёт в локальный экспорт.":"Photo assigned to this scene. It stays on this device and is included in the local export.");
    };
    image.onerror=()=>{URL.revokeObjectURL(url);setNotice(locale==="ru"?"Не удалось открыть изображение.":"Could not open this image.");};
    image.src=url;
  };
  const hasStoryboardPhotoAt=(seconds:number)=>{
    if(cinematicPlan?.version!==FREE_FILM_PLAN_VERSION)return false;
    const elapsed=cinematicPreviewSeconds(cinematicPlan,Math.max(0,seconds));
    const shot=cinematicPlan.shots.find(item=>elapsed>=item.startSeconds&&
      elapsed<item.startSeconds+item.durationSeconds)||cinematicPlan.shots.at(-1);
    const photo=shot?storyboardPhotoAssetsRef.current[shot.sceneId]?.image:undefined;
    return Boolean(photo?.complete&&photo.naturalWidth>0&&photo.naturalHeight>0);
  };
  function freeFilmVideoAt(seconds:number,advancePlayback=false):HTMLVideoElement|null {
    if(cinematicPlan?.version!==FREE_FILM_PLAN_VERSION)return null;
    const elapsed=cinematicPreviewSeconds(cinematicPlan,Math.max(0,seconds));
    const shot=cinematicPlan.shots.find(s=>elapsed>=s.startSeconds &&
      elapsed<s.startSeconds+s.durationSeconds)||cinematicPlan.shots.at(-1);
    if(!shot)return null;
    const still=storyboardPhotoAssetsRef.current[shot.sceneId]?.image;
    if(still?.complete&&still.naturalWidth>0&&still.naturalHeight>0){
      Object.values(freeFilmPlayerRefs.current).forEach(other=>{if(!other.paused)other.pause();});
      activeFreeFilmShotRef.current="photo:"+shot.sceneId;
      return null;
    }
    const video=freeFilmPlayerRefs.current[shot.sceneId];
    if(!video)return null;
    const enteringShot=activeFreeFilmShotRef.current!==shot.sceneId;
    if(enteringShot){
      Object.entries(freeFilmPlayerRefs.current).forEach(([id,other])=>{
        if(id!==shot.sceneId && !other.paused)other.pause();
      });
      activeFreeFilmShotRef.current=shot.sceneId;
    }
    let frame;
    try{
      const framePosition=resolveLicensedSourceFrame(cinematicPlan,elapsed,video.duration);
      if(framePosition.sceneId!==shot.sceneId)return null;
      frame=framePosition;
    }catch{return null;} // Missing media duration or invalid shot: no fabricated frame.
    // Apply the selected speed on the licensed decoder for preview and export.
    try{if(video.playbackRate!==frame.sourceSpeed)video.playbackRate=frame.sourceSpeed;}
    catch{return null;}
    const assessment=assessLicensedSourceFrame(video,frame);
    if(assessment.status==="unavailable"&&advancePlayback){
      // Safari may evict the next muted hidden MP4 after the Create preflight.
      // Re-prime only on explicit preview/export intent; the bounded encoder
      // retries must still observe a REAL decoded frame before drawing.
      try{
        video.muted=true;video.playsInline=true;
        if(video.networkState===0)video.load();
        if(video.paused)void video.play().catch(()=>{});
      }catch{/* Decoder wait below fails closed if re-priming cannot recover. */}
      return null;
    }
    if(assessment.status==="drift"&&!video.seeking&&(enteringShot||!advancePlayback)){
      // Stage entry is a *bounded* seek, not a seek on every encoded frame.
      // Rendering waits for the native decoder to finish, else the existing
      // 500ms media gap watchdog cancels the exported film.
      try{video.pause();video.currentTime=frame.expectedSourceSeconds;}
      catch{/* The existing media timeout handles an unseekable source. */}
      return null;
    }
    if(assessment.status!=="ready")return null;
    if(video.paused&&advancePlayback){
      video.muted=true;
      void video.play().catch(()=>{});
    }
    return video;
  }
  function updateFreeFilmReadiness(){
    if(cinematicPlan?.version!==FREE_FILM_PLAN_VERSION){
      setReadyFreeFilmKey("");return;
    }
    const ready=cinematicPlan.shots.every(shot=>{
      const photo=storyboardPhotoAssetsRef.current[shot.sceneId]?.image;
      if(photo?.complete&&photo.naturalWidth>0&&photo.naturalHeight>0)return true;
      const video=freeFilmPlayerRefs.current[shot.sceneId];
      return Boolean(video&&video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0);
    });
    setReadyFreeFilmKey(ready?JSON.stringify(cinematicPlan.shots.map(shot=>[
      shot.theme,shot.sceneId,Boolean(storyboardPhotoAssetsRef.current[shot.sceneId]?.image.complete)
    ])):"");
  }
  useEffect(()=>{
    activeFreeFilmShotRef.current=null;
    updateFreeFilmReadiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[cinematicPlan,storyboardPhotoRevision]);
  useEffect(()=>{
    if(previewPlaying||recording||preparing)return;
    Object.values(freeFilmPlayerRefs.current).forEach(video=>video.pause());
    activeFreeFilmShotRef.current=null;
  },[previewPlaying,recording,preparing]);

  // No autoplay: paint a still scene, and animate only while a visitor
  // deliberately chooses preview. Throttle to ~12 fps on mobile Safari.
  useEffect(() => {
    if (!source || jobRef.current || webCodecJobRef.current || recording) return;
    let cancelled = false;
    let animation = 0;
    let startedAt = 0;
    let lastFrame = -1000;
    let lastHeadUpdate=0;
    void loadSceneImage(source).then(image => {
      if (cancelled || jobRef.current || webCodecJobRef.current) return;
      if(usingFreeFilmCompilation&&!freeFilmReady&&!styleFilmReady)return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const [width,height] = formatDimensions(aspect,"hd");
      canvas.width=width;canvas.height=height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      const scrubFrame=freeFilmVideoAt(previewSeekSeconds,false);
      // Never replace the last valid preview with an undecodeable substitute.
      const styleFirstBeat=Boolean(selectedStyleFilm&&styleFilmReady&&previewSeekSeconds<
         (cinematicPlan?.shots[0]?.durationSeconds??5));
       if(!usingFreeFilmCompilation||scrubFrame||hasStoryboardPhotoAt(previewSeekSeconds)||styleFirstBeat){
        paintCinematicFrame(ctx,image,effect,previewSeekSeconds,aspect,moneyScene,visibleCaption,theme,otherScene,speed,brightness,premiumVideoRef.current,cinematicPlan,scrubFrame,currentFreeVideoPlan,
          creationMode==="generated"&&!backgroundOnly&&photoConsent&&Boolean(photoUrl)?image:null,activeMontageStyleId,styleFilmRef.current,storyboardPhotos);
        paintHypnoLightOverlay(ctx,previewSeekSeconds,hypnoLight);
        paintStoryMotifs(ctx,previewSeekSeconds,appliedStory);
        paintFreeGreeting(ctx,previewSeekSeconds,duration,greetingCharacter,aspect,greetingSceneKey,theme);
        paintSingleVideoTextOverlay(ctx,previewSeekSeconds,singleTextSource,affirmationLines,affirmations,duration,cinematicPlan,timelineTextClips);
      }
      if (!previewPlaying) return;
      const previewCores=Number.isFinite(navigator.hardwareConcurrency)?navigator.hardwareConcurrency:4;
      const previewFps=window.innerWidth<=600
        ? (previewCores<=2?12:previewCores>=6?24:18):24;
      const draw = (now: number) => {
        if (cancelled || jobRef.current || webCodecJobRef.current) return;
        if (!startedAt) startedAt = now;
        if (now - lastFrame >= 1000 / previewFps && !document.hidden) {
          const elapsed=previewSeekSeconds+(now-startedAt)/1000;
          if(elapsed>=duration){
            setPreviewPlayhead(duration);
            stopMovieSound();setPreviewPlaying(false);return;
          }
          if(now-lastHeadUpdate>180){lastHeadUpdate=now;setPreviewPlayhead(elapsed);}
          const frameSecond=cinematicPlan?cinematicPreviewSeconds(cinematicPlan,elapsed):elapsed;
          const stockFrame=freeFilmVideoAt(frameSecond,previewPlaying);
          const styleBeatReady=Boolean(selectedStyleFilm&&styleFilmReady&&frameSecond<
             (cinematicPlan?.shots[0]?.durationSeconds??5));
           if(!usingFreeFilmCompilation||stockFrame||hasStoryboardPhotoAt(frameSecond)||styleBeatReady){
            paintCinematicFrame(ctx,image,effect,frameSecond,aspect,moneyScene,visibleCaption,theme,otherScene,speed,brightness,premiumVideoRef.current,cinematicPlan,stockFrame,currentFreeVideoPlan,
        creationMode==="generated"&&!backgroundOnly&&photoConsent&&Boolean(photoUrl)?image:null,activeMontageStyleId,styleFilmRef.current,storyboardPhotos);
            paintStoryMotifs(ctx,frameSecond,appliedStory);
            paintFreeGreeting(ctx,elapsed,duration,greetingCharacter,aspect,greetingSceneKey,theme);
            paintHypnoLightOverlay(ctx,frameSecond,hypnoLight);
            paintSingleVideoTextOverlay(ctx,frameSecond,singleTextSource,affirmationLines,affirmations,duration,cinematicPlan,timelineTextClips);
          }
          lastFrame = now;
        }
        animation = window.requestAnimationFrame(draw);
      };
      animation = window.requestAnimationFrame(draw);
    }).catch(() => { /* PNG preparation can be retried in the parent editor. */ });
    return () => { cancelled = true; window.cancelAnimationFrame(animation); };
  }, [source, effect, moneyScene, theme, otherScene, aspect, previewPlaying, previewSeekSeconds,
    recording, speed, brightness, caption, visibleCaption, singleTextSource, wish, affirmations, hypnoLight, locale, cinematicPlan,
    usingFreeFilmCompilation, freeFilmReady, appliedStory, greetingCharacter, greetingSceneKey, timelineTextClips,stopMovieSound,duration,previewFrameRevision,
    creationMode,currentFreeVideoPlan,activeMontageStyleId,selectedStyleFilm?.src,styleFilmReady,backgroundOnly,photoConsent,photoUrl,activeWorkspace,storyboardPhotoRevision]);

  async function videoCreditRequest(action:"hold"|"complete"|"release",body:Record<string,unknown>){
    return postVideoCreditAction(action,body);
  }
  async function releaseCredit(operationId:string){
    try{await videoCreditRequest("release",{operationId});}
    catch{/* Thirty-minute server expiration also releases abandoned reservations. */}
    if(creditOpRef.current===operationId){
      creditOpRef.current=null;creditValidRef.current=false;
      if(aliveRef.current){setCreditConfirmed(false);setCreditRetry(false);}
    }
  }
  async function confirmCredit(){
    const id=creditOpRef.current;
    if(!id||creditCompletingRef.current||!creditValidRef.current||
      !result||result.mode==="catalog"||playbackStatus!=="ready")return;
    creditCompletingRef.current=true;
    setCreditRetry(false);
    try{
      const response=await videoCreditRequest("complete",{operationId:id,bytes:result.bytes});
      if(response.status!=="completed")throw Error("VIDEO_CREDIT_EXPIRED");
      if(creditOpRef.current!==id)return;
      creditOpRef.current=null;creditValidRef.current=false;
      setCreditBalance(response.balance?.balanceCredits??null);
      setCreditConfirmed(true);
      setNotice(t.ready);
    }catch{
      if(creditOpRef.current===id&&aliveRef.current)setCreditRetry(true);
    }finally{creditCompletingRef.current=false;}
  }
  async function createVideo(preferWebm = false, forceMp4ForRetry = false, safeWebkitRetry = false) {
    if (!canGenerate || !source || jobRef.current || webCodecJobRef.current || preparingRef.current) return;
    stopSoundPreview();
    stopMovieSound();
    const snapshot=source;
    const snapshotKey=signature;
    // Safari 26+ WebCodecs avoids WebKit MediaRecorder's Canvas/audio muxer
    // deadlock. Chromium retains its tested native recorder implementation.
    const ua=typeof navigator==="undefined"?"":navigator.userAgent;
    const safariWebKit=/AppleWebKit/i.test(ua)&&!/Chrome|Chromium|Edg|OPR/i.test(ua);
    const hasWebCodecs=typeof VideoEncoder!=="undefined"&&
      typeof VideoEncoder.isConfigSupported==="function"&&typeof VideoFrame!=="undefined"&&
      (!attachedAudio || (typeof AudioEncoder!=="undefined"&&
        typeof AudioEncoder.isConfigSupported==="function"&&typeof OfflineAudioContext!=="undefined"));
    const procedural=creationMode==="generated"&&Boolean(currentFreeVideoPlan);
    const explicitAvcMime=attachedAudio?'video/mp4;codecs="avc1.42E01E,mp4a.40.2"':"video/mp4;codecs=avc1.42E01E";
    const explicitWebmMime=attachedAudio?'video/webm;codecs="vp8,opus"':"video/webm;codecs=vp8";
    const hasRecorderMimes=typeof MediaRecorder!=="undefined"&&typeof MediaRecorder.isTypeSupported==="function";
    const nativeAvc=hasRecorderMimes&&MediaRecorder.isTypeSupported(explicitAvcMime);
    const nativeWebm=hasRecorderMimes&&MediaRecorder.isTypeSupported(explicitWebmMime);
    // Prefer the real native VP8/Opus recording on Chromium when AVC/AAC
    // recording is absent. iPhone Safari retains its WebCodecs MP4 path.
    const proceduralRoute=proceduralMp4Route({nativeAvc,webCodecs:hasWebCodecs,nativeWebm,preferNativeWebm:!safariWebKit});
    // The alternate WebM retry must not rerun Safari's default MP4 encoder.
    // A visitor selecting native MP4 after a failed WebM must not re-run the
    // original Safari WebCodecs MP4 path. Preserve actual AAC/soundtrack checks.
    const useWebCodecsMp4=!forceMp4ForRetry&&selectWebCodecsForRecording({
      hasWebCodecs,safariWebKit,procedural,proceduralRoute,preferWebm
    });
    if(procedural&&!safariWebKit&&proceduralRoute==="unsupported"){
      setResult(null);setPlaybackStatus("checking");
      setExportUnavailable(true);
      setNotice(locale==="ru"?"Этот браузер не поддерживает локальный MP4 H.264/AAC. Попробуйте другой браузер или устройство.":
        locale==="es"?"Este navegador no admite MP4 H.264/AAC local. Prueba otro navegador o dispositivo.":
        "This browser cannot create local H.264/AAC MP4. Try another browser or device.");
      return;
    }
    if(creditCatalog===null||creditCatalog.blocked){
      setNotice(locale==="ru"?"Не удалось проверить кредиты. Создание временно недоступно.":
        locale==="es"?"No se pueden verificar los créditos. Exportación pausada.":
        "Video credits cannot be verified. Export paused.");
      return;
    }
    if(creditOpRef.current)return; // never reserve twice while confirmation is pending
    preparingRef.current=true;
    setPreparing(true);
    // Only professional exports are branded. No extra credit debit or upload.
    // A capability must come from this account's authenticated server session.
    let exportBrandVariant:VideoExportVariant=resolveVideoExportVariant({professionalMode});
    if(professionalMode){
      const controller=new AbortController();
      const timeout=window.setTimeout(()=>controller.abort(),1200);
      try{
        const capability=await appFetch("video-export/capabilities",undefined,undefined,
          {signal:controller.signal}) as VideoExportCapability;
        exportBrandVariant=resolveVideoExportVariant({professionalMode,capability});
      }catch{/* Missing, expired or unavailable rights always keep the brand. */}
      finally{window.clearTimeout(timeout);}
    }
    const guestLocalRender=creditCatalog.chargeRequired&&creditSession==="guest"&&!guestFirstVideoUsed;
    guestRenderRef.current=guestLocalRender;
    if(guestLocalRender){setCreditConfirmed(true);setCreditRetry(false);}
    // Registered exports retain the exact same account-scoped hold/complete
    // ledger. The first anonymous render is strictly local, no server debit.
    if(creditCatalog.chargeRequired&&!guestLocalRender){
      const operationId=crypto.randomUUID();
      try{
        const hold=await videoCreditRequest("hold",{operationId});
        if(hold.status!=="held")throw Error("VIDEO_CREDIT_HOLD_INVALID");
        creditOpRef.current=operationId;
        creditValidRef.current=false;
        setCreditConfirmed(false);
        setCreditBalance(hold.balance?.balanceCredits??null);
        if(!aliveRef.current||document.hidden){
          await releaseCredit(operationId);
          preparingRef.current=false;
          if(aliveRef.current)setPreparing(false);
          return;
        }
      }catch(error){
        // Idempotency UUID can release a hold even if the POST response was lost.
        void releaseCredit(operationId);
        const reason=error instanceof Error?error.message:"";
        if(reason==="SIGN_IN_REQUIRED")void refreshCreditSession();
        setNotice(reason==="VIDEO_CREDITS_INSUFFICIENT"?
          (locale==="ru"?"Кредитов недостаточно. Следующее пополнение — в новом месяце.":
            locale==="es"?"Créditos insuficientes. Se renovarán el mes próximo.":
            "Insufficient credits. Monthly credits renew next month.")
          :reason==="SIGN_IN_REQUIRED"?
          (locale==="ru"?"Сессия завершилась. Повторите создание: первое видео доступно без входа.":
            locale==="es"?"La sesión terminó. Inténtalo otra vez: el primer vídeo no requiere acceso.":
            "Session expired. Retry: your first video does not require sign-in.")
          :(locale==="ru"?"Не удалось зарезервировать кредиты. Списаний нет.":
            locale==="es"?"No se pudieron reservar créditos. Sin cobro.":
            "Could not reserve credits. No charge occurred."));
        preparingRef.current=false;setPreparing(false);
        return;
      }
    }
    setVideoEffectSession(current=>current+1);
    setVideoEffectStarted(false);setVideoEffectEnded(false);
    setPreparing(true);setProgress(0);
    setNotice(safeWebkitRetry
      ? locale==="ru"?"Экспорт 540p / 8 кадр/с: все сцены и выбранное аудио сохраняются."
        :locale==="es"?"Exportando a 540p / 8 fps con las cuatro escenas y el audio seleccionado."
        :"Exporting at 540p / 8 fps with all four scenes and your selected audio."
      :activeFilm&&!premiumReady?quick.loading:t.preparing);
    setMusicWarning("");setWebkitRecoveryReason(null);
    setResult(null);setExportUnavailable(false);setPlaybackStatus("checking");setPreviewPlaying(false);
    let stream:MediaStream|null=null;
    let musicSession:AmbientSession|null=null;
    try {
      // Both first-party decoders start from the SAME user Create gesture.
      // Never wait for hidden autoplay to unlock the button.
      const stylePreparation=selectedStyleFilm
        ? styleFilmRef.current
          ? ensureDecodedVideoOnUserIntent(styleFilmRef.current,{timeoutMs:20000})
          : Promise.resolve(false)
        : Promise.resolve(true);
      const masterPreparation=activeFilm
        ? premiumVideoRef.current
          ? ensureDecodedVideoOnUserIntent(premiumVideoRef.current,{timeoutMs:20000})
          : Promise.resolve(false)
        : Promise.resolve(true);
      // Prime the four licensed scene decoders before awaiting audio.
      const filmPreparation=usingFreeFilmCompilation
        ? prepareFourFilmSources(freeFilmShots,freeFilmPlayerRefs.current,{
            timeoutMs:20000,adaptive:freeFilmShots.length!==4,
            onProgress:(ready:number,total:number)=>setNotice(locale==="ru"
              ?`Подготавливаем видеосцены: ${ready} из ${total}…`
              :locale==="es"?`Preparando escenas: ${ready} de ${total}…`
              :`Preparing video scenes: ${ready} of ${total}…`),
          }).then(()=>true,()=>false)
        : Promise.resolve(true);
      musicSession = attachedAudio?.kind==="file"
        ? useWebCodecsMp4?null:musicBed.id!=="none"
          ?await startLayeredVideoAudio(
            attachedAudio.file,musicBed.id,soundVolume,musicBed.volumePercent,{
              seconds:duration,loop:attachedAudio.narration!==true&&attachedAudio.nonLoop!==true,
              startSeconds:effectiveAudioStartSeconds,fadeSeconds:musicBed.fadeSeconds,
              approvedCuratedBedIds:MYTUBE_REVIEWED_MUSIC_BEDS,
              deferStart:true
            })
          :await startUploadedAudio(attachedAudio.file,soundVolume,{loop:attachedAudio.narration!==true&&attachedAudio.nonLoop!==true,startSeconds:effectiveAudioStartSeconds,deferStart:true})
        : attachedAudio?.kind==="preset" ? useWebCodecsMp4?null:await startPresetAudio(attachedAudio.id,soundVolume,{startSeconds:effectiveAudioStartSeconds,deferStart:true})
        : attachedAudio?.kind==="presets" ? useWebCodecsMp4?null:await startPresetMixAudio(attachedAudio.ids,soundVolume,{startSeconds:effectiveAudioStartSeconds,deferStart:true}) : null;
      if(attachedAudio && !musicSession) {
        if(!useWebCodecsMp4){
          setMusicWarning(ui.soundUnavailable);
          setNotice(ui.soundUnavailable);
          setExportUnavailable(true);
          return;
        }
      }
      if(!(await filmPreparation)){
        if(sourceRef.current!==snapshotKey||!aliveRef.current)return;
        setNotice(locale==="ru"
          ?"Не удалось загрузить все четыре MP4. Проверьте соединение и нажмите «Создать видео» ещё раз."
          :locale==="es"
          ?"No se pudieron cargar los cuatro MP4. Comprueba tu conexión y vuelve a pulsar Crear vídeo."
          :"Not all four MP4 clips could be decoded. Check your connection and tap Create video again.");
        setExportUnavailable(true);
        return;
      }

      if(!(await masterPreparation)){
        if(sourceRef.current!==snapshotKey||!aliveRef.current)return;
        setNotice(ui.videoUnavailable);
        setExportUnavailable(true);
        return;
      }
      if(sourceRef.current!==snapshotKey||!aliveRef.current)return;
      if(!(await stylePreparation)){
        if(sourceRef.current!==snapshotKey||!aliveRef.current)return;
        setNotice(locale==="ru"?"Выбранный стиль не загружен. Видео не создано.":
          locale==="es"?"No se pudo cargar el estilo. No se creó el vídeo.":
          "Selected style MP4 unavailable. No video was created.");
        setExportUnavailable(true);return;
      }
      if(activeFilm)setPremiumReady(true);
      const image=await loadSceneImage(snapshot);
      if (sourceRef.current !== snapshotKey || !aliveRef.current) return;
      if(activeFilm) {
        const master=premiumVideoRef.current;
        if(!master || master.readyState < 2)throw new Error("HD MP4 scene not loaded");
        await master.play();
      }
      if(selectedStyleFilm){
        const styleVideo=styleFilmRef.current;
        if(!styleVideo||styleVideo.readyState<2||styleVideo.videoWidth<1)
          throw new Error("selected_style_mp4_not_decoded");
        styleVideo.muted=true;await styleVideo.play();
      }
      setPreviewPlaying(false);
      const canvas = canvasRef.current;
      if (!canvas || (!useWebCodecsMp4 &&
          (typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined"))) {
        // Linux Playwright WebKit and some Safari releases cannot capture
        // Canvas frames. Offer a REAL, approved source MP4 rather than a fake
        // downloaded film, a silent paid request or an endless spinner.
        // The source clip is not the promised 4-shot composition. Disclose
        // that exclusions, captions, custom duration and music are NOT baked
        // into this fallback. Never silently discard attached personal audio.
        const first=cinematicPlan?.shots[0];
        const film=first&&cinematicPlan?.version==="hh-cinematic-storyboard-v1"
          ?firstPartyFilmFor(first.theme,first.sceneId):null;
        if(!backgroundOnly||attachedAudio||caption||affirmations.enabled||
          Boolean(cinematicPlan?.shots.some(shot=>shot.overlayText))||
          storySelectionItems(appliedStory).length>0||greetingCharacter!=="none"||
          !film?.src.startsWith("/videos/holistic-house/")){
          setNotice(t.unsupported);
          setExportUnavailable(true);
          return;
        }
        if(sourceRef.current!==snapshotKey||!aliveRef.current)return;
        if(!canOfferOriginalVideoSource(professionalMode)){
          // An untouched source MP4 is not the user's generated branded film.
          setNotice(locale==="ru"
            ?"В режиме мастера исходная сцена не заменяет брендированный ролик. Повторите экспорт в Safari или Chrome."
            :locale==="es"
            ?"En el modo profesional no se descarga la escena original sin marca. Reintenta en Safari o Chrome."
            :"Professional videos cannot use unbranded original footage as the export. Retry in Safari or Chrome.");
          setExportUnavailable(true);
          return;
        }
        // No programmatic network access in the private local video editor.
        // A same-origin approved static MP4 is served by the ordinary anchor
        // and native video player; no JS upload/fetch, paid call or hidden mix.
        setResult({
          url:film.src,extension:"mp4",bytes:0,
          mime:"video/mp4",mode:"catalog",
        });
        setProgress(100);
        setNotice(locale==="ru"
          ?"Браузер не поддерживает запись Canvas. Можно скачать исходный MP4 выбранной сцены. Настройки формата, длительности, звука и надписей к нему не применены."
          :locale==="es"
          ?"El navegador no puede grabar Canvas. Puedes descargar el MP4 original sin los ajustes de formato, duración, música ni texto."
          :"Canvas recording is unavailable. Download the selected original MP4, without custom aspect, duration, music or captions.");
        return;
      }
      const [outputWidth, outputHeight] = formatDimensions(aspect, quality);
      // A deliberate retry reduces only encoder dimensions, not audio or shots.
      const safariRetryScale=useWebCodecsMp4&&safeWebkitRetry
        ? 540/(quality==="fullhd"?1080:720):1;
      canvas.width=Math.round(outputWidth*safariRetryScale/2)*2;
      canvas.height=Math.round(outputHeight*safariRetryScale/2)*2;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Canvas unsupported");
      const firstStockFrame=freeFilmVideoAt(0,false);
      if(usingFreeFilmCompilation&&!firstStockFrame&&!hasStoryboardPhotoAt(0))throw new Error("licensed_video_frame_unavailable");
      paintCinematicFrame(ctx,image,effect,0,aspect,moneyScene,visibleCaption,theme,otherScene,speed,brightness,premiumVideoRef.current,cinematicPlan,firstStockFrame,currentFreeVideoPlan,
        creationMode==="generated"&&!backgroundOnly&&photoConsent&&Boolean(photoUrl)?image:null,activeMontageStyleId,styleFilmRef.current,storyboardPhotos);
      paintStoryMotifs(ctx,0,appliedStory);
      paintFreeGreeting(ctx,0,duration,greetingCharacter,aspect,greetingSceneKey,theme);
      paintHypnoLightOverlay(ctx,0,hypnoLight);
      paintSingleVideoTextOverlay(ctx,0,singleTextSource,affirmationLines,affirmations,duration,cinematicPlan,timelineTextClips);
       paintVideoBrandStamp(ctx,exportBrandVariant);
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
      if(useWebCodecsMp4){
        const controller=new AbortController();
        webCodecJobRef.current=controller;
        // Safari's entire H.264/AAC export runs locally with WebCodecs. The
        // user-selected first-party scene, narration and filters remain here.
        setPreparing(false);
        setRecording(true);
        try{
          const {encodeLocalWebCodecsMp4}=await import("@/lib/mandala/webcodecs-mp4-export");
          const files:({
            file:File|Blob;loop:boolean;startSeconds?:number;
            gainPercent?:number;fadeInSeconds?:number;fadeOutSeconds?:number
          }|{
            preset:string;loop:true;startSeconds?:number;
            gainPercent?:number;fadeInSeconds?:number;fadeOutSeconds?:number
          })[]=[];
          if(attachedAudio?.kind==="file"){
            files.push({file:attachedAudio.file,
              loop:attachedAudio.narration!==true&&attachedAudio.nonLoop!==true,
              startSeconds:effectiveAudioStartSeconds,
              ...(musicBed.id!=="none"?{gainPercent:100,fadeInSeconds:.035,fadeOutSeconds:.1}:{})
            });
            if(musicBed.id!=="none")files.push({
              preset:musicBed.id,loop:true,startSeconds:0,
              gainPercent:musicBed.volumePercent,
              fadeInSeconds:musicBed.fadeSeconds,fadeOutSeconds:musicBed.fadeSeconds
            });
          }else if(attachedAudio){
            const ids=attachedAudio.kind==="preset"?[attachedAudio.id]:attachedAudio.ids;
            for(const id of ids)files.push({preset:id,loop:true,startSeconds:effectiveAudioStartSeconds});
          }
          if(sourceRef.current!==snapshotKey||!aliveRef.current)return;
          const blob=await encodeLocalWebCodecsMp4({
            // Safari WebKit 26 often falls behind H.264/AAC muxing at 20 fps on
            // portrait Canvas. Keep real-time storyboard PTS and audible AAC,
            // but bound encoder input to a smooth, device-safe 12 fps.
            canvas,allowProceduralBrowser:procedural&&!safariWebKit,
            seconds:duration,frameRate:Math.min(safeWebkitRetry?8:10,framesPerSecond),
            audio:files.length?{files,volume:soundVolume}:undefined,
            shouldContinue:()=>!controller.signal.aborted&&aliveRef.current&&sourceRef.current===snapshotKey,
            onProgress:p=>{if(!controller.signal.aborted&&aliveRef.current&&sourceRef.current===snapshotKey)
              setProgress(Math.min(99,p));},
            renderFrame:time=>{
              const frame=freeFilmVideoAt(time,true);
              if(usingFreeFilmCompilation&&!frame)return false;
              paintCinematicFrame(ctx,image,effect,time,aspect,moneyScene,visibleCaption,
                theme,otherScene,speed,brightness,premiumVideoRef.current,cinematicPlan,frame,currentFreeVideoPlan,
                creationMode==="generated"&&!backgroundOnly&&photoConsent&&Boolean(photoUrl)?image:null,activeMontageStyleId,styleFilmRef.current,storyboardPhotos);
              paintStoryMotifs(ctx,time,appliedStory);
              paintFreeGreeting(ctx,time,duration,greetingCharacter,aspect,greetingSceneKey,theme);
              paintHypnoLightOverlay(ctx,time,hypnoLight);
              paintSingleVideoTextOverlay(ctx,time,singleTextSource,affirmationLines,affirmations,duration,cinematicPlan,timelineTextClips);
              paintVideoBrandStamp(ctx,exportBrandVariant);
              return true;
            },
          });
          if(sourceRef.current!==snapshotKey||!aliveRef.current)return;
          creditValidRef.current=Boolean(creditOpRef.current);
          setResult({url:URL.createObjectURL(blob),extension:"mp4",bytes:blob.size,
            blob,mime:"video/mp4",brandVariant:exportBrandVariant});
          setProgress(100);
          setPlaybackStatus("checking");
          setNotice(locale==="ru"?"Проверяем настоящий MP4 с вашим звуком.":
            locale==="es"?"Verificando el vídeo MP4 y su audio.":
              "Verifying the finished MP4 with your selected audio.");
        }catch(error){
          if(!controller.signal.aborted&&sourceRef.current===snapshotKey&&aliveRef.current){
            // Log only a fixed diagnostic code: never expose a personal
            // narration, image, prompt, stack trace or provider credential.
            const reason=error instanceof Error?error.message:"";
            const safeReasons=[
              "webcodecs_not_supported","webcodecs_h264_unsupported",
              "webcodecs_aac_unsupported","invalid_video_dimensions_or_timing",
              "video_encoder_timeline_drift","video_encoder_too_slow",
              "licensed_scene_frame_unavailable","narration_longer_than_video",
              "audio_master_incomplete","audio_decode_invalid",
              "video_output_size_invalid","video_output_not_mp4",
              "video_output_codec_unsupported","video_output_invalid_tracks",
              "video_output_decoder_failed",
              "unsupported_audio_count","invalid_audio_volume",
              "invalid_first_party_preset","first_party_audio_unavailable",
              "audio_size_invalid","invalid_audio_lane",
            ];
            const code=safeReasons.includes(reason)?reason:"unexpected_encoder_failure";
            // Fixed diagnostic code only: no media, storyboard, voice or text.
            console.warn("HH_WEBKIT_MP4_EXPORT_FAILURE:"+code);
            const canRetry=!safeWebkitRetry&&[
              "video_encoder_timeline_drift","video_encoder_too_slow",
              "webcodecs_h264_unsupported","unexpected_encoder_failure",
            ].includes(code);
            const decodedOutputFailed=[
              "video_output_codec_unsupported","video_output_invalid_tracks",
              "video_output_decoder_failed",
            ].includes(code);
            const canRetryWebm=decodedOutputFailed&&
              recordingMimes(Boolean(attachedAudio),true).some(mime=>mime.startsWith("video/webm"));
            if(canRetry||canRetryWebm)setWebkitRecoveryReason(code);
            const hint=decodedOutputFailed
              ?canRetryWebm
                ?locale==="ru"?"Готовый MP4 не прошёл проверку декодирования. Повторите в WebM: сцены и звук сохранятся."
                  :locale==="es"?"El MP4 no se pudo decodificar. Reintenta en WebM con escenas y audio."
                  :"The MP4 could not be decoded. Retry in WebM; scenes and sound are preserved."
                :locale==="ru"?"Это устройство не декодирует MP4 и не поддерживает альтернативную запись WebM."
                  :locale==="es"?"Este dispositivo no puede reproducir MP4 ni grabar en WebM."
                  :"This device cannot decode MP4 or record the alternate WebM format."
              :code==="video_encoder_timeline_drift"||code==="video_encoder_too_slow"
              ? locale==="ru"?"Кодировщик Safari не успевает обрабатывать кадры."
                :locale==="es"?"El codificador de Safari no alcanza a procesar los fotogramas."
                :"Safari's encoder cannot keep up with the frames."
              :code==="webcodecs_aac_unsupported"
                ? locale==="ru"?"Этот браузер не поддерживает кодирование выбранного аудио в AAC. Звук не удалён, экспорт остановлен."
                  :locale==="es"?"Este navegador no puede codificar el audio seleccionado en AAC. No se eliminó el sonido y se detuvo la exportación."
                  :"This browser cannot encode the selected audio as AAC. Audio was preserved and export stopped."
              :code==="licensed_scene_frame_unavailable"
                ? locale==="ru"?"Одна из четырёх сцен не декодировалась. Повторите создание видео."
                  :locale==="es"?"Uno de los cuatro clips no se pudo decodificar. Prueba de nuevo."
                  :"One of four source clips failed to decode. Please retry."
              :code==="first_party_audio_unavailable"
                ? locale==="ru"?"Аудиофайл выбранного сценария недоступен на сайте. Проверьте музыкальную дорожку."
                  :locale==="es"?"La pista de música seleccionada no está disponible en el sitio."
                  :"The selected first-party soundtrack is missing from the site."
              :locale==="ru"?"Не удалось завершить MP4 на этом устройстве."
                :locale==="es"?"No se pudo completar el MP4 en este dispositivo."
                :"The MP4 could not be completed on this device.";
            setNotice(hint+" ("+code+").");
            setExportUnavailable(true);
          }
        }finally{
          if(webCodecJobRef.current===controller)webCodecJobRef.current=null;
          // A failed/aborted WebCodecs encode has no player to confirm. Return
          // the reserved credits immediately, not after the 30-minute timeout.
          if(creditOpRef.current&&!creditValidRef.current)
            void releaseCredit(creditOpRef.current);
          if(aliveRef.current)setRecording(false);
        }
        return;
      }
      stream = canvas.captureStream(framesPerSecond);
      if (!stream.getVideoTracks().length) throw new Error("Canvas stream unavailable");
      if (musicSession) stream.addTrack(musicSession.track);

      // A user-requested WebM retry must use the native WebM recorder, also
      // for procedural videos; retain their explicitly attached soundtrack.
      const mimeTypes = preferWebm
        ? recordingMimes(Boolean(musicSession),true).filter(mime=>mime.startsWith("video/webm"))
        : procedural
        ? proceduralRoute==="native-webm"
          ? recordingMimes(Boolean(musicSession),true).filter(mime=>mime===explicitWebmMime)
          : recordingMimes(Boolean(musicSession),false,true).filter(mime=>mime===explicitAvcMime)
        : recordingMimes(Boolean(musicSession), preferWebm, forceMp4ForRetry);
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
          setExportUnavailable(true);
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
        if(creditOpRef.current)void releaseCredit(creditOpRef.current);
        stopJob(job,true);
        if (aliveRef.current && sourceRef.current===snapshotKey){
          setNotice(t.failed);
          setExportUnavailable(true);
        }
      };
      recorder.onstop = async () => {
        // Do not stop the source or the audio session before the recorder has
        // dispatched its final dataavailable event.
        job.stream.getTracks().forEach(track => track.stop());
        job.musicSession?.close();
        if (jobRef.current !== job || !aliveRef.current) return;
        jobRef.current=null;
        setRecording(false);
        if(job.cancelled){
          if(creditOpRef.current)void releaseCredit(creditOpRef.current);
          return;
        }
        setProgress(100);
        const rawType=recorder.mimeType || mimeType;
        const encoded = new Blob(chunks,{type:rawType});
        if(!encoded.size){
          if(creditOpRef.current)void releaseCredit(creditOpRef.current);
          setNotice(t.failed);setExportUnavailable(true);return;
        }
        // Check actual container bytes. iOS can report a MIME that does not
        // match the encoded stream; never label a bogus MP4/WebM as complete.
        let isMp4=false, isWebm=false;
        try {
          const header=new Uint8Array(await encoded.slice(0,12).arrayBuffer());
          isMp4=header.length>=8&&header[4]===0x66&&header[5]===0x74&&header[6]===0x79&&header[7]===0x70;
          isWebm=header.length>=4&&header[0]===0x1a&&header[1]===0x45&&header[2]===0xdf&&header[3]===0xa3;
        } catch { /* Treat unreadable header as invalid media. */ }
        if(sourceRef.current!==snapshotKey||!aliveRef.current)return;
        const extension=isWebm?"webm":"mp4";
        const type=isWebm?"video/webm":"video/mp4";
        const blob=new Blob(chunks,{type});
        if(!isMp4&&!isWebm){
          if(creditOpRef.current)void releaseCredit(creditOpRef.current);
          setPlaybackStatus("failed");
          setNotice(locale==="ru"
            ?"Safari не завершил запись видео: в файле нет корректного заголовка MP4/WebM. Выберите другой формат."
            :locale==="es"
            ?"Safari no finalizó la grabación: el archivo no tiene una cabecera MP4/WebM válida."
            :"Safari did not finalize recording: the file has no valid MP4/WebM header.");
          return;
        }
        creditValidRef.current=Boolean(creditOpRef.current);
        setResult({url:URL.createObjectURL(blob),extension,bytes:blob.size,blob,mime:type,
          brandVariant:exportBrandVariant});
        setPlaybackStatus("checking");
        setNotice(locale==="ru"
          ?"Проверяем готовое "+extension.toUpperCase()+". При необходимости нажмите ▶."
          :locale==="es"
          ?"Verificando "+extension.toUpperCase()+". Si es necesario, pulsa ▶."
          :"Verifying "+extension.toUpperCase()+". Tap ▶ in the player if needed.");
      };

      // This user-triggered browser recorder never contacts a backend.
      // Safari/WebKit may emit unusable fragmented MP4 samples with short
      // timeslices. Obtain one finalized recording when stop() fires instead.
      recorder.start();
      job.musicSession?.begin?.();
      const start = performance.now();
      let lastFrame = -1000;
      let lastProgress = 0;
      let stockGapSince = 0;
      const animate = (now: number) => {
        if (jobRef.current !== job || job.recorder.state !== "recording") return;
        if (now - lastFrame >= 1000 / framesPerSecond) {
          if (now-start >= (duration-.8)*1000) job.musicSession?.fadeOut();
          const frameTime=Math.min(duration,(now-start)/1000);
          const stockFrame=freeFilmVideoAt(frameTime,true);
          if(usingFreeFilmCompilation&&!stockFrame&&!hasStoryboardPhotoAt(frameTime)){
            // Preserve the last real frame during brief decoder buffering, but
            // never offer a film with a missing or indefinitely frozen shot.
            if(!stockGapSince)stockGapSince=now;
            if(now-stockGapSince>500){
              stopJob(job,true);setNotice(ui.videoUnavailable);setExportUnavailable(true);return;
            }
            job.animation=requestAnimationFrame(animate);return;
          }
          stockGapSince=0;
          paintCinematicFrame(ctx,image,effect,frameTime,aspect,moneyScene,visibleCaption,theme,otherScene,speed,brightness,premiumVideoRef.current,cinematicPlan,stockFrame,currentFreeVideoPlan,
        creationMode==="generated"&&!backgroundOnly&&photoConsent&&Boolean(photoUrl)?image:null,activeMontageStyleId,styleFilmRef.current,storyboardPhotos);
          paintStoryMotifs(ctx,frameTime,appliedStory);
          paintFreeGreeting(ctx,frameTime,duration,greetingCharacter,aspect,greetingSceneKey,theme);
          paintHypnoLightOverlay(ctx,frameTime,hypnoLight);
          paintSingleVideoTextOverlay(ctx,frameTime,singleTextSource,affirmationLines,affirmations,duration,cinematicPlan,timelineTextClips);
          paintVideoBrandStamp(ctx,exportBrandVariant);
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
      if(sourceRef.current===snapshotKey&&aliveRef.current)setExportUnavailable(true);
    } finally {
      // Failed preflights and aborted WebCodecs do not consume a held credit.
      if(creditOpRef.current&&!jobRef.current&&!webCodecJobRef.current&&
        !creditValidRef.current)void releaseCredit(creditOpRef.current);
      preparingRef.current=false;
      if(aliveRef.current)setPreparing(false);
      musicSession?.close();
    }
  }

  function stopSoundPreview(){
    const current=audioPreviewRef.current;
    const active=activeAudioPreviewRef.current;
    if(active&&!active.paused)active.pause();
    if(current&&current!==active&&!current.paused)current.pause();
    activeAudioPreviewRef.current=null;
    restoreAudioSessionRef.current?.();
    restoreAudioSessionRef.current=null;
    setSoundPreview(false);
  }
  // One GainNode per keyed media element; iPhone Safari ignores audio.volume.
  function ensureAuditionOutput(player:HTMLAudioElement){
    const current=auditionGainRef.current;
    if(current?.player===player){
      current.mixer.setGains([soundVolume/100]);current.mixer.resume();
      return true;
    }
    if(current){current.mixer.close();auditionGainRef.current=null;}
    const mixer=createPreviewGainGroup([player],[soundVolume/100]);
    if(!mixer)return false;
    auditionGainRef.current={player,mixer};
    try{player.volume=1;}catch{/* Web Audio owns gain. */}
    return true;
  }
  function toggleSoundPreview(){
    if(recording || preparing) return;
    const player=audioPreviewRef.current;
    if(!player || !previewAudioUrl) {setMusicWarning(ui.soundUnavailable);return;}
    if(!player.paused){stopSoundPreview();return;}
    stopMovieSound();
    setPreviewPlaying(false);
    stopSoundPreview();
    activeAudioPreviewRef.current=player;
    try {
      if(!restoreAudioSessionRef.current)restoreAudioSessionRef.current=acquirePlaybackSession();
      player.muted=false;
      if(!ensureAuditionOutput(player)){
        try{player.volume=Math.min(1,Math.max(0,soundVolume/100));}catch{}
      }
      void player.play().catch(()=>{
        if(activeAudioPreviewRef.current!==player)return;
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
    stopMovieSound();
    setPreviewPlaying(false);
    if(!uploadedAudio&&music===choice){toggleSoundPreview();return;}
    stopSoundPreview();
    // Change the keyed source only after the previous node is silenced.
    flushSync(()=>{
      setAudioAuto(false);
      chooseMusic(choice);
    });
    const player=audioPreviewRef.current;
    if(!player){setMusicWarning(ui.soundUnavailable);return;}
    activeAudioPreviewRef.current=player;
    try{
      if(!restoreAudioSessionRef.current)restoreAudioSessionRef.current=acquirePlaybackSession();
      player.muted=false;
      if(!ensureAuditionOutput(player)){
        try{player.volume=Math.min(1,Math.max(0,soundVolume/100));}catch{}
      }
      void player.play().catch(()=>{
        if(activeAudioPreviewRef.current!==player)return;
        stopSoundPreview();
        if(aliveRef.current)setMusicWarning(ui.soundUnavailable);
      });
    }catch{
      stopSoundPreview();
      setMusicWarning(ui.soundUnavailable);
    }
  }
  // ✓ means include this first-party score in the actual film (max 3).
  // ▶ auditions without modifying selections or uploading client content.
  function toggleQuickMusic(choice:PresetId){
    if(!curatedAudioTracks.some(track=>track.id===choice))return;
    if(recording||preparing||micRecording)return;
    if(attachedAudio?.kind==="file"&&attachedAudio.narration){
      setMusicWarning(locale==="ru"?"Голос уже добавлен. Выберите фон в настройках озвучки, чтобы сохранить голос и музыку.":
        locale==="es"?"La voz ya está añadida. Cambia el fondo en los ajustes de voz para mantenerla.":
        "Voice is attached. Choose the background in voice settings to keep narration and music.");
      return;
    }
    const next=attachedPresetIds.includes(choice)
      ?attachedPresetIds.filter(id=>id!==choice)
      :[...attachedPresetIds,choice].slice(-3);
    const attached:AttachedAudio|null=next.length>1?{kind:"presets",ids:next}
      :next.length===1?{kind:"preset",id:next[0]}:null;
    clearUploadedAudio();setSamplePreviewId(null);
    setAudioAuto(false);setMusic(next[0]||"none");
    setAttachedAudio(attached);setMusicWarning("");
    if(previewPlaying)startMovieSound(attached,soundVolume);
  }
  // Personal music suggestions select one soundtrack and preserve any voice.
  // Advanced multi-layer mixing stays available in the existing editor.
  function choosePersonalMusic(choice:PresetId){
    if(recording||preparing||micRecording)return;
    if(attachedAudio?.kind==="file"){
      if(!audioRights){setMusicWarning(ui.audioRightsHelp);return;}
      if(!MYTUBE_REVIEWED_MUSIC_BEDS.some(id=>id===choice)){
        setMusicWarning(locale==="ru"?"Для голоса выберите одну из предложенных фоновых мелодий.":
          locale==="es"?"Para voz, elige una melodía de fondo compatible.":
            "For voice, choose a compatible background melody.");
        return;
      }
      changeMusicBed({id:choice as MyTubeMusicBed["id"]});
      setAudioAuto(false);setMusicWarning("");return;
    }
    stopSoundPreview();clearUploadedAudio();setSamplePreviewId(null);
    setAudioAuto(false);setMusic(choice);setAttachedAudio({kind:"preset",id:choice});
    setMusicWarning("");
    if(previewPlaying)startMovieSound({kind:"preset",id:choice},soundVolume);
  }
  function playQuickTrack(choice:PresetId){
    if(!curatedAudioTracks.some(track=>track.id===choice))return;
    if(recording||preparing||micRecording)return;
    if(samplePreviewId===choice&&soundPreview){stopSoundPreview();return;}
    stopMovieSound();setPreviewPlaying(false);
    stopSoundPreview();
    // Ensure the original single audio dock is mounted before the user-gesture
    // play() call, including from the legacy compact first screen.
    flushSync(()=>{if(activeWorkspace!=="phrases"){setActiveWorkspace("editor");setBasicPanelTab("music");}setSamplePreviewId(choice);});
    const player=audioPreviewRef.current;
    if(!player){setMusicWarning(ui.soundUnavailable);return;}
    activeAudioPreviewRef.current=player;
    try{
      if(!restoreAudioSessionRef.current)restoreAudioSessionRef.current=acquirePlaybackSession();
      player.muted=false;
      if(!ensureAuditionOutput(player)){
        try{player.volume=Math.min(1,Math.max(0,soundVolume/100));}catch{}
      }
      void player.play().catch(()=>{
        if(activeAudioPreviewRef.current!==player)return;
        stopSoundPreview();if(aliveRef.current)setMusicWarning(ui.soundUnavailable);
      });
    }catch{stopSoundPreview();setMusicWarning(ui.soundUnavailable);}
  }
  function clearUploadedAudio(){
    sttAbortRef.current?.abort();sttAbortRef.current=null;
    setSttBusy(false);setSttError("");setManualTranscript("");
    setVoiceTranscript(null);setVoiceVisualPlan(null);setAudioPlanApplied(false);
    stopSoundPreview();
    if(uploadedAudioRef.current)URL.revokeObjectURL(uploadedAudioRef.current.url);
    uploadedAudioRef.current=null;
    setUploadedAudio(null);
    setImportedAudioSeconds(null);
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
    // In the recipient mode, choosing or recording audio is the explicit use action.
    // Other Studio modes retain their existing rights gate.
    if(recipientAudioSelected)setAudioRights(true);
    return entry;
  }
  // React StrictMode can replay effects: reuse ONE promise so its first
  // cleanup cannot consume and discard the Messenger's one-use File.
  useEffect(()=>{
    let mounted=true;
    if(messengerAudioHandoffRef.current?.locale!==locale)
      messengerAudioHandoffRef.current={locale,promise:consumeMessengerAudio(locale)};
    void messengerAudioHandoffRef.current.promise.then(packet=>{
      if(!mounted||!packet||recording||preparing)return;
      const entry=chooseAudioFile(packet.file);
      if(!entry){
        setNotice(locale==="ru"?"Не удалось принять аудио. Загрузите его в студии.":
          locale==="es"?"No se pudo adjuntar el audio. Súbelo en el Estudio.":
          "Could not attach this audio. Please upload it in Studio.");
        return;
      }
      // Rights were explicitly checked in Messenger; sound is never submitted
      // to an AI model, uploaded to a provider or silently turned into a charge.
      setAudioRights(true);
      setAttachedAudio({kind:"file",file:entry.file,id:entry.url,nonLoop:true});
      setImportedAudioSeconds(packet.seconds);
      setDuration(packet.duration);
      // A voice-first handoff must not re-open the manual Goal questionnaire
      // after the async IndexedDB read. Hash routing may have already fired.
      const voiceFirstEntry=window.location.hash==="#video-audio";
      setStudioMode("pump");setActiveWorkspace(voiceFirstEntry?"editor":"video");
      if(voiceFirstEntry){
        setMontagePanel("audio");setBasicPanelTab("music");
        setShowAdvancedVideo(true);
        setQuickDetailedOpen(false);
        setDirectorChatOpen(false);setVideoScenarioOpen(false);
      }else{
        setDirectorChatOpen(true);setVideoScenarioOpen(true);
      }
      if(packet.goal.trim())setWish(packet.goal.slice(0,160));
      setNotice(locale==="ru"
        ?"Аудиозапись добавлена без повторов. Проверьте сюжет и длительность перед созданием видео."
        :locale==="es"
        ?"Audio original adjunto sin repetición. Revisa las escenas y la duración antes de crear."
        :"Original audio attached without looping. Review the scenes and length before creating.");
    }).catch(()=>{
      if(mounted)setNotice(locale==="ru"?"Не удалось восстановить аудиозапись.":
        locale==="es"?"No se pudo recuperar el audio.":"Could not restore the recording.");
    });
    return()=>{mounted=false;};
  // Only the one-use Messenger transfer, not a re-render subscription.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[locale]);
  function attachGeneratedAffirmationAudio(clip:AffirmationVoiceResult){
    if(recording||preparing)return;
    const entry=chooseAudioFile(clip.file);
    if(!entry)return;
    if(clip.source==="local"){
      // Captured personal voice is not a verified narration of the text.
      // Export the real audio File through the existing non-looping audio path.
      setAudioRights(true);
      setSoundVolume(100);
      setAttachedAudio({kind:"file",file:entry.file,id:entry.url,nonLoop:true});
      if(duration!==clip.mixSeconds)changeVideoDuration(clip.mixSeconds as (typeof durations)[number]);
      setNotice(locale==="ru"?"Ваша запись прикреплена к видео.":locale==="es"
        ?"Tu grabación está añadida al vídeo.":"Your recording is attached to the video.");
      return;
    }
    // Personal microphone recordings must remain distinct from generated TTS.
    // Only the isolated consented spoken WAV may feed the whisper/binaural mixer.
    setHypnoSpeechSource(clip.source==="local"?null:(clip.speechFile??null));
    setHypnoSpeechText(clip.source==="local"?"":clip.spokenText);
    setHypnoWhisperEnabled(false);setHypnoBinauralEnabled(false);
    previousHypnoAudioRef.current=null;
    // This local File is generated from consented text and actually attached to
    // the MediaRecorder audio stream; not a silent video or a preview label.
    setAudioRights(true);
    // Voice and bed levels are already mastered into this WAV; keep video
    // export at unity gain instead of silently reducing both by another 20%.
    setSoundVolume(100);
    setAttachedAudio({kind:"file",file:entry.file,id:entry.url,narration:true,
      spokenText:clip.spokenText,speechSeconds:clip.speechSeconds,mixSeconds:clip.mixSeconds,
      voiceId:clip.voiceId,language:clip.language,bed:clip.bed});
    // A new narration length must not throw away the chosen four-shot film.
    if(duration!==clip.mixSeconds)changeVideoDuration(clip.mixSeconds as (typeof durations)[number]);
    setNotice(locale==="ru"?"Голос аффирмаций добавлен в видео.":
      locale==="es"?"La voz de las afirmaciones está añadida al vídeo.":"Affirmation voice has been attached to your video.");
  }
  async function applyHypnoAudioEffects(next:{whisper:boolean;binaural:boolean;beatHz:number;repeatEverySeconds?:number;whisperGain?:number}){
    if(recording||preparing||hypnoAudioBusy)return;
    if(phrasePending){
      setNotice(locale==="ru"?"Сначала утвердите новые фразы — черновик нельзя смешивать с видео.":"Approve the edited phrases before preparing audio effects.");
      return;
    }
    if(narrationInvalid){
      setNotice(locale==="ru"?"Сначала обновите устаревшую озвучку выбранных фраз.":"Regenerate the outdated spoken-phrase track before applying audio effects.");
      setActiveWorkspace("phrases");
      return;
    }
    if(next.whisper&&(!hypnoSpeechSource||!isApprovedAffirmationNarration(affirmationLines,hypnoSpeechText,affirmations.enabled))){
      setNotice(locale==="ru"?"Сначала создайте озвучку фраз в блоке «Озвучка фраз».":
        locale==="es"?"Primero crea la voz de tus frases.":"Create a spoken-phrases track first.");
      return;
    }
    setHypnoAudioBusy(true);setMusicWarning("");
    try{
      if(!next.whisper&&!next.binaural){
        const previous=previousHypnoAudioRef.current;
        previousHypnoAudioRef.current=null;
        clearUploadedAudio();
        if(previous?.audio?.kind==="file"){
          const entry=chooseAudioFile(previous.audio.file);
          setAttachedAudio(entry?{...previous.audio,id:entry.url,file:entry.file}:null);
        }else setAttachedAudio(previous?.audio??null);
        setAudioRights(previous?.rights??false);
        setHypnoWhisperEnabled(false);setHypnoBinauralEnabled(false);
        setNotice(locale==="ru"?"Специальные аудиоэффекты отключены.":
          locale==="es"?"Efectos de audio desactivados.":"Audio effects are off.");
        return;
      }
      const previousAudio=previousHypnoAudioRef.current??{audio:attachedAudio,rights:audioRights};
      const baseAudio=previousAudio.audio;
      const backgroundFile=baseAudio?.kind==="file"?baseAudio.file:null;
      const includesNarration=Boolean(next.whisper||(baseAudio?.kind==="file"&&baseAudio.narration));
      const effectSpokenText=next.whisper?hypnoSpeechText:(baseAudio?.kind==="file"?baseAudio.spokenText??"":"");
      if(includesNarration&&!isApprovedAffirmationNarration(affirmationLines,effectSpokenText,affirmations.enabled)){
        setNotice(locale==="ru"?"Сначала обновите устаревшую озвучку выбранных фраз.":"Regenerate the outdated spoken-phrase track before applying audio effects.");
        return;
      }
      const speechSeconds=includesNarration
        ?next.whisper&&hypnoSpeechSource
          ?wavDurationFromHeader(await hypnoSpeechSource.slice(0,256).arrayBuffer())||0
          :baseAudio?.kind==="file"?baseAudio.speechSeconds??0:0
        :0;
      if(includesNarration&&speechSeconds>duration-0.35){
        setNotice(locale==="ru"?"Озвучка длиннее ролика. Увеличьте длительность или создайте голос заново.":"The voice track is longer than this video. Increase its duration or regenerate the narration.");
        return;
      }
      const file=await createHypnoAudioEffectFile({
        speechFile:includesNarration?hypnoSpeechSource:null,
        backgroundFile,
        durationSeconds:duration,
        whisperEnabled:next.whisper,
        binauralEnabled:next.binaural,
        beatHz:next.beatHz,
        repeatEverySeconds:next.repeatEverySeconds??hypnoRepeatEvery,
        whisperGain:(next.whisperGain??hypnoWhisperGain)/100,
      });
      if(recording||preparing)return;
      if(!previousHypnoAudioRef.current)previousHypnoAudioRef.current=previousAudio;
      const entry=chooseAudioFile(file);
      if(!entry)throw new Error("AUDIO_FILE_REJECTED");
      setAudioRights(true);setSoundVolume(100);
      setAttachedAudio({kind:"file",file:entry.file,id:entry.url,nonLoop:true,
        ...(includesNarration?{narration:true,spokenText:effectSpokenText,speechSeconds,
          mixSeconds:duration,voiceId:voicePreferences.voiceId,language:voicePreferences.language,bed:voicePreferences.bed}:{} )});
      setHypnoWhisperEnabled(next.whisper);setHypnoBinauralEnabled(next.binaural);setHypnoBeatHz(next.beatHz);
      setNotice(locale==="ru"?"Аудиоэффекты добавлены в звуковую дорожку видео.":
        locale==="es"?"Los efectos se añadieron a la pista de audio.":"Audio effects were added to the video's audio track.");
    }catch(error){
      const code=error instanceof Error?error.message:"";
      setNotice(code==="SPEECH_TRACK_REQUIRED"
        ?(locale==="ru"?"Для гипнозвука сначала создайте озвучку фраз.":"Create a spoken-phrases track before enabling quiet repetitions.")
        :code==="OFFLINE_AUDIO_UNAVAILABLE"
          ?(locale==="ru"?"Этот браузер не поддерживает локальное создание аудиоэффектов. Откройте страницу в Safari или Chrome.":"This browser cannot render local audio effects. Open the page in Safari or Chrome.")
          :(locale==="ru"?"Не удалось подготовить аудиоэффект. Проверьте поддержку аудио браузером и повторите попытку.":"The audio effect could not be prepared. Check browser audio support and try again."));
    }finally{setHypnoAudioBusy(false);}
  }
  function toggleHypnoWhisper(){
    void applyHypnoAudioEffects({whisper:!hypnoWhisperEnabled,binaural:hypnoBinauralEnabled,beatHz:hypnoBeatHz});
  }
  function toggleHypnoBinaural(){
    void applyHypnoAudioEffects({whisper:hypnoWhisperEnabled,binaural:!hypnoBinauralEnabled,beatHz:hypnoBeatHz});
  }
  async function toggleHypnoVoice(){
    if(!hypnoSpeechSource||phrasePending||narrationInvalid||!isApprovedAffirmationNarration(affirmationLines,hypnoSpeechText,affirmations.enabled))return;
    if(attachedAudio?.kind==="file"&&attachedAudio.narration&&audioRights){
      setHypnoWhisperEnabled(false);setHypnoBinauralEnabled(false);previousHypnoAudioRef.current=null;
      clearUploadedAudio();setAttachedAudio(null);
      setNotice(locale==="ru"?"Озвучка выключена. Исходная запись сохранена в редакторе фраз.":"Voice track disabled; its source remains available in the phrase editor.");
    }else{
      const speechSeconds=wavDurationFromHeader(await hypnoSpeechSource.slice(0,256).arrayBuffer())||0;
      if(speechSeconds>duration-0.35){
        setNotice(locale==="ru"?"Озвучка длиннее ролика. Увеличьте длительность или создайте голос заново.":"The voice track is longer than this video. Increase its duration or regenerate the narration.");
        return;
      }
      const entry=chooseAudioFile(hypnoSpeechSource);
      if(entry){setAudioRights(true);setSoundVolume(100);setAttachedAudio({kind:"file",file:entry.file,id:entry.url,
        narration:true,spokenText:hypnoSpeechText,speechSeconds,mixSeconds:duration,
        voiceId:voicePreferences.voiceId,language:voicePreferences.language,bed:voicePreferences.bed});}
    }
  }
  async function attachMeditationNarration(file:File):Promise<boolean>{
    if(recording||preparing||!isSupportedLocalAudio(file))return false;
    // A free short TTS excerpt must fit inside one existing local movie.
    // Never silently truncate the spoken text or loop it after the last word.
    const seconds=wavDurationFromHeader(await file.slice(0,256).arrayBuffer());
    const target=seconds?durations.find(value=>value>=seconds+0.35):undefined;
    if(!target){
      setNotice(locale==="ru"?"Для бесплатного видео нужна озвучка до 59 секунд. Сократите отрывок медитации.":
        locale==="es"?"La narración debe durar menos de 59 segundos. Reduce el texto.":
        "This local video supports up to 59 seconds of speech. Please shorten the narration excerpt.");
      return false;
    }
    const entry=chooseAudioFile(file);
    if(!entry)return false;
    setAudioRights(true);
    setSoundVolume(100);
    setAttachedAudio({kind:"file",file:entry.file,id:entry.url,nonLoop:true});
    // Keep the approved scene order and adaptive cut timing when voice changes the length.
    if(duration!==target)changeVideoDuration(target);
    setNotice(locale==="ru"?"Голос медитации и музыкальный фон добавлены в видеоролик.":
      locale==="es"?"La narración y la música se han adjuntado al vídeo.":
      "Meditation narration and background are now attached to the video.");
    return true;
  }
  function chooseMusic(choice:AmbientMusic){
    if(choice!=="none"&&!curatedAudioTracks.some(track=>track.id===choice))return;
    clearUploadedAudio();
    setSamplePreviewId(null);
    setMusic(choice);
    setAudioDurationInvalid(false);
    setAudioPlaybackError(false);
    setMusicWarning("");
  }
  function attachSelectedAudio(){
    if(recording||preparing||micRecording||audioDurationInvalid)return;
    if(uploadedAudio&&!audioRights){setMusicWarning(ui.audioRightsHelp);return;}
    if(uploadedAudio)setAttachedAudio({kind:"file",id:uploadedAudio.url,file:uploadedAudio.file,
      // Locally recorded microphone speech is not a looping soundtrack.
      ...(/^my-voice\./i.test(uploadedAudio.file.name)?{nonLoop:true as const}:{})});
    else if(music!=="none"){
      if(!curatedAudioTracks.some(track=>track.id===music))return;
      setAttachedAudio({kind:"preset",id:music});
    }
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
      const session={recorder,stream,chunks,timeout:setTimeout(stopMicRecording,recipientAudioSelected?59000:180000)};
      micRef.current=session;
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onerror=()=>{micSpeechRef.current?.abort();micSpeechRef.current=null;setMusicWarning(audioUi.recordFailed);};
      const voiceCaptureStart=performance.now();
      recorder.onstop=async()=>{
        clearTimeout(session.timeout);
        stream?.getTracks().forEach(track=>track.stop());
        if(micRef.current!==session)return;
        const speechCapture=micSpeechRef.current;micSpeechRef.current=null;
        const captured=speechCapture?await speechCapture.stop(Math.max(.1,Math.min(59.5,(performance.now()-voiceCaptureStart)/1000))):null;
        if(micRef.current!==session)return;
        micRef.current=null;
        setMicRecording(false);
        if(!chunks.length||!aliveRef.current){setMusicWarning(audioUi.recordFailed);return;}
        const kind=recorder.mimeType||mime||"audio/mp4";
        const ext=kind.includes("webm")?"webm":"m4a";
        const file=new File(chunks,"my-voice."+ext,{type:kind});
        if(!isSupportedLocalAudio(file)){setMusicWarning(audioUi.recordTooLarge);return;}
        if(recipientAudioSelected&&file.size>4*1024*1024){
          setSttError(locale==="ru"?"Запись превышает 4 МБ. Запишите короткое сообщение.":
            locale==="es"?"La grabación supera 4 MB. Graba un mensaje más corto.":
              "Recording exceeds 4 MB. Please record a shorter message.");
          return;
        }
        const selected=chooseAudioFile(file);
        if(!selected&&recipientAudioSelected){
          setSttError(locale==="ru"?"Формат записи не поддерживается.":
            locale==="es"?"Formato de audio no compatible.":"Unsupported recording format.");
          return;
        }
        if(selected&&captured){
          // A genuine browser speech event, not invented words; event-time bounds are approximate.
          setVoiceTranscript(captured);
          setVoiceVisualPlan(planAudioVisualStoryboard({
            transcript:captured,scenes:FREE_FILM_CATALOG,aspect,theme:"",locale
          }));
          setNotice(locale==="ru"?"Голос распознан во время записи. Временные отметки приблизительные — проверьте текст перед монтажом.":
            locale==="es"?"Voz transcrita durante la grabación; los tiempos son aproximados. Revisa el texto.":
              "Voice recognized while recording. Timestamps are approximate; review the text.");
        }
        setMusicWarning(audioUi.fileReady);
      };
      recorder.start(250);
      // Voice capture is attempted only when the visitor explicitly chose Record.
      // On iPhone browser STT may use Apple's or another browser vendor's service.
      micSpeechRef.current=recipientAudioSelected?startDeviceVoiceCapture(locale):null;
      setMusicWarning("");
      setMicRecording(true);
    }catch{
      micSpeechRef.current?.abort();micSpeechRef.current=null;
      stream?.getTracks().forEach(track=>track.stop());
      setMusicWarning(audioUi.recordFailed);
    }
  }
  function confirmVideoPlayback(video:HTMLVideoElement){
    if(video.videoWidth>0 && video.videoHeight>0 && video.readyState>=2 && !video.error){
      setPlaybackStatus("ready");
      if(result?.mode!=="catalog")setNotice(creditConfirmed?t.ready:
        (locale==="ru"?"Видео проверено. Подтверждаем списание кредитов…":
          locale==="es"?"Vídeo verificado. Confirmando créditos…":
          "Video verified. Confirming credit charge…"));
    }
  }
  async function shareVideo(){
    if(!result||result.mode==="catalog"||!creditConfirmed||
      (creditCatalog?.chargeRequired&&creditSession!=="signed_in"))return;
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
    setPreviewPlaying(false);setCinematicPlan(null);setTimelineTextClips(null);
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
  // Goal-first Auto Director uses the existing consented Free MP4 renderer, not paid video AI.
  // Output framing changes must never discard a confirmed four-scene montage.
  const changeVideoAspect=(nextAspect:Aspect)=>{
    if(recording||preparing||nextAspect===aspect)return;
    recordBeforeEditorChange("aspect");
    setAspect(nextAspect);
    setCinematicPlan(plan=>{
      if(!plan)return null;
      if(plan.version===FREE_FILM_PLAN_VERSION&&!plan.shots.every(shot=>{
        const verified=verifiedCategorySource(FREE_FILM_CATALOG_BY_ID.get(shot.sceneId));
        return Boolean(verified&&verifiedSceneAspect(verified,nextAspect));
      }))return null;
      return reframeCinematicPlan(plan,nextAspect) as CinematicStoryboard;
    });
  };
  const changeVideoDuration=(seconds:(typeof durations)[number])=>{
    if(seconds===duration)return;
    recordBeforeEditorChange("duration");
    setDuration(seconds);
    setTimelineTextClips(current=>current?retimeMontageSetups(current,seconds):null);
    setCinematicPlan(plan=>{
      if(plan?.version===FREE_FILM_PLAN_VERSION){
        if(plan.shots.length*2>seconds)return null;
        try{
          const ids=plan.shots.map(shot=>shot.sceneId);
          const verifiedSources=ids.map(id=>verifiedCategorySource(FREE_FILM_CATALOG_BY_ID.get(id)));
          const timeline=ids.length===4
            ?allocateSourceBoundedFilmTimeline(seconds,ids,
              verifiedSources.map(scene=>scene?.durationSeconds??NaN))
            :allocateVariableFilmTimeline(seconds,ids);
          if(!plan.shots.every((shot,index)=>{
            const verified=verifiedSources[index];
            return Boolean(verified&&verifiedSceneAspect(verified,aspect)&&
              verified.durationSeconds>=timeline[index].durationSeconds);
          }))return null;
          return {...plan,durationSeconds:seconds,
            shots:plan.shots.map((shot,index)=>({...shot,...timeline[index]}))} as CinematicStoryboard;
        }catch{return null;}
      }
      if(plan?.version===FIRST_VIDEO_FOOD_CANVAS_PLAN_VERSION){
        const timing=allocateFreeFilmTimeline(seconds,plan.shots.map(shot=>shot.sceneId));
        return {...plan,durationSeconds:seconds,
          shots:plan.shots.map((shot,index)=>({...shot,...timing[index]}))} as CinematicStoryboard;
      }
      if(plan?.version==="hh-cinematic-storyboard-v1" && [4,6].includes(plan.shots.length)){
        // A narrated edit changes the cut times, NOT the approved shots,
        // captions, story overlays or scene order selected by the visitor.
        const count=plan.shots.length, unit=Math.floor(seconds/count), extra=seconds%count;
        if(unit<1)return null;
        let cursor=0;
        return {...plan,durationSeconds:seconds,
          shots:plan.shots.map((shot,index)=>{
            const durationSeconds=unit+(index<extra?1:0);
            const result={...shot,startSeconds:cursor,durationSeconds};
            cursor+=durationSeconds;
            return result;
          })} as CinematicStoryboard;
      }
      return null;
    });
  };
  // The final editor changes the same approved four-shot plan used by Canvas and MediaRecorder.
  const reorderFilmScene=(index:number,delta:-1|1)=>{
    recordBeforeEditorChange("shot-reorder");
    setCinematicPlan(current=>{
      if(current?.version!==FREE_FILM_PLAN_VERSION||current.shots.length<4||current.shots.length>12)return current;
      const nextIndex=index+delta;
      if(nextIndex<0||nextIndex>=current.shots.length)return current;
      const ordered=[...current.shots];
      [ordered[index],ordered[nextIndex]]=[ordered[nextIndex],ordered[index]];
      let startSeconds=0;
      const shots=ordered.map((shot,i)=>{
        const next={...shot,number:i+1,startSeconds};
        startSeconds+=shot.durationSeconds;
        return next;
      });
      return {...current,shots,sceneChoices:shots.map(shot=>({
        sceneId:shot.sceneId,theme:shot.theme,visualCue:shot.visualCue
      }))} as CinematicStoryboard;
    });
    stopMovieSound();setPreviewPlaying(false);
  };
  const shiftFilmCut=(index:number,direction:-1|1)=>{
    recordBeforeEditorChange("shot-trim");
    setCinematicPlan(current=>{
      if(current?.version!==FREE_FILM_PLAN_VERSION||current.shots.length<4||current.shots.length>12)return current;
      const durations=current.shots.map(shot=>shot.durationSeconds);
      const next=durations.length===4?shiftAdaptiveFilmBoundary(durations,index,direction):shiftVariableFilmBoundary(durations,index,direction);
      let startSeconds=0;
      const shots=current.shots.map((shot,i)=>{
        const updated={...shot,startSeconds,durationSeconds:next[i]};
        startSeconds+=next[i];
        return updated;
      });
      return {...current,shots} as CinematicStoryboard;
    });
    stopMovieSound();setPreviewPlaying(false);
  };
  // Reorder source-backed scenes in the existing Canvas/MediaRecorder plan.
  const moveTimelineShot=(from:number,to:number)=>{
    if(recording||preparing||from===to)return;
    recordBeforeEditorChange("shot-reorder");
    setCinematicPlan(current=>{
      if(current?.version!==FREE_FILM_PLAN_VERSION||current.shots.length<4||current.shots.length>12||
        from<0||from>=current.shots.length||to<0||to>=current.shots.length||from===to)return current;
      const order=[...current.shots];order.splice(to,0,...order.splice(from,1));
      let cursor=0;
      const shots=order.map((shot,i)=>{
        const next={...shot,number:i+1,startSeconds:cursor};
        cursor+=shot.durationSeconds;return next;
      });
      return {...current,shots,sceneChoices:shots.map(shot=>({
        sceneId:shot.sceneId,theme:shot.theme,visualCue:shot.visualCue
      }))} as CinematicStoryboard;
    });
    stopMovieSound();setPreviewPlaying(false);
  };
  const changeTimelineShotEffect=(index:number,patch:{
    transitionIn?:TimelineTransition;colorLook?:TimelineLook
  })=>{
    if(recording||preparing)return;
    if(patch.transitionIn&&!CREATIVE_TRANSITIONS.includes(patch.transitionIn))return;
    if(patch.colorLook&&!CREATIVE_LOOKS.includes(patch.colorLook))return;
    recordBeforeEditorChange("shot-look:"+index);
    setCinematicPlan(current=>{
      if(current?.version!==FREE_FILM_PLAN_VERSION||index<0||index>=current.shots.length)
        return current;
      const shots=current.shots.map((shot,i)=>i===index?{...shot,...patch}:shot);
      return {...current,shots} as CinematicStoryboard;
    });
    stopMovieSound();setPreviewPlaying(false);
  };
  const changeTimelineShotMotion=(index:number,motion:MyTubeMotion|null)=>{
    if(recording||preparing||!usingFreeFilmCompilation||!cinematicPlan||
       index<0||index>=cinematicPlan.shots.length)return;
    let safe:MyTubeMotion|null;
    try{safe=validateMyTubeMotion(motion);}catch{return;}
    // Each gesture is undoable and invalidates the previously encoded MP4.
    recordBeforeEditorChange("shot-motion:"+index);
    setCinematicPlan(current=>{
      if(current?.version!==FREE_FILM_PLAN_VERSION)return current;
      return {...current,shots:current.shots.map((shot,i)=>i===index?
        {...shot,motion:safe}:shot)} as CinematicStoryboard;
    });
    stopMovieSound();setPreviewPlaying(false);
    setPreviewFrameRevision(value=>value+1);
  };
  const changeTimelineShotSourceTiming=(index:number,patch:{
    sourcePhasePercent?:number;sourceSpeed?:number
  })=>{
    if(recording||preparing||!usingFreeFilmCompilation||!cinematicPlan||
       index<0||index>=cinematicPlan.shots.length)return;
    const shot=cinematicPlan.shots[index];
    let safe;
    try{
      safe=validateLicensedSourcePlayback(
        patch.sourcePhasePercent??shot.sourcePhasePercent??0,
        patch.sourceSpeed??shot.sourceSpeed??1
      );
    }catch{return;}
    if(safe.sourcePhasePercent===(shot.sourcePhasePercent??0)&&
       safe.sourceSpeed===(shot.sourceSpeed??1))return;
    recordBeforeEditorChange("source-timing:"+index);
    setCinematicPlan(current=>{
      if(current?.version!==FREE_FILM_PLAN_VERSION)return current;
      return {...current,shots:current.shots.map((item,i)=>i===index?
        {...item,...safe}:item)} as CinematicStoryboard;
    });
    stopMovieSound();setPreviewPlaying(false);
    setPreviewFrameRevision(value=>value+1);
  };
  const changeMusicBed=(patch:Partial<MyTubeMusicBed>)=>{
    if(recording||preparing)return;
    let value:MyTubeMusicBed;
    try{value=validateMyTubeMusicBed({...musicBed,...patch});}catch{return;}
    if(value.id===musicBed.id&&value.volumePercent===musicBed.volumePercent&&
       value.fadeSeconds===musicBed.fadeSeconds)return;
    recordBeforeEditorChange(patch.volumePercent===undefined?"audio-bed":"audio-bed-volume");
    setMusicBed(value);stopMovieSound();setPreviewPlaying(false);
  };
  const splitTimelineText=(id:string,atSeconds:number)=>{
    recordBeforeEditorChange("caption-split");
    const newId="timeline-text-"+(++timelineTextSerial.current);
    setTimelineTextClips(current=>splitTimelineCaption(current??timelineCaptions,id,
      atSeconds,duration,newId));
    stopMovieSound();setPreviewPlaying(false);return newId;
  };
  const duplicateTimelineText=(id:string)=>{
    recordBeforeEditorChange("caption-duplicate");
    const newId="timeline-text-"+(++timelineTextSerial.current);
    setTimelineTextClips(current=>duplicateTimelineCaption(current??timelineCaptions,id,
      newId,duration));
    stopMovieSound();setPreviewPlaying(false);return newId;
  };
  const changeTimelineCaption=(id:string,patch:Partial<Omit<TimelineTextClip,"id">>)=>{
    recordBeforeEditorChange("caption:"+id);
    setTimelineTextClips(current=>(current??timelineCaptions).map(clip=>{
      if(clip.id!==id)return clip;
      const startSeconds=clampTrackSecond(patch.startSeconds??clip.startSeconds,Math.max(0,duration-.1));
      const durationSeconds=Math.max(.1,clampTrackSecond(
        patch.durationSeconds??clip.durationSeconds,duration-startSeconds));
      return {...clip,startSeconds,durationSeconds,
        text:patch.text===undefined?clip.text:normalizeStageCaption(patch.text),
        ...(patch.styleId!==undefined?{styleId:patch.styleId}:{}),
        ...(patch.motionId!==undefined?{motionId:patch.motionId}:{}),
        ...(patch.positionId!==undefined?{positionId:patch.positionId}:{}),
        ...(patch.motionSpeed!==undefined?{motionSpeed:patch.motionSpeed}:{}),
        ...(patch.motionDirection!==undefined?{motionDirection:patch.motionDirection}:{})};
    }));
    setPreviewPlaying(false);stopMovieSound();
  };
  const addTimelineCaption=()=>{
    recordBeforeEditorChange("caption-add");
    const id="timeline-text-"+(++timelineTextSerial.current);
    const startSeconds=clampTrackSecond(previewSeekSeconds,Math.max(0,duration-1));
    setTimelineTextClips(current=>[...(current??timelineCaptions),{
      id,startSeconds,durationSeconds:Math.min(4,duration-startSeconds),
      text:locale==="ru"?"Новая надпись":locale==="es"?"Nuevo texto":"New caption"
    }].slice(-16));
    setPreviewPlaying(false);stopMovieSound();return id;
  };
  const importMontageSetups=()=>{
    const chosen=affirmationLines.slice(0,5);
    const imported:TimelineTextClip[]=distributeMontageSetups(chosen,duration).map(clip=>({
      ...clip,styleId:"classic" as const,motionId:"fade" as const,positionId:"center" as const
    }));
    if(!imported.length)return;
    recordBeforeEditorChange("setups-import");
    setTimelineTextClips(current=>[
      ...(current??timelineCaptions).filter(clip=>!isMontageSetupClip(clip)&&!clip.id.startsWith("stage-")),
      ...imported
    ].slice(0,16));
    stopMovieSound();setPreviewPlaying(false);
  };
  const reorderMontageSetup=(from:number,to:number,autoTiming:boolean)=>{
    if(recording||preparing)return;
    recordBeforeEditorChange("setups-reorder");
    setTimelineTextClips(current=>reorderMontageSetups(current??timelineCaptions,from,to,duration,autoTiming));
    stopMovieSound();setPreviewPlaying(false);
  };
  const seekTimeline=(seconds:number)=>{
    const at=clampTrackSecond(seconds,duration);
    stopMovieSound();setPreviewPlaying(false);
    setPreviewSeekSeconds(at);setPreviewPlayhead(at);
    // The original native HD source must seek with the Canvas ruler too.
    const video=premiumVideoRef.current;
    if(video&&activeFilm&&video.readyState>=1&&Number.isFinite(video.duration)&&video.duration>0){
      try{video.pause();video.currentTime=Math.min(video.duration-.05,at%video.duration);}
      catch{/* Decoder may still be loading; the next frame is retryable. */}
    }
    setPreviewFrameRevision(value=>value+1);
  };
  /** Attach one of the scenario's real music files only with visitor auto-music enabled.
   * Manual silence/recordings take precedence and music preview never autoplays. */
  const selectScenarioMusic=(_presetId:string)=>{
    // A newly chosen executable film replaces an older editorial phrase path.
    setGoalTreeAudioScenarioId(null);
    if(!audioAuto||uploadedAudio||micRecording)return;
    const track=recommendCuratedAudio({theme:audioTheme,kind:"melody"})[0];
    if(!track)return;
    const id=track.id as PresetId;
    setMusic(id);
    setSamplePreviewId(null);
    setAttachedAudio({kind:"preset",id});
    setMusicWarning("");
  };
  const applyAutoFilm=(presetId:string,seconds:10|15|20|30|60,
    edit?:FreeFilmCompilationEdit,
    outputAspect:Aspect=aspect,keepGoalFlow=false)=>{
    if(recording||preparing)return false;
    const preset=FREE_FILM_PRESETS.find(item=>item.id===presetId);
    if(!preset){setNotice(ui.videoUnavailable);return false;}
    try{
      const plan=compileFreeFilmPreset(preset,locale,seconds,outputAspect,edit);
      resetEditorHistory();setPortraitRetry(null);
      setCreationMode("catalog");setActiveFreeFilmPreset(preset.id);
      selectScenarioMusic(preset.id);
      if(edit?.semanticScenePlan){
        setSpeed(edit.semanticScenePlan.pace==="gentle"?"slow":"dynamic");
        if(edit.semanticScenePlan.pace==="gentle")setBrightness("soft");
      }
      setTheme(preset.theme);setVideoCategory(preset.theme);
      if(preset.theme==="money")setMoneyScene(preset.id.startsWith("motion-film-")?null:preset.clips[0] as MoneySceneId);
      else {setMoneyScene(null);setOtherScene(otherVideoScenes[preset.theme][0].id);}
      setPracticeType("video");setPracticeLevels(value=>({...value,video:"basic"}));
      setAspect(outputAspect);setDuration(seconds);setCinematicPlan(plan);
      setTimelineTextClips(null);setPreviewSeekSeconds(0);setPreviewPlayhead(0);
      setPreviewPlaying(false);setSuggestion("");
      const added=plan.shots.length>4;
      const hasAbstract=plan.shots.some(shot=>
        FREE_FILM_CATALOG_BY_ID.get(shot.sceneId)?.media==="original_motion_mp4");
      setNotice(added
        ? locale==="ru"
          ?`Подобрано ${plan.shots.length} разных проверенных MP4 без повторения кадров.${hasAbstract?" Часть — авторская абстрактная анимация.":""} Нажмите «Создать видео».`
          :locale==="es"
          ?`${plan.shots.length} clips verificados sin repetir escenas.${hasAbstract?" Algunos son animaciones abstractas originales.":""} Pulsa Crear vídeo.`
          :`${plan.shots.length} verified source clips selected without repeating shots.${hasAbstract?" Some are original abstract animations.":""} Choose Create video.`
        :locale==="ru"?"Бесплатный монтаж выбран. Нажмите «Создать видео».":locale==="es"
          ?"Montaje gratuito seleccionado. Pulsa Crear vídeo.":"Free film selected. Choose Create video.");
      // Confirm does not render or jump away from the next action.
      // After the React commit, scroll to the genuine local Create control.
      if(!keepGoalFlow)window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
        document.querySelector("[data-auto-video-create]")?.scrollIntoView({
          behavior:"smooth",block:"nearest"
        })));
      return true;
    }catch(error){
      const reason=error instanceof Error?error.message:"";
      const formatUnavailable=outputAspect!=="portrait"&&(
        reason==="invalid_free_film_replacement"||
        reason.includes("INITIAL_SOURCES_NOT_VERIFIED")||
        reason==="UNVERIFIED_FOOTAGE_ASPECT_DURATION_OR_REUSE");
      if(formatUnavailable){
        setPortraitRetry({presetId,seconds,edit});
        setNotice(locale==="ru"
          ?"Исходные MP4 этого сюжета вертикальные. Выберите «Создать в 9:16» — видео будет собрано из проверенных сцен."
          :locale==="es"?"Los MP4 de esta historia son verticales. Elige crear en 9:16."
          :"These sources are portrait video. Choose Create in 9:16 to use verified footage.");
      }else{
        setPortraitRetry(null);
        setNotice(reason.includes("INSUFFICIENT_DISTINCT_APPROVED_FOOTAGE")
          ?locale==="ru"?"Для такой длительности не хватает различных разрешённых MP4. Выберите короткий ролик или другую тему."
            :locale==="es"?"No hay suficientes MP4 distintos para esta duración. Elige un vídeo más corto u otro tema."
            :"Not enough distinct approved MP4 sources for this length. Choose a shorter film or another topic."
          :ui.videoUnavailable);
      }
      return false;
    }
  };
  const createFiveSceneStory=()=>{
    if(recording||preparing)return;
    // An unavailable paid model must never silently produce a local film labelled AI.
    if(storyFormat==="ai_cinematic"){
      setNotice(locale==="ru"
        ?"AI Cinematic пока выключен. Выберите Visual или Motion для бесплатной локальной Stories."
        :locale==="es"
          ?"AI Cinematic está desactivado. Elige Visual o Motion para una Story local gratuita."
          :"AI Cinematic is disabled. Choose Visual or Motion for a free local Story.");
      return;
    }
    if(storyFormat==="talking_character"){
      setProCatalogKind("character");setActiveWorkspace("pro");setPreviewPlaying(false);
      window.requestAnimationFrame(()=>document.querySelector("[data-video-quick-personal]")?.scrollIntoView({block:"start",behavior:"smooth"}));
      return;
    }
    const format=storyFormat==="motion"?"motion":"visual";
    const clips=selectFiveStoryClips(theme,"portrait",20,format);
    if(clips.length!==5){
      setNotice(locale==="ru"
        ?"В этой теме пока недостаточно пяти разных снятых и редакционно проверенных вертикальных видео. Рисованная графика и нерелевантная природа не подставляются."
        :locale==="es"
          ?"Aún no hay cinco vídeos verticales aprobados y distintos para este tema."
          :"This topic does not yet have five distinct approved portrait clips. Unrelated scenes will not be substituted.");
      return;
    }
    const preset=FREE_FILM_PRESETS.find(item=>item.theme===theme);
    if(!preset){setNotice(ui.videoUnavailable);return;}
    const timings=allocateVariableFilmTimeline(20,clips);
    const edit:FreeFilmCompilationEdit={
      clipIds:clips,durationSecondsByStage:timings.map(item=>item.durationSeconds),
      captionTexts:clips.map(()=>""),excludedMotifs:[]
    };
    if(applyAutoFilm(preset.id,20,edit,"portrait",true)){
      if(storyFormat==="motion"){setSpeed("dynamic");setMontageTransition("soft");}
      setMontagePanel("concept");
      setNotice(locale==="ru"
        ?"Пять проверенных сцен собраны в вертикальную историю. Просмотрите кадры и нажмите «Создать видео» для локального MP4."
        :locale==="es"
          ?(storyFormat==="motion"?"Cinco escenas reales filmadas están listas con montaje dinámico. Revisa el guion y crea el MP4 local.":"Cinco escenas de vídeo verificadas están listas. Revisa el guion y crea el MP4 local.")
          :"Five verified scenes are ready. Review the storyboard and create the local MP4.");
    }
  };
  const replaceStoryboardSource=(index:number,sceneId:string)=>{
    if(recording||preparing)return;
    const current=cinematicPlan,candidate=FREE_FILM_CATALOG_BY_ID.get(sceneId);
    const verified=candidate?verifiedCategorySource(candidate):null;
    if(current?.version!==FREE_FILM_PLAN_VERSION||!candidate||!verified||
      !STORY_REVIEWED_THEME_COMPATIBILITY[theme].includes(candidate.theme as VideoTheme)||
      !isReviewedFilmedStoryScene(candidate,aspect)||
      !verifiedSceneAspect(verified,aspect)||
      verified.durationSeconds<(current.shots[index]?.durationSeconds||Infinity))return;
    const key=canonicalSourceMasterKey(verified);
    if(!key||current.shots.some((shot,i)=>i!==index&&
      canonicalSourceMasterKey(verifiedCategorySource(FREE_FILM_CATALOG_BY_ID.get(shot.sceneId)))===key))return;
    recordBeforeEditorChange("storyboard-source:"+index);
    setCinematicPlan(plan=>plan?.version!==FREE_FILM_PLAN_VERSION?plan:{
      ...plan,shots:plan.shots.map((shot,i)=>i===index?{
        ...shot,sceneId,theme:candidate.theme as VideoTheme,
        visualCue:candidate.description?.[locale]||candidate.label?.[locale]||sceneId
      }:shot),
      sceneChoices:plan.sceneChoices.map((choice,i)=>i===index?{
        sceneId,theme:candidate.theme as VideoTheme,
        visualCue:candidate.description?.[locale]||candidate.label?.[locale]||sceneId
      }:choice)
    });
    setResult(null);setReadyFreeFilmKey("");setPreviewPlaying(false);stopMovieSound();
  };
  async function transcribeVideoVoice(){
    const entry=uploadedAudioRef.current;
    if(!entry||recording||preparing||micRecording||sttBusy)return;
    if(entry.file.size>4*1024*1024){
      setSttError(locale==="ru"?"Файл больше 4 МБ. Сожмите запись в M4A/MP3 и загрузите снова.":
        locale==="es"?"El archivo supera 4 MB. Comprímelo a M4A/MP3.":"Audio exceeds 4 MB. Compress it to M4A/MP3.");
      return;
    }
    sttAbortRef.current?.abort();
    const controller=new AbortController();
    sttAbortRef.current=controller;setSttBusy(true);setSttError("");
    setVoiceTranscript(null);setVoiceVisualPlan(null);setAudioPlanApplied(false);
    try{
      // Prefer genuine on-device audio-track recognition where the browser has
      // an installed local language pack; only the explicit click may fall
      // back to the pre-existing consented, zero-cost-confirmed server bridge.
      let transcript:TimedSpeechTranscript;
      try{
        transcript=await transcribeDeviceAudioFile(entry.file,locale,controller.signal);
      }catch{
        if(controller.signal.aborted)return;
        const transcriptFromFreeService=await requestConsentedTimedTranscript(entry.file,locale,true,controller.signal);
        transcript=transcriptFromFreeService;
      }
      if(sttAbortRef.current!==controller||
        uploadedAudioRef.current?.file!==entry.file)return;
      setVoiceTranscript(transcript);
      // A source-bound PREVIEW only; the existing consented "Match footage"
      // button still validates and applies the real montage explicitly.
      setVoiceVisualPlan(planAudioVisualStoryboard({
        transcript,scenes:FREE_FILM_CATALOG,aspect,theme:"",locale
      }));
      setNotice(locale==="ru"?"Расшифровка с временными метками готова. Проверьте текст перед монтажом.":
        locale==="es"?"Transcripción con tiempos lista. Revisa el texto.":"Timed transcript ready. Review it before editing.");
      if(recipientAudioSelected)window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
        document.querySelector("[data-video-recipient-audio-plan]")?.scrollIntoView({
          block:"nearest",behavior:"smooth"
        })));
    }catch(error){
      if(controller.signal.aborted)return;
      const code=error instanceof Error?error.message:"";
      setSttError(code==="AUDIO_STT_FREE_PROVIDER_NOT_CONFIGURED"?
        (locale==="ru"?"Для файла нет доступного автоматического распознавания. Продиктуйте текст в поле ниже через клавиатуру телефона или перейдите в монтаж без таймкодов. Платный сервис не использован.":
          locale==="es"?"Este navegador no puede transcribir el archivo sin un servicio disponible. Puedes dictar el texto abajo o editar sin tiempos.":
            "No automatic transcription for this file in this browser. Use the keyboard microphone to dictate below, or edit without timestamps. No paid service was used.") :
        (locale==="ru"?"Не удалось расшифровать запись с точными таймкодами. Проверьте сеть и формат аудио.":
          locale==="es"?"No se pudo transcribir con tiempos verificados. Revisa la conexión y el formato.":
            "Timed transcription failed. Check the connection and audio format."));
      if(recipientAudioSelected)window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
        document.querySelector("[data-video-recipient-audio-error]")?.scrollIntoView({
          block:"nearest",behavior:"smooth"
        })));
    }finally{
      if(sttAbortRef.current===controller){
        sttAbortRef.current=null;setSttBusy(false);
      }
    }
  }
  function applyTranscriptVideo(providedTranscript?:TimedSpeechTranscript,automatic=false){
    const entry=uploadedAudioRef.current;
    const transcript=providedTranscript??voiceTranscript;
    if(!entry||!transcript||recording||preparing||!audioRights)return;
    const speechConcept=suggestVideoConcept({locale,goal:wish,theme,styleIndex:quickStyleIndex,
      phrases:affirmationLines,speechTranscript:transcript});
    const plan=planAudioVisualStoryboard({
      transcript,scenes:FREE_FILM_CATALOG,concept:speechConcept,
      // For recorded speech do not bias every story toward the default
      // Energy category. Real spoken concepts determine each scene.
      aspect,theme:automatic?"":theme,locale
    });
    setVoiceVisualPlan(plan);setAudioPlanApplied(false);
    if(!plan.canExport||!plan.edit){
      // Editorial Concept can be reviewed even before licensed media is available.
      setActiveWorkspace("phrases");setIdeasSubtab("concept");
      setNotice(locale==="ru"?"Концепция речи готова; видеосцены ещё требуют проверки.":
        locale==="es"?"Concepto listo; las escenas aún requieren verificación.":
        "Speech concept ready; footage still requires verification.");
      setSttError(plan.status==="AUDIO_LONGER_THAN_60_SECONDS"?
        (locale==="ru"?"Запись длиннее 59 секунд. Для сохранения всей речи нужен более длинный видеоэкспорт; сократите аудиофайл.":
          locale==="es"?"El audio supera 59 segundos. Acórtalo para este editor.":"Audio exceeds 59 seconds. Shorten it for this editor.") :
        (locale==="ru"?"Не найдено достаточно проверенных видео нужного формата и длительности. Попробуйте другую ориентацию.":
          locale==="es"?"No hay suficientes vídeos verificados de este formato. Cambia la orientación.":
            "Not enough approved footage for this aspect/duration. Try another orientation."));
      return;
    }
    const preset=FREE_FILM_PRESETS.find(item=>item.theme===theme)||FREE_FILM_PRESETS[0];
    const accepted=applyAutoFilm(preset.id,
      plan.durationSeconds as 10|15|20|30|60,plan.edit);
    if(!accepted){
      setSttError(locale==="ru"?"Монтаж не прошёл проверку видеоисточников. Выберите другой формат.":
        locale==="es"?"Las fuentes no pasaron la validación. Prueba otro formato.":
          "Footage validation failed. Try another format.");
      return;
    }
    // Preserve original speech once, never loop a personal message.
    setAudioPlanApplied(true);
    setAttachedAudio({kind:"file",file:entry.file,id:entry.url,nonLoop:true});
    setAudioAuto(false);setSoundVolume(100);setMusic("none");
    setWish(transcript.text.slice(0,800));setVideoScenarioOpen(true);
    if(automatic){
      setActiveWorkspace("phrases");setIdeasSubtab("concept");
      setShowAdvancedVideo(true);
    }
    setSttError("");
    setNotice(locale==="ru"?"Видеоряд автоматически синхронизирован с речью. Проверьте монтаж и нажмите «Создать видео».":
      locale==="es"?"Escenas sincronizadas automáticamente con la voz. Revisa y pulsa Crear vídeo.":
        "Footage automatically matched to your voice. Review the edit and choose Create video.");
  }
  // Same-tab Messenger transcription is applied ONCE, after the audio file,
  // rights and Studio hydration are committed. No Goal/category prompts.
  useEffect(()=>{
    if(!pendingAutoVoice||!uploadedAudio||!audioRights||!studioHydrated||
      recording||preparing)return;
    setPendingAutoVoice(null);
    applyTranscriptVideo(pendingAutoVoice,true);
  // The local handoff is a one-shot event, not a subscription to editor changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pendingAutoVoice,uploadedAudio,audioRights,studioHydrated,recording,preparing]);
  const selectCategory=(next:VideoCategory)=>{
    resetEditorHistory();
    setCinematicPlan(null);setTimelineTextClips(null);setPreviewSeekSeconds(0);setPreviewPlayhead(0);setIntroPlaying(false);
    setTheme(next);setVideoCategory(next);setSuggestion("");setShowAllMoney(false);
    // Keep the client's approved wording when selecting another video theme;
    // the optional goal-tree catalogue will suggest the next relevant phrases.
    setPreviewPlaying(false); // Theme changes preserve the user's photo checkbox choice.
    if(next==="money")setMoneyScene("golden-rain");
    else {setMoneyScene(null);setOtherScene(otherVideoScenes[next][0].id);}
  };

  const resetVideoSettings=()=>{
    if(recording||preparing)return;
    clearUploadedAudio();
    setDuration(20);setAspect("landscape");setSpeed("slow");setBrightness("soft");
    setMusic("none");setAttachedAudio(null);setSoundVolume(75);setCaptionMode("none");
    setAudioAuto(false);setAudioKind("all");setAudioMood("all");setAudioPace("all");
    setAudioVoiceFriendly(false);setAudioSearch("");setAudioSort("best");setShowAllAudio(false);setAudioDurationInvalid(false);setAudioThemeOverride(null);setAudioCategoryOverride(null);
    setCustomCaption("");setQuality("hd");
    setAffirmations(defaultAffirmations);
    setHypnoLight({enabled:false,cyclesPerMinute:6,opacity:.18});
    setCinematicPlan(null);setTimelineTextClips(null);setAudioStartSeconds(0);
    setPreviewSeekSeconds(0);setPreviewPlayhead(0);
    setCreationMode("catalog");setFreeVideoPlan(null);
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
    if(hypnoAudioBusy)return false;
    if(recording||preparing||preparingRef.current||jobRef.current||webCodecJobRef.current||photoPending)return false;
    if(phrasePending){
      setNotice(locale==="ru"?"Сначала утвердите фразы в разделе «Фразы поддержки».":locale==="es"?"Confirma las frases en el apartado «Frases de apoyo».":"Approve the selected phrases before creating a video.");
      // Keep the visitor here; never open Voice automatically after a blocked render.
      return false;
    }
    if(narrationInvalid){
      setNotice(locale==="ru"?"Озвучка не совпадает с фразами. Обновите её во вкладке «Идеи».":
        locale==="es"?"La voz ya no coincide con las frases. Actualízala en Ideas.":
        "The voice no longer matches your phrases. Update it in Ideas.");
      return false;
    }
    setIntroPlaying(false);
    if(!photoUrl&&!backgroundOnly){onPickPhoto();return false;}
    if(photoUrl&&!backgroundOnly&&!photoConsent){
      setNotice(supportUi.heroConsent);
      // Reveal the one original local photo consent panel, not a duplicate.
      if(activeWorkspace!=="video"){setActiveWorkspace("editor");setMontagePanel("settings");setMontageStyleSettingsOpen(true);setBasicPanelTab("photo");}
      window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
        const coverOptions=document.querySelector<HTMLDetailsElement>("[data-video-cover-options]");
        if(coverOptions)coverOptions.open=true;
        document.querySelector("[data-video-photo-consent]")?.scrollIntoView({behavior:"smooth",block:"center"});
      }));
      return false;
    }
    if(audioNeedsAttachment){
      setNotice(audioUi.needsAttach);
      setActiveWorkspace("editor");setMontagePanel("audio");setBasicPanelTab("music");
      window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
        document.querySelector("[data-video-audio-attach-panel]")?.scrollIntoView({behavior:"smooth",block:"center"})));
      return false;
    }
    if(uploadedAudio && !audioRights){
      setNotice(ui.audioRightsHelp);
      setActiveWorkspace("editor");setMontagePanel("audio");setBasicPanelTab("music");
      window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
        document.querySelector("[data-video-audio-rights]")?.scrollIntoView({behavior:"smooth",block:"center"})));
      return false;
    }
    if(!source){onPickPhoto();return false;}
    // A successful acknowledgement means that the source preflight was accepted.
    // Encoding/decoding can still fail asynchronously and is reported separately.
    if(!canGenerate){
      setNotice(locale==="ru"?"Видео ещё не готово: проверьте сцены, аудиодорожку, голос и кредиты.":
        locale==="es"?"El vídeo aún no está listo: comprueba escenas, audio, voz y créditos.":
        "Video is not ready: check the scenes, audio track, voice and credits.");
      return false;
    }
    setNotice("");
    void createVideo();
    return true;
  };

  // This is a local, non-persistent preview. A click also unlocks muted
  // same-origin footage on iOS before React's paint effect starts.
  const openAffirmationPreview = () => {
    if (recording || preparing) return;
    if(activeWorkspace==="phrases"||previewSeekSeconds>=duration){setPreviewSeekSeconds(0);setPreviewPlayhead(0);}
    // Ideas play is a visual demonstration, not an implicit audio attach/play.
    if(activeWorkspace!=="phrases"&&!previewPlaying)startMovieSound(attachedAudio,soundVolume,previewSeekSeconds>=duration?0:previewSeekSeconds);
    setPreviewPlaying(true);
    const film = premiumVideoRef.current;
    if (film && activeFilm) {
      film.muted = true;
      try {
        const playback=film.play();
        if(playback&&typeof playback.catch==="function")void playback.catch(()=>{
          if(aliveRef.current)setNotice(ui.videoUnavailable);
        });
      } catch { if(aliveRef.current)setNotice(ui.videoUnavailable); }
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
    const visualStyleId=quickStyleGradeIds[index];
    const film=quickStyleFilmFor(theme,index);
    if(!visualStyleId||!film){setNotice(ui.videoUnavailable);return;}
    if(cinematicPlan)recordBeforeEditorChange("montage-style");
    startMovieSound(attachedAudio,soundVolume,0);
    setIntroPlaying(false);
    // A visual style is a finishing layer, not a command to delete the
    // four verified MP4 shots, edited captions, transitions or audio.
    // If the procedural animation tab was used earlier, return to real
    // catalog footage before resuming the SAME shared Canvas preview.
    setCreationMode("catalog");setFreeVideoPlan(null);
    setActiveMontageStyleId(visualStyleId);
    setCinematicPlan(current=>current?{...current,styleId:visualStyleId}:null);
    setQuickStyleIndex(index);
    setPreviewSeekSeconds(0);setPreviewPlayhead(0);
    setBrightness(index===1||index===5?"bright":"soft");
    setSpeed(index===2||index===5?"dynamic":"slow");
    if(!cinematicPlan&&film.theme===theme){
      if(theme==="money")setMoneyScene(film.sceneId as MoneySceneId);
      else if(otherVideoScenes[theme as OtherTheme].some(scene=>scene.id===film.sceneId))
        setOtherScene(film.sceneId as LocalSceneId);
    }
    setPreviewFrameRevision(value=>value+1);
    setSuggestion("");
    // Existing sources load only after this explicit user gesture. The
    // native muted decoder retries on canplay for mobile WebKit.
    setPreviewPlaying(true);
  };
  // Keep the deep editor tabs usable on mobile WebKit during rapid clicks.
  // One active request controls the fragment and scroll; no delayed scroll
  // from the previous tab can steal the next pointer's click target.
  const quickNavTokenRef=useRef(0);
  const [quickNavTarget,setQuickNavTarget]=useState("");

  // Keep existing anchors working with the new single-editor navigation.
  useEffect(()=>{
    const reveal=()=>{
      const hash=window.location.hash.slice(1);
      const destination:Record<string,StudioWorkspace>={
        "video-audio":"editor","voice-studio":"effects","video-templates":"video",
        "video-hypnosis":"phrases","video-hypnocorrection-mobile":"effects",
        "guided-video-series":"practices","personal-meditation":"practices",
        "cinematic-director":"pro","video-settings":"editor",
        "video-director-chat":"video",
      };
      const tab=destination[hash];if(!tab)return;
      setActiveWorkspace(tab);
      if(hash==="video-director-chat"){
        // Messenger already validated its one-shot handoff. Reveal only that
        // requested review on arrival; regular Goals stays compact and guest.
        setVideoScenarioOpen(true);
        setDirectorChatOpen(true);
      }
      if(hash==="video-templates"){
        setVideoScenarioOpen(true);
        setFirstVideoAdvancedActivated(true);
      }
      if(hash==="video-audio"){setMontagePanel("audio");setBasicPanelTab("music");}
      if(hash==="video-settings"){setMontagePanel("settings");setMontageStyleSettingsOpen(true);}
      if(hash==="voice-studio"){setHypnoEntryGroup("audio");setVoiceStudioActivated(true);setQuickDetailedOpen(true);}
      if(hash==="video-audio"||hash==="voice-studio"||hash==="video-templates")
        setShowAdvancedVideo(true);
      setStudioMode(tab==="practices"?"therapy":"pump");
      const route=window.location.pathname+window.location.search+window.location.hash;
      window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
        if(route!==window.location.pathname+window.location.search+window.location.hash)return;
        if(hash==="video-audio"&&tab==="video")
          document.querySelector<HTMLDetailsElement>("[data-video-audio-details]")?.setAttribute("open","");
        if(hash==="video-settings")
          document.querySelector<HTMLDetailsElement>("[data-video-pro-advanced]")?.setAttribute("open","");
        // The third workspace opens at Wave; fifth audio/voice open their actual panes.
        const target=hash==="video-hypnocorrection-mobile"||hash==="voice-studio"
          ?document.getElementById("video-hypnocorrection-mobile")
          :document.getElementById(hash);
        target?.scrollIntoView({behavior:"instant" as ScrollBehavior,block:"start"});
      }));
    };
    reveal();window.addEventListener("hashchange",reveal);
    return()=>window.removeEventListener("hashchange",reveal);
  },[]);
  const openQuickDetailed=(anchor:string)=>{
    const tab:StudioWorkspace=anchor==="video-audio"?"editor":anchor==="voice-studio"?"effects":
      anchor==="video-hypnosis"?"phrases":
      anchor==="video-hypnocorrection-mobile"?"effects":
      anchor==="video-settings"?"editor":anchor==="cinematic-director"?"pro":"video";
    setActiveWorkspace(tab);
    if(anchor==="video-audio"){setMontagePanel("audio");setBasicPanelTab("music");setAudioLibraryOpen(true);}
    if(anchor==="video-settings"){setMontagePanel("settings");setMontageStyleSettingsOpen(true);}
    if(anchor==="video-templates"){
      // A visitor choosing All styles must see the original 4-shot catalogue.
      setVideoScenarioOpen(true);
      setFirstVideoAdvancedActivated(true);
    }
    if(anchor==="voice-studio"){setHypnoEntryGroup("audio");setVoiceStudioActivated(true);}
    // The compact Video surface hides the full audio gallery by default.
    // Make the *single* real audio editor visible before navigating to it.
    if(anchor==="video-audio"||anchor==="voice-studio"||anchor==="video-templates")
      setShowAdvancedVideo(true);
    setStudioMode("pump");
    setQuickDetailedOpen(true);
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
    const jump=()=>{
      if(!current())return;
      setLocation(false);
      if(anchor==="video-audio"&&tab==="video")
        document.querySelector<HTMLDetailsElement>("[data-video-audio-details]")?.setAttribute("open","");
      if(anchor==="video-settings")
        document.querySelector<HTMLDetailsElement>("[data-video-pro-advanced]")?.setAttribute("open","");
      document.getElementById(anchor)?.scrollIntoView({
        behavior:"instant" as ScrollBehavior,block:"nearest",
      });
    };
    window.requestAnimationFrame(()=>window.requestAnimationFrame(jump));
  };
  const applyFirstVideoDraft=(
    draft:{plan:CinematicStoryboard;wish:string;theme:VideoTheme;aspect:Aspect;durationSeconds:20|30|60},
    prefs:{motion:Speed;music:"none"|"harmony"|"meditation";caption:boolean},
  )=>{
    if(recording||preparing)return;
    clearUploadedAudio();
    setIntroPlaying(false);
    setTheme(draft.theme);setVideoCategory(draft.theme);
    const first=draft.plan.shots[0];
    if(draft.theme==="money")setMoneyScene(first?.theme==="money"
      ?first.sceneId as MoneySceneId:"golden-rain");
    else{
      setMoneyScene(null);
      setOtherScene(first?.theme===draft.theme
        ?first.sceneId as LocalSceneId:otherVideoScenes[draft.theme][0].id);
    }
    setBackgroundOnly(true);
    setAspect(draft.aspect);
    setDuration(draft.durationSeconds as (typeof durations)[number]);
    setSpeed(prefs.motion);
    setCreationMode("catalog");setCinematicPlan(draft.plan);
    setMusic(prefs.music);
    setAttachedAudio(prefs.music==="none"?null:{kind:"preset",id:prefs.music});
    setAudioAuto(false);setAudioDurationInvalid(false);setMusicWarning("");
    setCaptionMode(prefs.caption?"custom":"none");
    if(prefs.caption)setCustomCaption(captionFromWish(draft.wish));
    setPreviewPlaying(false);setSuggestion("");
  };
  // Ideas is a selection step. Its main CTA advances to Montage, never starts an export.
  const goToMontageFromIdeas = () => {
    quickNavTokenRef.current++;
    setActiveWorkspace("editor");
    // This explicit Ideas → Text shortcut must bypass Style. Top-level Montage still starts at Style.
    setMontagePanel("text");
    setStudioMode("pump");
    setIntroPlaying(false);
    setTherapyJumpRequested(false);
    setNotice("");
    // The Ideas page may be scrolled to its bottom CTA; show the third tab and player.
    window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
      document.getElementById("free-personal-video")?.scrollIntoView({behavior:"auto",block:"start"});
    }));
  };

  const createQuickVideo = () => {
    // The direct shortcut must preserve the approved paid-format gate.
    if(!freeVideoSelected){
      setNotice(locale==="ru"?"Для этого формата необходимо отдельное оформление. Выберите базовое видео для бесплатной генерации.":
        locale==="es"?"Este formato requiere un pedido aparte. Elige el vídeo básico para generarlo gratis.":
        "This format requires a separate order. Select Basic Video for a free export.");
      return false;
    }
    if(creditCatalog?.chargeRequired&&creditSession==="guest"&&guestFirstVideoUsed){
      setNotice(locale==="ru"?"Первое видео готово в PRO. Для следующего ролика войдите в аккаунт.":
        locale==="es"?"Tu primer vídeo está listo en PRO. Para crear otro, inicia sesión.":
        "Your first video is ready in PRO. Sign in to create another video.");
      setActiveWorkspace("pro");
      document.getElementById("personal-video-result")?.scrollIntoView({block:"start",behavior:"auto"});
      return false;
    }
    if(photoPending){
      setNotice(locale==="ru"?"Подготовка фото ещё не завершена.":locale==="es"?"La foto aún se está preparando.":"Photo preparation is still in progress.");
      return false;
    }
    if(phrasePending){
      setNotice(locale==="ru"?"Подтвердите изменённые фразы перед созданием видео.":locale==="es"?"Confirma las frases nuevas antes de crear el vídeo.":"Approve your edited phrases before creating the video.");
      return false;
    }
    if(narrationInvalid){
      setNotice(locale==="ru"?"Аффирмации или длительность изменились. Создайте голос заново.":
        locale==="es"?"Las afirmaciones cambiaron. Vuelve a generar la voz.":
        "Your affirmations or duration changed. Regenerate the voice track.");
      return false;
    }
    // Decode all four original MP4s from the trusted Create click, not a hidden preload.
    if(audioNeedsAttachment){
      setNotice(audioUi.needsAttach);
      // Audio controls are inside the collapsed advanced editor.
      // Reveal the real attach action instead of scrolling to hidden content.
      openQuickDetailed("video-audio");
      return false;
    }
    if(uploadedAudio&&!audioRights){
      setNotice(ui.audioRightsHelp);
      openQuickDetailed("video-audio");
      return false;
    }
    // createVideo now decodes the master on the SAME trusted Create gesture.
    return startFromHero();
  };

  const continueMontageOrGenerate=()=>{
    // Keep the approved five-step Montage journey independent from export,
    // authentication and credit charging: Style → Audio → Text → Montage PRO → Story.
    if(montagePanel==="effects"){
      setMontagePanel("audio");setBasicPanelTab("music");
    }else if(montagePanel==="audio"){
      setMontagePanel("text");
    }else if(montagePanel==="text"){
      setMontagePanel("promo");
    }else if(montagePanel==="promo"||montagePanel==="settings"){
      setMontagePanel("concept");
    }else{
      // Only after Story does Next hand off to the real Hypno effects workspace.
      setHypnoEntryGroup("effects");setActiveWorkspace("effects");
    }
    setNotice("");setPreviewPlaying(false);
    window.requestAnimationFrame(()=>
      document.querySelector("[data-video-montage-tools]")?.scrollIntoView({block:"start",behavior:"smooth"}));
  };

  // First mobile step is only the short goal, category and optional request.
  // The user then moves to Ideas; the actual scene catalogue is an optional
  // visible action from Montage, never a hidden first-screen dialog.
  const continueToIdeas = () => {
    // Match the one real recipient kind to a verified video plan before Ideas.
    // No export, billing or consent prompt can be triggered by this action.
    if(goalContinueRef.current?.()===false)return;
    // The visitor can immediately tap Montage after Ideas. Invalidate the
    // delayed Ideas scroll when another real workspace is requested; Safari
    // must never slide the pointer target out from under the next click.
    const navigationToken=++quickNavTokenRef.current;
    setVideoScenarioOpen(false);
    setActiveWorkspace("phrases");
    setStudioMode("pump");
    window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
      if(navigationToken!==quickNavTokenRef.current)return;
      document.querySelector("[data-video-quick-phrases]")?.scrollIntoView({
        behavior:"instant" as ScrollBehavior,block:"start",
      });
    }));
  };
  // Generate only on this explicit click. Recipient-specific footage is
  // applied first; React commits it before we use the real local encoder.
  // A current callback keeps that encoder inside the trusted iOS gesture.
  const freshGoalCreateRef=useRef<()=>boolean>(()=>false);
  useLayoutEffect(()=>{freshGoalCreateRef.current=createQuickVideo;});
  const generateFromGoal=()=>{
    if(!studioHydrated||recording||preparing)return false;
    let goalValid=true;
    flushSync(()=>{goalValid=goalContinueRef.current?.()!==false;});
    if(!goalValid)return false;
    return freshGoalCreateRef.current();
  };

  const openVideoScenarioStep = () => {
    setIntroPlaying(false);setIntroDismissed(true);
    setVideoScenarioOpen(true);
    setShowAdvancedVideo(true);
    setFirstVideoAdvancedActivated(true);
    setActiveWorkspace("video");
    window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
      document.querySelector("[data-free-film-compilation-catalog]")?.scrollIntoView({
        behavior:"smooth",block:"start",
      })));
  };
  const deepAudioPane = (
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
                {Object.entries(audioUi.types).filter(([id])=>id==="all"||id==="melody").map(([id,name])=>
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
            <strong>{filteredAudio.length} {audioKind==="melody"?audioUi.melodyCount:audioUi.count}</strong>
            <span>{audioKind==="melody"?audioUi.loop:audioUi.types[audioKind as keyof typeof audioUi.types]}</span>
          </div>
          {filteredAudio.length?<div className={videoStyles.audioTrackList} data-video-audio-tracks>
            {visibleAudio.map((track,index)=><div className={videoStyles.audioTrackRow}
              key={track.id} data-audio-id={track.id} data-audio-kind={track.kind}>
              <button type="button" className={videoStyles.audioTrackSelect}
                data-video-music={track.id} aria-pressed={!uploadedAudio&&music===track.id}
                aria-label={( !uploadedAudio&&music===track.id?audioUi.picked:audioUi.pick)+" — "+track.name[locale]}
                onClick={()=>{setAudioAuto(false);chooseMusic(track.id as AmbientMusic);}}>
                <span className={videoStyles.audioTileGlyph} aria-hidden="true"/>
                <span className={videoStyles.audioPlaySlot} aria-hidden="true"/>
                <span className={videoStyles.audioTileText}>
                  <strong>{track.name[locale]}{index===0&&audioSort==="best"?<Sparkles size={14} aria-label={audioUi.suggested}/>:null}</strong>
                  <small>{curatedAudioTracks.some(item=>item.id===track.id)?(locale==="ru"?"Реальная запись · ":locale==="es"?"Grabación real · ":"Real recording · "):null}{track.detail[locale]}</small>
                  <span className={videoStyles.audioRowMeta}>
                    <em>{audioUi.types.melody}</em>
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
            <button type="button" onClick={()=>{setAudioKind("melody");setAudioMood("all");setAudioPace("all");setAudioSearch("");}}>
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
            {uploadedAudio ? <div data-video-audio-storyboard
              style={{display:"grid",gap:10,padding:"12px 0"}}>
              <strong>{locale==="ru"?"Аудио → текст → визуальный сценарий":
                locale==="es"?"Audio → texto → escenas":"Audio → transcript → visuals"}</strong>
              <small data-video-audio-stt-notice>
                {locale==="ru"?"Нажатие «Расшифровать» один раз отправит запись внешнему сервису распознавания. Сайт не сохраняет аудио или текст.":
                  locale==="es"?"Al pulsar Transcribir, el audio se enviará una vez al servicio externo. El sitio no guarda audio ni texto.":
                    "Pressing Transcribe sends the audio once to an external speech recognition service. This site stores neither audio nor text."}
              </small>
              <button type="button" className={videoStyles.audioMicButton}
                data-video-audio-transcribe
                disabled={!studioHydrated||sttBusy||recording||preparing||micRecording}
                onClick={()=>void transcribeVideoVoice()}>
                <AudioLines size={16} aria-hidden="true"/>
                {sttBusy?(locale==="ru"?"Расшифровываем…":locale==="es"?"Transcribiendo…":"Transcribing…"):
                  (locale==="ru"?"Расшифровать с таймкодами":
                    locale==="es"?"Transcribir con tiempos":"Transcribe with timecodes")}
              </button>
              {sttError?<p role="alert" data-video-audio-stt-error>{sttError}</p>:null}
              {voiceTranscript?<div data-video-audio-timed-transcript>
                <p>{locale==="ru"?(voiceTranscript.timingSource==="estimated"?"Текст распознан с примерными интервалами":"Текст распознан по временны́м фрагментам"):
                  locale==="es"?(voiceTranscript.timingSource==="estimated"?"Texto con tiempos aproximados":"Texto y segmentos temporales verificados"):
                  voiceTranscript.timingSource==="estimated"?"Transcript with approximate timestamps":"Timed text segments verified"}
                  {" · "}{voiceTranscript.durationSeconds.toFixed(1)} s</p>
                <p data-video-audio-transcribed-text style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{voiceTranscript.text}</p>
                <details><summary>{locale==="ru"?"Посмотреть расшифровку":
                  locale==="es"?"Ver transcripción":"Review transcript"}</summary>
                  <ol>{voiceTranscript.segments.map((segment,index)=>
                    <li key={index}><small>{segment.startSeconds.toFixed(1)}–
                      {segment.endSeconds.toFixed(1)} s</small>{" "}{segment.text}</li>)}</ol>
                </details>
                <button type="button" className={videoStyles.audioMicButton}
                  data-video-audio-visual-plan
                  disabled={!audioRights||recording||preparing}
                  onClick={()=>applyTranscriptVideo()}>
                  <Film size={16} aria-hidden="true"/>
                  {locale==="ru"?"Подобрать видеоряд по моментам речи":
                    locale==="es"?"Elegir vídeos según la voz":"Match footage to speech moments"}
                </button>
                {!audioRights?<small>{ui.audioRightsHelp}</small>:null}
              </div>:null}
              {voiceVisualPlan?.canExport?<div data-video-audio-shot-plan>
                <strong>{locale==="ru"?"Монтажный промпт по времени":
                  locale==="es"?"Guion visual con tiempos":"Timed visual storyboard"}</strong>
                <ol>{voiceVisualPlan.shots.map((shot,index)=>
                  <li key={index}>
                    <small>{shot.startSeconds}–{shot.endSeconds} s</small>{" "}
                    {freeFilmClipLabel(shot.sceneId)}
                    {shot.concepts.length?" · "+shot.concepts.join(", "):""}
                    {shot.needsReview?" ⚠":""}
                    {shot.spokenText?<small> · {shot.spokenText.slice(0,100)}</small>:null}
                  </li>)}</ol>
                {voiceVisualPlan.needsReview?<p role="status">{
                  locale==="ru"?"Часть образов не найдена точно. Проверьте предложенные кадры.":
                    locale==="es"?"Algunas imágenes son aproximadas. Revisa los clips.":
                      "Some visuals are approximate. Review the suggested clips."}</p>:null}
              </div>:null}
            </div>:null}
          </div>

          <div className={videoStyles.audioPlayerDock} data-video-audio-dock>
          <div className={videoStyles.audioNowPlaying} data-video-audio-now>
            <span>{audioUi.now}</span>
            <strong>{uploadedAudio?uploadedAudio.file.name:selectedAudio?.name[locale]||ui.noMusic}</strong>
            {reviewedRecording&&!uploadedAudio ? <small data-reviewed-music-license>
              {locale==="ru"?"Запись по лицензии":locale==="es"?"Grabación licenciada":"Licensed recording"}: {reviewedRecording.rights.license} · {reviewedRecording.rights.creator} / {reviewedRecording.rights.performer}
              {" · "}<a href={reviewedRecording.rights.sourcePage} target="_blank" rel="noopener noreferrer">
                {locale==="ru"?"Источник":locale==="es"?"Fuente":"Source"}
              </a>{" · "}<a href={reviewedRecording.rights.licenseUrl} target="_blank" rel="noopener noreferrer">
                {locale==="ru"?"Лицензия":locale==="es"?"Licencia":"License"}
              </a>{" · "}{locale==="ru"?"Запись сокращена и нормализована по громкости":locale==="es"?"Grabación acortada y normalizada en volumen":"Recording shortened and loudness-normalized"}
            </small> : null}
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
          {previewAudioUrl && !audioPlaybackError ? <audio key={previewAudioUrl} ref={setAudioPreviewNode}
            src={previewAudioUrl} controls preload="metadata" loop={!uploadedAudio}
            data-video-audio-player data-video-audio-source={uploadedAudio?"user-file":"site-preset"}
            aria-label={uploadedAudio?.file.name||selectedAudio?.name[locale]||ui.music}
            onPlay={event=>{
              const player=event.currentTarget;
              if(player!==audioPreviewRef.current||player.paused){player.pause();return;}
              const previous=activeAudioPreviewRef.current;
              if(previous&&previous!==player)previous.pause();
              activeAudioPreviewRef.current=player;
              // Native controls also honor exclusive audition/film playback.
              ensureAuditionOutput(player);
              stopMovieSound();setPreviewPlaying(false);
              if(!restoreAudioSessionRef.current)restoreAudioSessionRef.current=acquirePlaybackSession();
              setSoundPreview(true);setMusicWarning("");
            }}
            onPause={event=>{
              if(activeAudioPreviewRef.current!==event.currentTarget)return;
              activeAudioPreviewRef.current=null;
              restoreAudioSessionRef.current?.();restoreAudioSessionRef.current=null;setSoundPreview(false);
            }}
            onEnded={event=>{
              if(activeAudioPreviewRef.current!==event.currentTarget)return;
              activeAudioPreviewRef.current=null;
              restoreAudioSessionRef.current?.();restoreAudioSessionRef.current=null;setSoundPreview(false);
            }}
            onError={event=>{
              if(event.currentTarget!==audioPreviewRef.current)return;
              activeAudioPreviewRef.current=null;
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
  );
  const hypnoVoiceEditor = (
      <section className={videoStyles.phraseVoiceSection} data-hypno-voice>
        <div className={videoStyles.phraseAudioHeading}>
          <span><Mic size={23} aria-hidden="true"/></span>
          <div><h3>{activeWorkspace==="phrases"&&ideasVoiceMode==="my-voice"&&ideasVoiceAdvancedOpen?
              (locale==="ru"?"Мой голос для видео":locale==="es"?"Mi voz para el vídeo":"My voice for your video"):
              activeWorkspace==="phrases"&&ideasVoiceAdvancedOpen?
              (locale==="ru"?"Голос для вашего видео":locale==="es"?"Voz para tu vídeo":"Voice for your video"):
              (locale==="ru"?"Голос для озвучки фраз":locale==="es"?"Voz para las frases":"Voice for phrases")}</h3>
            <p>{activeWorkspace==="phrases"&&ideasVoiceMode==="my-voice"&&ideasVoiceAdvancedOpen?
              (locale==="ru"?"Загрузите или запишите собственный голос.":locale==="es"?"Sube o graba tu propia voz.":"Upload or record your own voice."):
              activeWorkspace==="phrases"&&ideasVoiceAdvancedOpen?
              (locale==="ru"?"Выберите фразу и голос для её озвучивания.":locale==="es"?"Elige una frase y una voz para narrarla.":"Choose a phrase and a voice to narrate it."):
              (locale==="ru"?"Озвучка выбранных фраз":locale==="es"?"Narración de las frases elegidas":"Narration of your chosen phrases")}</p></div>
        </div>
        {phrasePending&&<p className={videoStyles.phraseVoiceNotice} role="status" data-video-voice-approval-required>
          {locale==="ru"?"Подтвердите новые фразы выше, прежде чем создавать голос.":locale==="es"?"Confirma las frases nuevas arriba antes de crear la voz.":"Approve the new phrases above before generating their voice."}
        </p>}
        <MandalaAffirmationVoice locale={locale} lines={affirmationLines}
          enabled={affirmations.enabled} durationSeconds={duration}
          disabled={recording||preparing} approvalPending={phrasePending}
          initialPreferences={voicePreferences} onAttach={attachGeneratedAffirmationAudio}
          onInvalidate={()=>{
            const staleHypnoTrack=Boolean(hypnoWhisperEnabled||hypnoBinauralEnabled||
              (attachedAudio?.kind==="file"&&attachedAudio.narration));
            setHypnoSpeechSource(null);setHypnoSpeechText("");setHypnoWhisperEnabled(false);setHypnoBinauralEnabled(false);
            previousHypnoAudioRef.current=null;
            if(staleHypnoTrack){clearUploadedAudio();setAttachedAudio(null);}
          }}
          compact={activeWorkspace==="phrases"&&ideasVoiceAdvancedOpen}
          ownVoiceOnly={activeWorkspace==="phrases"&&ideasVoiceMode==="my-voice"&&ideasVoiceAdvancedOpen}
          extraActions={<>
        <div className={videoStyles.ideasVoiceActions} data-video-ideas-voice-actions>
          <label className={videoStyles.ideasVoiceUpload}>
            <Paperclip size={19} aria-hidden="true"/>
            {locale==="ru"?"Загрузить мой голос":locale==="es"?"Subir mi voz":"Upload my voice"}
            <input type="file" data-video-ideas-own-upload
              accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,audio/webm,.mp3,.m4a,.wav,.aac,.webm"
              disabled={recording||preparing}
              onChange={event=>{
                const file=event.currentTarget.files?.[0];
                if(file&&chooseAudioFile(file))setPhraseAudioExpanded(true);
                event.currentTarget.value="";
              }}/>
          </label>
        </div>
        {uploadedAudio?<p className={videoStyles.ideasVoiceUploadNotice} data-video-ideas-own-notice role="status">
          {locale==="ru"?"Файл выбран. Подтвердите права и прикрепите дорожку ниже.":
            locale==="es"?"Archivo elegido. Confirma los derechos y añade la pista abajo.":
              "File selected. Confirm rights and attach the track below."}
        </p>:null}
          </>}
          onGenerating={setVoiceGenerating} onPreferencesChange={setVoicePreferences}
           onDetachLocal={file=>{
             if(uploadedAudioRef.current?.file===file)clearUploadedAudio();
             setAttachedAudio(current=>current?.kind==="file"&&current.file===file?null:current);
           }}/>
        {narrationInvalid?<p className={videoStyles.quickStatus} role="status" data-video-narration-stale>
          {locale==="ru"?"Фразы или длительность изменились — создайте аудиодорожку заново.":
            locale==="es"?"Las frases o la duración cambiaron. Vuelve a generar el audio.":
            "Phrases or duration changed — regenerate the voice before exporting."}
        </p>:null}
        {activeWorkspace!=="phrases"?<p className={videoStyles.phraseVoiceNotice}>
          {locale==="ru"?"Своя запись — дополнительный вариант. Видео сохраняет одну итоговую звуковую дорожку.":
            locale==="es"?"Tu grabación es opcional; el vídeo exporta una sola pista final.":
            "Recording your own voice is optional; the video exports one final sound track."}
        </p>:null}
        <button type="button" className={videoStyles.phraseVoiceAction} disabled={recording||preparing}
          onClick={()=>{setPhraseAudioExpanded(true);window.requestAnimationFrame(()=>
            document.getElementById("phrase-audio-settings")?.scrollIntoView({block:"nearest",behavior:"smooth"}));}}>
          <AudioLines size={20} aria-hidden="true"/>
          {locale==="ru"?"Записать или загрузить свой голос":locale==="es"?"Grabar o subir mi voz":"Record or upload my voice"}
          <ChevronDown size={18} aria-hidden="true"/>
        </button>
        {/* Cloud narration is now in Hypno → Audio, not Montage Music. */}
        <details id="voice-studio" className={[videoStyles.extraControls,videoStyles.basicVoicePane].join(" ")}
          data-video-voice-studio open={voiceStudioActivated}
          onToggle={event=>setVoiceStudioActivated(event.currentTarget.open)}>
          <summary><AudioLines size={18} aria-hidden="true"/>
            {locale==="ru"?"Озвучка фраз · голоса RU/EN":
              locale==="es"?"Narración · voces RU/EN":"Voice narration · RU/EN voices"}
          </summary>
          {voiceStudioActivated?<MandalaCloudVoiceStudio locale={locale}
            sourceText={currentAffirmationSpeech} sourceIsPublic
            onAudioReady={attachMeditationNarration}
            onAudioInvalidated={()=>setAttachedAudio(current=>
              current?.kind==="file"&&current.nonLoop?null:current)}/>:null}
        </details>
      </section>
  );
  const advancedPhraseEditorVisible=activeWorkspace==="phrases" && phraseAudioExpanded;
  const deepHypnoPane = (
      <section className={videoStyles.hypnosisSection} id="video-hypnosis" data-video-hypnosis-section aria-labelledby="video-hypnosis-heading">
        <div className={videoStyles.blockHeading}><h3 id="video-hypnosis-heading">{layout.hypnosisTitle}</h3>
          <p>{layout.hypnosisHelp}</p></div>
      <MandalaHypnoCompact locale={locale} theme={theme} settings={affirmations} requestText={wish}
        autoExpandIdea={activeWorkspace==="phrases"&&ideasSubtab==="personalization"&&ideasVoiceAdvancedOpen}
        onPendingChange={setPhrasePending} externalPhraseDraft={catalogPhraseDraft}
        onExternalPhraseClear={()=>setCatalogPhraseDraft(null)}
        onChange={setAffirmations} disabled={recording||preparing}
        scenes={hypnoScenes} activeScene={theme==="money"?(moneyScene||"golden-rain"):otherScene}
        activePoster={activeFilm?.poster||null} onSelectTheme={selectCategory}
        onSelectScene={id=>{
          setCinematicPlan(null);
          if(theme==="money")setMoneyScene(id as MoneySceneId);
          else setOtherScene(id as LocalSceneId);
          setPreviewPlaying(false);
        }} onPreview={openAffirmationPreview} onCreate={startFromHero}
         onApply={()=>{
           setActiveWorkspace("editor");
           setNotice(locale==="ru"?"Фразы применены к видеопроекту. Проверьте монтаж перед созданием.":locale==="es"
             ?"Frases aplicadas al proyecto. Revisa el montaje antes de crear.":"Phrases applied. Review the edit before creating.");
           window.requestAnimationFrame(()=>document.querySelector("[data-video-basic-editor]")?.scrollIntoView({block:"start",behavior:"smooth"}));
         }}>
      <details className={videoStyles.phraseAudioSettings} data-video-phrase-catalog-details
        onToggle={event=>{if(event.currentTarget.open)setPhraseCatalogActivated(true);}}>
        <summary>{locale==="ru"?"Каталог фраз по целям и сценариям":
          locale==="es"?"Catálogo de frases por objetivos e historias":
          "Phrase catalog by goals and stories"}<ChevronDown size={18} aria-hidden="true"/></summary>
        {phraseCatalogActivated ? <MandalaPhraseCatalog locale={locale} theme={theme} wish={wish}
          disabled={recording||preparing} selectedPhrase={catalogPhraseDraft??affirmations.custom}
          onPhraseChoose={phrase=>{
            // The catalog must not silently change a previously approved movie
            // or invalidate its generated voice before explicit approval.
            setCatalogPhraseDraft(phrase);
          }}
          onOpenAudio={scenarioId=>{
            setGoalTreeAudioScenarioId(scenarioId);
            // Auto-assigned film music must not remain attached after choosing
            // another story; keep manually selected recordings and silence.
            if(audioAuto&&!uploadedAudio&&!micRecording){
              setAttachedAudio(null);
              setSamplePreviewId(null);
            }
            setPhraseAudioExpanded(true);
            window.requestAnimationFrame(()=>document.getElementById("phrase-audio-settings")
              ?.scrollIntoView({block:"nearest",behavior:"smooth"}));
          }}/> : null}
      </details>
      {activeWorkspace==="phrases" ? hypnoVoiceEditor : null}
      <section className={videoStyles.phraseMusicSection} data-hypno-music data-personalized-music-match>
        <div className={videoStyles.phraseAudioHeading}>
          <span><Music2 size={23} aria-hidden="true"/></span>
          <div><h3>{locale==="ru"?"4. Подобрать музыку":locale==="es"?"4. Elegir música":"4. Choose music"}</h3>
            <p data-phrase-music-guidance={voiceBedMode?"voice":"melody"}>
              {voiceBedMode
                ?locale==="ru"?"Голос сохранён. Фон к голосу настраивается выше; неподтверждённые записи не предлагаются."
                :locale==="es"?"La voz está guardada. Ajusta el fondo arriba; no ofrecemos pistas sin verificar."
                :"Your voice stays attached. Adjust its background above; no unverified music is offered."
                :locale==="ru"?"Три проверенные записи под вашу цель: прослушайте и выберите одну для видео."
                :locale==="es"?"Tres grabaciones verificadas para tu objetivo. Escucha y elige una."
                :"Three verified recordings matched to your goal. Listen and choose one."}
            </p></div>
        </div>
        <div className={videoStyles.phraseMusicList} role="radiogroup"
          aria-label={locale==="ru"?"Фоновая музыка":locale==="es"?"Música de fondo":"Background music"}>
          {featuredMelodies.slice(0,3).map(track=>{
            const id=track.id as PresetId;
            const checked=attachedAudio?.kind==="preset"&&attachedAudio.id===id ||
              attachedAudio?.kind==="file"&&musicBed.id===id;
            const listening=samplePreviewId===id&&soundPreview;
            return <div className={videoStyles.phraseMusicItem} key={id} data-phrase-music-track={id}>
              <button type="button" className={videoStyles.phraseMusicChoice} data-phrase-music-attach={id}
                role="radio" aria-checked={checked} disabled={recording||preparing||micRecording}
                onClick={()=>choosePersonalMusic(id)}>
                <span aria-hidden="true">{checked?<Check size={21}/>:<Music2 size={21}/>}</span>
                <span>{track.name[locale]}</span>
              </button>
              <button type="button" className={videoStyles.phraseMusicPlay}
                data-phrase-music-play={id} aria-pressed={listening}
                aria-label={(listening?ui.soundStop:ui.soundPreview)+" — "+track.name[locale]}
                disabled={recording||preparing||micRecording}
                onClick={()=>playQuickTrack(id)}>{listening
                  ?<Pause size={20} aria-hidden="true"/>:<Play size={20} aria-hidden="true"/>}</button>
            </div>;
          })}
        </div>
        <p className={videoStyles.phraseMusicStatus} aria-live="polite">
          {attachedAudio?.kind==="file"&&attachedAudio.narration
            ?attachedAudio.bed!=="none"
              ?locale==="ru"?"Музыка смешана с голосом":locale==="es"?"Música mezclada con la voz":"Background music mixed with narration"
              :locale==="ru"?"Для фоновой музыки с голосом выберите «Фон» в разделе выше.":locale==="es"?"Para combinar voz y música, elige «Fondo» arriba.":"Choose Background in the voice editor above to mix music with narration."
            :attachedPresetIds.length?locale==="ru"?"Музыка добавлена к видео":locale==="es"?"Música añadida al vídeo":"Music attached to video"
            :locale==="ru"?"Музыка не выбрана":locale==="es"?"No has elegido música":"No music selected"}
        </p>
      </section>
      <details id="phrase-audio-settings" className={videoStyles.phraseAudioSettings}
        open={phraseAudioExpanded} onToggle={event=>setPhraseAudioExpanded(event.currentTarget.open)}>
        <summary>{locale==="ru"?"Запись голоса и расширенные аудионастройки":locale==="es"?"Grabación de voz y audio avanzado":"Voice recording and advanced audio"}<ChevronDown size={18} aria-hidden="true"/></summary>
        {activeWorkspace==="phrases" ? deepAudioPane : null}
      </details>
      </MandalaHypnoCompact>
      <details className={videoStyles.hypnoOptionalWish} data-video-wish-disclosure>
        <summary>{ui.wishTitle}</summary>
      <section className={videoStyles.wishPanel} data-video-intent aria-labelledby="video-wish-heading">
        <label id="video-wish-heading" htmlFor="personal-video-wish">{ui.wishTitle}</label>
        <textarea id="personal-video-wish" data-video-wish rows={2} maxLength={160}
          value={wish} placeholder={ui.wishPlaceholder} disabled={recording||preparing}
          onChange={event=>{setWish(event.currentTarget.value.slice(0,160));setSuggestion("");setCinematicPlan(null);}} />
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
  );
  const deepVideoPane = (
      <section id="video-settings" className={videoStyles.settings} aria-labelledby="video-settings-heading">
        <div className={videoStyles.sectionHeading}>
          <h3 id="video-settings-heading">{ui.stepSettings}</h3>
          <button type="button" data-video-reset-settings disabled={recording||preparing}
            onClick={resetVideoSettings}>{supportUi.reset} ↻</button>
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


      </section>
  );
  const deepCharacterPhotoPane = (
          <details className={videoStyles.previewCoverOptions} data-video-cover-options
            open={activeWorkspace==="editor"&&basicPanelTab==="photo"?true:undefined}>
            <summary><Camera size={18} aria-hidden="true"/>
              {approved.preview}<ChevronDown size={18} aria-hidden="true"/></summary>
        <section className={videoStyles.quickSection} data-video-quick-section="7"
          aria-labelledby="quick-image-title">
          <div className={videoStyles.quickSectionHeading}>
            <div><h3 id="quick-image-title"><Camera size={20} aria-hidden="true"/>{approved.preview}</h3>
              <p>{approved.covers}</p></div>
            <label className={videoStyles.quickEdit+" "+videoStyles.nativePhotoControl} aria-disabled={recording||preparing}>
              <Camera size={15} aria-hidden="true"/>{quick.pick}
              <NativePhotoInput label={photoUrl ? ui.replace : quick.pick} disabled={recording||preparing} onPhotoFileSelected={selectNativePhoto}/>
            </label>
          </div>

          <div className={videoStyles.quickImageRail}>
            <label className={videoStyles.quickImageUpload+" "+videoStyles.nativePhotoControl} data-video-quick-photo
              aria-disabled={recording||preparing}>
              {photoUrl ? <>
                {/* Only user-owned local Blob, never submitted to AI or CRM. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="" draggable={false}/>
              </> : <><Camera size={24} aria-hidden="true"/><span>{quick.pick}</span></>}
              <NativePhotoInput label={photoUrl ? ui.replace : quick.pick} disabled={recording||preparing} onPhotoFileSelected={selectNativePhoto}/>
            </label>
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
          {photoPending?<p role="status" data-video-photo-pending className={videoStyles.warning}>{locale==="ru"?"Подготавливаем фото на устройстве…":locale==="es"?"Preparando la foto en tu dispositivo…":"Preparing photo on this device…"}</p>:null}
          {photoError?<p role="alert" className={videoStyles.warning}>{ui.photoError}</p>:null}
        </section>

          </details>
  );

  const deepVideoDirectorPane = (
      <MandalaCinematicDirector locale={locale} theme={theme} intentText={wish}
        onIntentTextChange={value=>{setWish(value);setSuggestion("");setCinematicPlan(null);}}
        onMusicPreference={choice=>{
          if(uploadedAudio)return;
          const mood=choice==="calm"?"calm":choice==="energetic"?"uplift":"all";
          const track=recommendCuratedAudio({theme:audioTheme,kind:"melody",mood})[0];
          setAudioAuto(false);setMusic((track?.id as AmbientMusic)||"none");
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
  );

  const goRecipientAudioToMontage=()=>{
    if(!audioPlanApplied||!voiceVisualPlan?.canExport||!audioRights)return;
    setActiveWorkspace("editor");setMontagePanel("effects");setShowAdvancedVideo(true);setVideoScenarioOpen(true);
    setStudioMode("pump");
  };
  function goRecipientAudioToManualMontage(){
    const entry=uploadedAudioRef.current;
    const suppliedText=manualTranscript.trim().slice(0,800);
    if(!entry||!audioRights||sttBusy||recording||preparing)return;
    // Local-only recovery: no fabricated transcript/timestamps or provider call.
    // Keep the original authorized recording and never loop it.
    setAttachedAudio({kind:"file",file:entry.file,id:entry.url,nonLoop:true});
    if(suppliedText)setWish(suppliedText);
    setAudioAuto(false);setMusic("none");
    setActiveWorkspace("editor");setMontagePanel("audio");
    setShowAdvancedVideo(true);setVideoScenarioOpen(true);setStudioMode("pump");
    setNotice(locale==="ru"
      ?(suppliedText?"Текст перенесён в описание. Таймкоды неизвестны: выберите кадры вручную.":"Запись добавлена в монтаж без расшифровки. Выберите видеоряд вручную.")
      :locale==="es"
        ?"Audio añadido sin transcripción. Elige las escenas manualmente."
        :"Audio attached without transcription. Choose footage manually.");
    window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
      const details=document.querySelector<HTMLDetailsElement>("[data-video-audio-details]");
      if(details)details.open=true;
      document.querySelector("[data-video-audio-storyboard]")?.scrollIntoView({
        block:"nearest",behavior:"smooth"
      });
    }));
  }
  // Existing recorder, STT API, shot matcher and Canvas; only a new Goal entry UI.
  const recipientAudioPanel=<section className={videoStyles.recipientAudioSteps} data-video-recipient-audio-panel>
    <strong>{locale==="ru"?"Создайте видео из вашей аудиозаписи":locale==="es"?"Crear vídeo desde tu audio":"Create visuals from your audio"}</strong>
    <div className={videoStyles.recipientAudioStep}>
      <b>1</b><div><strong>{locale==="ru"?"Загрузите аудио":locale==="es"?"Subir audio":"Upload audio"}</strong>
      <small>{locale==="ru"?"Подкаст, сообщение, медитация · до 4 МБ и 59 секунд":
        locale==="es"?"Voz, podcast o meditación · hasta 4 MB y 59 s":
        "Voice, podcast or meditation · up to 4 MB and 59 seconds"}</small>
      <div className={videoStyles.recipientAudioActions}>
        <label htmlFor="recipient-audio-upload"><Paperclip size={17}/>{locale==="ru"?"Выбрать файл":locale==="es"?"Elegir archivo":"Choose file"}</label>
        <input id="recipient-audio-upload" type="file" data-video-recipient-audio-upload
          accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,audio/webm,.mp3,.m4a,.wav,.aac,.mp4,.webm"
          disabled={sttBusy||recording||preparing||micRecording}
          onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value="";
            if(!file)return;
            if(file.size>4*1024*1024){setSttError(locale==="ru"?"Нужен файл до 4 МБ.":locale==="es"?"Archivo máximo 4 MB.":"Maximum 4 MB audio.");return;}
            if(!chooseAudioFile(file))setSttError(locale==="ru"?"Аудиоформат не поддерживается.":
              locale==="es"?"Formato de audio no compatible.":"Unsupported audio format.");}}/>
        <button type="button" data-video-recipient-audio-record disabled={sttBusy||recording||preparing}
          aria-pressed={micRecording} onClick={()=>{if(micRecording)stopMicRecording();else void startMicRecording();}}>
          <Mic size={17}/>{micRecording?(locale==="ru"?"Стоп":locale==="es"?"Parar":"Stop"):
            locale==="ru"?"Записать и распознать":locale==="es"?"Grabar y transcribir":"Record & transcribe"}</button>
      </div>
      {uploadedAudio?<div className={videoStyles.recipientAudioSelected}>
        <strong>{uploadedAudio.file.name}</strong><button type="button" disabled={sttBusy} onClick={clearUploadedAudio}>×</button>
        <small>{locale==="ru"?"Запись готова. Прослушивание доступно в исходном аудиоредакторе.":
          locale==="es"?"Audio listo. Puedes escucharlo en el editor de audio.":
          "Audio ready. Listen to it in the original audio editor."}</small></div>:null}
      <small data-video-recipient-audio-rights-notice>
        {locale==="ru"?"Используйте только свою запись или аудио, на которое у вас есть разрешение.":
          locale==="es"?"Usa solo tu grabación o audio para el que tienes permiso.":
            "Use only your own recording or audio you have permission to use."}
      </small>
      </div>
    </div>
    <div className={videoStyles.recipientAudioStep}>
      <b>2</b><div><strong>{locale==="ru"?"Расшифровка и анализ":locale==="es"?"Transcripción":"Transcribe and analyze"}</strong>
      <small data-video-recipient-audio-stt-notice>
        {locale==="ru"?"При записи браузер попробует распознать речь сразу (его служба может обработать голос). Для файла сначала используется локальный режим, а по нажатию «Расшифровать» и при недоступности локального режима — существующий бесплатный внешний сервис. Сайт не сохраняет запись и текст.":
          locale==="es"?"Al grabar, el navegador intentará reconocer tu voz (puede utilizar su servicio de voz). Para archivos, primero se prueba el modo local, luego el servicio gratuito autorizado. No guardamos audio ni texto.":
            "Recording tries browser speech recognition (your browser may process microphone audio externally). Uploaded files use verified on-device recognition first, then the existing free speech service after your Transcribe click. This site stores neither audio nor text."}
      </small>
      <button type="button" data-video-recipient-audio-transcribe
        disabled={!uploadedAudio||!studioHydrated||!audioRights||sttBusy||recording||preparing||micRecording}
        onClick={()=>void transcribeVideoVoice()}><AudioLines size={17}/>
        {sttBusy?(locale==="ru"?"Расшифровываем…":locale==="es"?"Transcribiendo…":"Transcribing…"):
          locale==="ru"?"Расшифровать":locale==="es"?"Transcribir":"Transcribe"}</button>
      {sttError?<p role="alert" className={videoStyles.warning}
        data-video-recipient-audio-error>{sttError}</p>:null}
      {uploadedAudio&&!voiceTranscript&&sttError?<label data-video-recipient-audio-manual-text
        style={{display:"grid",gap:6,marginTop:10}}>
        <small>{locale==="ru"?"Текст вручную — можно использовать микрофон на клавиатуре iPhone. Это не расшифровка самого файла и без точных таймкодов.":
          locale==="es"?"Dicta con el micrófono del teclado o escribe; no son tiempos del archivo.":
          "Use your phone keyboard's microphone or type the words; this does not transcribe the file or create verified timestamps."}</small>
        <textarea rows={3} maxLength={800} value={manualTranscript}
          onChange={event=>setManualTranscript(event.currentTarget.value)}
          placeholder={locale==="ru"?"Текст вашей аудиозаписи":locale==="es"?"Texto de tu grabación":"Words from your audio"}
          aria-label={locale==="ru"?"Текст записи":locale==="es"?"Texto del audio":"Audio text"}/>
      </label>:null}
      {uploadedAudio&&!voiceTranscript?<button type="button" data-video-recipient-audio-manual
        disabled={!audioRights||sttBusy||recording||preparing}
        onClick={goRecipientAudioToManualMontage}>
        <Film size={17}/>{manualTranscript.trim()?(locale==="ru"?"Использовать текст в монтаже":locale==="es"?"Usar texto en montaje":"Use text in montage"):
          locale==="ru"?"В монтаж без расшифровки":
          locale==="es"?"Editar sin transcripción":"Edit without transcription"}
      </button>:null}
      {voiceTranscript?<div className={videoStyles.recipientAudioConcept} data-video-recipient-audio-transcript>
        <strong>{locale==="ru"?"Распознанный текст":locale==="es"?"Texto reconocido":"Transcribed text"}</strong>
        <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{voiceTranscript.text}</p>
        <details><summary>{voiceTranscript.timingSource==="estimated"?(locale==="ru"?"Примерные интервалы речи":locale==="es"?"Tiempos aproximados":"Approximate speech intervals"):
          locale==="ru"?"Фрагменты с таймкодами":locale==="es"?"Fragmentos con tiempos":"Timed segments"}
          {" · "}{voiceTranscript.durationSeconds.toFixed(1)} s</summary>
          <ol>{voiceTranscript.segments.map((segment,index)=><li key={index}>
            {segment.startSeconds.toFixed(1)}–{segment.endSeconds.toFixed(1)} s · {segment.text}
          </li>)}</ol>
        </details>
      </div>:null}
      </div>
    </div>
    <div className={videoStyles.recipientAudioStep}>
      <b>3</b><div><strong>{locale==="ru"?"Ключевые слова и концепт":locale==="es"?"Temas y concepto":"Keywords and concept"}</strong>
      <small>{locale==="ru"?"Подберём видеоряд по смысловым фрагментам речи и времени.":
        locale==="es"?"Escenas verificadas según los momentos de voz.":"Approved footage matched to speech moments."}</small>
      <button type="button" data-video-recipient-audio-plan
        disabled={!voiceTranscript||!audioRights||sttBusy||recording||preparing} onClick={()=>applyTranscriptVideo()}>
        <Film size={17}/>{locale==="ru"?"Подобрать видеоряд":locale==="es"?"Elegir escenas":"Match footage"}</button>
      {voiceConcept?<div className={videoStyles.recipientAudioConcept}
        data-video-recipient-audio-concept-preview data-plan-status={voiceVisualPlan?.status||"TRANSCRIPT_ONLY"}>
        <strong>{locale==="ru"?"Концепт по смыслу речи":locale==="es"?"Concepto a partir de la voz":"Concept from your speech"}</strong>
        <dl className={videoStyles.recipientAudioFields} data-video-recipient-audio-fields>
          <div data-video-recipient-audio-goal><dt>{locale==="ru"?"Цель":locale==="es"?"Objetivo":"Goal"}</dt>
            <dd>{voiceConcept.goal.text}</dd></div>
          <div data-video-recipient-audio-purpose><dt>{locale==="ru"?"Назначение":locale==="es"?"Finalidad":"Purpose"}</dt>
            <dd>{voiceConcept.purpose}</dd></div>
          <div data-video-recipient-audio-category><dt>{locale==="ru"?"Категория":locale==="es"?"Categoría":"Category"}</dt>
            <dd>{voiceConcept.category}</dd></div>
          {voiceConcept.topic?<div data-video-recipient-audio-topic>
            <dt>{locale==="ru"?"Тема":locale==="es"?"Tema":"Topic"}</dt>
            <dd>{voiceConcept.topic}</dd></div>:null}
          <div data-video-recipient-audio-style><dt>{locale==="ru"?"Стиль":locale==="es"?"Estilo":"Style"}</dt>
            <dd>{voiceConcept.style.label||"—"}</dd></div>
          <div data-video-recipient-audio-symbol><dt>{locale==="ru"?"Символ":locale==="es"?"Símbolo":"Symbol"}</dt>
            <dd>{voiceConcept.symbol?.label||"—"}</dd></div>
          <div data-video-recipient-audio-pace><dt>{locale==="ru"?"Темп":locale==="es"?"Ritmo":"Pace"}</dt>
            <dd>{voiceConcept.pace==="gentle"
              ?(locale==="ru"?"Мягкий":locale==="es"?"Suave":"Gentle")
              :voiceConcept.pace==="dynamic"
              ?(locale==="ru"?"Динамичный":locale==="es"?"Dinámico":"Dynamic")
              :(locale==="ru"?"Ровный":locale==="es"?"Uniforme":"Steady")}</dd></div>
        </dl>
        {voiceConcept.keywords.length?<div className={videoStyles.recipientAudioKeywords}
          data-video-recipient-audio-keywords>
          {voiceConcept.keywords.slice(0,8).map(word=><span key={word.id}>{word.id}</span>)}
        </div>:null}
        {voiceVisualPlan?.canExport?<details data-video-recipient-audio-preview>
          <summary>{locale==="ru"?"Предварительные кадры":locale==="es"?"Escenas propuestas":"Proposed scenes"} · {voiceVisualPlan.shots.length}</summary>
          <ol>{voiceVisualPlan.shots.map((shot,i)=><li key={i}>
            {shot.startSeconds}–{shot.endSeconds} s · {shot.visualLabel}{shot.needsReview?" ⚠":""}
          </li>)}</ol>
        </details>:<p role="status" data-video-recipient-audio-no-footage>
          {locale==="ru"?"Подходящие подтверждённые кадры пока не найдены; текст и концепт сохранены для просмотра.":
            locale==="es"?"Aún no hay clips autorizados suficientes; revisa el texto y concepto.":
            "Not enough verified footage yet; review the transcript and concept."}
        </p>}
        <small data-video-recipient-audio-proposal>
          {locale==="ru"?"Предложение по ключевым словам, не подтверждение буквального содержания кадра. Проверьте результат перед монтажом.":
            locale==="es"?"Sugerencia por palabras; no demuestra que las imágenes sean literales. Revísala antes del montaje.":
            "Keyword-based suggestion, not proof of literal scene content. Review before editing."}
        </small>
      </div>:null}
      {voiceVisualPlan?.canExport&&audioPlanApplied?<div className={videoStyles.recipientAudioConcept}
        data-video-recipient-audio-concept><strong>{locale==="ru"?"Ваш концепт":locale==="es"?"Tu concepto":"Your concept"}</strong>
        <div className={videoStyles.recipientAudioKeywords}>
          {[...new Set(voiceVisualPlan.shots.flatMap(shot=>shot.concepts))].slice(0,8).map(word=><span key={word}>{word}</span>)}
        </div><ol>{voiceVisualPlan.shots.map((shot,i)=><li key={i}>
          {shot.startSeconds}–{shot.endSeconds} s · {shot.visualLabel}{shot.needsReview?" ⚠":""}</li>)}</ol>
        </div>:null}
      </div>
    </div>
    {musicWarning?<p role="status">{musicWarning}</p>:null}
    <button type="button" className={videoStyles.recipientAudioNext} data-video-recipient-audio-next
      disabled={!audioPlanApplied||!voiceVisualPlan?.canExport||!audioRights} onClick={goRecipientAudioToMontage}>
      <Film size={20}/>{locale==="ru"?"Перейти к монтажу":locale==="es"?"Ir al montaje":"Continue to montage"}<ArrowRight size={20}/>
    </button>
    <small>{locale==="ru"?"Это подготовка концепта, а не автоматический рендер или оплата.":
      locale==="es"?"No se genera ni se cobra automáticamente.":"No automatic rendering or payment."}</small>
  </section>;

  // First-paint opt-in presentation occupies the SAME 16:9 Goal player.
  // EN explicitly labels this real Russian recording, not an invented translation.
  const showIntroHero = (
    (activeWorkspace==="video"&&(!videoScenarioOpen||introPlaying||studioIntroOpen)) ||
    (activeWorkspace==="editor"&&introPlaying)
  ) && !introDismissed && !previewPlaying && !recording && !preparing && !result &&
    Boolean(introVideo);

  // One idempotent action for mouse, touch/pen and keyboard navigation.
  const activateQuickWorkspace=(id:(typeof workspaceTabs)[number]["id"])=>{
    quickNavTokenRef.current++;
    setActiveWorkspace(id);
    if(id==="editor")setMontagePanel("effects");
    if(id==="effects")setHypnoEntryGroup("visual");
    setIntroPlaying(false);
    setStudioMode("pump");
    setTherapyJumpRequested(false);
  };
  // Reuse the one existing multitrack editor in Montage and PRO Standard; never mount two timelines.
  const sharedMontageTimeline = (
          <MandalaMultiTrackTimeline locale={locale} seconds={duration}
            disabled={recording||preparing}
            canUndo={usingFreeFilmCompilation&&editorHistoryAvailability.undo}
            canRedo={usingFreeFilmCompilation&&editorHistoryAvailability.redo}
            onUndo={undoEditorChange} onRedo={redoEditorChange}
            shots={usingFreeFilmCompilation&&cinematicPlan
              ?cinematicPlan.shots.map(shot=>({
                sceneId:shot.sceneId,title:freeFilmClipLabel(shot.sceneId),
                poster:firstPartyFilmFor(shot.theme,shot.sceneId)?.poster,
                startSeconds:shot.startSeconds,durationSeconds:shot.durationSeconds,
                transitionIn:shot.transitionIn,colorLook:shot.colorLook,
                motion:shot.motion??null,
                sourcePhasePercent:shot.sourcePhasePercent??0,
                sourceSpeed:shot.sourceSpeed??1
              }))
              :activeFilm?[{sceneId:theme==="money"?moneyScene||"golden-rain":otherScene,
                title:sceneName,poster:activeFilm.poster,startSeconds:0,durationSeconds:duration}]:[]}
            captions={timelineCaptions}
            setupCandidates={affirmationLines.slice(0,5)}
            onImportSetups={importMontageSetups}
            onReorderSetups={reorderMontageSetup}
            audio={attachedAudio&&!audioNeedsAttachment?{
              label:appliedAudioName,startSeconds:effectiveAudioStartSeconds,
              durationSeconds:duration-effectiveAudioStartSeconds,
              peaks:audioWaveform??undefined
            }:null}
            musicBed={attachedAudio?.kind==="file"&&audioRights&&
              musicBed.id!=="none"&&!audioNeedsAttachment?{
                label:curatedAudioTracks.find(track=>track.id===musicBed.id)?.name[locale]||
                  MUSIC_BED_NAMES[musicBed.id as keyof typeof MUSIC_BED_NAMES]?.[locale]||musicBed.id,
                startSeconds:0,durationSeconds:duration
              }:null}
            playheadSeconds={previewPlaying?previewPlayhead:previewSeekSeconds}
            playing={previewPlaying}
            onSeek={seekTimeline}
            onTogglePlay={()=>{
              if(previewPlaying){seekTimeline(previewPlayhead);return;}
              if(recording||preparing)return;
              const at=previewSeekSeconds>=duration?0:previewSeekSeconds;
              if(at!==previewSeekSeconds){setPreviewSeekSeconds(at);setPreviewPlayhead(at);}
              startMovieSound(attachedAudio,soundVolume,at);
              setPreviewPlaying(true);
              const film=premiumVideoRef.current;
              if(film&&activeFilm){
                film.muted=true;
                void film.play().catch(()=>{
                  if(aliveRef.current)setNotice(ui.videoUnavailable);
                });
              }
            }}
            onAddVideo={()=>{
              // The visible Montage Text "Add video" opens the SAME licensed
              // four-scene catalogue, not a hidden Goals-stage panel.
              setStudioMode("pump");
              openVideoScenarioStep();
            }}
            onMoveShot={moveTimelineShot}
            onResizeShot={shiftFilmCut}
            onSetShotEffect={usingFreeFilmCompilation?changeTimelineShotEffect:undefined}
            onSetShotMotion={usingFreeFilmCompilation?changeTimelineShotMotion:undefined}
            onSetShotSourceTiming={usingFreeFilmCompilation?changeTimelineShotSourceTiming:undefined}
            onAddCaption={addTimelineCaption}
            onSplitCaption={splitTimelineText}
            onDuplicateCaption={duplicateTimelineText}
            onSetCaption={changeTimelineCaption}
            onRemoveCaption={id=>{
              recordBeforeEditorChange("caption-remove");
              setTimelineTextClips(current=>(current??timelineCaptions).filter(clip=>clip.id!==id));
              stopMovieSound();setPreviewPlaying(false);
            }}
            onOpenAudio={()=>{
              setActiveWorkspace("editor");setMontagePanel("audio");setBasicPanelTab("music");
              window.requestAnimationFrame(()=>document.querySelector("[data-video-music-editor]")
                ?.scrollIntoView({behavior:"smooth",block:"nearest"}));
            }}
            onChangeAudioStart={seconds=>{
              recordBeforeEditorChange("audio-offset");
              setAudioStartSeconds(clampTrackSecond(seconds,Math.max(0,duration-.1)));
              stopMovieSound();setPreviewPlaying(false);
            }}/>
  );
  // The only workspace tab rail stays in the same place above the ONE player
  // for every mode; portal relocation previously changed geometry and focus.
  return (
    <section className={videoStyles.studio} data-active-workspace={activeWorkspace||undefined} id="free-personal-video"
      data-video-preview-playing={previewPlaying?"true":undefined}
      data-hh-video-ihelp-open={videoIHelpOpen||undefined}
      data-mandala-free-video data-video-studio-mode={studioMode}
      data-video-advanced-open={showAdvancedVideo?"true":"false"}
      data-video-scenario-open={videoScenarioOpen?"true":"false"}
      data-video-studio-hydrated={studioHydrated?"true":"false"}
      data-montage-panel={activeWorkspace==="editor"?montagePanel:undefined}
      lang={locale} aria-label={ui.title}>



      <section className={videoStyles.quickBuilder} data-video-quick-builder
        aria-labelledby="video-quick-heading">
        <nav className={videoStyles.quickBrandBar} data-video-hypno-scroll-start aria-label="Holistic House">
          <Link href={"/"+locale+"/holistic-support/mobile"} prefetch={false} className={videoStyles.quickBrandBack}
            aria-label={locale==="ru"?"На главную":locale==="es"?"Volver al inicio":"Back to home"}>
            <Leaf size={29} aria-hidden="true"/>
          </Link>
          <span className={videoStyles.quickBrandMobileTitle}>{locale==="ru"?"Видео-мандала":locale==="es"?"Vídeo mandala":"Video mandala"}</span>
          <span className={videoStyles.quickBrandIdentity}><strong>Holistic House</strong>
            <small>{locale==="ru"?"Видеостудия · Создание видео":
              locale==="es"?"Estudio de vídeo · Crear":
              "Video Studio · Create video"}</small>
          </span>
          <button type="button" className={videoStyles.quickBrandIHelp}
            data-video-ihelp-header-trigger data-hh-ihelp-trigger
            aria-label={locale==="ru"?"Открыть iHelp — AI-видеорежиссёр":
              locale==="es"?"Abrir iHelp — director de vídeo":"Open iHelp — AI video director"}
            aria-haspopup="dialog" aria-controls="hh-ihelp-video-director-dialog"
            disabled={!studioHydrated}
            onClick={()=>window.dispatchEvent(new CustomEvent<{handled:boolean}>(
              "hh:ihelp-open-video-director",{detail:{handled:false}}))}>
            <MessageCircleQuestion size={18} aria-hidden="true"/><span>iHelp</span>
          </button>
          <Link href={"/"+locale+"/holistic-support/mandala?mode=photo"} prefetch={false}
            className={videoStyles.quickBrandPhoto} data-video-open-photo-mandala
            aria-label={locale==="ru"?"Фотомандалы":locale==="es"?"Fotomandalas":"Photo mandalas"}>
            <Camera size={17} aria-hidden="true"/>
            <span>{locale==="ru"?"Фото":locale==="es"?"Foto":"Photo"}</span>
          </Link>
          <HeaderCreditProfile locale={locale} />
        </nav>
        {creditCatalog?.chargeRequired?<p className={videoStyles.quickHint}
          data-video-credit-status role="status" aria-live="polite">
          {creditCatalog.ready
            ?creditSession==="guest"
              ?(locale==="ru"?"Первое видео бесплатно · просмотр без входа":
                locale==="es"?"Primer vídeo gratis · ver sin entrar":
                "First video free · watch without sign-in")
              :(locale==="ru"?"1 ролик = 10 кредитов. Баланс: ":
                locale==="es"?"1 vídeo = 10 créditos. Saldo: ":
                "1 video = 10 credits. Balance: ")+(creditBalance===null?"—":creditBalance)
            :(locale==="ru"?"Кредиты недоступны. Экспорт приостановлен.":
              locale==="es"?"Créditos no disponibles. Exportación pausada.":
              "Credits unavailable. Export paused.")}
          {" · "}<Link href={(locale==="es"?"/en":"/"+locale)+"/app/portrait"}>
            {locale==="ru"?"Мой дом":locale==="es"?"Mi espacio":"My House"}
          </Link>
        </p>:null}
        {/* One in-flow six-tool rail: fixed above the shared video across all workspaces. */}
      <nav className={videoStyles.quickVideoNav} data-video-quick-controls
        aria-label={locale==="ru"?"Разделы видеостудии":locale==="es"?"Secciones del estudio":"Video Studio workspaces"}
        onPointerDownCapture={()=>{quickNavTokenRef.current++;}}
        onKeyDownCapture={event=>{if(event.key==="Enter"||event.key===" ")quickNavTokenRef.current++;}}>
        {workspaceTabs.map(item=><button type="button" key={item.id}
          data-video-quick-control={item.id} aria-label={workspaceCopy[locale][item.id].tab}
          aria-pressed={activeWorkspace===item.id||(activeWorkspace==="practices"&&item.id==="ready")||(!activeWorkspace&&item.id==="video")}
          aria-controls="video-workspace-panel" disabled={!studioHydrated||recording||preparing}
          // WebKit may drop click after an expanded Ideas details portal shifts
          // during release; pointer-up commits the same real selected tab.
          onPointerUp={()=>{if(activeWorkspace!==item.id)activateQuickWorkspace(item.id);}}
          onClick={()=>activateQuickWorkspace(item.id)}><item.Icon size={18} aria-hidden="true"/>
          <span className={videoStyles.quickNavFull}>{workspaceCopy[locale][item.id].tab}</span>
          <span className={videoStyles.quickNavCompact} aria-hidden="true">{mobileWorkspaceCopy[locale][item.id]}</span>
        </button>)}
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
            <h3 id="quick-theme-title"><Target size={21} aria-hidden="true"/>{activeWorkspace==="effects"?(locale==="ru"?"1. Цель и состояние":locale==="es"?"1. Objetivo y estado":"1. Goal and state"):(locale==="ru"?"1. Выберите цель":locale==="es"?"1. Elige tu objetivo":"1. Choose your goal")}</h3>
            {/* The ONE real recipient-aware toggle lives in the existing Video Director. */}
            <div data-video-director-audience-controls/>
            <Link href={"/"+locale+"/client/tests"} prefetch={false}>{quick.myGoals}<ArrowRight size={16} aria-hidden="true"/></Link>
          </div>
          <div  data-video-wish-above-goals>
            <h4><Sparkles size={19} aria-hidden="true"/>{locale==="ru"?"Ваше пожелание (необязательно)":
              locale==="es"?"Tu deseo (opcional)":"Your wish (optional)"}</h4>
            <div className={videoStyles.quickRequestHost} data-video-request-prompt/>
          </div>
          <p className={videoStyles.quickStepHint}>{locale==="ru"
            ?"Напишите своими словами или подберите сценарий кнопками ниже."
            :locale==="es"?"Escribe tu idea o selecciona los filtros de abajo."
            :"Write your idea or choose the filters below."}</p>
          <div className={videoStyles.quickProfileHost} data-video-profile-picker/>
          <h4 className={videoStyles.quickGoalLabel}>{locale==="ru"?"Выберите цель видео":
            locale==="es"?"Elige el objetivo":"Choose your video goal"}</h4>
          <div className={videoStyles.quickGoalHost} data-video-director-goal-controls/>
          <details ref={quickThemeAdvancedRef} className={videoStyles.quickThemeAdvanced} data-video-theme-advanced open={activeWorkspace==="effects"||undefined}>
            <summary>{locale==="ru"?"Все темы и образы":locale==="es"?"Más temas e imágenes":"More topics and imagery"}</summary>
          <div className={videoStyles.quickThemeRail} role="group" aria-label={quick.theme}>
            {(activeWorkspace==="effects"?effectsThemeOrder:quickThemeOrder).map(value=>{
              const Icon=value==="energy"?Zap:value==="health"?HeartPulse:value==="relationships"?Heart:value==="money"?Coins:value==="goals"?Target:Sprout;
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
                <span className={videoStyles.quickThemeName}>{activeWorkspace==="effects"?effectsThemeNames[locale][value]:approved.themes[value]}</span>
              </button>;
            })}
          </div>
          </details>
        </section>
        <section className={videoStyles.quickSection} data-video-topic-section
          data-workspace-section="video" aria-label={
            locale==="ru"?"3. Выберите тему":locale==="es"?"3. Elige el tema":"3. Choose your topic"}>
          <div className={videoStyles.quickSectionHeading} data-video-goal-topic-title>
            <h3><Sparkles size={21} aria-hidden="true"/>{locale==="ru"?"3. Выберите тему":
              locale==="es"?"3. Elige el tema":"3. Choose a topic"}</h3>
          </div>
          <div data-video-director-topic-controls className={videoStyles.quickTopicHost}/>
          <div className={videoStyles.stageActionPair} data-video-stage-actions="goal" data-video-request-after-topic>
            <button type="button" className={videoStyles.quickGenerate} data-video-stage-generate="goal"
              disabled={!studioHydrated||recording||preparing} onClick={generateFromGoal}>
              <Play size={20} fill="currentColor" aria-hidden="true"/>
              {locale==="ru"?"Создать видео":locale==="es"?"Generar vídeo":"Generate video"}
              {creditCatalog?.chargeRequired && creditCatalog.ready ?
                <small>{creditSession==="guest"&&!guestFirstVideoUsed
                  ?locale==="ru"?"Первое бесплатно":locale==="es"?"Primero gratis":"First free"
                  :creditCatalog.priceCredits+" "+(locale==="ru"?"кредитов":locale==="es"?"créditos":"credits")}</small>
                :null}
            </button>
            <button type="button" className={videoStyles.stageAddButton} data-video-continue-scenarios
              disabled={!studioHydrated||recording||preparing} onClick={continueToIdeas}>
              <Sparkles size={19} aria-hidden="true"/>
              {locale==="ru"?"Перейти к персонализации":
                locale==="es"?"Continuar a personalización":"Proceed to personalization"}
              <ArrowRight size={18} aria-hidden="true"/>
            </button>
            {notice?<p className={videoStyles.quickStatus} role="status" aria-live="polite" data-video-stage-status>{notice}</p>:null}
          </div>
        </section>
        {/* Original verified AI Director from #2913: open only from the free-help
            chip, keep the default iPhone design and a single MediaRecorder. */}
        {videoIHelpOpen&&<button type="button" tabIndex={-1}
          className={videoStyles.iHelpVideoBackdrop} data-video-ihelp-backdrop
          aria-label={locale==="ru"?"Закрыть iHelp":locale==="es"?"Cerrar iHelp":"Close iHelp"}
          onClick={closeVideoIHelp}/>}
        <details id="hh-ihelp-video-director-dialog" className={videoStyles.directorChatDetails}
          data-video-director-chat-details data-workspace-section="video"
          role={videoIHelpOpen?"dialog":undefined}
          aria-modal={videoIHelpOpen?"true":undefined}
          aria-label={videoIHelpOpen?(locale==="ru"?"iHelp — AI-видеорежиссёр":
            locale==="es"?"iHelp — director de vídeo":"iHelp — AI Video Director"):undefined}
          open={directorChatOpen}
          onToggle={event=>setDirectorChatOpen(event.currentTarget.open)}>
          <summary><Sparkles size={17} aria-hidden="true"/>
            {locale==="ru"?"ИИ-помощник — уточнить ваш запрос":
              locale==="es"?"Asistente IA — aclarar tu petición":
              "AI assistant — refine your brief"}
            <ChevronDown size={17} aria-hidden="true"/>
          </summary>
        {videoIHelpOpen&&<div className={videoStyles.iHelpVideoBar} data-video-ihelp-header>
          <strong>iHelp</strong><span>{locale==="ru"?"AI-помощник, не человек и не психотерапевт":
            locale==="es"?"Asistente de IA, no una persona ni terapeuta":
            "AI assistant, not a person or therapist"}</span>
          <button type="button" ref={videoIHelpCloseRef} onClick={closeVideoIHelp}
            aria-label={locale==="ru"?"Закрыть iHelp":locale==="es"?"Cerrar iHelp":"Close iHelp"}>
            <X size={20} aria-hidden="true"/>
          </button>
        </div>}
        {/* Conversation-first entrypoint: the existing Studio supplies the ONE renderer/player.
            Visual styling reuses the approved Messenger pattern without importing CRM data. */}
        <MandalaVideoDirectorChat
          locale={locale} goal={wish} theme={theme}
          helpVisible={videoIHelpOpen}
          helpTab={activeWorkspace==="phrases"?"ideas":
            activeWorkspace==="editor"?montagePanel:
            activeWorkspace==="effects"?"effects":"video"}
          presets={aspectFilmPresets} scenes={FREE_FILM_CATALOG}
          renderOptions={{quality,brightness,volumePercent:soundVolume}}
          disabled={recording||preparing} canCreate={canGenerate}
          rendering={recording||preparing} renderProgress={progress}
          resultReady={Boolean(result&&result.mode!=="catalog"&&playbackStatus==="ready"&&creditConfirmed)}
          resultFailed={Boolean(exportUnavailable||(result&&playbackStatus==="failed"))}
          onGoalChange={next=>{setWish(next.slice(0,800));setSuggestion("");setCinematicPlan(null);}}
          onInvalidate={()=>{setPreviewPlaying(false);setCinematicPlan(null);}}
          onConfirm={({scenario})=>{
            // The ONLY executable boundary: one validated scenario -> existing
            // MP4 timeline, audio selection, on-screen text, Canvas and MediaRecorder.
            // An AI string never becomes a guessed media URL or paid render.
            const preserveMessengerAudio = Boolean(uploadedAudio &&
              attachedAudio?.kind==="file" &&
              attachedAudio.file===uploadedAudio.file &&
              audioRights && !audioDurationInvalid && !audioNeedsAttachment);
            if((uploadedAudio||attachedAudio?.kind==="file")&&!preserveMessengerAudio){
              setNotice(locale==="ru"?"Сначала подтвердите права и прикрепите аудио в разделе звука."
                :locale==="es"?"Primero confirma los derechos y adjunta el audio."
                :"Confirm audio rights and attach the recording first.");
              return false;
            }
            if(preserveMessengerAudio&&importedAudioSeconds!==null &&
              scenario.durationSeconds+0.05<importedAudioSeconds){
              setNotice(locale==="ru"
                ?"Сценарий короче записи. Выберите не меньше "+Math.ceil(importedAudioSeconds)+" секунд."
                :locale==="es"
                ?"El vídeo es más corto que el audio. Elige al menos "+Math.ceil(importedAudioSeconds)+" segundos."
                :"The video is shorter than your recording. Choose at least "+Math.ceil(importedAudioSeconds)+" seconds.");
              return false;
            }
            if(!scenario.readyToExecute||scenario.version!=="hh-executable-video-scenario-v1")
              return false;
            const ok=applyAutoFilm(scenario.presetId,
              scenario.durationSeconds as 10|15|20|30|60,
              scenario.edit,scenario.aspect as Aspect);
            if(!ok)return false;
            const soundtrack=scenario.audio.trackId as AmbientMusic;
            // A validated voice recording takes precedence over stock music.
            // applyAutoFilm() also skips auto music when audioAuto=false.
            if(!preserveMessengerAudio){
              chooseMusic(soundtrack);
              setAttachedAudio(soundtrack==="none"?null:{kind:"preset",id:soundtrack});
              setSoundVolume(scenario.audio.volumePercent);
            }
            setAudioAuto(false);setSpeed(scenario.rendering.motion as Speed);
            setQuality(scenario.rendering.quality as Quality);
            setBrightness(scenario.rendering.brightness as Brightness);
            // Stage captions come from scenario.shots in the verified film
            // plan. Disable the other two overlay tracks to avoid duplicate
            // affirmations or text unrelated to the user's approved cut.
            setCaptionMode("none");
            setAffirmations(current=>({...current,enabled:false,selected:[]}));
            setPreviewPlaying(false);
            return true;
          }}
          onCreate={createQuickVideo}
          onOpenResult={()=>{
            // The result lives on the Studio page, not inside the modal.
            // Close the optional iHelp overlay and reveal the real MP4 viewer.
            setVideoIHelpOpen(false);setActiveWorkspace("video");
            window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
              document.getElementById("personal-video-result")?.scrollIntoView({behavior:"smooth",block:"start"})));
          }}
          onOpenDelivery={()=>{
            setVideoIHelpOpen(false);setActiveWorkspace("video");setDeliveryChooserOpen(true);
            window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
              document.getElementById("personal-video-result")?.scrollIntoView({behavior:"smooth",block:"start"})));
          }}
          onOpenEditor={()=>{
            setVideoIHelpOpen(false);openQuickDetailed("video-settings");
          }}
          onPickPhoto={()=>{
            setVideoIHelpOpen(false);setBackgroundOnly(false);onPickPhoto();
          }}
          onOpenAudio={()=>{
            setVideoIHelpOpen(false);openQuickDetailed("video-audio");
          }}/>

        </details>

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
      <div className={videoStyles.heroWithRail} data-video-player-with-controls>
      <section className={videoStyles.hero} id="video-hero" data-video-mandala-hero
        data-hero-promo={activeWorkspace!=="phrases"&&creationMode!=="generated"&&!cinematicPlan&&!photoUrl&&!previewPlaying&&!recording&&!selectedStyleFilm&&!hypnoLight.enabled?"true":"false"}
         data-video-therapy-preview={studioMode==="therapy"?"true":"false"}
        data-montage-pro-hero={activeWorkspace==="editor"&&montagePanel==="promo"?"true":undefined}
        data-video-theme-active={videoCategory} data-preview-playing={previewPlaying?"true":"false"}
        data-video-preview-style={activeMontageStyleId||cinematicPlan?.styleId||"original"}
        data-video-preview-clips={usingFreeFilmCompilation?freeFilmShots.length:activeFilm?1:0}
        aria-labelledby="video-hero-heading">
        <h2 id="video-hero-heading" className={videoStyles.srOnly}>{studioMode==="therapy"?layout.therapyHeading:layout.previewTitle}</h2>
        <div className={videoStyles.heroPromo} aria-hidden="true"
          style={activeWorkspace==="editor"&&montagePanel==="promo"&&!activeFilm
          ? {backgroundImage:'linear-gradient(105deg,rgba(8,39,31,.08),rgba(9,37,29,.28)),url("/images/holistic-house/pro-enhance-hero.webp")'}
          : activeFilm ? {backgroundImage:`linear-gradient(110deg,rgba(10,43,35,.12),rgba(6,28,29,.18)),url("${activeFilm.poster}")`} : undefined}/>
        <div className={videoStyles.heroCanvas} data-video-preview-frame
          data-video-selected-style={selectedStyleFilm?.sceneId||undefined}>
          <canvas key={aspect} ref={canvasRef} width={formatDimensions(aspect,"hd")[0]}
            height={formatDimensions(aspect,"hd")[1]} data-mandala-cinematic-canvas
            aria-label={layout.previewTitle}/>
          {selectedStyleFilm&&!styleFilmReady?
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedStyleFilm.poster} alt="" aria-hidden="true"
              className={videoStyles.heroSelectedStylePoster} data-video-style-loading/>:null}
          {selectedStyleFilm?<video key={selectedStyleFilm.src} ref={styleFilmRef}
            src={selectedStyleFilm.src} poster={selectedStyleFilm.poster}
            muted playsInline loop preload="auto" aria-hidden="true"
            data-video-style-source={selectedStyleFilm.sceneId}
            className={videoStyles.heroSelectedStyleDecoder}
            onLoadedData={event=>{
              if(event.currentTarget.readyState>=2&&event.currentTarget.videoWidth>0){
                setStyleFilmReady(true);setPreviewFrameRevision(value=>value+1);
              }
            }}
            onCanPlay={event=>{
              if(event.currentTarget.readyState>=2&&event.currentTarget.videoWidth>0){
                setStyleFilmReady(true);
                if(previewPlaying&&!recording&&!preparing)
                  void event.currentTarget.play().catch(()=>{});
              }
            }}
            onError={()=>{setStyleFilmReady(false);setNotice(ui.videoUnavailable);}}/>:null}
        </div>
        <div className={videoStyles.heroShade} aria-hidden="true"/>
        <div className={videoStyles.heroEditorial} aria-hidden={previewPlaying||recording||activeWorkspace==="phrases"||showIntroHero}>
          <span className={videoStyles.heroEyebrow}><Film size={16} aria-hidden="true"/>
            {activeWorkspace==="phrases"?(locale==="ru"?"Идеи · предпросмотр":locale==="es"?"Ideas · vista previa":"Ideas · preview"):activeWorkspace==="editor"&&montagePanel==="promo"?"Montage PRO":locale==="ru"?"Видеогенератор":locale==="es"?"Generador de vídeo":"Video creator"}
          </span>
          <h2>{activeWorkspace==="phrases"
              ?(locale==="ru"?"Как работают фразы поддержки":locale==="es"?"Cómo funcionan las frases":"How support phrases work")
              :activeWorkspace==="video"
              ?(locale==="ru"?"Создайте своё видео":locale==="es"?"Crea tu propio vídeo":"Create your own video")
              :activeWorkspace==="pro"
              ?(locale==="ru"?"Улучшите своё видео":locale==="es"?"Mejora tu vídeo":"Enhance your video")
              :activeWorkspace==="editor"&&montagePanel==="promo"
              ?"Montage PRO"
              :(locale==="ru"?"Создавайте видео для поддержки, баланса и развития":
                locale==="es"?"Crea vídeos para tu bienestar y crecimiento":
                "Create videos for balance, support and growth")}</h2>
          <p>{activeWorkspace==="phrases"
              ?(locale==="ru"?"Выберите слова и голос. Play показывает предпросмотр вашего видео.":
                locale==="es"?"Elige frases y voz. Play muestra una vista previa del vídeo.":
                "Choose phrases and voice. Play previews your video.")
              :activeWorkspace==="video"
              ?(locale==="ru"?"Практика, медитация или вдохновляющий ролик с вашим смыслом":
                locale==="es"?"Una práctica, meditación o vídeo inspirador con sentido":
                "Practice, meditation or an inspiring film with your meaning")
              :activeWorkspace==="pro"
              ?(locale==="ru"?"Выберите улучшение или создайте видео бесплатно.":locale==="es"?"Elige una mejora o crea un vídeo gratis.":"Choose an upgrade or create a free video.")
              :activeWorkspace==="editor"&&montagePanel==="promo"
              ?(locale==="ru"?"Персонаж для приветствия, качественные AI-сцены и ваш образ в видео.":locale==="es"?"Un presentador, escenas de IA y tu propia imagen en el vídeo.":"A greeting character, premium AI scenes and your own image.")
              :(locale==="ru"?"Персональные видео, медитации и практики под ваш запрос.":
                locale==="es"?"Vídeos, meditaciones y prácticas para tu objetivo.":
                "Personal videos, meditations and practices for your goals.")}</p>
        </div>
        <span className={videoStyles.heroDuration} aria-label={locale==="ru"?"Планируемая длительность":locale==="es"?"Duración prevista":"Planned duration"}>
          00:{String(duration).padStart(2,"0")}
        </span>
        {attachedAudio ? <span className={videoStyles.quickSoundBadge} data-video-live-audio aria-live="polite">
          <Music2 size={13} aria-hidden="true"/>{appliedAudioName}
        </span> : null}
        {showIntroHero ? <div className={videoStyles.therapyHero} data-video-therapy-info
          data-intro-spoken-locale={introVideo.locale}>
          <div className={videoStyles.therapyHeroPlayback}
            data-video-therapy-intro={introPlaying?"playing":"ready"}
            data-playing={introPlaying?"true":"false"}>
            <video ref={introVideoRef} className={videoStyles.therapyHeroVideo}
              src={introVideo.src} controls={introPlaying} playsInline preload="none"
              poster="/images/video-studio-presentation-ru.jpg"
              aria-label={locale==="ru"?"Презентация Holistic House — русская озвучка":
                locale==="es"?"Holistic House — presentación, audio en inglés":"Holistic House introduction — English audio"}
              tabIndex={introPlaying?0:-1} onError={()=>setIntroFailed(true)}
              onLoadedData={()=>setIntroFailed(false)} onEnded={closeIntro}/>
            {introPlaying&&<button type="button" className={videoStyles.therapyHeroClose}
              data-video-therapy-intro-close onClick={closeIntro}>
              {locale==="ru"?"К моему видео":locale==="es"?"Volver a mi vídeo":"Back to my video"}
            </button>}
            {introFailed&&<div className={videoStyles.therapyHeroError} role="alert">
              <span>{locale==="ru"?"Не удалось загрузить видео":locale==="es"?"No se pudo cargar el vídeo":"Video could not be loaded"}</span>
              <button type="button" onClick={playIntro}>{locale==="ru"?"Повторить":locale==="es"?"Reintentar":"Retry"}</button>
              <a href={introVideo.src} target="_blank" rel="noopener noreferrer">
                {locale==="ru"?"Открыть видео":"Open original video"}
              </a>
            </div>}
          </div>
          {!introPlaying&&<button type="button" className={videoStyles.therapyHeroLaunch}
            data-video-therapy-intro="ready" disabled={recording||preparing}
            aria-label={locale==="ru"?"Смотреть презентацию о видеотерапии, 1 минута 37 секунд":
              locale==="es"?"Ver la presentación, audio en inglés":"Play the Video Therapy introduction, English audio, 1 minute 31 seconds"}
            onClick={playIntro}>
            <span className={videoStyles.therapyHeroKicker}>HOLISTIC HOUSE</span>
            <span className={videoStyles.therapyHeroPlayIcon}><Play size={22} fill="currentColor" aria-hidden="true"/></span>
            <strong className={videoStyles.therapyHeroTitle}>{locale==="ru"?"О видеотерапии":locale==="es"?"Descubre la videoterapia":"Discover Video Therapy"}</strong>
            <span className={videoStyles.therapyHeroCaption}>{locale==="ru"?"Русская озвучка · 01:37":locale==="es"?"Audio en inglés · 01:31":"English audio · 01:31"}</span>
          </button>}
        </div> : (
        <button className={videoStyles.heroPlay} type="button" data-mandala-money-preview
          data-video-preview-toggle aria-pressed={previewPlaying}
          aria-label={previewPlaying?supportUi.pausePreview:supportUi.quickPreview}
          title={previewPlaying?supportUi.pausePreview:supportUi.quickPreview}
          disabled={!source||recording||preparing}
          onClick={()=>{if(previewPlaying){stopMovieSound();setPreviewPlaying(false);}else openAffirmationPreview();}}>
          {previewPlaying?<Pause size={32} fill="currentColor" aria-hidden="true"/>:
            <Play size={32} fill="currentColor" aria-hidden="true"/>}
        </button>
        )}
      </section>
      <aside className={videoStyles.heroRail} data-video-intro-my-rail
        aria-label={locale==="ru"?"Введение и мой ролик":locale==="es"?"Introducción y mi vídeo":"Intro and my video"}>
        <button type="button" className={videoStyles.heroRailIntro} data-video-intro-info
          aria-expanded={studioIntroOpen||introPlaying}
          aria-controls="video-studio-intro-guide video-hero"
          onClick={()=>{
            if(introVideo){
              if(introPlaying)closeIntro();
              else playIntro();
              setStudioIntroOpen(false);
            }else if(locale==="en"){
              setIntroPlaying(false);setIntroDismissed(false);setStudioIntroOpen(true);
            }else setStudioIntroOpen(open=>!open);
          }}>
          <Play size={19} aria-hidden="true"/><strong>Intro</strong>
          <span>{locale==="ru"?"Как это работает":locale==="es"?"Cómo funciona":"How it works"}</span>
          <ChevronRight size={17} aria-hidden="true"/>
        </button>
        <button type="button" className={videoStyles.heroRailMine} data-video-my-film
          onClick={()=>{
            setStudioIntroOpen(false);
            setIntroPlaying(false);setIntroDismissed(true);
            if(result){
              setActiveWorkspace("video");
              window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
                document.getElementById("personal-video-result")?.scrollIntoView({
                  behavior:"smooth",block:"start"})));
            }else{
              setActiveWorkspace("editor");setMontagePanel("effects");
              window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
                document.querySelector("[data-video-montage-tools]")?.scrollIntoView({
                  behavior:"smooth",block:"nearest"})));
            }
          }}>
          <FolderOpen size={20} aria-hidden="true"/>
          <strong>{locale==="ru"?"Мой ролик":locale==="es"?"Mi vídeo":"My video"}</strong>
          <span>{locale==="ru"?"Ролик и черновик":locale==="es"?"Vídeo y borrador":"Video & draft"}</span>
          <ChevronRight size={17} aria-hidden="true"/>
        </button>
      </aside>
      {activeWorkspace==="effects" ? <aside className={videoStyles.hypnoStageTitle}
        data-hypno-stage-intro aria-label={locale==="ru"?"Гипноэффекты":locale==="es"?"Efectos hipnóticos":"Hypno effects"}>
        <Sparkles size={23} aria-hidden="true"/>
        <div>
          <h3>{locale==="ru"?"Гипноэффекты":locale==="es"?"Efectos hipnóticos":"Hypno effects"}</h3>
          <p>{locale==="ru"?"Выберите мягкие дополнительные эффекты для видео.":
            locale==="es"?"Elige capas suaves opcionales para tu vídeo.":
            "Choose optional gentle layers for your video."}</p>
        </div>
      </aside> : null}
      {activeWorkspace==="editor" && montagePanel==="audio" ? (
        <aside className={videoStyles.montageAudioHero} data-video-audio-intro>
          <Music2 size={27} aria-hidden="true"/>
          <div>
            <h3>{locale==="ru"?"Аудио":locale==="es"?"Audio":"Audio"}</h3>
            <p>{locale==="ru"?"Выберите музыку или загрузите запись.":
              locale==="es"?"Elige música o sube tu grabación.":
              "Choose music or upload your recording."}</p>
          </div>
        </aside>
      ) : null}
      </div>
      <section id="video-studio-intro-guide" className={videoStyles.studioIntroGuide}
        hidden={!studioIntroOpen||(activeWorkspace!=="video"&&activeWorkspace!=="editor")}
        data-video-intro-guide aria-label={locale==="ru"?"Как создать видео":locale==="es"?"Cómo crear un vídeo":"How to make a video"}>
        <strong>{locale==="ru"?"Как создать своё видео":locale==="es"?"Cómo crear tu vídeo":"How to create your video"}</strong>
        <p>{locale==="ru"?"1. Выберите цель. 2. Подберите слова и стиль. 3. Добавьте аудио и создайте ролик.":
          locale==="es"?"1. Elige un objetivo. 2. Ajusta las palabras y el estilo. 3. Añade audio y crea el vídeo.":
          "1. Choose a goal. 2. Pick words and style. 3. Add audio and create your video."}</p>
        <div className={videoStyles.studioIntroSamples}>
          <button type="button" data-video-next-sample disabled={recording||preparing}
            onClick={()=>quickPickStyle((quickStyleIndex+1)%quickStylePosters.length)}>
            <ChevronRight size={16} aria-hidden="true"/>
            {locale==="ru"?"Другой видеопример":locale==="es"?"Otro ejemplo":"Another sample"}
          </button>
          <button type="button" data-video-open-scenarios onClick={openVideoScenarioStep}>
            <ListVideo size={16} aria-hidden="true"/>
            {locale==="ru"?"Посмотреть сценарии":locale==="es"?"Ver escenas":"See scenarios"}
          </button>
          <button type="button" data-video-another-sample disabled={recording||preparing}
            onClick={()=>quickPickStyle((quickStyleIndex+2)%quickStylePosters.length)}>
            <RefreshCw size={16} aria-hidden="true"/>
            {locale==="ru"?"Ещё пример":locale==="es"?"Otro":"More"}
          </button>
        </div>
      </section>


          <div className={videoStyles.previewMiniSource} data-video-mini-source>
            <div>
              <strong>{locale==="ru"?"Пример видеоряда":locale==="es"?"Ejemplo de vídeo":"Footage example"}</strong>
              <small>{activeFilm?"Full HD · MP4":usingFreeFilmCompilation?cinematicPlan!.shots.length+" MP4 · "+duration+quick.seconds:
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
                  onSeeked={()=>{if(!previewPlaying)setPreviewFrameRevision(v=>v+1);}}
                  onError={()=>{setReadyFreeFilmKey("");setNotice(ui.videoUnavailable);}}/> : null)}
              </div> : null}
              {activeFilm ? <video
                key={activeFilm.src} ref={premiumVideoRef}
                src={activeFilm.src} poster={activeFilm.poster}
                muted playsInline loop preload="none"
                autoPlay={previewPlaying&&!recording&&!preparing}
                data-mandala-master-mp4={activeFilm.src}
                onLoadedData={event=>{
                  if(event.currentTarget.readyState>=2 && event.currentTarget.videoWidth>0)
                    setPremiumReady(true);
                }}
                onCanPlay={event=>{
                  setPremiumReady(true);
                  if(previewPlaying&&!recording&&!preparing){
                    event.currentTarget.muted=true;
                    void event.currentTarget.play().catch(()=>{
                      if(aliveRef.current)setNotice(ui.videoUnavailable);
                    });
                  }
                }}
                onSeeked={()=>{if(!previewPlaying)setPreviewFrameRevision(v=>v+1);}}
                onError={()=>{setPremiumReady(false);setNotice(ui.videoUnavailable);}}
                aria-hidden="true"
              /> : <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedStyleFilm?.poster||freeFilmPoster||(theme==="money"?getRealMoneyFilm(moneyScene||"golden-rain").poster:
                  getThemedRealFilm(theme,otherScene)?.poster||quickCanvasPoster(otherScene))} alt=""/>
              </>}
              <button type="button" className={videoStyles.quickPreviewPlay}
                aria-label={previewPlaying?approved.previewPause:activeFilm?approved.previewPlay:approved.previewFallback}
                aria-pressed={previewPlaying} disabled={recording||preparing}
                onClick={()=>{
                  if(!activeFilm){
                    if(previewPlaying){stopMovieSound();setPreviewPlaying(false);}
                    else openAffirmationPreview();
                    return;
                  }
                  if(!previewPlaying){
                    startMovieSound(attachedAudio,soundVolume);
                    const video=premiumVideoRef.current;
                    if(video){video.muted=true;void video.play().catch(()=>{
                      stopMovieSound();setPreviewPlaying(false);setNotice(ui.videoUnavailable);
                    });}
                  }else{
                    premiumVideoRef.current?.pause();
                    stopMovieSound();
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
      {activeWorkspace!=="video" ? <header className={videoStyles.workspaceHeading} id="video-workspace-panel"
        data-video-workspace-heading role="region" aria-live="polite" aria-label={workspaceCopy[locale][activeWorkspace].title}>
        <small>HOLISTIC HOUSE · VIDEO STUDIO</small>
        <h3>{workspaceCopy[locale][activeWorkspace].title}</h3>
        <p>{workspaceCopy[locale][activeWorkspace].desc}</p>
      </header> : <span id="video-workspace-panel" className={videoStyles.srOnly}/>}
      
      {activeWorkspace==="ready"?<MandalaVideoReady
        locale={locale} theme={theme} wish={wish} focus={meditationFocus} aspect={aspect}
        video={result&&result.mode!=="catalog"?{
          url:result.url,extension:result.extension,bytes:result.bytes,duration
        }:null}
        verified={Boolean(result&&result.mode!=="catalog"&&playbackStatus==="ready"&&creditConfirmed)}
        checking={Boolean(result&&playbackStatus==="checking")}
        signedIn={creditSession==="signed_in"}
        loginUnavailable={creditSession==="unavailable"}
        disabled={recording||preparing}
        onRefreshLogin={()=>void refreshCreditSession()}
        onReturnToPro={()=>{setActiveWorkspace("pro");setStudioMode("pump");}}
        basicFreeAvailable={basicVideoAccess.allowed}
        basicFreeIssue={basicVideoAccess.reason}
        basicCreditCost={basicVideoAccess.chargeCredits}
        onVerifyPlayback={confirmVideoPlayback}
        onStartNewVideo={()=>{
          activateQuickWorkspace("video");
          window.requestAnimationFrame(()=>document.getElementById("free-personal-video")
            ?.scrollIntoView({behavior:"auto",block:"start"}));
        }}
        onGenerateBasicVideo={()=>{
          // Never substitute a credit-charged or paid render for the FREE offer.
          // Normalize the existing choice without forcing the visitor out of Ready.
          if(!freeVideoSelected){
            setPracticeType("video");setPracticeLevels(value=>({...value,video:"basic"}));
            return false;
          }
          return createQuickVideo();
        }}
        onOpenDelivery={()=>{
          setDeliveryChooserOpen(true);
          window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
            document.querySelector("[data-video-messenger-delivery]")
              ?.scrollIntoView({block:"nearest",behavior:"smooth"})));
        }}
        onOpenCourse={()=>{
          setActiveWorkspace("practices");setStudioMode("therapy");
          setTherapyJumpRequested(true);
          window.requestAnimationFrame(()=>document.getElementById("guided-video-series")
            ?.scrollIntoView({block:"start",behavior:"smooth"}));
        }}
        meditationEditor={<MandalaPersonalMeditation
          locale={locale} theme={theme} wish={wish} scene={sceneName} caption={caption}
          sound={attachedAudio?appliedAudioName:""}
          audioSrc={attachedAudio?.kind==="file"?(audioRights?uploadedAudio?.url||null:null):
            attachedAudio?.kind==="preset"?presetAudioUrl(attachedAudio.id):
              attachedAudio?.kind==="presets"?presetAudioUrl(attachedAudio.ids[0]):null}
          pace={speed} brightness={brightness}
          affirmations={affirmationLines} affirmationsEnabled={affirmations.enabled}
          focus={meditationFocus} disabled={recording||preparing}
          onNarrationReady={attachMeditationNarration}
          onNarrationInvalidated={()=>setAttachedAudio(current=>
            current?.kind==="file"&&current.nonLoop?null:current)}/>}
        />:null}
      {studioMode==="pump" ?       <section className={videoStyles.therapyBanner} data-workspace-section="practices" data-video-therapy-banner>
        <div className={videoStyles.therapyBannerCopy}>
          <small>{layout.therapyBannerLabel}</small>
          <h3>{locale==="ru"?"Сформировать индивидуальную программу видеотерапии бесплатно":locale==="es"?"Crear un programa personalizado de videoterapia gratis":"Create your free personalized video-therapy program"}</h3>
          <p>{locale==="ru"?"Бесплатный план из 8 образных сессий; создание следующих видео отдельно.":locale==="es"?"Plan gratuito de 8 sesiones; los vídeos adicionales se crean aparte.":"Free 8-session plan; further videos are created separately."}</p>
        </div>
        <button type="button" data-video-therapy-start
          disabled={recording||preparing}
          onClick={()=>{setActiveWorkspace("practices");setStudioMode("therapy");setTherapyJumpRequested(true);}}>
          {locale==="ru"?"Подобрать программу":locale==="es"?"Crear programa":"Build my plan"}<ArrowRight size={19} aria-hidden="true"/>
        </button>
      </section> : null}
        <section className={videoStyles.quickSection} data-workspace-section="video" data-video-quick-section="4"
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
              disabled={recording||preparing||!quickStyleFilmFor(theme,index)} onClick={()=>quickPickStyle(index)}>
              {/* Curated first-party film artwork; no remote image requests. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={quickStyleFilmFor(theme,index)?.poster||
                quickCanvasPoster(quickStyleSceneIds[theme][index] as LocalSceneId)}
                loading="lazy" alt=""/>
              <span>{theme==="money"?
                moneyTemplateLabels[quickStyleSceneIds[theme][index] as MoneySceneId]?.[locale]||quick.styles[index]:
                otherVideoScenes[theme as OtherTheme].find(scene=>scene.id===quickStyleSceneIds[theme][index])?.label[locale]||quick.styles[index]}</span>
            </button>)}
          </div>
          <small className={videoStyles.quickHint}>{quick.sceneHint}</small>
          
        </section>
        <details className={videoStyles.quickSection} data-workspace-section="video" data-video-procedural-options>
          <summary style={{display:"flex",alignItems:"center",gap:8,minHeight:44,cursor:"pointer",fontWeight:700,color:"#18533e"}}>
            <Sparkles size={17} aria-hidden="true"/>
            {locale==="ru"?"Бесплатная генерация анимации":locale==="es"?"Generación gratuita de animaciones":"Free original animation"}
          </summary>
          <div role="group" style={{display:"flex",flexWrap:"wrap",gap:8,margin:"12px 0"}}>
            <button type="button" data-free-video-source="catalog" disabled={recording||preparing}
              aria-pressed={creationMode==="catalog"}
              onClick={()=>{setCreationMode("catalog");setFreeVideoPlan(null);setPreviewPlaying(false);}}>
              {locale==="ru"?"Готовые видеосцены":locale==="es"?"Escenas existentes":"Licensed film scenes"}
            </button>
            <button type="button" data-free-video-source="generated" disabled={recording||preparing}
              aria-pressed={creationMode==="generated"}
              onClick={()=>{setCreationMode("generated");setCinematicPlan(null);setActiveFreeFilmPreset(null);setResult(null);setPreviewPlaying(false);}}>
              {locale==="ru"?"Создать новые кадры":locale==="es"?"Crear imágenes originales":"Create original frames"}
            </button>
          </div>
          {creationMode==="generated" ? <>
            <MandalaFreeVideoGenerator locale={locale} theme={theme}
              disabled={recording||preparing} previewPlaying={previewPlaying}
              onPlanChange={setFreeVideoPlan}
              onPreview={()=>{if(previewPlaying){stopMovieSound();setPreviewPlaying(false);}else openAffirmationPreview();}}/>
            <button type="button" data-free-video-create disabled={!canGenerate} onClick={createQuickVideo}>
              {locale==="ru"?"Создать анимацию":locale==="es"?"Crear animación":"Create animated video"}
            </button>
          </> : null}
        </details>
        <details className={videoStyles.quickExtras} data-workspace-section="video"
          onToggle={event=>{if(event.currentTarget.open)setFirstVideoAdvancedActivated(true);}}
          data-video-first-video-advanced>
          <summary>{locale==="ru"?"Дополнительно: видео по подробному описанию":locale==="es"?"Avanzado: vídeo desde descripción":"Advanced: video from description"}</summary>
        {/* Compact first-video tool follows the third Style section,
            main video screen and the six control buttons. */}
        {firstVideoAdvancedActivated ? <MandalaFirstVideoStart locale={locale} wish={wish}
          renderOptions={{quality,brightness,audioVolumePercent:soundVolume}}
          disabled={recording||preparing} preparing={preparing} recording={recording}
          progress={progress} resultReady={Boolean(result)&&playbackStatus==="ready"&&creditConfirmed} ready={canGenerate}
          onWishChange={value=>{setWish(value);setSuggestion("");}}
          onApply={applyFirstVideoDraft}
          onCreate={()=>{
            firstVideoRequestRef.current=canGenerate;
            createQuickVideo();
          }}
          onCancel={()=>{
            const job=jobRef.current;
            if(job)stopJob(job,true);
            webCodecJobRef.current?.abort();
            firstVideoRequestRef.current=false;
          }}/> : null}
        </details>



      <section className={videoStyles.quickPhraseSection} data-workspace-section="phrases" data-video-quick-phrases aria-label={workspaceCopy[locale].phrases.title} data-ideas-subtab={ideasSubtab} data-ideas-active-tab={ideasSubtab}>
        <div className={videoStyles.ideasSubtabs} data-video-ideas-tabs role="group"
          aria-label={locale==="ru"?"Идеи: персонализация и концепция":
            locale==="es"?"Ideas: personalización y concepto":"Ideas: personalization and concept"}>
          <button type="button" data-video-ideas-tab="personalization" aria-pressed={ideasSubtab==="personalization"}
            onClick={()=>setIdeasSubtab("personalization")}>
            <Heart size={19} aria-hidden="true"/>
            {locale==="ru"?"Персонализация":locale==="es"?"Personalización":"Personalization"}
          </button>
          <button type="button" data-video-ideas-tab="concept" aria-pressed={ideasSubtab==="concept"}
            onClick={()=>setIdeasSubtab("concept")}>
            <Brain size={20} aria-hidden="true"/>
            {locale==="ru"?"Концепция":locale==="es"?"Concepto":"Concept"}
          </button>
        </div>
        <div className={videoStyles.quickSectionHeading}>
          <h3 id="quick-phrases-heading"><HandHeart size={19} aria-hidden="true"/>{locale==="ru"?"Мой запрос и тема":locale==="es"?"Mi intención y tema":"My request & topic"}</h3>
          <button type="button" className={videoStyles.quickPhrasePersonal} disabled={recording||preparing}
            onClick={()=>{
               // The old native details is now a real accessible button/region.
               // Open Text's visible settings; never synthesize a hidden click
               // or access private test results without another user action.
               setIdeasSubtab("personalization");
               setIdeasVoiceAdvancedOpen(true);
               window.requestAnimationFrame(()=>document.querySelector<HTMLElement>('[data-video-ideas-advanced-voice]')?.scrollIntoView({block:"nearest",behavior:"smooth"}));
             }}><Sparkles size={15} aria-hidden="true"/>
            {locale==="ru"?"Индивидуальный подбор":locale==="es"?"Personalizar":"Personalize"}</button>
        </div>
        {/* Personalization questions and local phrases share one renderer; voice stays optional. */}
        <div className={videoStyles.phraseEditorLead} data-video-phrase-editor-first>
          <div id="video-ideas-personalization-panel" data-video-ideas-personalization-panel hidden={ideasSubtab!=="personalization"}>
          <MandalaVideoPersonalization locale={locale} value={ideasProfile}
            onChange={setIdeasProfile} disabled={recording||preparing}
            onBack={()=>setActiveWorkspace("video")}
            onContinue={()=>{setIdeasProfileConfirmed(true);setIdeasSubtab("concept");}}/>
          <p className={videoStyles.montageMovedNote}>{locale==="ru"?"Выбор фраз — в Монтаже → Текст.":locale==="es"?"Las frases están en Montaje → Texto.":"Choose phrases in Montage → Text."}</p>
          <button type="button" className={videoStyles.montageStepNext} data-video-ideas-open-montage-text
            disabled={recording||preparing} onClick={goToMontageFromIdeas}>
            <Type size={18} aria-hidden="true"/>{locale==="ru"?"Выбрать фразы":locale==="es"?"Elegir frases":"Choose phrases"}
            <ArrowRight size={18} aria-hidden="true"/>
          </button>
          </div>
          {/* One persistent editor instance; collapsed by default in Ideas.
              Do not unmount it between workspaces or duplicate audio state. */}
          <div id="video-ideas-voice-panel" data-video-legacy-phrase-editor data-video-ideas-recording-open={ideasVoiceAdvancedOpen?"true":"false"}
            hidden={activeWorkspace!=="phrases"||ideasSubtab!=="personalization"}
            aria-hidden={activeWorkspace!=="phrases"||ideasSubtab!=="personalization"}>
            <details className={videoStyles.phraseAudioSettings}
              data-video-ideas-advanced-voice open={ideasVoiceAdvancedOpen}
              onToggle={event=>setIdeasVoiceAdvancedOpen(event.currentTarget.open)}>
              <summary><AudioLines size={18} aria-hidden="true"/>
                {locale==="ru"?"Дополнительные настройки фраз и голоса":
                  locale==="es"?"Opciones adicionales de frases y voz":
                    "Advanced phrase and voice settings"}
                <ChevronDown size={18} aria-hidden="true"/>
              </summary>
              <div role="group" data-ideas-voice-modes
                aria-label={locale==="ru"?"Выберите тип голоса":locale==="es"?"Elige voz":"Select voice mode"}>
                <button type="button" data-video-ideas-voice-mode="voice" aria-pressed={ideasVoiceMode==="voice"}
                  onClick={()=>setIdeasVoiceMode("voice")} disabled={recording||preparing}>
                  {locale==="ru"?"Голос":locale==="es"?"Voz":"Voice"}
                </button>
                <button type="button" data-video-ideas-voice-mode="my-voice" aria-pressed={ideasVoiceMode==="my-voice"}
                  onClick={()=>setIdeasVoiceMode("my-voice")} disabled={recording||preparing}>
                  {locale==="ru"?"Мой голос":locale==="es"?"Mi voz":"My Voice"}
                </button>
              </div>
              <div data-ideas-subtab="voice" data-ideas-voice-mode={ideasVoiceMode}>{deepHypnoPane}</div>
            </details>
          </div>
        </div>
        <div className={videoStyles.ideasConceptPane} id="video-ideas-concept-panel"
          data-video-ideas-concept-panel hidden={ideasSubtab!=="concept"}>
          <MandalaVideoConcept locale={locale} goal={wish} theme={theme} selectedTopic={selectedConceptTopic}
            profile={ideasProfileConfirmed?ideasProfile:null} durationSeconds={duration}
            speechTranscript={voiceTranscript} approvedConcept={approvedVideoConcept}
            ownerFields={{
              references:photoUrl?(locale==="ru"?"Фото добавлено":locale==="es"?"Foto adjuntada":"Photo attached"):null,
              delivery:`${aspect} · ${duration}s · ${locale.toUpperCase()}`,
              wordsAndVoice:`${affirmationLines.length} ${locale==="ru"?"фраз":locale==="es"?"frases":"phrases"} · ${voiceTranscript?"voice transcript":"text/voice settings"}`,
              soundtrack:attachedAudio?appliedAudioName:(locale==="ru"?"Без музыки":locale==="es"?"Sin música":"No music"),
              timelineBinding:voiceVisualPlan?.canExport?`${voiceVisualPlan.shots.length} ${locale==="ru"?"проверенных кадров":locale==="es"?"tomas verificadas":"verified shots"}`:
                cinematicPlan?`${cinematicPlan.shots.length} ${locale==="ru"?"кадров на проверке":locale==="es"?"tomas en revisión":"shots to review"}`:null,
              creationMode:creationMode
            }}
            styleIndex={quickStyleIndex} phrases={affirmationLines}
            signedIn={creditSession==="signed_in"}
            loginUnavailable={creditSession==="unavailable"}
            disabled={recording||preparing}
            onRefreshLogin={()=>void refreshCreditSession()}
            onOpenGoal={()=>{setActiveWorkspace("video");}}
            onOpenStyle={()=>{setActiveWorkspace("editor");setMontagePanel("effects");}}
            onApprove={approved=>{
              setApprovedVideoConcept(approved);
              // Approval is local and free: only unedited storyboard overlays may change.
              // Existing manually edited text clips, voice, music and media are retained.
              if(!timelineTextClips?.length){
                setMontageScriptText(approved.sceneOutline.join("\n"));
                if(!approved.storyboard?.length&&cinematicPlan?.version===FREE_FILM_PLAN_VERSION&&
                  cinematicPlan.shots.length>=4&&captionMode!=="custom"){
                  setCinematicPlan(current=>current?.version===FREE_FILM_PLAN_VERSION
                    ? {...current,shots:current.shots.map((shot,index)=>({
                      ...shot,overlayText:normalizeStageCaption(approved.sceneOutline[index%4]||"")
                    }))} as CinematicStoryboard:current);
                }
              }
              setPreviewPlaying(false);
              setNotice(approved.storyboard?.length?
                (locale==="ru"?"История одобрена. В Монтаже проверьте реальные кадры на соответствие сценам. Неподходящие материалы не подставляем.":
                 locale==="es"?"Historia aprobada. En Montaje comprueba que las tomas reales correspondan a cada escena.":
                 "Story approved. In Montage, check that real footage matches each scene; unrelated clips will not be substituted."):
                (locale==="ru"?"Концепция одобрена. Выберите стиль и аудио в разделе «Монтаж».":
                 locale==="es"?"Concepto aprobado. Elige el estilo y audio en Montaje.":
                 "Concept approved. Choose style and audio in Montage before making the video."));
              setActiveWorkspace("editor");setMontagePanel("effects");
            }}/>
        </div>
        <div data-video-director-idea-controls hidden={ideasSubtab!=="personalization"} />
        <button type="button" className={videoStyles.phraseAudioNext}
          data-video-phrase-audio-shortcut hidden={ideasSubtab!=="personalization"}
          disabled={recording||preparing}
          onClick={()=>{
            // The advanced voice editor lives in Ideas. Reveal it on an actual
            // visitor action before trying to focus the nested audio settings.
            setIdeasSubtab("personalization");
            setIdeasVoiceAdvancedOpen(true);
            setPhraseAudioExpanded(true);
            window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
              document.querySelector("[data-video-ideas-advanced-voice]")?.scrollIntoView({behavior:"smooth",block:"nearest"})));
          }}>
          <Music2 size={19} aria-hidden="true"/>
          {locale==="ru"?"Настроить аудиогид, музыку и голос":
            locale==="es"?"Configurar audioguía, música y voz":"Set up audio guidance, music & voice"}
          <ArrowRight size={17} aria-hidden="true"/>
        </button>
      </section>
      <section className={videoStyles.quickPhraseSection} data-workspace-section="effects"
        data-video-effects-panel aria-label={workspaceCopy[locale].effects.title}>
        {activeWorkspace==="effects" ? <div id="video-hypnocorrection-mobile" data-video-hypnocorrection-panel>
          <MandalaHypnocorrectionMobile locale={locale} initialGroup={hypnoEntryGroup} disabled={recording||preparing||hypnoAudioBusy}
            affirmations={affirmations} onAffirmationsChange={setAffirmations}
            light={hypnoLight} onLightChange={next=>{setHypnoLight(next);setPreviewPlaying(false);}}
            posters={{
              phrases:activeFilm?.poster||quickCanvasPoster(otherVideoScenes.energy[0].id),
              audio:"/images/holistic-house/support-reference-avatar.webp",
              visual:getThemedRealFilm("energy",otherVideoScenes.energy[1].id)?.poster||quickCanvasPoster(otherVideoScenes.energy[1].id),
            }}
            hasVoiceFile={Boolean(hypnoSpeechSource)}
            voiceActive={Boolean(hypnoSpeechSource&&attachedAudio?.kind==="file"&&attachedAudio.narration&&audioRights)}
            voiceEditor={activeWorkspace==="effects"?hypnoVoiceEditor:null}
            whisperEnabled={hypnoWhisperEnabled} binauralEnabled={hypnoBinauralEnabled}
            beatHz={hypnoBeatHz} repeatEverySeconds={hypnoRepeatEvery}
            whisperGain={hypnoWhisperGain} audioEffectBusy={hypnoAudioBusy}
            onToggleVoice={toggleHypnoVoice} onToggleWhisper={toggleHypnoWhisper}
            onToggleBinaural={toggleHypnoBinaural}
            onBeatHzChange={value=>{
              setHypnoBeatHz(value);
              if(hypnoBinauralEnabled)void applyHypnoAudioEffects({whisper:hypnoWhisperEnabled,binaural:true,beatHz:value});
            }}
            onRepeatEveryChange={value=>{
              setHypnoRepeatEvery(value);
              if(hypnoWhisperEnabled)void applyHypnoAudioEffects({whisper:true,binaural:hypnoBinauralEnabled,beatHz:hypnoBeatHz,repeatEverySeconds:value});
            }}
            onWhisperGainChange={value=>{
              setHypnoWhisperGain(value);
              if(hypnoWhisperEnabled)void applyHypnoAudioEffects({whisper:true,binaural:hypnoBinauralEnabled,beatHz:hypnoBeatHz,whisperGain:value});
            }}
            hasPhoto={!backgroundOnly&&Boolean(photoUrl)}
            onOpenPhraseEditor={()=>{
              openQuickDetailed("video-hypnosis");
              window.requestAnimationFrame(()=>document.getElementById("video-hypnosis")?.scrollIntoView({block:"nearest",behavior:"smooth"}));
            }}
            onOpenScenes={()=>openQuickDetailed("video-templates")}
            onPickPhoto={()=>{setBackgroundOnly(false);onPickPhoto();}}
            onRemovePhoto={()=>setBackgroundOnly(true)}
            status={notice} onCreate={createQuickVideo}
            onWavePreset={()=>{
              setHypnoLight({enabled:true,...recommendHypnoLight(theme,wish)});
              setAffirmations(current=>({...current,enabled:true,
                visibility:current.visibility.includes("large")?current.visibility:[...current.visibility,"large"]}));
              setPreviewPlaying(false);
            }}/>
        </div> : null}
      </section>
      {activeWorkspace==="video" ? <section className={videoStyles.quickMusicSection} data-workspace-section="video" data-video-quick-audio-choices aria-labelledby="quick-music-heading">
        <div className={videoStyles.quickSectionHeading}>
          <h3 id="quick-music-heading"><Music2 size={18} aria-hidden="true"/>
            {locale==="ru"?"Музыка и голос":locale==="es"?"Música y voz":"Music & voice"}</h3>
          <button type="button" className={videoStyles.quickPhrasePersonal}
            onClick={()=>openQuickDetailed("video-audio")}><Mic size={15} aria-hidden="true"/>
            {locale==="ru"?"Настроить":locale==="es"?"Ajustes":"Settings"}</button>
        </div>
        <div className={videoStyles.quickMusicHint} aria-live="polite">
          {locale==="ru"?"✓ В видео · ▶ Послушать · До 3 дорожек":locale==="es"
            ?"✓ Incluir · ▶ Escuchar · Hasta 3 pistas":"✓ Include in video · ▶ Listen · Up to 3 tracks"}
          {attachedPresetIds.length>0? <strong> · {attachedPresetIds.length}/3</strong>:null}
        </div>
        <div className={videoStyles.quickMusicRail} role="group" aria-label={
          locale==="ru"?"Музыкальные дорожки":locale==="es"?"Pistas musicales":"Music tracks"}>
          {featuredMelodies.slice(0,3).map((track,index)=>{
            const id=track.id as PresetId;
            const checked=attachedPresetIds.includes(id);
            const listening=samplePreviewId===id&&soundPreview;
            return <div key={id} className={videoStyles.quickMusicItem}
              data-video-quick-audio-track={id} data-video-melody-active={checked}>
              {/* The cover is an actual approved local MP4 poster. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={videoStyles.quickMusicPoster} loading="lazy" alt=""
                src={[
                  "/videos/holistic-house/film-collection-v2/meadow-morning.jpg",
                  "/videos/holistic-house/film-collection-v2/wildflower-dance.jpg",
                  "/videos/holistic-house/film-collection-v2/calm-sea.jpg",
                  "/videos/holistic-house/film-collection-v2/coastal-freedom.jpg"
                ][index]}/>
              <button type="button" className={videoStyles.quickMusicCheck}
                role="checkbox" aria-checked={checked} data-video-quick-music-check={id}
                aria-label={(checked?"✓ ":"")+track.name[locale]}
                disabled={recording||preparing||micRecording||Boolean(attachedAudio?.kind==="file"&&attachedAudio.narration)}
                onClick={()=>toggleQuickMusic(id)}>
                <span className={videoStyles.quickMusicCheckbox} aria-hidden="true">
                  {checked?<Check size={15} strokeWidth={3}/>:null}
                </span><span>{track.name[locale]}</span>
              </button>
              <button type="button" className={videoStyles.quickMusicPlay}
                aria-label={(listening?ui.soundStop:ui.soundPreview)+" — "+track.name[locale]}
                data-video-quick-music-play={id} aria-pressed={listening}
                disabled={recording||preparing||micRecording}
                onClick={()=>playQuickTrack(id)}>{listening
                  ?<Pause size={17} fill="currentColor" aria-hidden="true"/>
                  :<Play size={17} fill="currentColor" aria-hidden="true"/>}</button>
            </div>;
          })}
        </div>
        <details data-video-audio-details className={videoStyles.quickExtras}>
          <summary>{locale==="ru"?"Все мелодии и голос":locale==="es"?"Todos los sonidos y voz":"All soundtracks and voice"}</summary>
          {activeWorkspace==="video" ? deepAudioPane : null}
        </details>
      </section> : null}
        <MandalaAutoVideoDirector
          goalContinueRef={goalContinueRef}
          recipientAudioPanel={recipientAudioPanel}
          audioStoryboardReady={audioPlanApplied&&Boolean(voiceVisualPlan?.canExport)&&audioRights}
          onAudioSelectionChange={active=>{
            if(!active&&recipientAudioSelected){
              clearUploadedAudio();
              setAttachedAudio(current=>current?.kind==="file"?null:current);
            }
            setRecipientAudioSelected(active);
          }}
          onAudioToMontage={goRecipientAudioToMontage}
          locale={locale} goal={wish} theme={theme} aspect={aspect} presets={aspectFilmPresets}
          scenes={FREE_FILM_CATALOG}
          disabled={!studioHydrated||recording||preparing}
          activePresetId={usingFreeFilmCompilation?activeFreeFilmPreset:null}
          clipLabel={freeFilmClipLabel}
          audioAttached={Boolean(attachedAudio)&&!audioNeedsAttachment}
          audioTrackLabel={audioNeedsAttachment
            ?(locale==="ru"?"Не прикреплён":locale==="es"?"Sin adjuntar":"Not attached")
            :appliedAudioName}
          onOpenAudio={()=>openQuickDetailed("video-audio")}
          audioTrackId={attachedAudio?.kind==="preset"?attachedAudio.id:null}
          onPickAudio={id=>{
            const matched=curatedAudioTracks.find(track=>track.id===id&&track.kind==="melody");
            if(!matched)return;
            const chosenId=matched.id as PresetId;
            setAudioAuto(false);chooseMusic(chosenId);
            setAttachedAudio({kind:"preset",id:chosenId});
            if(previewPlaying)startMovieSound({kind:"preset",id:chosenId},soundVolume);
          }}
          onGoalChange={next=>{setWish(next.slice(0,800));setSuggestion("");setCinematicPlan(null);}}
          onConceptTopicChange={setSelectedConceptTopic}
          onCategoryChange={next=>{setQuickStyleIndex(0);selectCategory(next);}}
          onAspectChange={next=>{
            if(next===aspect)return;
            // Preserve the single edited player while switching to the only
            // physically verified video geometry for recipient gifts.
            setAspect(next);setCinematicPlan(null);setPreviewPlaying(false);
          }}
          onInvalidate={()=>{setPreviewPlaying(false);setCinematicPlan(null);}}
          helpOpen={directorChatOpen}
          onClarify={()=>{
            setDirectorChatOpen(true);
            window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
              document.querySelector("[data-video-director-chat-details]")?.scrollIntoView({
                behavior:"smooth",block:"nearest"
              })));
          }}
          onShowAll={()=>{
            // On WebKit, a queued two-frame smooth-scroll can steal the next
            // quick-workspace tap (real macOS CI 41927406194). Invalidate that
            // jump on pointer/keyboard navigation and never leave a scroll
            // animation running underneath the next tab's native click.
            const navigationToken=++quickNavTokenRef.current;
            setShowAdvancedVideo(true);
            window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
              if(navigationToken!==quickNavTokenRef.current)return;
              document.getElementById("video-templates")?.scrollIntoView({
                behavior:"instant" as ScrollBehavior,block:"start",
              });
            }));
          }}
          onContinue={()=>{
            setActiveWorkspace("phrases");setStudioMode("pump");
            setTherapyJumpRequested(false);
            window.requestAnimationFrame(()=>document.querySelector("[data-video-quick-controls]")?.scrollIntoView({
              behavior:"smooth",block:"start"
            }));
          }}
          onApply={(presetId,seconds,edit,options)=>
            applyAutoFilm(presetId,seconds,edit,aspect,options?.keepGoalFlow)}
          onCreate={createQuickVideo}
          canCreate={canStartSelectedFilm} rendering={recording||preparing}
          createFeedback={preparing||exportUnavailable?notice:""}/>
      <nav className={videoStyles.quickPracticeShortcuts} data-video-practice-shortcuts
        data-workspace-section="video" aria-label={
          locale==="ru"?"Другие способы создать практику":locale==="es"?"Otras formas de crear":"Other ways to create"}>
        {(["meditation","ritual","course"] as const).map(kind=>{
          const Icon=kind==="meditation"?Headphones:kind==="ritual"?Sparkles:Leaf;
          const label=kind==="meditation"
            ?(locale==="ru"?"Создать медитацию":locale==="es"?"Crear meditación":"Create a meditation")
            :kind==="ritual"
            ?(locale==="ru"?"Сформировать ритуал":locale==="es"?"Crear ritual":"Create a ritual")
            :(locale==="ru"?"Курс из 8 практик":locale==="es"?"Curso de 8 prácticas":"8-practice course");
          return <button type="button" key={kind} data-video-practice-shortcut={kind}
            disabled={recording||preparing} onClick={()=>{
              // Each destination uses the EXISTING guided course and its focus gate.
              setActiveWorkspace("practices");setStudioMode("therapy");
              setTherapyJumpRequested(false);setIntroPlaying(false);
              window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
                const target=kind==="meditation"?"[data-guided-meditation-step]":
                  kind==="ritual"?"[data-guided-practice-step]":"[data-guided-programme-step]";
                (document.querySelector(target)||document.querySelector("[data-video-therapy-focus]"))
                  ?.scrollIntoView({behavior:"smooth",block:"start"});
              }));
            }}>
            <Icon size={23} aria-hidden="true"/><span>{label}</span><ArrowRight size={19} aria-hidden="true"/>
          </button>;
        })}
      </nav>
      {exportUnavailable && webkitRecoveryReason?.startsWith("video_output_") &&
       recordingMimes(Boolean(attachedAudio),true).some(mime=>mime.startsWith("video/webm")) &&
       !recording && !preparing ? (
        <button type="button" data-video-webkit-webm-retry
          className={videoStyles.audioDirectLink}
          onClick={()=>void createVideo(true)}>
          {locale==="ru"?"Повторить видео в WebM · сохранить сцены и звук"
            :locale==="es"?"Reintentar en WebM · conservar las escenas y el audio"
            :"Retry video in WebM · keep scenes and sound"}
        </button>
      ):null}
      {exportUnavailable && webkitRecoveryReason &&
       !webkitRecoveryReason.startsWith("video_output_") && !recording && !preparing ? (
        <button type="button" data-video-webkit-safe-retry
          className={videoStyles.audioDirectLink}
          onClick={()=>void createVideo(false,false,true)}>
          {locale==="ru"?"Повторить в лёгком режиме · 540p / 8 кадр/с (4 сцены и звук сохраняются)"
            :locale==="es"?"Reintentar en modo ligero · 540p / 8 fps (sin perder escenas ni audio)"
            :"Retry in lighter mode · 540p / 8 fps (all scenes and audio retained)"}
        </button>
      ):null}
      {professionalMode ? <p className={videoStyles.quickHint}
        data-video-professional-branding-note role="note">
        {locale==="ru"
          ?"FREE: на готовом видео мастера будет знак Holistic House. Без знака — только при подтверждённом доступе к чистому экспорту."
          :locale==="es"
          ?"FREE: el vídeo profesional tendrá la marca Holistic House. Sin marca solo con acceso verificado."
          :"FREE professional exports include the Holistic House mark. Clean exports require verified access."}
      </p> : null}
      {professionalMode ? <MandalaProfessionalPromo
        locale={locale} presets={aspectFilmPresets} scenes={FREE_FILM_CATALOG}
        publicOffer={professionalSource?.publicOffer ?? null}
        publicPractitioner={professionalSource?.publicPractitioner ?? null}
        disabled={recording||preparing}
        onApply={(presetId,seconds,outputAspect,proposal)=>{
          // Recheck that the verified four media sources still match the chosen
          // local preset. Never invent footage, send content or bypass rights.
          const existing=FREE_FILM_PRESETS.find(item=>item.id===presetId);
          if(!existing || !proposal.montage ||
             proposal.montage.presetId!==presetId ||
             existing.clips.join("|")!==proposal.montage.sceneIds.join("|")){
            setNotice(ui.videoUnavailable);
            return;
          }
          applyAutoFilm(presetId,seconds,undefined,outputAspect);
          // Optional source-approved professional draft; not a publication.
          // Don't silently include client photos, personal hypnosis or music.
          setBackgroundOnly(true);
          setAffirmations({...defaultAffirmations,enabled:false});
          setMusic("none");setAttachedAudio(null);setAudioAuto(false);
          setWish(proposal.headline.slice(0,160));
          setCustomCaption(proposal.headline.slice(0,160));
          setCaptionMode("custom");
        }}/> : null}
      <section className={videoStyles.result} id="personal-video-result" data-video-result hidden={!result}
        aria-hidden={activeWorkspace==="ready"} inert={activeWorkspace==="ready"}
        data-video-result-mode={result?.mode==="catalog"?"catalog":"rendered"}
        data-video-recording-format={result?.mode==="catalog"?"catalog":result?.extension||"none"}>
        <h3>{playbackStatus==="ready"?(locale==="ru"?"Готовое видео":locale==="es"?"Vídeo listo":"Finished video")
          :playbackStatus==="failed"?(locale==="ru"?"Ошибка воспроизведения видео":locale==="es"?"Error al reproducir el vídeo":"Video playback failed")
          :locale==="ru"?"Проверка видео":locale==="es"?"Verificación del vídeo":"Checking your video"}</h3>
        {result ? (
          <>
            {result.mode==="catalog"?<p className={videoStyles.warning}
              data-video-catalog-fallback role="note">
              {locale==="ru"
                ?"Это исходный готовый MP4 из каталога, а не персонально смонтированное видео. Воспользуйтесь браузером с записью Canvas, чтобы создать свой ролик с выбранными параметрами."
                :locale==="es"
                ?"Este es un MP4 original del catálogo, no tu montaje personalizado. Usa un navegador compatible con la grabación Canvas para generar la versión ajustada."
                :"This is an existing catalog MP4, not your custom montage. Use a browser with Canvas recording to export your selected settings."}
            </p>:null}
            <video ref={resultVideoRef} key={result.url} src={result.url} controls playsInline preload="auto"
              onPlay={()=>setVideoEffectStarted(true)}
              onEnded={()=>{setVideoEffectEnded(true);
                window.requestAnimationFrame(()=>document.getElementById("video-effect-journey")
                  ?.scrollIntoView({block:"nearest",behavior:"smooth"}));}}
              data-mandala-video-preview
              onLoadedData={event=>confirmVideoPlayback(event.currentTarget)}
              onCanPlay={event=>confirmVideoPlayback(event.currentTarget)}
              onPlaying={event=>confirmVideoPlayback(event.currentTarget)}
              onError={event=>{
                const errorCode=event.currentTarget.error?.code||0;
                const ua=typeof navigator==="undefined"?"":navigator.userAgent;
                const safariWebKit=/AppleWebKit/i.test(ua)&&!/Chrome|Chromium|Edg|OPR/i.test(ua);
                const nativeWebm=recordingMimes(Boolean(attachedAudio),true)
                  .some(mime=>mime.startsWith("video/webm"));
                const autoRetry=shouldAutoRecoverSafariPlayback({
                  safariWebKit,format:result.extension,errorCode,nativeWebm,
                  alreadyAttempted:autoWebmRetryForRef.current===signature,
                  catalog:result.mode==="catalog"
                });
                if(autoRetry){
                  autoWebmRetryForRef.current=signature;
                  autoWebmRetryUrlRef.current=result.url;
                }
                // Fixed codes only. Never log the private movie, sound or text.
                console.warn("HH_SAFARI_FINAL_PLAYBACK:"+(
                  errorCode===4?"MEDIA_ERR_SRC_NOT_SUPPORTED":"MEDIA_ERR_OTHER"));
                setPlaybackStatus("failed");
                setNotice(autoRetry
                  ?locale==="ru"?"Safari отклонил MP4. Автоматически повторяем запись в WebM, без списания за нерабочий файл."
                    :locale==="es"?"Safari rechazó el MP4. Reintentando WebM sin cobrar por el archivo fallido."
                    :"Safari rejected MP4. Retrying in WebM automatically; the failed file is not charged."
                  :locale==="ru"
                  ?"Safari не воспроизводит этот "+result.extension.toUpperCase()+" (ошибка "+errorCode+"). Попробуйте другой формат ниже."
                  :locale==="es"
                  ?"Safari no reproduce este "+result.extension.toUpperCase()+" (error "+errorCode+"). Prueba otro formato."
                  :"Safari cannot play this "+result.extension.toUpperCase()+" (error "+errorCode+"). Try the alternative format.");
              }}/>
            {playbackStatus!=="failed"&&result.mode!=="catalog"&&creditCatalog?.chargeRequired&&creditSession!=="signed_in"
              ?<div className={videoStyles.guestPreviewActions} data-video-guest-preview-actions>
                <button type="button" data-video-guest-play onClick={()=>{
                  const video=resultVideoRef.current;
                  if(!video)return;
                  // WebKit may defer loading until this explicit guest Play gesture.
                  if(video.readyState<2)video.load();
                  void video.play().catch(()=>setNotice(locale==="ru"
                    ?"Нажмите ▶ в самом видео, чтобы начать просмотр.":
                    locale==="es"?"Pulsa ▶ en el reproductor de vídeo.":
                    "Tap ▶ in the video player to start playback."));
                }}><Play size={19} fill="currentColor" aria-hidden="true"/>
                  {locale==="ru"?"Смотреть видео":locale==="es"?"Ver vídeo":"Watch video"}
                </button>
                <p role="note" data-video-guest-save-hint>{locale==="ru"
                  ?"Смотреть можно без входа. Для скачивания нужен «Мой дом». Видео пока хранится только здесь."
                  :locale==="es"
                  ?"Puedes verlo sin entrar. Para descargar, usa Mi espacio. El vídeo solo está aquí."
                  :"Watch without sign-in. To download, use My House. The video stays in this tab."}</p>
              </div>:null}
            {playbackStatus==="ready"&&result.mode!=="catalog"?<div className={videoStyles.resultMeta}>
              <strong>{wish.trim().slice(0,60)||(locale==="ru"?"Моё персональное видео":locale==="es"?"Mi vídeo personal":"My personal video")}</strong>
              <small>{result.extension.toUpperCase()} · {aspect==="portrait"?"9:16":aspect==="square"?"1:1":"16:9"} · {Math.max(1,Math.round(result.bytes/1024))} KB</small>
            </div>:null}
            {professionalMode&&result.mode!=="catalog"&&playbackStatus==="ready" ?
              <p className={videoStyles.resultMeta} role="status" data-video-brand-status={result.brandVariant}>
                {result.brandVariant==="clean"
                  ?(locale==="ru"?"Пилот PRO · экспорт без логотипа Holistic House":
                    locale==="es"?"Piloto PRO · exportación sin marca Holistic House":
                    "PRO pilot · export without Holistic House watermark")
                  :(locale==="ru"?"FREE · скачиваемое видео с логотипом Holistic House":
                    locale==="es"?"FREE · vídeo descargado con la marca Holistic House":
                    "FREE · downloaded video with Holistic House mark")}
              </p> : null}
            {playbackStatus==="ready"&&result.mode!=="catalog"&&
              !creditConfirmed&&creditCatalog?.chargeRequired?<p role="status"
                data-video-credit-confirmation>
                {creditRetry?
                  (locale==="ru"?"Связь прервалась. Подтвердите списание без новой генерации.":
                    locale==="es"?"Conexión perdida. Confirma sin regenerar.":
                    "Connection lost. Confirm without regenerating."):
                  (locale==="ru"?"Подтверждаем списание 10 кредитов…":
                    locale==="es"?"Confirmando 10 créditos…":"Confirming 10 credits…")}
                {creditRetry?<button type="button" onClick={()=>void confirmCredit()}>
                  {locale==="ru"?"Повторить подтверждение":locale==="es"?"Reintentar":"Retry confirmation"}
                </button>:null}
              </p>:null}
            {playbackStatus==="checking"?<div data-video-playback-check>
              <p role="status">{locale==="ru"
                ?"Проверяем MP4. Safari может требовать нажатия Play."
                :locale==="es"
                ?"Verificando MP4. Safari puede requerir Reproducir."
                :"Checking MP4. Safari may require a Play tap before decoding."}</p>
              <button type="button" className={videoStyles.audioDirectLink}
                data-video-verify-playback onClick={()=>{
                  const player=resultVideoRef.current;
                  if(!player||player.error)return;
                  try {
                    if(player.readyState<2)player.load();
                    // Only native decoded video dimensions grant Ready/Save.
                    void player.play().then(()=>confirmVideoPlayback(player)).catch(()=>{
                      setNotice(locale==="ru"
                        ?"Safari не воспроизводит файл. Нажмите ▶ в видеоплеере."
                        :locale==="es"
                        ?"Safari no pudo reproducir el archivo. Pulsa ▶ en el reproductor."
                        :"Safari could not play the file. Try ▶ in the video player.");
                    });
                  } catch {setNotice(ui.videoUnavailable);}
                }}>
                <Play size={17} aria-hidden="true"/>
                {locale==="ru"?"Воспроизвести и проверить"
                  :locale==="es"?"Reproducir y verificar":"Play & verify video"}
              </button>
            </div>:null}
            {playbackStatus==="failed"?<div role="alert" data-video-playback-error>
              <p>{locale==="ru"
                ?"Этот файл не прошёл проверку воспроизведения. Видео не готово."
                :locale==="es"
                ?"El archivo no pasó la comprobación de reproducción."
                :"This video failed playback verification."}</p>
              {result.extension==="mp4"&&recordingMimes(Boolean(attachedAudio),true).some(mime=>mime.startsWith("video/webm"))
                ?<button type="button" data-video-retry-compatible className={videoStyles.download}
                  disabled={!canGenerate||recording||preparing}
                  onClick={()=>void createVideo(true)}>
                  {locale==="ru"?"Повторить запись в альтернативном WebM"
                    :locale==="es"?"Reintentar la grabación en WebM alternativo"
                    :"Retry recording in alternate WebM"}
                </button>
                :result.extension==="webm"&&recordingMimes(Boolean(attachedAudio),false,true).some(mime=>mime.startsWith("video/mp4"))
                ?<button type="button" data-video-retry-compatible className={videoStyles.download}
                  disabled={!canGenerate||recording||preparing}
                  onClick={()=>void createVideo(false,true)}>
                  {locale==="ru"?"Повторить с MP4 вместо WebM"
                    :locale==="es"?"Reintentar con MP4 en lugar de WebM"
                    :"Retry with MP4 instead of WebM"}
                </button>
                :<p>{locale==="ru"
                    ?"Доступный кодировщик на этом устройстве не работает. Попробуйте обновить Safari или создать видео на компьютере."
                    :locale==="es"
                    ?"El codificador no funciona aquí. Actualiza Safari o crea el vídeo en un ordenador."
                    :"The available recorder codec is failing. Update Safari or try a desktop browser."}</p>}
            </div>:null}
            {playbackStatus==="failed" && originalFallbackMp4 ?
              <div className={videoStyles.warning} data-video-original-fallback role="note">
                <p>{locale==="ru"
                  ?"Если запись на устройстве не работает, можно открыть исходную сцену MP4. Это НЕ ваш готовый фильм: выбранные длительность, формат, фото, фразы и музыка не применены."
                  :locale==="es"
                  ?"Si falla la grabación, puedes abrir una escena MP4 original. NO es tu vídeo personalizado: duración, formato, foto, texto y música no se aplicaron."
                  :"If recording fails, you can open an original MP4 scene. This is NOT your personalized film: duration, format, photo, captions and music were not applied."}</p>
                <a href={originalFallbackMp4} download="holistic-house-original-scene.mp4"
                  data-video-original-fallback-download className={videoStyles.audioDirectLink}>
                  {locale==="ru"?"Открыть исходную сцену MP4 (без настроек)"
                    :locale==="es"?"Abrir escena MP4 original (sin ajustes)"
                    :"Open original MP4 scene (without edits)"}
                </a>
              </div> : null}
            {playbackStatus==="ready"&&result.mode!=="catalog"&&creditConfirmed?<a href="#video-effect-journey"
              data-video-effect-open className={videoStyles.audioDirectLink}>
              {locale==="ru"?"Понравилось видео? Ответьте и сравните 7 оценок":
               locale==="es"?"¿Te gustó? Evalúa los 7 cambios":"Did you like it? Compare seven ratings"}
            </a>:null}
            {playbackStatus==="ready"&&(result.mode==="catalog"||creditConfirmed)&&
              (!creditCatalog?.chargeRequired||creditSession==="signed_in"||result.mode==="catalog") ? <>
            <div className={videoStyles.resultActions}>
              {(result.mode!=="catalog"||canOfferOriginalVideoSource(professionalMode))?<a className={videoStyles.download} href={result.url}
                download={"holistic-house-"+(backgroundOnly?(theme==="money"?"money-background":theme+"-background"):"personal-mandala")+"."+result.extension}
                onClick={event=>{
                  if(result.mode==="catalog")return;
                  event.preventDefault();
                  setDeliveryChooserOpen(true);
                }}
                data-mandala-video-download>
                <Download size={18} aria-hidden="true"/>{ui.save}{result.mode==="catalog"
                  ?" · MP4 · "+(locale==="ru"?"оригинал":locale==="es"?"original":"original")
                  :" · "+result.extension.toUpperCase()+" · "+Math.max(1,Math.round(result.bytes/1024))+" KB"}
              </a>:null}
              {result.mode!=="catalog" ? <button type="button" data-video-result-play
                onClick={()=>{const player=resultVideoRef.current;
                  if(player){player.scrollIntoView({behavior:"smooth",block:"nearest"});
                    void player.play().catch(()=>setNotice(locale==="ru"?"Не удалось воспроизвести файл. Нажмите ▶ на видео.":locale==="es"?"No se pudo reproducir. Pulsa ▶ en el vídeo.":"Playback unavailable. Try ▶ on the video."));}
                }}>
                <Play size={17} fill="currentColor" aria-hidden="true"/>
                {locale==="ru"?"Просмотреть":locale==="es"?"Ver":"Preview"}
              </button>:null}
              {result.mode!=="catalog" ? <button type="button"
                onClick={shareVideo} data-video-share>
                <Share2 size={18} aria-hidden="true"/>{ui.share}
              </button> : null}
              {result.mode!=="catalog" ? <a
                data-video-save-direct
                className={videoStyles.audioDirectLink}
                href={result.url}
                download={"holistic-house-personal."+result.extension}>
                {locale==="ru"?"Скачать файл напрямую (если меню «Файлы» не открылось)"
                  :locale==="es"?"Descargar el archivo directamente (si no se abre Compartir)"
                  :"Direct file download (if Share did not open)"}
              </a> : null}
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
            </> : null}
          </>
        ):<p>{ui.myVideosInfo}</p>}
      </section>
      
      {result&&result.mode!=="catalog"&&playbackStatus==="ready"&&creditConfirmed?
        <MandalaVideoDelivery key={result.url} locale={locale} open={deliveryChooserOpen}
          onClose={()=>setDeliveryChooserOpen(false)}
          blob={result.blob} url={result.url} extension={result.extension}
          mime={result.mime} bytes={result.bytes} theme={theme}
          aspect={aspect} duration={duration}/> : null}
       {!result?<section className={videoStyles.resultEmpty} data-video-result-empty aria-labelledby="video-result-empty-title">
        <div className={videoStyles.resultEmptyHead}>
          <Film size={18} aria-hidden="true"/>
          <h3 id="video-result-empty-title">{locale==="ru"?"Готовое видео":
            locale==="es"?"Vídeo listo":"Finished video"}</h3>
        </div>
        <div className={videoStyles.resultEmptyPreview} data-video-result-example>
          {/* First-party licensed poster; explicitly not an exported personal video. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/videos/holistic-house/film-collection-v2/meadow-morning.jpg" alt=""/>
          <span>{locale==="ru"?"ПРИМЕР · видео ещё не создано":locale==="es"?"EJEMPLO · vídeo pendiente":"EXAMPLE · video pending"}</span>
        </div>
        <p>{locale==="ru"?"Подтвердите сценарий и создайте ролик. После проверки файла здесь появятся просмотр и сохранение.":
          locale==="es"?"Confirma una historia y crea el vídeo. Aparecerán reproducir y guardar tras verificar el archivo.":
          "Confirm a storyboard and create your film. Play and Save appear after file verification."}</p>
      </section>:null}
      {studioMode==="therapy" ? <div className={videoStyles.therapyCourse} data-workspace-section="practices" id="guided-video-series">
      <button type="button" data-video-therapy-exit className={videoStyles.quickTherapy}
        disabled={recording||preparing}
        onClick={()=>{setStudioMode("pump");setActiveWorkspace("video");setTherapyJumpRequested(false);setNotice("");}}>
        <ArrowRight size={17} aria-hidden="true"/>{quick.exitTherapy}
      </button>
      <MandalaGuidedCourse locale={locale} theme={theme}
        onContextChange={updateMeditationFocus}
        onAddMeditation={script=>{
          meditationDisclosureEpochRef.current++;
          setCourseMeditationOmitted(false);
          setCourseMeditationIncluded(true);
          setCourseMeditationDraft(script);
        }}
        onOmitMeditation={()=>{
          setCourseMeditationIncluded(false);
          const epoch=++meditationDisclosureEpochRef.current;
          setCourseMeditationOmitted(true);
          // Explicit omission always revokes the parent's seed and transient narration.
          // Do not depend on a render-captured draft value: WebKit can re-open the
          // same details before the previous state transition has committed.
          setCourseMeditationDraft("");
          setAttachedAudio(current=>current?.kind==="file"&&current.nonLoop?null:current);
          const closeDetails=()=>{
            if(epoch!==meditationDisclosureEpochRef.current)return;
            const details=document.querySelector("[data-video-therapy-meditation-audio]");
            if(details instanceof HTMLDetailsElement)details.open=false;
          };
          closeDetails();
          window.requestAnimationFrame(closeDetails);
        }}
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
          data-video-scene-library data-workspace-section="video" aria-labelledby="video-scene-library-title">
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
              onClick={()=>{setSuggestion("");setCinematicPlan(null);if(moneyScene===money.id&&previewPlaying){stopMovieSound();setPreviewPlaying(false);}
                else{setMoneyScene(money.id);startMovieSound(attachedAudio,soundVolume);setPreviewPlaying(true);}}}>
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
              onClick={()=>{setSuggestion("");setCinematicPlan(null);setOtherScene(other.id);startMovieSound(attachedAudio,soundVolume);setPreviewPlaying(true);
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
              {locale==="ru"?`${FREE_FILM_PRESETS.length} готовых видеосюжетов`:locale==="es"?`${FREE_FILM_PRESETS.length} historias de vídeo`:`${FREE_FILM_PRESETS.length} ready-to-edit films`}</h3>
            <p>{locale==="ru"
               ?`${freeSceneTaxonomy.scenes.length} лицензированных MP4 и ${ORIGINAL_MOTION_SCENES.length} оригинальных анимационных MP4. Каждый монтаж — 4 разных клипа. Анимации — не съёмка.`
               :locale==="es"
               ?`${freeSceneTaxonomy.scenes.length} vídeos con licencia y ${ORIGINAL_MOTION_SCENES.length} animaciones MP4 originales. Cuatro escenas diferentes por montaje.`
               :`${freeSceneTaxonomy.scenes.length} licensed clips plus ${ORIGINAL_MOTION_SCENES.length} original abstract animation MP4s. Four distinct clips per montage; animation is not filmed footage.`}</p>
            <p><a href="/videos/holistic-house/film-collection-v3/hd-credits-20261105.html" target="_blank" rel="noopener noreferrer">{locale==="ru"?"Лицензии новых видеосцен":locale==="es"?"Créditos de los vídeos HD":"HD footage credits"}</a></p>
          </div>
          <button type="button" data-free-film-more disabled={recording||preparing}
            aria-expanded={showAllFreeFilms} onClick={()=>setShowAllFreeFilms(value=>!value)}>
            {showAllFreeFilms?(locale==="ru"?"По теме":locale==="es"?"Por tema":"By topic"):
              (locale==="ru"?`Все ${FREE_FILM_PRESETS.length}`:locale==="es"?`Ver ${FREE_FILM_PRESETS.length}`:`All ${FREE_FILM_PRESETS.length}`)}
            <ArrowRight size={16} aria-hidden="true"/>
          </button>
        </div>
        <div className={videoStyles.templateRail} role="group"
          aria-label={locale==="ru"?"Каталог бесплатных видеомонтажей":locale==="es"?
            "Catálogo de montajes gratuitos":"Free film compilation catalogue"}>
          {freeFilmOptions.map(preset=>{
            const clipTheme=FREE_FILM_CLIP_THEMES[preset.clips[0]];
            const poster=firstPartyFilmFor(clipTheme,preset.clips[0])?.poster;
            // Every currently approved MP4 has a localized editorial description.
            const clipSummary=preset.clips.map(id=>
              FREE_FILM_CATALOG_BY_ID.get(id)?.description[locale]||freeFilmClipLabel(id)).join("; ");
            return <button key={preset.id} type="button" data-free-film-preset={preset.id}
              title={clipSummary} aria-label={`${preset.label[locale]}: ${clipSummary}`}
              aria-pressed={usingFreeFilmCompilation&&activeFreeFilmPreset===preset.id}
              disabled={recording||preparing} className={videoStyles.templateTile}
              onClick={()=>{
                // Every catalogue entry must enter the exact same verified
                // catalogue mode as Auto Director. The previous inline handler
                // left creationMode="generated" active after free-animation use,
                // so the chosen preset never became a renderable four-MP4 plan.
                applyAutoFilm(preset.id,duration,undefined,aspect);
              }}>
              {poster ? <img src={poster} alt="" loading="lazy"
                style={{width:"100%",height:"100%",objectFit:"cover"}}/> : null}
              <span className={videoStyles.tileShade} aria-hidden="true"/>
              <span className={videoStyles.tileName}>{preset.label[locale]}</span>
              <span className={videoStyles.filmBadge}>{preset.id.startsWith("motion-film-")?(locale==="ru"?"АНИМАЦИЯ":locale==="es"?"ANIMACIÓN":"ANIMATION"):"4 MP4"}</span>
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
            : (locale==="ru"?"Исходные видео подготовятся после нажатия «Создать видео»."
              :locale==="es"?"Los vídeos originales se prepararán al pulsar Crear vídeo."
              :"Original MP4 clips will prepare when you press Create video.")}
        </p>:null}
      </section>

          {activeWorkspace==="video" ? deepCharacterPhotoPane : null}
        </section>

        <section className={videoStyles.quickSection} data-video-quick-tier data-workspace-section="video" data-video-quick-section="2" aria-labelledby="quick-tier-title">
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

        {/* Mobile-first montage: the first screen is for video preferences, not timeline editing. */}
        <section className={[videoStyles.quickSection,videoStyles.basicStudio].join(" ")}
          data-workspace-section="editor" data-video-basic-editor
          data-montage-panel={montagePanel}
          aria-label={locale==="ru"?"Настройки и инструменты монтажа":locale==="es"?"Opciones de montaje":"Montage options"}>
          <nav className={videoStyles.montageQuickTools} data-video-montage-tools
            aria-label={locale==="ru"?"Разделы монтажа":locale==="es"?"Secciones de montaje":"Montage sections"}>
            {([{id:"effects",Icon:Sparkles},{id:"audio",Icon:Music2},
              {id:"text",Icon:Type},{id:"promo",Icon:Zap},
              {id:"concept",Icon:Film}] as const).map(item=>
              <button type="button" key={item.id} data-video-montage-tab={item.id}
                aria-pressed={montagePanel===item.id} aria-controls="video-montage-active-panel"
                disabled={recording||preparing}
                onClick={()=>{
                  setMontagePanel(item.id);
                  if(item.id==="audio")setBasicPanelTab("music");
                }}>
                <item.Icon size={19} aria-hidden="true"/>
                <span>{({
                  promo:{ru:"Монтаж PRO",en:"Montage PRO",es:"Montaje PRO"},
                  effects:{ru:"Стиль",en:"Style",es:"Estilo"},
                  text:{ru:"Текст",en:"Text",es:"Texto"},
                  audio:{ru:"Аудио",en:"Audio",es:"Audio"},
                  concept:{ru:"Сюжет",en:"Story",es:"Guion"}
                } as const)[item.id][locale]}</span>
              </button>)}
          </nav>
          <div data-video-director-style-controls hidden={montagePanel!=="effects"} />
          <div id="video-montage-active-panel" className={videoStyles.montageActivePanel}>
          {montagePanel==="promo" ? <MandalaMontageProOffer
            locale={locale} disabled={recording||preparing}
            onGoStory={()=>{
              setMontagePanel("concept");setNotice("");
              window.requestAnimationFrame(()=>
                document.querySelector('[data-video-montage-tools]')?.scrollIntoView({behavior:"smooth",block:"start"}));
            }}
            onExplorePro={()=>{
              setActiveWorkspace("pro");setNotice("");setIntroPlaying(false);
              window.requestAnimationFrame(()=>
                document.getElementById("free-personal-video")?.scrollIntoView({behavior:"auto",block:"start"}));
            }}
          /> : null}
          {montagePanel==="concept" ? <section className={videoStyles.montagePane}
            data-video-montage-concept aria-label={locale==="ru"?"Видеоконцепт и раскадровка":
              locale==="es"?"Concepto visual y storyboard":"Video concept and storyboard"}>
            <div className={videoStyles.quickSectionHeading}>
              <div><h3>{locale==="ru"?"Видеоконцепт и раскадровка":
                locale==="es"?"Concepto visual y storyboard":"Video concept & storyboard"}</h3>
                <p>{locale==="ru"?"Соберите последовательность сцен и выберите визуальный материал для каждого кадра. Текстовый концепт остаётся отдельно в разделе «Идеи».":
                  locale==="es"?"Ordena las escenas y elige el material visual de cada toma. El concepto textual permanece en Ideas.":
                  "Build a sequence of scenes and choose the visual source for each shot. The written concept remains separately in Ideas."}</p></div>
            </div>
            {cinematicPlan?.version===FREE_FILM_PLAN_VERSION ? null : <MandalaAutomaticStoryboard
              locale={locale} goal={wish} theme={theme} durationSeconds={duration}
              aspect={aspect} styleIndex={quickStyleIndex} pace={speed}
              personalization={ideasProfileConfirmed?summarizeVideoGoalProfile(ideasProfile,locale):null}
              selectedTopic={selectedConceptTopic}
              appliedStoryKey={appliedStoryKey} phrases={affirmationLines}
              transcript={voiceTranscript} approvedConcept={approvedVideoConcept}
              scenes={FREE_FILM_CATALOG}
              appliedShots={cinematicPlan?.shots.map(shot=>({
                sceneId:shot.sceneId,startSeconds:shot.startSeconds,
                durationSeconds:shot.durationSeconds
              }))??null}
              resolveMedia={id=>{
                const source=FREE_FILM_CATALOG_BY_ID.get(id);
                const sceneTheme=FREE_FILM_CLIP_THEMES[id]||theme;
                return {poster:firstPartyFilmFor(sceneTheme,id)?.poster||null,
                  title:source?.label?.[locale]||freeFilmClipLabel(id)};
              }}
              disabled={recording||preparing}
              onPreview={second=>{
                seekTimeline(second);
                document.getElementById("video-hero")?.scrollIntoView({
                  behavior:"smooth",block:"start"
                });
              }}
              onApply={(shots,concept,key,captions)=>{
                const preset=aspectFilmPresets.find(option=>option.theme===theme);
                if(!preset)return;
                const edit:FreeFilmCompilationEdit={
                  clipIds:shots.map(shot=>shot.sceneId),
                  durationSecondsByStage:shots.map(shot=>shot.durationMs/1000),
                  captionTexts:shots.map((_,index)=>captions[index]||""),
                };
                if(applyAutoFilm(preset.id,duration,edit,"portrait",true)){
                  setAppliedStoryKey(key);
                  setMontageScriptText(captions.filter(Boolean).join("\n")||
                    concept.sceneOutline.join("\n"));
                  setNotice(locale==="ru"
                    ?"Раскадровка применена. Проверьте сцены и нажмите «Создать видео»."
                    :locale==="es"
                    ?"Guion visual aplicado. Revisa las escenas antes de crear el vídeo."
                    :"Storyboard applied. Review the scenes before creating the video.");
                }
              }}
              onOpenIdeas={()=>{setActiveWorkspace("phrases");setIdeasSubtab("concept");}}
            />}
            <button type="button" className={videoStyles.quickEdit}
              data-video-story-open-settings disabled={recording||preparing}
              onClick={()=>{setMontagePanel("settings");setMontageStyleSettingsOpen(false);}}>
              <SlidersHorizontal size={17} aria-hidden="true"/>
              {locale==="ru"?"Настройки видео":locale==="es"?"Ajustes de vídeo":"Video settings"}
            </button>
          </section> : null}
          {montagePanel==="concept" ? <div className={videoStyles.montagePreferences} data-video-montage-storyboard>
            <div className={videoStyles.montagePreferencesHeader}>
              <ListVideo size={22} aria-hidden="true"/>
              <div>
                <h3>{locale==="ru"?"Раскадровка Stories":locale==="es"?"Guion visual de Stories":"Stories storyboard"}</h3>
                <p>{locale==="ru"?"Сначала план сцен и проверенный видеоряд, затем локальная сборка MP4.":"Plan scenes and verify sources before local MP4 assembly."}</p>
              </div>
            </div>
            <label className={videoStyles.montagePreferenceItem}>
              <span>{locale==="ru"?"Формат Stories":locale==="es"?"Formato de Stories":"Story format"}</span>
              <select data-video-stories-format value={storyFormat}
                disabled={recording||preparing}
                onChange={event=>setStoryFormat(event.currentTarget.value as typeof storyFormat)}>
                <option value="visual">{getStoryFormatCopy("visual",locale).label}</option>
                <option value="motion">{getStoryFormatCopy("motion",locale).label}</option>
                <option value="talking_character">{getStoryFormatCopy("talking_character",locale).label}</option>
                <option value="ai_cinematic">{getStoryFormatCopy("ai_cinematic",locale).label}</option>
              </select>
            </label>
            <p className={videoStyles.quickTierNote} data-video-stories-format-description>
              {getStoryFormatCopy(storyFormat,locale).description}
            </p>
            {storyFormat==="ai_cinematic" ? <p role="note" data-video-stories-paid-gate>
              {locale==="ru"?"Платная генерация Veo выключена. Для отдельной сцены потребуются цена, разрешение владельца и подтверждение именно этой сцены.":"Veo generation is disabled. Any paid scene requires an exact quote, owner permission and approval for that scene."}
            </p>:null}
            {storyFormat==="talking_character" ? <p role="note" data-video-stories-character-gate>
              {locale==="ru"?"Здесь используется существующий каталог персонажей и вкладка Voice. Новая озвучка не запускается автоматически.":"Use the existing character catalogue and Voice workspace. No speech generation starts automatically."}
            </p>:null}
            <button type="button" className={videoStyles.quickGenerate} data-video-stories-create
              disabled={recording||preparing} onClick={createFiveSceneStory}>
              <Film size={18}/>{locale==="ru"?"Собрать 5 сцен · 20 сек · 9:16":locale==="es"?"Crear 5 escenas · 20 s · 9:16":"Build 5 scenes · 20 sec · 9:16"}
            </button>
            {cinematicPlan?.version===FREE_FILM_PLAN_VERSION ? <div className={videoStyles.storyboardSceneList} data-video-stories-scene-list>
              {cinematicPlan.shots.map((shot,index)=>{
                const source=FREE_FILM_CATALOG_BY_ID.get(shot.sceneId);
                const verified=verifiedCategorySource(source);
                const localPhoto=storyboardPhotoAssetsRef.current[shot.sceneId];
                const choices=FREE_FILM_CATALOG.filter(candidate=>{
                  const safe=verifiedCategorySource(candidate);
                  if(!safe||!STORY_REVIEWED_THEME_COMPATIBILITY[theme].includes(candidate.theme as VideoTheme)||
                    !isReviewedFilmedStoryScene(candidate,aspect)||
                    !verifiedSceneAspect(safe,aspect)||safe.durationSeconds<shot.durationSeconds)return false;
                  const key=canonicalSourceMasterKey(safe);
                  return Boolean(key)&&!cinematicPlan.shots.some((other,otherIndex)=>otherIndex!==index&&
                    canonicalSourceMasterKey(verifiedCategorySource(FREE_FILM_CATALOG_BY_ID.get(other.sceneId)))===key);
                });
                return <article className={videoStyles.storyboardScene} key={shot.sceneId+":"+index}
                  data-video-stories-scene={index}>
                  <div className={videoStyles.storyboardSceneHeading}>
                    <strong>{locale==="ru"?["Завязка","Контекст","Поворот","Решение","Финал"][index]||"Сцена "+(index+1):["Hook","Context","Turn","Takeaway","Close"][index]||"Scene "+(index+1)}</strong>
                    <small>{shot.durationSeconds} {ui.seconds}</small>
                  </div>
                  <p>{source?.label?.[locale]||shot.sceneId}</p>
                  <p className={videoStyles.storyboardScenePurpose}>
                    {shot.visualCue||source?.description?.[locale]||""}
                  </p>
                  <label>
                    <span>{locale==="ru"?"Видеоряд сцены":"Scene visual"}</span>
                    <select data-video-stories-source={index} value={shot.sceneId}
                      disabled={recording||preparing||choices.length===0}
                      onChange={event=>replaceStoryboardSource(index,event.currentTarget.value)}>
                      {choices.map(option=><option key={option.id} value={option.id}>
                        {option.label?.[locale]||option.id}
                      </option>)}
                    </select>
                  </label>
                  <label className={videoStyles.storyboardPhotoControls}>
                    <span>{locale==="ru"?"Фото вместо видео":"Photo fallback"}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      data-video-stories-photo={index}
                      onChange={event=>{const file=event.currentTarget.files?.[0]||null;event.currentTarget.value="";if(file)setStoryboardPhoto(shot.sceneId,file);}} />
                  </label>
                  {localPhoto?<div className={videoStyles.storyboardPhotoControls}>
                    <small>{localPhoto.name} · {localPhoto.width}×{localPhoto.height} · {locale==="ru"?"локально":"local only"}</small>
                    <button type="button" data-video-stories-photo-remove={index}
                      onClick={()=>setStoryboardPhoto(shot.sceneId,null)} disabled={recording||preparing}>
                      {locale==="ru"?"Убрать фото":"Remove photo"}
                    </button>
                  </div>:null}
                  <div className={videoStyles.storyboardSceneActions}>
                    <button type="button" data-video-stories-move="up" disabled={recording||preparing||index===0}
                      onClick={()=>moveTimelineShot(index,index-1)}>{locale==="ru"?"↑ Выше":"↑ Up"}</button>
                    <button type="button" data-video-stories-move="down" disabled={recording||preparing||index===cinematicPlan.shots.length-1}
                      onClick={()=>moveTimelineShot(index,index+1)}>{locale==="ru"?"↓ Ниже":"↓ Down"}</button>
                  </div>
                  <small className={videoStyles.storyboardSourceStatus}>
                    {verified?verified.width+"×"+verified.height+" · "+(locale==="ru"?"проверенный источник":"verified source"):
                      locale==="ru"?"Источник не прошёл проверку":"Source not verified"}
                  </small>
                </article>;
              })}
            </div>:<div className={videoStyles.storyboardEmpty} data-video-stories-empty>
              <Film size={24}/><strong>{locale==="ru"?"План ещё не создан":"No story plan yet"}</strong>
              <p>{locale==="ru"?"Выберите формат и соберите пять разных проверенных вертикальных сцен.":"Choose a format and build five distinct approved portrait scenes."}</p>
            </div>}
            <div className={videoStyles.storyboardFooterActions}>
              <button type="button" data-video-stories-settings onClick={()=>setMontagePanel("settings")}>
                <SlidersHorizontal size={16}/>{locale==="ru"?"Настройки видео":"Video settings"}
              </button>
              <button type="button" data-video-stories-preview disabled={!cinematicPlan||recording||preparing}
                onClick={()=>{setPreviewPlaying(value=>!value);setPreviewSeekSeconds(0);setPreviewPlayhead(0);}}>
                {previewPlaying?(locale==="ru"?"Пауза":"Pause"):(locale==="ru"?"Предпросмотр":"Preview")}
              </button>
            </div>
            <p className={videoStyles.quickTierNote}>{locale==="ru"?"Подбор сцен и монтаж выполняются локально. Неподходящие или неподтверждённые материалы не подменяются случайными.":"Scene selection and montage run locally. Missing or unverified media is never replaced with unrelated assets."}</p>
          </div> : null}
          {montagePanel==="settings" ? <div className={videoStyles.montagePreferences} data-video-montage-preferences>
            <div className={videoStyles.montagePreferencesHeader}>
              <SlidersHorizontal size={22} aria-hidden="true"/>
              <div><h3>{locale==="ru"?"Настройки монтажа":locale==="es"?"Ajustes del vídeo":"Video settings"}</h3>
              <p>{locale==="ru"?"Задайте основные пожелания к вашему видео":locale==="es"?"Elige cómo quieres tu vídeo":"Choose how your video should look"}</p></div>
            </div>
            <div className={videoStyles.montagePreferencesGrid}>
              <label className={videoStyles.montagePreferenceItem}>
                <span><Film size={18} aria-hidden="true"/>{ui.format}</span>
                <select data-video-montage-preference="format" value={aspect}
                  disabled={recording||preparing}
                  onChange={event=>changeVideoAspect(event.currentTarget.value as Aspect)}>
                  <option value="landscape">16:9 · {locale==="ru"?"горизонт.":locale==="es"?"horizontal":"landscape"}</option>
                  <option value="portrait">9:16 · {locale==="ru"?"вертикал.":locale==="es"?"vertical":"portrait"}</option>
                  <option value="square">1:1 · {locale==="ru"?"квадрат":locale==="es"?"cuadrado":"square"}</option>
                </select>
              </label>
              <label className={videoStyles.montagePreferenceItem}>
                <span><Clock3 size={18} aria-hidden="true"/>{ui.duration}</span>
                <select data-video-montage-preference="duration" value={duration}
                  disabled={recording||preparing}
                  onChange={event=>changeVideoDuration(Number(event.currentTarget.value) as (typeof durations)[number])}>
                  {durations.map(n=><option key={n} value={n}>{n} {ui.seconds}</option>)}
                </select>
              </label>
              <label className={videoStyles.montagePreferenceItem}>
                <span><RefreshCw size={18} aria-hidden="true"/>{locale==="ru"?"Переходы":locale==="es"?"Transiciones":"Transitions"}</span>
                <select data-video-montage-preference="transitions" value={montageTransition}
                  disabled={recording||preparing}
                  onChange={event=>{
                    const value=event.currentTarget.value as TimelineTransition;
                    setMontageTransition(value);
                    if(cinematicPlan?.shots.length&&cinematicPlan.shots.length>1){
                      recordBeforeEditorChange("montage-transition");
                      setCinematicPlan(plan=>plan?{...plan,shots:plan.shots.map((shot,index)=>
                        index===0?shot:{...shot,transitionIn:value})} as CinematicStoryboard:plan);
                    }
                  }}>
                  <option value="soft">{locale==="ru"?"Плавные":locale==="es"?"Suaves":"Smooth"}</option>
                  <option value="cut">{locale==="ru"?"Без эффекта":locale==="es"?"Cortes":"Cuts"}</option>
                  <option value="fade_black">{locale==="ru"?"Затемнение":locale==="es"?"Fundido":"Fade out"}</option>
                </select>
              </label>
              <label className={videoStyles.montagePreferenceItem}>
                <span><Zap size={18} aria-hidden="true"/>{locale==="ru"?"Темп":locale==="es"?"Ritmo":"Pace"}</span>
                <select data-video-montage-preference="speed" value={speed}
                  disabled={recording||preparing}
                  onChange={event=>setSpeed(event.currentTarget.value as Speed)}>
                  <option value="slow">{ui.slow}</option>
                  <option value="dynamic">{ui.dynamic}</option>
                </select>
              </label>
              <label className={videoStyles.montagePreferenceItem}>
                <span><Film size={18} aria-hidden="true"/>{ui.quality}</span>
                <select data-video-montage-preference="quality" value={quality}
                  disabled={recording||preparing}
                  onChange={event=>setQuality(event.currentTarget.value as Quality)}>
                  <option value="hd">{locale==="ru"?"HD · 720p":locale==="es"?"HD · 720p":"HD · 720p"}</option>
                  <option value="fullhd">{locale==="ru"?"Full HD · 1080p":locale==="es"?"Full HD · 1080p":"Full HD · 1080p"}</option>
                </select>
              </label>
          </div>
            <p className={videoStyles.montagePreferencesNote} data-video-montage-auto-sound aria-live="polite">
              <Music2 size={17} aria-hidden="true"/>
              <span>{attachedAudio?.kind==="preset"&&audioAuto
                ?(locale==="ru"?"Музыка подобрана автоматически: ":locale==="es"?"Música seleccionada automáticamente: ":"Music matched automatically: ")+appliedAudioName
                :attachedAudio
                  ?(locale==="ru"?"Звук: ":locale==="es"?"Audio: ":"Audio: ")+appliedAudioName
                  :locale==="ru"?"Без музыки":locale==="es"?"Sin música":"No music"}</span>
            </p>
            <details className={videoStyles.montageStyleSettings} data-video-editor-style-settings
              open={montageStyleSettingsOpen}
              onToggle={event=>setMontageStyleSettingsOpen(event.currentTarget.open)}>
              <summary data-video-advanced-toggle aria-expanded={montageStyleSettingsOpen}>
                <SlidersHorizontal size={17} aria-hidden="true"/>
                {locale==="ru"?"Дополнительные настройки":locale==="es"?"Más ajustes":"Additional settings"}
                <ChevronDown size={16} aria-hidden="true"/>
              </summary>
              {deepVideoPane}
              <button type="button" className={videoStyles.quickEdit} data-video-montage-photo-open
                aria-expanded={basicPanelTab==="photo"} disabled={recording||preparing}
                onClick={()=>setBasicPanelTab(current=>current==="photo"?"music":"photo")}>
                <Camera size={17} aria-hidden="true"/>
                {locale==="ru"?"Моё фото":locale==="es"?"Mi foto":"My photo"}
              </button>
              {basicPanelTab==="photo" ? deepCharacterPhotoPane : null}
            </details>
            <div className={videoStyles.montageAdvancedShortcuts}>
              <button type="button" data-video-montage-open-concept
                data-video-montage-open-storyboard disabled={recording||preparing}
                onClick={()=>{setActiveWorkspace("editor");setMontagePanel("concept");}}>
                <Film size={17} aria-hidden="true"/>
                {locale==="ru"?"Видеоконцепт и раскадровка":locale==="es"?"Concepto visual y guion":"Video concept & storyboard"}
              </button>
              <button type="button" data-video-montage-open-audio
                disabled={recording||preparing} onClick={()=>{setMontagePanel("audio");setBasicPanelTab("music");}}>
                <Music2 size={17} aria-hidden="true"/>
                {locale==="ru"?"Расширенные настройки аудио":locale==="es"?"Opciones de audio":"Advanced audio"}
              </button>
            </div>
          </div> : null}
          <div className={videoStyles.montagePane} data-video-montage-text hidden={montagePanel!=="text"}>
            <h3>{locale==="ru"?"Фразы в вашем видео":locale==="es"?"Frases de tu vídeo":"Text for your video"}</h3>
            <p className={videoStyles.montageMovedNote}>{locale==="ru"?"Выберите, измените или добавьте свои фразы. Они сразу используются в предпросмотре и экспорте.":locale==="es"?"Elige o edita tus frases. Aparecen en la vista previa y el vídeo final.":"Select or edit phrases. Your choices appear in the preview and final video."}</p>
          <MandalaVideoIdeas locale={locale} theme={theme} requestText={wish} profile={ideasProfile}
            active={activeWorkspace==="editor"&&montagePanel==="text"} disabled={recording||preparing}
            settings={affirmations}
            generating={recording||preparing} onChange={setAffirmations}
            onPendingChange={setPhrasePending} onPreview={openAffirmationPreview}
            onResetPreview={()=>{setPreviewPlaying(false);setPreviewSeekSeconds(0);setPreviewPlayhead(0);}}
            onRecord={()=>{
              setActiveWorkspace("phrases");
              // Reuse the one protected local voice recorder; no extra MediaRecorder.
              setIdeasSubtab("personalization");setIdeasVoiceMode("my-voice");
              setIdeasVoiceAdvancedOpen(true);
              window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>
                document.querySelector<HTMLElement>('[data-video-own-voice-record]')?.scrollIntoView({behavior:"smooth",block:"center"})));
            }}
            onCreate={()=>{setMontagePanel("audio");setBasicPanelTab("music");setPreviewPlaying(false);}} onGenerate={createQuickVideo} status={notice}/>
          </div>
          {montagePanel==="settings" ? <div className={videoStyles.montagePane} data-video-montage-text-tools>
          <details className={videoStyles.montageAdvancedTools} data-video-concept-text-tools>
          <summary>{locale==="ru"?"Текст, титры и монтажная лента":
            locale==="es"?"Texto, subtítulos y línea de tiempo":"Text, captions & timeline"}</summary>
        <div data-video-concept-timeline>
        <details className={videoStyles.montageScenario}
          data-workspace-section="editor" data-video-editor-scenario>
          <summary>{locale==="ru"?"Сценарий и массовое редактирование":locale==="es"?"Guion y edición múltiple":"Script · bulk edit"}</summary>
          <div className={videoStyles.montageScenarioBody}>
            <label htmlFor="video-montage-scenario"><Film size={18} aria-hidden="true"/>
              {locale==="ru"?"Сценарий":locale==="es"?"Guion":"Script"}</label>
            <p>{locale==="ru"?"Сюжет выбран во вкладке «Стиль видео». Отредактируйте строки для надписей в видео.":
              locale==="es"?"El guion viene del Estilo de vídeo. Puedes editar el texto de las escenas.":
              "Script from Video style. Edit scene captions here."}</p>
            <textarea id="video-montage-scenario" data-video-montage-script
              rows={4} maxLength={480} value={montageScriptText}
              disabled={recording||preparing} onChange={event=>setMontageScriptText(event.currentTarget.value)}/>
            <button type="button" data-video-montage-script-update
              disabled={recording||preparing||!montageScriptText.trim()}
              onClick={()=>{
                const lines=montageScriptText.split(/\r?\n/).map(line=>
                  line.replace(/^\s*\d+\.\s*/,"").trim()).filter(Boolean);
                if(!lines.length)return;
                recordBeforeEditorChange("script-update");
                if(timelineTextClips?.length){
                  // Editing the script must never erase deliberately moved captions:
                  // retain each clip ID, start and duration, updating its text only.
                  setTimelineTextClips(current=>current?.map((clip,index)=>({
                    ...clip,text:normalizeStageCaption(lines[index]||clip.text)
                  }))??null);
                }else{
                  setTimelineTextClips(null);
                  if(cinematicPlan?.version===FREE_FILM_PLAN_VERSION&&cinematicPlan.shots.length>=4){
                    setCinematicPlan(current=>current?.version===FREE_FILM_PLAN_VERSION&&current.shots.length>=4
                      ? {...current,shots:current.shots.map((shot,index)=>({
                          ...shot,overlayText:normalizeStageCaption(lines[index]||"")
                        }))} as CinematicStoryboard:current);
                  }else{
                    // A single chosen MP4 has one caption, not an invented 4-shot script.
                    setCaptionMode("custom");setCustomCaption(lines.join(" ").slice(0,60));
                  }
                }
                setNotice(locale==="ru"?"Текст сценария применён к выбранному видео.":
                  locale==="es"?"Guion aplicado al vídeo seleccionado.":"Script applied to the selected video.");
                setPreviewPlaying(false);
              }}><ArrowRight size={17} aria-hidden="true"/>
              {locale==="ru"?"Обновить сценарий":locale==="es"?"Actualizar guion":"Update script"}</button>
          </div>
        </details>
          {activeWorkspace==="editor" ? sharedMontageTimeline : null}

          <details className={videoStyles.montageAdvancedTools} data-video-montage-advanced-tools>
            <summary>{locale==="ru"?"Ещё инструменты · SRT, монтаж, черновики":locale==="es"?"Más herramientas · SRT y borradores":"More tools · SRT & drafts"}</summary>
          <div className={videoStyles.editorDraftTools} data-video-editor-smart-tools>
            <button type="button" data-video-smart-audio-cut
              disabled={recording||preparing||smartCutBusy||!usingFreeFilmCompilation||
                attachedAudio?.kind!=="file"}
              onClick={()=>void smartCutFromAudio()}>
              <Music2 size={16} aria-hidden="true"/>
              {smartCutBusy?(locale==="ru"?"Анализ ритма…":locale==="es"?
                "Analizando…":"Analyzing…"):
                locale==="ru"?"Монтаж по ритму":locale==="es"?
                "Montaje por ritmo":"Cut to audio beats"}
            </button>
            <button type="button" data-video-subtitles-import disabled={recording||preparing}
              onClick={()=>subtitleFileInputRef.current?.click()}>
              <Type size={16} aria-hidden="true"/>
              {locale==="ru"?"Импорт SRT":locale==="es"?"Importar SRT":"Import SRT"}
            </button>
            <button type="button" data-video-subtitles-export
              disabled={recording||preparing||!timelineCaptions.length}
              onClick={exportEditorSubtitles}>
              <Download size={16} aria-hidden="true"/>
              {locale==="ru"?"Экспорт SRT":locale==="es"?"Exportar SRT":"Export SRT"}
            </button>
            <input type="file" accept=".srt,text/plain" ref={subtitleFileInputRef}
              aria-label={locale==="ru"?"Файл субтитров SRT":locale==="es"?
                "Archivo SRT":"SRT subtitle file"}
              onChange={e=>{
                const file=e.currentTarget.files?.[0];
                if(file)void importEditorSubtitles(file);
              }}/>
          </div>
          <div className={videoStyles.editorDraftTools} data-video-editor-draft-tools>
            <button type="button" data-video-editor-draft-save
              disabled={recording||preparing||!usingFreeFilmCompilation||!activeFreeFilmPreset}
              onClick={saveEditorDraft}>
              <Save size={16} aria-hidden="true"/>
              {locale==="ru"?"Сохранить черновик":locale==="es"?"Guardar borrador":"Save draft"}
            </button>
            <button type="button" data-video-editor-draft-open
              disabled={recording||preparing} onClick={()=>{
                if(editorDraftInputRef.current){
                  editorDraftInputRef.current.value="";
                  editorDraftInputRef.current.click();
                }
              }}>
              <FolderOpen size={16} aria-hidden="true"/>
              {locale==="ru"?"Открыть черновик":locale==="es"?"Abrir borrador":"Open draft"}
            </button>
            <input type="file" accept=".json,application/json" ref={editorDraftInputRef}
              aria-label={locale==="ru"?"Выберите файл проекта MyTube":locale==="es"?
                "Archivo del proyecto MyTube":"Choose MyTube project file"}
              onChange={event=>{
                const file=event.currentTarget.files?.[0];
                if(file)void importEditorDraft(file);
              }}/>
          </div>
          <p className={videoStyles.editorDraftNote}>
            {locale==="ru"
              ?"Черновик хранится только в вашем файле: видеосцены и надписи сохраняются, исходные фото и аудиофайлы — нет."
              :locale==="es"
                ?"Borrador local: guarda el montaje y los textos, no fotos ni audio."
                :"Local draft: montage and captions are saved; original photos and audio are not."}
          </p>
          </details>
          </div>
          </details>
          </div> : null}
          {montagePanel==="effects" ? <div className={videoStyles.montagePane} data-video-montage-effects>
            <h3>{locale==="ru"?"Выберите стиль":locale==="es"?"Elige tu estilo":"Choose your style"}</h3>
            <div className={videoStyles.montageEffectsGrid}>
              {quickStylePosters.map((poster,index)=>{
                const sceneId=quickStyleSceneIds[theme][index];
                const film=quickStyleFilmFor(theme,index);
                const art=film?.poster||quickCanvasPoster(sceneId as LocalSceneId);
                return <button key={poster} type="button" data-video-montage-style={index}
                  aria-pressed={quickStyleIndex===index} disabled={recording||preparing||!film}
                  onClick={()=>quickPickStyle(index)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={art} alt="" loading="lazy"/>
                  <span>{quick.styles[index]}</span>
                  {quickStyleIndex===index?<Check size={17} aria-hidden="true"/>:null}
                </button>;
              })}
            </div>
            <fieldset className={videoStyles.montageEffectBrightness} disabled={recording||preparing}>
              <legend>{ui.brightness}</legend>
              <button type="button" aria-pressed={brightness==="soft"} onClick={()=>setBrightness("soft")}>{ui.soft}</button>
              <button type="button" aria-pressed={brightness==="bright"} onClick={()=>setBrightness("bright")}>{ui.bright}</button>
            </fieldset>
            <fieldset className={videoStyles.montageAspectSwitch} data-video-montage-aspect-switch
              disabled={recording||preparing}>
              <legend>{locale==="ru"?"Формат видео":locale==="es"?"Formato de vídeo":"Video format"}</legend>
              <div role="group" aria-label={locale==="ru"?"Соотношение сторон видео":locale==="es"?"Relación de aspecto":"Video aspect ratio"}>
                {([{id:"landscape",label:"16:9"},{id:"portrait",label:"9:16"}] as const).map(item=><button
                  key={item.id} type="button" data-video-montage-aspect={item.id}
                  aria-pressed={aspect===item.id} onClick={()=>changeVideoAspect(item.id)}>
                  <Film size={18} aria-hidden="true"/>{item.label}
                  {aspect===item.id?<Check size={16} aria-hidden="true"/>:null}
                </button>)}
              </div>
            </fieldset>
            <button type="button" className={videoStyles.montageStepNext}
              data-video-montage-next="audio" disabled={recording||preparing}
              onClick={()=>{setMontagePanel("audio");setBasicPanelTab("music");}}>
              <Music2 size={19} aria-hidden="true"/>
              <span>{locale==="ru"?"Далее · Аудио":
                locale==="es"?"Siguiente · Audio":"Next · Audio"}</span>
              <ArrowRight size={20} aria-hidden="true"/>
            </button>
          </div> : null}
          {montagePanel==="audio" ? <div className={videoStyles.montageAudioCompact} data-video-montage-audio>
            <div className={videoStyles.audioCompactHeading}>
              <h3>{locale==="ru"?"Выберите аудиодорожки":locale==="es"?"Elige pistas de audio":"Choose audio tracks"}
                <small>{locale==="ru"?" · до 3":locale==="es"?" · hasta 3":" · up to 3"}</small>
              </h3>
              <button type="button" className={videoStyles.audioCompactBrowse} ref={audioLibraryTriggerRef}
                data-video-audio-compact-browse aria-haspopup="dialog" aria-expanded={audioLibraryOpen}
                onClick={openAudioLibrary} disabled={recording||preparing}><Search size={15} aria-hidden="true"/>
                {locale==="ru"?"Все записи":locale==="es"?"Explorar":"Browse"}
              </button>
            </div>
            <div className={videoStyles.montageAudioFilters} role="group"
              aria-label={locale==="ru"?"Категории музыки":locale==="es"?"Categorías musicales":"Music categories"}>
              {([
                {id:"all",theme:null,mood:"all"},{id:"wellbeing",theme:"health",mood:"all"},
                {id:"focus",theme:"goals",mood:"focus"},{id:"calm",theme:"life",mood:"calm"},
                {id:"energy",theme:"energy",mood:"uplift"},{id:"love",theme:"relationships",mood:"all"}
              ] as const).map((item,index)=><button key={item.id} type="button"
                data-video-audio-category={item.id} aria-pressed={audioCategory===item.id}
                disabled={recording||preparing} onClick={()=>{
                  stopSoundPreview();setAudioCategoryOverride(item.id);setAudioThemeOverride(null);setAudioMood("all");
                  setAudioKind("melody");setAudioPace("all");setAudioSearch("");
                  setShowAllAudio(false);setAudioAuto(false);
                }}>{(locale==="ru"?["Все","Самочувствие","Фокус","Спокойствие","Энергия","Любовь"]:
                  locale==="es"?["Todo","Bienestar","Enfoque","Calma","Energía","Amor"]:
                    ["All","Wellbeing","Focus","Calm","Energy","Love"])[index]}</button>)}
            </div>
            <div className={videoStyles.audioCompactGrid} data-video-audio-compact-grid
              role="group" aria-label={locale==="ru"?"Выберите до трёх аудиодорожек":
                locale==="es"?"Selecciona hasta tres pistas":"Select up to three tracks"}>
              {filteredAudio.slice(0,12).map((track,index)=>{
                const id=track.id as PresetId;
                const checked=!uploadedAudio&&attachedPresetIds.includes(id);
                const listening=samplePreviewId===id&&soundPreview;
                const poster=quickStyleFilmFor(theme,index)?.poster ||
                  quickCanvasPoster(quickStyleSceneIds[theme][index] as LocalSceneId);
                return <article key={id} className={videoStyles.audioCompactTile}
                  data-video-audio-compact-track={id} data-selected={checked} data-audio-quality="licensed-recording">
                  {/* Verified local film stills are decorative, not invented music album art. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={poster} alt="" loading="lazy"/>
                  <button type="button" className={videoStyles.audioCompactSelect}
                    data-video-audio-compact-select={id} aria-pressed={checked}
                    aria-label={(checked?
                      locale==="ru"?"Убрать ":locale==="es"?"Quitar ":"Remove ":
                      locale==="ru"?"Добавить ":locale==="es"?"Añadir ":"Add ")+track.name[locale]}
                    disabled={recording||preparing||micRecording||Boolean(attachedAudio?.kind==="file"&&attachedAudio.narration)}
                    onClick={()=>{
                      if(!checked&&attachedPresetIds.length>=3){
                        setMusicWarning(locale==="ru"?"Выберите не более 3 дорожек. Снимите одну.":
                          locale==="es"?"Máximo 3 pistas. Quita una primero.":"Maximum 3 tracks. Remove one first.");return;
                      }
                      toggleQuickMusic(id);
                    }}>
                    <span className={videoStyles.audioCompactCheck} aria-hidden="true">
                      {checked?<Check size={16} strokeWidth={3}/>:null}
                    </span>
                    <strong>{track.name[locale]}</strong>
                    <small>{Math.floor(track.durationSeconds/60)}:{Math.round(track.durationSeconds%60).toString().padStart(2,"0")}</small>
                  </button>
                  <button type="button" className={videoStyles.audioCompactPlay}
                    data-video-audio-compact-play={id}
                    aria-label={(listening?ui.soundStop:ui.soundPreview)+" — "+track.name[locale]}
                    aria-pressed={listening} disabled={recording||preparing||micRecording}
                    onClick={()=>playQuickTrack(id)}>
                    {listening?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}
                  </button>
                </article>;
              })}
              {filteredAudio.length===0?<p role="status">{locale==="ru"?
                "По этому фильтру записей нет. Измените категорию или очистите поиск.":locale==="es"?
                "No hay pistas para este filtro. Cambia la categoría o borra la búsqueda.":
                "No recordings match this filter. Change category or clear search."}</p>:null}
              <label className={videoStyles.audioCompactUpload} data-video-audio-compact-upload-tile
                data-selected={Boolean(uploadedAudio)}>
                <Paperclip size={24} aria-hidden="true"/>
                <strong>{locale==="ru"?"Моё аудио":locale==="es"?"Mi audio":"My audio"}</strong>
                <small>{locale==="ru"?"Загрузить":locale==="es"?"Subir":"Upload"}</small>
                <input type="file" data-video-audio-compact-upload
                  accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,audio/webm,.mp3,.m4a,.wav,.aac,.mp4,.webm"
                  disabled={recording||preparing}
                  onChange={event=>{chooseAudioFile(event.currentTarget.files?.[0]);event.currentTarget.value="";}}/>
              </label>
            </div>
            <div className={videoStyles.audioCompactSelection} data-video-audio-compact-selected
              role="status" aria-live="polite"><Check size={16} aria-hidden="true"/>
              <span>{uploadedAudio?uploadedAudio.file.name:attachedPresetIds.length?appliedAudioName:
                locale==="ru"?"Выберите музыку":locale==="es"?"Elige música":"Choose music"}
                <small>{locale==="ru"?" · выбрано ":locale==="es"?" · seleccionadas ":" · selected "}
                  {attachedPresetIds.length}/3</small>
              </span>
            </div>
            {uploadedAudio?<div className={videoStyles.audioCompactRights}>
              <label><input type="checkbox" data-video-audio-compact-rights
                checked={audioRights} onChange={event=>setAudioRights(event.currentTarget.checked)}/>{ui.audioRights}</label>
              <button type="button" data-video-audio-compact-attach
                disabled={recording||preparing||micRecording||audioDurationInvalid||!audioRights}
                onClick={attachSelectedAudio}>{audioNeedsAttachment?audioUi.attach:audioUi.attached}</button>
            </div>:null}
            <div className={videoStyles.montageAudioVolume}>
              <label htmlFor="montage-audio-volume"><AudioLines size={18} aria-hidden="true"/>
                {locale==="ru"?"Громкость":locale==="es"?"Volumen":"Volume"} · {soundVolume}%
              </label>
              <input id="montage-audio-volume" type="range" data-video-audio-compact-volume
                min={0} max={100} step={5} value={soundVolume}
                disabled={recording||preparing}
                onChange={event=>setSoundVolume(Number(event.currentTarget.value))}/>
              <button type="button" data-video-audio-compact-silent
                disabled={recording||preparing}
                onClick={()=>{setAudioAuto(false);chooseMusic("none");setAttachedAudio(null);}}>{ui.noMusic}</button>
            </div>
            {audioLibraryOpen ? <div className={videoStyles.montageAudioOverlay}
              data-video-audio-library-overlay onMouseDown={event=>{
                if(event.target===event.currentTarget)closeAudioLibrary(true);
              }}>
              <section className={videoStyles.montageAudioDialog}
                data-video-audio-library-dialog data-video-audio-library
                role="dialog" aria-modal="true" aria-labelledby="video-audio-library-title">
                <div className={videoStyles.montageAudioDialogHandle} aria-hidden="true"/>
                <header className={videoStyles.montageAudioDialogHeader}>
                  <h3 id="video-audio-library-title"><Music2 size={23} aria-hidden="true"/>
                    {locale==="ru"?"Библиотека музыки":locale==="es"?"Biblioteca musical":"Music library"}
                  </h3>
                  <button type="button" ref={audioLibraryCloseRef} data-video-audio-library-close
                    aria-label={locale==="ru"?"Закрыть библиотеку":locale==="es"?"Cerrar biblioteca":"Close music library"}
                    onClick={()=>closeAudioLibrary(true)}><X size={22} aria-hidden="true"/></button>
                </header>
                <div className={videoStyles.montageAudioDialogScroll}>
                  <label className={videoStyles.audioLibrarySearch}>
                    <Search size={18} aria-hidden="true"/>
                    <input type="search" data-video-audio-library-search value={audioSearch}
                      onChange={event=>{setAudioSearch(event.currentTarget.value);setShowAllAudio(false);}}
                      placeholder={audioUi.search} aria-label={audioUi.search}/>
                  </label>
                  <div className={videoStyles.audioLibraryFilters}>
                    <label>{locale==="ru"?"Тема":locale==="es"?"Tema":"Theme"}
                      <select data-video-audio-library-theme value={audioThemeOverride||"all"}
                        onChange={event=>{setAudioCategoryOverride("all");setAudioThemeOverride(event.currentTarget.value==="all"?null:event.currentTarget.value as VideoTheme);setAudioAuto(false);setShowAllAudio(false);}}>
                        <option value="all">{locale==="ru"?"Все":locale==="es"?"Todas":"All"}</option>
                        {(["relationships","money","energy","goals","health","life"] as VideoTheme[]).map(id=>
                          <option key={id} value={id}>{ui.themes[id]}</option>)}
                      </select>
                    </label>
                    <label>{audioUi.mood}
                      <select data-video-audio-library-mood value={audioMood}
                        onChange={event=>{setAudioCategoryOverride("all");setAudioMood(event.currentTarget.value);setShowAllAudio(false);}}>
                        {Object.entries(audioUi.moods).map(([id,name])=><option key={id} value={id}>{name}</option>)}
                      </select>
                    </label>
                    <label>{audioUi.pace}
                      <select data-video-audio-library-pace value={audioPace}
                        onChange={event=>{setAudioCategoryOverride("all");setAudioPace(event.currentTarget.value);setShowAllAudio(false);}}>
                        {Object.entries(audioUi.paces).map(([id,name])=><option key={id} value={id}>{name}</option>)}
                      </select>
                    </label>
                  </div>
                  <small data-video-audio-library-count role="status">
                    {locale==="ru"?"Найдено мелодий: ":locale==="es"?"Melodías encontradas: ":"Melodies found: "}{filteredAudio.length}
                  </small>
                  <div className={videoStyles.audioLibraryTrackList} data-video-audio-library-tracks>
                    {filteredAudio.slice(0,showAllAudio?filteredAudio.length:5).map(track=>{
                      const selected=!uploadedAudio&&music===track.id;
                      const playing=selected&&soundPreview;
                      return <article key={track.id} className={videoStyles.audioLibraryTrack}
                        data-video-audio-library-track={track.id} data-selected={selected}>
                        <button type="button" className={videoStyles.audioLibraryTrackPlay}
                          data-video-audio-library-play={track.id}
                          aria-label={(playing?ui.soundStop:ui.soundPreview)+" — "+track.name[locale]}
                          aria-pressed={playing} disabled={recording||preparing||micRecording}
                          onClick={()=>playAudioTrack(track.id as Exclude<AmbientMusic,"none">)}>
                          {playing?<Pause size={19} fill="currentColor"/>:<Play size={19} fill="currentColor"/>}
                        </button>
                        <div className={videoStyles.audioLibraryTrackInfo}>
                          <strong>{track.name[locale]}</strong>
                          <small>{track.detail[locale]}</small>
                        </div>
                        <button type="button" className={videoStyles.audioLibraryFavorite}
                          aria-label={(audioFavorites.includes(track.id)?audioUi.unfavorite:audioUi.favorite)+" — "+track.name[locale]}
                          aria-pressed={audioFavorites.includes(track.id)}
                          onClick={()=>setAudioFavorites(list=>list.includes(track.id)?list.filter(id=>id!==track.id):[...list,track.id])}>
                          <Heart size={18} fill={audioFavorites.includes(track.id)?"currentColor":"none"}/>
                        </button>
                        <button type="button" className={videoStyles.audioLibraryTrackSelect}
                          data-video-audio-library-select={track.id}
                          aria-pressed={selected}
                          onClick={()=>{stopSoundPreview();setAudioAuto(false);chooseMusic(track.id as AmbientMusic);}}>
                          {selected?<><Check size={16}/>{audioUi.picked}</>:audioUi.pick}
                        </button>
                      </article>;
                    })}
                    {filteredAudio.length===0?<p role="status">{audioUi.empty}</p>:null}
                  </div>
                  {filteredAudio.length>5?<button type="button" className={videoStyles.audioLibraryMore}
                    data-video-audio-library-more onClick={()=>setShowAllAudio(v=>!v)}>
                    {showAllAudio?audioUi.showLess:audioUi.showMore} · {filteredAudio.length}
                  </button>:null}
                  <div className={videoStyles.audioLibrarySourceActions}>
                    <label>{ui.uploadAudio}
                      <input type="file" data-video-audio-library-upload
                        accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,audio/webm,.mp3,.m4a,.wav,.aac,.mp4,.webm"
                        disabled={recording||preparing}
                        onChange={event=>{chooseAudioFile(event.currentTarget.files?.[0]);event.currentTarget.value="";}}/>
                    </label>
                    <button type="button" disabled={recording||preparing}
                      data-video-audio-library-record onClick={()=>{if(micRecording)stopMicRecording();else void startMicRecording();}}>
                      <Mic size={17}/>{micRecording?audioUi.stopVoice:audioUi.recordVoice}
                    </button>
                  </div>
                  {uploadedAudio?<label className={videoStyles.audioLibraryRights}>
                    <input type="checkbox" data-video-audio-library-rights checked={audioRights}
                      onChange={event=>setAudioRights(event.currentTarget.checked)}/>
                    {ui.audioRights}
                  </label>:null}
                </div>
                <footer className={videoStyles.montageAudioDialogFooter}>
                  <button type="button" data-video-audio-library-cancel
                    onClick={()=>closeAudioLibrary(true)}>
                    {locale==="ru"?"Отмена":locale==="es"?"Cancelar":"Cancel"}
                  </button>
                  <button type="button" data-video-audio-library-confirm
                    disabled={recording||preparing||micRecording||audioDurationInvalid||
                      (Boolean(uploadedAudio)&&!audioRights)}
                    onClick={()=>{
                      if(audioNeedsAttachment)attachSelectedAudio();
                      closeAudioLibrary(false);
                    }}><Check size={19} aria-hidden="true"/>
                    {locale==="ru"?"Использовать эту музыку":locale==="es"?"Usar esta música":"Use this music"}
                  </button>
                </footer>
              </section>
            </div> : null}
            {/* Keep the single native audio player mounted for compact Play even with the library closed. */}
            <div className={videoStyles.audioLibraryHiddenEngine} aria-hidden="true">
                    {deepAudioPane}
          <details className={videoStyles.audioBedPanel} data-video-audio-bed-panel>
            <summary><Music2 size={17} aria-hidden="true"/>
              {locale==="ru"?"Голос + фоновая музыка":locale==="es"?
                "Voz y música de fondo":"Voice + background music"}
            </summary>
            <p className={videoStyles.audioBedInfo}>
              {locale==="ru"
                ?"Не заменяйте голос музыкой: добавьте одну из наших оригинальных мелодий отдельной дорожкой. Для работы сначала прикрепите аудиофайл."
                :locale==="es"
                ?"Mantén la voz y añade una melodía original como pista independiente. Primero adjunta un archivo de audio."
                :"Keep the attached audio and add one of our original melodies on a separate track. Attach an audio file first."}
            </p>
            <div className={videoStyles.audioBedControls}>
              <label>{locale==="ru"?"Мелодия":locale==="es"?"Melodía":"Melody"}
                <select data-video-audio-bed-select value={musicBed.id}
                  disabled={recording||preparing||attachedAudio?.kind!=="file"||!audioRights}
                  onChange={event=>changeMusicBed({
                    id:event.currentTarget.value as MyTubeMusicBed["id"]
                  })}>
                  <option value="none">{locale==="ru"?"Без фона":locale==="es"?
                    "Sin fondo":"No music bed"}</option>
                  {MYTUBE_MUSIC_BEDS.some(id=>id===musicBed.id)&&<option value={musicBed.id}>
                    {MUSIC_BED_NAMES[musicBed.id as keyof typeof MUSIC_BED_NAMES]?.[locale]||musicBed.id} · legacy
                  </option>}
                  {MYTUBE_REVIEWED_MUSIC_BEDS.map(id=><option key={id} value={id}>
                    {curatedAudioTracks.find(track=>track.id===id)?.name[locale]||id}
                  </option>)}
                </select>
              </label>
              <label>{locale==="ru"?"Громкость фона":locale==="es"?
                "Volumen de fondo":"Music volume"}: {musicBed.volumePercent}%
                <input type="range" min={0} max={60} step={5} data-video-audio-bed-volume
                  value={musicBed.volumePercent}
                  disabled={recording||preparing||attachedAudio?.kind!=="file"||
                    !audioRights||musicBed.id==="none"}
                  onChange={event=>changeMusicBed({volumePercent:Number(event.currentTarget.value)})}/>
              </label>
              <label>{locale==="ru"?"Плавное появление/затухание":locale==="es"?
                "Fundido musical":"Music fade"}
                <select data-video-audio-bed-fade value={musicBed.fadeSeconds}
                  disabled={recording||preparing||attachedAudio?.kind!=="file"||
                    !audioRights||musicBed.id==="none"}
                  onChange={event=>changeMusicBed({fadeSeconds:Number(event.currentTarget.value)})}>
                  {MYTUBE_BED_FADES.map(seconds=><option key={seconds} value={seconds}>
                    {seconds===0?(locale==="ru"?"Без затухания":locale==="es"?
                      "Sin fundido":"No fade"):seconds+"s"}
                  </option>)}
                </select>
              </label>
            </div>
            <p className={videoStyles.audioBedInfo}>
              {locale==="ru"?"В готовом видео уровни смешиваются точно. На некоторых iPhone громкость браузерного предпросмотра может отличаться."
                :locale==="es"?"La mezcla final usa los niveles elegidos; la vista previa en iPhone puede sonar diferente."
                :"The exported mix uses the selected levels; native iPhone preview volume may differ."}
            </p>
          </details>
                  </div>
            {musicWarning?<p role="alert" className={videoStyles.montageAudioWarning}>{musicWarning}</p>:null}
          </div> : null}
          </div>
        </section>

        {activeWorkspace==="pro"?<MandalaFreeGreeting
          locale={locale} selected={greetingCharacter} sceneKey={greetingSceneKey} theme={theme}
          disabled={recording||preparing||micRecording}
          onSelect={character=>{
            setGreetingCharacter(character);
            stopMovieSound();setPreviewPlaying(false);
            const at=Math.max(0,duration-FREE_GREETING_DURATION+1.15);
            setPreviewSeekSeconds(at);setPreviewPlayhead(at);
          }}
          onPreview={()=>{
            const at=Math.max(0,duration-FREE_GREETING_DURATION);
            stopMovieSound();setPreviewPlaying(false);
            setPreviewSeekSeconds(at);setPreviewPlayhead(at);
            if(attachedAudio)startMovieSound(attachedAudio,soundVolume,at);
            setPreviewPlaying(true);
            const film=premiumVideoRef.current;
            if(film&&activeFilm){
              film.muted=true;
              void film.play().catch(()=>setPreviewPlaying(false));
            }
            document.querySelector("[data-video-preview-frame]")
              ?.scrollIntoView({block:"center",behavior:"smooth"});
          }}/>:null}
        <MandalaProEnhance locale={locale} disabled={!studioHydrated||recording||preparing||micRecording}
          onGenerateFree={createQuickVideo}
          onPickPhoto={onPickPhoto} photoSelected={Boolean(photoUrl)} photoPending={photoPending}
          proWish={wish} onProWishChange={setWish}
          freeButtonLabel={creditCatalog?.chargeRequired&&creditSession!=="guest"
            ? (locale==="ru"?"Создать видео · ":locale==="es"?"Crear vídeo · ":"Create video · ")+creditCatalog.priceCredits+" XP"
            : guestFirstVideoUsed
              ? (locale==="ru"?"Создать следующее видео":locale==="es"?"Crear otro vídeo":"Create another video")
              : undefined}
          proTools={activeWorkspace==="pro"?<button type="button" data-video-pro-open-montage-storyboard
            onClick={()=>{setActiveWorkspace("editor");setMontagePanel("concept");}}>
            <Film size={17} aria-hidden="true"/>{locale==="ru"?"Открыть видеоконцепт в Монтаже":
              locale==="es"?"Abrir el storyboard en Montaje":"Open video storyboard in Montage"}
            <ArrowRight size={16} aria-hidden="true"/>
          </button>:null}
          standardEditor={<section className={videoStyles.quickSection}
            data-workspace-section="pro" data-video-final-editor
            aria-label={locale==="ru"?"Монтаж сцен":locale==="es"?"Montaje de escenas":"Scene editor"}>
            <div className={videoStyles.quickSectionHeading}>
              <h3><Film size={20} aria-hidden="true"/>{locale==="ru"?"Монтажная лента":locale==="es"?"Línea de montaje":"Multitrack timeline"}</h3>
            </div>
            {activeWorkspace==="pro"?sharedMontageTimeline:null}
            <div className={videoStyles.editorActions}>
              <button type="button" disabled={recording||preparing||!source}
                onClick={openAffirmationPreview}><Play size={17} aria-hidden="true"/>
                {locale==="ru"?"Предпросмотр":locale==="es"?"Vista previa":"Preview"}</button>
            </div>
          </section>}
          onChooseCatalog={setProCatalogKind}
          >
        <section className={videoStyles.quickSection} data-video-quick-personal data-workspace-section="pro" aria-labelledby="quick-personal-title">
          <div className={videoStyles.quickSectionHeading}>
            <h3 id="quick-personal-title"><Sparkles size={21} aria-hidden="true"/>{locale==="ru"?"Сюжеты и персонажи":locale==="es"?"Historias y personajes":"Stories & characters"}</h3>
          </div>
          <MandalaStoriesCharacters locale={locale} theme={theme} requestedKind={proCatalogKind}
            disabled={recording||preparing||micRecording} applied={appliedStory}
            onApply={next=>{
              if(storySelectionItems(next).some(item=>item.capability!=="local"))return;
              const scene=availableStoryScene(next);
              if(scene){
                if(cinematicPlan?.version===FREE_FILM_PLAN_VERSION && cinematicPlan.shots.length>=4){
                  const source=otherVideoScenes[scene.theme].find(item=>item.id===scene.id);
                  if(!source)return;
                  const visualCue=source.label[locale];
                  setCinematicPlan({...cinematicPlan,shots:cinematicPlan.shots.map((shot,index)=>index===0
                    ? {...shot,theme:scene.theme,sceneId:scene.id,title:visualCue,visualCue,providerPrompt:source.label.en}
                    : shot)});
                  setActiveFreeFilmPreset(null);
                }else{
                  setTheme(scene.theme);
                  setVideoCategory(scene.theme);
                  setOtherScene(scene.id as LocalSceneId);
                  setMoneyScene(null);
                  setCinematicPlan(null);
                  setQuickStyleIndex(0);
                }
              }
              setAppliedStory(next);
              setPreviewPlaying(false);
              setNotice(locale==="ru"?"Доступные сюжеты добавлены к предпросмотру и видео.":
                locale==="es"?"Los elementos disponibles se aplicaron al vídeo.":
                "Available story motifs are applied to preview and video export.");
            }}/>

          {/* Advanced director controls are now in the PRO brief tab. */}
        </section>

        {theme==="health"?<p className={videoStyles.quickHint} role="note">{quick.disclaimer}</p>:null}


        </MandalaProEnhance>
        {activeWorkspace==="practices" ? <section className={videoStyles.workspaceCourses} data-workspace-section="practices">
          <details className={videoStyles.therapyRelatedDetails}>
            <summary>{locale==="ru"?"Другие курсы и медитации":locale==="es"?"Otros cursos y meditaciones":"Other courses and meditations"}<ChevronDown size={19} aria-hidden="true"/></summary>
          <div className={videoStyles.workspaceCourseGrid}>
            <Link href={"/"+locale+"/courses"} prefetch={false}><Film size={22} aria-hidden="true"/>
              <strong>{locale==="ru"?"Курсы":locale==="es"?"Cursos":"Courses"}</strong>
              <span>{locale==="ru"?"Программы и уроки":locale==="es"?"Programas y lecciones":"Programmes & lessons"}</span><ArrowRight size={18} aria-hidden="true"/></Link>
            <Link href={"/"+locale+"/holistic-support/mobile?view=meditation#support-mobile-experience"} prefetch={false}>
              <Music2 size={22} aria-hidden="true"/><strong>{locale==="ru"?"Медитации":locale==="es"?"Meditaciones":"Meditations"}</strong>
              <span>{locale==="ru"?"Выбрать практику":locale==="es"?"Elegir práctica":"Choose a practice"}</span><ArrowRight size={18} aria-hidden="true"/></Link>
            <button type="button" disabled={recording||preparing} onClick={()=>{
              setActiveWorkspace("practices");setStudioMode("therapy");setTherapyJumpRequested(false);
            }}><HeartPulse size={22} aria-hidden="true"/>
              <strong>{locale==="ru"?"8 видеосессий":locale==="es"?"8 vídeos guiados":"8 guided sessions"}</strong>
              <span>{locale==="ru"?"Персональная программа":locale==="es"?"Plan personal":"Personal programme"}</span><ArrowRight size={18} aria-hidden="true"/></button>
          </div>
          </details>
          <details className={videoStyles.therapyAudioDetails} data-video-therapy-meditation-audio>
            <summary onClick={()=>{meditationDisclosureEpochRef.current++;}}>{locale==="ru"?"Настроить озвучку и добавить медитацию к видео":
              locale==="es"?"Configurar voz y añadir la meditación al vídeo":
              "Set up narration and add meditation to video"}<ChevronDown size={19} aria-hidden="true"/></summary>
            <div data-video-meditation-course-panel className={videoStyles.workspaceCourses}>
              <MandalaPersonalMeditation key={courseMeditationDraft ? "guided-seeded" : "guided-empty"}
                coursePreview seedScript={courseMeditationDraft}
                locale={locale} theme={theme} wish={wish} scene={sceneName} caption={caption}
                sound={attachedAudio?appliedAudioName:""}
                audioSrc={attachedAudio?.kind==="file"?(audioRights?uploadedAudio?.url||null:null):
                  attachedAudio?.kind==="preset"?presetAudioUrl(attachedAudio.id):
                    attachedAudio?.kind==="presets"?presetAudioUrl(attachedAudio.ids[0]):null}
                pace={speed} brightness={brightness}
                affirmations={affirmationLines} affirmationsEnabled={affirmations.enabled}
                focus={meditationFocus} disabled={recording||preparing}
                onNarrationReady={attachMeditationNarration}
                onNarrationInvalidated={()=>setAttachedAudio(current=>
                  current?.kind==="file"&&current.nonLoop?null:current)}/>
            </div>
          </details>
        </section> : null}
        <div className={videoStyles.quickOrderBar} data-workspace-section="editor" data-video-order-bar
          hidden={montagePanel==="promo"}>
          <div className={videoStyles.quickOrderSummary} data-video-price-summary aria-live="polite">
            <small>{practiceCopy.total}</small>
            <strong>{creditCatalog?.chargeRequired&&freeVideoSelected
              ?creditSession==="guest"
                ?(locale==="ru"?"Первое видео бесплатно":locale==="es"?"Primer vídeo gratis":"First video free")
                :creditCatalog.priceCredits+" XP"
              :selectedDraftPrice===null?practiceCopy.noQuote:
                selectedDraftPrice===0?practiceCopy.free:"$"+selectedDraftPrice.toFixed(2)}</strong>
            <small>{practiceCopy.names[practiceType]} · {practiceCopy.quality[practiceLevels[practiceType]]}
              {" · "}{creditCatalog?.chargeRequired&&freeVideoSelected
                ?creditSession==="guest"
                  ?(locale==="ru"?"Создать и смотреть без входа · скачать после входа":
                    locale==="es"?"Crear y ver sin entrar · descargar tras acceder":
                    "Create and watch without sign-in · download after sign-in")
                  :(locale==="ru"?"Списание только после готового видео":
                    locale==="es"?"Se cobra tras crear el vídeo":"Charged only after the video is ready")
                :selectedDraftPrice===0?practiceCopy.noCredits:practiceCopy.draft}</small>
          </div>
          <div className={videoStyles.stageActionPair} data-video-stage-actions="montage">
            <button type="button" className={videoStyles.stageAddButton}
              data-video-montage-next={montagePanel==="effects"?"audio":montagePanel==="audio"?"text":montagePanel==="text"?"promo":montagePanel==="promo"||montagePanel==="settings"?"concept":"hypno"}
              disabled={!studioHydrated||recording||preparing}
              onClick={continueMontageOrGenerate}>
              <Sparkles size={19} aria-hidden="true"/>
              {montagePanel==="effects"?
                (locale==="ru"?"Выбрать аудио":locale==="es"?"Elegir audio":"Choose Audio"):
                montagePanel==="audio"?
                (locale==="ru"?"Добавить текст":locale==="es"?"Añadir texto":"Add Text"):
                montagePanel==="text"?
                (locale==="ru"?"Монтаж PRO":locale==="es"?"Montaje PRO":"Montage PRO"):
                montagePanel==="promo"||montagePanel==="settings"?
                (locale==="ru"?"Сюжет":locale==="es"?"Guion":"Story"):
                (locale==="ru"?"Гипноэффекты":locale==="es"?"Efectos hipno":"Hypno effects")}
              <ArrowRight size={18} aria-hidden="true"/>
            </button>
            <button type="button" className={videoStyles.quickGenerate} data-video-quick-generate
              disabled={!studioHydrated||recording||preparing||narrationInvalid} onClick={createQuickVideo}>
              {recording||preparing?<span aria-hidden="true">◌</span>:<Play size={20} fill="currentColor" aria-hidden="true"/>}
              {recording||preparing?quick.creating:
                locale==="ru"?"Создать видео":locale==="es"?"Crear vídeo":"Create Video"}
            </button>
          </div>
          {narrationInvalid&&<p role="status" className={videoStyles.quickStatus} data-video-narration-reapproval>
            {locale==="ru"?"Озвучка больше не соответствует выбранным фразам. Обновите голос во вкладке «Идеи», затем создайте видео.":
              locale==="es"?"La voz ya no coincide con las frases. Actualiza la narración en Ideas antes de crear el vídeo.":
                "Your voice no longer matches the chosen phrases. Regenerate it in Ideas before creating the video."}
          </p>}
          {phrasePending&&<p role="status" className={videoStyles.quickStatus} data-video-phrase-approval-required>
            {locale==="ru"?"Новые фразы ещё не утверждены. Откройте вкладку «Фразы» и подтвердите выбор.":
              locale==="es"?"Tus nuevas frases requieren confirmación en la pestaña «Frases».":
              "Your edited phrases need approval in the Phrases tab before creating the video."}
          </p>}
        </div>
        <MandalaVideoEffectJourney key={videoEffectSession} locale={locale}
          status={preparing?"preparing":recording?"rendering":result&&result.mode!=="catalog"
            ?playbackStatus==="ready"?"ready":playbackStatus==="failed"?"failed":"verifying"
            :exportUnavailable?"failed":"idle"}
          progress={progress} videoStarted={videoEffectStarted} videoEnded={videoEffectEnded}/>
        {notice?<p role="status" className={videoStyles.quickStatus} aria-live="polite">{notice}</p>:null}
        <p className={videoStyles.quickPrivacy} data-workspace-section="video"><Check size={16} aria-hidden="true"/>
          {creditCatalog?.chargeRequired
            ?creditSession==="guest"
              ?(locale==="ru"?"Создать и смотреть без регистрации":
                locale==="es"?"Crea y mira el vídeo sin entrar":
                "Create and watch without sign-in")
              :(locale==="ru"?"Списание после проверки готового видео":
                locale==="es"?"Cobro tras verificar el vídeo":
                "Charged after finished video verification")
            :quick.noAI}</p>
        <button type="button" className={videoStyles.quickTherapy}
          data-workspace-section="video" data-video-quick-therapy disabled={recording||preparing}
          onClick={()=>{setActiveWorkspace("practices");setStudioMode("therapy");setQuickDetailedOpen(true);
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
                const id=recommendedAudioId;
                 if(!id){openAudioLibrary();return;}
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
                  onClick={()=>changeVideoAspect(value)}>{["9:16","16:9","1:1"][index]}</button>)}
            </div></fieldset>
            <fieldset><legend>{quick.length}</legend><div>
              {durations.map(value=><button type="button" key={value}
                data-video-quick-duration={value} disabled={recording||preparing}
                aria-pressed={duration===value} onClick={()=>{changeVideoDuration(value);}}>
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
          <label className={videoStyles.photoPortrait+" "+videoStyles.nativePhotoControl} data-video-profile-photo-picker aria-disabled={recording||preparing}>
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
            <NativePhotoInput label={photoUrl ? ui.replace : quick.pick} disabled={recording||preparing} onPhotoFileSelected={selectNativePhoto}/>
          </label>
          <div className={videoStyles.profileFocus}><small>{supportUi.focus}</small><strong>{ui.themes[lowestTheme]}</strong></div>
          <button type="button" className={videoStyles.recommendButton}
            disabled={recording||preparing} data-video-recommend-focus
            onClick={()=>selectCategory(lowestTheme)}>
            <Sparkles size={16} aria-hidden="true"/>{supportUi.recommend}
          </button>
          {photoPending?<p role="status" data-video-photo-pending className={videoStyles.warning}>{locale==="ru"?"Подготавливаем фото на устройстве…":locale==="es"?"Preparando la foto en tu dispositivo…":"Preparing photo on this device…"}</p>:null}
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
            onClick={()=>{setStudioMode(current=>current==="therapy"?"pump":"therapy");setActiveWorkspace("practices");setNotice("");}}>
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
          <label className={videoStyles.previewChoiceLink+" "+videoStyles.nativePhotoControl} data-video-photo-picker aria-disabled={recording||preparing}>
            <Camera size={14} aria-hidden="true"/>{photoUrl?ui.replace:layout.photoLink}
            <NativePhotoInput label={photoUrl ? ui.replace : quick.pick} disabled={recording||preparing} onPhotoFileSelected={selectNativePhoto}/>
          </label>
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
      {studioMode==="pump"&&activeWorkspace!=="effects" ? <>
      <div className={videoStyles.postHeroActions} data-video-hero-actions>
        <button type="button" className={videoStyles.heroCreate}
          data-video-hero-create disabled={recording||preparing} onClick={startFromHero}>
          <Play size={18} fill="currentColor" aria-hidden="true"/>{ui.create}
        </button>
      </div>

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
              onChange={event=>changeVideoAspect(event.currentTarget.value as Aspect)}>
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
              onChange={event=>{changeVideoDuration(Number(event.currentTarget.value) as (typeof durations)[number]);}}>
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








      <details className={videoStyles.extraControls} data-video-extra-settings>
        <summary>{layout.extraSettings}</summary>
      </details>
      {photoUrl&&!backgroundOnly&&!photoConsent?<p role="status" className={videoStyles.warning}>{ui.consentHelp}</p>:null}

      {recording ? (
        <div className={videoStyles.recording}>
          <div className={videoStyles.progress}><span style={{width:progress+"%"}}/></div>
          <button type="button" className={videoStyles.generate} onClick={()=>{
            const job=jobRef.current;
            if(job)stopJob(job,true);
            webCodecJobRef.current?.abort();
            setNotice("");
          }}><X size={20} aria-hidden="true"/>{ui.cancel} · {progress}%</button>
        </div>
      ):(
        <button type="button" className={videoStyles.generate} data-mandala-video-generate
          disabled={!canGenerate} onClick={()=>void createVideo()}>
          <Play size={21} fill="currentColor" aria-hidden="true"/>
          {creditCatalog?.chargeRequired
            ?creditSession==="guest"
              ?(locale==="ru"?"Первое видео бесплатно":locale==="es"?"Primer vídeo gratis":"First video free")
              :(locale==="ru"?"Создать за ":locale==="es"?"Crear por ":"Create for ")+creditCatalog.priceCredits+" XP"
            :ui.create}
        </button>
      )}
      {!source?<p role="status" className={videoStyles.warning}>{t.imagePending}</p>:null}
      {notice?<p role="status" className={videoStyles.notice} aria-live="polite"
        data-video-export-unavailable={exportUnavailable?"true":undefined}>{notice}</p>:null}
      {portraitRetry&&!recording&&!preparing?
        <button type="button" data-video-portrait-retry
          className={videoStyles.audioDirectLink}
          onClick={()=>applyAutoFilm(portraitRetry.presetId,portraitRetry.seconds,
            portraitRetry.edit,"portrait")}>
          {locale==="ru"?"Создать в 9:16":locale==="es"?"Crear en 9:16":"Create in 9:16"}
        </button>:null}
      {exportUnavailable && !result && originalFallbackMp4 ?
        <div className={videoStyles.warning} data-video-original-fallback role="note">
          <p>{locale==="ru"
            ?"Запись видео на устройстве не удалась. Можно открыть исходный MP4. Это НЕ готовый персональный ролик: фото, звук, текст, формат и длительность не применены."
            :locale==="es"
            ?"Falló la grabación. Puedes abrir el MP4 original. NO es el vídeo personalizado: foto, sonido, texto, formato y duración no están incluidos."
            :"Recording failed. You can open the original MP4. It is NOT your personal video: photo, sound, text, aspect and duration have not been applied."}</p>
          <a href={originalFallbackMp4} download="holistic-house-original-scene.mp4"
            className={videoStyles.audioDirectLink} data-video-original-fallback-download>
            {locale==="ru"?"Открыть исходную сцену MP4 (без настроек)"
              :locale==="es"?"Abrir escena MP4 original (sin ajustes)"
              :"Open original MP4 scene (without edits)"}
          </a>
        </div>:null}
      {musicWarning?<p role="status" className={videoStyles.warning}>{musicWarning}</p>:null}
      <p className={videoStyles.privacy}><Check size={15} aria-hidden="true"/>
        {creditCatalog?.chargeRequired
          ?creditSession==="guest"
            ?(locale==="ru"?"Первое видео бесплатно. Просмотр без входа; скачивание через «Мой дом».":
              locale==="es"?"Primer vídeo gratis. Míralo sin entrar; descarga desde Mi espacio.":
              "First video free. Watch without sign-in; download through My House.")
            :(locale==="ru"?"Ваше видео создаётся на устройстве; после готовности списываются 10 XP.":
              locale==="es"?"Se crea en tu dispositivo; se descuentan 10 XP al terminar.":
              "Created on your device; 10 XP charged after the finished video is verified.")
          :ui.noStorage}</p>

      </details>
      {studioMode==="therapy" && activeWorkspace!=="practices" ? <MandalaPersonalMeditation
        locale={locale} theme={theme} wish={wish} scene={sceneName} caption={caption}
        sound={attachedAudio?appliedAudioName:""}
        audioSrc={attachedAudio?.kind==="file" ? (audioRights ? uploadedAudio?.url||null : null) :
          attachedAudio?.kind==="preset" ? presetAudioUrl(attachedAudio.id) :
          attachedAudio?.kind==="presets" ? presetAudioUrl(attachedAudio.ids[0]) : null}
        pace={speed} brightness={brightness}
        affirmations={affirmationLines} affirmationsEnabled={affirmations.enabled}
        focus={meditationFocus} disabled={recording||preparing}
         onNarrationReady={attachMeditationNarration}
         onNarrationInvalidated={()=>setAttachedAudio(current=>
           current?.kind==="file"&&current.nonLoop?null:current)}/> : null}



    </section>
  );
}