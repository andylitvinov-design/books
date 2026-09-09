import Image from 'next/image'
import { LETTERHEAD } from '@/lib/documents/letterhead'

export function DocumentLetterhead() {
  return <header className="canonical-letterhead">
    <Image src="/document-assets/lighthouse.png" width={120} height={120} alt="" unoptimized />
    <div><p className="canonical-practitioner">{LETTERHEAD.name}</p>
      <p className="canonical-credentials">{LETTERHEAD.role}<br />{LETTERHEAD.background}</p>
      <p className="canonical-contact">{LETTERHEAD.address} · {LETTERHEAD.city} · {LETTERHEAD.phone}</p>
    </div>
  </header>
}

export function DocumentSignature({ date, locale, payment = false }) {
  return <footer className={`canonical-signature${payment ? ' payment-signature' : ''}`}>
    <p>{locale === 'ru' ? 'Одесса, Украина' : 'Odesa, Ukraine'}, {date}.</p>
    <div className="canonical-signature-line" />
    <strong>{LETTERHEAD.signatureName}</strong>
    <p>{LETTERHEAD.role}<br />{LETTERHEAD.background}</p>
    <p>{LETTERHEAD.address} · {LETTERHEAD.city}<br />{LETTERHEAD.phone}</p>
  </footer>
}
