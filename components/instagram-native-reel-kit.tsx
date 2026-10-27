"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Instagram, Share2, Upload } from "lucide-react";
import {
  inspectNativeReel, normalizeNativeReelCaption, normalizeReelReadbackLink,
  REEL_MAX_CAPTION_CHARACTERS, TAO_INSTAGRAM_PROFILE, TAO_PUBLIC_LANDING, TAO_REEL_CAPTIONS,
} from "@/lib/instagram/native-reel-kit.mjs";
import styles from "./instagram-native-reel-kit.module.css";

type Lang = "en" | "ru" | "es";
type VideoMetadata = { width: number; height: number; duration: number };
type Inspection = { ready: boolean; error: string | null; warnings: string[] };
const translations = {
  ru: {
    title: "Instagram @tao.ideas · бесплатно", subtitle: "Без Metricool и подписок. Готовим Reel на этом устройстве, затем завершаем публикацию в Instagram.",
    fileLabel: "1. Выберите готовый Reel из «Файлы»", fileHint: "MP4 или MOV, вертикально 9:16, со звуком и субтитрами. Kling Studio выше создаёт только немые 5–10-секундные сцены — для Reel сначала соберите полный ролик.",
    caption: "2. Подпись к ролику", copy: "Копировать подпись", copied: "Подпись скопирована. Вставьте её при создании Reel.", copyError: "Не удалось скопировать. Выделите текст подписи вручную.",
    qa: "3. Я проверил(а) видео, звук, субтитры, авторские права и отсутствие личных материалов клиентов.",
    share: "Передать MP4 через меню iPhone", shareError: "Файлы нельзя передать через меню этого браузера. Сохраните MP4 в «Фото» или «Файлы», затем откройте Instagram и создайте Reel.",
    shareClosed: "Меню передачи закрыто. Это НЕ подтверждает публикацию — завершите её в приложении Instagram.",
    cancelled: "Передача отменена. Ничего не опубликовано.",
    save: "Сохранить MP4", open: "Открыть @tao.ideas", note: "В Instagram выберите + → Reel, загрузите видео, вставьте подпись и выберите обложку. Проверьте, что открыт именно @tao.ideas. Подтвердите публикацию там.",
    landing: "Ссылка для bio", linkCopied: "Ссылка для bio скопирована.",
    receipt: "Проверка после публикации", receiptHelp: "Вставьте ссылку на опубликованный Reel. Это локальная проверка формата, а не подтверждение от Instagram.",
    receiptOk: "Ссылка выглядит корректно. Подтверждение аккаунта и публикации остаётся за Instagram.",
    file_required: "Выберите MP4/MOV.", file_invalid: "Нужен непустой MP4/MOV размером до 1 ГБ.", metadata_pending: "Читаем размер и длительность видео…", metadata_invalid: "Не удалось прочитать видео. Проверьте файл на устройстве.",
    duration_invalid: "Instagram Reel должен длиться 3–900 секунд.", aspect_invalid: "Выберите вертикальное видео 9:16, а не горизонтальное или квадратное.",
    editorial_duration: "Для первой серии рекомендуем 15–35 секунд.", low_resolution: "Для чёткого Reel рекомендуем не меньше 720×1280 (лучше 1080×1920).",
    status: "Нет автоматической отправки, доступа к Instagram или оплаты. Файл остаётся на вашем устройстве до нажатия «Передать».",
  },
  en: {
    title: "Instagram @tao.ideas · free", subtitle: "No Metricool or subscription. Prepare the Reel on this device and finish posting in Instagram.",
    fileLabel: "1. Choose a finished Reel from Files", fileHint: "MP4 or MOV, vertical 9:16, with audio and captions. Kling Scene Studio above produces silent 5–10s clips; assemble the finished Reel first.",
    caption: "2. Reel caption", copy: "Copy caption", copied: "Caption copied. Paste it when creating the Reel.", copyError: "Copy failed; select and copy the caption manually.",
    qa: "3. I have checked the video, audio, captions, rights, and that it contains no private client material.",
    share: "Share MP4 via device", shareError: "File sharing is unavailable here. Save the MP4 to Photos/Files, then create the Reel in Instagram.",
    shareClosed: "The share dialog closed. This is NOT proof of publication; complete it in the Instagram app.", cancelled: "Sharing cancelled. Nothing was published.",
    save: "Save MP4", open: "Open @tao.ideas", note: "In Instagram, tap + → Reel, select the video, paste the caption and choose a cover. Check that you're in @tao.ideas; publish there.",
    landing: "Copy bio link", linkCopied: "Bio link copied.", receipt: "After-publish check", receiptHelp: "Paste the Reel URL. This only validates the format, not Instagram ownership or publication.",
    receiptOk: "Reel URL format looks valid; only Instagram confirms actual publication and account.",
    file_required: "Choose MP4/MOV.", file_invalid: "Use an MP4/MOV up to 1 GB with content.", metadata_pending: "Reading video dimensions and duration…", metadata_invalid: "Could not read the video metadata. Check the file on this device.",
    duration_invalid: "Reels must be 3–900 seconds long.", aspect_invalid: "Choose a vertical 9:16 video, not square or landscape.",
    editorial_duration: "Our initial series targets 15–35 seconds.", low_resolution: "For clarity use at least 720×1280 (ideally 1080×1920).",
    status: "No automatic publishing, Instagram access or payments. The file stays on your device until you tap Share.",
  },
  es: {
    title: "Instagram @tao.ideas · gratis", subtitle: "Sin Metricool ni suscripción. Prepara el Reel aquí y termina la publicación en Instagram.",
    fileLabel: "1. Elige el Reel terminado de Archivos", fileHint: "MP4 o MOV vertical 9:16, con sonido y subtítulos. Kling Studio solo hace escenas mudas de 5–10 s: monta primero el Reel completo.",
    caption: "2. Texto del Reel", copy: "Copiar texto", copied: "Texto copiado. Pégalo al publicar el Reel.", copyError: "No se pudo copiar. Selecciona el texto manualmente.",
    qa: "3. He revisado vídeo, audio, subtítulos, derechos y que no incluya materiales privados de clientes.",
    share: "Compartir MP4 con el dispositivo", shareError: "No se pueden compartir archivos aquí. Guarda el MP4 en Fotos/Archivos y crea el Reel en Instagram.",
    shareClosed: "Se cerró el menú para compartir. NO confirma que se haya publicado en Instagram.", cancelled: "Compartir cancelado. No se publicó nada.",
    save: "Guardar MP4", open: "Abrir @tao.ideas", note: "En Instagram, pulsa + → Reel, elige el vídeo, pega el texto, selecciona portada y publica desde @tao.ideas.",
    landing: "Copiar enlace bio", linkCopied: "Enlace de bio copiado.", receipt: "Comprobar enlace", receiptHelp: "Pega la URL del Reel. Solo verifica el formato, no la publicación real.",
    receiptOk: "La URL parece válida; Instagram debe confirmar la publicación y la cuenta.",
    file_required: "Elige MP4/MOV.", file_invalid: "Necesitas MP4/MOV de hasta 1 GB.", metadata_pending: "Leyendo las dimensiones y la duración…", metadata_invalid: "No se pudo leer el vídeo. Revisa el archivo.",
    duration_invalid: "Los Reels deben durar entre 3 y 900 segundos.", aspect_invalid: "Selecciona un vídeo vertical 9:16.",
    editorial_duration: "La serie inicial recomienda 15–35 segundos.", low_resolution: "Usa al menos 720×1280 (idealmente 1080×1920).",
    status: "Sin publicación automática, acceso a Instagram ni pagos. El archivo permanece en este dispositivo hasta compartirlo.",
  },
} as const;

export function InstagramNativeReelKit({ initialLocale }: { initialLocale: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLocale);
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [caption, setCaption] = useState<string>(TAO_REEL_CAPTIONS[initialLocale]);
  const [rightsApproved, setRightsApproved] = useState(false);
  const [message, setMessage] = useState("");
  const [receiptInput, setReceiptInput] = useState("");
  const t = translations[lang];
  const inspection = useMemo(() => inspectNativeReel(file, metadata) as Inspection, [file, metadata]);
  const validCaption = normalizeNativeReelCaption(caption);
  const readbackLink = normalizeReelReadbackLink(receiptInput);

  useEffect(() => {
    if (!file) { setVideoUrl(null); return; }
    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function changeLanguage(value: Lang) {
    setLang(value);
    setCaption(TAO_REEL_CAPTIONS[value]);
    setMessage("");
  }

  async function copyText(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(success);
    } catch { setMessage(t.copyError); }
  }

  async function share() {
    if (!file || !inspection.ready || !validCaption || !rightsApproved) return;
    // Important: share() must be called directly from this click's user activation.
    if (typeof navigator.canShare !== "function" || typeof navigator.share !== "function" ||
        !navigator.canShare({ files: [file] })) {
      setMessage(t.shareError);
      return;
    }
    try {
      // Sharing a file never equals posting to Instagram; caption is copied separately.
      await navigator.share({ files: [file] });
      setMessage(t.shareClosed);
    } catch (error) {
      setMessage(error instanceof Error && error.name === "AbortError" ? t.cancelled : t.shareError);
    }
  }

  return <section id="instagram-native-reel-kit" className={styles.kit} lang={lang} aria-labelledby="instagram-native-title" data-native-reel-kit>
    <div className={styles.header}>
      <div>
        <p className={styles.eyebrow}><Instagram size={17} aria-hidden="true" /> INSTAGRAM · FREE</p>
        <h2 id="instagram-native-title">{t.title}</h2><p>{t.subtitle}</p>
      </div>
      <a className={styles.profile} href={TAO_INSTAGRAM_PROFILE} target="_blank" rel="noopener noreferrer">@tao.ideas <ExternalLink size={16} aria-hidden="true" /></a>
    </div>
    <div className={styles.locales} aria-label="Language / Язык / Idioma">
      {(["ru", "en", "es"] as const).map(next => <button key={next} type="button" aria-pressed={lang === next} onClick={() => changeLanguage(next)}>{next.toUpperCase()}</button>)}
    </div>
    <div className={styles.columns}>
      <div className={styles.panel}>
        <label className={styles.label} htmlFor="native-reel-file">{t.fileLabel}</label>
        <input id="native-reel-file" className={styles.file} type="file" accept=".mp4,.mov,video/mp4,video/quicktime" onChange={e => {
          setFile(e.currentTarget.files?.[0] ?? null);
          setMetadata(null); setRightsApproved(false); setMessage(""); setReceiptInput("");
        }} />
        <p className={styles.help}>{t.fileHint}</p>
        {videoUrl && <video key={videoUrl} className={styles.preview} controls preload="metadata" playsInline src={videoUrl}
          onLoadedMetadata={e => { const video=e.currentTarget; setMetadata({width:video.videoWidth,height:video.videoHeight,duration:video.duration}); }}
          onError={() => setMetadata({width:0,height:0,duration:0})} />}
        {file && <p className={inspection.ready ? styles.valid : styles.error} role="status">
          {inspection.ready ? <><CheckCircle2 size={16} aria-hidden="true" /> {metadata?.width}×{metadata?.height} · {Math.round(metadata?.duration ?? 0)}s</> : t[inspection.error as keyof typeof t]}
        </p>}
        {inspection.warnings.map(warning => <p key={warning} className={styles.warning}>{t[warning as keyof typeof t]}</p>)}
        <label className={styles.checkbox}><input type="checkbox" checked={rightsApproved} onChange={e => setRightsApproved(e.currentTarget.checked)} />{t.qa}</label>
      </div>
      <div className={styles.panel}>
        <label className={styles.label} htmlFor="native-reel-caption">{t.caption}</label>
        <textarea id="native-reel-caption" className={styles.caption} rows={9} maxLength={REEL_MAX_CAPTION_CHARACTERS} value={caption} onChange={e => {setCaption(e.currentTarget.value);setMessage("");}} />
        <div className={styles.meta}><span>{[...caption].length}/{REEL_MAX_CAPTION_CHARACTERS}</span></div>
        <div className={styles.actions}>
          <button type="button" disabled={!validCaption} onClick={() => void copyText(caption,t.copied)}><Copy size={16} aria-hidden="true" />{t.copy}</button>
          <button type="button" onClick={() => void copyText(TAO_PUBLIC_LANDING,t.linkCopied)}><Copy size={16} aria-hidden="true" />{t.landing}</button>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={!inspection.ready || !validCaption || !rightsApproved} onClick={() => void share()}><Share2 size={17} aria-hidden="true" />{t.share}</button>
          {videoUrl && <a className={styles.actionLink} href={videoUrl} download={file?.name}><Upload size={16} aria-hidden="true" />{t.save}</a>}
          <a className={styles.actionLink} href={TAO_INSTAGRAM_PROFILE} target="_blank" rel="noopener noreferrer"><Instagram size={16} aria-hidden="true" />{t.open}</a>
        </div>
        <p className={styles.help}>{t.note}</p>
        {message && <p className={styles.notice} role="status">{message}</p>}
      </div>
    </div>
    <details className={styles.receipt}>
      <summary>{t.receipt}</summary>
      <p className={styles.help}>{t.receiptHelp}</p>
      <input type="url" inputMode="url" value={receiptInput} onChange={e => setReceiptInput(e.currentTarget.value)} placeholder="https://www.instagram.com/reel/…/" />
      {readbackLink && <p className={styles.warning}>{t.receiptOk} <a href={readbackLink} target="_blank" rel="noopener noreferrer">{readbackLink}</a></p>}
    </details>
    <p className={styles.footer}>{t.status}</p>
  </section>;
}
