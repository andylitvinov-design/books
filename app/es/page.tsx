import Image from 'next/image';
import { StaticPortrait } from '@/components/static-portrait';
import Link from 'next/link';
import { BriefcaseBusiness, Flower2, Sparkles } from 'lucide-react';
import { PublicConsultationCta } from '@/components/public-consultation-cta';
import { PublicSiteHeader } from '@/components/public-site-header';
import { spanishMetadata } from '@/lib/spanish-metadata';
export const metadata = spanishMetadata('/es', 'Holistic House — autoevaluaciones gratuitas y acompañamiento personal', 'Empieza con una revisión escrita de tu situación, una guía simbólica Wu Xing o pruebas de autoobservación. Sesiones personales opcionales en Toronto y en línea.');
const cards = [
  { icon: BriefcaseBusiness, image: '/images/holistic-house/video-posters/constellations-en-v1.webp', title: 'Constelaciones y apoyo arquetípico', text: 'Explora obstáculos y nuevas posibilidades para avanzar hacia tus objetivos.', href: '/es/services/systemic-constellations' },
  { icon: Flower2, image: '/images/holistic-house/distance-homeopathy.webp', title: 'Psicohomeopatía', text: 'Explora tu bienestar y tus recursos a través de un enfoque simbólico; las sesiones personales son de pago.', href: '/es/services/psychohomeopathy' },
  { icon: Sparkles, image: '/images/holistic-house/video-posters/hypnotherapy-en-v1.webp', title: 'Psicoterapia con imágenes', text: 'Comprende las emociones y patrones que se repiten; construye claridad y apoyo interior.', href: '/es/services/imagery-therapy' },
];
export default function SpanishHomePage() {
  return <main className="house-home house-home--services" lang="es">
    <PublicSiteHeader locale="es" />
    <section className="service-home-hero" aria-labelledby="house-title">
      <div className="service-home-hero-photo" aria-hidden="true"><StaticPortrait src="/images/holistic-house/andy-about.png" alt="" fill priority sizes="(max-width: 767px) 100vw, (max-width: 1127px) 55vw, 620px" /></div>
      <div className="service-home-hero-copy"><p className="service-home-kicker">Un espacio amable para</p><h1 id="house-title"><span>La recuperación</span>{' '}<span>y el desarrollo interior</span></h1><p className="service-home-intro">Tres maneras gratuitas de empezar: una revisión escrita de tu situación, una guía de recursos Wu Xing y pruebas de autoobservación. Las sesiones personales son opcionales.</p><div className="service-home-actions"><Link className="service-home-button service-home-button--primary" href="#home-consultation">Empezar gratis<span aria-hidden="true">→</span></Link><Link className="service-home-button service-home-button--consultation" href="/es/services">Pedir una sesión personal<span aria-hidden="true">→</span></Link></div></div>
    </section>
    <section className="service-home-progress" id="home-consultation" aria-labelledby="es-home-free-title">
      <p className="service-home-kicker">Tres opciones gratuitas</p>
      <h2 id="es-home-free-title">Elige cómo quieres empezar</h2>
      <ol className="service-home-progress__steps">
        <li><span aria-hidden="true">01</span><strong>Revisión escrita de tu situación</strong><p>Completa un formulario y envía un dibujo a mano. Recibirás una reflexión personal por escrito, no una llamada gratis.</p><Link href="/es/services/free-situation-review">Solicitar revisión escrita →</Link></li>
        <li><span aria-hidden="true">02</span><strong>Explorar los recursos Wu Xing</strong><p>Conoce el modelo simbólico de los Cinco Elementos. No es un diagnóstico médico.</p><Link href="/es/wu-xing">Explorar la guía Wu Xing →</Link></li>
        <li><span aria-hidden="true">03</span><strong>Pruebas de autoobservación</strong><p>Explora cuestionarios gratuitos. Las preguntas y los resultados están disponibles actualmente en inglés o ruso.</p><Link href="/es/client">Explorar las pruebas →</Link></li>
      </ol>
      <div className="service-home-progress__booking"><div><h3>¿Prefieres hablar personalmente?</h3><p>Consulta exprés: 30 minutos por €50. Sesión completa: 60 minutos por €100. El horario se confirma personalmente.</p></div><Link href="/es/services">Ver opciones de sesión →</Link></div>
    </section>
    <details className="service-home-more" id="home-more">
      <summary><span><strong>Más enfoques y recursos</strong><small>Constelaciones, trabajo con imágenes, libros y formación</small></span><span aria-hidden="true">+</span></summary>
      <div className="service-home-more__content">
    <section className="service-home-services" aria-labelledby="service-home-services-title"><div className="service-home-section-heading"><h2 id="service-home-services-title">Tres maneras de trabajar conmigo</h2><Link href="/es/services">Ver todos los servicios<span aria-hidden="true">→</span></Link></div><div className="service-home-card-grid">{cards.map(({ icon: Icon, ...card }) => <Link className="service-home-card" href={card.href} key={card.title}><span className="service-home-card-photo" aria-hidden="true"><Image unoptimized src={card.image} alt="" fill sizes="(max-width: 640px) 100vw, 320px" loading="lazy" /></span><span className="service-home-card-symbol" aria-hidden="true"><Icon /></span><h3>{card.title}</h3><p>{card.text}</p><span className="service-home-card-action">Saber más<span aria-hidden="true">→</span></span></Link>)}</div></section>
    <section className="service-home-about" aria-labelledby="service-home-about-title"><div><p className="service-home-kicker">Sobre mí</p><h2 id="service-home-about-title">Andrii Litvinov</h2></div><div><p>Consultor, facilitador y docente. Llevo más de 20 años trabajando con grupos y prácticas de desarrollo interior, combinando constelaciones sistémicas, trabajo con imágenes, enfoques corporales y exploración arquetípica.</p><Link href="/es/about">Conoce mi trabajo<span aria-hidden="true">→</span></Link></div></section>
    <section className="service-home-library" aria-labelledby="service-home-library-title"><Image unoptimized src="/images/holistic-house/books-library.webp" alt="" fill sizes="(max-width: 767px) 100vw, 1200px" className="service-home-library-photo" /><div className="service-home-library-copy"><p className="service-home-kicker">Libro del autor</p><h2 id="service-home-library-title">El poder de la vida</h2><p className="service-home-library-intro">Mi libro sobre desarrollo interior, psicohomeopatía y un enfoque integrador del trabajo con los estados humanos.</p><Link href="/es/books">Explorar la biblioteca<span aria-hidden="true">→</span></Link></div></section>
      </div>
    </details>
    <PublicConsultationCta locale="es" />
    <footer className="service-home-footer"><Link className="house-wordmark" href="/es">Holistic House</Link><p>Trabajo individual, práctica consciente y un espacio para el desarrollo interior.</p><Link href="/es/services">Explorar servicios<span aria-hidden="true">→</span></Link></footer>
  </main>;
}
