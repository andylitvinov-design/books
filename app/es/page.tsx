import Image from 'next/image';
import { StaticPortrait } from '@/components/static-portrait';
import Link from 'next/link';
import { BriefcaseBusiness, ClipboardCheck, Flower2, GraduationCap, Sparkles } from 'lucide-react';
import { SiteVideoPlayer } from '@/components/site-video-player';
import { PublicConsultationCta } from '@/components/public-consultation-cta';
import { PublicSiteHeader } from '@/components/public-site-header';
import { spanishMetadata } from '@/lib/spanish-metadata';
export const metadata = spanishMetadata('/es', 'Holistic House — autoevaluaciones gratuitas y acompañamiento personal', 'Empieza con una revisión escrita de tu situación, una guía simbólica Wu Xing o pruebas de autoobservación. Sesiones personales opcionales en Toronto y en línea.');
const cards = [
  { icon: BriefcaseBusiness, image: '/images/holistic-house/video-posters/constellations-en-v1.webp', title: 'Constelaciones y apoyo arquetípico', text: 'Explora obstáculos y nuevas posibilidades para avanzar hacia tus objetivos.', href: '/es/services#constellations' },
  { icon: Flower2, image: '/images/holistic-house/distance-homeopathy.webp', title: 'Psicohomeopatía', text: 'Explora tu bienestar y tus recursos a través de un enfoque simbólico; las sesiones personales son de pago.', href: '/es/services#psychohomeopathy' },
  { icon: Sparkles, image: '/images/holistic-house/video-posters/hypnotherapy-en-v1.webp', title: 'Psicoterapia con imágenes', text: 'Comprende las emociones y patrones que se repiten; construye claridad y apoyo interior.', href: '/es/services#imagery' },
];
export default function SpanishHomePage() {
  return <main className="house-home house-home--services" lang="es">
    <PublicSiteHeader locale="es" />
    <section className="service-home-hero" aria-labelledby="house-title">
      <div className="service-home-hero-photo" aria-hidden="true"><StaticPortrait src="/images/holistic-house/andy-about.png" alt="" fill priority sizes="(max-width: 767px) 100vw, (max-width: 1127px) 55vw, 620px" /></div>
      <div className="service-home-hero-copy"><p className="service-home-kicker">Un espacio amable para</p><h1 id="house-title"><span>Autoevaluaciones gratuitas.</span>{" "}<span>Acompañamiento personal.</span></h1><p className="service-home-intro">Empieza con autoevaluaciones o una revisión escrita gratuita. Para hablar conmigo, solicita una sesión personal de pago, en Toronto o en línea.</p><div className="service-home-actions"><Link className="service-home-button service-home-button--consultation" href="/es/services#consultation">Reservar consulta<span aria-hidden="true">→</span></Link><Link className="service-home-button service-home-button--primary" href="/es/services/free-situation-review">Revisión escrita gratuita<span aria-hidden="true">→</span></Link><Link className="service-home-button service-home-button--secondary" href="/es/services">Explorar servicios<span aria-hidden="true">→</span></Link></div></div>
    </section>
    <section className="service-home-start" id="start-here" aria-labelledby="service-home-start-title" data-home-start>
      <header className="service-home-start__heading">
        <p className="service-home-kicker">Empieza gratis</p>
        <h2 id="service-home-start-title">Explora a tu propio ritmo</h2>
        <p>Autoevaluaciones, recursos, cursos y libros para conocerte mejor. Las sesiones individuales son opcionales y de pago.</p>
      </header>
      <div className="service-home-start__grid">
        <Link className="service-home-start-card" href="/es/client/tests">
          <span className="service-home-start-card__icon" aria-hidden="true"><ClipboardCheck /></span>
          <span className="service-home-start-card__eyebrow">1 · Pruebas gratuitas</span>
          <h3>Estado emocional y recursos personales</h3>
          <p>Observa el estrés, el bienestar y tus recursos. Guarda tus resultados para comparar tus cambios.</p>
          <strong>Empezar las pruebas<span aria-hidden="true">→</span></strong>
        </Link>
        <article className="service-home-start-card service-home-start-card--learning">
          <span className="service-home-start-card__icon" aria-hidden="true"><GraduationCap /></span>
          <span className="service-home-start-card__eyebrow">2 · Aprende y explora</span>
          <h3>Cursos y biblioteca</h3>
          <p>Materiales educativos, guías y prácticas para estudiar a tu propio ritmo.</p>
          <div className="service-home-start-card__actions">
            <Link href="/es/academy">Academia <span aria-hidden="true">→</span></Link>
            <Link href="/es/library">Biblioteca <span aria-hidden="true">→</span></Link>
          </div>
        </article>
      </div>
      <p className="service-home-start__returning">¿Ya tienes resultados? <Link href="/es/client">Abrir mi área personal →</Link></p>
    </section>
    <section className="service-home-services" aria-labelledby="service-home-services-title"><div className="service-home-section-heading"><h2 id="service-home-services-title">Tres maneras de trabajar conmigo</h2><Link href="/es/services">Ver todos los servicios<span aria-hidden="true">→</span></Link></div><div className="service-home-card-grid">{cards.map(({ icon: Icon, ...card }) => <Link className="service-home-card" href={card.href} key={card.title}><span className="service-home-card-photo" aria-hidden="true"><Image unoptimized src={card.image} alt="" fill sizes="(max-width: 640px) 100vw, 320px" loading="lazy" /></span><span className="service-home-card-symbol" aria-hidden="true"><Icon /></span><h3>{card.title}</h3><p>{card.text}</p><span className="service-home-card-action">Saber más<span aria-hidden="true">→</span></span></Link>)}</div></section>
    <section className="about-testimonials" aria-labelledby="es-home-testimonials-title">
      <div className="about-section-heading">
        <p className="homeopathy-kicker">Experiencias compartidas</p>
        <h2 id="es-home-testimonials-title">Testimonios reales sobre el trabajo personal</h2>
        <p>Vídeos publicados anteriormente por participantes. El audio original de estos testimonios está en ruso.</p>
      </div>
      <div className="about-video-grid">
        <SiteVideoPlayer video={{ youtubeId: 'm9RfDgK76PU', title: 'Anton Korchinsky — testimonio', language: 'ru' }} locale="es" textLanguage="es" compact />
        <SiteVideoPlayer video={{ youtubeId: '5oj0BIbLT4w', title: 'Elena Bakhtina — testimonio', language: 'ru' }} locale="es" textLanguage="es" compact />
      </div>
      <Link href="/es/about">Más testimonios y detalles sobre mi trabajo →</Link>
    </section>
    <section className="service-home-about" aria-labelledby="service-home-about-title"><div><p className="service-home-kicker">Sobre mí</p><h2 id="service-home-about-title">Andrey Litvinov</h2></div><div><p>Consultor, facilitador y docente. Llevo más de 20 años trabajando con grupos y prácticas de desarrollo interior, combinando constelaciones sistémicas, trabajo con imágenes, enfoques corporales y exploración arquetípica.</p><Link href="/es/about">Conoce mi trabajo<span aria-hidden="true">→</span></Link></div></section>
    <section className="service-home-library" aria-labelledby="service-home-library-title"><Image unoptimized src="/images/holistic-house/books-library.webp" alt="" fill sizes="(max-width: 767px) 100vw, 1200px" className="service-home-library-photo" /><div className="service-home-library-copy"><p className="service-home-kicker">Libro del autor</p><h2 id="service-home-library-title">El poder de la vida</h2><p className="service-home-library-intro">Mi libro sobre desarrollo interior, psicohomeopatía y un enfoque integrador del trabajo con los estados humanos.</p><Link href="/es/books">Explorar la biblioteca<span aria-hidden="true">→</span></Link></div></section>
    <PublicConsultationCta locale="es" />
    <footer className="service-home-footer"><Link className="house-wordmark" href="/es">Holistic House</Link><p>Trabajo individual, práctica consciente y un espacio para el desarrollo interior.</p><Link href="/es/services">Explorar servicios<span aria-hidden="true">→</span></Link></footer>
  </main>;
}
