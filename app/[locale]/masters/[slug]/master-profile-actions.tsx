"use client";

import { useEffect, useState } from "react";
import styles from "./profile.module.css";

/** Saved masters live on this browser only; no personal account or client/CRM records are touched. */
export default function MasterProfileActions({ locale, name, slug }: { locale: string; name: string; slug: string }) {
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const key = "hh:favorite-master:" + slug;
  const ru = locale === "ru";
  const es = locale === "es";

  useEffect(() => {
    try { setSaved(window.localStorage.getItem(key) === "1"); } catch { /* Storage may be disabled. */ }
  }, [key]);

  const toggleFavorite = () => {
    const next = !saved;
    try {
      if (next) window.localStorage.setItem(key, "1");
      else window.localStorage.removeItem(key);
      setSaved(next);
      setNotice(next
        ? ru ? "Мастер сохранён на этом устройстве" : es ? "Guardado en este dispositivo" : "Saved on this device"
        : ru ? "Мастер удалён из избранного" : es ? "Eliminado de favoritos" : "Removed from favorites");
    } catch {
      setNotice(ru ? "Браузер не разрешает сохранять" : es ? "El navegador bloquea el guardado" : "Browser storage is unavailable");
    }
  };

  const share = async () => {
    const url = window.location.origin + window.location.pathname;
    setNotice("");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: name + " · Holistic House", url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice(ru ? "Ссылка скопирована" : es ? "Enlace copiado" : "Link copied");
    } catch {
      setNotice(ru ? "Скопируйте ссылку из адресной строки" : es ? "Copia el enlace de la barra de direcciones" : "Copy the link from the address bar");
    }
  };

  return (
    <div className={styles.heroTools}>
      <button type="button" className={styles.toolButton + (saved ? " " + styles.activeTool : "")}
        onClick={toggleFavorite} aria-pressed={saved}
        aria-label={saved
          ? ru ? "Убрать из избранного" : es ? "Quitar de favoritos" : "Remove favorite"
          : ru ? "Сохранить мастера на этом устройстве" : es ? "Guardar en este dispositivo" : "Save master on this device"}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
      </button>
      <button type="button" className={styles.toolButton} onClick={share}
        aria-label={ru ? "Поделиться профилем мастера" : es ? "Compartir el perfil" : "Share practitioner profile"}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" /><path d="m8.5 11 7-4.7m-7 6.7 7 4.7" /></svg>
      </button>
      {notice && <p className={styles.shareStatus} role="status">{notice}</p>}
    </div>
  );
}
