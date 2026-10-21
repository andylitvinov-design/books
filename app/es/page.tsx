import Image from 'next/image';
import { StaticPortrait } from '@/components/static-portrait';
import { HomeSectionCarousel } from '@/components/home-section-carousel';
import { HomeConversationGuide } from '@/components/home-conversation-guide';
import Link from 'next/link';
import { BriefcaseBusiness, Flower2, Sparkles } from 'lucide-react';
import { PersonalTestimonials } from '@/components/personal-testimonials';
import { HomeExploreSections } from '@/components/home-explore-sections';
import { PublicConsultationCta } from '@/components/public-consultation-cta';
import { PublicSiteHeader } from '@/components/public-site-header';
import { AcquisitionEventLink } from '@/components/acquisition-event-link';
import { spanishMetadata } from '@/lib/spanish-metadata';
export const metadata = spanishMetadata('/es', 'Sesiones personales en Toronto y en línea | Holistic House', 'Explora tus preguntas sobre relaciones, trabajo y decisiones con Andrey Litvinov. Sesiones personales desde €50 y revisión escrita gratuita opcional.');
const cards = [
  { icon: BriefcaseBusiness, image: '/images/holistic-house/video-posters/constellations-en-v1.webp', title: 'Constelaciones y apoyo arquetípico', text: 'Explora obstáculos y nuevas posibilidades para avanzar hacia tus objetivos.', href: '/es/services/systemic-constellations' },
  { icon: Flower2, image: '/images/holistic-house/distance-homeopathy.webp', title: 'Psicohomeopatía', text: 'Explora tu bienestar y tus recursos a través de un enfoque simbólico; las sesiones personales son de pago.', href: '/es/services/psychohomeopathy' },
  { icon: Sparkles, image: '/images/holistic-house/video-posters/hypnotherapy-en-v1.webp', title: 'Trabajo con imágenes guiadas', text: 'Comprende las emociones y patrones que se repiten; construye claridad y apoyo interior.', href: '/es/services/imagery-therapy' },
];
export default function SpanishHomePage() {
  return <main className="house-home house-home--services" lang="es">
    <PublicSiteHeader locale="es" />
    <HomeConversationGuide locale="es" />
    <HomeSectionCarousel locale="es" />
    <section className="service-home-hero" data-home-featured-intro aria-labelledby="house-title">
      <div className="service-home-hero-photo" aria-hidden="true"><StaticPortrait src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1127px) 55vw, 620px" /></div>
      <div className="service-home-hero-copy">
        <p className="service-home-kicker">Acompañamiento personal · Toronto y en línea</p>
        <h1 id="house-title"><span>¿Dudas en tus relaciones, tu trabajo o una decisión importante?</span></h1>
        <p className="service-home-intro">Explora una pregunta personal con Andrey Litvinov mediante constelaciones sistémicas y trabajo con imágenes. Sesiones en Toronto y en línea; también puedes comenzar con una revisión escrita gratuita.</p>
        <div className="service-home-actions" id="free-start">
          <AcquisitionEventLink className="service-home-button service-home-button--primary"
            href="/es/services#consultation" event="service_view"
            attributes={{ "data-hero-cta": "paid-sessions" }} prefetch={false}>
            Solicitar una consulta · desde €50<span aria-hidden="true">→</span>
          </AcquisitionEventLink>
          <AcquisitionEventLink className="service-home-button service-home-button--secondary"
            href="/es/services/free-situation-review" event="service_request_start"
            attributes={{ "data-hero-cta": "free-written-review" }} prefetch={false}>
            Solicitar revisión gratuita<span aria-hidden="true">→</span>
          </AcquisitionEventLink>
        </div>
        <AcquisitionEventLink className="service-home-selfcheck-link"
          href="/es/client/tests" event="self_check_start"
          attributes={{ "data-hero-cta": "free-tests" }} prefetch={false}>
          Hacer pruebas gratuitas<span aria-hidden="true">→</span>
        </AcquisitionEventLink>
        <p className="service-home-offer-note">La revisión gratuita es un informe escrito, no una llamada. Las consultas individuales son de pago.</p>
      </div>
    </section>
    <section className="service-home-services" aria-labelledby="service-home-services-title"><div className="service-home-section-heading"><h2 id="service-home-services-title">Tres maneras de trabajar conmigo</h2><Link href="/es/services">Ver todos los servicios<span aria-hidden="true">→</span></Link></div><div className="service-home-card-grid">{cards.map(({ icon: Icon, ...card }) => <Link className="service-home-card" href={card.href} key={card.title}><span className="service-home-card-photo" aria-hidden="true"><Image unoptimized src={card.image} alt="" fill sizes="(max-width: 640px) 100vw, 320px" loading="lazy" /></span><span className="service-home-card-symbol" aria-hidden="true"><Icon /></span><h3>{card.title}</h3><p>{card.text}</p><span className="service-home-card-action">Saber más<span aria-hidden="true">→</span></span></Link>)}</div></section>
    <HomeExploreSections locale="es" />
    <PersonalTestimonials locale="es" variant="home" />
    <section className="service-home-about" aria-labelledby="service-home-about-title"><div><p className="service-home-kicker">Sobre mí</p><h2 id="service-home-about-title">Andrey Litvinov</h2></div><div><p>Consultor, facilitador y docente. Llevo más de 20 años trabajando con grupos y prácticas de desarrollo interior, combinando constelaciones sistémicas, trabajo con imágenes, enfoques corporales y exploración arquetípica.</p><Link href="/es/about">Conoce mi trabajo<span aria-hidden="true">→</span></Link></div></section>
    <section className="service-home-library" aria-labelledby="service-home-library-title"><Image unoptimized src="/images/holistic-house/books-library.webp" alt="" fill sizes="(max-width: 767px) 100vw, 1200px" className="service-home-library-photo" /><div className="service-home-library-copy"><p className="service-home-kicker">Libro del autor</p><h2 id="service-home-library-title">El poder de la vida</h2><p className="service-home-library-intro">Mi libro sobre desarrollo interior, psicohomeopatía y un enfoque integrador del trabajo con los estados humanos.</p><Link href="/es/books">Explorar la biblioteca<span aria-hidden="true">→</span></Link></div></section>
    <PublicConsultationCta locale="es" />
    <footer className="service-home-footer"><Link className="house-wordmark" href="/es">Holistic House</Link><p>Trabajo individual, práctica consciente y un espacio para el desarrollo interior.</p><Link href="/es/services">Explorar servicios<span aria-hidden="true">→</span></Link></footer>
  </main>;
}
