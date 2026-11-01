"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./tantra-free-initiation.module.css";

type Intent = "free" | "personal" | "session" | "answers" | "feedback";
type Option = { intent: Intent; label: string; whatsappUrl: string };
type Props = {
  locale: PublicLocale;
  service: string;
  heading: string;
  tagline: string;
  lead: string;
  choose: string;
  note: string;
  options: Option[];
};

// The message drafts and localized strings are prepared by the server.
// Only selection and opt-in phone capture live in this client component.
export function TantraInitiationChoice({
  locale, service, heading, tagline, lead, choose, note, options,
}: Props) {
  const [interactive, setInteractive] = useState(false);
  const [intent, setIntent] = useState<Intent>("free");
  const selected = options.find(option => option.intent === intent) ?? options[0];

  // Preserve #apply-free/personal/session/answers/feedback from other CTAs.
  useEffect(() => {
    const selectFromHash = () => {
      const next = options.find(option => window.location.hash === "#apply-" + option.intent);
      if (next) setIntent(next.intent);
    };
    selectFromHash();
    setInteractive(true);
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, [options]);

  return (
    <div className={styles.whatsappCapture} data-tantra-whatsapp-capture>
      <div className={styles.whatsappIntro}>
        <p className={styles.whatsappTagline}>{tagline}</p>
        <h3 className={styles.whatsappTitle}>{heading}</h3>
        <p className={styles.whatsappLead}>{lead}</p>
      </div>
      <div className={styles.whatsappAnchors} aria-hidden="true">
        {options.map(option => <span id={"apply-" + option.intent} key={option.intent} />)}
      </div>
      <div className={styles.whatsappField}>
        <label htmlFor={"tantra-request-" + locale}>{choose}</label>
        <span className={styles.whatsappSelectWrap}>
          <select
            id={"tantra-request-" + locale}
            disabled={!interactive}
            value={intent}
            onChange={event => {
              const next = options.find(option => option.intent === event.target.value);
              if (next) setIntent(next.intent);
            }}
          >
            {options.map(option => <option key={option.intent} value={option.intent}>{option.label}</option>)}
          </select>
          <ChevronDown size={19} aria-hidden="true" />
        </span>
      </div>
      <ContactChannelChooser
        key={intent}
        compactPhone
        stayAfterSave
        locale={locale}
        resetKey={"tantra-initiation-" + locale + "-" + intent}
        whatsappUrl={selected.whatsappUrl}
        publicTopic={service + " · " + selected.label}
      />
      <p className={styles.whatsappNote}>{note}</p>
    </div>
  );
}
