"use client";

import Image from "next/image";
import type { PublicLocale } from "@/lib/public-locales";
import type { ServicesPanelId } from "@/components/services-unified-catalog";
import { ServicesCardActions } from "@/components/services-card-actions";
import { telegramServiceOptionDirectBotUrl } from "@/lib/assist/telegram-service-options.mjs";
import styles from "./services-three-visible-options.module.css";

type CatalogGroup = Exclude<ServicesPanelId, "about" | "testimonials" | "mytube" | "directory">;
export type ThreeGroup = CatalogGroup | "shamanica-artifacts" | "shamanica-learning";
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
  "shamanica-artifacts": [
    { id:"personal", name:["Персональный талисман","Personal talisman","Talismán personal"],
      description:["Символический предмет для личного намерения; материалы и стоимость уточняются.","A symbolic object for your intention; materials and price are confirmed individually.","Objeto simbólico personal; materiales y precio a confirmar."],
      path:"holistic-support#talismans", photo:"/academy/reiki-yggdrasil/source/advanced-runes.png", price:"quote" },
    { id:"fu", name:["Даосский талисман Фу","Daoist Fu talisman","Talismán taoísta Fu"],
      description:["Выбор символа из опубликованного каталога; мастер подтвердит цену и изготовление.","Explore the published Fu catalogue; a practitioner confirms materials and price.","Explora el catálogo Fu; el maestro confirma materiales y precio."],
      path:"holistic-support#talismans", photo:"/images/holistic-house/tao-fu-balance.webp", price:"quote" },
    { id:"mandala", name:["Мандала для личной цели","Mandala for a personal goal","Mandala para una meta personal"],
      description:["Создание символического изображения для вашей цели; условия по запросу.","Create a symbolic image for reflection on your goal; terms on request.","Imagen simbólica personal para reflexionar sobre una meta; consultar precio."],
      path:"holistic-support/mandala", photo:"/images/holistic-house/mandala-gold-reference.webp", price:"quote" },
  ],
  "shamanica-learning": [
    { id:"practitioner", name:["Практик Рейки · бесплатный курс","Reiki Practitioner · free course","Practicante de Reiki · curso gratis"],
      description:["Опубликованный вводный курс с короткими уроками и практиками.","Published introductory course with short lessons and practices.","Curso introductorio publicado con lecciones y prácticas."],
      path:"academy/principles-of-energywork", photo:"/images/holistic-house/reiki-practitioner-sunrise.webp", price:"free" },
    { id:"tantra", name:["Тантра Рейки · введение и инициация","Tantra Reiki · introduction & initiation","Tantra Reiki · introducción e iniciación"],
      description:["Бесплатная вводная практика и информация об инициации первой ступени.","Free introductory practice and information about Level 1 initiation.","Práctica inicial gratis e información sobre iniciación de nivel 1."],
      path:"academy/reiki/tantra-reiki/free-initiation", photo:"/images/holistic-house/tantra-reiki-yin-yang-cover.svg", price:"free" },
    { id:"yggdrasil", name:["Рейки Иггдрасиль · базовый курс","Reiki Yggdrasil · basic course","Reiki Yggdrasil · curso básico"],
      description:["Основная программа; подробности ступеней и стоимость уточняются отдельно.","Explore the basic programme; level details and pricing are confirmed separately.","Programa básico; los niveles y precios se confirman por separado."],
      path:"academy/reiki/yggdrasil", photo:"/academy/reiki-yggdrasil/source/basic-program.jpg", price:"quote" },
  ],
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
    { id:"imagery", name:["Отношения · образная психотерапия","Relationships · guided imagery","Relaciones · imágenes guiadas"],
      description:["Работа с переживаниями и повторяющимися сценариями отношений.","Explore emotional patterns and recurring relationship dynamics.","Explora experiencias emocionales y patrones de relación."],
      path:"services/imagery-therapy", photo:"/images/holistic-house/video-posters/hypnotherapy-en-v1.webp", price:"from50" },
    { id:"constellations", name:["Семейные и системные расстановки","Family & systemic constellations","Constelaciones familiares y sistémicas"],
      description:["Исследование семейных, партнёрских и личных ролей в символической сессии.","Explore family, partnership and personal roles in a symbolic session.","Explora roles familiares, de pareja y personales de forma simbólica."],
      path:"services/systemic-constellations", photo:"/images/holistic-house/video-posters/constellations-en-v1.webp", price:"from50" },
    { id:"business", name:["Бизнес-расстановки и командные роли","Business constellations & team roles","Constelaciones empresariales y roles"],
      description:["Символическая карта деловой ситуации и проверяемые следующие шаги, без обещания результата.","A symbolic business-system map and testable next steps, without guaranteed outcomes.","Mapa simbólico empresarial y próximos pasos comprobables, sin promesas de resultados."],
      path:"services/business-consulting", photo:"/images/holistic-house/andy-about.png", price:"from50" },
  ],
  business: [
    { id:"review", name:["Разбор деловой ситуации","Business situation review","Revisión de situación empresarial"],
      description:["Бесплатный письменный разбор вопроса о работе или бизнесе.","A free written reflection on a work or business question.","Reflexión escrita gratuita sobre trabajo o negocio."],
      path:"services/free-situation-review", photo:"/images/holistic-house/messenger-zen-stones.svg", price:"free" },
    { id:"consult", name:["Бизнес-консультация","Business consultation","Consulta empresarial"],
      description:["Уточнить стратегию, решения и следующий шаг с консультантом.","Clarify strategy, decisions and a practical next step.","Aclarar estrategias, decisiones y próximos pasos."],
      path:"services/business-consulting", photo:"/images/holistic-house/andy-about.png", price:"quote" },
    { id:"team", name:["Команды и бизнес-расстановки","Teams & business constellations","Equipos y constelaciones empresariales"],
      description:["Системный взгляд на роли, партнёрство и взаимодействие в команде.","Explore team roles and partnerships through systemic mapping.","Explorar roles de equipo y asociaciones con mapas sistémicos."],
      path:"services/business-consulting", photo:"/images/holistic-house/homepage-constellations.svg", price:"quote" },
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
      description:["Опубликованная программа из 14 коротких занятий.","A published 14-day self-support programme.","Programa publicado de 14 días de apoyo personal."],
      path:"courses/antistress", photo:"/images/holistic-house/course-focus-mountain-boy.webp", price:"free" },
    { id:"meditations", name:["Медитации и практики","Meditations & practices","Meditaciones y prácticas"],
      description:["Аудио и видео для осознанной самоподдержки.","Listen to guided practices for everyday self-support.","Prácticas guiadas de apoyo personal."],
      path:"meditations", photo:"/images/holistic-house/assist-video-meditation.webp", price:"free" },
    { id:"personal-video", name:["Персональное видео","Personal video","Vídeo personal"],
      description:["Создайте видео с выбранной темой в существующей студии.","Explore a personal video on your chosen theme in the existing studio.","Crea un vídeo personal sobre un tema elegido."],
      path:"video-studio", photo:"/images/holistic-house/assist-video-intention.webp", price:"quote" },
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

const translate = (values:Text3, locale:PublicLocale):string =>
  values[locale==="ru"?0:locale==="en"?1:2];

export function isThreeOptionGroup(id:ServicesPanelId):id is CatalogGroup {
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
      return <article className={styles.offer} data-support-uniform-card key={offer.id}
        data-service-variant={id+"-"+offer.id} data-service-price-kind={offer.price}>
        <div className={styles.image} data-support-uniform-photo>
          <Image src={offer.photo} alt="" fill unoptimized loading="lazy" sizes="(max-width:760px) 34vw, 90px" />
        </div>
        <div className={styles.copy} data-support-uniform-copy>
          <span className={styles.price} data-service-price data-support-uniform-price>{price}</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <ServicesCardActions locale={locale} title={title} description={description}
          href={href} request={description} option={price}
          trackingId={id+"-"+offer.id}
            // Use signed Telegram URLs only for registered offers. Shamanica
            // extras fall back to a human messenger draft with the exact title.
            telegramUrl={telegramServiceOptionDirectBotUrl(id+"_"+offer.id,locale)
              || (id.startsWith("shamanica-") ? undefined :
                "/api/public/telegram-option-entry?offer="+id+"_"+offer.id+"&locale="+locale)}
            className={styles.actions} />
      </article>;
    })}
 </div>;
}
