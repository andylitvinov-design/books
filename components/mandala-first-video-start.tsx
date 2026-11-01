"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Film, RotateCcw, SlidersHorizontal, Sparkles, WandSparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { CinematicStoryboard } from "./mandala-cinematic-director";
import type { VideoTheme } from "@/lib/mandala/holistic-video-themes";
import { buildFirstVideoDraft } from "@/lib/mandala/first-video-director.mjs";
import { makeFirstVideoPromptRequest } from "@/lib/mandala/first-video-prompt-contract.mjs";
import { VIDEO_QUICK_TEMPLATES, getVideoQuickTemplateDraft } from "@/lib/mandala/video-quick-templates.mjs";
import css from "./mandala-first-video-start.module.css";

type FilmStyle = "warm" | "nature" | "dream" | "minimal";
type FilmAspect = "landscape" | "portrait" | "square";
type AudioChoice = "none" | "harmony" | "meditation";
type Motion = "slow" | "dynamic";
type ThemeChoice = "auto" | VideoTheme;
type Preferences = {
  theme: ThemeChoice; style: FilmStyle; aspect: FilmAspect;
  durationSeconds: 20 | 30 | 60; motion: Motion;
  music: AudioChoice; caption: boolean; avoid: string;
};
type Draft = {
  plan: CinematicStoryboard; wish: string; theme: VideoTheme;
  aspect: FilmAspect; durationSeconds: 20 | 30 | 60;
  prompt: string; descriptionLimited: boolean; limitationNote: string;
};
type Props = {
  locale: PublicLocale; wish: string; disabled: boolean;
  preparing: boolean; recording: boolean; progress: number;
  resultReady: boolean; ready: boolean;
  renderOptions: {quality:"hd"|"fullhd";brightness:"soft"|"bright";audioVolumePercent:number};
  onWishChange: (value: string) => void;
  onApply: (draft: Draft, prefs: Pick<Preferences, "motion" | "music" | "caption">) => void;
  onCreate: () => void; onCancel: () => void;
};

const initial: Preferences = {
  theme: "auto", style: "warm", aspect: "landscape",
  durationSeconds: 20, motion: "slow", music: "none",
  caption: false, avoid: "",
};
const themes: VideoTheme[] = ["energy", "money", "relationships", "goals", "life", "health"];
const l10n = {
  ru: {
    eyebrow: "ПЕРВОЕ ВИДЕО · БЕСПЛАТНО", title: "Расскажите, какое видео вы хотите",
    intro: "Ваша идея → подходящие готовые сцены → видео.",
    wish: "Ваше пожелание", placeholder: "Например: Тёплый рассвет над морем, затем дорога через цветущий сад. Хочу ощущение надежды и спокойствия.",
    wishHelp: "Пока вы не разрешите использовать AI, текст остаётся в браузере.",
    templates: "Готовые видео за одно касание", templatesHelp: "Выберите идею — сцены, музыку и формат можно изменить.", useTemplate: "Выбрать шаблон", quickResize: "Формат видео",
    filters: "Дополнительные пожелания и фильтры", filtersHelp: "Необязательно · по умолчанию подберём автоматически",
    theme: "Тема", automatic: "Автоматически", style: "Визуальный стиль",
    aspect: "Формат", length: "Продолжительность", movement: "Движение",
    music: "Музыка", caption: "Добавить короткую фразу из пожелания прямо в видео",
    avoid: "Чего не должно быть в кадре", avoidPlaceholder: "Например: море, темнота, резкие вспышки",
    prompt: "Промпт и сцены", promptHelp: "Промпт редактируется. Для бесплатного видео он выбирает только доступные сцены; новые кинематографические кадры не создаются.",
    promptPlaceholder: "Напишите пожелание выше, чтобы получить промпт.",
    refresh: "Другой вариант промпта", ai: "Улучшить с AI · бесплатно",
    aiErrors:{quota:"Достигнут лимит бесплатного AI. Локальный вариант доступен.",config:"AI не настроен на сервере. Используйте локальный вариант.",response:"AI вернул непригодный ответ. Локальный вариант сохранён.",provider:"AI-провайдер недоступен. Попробуйте позже.",timeout:"AI не ответил за 13 секунд."},
    localFallback:"Создан другой локальный вариант, без внешнего AI.",
    aiConsent: "Разрешаю отправить AI моё пожелание, выбранные фильтры и отредактированный мной промпт, если есть. Фото, аудиофайлы, тесты и профиль не передаются.",
    aiLoading: "AI готовит промпт…", aiProgress:"Локальный промпт уже готов — пока AI подбирает улучшение.", aiReady: "Промпт улучшен языковой моделью",
    local: "Локальный режиссёр · без API", aiUnavailable: "AI сейчас недоступен — локальный промпт сохранён.",
    edit: "Можно изменить", limit: "Ограничение бесплатного видео",
    create: "Создать видео бесплатно", creating: "Генерация MP4/WebM на вашем устройстве",
    cancel: "Отменить", ready: "Видео готово — открыть результат и сохранить",
    source: "4 анимированные сцены · бесплатный локальный монтаж · без XP",
    sourceLong: "Для новых людей, животных и реалистичных действий нужна отдельная AI-видеомодель. Здесь создаётся настоящее видео из существующих движущихся сцен.",
    themeOptions: { energy: "Энергия", money: "Деньги и работа", relationships: "Отношения", goals: "Цели", life: "Жизнь и природа", health: "Отдых" },
    styleOptions: { warm: "Золотой час", nature: "Живая природа", dream: "Символический сон", minimal: "Минимализм" },
    motionOptions: { slow: "Плавное", dynamic: "Более динамичное" },
    musicOptions: { none: "Без звука", harmony: "Гармония", meditation: "Медитация" },
  },
  en: {
    eyebrow: "FIRST VIDEO · FREE", title: "Tell us what you would like to see",
    intro: "Your idea → matching existing scenes → video.",
    wish: "Your idea", placeholder: "For example: A warm sunrise over the sea, followed by a path through a flower garden. A gentle sense of hope.",
    wishHelp: "Your text stays in this browser unless you explicitly agree to use an AI model.",
    templates: "One-tap video templates", templatesHelp: "Pick an idea, then adjust scenes, sound or format.", useTemplate: "Use template", quickResize: "Video format",
    filters: "Optional preferences and filters", filtersHelp: "Optional · automatic defaults",
    theme: "Theme", automatic: "Automatic", style: "Visual style",
    aspect: "Aspect ratio", length: "Duration", movement: "Movement",
    music: "Soundtrack", caption: "Put a short phrase from my wish on the video",
    avoid: "Exclude these visuals", avoidPlaceholder: "For example: sea, darkness, bright flashes",
    prompt: "Prompt and scenes", promptHelp: "Editable prompt. In free mode it selects existing scenes; it does not generate new cinematic footage.",
    promptPlaceholder: "Write your wish above to generate a prompt.",
    refresh: "Another prompt option", ai: "Enhance with AI · free",
    aiErrors:{quota:"Free AI quota reached. Local draft is available.",config:"AI is not configured. Use the local draft.",response:"AI sent an invalid reply. Local draft saved.",provider:"AI provider unavailable. Try again later.",timeout:"AI did not respond within 13 seconds."},
    localFallback:"Made another local option, without external AI.",
    aiConsent: "I agree to send my wish, selected video filters and any prompt I edited to an external AI. Photos, audio files, tests and my profile are not shared.",
    aiLoading: "AI is enhancing your prompt…", aiProgress:"Your local draft is already ready while AI works.", aiReady: "AI-enhanced prompt is ready",
    local: "Local director · no API", aiUnavailable: "AI is unavailable now — your local prompt is preserved.",
    edit: "You can edit", limit: "Free video limitation",
    create: "Create free video", creating: "Recording MP4/WebM on your device",
    cancel: "Cancel", ready: "Video ready — open and save it",
    source: "4 moving scenes · free local rendering · no XP",
    sourceLong: "New people, animals and photoreal actions require a separate AI video model. This tool exports real video assembled from existing moving scenes.",
    themeOptions: { energy: "Energy", money: "Money & work", relationships: "Relationships", goals: "Goals", life: "Life & nature", health: "Rest" },
    styleOptions: { warm: "Golden hour", nature: "Living nature", dream: "Symbolic dream", minimal: "Minimal" },
    motionOptions: { slow: "Calm", dynamic: "More dynamic" },
    musicOptions: { none: "Silent", harmony: "Harmony", meditation: "Meditation" },
  },
  es: {
    eyebrow: "PRIMER VÍDEO · GRATIS", title: "Cuéntanos qué vídeo deseas",
    intro: "Tu idea → escenas disponibles → vídeo.",
    wish: "Tu idea", placeholder: "Por ejemplo: Amanecer cálido sobre el mar, luego un sendero en un jardín de flores. Un sentimiento de esperanza.",
    wishHelp: "Tu texto permanece en el navegador sin consentimiento explícito para usar una IA.",
    templates: "Plantillas de vídeo en un toque", templatesHelp: "Elige una idea y ajusta las escenas, el sonido o el formato.", useTemplate: "Usar plantilla", quickResize: "Formato de vídeo",
    filters: "Preferencias y filtros opcionales", filtersHelp: "Opcionales · selección automática",
    theme: "Tema", automatic: "Automático", style: "Estilo visual",
    aspect: "Formato", length: "Duración", movement: "Movimiento",
    music: "Música", caption: "Añadir una frase de mi deseo al vídeo",
    avoid: "Evitar estas imágenes", avoidPlaceholder: "Por ejemplo: mar, oscuridad, destellos",
    prompt: "Prompt y escenas", promptHelp: "Puedes editarlo. En modo gratis solo selecciona escenas existentes, no crea tomas cinematográficas nuevas.",
    promptPlaceholder: "Escribe tu deseo arriba para crear el prompt.",
    refresh: "Otra opción de prompt", ai: "Mejorar con IA · gratis",
    aiErrors:{quota:"Límite de IA gratuita alcanzado. Usa el borrador local.",config:"IA no configurada. Usa el borrador local.",response:"Respuesta IA incorrecta. Guardamos el borrador.",provider:"Proveedor IA no disponible. Inténtalo más tarde.",timeout:"La IA no respondió en 13 segundos."},
    localFallback:"Se creó otra opción local, sin IA externa.",
    aiConsent: "Acepto enviar mi idea, los filtros de vídeo y el prompt que haya editado a una IA externa. No se envían fotos, audios, tests ni mi perfil.",
    aiLoading: "La IA mejora el prompt…", aiProgress:"El borrador local ya está listo mientras trabaja la IA.", aiReady: "Prompt mejorado por IA",
    local: "Director local · sin API", aiUnavailable: "IA no disponible — mantenemos el prompt local.",
    edit: "Se puede editar", limit: "Límite del vídeo gratis",
    create: "Crear vídeo gratis", creating: "Grabando MP4/WebM en tu dispositivo",
    cancel: "Cancelar", ready: "Vídeo listo — abrir y guardar",
    source: "4 escenas animadas · montaje local gratis · sin XP",
    sourceLong: "Personas, animales y acciones fotorrealistas nuevas necesitan otro modelo de vídeo. Este editor exporta escenas animadas existentes.",
    themeOptions: { energy: "Energía", money: "Dinero y trabajo", relationships: "Relaciones", goals: "Objetivos", life: "Vida y naturaleza", health: "Descanso" },
    styleOptions: { warm: "Hora dorada", nature: "Naturaleza viva", dream: "Sueño simbólico", minimal: "Minimalista" },
    motionOptions: { slow: "Suave", dynamic: "Más dinámico" },
    musicOptions: { none: "Sin sonido", harmony: "Armonía", meditation: "Meditación" },
  },
} as const;

export function MandalaFirstVideoStart({
  locale, wish, disabled, preparing, recording, progress, resultReady, ready,
  renderOptions, onWishChange, onApply, onCreate, onCancel,
}: Props) {
  const t = l10n[locale];
  // Server-rendered inputs are not interactive until React hydration has
  // installed their handlers. Prevent dropped pre-hydration keystrokes.
  const [hydrated,setHydrated] = useState(false);
  useEffect(()=>{setHydrated(true);},[]);
  const [prefs, setPrefs] = useState<Preferences>(initial);
  const [selectedFilterKeys,setSelectedFilterKeys]=useState<(keyof Preferences)[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [variant, setVariant] = useState(0);
  const [promptOverride, setPromptOverride] = useState("");
  const [mode, setMode] = useState<"local" | "manual" | "ai">("local");
  const [aiConsent, setAiConsent] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const aiRevisionRef = useRef(0);
  const aiAbortRef = useRef<AbortController | null>(null);
  const [aiStatus, setAiStatus] = useState("");
  const draft = useMemo(() => {
    try {
      return buildFirstVideoDraft({locale, wish, ...prefs, variant,
        promptOverride: mode === "local" ? "" : promptOverride}) as Draft;
    } catch (error) {
      if(error instanceof Error && ["no_compatible_licensed_scenes","no_compatible_cinematic_scenes","unsupported_scene_exclusion"].includes(error.message))return null;
      throw error;
    }
  }, [locale, wish, prefs, variant, promptOverride, mode]);
  const shownPrompt = mode === "local" ? (draft?.prompt || "") : promptOverride;

  function apply(nextWish: string, nextPrefs: Preferences, nextOverride: string, nextVariant = variant) {
    try {
      const nextDraft = buildFirstVideoDraft({
        locale, wish: nextWish, ...nextPrefs, variant: nextVariant, promptOverride: nextOverride,
      }) as Draft;
      onApply(nextDraft, nextPrefs);
    } catch (error) {
      if(!(error instanceof Error) || !["no_compatible_licensed_scenes","no_compatible_cinematic_scenes","unsupported_scene_exclusion"].includes(error.message))throw error;
    }
  }
  function changeWish(value: string) {
    const next = value.slice(0, 800);
    aiRevisionRef.current++; aiAbortRef.current?.abort(); setAiLoading(false);
    onWishChange(next); setPromptOverride(""); setMode("local"); setAiStatus(""); setVariant(0); setSelectedTemplateId(null);
    if (next.trim()) apply(next, prefs, "", 0);
  }
  function changePreferences(patch: Partial<Preferences>) {
    const next = { ...prefs, ...patch };
    aiRevisionRef.current++; aiAbortRef.current?.abort(); setAiLoading(false);
    setPrefs(next); setMode("local"); setPromptOverride(""); setAiStatus(""); setVariant(0); setSelectedTemplateId(null);
    setSelectedFilterKeys(previous=>[...new Set([...previous,...(Object.keys(patch) as (keyof Preferences)[])])]);
    if (wish.trim()) apply(wish, next, "", 0);
  }
  function changePrompt(value: string) {
    const next = value.slice(0, 1000);
    aiRevisionRef.current++; aiAbortRef.current?.abort(); setAiLoading(false);
    setPromptOverride(next); setMode("manual"); setAiStatus(""); setSelectedTemplateId(null);
    if (wish.trim()) apply(wish, prefs, next);
  }
  function resetPrompt() {
    aiRevisionRef.current++; aiAbortRef.current?.abort(); setAiLoading(false);
    const nextVariant=(variant+1)%100;
    setVariant(nextVariant); setMode("local"); setPromptOverride(""); setAiStatus(""); setSelectedTemplateId(null);
    if (wish.trim()) apply(wish, prefs, "", nextVariant);
  }
  function applyTemplate(templateId: string) {
    if (disabled || !hydrated || recording || preparing) return;
    const choice = getVideoQuickTemplateDraft(templateId, locale, prefs.avoid);
    if (!choice) return;
    const nextPrefs: Preferences = { ...initial, ...choice.preferences };
    aiRevisionRef.current++; aiAbortRef.current?.abort();
    setAiLoading(false); setAiStatus("");
    setSelectedTemplateId(choice.id);
    setPrefs(nextPrefs); setVariant(0); setMode("local"); setPromptOverride("");
    setSelectedFilterKeys(Object.keys(choice.preferences) as (keyof Preferences)[]);
    onWishChange(choice.wish);
    apply(choice.wish, nextPrefs, "", 0);
  }
  async function enhancePrompt() {
    if (disabled || aiLoading || !aiConsent || wish.trim().length<3) return;
    const revision=++aiRevisionRef.current;
    const controller=new AbortController();
    aiAbortRef.current=controller;
    const timeout=setTimeout(()=>controller.abort(),13000);
    setAiLoading(true); setAiStatus("");
    try {
      const response = await fetch("/api/holistic-support/first-video-prompt", {
        method: "POST", credentials: "same-origin", cache: "no-store", signal:controller.signal,
        redirect: "error", referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(makeFirstVideoPromptRequest({
          locale, wish: wish.slice(0,800), preferences:prefs,
          selectedFields:selectedFilterKeys,templateId:selectedTemplateId,variant,
          manualPrompt:mode==="manual"?promptOverride:null,
          renderOptions,
        })),
      });
      if (!response.ok) {
        const failure: unknown = await response.json().catch(()=>null);
        const code=failure && typeof failure==="object" && "error" in failure && typeof failure.error==="string"
          ? failure.error : "VIDEO_PROMPT_PROVIDER_UNAVAILABLE";
        throw Error(code);
      }
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("prompt" in data) ||
        typeof data.prompt !== "string" || data.prompt.length < 30 ||
        data.prompt.length > 1000) throw Error("invalid_response");
      if(revision!==aiRevisionRef.current)return;
      setPromptOverride(data.prompt); setMode("ai"); setSelectedTemplateId(null);
      const provider="provider" in data && data.provider==="gemini_free"?"Gemini":"OpenRouter";
      setAiStatus(t.aiReady+" · "+provider);
      apply(wish, prefs, data.prompt);
    } catch (error) {
      const code=controller.signal.aborted?"VIDEO_PROMPT_TIMEOUT":error instanceof Error?error.message:"";
      const category=code==="VIDEO_PROMPT_TIMEOUT"?"timeout":
        code==="RATE_LIMITED"||code==="VIDEO_PROMPT_FREE_QUOTA"?"quota":
        code==="VIDEO_PROMPT_FREE_AI_DISABLED"?"config":
        code==="VIDEO_PROMPT_INVALID_RESPONSE"?"response":"provider";
      if(revision===aiRevisionRef.current){
        // A failed free provider must not make this button look inert.
        // Never overwrite a manually edited or already AI-enhanced prompt.
        // The visible local alternative is labelled honestly, never as AI.
        const useLocal=mode==="local"&&Boolean(wish.trim());
        if(useLocal){
          const nextVariant=(variant+1)%100;
          setVariant(nextVariant);setPromptOverride("");setMode("local");
          apply(wish,prefs,"",nextVariant);
        }
        setAiStatus(t.aiErrors[category]+(useLocal?" "+t.localFallback:""));
      }
    } finally {
      clearTimeout(timeout);
      if(aiAbortRef.current===controller)aiAbortRef.current=null;
      if(revision===aiRevisionRef.current)setAiLoading(false);
    }
  }
  return <section className={css.root} data-first-free-video
    data-first-video-hydrated={hydrated?"true":"false"} aria-labelledby="first-video-title">
    <div className={css.head}>
      <span className={css.symbol}><Film size={23} aria-hidden="true"/></span>
      <div><small>{t.eyebrow}</small><h3 id="first-video-title">{t.title}</h3>
        <p>{t.intro}</p></div>
    </div>
    <label className={css.label} htmlFor="first-video-wish">{t.wish}</label>
    <textarea id="first-video-wish" data-first-video-wish className={css.wish}
      rows={2} maxLength={800} value={wish} disabled={disabled || !hydrated}
      onChange={event => changeWish(event.currentTarget.value)}
      placeholder={t.placeholder}/>
    <p className={css.subtle}>{t.wishHelp}</p>
    <div className={css.templateArea} data-first-video-templates>
      <div className={css.templateHeading}>
        <strong>{t.templates}</strong><small>{t.templatesHelp}</small>
      </div>
      <div className={css.templateStrip} role="group" aria-label={t.templates}>
        {VIDEO_QUICK_TEMPLATES.map(template =>
          <button key={template.id} type="button"
            data-first-video-template={template.id}
            className={css.templateCard}
            aria-pressed={selectedTemplateId===template.id}
            aria-label={t.useTemplate+": "+template.title[locale]}
            disabled={disabled || !hydrated}
            onClick={()=>applyTemplate(template.id)}>
            <strong>{template.title[locale]}</strong>
            <span>{template.hint[locale]}</span>
            <small>{template.aspect==="portrait"?"9:16":template.aspect==="square"?"1:1":"16:9"} · {template.durationSeconds} s</small>
          </button>)}
      </div>

      <div className={css.quickFormat} role="group" aria-label={t.quickResize} data-first-video-quick-aspect-group>
        <small>{t.quickResize}</small>
        <div className={css.quickFormatButtons}>
          {(["landscape", "portrait", "square"] as const).map(format => (
            <button type="button" key={format} data-first-video-quick-aspect={format}
              aria-pressed={prefs.aspect===format}
              disabled={disabled || !hydrated || preparing || recording}
              onClick={()=>changePreferences({aspect:format})}>
              {format==="landscape"?"16:9":format==="portrait"?"9:16":"1:1"}
            </button>
          ))}
        </div>
      </div>
    </div>

    <details className={css.disclosure} data-first-video-filters>
      <summary><span><SlidersHorizontal size={18} aria-hidden="true"/>
        <strong>{t.filters}</strong><small>{t.filtersHelp}</small></span>
        <ChevronDown size={19} aria-hidden="true"/></summary>
      <fieldset className={css.controls} disabled={disabled || !hydrated}>
        <label>{t.theme}
          <select data-first-video-theme value={prefs.theme}
            onChange={event => changePreferences({theme: event.currentTarget.value as ThemeChoice})}>
            <option value="auto">{t.automatic}</option>
            {themes.map(v => <option key={v} value={v}>{t.themeOptions[v]}</option>)}
          </select>
        </label>
        <label>{t.style}
          <select data-first-video-style value={prefs.style}
            onChange={event => changePreferences({style: event.currentTarget.value as FilmStyle})}>
            {(Object.keys(t.styleOptions) as FilmStyle[]).map(v =>
              <option key={v} value={v}>{t.styleOptions[v]}</option>)}
          </select>
        </label>
        <label>{t.aspect}
          <select data-first-video-aspect value={prefs.aspect}
            onChange={event => changePreferences({aspect: event.currentTarget.value as FilmAspect})}>
            <option value="landscape">16:9</option><option value="portrait">9:16</option>
            <option value="square">1:1</option>
          </select>
        </label>
        <label>{t.length}
          <select data-first-video-duration value={prefs.durationSeconds}
            onChange={event => changePreferences({durationSeconds: Number(event.currentTarget.value) as 20 | 30 | 60})}>
            <option value={20}>20 s</option><option value={30}>30 s</option>
            <option value={60}>60 s</option>
          </select>
        </label>
        <label>{t.movement}
          <select data-first-video-motion value={prefs.motion}
            onChange={event => changePreferences({motion: event.currentTarget.value as Motion})}>
            {(Object.keys(t.motionOptions) as Motion[]).map(v =>
              <option key={v} value={v}>{t.motionOptions[v]}</option>)}
          </select>
        </label>
        <label>{t.music}
          <select data-first-video-music value={prefs.music}
            onChange={event => changePreferences({music: event.currentTarget.value as AudioChoice})}>
            {(Object.keys(t.musicOptions) as AudioChoice[]).map(v =>
              <option key={v} value={v}>{t.musicOptions[v]}</option>)}
          </select>
        </label>
        <label className={css.wide}>{t.avoid}
          <input data-first-video-avoid type="text" maxLength={140} value={prefs.avoid}
            placeholder={t.avoidPlaceholder}
            onChange={event => changePreferences({avoid: event.currentTarget.value})}/>
        </label>
        <label className={css.checkline}>
          <input data-first-video-caption type="checkbox" checked={prefs.caption}
            onChange={event => changePreferences({caption: event.currentTarget.checked})}/>
          {t.caption}
        </label>
      </fieldset>
    </details>

    <div className={css.promptHeading}>
      <label className={css.label} htmlFor="first-video-prompt">{t.prompt}</label>
      <span><Check size={14} aria-hidden="true"/>{mode === "local" ? t.local : mode === "ai" ? "AI" : t.edit}</span>
    </div>
    <textarea id="first-video-prompt" data-first-video-prompt className={css.prompt}
      rows={4} maxLength={1000} disabled={disabled || !hydrated || !wish.trim()}
      placeholder={t.promptPlaceholder} value={wish.trim() ? shownPrompt : ""}
      onChange={event => changePrompt(event.currentTarget.value)}/>
    <p className={css.subtle}>{t.promptHelp}</p>
    <div className={css.promptActions}>
      <button type="button" className={css.reset} onClick={resetPrompt} data-first-video-refresh
        disabled={disabled || !hydrated || !wish.trim()}>
        <RotateCcw size={16} aria-hidden="true"/>{t.refresh}
      </button>
      <button type="button" className={css.enhance} onClick={() => void enhancePrompt()}
        disabled={disabled || !hydrated || !draft || aiLoading || !aiConsent || wish.trim().length<3}
        data-first-video-enhance>
        <WandSparkles size={16} aria-hidden="true"/>{aiLoading ? t.aiLoading : t.ai}
      </button>
    </div>
    <label className={css.consent}><input type="checkbox" data-first-video-ai-consent checked={aiConsent}
      onChange={event => {aiRevisionRef.current++;aiAbortRef.current?.abort();setAiLoading(false);setAiConsent(event.currentTarget.checked);}} disabled={disabled || !hydrated}/>
      <span>{t.aiConsent}</span></label>
    {(aiStatus||aiLoading) && <p className={css.aiStatus} role="status">{aiLoading?t.aiProgress:aiStatus}</p>}
    {!draft && <p className={css.warning} role="alert" data-first-video-no-compatible-scenes>
      {locale==="ru"?"Не удалось подобрать четыре лицензированные сцены с этими исключениями. Уточните или измените исключения.":
        locale==="es"?"No se pudieron elegir cuatro escenas con licencia con estas exclusiones. Aclara o modifica las exclusiones.":
        "Four licensed scenes could not be selected with these exclusions. Clarify or change the exclusions."}
    </p>}
    {draft?.descriptionLimited && <p className={css.warning} role="note">
      <strong>{t.limit}:</strong> {draft.limitationNote}
    </p>}
    {draft && <p className={css.source}><Sparkles size={17} aria-hidden="true"/>
      {draft.plan.shotCount} {t.source.replace("4 ", "").replace("4 ", "")}</p>}
    <button type="button" className={css.generate} data-first-video-generate
      disabled={disabled || !hydrated || !ready || !draft || !wish.trim()} onClick={onCreate}>
      <Sparkles size={20} aria-hidden="true"/>{t.create}
    </button>
    {(recording || preparing) && <div className={css.progress} role="status">
      <p>{t.creating} · {progress}%</p>
      <progress value={progress} max={100}/>
      {recording && <button type="button" onClick={onCancel}>{t.cancel}</button>}
    </div>}
    {resultReady ? <a className={css.ready} href="#personal-video-result">
      <Check size={18} aria-hidden="true"/>{t.ready}</a> : null}
    {!ready && wish.trim() && !preparing && !recording ? <small className={css.subtle}>
      {t.sourceLong}</small> : null}
  </section>;
}
