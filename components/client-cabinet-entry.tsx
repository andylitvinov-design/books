"use client";

import { FormEvent, useState } from "react";

import type { Locale } from "@/data/remedies";

const selectorPattern = /^[A-Za-z0-9_-]{22}$/;
const secretPattern = /^[A-Za-z0-9_-]{43}$/;

const copy = {
  en: {
    label: "Your private cabinet link",
    placeholder: "Paste the private link you received from Andy",
    action: "Open Client Cabinet",
    help: "The cabinet uses a private access link rather than an email/password login.",
    invalid: "That does not look like a valid Holistic House cabinet link.",
    missing: "Need your private link?",
    contact: "Contact Andy",
  },
  ru: {
    label: "Ваша приватная ссылка на кабинет",
    placeholder: "Вставьте приватную ссылку, которую вы получили от Andy",
    action: "Войти в кабинет клиента",
    help: "Для входа используется индивидуальная приватная ссылка, а не email и пароль.",
    invalid: "Похоже, это невалидная ссылка на кабинет Holistic House.",
    missing: "Нужна приватная ссылка?",
    contact: "Связаться с Andy",
  },
} as const;

function parsePrivateLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed, window.location.origin);
    const match = url.pathname.match(/^\/(?:en|ru)\/client\/([A-Za-z0-9_-]{22})\/?$/);
    const secret = url.hash.startsWith("#") ? url.hash.slice(1) : "";
    if (!match || !selectorPattern.test(match[1]) || !secretPattern.test(secret)) return undefined;
    return { selector: match[1], secret };
  } catch {
    return undefined;
  }
}

export function ClientCabinetEntry({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = parsePrivateLink(String(data.get("privateLink") ?? ""));
    if (!parsed) {
      setError(text.invalid);
      return;
    }

    setError("");
    window.location.assign(`/${locale}/client/${parsed.selector}#${parsed.secret}`);
  }

  return (
    <form className="client-entry-form" onSubmit={submit}>
      <label>
        <span>{text.label}</span>
        <input
          autoCapitalize="off"
          autoComplete="off"
          name="privateLink"
          placeholder={text.placeholder}
          spellCheck={false}
          type="text"
        />
      </label>
      <button type="submit">{text.action}<span aria-hidden="true">→</span></button>
      <p className="client-entry-help">{text.help}</p>
      {error && <p className="client-entry-error" role="alert">{error}</p>}
      <p className="client-entry-contact">{text.missing} <a href="https://t.me/AndyTherapist" rel="noreferrer" target="_blank">{text.contact}</a></p>
    </form>
  );
}
