import Image from "next/image";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { ServiceVideoShowcase } from "@/components/service-video-showcase";
import styles from "./core-service-detail.module.css";

export type DetailKind = "dao" | "alchemy" | "hypnotherapy";

const copy = {
  en: {
    dao: {
      eyebrow: "FREE · DAO / WU XING RESOURCE REVIEW",
      title: "Free Wu Xing Resource Profile",
      lead: "Explore how you experience your energy, balance and personal resources through the author's DAO / Wu Xing model. This is a symbolic self-reflection profile, not a diagnosis of health conditions.",
      benefit: "A fresh perspective on your present resources and which areas you may wish to explore.",
      sectionsTitle: "What this free profile explores",
      sections: [
        { title: "Your present resources", text: "Describe how you currently experience energy, strain and internal support." },
        { title: "DAO / Wu Xing perspective", text: "Explore your experience using the author's symbolic Five Elements and resource-stage framework." },
        { title: "Reflection and next questions", text: "Consider possible areas for attention without assigning a clinical score or diagnosis." },
      ],
      action: "Request my free Wu Xing profile",
      actionMessage: "Service: Free Wu Xing Resource Profile\nRequest: I would like to request the free symbolic Wu Xing resource profile. Please tell me how to start.",
      note: "The profile is free. A WhatsApp request opens with the service named; it is not sent until you choose Send.",
      safety: "The DAO model is an author's symbolic framework, not a validated medical diagnostic test. Do not use it to diagnose illness, adjust medicines or replace medical or mental-health care.",
      secondary: "Read about the DAO / Wu Xing model",
      secondaryHref: "/en/wu-xing",
      image: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
    },
    alchemy: {
      eyebrow: "PERSONAL METHOD · CONSTELLATIONS · HYPNOTHERAPY · PSYCHO-HOMEOPATHY",
      title: "Alchemy of the Soul · Psycho-homeopathy",
      lead: "When a difficult situation keeps repeating, we first map its dynamics through a systemic constellation. Then, where suitable, guided imagery hypnotherapy helps explore the inner conflict or stress response beneath it. We can also discuss individually selected homeopathic symbolism and other complementary resources, without medical treatment claims.",
      benefit: "Understand the pattern · explore the deeper mechanism · find support and a realistic next step.",
      sectionsTitle: "One integrated approach · four connected stages",
      sections: [
        { title: "01 · Situation analysis through constellations", text: "We clarify your goal and map the situation, roles, relationships and obstacles with a systemic constellation. Systemic constellations provide working hypotheses for reflection, not proof of hidden facts." },
        { title: "02 · Hypnotherapy and guided imagery", text: "With your agreement, a gentle guided-imagery or hypnotherapy exercise explores the emotional roots of a recurring reaction, a stressed inner part or unmet need. We do not treat imagery as recovered factual memories." },
        { title: "03 · Complementary homeopathic selection", text: "Within Andrey's psycho-homeopathy model we may explore an individual homeopathic remedy and its symbolic resonance with the present state. This is optional, not an evidence-based treatment or a medical prescription; no dosage is set." },
        { title: "04 · Alchemical integration and follow-up", text: "Where appropriate we draw on archetypal work, the Dao / Wu Xing resource model or contemplative energy practices. We identify practical actions and, during continued support, review what has changed." },
      ],
      action: "Enquire about Alchemy of the Soul",
      actionMessage: "Service: Alchemy of the Soul / Psycho-homeopathy\nRequest: I would like to explore a personal session combining constellation work, guided imagery hypnotherapy and, if appropriate, complementary homeopathic and Dao resource practices. Please confirm the available format and time.",
      note: "Enquiry only, not a confirmed booking. Express 30 min (€50) and full 60 min (€100) sessions; a longer support plan can be discussed separately.",
      safety: "This is an author's reflective, psychotherapeutic-style and symbolic consultation, not medical or psychiatric diagnosis or treatment. Homeopathy has no reliable evidence of effectiveness for treating health conditions. Do not stop or change prescribed medicines; seek qualified care for illness or emergencies. Outcomes cannot be guaranteed.",
      secondary: "Explore guided imagery hypnotherapy",
      secondaryHref: "/en/services/hypnotherapy-course",
      image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
      supportKicker: "CONTINUED PERSONAL SUPPORT",
      supportTitle: "A session — or a four-week process",
      supportLead: "For an issue that needs time, the author's monthly psycho-homeopathy format brings together two personal sessions and four weeks of individual check-ins: an initial situation map, an agreed plan, observation of changes and a closing review.",
      supportItems: ["Express personal review · 30 min · €50", "Full personal session · 60 min · €100", "Optional monthly programme · 2 sessions + 4 weeks of support · fee agreed individually"],
      supportFootnote: "Methods and depth are agreed together. An enquiry does not start a subscription or charge.",
    },
    hypnotherapy: {
      eyebrow: "INDIVIDUAL COURSE · GUIDED IMAGERY",
      title: "Guided Imagery Hypnotherapy",
      lead: "A course of one-to-one guided-imagery sessions for exploring unconscious images, emotional patterns and questions that are difficult to answer by thinking alone. It is personal reflective work, not training to practise hypnotherapy.",
      benefit: "Explore a steadier inner foundation and possible answers in your own imagery and experience.",
      sectionsTitle: "What we can work on",
      sections: [
        { title: "Strengthen inner resources", text: "Explore imagery connected with safety, boundaries, stability and personal support." },
        { title: "Understand repeating patterns", text: "Use gentle guided imagery and dialogue with inner parts to reflect on your responses and relationships." },
        { title: "Find your own next steps", text: "Integrate observations from the imagery work into realistic everyday choices. You can pause, ask questions or change direction during the work." },
      ],
      action: "Ask about the guided imagery course",
      actionMessage: "Service: Guided Imagery Hypnotherapy — individual course\nRequest: I would like to explore a personal course of guided imagery sessions focused on inner resources and finding answers. Please let me know the format, availability and cost.",
      note: "The number and frequency of sessions are discussed individually. No automatic booking or payment.",
      safety: "This reflective practice is not a guaranteed treatment for anxiety, depression or other health conditions and does not replace licensed mental-health, psychiatric or crisis care.",
      secondary: "Read about guided imagery",
      secondaryHref: "/en/services/imagery-therapy",
      image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
    },
  },
  es: {
    "dao": {
        "eyebrow": "GRATIS · PERFIL SIMBÓLICO DAO / WU XING",
        "title": "Perfil gratuito de recursos Wu Xing",
        "lead": "Explora cómo percibes hoy tu energía, tu equilibrio y los apoyos que tienes a mano mediante el modelo simbólico Dao / Wu Xing. No es una evaluación médica ni una prueba diagnóstica.",
        "benefit": "Una mirada más clara a tus recursos actuales y a los aspectos que deseas observar.",
        "sectionsTitle": "Qué puedes explorar en este perfil gratuito",
        "sections": [
            {
                "title": "Tus recursos actuales",
                "text": "Describe tu energía, las exigencias diarias y cómo sientes tu apoyo interior en este momento."
            },
            {
                "title": "Perspectiva Dao / Wu Xing",
                "text": "Reflexiona sobre tu experiencia mediante el modelo simbólico de los cinco elementos y las etapas de recursos del autor."
            },
            {
                "title": "Reflexión y siguientes preguntas",
                "text": "Identifica asuntos que quieras comprender mejor, sin asignar diagnósticos ni interpretar una puntuación como dato clínico."
            }
        ],
        "action": "Solicitar mi perfil gratuito Wu Xing",
        "actionMessage": "Servicio: Perfil gratuito de recursos Wu Xing\nSolicitud: Me gustaría recibir el perfil simbólico gratuito de recursos Wu Xing. ¿Podrías indicarme cómo empezar?",
        "note": "Este perfil es gratuito. WhatsApp prepara el texto de tu solicitud, pero no lo envía hasta que tú lo confirmes.",
        "safety": "El modelo Dao / Wu Xing es un marco simbólico del autor, no un instrumento diagnóstico validado. No permite diagnosticar enfermedades, modificar medicamentos ni sustituir la atención médica o de salud mental.",
        "secondary": "Conocer el modelo Dao / Wu Xing",
        "secondaryHref": "/es/wu-xing",
        "image": "/academy/reiki-yggdrasil/source/eastern-tradition.png"
    },
    "alchemy": {
        "eyebrow": "MÉTODO PERSONAL · CONSTELACIONES · IMÁGENES GUIADAS · PSICOHOMEOPATÍA",
        "title": "Alquimia del Alma · Psicohomeopatía",
        "lead": "Cuando una situación se repite, empezamos por explorar sus dinámicas mediante una constelación sistémica. Después, si resulta adecuado y tú lo deseas, utilizamos imágenes guiadas para reflexionar sobre las emociones y las respuestas al estrés. La perspectiva homeopática simbólica y otras prácticas complementarias son opcionales.",
        "benefit": "Comprender el patrón · explorar tus reacciones · encontrar apoyo y un siguiente paso realista.",
        "sectionsTitle": "Un enfoque integrado · cuatro etapas",
        "sections": [
            {
                "title": "01 · Constelación: mapa de la situación",
                "text": "Aclaramos tu objetivo, los roles, las relaciones y los obstáculos. Una constelación ofrece hipótesis simbólicas para reflexionar, no pruebas de hechos ocultos."
            },
            {
                "title": "02 · Imágenes guiadas y trabajo interior",
                "text": "Con tu consentimiento, una exploración suave mediante imágenes o hipnoterapia permite observar emociones, necesidades y respuestas repetitivas. Las imágenes no se presentan como recuerdos recuperados de hechos reales."
            },
            {
                "title": "03 · Perspectiva homeopática complementaria",
                "text": "Si te interesa, podemos hablar del significado simbólico de un remedio en el modelo personal de psicohomeopatía. No es un tratamiento con eficacia demostrada ni una receta médica; aquí no se indican dosis."
            },
            {
                "title": "04 · Integración y seguimiento",
                "text": "Podemos incorporar trabajo arquetípico, recursos Dao / Wu Xing o prácticas contemplativas y elegir acciones concretas. Si continúas con el acompañamiento, revisamos juntos tus observaciones."
            }
        ],
        "action": "Consultar por una sesión de Alquimia del Alma",
        "actionMessage": "Servicio: Alquimia del Alma / Psicohomeopatía\nSolicitud: Quisiera conocer las opciones de una sesión personal con constelaciones e imágenes guiadas, y recursos complementarios si procede. ¿Podrías confirmar disponibilidad, formato y precio?",
        "note": "Enviar una solicitud no confirma una reserva ni implica un cargo. Sesión exprés de 30 minutos: €50. Sesión completa de 60 minutos: €100. Otras modalidades se acuerdan individualmente.",
        "safety": "Esta consulta simbólica y reflexiva no es diagnóstico ni tratamiento médico o psiquiátrico. No existen pruebas fiables de que la homeopatía sea eficaz para tratar enfermedades. No suspendas ni modifiques medicamentos prescritos; busca atención profesional para problemas de salud o urgencias. No se garantizan resultados.",
        "secondary": "Explorar las sesiones con imágenes guiadas",
        "secondaryHref": "/es/services/hypnotherapy-course",
        "image": "/images/holistic-house/video-posters/constellations-en-v1.webp",
        "supportKicker": "ACOMPAÑAMIENTO PERSONAL CONTINUADO",
        "supportTitle": "Una sesión o un proceso de cuatro semanas",
        "supportLead": "Para un tema que requiera más tiempo, se pueden acordar dos sesiones personales y cuatro semanas de observaciones y seguimiento: primero aclaramos la situación, después definimos un plan y revisamos lo que haya cambiado.",
        "supportItems": [
            "Revisión exprés · 30 minutos · €50",
            "Sesión personal completa · 60 minutos · €100",
            "Programa mensual opcional · 2 sesiones y 4 semanas de apoyo · precio a acordar"
        ],
        "supportFootnote": "Tú decides qué enfoques usar. La solicitud no activa ninguna suscripción ni realiza un pago."
    },
    "hypnotherapy": {
        "eyebrow": "PROCESO INDIVIDUAL · IMÁGENES GUIADAS",
        "title": "Hipnoterapia con imágenes guiadas",
        "lead": "Un proceso de sesiones individuales que utiliza imágenes, diálogo y reflexión para explorar patrones emocionales, recursos interiores y preguntas difíciles de aclarar solo pensando. Es un acompañamiento personal, no un curso de formación profesional en hipnoterapia.",
        "benefit": "Conocer mejor tus recursos y descubrir opciones de respuesta a partir de tu propia experiencia.",
        "sectionsTitle": "Qué podemos trabajar",
        "sections": [
            {
                "title": "Fortalecer el apoyo interior",
                "text": "Explorar imágenes relacionadas con seguridad, límites personales, estabilidad y recursos."
            },
            {
                "title": "Comprender patrones que se repiten",
                "text": "Reflexionar con delicadeza sobre emociones, relaciones y reacciones mediante imágenes guiadas y diálogo."
            },
            {
                "title": "Elegir tus próximos pasos",
                "text": "Llevar lo observado a decisiones cotidianas realistas. Puedes hacer una pausa, preguntar o cambiar de dirección en cualquier momento."
            }
        ],
        "action": "Preguntar por las sesiones con imágenes guiadas",
        "actionMessage": "Servicio: Hipnoterapia con imágenes guiadas\nSolicitud: Quisiera informarme sobre sesiones individuales de imágenes guiadas para explorar mis recursos y mis decisiones. ¿Podrías indicarme el formato, la disponibilidad y el precio?",
        "note": "La cantidad y la frecuencia de las sesiones se acuerdan individualmente. No hay reserva automática ni pago al enviar la solicitud.",
        "safety": "Este trabajo reflexivo no garantiza el tratamiento de ansiedad, depresión u otros problemas de salud y no sustituye la atención de profesionales de salud mental, la psiquiatría ni los servicios de crisis.",
        "secondary": "Más sobre la psicoterapia con imágenes",
        "secondaryHref": "/es/services/imagery-therapy",
        "image": "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp"
    }
},
  ru: {
    dao: {
      eyebrow: "БЕСПЛАТНО · ДАО / У-СИН",
      title: "Бесплатный профиль ресурсов У-Син",
      lead: "Исследуйте самочувствие, личный ресурс и баланс через авторскую модель Дао / У-Син. Это символический профиль ресурсов, а не медицинское обследование.",
      benefit: "Взгляд на текущий ресурс и качества, которым можно уделить внимание.",
      sectionsTitle: "Что исследуем в бесплатном разборе",
      sections: [
        { title: "Личный ресурс", text: "Вы описываете состояние, энергию, напряжение и ощущение внутренней опоры." },
        { title: "Авторская модель Дао / У-Син", text: "Рассматриваем переживания через символическую модель пяти элементов и ступеней ресурса." },
        { title: "Направление для размышления", text: "Проясняем, на какие качества стоит обратить внимание, без медицинских диагнозов." },
      ],
      action: "Запросить бесплатный профиль У-Син",
      actionMessage: "Услуга: Бесплатный профиль ресурсов У-Син\nЗапрос: хочу получить бесплатный символический профиль ресурса по модели Дао / У-Син. Подскажите, как начать.",
      note: "Бесплатная услуга. WhatsApp подготовит запрос с названием услуги; сообщение отправляется только после вашего подтверждения.",
      safety: "Модель Дао — авторская символическая система, не подтверждённый диагностический медицинский тест. Она не заменяет врача, обследование или лечение и не предназначена для изменения лекарств.",
      secondary: "Подробнее о модели Дао / У-Син",
      secondaryHref: "/ru/wu-xing",
      image: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
    },
    alchemy: {
      eyebrow: "АВТОРСКИЙ МЕТОД · РАССТАНОВКА · ГИПНОТЕРАПИЯ · ПСИХОГОМЕОПАТИЯ",
      title: "Алхимия души · Психогомеопатия",
      lead: "Если ситуация повторяется, начнём с расстановочной диагностики её динамики. Затем, когда это уместно, через мягкую образную гипнотерапию исследуем возможный корень внутреннего конфликта и стрессовую часть личности. Дополнительно можно рассмотреть индивидуальный гомеопатический подбор и другие ресурсные практики — без обещаний медицинского исцеления.",
      benefit: "Понять сценарий · исследовать внутреннюю причину · найти опору и следующий шаг.",
      sectionsTitle: "Единый авторский подход · четыре этапа",
      sections: [
        { title: "01 · Анализ ситуации через расстановку", text: "Уточняем запрос, цель и препятствия. Системная расстановка помогает символически увидеть отношения, роли и связи, которые могут поддерживать проблему. Это гипотеза для исследования, а не установление скрытых фактов." },
        { title: "02 · Гипнотерапия: исследование корня", text: "С вашего согласия через направленное воображение, символдраму или мягкое гипнотерапевтическое погружение исследуем эмоциональный механизм, напряжение и внутренние части личности. Образы не принимаются за достоверно восстановленные воспоминания." },
        { title: "03 · Дополнительный гомеопатический подбор", text: "В авторской психогомеопатической модели можем подобрать гомеопатический препарат как дополнительный символический ресурс, ориентируясь на текущее состояние и наблюдая изменения. Это необязательно и не является доказанным лечением; дозировки здесь не назначаются." },
        { title: "04 · Алхимия, ресурсы и интеграция", text: "При необходимости подключаем архетипические подходы, даосскую модель У-Син и созерцательные энергетические практики. Фиксируем новые решения и по мере сопровождения пересматриваем актуальность поддержки." },
      ],
      action: "Обсудить сессию «Алхимия души»",
      actionMessage: "Услуга: Алхимия души / Психогомеопатия\nЗапрос: хочу обсудить личную сессию с диагностикой через расстановку, образной гипнотерапией и, если уместно, дополнительным гомеопатическим подбором и ресурсными практиками. Подскажите доступный формат и время.",
      note: "Это обращение, а не подтверждённая запись. Экспресс 30 минут — €50, полная сессия 60 минут — €100; длительное сопровождение обсуждается отдельно.",
      safety: "Это авторская консультативная, психологически ориентированная и символическая работа, не медицинская или психиатрическая диагностика и не лечение. Надёжных доказательств эффективности гомеопатии для лечения заболеваний нет. Не отменяйте назначенные лекарства; при болезни и неотложных состояниях обращайтесь к квалифицированным специалистам. Результат не гарантируется.",
      secondary: "Подробнее об образной гипнотерапии",
      secondaryHref: "/ru/services/hypnotherapy-course",
      image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
      supportKicker: "ПЕРСОНАЛЬНОЕ СОПРОВОЖДЕНИЕ",
      supportTitle: "Одна сессия или четыре недели работы",
      supportLead: "Если тема требует времени, предусмотрен авторский формат психогомеопатического сопровождения: две личные сессии и четыре недели индивидуальной поддержки. Сначала исследуем ситуацию, затем согласуем план, отслеживаем изменения и на повторной встрече уточняем следующий шаг.",
      supportItems: ["Экспресс-разбор · 30 минут · €50", "Полная личная сессия · 60 минут · €100", "Месячная программа · 2 сессии + 4 недели сопровождения · стоимость согласуем отдельно"],
      supportFootnote: "Глубину и методы согласуем вместе. Обращение не оформляет подписку и не списывает оплату.",
    },
    hypnotherapy: {
      eyebrow: "ИНДИВИДУАЛЬНЫЙ КУРС · ОБРАЗЫ ПОДСОЗНАНИЯ",
      title: "Курс гипнотерапии",
      lead: "Индивидуальный курс сессий с направленной образной работой для исследования образов подсознания, внутренних реакций и личных вопросов, на которые трудно найти ответ только разумом. Это личная рефлексивная работа, не обучение гипнотерапии.",
      benefit: "Исследование внутренней опоры, ресурсов и собственных вариантов дальнейших действий.",
      sectionsTitle: "Основные направления работы",
      sections: [
        { title: "Укрепление внутренней опоры", text: "Через образы исследуем чувство безопасности, границы и личный ресурс." },
        { title: "Работа с повторяющимися сценариями", text: "Бережно исследуем чувства, реакции и отношения через направленное воображение." },
        { title: "Поиск собственных ответов", text: "Связываем найденные образы и наблюдения с реальными жизненными решениями. По ходу работы можно сделать паузу, задать вопросы или изменить направление." },
      ],
      action: "Узнать о курсе гипнотерапии",
      actionMessage: "Услуга: Курс гипнотерапии — работа с образами подсознания\nЗапрос: интересует индивидуальный курс для укрепления внутреннего ресурса и поиска ответов. Подскажите формат, доступность и стоимость.",
      note: "Количество и частота сессий определяются индивидуально. Никакой автоматической записи или оплаты.",
      safety: "Работа с образами не гарантирует лечение тревоги, депрессии или других состояний и не заменяет помощь лицензированного специалиста в области психического здоровья или кризисную помощь.",
      secondary: "Подробнее об образной работе",
      secondaryHref: "/ru/services/imagery-therapy",
      image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
    },
  },
} as const;

export function coreOfferDetailData(locale: PublicLocale, kind: DetailKind) {
  return copy[locale][kind];
}

export function CoreServiceDetail({ locale, kind }: { locale: PublicLocale; kind: DetailKind }) {
  const t = copy[locale][kind];
  const serviceSlug = { dao: "dao-health-profile", alchemy: "alchemy-of-soul", hypnotherapy: "hypnotherapy-course" }[kind];
  const pathFacts = {
    ru: {
      free: "Бесплатно · Символический профиль",
      session: "Индивидуальные сессии · Стоимость согласуем до записи",
      alchemy: "30 мин · €50 / 60 мин · €100",
      noPayment: "Вы отправляете запрос, а не оплачиваете и не подтверждаете запись",
    },
    en: {
      free: "Free · Symbolic resource profile",
      session: "Personal sessions · Price agreed before booking",
      alchemy: "30 min · €50 / 60 min · €100",
      noPayment: "Send an enquiry first; no payment or automatic booking",
    },
    es: {
      free: "Gratis · Perfil simbólico de recursos",
      session: "Sesiones personales · Precio confirmado antes de reservar",
      alchemy: "30 min · €50 / 60 min · €100",
      noPayment: "Primero envías una solicitud; no hay pago ni reserva automática",
    },
  }[locale];
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: t.title,
    request: t.actionMessage,
    option: t.action,
    pagePath: "/" + locale + "/services/" + serviceSlug,
  });
  return (
    <main className={styles.main} lang={locale} data-core-service-detail={kind}>
      <div className={styles.breadcrumb}><Link href={"/" + locale + "/services"}><ArrowLeft size={17} aria-hidden="true"/>{locale === "ru" ? "Все услуги" : locale === "es" ? "Todos los servicios" : "All services"}</Link></div>
      <section className={styles.hero}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className={styles.lead}>{t.lead}</p>
          <p className={styles.benefit}><Check size={17} aria-hidden="true"/>{t.benefit}</p>
          <div className={styles.quickFacts} aria-label={locale === "ru" ? "Условия" : locale === "es" ? "Condiciones" : "Session details"}>
            <strong>{kind === "dao" ? pathFacts.free : kind === "alchemy" ? pathFacts.alchemy : pathFacts.session}</strong>
            <span>{pathFacts.noPayment}</span>
          </div>
          <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} label={t.action} className={styles.primary} id={kind === "dao" ? "request-free-wu-xing" : undefined} event="service_request_start" attributes={{ "data-service-request": kind }}/>
          <p className={styles.note}>{t.note}</p>
          <aside className={styles.andrey}>
            <strong>{locale === "ru" ? "С Андреем Литвиновым" : locale === "es" ? "Con Andrey Litvinov" : "With Andrey Litvinov"}</strong>
            <span>{locale === "ru" ? "После запроса уточняем вопрос и формат; затем можно посмотреть короткое видео о подходе ниже." : locale === "es" ? "Después de enviar la solicitud, aclaramos tu pregunta y el formato. Más abajo puedes ver un vídeo breve sobre el enfoque." : "After your enquiry, we clarify your question and format; then you can watch the short approach video below."}</span>
            <Link href={"/" + locale + "/about"}>{locale === "ru" ? "Об Андрее" : locale === "es" ? "Sobre Andrey" : "About Andrey"}<ArrowUpRight size={14} aria-hidden="true"/></Link>
          </aside>
        </div>
        <div className={styles.photo}><Image src={t.image} alt="" fill priority sizes="(max-width: 760px) 100vw, 38vw" /></div>
      </section>
      <ServiceVideoShowcase topic={kind === "dao" ? "overview" : kind} locale={locale} id="service-video" />
      <section className={styles.outcomes} aria-labelledby="core-service-process-heading">
        <h2 id="core-service-process-heading">{t.sectionsTitle}</h2>
        <div className={styles.items}>
          {t.sections.map(step => <article key={step.title}><h3>{step.title}</h3><p>{step.text}</p></article>)}
        </div>
      </section>
      {kind === "alchemy" ? (
        <section className={styles.alchemySupport} aria-labelledby="alchemy-support-heading">
          <div className={styles.alchemySupportCopy}>
            <span className={styles.alchemySupportKicker}>{copy[locale].alchemy.supportKicker}</span>
            <h2 id="alchemy-support-heading">{copy[locale].alchemy.supportTitle}</h2>
            <p>{copy[locale].alchemy.supportLead}</p>
          </div>
          <div className={styles.alchemyOptions}>
            <ul>{copy[locale].alchemy.supportItems.map(item => <li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}</ul>
            <p>{copy[locale].alchemy.supportFootnote}</p>
            <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} className={styles.alchemySupportAction} event="service_request_start" attributes={{ "data-service-request": kind, "data-alchemy-monthly": "true" }} />
          </div>
        </section>
      ) : null}
      <section className={styles.footer}>
        <p className={styles.safety}><ShieldCheck size={19} aria-hidden="true"/>{t.safety}</p>
        <div className={styles.links}>
          <Link href={t.secondaryHref}>{t.secondary}<ArrowUpRight size={16} aria-hidden="true"/></Link>
          <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} label={t.action} className={styles.footerCta} event="service_request_start" attributes={{ "data-service-request": kind }}/>
        </div>
        <details className={styles.freeAlternative}>
          <summary>{locale === "ru" ? "Предпочитаете сначала бесплатный письменный разбор ситуации?" : locale === "es" ? "¿Prefieres comenzar con una revisión gratuita por escrito?" : "Prefer to start with a free written situation review?"}</summary>
          <Link href={"/" + locale + "/services/free-situation-review"}>{locale === "ru" ? "Открыть бесплатный разбор" : locale === "es" ? "Abrir revisión gratuita" : "Open the free written review"}<ArrowUpRight size={16} aria-hidden="true"/></Link>
        </details>
      </section>
    </main>
  );
}
