import Image from 'next/image'
import { DOCUMENT_TEMPLATE } from '@/lib/documents/template'
import { signatureDataUri } from '@/lib/documents/signature'
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
    <Image className="canonical-signature-art" src={signatureDataUri()} width={DOCUMENT_TEMPLATE.signature.pixelsWide} height={DOCUMENT_TEMPLATE.signature.pixelsHigh} alt={locale === 'ru' ? 'Подпись Андрея Литвинова' : 'Andrii Litvinov signature'} unoptimized style={{ width: `${DOCUMENT_TEMPLATE.signature.width}pt`, maxWidth: '100%', height: 'auto', marginLeft: `${DOCUMENT_TEMPLATE.signature.offsetX}pt`, marginBottom: `${DOCUMENT_TEMPLATE.signature.gap}pt` }} />
    <div className="canonical-signature-line" style={{ width: `${DOCUMENT_TEMPLATE.signature.lineWidth}pt`, maxWidth: '100%' }} />
    <strong>{LETTERHEAD.signatureName}</strong>
    <p>{LETTERHEAD.role}<br />{LETTERHEAD.background}</p>
    <p>{LETTERHEAD.address} · {LETTERHEAD.city}<br />{LETTERHEAD.phone}</p>
  </footer>
}
