import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, ShieldCheck } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { StaticPortrait } from "@/components/static-portrait";
import { metadataBaseFor } from "@/data/site-metadata";
import { publicLocales, type PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./free-consultation.module.css";

type Props = { params: Promise<{ locale: string }> };
type OfferId = "situation" | "wu" | "tests";
type FreeOffer = { id: OfferId; label: string; title: string; description: string; result: string; action: string };

const media: Record<OfferId, string> = {
  situation: "/images/holistic-house/hero-olive-incense.webp",
  wu: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
  tests: "/images/holistic-house/report-lighthouse-coast.webp",
};

const copy: Record<PublicLocale, {
  title: string; description: string; eyebrow: string; heading: string; lead: string;
  threeWays: string; offers: FreeOffer[];
  introLabel: string; introTitle: string; introText: string; introAction: string;
  introService: string; introRequest: string; safety: string; back: string;
}> = {
  en: {
    title: "Free consultation options with Andrey Litvinov | Holistic House",
    description: "One place to explore free personal written reviews, a Wu Xing resource profile, stress and personality tests, or request an introductory conversation.",
    eyebrow: "HOLISTIC HOUSE · FREE FIRST STEPS",
    heading: "Find the right free starting point.",
    lead: "You can begin without booking a paid session. Choose personal written feedback, self-assessment or ask whether a brief introduction is available.",
    threeWays: "Three free ways to explore your situation",
    offers: [
      { id: "situation", label: "01 · Personal written review", title: "Free situation review",
        description: "Describe your question and draw ME — GOAL — PROBLEM. Andrey reviews the drawing as a symbolic mini-constellation and replies in writing.",
        result: "Best for relationships, business decisions and life questions", action: "Request my free written review" },
      { id: "wu", label: "02 · Symbolic resource profile", title: "Free Wu Xing resource assessment",
        description: "Explore strengths, balance and wellbeing through Andrey's reflective Five Elements framework. Ask for a personal written resource overview.",
        result: "Best for reflecting on energy and personal resources", action: "Explore the free Wu Xing profile" },
      { id: "tests", label: "03 · Independent self-checks", title: "Free stress and personality tests",
        description: "Complete short questionnaires, view results and explanations, and save repeat check-ins to follow your progress.",
        result: "Best for understanding your starting point in a few minutes", action: "Start the free tests" },
    ],
    introLabel: "OPTIONAL · PERSONAL INTRODUCTION",
    introTitle: "Would you prefer to speak with Andrey first?",
    introText: "You can ask whether a short free introductory conversation is available. This is an enquiry, not a confirmed appointment; full personal sessions are paid.",
    introAction: "Ask about an introductory conversation",
    introService: "Free introductory conversation — availability request",
    introRequest: "I would like to ask if a short free introductory conversation is possible. I understand this is an enquiry, not a confirmed appointment, and longer consultations are paid.",
    safety: "The written services are not free live appointments. Wu Xing is a symbolic reflection, and the tests are self-checks, not medical or mental-health diagnoses. Standard or urgent medical care should not be delayed.",
    back: "See all personal services",
  },
  ru: {
    title: "Бесплатные консультации и разборы с Андреем Литвиновым | Holistic House",
    description: "Единая страница бесплатных вариантов: письменный разбор ситуации, профиль ресурсов У-Син, тесты стресса и личности и запрос ознакомительного разговора.",
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНОЕ ЗНАКОМСТВО",
    heading: "Начните с того, что вам сейчас важно.",
    lead: "Чтобы разобраться в своём запросе, необязательно сразу записываться на платную сессию. Выберите письменный разбор, самостоятельные тесты или запросите короткое знакомство.",
    threeWays: "Три бесплатных способа разобраться в ситуации",
    offers: [
      { id: "situation", label: "01 · Личный письменный разбор", title: "Бесплатный анализ ситуации",
        description: "Опишите вопрос и нарисуйте «Я — Цель — Проблема». Андрей рассмотрит рисунок как символическую мини-расстановку и пришлёт письменные наблюдения.",
        result: "Для вопросов отношений, бизнеса и жизненных решений", action: "Заказать письменный разбор" },
      { id: "wu", label: "02 · Символический профиль ресурсов", title: "Бесплатный анализ ресурсов У-Син",
        description: "Исследуйте свои ресурсы, баланс и самочувствие через авторскую модель пяти стихий. Запросите письменный обзор личных ресурсов.",
        result: "Для размышления об энергии и внутренних возможностях", action: "Открыть бесплатный профиль У-Син" },
      { id: "tests", label: "03 · Самостоятельная оценка", title: "Тесты стресса и личности",
        description: "Пройдите короткие опросники, получите результаты с пояснениями и сохраняйте повторные измерения, чтобы видеть динамику.",
        result: "Чтобы лучше понять своё состояние за несколько минут", action: "Пройти бесплатные тесты" },
    ],
    introLabel: "ДОПОЛНИТЕЛЬНО · ЛИЧНОЕ ЗНАКОМСТВО",
    introTitle: "Хотите сначала поговорить с Андреем?",
    introText: "Можно запросить короткий бесплатный ознакомительный разговор. Это обращение, а не подтверждённая запись: возможность и время Андрей согласует лично. Полноценные сессии платные.",
    introAction: "Уточнить возможность знакомства",
    introService: "Бесплатный ознакомительный разговор — запрос доступности",
    introRequest: "Хотелось бы узнать, возможен ли короткий бесплатный ознакомительный разговор. Понимаю, что это только запрос, не подтверждённая запись, а полноценные консультации оплачиваются отдельно.",
    safety: "Письменные разборы не включают бесплатный созвон. У-Син — символическая модель; тесты предназначены для самооценки, не для медицинской или психиатрической диагностики. При необходимости обратитесь за обычной или неотложной медицинской помощью.",
    back: "Все индивидуальные услуги",
  },
  es: {
    title: "Opciones de consulta gratuita con Andrey Litvinov | Holistic House",
    description: "En un solo lugar: revisión personal escrita, perfil simbólico Wu Xing, pruebas de estrés y personalidad y solicitud de conversación introductoria.",
    eyebrow: "HOLISTIC HOUSE · PRIMEROS PASOS GRATIS",
    heading: "Empieza por lo que más te importa.",
    lead: "No necesitas reservar una sesión de pago para comenzar. Elige una revisión escrita, pruebas de autoobservación o pregunta por una breve conversación introductoria.",
    threeWays: "Tres formas gratuitas de explorar tu situación",
    offers: [
      { id: "situation", label: "01 · Revisión personal escrita", title: "Revisión gratuita de tu situación",
        description: "Describe tu pregunta y dibuja YO — META — PROBLEMA. Andrey considera el dibujo como una pequeña constelación simbólica y responde por escrito.",
        result: "Para relaciones, decisiones profesionales y cuestiones personales", action: "Solicitar mi revisión escrita" },
      { id: "wu", label: "02 · Perfil simbólico de recursos", title: "Perfil gratuito de recursos Wu Xing",
        description: "Explora tus recursos, el equilibrio y el bienestar mediante el modelo simbólico de los Cinco Elementos. Solicita una reflexión escrita.",
        result: "Para reflexionar sobre tu energía y recursos personales", action: "Conocer el perfil gratuito Wu Xing" },
      { id: "tests", label: "03 · Autoobservación", title: "Pruebas gratuitas de estrés y personalidad",
        description: "Responde cuestionarios breves, consulta resultados y explicaciones, y guarda nuevas evaluaciones para seguir tu evolución.",
        result: "Para conocer tu punto de partida en pocos minutos", action: "Empezar las pruebas gratuitas" },
    ],
    introLabel: "OPCIONAL · CONVERSACIÓN INTRODUCTORIA",
    introTitle: "¿Prefieres hablar primero con Andrey?",
    introText: "Puedes preguntar si hay disponibilidad para una breve conversación introductoria gratuita. Es una solicitud, no una reserva confirmada. Las sesiones personales completas son de pago.",
    introAction: "Consultar disponibilidad",
    introService: "Conversación introductoria gratuita — consulta de disponibilidad",
    introRequest: "Quisiera preguntar si es posible una breve conversación introductoria gratuita. Entiendo que es una solicitud y no una reserva confirmada, y que las sesiones personales completas son de pago.",
    safety: "Las revisiones escritas no incluyen una llamada gratuita. Wu Xing es una reflexión simbólica y las pruebas son de autoobservación, no diagnósticos médicos ni de salud mental. No retrases la atención médica habitual o urgente.",
    back: "Ver todos los servicios personales",
  },
};

function destination(locale: PublicLocale, id: OfferId) {
  if (id === "situation") return "/" + locale + "/services/free-situation-review#request-free-review";
  if (id === "wu") return "/" + locale + "/services/dao-health-profile";
  return "/" + locale + "/client/tests";
}

export function generateStaticParams() {
  return publicLocales.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!publicLocales.includes(locale as PublicLocale)) return { title: "Not found", robots: { index: false } };
  const t = copy[locale as PublicLocale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title, description: t.description,
    alternates: {
      canonical: "/" + locale + "/services/free-consultation",
      languages: {
        en: "/en/services/free-consultation",
        ru: "/ru/services/free-consultation",
        es: "/es/services/free-consultation",
        "x-default": "/en/services/free-consultation",
      },
    },
    openGraph: {
      type: "website", siteName: "Holistic House",
      locale: locale === "ru" ? "ru_RU" : locale === "es" ? "es_ES" : "en_CA",
      url: "/" + locale + "/services/free-consultation",
      title: t.title, description: t.description,
      images: [{ url: "/images/holistic-house/andy-about.png", alt: "Andrey Litvinov — Holistic House" }],
    },
  };
}

export default async function FreeConsultationPage({ params }: Props) {
  const { locale } = await params;
  if (!publicLocales.includes(locale as PublicLocale)) notFound();
  const lang = locale as PublicLocale;
  const t = copy[lang];
  const introductionUrl = whatsappEnquiryUrl({
    locale: lang, service: t.introService, request: t.introRequest,
    pagePath: "/" + lang + "/services/free-consultation",
  });

  return (
    <main lang={lang} className={styles.page} data-free-consultation-hub>
      <PublicSiteHeader locale={lang} />
      <div className={styles.content}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1>{t.heading}</h1>
            <p className={styles.lead}>{t.lead}</p>
            <a href="#free-options" className={styles.heroAction}>{t.threeWays}<ArrowRight size={18} aria-hidden="true" /></a>
          </div>
          <div className={styles.portrait}>
            <StaticPortrait src="/images/holistic-house/andy-about.png" alt="Andrey Litvinov" fill priority sizes="(max-width: 680px) 40vw, 360px" />
          </div>
        </header>

        <section id="free-options" className={styles.options} aria-labelledby="free-consultation-options-title">
          <h2 id="free-consultation-options-title">{t.threeWays}</h2>
          <div className={styles.offers}>
            {t.offers.map(offer => (
              <article className={styles.offer} key={offer.id} data-free-consultation-option={offer.id}>
                <div className={styles.offerPhoto}>
                  <Image src={media[offer.id]} alt="" fill sizes="(max-width: 600px) 108px, 190px" unoptimized loading="lazy" />
                </div>
                <div className={styles.offerDetails}>
                  <span className={styles.offerLabel}>{offer.label}</span>
                  <h3>{offer.title}</h3>
                  <p>{offer.description}</p>
                  <span className={styles.offerResult}><CheckCircle2 size={15} aria-hidden="true" />{offer.result}</span>
                  <Link className={styles.offerAction} href={destination(lang, offer.id)} prefetch={false}>
                    {offer.action}<ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.introduction} id="intro-request" aria-labelledby="free-introduction-title">
          <div className={styles.introductionIcon}><CalendarDays size={25} aria-hidden="true" /></div>
          <div className={styles.introductionCopy}>
            <p className={styles.eyebrow}>{t.introLabel}</p>
            <h2 id="free-introduction-title">{t.introTitle}</h2>
            <p>{t.introText}</p>
          </div>
          <a className={styles.introductionAction} href={introductionUrl}
            target="_blank" rel="noopener noreferrer" data-free-introduction-enquiry>
            {t.introAction}<ArrowRight size={18} aria-hidden="true" />
          </a>
        </section>

        <p className={styles.safety}><ShieldCheck size={19} aria-hidden="true" />{t.safety}</p>
        <Link className={styles.back} href={"/" + lang + "/services"} prefetch={false}>
          {t.back}<ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
