import type { Metadata } from 'next'
import Link from 'next/link'

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
      <h2>Choices</h2>
      <p>You can use available guest features without Google sign-in where offered. You may request account deletion from the account privacy area; deletion removes the associated application data according to the displayed workflow.</p>
      <h2>Important scope</h2>
      <p>Holistic House content and assessments are for reflection and education. They are not medical advice, diagnosis, treatment, or emergency support.</p>
      <p><Link href="/terms">Read the Terms of Use</Link></p>
    </main>
  )
}
