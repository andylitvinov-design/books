import Link from 'next/link'
import { appEnabled } from '@/lib/app/config'
export function AppEntryLink({ locale = 'en' }) {
  if (!appEnabled()) return null
  const target = locale === 'ru' ? 'ru' : 'en'
  const copy =
    locale === 'ru'
      ? {
          title: 'Мой портрет',
          text: 'Короткие тесты, личный профиль и история изменений. Отдельный вход через Google.',
          cta: 'Открыть приложение',
        }
      : locale === 'es'
        ? {
            title: 'Mi perfil personal',
            text: 'Pruebas breves y un historial personal. La aplicación se abre en inglés; acceso con Google.',
            cta: 'Abrir aplicación en inglés',
          }
        : {
            title: 'My personal portrait',
            text: 'Short check-ins, your personal profile and a history of change. Separate sign-in with Google.',
            cta: 'Open personal app',
          }
  return (
    <section className="client-entry-card" aria-label={copy.title}>
      <h2>{copy.title}</h2>
      <p>{copy.text}</p>
      <Link className="personal-consultation-submit" href={`/${target}/app`} prefetch={false}>
        {copy.cta}
      </Link>
    </section>
  )
}
