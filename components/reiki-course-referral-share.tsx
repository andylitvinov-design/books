"use client";

import { useId, useState } from "react";
import { Check, ClipboardCopy, HeartHandshake, Mail, Share2 } from "lucide-react";
import styles from "./reiki-course-referral-share.module.css";

type Props = { locale: "en" | "ru" };
type CopyStatus = "idle" | "copied" | "error";

const copy = {
  en: {
    trigger: "Share",
    heading: "Recommend this course to a friend",
    description: "Five free, short lessons exploring Tantra Reiki, Kundalini Reiki and Reiki Yggdrasil. Know someone who might enjoy learning with you?",
    linkLabel: "Public programme link",
    copy: "Copy",
    copied: "Link copied — paste it into a message.",
    copyError: "Copy is unavailable. Select the link above and copy it manually.",
    share: "Send to a friend",
    message: "You might enjoy this free five-day Reiki Practitioner course at Holistic House:",
    email: "Email",
    privacy: "Only the public course page is shared. Your personal answers and progress are never included.",
  },
  ru: {
    trigger: "Поделиться",
    heading: "Порекомендуйте курс друзьям",
    description: "Пять коротких бесплатных уроков о Тантра Рейки, Кундалини Рейки и Рейки Иггдрасиль. Возможно, эта программа будет интересна вашим друзьям.",
    linkLabel: "Открытая ссылка на программу",
    copy: "Копировать",
    copied: "Ссылка скопирована — вставьте её в сообщение.",
    copyError: "Не получилось скопировать автоматически. Выделите ссылку выше и скопируйте вручную.",
    share: "Отправить другу",
    message: "Возможно, тебе будет интересен бесплатный пятидневный курс Reiki Practitioner в Holistic House:",
    email: "Почта",
    privacy: "Передаётся только открытая ссылка на курс — без ваших ответов, отзывов и прогресса.",
  },
} as const;

/** Public invitation only. Never pass learner IDs, session state or private journal data. */
export function ReikiCourseReferralShare({ locale }: Props) {
  const t = copy[locale];
  const linkId = useId();
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const url = "https://holistichouse.vercel.app/" + locale + "/academy/reiki/free-practitioner-course";
  const message = t.message + " " + url;

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("CLIPBOARD_UNAVAILABLE");
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
      const input = document.getElementById(linkId) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }
  }

  async function shareLink() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t.heading, text: t.message, url });
        return;
      } catch (error) {
        // Cancelling the OS share sheet is not a failed send and must not copy silently.
        if ((error as { name?: string })?.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <details className={styles.root} data-reiki-referral-share>
      <summary aria-label={t.trigger} title={t.trigger}>
        <Share2 size={16} aria-hidden="true" />
        <span>{t.trigger}</span>
      </summary>
      <div className={styles.panel} role="group" aria-label={t.heading}>
        <h2><HeartHandshake size={20} aria-hidden="true" />{t.heading}</h2>
        <p>{t.description}</p>
        <label htmlFor={linkId}>{t.linkLabel}</label>
        <div className={styles.urlRow}>
          <input id={linkId} type="url" value={url} readOnly
            onFocus={event => event.currentTarget.select()} />
          <button type="button" onClick={copyLink} className={styles.copyButton}>
            {copyStatus === "copied" ? <Check size={17} aria-hidden="true" /> : <ClipboardCopy size={17} aria-hidden="true" />}
            {t.copy}
          </button>
        </div>
        <button type="button" className={styles.shareButton} onClick={shareLink}>
          <Share2 size={18} aria-hidden="true" />{t.share}
        </button>
        <nav className={styles.channels} aria-label={t.share}>
          <a href={"https://wa.me/?text=" + encodeURIComponent(message)}
            target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href={"https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(t.message)}
            target="_blank" rel="noopener noreferrer">Telegram</a>
          <a href={"mailto:?subject=" + encodeURIComponent(t.heading) + "&body=" + encodeURIComponent(message)}>
            <Mail size={14} aria-hidden="true" />{t.email}
          </a>
        </nav>
        <small>{t.privacy}</small>
        {copyStatus !== "idle" ? <p className={styles.feedback} role="status">
          {copyStatus === "copied" ? t.copied : t.copyError}
        </p> : null}
      </div>
    </details>
  );
}
