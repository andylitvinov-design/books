import Image from "next/image";
import Link from "next/link";
import { PublicSiteHeader } from "@/components/public-site-header";
import { ServicesAboutEntry } from "@/components/services-about-entry";
import { ServicesTestsIntro } from "@/components/services-tests-intro";
import { ServicesConversionHero } from "@/components/services-conversion-hero";
import offerStyles from "@/components/services-es-offers.module.css";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { wisePaymentsEnabled } from "@/lib/commerce/wise-payments";
import { getCommerceConfig } from "@/lib/commerce/config";
import { ServicesSolutions } from "@/components/services-solutions";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { ServiceVideoShowcase } from "@/components/service-video-showcase";
import solutionStyles from "@/components/services-solutions.module.css";
import { spanishMetadata } from "@/lib/spanish-metadata";
import { ServicesSmartDiscovery } from "@/components/services-smart-discovery";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicService } from "@/lib/practitioners/public-types";

export const metadata = spanishMetadata("/es/services", "Servicios y evaluación gratuita mediante dibujo — Holistic House", "Explora servicios personales, constelaciones, terapia con imágenes y revisión escrita gratuita de tu situación. Sesiones en Toronto o en línea.");

const approaches = [
  { id: "situation", image: "/images/holistic-house/hero-olive-incense.webp", title: "Revisión gratuita de tu situación", situation: "¿Quieres comprender mejor tu problema y tus próximos pasos?", detail: "Completa un cuestionario breve y comparte un dibujo YO / META / PROBLEMA. Puedes solicitar una reflexión personal por escrito. No es una llamada gratuita ni un diagnóstico médico.", action: "Solicitar revisión escrita gratuita", href: "/es/services/free-situation-review" },
  { id: "psychohomeopathy", image: "/images/holistic-house/distance-homeopathy.webp", title: "Psicohomeopatía", situation: "¿Cansancio, falta de energía, molestias físicas o síntomas psicosomáticos?", detail: "Puedes empezar con el formulario y un dibujo a mano para recibir un informe gratuito; las sesiones individuales de psicohomeopatía son de pago. No sustituyen la atención médica.", action: "Ver sesiones de psicohomeopatía", href: "/es/services/psychohomeopathy" },
  { id: "imagery", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp", title: "Psicoterapia con imágenes", situation: "¿Tristeza, soledad o falta de claridad sobre qué hacer después?", detail: "En las sesiones individuales trabajaremos con imágenes del inconsciente, emociones y patrones para desarrollar apoyo interior, estabilidad y claridad.", action: "Conocer las sesiones", href: "/es/services/imagery-therapy" },
  { id: "business", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", title: "Consultoría de negocios y activación de metas", situation: "¿Tu negocio tiene una meta, pero el próximo paso no está claro?", detail: "Explora un mapa simbólico de tu negocio, activa una meta concreta y crea un plan de acción de 14 días. Sin promesas financieras.", action: "Explorar consultoría empresarial", href: "/es/services/business-consulting" },
  { id: "constellations", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", title: "Constelaciones y acompañamiento arquetípico", situation: "¿Tienes objetivos, pero no sabes cómo llegar a ellos?", detail: "Exploramos las dinámicas de tu situación mediante constelaciones sistémicas e imágenes arquetípicas para descubrir nuevas perspectivas y pasos prácticos.", action: "Ver sesiones de constelaciones", href: "/es/services/systemic-constellations" },
  { id: "wu-xing", image: "/academy/reiki-yggdrasil/source/eastern-tradition.png", title: "Perfil gratuito de recursos Wu Xing", situation: "¿Quieres observar tus recursos y tu equilibrio actual?", detail: "Una exploración simbólica y gratuita sobre recursos personales mediante el modelo Dao / Wu Xing. No es un diagnóstico de salud.", action: "Explorar perfil gratuito Wu Xing", href: "/es/services/dao-health-profile" },
  { id: "alchemy", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", title: "Alquimia del Alma · sesión personal", situation: "¿Se repite una situación y quieres comprenderla de otra manera?", detail: "Sesiones personales de constelaciones e imágenes guiadas con recursos complementarios opcionales, sin prometer resultados clínicos.", action: "Conocer Alquimia del Alma", href: "/es/services/alchemy-of-soul" },
  { id: "hypnotherapy", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp", title: "Hipnoterapia con imágenes guiadas", situation: "¿Quieres explorar tus emociones y recursos a tu propio ritmo?", detail: "Trabajo individual con imágenes y diálogo para observar patrones y opciones de cambio. No sustituye la atención de salud mental.", action: "Ver el proceso de imágenes guiadas", href: "/es/services/hypnotherapy-course" },
  { id: "remote", image: "/academy/reiki-yggdrasil/source/eastern-tradition.png", title: "Apoyo energético a distancia", situation: "¿Buscas una práctica de acompañamiento energético?", detail: "Selecciona un método, profesional y horario preferido. La solicitud necesita confirmación y no sustituye la atención sanitaria.", action: "Elegir apoyo energético", href: "/es/services/remote-energy-support" },
] as const;

export default async function SpanishServicesPage() {
 let published: PublicService[] = [];
 try { published = await createPractitionerRepository(getAppConfig()).listPublicServices("es"); }
 catch { published = []; }
 const areas: Record<string,string> = {
   situation:"emotional_psychological", psychohomeopathy:"homeopathy_holistic",
   imagery:"personal_development", business:"business_money", constellations:"relationships",
   "wu-xing":"energy_spiritual", alchemy:"homeopathy_holistic", hypnotherapy:"personal_development", remote:"energy_spiritual",
 };
 const editorial = [
   ...approaches.filter(({id}) => id !== "psychohomeopathy").map(({id,image,title,situation,detail,href})=>({
     id,image,title,promise:situation,details:detail,href,areaKey:areas[id],
     label:id==="situation"?"Revisión gratuita":id==="wu-xing"?"Perfil gratuito":id==="remote"?"Apoyo a distancia":"Sesión personal",
     price:id==="situation"||id==="wu-xing"?"Gratis":id==="remote"?undefined:id==="business"||id==="constellations"||id==="imagery"||id==="psychohomeopathy"||id==="alchemy"||id==="hypnotherapy"
       ?"€50 / 30 min · €100 / 60 min":undefined,
     free:id==="situation"||id==="wu-xing",
   })),
   {id:"yggdrasil",image:"/academy/reiki-yggdrasil/source/basic-program.jpg",title:"Reiki Yggdrasil — iniciación gratuita",promise:"Meditación, Reiki y materiales para comenzar.",
     details:"Consulta los vídeos originales, los materiales de estudio y las opciones de iniciación gratuita o personal.",
     label:"Reiki · Nivel 1",price:"Gratis",free:true,
     href:"/es/academy/reiki/yggdrasil/free-initiation",areaKey:"energy_spiritual"},
   {id:"tantra",image:"/images/tantra-reiki/participant-1-poster.png",title:"Tantra Reiki — iniciación gratuita",promise:"Práctica simbólica, estudio e iniciación personal.",
     details:"Consulta el material introductorio y solicita el primer nivel gratuito o una iniciación personal.",
     label:"Tantra Reiki · Nivel 1",price:"Gratis",free:true,
     href:"/es/academy/reiki/tantra-reiki/free-initiation",areaKey:"energy_spiritual"},
 ];
 return <main className="services-shell services-shell--studio" lang="es">
  <PublicSiteHeader locale="es" showAssessmentStrip={false} />
  <ServicesSmartDiscovery locale="es" services={published} editorialOffers={editorial}
    aiAvailable={process.env.HH_MARKETPLACE_AI_ENABLED === "true"
      && Boolean(process.env.OPENROUTER_API_KEY) && Boolean(process.env.HH_MARKETPLACE_AI_MODEL)} />
  <ServicesConversionHero locale="es" />
  <ServicesTestsIntro locale="es" />
  <ServicesSolutions locale="es" />
  <ServicesAboutEntry locale="es" />

  <details className={solutionStyles.extra} id="method-videos" open>
    <summary className={solutionStyles.extraSummary}>
      <span>
        <strong>Vídeos: cómo trabajo</strong>
        <small>Vídeos originales disponibles · audio en inglés</small>
      </span>
      <span className={solutionStyles.expandSymbol} aria-hidden="true">+</span>
    </summary>
    <div className={solutionStyles.extraVideos}>
      <ServiceVideoShowcase locale="es" topic="overview" id="es-service-video-overview" />
      <ServiceVideoShowcase locale="es" topic="hypnotherapy" id="es-service-video-hypnotherapy" />
      <ServiceVideoShowcase locale="es" topic="constellations" id="es-service-video-constellations" />
    </div>
  </details>

  <PersonalTestimonials locale="es" variant="services" />

  <details className={solutionStyles.extra} id="available-services">
    <summary className={solutionStyles.extraSummary}>
      <span>
        <strong>Otros enfoques y formatos</strong>
        <small>Más opciones para explorar junto a los cinco servicios principales</small>
      </span>
      <span className={solutionStyles.expandSymbol} aria-hidden="true">+</span>
    </summary>
    <section className={offerStyles.section} id="additional-services" aria-labelledby="services-es-offers-title" data-es-services-photo-cards>
      <header className={offerStyles.heading}>
        <p>SERVICIOS · HOLISTIC HOUSE</p>
        <h2 id="services-es-offers-title">Otros servicios personales</h2>
      </header>
      <div className={offerStyles.grid}>
        {approaches.filter(({id}) => ["imagery", "constellations", "remote"].includes(id)).map(({id,image,title,situation,detail,action,href}) => (
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
  </details>

  <PublicConsultationCta locale="es" id="consultation" serviceBooking wiseEnabled={wisePaymentsEnabled()} zenEnabled={getCommerceConfig().enabled && getCommerceConfig().provider === "zen"} />
  <p className="remedy-disclaimer services-disclaimer">La psicohomeopatía y los enfoques de exploración personal no sustituyen el diagnóstico ni el tratamiento médico. Las constelaciones no garantizan resultados ni sustituyen el asesoramiento financiero o jurídico.</p>
 </main>;
}

