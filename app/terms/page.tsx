import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use — Holistic House',
  description: 'Terms for using Holistic House materials and account features.',
}

export default function TermsPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-page__brand">Holistic House</Link>
      <h1>Terms of Use</h1>
      <p>Use Holistic House materials and account features respectfully and only for lawful personal purposes. Keep your sign-in method and account access private.</p>
      <h2>Educational scope</h2>
      <p>Materials, assessments, and reports support reflection and education. They are not medical advice, diagnosis, treatment, or emergency support. Seek qualified professional or emergency help when needed.</p>
      <h2>Your information</h2>
      <p>You are responsible for information you choose to enter. Do not submit another person&apos;s private information without their permission.</p>
      <h2>Availability</h2>
      <p>We may improve, change, or suspend features to protect users and maintain the service.</p>
      <p><Link href="/privacy">Read the Privacy notice</Link></p>
    </main>
  )
}
