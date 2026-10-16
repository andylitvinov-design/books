import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import type { PublicLocale } from "@/lib/public-locales";
import { reikiPhotoUrl } from "@/lib/academy/reiki-photo";
import { aboutBiography } from "@/data/about-biography";
import tantraReikiArchive from "@/data/academy/tantra-reiki-full.generated.json";
import englishTranslation from "@/data/academy/tantra-reiki-ru-en.generated.json";

const eventPhotos = [
  { src: tantraReikiArchive.images.ru[0], alt: "Original gathering photo from Andrey’s Tantra events" },
  { src: tantraReikiArchive.images.ru[10], alt: "Real participants and presence during an event" },
  { src: tantraReikiArchive.images.ru[11], alt: "Authentic personal connection at a Tantra gathering" },
] as const;

const story = {
  en: {
    kicker: "Real people · real experiences",
    title: "The energy of connection, beyond words",
    lead: "These photographs are from real gatherings and practices — moments of aliveness, connection and shared attention. Every person experiences the work differently.",
    teacherEyebrow: "Meet your guide",
    schoolArchiveTitle: "History of the Academy · original English text",
    schoolArchiveNote: "Archival descriptions from an earlier site, including historical qualifications and teaching claims. They are not a statement of current professional status or course terms.",
    authorBioArchiveTitle: "Andrey’s original biography · historical source",
    authorBioArchiveNote: "Preserved translation of the original Russian biography from the earlier Tantra Reiki page. Qualifications and professional titles are quoted historically, not independently verified as current.",
    teacherTitle: "Learn Tantra Reiki with Andy",
    teacherIntro: "I guide personal and group explorations of inner experience, body awareness, archetypes and the Reiki traditions.",
    teacherLink: "Meet Andy",
    experience: "Years of work with groups and personal growth",
    reiki: "Exploring Tantra, Kundalini and Runic Reiki traditions since 2004",
  },
  ru: {
    kicker: "Настоящие люди · живой опыт",
    title: "Энергия встречи, которую чувствуешь",
    lead: "Это реальные фотографии с наших встреч и практик: присутствие, живой контакт и совместное исследование. У каждого участника свой уникальный опыт.",
    teacherEyebrow: "Знакомство с ведущим",
    schoolArchiveTitle: "История Академии · оригинальный английский текст",
    schoolArchiveNote: "Это архивный текст с историческими сведениями о школе, квалификации и методах. Он не описывает автоматически действующие сегодня статусы и условия.",
    authorBioArchiveTitle: "Моя исходная биография · архивный текст",
    authorBioArchiveNote: "Сохранённый авторский текст русской страницы. Перечисленные профессиональные названия и квалификации относятся к историческому описанию, а не к подтверждению актуального статуса.",
    teacherTitle: "Тантра Рейки с Андреем",
    teacherIntro: "Я веду личные и групповые практики, объединяющие внутреннюю работу, телесное осознавание, архетипы и традиции Рейки.",
    teacherLink: "Познакомиться со мной",
    experience: "Личная и групповая работа с 2002 года",
    reiki: "Исследование традиций Tantra, Kundalini и Runic Reiki с 2004 года",
  },
  es: {
    kicker: "Personas reales · experiencias auténticas",
    title: "La energía del encuentro",
    lead: "Fotografías reales de nuestros encuentros y prácticas: presencia, conexión y atención compartida. La experiencia es diferente para cada persona.",
    teacherEyebrow: "Conoce a tu guía",
    schoolArchiveTitle: "Historia de la Academia · texto inglés original",
    schoolArchiveNote: "Texto histórico sobre la escuela, credenciales y enseñanza. No certifica el estatus profesional o las condiciones actuales.",
    authorBioArchiveTitle: "Biografía original de Andrey · archivo",
    authorBioArchiveNote: "Traducción al inglés del texto biográfico ruso conservado. Sus títulos y credenciales se muestran como contenido histórico.",
    teacherTitle: "Aprende Tantra Reiki con Andy",
    teacherIntro: "Guío prácticas personales y grupales basadas en la conciencia corporal, los arquetipos y las tradiciones de Reiki.",
    teacherLink: "Conoce a Andy",
    experience: "Prácticas de desarrollo personal y grupal desde 2002",
    reiki: "Estudio de Tantra, Kundalini y Runic Reiki desde 2004",
  },
} as const;

const historicalSchoolIndices = [4, 75, 76, 77, 78, 81, 82] as const;
const historicalBiographyIndices = [158, 159, 160, 161, 162, 163, 164, 165, 166, 167] as const;

export function TantraReikiFestivalMoments({locale}:{locale:PublicLocale}) {
  const text = story[locale];
  return (
    <section className="tantra-festival-moments" aria-labelledby="tantra-festival-moments-title">
      <div className="tantra-festival-moments__heading">
        <p className="homeopathy-kicker">{text.kicker}</p>
        <h2 id="tantra-festival-moments-title">{text.title}</h2>
        <p>{text.lead}</p>
      </div>
      <div className="tantra-festival-moments__gallery">
        {eventPhotos.map((photo, index) => (
          <figure key={photo.src} className={"tantra-festival-moments__photo tantra-festival-moments__photo--"+index}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={reikiPhotoUrl(photo.src, 640)} alt={photo.alt} loading="lazy" decoding="async" />
          </figure>
        ))}
      </div>
    </section>
  );
}

export function TantraReikiTeacher({locale}:{locale:PublicLocale}) {
  const text = story[locale];
  const about = aboutBiography[locale === "es" ? "en" : locale];
  return (
    <section className="tantra-teacher" id="tantra-teacher" aria-labelledby="tantra-teacher-title">
      <div className="tantra-teacher__photo">
        <StaticPortrait
          src="/images/holistic-house/andy-about.png"
          alt={locale === "ru" ? "Андрей, преподаватель Тантра Рейки" : locale === "es" ? "Andy, guía de Tantra Reiki" : about.photoAlt}
          width={700}
          height={870}
          sizes="(max-width: 780px) 100vw, 35vw"
          loading="lazy"
        />
      </div>
      <div className="tantra-teacher__copy">
        <p className="homeopathy-kicker">{text.teacherEyebrow}</p>
        <h2 id="tantra-teacher-title">{text.teacherTitle}</h2>
        <p>{text.teacherIntro}</p>
        <div className="tantra-teacher__facts">
          <span>{text.experience}</span>
          <span>{text.reiki}</span>
        </div>
        <Link href={"/" + locale + "/about"}>{text.teacherLink} <span aria-hidden="true">↗</span></Link>
        <details className="tantra-source-disclosure tantra-teacher__history" id="tantra-original-academy-history">
          <summary>{text.schoolArchiveTitle}</summary>
          <p className="tantra-source-disclosure__note">{text.schoolArchiveNote}</p>
          <div lang="en">
            {historicalSchoolIndices.map((index) => {
              const block = tantraReikiArchive.blocks.en[index];
              return block.type === "li" ? <p key={index}>• {block.text}</p> : <p key={index}>{block.text}</p>;
            })}
          </div>
        </details>
        <details className="tantra-source-disclosure tantra-teacher__history" id="tantra-original-author-biography">
          <summary>{text.authorBioArchiveTitle}</summary>
          <p className="tantra-source-disclosure__note">{text.authorBioArchiveNote}</p>
          <div lang={locale === "ru" ? "ru" : "en"}>
            {historicalBiographyIndices.map((index) => {
              const block = locale === "ru" ? tantraReikiArchive.blocks.ru[index] : englishTranslation.blocks[index];
              return block.type === "li" ? <p key={index}>• {block.text}</p> : <p key={index}>{block.text}</p>;
            })}
          </div>
        </details>
      </div>
    </section>
  );
}
