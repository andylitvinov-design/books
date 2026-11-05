import Image from 'next/image';
import { StaticPortrait } from '@/components/static-portrait';
import { HomeSectionCarousel } from '@/components/home-section-carousel';
import { HomeFeaturedWorkspace } from '@/components/home-featured-workspace';
import { FreeMobileAppBanner } from '@/components/free-mobile-app-banner';
import Link from 'next/link';
import { PersonalTestimonials } from '@/components/personal-testimonials';
import { HomeMoreDisclosure } from '@/components/home-more-disclosure';
import { PublicConsultationCta } from '@/components/public-consultation-cta';
import { PublicSiteHeader } from '@/components/public-site-header';
import { spanishMetadata } from '@/lib/spanish-metadata';
export const metadata = spanishMetadata('/es', 'Sesiones personales en Toronto y en línea | Holistic House', 'Explora tus preguntas sobre relaciones, trabajo y decisiones con Andrey Litvinov. Sesiones personales desde €50 y revisión escrita gratuita opcional.');
export default function SpanishHomePage() {
  return <main className="house-home house-home--services" lang="es">
    <PublicSiteHeader locale="es" />
    <HomeSectionCarousel locale="es" />
    <HomeMoreDisclosure locale="es" />
    <HomeFeaturedWorkspace locale="es" />
    <FreeMobileAppBanner locale="es" />
    <PersonalTestimonials locale="es" variant="home" />
    <section className="service-home-about" aria-labelledby="service-home-about-title">
      <div className="service-home-about__copy">
        <p className="service-home-kicker">Sobre mí</p>
        <h2 id="service-home-about-title">Andrey Litvinov</h2>
        <p>Consultor, facilitador y docente. Llevo más de 20 años trabajando con grupos y prácticas de desarrollo interior, combinando constelaciones sistémicas, trabajo con imágenes, enfoques corporales y exploración arquetípica.</p>
        <Link href="/es/about">Conoce mi trabajo<span aria-hidden="true">→</span></Link>
      </div>
      <div className="service-home-about__portrait">
        <StaticPortrait src="/images/holistic-house/andy-about.png" alt="Andrey Litvinov"
          width={900} height={720} className="service-home-about__image"
          sizes="(max-width: 767px) calc(100vw - 32px), 450px" loading="lazy" />
      </div>
    </section>
    <section className="service-home-library" aria-labelledby="service-home-library-title"><Image unoptimized src="/images/holistic-house/books-library.webp" alt="" fill sizes="(max-width: 767px) 100vw, 1200px" className="service-home-library-photo" /><div className="service-home-library-copy"><p className="service-home-kicker">Libro del autor</p><h2 id="service-home-library-title">El poder de la vida</h2><p className="service-home-library-intro">Mi libro sobre desarrollo interior, psicohomeopatía y un enfoque integrador del trabajo con los estados humanos.</p><Link href="/es/books">Explorar la biblioteca<span aria-hidden="true">→</span></Link></div></section>
    <PublicConsultationCta locale="es" />
    <footer className="service-home-footer"><Link className="house-wordmark" href="/es">Holistic House</Link><p>Trabajo individual, práctica consciente y un espacio para el desarrollo interior.</p><Link href="/es/services">Explorar servicios<span aria-hidden="true">→</span></Link></footer>
  </main>;
}
