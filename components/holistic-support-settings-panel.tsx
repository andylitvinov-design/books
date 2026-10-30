"use client";

import Link from "next/link";
import { Bell, ChevronRight, CreditCard, LockKeyhole, Mail, Settings2, Smartphone, UserRound, X } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-mobile.module.css";

const copy = {
  en: {
    title: "Profile & settings", intro: "Your Google account, personal details and preferences are managed in one private place.",
    language: "Language", account: "My account", accountHint: "Sign in, name, email, timezone and goals",
    notices: "Notifications", noticesHint: "Messages, phone alerts and permissions",
    contact: "Contact & messages", contactHint: "Phone number and communication consent",
    billing: "Plan & payments", billingHint: "Membership and available payment settings",
    privacy: "Privacy & security", privacyHint: "Data export, sessions and deletion request",
    open: "Open all settings", close: "Close settings", private: "Private data is shown only after Google sign-in."
  },
  ru: {
    title: "Профиль и настройки", intro: "Аккаунт Google, личные данные и все параметры собраны в одном защищённом кабинете.",
    language: "Язык", account: "Мой аккаунт", accountHint: "Вход, имя, почта, часовой пояс и цели",
    notices: "Уведомления", noticesHint: "Сообщения, телефон и разрешения",
    contact: "Контакты и сообщения", contactHint: "Номер телефона и согласия на связь",
    billing: "Подписка и оплата", billingHint: "Тариф и доступные параметры оплаты",
    privacy: "Приватность и безопасность", privacyHint: "Выгрузка данных, сеансы и удаление",
    open: "Все настройки", close: "Закрыть настройки", private: "Личные данные видны только после входа через Google."
  },
  es: {
    title: "Perfil y ajustes", intro: "Tu cuenta de Google, datos personales y preferencias en un espacio privado.",
    language: "Idioma", account: "Mi cuenta", accountHint: "Acceso, nombre, correo, zona horaria y objetivos",
    notices: "Notificaciones", noticesHint: "Mensajes, avisos y permisos",
    contact: "Contacto y mensajes", contactHint: "Teléfono y consentimiento",
    billing: "Plan y pagos", billingHint: "Suscripción y opciones de pago disponibles",
    privacy: "Privacidad y seguridad", privacyHint: "Exportación, sesiones y solicitud de eliminación",
    open: "Todos los ajustes", close: "Cerrar ajustes", private: "Los datos personales solo aparecen después de acceder con Google."
  },
} as const;

export function HolisticSupportSettingsPanel({
  locale, id, section, privacyNote, onClose,
}: {
  locale: PublicLocale; id: string; section: "mobile" | "mandala";
  privacyNote?: string; onClose: () => void;
}) {
  const t = copy[locale];
  const base = `/${locale}/app/settings`;
  const links = [
    { id: "hh-settings-account", title: t.account, subtitle: t.accountHint, Icon: UserRound },
    { id: "hh-settings-notifications", title: t.notices, subtitle: t.noticesHint, Icon: Bell },
    { id: "hh-settings-phone", title: t.contact, subtitle: t.contactHint, Icon: Mail },
    { id: "hh-settings-subscription", title: t.billing, subtitle: t.billingHint, Icon: CreditCard },
    { id: "hh-settings-privacy", title: t.privacy, subtitle: t.privacyHint, Icon: LockKeyhole },
  ];
  return (
    <section className={styles.settingsPanel} id={id} aria-label={t.title} data-unified-settings-entry>
      <div className={styles.settingsTitleRow}>
        <h2><Settings2 size={21} aria-hidden="true" />{t.title}</h2>
        <button type="button" className={styles.settingsCloseIcon} onClick={onClose} aria-label={t.close}><X size={18} aria-hidden="true" /></button>
      </div>
      <p className={styles.settingsIntro}>{t.intro}</p>
      <p className={styles.settingsLocaleLabel}>{t.language}</p>
      <div className={styles.localeLinks}>
        {(["en", "ru", "es"] as const).map(language => (
          <Link key={language} href={`/${language}/holistic-support/${section}`} hrefLang={language} aria-current={locale === language ? "page" : undefined}>
            {language.toUpperCase()}
          </Link>
        ))}
      </div>
      <nav className={styles.settingsLinks} aria-label={t.open}>
        {links.map(({ id: anchor, title, subtitle, Icon }) => (
          <Link key={anchor} href={base + "#" + anchor} prefetch={false} className={styles.settingsEntry}>
            <Icon size={19} aria-hidden="true" />
            <span><strong>{title}</strong><small>{subtitle}</small></span>
            <ChevronRight size={17} aria-hidden="true" />
          </Link>
        ))}
      </nav>
      <Link className={styles.settingsOpenAll} href={base} prefetch={false}><Smartphone size={17} aria-hidden="true" />{t.open}<ChevronRight size={17} aria-hidden="true" /></Link>
      <p className={styles.settingsPrivacy}><LockKeyhole size={14} aria-hidden="true" />{t.private}</p>
      {privacyNote ? <p className={styles.settingsLocalPrivacy}>{privacyNote}</p> : null}
    </section>
  );
}
