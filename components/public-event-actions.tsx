"use client";

import { CalendarPlus, Share2 } from "lucide-react";
import { useState } from "react";

type Props = {
  calendarHref: string;
  className?: string;
  actionClassName?: string;
  locale: "en" | "ru" | "es";
  title: string;
  url: string;
};

const copy = {
  en: { calendar: "Add to calendar", share: "Share event", copied: "Link copied", fallback: "Copy the event link from your browser." },
  ru: { calendar: "Добавить в календарь", share: "Поделиться", copied: "Ссылка скопирована", fallback: "Скопируйте ссылку на мероприятие из браузера." },
  es: { calendar: "Añadir al calendario", share: "Compartir evento", copied: "Enlace copiado", fallback: "Copia el enlace del evento desde tu navegador." },
} as const;

export function EventDetailActions({ calendarHref, className, actionClassName, locale, title, url }: Props) {
  const [notice, setNotice] = useState("");
  const t = copy[locale];

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setNotice(t.copied);
        return;
      }
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
    }
    setNotice(t.fallback);
  }

  return <div className={className}>
    <a href={calendarHref} className={actionClassName} download>
      <CalendarPlus size={17} aria-hidden="true" /> {t.calendar}
    </a>
    <button type="button" className={actionClassName} onClick={() => void share()}>
      <Share2 size={17} aria-hidden="true" /> {t.share}
    </button>
    {notice ? <small role="status">{notice}</small> : null}
  </div>;
}
