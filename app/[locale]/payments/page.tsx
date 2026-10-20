import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { publicServiceCatalog, type ServiceLocale } from "@/lib/commerce/catalog";
import { PERSONAL_PAYPAL_PAYEE, personalPayPalEnabled } from "@/lib/commerce/paypal-personal";
import { buildZenTransferInquiry } from "@/lib/commerce/zen-transfer-inquiry";
import styles from "./payments.module.css";

type PageProps = { params: Promise<{ locale: string }> };
const copy = {
  en: {
    back: "Services", tag: "PAYMENT OPTIONS · ONE-TIME SERVICES",
    title: "Pay for your personal session",
    lead: "Choose a fixed-price consultation. Please agree a suitable session time with Andrey before making a payment.",
    payee: "PayPal recipient", method: "Payment type", methodValue: "Goods & Services (not Friends & Family)",
    verify: "Check the recipient, the exact amount and EUR currency on PayPal before sending money.",
    choose: "Select a session", pay: "Pay via PayPal", after: "I have paid · send transaction ID",
    process: "After paying, send the PayPal transaction ID through WhatsApp for manual verification and to arrange your session.",
    disclaimer: "PayPal.Me requires the payer to have a PayPal account; a linked card may be used after sign-in, but this is not guest card checkout. The website cannot automatically verify a personal PayPal payment. We confirm the appointment only after verifying the received funds.",
    help: "Ask about availability first", contact: "Contact on WhatsApp",
    instructions: "If PayPal does not offer Goods & Services, don't send a personal Friends & Family transfer for a service. Contact us instead.",
    zenTitle: "Prefer ZEN.COM?",
    zenIntro: "Ask whether you can pay by EUR bank transfer. No payment is collected here; we first confirm the appointment and verified recipient details.",
    zenRequest: "Ask for ZEN.COM transfer details",
    otherPayment: "Other payment options",
  },
  ru: {
    back: "Услуги", tag: "СПОСОБЫ ОПЛАТЫ · РАЗОВЫЕ УСЛУГИ",
    title: "Оплата личной консультации",
    lead: "Выберите консультацию с фиксированной стоимостью. Перед оплатой согласуйте с Андреем удобное время сеанса.",
    payee: "Получатель в PayPal", method: "Тип платежа", methodValue: "Товары и услуги (не друзьям и семье)",
    verify: "Перед отправкой денег проверьте получателя, точную сумму и валюту EUR в PayPal.",
    choose: "Выберите формат", pay: "Оплатить через PayPal", after: "Я оплатил(а) · отправить ID транзакции",
    process: "После оплаты отправьте ID транзакции PayPal через WhatsApp. Мы вручную проверим поступление и согласуем сеанс.",
    disclaimer: "Для оплаты через PayPal.Me требуется аккаунт PayPal. Можно выбрать привязанную карту, но это не гостевая оплата картой. Сайт не проверяет поступление автоматически: сеанс подтверждается только после ручной проверки платежа.",
    help: "Сначала уточнить время", contact: "Написать в WhatsApp",
    instructions: "Если PayPal не предлагает «Товары и услуги», не переводите оплату за услугу как «Друзьям и семье». Свяжитесь с нами.",
    zenTitle: "Предпочитаете ZEN.COM?",
    zenIntro: "Узнайте, можно ли оплатить переводом EUR. Здесь деньги не списываются: сначала согласуем время и проверим реквизиты получателя.",
    zenRequest: "Запросить реквизиты ZEN.COM",
    otherPayment: "Другие способы оплаты",
  },
  es: {
    back: "Servicios", tag: "FORMAS DE PAGO · SERVICIOS ÚNICOS",
    title: "Paga tu consulta personal",
    lead: "Elige una consulta de precio fijo. Acuerda la fecha y hora con Andrey antes de enviar el pago.",
    payee: "Destinatario de PayPal", method: "Tipo de pago", methodValue: "Productos y servicios (no amigos y familiares)",
    verify: "Comprueba el destinatario, importe exacto y moneda EUR en PayPal antes de pagar.",
    choose: "Elige una sesión", pay: "Pagar con PayPal", after: "Ya pagué · enviar ID de transacción",
    process: "Después de pagar, envía el ID de transacción de PayPal por WhatsApp para la verificación manual y acordar tu sesión.",
    disclaimer: "PayPal.Me requiere una cuenta PayPal; puedes usar una tarjeta vinculada después de iniciar sesión, pero no es un pago con tarjeta como invitado. La web no confirma pagos automáticamente; verificamos los fondos antes de reservar la cita.",
    help: "Primero consultar disponibilidad", contact: "Contactar por WhatsApp",
    instructions: "Si PayPal no ofrece Productos y servicios, no pagues mediante Amigos y familiares por una consulta. Contáctanos.",
    zenTitle: "¿Prefieres ZEN.COM?",
    zenIntro: "Consulta si puedes pagar mediante transferencia en EUR. Aquí no se cobra: primero confirmamos la cita y los datos del destinatario.",
    zenRequest: "Solicitar datos para ZEN.COM",
    otherPayment: "Otras formas de pago",
  },
} as const;

const localeAllowed = (value: string): value is ServiceLocale =>
  value === "en" || value === "ru" || value === "es";

function receiptUrl(locale: ServiceLocale, service: string, euros: number) {
  const text = locale === "ru"
    ? `Здравствуйте! Я отправил(а) оплату €${euros} через PayPal.Me за услугу «${service}». ID транзакции PayPal: [впишите ID]. Проверьте поступление и подтвердите время встречи.`
    : locale === "es"
      ? `Hola. Envié €${euros} por PayPal.Me por ${service}. ID de transacción de PayPal: [añade el ID]. Por favor, verifica la recepción y confirma la sesión.`
      : `Hello! I sent €${euros} via PayPal.Me for ${service}. PayPal transaction ID: [insert ID]. Please verify receipt and confirm my session time.`;
  return "https://wa.me/14376066502?text=" + encodeURIComponent(text);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!localeAllowed(locale)) return { title: "Not found", robots: { index: false } };
  return {
    title: copy[locale].title + " — Holistic House",
    description: copy[locale].lead,
    robots: { index: false, follow: true },
  };
}

export default async function PersonalPayPalPaymentsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!localeAllowed(locale)) notFound();
  const t = copy[locale];
  const enabled = personalPayPalEnabled();
  const products = publicServiceCatalog(locale);
  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <section className={styles.shell} aria-labelledby="personal-payment-title">
        <div className={styles.intro}>
          <Link className={styles.back} href={`/${locale}/services`}>← {t.back}</Link>
          <p className={styles.eyebrow}>{t.tag}</p>
          <h1 id="personal-payment-title">{t.title}</h1>
          <p>{t.lead}</p>
        </div>
        <div className={styles.notice}>
          <ShieldCheck size={22} aria-hidden="true" />
          <div className={styles.noticeText}>
            <strong>{t.payee}: {PERSONAL_PAYPAL_PAYEE}</strong>
            <span>{t.method}: {t.methodValue}</span>
            <small>{t.verify}</small>
          </div>
        </div>
        <div className={styles.zenNotice} data-zen-manual-inquiry>
          <strong>{t.zenTitle}</strong><p>{t.zenIntro}</p>
        </div>
        <h2 className={styles.heading}>{t.choose}</h2>
        <div className={styles.cards}>
          {products.map((product) => {
            const euros = product.amountMinor / 100;
            const zenInquiryUrl = buildZenTransferInquiry([product.id], locale);
            return <article key={product.id} className={styles.card} data-paypal-personal-service={product.id}>
              <div className={styles.productHead}>
                <span className={styles.duration}>{product.durationMinutes} min</span>
                <span className={styles.price}>€{euros}</span>
              </div>
              <h3>{product.title}</h3>
              <p>{product.description}</p>
              {enabled ? <a href={`/api/payments/paypal/${product.id}`} className={styles.payButton}
                  target="_blank" rel="noopener noreferrer" data-paypal-personal-link>
                {t.pay} · €{euros} <ArrowUpRight size={17} aria-hidden="true" />
              </a> : <p className={styles.unavailable}>{t.help}</p>}
              <Link href={"/" + locale + "/cart?items=" + encodeURIComponent(product.id)} className={styles.zenButton} data-other-payment-methods>
                {t.otherPayment} <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
              {zenInquiryUrl ? <a href={zenInquiryUrl} className={styles.zenButton}
                target="_blank" rel="noopener noreferrer" data-zen-transfer-inquiry={product.id}>
                {t.zenRequest} <MessageCircle size={17} aria-hidden="true" />
              </a> : null}
              <a href={receiptUrl(locale, product.title, euros)} className={styles.receiptButton}
                target="_blank" rel="noopener noreferrer" data-paypal-manual-confirmation>
                <MessageCircle size={17} aria-hidden="true" /> {t.after}
              </a>
            </article>;
          })}
        </div>
        <div className={styles.final}>
          <div className={styles.step}><BadgeCheck size={21} aria-hidden="true" /><p>{t.process}</p></div>
          <p className={styles.warning}>{t.instructions}</p>
          <p className={styles.disclaimer}>{t.disclaimer}</p>
          <a className={styles.contact} href="https://wa.me/14376066502" target="_blank" rel="noopener noreferrer">{t.contact} →</a>
        </div>
      </section>
    </main>
  );
}
