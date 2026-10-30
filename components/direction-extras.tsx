import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import type { PublicLocale } from '@/lib/public-locales'
import { BusinessConsultationFinder } from '@/components/business-consultation-finder'
import { BusinessServiceBrowser } from '@/components/business-service-browser'
import styles from './direction-offers.module.css'

type Direction = 'energy' | 'love' | 'business'
type Extra = { title: string; detail: string; path: string; id: string }

// Only actions NOT already offered in the three main sections (tests, courses,
// personal session). Keep the existing consented enquiry and booking flows.
const extras: Record<PublicLocale, { label: string; choices: Record<Direction, [Extra, Extra]> }> = {
  en: {
    label: 'Other ways to begin',
    choices: {
      energy: [
        { id: 'written-review', title: 'Free written situation review', detail: 'Short questionnaire and personal written reflection.', path: '/services/free-situation-review' },
        { id: 'remote-reiki', title: 'Remote Reiki support', detail: 'Choose a practitioner; requests need confirmation.', path: '/services/remote-energy-support' },
      ],
      love: [
        { id: 'written-review', title: 'Free written situation review', detail: 'Share a short questionnaire and drawing.', path: '/services/free-situation-review' },
        { id: 'imagery', title: 'Guided imagery therapy', detail: 'Explore a situation through symbolic imagery.', path: '/services/imagery-therapy' },
      ],
      business: [
        { id: 'written-review', title: 'Free written business review', detail: 'Your question and sketch, followed by a written reply.', path: '/services/free-situation-review?topic=business' },
        { id: 'mentoring', title: 'Ongoing goals mentoring', detail: 'Discuss the format and fees before deciding.', path: '/services/business-consulting?businessFormat=mentoring#business-direct-request' },
      ],
    },
  },
  ru: {
    label: 'Другие способы начать',
    choices: {
      energy: [
        { id: 'written-review', title: 'Бесплатный письменный разбор', detail: 'Короткая анкета и личный ответ.', path: '/services/free-situation-review' },
        { id: 'remote-reiki', title: 'Дистанционная Reiki-поддержка', detail: 'Выбор мастера; заявка требует подтверждения.', path: '/services/remote-energy-support' },
      ],
      love: [
        { id: 'written-review', title: 'Бесплатный письменный разбор', detail: 'Короткая анкета и рисунок ситуации.', path: '/services/free-situation-review' },
        { id: 'imagery', title: 'Образная терапия', detail: 'Исследование ситуации через образы.', path: '/services/imagery-therapy' },
      ],
      business: [
        { id: 'written-review', title: 'Бесплатный бизнес-разбор', detail: 'Вопрос и рисунок — письменный ответ.', path: '/services/free-situation-review?topic=business' },
        { id: 'mentoring', title: 'Долгосрочный коучинг целей', detail: 'Формат и стоимость согласуются лично.', path: '/services/business-consulting?businessFormat=mentoring#business-direct-request' },
      ],
    },
  },
  es: {
    label: 'Otras formas de empezar',
    choices: {
      energy: [
        { id: 'written-review', title: 'Revisión escrita gratuita', detail: 'Formulario breve y respuesta personal.', path: '/services/free-situation-review' },
        { id: 'remote-reiki', title: 'Apoyo Reiki a distancia', detail: 'Elige profesional; solicitud por confirmar.', path: '/services/remote-energy-support' },
      ],
      love: [
        { id: 'written-review', title: 'Revisión escrita gratuita', detail: 'Comparte un formulario breve y un dibujo.', path: '/services/free-situation-review' },
        { id: 'imagery', title: 'Terapia con imágenes guiadas', detail: 'Explora tu situación mediante imágenes.', path: '/services/imagery-therapy' },
      ],
      business: [
        { id: 'written-review', title: 'Revisión empresarial gratuita', detail: 'Pregunta y dibujo, con respuesta por escrito.', path: '/services/free-situation-review?topic=business' },
        { id: 'mentoring', title: 'Mentoría continua de objetivos', detail: 'Consulta modalidad y tarifas antes de decidir.', path: '/services/business-consulting?businessFormat=mentoring#business-direct-request' },
      ],
    },
  },
}

export function DirectionExtras({ locale, direction }: { locale: PublicLocale; direction: Direction }) {
  const { label, choices } = extras[locale]
  return <details className={styles.disclosure} data-direction-more data-direction-extra-for={direction}
    data-business-existing-finder={direction === 'business' ? '' : undefined}>
    <summary>{label}<ChevronDown size={16} aria-hidden="true" /></summary>
    <div className={styles.extraGrid}>
      {choices[direction].map(item =>
        <Link key={item.id} href={'/' + locale + item.path} prefetch={false}
          className={styles.extraLink} data-direction-extra={item.id}>
          <span><strong>{item.title}</strong><small>{item.detail}</small></span>
          <ArrowRight size={16} aria-hidden="true"/>
        </Link>
      )}
    </div>
    {direction === 'business' && <>
      <BusinessConsultationFinder locale={locale} requestOnServicePage />
      <BusinessServiceBrowser locale={locale} requestOnServicePage />
    </>}
  </details>
}
