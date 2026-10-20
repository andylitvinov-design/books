'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TestExplorer } from './test-explorer'
import { TestSelectionCourseBanner } from '@/components/sitewide-antistress-banner'
import { COURSE_ENTRY_INTENT_KEY, makeCourseEntryIntent } from '@/lib/inner-growth/course-entry-intent'

// An entire selected battery can start as a temporary guest session.
// Selection is limited to rights-cleared, server-verifiable instruments.
export function guestStartable(entries) {
  return Array.isArray(entries) && entries.length > 0 && entries.length <= 12 &&
    entries.every((entry) =>
      entry?.selectable === true && entry?.startable === true &&
      entry?.rightsStatus === 'cleared' && entry?.guestEligible === true &&
      Boolean(entry?.definition))
}

/** @param {{ locale: string, embedded?: boolean, initialPreferences?: { focus: string[], problems?: string[] } | null, initialMode?: 'tests' | 'course', initialBrowseFull?: boolean, onGuestStart?: ((entries: object[]) => Promise<void>) | null }} props */
export function PublicTestExplorer({ locale, embedded = false, initialPreferences = null, initialMode = 'tests', initialBrowseFull = false, onGuestStart = null }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const effectiveLocale = locale === 'ru' ? 'ru' : 'en'
  const submit = async (entries) => {
    setError('')
    try {
      if (!guestStartable(entries)) {
        const cause = new Error('GUEST_TEST_UNAVAILABLE')
        cause.code = 'GUEST_TEST_UNAVAILABLE'
        throw cause
      }
      if (typeof onGuestStart === 'function') {
        await onGuestStart(entries)
      } else {
        // Only public test keys travel in the URL; never answers, results,
        // subjective concerns, email or account identity.
        const keys = entries.map((entry) => entry.definition.key).join(',')
        router.push('/' + effectiveLocale + '/client?startTests=' + encodeURIComponent(keys))
      }
    } catch (cause) {
      setError(cause?.code === 'GUEST_TEST_UNAVAILABLE'
        ? (locale === 'ru' ? 'Этот тест пока недоступен без регистрации из-за ограничений методики или безопасности. Выберите другой доступный тест.' : locale === 'es' ? 'Esta prueba no está disponible para invitados. Elige una prueba habilitada.' : 'This test is not guest-available due to rights or safety restrictions. Choose an available test.')
        : (locale === 'ru' ? 'Не удалось начать тесты. Проверьте соединение и повторите попытку.' : locale === 'es' ? 'No se pudieron iniciar las pruebas. Inténtalo de nuevo.' : 'Could not start your tests. Please check your connection and try again.'))
      throw cause
    }
  }
  const launchCourse = (entries, selectionPreferences) => {
    // Courses use their independent consent flow, not a guest result claim.
    try {
      window.sessionStorage.setItem(COURSE_ENTRY_INTENT_KEY, makeCourseEntryIntent(entries, selectionPreferences))
    } catch { /* Private mode may block session storage; the course still opens. */ }
    router.push('/' + effectiveLocale + '/app/course?entry=personal')
  }
  return <>
    <TestExplorer locale={locale} audience="guest" embedded={embedded} simpleMode={embedded}
      key={effectiveLocale + ':' + (initialPreferences?.focus || []).join(',') + ':' + (initialPreferences?.problems || []).join(',') + ':' + initialMode + ':' + String(initialBrowseFull)}
      initialPreferences={initialPreferences} initialMode={initialMode} initialBrowseFull={initialBrowseFull} onStart={submit} onStartCourse={launchCourse} />
    {error && <p role="alert" className="cabinet-test-error">{error}</p>}
    <TestSelectionCourseBanner locale={locale} showReview />
  </>
}
