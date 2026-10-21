import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { uiLocaleCookie } from '@/lib/ui-locale'
import { readAcquisitionReport } from '@/lib/acquisition/read-report.js'
import { ACQUISITION_SOURCES, UNMEASURED_STAGES, acquisitionRecommendation } from '@/lib/acquisition/report.js'
import { AdminAcquisitionLinks } from '@/components/admin-acquisition-links'
import styles from './acquisition.module.css'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Campaigns & enquiries · Holistic House', robots: { index: false, follow: false }, referrer: 'no-referrer' }

const copy = {
  en: {
    title: 'Campaigns & enquiries', lead: 'A clear view of what is recorded, what is missing, and the next safe step.', back: '← Cabinet',
    periods: ['Yesterday', 'Last 7 days', 'Last 30 days'], calendar: 'Completed Toronto calendar days',
    observed: 'Recorded service interactions', counterNote: 'Existing first-party daily counters across public services. Repeat clicks and repeat impressions can count again. These are not unique visitors, bookings or receipts, and cannot be assigned to a source, campaign or language.',
    counters: { impressions: 'Service impressions', orderClicks: 'Order button clicks', whatsappClicks: 'WhatsApp opens', telegramClicks: 'Telegram opens' },
    unavailable: 'Counter data is unavailable. Configuration, access or the existing counter table may be unavailable; no zero is inferred.',
    empty: 'No daily counter records exist for this period. Measurement coverage is unknown.',
    coverage: 'Days with stored counter records', refresh: 'Read on this request', missing: 'Not measured',
    funnel: 'From listing to paid service', funnelNote: 'A click is an interaction. A confirmed inquiry needs a received request; a paid order needs a verified payment record. Neither is inferred from a messenger opening.',
    stages: { listing: 'Published platform listings', registration: 'Platform registrations', landing: 'Landing visits', confirmedInquiry: 'Confirmed inquiries', paidOrder: 'Paid orders', completedPaidSession: 'Completed paid sessions', revenue: 'Revenue', conversionRate: 'Conversion rate' },
    sources: 'Source & campaign coverage', sourceNote: 'The current daily table has no source, campaign or language columns. All source-level values remain unmeasured. A campaign link preserves a public label for the visitor to send voluntarily; it is not evidence of a lead.',
    next: 'Next safe step', recommendations: {
      measurement_unavailable: 'Verify access to the existing daily counters before comparing activity. Do not treat missing observations as zero demand.',
      confirm_receipts: 'Messenger openings are recorded. Reconcile actual received inquiries separately before evaluating acquisition; the site cannot confirm that Send was pressed.',
      check_handoff: 'Order clicks are recorded. Review the public handoff flow; clicks alone do not establish that a request was received.',
      review_cta: 'Service impressions are recorded without observed Order or messenger clicks. Review the public call to action without claiming a conversion rate or cause.',
      no_activity: 'The stored daily records contain zero interactions. This does not establish complete site coverage or zero inquiries.',
    },
    privacy: 'Privacy hold preserved', privacyNote: 'GA4 and marketing pixels stay disabled. This page reads aggregate service counters only. Client details, health information, test results, attendee lists and payment records are not loaded.',
    events: 'Upcoming public events', eventsNote: 'No upcoming event is presented by this report. A real event may be shown on the site only after owner approval and verification of its provider ID, organizer, local date/time and public URL.',
  },
  ru: {
    title: 'Кампании и обращения', lead: 'Что действительно записано, чего пока нет и какой следующий шаг безопасен.', back: '← Кабинет',
    periods: ['Вчера', 'Последние 7 дней', 'Последние 30 дней'], calendar: 'Полные календарные дни Торонто',
    observed: 'Записанные действия с услугами', counterNote: 'Существующие суточные счётчики публичных услуг. Повторные клики и показы могут учитываться снова. Это не уникальные посетители, записи или полученные заявки; источник, кампания и язык неизвестны.',
    counters: { impressions: 'Показы услуг', orderClicks: 'Клики «Заказать»', whatsappClicks: 'Открытия WhatsApp', telegramClicks: 'Открытия Telegram' },
    unavailable: 'Счётчики недоступны. Возможно, нет конфигурации, доступа или таблицы счётчиков. Ноль не подставляется.',
    empty: 'За этот период нет суточных записей счётчика. Полнота измерений неизвестна.',
    coverage: 'Дней с записями счётчика', refresh: 'Прочитано при открытии страницы', missing: 'Не измеряется',
    funnel: 'От объявления до оплаченной услуги', funnelNote: 'Клик — действие на сайте. Подтверждённое обращение требует полученной заявки, а оплаченный заказ — проверенного платежа. Открытие мессенджера этого не доказывает.',
    stages: { listing: 'Опубликованные объявления', registration: 'Регистрации на платформе', landing: 'Посещения страницы', confirmedInquiry: 'Подтверждённые обращения', paidOrder: 'Оплаченные заказы', completedPaidSession: 'Проведённые оплаченные сессии', revenue: 'Выручка', conversionRate: 'Конверсия' },
    sources: 'Источники и кампании', sourceNote: 'В суточной таблице нет источника, кампании или языка. Показатели по источникам не измеряются. Ссылка сохраняет публичную метку для добровольной отправки посетителем; это ещё не заявка.',
    next: 'Следующий безопасный шаг', recommendations: {
      measurement_unavailable: 'Проверьте доступ к существующим счётчикам перед сравнением активности. Отсутствие наблюдений не означает отсутствие спроса.',
      confirm_receipts: 'Есть открытия мессенджеров. Отдельно сверяйте реально полученные обращения: сайт не подтверждает нажатие «Отправить».',
      check_handoff: 'Есть клики «Заказать». Проверьте публичный переход в мессенджер; клики ещё не подтверждают получение заявки.',
      review_cta: 'Есть показы услуг без записанных кликов «Заказать» или в мессенджеры. Проверьте призыв к действию, не делая выводов о конверсии или причине.',
      no_activity: 'В сохранённых суточных записях действий нет. Это не доказывает полноту измерений сайта или отсутствие обращений.',
    },
    privacy: 'Приватность сохранена', privacyNote: 'GA4 и маркетинговые пиксели отключены. Страница читает только суммарные счётчики услуг. Контакты клиентов, медицинские сведения, результаты тестов, списки участников и платежи не загружаются.',
    events: 'Ближайшие публичные мероприятия', eventsNote: 'Этот отчёт не показывает предстоящих мероприятий. На сайте можно показать реальное событие только после одобрения владельцем и проверки ID платформы, организатора, местной даты/времени и публичного URL.',
  },
  es: {
    title: 'Campañas y consultas', lead: 'Qué se registra, qué falta y cuál es el siguiente paso seguro.', back: '← Panel',
    periods: ['Ayer', 'Últimos 7 días', 'Últimos 30 días'], calendar: 'Días completos del calendario de Toronto',
    observed: 'Interacciones registradas con servicios', counterNote: 'Contadores diarios existentes de servicios públicos. Las impresiones y los clics repetidos pueden volver a contar. No son visitantes únicos, reservas ni solicitudes recibidas; no se pueden atribuir a una fuente, campaña o idioma.',
    counters: { impressions: 'Impresiones de servicios', orderClicks: 'Clics en «Solicitar»', whatsappClicks: 'Aperturas de WhatsApp', telegramClicks: 'Aperturas de Telegram' },
    unavailable: 'Los contadores no están disponibles. Puede faltar configuración, acceso o la tabla existente. No se muestra un cero supuesto.',
    empty: 'No hay registros diarios de contadores para este periodo. La cobertura de medición es desconocida.',
    coverage: 'Días con registros guardados', refresh: 'Leído en esta solicitud', missing: 'No medido',
    funnel: 'Del anuncio al servicio pagado', funnelNote: 'Un clic es una interacción. Una consulta confirmada requiere una solicitud recibida; un pedido pagado requiere un pago verificado. Abrir un mensajero no confirma ninguno de los dos.',
    stages: { listing: 'Anuncios publicados', registration: 'Registros en plataformas', landing: 'Visitas a la página', confirmedInquiry: 'Consultas confirmadas', paidOrder: 'Pedidos pagados', completedPaidSession: 'Sesiones pagadas realizadas', revenue: 'Ingresos', conversionRate: 'Tasa de conversión' },
    sources: 'Cobertura por fuente y campaña', sourceNote: 'La tabla diaria no tiene fuente, campaña ni idioma. Las métricas por fuente no están medidas. Un enlace conserva una etiqueta pública que el visitante puede enviar voluntariamente; no demuestra una consulta.',
    next: 'Siguiente paso seguro', recommendations: {
      measurement_unavailable: 'Verifica el acceso a los contadores existentes antes de comparar actividad. La falta de observaciones no significa falta de demanda.',
      confirm_receipts: 'Hay aperturas de mensajeros registradas. Concilia las consultas realmente recibidas por separado; el sitio no confirma que se pulsara Enviar.',
      check_handoff: 'Hay clics de solicitud registrados. Revisa el paso al mensajero; los clics no demuestran que se recibiera una solicitud.',
      review_cta: 'Hay impresiones de servicios sin clics de solicitud o mensajero registrados. Revisa la llamada a la acción sin afirmar una tasa de conversión ni su causa.',
      no_activity: 'Los registros diarios guardados contienen cero interacciones. No demuestra cobertura completa ni ausencia de consultas.',
    },
    privacy: 'Privacidad preservada', privacyNote: 'GA4 y los píxeles publicitarios siguen desactivados. Esta página solo lee contadores agregados. No carga datos de clientes, información médica, resultados, listas de asistentes ni pagos.',
    events: 'Próximos eventos públicos', eventsNote: 'Este informe no presenta próximos eventos. Solo se puede mostrar un evento real tras la aprobación del propietario y la verificación de ID de plataforma, organizador, fecha/hora local y URL pública.',
  },
}

export default async function AcquisitionPage({ searchParams }) {
  if (!await requireAdminRequest()) redirect('/admin/login?destination=acquisition')
  const params = await searchParams
  const savedLocale = (await cookies()).get(uiLocaleCookie)?.value
  const locale = ['en', 'ru', 'es'].includes(params?.lang) ? params.lang : savedLocale === 'ru' ? 'ru' : 'en'
  const report = await readAcquisitionReport(params?.days)
  if (report.status === 'forbidden') redirect('/admin/login?destination=acquisition')
  const t = copy[locale]
  const counts = report.counters.totals
  const query = (lang, days) => `/admin/acquisition?lang=${lang}&days=${days}`
  return <main className={styles.page} lang={locale} data-acquisition-admin>
    <header className={styles.header}>
      <div><Link href={`/${locale === "ru" ? "ru" : "en"}/app/practice?panel=marketing`} className={styles.back}>{t.back}</Link><p className={styles.eyebrow}>HOLISTIC HOUSE</p><h1>{t.title}</h1><p className={styles.lead}>{t.lead}</p></div>
      <nav className={styles.languages} aria-label="Language">{['en', 'ru', 'es'].map(lang => <Link key={lang} href={query(lang, report.range.days)} hrefLang={lang} aria-current={lang === locale ? 'page' : undefined}>{lang.toUpperCase()}</Link>)}</nav>
    </header>
    <div className={styles.toolbar}><nav className={styles.periods} aria-label={t.calendar}>{[1, 7, 30].map((days, index) => <Link key={days} href={query(locale, days)} aria-current={days === report.range.days ? 'page' : undefined}>{t.periods[index]}</Link>)}</nav><p>{report.range.start} — {report.range.end}<br/><span>{t.calendar} · {report.range.timeZone}</span></p></div>
    <section className={styles.panel} aria-labelledby="recorded-title">
      <div className={styles.sectionHeader}><h2 id="recorded-title">{t.observed}</h2><span className={styles.badge}>{report.counters.status === 'observed' ? t.refresh : t.missing}</span></div>
      <p className={styles.note}>{t.counterNote}</p>
      <div className={styles.metrics}>{Object.entries(t.counters).map(([key, label]) => <article key={key}><p>{label}</p><strong>{counts ? new Intl.NumberFormat(locale).format(counts[key]) : t.missing}</strong></article>)}</div>
      <p className={styles.note}>{counts ? `${t.coverage}: ${report.counters.observedDays}/${report.range.days}` : report.counters.status === 'unavailable' ? t.unavailable : t.empty}</p>
    </section>
    <section className={styles.panel} aria-labelledby="funnel-title"><h2 id="funnel-title">{t.funnel}</h2><p className={styles.note}>{t.funnelNote}</p><dl className={styles.stages}>{UNMEASURED_STAGES.map(key => <div key={key}><dt>{t.stages[key]}</dt><dd>{t.missing}</dd></div>)}</dl></section>
    <section className={styles.recommendation}><p className={styles.eyebrow}>{t.next}</p><h2>{t.recommendations[acquisitionRecommendation(report)]}</h2></section>
    <section className={styles.panel} aria-labelledby="sources-title"><h2 id="sources-title">{t.sources}</h2><p className={styles.note}>{t.sourceNote}</p><div className={styles.sources}>{ACQUISITION_SOURCES.map(([source, label]) => <article key={source}><strong>{label}</strong><span>{t.missing}</span></article>)}</div></section>
    <AdminAcquisitionLinks locale={locale}/>
    <div className={styles.bottomGrid}><section className={styles.panel}><h2>{t.privacy}</h2><p className={styles.note}>{t.privacyNote}</p></section><section className={styles.panel}><h2>{t.events}</h2><p className={styles.note}>{t.eventsNote}</p></section></div>
  </main>
}
