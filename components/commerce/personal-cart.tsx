"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { ArrowRight, Check, CreditCard, MessageCircle, ShoppingBasket, Trash2 } from "lucide-react";
import { formatServiceAmount, publicServiceCatalog, type ServiceLocale } from "@/lib/commerce/catalog";
import { restoreServiceCart, SERVICE_CART_STORAGE_KEY, SERVICE_CART_UPDATED_EVENT } from "@/lib/commerce/cart";
import { buildPersonalPayPalCartUrl } from "@/lib/commerce/paypal-personal";
import { buildZenTransferInquiry } from "@/lib/commerce/zen-transfer-inquiry";
import { buildSquarePaymentForServices, formatSquareCadAmount, normalizeSquareCheckoutRedirect } from "@/lib/commerce/square-payment-links";
import { buildInteracTransferInquiry } from "@/lib/commerce/interac-transfer-inquiry";
import { buildPayPalHostedCartUrl } from "@/lib/commerce/paypal-hosted-links";
import styles from "./personal-cart.module.css";

type Method = "square" | "paypal" | "interac" | "zen" | "wise";

// Reuse the already-published artwork from the storefront, not placeholder stock photos.
const serviceImages: Record<string, string> = {
  "express-consultation-30": "/images/holistic-house/video-posters/constellations-en-v1.webp",
  "personal-session-60": "/images/holistic-house/andy-about.png",
};

const copy = {
  en: {
    back: "Shop", title: "Your cart", subtitle: "Review your consultations and choose how to pay.",
    empty: "Your cart is empty.", choose: "Choose a consultation", remove: "Remove",
    total: "Total", minute: "min", method: "Payment method", square: "Card · Square", paypal: "PayPal", interac: "Interac · Canada", zen: "ZEN.COM", wise: "Wise",
    squareAction: "Pay by card with Square", squarePending: "Opening secure Square checkout…", squareRefresh: "Check payment status", squareRepeat: "Buy another session", squareRepeatConfirm: "This selection was already paid. Confirm buying another session?", squareStatusPending: "Your Square payment is not confirmed yet. We will update it only after verifying Square’s record.", squareStatusPaid: "Payment received and verified by Square. Session time is confirmed separately.", squareStatusReview: "Payment needs review. Please contact us before booking.", squareSignIn: "Sign in to securely pay", squareFailed: "Square checkout could not be verified. You have not been charged by this request. Check your order before retrying.", interacAction: "Ask for Interac transfer details",
    squareNote: "Square Canada charges in CAD, not EUR. Check the CAD price and payee on Square before paying. We verify receipt manually; no appointment is booked.", squareAutoNote: "Square charges the displayed CAD total; the order status is verified with Square automatically. Payment does not book a session.",
    cardUnavailable: "Card checkout is not connected yet. PayPal or Interac are available below; please never send card numbers in a message.",
    interacNote: "Canada only. Ask for the exact CAD quote and verified recipient before transferring. This button does not collect payment.",
    paypalAction: "Continue to PayPal.Me", hostedPayPalAction: "Secure PayPal checkout", hostedPayPalNote: "Verify the seller and EUR total on PayPal. Confirmation of funds is checked manually.", verifiedPayPalAction: "Secure checkout · auto confirmation", zenAction: "Request ZEN transfer details",
    wiseAction: "Open Wise", wiseItem: "Pay for", 
    paypalNote: "PayPal.Me requires a PayPal account to pay, even if you use a linked card. Choose Goods & Services; verify Andrii Litvinov and the EUR total. Never use Friends & Family. We check receipts manually.",
    zenNote: "ZEN.COM opens a WhatsApp request for transfer details, not a payment. Don't transfer before confirmation.",
    wiseNote: "Wise may require you to enter the amount yourself. Verify the recipient and EUR amount before sending.",
    afterPay: "Already paid? Send transaction reference", confirm: "After paying, send your transaction reference so we can verify it.",
    book: "Ask about available times", checkoutNote: "Adding to the cart does not reserve a session. We will confirm your time personally.",
    free: "Free drawing assessment + written report", secure: "One-time payment, no subscription",
    service: "Personal consultation", add: "Add", emptyHint: "Choose the service you need. No payment is taken yet.",
    orderTitle: "Your order · contact", orderIntro: "Enter your phone number or use Google to place a request. No payment, subscription or appointment is created yet.",
    orderAction: "Place an order", orderSaved: "Request saved",
    orderTopic: "I would like to order the selected personal consultation services. Please confirm the time and payment details.",
    paymentTitle: "Payment", paymentIntro: "Your request is registered. Choose a secure payment option; receipt and appointment are confirmed separately.",
  },
  ru: {
    back: "Магазин", title: "Корзина", subtitle: "Проверьте услуги и выберите способ оплаты.",
    empty: "Корзина пока пуста.", choose: "Выбрать консультацию", remove: "Убрать",
    total: "Итого", minute: "мин", method: "Способ оплаты", square: "Картой · Square", paypal: "PayPal", interac: "Interac · Канада", zen: "ZEN.COM", wise: "Wise",
    squareAction: "Оплатить картой через Square", squarePending: "Открываем защищённую оплату Square…", squareRefresh: "Проверить оплату", squareRepeat: "Купить ещё одну сессию", squareRepeatConfirm: "Такая сессия уже оплачена. Подтвердите покупку ещё одной.", squareStatusPending: "Оплата в Square ещё не подтверждена. Статус изменится только после проверки у провайдера.", squareStatusPaid: "Оплата подтверждена Square. Время сеанса согласуется отдельно.", squareStatusReview: "Оплата требует проверки. Свяжитесь с нами перед бронированием.", squareSignIn: "Войти для защищённой оплаты", squareFailed: "Не удалось подтвердить создание оплаты. Запрос не списывает деньги. Проверьте заказ перед повторной попыткой.", interacAction: "Запросить реквизиты Interac",
    squareNote: "Square Canada списывает сумму в CAD, а не EUR. Проверьте получателя и сумму в CAD. Поступление проверяется вручную; время сеанса не бронируется.", squareAutoNote: "Square списывает указанную сумму CAD. Поступление проверяется автоматически у Square. Оплата не бронирует время сеанса.",
    cardUnavailable: "Оплата картой на сайте пока не подключена. Доступны PayPal или запрос Interac; не отправляйте данные карты в сообщениях.",
    interacNote: "Только Канада. До перевода уточните сумму в CAD и проверенные реквизиты. Эта кнопка не списывает деньги.",
    paypalAction: "Перейти в PayPal.Me", hostedPayPalAction: "Оплатить через PayPal", hostedPayPalNote: "Проверьте получателя и итоговую сумму EUR в PayPal. Поступление подтверждаем вручную.", verifiedPayPalAction: "Оплатить с автоподтверждением", zenAction: "Запросить реквизиты ZEN",
    wiseAction: "Открыть Wise", wiseItem: "Оплатить",
    paypalNote: "Для оплаты через PayPal.Me нужен аккаунт PayPal, даже при оплате привязанной картой. Выберите «Товары и услуги», проверьте Andrii Litvinov и сумму EUR. Не используйте «Друзьям и семье». Поступление проверяется вручную.",
    zenNote: "ZEN.COM открывает запрос реквизитов в WhatsApp, а не оплату. Не переводите деньги до подтверждения.",
    wiseNote: "В Wise сумму иногда нужно вводить вручную. Проверьте получателя и сумму в EUR перед переводом.",
    afterPay: "Уже оплатили? Отправить номер транзакции", confirm: "После оплаты отправьте номер транзакции для ручной проверки.",
    book: "Уточнить свободное время", checkoutNote: "Корзина не бронирует сеанс. Время согласуем лично.",
    free: "Бесплатный разбор рисунка + письменный отчёт", secure: "Разовая оплата, без подписки",
    service: "Личная консультация", add: "Добавить", emptyHint: "Выберите подходящую услугу. Пока ничего оплачивать не нужно.",
    orderTitle: "Оформление заказа · контакт", orderIntro: "Укажите номер телефона или войдите через Google. Это заявка, без списания денег и автоматической записи на сеанс.",
    orderAction: "Заказать", orderSaved: "Заявка сохранена",
    orderTopic: "Хочу заказать выбранные личные консультации. Прошу подтвердить время и условия оплаты.",
    paymentTitle: "Оплата", paymentIntro: "Заявка зарегистрирована. Выберите способ оплаты; поступление и время сеанса подтверждаются отдельно.",
  },
  es: {
    back: "Tienda", title: "Tu carrito", subtitle: "Revisa las consultas y elige cómo pagar.",
    empty: "El carrito está vacío.", choose: "Elegir una consulta", remove: "Quitar",
    total: "Total", minute: "min", method: "Forma de pago", square: "Tarjeta · Square", paypal: "PayPal", interac: "Interac · Canadá", zen: "ZEN.COM", wise: "Wise",
    squareAction: "Pagar con tarjeta mediante Square", squarePending: "Abriendo pago seguro de Square…", squareRefresh: "Comprobar el pago", squareRepeat: "Comprar otra sesión", squareRepeatConfirm: "Esta selección ya fue pagada. Confirma si deseas comprar otra sesión.", squareStatusPending: "Square aún no ha confirmado el pago. Solo actualizaremos el estado tras verificarlo.", squareStatusPaid: "Pago recibido y verificado por Square. La cita se confirma aparte.", squareStatusReview: "El pago necesita revisión. Contáctanos antes de reservar.", squareSignIn: "Inicia sesión para pagar", squareFailed: "No se pudo verificar el inicio del pago. Esta solicitud no carga tu tarjeta. Comprueba el pedido antes de reintentar.", interacAction: "Solicitar datos para Interac",
    squareNote: "Square Canada cobra en CAD, no en EUR. Comprueba el precio en CAD y el destinatario. Verificamos el pago manualmente; no reserva cita.", squareAutoNote: "Square cobra el importe CAD mostrado. Verificamos automáticamente el pago con Square; no reserva la cita.",
    cardUnavailable: "El pago directo con tarjeta aún no está conectado. Usa PayPal o solicita Interac; no compartas datos de la tarjeta por mensajes.",
    interacNote: "Solo Canadá. Solicita la cantidad exacta en CAD y un destinatario verificado antes de transferir. Esto no cobra dinero.",
    paypalAction: "Continuar a PayPal.Me", hostedPayPalAction: "Pagar con PayPal", hostedPayPalNote: "Comprueba el vendedor y el importe EUR en PayPal. Confirmamos manualmente los fondos recibidos.", verifiedPayPalAction: "Pago seguro · confirmación automática", zenAction: "Solicitar datos para ZEN",
    wiseAction: "Abrir Wise", wiseItem: "Pagar",
    paypalNote: "PayPal.Me requiere una cuenta PayPal, incluso si pagas con una tarjeta vinculada. Selecciona Productos y servicios, comprueba Andrii Litvinov y el total en EUR. No uses Amigos y familiares. Verificación manual.",
    zenNote: "ZEN.COM abre una consulta de datos bancarios por WhatsApp, no es un pago. Espera la confirmación.",
    wiseNote: "Puede que debas introducir el importe en Wise. Verifica el destinatario y el importe en EUR.",
    afterPay: "¿Ya pagaste? Enviar referencia", confirm: "Después de pagar, envía la referencia de la transacción para verificarla.",
    book: "Consultar horarios", checkoutNote: "Añadir al carrito no reserva una cita. Confirmaremos el horario personalmente.",
    free: "Evaluación gratuita por dibujo + informe escrito", secure: "Pago único, sin suscripción",
    service: "Consulta personal", add: "Añadir", emptyHint: "Elige una consulta. No hay ningún cargo todavía.",
    orderTitle: "Pedido · contacto", orderIntro: "Indica tu teléfono o continúa con Google para solicitar el pedido. No hay cargos ni cita automática.",
    orderAction: "Realizar pedido", orderSaved: "Solicitud guardada",
    orderTopic: "Quiero pedir las consultas personales seleccionadas. Confirmemos la hora y el pago.",
    paymentTitle: "Pago", paymentIntro: "Solicitud registrada. Elige cómo pagar; recepción y cita se confirman por separado.",
  },
} as const;

export function PersonalCart({ locale, paypalEnabled, wiseEnabled, squareLinks, squareApiEnabled, squareApiEnvironment, squareApiPrices, verifiedPayPalEnabled, hostedPayPalLinks }: {
  locale: ServiceLocale;
  paypalEnabled: boolean;
  verifiedPayPalEnabled: boolean;
  hostedPayPalLinks: Record<string, string>;
  wiseEnabled: boolean;
  squareLinks: Record<string, {url: string; amountMinor: number; currency: string}>;
  squareApiEnabled: boolean;
  squareApiEnvironment: 'production' | 'sandbox';
  squareApiPrices: Record<string, number>;
}) {
  const t = copy[locale];
  const id = useId();
  const products = publicServiceCatalog(locale);
  const [selected, setSelected] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderReceipt, setOrderReceipt] = useState<{ cartKey: string; referenceCode: string } | null>(null);
  const [method, setMethod] = useState<Method>(squareApiEnabled || Object.keys(squareLinks).length ? "square" : paypalEnabled || verifiedPayPalEnabled || Object.keys(hostedPayPalLinks).length ? "paypal" : "interac");
  const [squareBusy, setSquareBusy] = useState(false);
  const [squareOrderId, setSquareOrderId] = useState<string | null>(null);
  const [squareRepeatOf, setSquareRepeatOf] = useState<string | null>(null);
  const [squareError, setSquareError] = useState<string | null>(null);
  const [squareStatus, setSquareStatus] = useState<"paid" | "payment_review" | "pending" | "checkout_ready" | "failed" | null>(null);
  const squareOperation = useRef<{key: string; id: string} | null>(null);
  const squareStatusGeneration = useRef(0);

  useEffect(() => {
    let stored: string[] = [];
    try { stored = restoreServiceCart(window.sessionStorage.getItem(SERVICE_CART_STORAGE_KEY)); }
    catch { /* Session storage might be disabled. URL selection remains validated. */ }
    const requested = new URLSearchParams(window.location.search).get("items");
    const fromLink = requested ? restoreServiceCart(JSON.stringify(requested.split(","))) : [];
    const initial = fromLink.length ? fromLink : stored;
    setSelected(initial);
    // Keep the existing Google return flow mounted after OAuth redirect.
    try {
      const pending = JSON.parse(window.sessionStorage.getItem("hh-google-enquiry-return") || "null");
      if (pending?.path === window.location.pathname) setOrderOpen(true);
    } catch { /* No browser storage: the order button remains accessible. */ }
    setRestored(true);
    try { window.sessionStorage.setItem(SERVICE_CART_STORAGE_KEY, JSON.stringify(initial)); }
    catch { /* No personal data is stored. */ }
    window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT));
    const orderId = new URLSearchParams(window.location.search).get("squareOrder");
    if (squareApiEnabled && orderId && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(orderId)) {
      setSquareOrderId(orderId);
      const requestVersion = squareStatusGeneration.current;
      fetch("/api/payments/square/status?orderId=" + encodeURIComponent(orderId) + "&refresh=1", {
        credentials: "same-origin", cache: "no-store",
      }).then(async response => {
        const data = await response.json();
        if (squareStatusGeneration.current !== requestVersion) return;
        if (response.ok && data?.order?.status) {
          setSquareStatus(data.order.status);
          // Recover the server-owned items when Square returns in another tab
          // or when sessionStorage has been cleared; never trust URL pricing.
          if (Array.isArray(data.order.items))
            setSelected(restoreServiceCart(JSON.stringify(data.order.items)));
          if (data.order.status === "paid" || data.order.status === "payment_review") setMethod("square");
        } else setSquareError(data?.error || "SQUARE_ORDER_UNAVAILABLE");
      }).catch(() => {
        if (squareStatusGeneration.current === requestVersion) setSquareError("SQUARE_ORDER_UNAVAILABLE");
      });
    }
  }, [squareApiEnabled]);

  const chosen = products.filter(product => selected.includes(product.id));
  const cartKey = chosen.map(product => product.id).join(",");
  // The public reference is a display receipt, never proof of identity or provider payment.
  const orderReady = Boolean(cartKey && orderReceipt?.cartKey === cartKey);
  const total = chosen.reduce((sum, product) => sum + product.amountMinor, 0);
  const paypalUrl = paypalEnabled ? buildPersonalPayPalCartUrl(chosen.map(product => product.id)) : null;
  const hostedPayPalUrl = buildPayPalHostedCartUrl(chosen.map(product => product.id), hostedPayPalLinks);
  const zenUrl = buildZenTransferInquiry(chosen.map(product => product.id), locale);
  const interacUrl = buildInteracTransferInquiry(chosen.map(product => product.id), locale);
  const squarePayment = buildSquarePaymentForServices(chosen.map(product => product.id), squareLinks);
  const squareApiCad = squareApiEnabled && chosen.length ? squareApiPrices[total] : null;
  const squareAvailable = Boolean(squarePayment) || (Number.isSafeInteger(squareApiCad) && Number(squareApiCad) > 0);
  const squareCadAmount = squareApiCad || squarePayment?.amountMinor || null;
  // A verified Square return is displayed even after a full-page provider redirect.
  const showPayment = orderReady || squareStatus !== null;
  const paypalAvailable = Boolean(paypalUrl || hostedPayPalUrl || verifiedPayPalEnabled);
  const activeMethod: Method = method === "square" && !squareAvailable ? (paypalAvailable ? "paypal" : "interac")
    : method === "paypal" && !paypalAvailable ? "interac" : method;
  const description = chosen.map(product => product.title + " (" + product.durationMinutes + " min)").join(", ");
  const bookingMessage = locale === "ru"
    ? `Здравствуйте! Интересуют: ${description}. Сумма €${total / 100}. Подскажите доступное время и порядок оплаты. Пока не платил(а).`
    : locale === "es"
      ? `Hola. Me interesan: ${description}. Total €${total / 100}. ¿Qué horarios hay disponibles? Todavía no he pagado.`
      : `Hello! I am interested in: ${description}. Total €${total / 100}. Please confirm availability and payment instructions. I have not paid yet.`;
  const paymentLabel = ({ square: "Square card", paypal: "PayPal", interac: "Interac e-Transfer", zen: "ZEN.COM", wise: "Wise" } as const)[activeMethod];
  const receiptAmount = activeMethod === "square" && squareCadAmount ? formatSquareCadAmount(squareCadAmount, locale) : activeMethod === "interac" ? "[agreed CAD amount]" : "€" + String(total / 100);
  const receiptMessage = locale === "ru"
    ? `Здравствуйте! Хочу подтвердить перевод ${receiptAmount} за ${description}. Способ оплаты: ${paymentLabel}. ID транзакции: [введите ID]. Проверьте поступление и подтвердите время сеанса.`
    : locale === "es"
      ? `Hola. Quiero confirmar el pago de ${receiptAmount} por ${description} vía ${paymentLabel}. Referencia: [introduce la referencia]. Confirma la recepción y el horario.`
      : `Hello! Please verify my ${receiptAmount} payment for ${description} via ${paymentLabel}. Transaction ID: [insert ID]. Please confirm receipt and session time.`;
  const bookingUrl = "https://wa.me/14376066502?text=" + encodeURIComponent(bookingMessage);
  const receiptUrl = "https://wa.me/14376066502?text=" + encodeURIComponent(receiptMessage);

  async function refreshSquareStatus() {
    if (!squareOrderId || squareBusy) return;
    const requestVersion = squareStatusGeneration.current;
    setSquareBusy(true);
    setSquareError(null);
    try {
      const response = await fetch("/api/payments/square/status?orderId=" + encodeURIComponent(squareOrderId) + "&refresh=1", {
        credentials: "same-origin", cache: "no-store",
      });
      const result = await response.json();
      if (squareStatusGeneration.current !== requestVersion) return;
      if (!response.ok || !result?.order?.status) throw new Error(result?.error || "SQUARE_ORDER_UNAVAILABLE");
      setSquareStatus(result.order.status);
    } catch (error) {
      if (squareStatusGeneration.current === requestVersion)
        setSquareError(error instanceof Error ? error.message : "SQUARE_ORDER_UNAVAILABLE");
    } finally { setSquareBusy(false); }
  }

  async function beginSquareCheckout() {
    if (squareBusy || !squareApiEnabled || !squareApiCad || squareStatus === "paid" || squareStatus === "payment_review") return;
    const ids = chosen.map(product => product.id);
    const key = ids.slice().sort().join("+");
    if (!squareOperation.current || squareOperation.current.key !== key)
      squareOperation.current = { key, id: window.crypto.randomUUID() };
    setSquareBusy(true);
    setSquareError(null);
    try {
      const response = await fetch("/api/payments/square/checkout", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationId: squareOperation.current.id, items: ids, locale,
          ...(squareRepeatOf ? { repeatOf: squareRepeatOf } : {}) }),
      });
      const result = await response.json();
      if (!response.ok || result?.error) throw new Error(result?.error || "SQUARE_CHECKOUT_UNAVAILABLE");
      if (result?.repeatPurchaseRequired && typeof result?.order?.id === "string") {
        setSquareRepeatOf(result.order.id);
        squareOperation.current = null;
        setSquareBusy(false);
        return;
      }
      const redirect = result?.redirectUrl;
      if (typeof redirect !== "string" || normalizeSquareCheckoutRedirect(redirect, squareApiEnvironment) !== redirect)
        throw new Error("SQUARE_RECONCILIATION_REQUIRED");
      window.location.assign(redirect);
    } catch (error) {
      setSquareError(error instanceof Error ? error.message : "SQUARE_CHECKOUT_UNAVAILABLE");
      setSquareBusy(false);
    }
  }

  function add(id: string) {
    if (squareBusy || !products.some(product => product.id === id)) return;
    const next = restoreServiceCart(JSON.stringify([...selected, id]));
    setSelected(next);
    setOrderOpen(false);
    setOrderReceipt(null);
    try { window.sessionStorage.setItem(SERVICE_CART_STORAGE_KEY, JSON.stringify(next)); }
    catch { /* The selection remains in memory. */ }
    window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT));
  }

  function remove(id: string) {
    if (squareBusy) return;
    // A previous Square receipt is not proof of payment for a changed basket.
    // This clears only browser state; it never cancels/refunds the actual order.
    squareStatusGeneration.current += 1;
    squareOperation.current = null;
    setSquareOrderId(null);
    setSquareStatus(null);
    setSquareRepeatOf(null);
    setSquareError(null);
    setOrderOpen(false);
    setOrderReceipt(null);
    const next = selected.filter(item => item !== id);
    setSelected(next);
    try { window.sessionStorage.setItem(SERVICE_CART_STORAGE_KEY, JSON.stringify(next)); }
    catch { /* Browser privacy setting */ }
    window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT));
    // The original link may contain items; don't reinstate them on refresh.
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }

  return <section className={styles.cart} lang={locale} data-personal-service-cart>
    <Link href={"/" + locale + "/shop"} className={styles.back}>← {t.back}</Link>
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}><ShoppingBasket size={16} aria-hidden="true" /> HOLISTIC HOUSE</p>
        <h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <span className={styles.count} aria-live="polite">{chosen.length}</span>
    </div>
    {!restored ? <div className={styles.loading} aria-live="polite">…</div> :
      !chosen.length ? <div className={styles.empty} data-cart-empty>
        <p role="status">{t.empty}</p><span className={styles.emptyHint}>{t.emptyHint}</span>
        <div className={styles.suggestions} aria-label={t.choose}>
          {products.map(product => <article key={product.id} className={styles.suggestion}>
            <Image src={serviceImages[product.id]} alt="" width={90} height={96} sizes="90px" className={styles.suggestionImage} />
            <div className={styles.suggestionInfo}>
              <strong>{product.title}</strong><span>{product.durationMinutes} {t.minute}</span>
              <b>{formatServiceAmount(product.amountMinor, locale)}</b>
              <button type="button" onClick={() => add(product.id)} data-cart-add={product.id}>
                {t.add}<ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </article>)}
        </div>
        <Link className={styles.shopMore} href={"/" + locale + "/shop"}>{t.choose}<ArrowRight size={17} aria-hidden="true" /></Link>
      </div> :
      <>
        <ul className={styles.lines} aria-label={t.title}>
          {chosen.map(product => <li key={product.id} className={styles.serviceCard}>
            <div className={styles.servicePhoto}>
              <Image src={serviceImages[product.id]} alt="" width={100} height={110}
                sizes="(max-width: 360px) 72px, 100px" />
            </div>
            <div className={styles.serviceDetails}>
              <span className={styles.serviceLabel}>{t.service} · {product.durationMinutes} {t.minute}</span>
              <strong>{product.title}</strong><p>{product.description}</p>
            </div>
            <div className={styles.serviceActions}>
              <b>{formatServiceAmount(product.amountMinor, locale)}</b>
              <button type="button" onClick={() => remove(product.id)} disabled={squareBusy} aria-label={`${t.remove}: ${product.title}`} title={t.remove}>
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          </li>)}
        </ul>
        <div className={styles.total}><span>{t.total}</span><strong>{formatServiceAmount(total, locale)}</strong></div>
        <section className={styles.orderStep} data-cart-order-registration data-cart-order-ready={orderReady ? "true" : "false"}>
          <div className={styles.stepHeading}>
            <span className={styles.stepNumber}>1</span>
            <div><strong>{t.orderTitle}</strong><p>{t.orderIntro}</p></div>
          </div>
          {orderReady ? <p className={styles.orderDone} role="status" data-cart-order-saved>
            <Check size={18} aria-hidden="true" />{t.orderSaved} · {orderReceipt?.referenceCode}
          </p> : <>
            {!orderOpen && <button type="button" className={styles.orderButton}
              data-cart-start-order aria-expanded={orderOpen} onClick={() => setOrderOpen(true)}>
              {t.orderAction}<ArrowRight size={19} aria-hidden="true" />
            </button>}
            {orderOpen && <div className={styles.orderForm} data-cart-contact-form>
              <ContactChannelChooser locale={locale} whatsappUrl={bookingUrl} quick cartContact
                stayAfterSave publicServiceTitle={description || t.service}
                publicTopic={t.orderTopic} resetKey={cartKey}
                onSaved={referenceCode => setOrderReceipt({ cartKey, referenceCode })} />
            </div>}
          </>}
        </section>
        {showPayment && <div className={styles.stepHeading} data-cart-payment-step>
          <span className={styles.stepNumber}>2</span>
          <div><strong>{t.paymentTitle}</strong><p>{t.paymentIntro}</p></div>
        </div>}
        {showPayment && <fieldset className={styles.methods}>
          <legend>{t.method}</legend>
          <div className={styles.methodChoices}>
            {squareAvailable && <label data-chosen={activeMethod === "square"}><input type="radio" name={id + "-payment"} checked={activeMethod === "square"} onChange={() => setMethod("square")} />{t.square}</label>}
            {(paypalEnabled || verifiedPayPalEnabled || Boolean(hostedPayPalUrl)) && <label data-chosen={activeMethod === "paypal"}><input type="radio" name={id + "-payment"} checked={activeMethod === "paypal"} onChange={() => setMethod("paypal")} />{t.paypal}</label>}
            <label data-chosen={activeMethod === "interac"}><input type="radio" name={id + "-payment"} checked={activeMethod === "interac"} onChange={() => setMethod("interac")} />{t.interac}</label>
            <label data-chosen={activeMethod === "zen"}><input type="radio" name={id + "-payment"} checked={activeMethod === "zen"} onChange={() => setMethod("zen")} />{t.zen}</label>
            {wiseEnabled && <label data-chosen={activeMethod === "wise"}><input type="radio" name={id + "-payment"} checked={activeMethod === "wise"} onChange={() => setMethod("wise")} />{t.wise}</label>}
          </div>
        </fieldset>}
        {showPayment && !squareAvailable && !hostedPayPalUrl && !verifiedPayPalEnabled && <p className={styles.hint} data-card-unavailable>{t.cardUnavailable}</p>}}
        {showPayment && <div className={styles.payment} aria-live="polite">
          {activeMethod === "square" && squareAvailable ? <>
            {squareApiEnabled && squareApiCad ? <button className={styles.primary} type="button"
              onClick={beginSquareCheckout} disabled={squareBusy || squareStatus === "paid" || squareStatus === "payment_review"}
              data-cart-square-api-checkout>
              <CreditCard size={18} aria-hidden="true" />
              {squareBusy ? t.squarePending : t.squareAction + " · " + formatSquareCadAmount(squareApiCad, locale)}
              <ArrowRight size={16} aria-hidden="true" />
            </button> : null}
            {squareApiEnabled && squareRepeatOf ? <p className={styles.hint} role="status" data-cart-square-buy-again-confirmation>
              {t.squareRepeatConfirm}
            </p> : null}
            {squareApiEnabled && squareOrderId && squareStatus === "paid" ? <button
              type="button" className={styles.booking} onClick={() => {
                setSquareRepeatOf(squareOrderId);
                setSquareStatus(null);
                setSquareOrderId(null);
                squareOperation.current = null;
              }} data-cart-square-buy-again>{t.squareRepeat}</button> : null}
            {squareApiEnabled && squareOrderId && squareStatus !== "paid" && squareStatus !== "payment_review" ? <button
              type="button" className={styles.booking} disabled={squareBusy} onClick={refreshSquareStatus}
              data-cart-square-refresh>{t.squareRefresh}</button> : null}
            {squareApiEnabled && squareStatus ? <p className={styles.hint} role="status" data-cart-square-verified-status>
              {squareStatus === "paid" ? t.squareStatusPaid :
               squareStatus === "payment_review" ? t.squareStatusReview : t.squareStatusPending}
            </p> : null}
            {squareApiEnabled && squareError ? <p className={styles.hint} role="alert" data-cart-square-error>
              {squareError === "SIGN_IN_REQUIRED" || squareError === "ACCOUNT_UNAVAILABLE" ?
                <Link href={"/" + locale + "/app"}>{t.squareSignIn}</Link> :
                t.squareFailed}
            </p> : null}
            {!squareApiEnabled && squarePayment ? <a className={styles.primary} href={squarePayment.url} target="_blank" rel="noopener noreferrer" data-cart-square-payment-link>
              <CreditCard size={18} aria-hidden="true" />{t.squareAction} · {formatSquareCadAmount(squarePayment.amountMinor, locale)}<ArrowRight size={16} aria-hidden="true" />
            </a> : null}<p className={styles.hint}>{squareApiEnabled ? t.squareAutoNote : t.squareNote}</p>
          </> : activeMethod === "paypal" && (paypalUrl || hostedPayPalUrl || verifiedPayPalEnabled) ? <>
            {verifiedPayPalEnabled ? <Link className={styles.primary}
              href={`/${locale}/services/checkout?items=${chosen.map(product => product.id).join(",")}`}
              data-cart-verified-paypal-checkout>
              <CreditCard size={18} aria-hidden="true" />{t.verifiedPayPalAction} · {formatServiceAmount(total, locale)}
              <ArrowRight size={16} aria-hidden="true" />
            </Link> : hostedPayPalUrl ? <a className={styles.primary} href={hostedPayPalUrl}
              target="_blank" rel="noopener noreferrer" data-cart-paypal-hosted>
              <CreditCard size={18} aria-hidden="true" />{t.hostedPayPalAction} · {formatServiceAmount(total, locale)}
              <ArrowRight size={16} aria-hidden="true" />
            </a> : null}
            {paypalUrl ? <a className={verifiedPayPalEnabled || hostedPayPalUrl ? styles.booking : styles.primary} href={paypalUrl} target="_blank" rel="noopener noreferrer" data-cart-paypal-personal>
              <CreditCard size={18} aria-hidden="true" />{t.paypalAction} · {formatServiceAmount(total, locale)}<ArrowRight size={16} aria-hidden="true" />
            </a> : null}<p className={styles.hint}>{hostedPayPalUrl && !verifiedPayPalEnabled ? t.hostedPayPalNote : t.paypalNote}</p>
          </> : activeMethod === "interac" && interacUrl ? <>
            <a className={styles.primary} href={interacUrl} target="_blank" rel="noopener noreferrer" data-interac-transfer-inquiry="cart">
              <MessageCircle size={18} aria-hidden="true" />{t.interacAction}<ArrowRight size={16} aria-hidden="true" />
            </a><p className={styles.hint}>{t.interacNote}</p>
          </> : activeMethod === "zen" && zenUrl ? <>
            <a className={styles.primary} href={zenUrl} target="_blank" rel="noopener noreferrer" data-zen-transfer-inquiry="cart">
              <MessageCircle size={18} aria-hidden="true" />{t.zenAction}<ArrowRight size={16} aria-hidden="true" />
            </a><p className={styles.hint}>{t.zenNote}</p>
          </> : activeMethod === "wise" && wiseEnabled ? <>
            {chosen.map(product => <a key={product.id} className={styles.primary} href={`/api/payments/wise/${product.id}`} target="_blank" rel="noopener noreferrer" data-cart-wise-payment>
              <CreditCard size={18} aria-hidden="true" />{t.wiseItem} {formatServiceAmount(product.amountMinor, locale)}<ArrowRight size={16} aria-hidden="true" />
            </a>)}<p className={styles.hint}>{t.wiseNote}</p>
          </> : null}
          {(activeMethod === "paypal" || activeMethod === "wise" || activeMethod === "interac" || (activeMethod === "square" && Boolean(squarePayment) && !squareApiEnabled)) && <a className={styles.receipt} href={receiptUrl} target="_blank" rel="noopener noreferrer">{t.afterPay}</a>}
        </div>}
        {showPayment && <a className={styles.booking} href={bookingUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} aria-hidden="true" />{t.book}
        </a>}
        <p className={styles.fine}><Check size={15} aria-hidden="true" /> {t.secure}. {t.checkoutNote}</p>
      </>}
    <Link href={`/${locale}/services/free-situation-review`} className={styles.free}>{t.free} <ArrowRight size={16} aria-hidden="true" /></Link>
  </section>;
}
