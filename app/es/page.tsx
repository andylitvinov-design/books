import Image from 'next/image';
import Link from 'next/link';
import { BriefcaseBusiness, Flower2, Sparkles } from 'lucide-react';
import { PublicConsultationCta } from '@/components/public-consultation-cta';
import { PublicSiteHeader } from '@/components/public-site-header';
import { spanishMetadata } from '@/lib/spanish-metadata';
export const metadata = spanishMetadata('/es', 'Holistic House — desarrollo interior, práctica y trabajo personal', 'Sesiones individuales, programas y talleres, una biblioteca de remedios, libros y materiales del autor.');
const cards = [
  { icon: BriefcaseBusiness, title: 'Constelaciones y apoyo arquetípico', text: 'Explora obstáculos y nuevas posibilidades para avanzar hacia tus objetivos.', href: '/es/services#constellations' },
  { icon: Flower2, title: 'Psicohomeopatía', text: 'Explora tu bienestar, tus síntomas y tus recursos personales con una conversación gratuita.', href: '/es/services#psychohomeopathy' },
  { icon: Sparkles, title: 'Psicoterapia con imágenes', text: 'Comprende las emociones y patrones que se repiten; construye claridad y apoyo interior.', href: '/es/services#imagery' },
];
export default function SpanishHomePage() {
  return <main className="house-home house-home--services" lang="es">
    <PublicSiteHeader locale="es" />
    <section className="service-home-hero" aria-labelledby="house-title">
      <div className="service-home-hero-photo" aria-hidden="true"><Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill priority sizes="(max-width: 767px) 100vw, (max-width: 1127px) 55vw, 620px" /></div>
      <div className="service-home-hero-copy"><p className="service-home-kicker">Un espacio amable para</p><h1 id="house-title"><span>La recuperación</span>{' '}<span>y el desarrollo interior</span></h1><p className="service-home-intro">Psicohomeopatía, psicoterapia con imágenes y constelaciones: tres caminos para recuperar recursos, fortalecer tu apoyo interior y avanzar hacia tus objetivos.</p><div className="service-home-actions"><Link className="service-home-button service-home-button--primary" href="/es/services/free-situation-review">Consulta inicial gratuita<span aria-hidden="true">→</span></Link><Link className="service-home-button service-home-button--secondary" href="/es/services">Explorar servicios</Link></div></div>
    </section>
    <section className="service-home-services" aria-labelledby="service-home-services-title"><div className="service-home-section-heading"><h2 id="service-home-services-title">Tres maneras de trabajar conmigo</h2><Link href="/es/services">Ver todos los servicios<span aria-hidden="true">→</span></Link></div><div className="service-home-card-grid">{cards.map(({ icon: Icon, ...card }) => <Link className="service-home-card" href={card.href} key={card.title}><span className="service-home-card-symbol" aria-hidden="true"><Icon /></span><h3>{card.title}</h3><p>{card.text}</p><span className="service-home-card-action">Saber más<span aria-hidden="true">→</span></span></Link>)}</div></section>
    <section className="service-home-about" aria-labelledby="service-home-about-title"><div><p className="service-home-kicker">Sobre mí</p><h2 id="service-home-about-title">Andrii Litvinov</h2></div><div><p>Consultor, facilitador y docente. Llevo más de 20 años trabajando con grupos y prácticas de desarrollo interior, combinando constelaciones sistémicas, trabajo con imágenes, enfoques corporales y exploración arquetípica.</p><Link href="/es/about">Conoce mi trabajo<span aria-hidden="true">→</span></Link></div></section>
    <section className="service-home-library" aria-labelledby="service-home-library-title"><Image src="/images/holistic-house/books-library.webp" alt="" fill sizes="(max-width: 767px) 100vw, 1200px" className="service-home-library-photo" /><div className="service-home-library-copy"><p className="service-home-kicker">Libro del autor</p><h2 id="service-home-library-title">El poder de la vida</h2><p className="service-home-library-intro">Mi libro sobre desarrollo interior, psicohomeopatía y un enfoque integrador del trabajo con los estados humanos.</p><Link href="/es/books">Explorar la biblioteca<span aria-hidden="true">→</span></Link></div></section>
    <PublicConsultationCta locale="es" />
    <footer className="service-home-footer"><Link className="house-wordmark" href="/es">Holistic House</Link><p>Trabajo individual, práctica consciente y un espacio para el desarrollo interior.</p><Link href="/es/services">Explorar servicios<span aria-hidden="true">→</span></Link></footer>
  </main>;
}
