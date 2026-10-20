"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, ShoppingBag, Trash2 } from "lucide-react";
import { formatServiceAmount, publicServiceCatalog, type ServiceLocale } from "@/lib/commerce/catalog";
import { restoreServiceCart, SERVICE_CART_STORAGE_KEY } from "@/lib/commerce/cart";
import { buildZenTransferInquiry } from "@/lib/commerce/zen-transfer-inquiry";
import { createCommerceAccountGuard, commerceIdentityError, verifyCommerceIdentity } from "@/lib/commerce/client-account";
import styles from "./service-cart.module.css";

const copy = {
  en: {
    eyebrow: "PERSONAL SERVICES · ONE-TIME PAYMENT",
    title: "Choose your consultation format",
    lead: "Add the formats you need and review your selection. The approach and session time are agreed personally.",
    add: "Add to cart", added: "In your cart", cart: "Your cart", empty: "Your cart is empty. Choose a format above.",
    remove: "Remove", total: "Selected services", minute: "min", once: "One-time service", pay: "Continue to payment",
    unavailable: "Online payment for services is not connected yet. You can keep your selection and ask about availability and payment.",
    notPaid: "This checkout expired or did not complete. Your selection is kept; you can try again.",
    secure: "A secure payment page will open. This is a one-time payment; the session time is agreed personally.", signIn: "Sign in to your account, then reload this page to verify your account before paying.", login: "Open my account", confirmed: "Payment confirmed. We will agree your session time personally.", checking: "Payment confirmation is pending. This page checks the order securely.", held: "This order needs a payment or refund review. Please contact us before booking.", retry: "Check payment status",
    repeatNotice: "An existing paid order already contains these services. Confirm only if you want to buy an additional session, even if the first is awaiting scheduling.", repeatConfirm: "Buy these services again", keepExisting: "Keep my existing order",
    pending: "Opening payment…", error: "Payment is unavailable. Your selection is saved; no payment has been confirmed.",
    zenRequest: "ZEN.COM · request transfer details",
    zenNote: "This only asks whether a ZEN EUR transfer can be arranged. It is not a checkout; do not send money before the verified recipient details and amount are confirmed.",
    request: "Ask about availability and payment", requestTitle: "Hello Andrey! I would like to ask about these services:",
    requestEnd: "Please confirm the time and payment arrangements.",
    requestNote: "WhatsApp opens a prepared enquiry. Nothing is sent until you press Send.",
    free: "Prefer to start for free?", drawing: "Free drawing assessment + written report", dao: "Free Wu Xing resource profile",
    note: "Adding services does not book a time or create a subscription. The free written assessments remain separate.",
  },
  ru: {
    eyebrow: "ЛИЧНЫЕ УСЛУГИ · РАЗОВАЯ ОПЛАТА",
    title: "Выберите формат консультации",
    lead: "Добавьте нужные форматы в корзину и проверьте выбор. Подход и время сессии согласуем лично.",
    add: "В корзину", added: "В корзине", cart: "Ваша корзина", empty: "Корзина пуста. Выберите формат выше.",
    remove: "Убрать", total: "Выбранные услуги", minute: "мин", once: "Разовая услуга", pay: "Перейти к оплате",
    unavailable: "Онлайн-оплата услуг пока не подключена. Вы можете сохранить выбор и уточнить доступное время и способ оплаты.",
    notPaid: "Срок оплаты истёк или платёж не завершён. Ваш выбор сохранён; можно повторить попытку.",
    secure: "Откроется защищённая страница разовой оплаты. Время сессии согласуем лично.", signIn: "Войдите в личный кабинет, затем обновите эту страницу для проверки аккаунта перед оплатой.", login: "Открыть личный кабинет", confirmed: "Оплата подтверждена. Время сессии согласуем лично.", checking: "Ожидаем подтверждения оплаты. Статус заказа проверяется на сервере.", held: "Заказ требует проверки оплаты или возврата. Свяжитесь с нами до записи.", retry: "Проверить оплату",
    repeatNotice: "Эти услуги уже есть в оплаченном заказе. Подтвердите только если хотите купить дополнительную сессию, даже если первая ещё ожидает записи.", repeatConfirm: "Купить эти услуги ещё раз", keepExisting: "Оставить существующий заказ",
    pending: "Открываем оплату…", error: "Оплата недоступна. Ваш выбор сохранён; оплата не подтверждена.",
    zenRequest: "ZEN.COM · запросить перевод",
    zenNote: "Это запрос доступности перевода в EUR, а не платёж. Не отправляйте деньги до подтверждения получателя, суммы и реквизитов.",
    request: "Уточнить время и оплату", requestTitle: "Здравствуйте, Андрей! Меня интересуют услуги:",
    requestEnd: "Подскажите доступное время и порядок оплаты.",
    requestNote: "WhatsApp откроет подготовленный запрос. Сообщение отправится, только когда вы нажмёте «Отправить».",
    free: "Хотите начать бесплатно?", drawing: "Бесплатный разбор рисунка + отчёт", dao: "Бесплатный профиль ресурсов У-Син",
    note: "Добавление в корзину не бронирует время и не оформляет подписку. Бесплатные письменные разборы доступны отдельно.",
  },
  es: {
    eyebrow: "SERVICIOS PERSONALES · PAGO ÚNICO",
    title: "Elige tu formato de consulta",
    lead: "Añade los formatos que necesites y revisa tu selección. Acordaremos personalmente el enfoque y el horario.",
    add: "Añadir al carrito", added: "En tu carrito", cart: "Tu carrito", empty: "Tu carrito está vacío. Elige un formato arriba.",
    remove: "Quitar", total: "Servicios seleccionados", minute: "min", once: "Servicio de pago único", pay: "Continuar al pago",
    unavailable: "El pago online de servicios aún no está conectado. Puedes conservar tu selección y consultar la disponibilidad y el pago.",
    notPaid: "Este pago ha caducado o no se ha completado. Tu selección se conserva; puedes volver a intentarlo.",
    secure: "Se abrirá una página de pago seguro. Es un pago único; acordaremos el horario personalmente.", signIn: "Inicia sesión y recarga esta página para verificar tu cuenta antes de pagar.", login: "Abrir mi cuenta", confirmed: "Pago confirmado. Acordaremos personalmente el horario de la sesión.", checking: "Esperando la confirmación del pago. Comprobamos el pedido en el servidor.", held: "Este pedido necesita una revisión del pago o reembolso. Contacta con nosotros antes de reservar.", retry: "Comprobar el pago",
    repeatNotice: "Ya existe un pedido pagado con estos servicios. Confirma solo si quieres comprar otra sesión, aunque la primera siga pendiente de horario.", repeatConfirm: "Comprar estos servicios otra vez", keepExisting: "Conservar mi pedido actual",
    pending: "Abriendo el pago…", error: "El pago no está disponible. Tu selección se conserva; no se ha confirmado ningún pago.",
    zenRequest: "ZEN.COM · solicitar transferencia",
    zenNote: "Solo es una consulta para una posible transferencia en EUR, no un pago. No envíes dinero antes de confirmar el destinatario y el importe.",
    request: "Consultar disponibilidad y pago", requestTitle: "¡Hola, Andrey! Me interesan estos servicios:",
    requestEnd: "Por favor, confirma el horario y la forma de pago.",
    requestNote: "WhatsApp abre una consulta preparada. No se envía nada hasta que pulses Enviar.",
    free: "¿Prefieres empezar gratis?", drawing: "Evaluación gratuita por dibujo + informe escrito", dao: "Perfil gratuito de recursos Wu Xing",
    note: "Añadir servicios no reserva una cita ni crea una suscripción. Las evaluaciones escritas gratuitas siguen disponibles por separado.",
  },
} as const;

export function ServiceCart({ locale }: { locale: ServiceLocale }) {
  const t = copy[locale];
  const id = useId();
  const products = publicServiceCatalog(locale);
  const [selected, setSelected] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);
  const [available, setAvailable] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<"zen" | "stripe" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [signInRequired, setSignInRequired] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [repeatOrderId, setRepeatOrderId] = useState<string | null>(null);
  const operationId = useRef<string | null>(null);
  const inFlight = useRef(false);
  const accountGuard = useRef(createCommerceAccountGuard());
  const [accountId, setAccountId] = useState<string | null>(null);
  const invalidateAccount = useCallback(() => {
    accountGuard.current.invalidate();
    setAccountId(null); setPaymentProvider(null); setAvailable(false); setOrderId(null); setOrderStatus("");
    setPending(false); setError(""); setSignInRequired(true); setRepeatOrderId(null);
    operationId.current = null; inFlight.current = false;
  }, []);

  useEffect(() => {
    const guard = accountGuard.current;
    const generation = guard.mount();
    let mounted = true;
    let restoredItems: string[] = [];
    try { restoredItems = restoreServiceCart(window.sessionStorage.getItem(SERVICE_CART_STORAGE_KEY)); }
    catch { /* Storage can be disabled; the cart still works in this page. */ }
    const requestedService = new URLSearchParams(window.location.search).get("service");
    setSelected(requestedService && products.some((product) => product.id === requestedService) ? [requestedService] : restoredItems);
    setRestored(true);
    const abort = new AbortController();
    fetch("/api/app/commerce/status", { credentials: "same-origin", cache: "no-store", signal: abort.signal })
      .then(async (response) => {
        if (!mounted) return;
        if (commerceIdentityError(response.status)) { invalidateAccount(); return; }
        if (!response.ok) return;
        const status = await response.json();
        if (!mounted) return;
        if (status.accountId && guard.bindInitial(status.accountId, generation)) {
          setAccountId(status.accountId);
          setAvailable(status.available === true);
          setPaymentProvider(status.provider === "zen" || status.provider === "stripe" ? status.provider : null);
        }
      }).catch(() => {});
    const returnedId = new URLSearchParams(window.location.search).get("serviceOrder");
    if (returnedId && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(returnedId)) setOrderId(returnedId);
    const checkOwner = () => {
      if (document.visibilityState === "hidden") return;
      const ticket = guard.capture();
      if (!ticket) return;
      verifyCommerceIdentity(guard, ticket).catch((error) => {
        if (mounted && error.message === "ACCOUNT_CHANGED") invalidateAccount();
      });
    };
    window.addEventListener("focus", checkOwner);
    document.addEventListener("visibilitychange", checkOwner);
    return () => {
      mounted = false; guard.unmount(); abort.abort();
      window.removeEventListener("focus", checkOwner);
      document.removeEventListener("visibilitychange", checkOwner);
    };
  }, [invalidateAccount]);

  useEffect(() => {
    if (!restored) return;
    try { window.sessionStorage.setItem(SERVICE_CART_STORAGE_KEY, JSON.stringify(selected)); }
    catch { /* No account details or health information are stored. */ }
  }, [selected, restored]);

  useEffect(() => {
    const guard = accountGuard.current;
    const ticket = guard.capture();
    if (!orderId || !accountId || !ticket || repeatOrderId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    async function check() {
      try {
        if (!guard.current(ticket)) return;
        const zen = paymentProvider === "zen";
        const route = `/api/app/commerce/orders/${encodeURIComponent(orderId!)}`;
        const response = await fetch(zen ? route + "/refresh" : route, {
          method: zen ? "POST" : "GET",
          credentials: "same-origin", cache: "no-store", signal: abort.signal,
          headers: { "X-HH-Account-ID": ticket!.accountId },
        });
        if (cancelled || !guard.current(ticket)) return;
        if (commerceIdentityError(response.status)) { invalidateAccount(); return; }
        if (response.status === 404) { setError(t.error); return; }
        if (!response.ok) throw new Error("unavailable");
        const { order } = await response.json();
        if (cancelled || !guard.current(ticket) || order?.id !== orderId) return;
        if (!await verifyCommerceIdentity(guard, ticket!)) return;
        if (cancelled || !guard.current(ticket)) return;
        setOrderStatus(order.status);
        setError("");
        if (["expired", "failed"].includes(order.status)) operationId.current = null;
        if (order.status === "paid") {
          const paidIds = new Set((order.items || []).map((item: { serviceId: string }) => item.serviceId));
          setSelected((current) => current.filter((value) => !paidIds.has(value)));
        } else if (["pending", "open", "processing"].includes(order.status)) timer = setTimeout(check, paymentProvider === "zen" ? 12000 : 5000);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.message === "ACCOUNT_CHANGED") { invalidateAccount(); return; }
        if (guard.current(ticket)) { setError(t.error); timer = setTimeout(check, 10000); }
      }
    }
    check();
    return () => { cancelled = true; clearTimeout(timer); abort.abort(); };
  }, [orderId, accountId, repeatOrderId, paymentProvider, t.error, invalidateAccount]);

  const chosen = products.filter((product) => selected.includes(product.id));
  const total = chosen.reduce((value, product) => value + product.amountMinor, 0);
  const enquiry = [t.requestTitle, ...chosen.map((product) => `${product.title} · ${product.durationMinutes} ${t.minute} · ${formatServiceAmount(product.amountMinor, locale)}`), t.requestEnd].join("\n");
  const requestUrl = "https://wa.me/14376066502?text=" + encodeURIComponent(enquiry);
  const zenRequestUrl = buildZenTransferInquiry(chosen.map((product) => product.id), locale);

  function changeSelection(productId: string, add: boolean) {
    if (inFlight.current) return;
    operationId.current = null;
    setRepeatOrderId(null); setError("");
    setSelected((current) => add ? Array.from(new Set([...current, productId])) : current.filter((value) => value !== productId));
  }


  async function checkout(confirmedRepeatId?: string) {
    const guard = accountGuard.current;
    const ticket = guard.capture();
    if (!available || !chosen.length || inFlight.current || !ticket) return;
    inFlight.current = true;
    setPending(true); setError(""); setSignInRequired(false);
    try {
      if (confirmedRepeatId) operationId.current = window.crypto.randomUUID();
      operationId.current ||= window.crypto.randomUUID();
      const response = await fetch("/api/app/commerce/checkout", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-HH-Account-ID": ticket.accountId },
        body: JSON.stringify({ operationId: operationId.current, locale, ...(confirmedRepeatId ? { repeatOrderId: confirmedRepeatId } : {}), items: chosen.map((product) => ({ serviceId: product.id, quantity: 1 })) }),
      });
      if (!guard.current(ticket)) return;
      if (commerceIdentityError(response.status)) { invalidateAccount(); return; }
      if (!response.ok) throw new Error("unavailable");
      const result = await response.json();
      if (!guard.current(ticket)) return;
      // Re-read cookie-verified identity immediately before applying the result
      // or following a delayed payment redirect. Never silently rebind to B.
      if (!await verifyCommerceIdentity(guard, ticket)) return;
      if (!guard.current(ticket)) return;
      if (result.order?.id) {
        setOrderId(result.order.id);
        setOrderStatus(result.order.status);
        setRepeatOrderId(result.repeatPurchaseRequired === true ? result.order.id : null);
        // Recovery after a lost return must not leave a second Pay action for
        // the already paid/held items. Re-adding an item is an explicit new cart.
        if (!result.repeatPurchaseRequired && ["paid", "refunded", "disputed", "payment_review"].includes(result.order.status)) {
          const settledIds = new Set((result.order.items || []).map((item: { serviceId: string }) => item.serviceId));
          setSelected((current) => current.filter((value) => !settledIds.has(value)));
        }
      }
      if (result.redirectUrl) {
        const url = new URL(result.redirectUrl);
        const allowedHost = paymentProvider === "zen"
          ? ["secure.zen.com", "secure.zen-test.com"].includes(url.hostname)
          : url.hostname === "checkout.stripe.com";
        if (url.protocol !== "https:" || !allowedHost || url.username || url.password || url.port) throw new Error("invalid-redirect");
        if (guard.current(ticket)) window.location.assign(url.href);
      }
    } catch (error) {
      if (error instanceof Error && error.message === "ACCOUNT_CHANGED") { invalidateAccount(); return; }
      if (guard.current(ticket)) setError(t.error);
    } finally {
      if (guard.current(ticket)) { inFlight.current = false; setPending(false); }
    }
  }

  return (
    <section className={styles.section} id="service-cart" aria-labelledby={`${id}-title`} data-service-cart lang={locale}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id={`${id}-title`}>{t.title}</h2><p>{t.lead}</p>
      </header>
      <div className={styles.layout}>
        <div className={styles.products}>
          {products.map((product) => {
            const added = selected.includes(product.id);
            return <article className={styles.product} key={product.id} data-service-product={product.id}>
              <div className={styles.productTop}><ShoppingBag size={22} aria-hidden="true" /><span>{product.durationMinutes} {t.minute}</span></div>
              <h3>{product.title}</h3><p>{product.description}</p>
              <div className={styles.price}><strong>{formatServiceAmount(product.amountMinor, locale)}</strong><span>{t.once}</span></div>
              <button type="button" className={styles.add} disabled={!restored || added || pending} onClick={() => changeSelection(product.id, true)} aria-label={`${added ? t.added : t.add}: ${product.title}`}>
                {added ? <Check size={18} aria-hidden="true" /> : <ShoppingBag size={18} aria-hidden="true" />}{added ? t.added : t.add}
              </button>
            </article>;
          })}
        </div>
        <aside className={styles.cart} aria-labelledby={`${id}-cart-title`}>
          <h3 id={`${id}-cart-title`}>{t.cart} <span aria-live="polite" aria-atomic="true">({chosen.length})</span></h3>
          {chosen.length ? <>
            <ul className={styles.lines}>{chosen.map((product) => <li key={product.id}>
              <div><strong>{product.title}</strong><span>{product.durationMinutes} {t.minute} · {formatServiceAmount(product.amountMinor, locale)}</span></div>
              <button type="button" className={styles.remove} disabled={pending} onClick={() => changeSelection(product.id, false)} aria-label={`${t.remove}: ${product.title}`}><Trash2 size={18} aria-hidden="true" /><span>{t.remove}</span></button>
            </li>)}</ul>
            <p className={styles.total}><span>{t.total}</span><strong>{formatServiceAmount(total, locale)}</strong></p>
            <p className={styles.notice} id={`${id}-payment-note`}>{available ? t.secure : t.unavailable}</p>
            <button type="button" className={styles.pay} disabled={!available || pending || Boolean(repeatOrderId)} onClick={() => checkout()} aria-describedby={`${id}-payment-note`}>{pending ? t.pending : paymentProvider === "zen" ? `${t.pay} · ZEN.COM` : t.pay}</button>
            {zenRequestUrl ? <a className={styles.request} href={zenRequestUrl} target="_blank"
              rel="noopener noreferrer" data-zen-transfer-inquiry="service-cart">{t.zenRequest}</a> : null}
            {zenRequestUrl ? <p className={styles.fine}>{t.zenNote}</p> : null}
            <a className={styles.request} href={requestUrl} target="_blank" rel="noopener noreferrer">{t.request}</a>
            <p className={styles.fine}>{t.requestNote}</p>
          </> : <p className={styles.empty} role="status">{t.empty}</p>}
          {repeatOrderId && chosen.length > 0 ? <div className={styles.notice} role="group" aria-label={t.repeatConfirm}>
            <p>{t.repeatNotice}</p>
            <button type="button" className={styles.pay} disabled={!available || pending} onClick={() => checkout(repeatOrderId)}>{t.repeatConfirm}</button>
            <button type="button" className={styles.remove} disabled={pending} onClick={() => { setSelected([]); setRepeatOrderId(null); operationId.current = null; }}>{t.keepExisting}</button>
          </div> : null}
          {orderId && accountId ? <p className={styles.notice} role="status">{orderStatus === "paid" ? t.confirmed : ["expired", "failed"].includes(orderStatus) ? t.notPaid : ["refunded", "disputed", "payment_review"].includes(orderStatus) ? t.held : t.checking}</p> : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {signInRequired ? <p role="alert">{t.signIn} <Link href={`/${locale === "es" ? "en" : locale}/app`}>{t.login}</Link></p> : null}
          <p className={styles.fine}>{t.note}</p>
        </aside>
      </div>
      <div className={styles.free}><strong>{t.free}</strong><Link href={`/${locale}/services/free-situation-review`}>{t.drawing}</Link>{locale !== "es" ? <Link href={`/${locale}/services/dao-health-profile`}>{t.dao}</Link> : null}</div>
    </section>
  );
}
