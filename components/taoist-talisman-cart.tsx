"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { TAOIST_TALISMANS } from "@/lib/practitioners/taoist-talismans";
import { readBrowserTalismanCart, saveBrowserTalismanCart, TALISMAN_CART_UPDATED_EVENT } from "@/lib/practitioners/taoist-talisman-cart";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./taoist-talisman-cart.module.css";

type PaymentChoice = "square" | "paypal" | "wise";
const methods: PaymentChoice[] = ["square", "paypal", "wise"];
const copy = {
  en: {
    back: "Back to talismans", title: "Your talisman basket", intro: "Review your designs and request one personal quote for the whole basket.",
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
  },
  ru: {
    back: "Назад к талисманам", title: "Корзина талисманов", intro: "Проверьте выбранные талисманы и запросите одну стоимость для всей корзины.",
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
  },
  es: {
    back: "Volver a los talismanes", title: "Carrito de talismanes", intro: "Revisa tus diseños y solicita un presupuesto único para todo el carrito.",
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
  },
} as const;

export function TaoistTalismanCart({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [payment, setPayment] = useState<PaymentChoice>("square");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [wishes, setWishes] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState("");
  const operationId = useRef<string | null>(null);
  useEffect(() => {
    const sync = () => { setIds(readBrowserTalismanCart()); setLoaded(true); };
    sync();
    window.addEventListener(TALISMAN_CART_UPDATED_EVENT, sync);
    return () => window.removeEventListener(TALISMAN_CART_UPDATED_EVENT, sync);
  }, []);
  const selected = TAOIST_TALISMANS.filter(item => ids.includes(item.id));

  const remove = (id: string) => {
    if (!saveBrowserTalismanCart(ids.filter(value => value !== id))) setError(t.storage);
    else { setError(""); operationId.current = null; }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || reference) return;
    if (!selected.length || !consent || (!email.trim() && !phone.trim())) {
      setError(t.required); return;
    }
    setBusy(true); setError("");
    // Only public item identities and the selected nonbinding payment preference
    // are part of the quote. This API never creates a payment/booking.
    const description = [
      "Daoist talisman basket — QUOTE REQUEST ONLY; no payment or confirmed order.",
      ...selected.map(item => item.id + ": " + item.en.title),
      "Preferred payment method: " + payment,
      ...(wishes.trim() ? ["Private wishes: " + wishes.trim()] : []),
    ].join("\n");
    if (!operationId.current) operationId.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/service-enquiries", {
        method:"POST", credentials:"same-origin", cache:"no-store",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          operationId: operationId.current,
          serviceTitle: "Daoist talismans · basket quote",
          description,
          sourcePath: "/" + locale + "/holistic-support",
          locale, contact: { displayName:name, email, phone }, contactConsent:true,
          website:"",
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.saved !== true || data?.contactPending !== false ||
          typeof data.referenceCode !== "string") throw new Error("QUOTE_UNCONFIRMED");
      setReference(data.referenceCode);
    } catch { setError(t.failure); }
    finally { setBusy(false); }
  };

  return <section className={styles.shell} data-taoist-talisman-cart aria-labelledby="talisman-cart-title">
    <Link href={"/" + locale + "/holistic-support#talismans"} className={styles.back}>← {t.back}</Link>
    <header className={styles.heading}>
      <h1 id="talisman-cart-title">{t.title}</h1><p>{t.intro}</p>
    </header>
    {loaded && selected.length === 0
      ? <div className={styles.empty}><p>{t.empty}</p><Link href={"/" + locale + "/holistic-support#talismans"}>{t.browse} →</Link></div>
      : <>
        <ul className={styles.items}>
          {selected.map(item => <li key={item.id} data-cart-talisman={item.id}>
            <div className={styles.thumb}><Image src={item.image} fill alt={item[locale].title} sizes="94px" /></div>
            <div className={styles.itemInfo}>
              <h2>{item[locale].title}</h2><p>{item[locale].description}</p>
              <span>{t.price}: <strong>{t.quote}</strong></span>
            </div>
            {!reference && <button type="button" className={styles.remove} onClick={() => remove(item.id)}>{t.remove}</button>}
          </li>)}
        </ul>
        <div className={styles.total}><strong>{t.total}</strong><span>{t.totalPending}</span></div>
        {reference ? <div className={styles.receipt} role="status" data-talisman-quote-saved>
          <h2>{t.success}</h2><p>{t.reference}: <strong>{reference}</strong></p>
          <p>{t.successNote}</p><p>{t.telegramLater}</p>
        </div> : <form className={styles.form} onSubmit={submit} noValidate={false}>
          <fieldset className={styles.methods} disabled={busy}>
            <legend>{t.methods}</legend>
            <div className={styles.methodRows}>{methods.map(method => <label key={method} data-selected={payment === method}>
              <input type="radio" name="talisman-method" value={method} checked={payment === method}
                onChange={() => { setPayment(method); operationId.current = null; }} />
              {t[method]}
            </label>)}</div>
          </fieldset>
          <p className={styles.notice}>{t.gate}</p>
          <div className={styles.fields}>
            <label>{t.name}<input value={name} onChange={event => { setName(event.target.value); operationId.current = null; }} maxLength={120} autoComplete="name" /></label>
            <label>{t.email}<input value={email} onChange={event => { setEmail(event.target.value); operationId.current = null; }} type="email" maxLength={160} autoComplete="email" /></label>
            <label>{t.phone}<input value={phone} onChange={event => { setPhone(event.target.value); operationId.current = null; }} type="tel" maxLength={28} autoComplete="tel" /></label>
            <label className={styles.wishes}>{t.wishes}
              <textarea value={wishes} maxLength={500} rows={3} placeholder={t.wishesPlaceholder}
                onChange={event => { setWishes(event.target.value); operationId.current = null; }} /></label>
          </div>
          <label className={styles.agree}><input type="checkbox" checked={consent}
            onChange={event => setConsent(event.target.checked)} required />{t.consent}</label>
          <p className={styles.privacy}>{t.privacy}</p>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <button type="submit" disabled={busy || !loaded || !selected.length} className={styles.submit}>
            {busy ? t.sending : t.request} <span aria-hidden="true">→</span>
          </button>
        </form>}
      </>}
  </section>;
}
