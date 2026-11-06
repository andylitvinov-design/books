'use client'
import { CheckCircle2, Clock3, RotateCcw, ShieldCheck } from 'lucide-react'
import styles from './wallet-panel.module.css'

const messages = {
  ru: {
    confirmed: 'Поступление проверено. Баланс пополнен',
    awaiting: 'Ожидаем подтверждения от Square',
    checking: 'Проверяем платёж по данным Square…',
    reported: 'ID PayPal отправлен. Ожидается проверка поступления',
    reversed: 'Возврат зафиксирован. Баланс скорректирован',
    rejected: 'Заявка отклонена — средства не зачислены',
    pending: 'Оплата пока не подтверждена',
    unknown: 'Заказ не найден в истории этого аккаунта. Проверьте историю или обратитесь в поддержку',
    order: 'Номер заявки', provider: 'Способ оплаты', verified: 'Подтверждено',
    note: 'Это подтверждение зачисления в личный кабинет, не налоговый чек. Средства доступны только на услуги Holistic House.',
    warning: 'Возврат с платёжной страницы не подтверждает списание. Не оплачивайте повторно до проверки статуса.',
  },
  en: {
    confirmed: 'Payment verified. Your balance has been credited',
    awaiting: 'Awaiting confirmation from Square',
    checking: 'Verifying your payment with Square…',
    reported: 'PayPal transaction ID submitted. Receipt is being reviewed',
    reversed: 'Refund recorded. Account balance adjusted',
    rejected: 'Top-up rejected. No funds credited',
    pending: 'Payment not yet verified',
    unknown: 'This order was not found in your account history. Review the history or contact support',
    order: 'Order reference', provider: 'Payment method', verified: 'Verified on',
    note: 'This confirms credit to your Holistic House account, not a tax invoice. Credit is usable for eligible Holistic House services only.',
    warning: 'Returning from the checkout page is not proof of payment. Please avoid paying twice before checking status.',
  },
}

function formatAmount(amountMinor) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })
    .format(Number(amountMinor || 0) / 100)
}

export default function WalletConfirmation({ locale = 'en', order, verifying = false, requested = false }) {
  if (!requested) return null
  const t = messages[locale] || messages.en
  const paid = order?.status === 'credited' && Boolean(order.verifiedAt)
  const refunded = order?.status === 'reversed'
  const reviewed = order?.status === 'reported'
  const status = !order ? 'unknown'
    : paid ? 'confirmed'
      : refunded ? 'reversed'
        : reviewed ? 'reported'
          : order.status === 'rejected' ? 'rejected'
            : verifying ? 'checking'
              : order.provider === 'square_api' ? 'awaiting' : 'pending'
  const Icon = paid ? CheckCircle2 : refunded ? RotateCcw : verifying ? ShieldCheck : Clock3
  return <section className={styles.confirmation} data-wallet-confirmation={status} aria-live="polite">
    <div className={styles.confirmationTitle}>
      <Icon size={23} aria-hidden="true" />
      <strong>{t[status]}</strong>
    </div>
    {order && <dl className={styles.confirmationDetails}>
      <div><dt>{t.order}</dt><dd>{order.id}</dd></div>
      <div><dt>CAD</dt><dd>{formatAmount(order.amountMinor)}</dd></div>
      <div><dt>{t.provider}</dt><dd>{order.provider === 'square_api' ? 'Square' : 'PayPal'}</dd></div>
      {paid && <div><dt>{t.verified}</dt>
        <dd>{new Date(order.verifiedAt).toLocaleString(locale === 'ru' ? 'ru-CA' : 'en-CA')}</dd>
      </div>}
    </dl>}
    {paid ? <p className={styles.small}>{t.note}</p> :
      !refunded && !reviewed ? <p className={styles.small}>{t.warning}</p> : null}
  </section>
}
