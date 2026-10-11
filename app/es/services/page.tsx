import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, HeartHandshake, Flower2, Compass } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata("/es/services", "Servicios y evaluación gratuita mediante dibujo — Holistic House", "Completa un formulario de coaching, dibuja YO, META y PROBLEMA a mano y recibe un informe escrito personal. Las consultas en directo son de pago.");

const approaches = [
  { id: "psychohomeopathy", image: "/images/holistic-house/distance-homeopathy.webp", icon: Flower2, title: "Psicohomeopatía", situation: "¿Cansancio, falta de energía, molestias físicas o síntomas psicosomáticos?", detail: "Puedes empezar con el formulario y un dibujo a mano para recibir un informe gratuito; las sesiones individuales de psicohomeopatía son de pago. No sustituyen la atención médica.", action: "Ver sesiones de psicohomeopatía", href: "/es/services/psychohomeopathy" },
  { id: "imagery", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp", icon: HeartHandshake, title: "Psicoterapia con imágenes", situation: "¿Tristeza, soledad o falta de claridad sobre qué hacer después?", detail: "En las sesiones individuales trabajaremos con imágenes del inconsciente, emociones y patrones para desarrollar apoyo interior, estabilidad y claridad.", action: "Conocer las sesiones", href: "/es/services/imagery-therapy" },
  { id: "constellations", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", icon: Compass, title: "Constelaciones y acompañamiento arquetípico", situation: "¿Tienes objetivos, pero no sabes cómo llegar a ellos?", detail: "Exploramos las dinámicas de tu situación mediante constelaciones sistémicas e imágenes arquetípicas para descubrir nuevas perspectivas y pasos prácticos.", action: "Ver sesiones de constelaciones", href: "/es/services/systemic-constellations" },
] as const;

export default function SpanishServicesPage() {
 return <main className="services-shell services-shell--studio" lang="es">
  <PublicSiteHeader locale="es" />
  <section className="services-studio-hero">
    <div className="services-studio-hero-copy">
      <p className="homeopathy-kicker">Evaluación gratuita por dibujo · informe escrito</p>
      <h1>¿Sientes que estás estancado/a? Descubramos por dónde empezar.</h1>
      <p>Completa un breve formulario de coaching y dibuja YO, MI META y MI PROBLEMA con bolígrafo en papel. Revisaré los materiales y te enviaré un informe escrito personal.</p>
      <Link className="services-studio-primary" href="/es/services/free-situation-review">Iniciar evaluación gratuita por dibujo <ArrowUpRight size={20} /></Link>
      <p>Gratis · informe escrito · sin llamada · sin compromiso</p>
    </div>
    <div className="services-studio-photo" aria-hidden="true"><Image src="/images/holistic-house/andy-about.png" alt="" fill priority sizes="(max-width: 767px) 100vw, 44vw" /></div>
  </section>
  <section className="services-studio-approach" aria-labelledby="directions-heading"><div><p className="homeopathy-kicker">Tres enfoques claros</p><h2 id="directions-heading">¿Qué necesitas ahora?</h2></div><p>Elige la situación que más se acerque a la tuya. No necesitas conocer de antemano los métodos de trabajo.</p></section>
  <section className="services-studio-grid services-studio-grid--three" aria-label="Tres enfoques de atención">{approaches.map(({id,icon:Icon,image,title,situation,detail,action,href})=><article className="services-studio-card services-studio-card--detailed" id={id} key={id}><div className="services-studio-card-photo"><Image src={image} alt="" fill sizes="(max-width: 800px) 100vw, 370px" loading="lazy" /></div><span className="services-studio-icon" aria-hidden="true"><Icon /></span><h2>{title}</h2><p className="services-studio-card-subtitle">{situation}</p><p>{detail}</p><Link href={href}>{action}<span aria-hidden="true"> →</span></Link></article>)}</section>
  <section className="services-studio-approach"><div><p className="homeopathy-kicker">Tu primera evaluación por dibujo</p><h2>Dibuja tu situación y recibe un informe</h2></div><div><p>Describe tu situación en el formulario, dibuja a mano y envía la foto. La consulta exprés de 30 minutos cuesta €50 y la sesión de 60 minutos cuesta €100.</p><Link href="/es/services/free-situation-review">Abrir el formulario gratuito →</Link></div></section>
  <PublicConsultationCta locale="es" />
  <p className="remedy-disclaimer services-disclaimer">La psicohomeopatía y los enfoques de exploración personal no sustituyen el diagnóstico ni el tratamiento médico. Las constelaciones no garantizan resultados ni sustituyen el asesoramiento financiero o jurídico.</p>
 </main>;
}
