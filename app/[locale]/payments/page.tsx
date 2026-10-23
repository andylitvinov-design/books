import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { getCommerceConfig } from "@/lib/commerce/config";
import { publicServiceCatalog, type ServiceLocale } from "@/lib/commerce/catalog";
import { PERSONAL_PAYPAL_PAYEE, personalPayPalEnabled, buildPersonalPayPalCartUrl } from "@/lib/commerce/paypal-personal";
import { buildInteracTransferInquiry } from "@/lib/commerce/interac-transfer-inquiry";
import { configuredSquarePaymentLinks, buildSquarePaymentForServices, formatSquareCadAmount } from "@/lib/commerce/square-payment-links";
import { buildZenTransferInquiry } from "@/lib/commerce/zen-transfer-inquiry";
import { configuredPayPalHostedLinks, buildPayPalHostedCartUrl } from "@/lib/commerce/paypal-hosted-links";
import styles from "./payments.module.css";

type PageProps = { params: Promise<{ locale: string }> };
const copy = {
  en: {
    back: "Services", tag: "PAYMENT OPTIONS · ONE-TIME SERVICES",
    title: "Pay for your personal session",
    lead: "Choose a fixed-price consultation. Please agree a suitable session time with Andrey before making a payment.",
    payee: "PayPal recipient", method: "Payment type", methodValue: "Goods & Services (not Friends & Family)",
    verify: "Check the recipient, the exact amount and EUR currency on PayPal before sending money.",
    choose: "Select a session", pay: "PayPal.Me · manual confirmation", hostedPay: "Pay on PayPal · fixed EUR total", hostedInfo: "This opens PayPal checkout. Check the merchant and exact EUR total. Payment must still be verified after transfer.", autoPay: "Secure checkout · automatic confirmation", after: "I have paid · send transaction ID",
    process: "After paying, send the PayPal transaction ID through WhatsApp for manual verification and to arrange your session.",
    disclaimer: "PayPal.Me requires the payer to have a PayPal account; a linked card may be used after sign-in, but this is not guest card checkout. The website cannot automatically verify a personal PayPal payment. We confirm the appointment only after verifying the received funds.",
    help: "Ask about availability first", contact: "Contact on WhatsApp",
    instructions: "If PayPal does not offer Goods & Services, don't send a personal Friends & Family transfer for a service. Contact us instead.",
    zenTitle: "Prefer ZEN.COM?",
    zenIntro: "Ask whether you can pay by EUR bank transfer. No payment is collected here; we first confirm the appointment and verified recipient details.",
    zenRequest: "Ask for ZEN.COM transfer details",
    otherPayment: "View full cart", extraMethods: "More payment options",
    interacTitle: "In Canada without PayPal?", interacIntro: "You can request an Interac e-Transfer. First we confirm a CAD amount, recipient and appointment time. No transfer happens when you click.",
    interacRequest: "Request Interac details", squareAction: "Pay by card via Square", squareAfter: "Paid with Square? Send transaction reference",
    squareNote: "Square charges the displayed CAD amount, not the EUR catalog price. We verify receipt manually; payment does not book an appointment.",
    combinedTitle: "Both consultations", combinedIntro: "30 + 60 minutes. Appointment times confirmed personally; no automatic booking.",
    combinedPay: "Pay both through PayPal", combinedCart: "Review both in cart",
  },
  ru: {
    back: "Услуги", tag: "СПОСОБЫ ОПЛАТЫ · РАЗОВЫЕ УСЛУГИ",
    title: "Оплата личной консультации",
    lead: "Выберите консультацию с фиксированной стоимостью. Перед оплатой согласуйте с Андреем удобное время сеанса.",
    payee: "Получатель в PayPal", method: "Тип платежа", methodValue: "Товары и услуги (не друзьям и семье)",
    verify: "Перед отправкой денег проверьте получателя, точную сумму и валюту EUR в PayPal.",
    choose: "Выберите формат", pay: "PayPal.Me · ручная проверка", hostedPay: "Оплатить через PayPal · точная сумма", hostedInfo: "Откроется защищённая оплата PayPal. Проверьте получателя и сумму в EUR. Поступление подтверждается после сверки транзакции.", autoPay: "Оплатить · автоматическое подтверждение", after: "Я оплатил(а) · отправить ID транзакции",
    process: "После оплаты отправьте ID транзакции PayPal через WhatsApp. Мы вручную проверим поступление и согласуем сеанс.",
    disclaimer: "Для оплаты через PayPal.Me требуется аккаунт PayPal. Можно выбрать привязанную карту, но это не гостевая оплата картой. Сайт не проверяет поступление автоматически: сеанс подтверждается только после ручной проверки платежа.",
    help: "Сначала уточнить время", contact: "Написать в WhatsApp",
    instructions: "Если PayPal не предлагает «Товары и услуги», не переводите оплату за услугу как «Друзьям и семье». Свяжитесь с нами.",
    zenTitle: "Предпочитаете ZEN.COM?",
    zenIntro: "Узнайте, можно ли оплатить переводом EUR. Здесь деньги не списываются: сначала согласуем время и проверим реквизиты получателя.",
    zenRequest: "Запросить реквизиты ZEN.COM",
    otherPayment: "Открыть полную корзину", extraMethods: "Другие варианты",
    interacTitle: "В Канаде без PayPal?", interacIntro: "Можно запросить перевод Interac e-Transfer. Сначала согласуем сумму в CAD, получателя и время сеанса. При нажатии деньги не списываются.",
    interacRequest: "Запросить Interac", squareAction: "Оплатить картой через Square", squareAfter: "Оплатили через Square? Отправить номер транзакции",
    squareNote: "Square списывает указанную сумму в CAD, а не цену каталога в EUR. Поступление проверяем вручную; оплата не бронирует время сеанса.",
    combinedTitle: "Обе консультации", combinedIntro: "30 + 60 минут. Время согласуется лично, бронирование не происходит автоматически.",
    combinedPay: "Оплатить обе через PayPal", combinedCart: "Проверить обе услуги в корзине",
  },
  es: {
    back: "Servicios", tag: "FORMAS DE PAGO · SERVICIOS ÚNICOS",
    title: "Paga tu consulta personal",
    lead: "Elige una consulta de precio fijo. Acuerda la fecha y hora con Andrey antes de enviar el pago.",
    payee: "Destinatario de PayPal", method: "Tipo de pago", methodValue: "Productos y servicios (no amigos y familiares)",
    verify: "Comprueba el destinatario, importe exacto y moneda EUR en PayPal antes de pagar.",
    choose: "Elige una sesión", pay: "PayPal.Me · verificación manual", hostedPay: "Pagar en PayPal · precio fijo en EUR", hostedInfo: "Se abre el pago seguro de PayPal. Comprueba el destinatario y el total en EUR. El pago se verifica después de recibirlo.", autoPay: "Pago seguro · confirmación automática", after: "Ya pagué · enviar ID de transacción",
    process: "Después de pagar, envía el ID de transacción de PayPal por WhatsApp para la verificación manual y acordar tu sesión.",
    disclaimer: "PayPal.Me requiere una cuenta PayPal; puedes usar una tarjeta vinculada después de iniciar sesión, pero no es un pago con tarjeta como invitado. La web no confirma pagos automáticamente; verificamos los fondos antes de reservar la cita.",
    help: "Primero consultar disponibilidad", contact: "Contactar por WhatsApp",
    instructions: "Si PayPal no ofrece Productos y servicios, no pagues mediante Amigos y familiares por una consulta. Contáctanos.",
    zenTitle: "¿Prefieres ZEN.COM?",
    zenIntro: "Consulta si puedes pagar mediante transferencia en EUR. Aquí no se cobra: primero confirmamos la cita y los datos del destinatario.",
    zenRequest: "Solicitar datos para ZEN.COM",
    otherPayment: "Abrir el carrito", extraMethods: "Más opciones",
    interacTitle: "¿En Canadá sin PayPal?", interacIntro: "Puedes solicitar Interac e-Transfer. Primero confirmamos el importe en CAD, destinatario y cita. Hacer clic no envía dinero.",
    interacRequest: "Solicitar Interac", squareAction: "Pagar con tarjeta vía Square", squareAfter: "¿Pagaste con Square? Enviar referencia",
    squareNote: "Square cobra el importe indicado en CAD, no el precio EUR del catálogo. Verificamos los fondos manualmente; el pago no reserva una cita.",
    combinedTitle: "Ambas consultas", combinedIntro: "30 + 60 minutos. Confirmaremos personalmente el horario; no hay reserva automática.",
    combinedPay: "Pagar ambas con PayPal", combinedCart: "Ver ambas en el carrito",
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

function squareReceiptUrl(locale: ServiceLocale, service: string, cadAmount: string) {
  const text = locale === "ru"
    ? `Здравствуйте! Прошу проверить оплату ${cadAmount} через Square за услугу «${service}». Номер транзакции Square: [впишите ID]. Проверьте поступление и согласуйте время встречи.`
    : locale === "es"
      ? `Hola. Por favor, verifica mi pago de ${cadAmount} vía Square por ${service}. Referencia de Square: [añade el ID]. Confirma la recepción y acordemos el horario.`
      : `Hello! Please verify my ${cadAmount} Square payment for ${service}. Square transaction reference: [insert ID]. Please confirm receipt and arrange a session time.`;
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
  const commerce = getCommerceConfig();
  const verifiedPayPalCheckout = commerce.provider === "paypal" && commerce.enabled;
  const enabled = personalPayPalEnabled();
  const products = publicServiceCatalog(locale);
  const squareLinks = configuredSquarePaymentLinks();
  const hostedPayPalLinks = configuredPayPalHostedLinks();
  const combinedIds = products.map(product => product.id);
  const combinedPayPalUrl = enabled && products.length === 2 ? buildPersonalPayPalCartUrl(combinedIds) : null;
  const combinedHostedUrl = products.length === 2 ? buildPayPalHostedCartUrl(combinedIds, hostedPayPalLinks) : null;
  const combinedEuros = products.reduce((sum, product) => sum + product.amountMinor, 0) / 100;
  const combinedAvailable = products.length === 2 && (verifiedPayPalCheckout || Boolean(combinedPayPalUrl) || Boolean(combinedHostedUrl));
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
        <div className={styles.zenNotice} data-interac-manual-inquiry>
          <strong>{t.interacTitle}</strong><p>{t.interacIntro}</p>
        </div>
        <h2 className={styles.heading}>{t.choose}</h2>
        <div className={styles.cards}>
          {products.map((product) => {
            const euros = product.amountMinor / 100;
            const zenInquiryUrl = buildZenTransferInquiry([product.id], locale);
            const interacInquiryUrl = buildInteracTransferInquiry([product.id], locale);
            const squarePayment = buildSquarePaymentForServices([product.id], squareLinks);
            const hostedPayPalUrl = buildPayPalHostedCartUrl([product.id], hostedPayPalLinks);
            return <article key={product.id} className={styles.card} data-paypal-personal-service={product.id}>
              <div className={styles.productHead}>
                <span className={styles.duration}>{product.durationMinutes} min</span>
                <span className={styles.price}>€{euros}</span>
              </div>
              <h3>{product.title}</h3>
              <p>{product.description}</p>
              {verifiedPayPalCheckout ? <Link
                href={`/${locale}/services/checkout?service=${encodeURIComponent(product.id)}`}
                className={styles.payButton} data-verified-paypal-checkout={product.id}>
                {t.autoPay} · €{euros} <ArrowUpRight size={17} aria-hidden="true" />
              </Link> : !hostedPayPalUrl ? null :
                <a className={styles.payButton} href={hostedPayPalUrl} target="_blank"
                  rel="noopener noreferrer" data-paypal-hosted-link={product.id}>
                  {t.hostedPay} · €{euros} <ArrowUpRight size={17} aria-hidden="true" />
                </a>}
              {enabled ? <a href={`/api/payments/paypal/${product.id}`}
                  className={verifiedPayPalCheckout || hostedPayPalUrl ? styles.zenButton : styles.payButton}
                  target="_blank" rel="noopener noreferrer" data-paypal-personal-link>
                {t.pay} · €{euros} <ArrowUpRight size={17} aria-hidden="true" />
              </a> : verifiedPayPalCheckout || hostedPayPalUrl ? null : <p className={styles.unavailable}>{t.help}</p>}
              {squarePayment ? <div data-square-payment-options={product.id}>
                <a href={squarePayment.url} className={styles.payButton}
                  target="_blank" rel="noopener noreferrer" data-square-personal-link={product.id}>
                  {t.squareAction} · {formatSquareCadAmount(squarePayment.amountMinor, locale)} <ArrowUpRight size={17} aria-hidden="true" />
                </a>
                <p>{t.squareNote}</p>
                <a href={squareReceiptUrl(locale, product.title, formatSquareCadAmount(squarePayment.amountMinor, locale)!)}
                  className={styles.receiptButton} target="_blank" rel="noopener noreferrer" data-square-manual-confirmation={product.id}>
                  <MessageCircle size={17} aria-hidden="true" /> {t.squareAfter}
                </a>
              </div> : null}
              {interacInquiryUrl ? <a href={interacInquiryUrl} className={styles.zenButton}
                target="_blank" rel="noopener noreferrer" data-interac-direct-inquiry={product.id}>
                {t.interacRequest} <MessageCircle size={17} aria-hidden="true" />
              </a> : null}
              <details className={styles.otherDetails} data-zen-manual-inquiry>
                <summary>{t.extraMethods}</summary>
                <div className={styles.otherActions}>
                  <Link href={"/" + locale + "/cart?items=" + encodeURIComponent(product.id)}
                    className={styles.zenButton} data-other-payment-methods>
                    {t.otherPayment} <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                  {zenInquiryUrl ? <a href={zenInquiryUrl} className={styles.zenButton}
                    target="_blank" rel="noopener noreferrer" data-zen-transfer-inquiry={product.id}>
                    {t.zenRequest} <MessageCircle size={17} aria-hidden="true" />
                  </a> : null}
                  <p>{t.zenIntro}</p>
                </div>
              </details>
              <a href={receiptUrl(locale, product.title, euros)} className={styles.receiptButton}
                target="_blank" rel="noopener noreferrer" data-paypal-manual-confirmation>
                <MessageCircle size={17} aria-hidden="true" /> {t.after} · PayPal
              </a>
            </article>;
          })}
        </div>
        {combinedAvailable ? <div className={styles.combined} data-paypal-combined-cart>
          <div>
            <strong>{t.combinedTitle} · €{combinedEuros}</strong>
            <p>{t.combinedIntro}</p>
          </div>
          <div className={styles.combinedActions}>
            {verifiedPayPalCheckout ? <Link href={`/${locale}/services/checkout?items=${combinedIds.join(",")}`}
              className={styles.payButton} data-verified-paypal-combined>
              {t.autoPay} · €{combinedEuros} <ArrowUpRight size={17} aria-hidden="true" />
            </Link> : combinedHostedUrl ? <a href={combinedHostedUrl}
              className={styles.payButton} target="_blank" rel="noopener noreferrer" data-paypal-hosted-combined>
              {t.hostedPay} · €{combinedEuros} <ArrowUpRight size={17} aria-hidden="true" />
            </a> : null}
            {combinedPayPalUrl ? <a href={combinedPayPalUrl}
              className={verifiedPayPalCheckout || combinedHostedUrl ? styles.zenButton : styles.payButton}
              target="_blank" rel="noopener noreferrer" data-paypal-combined-link>
              {t.combinedPay} · €{combinedEuros} <ArrowUpRight size={17} aria-hidden="true" />
            </a> : null}
            <Link className={styles.zenButton} href={"/" + locale + "/cart?items=" + combinedIds.join(",")} data-combined-cart-link>
              {t.combinedCart} <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div> : null}
        <div className={styles.final}>
          <div className={styles.step}><BadgeCheck size={21} aria-hidden="true" /><p>{t.process}</p></div>
          <p className={styles.warning}>{t.instructions}</p>
          <p className={styles.disclaimer}>{t.disclaimer}</p>
          {Object.keys(hostedPayPalLinks).length ? <p className={styles.disclaimer}>{t.hostedInfo}</p> : null}
          <a className={styles.contact} href="https://wa.me/14376066502" target="_blank" rel="noopener noreferrer">{t.contact} →</a>
        </div>
      </section>
    </main>
  );
}

