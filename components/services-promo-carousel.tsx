"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Gift, LockKeyhole } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { coreServiceOffers } from "@/data/core-service-offers";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-promo-carousel.module.css";

type PromoId = "tests" | "situation" | "dao";
const promoIds: readonly PromoId[] = ["tests", "situation", "dao"];
const images: Record<PromoId, string> = {
  tests: "/images/holistic-house/books-library.webp",
  situation: "/images/holistic-house/hero-olive-incense.webp",
  dao: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
};
const sessionKey = "hh-services-promo-selection-v1";

const translations = {
  en: {
    eyebrow: "HOLISTIC HOUSE · COMPLIMENTARY OFFERS",
    heading: "Special offer",
    summary: "Three free ways to begin. No payment or commitment.",
    free: "FREE",
    previous: "Previous free offer",
    next: "Next free offer",
    current: "of",
    formTitle: "Request this free offer",
    formIntro: "Leave an email or phone number and agree to a personal reply. No marketing subscription.",
    more: "What is included?",
    note: "Submitting an enquiry is not an appointment or completed report. Andrey will confirm next steps.",
    privacy: "A private request is registered in Holistic House CRM only after your consent.",
    offers: {
      tests: {
        title: "Free wellbeing & personality tests",
        teaser: "Explore stress, personal resources and self-reflection through short tests.",
        detail: "Some tests can be started immediately. Sign in with Google if you want to save results and view progress.",
        service: "Free wellbeing and personality tests",
        request: "I would like to know how to begin the free wellbeing self-checks. I understand that these are not medical diagnoses.",
        action: "Open free tests",
      },
      situation: {
        title: "Free written situation review",
        teaser: "Tell us about your question and receive guidance on the short questionnaire and drawing.",
        detail: "The written review requires an additional questionnaire and I — goal — problem drawing; it is not a free live call.",
        service: "Free written Situation Review",
        request: "I would like to request a free written situation review. Please explain the questionnaire and I — goal — problem drawing. I understand this is not a video call.",
        action: "Read how it works",
      },
      dao: {
        title: "Free symbolic Wu Xing resource profile",
        teaser: "An author-led Daoist model to reflect on your resources and balance.",
        detail: "This symbolic self-reflection profile is not medical diagnosis or treatment.",
        service: "Free symbolic Wu Xing Resource Profile",
        request: "I would like to explore the free symbolic Wu Xing resource profile. Please explain the next step. I understand this is not a medical diagnostic test.",
        action: "View the profile",
      },
    },
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНЫЕ ПРЕДЛОЖЕНИЯ",
    heading: "Акция",
    summary: "Три бесплатные услуги, без оплаты и обязательств.",
    free: "БЕСПЛАТНО",
    previous: "Предыдущее бесплатное предложение",
    next: "Следующее бесплатное предложение",
    current: "из",
    formTitle: "Заказать бесплатно",
    formIntro: "Оставьте email или телефон и согласие на личный ответ. Без рекламной подписки.",
    more: "Что входит в услугу?",
    note: "Заявка ещё не означает запись или готовый отчёт. Андрей подтвердит следующие шаги.",
    privacy: "Запрос сохраняется в CRM только после вашего согласия.",
    offers: {
      tests: {
        title: "Бесплатные тесты самочувствия и личности",
        teaser: "Короткие тесты стресса, личных ресурсов и самонаблюдения.",
        detail: "Часть тестов доступна сразу. Для сохранения результатов и динамики можно войти через Google.",
        service: "Бесплатные тесты самочувствия и личности",
        request: "Хочу начать бесплатные тесты самонаблюдения. Подскажите, с чего лучше начать. Понимаю, что это не медицинская диагностика.",
        action: "Открыть тесты",
      },
      situation: {
        title: "Бесплатный письменный разбор ситуации",
        teaser: "Опишите ваш вопрос и узнайте, как прислать анкету и рисунок.",
        detail: "Для разбора потребуется отдельная анкета и рисунок «Я — цель — проблема». Это не бесплатная видеоконсультация.",
        service: "Бесплатный письменный разбор ситуации",
        request: "Хочу заказать бесплатный письменный разбор ситуации. Подскажите, как прислать анкету и рисунок «Я — цель — проблема». Понимаю, что это не видеозвонок.",
        action: "Как проходит разбор",
      },
      dao: {
        title: "Бесплатный символический профиль У-Син",
        teaser: "Авторская модель Дао для самопознания и исследования ресурсов.",
        detail: "Символическая модель самоисследования не является медицинской диагностикой или лечением.",
        service: "Бесплатный символический профиль ресурсов У-Син",
        request: "Хочу заказать бесплатный символический профиль ресурсов У-Син. Подскажите дальнейший шаг. Понимаю, что это не медицинский диагноз.",
        action: "Открыть описание",
      },
    },
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · OFERTAS GRATUITAS",
    heading: "Promoción",
    summary: "Tres opciones gratuitas para empezar, sin pago ni compromiso.",
    free: "GRATIS",
    previous: "Oferta gratuita anterior",
    next: "Siguiente oferta gratuita",
    current: "de",
    formTitle: "Solicitar gratis",
    formIntro: "Deja tu correo o teléfono y acepta una respuesta personal. Sin suscripción publicitaria.",
    more: "¿Qué incluye?",
    note: "Una solicitud no es una cita confirmada ni un informe finalizado. Andrey confirmará los siguientes pasos.",
    privacy: "El contacto solo se registra en el CRM después de tu consentimiento.",
    offers: {
      tests: {
        title: "Pruebas gratuitas de bienestar y personalidad",
        teaser: "Cuestionarios breves para reflexionar sobre estrés y recursos personales.",
        detail: "Puedes empezar algunos cuestionarios ya. Google permite guardar resultados y seguir tu evolución.",
        service: "Pruebas gratuitas de bienestar y personalidad",
        request: "Me gustaría comenzar las pruebas gratuitas de bienestar. Entiendo que no son diagnósticos médicos.",
        action: "Abrir cuestionarios",
      },
      situation: {
        title: "Revisión gratuita por escrito",
        teaser: "Comparte tu pregunta y recibe instrucciones para el formulario y dibujo.",
        detail: "Para recibir la revisión necesitas completar el formulario y dibujo YO — META — PROBLEMA. No es una videollamada gratuita.",
        service: "Revisión escrita gratuita de la situación",
        request: "Quisiera solicitar una revisión escrita gratuita. Explícame cómo enviar el cuestionario y dibujo YO — META — PROBLEMA. Entiendo que no es una videollamada.",
        action: "Cómo funciona",
      },
      dao: {
        title: "Perfil simbólico gratuito Wu Xing",
        teaser: "Un modelo taoísta de reflexión sobre recursos y equilibrio.",
        detail: "Este perfil simbólico no es un diagnóstico ni tratamiento médico.",
        service: "Perfil simbólico gratuito de recursos Wu Xing",
        request: "Quisiera solicitar el perfil simbólico gratuito Wu Xing. Explícame el siguiente paso. Entiendo que no es un diagnóstico médico.",
        action: "Ver el perfil",
      },
    },
  },
} as const;

export function ServicesPromoCarousel({ locale }: { locale: PublicLocale }) {
  const t = translations[locale];
  const [active, setActive] = useState<PromoId>("tests");

  // Keep only the public offer key across Google's same-tab OAuth return.
  // Never persist a name, email, test answer, health detail, or token here.
  useEffect(() => {
    try {
      const previous = window.sessionStorage.getItem(sessionKey);
      if (previous && promoIds.some(id => id === previous)) setActive(previous as PromoId);
    } catch { /* Restricted storage leaves the first offer usable. */ }
  }, []);

  function choose(next: PromoId) {
    setActive(next);
    try { window.sessionStorage.setItem(sessionKey, next); }
    catch { /* The carousel works even with blocked storage. */ }
  }

  function shift(offset: number) {
    const index = promoIds.indexOf(active);
    choose(promoIds[(index + offset + promoIds.length) % promoIds.length]);
  }

  const offer = t.offers[active];
  const core = coreServiceOffers(locale);
  const href = active === "tests"
    ? "/" + locale + "/tests"
    : core.find(item => item.id === active)!.href;
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: offer.service,
    request: offer.request,
    option: "Free · no payment",
    pagePath: "/" + locale + "/services",
  });

  return (
    <section className={styles.section} id="services-promo" aria-label={t.heading}
      data-services-promo data-services-promo-active={active} lang={locale}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}><Gift size={16} aria-hidden="true" />{t.eyebrow}</p>
          <div className={styles.headingRow}><h2>{t.heading}</h2><span>{t.summary}</span></div>
        </div>
        <div className={styles.nav} role="group" aria-label={t.heading}>
          <span aria-live="polite" className={styles.counter}>{promoIds.indexOf(active) + 1} {t.current} {promoIds.length}</span>
          <button type="button" onClick={() => shift(-1)} aria-label={t.previous} data-services-promo-prev>
            <ChevronLeft size={21} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label={t.next} data-services-promo-next>
            <ChevronRight size={21} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles.card} role="region" aria-roledescription="carousel"
        aria-label={t.heading + ": " + offer.title}>
        <div className={styles.media} data-services-promo-slide={active}>
          <Image key={images[active]} src={images[active]} fill
            unoptimized priority={active === "tests"}
            sizes="(max-width: 760px) 100vw, 550px"
            alt="" className={styles.image} />
          <div className={styles.mediaOverlay}>
            <span className={styles.free}>{t.free}</span>
            <h3>{offer.title}</h3>
            <p>{offer.teaser}</p>
            <Link href={href} prefetch={false} className={styles.detailLink}
              data-services-promo-details={active}>{t.offers[active].action}<ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className={styles.formColumn} data-services-promo-form={active}>
          <h4>{t.formTitle}</h4>
          <p className={styles.formIntro}>{t.formIntro}</p>
          <ContactChannelChooser key={active} locale={locale} whatsappUrl={whatsappUrl}
            presentation="inline" event="service_request_start"
            attributes={{ "data-services-promo-order": active }} />
          <details className={styles.details}>
            <summary>{t.more}</summary>
            <p>{offer.detail}</p>
          </details>
          <p className={styles.formNote}><LockKeyhole size={14} aria-hidden="true" />{t.privacy}</p>
        </div>
      </div>
      <p className={styles.sectionNote}>{t.note}</p>
      <div className={styles.dots} role="group" aria-label={t.heading}>
        {promoIds.map(id => (
          <button type="button" key={id} aria-label={t.offers[id].title}
            aria-current={id === active ? "true" : undefined}
            data-services-promo-dot={id} className={id === active ? styles.dotActive : styles.dot}
            onClick={() => choose(id)} />
        ))}
      </div>
    </section>
  );
}
