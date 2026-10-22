import type { Metadata } from 'next'
import Link from 'next/link'
import { AnalyticsPreferences } from '@/components/analytics-consent'

export const metadata: Metadata = {
  title: 'Privacy — Holistic House',
  description: 'How Holistic House uses account and assessment information.',
}

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-page__brand">Holistic House</Link>
      <h1>Privacy</h1>
      <p>Holistic House provides educational materials, personal-development tools, and optional account-based features.</p>
      <h2>Google sign-in</h2>
      <p>When you choose Google sign-in, we use the Google profile and email supplied for authentication to create and protect your Holistic House account. We do not request access to your Google Drive, Calendar, contacts, or other Google content.</p>
      <h2>Assessment and account information</h2>
      <p>Responses and account records are used to provide your requested assessment, history, and account features. The application applies access controls and encrypted storage for private assessment records.</p>
      <h2>Optional private laboratory records</h2>
      <p>If you choose to use My laboratory results, you review the extracted indicators, reference limits, units, and collection date yourself before explicitly saving them. For tabular file input, parsing occurs in your browser; original files, scanned documents and pasted source text are not stored by Holistic House. We store your confirmed structured values in encrypted, account-restricted records. Health information is sensitive and participation is optional.</p>
      <p>Your laboratory records are not automatically shared with a practitioner, customer-management system, advertiser or external AI processor. You may open and remove each saved report from your private cabinet and include your lab history in your account data export. Deleting the account also deletes these records from the active application database; separately retained backups, where applicable, follow the service provider’s backup retention policy. Do not use this educational comparison tool for emergency medical decisions.</p>
      <h2>Choices</h2>
      <p>You can use available guest features without Google sign-in where offered. You may request account deletion from the account privacy area; deletion removes the associated application data according to the displayed workflow.</p>
      <h2>Optional website analytics</h2>
      <p>We do not show a consent popup. Public website analytics stay off unless you enable them below. You can switch them off again at any time, without affecting access to the site or your account.</p>
      <AnalyticsPreferences />
      <h2>Important scope</h2>
      <p>Holistic House content and assessments are for reflection and education. They are not medical advice, diagnosis, treatment, or emergency support.</p>
      <p><Link href="/terms">Read the Terms of Use</Link></p>
    </main>
  )
}
