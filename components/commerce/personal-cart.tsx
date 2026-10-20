"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, MessageCircle, ShoppingBasket, Trash2 } from "lucide-react";
import { formatServiceAmount, publicServiceCatalog, type ServiceLocale } from "@/lib/commerce/catalog";
import { restoreServiceCart, SERVICE_CART_STORAGE_KEY, SERVICE_CART_UPDATED_EVENT } from "@/lib/commerce/cart";
import { buildPersonalPayPalCartUrl } from "@/lib/commerce/paypal-personal";
import { buildZenTransferInquiry } from "@/lib/commerce/zen-transfer-inquiry";
import { buildSquarePaymentForServices, formatSquareCadAmount } from "@/lib/commerce/square-payment-links";
import { buildInteracTransferInquiry } from "@/lib/commerce/interac-transfer-inquiry";
import styles from "./personal-cart.module.css";

type Method = "square" | "paypal" | "interac" | "zen" | "wise";

const copy = {
  en: {
    back: "Services", title: "Your cart", subtitle: "Review your consultations and choose how to pay.",
    empty: "Your cart is empty.", choose: "Choose a consultation", remove: "Remove",
    total: "Total", minute: "min", method: "Payment method", square: "Card · Square", paypal: "PayPal", interac: "Interac · Canada", zen: "ZEN.COM", wise: "Wise",
    squareAction: "Pay by card with Square", interacAction: "Ask for Interac transfer details",
    squareNote: "Square Canada charges in CAD, not EUR. Check the CAD price and payee on Square before paying. We verify receipt manually; no appointment is booked.",
    cardUnavailable: "Card checkout is not connected yet. PayPal or Interac are available below; please never send card numbers in a message.",
    interacNote: "Canada only. Ask for the exact CAD quote and verified recipient before transferring. This button does not collect payment.",
    paypalAction: "Continue to PayPal.Me", verifiedPayPalAction: "Secure checkout · auto confirmation", zenAction: "Request ZEN transfer details",
    wiseAction: "Open Wise", wiseItem: "Pay for", 
    paypalNote: "PayPal.Me requires a PayPal account to pay, even if you use a linked card. Choose Goods & Services; verify Andrii Litvinov and the EUR total. Never use Friends & Family. We check receipts manually.",
    zenNote: "ZEN.COM opens a WhatsApp request for transfer details, not a payment. Don't transfer before confirmation.",
    wiseNote: "Wise may require you to enter the amount yourself. Verify the recipient and EUR amount before sending.",
    afterPay: "Already paid? Send transaction reference", confirm: "After paying, send your transaction reference so we can verify it.",
    book: "Ask about available times", checkoutNote: "Adding to the cart does not reserve a session. We will confirm your time personally.",
    free: "Free drawing assessment + written report", secure: "One-time payment, no subscription",
  },
  ru: {
    back: "Услуги", title: "Корзина", subtitle: "Проверьте услуги и выберите способ оплаты.",
    empty: "Корзина пока пуста.", choose: "Выбрать консультацию", remove: "Убрать",
    total: "Итого", minute: "мин", method: "Способ оплаты", square: "Картой · Square", paypal: "PayPal", interac: "Interac · Канада", zen: "ZEN.COM", wise: "Wise",
    squareAction: "Оплатить картой через Square", interacAction: "Запросить реквизиты Interac",
    squareNote: "Square Canada списывает сумму в CAD, а не EUR. Проверьте получателя и сумму в CAD. Поступление проверяется вручную; время сеанса не бронируется.",
    cardUnavailable: "Оплата картой на сайте пока не подключена. Доступны PayPal или запрос Interac; не отправляйте данные карты в сообщениях.",
    interacNote: "Только Канада. До перевода уточните сумму в CAD и проверенные реквизиты. Эта кнопка не списывает деньги.",
    paypalAction: "Перейти в PayPal.Me", verifiedPayPalAction: "Оплатить с автоподтверждением", zenAction: "Запросить реквизиты ZEN",
    wiseAction: "Открыть Wise", wiseItem: "Оплатить",
    paypalNote: "Для оплаты через PayPal.Me нужен аккаунт PayPal, даже при оплате привязанной картой. Выберите «Товары и услуги», проверьте Andrii Litvinov и сумму EUR. Не используйте «Друзьям и семье». Поступление проверяется вручную.",
    zenNote: "ZEN.COM открывает запрос реквизитов в WhatsApp, а не оплату. Не переводите деньги до подтверждения.",
    wiseNote: "В Wise сумму иногда нужно вводить вручную. Проверьте получателя и сумму в EUR перед переводом.",
    afterPay: "Уже оплатили? Отправить номер транзакции", confirm: "После оплаты отправьте номер транзакции для ручной проверки.",
    book: "Уточнить свободное время", checkoutNote: "Корзина не бронирует сеанс. Время согласуем лично.",
    free: "Бесплатный разбор рисунка + письменный отчёт", secure: "Разовая оплата, без подписки",
  },
  es: {
    back: "Servicios", title: "Tu carrito", subtitle: "Revisa las consultas y elige cómo pagar.",
    empty: "El carrito está vacío.", choose: "Elegir una consulta", remove: "Quitar",
    total: "Total", minute: "min", method: "Forma de pago", square: "Tarjeta · Square", paypal: "PayPal", interac: "Interac · Canadá", zen: "ZEN.COM", wise: "Wise",
    squareAction: "Pagar con tarjeta mediante Square", interacAction: "Solicitar datos para Interac",
    squareNote: "Square Canada cobra en CAD, no en EUR. Comprueba el precio en CAD y el destinatario. Verificamos el pago manualmente; no reserva cita.",
    cardUnavailable: "El pago directo con tarjeta aún no está conectado. Usa PayPal o solicita Interac; no compartas datos de la tarjeta por mensajes.",
    interacNote: "Solo Canadá. Solicita la cantidad exacta en CAD y un destinatario verificado antes de transferir. Esto no cobra dinero.",
    paypalAction: "Continuar a PayPal.Me", verifiedPayPalAction: "Pago seguro · confirmación automática", zenAction: "Solicitar datos para ZEN",
    wiseAction: "Abrir Wise", wiseItem: "Pagar",
    paypalNote: "PayPal.Me requiere una cuenta PayPal, incluso si pagas con una tarjeta vinculada. Selecciona Productos y servicios, comprueba Andrii Litvinov y el total en EUR. No uses Amigos y familiares. Verificación manual.",
    zenNote: "ZEN.COM abre una consulta de datos bancarios por WhatsApp, no es un pago. Espera la confirmación.",
    wiseNote: "Puede que debas introducir el importe en Wise. Verifica el destinatario y el importe en EUR.",
    afterPay: "¿Ya pagaste? Enviar referencia", confirm: "Después de pagar, envía la referencia de la transacción para verificarla.",
    book: "Consultar horarios", checkoutNote: "Añadir al carrito no reserva una cita. Confirmaremos el horario personalmente.",
    free: "Evaluación gratuita por dibujo + informe escrito", secure: "Pago único, sin suscripción",
  },
} as const;

export function PersonalCart({ locale, paypalEnabled, wiseEnabled, squareLinks, verifiedPayPalEnabled }: {
  locale: ServiceLocale;
  paypalEnabled: boolean;
  verifiedPayPalEnabled: boolean;
  wiseEnabled: boolean;
  squareLinks: Record<string, {url: string; amountMinor: number; currency: string}>;
}) {
  const t = copy[locale];
  const id = useId();
  const products = publicServiceCatalog(locale);
  const [selected, setSelected] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);
  const [method, setMethod] = useState<Method>(paypalEnabled || verifiedPayPalEnabled ? "paypal" : Object.keys(squareLinks).length ? "square" : "interac");

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
  const interacUrl = buildInteracTransferInquiry(chosen.map(product => product.id), locale);
  const squarePayment = buildSquarePaymentForServices(chosen.map(product => product.id), squareLinks);
  const description = chosen.map(product => product.title + " (" + product.durationMinutes + " min)").join(", ");
  const bookingMessage = locale === "ru"
    ? `Здравствуйте! Интересуют: ${description}. Сумма €${total / 100}. Подскажите доступное время и порядок оплаты. Пока не платил(а).`
    : locale === "es"
      ? `Hola. Me interesan: ${description}. Total €${total / 100}. ¿Qué horarios hay disponibles? Todavía no he pagado.`
      : `Hello! I am interested in: ${description}. Total €${total / 100}. Please confirm availability and payment instructions. I have not paid yet.`;
  const paymentLabel = ({ square: "Square card", paypal: "PayPal", interac: "Interac e-Transfer", zen: "ZEN.COM", wise: "Wise" } as const)[method];
  const receiptAmount = method === "square" && squarePayment ? formatSquareCadAmount(squarePayment.amountMinor, locale) : method === "interac" ? "[agreed CAD amount]" : "€" + String(total / 100);
  const receiptMessage = locale === "ru"
    ? `Здравствуйте! Хочу подтвердить перевод ${receiptAmount} за ${description}. Способ оплаты: ${paymentLabel}. ID транзакции: [введите ID]. Проверьте поступление и подтвердите время сеанса.`
    : locale === "es"
      ? `Hola. Quiero confirmar el pago de ${receiptAmount} por ${description} vía ${paymentLabel}. Referencia: [introduce la referencia]. Confirma la recepción y el horario.`
      : `Hello! Please verify my ${receiptAmount} payment for ${description} via ${paymentLabel}. Transaction ID: [insert ID]. Please confirm receipt and session time.`;
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
            {squarePayment && <label data-chosen={method === "square"}><input type="radio" name={id + "-payment"} checked={method === "square"} onChange={() => setMethod("square")} />{t.square}</label>}
            {(paypalEnabled || verifiedPayPalEnabled) && <label data-chosen={method === "paypal"}><input type="radio" name={id + "-payment"} checked={method === "paypal"} onChange={() => setMethod("paypal")} />{t.paypal}</label>}
            <label data-chosen={method === "interac"}><input type="radio" name={id + "-payment"} checked={method === "interac"} onChange={() => setMethod("interac")} />{t.interac}</label>
            <label data-chosen={method === "zen"}><input type="radio" name={id + "-payment"} checked={method === "zen"} onChange={() => setMethod("zen")} />{t.zen}</label>
            {wiseEnabled && <label data-chosen={method === "wise"}><input type="radio" name={id + "-payment"} checked={method === "wise"} onChange={() => setMethod("wise")} />{t.wise}</label>}
          </div>
        </fieldset>
        {!squarePayment && <p className={styles.hint} data-card-unavailable>{t.cardUnavailable}</p>}
        <div className={styles.payment} aria-live="polite">
          {method === "square" && squarePayment ? <>
            <a className={styles.primary} href={squarePayment.url} target="_blank" rel="noopener noreferrer" data-cart-square-payment-link>
              <CreditCard size={18} aria-hidden="true" />{t.squareAction} · {formatSquareCadAmount(squarePayment.amountMinor, locale)}<ArrowRight size={16} aria-hidden="true" />
            </a><p className={styles.hint}>{t.squareNote}</p>
          </> : method === "paypal" && (paypalUrl || verifiedPayPalEnabled) ? <>
            {verifiedPayPalEnabled ? <Link className={styles.primary}
              href={`/${locale}/services/checkout?items=${chosen.map(product => product.id).join(",")}`}
              data-cart-verified-paypal-checkout>
              <CreditCard size={18} aria-hidden="true" />{t.verifiedPayPalAction} · {formatServiceAmount(total, locale)}
              <ArrowRight size={16} aria-hidden="true" />
            </Link> : null}
            {paypalUrl ? <a className={verifiedPayPalEnabled ? styles.booking : styles.primary} href={paypalUrl} target="_blank" rel="noopener noreferrer" data-cart-paypal-personal>
              <CreditCard size={18} aria-hidden="true" />{t.paypalAction} · {formatServiceAmount(total, locale)}<ArrowRight size={16} aria-hidden="true" />
            </a> : null}<p className={styles.hint}>{t.paypalNote}</p>
          </> : method === "interac" && interacUrl ? <>
            <a className={styles.primary} href={interacUrl} target="_blank" rel="noopener noreferrer" data-interac-transfer-inquiry="cart">
              <MessageCircle size={18} aria-hidden="true" />{t.interacAction}<ArrowRight size={16} aria-hidden="true" />
            </a><p className={styles.hint}>{t.interacNote}</p>
          </> : method === "zen" && zenUrl ? <>
            <a className={styles.primary} href={zenUrl} target="_blank" rel="noopener noreferrer" data-zen-transfer-inquiry="cart">
              <MessageCircle size={18} aria-hidden="true" />{t.zenAction}<ArrowRight size={16} aria-hidden="true" />
            </a><p className={styles.hint}>{t.zenNote}</p>
          </> : method === "wise" && wiseEnabled ? <>
            {chosen.map(product => <a key={product.id} className={styles.primary} href={`/api/payments/wise/${product.id}`} target="_blank" rel="noopener noreferrer" data-cart-wise-payment>
              <CreditCard size={18} aria-hidden="true" />{t.wiseItem} {formatServiceAmount(product.amountMinor, locale)}<ArrowRight size={16} aria-hidden="true" />
            </a>)}<p className={styles.hint}>{t.wiseNote}</p>
          </> : null}
          {(method === "paypal" || method === "wise" || method === "interac" || (method === "square" && Boolean(squarePayment))) && <a className={styles.receipt} href={receiptUrl} target="_blank" rel="noopener noreferrer">{t.afterPay}</a>}
        </div>
        <a className={styles.booking} href={bookingUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} aria-hidden="true" />{t.book}
        </a>
        <p className={styles.fine}><Check size={15} aria-hidden="true" /> {t.secure}. {t.checkoutNote}</p>
      </>}
    <Link href={`/${locale}/services/free-situation-review`} className={styles.free}>{t.free} <ArrowRight size={16} aria-hidden="true" /></Link>
  </section>;
}
