"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TAOIST_TALISMANS } from "@/lib/practitioners/taoist-talismans";
import { readBrowserTalismanCart, saveBrowserTalismanCart, TALISMAN_CART_UPDATED_EVENT, TALISMAN_GOOGLE_RETURN_KEY } from "@/lib/practitioners/taoist-talisman-cart";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./taoist-talisman-cart.module.css";

type PaymentChoice = "square" | "paypal";
type VerifiedProfile = { email: string; displayName: string };
type PricePreview = {
  available: boolean; amountMinor?: number; currency?: string;
  items?: { id:string; title:string; amountMinor:number }[];
  methods?: Partial<Record<PaymentChoice, { amountMinor:number; currency:string }>>;
};
const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const phoneValid = (value: string) => /^\+[1-9][0-9]{7,14}$/.test(value.replace(/[\s().-]/g,""));
const providerHost = (value: string) => {
  try {
    const url = new URL(value);
    const matched = url.hostname === "paypal.me"
      ? /^\/psitrends\/[1-9][0-9]*(?:\.[0-9]{2})?EUR$/.test(url.pathname)
      : url.hostname === "square.link"
        ? /^\/u\/[A-Za-z0-9_-]{5,120}$/.test(url.pathname)
        : url.hostname === "checkout.square.site"
          ? /^\/[A-Za-z0-9_-]{5,120}$/.test(url.pathname) : false;
    return url.protocol === "https:" && matched && !url.username &&
      !url.password && !url.port && !url.search && !url.hash ? url.href : null;
  } catch { return null; }
};
const copy = {
  en: {
    back: "Back to talismans", title: "Your talisman basket", intro: "Review your designs, use Google for a faster checkout, then pay only an approved price.",
    empty: "No talismans in your basket yet.", browse: "Browse talismans", remove: "Remove",
    price: "Price", quote: "Master's quote required", total: "Total", totalPending: "Confirmed before payment",
    methods: "Preferred payment method", square: "Bank card · Square", paypal: "PayPal", wise: "Wise",
    gate: "Payment will open only after the master confirms each item's price, availability, delivery and payment details. These are preferences, not live payment buttons.",
    request: "Request a quote for this basket", sending: "Saving your request…",
    name: "Your name (optional)", email: "Email", phone: "Phone (or email above)",
    wishes: "Wishes for the master (optional)", wishesPlaceholder: "Design, colour, delivery country or special preferences…",
    consent: "I agree to be contacted once about this request. No marketing messages.",
    privacy: "Your wishes and contact stay in the protected request/CRM. Do not include medical records or other people's details. Nothing private is sent to Telegram.",
    success: "Your quotation request has been saved.", reference: "Request reference",
    successNote: "This is not a completed purchase or payment. The master will confirm prices and provide verified payment instructions. A payment receipt will only appear after real provider confirmation.",
    telegramLater: "Telegram follow-up will be offered after payment verification. A click or transfer screenshot is not a payment receipt.",
    failure: "The request could not be saved. Check the contact and try again. No payment was taken.",
    storage: "This browser cannot update the basket. Check temporary site storage.",
    required: "Please provide an email or telephone number and agree to one reply.",
    google: "Continue with Google · sign in or create My House", googleBusy: "Opening Google…",
    googleDone: "Google account connected", cabinet: "Open My House", googleHint: "Your verified Google email is used for this checkout; no name or phone to retype.",
    googleFailure: "Google sign-in could not be opened. You may use the one-field contact option below.",
    contactLabel: "Email or international phone", contactPlaceholder: "Email or +1 416 555 1234",
    options: "Optional: name and preferences", fallback: "Or continue without Google",
    checkoutTitle: "Pay now", checkoutDisabled: "Instant checkout is not enabled for these illustrative talismans: the maker must first approve fixed item prices, fulfilment and a matching payment link.",
    checkoutNote: "A real provider checkout opens only for owner-approved prices. Opening it is not a paid receipt; receipt and delivery are verified separately.",
    methodTitle: "Secure payment option", noProvider: "No verified payment option for this basket.",
    pay: "Pay securely now", payBusy: "Preparing verified checkout…", signInToPay: "Sign in with Google to pay",
    payFailed: "Could not start the payment. No charge is confirmed; check the payment attempt before retrying.",
    receiptPending: "Checkout opened · payment not yet verified", receiptLink: "Open payment page again",
    quoteLabel: "For a custom-made item without a published price", quoteButton: "Ask the maker for a fixed price",
    authNotice: "Google creates or opens your Holistic House account. New accounts may need to finish onboarding in My House.",
  },
  ru: {
    back: "Назад к талисманам", title: "Корзина талисманов", intro: "Проверьте талисманы, войдите через Google и оплачивайте только утверждённую стоимость.",
    empty: "В корзине пока нет талисманов.", browse: "Выбрать талисманы", remove: "Убрать",
    price: "Цена", quote: "Уточняется у мастера", total: "Итого", totalPending: "После согласования стоимости",
    methods: "Предпочтительный способ оплаты", square: "Карта · Square", paypal: "PayPal", wise: "Wise",
    gate: "Оплата откроется после подтверждения мастером цены каждого талисмана, изготовления, доставки и реквизитов. Сейчас это выбор предпочтения, а не кнопки списания.",
    request: "Запросить стоимость всей корзины", sending: "Сохраняем заявку…",
    name: "Ваше имя (необязательно)", email: "Email", phone: "Телефон (или email выше)",
    wishes: "Пожелания мастеру (необязательно)", wishesPlaceholder: "Символ, цвет, страна доставки или особые пожелания…",
    consent: "Согласен(на) получить один ответ по этой заявке, без рекламы.",
    privacy: "Контакт и пожелания сохраняются в защищённой заявке/CRM. Не указывайте медицинские документы или чужие данные. Личный текст не отправляется в Telegram.",
    success: "Запрос стоимости сохранён.", reference: "Номер заявки",
    successNote: "Это ещё не покупка и не оплата. Мастер подтвердит цены и реквизиты. Сообщение «Оплата принята» появится только после проверки реального платежа у провайдера.",
    telegramLater: "Отправка пожеланий через Telegram будет доступна после подтверждения оплаты. Скриншот перевода не равен подтверждению поступления.",
    failure: "Не удалось сохранить заявку. Проверьте контакт и повторите. Деньги не списаны.",
    storage: "Не удалось изменить корзину. Проверьте разрешение на временное хранение данных.",
    required: "Укажите email либо телефон и дайте согласие на один ответ.",
    google: "Войти или создать кабинет через Google", googleBusy: "Открываем Google…",
    googleDone: "Вы вошли через Google", cabinet: "Открыть мой кабинет", googleHint: "Email подтверждён Google. Не нужно заново вводить имя и телефон.",
    googleFailure: "Не удалось открыть Google. Ниже можно оставить один контакт без аккаунта.",
    contactLabel: "Email или телефон с кодом страны", contactPlaceholder: "Email или +1 416 555 1234",
    options: "Дополнительно: имя и пожелания", fallback: "Или без Google — один контакт",
    checkoutTitle: "Оплатить сейчас", checkoutDisabled: "Прямая оплата этих талисманов пока закрыта: нужны утверждённые цены за каждый товар, условия изготовления и доставки и подходящая платёжная ссылка.",
    checkoutNote: "Платёж откроется у провайдера только для утверждённой цены. Переход не подтверждает оплату: поступление и доставка проверяются отдельно.",
    methodTitle: "Способ защищённой оплаты", noProvider: "Для такой корзины ещё нет проверенного платёжного метода.",
    pay: "Оплатить сейчас", payBusy: "Готовим безопасную оплату…", signInToPay: "Войти через Google для оплаты",
    payFailed: "Не удалось открыть оплату. Платёж не подтверждён; проверьте предыдущую попытку перед повтором.",
    receiptPending: "Платёжная страница открыта · поступление не проверено", receiptLink: "Открыть оплату повторно",
    quoteLabel: "Для индивидуального изготовления без утверждённой цены", quoteButton: "Уточнить фиксированную стоимость",
    authNotice: "Google открывает или создаёт учётную запись Holistic House. Для нового кабинета может потребоваться завершить первоначальную настройку.",
  },
  es: {
    back: "Volver a los talismanes", title: "Carrito de talismanes", intro: "Revisa tus diseños, entra con Google y paga solo precios aprobados.",
    empty: "Tu carrito está vacío.", browse: "Explorar talismanes", remove: "Quitar",
    price: "Precio", quote: "Presupuesto del maestro", total: "Total", totalPending: "Se confirma antes del pago",
    methods: "Método de pago preferido", square: "Tarjeta · Square", paypal: "PayPal", wise: "Wise",
    gate: "El pago se habilita cuando el maestro confirme precios, disponibilidad, envío y datos de cobro. Por ahora solo puedes indicar una preferencia.",
    request: "Solicitar presupuesto", sending: "Guardando solicitud…",
    name: "Nombre (opcional)", email: "Correo electrónico", phone: "Teléfono (o correo)",
    wishes: "Preferencias para el maestro (opcional)", wishesPlaceholder: "Símbolo, color, país de envío o preferencias especiales…",
    consent: "Acepto una respuesta sobre esta solicitud, sin publicidad.",
    privacy: "Los datos y preferencias quedan en la solicitud/CRM privada. No incluyas documentos médicos ni datos de terceros. No se envía información privada a Telegram.",
    success: "Tu solicitud de presupuesto se guardó.", reference: "Referencia",
    successNote: "Esto no es una compra ni un pago. El maestro confirmará precios y método de pago. Solo se mostrará una confirmación tras verificar el pago real con el proveedor.",
    telegramLater: "El seguimiento por Telegram estará disponible tras la verificación del pago.",
    failure: "No se pudo guardar la solicitud. Comprueba tu contacto y vuelve a intentarlo. No se cobró nada.",
    storage: "No se pudo actualizar el carrito. Comprueba el almacenamiento temporal.",
    required: "Indica tu correo o teléfono y acepta una respuesta.",
    google: "Entrar o crear Mi Casa con Google", googleBusy: "Abriendo Google…",
    googleDone: "Cuenta Google conectada", cabinet: "Abrir Mi Casa", googleHint: "Usamos tu correo Google verificado; no necesitas repetir nombre ni teléfono.",
    googleFailure: "No se pudo abrir Google. Puedes dejar un solo contacto más abajo.",
    contactLabel: "Correo o teléfono internacional", contactPlaceholder: "Correo o +34 600 000 000",
    options: "Opcional: nombre y preferencias", fallback: "O sin Google: un solo contacto",
    checkoutTitle: "Pagar ahora", checkoutDisabled: "El pago inmediato todavía no está disponible: faltan precios fijos aprobados, condiciones de entrega y un enlace de pago verificado.",
    checkoutNote: "Solo se abre un proveedor con precios aprobados. Abrir el enlace no confirma el pago; el cobro y la entrega se verifican por separado.",
    methodTitle: "Método de pago seguro", noProvider: "No hay método de pago verificado para este carrito.",
    pay: "Pagar ahora", payBusy: "Preparando pago seguro…", signInToPay: "Entrar con Google para pagar",
    payFailed: "No se pudo abrir el pago. No hay cobro confirmado; revisa el intento anterior.",
    receiptPending: "Página de pago abierta · cobro pendiente de verificar", receiptLink: "Abrir el pago otra vez",
    quoteLabel: "Para un artículo personalizado sin precio aprobado", quoteButton: "Consultar un precio fijo",
    authNotice: "Google abre o crea tu cuenta Holistic House. Las cuentas nuevas quizá deban completar el registro.",
  },
} as const;

export function TaoistTalismanCart({ locale, inline = false }: { locale: PublicLocale; inline?: boolean }) {
  const t = copy[locale];
  const pathname = usePathname();
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pricing, setPricing] = useState<PricePreview | null>(null);
  const [pricingBusy, setPricingBusy] = useState(false);
  const [payment, setPayment] = useState<PaymentChoice>("square");
  const [profile, setProfile] = useState<VerifiedProfile | null>(null);
  const [accountBusy, setAccountBusy] = useState(true);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [wishes, setWishes] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const operationId = useRef<string | null>(null);
  const paymentOperationId = useRef<string | null>(null);
  const submitLock = useRef(false);
  const paymentLock = useRef(false);

  useEffect(() => {
    const sync = () => {
      setIds(readBrowserTalismanCart());
      setLoaded(true);
    };
    sync();
    window.addEventListener(TALISMAN_CART_UPDATED_EVENT, sync);
    return () => window.removeEventListener(TALISMAN_CART_UPDATED_EVENT, sync);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/app/auth/contact-profile", {credentials:"same-origin",cache:"no-store"})
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!active) return;
        if (typeof data?.email === "string" && emailValid(data.email.trim())) {
          setProfile({
            email: data.email.trim(),
            displayName: typeof data.displayName === "string" ? data.displayName.trim().slice(0,120) : "",
          });
        } else setProfile(null);
      })
      .catch(() => { if (active) setProfile(null); })
      .finally(() => { if (active) setAccountBusy(false); });
    return () => { active = false; };
  }, []);

  const selected = TAOIST_TALISMANS.filter(item => ids.includes(item.id));
  const idsKey = selected.map(item => item.id).join(",");
  useEffect(() => {
    if (!idsKey) { setPricing(null); setPricingBusy(false); return; }
    const controller = new AbortController();
    setPricingBusy(true);
    setPricing(null);
    const params = new URLSearchParams({locale,items:idsKey});
    fetch("/api/public/talisman-checkout?" + params, {
      cache:"no-store",credentials:"omit",signal:controller.signal,
    })
      .then(response => response.ok ? response.json() : {available:false})
      .then(value => { if (!controller.signal.aborted) setPricing(value); })
      .catch(() => { if (!controller.signal.aborted) setPricing({available:false}); })
      .finally(() => { if (!controller.signal.aborted) setPricingBusy(false); });
    return () => controller.abort();
  }, [idsKey, locale]);

  const approvedMethods = (["square","paypal"] as PaymentChoice[])
    .filter(method => pricing?.methods?.[method]?.amountMinor);
  const chosenMethod = approvedMethods.includes(payment) ? payment : approvedMethods[0];
  const payable = pricing?.available === true && approvedMethods.length > 0;
  const format = (minor:number, currency:string) => new Intl.NumberFormat(locale,{
    style:"currency",currency,minimumFractionDigits:2,
  }).format(minor / 100);

  const remove = (id: string) => {
    if (!saveBrowserTalismanCart(ids.filter(value => value !== id))) setError(t.storage);
    else {
      setError(""); setReference(null); setPaymentReference(null); setPaymentUrl(null);
      operationId.current = null; paymentOperationId.current = null;
    }
  };

  async function startGoogle() {
    if (googleBusy || busy || payBusy) return;
    setGoogleBusy(true); setError("");
    try {
      const source = pathname === "/" + locale + "/holistic-support/mobile"
        ? pathname : "/" + locale + "/holistic-support";
      const response = await fetch("/api/app/auth/start", {
        method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({locale,continueTo:"enquiry",returnPath:source}),
      });
      const data = await response.json().catch(() => null);
      const target = typeof data?.redirectUrl === "string" ? new URL(data.redirectUrl) : null;
      if (!response.ok || !target || target.protocol !== "https:") throw new Error("GOOGLE_AUTH_UNAVAILABLE");
      window.sessionStorage.setItem(TALISMAN_GOOGLE_RETURN_KEY,
        JSON.stringify({path:source,createdAt:Date.now()}));
      window.location.assign(target.href);
    } catch {
      setGoogleBusy(false);
      setError(t.googleFailure);
    }
  }

  function contactFields() {
    if (profile) return {displayName:"",email:profile.email,phone:""};
    const value = contact.trim();
    return {
      displayName: name.trim().length >= 2 ? name.trim() : "",
      email: emailValid(value) ? value : "",
      phone: phoneValid(value) ? value.replace(/[\s().-]/g,"") : "",
    };
  }

  async function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitLock.current || reference) return;
    const fields = contactFields();
    if (!selected.length || !consent || !fields.email && !fields.phone) {
      setError(t.required); return;
    }
    submitLock.current = true;
    setBusy(true); setError("");
    // One reply-only, encrypted first-party enquiry; no payment/booking flag.
    const description = [
      "Daoist Fu talisman basket · PRICE NOT APPROVED · NO PAYMENT",
      ...selected.map(item => item.id + ": " + item.en.title),
      ...(wishes.trim() ? ["Private wishes: " + wishes.trim()] : []),
    ].join("\n");
    const id = operationId.current || crypto.randomUUID();
    operationId.current = id;
    try {
      const response = await fetch("/api/service-enquiries", {
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          operationId:id,serviceTitle:"Daoist talismans · basket quote",
          description,
          sourcePath: "/" + locale + "/holistic-support",
          locale,contact:fields,contactConsent:true,website:"",
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.saved !== true || data?.contactPending !== false ||
          !/^HH-[A-F0-9]{12}$/.test(data.referenceCode || "")) {
        if (response.status === 409) operationId.current = null;
        throw new Error("QUOTE_UNCONFIRMED");
      }
      setReference(data.referenceCode);
    } catch { setError(t.failure); }
    finally { submitLock.current = false; setBusy(false); }
  }

  async function startPayment() {
    if (paymentLock.current || payBusy || !payable || !chosenMethod) return;
    if (!profile) { await startGoogle(); return; }
    if (!consent) { setError(t.required); return; }
    paymentLock.current = true; setPayBusy(true); setError("");
    const op = paymentOperationId.current || crypto.randomUUID();
    paymentOperationId.current = op;
    try {
      const response = await fetch("/api/payments/talismans/checkout",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          operationId:op,items:selected.map(item => item.id),method:chosenMethod,
          locale,sourcePath:pathname,replyConsent:true,
        }),
      });
      const data = await response.json().catch(() => null);
      const url = typeof data?.checkoutUrl === "string" ? providerHost(data.checkoutUrl) : null;
      if (!response.ok || !url || !/^HH-[A-F0-9]{12}$/.test(data.referenceCode || "") ||
          data.status !== "payment_not_verified") {
        if (response.status === 409) paymentOperationId.current = null;
        throw new Error("PROVIDER_UNCONFIRMED");
      }
      setPaymentUrl(url);
      setPaymentReference(data.referenceCode);
      // Same-tab handoff works on iOS even after an asynchronous server save;
      // no popup blocker and no claim that navigating proves funds settled.
      window.location.assign(url);
    } catch { setError(t.payFailed); }
    finally { paymentLock.current = false; setPayBusy(false); }
  }

  return <section className={styles.shell} data-taoist-talisman-cart data-inline={inline ? "true" : undefined}
    aria-labelledby={inline ? "talisman-inline-cart-title" : "talisman-cart-title"}>
    {!inline ? <Link href={"/" + locale + "/holistic-support#talismans"} className={styles.back}>← {t.back}</Link> : null}
    <header className={styles.heading}>
      <h1 id={inline ? "talisman-inline-cart-title" : "talisman-cart-title"}>{t.title}</h1>
      <p>{t.intro}</p>
    </header>
    {!loaded ? <p role="status">…</p> : selected.length === 0
      ? <div className={styles.empty}><p>{t.empty}</p>
          <Link href={"/" + locale + "/holistic-support#talismans"}>{t.browse} →</Link>
        </div>
      : <>
        <ul className={styles.items}>
          {selected.map(item => {
            const priced = pricing?.items?.find(entry => entry.id === item.id);
            return <li key={item.id} data-cart-talisman={item.id}>
              <div className={styles.thumb}>
                <Image src={item.image} fill alt={item[locale].title} sizes="94px" />
              </div>
              <div className={styles.itemInfo}>
                <h2>{item[locale].title}</h2><p>{item[locale].description}</p>
                <span>{t.price}: <strong>{priced
                  ? format(priced.amountMinor,"EUR") : t.quote}</strong></span>
              </div>
              {!reference && !paymentReference && <button type="button" className={styles.remove}
                onClick={() => remove(item.id)}>{t.remove}</button>}
            </li>;
          })}
        </ul>
        <div className={styles.total} aria-live="polite"><strong>{t.total}</strong>
          <span>{pricing?.available && pricing.amountMinor !== undefined
            ? format(pricing.amountMinor,"EUR") : t.totalPending}</span>
        </div>
        <section className={styles.accountStep} data-talisman-google-checkout>
          <p className={styles.stepLabel}>1 · {locale === "ru" ? "Ваш кабинет" : locale === "es" ? "Tu cuenta" : "Your account"}</p>
          {profile
            ? <div className={styles.signedIn} data-talisman-google-ready>
                <span aria-hidden="true">✓</span>
                <strong>{t.googleDone}</strong><small>{profile.email}</small>
                <Link href={"/" + locale + "/app/portrait"}>{t.cabinet} →</Link>
              </div>
            : <button className={styles.googleButton} type="button"
                data-talisman-google-start onClick={startGoogle} disabled={googleBusy || accountBusy || busy}>
                <span className={styles.googleMark} aria-hidden="true">G</span>
                {googleBusy ? t.googleBusy : t.google}
                <span aria-hidden="true">→</span>
              </button>}
          <p className={styles.accountNote}>{profile ? t.googleHint : t.authNotice}</p>
        </section>
        <label className={styles.agree} data-talisman-reply-consent>
          <input type="checkbox" checked={consent}
            onChange={event => setConsent(event.target.checked)} />
          {t.consent}
        </label>
        <section className={styles.paymentStep} data-talisman-payment-ready={payable ? "true" : "false"}>
          <p className={styles.stepLabel}>2 · {t.checkoutTitle}</p>
          {!pricing?.available || !approvedMethods.length
            ? <p className={styles.notice} role="status" data-talisman-payment-unavailable>
                {pricingBusy ? "…" : t.checkoutDisabled}</p>
            : <>
                <fieldset className={styles.methods}>
                  <legend>{t.methodTitle}</legend>
                  <div className={styles.methodRows}>
                    {approvedMethods.map(method => <label key={method} data-selected={chosenMethod === method}>
                      <input type="radio" name="talisman-method" value={method} checked={chosenMethod === method}
                        onChange={() => {setPayment(method);paymentOperationId.current=null;}} />
                      {t[method]} · {format(pricing.methods![method]!.amountMinor,pricing.methods![method]!.currency)}
                    </label>)}
                  </div>
                </fieldset>
                <button type="button" className={styles.submit} data-talisman-pay-now
                  disabled={payBusy || accountBusy || !consent || !loaded} onClick={startPayment}>
                  {payBusy ? t.payBusy : profile ? t.pay : t.signInToPay}<span aria-hidden="true">→</span>
                </button>
                <p className={styles.privacy}>{t.checkoutNote}</p>
              </>}
          {paymentReference && <p className={styles.receipt} role="status" data-talisman-payment-pending>
            <strong>{t.receiptPending}</strong> · {paymentReference}
            {paymentUrl && <a href={paymentUrl} rel="noopener noreferrer">{t.receiptLink}</a>}
          </p>}
        </section>
        {!profile && <div className={styles.guestBlock}>
          <p className={styles.stepLabel}>{t.fallback}</p>
          <label className={styles.oneContact}>{t.contactLabel}
            <input value={contact} onChange={event => {setContact(event.target.value);operationId.current=null;}}
              inputMode="text" type="text" maxLength={160} placeholder={t.contactPlaceholder}
              autoComplete="email" data-talisman-contact />
          </label>
        </div>}
        <form className={styles.form} onSubmit={submitQuote} noValidate>
          <details className={styles.optional}>
            <summary>{t.options}</summary>
            <div className={styles.fields}>
              {!profile && <label>{t.name}<input value={name} onChange={event => {
                setName(event.target.value);operationId.current=null;
              }} maxLength={120} autoComplete="name" /></label>}
              <label className={styles.wishes}>{t.wishes}
                <textarea value={wishes} maxLength={500} rows={2} placeholder={t.wishesPlaceholder}
                  onChange={event => {setWishes(event.target.value);operationId.current=null;}} />
              </label>
            </div>
          </details>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {reference ? <div className={styles.receipt} role="status" data-talisman-quote-saved>
            <h2>{t.success}</h2><p>{t.reference}: <strong>{reference}</strong></p>
            <p>{t.successNote}</p>
          </div> : <div className={styles.quoteFallback}>
            <p>{t.quoteLabel}</p>
            <button type="submit" disabled={busy || !consent || accountBusy || !loaded} className={styles.quoteButton}
              data-talisman-request-quote>
              {busy ? t.sending : t.quoteButton} <span aria-hidden="true">→</span>
            </button>
          </div>}
        </form>
        <p className={styles.privacy}>{t.privacy}</p>
      </>}
  </section>;
}
