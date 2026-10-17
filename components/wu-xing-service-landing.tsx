import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PublicServiceOrderPanel } from "@/components/public-service-order-panel";
import type { PublicServiceDetail } from "@/lib/practitioners/public-types";
import styles from "./wu-xing-service-landing.module.css";

type Locale = "en" | "ru" | "es";

const copy = {
  en: {
    back: "All services",
    eyebrow: "FREE PERSONAL INTRODUCTION · WU XING",
    heading: "Discover where your inner resources can grow",
    lead: "Explore your current strengths, patterns and next questions through Wu Xing — a traditional five-element framework used here for personal reflection, not medical diagnosis.",
    badge: "Free · Personal · Online",
    order: "Order free diagnostic",
    how: "How it works",
    guide: "Explore the Wu Xing guide",
    practitioner: "With Andrey Litvinov",
    care: "No medical test. No payment. No account required.",
    chartHeading: "Five elements. A new way to reflect.",
    chartNote: "A symbolic map for noticing patterns, not a measurement of your health or personality.",
    elements: ["Water", "Wood", "Fire", "Earth", "Metal"],
    whatEyebrow: "WHAT YOU CAN EXPLORE",
    whatHeading: "A personal starting point, not another generic quiz",
    benefits: [
      { title: "Notice your resources", description: "Look at which qualities feel available to you now and which deserve more attention." },
      { title: "See patterns differently", description: "Consider your situation through five complementary symbolic perspectives." },
      { title: "Find a meaningful next question", description: "Leave with a clearer direction for further reflection, without promises or labels." },
    ],
    stepsEyebrow: "SIMPLE AND PERSONAL",
    stepsHeading: "Three steps to get started",
    steps: [
      { title: "Choose your messenger", text: "Tap Order and choose WhatsApp or Telegram. No registration or checkout." },
      { title: "Tell me what you want to explore", text: "Send a short, non-sensitive description of your goal. I'll explain what is needed for the introductory profile." },
      { title: "Explore your resource map", text: "We agree on the next step in chat. The introductory reflection is free; any additional service is optional." },
    ],
    guideTitle: "Curious about the method?",
    guideDescription: "Read the introductory guide to the symbolic Wu Xing resource stages before or after your request.",
    faqEyebrow: "BEFORE YOU START",
    faqTitle: "Questions people ask",
    faqs: [
      { q: "Is the introduction really free?", a: "Yes. The introductory Wu Xing resource exploration is offered free of charge. If other paid work is relevant, it is discussed separately and never required." },
      { q: "Is this a medical or psychological diagnosis?", a: "No. This is an author-led symbolic self-reflection approach. It is not a validated clinical test and cannot diagnose conditions or replace healthcare." },
      { q: "Do I need an account or an appointment?", a: "No account or payment is required to enquire. Start in WhatsApp or Telegram; the format and timing are clarified personally." },
    ],
    safety: "For self-exploration only. For health concerns, consult a qualified healthcare professional.",
    closing: "Start with one question. Find a clearer next step.",
  },
  ru: {
    back: "Все услуги",
    eyebrow: "БЕСПЛАТНО · ЛИЧНАЯ ДИАГНОСТИКА У-СИН",
    heading: "Узнайте, где скрыты ваши внутренние ресурсы",
    lead: "Посмотрите на свои сильные стороны, привычные реакции и возможные точки роста через У-Син — символическую модель пяти элементов для самопознания, а не медицинский диагноз.",
    badge: "Бесплатно · Лично · Онлайн",
    order: "Заказать бесплатную диагностику",
    how: "Как это работает",
    guide: "Изучить метод У-Син",
    practitioner: "С Андреем Литвиновым",
    care: "Не медицинский тест. Без оплаты и регистрации.",
    chartHeading: "Пять элементов. Новый взгляд на себя.",
    chartNote: "Символическая карта для размышления, а не измерение здоровья или личности.",
    elements: ["Вода", "Дерево", "Огонь", "Земля", "Металл"],
    whatEyebrow: "ЧТО ВЫ СМОЖЕТЕ ИССЛЕДОВАТЬ",
    whatHeading: "Личный взгляд на ресурсы вместо типового теста",
    benefits: [
      { title: "Увидеть свои опоры", description: "Заметить, какие качества сейчас доступны и что хочется укрепить." },
      { title: "По-новому понять реакции", description: "Посмотреть на ситуацию через пять взаимодополняющих символических перспектив." },
      { title: "Определить следующий вопрос", description: "Прояснить направление дальнейшего исследования без ярлыков и обещаний результата." },
    ],
    stepsEyebrow: "ПРОСТО И ЛИЧНО",
    stepsHeading: "Три шага к знакомству с У-Син",
    steps: [
      { title: "Выберите мессенджер", text: "Нажмите «Заказать» и выберите WhatsApp или Telegram. Без регистрации и оплаты." },
      { title: "Напишите о своём запросе", text: "Кратко опишите цель, не отправляя конфиденциальные сведения. Я поясню, что понадобится для вводного профиля." },
      { title: "Исследуйте свою карту ресурсов", text: "Мы согласуем следующий шаг в переписке. Вводный разбор бесплатный; любые дополнительные услуги — по желанию." },
    ],
    guideTitle: "Хотите понять подход заранее?",
    guideDescription: "Прочитайте вводную методичку по символическим ступеням ресурса У-Син.",
    faqEyebrow: "ПЕРЕД НАЧАЛОМ",
    faqTitle: "Частые вопросы",
    faqs: [
      { q: "Это действительно бесплатно?", a: "Да. Вводное исследование личных ресурсов по У-Син бесплатно. Дополнительная платная работа, если она понадобится, обсуждается отдельно и необязательна." },
      { q: "Это медицинская или психологическая диагностика?", a: "Нет. Это авторский символический подход к самопознанию, не валидированный клинический тест. Он не ставит диагнозов и не заменяет медицинскую помощь." },
      { q: "Нужна ли регистрация или запись?", a: "Чтобы обратиться, не нужны ни личный кабинет, ни оплата. Начните общение в WhatsApp или Telegram; формат и сроки согласуем лично." },
    ],
    safety: "Только для самопознания. По вопросам здоровья обращайтесь к квалифицированному специалисту.",
    closing: "Начните с одного вопроса. Найдите направление дальше.",
  },
  es: {
    back: "Todos los servicios",
    eyebrow: "INTRODUCCIÓN PERSONAL GRATUITA · WU XING",
    heading: "Descubre dónde pueden crecer tus recursos interiores",
    lead: "Explora tus fortalezas, patrones y próximos pasos mediante Wu Xing: un modelo simbólico de cinco elementos para la reflexión personal, no un diagnóstico médico.",
    badge: "Gratis · Personal · Online",
    order: "Solicitar diagnóstico gratuito",
    how: "Cómo funciona",
    guide: "Conocer el método Wu Xing",
    practitioner: "Con Andrey Litvinov",
    care: "Sin prueba médica, sin pago ni registro.",
    chartHeading: "Cinco elementos. Otra forma de observarte.",
    chartNote: "Un mapa simbólico, no una medida de tu salud o personalidad.",
    elements: ["Agua", "Madera", "Fuego", "Tierra", "Metal"],
    whatEyebrow: "QUÉ PUEDES EXPLORAR",
    whatHeading: "Un punto de partida personal, no otro test genérico",
    benefits: [
      { title: "Reconoce tus recursos", description: "Explora qué cualidades sientes disponibles y cuáles quieres fortalecer." },
      { title: "Observa tus patrones", description: "Mira tu situación desde cinco perspectivas simbólicas complementarias." },
      { title: "Encuentra una nueva pregunta", description: "Aclara una dirección para reflexionar, sin etiquetas ni promesas." },
    ],
    stepsEyebrow: "SENCILLO Y PERSONAL",
    stepsHeading: "Tres pasos para empezar",
    steps: [
      { title: "Elige dónde escribir", text: "Pulsa Solicitar y elige WhatsApp o Telegram. Sin registro ni pago." },
      { title: "Comparte una pregunta breve", text: "Describe tu objetivo sin datos sensibles. Te explicaré lo necesario para el perfil introductorio." },
      { title: "Explora tu mapa de recursos", text: "Acordamos el siguiente paso por chat. La reflexión inicial es gratis; otros servicios son opcionales." },
    ],
    guideTitle: "¿Quieres conocer el método?",
    guideDescription: "Lee la guía de introducción a las etapas simbólicas de recursos Wu Xing.",
    faqEyebrow: "ANTES DE EMPEZAR",
    faqTitle: "Preguntas frecuentes",
    faqs: [
      { q: "¿Es realmente gratuito?", a: "Sí. La introducción a los recursos Wu Xing es gratuita. Cualquier servicio adicional de pago se propone por separado y es opcional." },
      { q: "¿Es un diagnóstico médico o psicológico?", a: "No. Es un enfoque simbólico de reflexión personal, no una prueba clínica validada. No diagnostica ni sustituye la atención sanitaria." },
      { q: "¿Necesito una cuenta o cita?", a: "No necesitas cuenta ni pago para preguntar. Empieza por WhatsApp o Telegram; acordaremos personalmente el formato y el tiempo." },
    ],
    safety: "Solo para autoexploración. Para preocupaciones de salud, consulta a un profesional sanitario.",
    closing: "Empieza con una pregunta. Encuentra un próximo paso.",
  },
} as const;

export function WuXingServiceLanding({
  locale,
  value,
}: {
  locale: Locale;
  value: PublicServiceDetail;
}) {
  const t = copy[locale];
  const { service } = value;
  return (
    <main className={styles.page} lang={locale} data-wu-xing-service-landing>
      <PublicSiteHeader locale={locale} />
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label={t.back}>
          <Link href={"/" + locale + "/services"}>← {t.back}</Link>
        </nav>
        <section className={styles.hero} aria-labelledby="wu-xing-offer-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><Sparkles size={17} aria-hidden="true" /> {t.eyebrow}</p>
            <h1 id="wu-xing-offer-title">{t.heading}</h1>
            <p className={styles.lead}>{t.lead}</p>
            <p className={styles.offering}>{t.badge}</p>
            <div className={styles.heroActions}>
              <a className={styles.primary} href="#service-order">{t.order}<ArrowRight size={18} aria-hidden="true" /></a>
              <a className={styles.secondary} href="#how-it-works">{t.how}</a>
            </div>
            <p className={styles.practitioner}><Image src="/images/holistic-house/andy-about.png" alt="" width={42} height={42} unoptimized /> {t.practitioner}</p>
            <p className={styles.reassurance}><ShieldCheck size={15} aria-hidden="true" /> {t.care}</p>
          </div>
          <div className={styles.visual}>
            <div className={styles.visualTop}><span>HOLISTIC HOUSE</span><span>WU XING · 05</span></div>
            <div className={styles.mandala} role="img" aria-label={t.chartHeading}>
              <div className={styles.orbit}></div>
              <div className={styles.center}><span>五行</span><strong>WU XING</strong><small>RESOURCE MAP</small></div>
              {t.elements.map((name, index) => (
                <span key={name} className={[styles.element, styles["element" + index]].join(" ")}>
                  <span className={styles.dot}></span><span>{name}</span>
                </span>
              ))}
            </div>
            <div className={styles.visualBottom}><strong>{t.chartHeading}</strong><p>{t.chartNote}</p></div>
          </div>
        </section>

        <section className={styles.benefits} aria-labelledby="wu-xing-benefits-title">
          <p className={styles.sectionEyebrow}>{t.whatEyebrow}</p>
          <h2 id="wu-xing-benefits-title">{t.whatHeading}</h2>
          <div className={styles.benefitGrid}>
            {t.benefits.map((item, i) => (
              <article key={item.title} className={styles.benefitCard}>
                <span className={styles.benefitNumber}>0{i + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.process} id="how-it-works" aria-labelledby="wu-xing-steps-title">
          <div className={styles.processHeading}>
            <p className={styles.sectionEyebrow}>{t.stepsEyebrow}</p>
            <h2 id="wu-xing-steps-title">{t.stepsHeading}</h2>
            <p>{t.care}</p>
          </div>
          <ol className={styles.steps}>
            {t.steps.map((step, index) => (
              <li key={step.title}><span className={styles.stepNumber}>{index + 1}</span>
                <div><h3>{step.title}</h3><p>{step.text}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <aside className={styles.guide}>
          <div className={styles.guideIcon}><BookOpen size={25} aria-hidden="true" /></div>
          <div><h2>{t.guideTitle}</h2><p>{t.guideDescription}</p></div>
          <Link href={"/" + locale + "/wu-xing"}>{t.guide}<ArrowRight size={17} aria-hidden="true" /></Link>
        </aside>

        <section className={styles.faq} aria-labelledby="wu-xing-faq-title">
          <p className={styles.sectionEyebrow}>{t.faqEyebrow}</p>
          <h2 id="wu-xing-faq-title">{t.faqTitle}</h2>
          <div className={styles.faqList}>
            {t.faqs.map(({q,a})=>(
              <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>
            ))}
          </div>
        </section>

        <section className={styles.final} aria-labelledby="wu-xing-final-title">
          <div className={styles.finalIntro}><Compass size={23} aria-hidden="true" />
            <h2 id="wu-xing-final-title">{t.closing}</h2>
            <p><Check size={16} aria-hidden="true" /> {t.safety}</p>
          </div>
          <PublicServiceOrderPanel locale={locale} service={service} specialized />
        </section>
      </div>
    </main>
  );
}
