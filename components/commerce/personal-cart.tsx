"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, MessageCircle, ShoppingBasket, Trash2 } from "lucide-react";
import { formatServiceAmount, publicServiceCatalog, type ServiceLocale } from "@/lib/commerce/catalog";
import { restoreServiceCart, SERVICE_CART_STORAGE_KEY, SERVICE_CART_UPDATED_EVENT } from "@/lib/commerce/cart";
import { buildPersonalPayPalCartUrl } from "@/lib/commerce/paypal-personal";
import { buildZenTransferInquiry } from "@/lib/commerce/zen-transfer-inquiry";
import styles from "./personal-cart.module.css";

type Method = "paypal" | "zen" | "wise";

const copy = {
  en: {
    back: "Services", title: "Your cart", subtitle: "Review your consultations and choose how to pay.",
    empty: "Your cart is empty.", choose: "Choose a consultation", remove: "Remove",
    total: "Total", minute: "min", method: "Payment method", paypal: "PayPal", zen: "ZEN.COM", wise: "Wise",
    paypalAction: "Continue to PayPal", zenAction: "Request ZEN transfer details",
    wiseAction: "Open Wise", wiseItem: "Pay for", 
    paypalNote: "Personal PayPal.Me: select Goods & Services, verify Andrii Litvinov, EUR and the total. Payment is verified manually.",
    zenNote: "ZEN.COM opens a WhatsApp request for transfer details, not a payment. Don't transfer before confirmation.",
    wiseNote: "Wise may require you to enter the amount yourself. Verify the recipient and EUR amount before sending.",
    afterPay: "Already paid? Send transaction reference", confirm: "After paying, send your transaction reference so we can verify it.",
    book: "Ask about available times", checkoutNote: "Adding to the cart does not reserve a session. We will confirm your time personally.",
    free: "Free drawing assessment + written report", secure: "One-time payment, no subscription",
  },
  ru: {
    back: "Услуги", title: "Корзина", subtitle: "Проверьте услуги и выберите способ оплаты.",
    empty: "Корзина пока пуста.", choose: "Выбрать консультацию", remove: "Убрать",
    total: "Итого", minute: "мин", method: "Способ оплаты", paypal: "PayPal", zen: "ZEN.COM", wise: "Wise",
    paypalAction: "Перейти в PayPal", zenAction: "Запросить реквизиты ZEN",
    wiseAction: "Открыть Wise", wiseItem: "Оплатить",
    paypalNote: "Личный PayPal.Me: выберите «Товары и услуги», проверьте Andrii Litvinov, валюту EUR и сумму. Оплата проверяется вручную.",
    zenNote: "ZEN.COM открывает запрос реквизитов в WhatsApp, а не оплату. Не переводите деньги до подтверждения.",
    wiseNote: "В Wise сумму иногда нужно вводить вручную. Проверьте получателя и сумму в EUR перед переводом.",
    afterPay: "Уже оплатили? Отправить номер транзакции", confirm: "После оплаты отправьте номер транзакции для ручной проверки.",
    book: "Уточнить свободное время", checkoutNote: "Корзина не бронирует сеанс. Время согласуем лично.",
    free: "Бесплатный разбор рисунка + письменный отчёт", secure: "Разовая оплата, без подписки",
  },
  es: {
    back: "Servicios", title: "Tu carrito", subtitle: "Revisa las consultas y elige cómo pagar.",
    empty: "El carrito está vacío.", choose: "Elegir una consulta", remove: "Quitar",
    total: "Total", minute: "min", method: "Forma de pago", paypal: "PayPal", zen: "ZEN.COM", wise: "Wise",
    paypalAction: "Continuar a PayPal", zenAction: "Solicitar datos para ZEN",
    wiseAction: "Abrir Wise", wiseItem: "Pagar",
    paypalNote: "PayPal.Me personal: selecciona Productos y servicios y verifica Andrii Litvinov, EUR y el total. Verificación manual.",
    zenNote: "ZEN.COM abre una consulta de datos bancarios por WhatsApp, no es un pago. Espera la confirmación.",
    wiseNote: "Puede que debas introducir el importe en Wise. Verifica el destinatario y el importe en EUR.",
    afterPay: "¿Ya pagaste? Enviar referencia", confirm: "Después de pagar, envía la referencia de la transacción para verificarla.",
    book: "Consultar horarios", checkoutNote: "Añadir al carrito no reserva una cita. Confirmaremos el horario personalmente.",
    free: "Evaluación gratuita por dibujo + informe escrito", secure: "Pago único, sin suscripción",
  },
} as const;

export function PersonalCart({ locale, paypalEnabled, wiseEnabled }: {
  locale: ServiceLocale;
  paypalEnabled: boolean;
  wiseEnabled: boolean;
}) {
  const t = copy[locale];
  const id = useId();
  const products = publicServiceCatalog(locale);
  const [selected, setSelected] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);
  const [method, setMethod] = useState<Method>(paypalEnabled ? "paypal" : "zen");

  useEffect(() => {
    let stored: string[] = [];
    try { stored = restoreServiceCart(window.sessionStorage.getItem(SERVICE_CART_STORAGE_KEY)); }
    catch { /* Session storage might be disabled. URL selection remains validated. */ }
    const requested = new URLSearchParams(window.location.search).get("items");
    const fromLink = requested ? restoreServiceCart(JSON.stringify(requested.split(","))) : [];
    const initial = fromLink.length ? fromLink : stored;
    setSelected(initial);
    setRestored(true);
    try { window.sessionStorage.setItem(SERVICE_CART_STORAGE_KEY, JSON.stringify(initial)); }
    catch { /* No personal data is stored. */ }
    window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT));
  }, []);

  const chosen = products.filter(product => selected.includes(product.id));
  const total = chosen.reduce((sum, product) => sum + product.amountMinor, 0);
  const paypalUrl = paypalEnabled ? buildPersonalPayPalCartUrl(chosen.map(product => product.id)) : null;
  const zenUrl = buildZenTransferInquiry(chosen.map(product => product.id), locale);
  const description = chosen.map(product => product.title + " (" + product.durationMinutes + " min)").join(", ");
  const bookingMessage = locale === "ru"
    ? `Здравствуйте! Интересуют: ${description}. Сумма €${total / 100}. Подскажите доступное время и порядок оплаты. Пока не платил(а).`
    : locale === "es"
      ? `Hola. Me interesan: ${description}. Total €${total / 100}. ¿Qué horarios hay disponibles? Todavía no he pagado.`
      : `Hello! I am interested in: ${description}. Total €${total / 100}. Please confirm availability and payment instructions. I have not paid yet.`;
  const receiptMessage = locale === "ru"
    ? `Здравствуйте! Хочу подтвердить перевод €${total / 100} за ${description}. Способ оплаты: ${method === "wise" ? "Wise" : "PayPal"}. ID транзакции: [введите ID]. Проверьте поступление и подтвердите время сеанса.`
    : locale === "es"
      ? `Hola. Quiero confirmar el pago de €${total / 100} por ${description} vía ${method === "wise" ? "Wise" : "PayPal"}. Referencia: [introduce la referencia]. Confirma la recepción y el horario.`
      : `Hello! Please verify my €${total / 100} payment for ${description} via ${method === "wise" ? "Wise" : "PayPal"}. Transaction ID: [insert ID]. Please confirm receipt and session time.`;
  const bookingUrl = "https://wa.me/14376066502?text=" + encodeURIComponent(bookingMessage);
  const receiptUrl = "https://wa.me/14376066502?text=" + encodeURIComponent(receiptMessage);

  function remove(id: string) {
    const next = selected.filter(item => item !== id);
    setSelected(next);
    try { window.sessionStorage.setItem(SERVICE_CART_STORAGE_KEY, JSON.stringify(next)); }
    catch { /* Browser privacy setting */ }
    window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT));
    // The original link may contain items; don't reinstate them on refresh.
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }

  return <section className={styles.cart} lang={locale} data-personal-service-cart>
    <Link href={`/${locale}/services#consultation`} className={styles.back}>← {t.back}</Link>
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}><ShoppingBasket size={16} aria-hidden="true" /> HOLISTIC HOUSE</p>
        <h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <span className={styles.count} aria-live="polite">{chosen.length}</span>
    </div>
    {!restored ? <div className={styles.loading} aria-live="polite">…</div> :
      !chosen.length ? <div className={styles.empty} role="status"><p>{t.empty}</p>
        <Link className={styles.primary} href={`/${locale}/services#consultation`}>{t.choose}<ArrowRight size={17} aria-hidden="true" /></Link></div> :
      <>
        <ul className={styles.lines} aria-label={t.title}>
          {chosen.map(product => <li key={product.id}>
            <div><strong>{product.title}</strong><span>{product.durationMinutes} {t.minute}</span></div>
            <b>{formatServiceAmount(product.amountMinor, locale)}</b>
            <button type="button" onClick={() => remove(product.id)} aria-label={`${t.remove}: ${product.title}`} title={t.remove}>
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </li>)}
        </ul>
        <div className={styles.total}><span>{t.total}</span><strong>{formatServiceAmount(total, locale)}</strong></div>
        <fieldset className={styles.methods}>
          <legend>{t.method}</legend>
          <div className={styles.methodChoices}>
            {paypalEnabled && <label data-chosen={method === "paypal"}><input type="radio" name={id + "-payment"} checked={method === "paypal"} onChange={() => setMethod("paypal")} />{t.paypal}</label>}
            <label data-chosen={method === "zen"}><input type="radio" name={id + "-payment"} checked={method === "zen"} onChange={() => setMethod("zen")} />{t.zen}</label>
            {wiseEnabled && <label data-chosen={method === "wise"}><input type="radio" name={id + "-payment"} checked={method === "wise"} onChange={() => setMethod("wise")} />{t.wise}</label>}
          </div>
        </fieldset>
        <div className={styles.payment} aria-live="polite">
          {method === "paypal" && paypalUrl ? <>
            <a className={styles.primary} href={paypalUrl} target="_blank" rel="noopener noreferrer" data-cart-paypal-personal>
              <CreditCard size={18} aria-hidden="true" />{t.paypalAction} · {formatServiceAmount(total, locale)}<ArrowRight size={16} aria-hidden="true" />
            </a><p className={styles.hint}>{t.paypalNote}</p>
          </> : method === "zen" && zenUrl ? <>
            <a className={styles.primary} href={zenUrl} target="_blank" rel="noopener noreferrer" data-zen-transfer-inquiry="cart">
              <MessageCircle size={18} aria-hidden="true" />{t.zenAction}<ArrowRight size={16} aria-hidden="true" />
            </a><p className={styles.hint}>{t.zenNote}</p>
          </> : method === "wise" && wiseEnabled ? <>
            {chosen.map(product => <a key={product.id} className={styles.primary} href={`/api/payments/wise/${product.id}`} target="_blank" rel="noopener noreferrer" data-cart-wise-payment>
              <CreditCard size={18} aria-hidden="true" />{t.wiseItem} {formatServiceAmount(product.amountMinor, locale)}<ArrowRight size={16} aria-hidden="true" />
            </a>)}<p className={styles.hint}>{t.wiseNote}</p>
          </> : null}
          {(method === "paypal" || method === "wise") && <a className={styles.receipt} href={receiptUrl} target="_blank" rel="noopener noreferrer">{t.afterPay}</a>}
        </div>
        <a className={styles.booking} href={bookingUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} aria-hidden="true" />{t.book}
        </a>
        <p className={styles.fine}><Check size={15} aria-hidden="true" /> {t.secure}. {t.checkoutNote}</p>
      </>}
    <Link href={`/${locale}/services/free-situation-review`} className={styles.free}>{t.free} <ArrowRight size={16} aria-hidden="true" /></Link>
  </section>;
}
