"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { Camera, Check, LockKeyhole, UploadCloud } from "lucide-react";
import styles from "./reiki-initiation-photo.module.css";

export type ReikiPhoto = { exists: boolean; url: string | null };

type Props = {
  locale: "en" | "ru";
  accountId: string | null;
  enabled: boolean;
  photo: ReikiPhoto | null;
  onSaved: (value: ReikiPhoto) => void;
};
const LIMIT = 2_500_000;

// Do not revoke a blob URL in onload: older WebKit can still need the
// decoded backing resource when Canvas draws the image a moment later.
function imageElement(file: File): Promise<{ image: HTMLImageElement; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    const release = () => URL.revokeObjectURL(url);
    image.onload = () => resolve({ image, release });
    image.onerror = () => { release(); reject(new Error("INVALID_IMAGE")); };
    image.src = url;
  });
}

async function safeJpeg(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size > 20_000_000 || file.size < 128)
    throw new Error("INVALID_IMAGE");
  // Safari can reject an Image(blob:) loaded from the file picker even when
  // the original JPEG is valid. Prefer native blob decoding without a URL;
  // old iOS engines still use the scoped-CSP Image fallback above.
  const bitmap = typeof createImageBitmap === "function"
    ? await createImageBitmap(file).catch(() => null) : null;
  const loaded = bitmap ? null : await imageElement(file);
  const image = bitmap ?? loaded!.image;
  const width = bitmap?.width ?? loaded!.image.naturalWidth;
  const height = bitmap?.height ?? loaded!.image.naturalHeight;
  const canvas = document.createElement("canvas");
  try {
    if (width < 100 || height < 100) throw new Error("INVALID_IMAGE");
    const scale = Math.min(1, 1600 / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("INVALID_IMAGE");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  } finally {
    bitmap?.close();
    loaded?.release();
  }
  const encode = (quality: number): Promise<Blob> =>
    new Promise((resolve, reject) =>
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("INVALID_IMAGE")),
        "image/jpeg", quality));
  for (const quality of [0.82, 0.68, 0.54]) {
    const blob = await encode(quality);
    if (blob.size <= LIMIT)
      // Re-encoding strips location EXIF and device metadata before private storage.
      return new File([blob], "initiation.jpg", { type: "image/jpeg" });
  }
  throw new Error("IMAGE_TOO_LARGE");
}

export function ReikiInitiationPhoto({ locale, accountId, enabled, photo, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ru = locale === "ru";
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const original = event.target.files?.[0];
    event.target.value = "";
    if (!original || !enabled || !accountId || busy) return;
    setBusy(true);
    setError("");
    try {
      const jpg = await safeJpeg(original);
      const form = new FormData();
      form.set("photo", jpg);
      const response = await fetch("/api/app/academy-energywork/photo", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "X-HH-Account-ID": accountId },
        body: form,
      });
      const result = await response.json() as ReikiPhoto & { error?: string };
      if (!response.ok || !result.exists || !result.url) throw new Error(result.error || "UPLOAD_FAILED");
      onSaved({ exists: true, url: result.url });
    } catch {
      setError(ru ? "Не удалось сохранить фото. Попробуйте JPEG или PNG до 20 МБ."
        : "We could not save your photo. Try a JPEG or PNG under 20 MB.");
    } finally { setBusy(false); }
  }
  return (
    <div className={styles.panel} data-reiki-initiation-photo>
      <div className={styles.heading}>
        <Camera size={21} aria-hidden="true" />
        <strong>{ru ? "Личное фото для мастера" : "Your photo for the teacher"}</strong>
      </div>
      <p>{ru
        ? "Загрузите чёткое фото лица. Оно сохранится в вашем кабинете «Мои курсы». Андрей получит его вместе с анкетой только после вашего подтверждения заявки."
        : "Upload a clear photo of your face. It stays in My Courses. Andrey receives it with your answers only after you confirm your application."}</p>
      {photo?.exists && photo.url ? (
        <div className={styles.preview} data-reiki-photo-saved>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={ru ? "Моё сохранённое фото" : "My saved photo"}
            referrerPolicy="no-referrer" />
          <span><Check size={17} aria-hidden="true" />{ru ? "Фото сохранено приватно" : "Photo saved privately"}</span>
        </div>
      ) : <span className={styles.empty}>{ru ? "Фото ещё не загружено" : "No photo uploaded yet"}</span>}
      <label className={styles.upload} aria-disabled={!enabled || busy}>
        <UploadCloud size={19} aria-hidden="true" />
        <span>{busy ? (ru ? "Сохраняем…" : "Saving…") :
          photo?.exists ? (ru ? "Заменить фото" : "Replace photo") :
          (ru ? "Выбрать фото с телефона" : "Choose a photo from your phone")}</span>
        <input type="file" accept="image/*" disabled={!enabled || busy}
          onChange={event => { void upload(event); }} aria-label={ru ? "Загрузить фото для инициации" : "Upload initiation photo"} />
      </label>
      {!enabled ? <p className={styles.note}>{photo?.exists
        ? (ru ? "Заявка уже отправлена. Фото сохранено, замена недоступна."
          : "Your application was submitted. The saved photo cannot be replaced.")
        : (ru ? "Для сохранения войдите в аккаунт и завершите предыдущие шаги курса."
          : "Sign in and complete the preceding course steps to save your photo.")}</p> : null}
      <p className={styles.note}><LockKeyhole size={14} aria-hidden="true" />{ru
        ? "Приватное хранение · без публикации и пересылки в мессенджеры"
        : "Private storage · never posted publicly or sent through messengers"}</p>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </div>
  );
}
