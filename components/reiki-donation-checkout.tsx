"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appFetch } from "@/lib/app/client-fetch";
import styles from "./reiki-donation-checkout.module.css";

type Locale = "en" | "ru";
type Order = {
  id: string; status: "pending" | "review" | "paid";
  amountEur: number; receivedEur: number | null; verifiedAt: string | null;
  traditions: string[]; revision: number; paymentUrl: string | null;
};
type Snapshot = { enabled: boolean; order: Order | null };
const labels: Record<string, string> = {
  tantra: "Tantra Reiki", kundalini: "Kundalini Reiki", yggdrasil: "Reiki Yggdrasil",
};
const lang = {
  en: {
    title: "Your optional Reiki donation", note: "Your first Level 1 initiation stays free. A donation is voluntary and does not confirm an initiation or appointment.",
    total: "Your donation", edit: "Choose any amount in EUR (1–250)", selected: "Additional Reiki systems",
    ready: "Continue my request", requires: "The payment link appears after your course application is saved and shared privately with Andrey.",
    checkout: "Optional donation · checkout", start: "Prepare my donation", pay: "Continue to PayPal",
    payer: "Confirm that the recipient is Andrii Litvinov. Pay for goods and services, not friends and family. PayPal login may be required.",
    reference: "PayPal transaction ID", referenceHint: "After completing your payment in PayPal, paste the real transaction ID here. Do not send a screenshot or payment credentials.",
    send: "Submit transaction for review", waiting: "Your transfer is awaiting independent verification. No payment has been confirmed yet.",
    paid: "Payment received and verified", receipt: "Your receipt", verified: "Verified on",
    refresh: "Check payment status", unavailable: "Online donations are not yet activated. Your free initiation application remains available.",
    error: "Unable to process the donation request. Please try again without paying twice.",
    saved: "Donation request saved", close: "Back to course",
  },
  ru: {
    title: "Ваша добровольная поддержка", note: "Первая инициация I ступени остаётся бесплатной. Донейшн добровольный и сам по себе не подтверждает проведение инициации или запись.",
    total: "Сумма донейшна", edit: "Любая сумма в EUR (1–250)", selected: "Дополнительные системы Рейки",
    ready: "Продолжить оформление", requires: "Ссылка на оплату появится после того, как вы сохраните и отправите свою заявку Андрею через защищённый кабинет.",
    checkout: "Донейшн · корзина курса", start: "Оформить донейшн", pay: "Перейти в PayPal",
    payer: "Проверьте получателя: Andrii Litvinov. Выберите «Товары и услуги», не «Друзьям и семье». Может потребоваться аккаунт PayPal.",
    reference: "Номер транзакции PayPal", referenceHint: "После фактического перевода скопируйте номер транзакции из PayPal. Не присылайте скриншоты, пароль или данные карты.",
    send: "Отправить номер на проверку", waiting: "Перевод ожидает независимой сверки. Получение денег пока не подтверждено.",
    paid: "Оплата поступила и проверена", receipt: "Подтверждение оплаты", verified: "Проверено",
    refresh: "Проверить статус оплаты", unavailable: "Приём донейшнов онлайн ещё не активирован. Бесплатная заявка на инициацию остаётся доступной.",
    error: "Не удалось оформить донейшн. Повторите попытку, не отправляя деньги дважды.",
    saved: "Заявка на донейшн сохранена", close: "Вернуться к курсу",
  },
} as const;

function PricePicker({ locale, amountEur, onChange }: {
  locale: Locale; amountEur: number; onChange: (value: number) => void;
}) {
  return <div className={styles.pricePicker}>
    <span className={styles.label}>{lang[locale].total}</span>
    <div className={styles.prices} role="group" aria-label={lang[locale].total}>
      {[5, 10, 20, 50].map(value => <button key={value} type="button"
        className={value === amountEur ? styles.active : ""}
        aria-pressed={amountEur === value} onClick={() => onChange(value)}>€{value}</button>)}
    </div>
    <label className={styles.custom}>{lang[locale].edit}
      <span><span>€</span><input type="number" inputMode="numeric" min={1} max={250}
        step={1} value={amountEur || ""} onChange={event => onChange(Number(event.target.value))}
        aria-label={lang[locale].edit} /></span>
    </label>
  </div>;
}

/** A native modal keeps the checkout preview inside the course, not a second enrollment form. */
export function ReikiDonationPreview({ open, onClose, locale, traditions, amountEur, onAmountChange }: {
  open: boolean; onClose: () => void; locale: Locale;
  traditions: string[]; amountEur: number; onAmountChange: (amount: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, [open]);
  const t = lang[locale];
  return <dialog ref={dialog} className={styles.dialog}
    aria-labelledby="reiki-donation-cart-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={styles.sheet} data-reiki-donation-preview>
      <span className={styles.eyebrow}>Reiki Practitioner</span>
      <h2 id="reiki-donation-cart-title">{t.title}</h2>
      <p>{t.note}</p>
      <div className={styles.lineItem}>
        <b>{t.selected}</b>
        <span>{traditions.map(id => labels[id]).filter(Boolean).join(" · ")}</span>
      </div>
      <PricePicker locale={locale} amountEur={amountEur} onChange={onAmountChange} />
      <p className={styles.note}>{t.requires}</p>
      <button className={styles.primary} type="button" onClick={onClose}
        disabled={!Number.isSafeInteger(amountEur) || amountEur < 1 || amountEur > 250}>{t.ready}</button>
      <button className={styles.secondary} type="button" onClick={onClose}>{t.close}</button>
    </div>
  </dialog>;
}

/** Only provider-attested receipts become paid; opening PayPal is not payment evidence. */
export function ReikiDonationCheckout({ locale, traditions, accountId, initialAmountEur }: {
  locale: Locale; traditions: string[]; accountId?: string | null; initialAmountEur: number;
}) {
  const t = lang[locale];
  const [state, setState] = useState<Snapshot | null>(null);
  const [amountEur, setAmountEur] = useState(initialAmountEur);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const operationId = useRef<string | null>(null);
  const reload = useCallback(async () => {
    try {
      const value = await appFetch("reiki-donations", undefined, "GET",
        { accountId: accountId || undefined }) as Snapshot;
      setState(value);
      setError("");
    } catch { setError(t.error); }
  }, [accountId, t.error]);
  useEffect(() => { void reload(); }, [reload]);
  async function submit(action: "create" | "claim") {
    if (loading) return;
    setLoading(true); setError("");
    try {
      if (!operationId.current) operationId.current = crypto.randomUUID();
      const value = await appFetch("reiki-donations", action === "create"
        ? { action, operationId: operationId.current, amountEur }
        : { action, orderId: state?.order?.id, receiptReference: reference.trim() },
      "POST", { accountId: accountId || undefined }) as Snapshot;
      setState(value);
      if (action === "claim") setReference("");
    } catch { setError(t.error); }
    finally { setLoading(false); }
  }
  const order = state?.order;
  return <section className={styles.checkout} data-reiki-donation-checkout
    aria-label={t.checkout}>
    <span className={styles.eyebrow}>Reiki Practitioner</span>
    <h3>{t.checkout}</h3>
    <p className={styles.intro}>{t.note}</p>
    <div className={styles.lineItem}>
      <b>{t.selected}</b><span>{(order?.traditions || traditions).map(id => labels[id]).filter(Boolean).join(" · ")}</span>
    </div>
    {order?.status === "paid" ? <div className={styles.verified}
      data-reiki-donation-confirmed role="status">
      <strong>{t.paid}</strong>
      <p>{t.receipt} · <b>€{order.receivedEur}</b> · EUR</p>
      <small>{t.verified}: {order.verifiedAt ? new Date(order.verifiedAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-CA") : "—"}</small>
    </div> : order?.status === "review" ? <div className={styles.review}
      data-reiki-donation-awaiting-verification role="status">
      <strong>€{order.amountEur} EUR</strong>
      <p>{t.waiting}</p>
    </div> : order ? <>
      <p className={styles.total}>€{order.amountEur} EUR</p>
      {order.paymentUrl ? <>
        <a className={styles.primary} href={order.paymentUrl}
          target="_blank" rel="noopener noreferrer">{t.pay}</a>
        <p className={styles.note}>{t.payer}</p>
        <label className={styles.custom}>{t.reference}
          <input type="text" autoComplete="off" spellCheck={false} value={reference}
            maxLength={80} onChange={event => setReference(event.target.value)}
            placeholder="PayPal transaction ID" />
        </label>
        <p className={styles.note}>{t.referenceHint}</p>
        <button className={styles.primary} type="button" onClick={() => void submit("claim")}
          disabled={loading || !/^[A-Za-z0-9][A-Za-z0-9_-]{5,79}$/.test(reference.trim())}>{t.send}</button>
      </> : <p className={styles.note}>{t.unavailable}</p>}
    </> : state?.enabled ? <>
      <PricePicker locale={locale} amountEur={amountEur} onChange={setAmountEur} />
      <button className={styles.primary} type="button" onClick={() => void submit("create")}
        disabled={loading || !Number.isSafeInteger(amountEur) || amountEur < 1 || amountEur > 250}>{t.start}</button>
    </> : <p className={styles.note}>{t.unavailable}</p>}
    <button className={styles.secondary} type="button" onClick={() => void reload()} disabled={loading}>
      {t.refresh}</button>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
  </section>;
}
