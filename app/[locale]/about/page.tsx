import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";

type PageProps = { params: Promise<{ locale: string }> };

const videoTestimonials = [
  { id: "m9RfDgK76PU", ru: "Антон Корчинский — отзыв о работе", en: "Anton Korchinsky — testimonial" },
  { id: "5oj0BIbLT4w", ru: "Елена Бахтина — отзыв клиента", en: "Elena Bakhtina — client testimonial" },
  { id: "MIVLm1GUTtM", ru: "Юрий Гончаренко — отзыв клиента", en: "Yuri Goncharenko — client testimonial" },
] as const;

const copy = {
  ru: {
    title: "Обо мне — Holistic House",
    description: "Andrii Litvinov — Jungian-oriented psychotherapist, facilitator of systemic and archetypal practices.",
    kicker: "Обо мне",
    heading: "Andrii Litvinov",
    lead: "Jungian-oriented psychotherapist и фасилитатор архетипических практик. Вырос в Украине и около 20 лет живу и работаю в разных странах.",
    intro: "Мой основной фокус — глубинная психотерапия, системные расстановки и работа с архетипами. Мне важно соединять психологическую глубину, телесный опыт и трансперсональное измерение так, чтобы практика оставалась живой, понятной и связанной с реальной жизнью.",
    experienceTitle: "Опыт",
    stats: [
      { value: "24 года", label: "ведения групповых терапевтических программ — с 2002 года" },
      { value: "22 года", label: "трансперсональных и temple-based практик — с 2004 года" },
      { value: "15 лет", label: "семейных и бизнес-расстановок — с 2011 года" },
      { value: "17 лет", label: "тантических воркшопов в разных школах и традициях — с 2009 года" },
    ],
    specializationsTitle: "Основные направления",
    specializations: [
      {
        title: "Dreams Alive Psychotherapy",
        text: "Работа с напряжением, внутренним ребёнком и ранними травматическими переживаниями через бессознательные образы и Guided Affective Imagery.",
      },
      {
        title: "Body-oriented Psychotherapy",
        text: "Работа с ранним телесным опытом, границами, поддержкой и осознанным прикосновением; важное влияние — Bodynamic Analysis.",
      },
      {
        title: "Temple Therapy",
        text: "Работа с личными и бизнес-целями через системные расстановки, храмовые архетипы, мистериальные структуры и трансперсональное поле.",
      },
      {
        title: "Taoist Alchemy / Psychic Homeopathy",
        text: "Исследование психосоматики, сложных состояний и внутренних динамик через авторскую модель Алхимии души и работу с поддерживающими средствами.",
      },
    ],
    trainingTitle: "Линии обучения и влияния",
    trainingIntro: "Есть разные школы и способы идти в глубинную работу. Для меня особенно важными стали несколько линий:",
    training: [
      {
        title: "Guided Affective Imagery — Hanscarl Leuner",
        text: "Моя основная психотерапевтическая линия: мост между юнгианской глубинной психологией, психоаналитическим мышлением и работой с образами.",
      },
      {
        title: "Bodynamic Analysis — Lisbeth Marcher",
        text: "Телесно-ориентированная линия, связывающая детские травматические паттерны, характер и конкретные зоны тела.",
      },
      {
        title: "Tantra & ISTA",
        text: "С 2009 года участвовал в тантрических школах и воркшопах в разных странах. Одним из самых сильных и трансформирующих влияний для меня стал подход ISTA.",
      },
      {
        title: "Temple Studies",
        text: "Посвящения и практика в линиях древнегреческих мистерий — Дионис, Деметра и другие храмовые архетипы — а также исследование египетской храмовой магии и мистерий.",
      },
      {
        title: "Reiki Initiations",
        text: "Многоступенчатые инициации, которые помогли почувствовать поле и поток: Tantra Reiki, Kundalini Reiki, Runic Reiki. Имею уровень Master Teacher в этих линиях.",
      },
    ],
    todayTitle: "Как я работаю сейчас",
    todayText: "В Holistic House я собрал опыт в три практических направления: бизнес-расстановки, Алхимия души / психогомеопатия и архетипические расстановки — Mysteries & Initiations. Работаю в Торонто и онлайн.",
    services: "Смотреть услуги",
    eventsKicker: "События и мастерские",
    eventsTitle: "Архив практики",
    eventsIntro: "Часть старых программ сохранилась в фестивальных каталогах и архивах. Это не полный список, а восстановленная линия публичных мастерских и групповой работы.",
    events: [
      {
        year: "с 2009",
        place: "Украина",
        title: "Мастерские тренеров / Центр «Альтаир»",
        text: "Серия мастерских для тренеров и ведущих. В старом каталоге Тавале я указан как руководитель Центра развития личности «Альтаир» и организатор Мастерских тренеров в Украине.",
        href: "https://tavale.com.ua/katalog-psy.htm",
        link: "Архив Тавале",
      },
      {
        year: "2010",
        place: "Харьков",
        title: "«Перемены и Самость» — международный фестиваль",
        text: "Мастер-класс «Контакт-клуб» по телесно-ориентированным и релаксационным практикам, а также мастер-класс о работе тренером и ведущим.",
        href: "https://ru.scribd.com/document/946328322/15",
        link: "Программа фестиваля",
      },
      {
        year: "2009–2010-е",
        place: "Украина",
        title: "«Мастерская волшебства»",
        text: "Одна из ранних серий мастерских и экспериментальных форматов. Сейчас я восстанавливаю фото и анонсы из старых Facebook/VK архивов.",
        href: "",
        link: "",
      },
      {
        year: "2010–2011",
        place: "Альфа-Фест",
        title: "Фестивали практической психологии",
        text: "Публичные фестивальные мастерские и работа в среде практической психологии и тренинговых программ. Сохранилась открытая фотогалерея Альфа-Феста 2010.",
        href: "https://www.alfa-fest.com.ua/k2/af2010",
        link: "Архив и фотогалерея",
      },
      {
        year: "2026",
        place: "Toronto",
        title: "Holistic House / Toronto Tantra",
        text: "Новая линия живых групп: bodywork, расстановки, Mysteries & Initiations и практики осознанного контакта.",
        href: "https://www.meetup.com/toronto-tantra-circle/",
        link: "Текущие события",
      },
    ],
    photosNote: "Facebook и VK почти не индексируют старые альбомы в открытом поиске. Поэтому я не добавляю случайные фотографии без подтверждения. Уже найден открытый архив Альфа-Феста; для фотографий «Мастерской тренеров» и «Мастерской волшебства» лучше использовать конкретные старые альбомы, когда мы восстановим ссылки.",
    testimonialsKicker: "Отзывы",
    testimonialsTitle: "Видео-отзывы",
    testimonialsText: "Несколько видео-отзывов, ранее опубликованных на моём сайте PsiMaster.",
    archiveTitle: "Фото и письменные отзывы",
    archiveText: "Часть старых отзывов и учебных эссе сохранилась в архиве PsiMaster. Я оставил прямые ссылки на оригинальные публикации.",
    archiveCards: [
      {
        title: "Отзывы: сеанс образной терапии",
        text: "Архив отзывов о личных консультациях и образной работе.",
        href: "https://psimaster.net/node/786",
        image: "https://psimaster.net/sites/default/files/styles/medium/public/article/%D0%B0%D0%BD%D0%B4%D1%80%D0%B5%D0%B9-%D0%BB%D0%B8%D1%82%D0%B2%D0%B8%D0%BD%D0%BE%D0%B2-%D1%80%D0%B5%D0%B9%D0%BA%D0%B8-%D0%B8%D0%B3%D0%B3%D0%B4%D1%80%D0%B0%D1%81%D0%B8%D0%BB%D1%8C-%D0%B0%D1%81%D1%81%D0%B3%D0%B0%D1%80%D0%B4-%D0%BD%D0%B8%D0%BA%D0%BE%D0%BB%D0%B0%D0%B9-%D0%B6%D1%83%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%B2.jpg?itok=8hSPbZ15",
      },
      {
        title: "Отзывы и материалы школы",
        text: "Архив отзывов, эссе участников и материалов старого центра PsiMaster.",
        href: "https://psimaster.net/node/789",
        image: "https://psimaster.net/sites/default/files/styles/medium/public/article/%D0%B0%D0%BD%D0%B4%D1%80%D0%B5%D0%B9-%D0%BB%D0%B8%D1%82%D0%B2%D0%B8%D0%BD%D0%BE%D0%B2-%D1%80%D0%B5%D0%B9%D0%BA%D0%B8-%D0%B8%D0%B3%D0%B3%D0%B4%D1%80%D0%B0%D1%81%D0%B8%D0%BB%D1%8C-%D0%B0%D1%81%D1%81%D0%B3%D0%B0%D1%80%D0%B4-%D0%BD%D0%B8%D0%BA%D0%BE%D0%BB%D0%B0%D0%B9-%D0%B6%D1%83%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%B2_0.jpg?itok=chWp4-7g",
      },
    ],
  },
  en: {
    title: "About — Holistic House",
    description: "Andrii Litvinov — Jungian-oriented psychotherapist and facilitator of systemic and archetypal practices.",
    kicker: "About",
    heading: "Andrii Litvinov",
    lead: "Jungian-oriented psychotherapist and facilitator of archetypal practices. Raised in Ukraine, I have lived and worked internationally for around 20 years.",
    intro: "My primary focus is depth-oriented psychotherapy, systemic constellations, and archetypal work. I am interested in bringing psychological depth, embodied experience, and the transpersonal dimension together in a way that stays alive, understandable, and connected to real life.",
    experienceTitle: "Experience",
    stats: [
      { value: "24 years", label: "facilitating group therapy programs — since 2002" },
      { value: "22 years", label: "facilitating transpersonal and temple-based practices — since 2004" },
      { value: "15 years", label: "facilitating Family and Business Constellations — since 2011" },
      { value: "17 years", label: "participating in tantra workshops across schools and traditions — since 2009" },
    ],
    specializationsTitle: "Main specializations",
    specializations: [
      {
        title: "Dreams Alive Psychotherapy",
        text: "Working with tension, Inner Child material, and early traumatic experience through unconscious imagery and Guided Affective Imagery.",
      },
      {
        title: "Body-oriented Psychotherapy",
        text: "Work with early embodied experience, boundaries, support, and conscious touch; Bodynamic Analysis has been an important influence.",
      },
      {
        title: "Temple Therapy",
        text: "Working with personal and business goals through systemic constellations, temple archetypes, mystery structures, and the transpersonal field.",
      },
      {
        title: "Taoist Alchemy / Psychic Homeopathy",
        text: "Exploring psychosomatics, complex states, and inner dynamics through my Alchemy of the Soul framework and supportive remedies.",
      },
    ],
    trainingTitle: "Training lines & influences",
    trainingIntro: "There are many ways and lineages to approach depth work. Several have been especially important in shaping my practice:",
    training: [
      {
        title: "Guided Affective Imagery — Hanscarl Leuner",
        text: "My principal psychotherapy line: a bridge between Jungian depth psychology, psychoanalytic thinking, and experiential work with imagery.",
      },
      {
        title: "Bodynamic Analysis — Lisbeth Marcher",
        text: "A body-oriented framework connecting childhood developmental patterns, character structure, and specific areas of the body.",
      },
      {
        title: "Tantra & ISTA",
        text: "Since 2009 I have taken part in tantra workshops in different schools and traditions around the world. The ISTA approach has been one of the most transformative influences for me.",
      },
      {
        title: "Temple Studies",
        text: "Initiatory and experiential study of Ancient Greek temple mysteries — Dionysus, Demeter, and other archetypal lines — together with Egyptian temple magic and mystery traditions.",
      },
      {
        title: "Reiki Initiations",
        text: "A series of initiations that helped me develop a felt sense of field and flow: Tantra Reiki, Kundalini Reiki, and Runic Reiki. I hold Master Teacher level in these lines.",
      },
    ],
    todayTitle: "How I work today",
    todayText: "At Holistic House I bring this experience together in three practical directions: Business Constellations, Alchemy of the Soul / Psychohomeopathy, and Archetypal Constellations — Mysteries & Initiations. I work in Toronto and online.",
    services: "Explore services",
    eventsKicker: "Events & workshops",
    eventsTitle: "Practice archive",
    eventsIntro: "Part of the earlier work survives in festival programs and public archives. This is not a complete chronology, but a reconstructed line of workshops and group practice.",
    events: [
      {
        year: "since 2009",
        place: "Ukraine",
        title: "Trainer Workshops / Altair Center",
        text: "A workshop series for trainers and facilitators. An archived Tavale directory lists me as head of the Altair Personal Development Center and organizer of Trainer Workshops in Ukraine.",
        href: "https://tavale.com.ua/katalog-psy.htm",
        link: "Tavale archive",
      },
      {
        year: "2010",
        place: "Kharkiv",
        title: "Changes & Selfhood — international festival",
        text: "The program lists my Contact Club workshop in body-oriented and relaxation practices, as well as a workshop on working professionally as a trainer/facilitator.",
        href: "https://ru.scribd.com/document/946328322/15",
        link: "Festival program",
      },
      {
        year: "2009–2010s",
        place: "Ukraine",
        title: "Magic Workshop",
        text: "One of my earlier workshop series and experimental formats. I am currently rebuilding the photo and announcement archive from old Facebook/VK material.",
        href: "",
        link: "",
      },
      {
        year: "2010–2011",
        place: "Alfa-Fest",
        title: "Practical Psychology Festivals",
        text: "Public festival workshops in the Ukrainian practical-psychology and training community. A public Alfa-Fest 2010 photo archive is still online.",
        href: "https://www.alfa-fest.com.ua/k2/af2010",
        link: "Archive & photo gallery",
      },
      {
        year: "2026",
        place: "Toronto",
        title: "Holistic House / Toronto Tantra",
        text: "The current live-events line: bodywork, constellations, Mysteries & Initiations, and conscious-connection practices.",
        href: "https://www.meetup.com/toronto-tantra-circle/",
        link: "Current events",
      },
    ],
    photosNote: "Facebook and VK expose very little of older albums to public search, so I have not used random images without verification. The Alfa-Fest public gallery is available; photos from Trainer Workshops and Magic Workshop should be added once we recover the exact legacy albums.",
    testimonialsKicker: "Testimonials",
    testimonialsTitle: "Video testimonials",
    testimonialsText: "A few video testimonials that were previously published on my PsiMaster website.",
    archiveTitle: "Photo & written reviews",
    archiveText: "Some older reviews and participant essays remain in the PsiMaster archive. These links open the original publications.",
    archiveCards: [
      {
        title: "Imagery therapy & personal sessions",
        text: "Archived reviews related to personal consultations and imagery-based work.",
        href: "https://psimaster.net/node/786",
        image: "https://psimaster.net/sites/default/files/styles/medium/public/article/%D0%B0%D0%BD%D0%B4%D1%80%D0%B5%D0%B9-%D0%BB%D0%B8%D1%82%D0%B2%D0%B8%D0%BD%D0%BE%D0%B2-%D1%80%D0%B5%D0%B9%D0%BA%D0%B8-%D0%B8%D0%B3%D0%B3%D0%B4%D1%80%D0%B0%D1%81%D0%B8%D0%BB%D1%8C-%D0%B0%D1%81%D1%81%D0%B3%D0%B0%D1%80%D0%B4-%D0%BD%D0%B8%D0%BA%D0%BE%D0%BB%D0%B0%D0%B9-%D0%B6%D1%83%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%B2.jpg?itok=8hSPbZ15",
      },
      {
        title: "School reviews & participant materials",
        text: "Archived reviews, participant essays, and materials from the earlier PsiMaster center.",
        href: "https://psimaster.net/node/789",
        image: "https://psimaster.net/sites/default/files/styles/medium/public/article/%D0%B0%D0%BD%D0%B4%D1%80%D0%B5%D0%B9-%D0%BB%D0%B8%D1%82%D0%B2%D0%B8%D0%BD%D0%BE%D0%B2-%D1%80%D0%B5%D0%B9%D0%BA%D0%B8-%D0%B8%D0%B3%D0%B3%D0%B4%D1%80%D0%B0%D1%81%D0%B8%D0%BB%D1%8C-%D0%B0%D1%81%D1%81%D0%B3%D0%B0%D1%80%D0%B4-%D0%BD%D0%B8%D0%BA%D0%BE%D0%BB%D0%B0%D0%B9-%D0%B6%D1%83%D1%80%D0%B0%D0%B2%D0%BB%D0%B5%D0%B2_0.jpg?itok=chWp4-7g",
      },
    ],
  },
} as const;

export function generateStaticParams() { return getHomeopathyLocaleParams(); }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const current = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: current.title,
    description: current.description,
    alternates: {
      canonical: "/" + locale + "/about",
      languages: { ru: "/ru/about", en: "/en/about" },
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const current = copy[typedLocale];

  return (
    <main className="about-shell about-shell--profile" lang={typedLocale}>
      <PublicSiteHeader locale={typedLocale} />

      <section className="about-profile-hero">
        <div className="about-profile-copy">
          <p className="homeopathy-kicker">{current.kicker}</p>
          <h1>{current.heading}</h1>
          <p className="about-lead">{current.lead}</p>
          <p className="about-profile-intro">{current.intro}</p>
        </div>
        <figure className="about-profile-portrait">
          {/* Historical public portrait from the user's earlier PsiMaster site. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://psimaster.net/sites/default/files/resize/userfiles/1/Andy3-310x310.jpg" alt="Andrii Litvinov" />
        </figure>
      </section>

      <section className="about-section-block" aria-labelledby="experience-title">
        <div className="about-section-heading">
          <p className="homeopathy-kicker">{current.experienceTitle}</p>
          <h2 id="experience-title">{current.experienceTitle}</h2>
        </div>
        <div className="about-stats">
          {current.stats.map((item) => (
            <article key={item.label}>
              <strong>{item.value}</strong>
              <p>{item.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section-block" aria-labelledby="specializations-title">
        <div className="about-section-heading">
          <p className="homeopathy-kicker">{current.specializationsTitle}</p>
          <h2 id="specializations-title">{current.specializationsTitle}</h2>
        </div>
        <div className="about-specializations">
          {current.specializations.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-training" aria-labelledby="training-title">
        <div className="about-training-intro">
          <p className="homeopathy-kicker">{current.trainingTitle}</p>
          <h2 id="training-title">{current.trainingTitle}</h2>
          <p>{current.trainingIntro}</p>
        </div>
        <div className="about-training-list">
          {current.training.map((item, index) => (
            <article key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-current-work">
        <div>
          <p className="homeopathy-kicker">{current.todayTitle}</p>
          <h2>{current.todayTitle}</h2>
        </div>
        <div>
          <p>{current.todayText}</p>
          <Link href={"/" + typedLocale + "/services"}>{current.services}<span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="about-events" id="events" aria-labelledby="events-title">
        <div className="about-section-heading">
          <p className="homeopathy-kicker">{current.eventsKicker}</p>
          <h2 id="events-title">{current.eventsTitle}</h2>
          <p>{current.eventsIntro}</p>
        </div>
        <div className="about-events-timeline">
          {current.events.map((event) => (
            <article key={event.year + event.title}>
              <div className="about-event-meta">
                <strong>{event.year}</strong>
                <span>{event.place}</span>
              </div>
              <div className="about-event-copy">
                <h3>{event.title}</h3>
                <p>{event.text}</p>
                {event.href ? <a href={event.href} rel="noreferrer" target="_blank">{event.link}<span aria-hidden="true">↗</span></a> : null}
              </div>
            </article>
          ))}
        </div>
        <p className="about-events-note">{current.photosNote}</p>
      </section>

      <section className="about-testimonials" aria-labelledby="testimonials-title">
        <div className="about-section-heading">
          <p className="homeopathy-kicker">{current.testimonialsKicker}</p>
          <h2 id="testimonials-title">{current.testimonialsTitle}</h2>
          <p>{current.testimonialsText}</p>
        </div>
        <div className="about-video-grid">
          {videoTestimonials.map((video) => (
            <article key={video.id}>
              <div className="about-video-frame">
                <iframe
                  src={"https://www.youtube-nocookie.com/embed/" + video.id}
                  title={video[typedLocale]}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <p>{video[typedLocale]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-review-archive" aria-labelledby="archive-title">
        <div className="about-section-heading">
          <p className="homeopathy-kicker">{current.archiveTitle}</p>
          <h2 id="archive-title">{current.archiveTitle}</h2>
          <p>{current.archiveText}</p>
        </div>
        <div className="about-review-grid">
          {current.archiveCards.map((card) => (
            <a href={card.href} key={card.href} rel="noreferrer" target="_blank">
              {/* Archived public preview image from PsiMaster. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.image} alt="" loading="lazy" />
              <div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <span>Open PsiMaster archive →</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
