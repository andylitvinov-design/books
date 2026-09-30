import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PublicSiteHeader } from '@/components/public-site-header';
import { PersonalConsultationForm } from '@/components/personal-consultation-form';
import { SiteVideoPlayer } from '@/components/site-video-player';
import { aboutEs, aboutIntroEs } from '@/data/about-es';
import { metadataBaseFor } from '@/data/site-metadata';
import { existingAboutIntroVideo } from '@/lib/site-videos/defaults';
import { getPublishedSiteVideos } from '@/lib/site-videos/public';

export const metadata: Metadata = {
  metadataBase: metadataBaseFor(), title: aboutEs.meta.title, description: aboutEs.meta.description,
  alternates: { canonical: '/es/about', languages: { en: '/en/about', ru: '/ru/about', es: '/es/about', 'x-default': '/en/about' } },
};
const testimonials = [
  { id: 'm9RfDgK76PU', title: 'Anton Korchinsky — testimonio sobre nuestro trabajo' },
  { id: '5oj0BIbLT4w', title: 'Elena Bakhtina — testimonio de una clienta' },
  { id: 'MIVLm1GUTtM', title: 'Yuri Goncharenko — testimonio de un cliente' },
];
const archiveImage = 'https://psimaster.net/sites/default/files/styles/medium/public/article/' + encodeURIComponent('андрей-литвинов-рейки-иггдрасиль-ассгард-николай-журавлев');
const archives = [
  { title: 'Testimonios sobre sesiones de imaginación guiada', description: 'Archivo de testimonios sobre consultas personales y trabajo con imágenes interiores.', href: 'https://psimaster.net/node/786', image: archiveImage + '.jpg?itok=8hSPbZ15' },
  { title: 'Testimonios y materiales de la escuela', description: 'Archivo de testimonios, ensayos de participantes y materiales del antiguo centro PsiMaster.', href: 'https://psimaster.net/node/789', image: archiveImage + '_0.jpg?itok=chWp4-7g' },
];
const explore = [ { label: 'Libros', href: '/es/books' }, { label: 'Remedios', href: '/es/homeopathy' }, { label: 'Servicios', href: '/es/services' } ];
export default async function SpanishAboutPage() {
  const published = await getPublishedSiteVideos();
  const englishIntro = published['about-intro:en'];
  // Display translation only. Keep original audio and respect hide/replacement.
  const intro = englishIntro?.heygenId === existingAboutIntroVideo.heygenId ? { ...englishIntro, ...aboutIntroEs } : undefined;
  return <main className="about-shell" lang="es">
    <PublicSiteHeader locale="es" />
    {intro && <section className="site-video-block" data-video-slot="about-intro" data-video-locale="es" aria-label={intro.title}><SiteVideoPlayer video={intro} locale="es" textLanguage="es" minimal posterPriority /></section>}
    <section className="about-introduction" aria-labelledby="about-title"><div className="about-portrait"><Image alt={aboutEs.photoAlt} fill priority sizes="(max-width: 767px) 100vw, (max-width: 1127px) 56vw, 660px" src="/images/holistic-house/andy-about.png" /></div><div className="about-introduction-copy"><p className="about-kicker">{aboutEs.eyebrow}</p><h1 id="about-title">Andy</h1>{aboutEs.intro.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></section>
    <article className="about-biography">{aboutEs.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.items && <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>}{section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}</article>
    <section className="about-explore" aria-labelledby="about-explore-title"><p className="about-kicker">Holistic House</p><h2 id="about-explore-title">{aboutEs.explore.heading}</h2><nav aria-label={aboutEs.explore.heading}>{explore.map(link => <Link href={link.href} key={link.href}>{link.label}<span aria-hidden="true">→</span></Link>)}</nav></section>
    <section className="about-testimonials" aria-labelledby="testimonials-title"><div className="about-section-heading"><p className="homeopathy-kicker">Testimonios</p><h2 id="testimonials-title">Testimonios en vídeo</h2><p>Algunos testimonios en vídeo publicados anteriormente en mi sitio PsiMaster. El audio original está en ruso.</p></div><div className="about-video-grid">{testimonials.map(video => <SiteVideoPlayer key={video.id} video={{ youtubeId: video.id, title: video.title, language: 'ru' }} locale="es" textLanguage="es" compact />)}</div></section>
    <section className="about-review-archive" aria-labelledby="archive-title"><div className="about-section-heading"><p className="homeopathy-kicker">Fotos y testimonios escritos</p><h2 id="archive-title">Fotos y testimonios escritos</h2><p>Algunos testimonios antiguos y ensayos de participantes se conservan en el archivo de PsiMaster. Estos enlaces llevan a las publicaciones originales en ruso.</p></div><div className="about-review-grid">{archives.map(card => <a href={card.href} key={card.href} rel="noreferrer" target="_blank">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" loading="lazy" src={card.image} /><div><h3>{card.title}</h3><p>{card.description}</p><span>Abrir el archivo de PsiMaster →</span></div></a>)}</div></section>
    <section className="about-consultation" aria-labelledby="personal-consultation-title"><div className="about-consultation-copy"><p className="about-kicker">Trabajo personal</p><h2 id="personal-consultation-title">Consulta personal</h2><p>¿Te gustaría explorar tu situación de forma individual? Déjame una breve solicitud y me pondré en contacto contigo.</p></div><PersonalConsultationForm locale="es" /></section>
    <section className="about-client-cabinet" aria-labelledby="client-cabinet-title"><h2 id="client-cabinet-title">{aboutEs.cabinet.heading}</h2><p>{aboutEs.cabinet.body}</p><Link className="about-client-cabinet-login" href="/es/client">Entrar al área de clientes<span aria-hidden="true">→</span></Link><p className="about-client-cabinet-prompt">{aboutEs.cabinet.prompt}</p><a href={aboutEs.cabinet.href} rel="noreferrer" target="_blank">{aboutEs.cabinet.action}<span aria-hidden="true">→</span></a></section>
  </main>;
}
