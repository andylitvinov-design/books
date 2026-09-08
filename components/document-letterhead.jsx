import Image from 'next/image'

export function DocumentLetterhead() {
  return <header className="canonical-letterhead">
    <Image src="/document-assets/lighthouse.png" width={120} height={120} alt="" unoptimized />
    <div><p className="canonical-practitioner">ANDRII LITVINOV</p>
      <p className="canonical-credentials">Psychological Consultant · Hypnotherapist · Homeopath<br />Systemic &amp; Family Constellations Facilitator</p>
      <p className="canonical-contact">5 Henuyezka St, Apt. 222V · Odesa, Ukraine · +380 93 478 88 27</p>
    </div>
  </header>
}

export function DocumentSignature({ date, locale, payment = false }) {
  return <footer className={`canonical-signature${payment ? ' payment-signature' : ''}`}>
    <p>{locale === 'ru' ? 'Одесса, Украина' : 'Odesa, Ukraine'}, {date}.</p>
    <div className="canonical-signature-line" />
    <strong>Andrii Litvinov</strong>
    <p>Psychological Consultant · Hypnotherapist · Homeopath<br />Systemic &amp; Family Constellations Facilitator</p>
    {payment && <p>5 Henuyezka St, Apt. 222V · Odesa, Ukraine<br />+380 93 478 88 27</p>}
  </footer>
}
