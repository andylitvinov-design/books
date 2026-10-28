"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Copy, ExternalLink, Film, RefreshCcw, Sparkles } from "lucide-react";
import { checkKlingSceneAction, generateKlingSceneAction } from "@/app/admin/videos/kling-actions";

type Language = "en" | "ru" | "es";
type Mode = "text" | "image";
type Task = { taskId: string; externalTaskId?: string | null; status: string; videoUrl?: string | null; duration?: number | null };
type Props = { initialLocale: Language; configured: boolean; enabled: boolean; premiumEnabled: boolean };
const sampleScenes = [
  { key: "morning", prompt: "Cinematic slow dolly shot through a tranquil sunlit room with natural wood and warm linen, soft morning rays, calm human-scale atmosphere, no visible people, no on-screen text, realistic photography." },
  { key: "forest", prompt: "Gentle camera movement through a quiet green forest after the rain, soft light through the leaves, a feeling of spaciousness and grounded calm, natural colors, photorealistic, no text, no people." },
  { key: "water", prompt: "Close-up cinematic view of concentric ripples spreading across a peaceful lake at golden hour, subtle reflections, unhurried motion and soft warm light, no faces, no text, photorealistic." },
  { key: "wealth", prompt: "Use the real single adult from the reference photo, maintaining the exact face, proportions, natural identity and calm expression. Symbolic prosperity flows TOWARD the figure: a few generic golden coins and abstract banknote-like paper shapes drift gently from both sides into the person's open hands, surrounded by warm golden light and subtle cinematic camera movement. Keep the face fully visible and unaltered; do not introduce another person, deformed hands, logos, readable currency denominations, speech, captions, or claims of real financial gain. Photorealistic five-second scene." },
] as const;

const OWNER_WEALTH_PHOTO_URL = "https://holistichouse.vercel.app/images/holistic-house/andy-about.png";

const translations = {
  en: {
    title: "Kling AI · scene studio", intro: "Prepare a short Kling clip using an approved photo or text. No charge until you approve a render.",
    ready: "API key saved. Each paid render still requires approval.", disabled: "Paid rendering is disabled on the server. You can prepare prompts and use Kling's web editor.",
    key: "Kling API key not configured. Prepare and copy prompts for the web editor; no API request will be made.",
    language: "Editor language", presets: "Scene ideas", morning: "Warm room", forest: "Quiet forest", water: "Calm water", wealth: "Money comes to me",
    prompt: "Scene description (English works well for visuals)", mode: "Source", text: "Text → video", image: "Public image → video",
    imageUrl: "Public Holistic House image URL", imageHelp: "Only publicly published JPG/PNG under https://holistichouse.vercel.app/images/..., never WebP, private client files, uploads or signed links.",
    rights: "I confirm this is an approved, public, non-client image that may be processed by Kling.",
    duration: "Duration", ratio: "Format", resolution: "Quality", preview: "720p test", final: "1080p final", cheapHint: "Text → video: 3s silent 720p Kling 3.0. Longer / HD needs separate approval.", imageCheap: "Public image → video: cheaper Kling 2.5 Turbo Standard, 5s 720p, no audio. Check commercial rights before using free web drafts.",
    noAudio: "Audio is always disabled. No stock avatar, cloned voice, client content, automatic archive or publication.",
    draft: "Copy draft prompt", copied: "Prompt copied", copyError: "Select the description and copy it manually.",
    paid: "I explicitly approve this paid Kling render and its current provider charges. One click creates one job.",
    generate: "Generate clip (paid)", working: "Requesting…", status: "Retrieve status", querying: "Checking…",
    taskId: "Kling task ID", taskHelp: "Keep this ID. You can check it later; status is requested only on click.",
    result: "Provider result (temporary)", download: "Open source video", archive: "After manual quality check, save the MP4 to Drive. Publish to YouTube or the site only with separate approval.",
    errors: { low_cost_only: "Only short silent 720p is authorized. Premium formats are disabled.", unauthorized: "Admin session expired.", approval: "Approve the individual paid render first.", disabled: "Paid Kling generation is disabled.", not_configured: "Kling API key is missing.", validation: "Check the prompt, input image, duration and settings.", provider_unavailable: "Provider did not confirm the request. Check the external task ID before any retry.", unknown: "Could not connect to Kling." },
    statusValues: { submitted: "Submitted", processing: "Processing", succeeded: "Completed", failed: "Failed", not_found: "Not found", unknown: "Unknown" },
    taskPrefix: "Task", manual: "Create with Kling Web", docs: "Kling API setup"
  },
  ru: {
    title: "Kling AI · студия видеосцен", intro: "Подготовьте ролик по своей фотографии или тексту. Расходов нет, пока вы не разрешили рендер.",
    ready: "Ключ сохранён. Платная генерация требует отдельного разрешения.", disabled: "Платный рендер выключен на сервере. Можно подготовить промпт и воспользоваться веб-редактором Kling.",
    key: "API-ключ Kling не настроен. Готовьте и копируйте промпты в веб-редактор; вызов API не производится.",
    language: "Язык интерфейса", presets: "Идеи сцен", morning: "Тёплая комната", forest: "Спокойный лес", water: "Тихая вода", wealth: "Деньги идут ко мне",
    prompt: "Описание сцены (для визуальных сцен хорошо работает английский)", mode: "Исходник", text: "Текст → видео", image: "Публичное фото → видео",
    imageUrl: "URL публичного изображения Holistic House", imageHelp: "Только общедоступные JPG/PNG в https://holistichouse.vercel.app/images/... — не WebP, не личные фотографии клиентов, загрузки или подписанные ссылки.",
    rights: "Подтверждаю: изображение публичное, утверждено, не содержит данных клиента, его можно передавать Kling.",
    duration: "Длительность", ratio: "Формат", resolution: "Качество", preview: "720p тест", final: "1080p финал", cheapHint: "Текст → видео: 3 с без звука, 720p Kling 3.0. Длинные / HD требуют отдельного разрешения.", imageCheap: "Картинка → видео: более дешёвый Kling 2.5 Turbo Standard, 5 с, 720p, без звука. Бесплатные веб-черновики не публикуем без проверки коммерческих прав.",
    noAudio: "Звук выключен. Без чужого аватара и клонированного голоса, личных данных, автоматического архива и публикации.",
    draft: "Копировать промпт", copied: "Промпт скопирован", copyError: "Выделите описание и скопируйте вручную.",
    paid: "Я отдельно разрешаю эту платную генерацию по текущему тарифу Kling. Одно нажатие создаёт одну задачу.",
    generate: "Создать видео (платно)", working: "Отправка…", status: "Проверить готовность", querying: "Проверка…",
    taskId: "ID задачи Kling", taskHelp: "Сохраните ID. Проверить задачу можно позже; нет автозапросов и повторных рендеров.",
    result: "Результат Kling (временная ссылка)", download: "Открыть исходный MP4", archive: "После ручной проверки качества сохраните мастер в Drive. YouTube и сайт — только после отдельного разрешения.",
    errors: { low_cost_only: "Разрешён экономный режим без звука, 720p. Дорогие форматы выключены.", unauthorized: "Сессия администратора закончилась.", approval: "Подтвердите платную генерацию.", disabled: "Платная генерация Kling выключена.", not_configured: "API-ключ Kling отсутствует.", validation: "Проверьте описание, картинку, длительность и настройки.", provider_unavailable: "Kling не подтвердил запрос. Проверьте внешний ID задачи перед повтором.", unknown: "Не удалось связаться с Kling." },
    statusValues: { submitted: "В очереди", processing: "Создаётся", succeeded: "Готово", failed: "Ошибка", not_found: "Не найдено", unknown: "Неизвестно" },
    taskPrefix: "Задача", manual: "Открыть Kling Web", docs: "Настроить Kling API"
  },
  es: {
    title: "Kling AI · estudio de escenas", intro: "Prepara un clip con una foto pública aprobada o texto. Sin cargos hasta autorizar la generación.",
    ready: "Clave guardada. Cada render de pago requiere autorización.", disabled: "La generación de pago está desactivada. Puedes preparar el prompt para el editor web de Kling.",
    key: "Falta la clave API de Kling. Copia los prompts al editor web; no se realizará ninguna llamada API.",
    language: "Idioma", presets: "Ideas visuales", morning: "Sala cálida", forest: "Bosque tranquilo", water: "Agua en calma", wealth: "Flujo de prosperidad",
    prompt: "Descripción de la escena (se recomienda inglés)", mode: "Origen", text: "Texto → vídeo", image: "Imagen pública → vídeo",
    imageUrl: "URL de imagen pública de Holistic House", imageHelp: "Solo JPG/PNG públicos en https://holistichouse.vercel.app/images/...; nunca WebP, fotos de clientes, archivos privados ni enlaces firmados.",
    rights: "Confirmo que la imagen es pública, aprobada y sin datos de clientes, y que se puede enviar a Kling.",
    duration: "Duración", ratio: "Formato", resolution: "Calidad", preview: "720p prueba", final: "1080p final", cheapHint: "Texto → vídeo: 3s sin audio, 720p Kling 3.0; HD y clips largos requieren aprobación.", imageCheap: "Imagen pública → vídeo: Kling 2.5 Turbo Standard más barato, 5s, 720p, sin audio. Comprueba derechos comerciales de pruebas web gratuitas.",
    noAudio: "Audio desactivado. Sin avatares ajenos, voz clonada, datos privados, archivo ni publicación automática.",
    draft: "Copiar prompt", copied: "Prompt copiado", copyError: "Selecciona la descripción y cópiala manualmente.",
    paid: "Autorizo expresamente esta generación de pago según las tarifas actuales de Kling. Un clic crea una tarea.",
    generate: "Generar vídeo (de pago)", working: "Enviando…", status: "Consultar estado", querying: "Consultando…",
    taskId: "ID de tarea Kling", taskHelp: "Guarda este ID; puedes consultarlo más tarde, sin sondeos automáticos.",
    result: "Resultado del proveedor (enlace temporal)", download: "Abrir MP4", archive: "Tras revisar la calidad, archiva el archivo en Drive. Publicación web y YouTube requieren autorización adicional.",
    errors: { low_cost_only: "Solo se permite vídeo corto sin audio, 720p. Los modos premium están desactivados.", unauthorized: "Sesión de administración caducada.", approval: "Aprueba esta generación de pago.", disabled: "Generación de pago desactivada.", not_configured: "Falta la clave API de Kling.", validation: "Comprueba el texto, la imagen y los ajustes.", provider_unavailable: "Kling no ha confirmado la solicitud. Comprueba el ID externo antes de reintentar.", unknown: "No se pudo contactar con Kling." },
    statusValues: { submitted: "Enviado", processing: "Procesando", succeeded: "Completado", failed: "Fallido", not_found: "No encontrado", unknown: "Desconocido" },
    taskPrefix: "Tarea", manual: "Abrir Kling Web", docs: "Configurar API Kling"
  },
} as const;

const compactLabels = {
  en: {
    help: "Links and API setup", selected: "Selected scene", photo: "Your public portrait", imageReady: "Reference photo is ready. Your face stays visible in the prompt.",
    photoDownload: "Save portrait", photoStep: "For a no-charge web draft: save the portrait, copy the prompt and upload both in Kling Web. Provider free-credit and commercial-use rules still apply.",
    freeTitle: "Prepare for free", edit: "Edit prompt, source and format", task: "Check an existing Kling task",
    paidOff: "API rendering is OFF to prevent charges. You can prepare the scene free; no video has been generated yet.",
    paidOn: "Paid API mode: check the current Kling price and approve this one job before generating.",
    ownerRights: "I own this public portrait and allow this specific transfer to Kling.",
    renderFree: "Create free 12s video", renderingFree: "Creating video on this device", downloadFree: "Download video", exportDone: "Local video is ready. No Kling credits were used.", exportUnavailable: "Recording is not supported here. You can still save the photo and prepare the Kling Web draft.",
  },
  ru: {
    help: "Справка и настройки API", selected: "Выбранный сюжет", photo: "Ваша публичная фотография", imageReady: "Фото подставлено. В сценарии лицо должно оставаться узнаваемым.",
    photoDownload: "Сохранить фото", photoStep: "Бесплатный черновик: сохраните фото, скопируйте сценарий и загрузите их в Kling Web. Бесплатные кредиты и права коммерческого использования проверяются отдельно.",
    freeTitle: "Подготовить бесплатно", edit: "Изменить текст, источник и формат", task: "Проверить уже созданную задачу",
    paidOff: "API-рендер выключен во избежание расходов. Можно бесплатно подготовить сценарий; видео пока не создано.",
    paidOn: "Платный API: проверьте реальную стоимость Kling и подтвердите только один рендер.",
    ownerRights: "Это моя публичная фотография; я разрешаю передать её Kling только для этого ролика.",
    renderFree: "Создать бесплатное видео · 12 сек", renderingFree: "Создание видео на устройстве", downloadFree: "Скачать видео", exportDone: "Видео создано на устройстве. Кредиты Kling не списаны.", exportUnavailable: "Запись видео не поддерживается в этом браузере. Сохранение фото и создание черновика через Kling Web доступны.",
  },
  es: {
    help: "Ayuda y configuración", selected: "Escena seleccionada", photo: "Tu retrato público", imageReady: "Foto seleccionada. El prompt conserva el rostro reconocible.",
    photoDownload: "Guardar foto", photoStep: "Borrador sin API: guarda la foto, copia el prompt y súbelos a Kling Web. Verifica créditos gratuitos y derechos comerciales.",
    freeTitle: "Preparar gratis", edit: "Editar texto, fuente y formato", task: "Consultar un trabajo existente",
    paidOff: "La API está desactivada para evitar cargos. Puedes preparar gratis la escena; todavía no se ha creado un vídeo.",
    paidOn: "API de pago: revisa el precio de Kling y aprueba únicamente esta generación.",
    ownerRights: "Soy titular de esta foto pública y autorizo enviarla a Kling solo para este vídeo.",
    renderFree: "Crear vídeo gratis · 12 s", renderingFree: "Creando vídeo en este dispositivo", downloadFree: "Descargar vídeo", exportDone: "Vídeo listo en este dispositivo, sin créditos Kling.", exportUnavailable: "Este navegador no admite la grabación. Puedes guardar la foto y preparar un borrador en Kling Web.",
  },
} as const;

export function KlingSceneStudio({ initialLocale, configured, enabled, premiumEnabled }: Props) {
  const [lang, setLang] = useState<Language>(initialLocale);
  const [mode, setMode] = useState<Mode>("text");
  const [selectedKey, setSelectedKey] = useState<string>("morning");
  const [prompt, setPrompt] = useState<string>(sampleScenes[0].prompt);
  const [imageUrl, setImageUrl] = useState("");
  const [imageApproved, setImageApproved] = useState(false);
  const [duration, setDuration] = useState<3 | 5 | 10>(3);
  const [ratio, setRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [resolution, setResolution] = useState<"720p" | "1080p">("720p");
  const [approved, setApproved] = useState(false);
  const [pending, setPending] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [externalLookup, setExternalLookup] = useState(false);
  const [message, setMessage] = useState("");
  const [renderingFree, setRenderingFree] = useState(false);
  const [renderPercent, setRenderPercent] = useState(0);
  const [localVideo, setLocalVideo] = useState<{url:string;extension:"mp4"|"webm"} | null>(null);
  const t = translations[lang];
  const labels = compactLabels[lang];
  const connected = configured && enabled;

  // A deep link can open the exact approved portrait scene without a second tap.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("klingScene") !== "wealth") return;
    setSelectedKey("wealth");
    setPrompt(sampleScenes[3].prompt);
    setMode("image");
    setImageUrl(OWNER_WEALTH_PHOTO_URL);
    setDuration(5);
    setResolution("720p");
    // Never infer consent from a deep link.
    setImageApproved(false);
    setApproved(false);
  }, []);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setMessage(t.copied);
    } catch { setMessage(t.copyError); }
  }
  useEffect(() => {
    return () => { if (localVideo?.url) URL.revokeObjectURL(localVideo.url); };
  }, [localVideo?.url]);

  async function renderFreeVideo() {
    if (renderingFree || pending || mode !== "image" || imageUrl !== OWNER_WEALTH_PHOTO_URL) return;
    setRenderingFree(true); setRenderPercent(0); setMessage("");
    try {
      // Lazy-loaded: zero video encoder or API overhead until the owner presses this button.
      const { createFreeWealthClip } = await import("@/lib/wealth-video-local");
      const result = await createFreeWealthClip(lang, value => setRenderPercent(value));
      setLocalVideo({url:URL.createObjectURL(result.blob),extension:result.extension});
      setMessage(labels.exportDone);
    } catch {
      setMessage(labels.exportUnavailable);
    } finally {
      setRenderingFree(false);
    }
  }

  async function generate() {
    if (pending || !approved || !connected) return;
    setPending(true);
    setMessage("");
    // Keep the request ID visible if Kling received an otherwise timed-out job.
    const externalTaskId = `hh_kling_${crypto.randomUUID()}`;
    setLookupId(externalTaskId);
    setExternalLookup(true);
    setApproved(false);
    try {
      const result = await generateKlingSceneAction({
        mode, prompt, imageUrl: mode === "image" ? imageUrl : "",
        publicImageApproved: mode === "image" && imageApproved,
        duration, aspectRatio: ratio, resolution, externalTaskId, paidApproved: true,
      });
      if (result.ok && result.result) {
        setTask(result.result);
        setLookupId(result.result.taskId);
        setExternalLookup(false);
        setMessage("");
      } else {
        setMessage(t.errors[(result.error || "unknown") as keyof typeof t.errors] || t.errors.unknown);
      }
    } catch {
      setMessage(t.errors.provider_unavailable);
    } finally { setPending(false); }
  }
  async function checkStatus() {
    if (pending || !lookupId.trim()) return;
    setPending(true);
    setMessage("");
    try {
      const result = await checkKlingSceneAction({ taskId: lookupId.trim(), external: externalLookup });
      if (result.ok && result.result) {
        setTask(result.result);
        if (result.result.taskId && result.result.status !== "not_found") {
          setLookupId(result.result.taskId);
          setExternalLookup(false);
        }
      } else setMessage(t.errors[(result.error || "unknown") as keyof typeof t.errors] || t.errors.unknown);
    } catch { setMessage(t.errors.provider_unavailable); }
    finally { setPending(false); }
  }

  return <section className="kling-studio kling-studio--compact" lang={lang} aria-label={t.title} id="kling-scene-studio">
    <div className="kling-studio-top">
      <div>
        <p className="site-video-field-label"><Sparkles size={17} aria-hidden="true" /> Kling AI · Turbo / 3.0</p>
        <h2>{t.title}</h2><p>{t.intro}</p>
      </div>
      <div className="site-video-language-picker kling-studio-langs" role="group" aria-label={t.language}>
        {(["en", "ru", "es"] as const).map(language =>
          <button key={language} type="button" aria-pressed={lang === language} onClick={() => setLang(language)}>{language.toUpperCase()}</button>)}
      </div>
    </div>

    <div className="kling-studio-preset-group">
      <p className="site-video-field-label">{t.presets}</p>
      <div className="kling-studio-presets" role="group" aria-label={t.presets}>
        {sampleScenes.map(scene => <button key={scene.key} type="button" disabled={pending}
          aria-pressed={selectedKey === scene.key}
          onClick={() => {
            const wealth = scene.key === "wealth";
            setSelectedKey(scene.key); setPrompt(scene.prompt);
            setMode(wealth ? "image" : "text");
            setImageUrl(wealth ? OWNER_WEALTH_PHOTO_URL : "");
            setDuration(wealth ? 5 : 3); setResolution("720p");
            setImageApproved(false); setApproved(false); setMessage("");
          }}><Film size={16} aria-hidden="true"/>{t[scene.key]}</button>)}
      </div>
    </div>

    {mode === "image" && imageUrl === OWNER_WEALTH_PHOTO_URL && <div className="kling-studio-photo">
      <Image src="/images/holistic-house/andy-about.png" alt={labels.photo}
        width={160} height={157} unoptimized loading="lazy" />
      <div><strong>{labels.photo}</strong><p>{labels.imageReady}</p>
        <a href="/images/holistic-house/andy-about.png" download="holistic-house-owner-portrait.png">{labels.photoDownload}</a>
      </div>
    </div>}

    <div className="kling-studio-free-panel">
      <strong>{labels.freeTitle}</strong>
      <div className="kling-studio-free-actions">
        {mode === "image" && imageUrl === OWNER_WEALTH_PHOTO_URL && <button type="button"
          className="site-video-admin-button site-video-admin-button--primary"
          disabled={renderingFree || pending} onClick={renderFreeVideo}>
          <Film size={17} aria-hidden="true"/>
          {renderingFree ? `${labels.renderingFree} · ${renderPercent}%` : labels.renderFree}
        </button>}
        <button type="button" className="site-video-admin-button" onClick={copyPrompt}>
          <Copy size={17} aria-hidden="true"/>{t.draft}
        </button>
        <a href="https://kling.ai/" target="_blank" rel="noopener noreferrer">
          {t.manual}<ExternalLink size={16} aria-hidden="true"/>
        </a>
      </div>
      {localVideo && mode === "image" && imageUrl === OWNER_WEALTH_PHOTO_URL && <div className="kling-studio-local-result">
        <video controls playsInline preload="metadata" src={localVideo.url} aria-label={labels.downloadFree}/>
        <a href={localVideo.url} download={`holistic-house-money-flow-${lang}.${localVideo.extension}`}
          className="site-video-admin-button site-video-admin-button--primary">{labels.downloadFree} {localVideo.extension.toUpperCase()}</a>
      </div>}
      <p>{labels.photoStep}</p>
      {message && <p className="kling-studio-inline-message" role="status">{message}</p>}
    </div>

    <details className="kling-studio-edit">
      <summary>{labels.edit}</summary>
      <label className="site-video-field"><span>{t.mode}</span>
        <select value={mode} disabled={pending} onChange={event => {
          const next=event.target.value as Mode;
          setSelectedKey(""); setMode(next); setDuration(next === "image" ? 5 : 3);
          setImageApproved(false); setApproved(false);
        }}><option value="text">{t.text}</option><option value="image">{t.image}</option></select>
      </label>
      <label className="site-video-field"><span>{t.prompt}</span>
        <textarea rows={5} minLength={12} maxLength={2500} value={prompt} disabled={pending}
          onChange={event => {setPrompt(event.target.value);setSelectedKey("");setApproved(false);}} />
      </label>
      {mode === "image" && <label className="site-video-field"><span>{t.imageUrl}</span>
        <input type="url" value={imageUrl} disabled={pending} maxLength={500}
          placeholder="https://holistichouse.vercel.app/images/holistic-house/..."
          onChange={event => {setImageUrl(event.target.value);setSelectedKey("");setImageApproved(false);setApproved(false);}} />
        <small>{t.imageHelp}</small>
      </label>}
      <div className="kling-studio-settings">
        <label className="site-video-field"><span>{t.duration}</span>
          <select value={duration} disabled={pending} onChange={event => {setDuration(Number(event.target.value) as 3|5|10);setApproved(false);}}>
            <option value={3} disabled={mode === "image"}>3 s</option>
            <option value={5} disabled={mode === "text" && !premiumEnabled}>5 s</option>
            <option value={10} disabled={!premiumEnabled}>10 s</option>
          </select>
        </label>
        <label className="site-video-field"><span>{t.ratio}</span>
          <select value={ratio} disabled={pending || mode === "image"} onChange={event => {setRatio(event.target.value as typeof ratio);setApproved(false);}}>
            <option>16:9</option><option>9:16</option><option>1:1</option>
          </select>
        </label>
        <label className="site-video-field"><span>{t.resolution}</span>
          <select value={resolution} disabled={pending} onChange={event => {setResolution(event.target.value as typeof resolution);setApproved(false);}}>
            <option value="720p">{t.preview}</option>
            <option value="1080p" disabled={!premiumEnabled}>{t.final}</option>
          </select>
        </label>
      </div>
      <p className="site-video-draft-help">{mode === "image" ? t.imageCheap : t.cheapHint}</p>
      <p className="site-video-draft-help">{t.noAudio}</p>
    </details>

    {mode === "image" && <label className="site-video-review-check kling-studio-rights">
      <input type="checkbox" checked={imageApproved} disabled={pending}
        onChange={event => {setImageApproved(event.target.checked);setApproved(false);}} />
      <span>{imageUrl === OWNER_WEALTH_PHOTO_URL ? labels.ownerRights : t.rights}</span>
    </label>}

    <div className="kling-studio-cost-panel">
      {connected ? <>
        <p>{labels.paidOn}</p>
        <label className="site-video-review-check kling-studio-paid">
          <input type="checkbox" checked={approved} disabled={pending}
            onChange={event => setApproved(event.target.checked)} />
          <span>{t.paid}</span>
        </label>
        <button type="button" className="site-video-admin-button site-video-admin-button--primary"
          disabled={!approved || pending || prompt.trim().length < 12 || (mode==="image" && (!imageUrl || !imageApproved))}
          onClick={generate}>{pending ? t.working : t.generate}</button>
      </> : <p role="status">{!configured ? t.key : labels.paidOff}</p>}
    </div>

    <details className="kling-studio-result" open={Boolean(task)}>
      <summary>{labels.task}</summary>
      <label className="site-video-field"><span>{t.taskId}</span>
        <input type="text" value={lookupId} autoComplete="off" spellCheck={false} maxLength={128}
          onChange={event => { const value=event.target.value.trim(); setLookupId(value); setExternalLookup(value.startsWith("hh_kling_")); }}
          placeholder="Kling task ID / hh_kling_…" /><small>{t.taskHelp}</small>
      </label>
      <button type="button" className="site-video-admin-button"
        disabled={!configured || pending || !lookupId} onClick={checkStatus}>
        <RefreshCcw size={16} aria-hidden="true"/>{pending ? t.querying : t.status}
      </button>
      {task && <div className="site-video-admin-notice" role="status">
        <strong>{t.statusValues[task.status as keyof typeof t.statusValues] ?? task.status}</strong>
        {task.videoUrl && <div className="kling-studio-video">
          <video controls preload="none" playsInline src={task.videoUrl} aria-label={t.result}/>
          <a href={task.videoUrl} target="_blank" rel="noopener noreferrer">{t.download}<ExternalLink size={15} aria-hidden="true"/></a>
        </div>}
      </div>}
      <p className="site-video-draft-help">{t.archive}</p>
    </details>
    <details className="kling-studio-help"><summary>{labels.help}</summary>
      <div className="kling-studio-links">
        <a href="https://kling.ai/dev/api-key" target="_blank" rel="noopener noreferrer">{t.docs}<ExternalLink size={15} aria-hidden="true"/></a>
      </div>
    </details>
  </section>;
}
