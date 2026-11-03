import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { ServiceReviews } from "@/components/service-reviews";
import { isPublicLocale } from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicServiceDetail } from "@/lib/practitioners/public-types";
import { ServiceFunnelImpression, TrackedServiceLink, TrackedServiceExternalLink } from "@/components/service-funnel-tracking";
import PractitionerPresentationVideo from "@/components/practitioner-presentation-video";
import { publicPresentationUrl } from "@/lib/practitioners/presentation-contract";
import { getPublicServiceDetailHref } from "@/lib/practitioners/public-service-links.js";
import mediaStyles from "@/components/marketplace-service-gallery.module.css";
import styles from "@/components/marketplace-service-detail.module.css";

type PageProps={params:Promise<{locale:string;practitionerSlug:string;serviceSlug:string}>};
export const dynamic="force-dynamic";
export const revalidate=0;

async function load(locale:string,practitionerSlug:string,serviceSlug:string):Promise<PublicServiceDetail|null>{
  try{return await createPractitionerRepository(getAppConfig()).getPublicService(practitionerSlug,serviceSlug,locale) as PublicServiceDetail}
  catch{return null}
}
export async function generateMetadata({params}:PageProps):Promise<Metadata>{
  const {locale,practitionerSlug,serviceSlug}=await params;
  if(!isPublicLocale(locale))return{title:"Not found"};
  const value=await load(locale,practitionerSlug,serviceSlug);
  if(!value)return{title:"Not found",robots:{index:false,follow:false}};
  const title=value.service.copy.title+" — "+value.service.practitionerName+" | Holistic House";
  return{metadataBase:metadataBaseFor(),title,description:value.service.copy.shortDescription,alternates:{canonical:getPublicServiceDetailHref(locale,practitionerSlug,serviceSlug),languages:Object.fromEntries((value.service.displayLocales||['en','ru']).map(lang=>[lang,getPublicServiceDetailHref(lang,practitionerSlug,serviceSlug)]))},robots:{index:true,follow:true}};
}
export default async function ServiceDetail({params}:PageProps){
  const {locale,practitionerSlug,serviceSlug}=await params;
  if(!isPublicLocale(locale))notFound();
  const value=await load(locale,practitionerSlug,serviceSlug);
  if(!value)notFound();
  // Preserve moderation/404 checks, then redirect the published legacy offering.
  const canonicalHref=getPublicServiceDetailHref(locale,practitionerSlug,serviceSlug);
  if(canonicalHref!==`/${locale}/services/${practitionerSlug}/${serviceSlug}`)permanentRedirect(canonicalHref);
  const {service,practitioner}=value,ru=locale==="ru",es=locale==="es";
  const isWuXingGuide=service.slug==="free-wu-xing-diagnostic";
  const verified=practitioner.credentials.some((item)=>item.verificationStatus==="verified");
  const isFree=service.reikiOffer
    ? service.reikiOffer.variants.length>0&&service.reikiOffer.variants.every(variant=>variant.price===0)
    : service.pricingMode==="free"||(service.pricingMode!=="contact"&&service.confirmedPrice===0);
  const price=isFree?(ru?"Бесплатно":es?"Gratis":"Free"):service.pricingMode!=="contact"&&service.confirmedPrice!=null?`${service.pricingMode==="from"?(ru?"от ":es?"desde ":"from "):""}${service.currency||""} ${service.confirmedPrice}`:ru?"Стоимость согласуется до записи":es?"Precio acordado antes de reservar":"Price agreed before booking";
  const requestHref=service.slug === "remote-energy-support"
    ? `/${locale}/services/remote-energy-support?practitioner=${encodeURIComponent(practitioner.slug)}`
    : `/${es?"en":locale}/app/consultations?service=${encodeURIComponent(service.id)}`;
  const delivery=service.deliveryFormat==="hybrid"
    ? (ru?"Онлайн или лично":es?"En línea o presencial":"Online or in person")
    : service.deliveryFormat==="in_person"
      ? (ru?"Лично":es?"Presencial":"In person")
      : (ru?"Онлайн":es?"En línea":"Online");
  const bookingLabel=isFree?(ru?"Запросить бесплатно":es?"Solicitar gratis":"Request free service"):(ru?"Отправить запрос":es?"Solicitar sesión":"Request this service");
  const bookingNote=isFree
    ? ru
      ? "Бесплатная заявка. Мастер уточнит доступность и формат; отправка не подтверждает время."
      : es
        ? "Solicitud gratuita. El profesional confirmará la disponibilidad; no se requiere pago."
        : "Free request. Your practitioner confirms availability; no payment is required."
    : ru
      ? "Сначала отправьте запрос. Мастер подтвердит время и стоимость до оплаты; отправка не является бронированием."
      : es
        ? `Primero envía tu solicitud. Se confirmarán el horario y precio antes del pago.${service.slug==="remote-energy-support"?"":" El formulario de solicitud se abre en inglés."}`
        : "Send an enquiry first. Your practitioner confirms the format, time and price before any booking or payment.";
  return <main className={`services-shell services-shell--studio ${styles.page}`} lang={locale} data-marketplace-service-landing>
    <PublicSiteHeader locale={locale}/>
    <section className={`services-studio-hero ${styles.hero}`} data-service-funnel-card><ServiceFunnelImpression serviceId={service.id}/>
      <div className={`services-studio-hero-copy ${styles.heroCopy}`}>
        <p className="homeopathy-kicker">{ru?"Услуга":es?"Servicio":"Service"}</p>
        <h1>{service.copy.title}</h1>
        <p className={styles.lead}>{service.copy.shortDescription}</p>
        {(service.serviceIntroductions?.length||service.videoPresentation)&&<PractitionerPresentationVideo service locale={locale}
          video={service.videoPresentation} playbackUrl={service.videoPresentation?publicPresentationUrl(service.videoPresentation,getAppConfig().supabaseUrl):''}
          introductions={(service.serviceIntroductions||[]).map(item=>({
            ...item,playbackUrl:publicPresentationUrl(item.media,getAppConfig().supabaseUrl,item.type)||''
          }))}/>}
        <div className={styles.quickFacts} aria-label={ru?"Условия":es?"Detalles del servicio":"Service details"}>
          <strong>{price}</strong>
          {service.durationMinutes && service.durationMinutes>0 ? <span>{service.durationMinutes} min</span> : null}
          <span>{delivery}</span>
        </div>
        <div className={`hh-actions ${styles.actions}`}>
          <TrackedServiceLink serviceId={service.id} event="order" id="request-service" className={`services-studio-primary ${styles.primary}`} href={requestHref}>{bookingLabel}<span aria-hidden="true">→</span></TrackedServiceLink>
          {isWuXingGuide&&<Link href={`/${locale}/wu-xing`}>{ru?"Методичка: уровни здоровья":es?"Guía: Niveles de salud":"Guide: Levels of Health"}</Link>}
          <Link href={`/${locale}/masters/${practitioner.slug}`}>{ru?"О практике":es?"Sobre el profesional":"About practitioner"}</Link>
          <Link href="#reviews">{ru?"Отзывы":es?"Opiniones":"Reviews"} ★</Link>
        </div>
        <p className={styles.bookingNote}>{bookingNote}</p>
      </div>
    </section>
    {service.reikiOffer&&<section className={styles.reikiOffers} data-public-reiki-options
      aria-label={ru?"Опубликованные варианты Рейки":es?"Opciones Reiki publicadas":"Published Reiki options"}>
      <div>
        <h2>{ru?"Варианты Рейки и цены":es?"Opciones Reiki y precios":"Reiki options and prices"}</h2>
        <p>{ru?"Стоимость зависит от отчёта, длительности и сертификата. Условия и время подтверждает мастер до оплаты."
          :es?"El importe depende del informe, la duración y el certificado. El profesional confirma los detalles antes de cobrar."
          :"The selected report, duration and certificate determine the price. Your practitioner confirms availability before payment."}</p>
      </div>
      <div className={styles.reikiOfferGrid}>
        {service.reikiOffer.variants.map((variant,index)=><article key={index} className={styles.reikiOfferCard}>
          <strong>{service.reikiOffer!.kind==="session"
            ? ru?"Рейки-поддержка":es?"Apoyo Reiki":"Reiki support"
            : service.reikiOffer!.kind==="initiation"
              ? ru?"Инициация":es?"Iniciación":"Initiation"
              : ru?"Курс обучения":es?"Curso":"Training course"}</strong>
          <span>{variant.duration?variant.duration+" min · ":""}{
            variant.report==="brief"?(ru?"Краткий отчёт":es?"Informe breve":"Brief report"):
            variant.report==="text"?(ru?"Личный разбор текстом":es?"Informe personal escrito":"Personal written review"):
            ru?"Личный разбор голосом":es?"Informe personal por voz":"Personal voice review"
          }</span>
          {service.reikiOffer!.kind!=="session"&&<small>{variant.certificate
            ?ru?"С сертификатом (выдача подтверждается)":es?"Con certificado (pendiente de confirmación)":"With certificate (issuance to be confirmed)"
            :ru?"Без сертификата":es?"Sin certificado":"Without certificate"}</small>}
          <b>{variant.price===0?(ru?"Бесплатно":es?"Gratis":"Free"):
            new Intl.NumberFormat(locale,{style:"currency",currency:service.reikiOffer!.currency}).format(variant.price)}</b>
        </article>)}
      </div>
      <p className={styles.reikiOfferFootnote}>{ru?"Сроки, указанные мастером: ":es?"Plazos indicados por el profesional: ":"Practitioner-advertised timings: "}
        {service.reikiOffer.timings.map(value=>value==="day"?(ru?"до 24 часов":es?"24 horas":"24 hours"):
          value==="days"?(ru?"до 3 дней":es?"3 días":"3 days"):(ru?"выбранный час":es?"hora elegida":"chosen hour")).join(" · ")||
          (ru?"по договорённости":es?"a convenir":"by agreement")}.
      </p>
    </section>}
    {(service.photos||[]).length>0&&<section className={mediaStyles.gallery} aria-label={ru?"Фотографии услуги":es?"Fotos del servicio":"Service photos"}>{(service.photos||[]).map((src,i)=><img key={src} src={src} alt={service.copy.title+" — "+(i+1)} loading="lazy" />)}</section>}
    <section className={`services-studio-approach ${styles.approach}`}>
      <div><p className="homeopathy-kicker">{ru?"Практик":es?"Profesional":"Practitioner"}</p><h2>{service.practitionerName}</h2><p>{service.professionalTitle}</p>{verified&&<p className="hh-badge">{ru?"Credentials проверены":es?"Credenciales verificadas":"Credentials verified"}</p>}{practitioner.isPartner&&<p className="hh-badge">{es?"Colaborador de Holistic House":"Holistic House Partner"}</p>}</div>
      <div><p>{service.copy.description||service.copy.shortDescription}</p>
      {(service.benefits||[]).length>0&&<section><h3>{ru?'Что может дать работа':es?'Posibles beneficios':'Potential benefits'}</h3><ul>{service.benefits?.map((benefit,i)=><li key={i}>{benefit}</li>)}</ul></section>}
      {(service.faq||[]).length>0&&<details><summary>FAQ</summary><ul>{service.faq?.map((question,i)=><li key={i}>{question}</li>)}</ul></details>}
      <div className="hh-actions">{service.whatsapp&&<TrackedServiceExternalLink serviceId={service.id} event="whatsapp" href={`https://wa.me/${service.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer">WhatsApp</TrackedServiceExternalLink>}{service.telegram&&<TrackedServiceExternalLink serviceId={service.id} event="telegram" href={`https://t.me/${service.telegram.replace(/^@/,'')}`} target="_blank" rel="noopener noreferrer">Telegram</TrackedServiceExternalLink>}</div>{es&&<p className="remedy-disclaimer">La descripción facilitada por el profesional puede permanecer en inglés mientras se prepara su traducción.</p>}<p>{[service.deliveryFormat==="hybrid"?(ru?"Онлайн / очно":es?"En línea / presencial":"Online / in person"):service.deliveryFormat==="in_person"?(ru?"Очно":es?"Presencial":"In person"):"Online",service.locationLabel,service.durationMinutes?`${service.durationMinutes} min`:"",price].filter(Boolean).join(" · ")}</p><p>{(service.languages||[]).join(" · ").toUpperCase()}</p></div>
    </section>
    <div className={styles.reviews}><ServiceReviews serviceId={service.id} locale={locale} verifiedOnly={service.slug === "remote-energy-support"}/></div>
    <nav className={styles.bottomActions} aria-label={ru?"Следующий шаг":es?"Próximo paso":"Next step"}>
      <TrackedServiceLink serviceId={service.id} event="order" className={styles.bottomPrimary} href={requestHref}>{bookingLabel} →</TrackedServiceLink>
      <Link href={`/${locale}/services`}>{ru?"Другие услуги":es?"Otros servicios":"Explore other services"} →</Link>
    </nav>
    <p className="remedy-disclaimer services-disclaimer">{ru?"Информация представлена для выбора формата поддержки и не является медицинской диагностикой или гарантией результата.":es?"La información ayuda a elegir una modalidad de acompañamiento; no constituye diagnóstico médico ni garantía de resultados.":"This information is for choosing a support format and is not medical diagnosis or a guarantee of outcome."}</p>
    {practitioner.slug === "andy-litvinov" ? <PublicConsultationCta locale={locale as PublicLocale}/> : null}
  </main>
}
