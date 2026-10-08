import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, HeartHandshake, Flower2, Compass } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata("/es/services", "Servicios y consulta gratuita — Holistic House", "Empieza con una conversación gratuita para explorar tu situación. Psicohomeopatía, psicoterapia con imágenes, constelaciones y acompañamiento arquetípico.");

const approaches = [
  { id: "psychohomeopathy", icon: Flower2, title: "Psicohomeopatía", situation: "¿Cansancio, falta de energía, molestias físicas o síntomas psicosomáticos?", detail: "Empieza con una consulta gratuita de psicohomeopatía. Exploraremos tu situación y los recursos de apoyo, sin sustituir la atención médica.", action: "Explorar mi bienestar", href: "/es/services/free-situation-review?topic=wellbeing" },
  { id: "imagery", icon: HeartHandshake, title: "Psicoterapia con imágenes", situation: "¿Tristeza, soledad o falta de claridad sobre qué hacer después?", detail: "En las sesiones individuales trabajaremos con imágenes del inconsciente, emociones y patrones para desarrollar apoyo interior, estabilidad y claridad.", action: "Conocer las sesiones", href: "/es/services/imagery-therapy" },
  { id: "constellations", icon: Compass, title: "Constelaciones y acompañamiento arquetípico", situation: "¿Tienes objetivos, pero no sabes cómo llegar a ellos?", detail: "Exploramos las dinámicas de tu situación mediante constelaciones sistémicas e imágenes arquetípicas para descubrir nuevas perspectivas y pasos prácticos.", action: "Explorar mis objetivos", href: "/es/services/free-situation-review?topic=goal" },
] as const;

export default function SpanishServicesPage() {
 return <main className="services-shell services-shell--studio" lang="es">
  <PublicSiteHeader locale="es" />
  <section className="services-studio-hero">
    <div className="services-studio-hero-copy">
      <p className="homeopathy-kicker">Primer paso gratuito · Toronto y en línea</p>
      <h1>¿Sientes que estás estancado/a? Descubramos por dónde empezar.</h1>
      <p>Cuando falta energía, claridad o movimiento hacia una meta, empecemos por comprender qué te detiene. En una conversación individual gratuita exploraremos tu situación y un posible siguiente paso.</p>
      <Link className="services-studio-primary" href="/es/services/free-situation-review">Solicitar consulta gratuita <ArrowUpRight size={20} /></Link>
      <p>Gratis · personal · sin obligación de continuar</p>
    </div>
    <div className="services-studio-photo" aria-hidden="true"><Image src="/images/holistic-house/andy-about.png" alt="" fill priority sizes="(max-width: 767px) 100vw, 44vw" /></div>
  </section>
  <section className="services-studio-approach" aria-labelledby="directions-heading"><div><p className="homeopathy-kicker">Tres enfoques claros</p><h2 id="directions-heading">¿Qué necesitas ahora?</h2></div><p>Elige la situación que más se acerque a la tuya. No necesitas conocer de antemano los métodos de trabajo.</p></section>
  <section className="services-studio-grid services-studio-grid--three" aria-label="Tres enfoques de atención">{approaches.map(({id,icon:Icon,title,situation,detail,action,href})=><article className="services-studio-card services-studio-card--detailed" id={id} key={id}><span className="services-studio-icon" aria-hidden="true"><Icon /></span><h2>{title}</h2><p className="services-studio-card-subtitle">{situation}</p><p>{detail}</p><Link href={href}>{action}<span aria-hidden="true"> →</span></Link></article>)}</section>
  <section className="services-studio-approach"><div><p className="homeopathy-kicker">Tu primera conversación</p><h2>Cuéntame qué te ocurre</h2></div><div><p>Escribe unas líneas sobre lo que quieres cambiar. Podemos explorar juntos el punto de bloqueo, los recursos disponibles y tu próximo paso.</p><Link href="/es/services/free-situation-review">Abrir el formulario gratuito →</Link></div></section>
  <PublicConsultationCta locale="es" />
  <p className="remedy-disclaimer services-disclaimer">La psicohomeopatía y los enfoques de exploración personal no sustituyen el diagnóstico ni el tratamiento médico. Las constelaciones no garantizan resultados ni sustituyen el asesoramiento financiero o jurídico.</p>
 </main>;
}
