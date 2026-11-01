import type { Metadata } from 'next';
import { StaticPortrait } from "@/components/static-portrait";
import Link from 'next/link';
import { PublicSiteHeader } from '@/components/public-site-header';
import { PublicPathwayStrip } from '@/components/public-pathway-strip';
import refreshStyles from '@/components/public-journey-refresh.module.css';
import { PersonalConsultationForm } from '@/components/personal-consultation-form';
import { PersonalTestimonials } from '@/components/personal-testimonials';
import { SiteVideoPlayer } from '@/components/site-video-player';
import { aboutEs } from '@/data/about-es';
import { metadataBaseFor } from '@/data/site-metadata';
import { getPublishedSiteVideo } from '@/lib/site-videos/public';

export const metadata: Metadata = {
  metadataBase: metadataBaseFor(), title: aboutEs.meta.title, description: aboutEs.meta.description,
  alternates: { canonical: '/es/about', languages: { en: '/en/about', ru: '/ru/about', es: '/es/about', 'x-default': '/en/about' } },
};
const explore = [ { label: 'Libros', href: '/es/books' }, { label: 'Remedios', href: '/es/homeopathy' }, { label: 'Servicios', href: '/es/services' } ];
export default async function SpanishAboutPage() {
  // An independent Spanish publication: hiding it never restores English audio.
  const intro = await getPublishedSiteVideo('about-intro:es');
  return <main className={"about-shell " + refreshStyles.page} lang="es" data-public-design-migration="wave1">
    <PublicSiteHeader locale="es" />
    {intro && <section className="site-video-block" data-video-slot="about-intro" data-video-locale="es" aria-label={intro.title}><SiteVideoPlayer video={intro} locale="es" textLanguage="es" minimal posterPriority internalOnly /></section>}
    <section className="about-introduction" aria-labelledby="about-title"><div className="about-portrait"><StaticPortrait alt={aboutEs.photoAlt} fill priority sizes="(max-width: 767px) 100vw, (max-width: 1127px) 56vw, 660px" src="/images/holistic-house/andy-about.png" /></div><div className="about-introduction-copy"><p className="about-kicker">{aboutEs.eyebrow}</p><h1 id="about-title">Andrey Litvinov</h1>{aboutEs.intro.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></section>
    <PublicPathwayStrip locale="es" />
    <article className="about-biography">{aboutEs.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.items && <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>}{section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}</article>
    <section className="about-explore" aria-labelledby="about-explore-title"><p className="about-kicker">Holistic House</p><h2 id="about-explore-title">{aboutEs.explore.heading}</h2><nav aria-label={aboutEs.explore.heading}>{explore.map(link => <Link href={link.href} key={link.href}>{link.label}<span aria-hidden="true">→</span></Link>)}</nav></section>
    <PersonalTestimonials locale="es" variant="about" />
    <section className="about-consultation" aria-labelledby="personal-consultation-title"><div className="about-consultation-copy"><p className="about-kicker">Trabajo personal</p><h2 id="personal-consultation-title">Consulta personal</h2><p>¿Te gustaría explorar tu situación de forma individual? Déjame una breve solicitud y me pondré en contacto contigo.</p></div><PersonalConsultationForm locale="es" onSiteContact /></section>
    <section className="about-client-cabinet" aria-labelledby="client-cabinet-title"><h2 id="client-cabinet-title">{aboutEs.cabinet.heading}</h2><p>{aboutEs.cabinet.body}</p><Link className="about-client-cabinet-login" href="/es/client">Entrar al área de clientes<span aria-hidden="true">→</span></Link><p className="about-client-cabinet-prompt">{aboutEs.cabinet.prompt}</p><Link href={aboutEs.cabinet.href}>{aboutEs.cabinet.action}<span aria-hidden="true">→</span></Link></section>
  </main>;
}
