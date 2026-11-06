"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, X } from "lucide-react";
import { HolisticAgentChat } from "@/components/holistic-agent-chat";
import { getIHelpContext, type IHelpContext } from "@/lib/ihelp-context.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./sitewide-ihelp.module.css";

const words = {
  en: { open: "Open contextual AI help", close: "Close help", title: "iHelp · AI Messenger",
    subtitle: "Suggestions for this page", disclosure: "AI guidance · not a human or therapist" },
  ru: { open: "Открыть iHelp", close: "Закрыть iHelp", title: "iHelp · ИИ-мессенджер",
    subtitle: "Подсказки для этой страницы", disclosure: "ИИ-помощник · не человек и не психотерапевт" },
  es: { open: "Abrir iHelp", close: "Cerrar iHelp", title: "iHelp · Mensajero de IA",
    subtitle: "Ayuda para esta página", disclosure: "Guía de IA · no es una persona ni terapeuta" },
} as const;

// Only use pre-approved UI identifiers. Never inspect user-entered text,
// assessment values, private CRM messages, DOM page content or URL query data.
function selectedPublicTab(): string {
  const video = document.querySelector<HTMLElement>("[data-video-quick-control][aria-pressed='true']");
  const studioTab = video?.dataset.videoQuickControl || "";
  if (/^(video|effects|style|hypno|audio|text|editor|montage|settings|ideas|idea)$/.test(studioTab))
    return studioTab;
  const studio = document.querySelector<HTMLElement>("[data-mandala-free-video]");
  const montage = studio?.dataset.montagePanel || "";
  if (/^(text|audio|effects|settings)$/.test(montage)) return montage;
  const selected = document.querySelector<HTMLElement>("[role='tab'][aria-selected='true']");
  const tabId = selected?.getAttribute("data-tab") || selected?.getAttribute("data-section") || "";
  if (/^(video|effects|audio|text|settings|ideas|orders|clients)$/.test(tabId)) return tabId;
  return "";
}

export function SitewideIHelp({ initialLocale = "en" }: { initialLocale?: PublicLocale }) {
  const pathname = usePathname() || "/";
  const match = pathname.match(/^\/(ru|en|es)(?=\/|$)/);
  const locale = (match?.[1] || initialLocale) as PublicLocale;
  const t = words[locale];
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<IHelpContext | null>(null);

  // Route changes close help; a new click always reads the current visible tab.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [open]);

  function showHelp() {
    setContext(getIHelpContext({ pathname, locale, tab: selectedPublicTab() }));
    setOpen(true);
  }
  function closeHelp() {
    setOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus({ preventScroll: true }));
  }

  return <>
    <button ref={launcherRef} type="button" className={styles.launcher}
      data-hh-ihelp-launch aria-label={t.open} aria-haspopup="dialog" aria-expanded={open}
      onClick={showHelp}>
      <HelpCircle size={19} aria-hidden="true" strokeWidth={2.3} />
      <span>iHelp</span>
    </button>
    {open && context && <dialog ref={dialogRef} className={styles.dialog}
      data-hh-ihelp-dialog aria-labelledby="hh-ihelp-title"
      onCancel={event => { event.preventDefault(); closeHelp(); }}
      onClick={event => { if (event.target === event.currentTarget) closeHelp(); }}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <strong id="hh-ihelp-title">{t.title}</strong>
            <span>{t.subtitle}</span>
          </div>
          <button type="button" className={styles.close} onClick={closeHelp} aria-label={t.close}>
            <X size={21} aria-hidden="true"/>
          </button>
        </header>
        <div className={styles.chat}>
          <HolisticAgentChat locale={locale} compact entryContext={context}/>
        </div>
        <p className={styles.disclosure}>{t.disclosure}</p>
      </div>
    </dialog>}
  </>;
}
