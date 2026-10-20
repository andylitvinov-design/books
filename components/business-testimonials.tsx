import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { SiteVideoPlayer } from '@/components/site-video-player'
import type { PublicLocale } from '@/lib/public-locales'
import styles from './business-testimonials.module.css'

// Two previously published, provenance-checked BUSINESS-specific originals per locale.
// IDs and real archived stills are shared with personal-testimonials.tsx; do not
// create anonymous prose quotes, rewrite customer statements or infer business ROI.
const videos = {
  en: [
    {id:'Dk0LBmOivQo',title:'Business Constellation — client testimonial',language:'en'},
    {id:'aUJde6A-9p0',title:'Business consulting — client testimonial',language:'en'},
  ],
  ru: [
    {id:'ttQxUHopaUM',title:'Бизнес-расстановки — отзыв клиента',language:'ru'},
    {id:'VABgpmn4ZYA',title:'Татьяна Разумовская — отзыв о бизнес-консультации',language:'ru'},
  ],
  es: [
    {id:'Dk0LBmOivQo',title:'Constelaciones empresariales — testimonio',language:'en'},
    {id:'aUJde6A-9p0',title:'Consultoría de negocios — testimonio',language:'en'},
  ]
} as const

const copy = {
  en:{eyebrow:'ORIGINAL CLIENT VIDEOS',title:'Hear from people who worked with Andrey',note:'Previously published videos about business consulting and business constellations. Watch the original voices, rather than edited or invented quotes.',language:'English audio',disclaimer:'Individual experiences are not typical or guaranteed outcomes. A completed booking is not independently verified.',more:'More client experiences'},
  ru:{eyebrow:'НАСТОЯЩИЕ ВИДЕООТЗЫВЫ',title:'Что говорят клиенты о бизнес-работе',note:'Ранее опубликованные отзывы о бизнес-консультациях и бизнес-расстановках. Подлинные записи, без придуманных цитат.',language:'Видео на русском',disclaimer:'Это личный опыт людей, а не гарантия результата. Факт прохождения консультации отдельно не подтверждён.',more:'Больше отзывов'},
  es:{eyebrow:'VÍDEOS ORIGINALES',title:'Experiencias de clientes de consultoría',note:'Vídeos publicados anteriormente sobre consultoría y constelaciones de negocios. Se conserva el audio original.',language:'Audio en inglés',disclaimer:'Son experiencias individuales, no resultados garantizados. No se verifica de forma independiente la reserva.',more:'Más experiencias'},
} as const

export function BusinessTestimonials({locale}:{locale:PublicLocale}) {
  const t=copy[locale]
  return <section className={styles.section} id="business-reviews" data-business-real-testimonials aria-labelledby="business-reviews-heading">
    <header className={styles.heading}>
      <p className={styles.eyebrow}><MessageCircle size={15} aria-hidden="true"/>{t.eyebrow}</p>
      <h2 id="business-reviews-heading">{t.title}</h2>
      <p>{t.note}</p>
    </header>
    <div className={styles.grid}>
      {videos[locale].map(item=><article className={styles.card} key={item.id} data-business-testimonial-id={item.id}>
        <div className={styles.media}>
          <SiteVideoPlayer video={{youtubeId:item.id,title:item.title,language:item.language}}
            locale={locale} compact minimal
            fallbackPoster={'/images/holistic-house/testimonial-posters/'+item.id+'.webp'}/>
        </div>
        <div className={styles.cardBody}>
          <strong>{item.title}</strong>
          <small>{t.language}</small>
        </div>
      </article>)}
    </div>
    <div className={styles.bottom}>
      <p>{t.disclaimer}</p>
      <Link prefetch={false} href={'/'+locale+'/about#testimonials-title'}>{t.more}<ArrowRight size={15} aria-hidden="true"/></Link>
    </div>
  </section>
}
