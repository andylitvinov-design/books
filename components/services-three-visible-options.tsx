"use client";

import Image from "next/image";
import type { PublicLocale } from "@/lib/public-locales";
import type { ServicesPanelId } from "@/components/services-unified-catalog";
import { ServicesCardActions } from "@/components/services-card-actions";
import styles from "./services-three-visible-options.module.css";

type ThreeGroup = Exclude<ServicesPanelId, "about" | "testimonials" | "mytube" | "directory">;
type Text3 = readonly [string, string, string]; // RU, EN, ES
type Price = "free" | "express" | "full" | "from50" | "quote";
type Option = {
  id: string;
  name: Text3;
  description: Text3;
  path: string;
  photo: string;
  price: Price;
  fixedLocale?: PublicLocale;
};

// Only previously published first-party destinations and existing offers.
// A price is shown only when already confirmed for that exact offer/format.
const groups: Record<ThreeGroup, readonly Option[]> = {
  reiki: [
    { id:"remote", name:["Рейки · дистанционная сессия","Reiki · remote session","Reiki · sesión a distancia"],
      description:["Выбор мастера, метода и времени; условия согласовываются до оплаты.","Choose a practitioner, method and preferred time; terms are confirmed before payment.","Elige profesional, método y horario; las condiciones se confirman antes de pagar."],
      path:"services/remote-energy-support", photo:"/images/holistic-house/reiki-practitioner-sunrise.webp", price:"quote" },
    { id:"tantra", name:["Тантра Рейки · бесплатное введение","Tantra Reiki · free introduction","Tantra Reiki · introducción gratuita"],
      description:["Вводная практика и информация об инициации; не оплаченная сессия.","Published introductory practice and initiation information, not a booked session.","Práctica introductoria publicada e información sobre la iniciación."],
      path:"academy/reiki/tantra-reiki/free-initiation", photo:"/images/holistic-house/tantra-reiki-yin-yang-cover.svg", price:"free" },
    { id:"yggdrasil", name:["Рейки Иггдрасиль · обучение","Reiki Yggdrasil · learning","Reiki Yggdrasil · formación"],
      description:["Опубликованная программа с возможностью уточнить ступень и стоимость.","Explore the published programme, levels and individual terms.","Explora el programa publicado, sus niveles y condiciones."],
      path:"academy/reiki/yggdrasil", photo:"/academy/reiki-yggdrasil/source/basic-program.jpg", price:"quote" },
  ],
  browse: [
    { id:"tests", name:["Тесты самочувствия","Wellbeing self-checks","Pruebas de bienestar"],
      description:["Короткие тесты для самонаблюдения, не медицинская диагностика.","Short self-checks for reflection, not medical diagnosis.","Cuestionarios breves de autoobservación, no diagnósticos médicos."],
      path:"tests", photo:"/images/holistic-house/course-start-heron.webp", price:"free" },
    { id:"situation", name:["Письменный разбор ситуации","Written situation review","Revisión escrita de la situación"],
      description:["Бесплатный личный ответ на запрос, не видеосессия.","A free personal written reflection, not a video appointment.","Reflexión escrita personal gratuita, no una videocita."],
      path:"services/free-situation-review", photo:"/images/holistic-house/andy-about.png", price:"free" },
    { id:"wuxing", name:["Профиль ресурсов У-Син","Wu Xing resource profile","Perfil de recursos Wu Xing"],
      description:["Символический профиль личных ресурсов на основе Дао.","A symbolic self-reflection profile using the Daoist model.","Un perfil simbólico de recursos para la reflexión."],
      path:"services/dao-health-profile", photo:"/academy/reiki-yggdrasil/source/eastern-tradition.png", price:"free" },
  ],
  reading: [
    { id:"iching", name:["Бесплатная подсказка И-Цзин","Free I Ching reflection","Reflexión I Ching gratuita"],
      description:["Символическое чтение для размышления, не предсказание будущего.","A symbolic reflection on your question, not a future prediction.","Reflexión simbólica sobre tu pregunta, no una predicción."],
      path:"holistic-support#dao-guidance", photo:"/academy/reiki-yggdrasil/source/eastern-tradition.png", price:"free" },
    { id:"tao", name:["Даосское чтение с мастером","Taoist reading with a master","Lectura taoísta con un maestro"],
      description:["Персональная символическая беседа по согласованию.","Personal symbolic guidance by arrangement.","Orientación simbólica personal previa consulta."],
      path:"services/spiritual-reading#spiritual-tao", photo:"/images/holistic-house/hero-olive-incense.webp", price:"quote" },
    { id:"tarot", name:["Таро · персональное чтение","Tarot · personal reading","Tarot · lectura personal"],
      description:["Расклад по ситуации и уточнение доступного мастера.","A symbolic spread with a published practitioner.","Tirada simbólica con un profesional publicado."],
      path:"services/spiritual-reading#spiritual-tarot", photo:"/academy/reiki-yggdrasil/source/temple-studies.png", price:"quote" },
  ],
  consultation: [
    { id:"free", name:["Бесплатный письменный разбор","Free written review","Revisión escrita gratuita"],
      description:["Краткий ответ на запрос в письменном формате.","Brief personal written feedback on your question.","Respuesta personal breve por escrito."],
      path:"services/free-situation-review", photo:"/images/holistic-house/messenger-zen-stones.svg", price:"free" },
    { id:"express", name:["Экспресс-сессия · 30 минут","Express session · 30 minutes","Sesión exprés · 30 minutos"],
      description:["Личная встреча для уточнения главного вопроса и следующего шага.","A short personal meeting to clarify the main question.","Encuentro breve para aclarar tu pregunta principal."],
      path:"services/free-consultation", photo:"/images/holistic-house/andy-about.png", price:"express" },
    { id:"full", name:["Личная сессия · 60 минут","Personal session · 60 minutes","Sesión personal · 60 minutos"],
      description:["Полная индивидуальная работа по выбранному запросу.","A full individual session centred on your question.","Sesión individual completa centrada en tu consulta."],
      path:"services/free-consultation", photo:"/images/holistic-house/andy-about.png", price:"full" },
  ],
  services: [
    { id:"imagery", name:["Образная психотерапия","Guided imagery psychotherapy","Psicoterapia con imágenes guiadas"],
      description:["Исследование внутренних образов и повторяющихся переживаний.","Explore inner imagery and recurring emotional patterns.","Explora imágenes interiores y patrones emocionales."],
      path:"services/hypnotherapy-course", photo:"/images/holistic-house/video-posters/hypnotherapy-en-v1.webp", price:"from50" },
    { id:"constellations", name:["Системные расстановки","Systemic constellations","Constelaciones sistémicas"],
      description:["Семейные, личные и ролевые сценарии в символической работе.","Explore family, personal and relational patterns.","Explora patrones familiares, personales y relacionales."],
      path:"services/systemic-constellations", photo:"/images/holistic-house/video-posters/constellations-en-v1.webp", price:"from50" },
    { id:"business", name:["Бизнес-консультация","Business consultation","Consulta empresarial"],
      description:["Рабочие решения, проекты, роли и практические следующие шаги.","Decisions, priorities, business roles and next steps.","Decisiones, prioridades, roles y próximos pasos."],
      path:"services/business-consulting", photo:"/images/holistic-house/andy-about.png", price:"from50" },
  ],
  video: [
    { id:"intention", name:["Видео-настрой","Video intention","Vídeo de intención"],
      description:["Короткая история для осмысления своей цели.","A short visual reflection on your intention.","Reflexión visual breve sobre tu intención."],
      path:"holistic-support/mandala", photo:"/images/holistic-house/assist-video-intention.webp", price:"quote" },
    { id:"meditation", name:["Видео-медитация","Video meditation","Vídeo meditación"],
      description:["Образы природы и мягкое сопровождение для практики.","Nature imagery and a gentle pace for reflection.","Imágenes de la naturaleza para una práctica tranquila."],
      path:"holistic-support/mandala", photo:"/images/holistic-house/assist-video-meditation.webp", price:"quote" },
    { id:"message", name:["Персональное видео-послание","Personal video message","Vídeo mensaje personal"],
      description:["Ваши слова или тема для собственного видео.","Your words or a meaningful thought in a personal video.","Tus palabras o una idea en un vídeo personal."],
      path:"holistic-support/mandala", photo:"/images/holistic-house/assist-video-message.webp", price:"quote" },
  ],
  courses: [
    { id:"opora", name:["ОПОРА · Антистресс","OPORA · Anti-Stress","OPORA · Antiestrés"],
      description:["Опубликованный курс из 14 коротких занятий.","A published 14-day self-support programme.","Programa publicado de 14 días de apoyo personal."],
      path:"courses/antistress", photo:"/images/holistic-house/course-focus-mountain-boy.webp", price:"free" },
    { id:"practitioner", name:["Бесплатный курс практикующего Рейки","Free Reiki Practitioner Course","Curso gratuito de Reiki"],
      description:["Пять вводных уроков на английском языке.","Five introductory lessons in English.","Cinco lecciones introductorias en inglés."],
      path:"academy/principles-of-energywork/learn", photo:"/academy/reiki-yggdrasil/source/program-overview.jpg", price:"free", fixedLocale:"en" },
    { id:"yggdrasil", name:["Обучение Рейки Иггдрасиль","Reiki Yggdrasil training","Formación Reiki Yggdrasil"],
      description:["Ступени обучения, практика и вопросы к мастеру.","Learning levels, practices and enquiry with a teacher.","Niveles, prácticas y consulta con un maestro."],
      path:"academy/reiki/yggdrasil", photo:"/academy/reiki-yggdrasil/source/basic-program.jpg", price:"quote" },
  ],
  coach: [
    { id:"diagnostic", name:["Бесплатная коучинг-анкета","Free coaching intake","Formulario gratuito de coaching"],
      description:["Уточните запрос до выбора личного формата.","Clarify your question before choosing a session.","Aclara tu consulta antes de elegir una sesión."],
      path:"coaching/intake", photo:"/images/holistic-house/course-start-heron.webp", price:"free" },
    { id:"ai", name:["Диалог с ИИ-коучем","Dialogue with AI coach","Diálogo con coach IA"],
      description:["Самостоятельный разговор с ИИ, не замена терапевта.","An AI-guided conversation, not a human therapy session.","Conversación asistida por IA, no una sesión terapéutica."],
      path:"my-coach", photo:"/images/holistic-house/reiki-practitioner-sunrise.webp", price:"quote" },
    { id:"human", name:["Личная сессия с коучем","Personal coaching session","Sesión con coach personal"],
      description:["Поддержка специалиста по целям, отношениям и работе.","One-to-one support for goals, relationships and work.","Apoyo personal en metas, relaciones y trabajo."],
      path:"services/free-consultation", photo:"/images/holistic-house/andy-about.png", price:"from50" },
  ],
  magical: [
    { id:"wellbeing", name:["Мандала · самочувствие","Mandala · wellbeing","Mandala · bienestar"],
      description:["Символическое изображение для размышления и самоподдержки.","A symbolic mandala for calm and reflection.","Mandala simbólica para la calma y la reflexión."],
      path:"temple-support", photo:"/images/holistic-house/mandala-gold-reference.webp", price:"quote" },
    { id:"money", name:["Мандала · денежная тема","Mandala · money theme","Mandala · tema de dinero"],
      description:["Символическое оформление намерения и финансовой цели.","Reflect on a money goal using personal symbolism.","Reflexión simbólica sobre una meta financiera."],
      path:"temple-support", photo:"/images/holistic-house/hero-olive-incense.webp", price:"quote" },
    { id:"talisman", name:["Персональный талисман","Personal talisman","Talismán personal"],
      description:["Символический предмет; материалы и условия уточняются.","A symbolic object; materials and terms by arrangement.","Objeto simbólico; materiales y condiciones por acordar."],
      path:"temple-support", photo:"/academy/reiki-yggdrasil/source/advanced-runes.png", price:"quote" },
  ],
  homeopathy: [
    { id:"free", name:["Бесплатный разбор ситуации","Free situation review","Revisión gratuita de situación"],
      description:["Письменная предварительная рефлексия без назначения лечения.","Written reflection, not a treatment prescription.","Reflexión escrita, no una prescripción de tratamiento."],
      path:"services/free-situation-review", photo:"/images/holistic-house/distance-homeopathy.webp", price:"free" },
    { id:"express", name:["Алхимия души · экспресс","Alchemy of the Soul · express","Alquimia del Alma · exprés"],
      description:["30 минут авторской образной и системной работы; гомеопатия не является доказанным лечением.","A 30-minute guided-imagery/systemic session; homeopathy is not evidence-based treatment.","Sesión breve de imágenes y trabajo sistémico; la homeopatía no es tratamiento probado."],
      path:"services/alchemy-of-soul", photo:"/images/holistic-house/video-posters/constellations-en-v1.webp", price:"express" },
    { id:"full", name:["Алхимия души · полная сессия","Alchemy of the Soul · full session","Alquimia del Alma · sesión completa"],
      description:["60 минут индивидуального символического разбора, не медицинская терапия.","A 60-minute individual symbolic reflection, not medical treatment.","Sesión simbólica individual de 60 minutos, no tratamiento médico."],
      path:"services/alchemy-of-soul", photo:"/images/holistic-house/video-posters/hypnotherapy-en-v1.webp", price:"full" },
  ],
};

const tags: Record<PublicLocale, Record<Price, string>> = {
  ru:{ free:"Бесплатно", express:"€50 · 30 мин", full:"€100 · 60 мин", from50:"от €50", quote:"Цена уточняется" },
  en:{ free:"Free", express:"€50 · 30 min", full:"€100 · 60 min", from50:"from €50", quote:"Price on request" },
  es:{ free:"Gratis", express:"€50 · 30 min", full:"€100 · 60 min", from50:"desde €50", quote:"Precio a consultar" },
};

const ui: Record<PublicLocale,{more:string;count:string}> = {
 ru:{more:"Дополнительные форматы",count:"3 варианта"},
 en:{more:"Additional formats",count:"3 options"},
 es:{more:"Otros formatos",count:"3 opciones"},
};

const translate = (values:Text3, locale:PublicLocale):string =>
  values[locale==="ru"?0:locale==="en"?1:2];

export function isThreeOptionGroup(id:ServicesPanelId):id is ThreeGroup {
  return Object.prototype.hasOwnProperty.call(groups,id);
}

export function ServicesThreeVisibleOptions({id,locale}:{id:ThreeGroup;locale:PublicLocale}) {
 const items=groups[id];
 return <div className={styles.options} data-services-three-visible={id}
    data-services-offer-count={items.length} lang={locale}>
    {items.map(offer=>{
      const title=translate(offer.name,locale);
      const description=translate(offer.description,locale);
      const price=tags[locale][offer.price];
      const href="/"+(offer.fixedLocale||locale)+"/"+offer.path;
      return <article className={styles.offer} key={offer.id}
        data-service-variant={id+"-"+offer.id} data-service-price-kind={offer.price}>
        <div className={styles.image}>
          <Image src={offer.photo} alt="" fill unoptimized loading="lazy" sizes="(max-width:760px) 78px, 90px" />
        </div>
        <div className={styles.copy}>
          <span className={styles.price} data-service-price>{price}</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <ServicesCardActions locale={locale} title={title} description={description}
          href={href} request={description} option={price}
          trackingId={id+"-"+offer.id} className={styles.actions} />
      </article>;
    })}
 </div>;
}
