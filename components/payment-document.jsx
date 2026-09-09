import Link from 'next/link'
import { DocumentAutoPrint } from './document-auto-print'
import { paymentNarrative, formatPaymentAmount } from '@/lib/documents/payment'
import { PrescriptionActions } from './prescription-actions'
import { DocumentLetterhead, DocumentSignature } from './document-letterhead'

export function PaymentDocument({ document, locale, selector, autoPrint = false, admin = false }) {
  const ru = locale === 'ru'
  const received = document.paymentStatus === 'received'
  const title = received ? (ru ? 'КВИТАНЦИЯ' : 'RECEIPT') : (ru ? 'СЧЁТ НА ОПЛАТУ' : 'INVOICE')
  const alternateLocale = ru ? 'en' : 'ru'
  return <main className="prescription-shell canonical-shell">
    {!admin && selector && <div className="prescription-toolbar">
      <Link href={`/${alternateLocale}/prescriptions/${selector}`}>{alternateLocale.toUpperCase()}</Link>
      <PrescriptionActions locale={locale} selector={selector} autoPrint={autoPrint} />
    </div>}
    <article className="canonical-document canonical-payment">
      <DocumentAutoPrint enabled={admin && autoPrint} /><DocumentLetterhead /><h1>{title}</h1>
      <p className="canonical-payment-narrative">{paymentNarrative(document, locale)}</p>
      <div className="canonical-payment-details">
        <p>{ru ? 'Услуга' : 'Service'}: {document.service}</p>
        <p>{received ? (ru ? 'Получено' : 'Amount received') : (ru ? 'К оплате' : 'Amount due')}: {document.currency} {formatPaymentAmount(document, locale)}</p>
        {document.documentNumber && <p>{received ? (ru ? 'Квитанция №' : 'Receipt No.') : (ru ? 'Счёт №' : 'Invoice No.')}: {document.documentNumber}</p>}
      </div>
      <DocumentSignature date={document.dateIssued} locale={locale} payment />
    </article>
  </main>
}
