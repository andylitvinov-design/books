import Image from "next/image";
import Link from "next/link";
import { PublicSiteHeader } from "@/components/public-site-header";
import { ServicesAboutEntry } from "@/components/services-about-entry";
import { ServicesTestsIntro } from "@/components/services-tests-intro";
import { ServicesConversionHero } from "@/components/services-conversion-hero";
import offerStyles from "@/components/services-es-offers.module.css";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { spanishMetadata } from "@/lib/spanish-metadata";

export const metadata = spanishMetadata("/es/services", "Servicios y evaluación gratuita mediante dibujo — Holistic House", "Completa un formulario de coaching, dibuja YO, META y PROBLEMA a mano y recibe un informe escrito personal. Las consultas en directo son de pago. También ofrecemos consultoría empresarial con constelaciones y activación de metas.");

const approaches = [
  { id: "situation", image: "/images/holistic-house/hero-olive-incense.webp", title: "Revisión gratuita de tu situación", situation: "¿Quieres comprender mejor tu problema y tus próximos pasos?", detail: "Completa un cuestionario breve y comparte un dibujo YO / META / PROBLEMA. Puedes solicitar una reflexión personal por escrito. No es una llamada gratuita ni un diagnóstico médico.", action: "Solicitar revisión escrita gratuita", href: "/es/services/free-situation-review" },
  { id: "psychohomeopathy", image: "/images/holistic-house/distance-homeopathy.webp", title: "Psicohomeopatía", situation: "¿Cansancio, falta de energía, molestias físicas o síntomas psicosomáticos?", detail: "Puedes empezar con el formulario y un dibujo a mano para recibir un informe gratuito; las sesiones individuales de psicohomeopatía son de pago. No sustituyen la atención médica.", action: "Ver sesiones de psicohomeopatía", href: "/es/services/psychohomeopathy" },
  { id: "imagery", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp", title: "Psicoterapia con imágenes", situation: "¿Tristeza, soledad o falta de claridad sobre qué hacer después?", detail: "En las sesiones individuales trabajaremos con imágenes del inconsciente, emociones y patrones para desarrollar apoyo interior, estabilidad y claridad.", action: "Conocer las sesiones", href: "/es/services/imagery-therapy" },
  { id: "business", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", title: "Consultoría de negocios y activación de metas", situation: "¿Tu negocio tiene una meta, pero el próximo paso no está claro?", detail: "Explora un mapa simbólico de tu negocio, activa una meta concreta y crea un plan de acción de 14 días. Sin promesas financieras.", action: "Explorar consultoría empresarial", href: "/es/services/business-consulting" },
  { id: "constellations", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", title: "Constelaciones y acompañamiento arquetípico", situation: "¿Tienes objetivos, pero no sabes cómo llegar a ellos?", detail: "Exploramos las dinámicas de tu situación mediante constelaciones sistémicas e imágenes arquetípicas para descubrir nuevas perspectivas y pasos prácticos.", action: "Ver sesiones de constelaciones", href: "/es/services/systemic-constellations" },
] as const;

export default function SpanishServicesPage() {
 return <main className="services-shell services-shell--studio" lang="es">
  <PublicSiteHeader locale="es" showAssessmentStrip={false} />
  <ServicesConversionHero locale="es" />
  <ServicesTestsIntro locale="es" />
  <section className={offerStyles.section} id="solutions" aria-labelledby="services-es-offers-title" data-es-services-photo-cards>
    <header className={offerStyles.heading}>
      <p>SERVICIOS · HOLISTIC HOUSE</p>
      <h2 id="services-es-offers-title">Cómo puedo ayudarte</h2>
    </header>
    <div className={offerStyles.grid}>
      {approaches.map(({id,image,title,situation,detail,action,href}) => (
        <article className={offerStyles.card} key={id} id={id}>
          <Link className={offerStyles.photo} href={href} tabIndex={-1} aria-hidden="true">
            <Image unoptimized src={image} alt="" fill sizes="(max-width: 760px) 45vw, 230px" loading="lazy" />
          </Link>
          <div className={offerStyles.content}>
            <h3><Link href={href}>{title}</Link></h3>
            <p className={offerStyles.situation}>{situation}</p>
            <details className={offerStyles.more}>
              <summary>Más información</summary>
              <p>{detail}</p>
            </details>
            <Link className={offerStyles.action} href={href}>{action}<span aria-hidden="true">→</span></Link>
          </div>
        </article>
      ))}
    </div>
  </section>
  <ServicesAboutEntry locale="es" />
  <PublicConsultationCta locale="es" />
  <p className="remedy-disclaimer services-disclaimer">La psicohomeopatía y los enfoques de exploración personal no sustituyen el diagnóstico ni el tratamiento médico. Las constelaciones no garantizan resultados ni sustituyen el asesoramiento financiero o jurídico.</p>
 </main>;
}

