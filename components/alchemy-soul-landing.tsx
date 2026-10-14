import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, Check,
  Compass, Heart, Layers3, PlayCircle, ShieldCheck, Sparkles, Waves,
} from "lucide-react";

import type { Locale } from "@/data/remedies";
import { SiteVideoPlayer } from "@/components/site-video-player";
import { AlchemySoulLeadForm } from "@/components/alchemy-soul-lead-form";
import { getServiceVideoMedia } from "@/data/service-video-library";
import styles from "./alchemy-soul-landing.module.css";

const copy = {
  ru: {
    breadcrumb: "Все услуги",
    kicker: "ЛИЧНАЯ РАБОТА · ПСИХОГОМЕОПАТИЯ И АРХЕТИПЫ",
    title: "Алхимия души",
    statement: "Когда вы хотите перемен, а что-то внутри останавливает.",
    lead: "Повторяются похожие отношения, решения откладываются, а напряжение возвращается. Вместо борьбы с собой мы исследуем, какой внутренний сценарий удерживает ситуацию, и ищем новые способы действовать.",
    cta: "Обсудить мой запрос",
    heroNote: "Онлайн · личная встреча по согласованию",
    presenter: "Андрей Литвинов",
    presenterDetail: "Автор метода · ведущий личных и системных сессий",
    chips: ["Глубинный разбор", "Расстановочная работа", "Символические ресурсы"],
    painEyebrow: "С ЧЕМ МОЖНО ПРИЙТИ",
    painTitle: "Вы можете узнать себя в одной из этих ситуаций",
    painLead: "Не обязательно заранее формулировать проблему «правильно». Достаточно заметить, где вы снова оказываетесь в тупике.",
    pains: [
      { title: "Отношения", body: "Одни и те же конфликты, дистанция, страх близости или сложность говорить о своих потребностях." },
      { title: "Решения и уверенность", body: "Сомнения, самокритика, страх оценки и ощущение, что внутреннее «нельзя» сильнее ваших намерений." },
      { title: "Работа и деньги", body: "Прокрастинация, трудность заявлять о себе, повторяющиеся ограничения в работе и проектах." },
      { title: "Напряжение и ресурс", body: "Переутомление, внутреннее сжатие, привычные стрессовые реакции и ощущение потери опоры." },
    ],
    methodEyebrow: "ОСОБЕННОСТЬ МЕТОДА",
    methodTitle: "Мы смотрим глубже, чем на саму проблему",
    methodLead: "«Алхимия души» соединяет исследование запроса, работу с внутренними частями личности, символическую расстановку и авторский подход к архетипической гомеопатии. Не все инструменты нужны каждому: форму работы выбираем под конкретную задачу.",
    pillars: [
      { title: "Понять механизм", body: "Исследуем, когда возникает привычная реакция, что её поддерживает и какой смысл она может иметь." },
      { title: "Увидеть внутренние роли", body: "Через образы, диалог и элементы расстановки изучаем конфликт потребностей, запретов и стремлений." },
      { title: "Найти опору", body: "В рамках авторской модели можем обращаться к архетипам растений, минералов и гомеопатических средств как к символическому языку самонаблюдения, без лечебных обещаний." },
    ],
    routeEyebrow: "КАК ПРОХОДИТ РАБОТА",
    routeTitle: "От запутанной ситуации — к понятному следующему шагу",
    steps: [
      { number: "01", title: "Ваш запрос", body: "Обсуждаем ситуацию, желаемое изменение и то, что вы уже пробовали." },
      { number: "02", title: "Внутренний узел", body: "Находим рабочую гипотезу о повторяющейся реакции, стрессовой части или конфликте." },
      { number: "03", title: "Личная работа", body: "Используем подходящую образную или системную практику; дополнительные символические инструменты — только по согласованию." },
      { number: "04", title: "Интеграция", body: "Фиксируем наблюдения и реалистичные действия. При продолжении работы сравниваем динамику состояния." },
    ],
    gainTitle: "Что вы можете вынести из встречи",
    gains: ["Яснее увидеть повторяющийся сценарий", "Найти другой взгляд на собственные реакции", "Определить один посильный шаг после сессии"],
    videoEyebrow: "ЗНАКОМСТВО С ПОДХОДОМ",
    videoTitle: "Сначала послушайте меня",
    videoLead: "Коротко о том, как я выбираю способ работы под запрос человека.",
    videoNote: "Это уже опубликованное видео об общем подходе к личной работе, а не отдельная презентация «Алхимии души».",
    reviewsEyebrow: "ЛИЧНЫЙ ОПЫТ",
    reviewsTitle: "Отзывы тех, кто уже работал со мной",
    reviewsLead: "Ранее опубликованные видеоотзывы о разных форматах индивидуальной работы, включая расстановки и консультации.",
    reviewsNote: "Отзывы отражают личный опыт отдельных участников; они не гарантируют аналогичный результат и не доказывают лечебную эффективность.",
    formatEyebrow: "ФОРМАТЫ",
    formatTitle: "Выберите комфортную глубину",
    formats: [
      { name: "Экспресс-разбор", duration: "30 минут", price: "€50", description: "Уточнить главный узел ситуации, задать вопросы и определить первый шаг." },
      { name: "Личная сессия", duration: "60 минут", price: "€100", description: "Более глубокое исследование запроса с образной или расстановочной работой по ситуации." },
    ],
    formatNote: "Оба варианта — индивидуальные платные встречи. Долгосрочное сопровождение и повторные сессии обсуждаем отдельно, без автоматической подписки.",
    freeIntro: "Пока не готовы к личной сессии?",
    freeLead: "Можно начать с отдельного бесплатного письменного разбора ситуации по анкете и рисунку.",
    freeAction: "Бесплатный письменный разбор",
    faqEyebrow: "ВАЖНО ЗНАТЬ",
    faqTitle: "Частые вопросы",
    faq: [
      { q: "Нужно ли мне разбираться в гомеопатии или расстановках?", a: "Нет. Начинаем с вашей ситуации. Я объясняю предложенные упражнения и согласую их с вами. Гомеопатическая символика — дополнительный, необязательный элемент." },
      { q: "Можно ли провести сессию онлайн?", a: "Да, онлайн — основной доступный формат. Возможность очной встречи и время обсуждаем индивидуально." },
      { q: "Что происходит после заполнения формы?", a: "Откроется WhatsApp с подготовленным текстом. Вы сами решаете, отправлять ли сообщение. Затем мы уточним запрос, продолжительность и доступное время. Автоматической оплаты или записи нет." },
      { q: "Можно ли начать бесплатно?", a: "Да, отдельно доступен бесплатный письменный разбор ситуации по коучинг-форме и рисунку. Он не включает живой звонок." },
      { q: "Заменяет ли это психотерапию или медицинскую помощь?", a: "Нет. Это авторская консультативная и символическая практика, не медицинская диагностика или лечение. При заболеваниях, острых симптомах или психическом кризисе нужна соответствующая профессиональная помощь." },
    ],
    finalEyebrow: "ВАШ СЛЕДУЮЩИЙ ШАГ",
    finalTitle: "Не обязательно справляться со всем в одиночку.",
    finalLead: "Опишите в нескольких строках, что вас останавливает. Мы обсудим, какой формат будет уместен именно для вашего запроса.",
    safety: "Это авторская консультативная и символическая работа, не замена медицинской или психиатрической помощи. Надёжных доказательств эффективности гомеопатии для лечения заболеваний нет. Диагнозы, дозировки и изменения лекарственной терапии в этой услуге не назначаются. Индивидуальный результат не гарантирован.",
    about: "Больше обо мне",
  },
  en: {
    breadcrumb: "All services",
    kicker: "ONE-TO-ONE · PSYCHO-HOMEOPATHY & ARCHETYPES",
    title: "Alchemy of the Soul",
    statement: "When you want change, but something inside keeps holding you back.",
    lead: "Similar relationship patterns repeat, decisions are postponed, and tension keeps returning. Instead of pushing harder, we explore the inner pattern behind the block and consider different ways of responding.",
    cta: "Discuss my situation",
    heroNote: "Online · in-person by arrangement",
    presenter: "Andrey Litvinov",
    presenterDetail: "Method author · personal and systemic sessions",
    chips: ["Depth-oriented exploration", "Constellation work", "Symbolic resources"],
    painEyebrow: "WHAT YOU CAN BRING",
    painTitle: "Does any of this sound familiar?",
    painLead: "You do not need to describe your problem perfectly. Start with the place where you keep feeling stuck.",
    pains: [
      { title: "Relationships", body: "Repeating conflicts, distance, fear of intimacy or difficulty expressing your needs." },
      { title: "Decisions and confidence", body: "Second-guessing, self-criticism, fear of judgment and the feeling that an internal 'no' overrides your intentions." },
      { title: "Work and money", body: "Procrastination, difficulty being visible or repeating limitations in your work and projects." },
      { title: "Tension and resources", body: "Exhaustion, inner tightness, familiar stress responses and a loss of steadiness." },
    ],
    methodEyebrow: "THE APPROACH",
    methodTitle: "We look beyond the surface of the problem",
    methodLead: "Alchemy of the Soul combines exploration of your situation, work with inner parts, symbolic constellations and an author's archetypal-homeopathy framework. You do not need every tool; we choose the format to suit your question.",
    pillars: [
      { title: "Understand the pattern", body: "We explore when a familiar response appears, what sustains it and what meaning it might carry." },
      { title: "Meet the inner roles", body: "Imagery, dialogue and constellation exercises help explore competing needs, restrictions and aspirations." },
      { title: "Find inner support", body: "Within the author's model, the archetypes of plants, minerals and homeopathic remedies can serve as symbolic prompts for reflection, without treatment claims." },
    ],
    routeEyebrow: "HOW IT WORKS",
    routeTitle: "From a tangled situation to a possible next step",
    steps: [
      { number: "01", title: "Your question", body: "We talk about your situation, the change you want and what you have tried." },
      { number: "02", title: "The inner knot", body: "We develop a working hypothesis about the recurring response, stressed inner part or conflict." },
      { number: "03", title: "Personal exploration", body: "We use a suitable imagery or constellation exercise. Any additional symbolic work is optional and agreed together." },
      { number: "04", title: "Integration", body: "We capture observations and realistic actions. In ongoing work we compare changes over time." },
    ],
    gainTitle: "What you may take from a session",
    gains: ["A clearer picture of a recurring pattern", "A fresh perspective on your reactions", "One manageable next step to explore"],
    videoEyebrow: "MEET THE APPROACH",
    videoTitle: "Hear about my work",
    videoLead: "A short introduction to choosing a method for each person's question.",
    videoNote: "This previously published video introduces one aspect of my work; it is not a dedicated overview of the whole Alchemy of the Soul service.",
    reviewsEyebrow: "PERSONAL EXPERIENCES",
    reviewsTitle: "What people share about working with me",
    reviewsLead: "Previously published video testimonials from different forms of personal work, including consultations and constellations.",
    reviewsNote: "Testimonials describe individual experiences and do not guarantee similar outcomes or establish medical treatment effectiveness.",
    formatEyebrow: "FORMATS",
    formatTitle: "Choose the depth that fits",
    formats: [
      { name: "Express consultation", duration: "30 minutes", price: "€50", description: "Clarify the central issue, ask questions and identify a possible first step." },
      { name: "Personal session", duration: "60 minutes", price: "€100", description: "Explore your situation in greater depth through imagery or constellation work when appropriate." },
    ],
    formatNote: "Both are paid one-to-one sessions. Follow-up sessions or monthly support are agreed separately, with no automatic subscription.",
    freeIntro: "Not ready for a session yet?",
    freeLead: "You can start with a separate free written situation review based on a questionnaire and drawing.",
    freeAction: "Free written situation review",
    faqEyebrow: "GOOD TO KNOW",
    faqTitle: "Frequently asked questions",
    faq: [
      { q: "Do I need to understand homeopathy or constellations?", a: "No. We start with your situation. I explain and agree on any exercises. Homeopathic symbolism is an optional element." },
      { q: "Can we work online?", a: "Yes, online is the main format. We can discuss in-person availability and scheduling individually." },
      { q: "What happens after I complete the form?", a: "WhatsApp opens with a prepared message. You decide whether to send it. We then discuss the question, duration and available times. There is no automatic booking or payment." },
      { q: "Can I start for free?", a: "Yes. A separate free written situation review uses a coaching form and drawing. It does not include a free live call." },
      { q: "Does this replace therapy or medical care?", a: "No. It is a reflective, symbolic and consultative practice, not medical diagnosis or treatment. Illness, urgent symptoms or a mental-health crisis require appropriate professional support." },
    ],
    finalEyebrow: "YOUR NEXT STEP",
    finalTitle: "You don't have to figure everything out alone.",
    finalLead: "Tell me in a few lines where you feel stuck. We can discuss which form of work may be appropriate for your situation.",
    safety: "This is an author's consultative and symbolic practice, not a substitute for medical or psychiatric care. Homeopathy has no reliable evidence of effectiveness for treating health conditions. No medical diagnosis, dosing or medication changes are provided. Individual results are not guaranteed.",
    about: "More about me",
  },
} as const;

const testimonials = {
  ru: [
    { id: "MIVLm1GUTtM", title: "Юрий Гончаренко — отзыв клиента", poster: "/images/holistic-house/testimonial-posters/MIVLm1GUTtM.webp" },
    { id: "ttQxUHopaUM", title: "Бизнес-расстановки — отзыв", poster: "/images/holistic-house/testimonial-posters/ttQxUHopaUM.webp" },
    { id: "VABgpmn4ZYA", title: "Татьяна Разумовская — отзыв о консультации", poster: "/images/holistic-house/testimonial-posters/VABgpmn4ZYA.webp" },
  ],
  en: [
    { id: "Dk0LBmOivQo", title: "Business constellation — client testimonial", poster: "/images/holistic-house/testimonial-posters/Dk0LBmOivQo.webp" },
    { id: "aUJde6A-9p0", title: "Business consulting — client testimonial", poster: "/images/holistic-house/testimonial-posters/aUJde6A-9p0.webp" },
    { id: "4NrryHcEF1A", title: "Psychic Alchemy — client testimonial", poster: "/images/holistic-house/testimonial-posters/4NrryHcEF1A.webp" },
  ],
} as const;

export function AlchemySoulLanding({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const video = getServiceVideoMedia("alchemy", locale);
  const reviews = testimonials[locale];

  return (
    <main className={styles.page} lang={locale} data-alchemy-soul-landing="2026-teal">
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={locale === "ru" ? "Навигация" : "Breadcrumb"}>
          <Link href={"/" + locale + "/services"}><ArrowLeft size={16} aria-hidden="true" />{t.breadcrumb}</Link>
        </nav>

        <section className={styles.hero} aria-labelledby="alchemy-title">
          <div className={styles.heroCopy}>
            <div className={styles.heroOrb} aria-hidden="true">✧</div>
            <p className={styles.eyebrowLight}><Sparkles size={15} aria-hidden="true" />{t.kicker}</p>
            <h1 id="alchemy-title">{t.title}</h1>
            <p className={styles.heroStatement}>{t.statement}</p>
            <p className={styles.heroLead}>{t.lead}</p>
            <div className={styles.chips}>{t.chips.map((item) => <span key={item}><Check size={13} aria-hidden="true" />{item}</span>)}</div>
            <a className={styles.heroAction} href="#alchemy-request">{t.cta}<ArrowRight size={18} aria-hidden="true" /></a>
            <p className={styles.heroNote}>{t.heroNote}</p>
            <div className={styles.practitioner}>
              <div className={styles.practitionerPhoto}><Image src="/images/holistic-house/andy-about.png" alt={t.presenter} fill priority sizes="78px" /></div>
              <div><strong>{t.presenter}</strong><span>{t.presenterDetail}</span></div>
            </div>
          </div>
          <div className={styles.heroForm}><AlchemySoulLeadForm locale={locale} placement="hero" /></div>
        </section>

        <section className={styles.painSection} aria-labelledby="alchemy-pains-heading">
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}><Waves size={16} aria-hidden="true" />{t.painEyebrow}</span>
            <h2 id="alchemy-pains-heading">{t.painTitle}</h2>
            <p>{t.painLead}</p>
          </header>
          <div className={styles.painGrid}>
            {t.pains.map((pain, index) => (
              <article className={styles.painCard} key={pain.title}>
                <div className={styles.painIcon} aria-hidden="true">
                  {index === 0 ? <Heart size={22} /> : index === 1 ? <Compass size={22} /> : index === 2 ? <BriefcaseBusiness size={22} /> : <Waves size={22} />}
                </div>
                <h3>{pain.title}</h3><p>{pain.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.methodSection} aria-labelledby="alchemy-method-heading">
          <div className={styles.methodIntro}>
            <span className={styles.eyebrow}><Layers3 size={17} aria-hidden="true" />{t.methodEyebrow}</span>
            <h2 id="alchemy-method-heading">{t.methodTitle}</h2>
            <p>{t.methodLead}</p>
            <div className={styles.methodArt} aria-hidden="true">
              <Image src="/images/holistic-house/course-hero-mindful.svg" alt="" fill sizes="(max-width: 760px) 300px, 460px" />
            </div>
          </div>
          <div className={styles.pillars}>
            {t.pillars.map((p, index) => (
              <article className={styles.pillar} key={p.title}>
                <span className={styles.pillarNumber}>{"0" + (index + 1)}</span>
                <h3>{p.title}</h3><p>{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.stepsSection} aria-labelledby="alchemy-steps-heading">
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>{t.routeEyebrow}</span>
            <h2 id="alchemy-steps-heading">{t.routeTitle}</h2>
          </header>
          <div className={styles.stepsGrid}>
            {t.steps.map((step) => (
              <article className={styles.stepCard} key={step.number}>
                <span className={styles.stepNumber}>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p>
              </article>
            ))}
          </div>
          <aside className={styles.gains}>
            <strong>{t.gainTitle}</strong>
            <ul>{t.gains.map((gain) => <li key={gain}><Check size={18} aria-hidden="true" />{gain}</li>)}</ul>
          </aside>
        </section>

        <section className={styles.videoSection} id="alchemy-video" aria-labelledby="alchemy-video-heading">
          <div className={styles.videoCopy}>
            <span className={styles.eyebrowLight}><PlayCircle size={17} aria-hidden="true" />{t.videoEyebrow}</span>
            <h2 id="alchemy-video-heading">{t.videoTitle}</h2>
            <p>{t.videoLead}</p>
            <p className={styles.videoNote}>{t.videoNote}</p>
          </div>
          <div className={styles.videoPlayer}>
            <SiteVideoPlayer video={video.video} locale={locale} compact fallbackPoster={video.poster} />
          </div>
        </section>

        <section className={styles.reviewsSection} aria-labelledby="alchemy-reviews-heading">
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>{t.reviewsEyebrow}</span>
            <h2 id="alchemy-reviews-heading">{t.reviewsTitle}</h2>
            <p>{t.reviewsLead}</p>
          </header>
          <div className={styles.reviewsGrid}>
            {reviews.map((review) => (
              <article className={styles.reviewCard} key={review.id} data-testimonial-video-id={review.id}>
                <SiteVideoPlayer video={{ youtubeId: review.id, title: review.title, language: locale }} locale={locale} compact fallbackPoster={review.poster} />
              </article>
            ))}
          </div>
          <p className={styles.reviewDisclaimer}>{t.reviewsNote}</p>
        </section>

        <section className={styles.formatSection} aria-labelledby="alchemy-format-heading">
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>{t.formatEyebrow}</span>
            <h2 id="alchemy-format-heading">{t.formatTitle}</h2>
          </header>
          <div className={styles.formatGrid}>
            {t.formats.map((item) => (
              <article className={styles.formatCard} key={item.name}>
                <div className={styles.formatMeta}><span>{item.duration}</span><strong>{item.price}</strong></div>
                <h3>{item.name}</h3><p>{item.description}</p>
                <a href="#alchemy-request-bottom">{t.cta}<ArrowRight size={17} aria-hidden="true" /></a>
              </article>
            ))}
          </div>
          <p className={styles.formatNote}>{t.formatNote}</p>
          <div className={styles.freePath}>
            <div><strong>{t.freeIntro}</strong><p>{t.freeLead}</p></div>
            <Link href={"/" + locale + "/services/free-situation-review"}>{t.freeAction}<ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </section>

        <section className={styles.faqSection} aria-labelledby="alchemy-faq-heading">
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>{t.faqEyebrow}</span>
            <h2 id="alchemy-faq-heading">{t.faqTitle}</h2>
          </header>
          <div className={styles.faqList}>
            {t.faq.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
          </div>
        </section>

        <section className={styles.finalSection} aria-labelledby="alchemy-final-heading">
          <div className={styles.finalCopy}>
            <span className={styles.eyebrowLight}><Sparkles size={16} aria-hidden="true" />{t.finalEyebrow}</span>
            <h2 id="alchemy-final-heading">{t.finalTitle}</h2>
            <p>{t.finalLead}</p>
            <Link href={"/" + locale + "/about"}>{t.about}<ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
          <AlchemySoulLeadForm locale={locale} placement="final" />
        </section>

        <p className={styles.safety}><ShieldCheck size={18} aria-hidden="true" />{t.safety}</p>
      </div>
    </main>
  );
}
