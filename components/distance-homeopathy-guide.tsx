import Image from "next/image";
import Link from "next/link";

import { LibraryBackLink } from "@/components/library-hub";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import type { PublicLocale } from "@/lib/public-locales";

import styles from "./distance-homeopathy-guide.module.css";

const copy = {
  ru: {
    title: "Дистанционная гомеопатия. Как проходит работа?",
    description: "Практическая памятка Андрея Литвинова о дистанционном формате работы с описаниями препаратов, фотографиями, наблюдениями и повторной проверкой.",
    kicker: "Практическая методичка",
    heading: "Дистанционная гомеопатия",
    subheading: "Как проходит работа?",
    lead: "Ниже — моя базовая схема: как я организую период наблюдения, работу с описаниями препаратов, фотографиями и дополнительными практиками.",
    safetyTitle: "Важно",
    safetyText: "Это описание моей авторской комплементарной практики, а не медицинская инструкция. Утверждения о «частотах», воздействии фотографий, мандал или кристаллов не подтверждены надёжными клиническими данными. Такой формат не заменяет диагностику, лекарства, неотложную помощь или рекомендации врача.",
    baseTitle: "Базовая схема работы с препаратами",
    baseIntro: "В моей авторской модели гомеопатические препараты рассматриваются как носители определённых качеств, с которыми человек сонастраивается и наблюдает свои изменения. Для одного цикла я обычно закладываю около двух недель, после чего полезно повторно посмотреть состояние и обновить схему.",
    optionOneTitle: "1. Принимать препарат внутрь",
    optionOneText: "В исходной рабочей схеме я часто использовал ориентир: 5 гранул 3 раза в день. Это не универсальная медицинская дозировка: конкретный продукт, состав и инструкция могут отличаться, поэтому ориентируйтесь на упаковку, фармацевта или специалиста, который знает вашу ситуацию.",
    optionTwoTitle: "2. Работать с фотографией препарата",
    optionTwoText: "В моей практике второй вариант — смотреть на фотографию препарата 3–4 раза в день как на фокус внимания и сонастройки. В исходной схеме я отмечаю, что основной момент этой практики — непосредственно просмотр фотографии. Субъективно я считаю этот формат близким по силе; приём внутрь иногда ощущался быстрее примерно на 30–50%. Это личное наблюдение, а не установленная медицинская эффективность.",
    photoTitle: "Как работать с фото",
    photoLead: "Здесь фотография используется как элемент ритуала внимания и наблюдения, а не как доказанный физиологический способ лечения.",
    photoSteps: [
      "Найдите или распечатайте своё фото.",
      "Распечатайте фотографии выбранных препаратов. Удобный размер одного фото — примерно с визитку.",
      "Вырежьте фотографии отдельно и распишитесь на лицевой стороне каждой.",
      "Наложите фотографии препаратов на личное фото и соедините их скрепками.",
      "Положите комплект на рабочий стол или носите с собой. Периодически возвращайте внимание к фотографии несколько раз в день.",
    ],
    observeTitle: "Когда делать повторную проверку",
    observeText: "Обычно через 1–2 недели можно снова оценить состояние, посмотреть, что изменилось, и при необходимости обновить подбор. Если физические симптомы заметно усиливаются или появляются тревожные признаки, не ждите контрольной даты — обратитесь за обычной медицинской оценкой.",
    advancedTitle: "Расширенный формат",
    advancedLead: "Если хочется сделать процесс более насыщенным, я добавляю несколько практик наблюдения и образной работы.",
    selfTitle: "А. Самостоятельно",
    selfItems: [
      { title: "Прочитать описание препаратов", text: "Не просто запомнить текст, а отметить, какие качества, образы и формулировки действительно откликаются." },
      { title: "Выполнить задания и ритуалы", text: "Использовать упражнения из карточек препарата для раскрытия архетипа, а затем прислать или записать свои наблюдения." },
      { title: "Добавить мандалу или изображение", text: "Можно поставить мандалу на заставку телефона или чаще возвращаться к фото препаратов как к фокусу внимания. В исходной схеме при обострении привычного симптома я предлагал коротко смотреть на фото примерно каждые 10 минут. Если физические симптомы усиливаются или появляются тревожные признаки, это не заменяет медицинскую помощь." },
      { title: "Ритуал со стаканом воды", text: "В моей практике встречается символический ритуал: поставить стакан воды на фотографии, добавить немного сахара, размешать, оставить на 10–20 минут и затем пить понемногу в течение дня. Это ритуальный элемент практики, а не доказанный способ «зарядить» воду или изменить её лечебные свойства." },
    ],
    sessionTitle: "Б. Расширенный формат сессии · около 1 часа",
    sessionItems: [
      { title: "Образная поддержка", text: "Картинки, мандалы и образы субличностей помогают сделать работу более глубокой и связать текущую реакцию с ранними стрессами и внутренними частями личности." },
      { title: "Дистанционная работа с кристаллами", text: "В моей системе кристаллы используются как символический и фокусирующий инструмент. Субъективно я иногда оценивал усиление эффекта примерно на 30–50%, но это не клинически подтверждённая величина." },
    ],
    finishTitle: "После цикла",
    finishText: "Через неделю-две мы можем сделать повторную проверку, сравнить изменения и обновить назначение или убрать то, что уже перестало быть актуальным.",
    remedies: "Открыть каталог препаратов",
    library: "Вернуться в библиотеку",
  },
  en: {
    title: "Distance homeopathy. How does the process work?",
    description: "Andy Litvinov’s practical guide to a remote format using remedy descriptions, photographs, observation, and a follow-up review.",
    kicker: "Practical guide",
    heading: "Distance homeopathy",
    subheading: "How does the process work?",
    lead: "This is the basic structure I use for a period of observation, work with remedy descriptions and images, and optional supporting practices.",
    safetyTitle: "Important",
    safetyText: "This page describes my complementary, author-developed practice, not a medical protocol. Claims about “frequencies,” photographs, mandalas, or crystals are not supported by reliable clinical evidence. This format does not replace diagnosis, prescribed medication, urgent care, or advice from a licensed clinician.",
    baseTitle: "Basic way of working with remedies",
    baseIntro: "In my own framework, homeopathic remedies are treated as carriers of certain qualities that a person reflects on and tries to integrate. I usually allow about two weeks for one observation cycle, then review what has changed and adjust the plan.",
    optionOneTitle: "1. Taking a remedy by mouth",
    optionOneText: "In my earlier working protocol I often used 5 pellets three times a day as a general reference. This is not a universal medical dose: products and instructions differ, so follow the product label and guidance from a pharmacist or clinician who knows your situation.",
    optionTwoTitle: "2. Working with a remedy photograph",
    optionTwoText: "A second option in my practice is to look at a remedy photograph 3–4 times a day as an attention and attunement exercise. In the original working scheme, the main moment of this practice is the act of viewing the photograph itself. Subjectively I have found this close in perceived strength, while oral use sometimes felt about 30–50% faster. That is a personal observation, not an established medical effect.",
    photoTitle: "How to work with the photographs",
    photoLead: "The photograph is used here as part of an attention ritual and self-observation, not as a proven physiological treatment.",
    photoSteps: [
      "Find or print a photograph of yourself.",
      "Print photographs of the selected remedies. A business-card size works well.",
      "Cut the photographs apart and sign the front of each one.",
      "Place the remedy photographs on top of your personal photograph and fasten them with paper clips.",
      "Keep the set on your desk or carry it with you. Return your attention to it periodically a few times a day.",
    ],
    observeTitle: "When to review",
    observeText: "After about 1–2 weeks, it can be useful to reassess your state, compare what changed, and update the selection. If physical symptoms worsen or warning signs appear, do not wait for the review date—seek ordinary medical assessment.",
    advancedTitle: "Extended format",
    advancedLead: "For a more intensive process, I add a few reflective and imagery-based practices.",
    selfTitle: "A. On your own",
    selfItems: [
      { title: "Read the remedy descriptions", text: "Notice which qualities, images, and phrases genuinely resonate rather than trying to memorise the text." },
      { title: "Do the exercises and rituals", text: "Use the tasks from the remedy profiles to explore the archetype, then write down or send me your observations." },
      { title: "Add a mandala or image", text: "You can use a mandala as your phone wallpaper or return to the remedy image more often as a focus of attention. In the original scheme, during a flare of a familiar symptom I suggested a brief look at the image about every 10 minutes. If physical symptoms worsen or warning signs appear, this is not a substitute for medical care." },
      { title: "Water-glass ritual", text: "My practice also includes a symbolic ritual: place a glass of water on the photographs, add a little sugar, stir, leave it for 10–20 minutes, then sip it through the day. This is a ritual element, not an evidence-based way to “charge” water or change its therapeutic properties." },
    ],
    sessionTitle: "B. Extended session format · about 1 hour",
    sessionItems: [
      { title: "Imagery support", text: "Images, mandalas, and subpersonality work can deepen the process and connect a current reaction with earlier stress and internal parts." },
      { title: "Remote work with crystals", text: "In my system, crystals are used as symbolic and focusing tools. I have sometimes subjectively estimated the effect as 30–50% stronger, but that figure is not clinically established." },
    ],
    finishTitle: "After the cycle",
    finishText: "After one to two weeks we can repeat the review, compare changes, and update the recommendation or remove what no longer appears relevant.",
    remedies: "Open remedy catalogue",
    library: "Back to Library",
  },
  es: {
    title: "Homeopatía a distancia. ¿Cómo funciona el proceso?",
    description: "Guía práctica de Andy Litvinov sobre un formato a distancia con descripciones de remedios, fotografías, observación y revisión posterior.",
    kicker: "Guía práctica",
    heading: "Homeopatía a distancia",
    subheading: "¿Cómo funciona el proceso?",
    lead: "Esta es la estructura básica que utilizo para un periodo de observación, trabajo con descripciones e imágenes de remedios y prácticas de apoyo opcionales.",
    safetyTitle: "Importante",
    safetyText: "Esta página describe una práctica complementaria y de autor, no un protocolo médico. Las afirmaciones sobre «frecuencias», fotografías, mandalas o cristales no están respaldadas por evidencia clínica fiable. Este formato no sustituye diagnóstico, medicación prescrita, atención urgente ni la recomendación de un profesional sanitario.",
    baseTitle: "Esquema básico de trabajo con remedios",
    baseIntro: "En mi propio marco, los remedios homeopáticos se contemplan como portadores de ciertas cualidades que la persona observa e intenta integrar. Suelo dejar unas dos semanas para un ciclo de observación y después revisamos qué ha cambiado.",
    optionOneTitle: "1. Tomar un remedio por vía oral",
    optionOneText: "En mi protocolo de trabajo anterior utilizaba a menudo 5 gránulos tres veces al día como referencia general. No es una dosis médica universal: los productos e instrucciones varían, así que sigue la etiqueta del producto y la orientación de un farmacéutico o profesional que conozca tu situación.",
    optionTwoTitle: "2. Trabajar con una fotografía del remedio",
    optionTwoText: "La segunda opción de mi práctica es mirar la fotografía de un remedio 3–4 veces al día como ejercicio de atención y sintonización. En el esquema original, el momento principal de esta práctica es el acto de mirar la fotografía. Subjetivamente lo he percibido como cercano en intensidad, mientras que el uso oral a veces se sentía un 30–50% más rápido. Es una observación personal, no un efecto médico establecido.",
    photoTitle: "Cómo trabajar con las fotografías",
    photoLead: "Aquí la fotografía forma parte de un ritual de atención y autoobservación, no de un tratamiento fisiológico demostrado.",
    photoSteps: [
      "Busca o imprime una fotografía tuya.",
      "Imprime fotografías de los remedios elegidos. Un tamaño parecido al de una tarjeta de visita resulta cómodo.",
      "Recorta las fotografías por separado y firma la cara frontal de cada una.",
      "Coloca las fotos de los remedios sobre tu foto personal y sujétalas con clips.",
      "Deja el conjunto en tu mesa o llévalo contigo. Vuelve a mirarlo periódicamente varias veces al día.",
    ],
    observeTitle: "Cuándo revisar",
    observeText: "Después de 1–2 semanas puede ser útil volver a evaluar el estado, comparar cambios y actualizar la selección. Si los síntomas físicos empeoran o aparecen señales de alarma, no esperes a la fecha de revisión: busca una evaluación médica habitual.",
    advancedTitle: "Formato ampliado",
    advancedLead: "Para un proceso más intenso añado algunas prácticas reflexivas y de trabajo con imágenes.",
    selfTitle: "A. Por tu cuenta",
    selfItems: [
      { title: "Leer las descripciones", text: "Observa qué cualidades, imágenes y frases realmente resuenan contigo." },
      { title: "Hacer ejercicios y rituales", text: "Utiliza las tareas de las fichas para explorar el arquetipo y después anota o envíame tus observaciones." },
      { title: "Añadir una mandala o imagen", text: "Puedes usar una mandala como fondo del teléfono o volver a la imagen del remedio con más frecuencia como foco de atención. En el esquema original, durante el empeoramiento de un síntoma habitual sugería mirar brevemente la imagen aproximadamente cada 10 minutos. Si empeoran los síntomas físicos o aparecen señales de alarma, esto no sustituye atención médica." },
      { title: "Ritual con un vaso de agua", text: "Mi práctica también incluye un ritual simbólico: colocar un vaso de agua sobre las fotografías, añadir un poco de azúcar, mezclar, dejarlo 10–20 minutos y beber poco a poco durante el día. Es un elemento ritual, no una forma demostrada de «cargar» el agua ni de cambiar sus propiedades terapéuticas." },
    ],
    sessionTitle: "B. Sesión ampliada · alrededor de 1 hora",
    sessionItems: [
      { title: "Apoyo con imágenes", text: "Imágenes, mandalas y trabajo con subpersonalidades pueden profundizar el proceso y relacionar una reacción actual con estrés temprano y partes internas." },
      { title: "Trabajo a distancia con cristales", text: "En mi sistema los cristales se utilizan como herramientas simbólicas y de focalización. En ocasiones he estimado subjetivamente un efecto 30–50% más intenso, pero esa cifra no está establecida clínicamente." },
    ],
    finishTitle: "Después del ciclo",
    finishText: "Tras una o dos semanas podemos repetir la revisión, comparar cambios y actualizar la recomendación o retirar lo que ya no parece relevante.",
    remedies: "Abrir catálogo de remedios",
    library: "Volver a Biblioteca",
  },
} as const;

export function distanceHomeopathyMetadata(locale: PublicLocale) {
  return {
    title: copy[locale].title,
    description: copy[locale].description,
  };
}

export function DistanceHomeopathyGuide({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];

  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <LibraryBackLink locale={locale} />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className="homeopathy-kicker">{text.kicker}</p>
          <h1>{text.heading}</h1>
          <h2>{text.subheading}</h2>
          <p className={styles.lead}>{text.lead}</p>
          <div className={styles.heroActions}>
            <Link className="hh-primary" href={`/${locale}/homeopathy/remedies`}>{text.remedies}</Link>
            <Link href={`/${locale}/library`}>{text.library}</Link>
          </div>
        </div>
        <div className={styles.heroImage}>
          <Image
            alt={locale === "ru" ? "Флаконы, стакан воды и фотографии на рабочем столе" : locale === "es" ? "Frascos, un vaso de agua y fotografías sobre una mesa" : "Remedy bottles, a glass of water, and photographs on a desk"}
            fill
            priority
            sizes="(max-width: 760px) 100vw, 46vw"
            src="/images/holistic-house/distance-homeopathy.webp"
          />
        </div>
      </section>

      <aside className={styles.safety}>
        <strong>{text.safetyTitle}</strong>
        <p>{text.safetyText}</p>
      </aside>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className="homeopathy-kicker">01</p>
          <h2>{text.baseTitle}</h2>
          <p>{text.baseIntro}</p>
        </div>

        <div className={styles.optionGrid}>
          <article>
            <span>01</span>
            <h3>{text.optionOneTitle}</h3>
            <p>{text.optionOneText}</p>
          </article>
          <article>
            <span>02</span>
            <h3>{text.optionTwoTitle}</h3>
            <p>{text.optionTwoText}</p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className="homeopathy-kicker">02</p>
          <h2>{text.photoTitle}</h2>
          <p>{text.photoLead}</p>
        </div>
        <ol className={styles.steps}>
          {text.photoSteps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
        <aside className={styles.review}>
          <h3>{text.observeTitle}</h3>
          <p>{text.observeText}</p>
        </aside>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className="homeopathy-kicker">03</p>
          <h2>{text.advancedTitle}</h2>
          <p>{text.advancedLead}</p>
        </div>

        <div className={styles.advancedBlock}>
          <h3>{text.selfTitle}</h3>
          <div className={styles.advancedGrid}>
            {text.selfItems.map((item, index) => (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.advancedBlock}>
          <h3>{text.sessionTitle}</h3>
          <div className={styles.sessionGrid}>
            {text.sessionItems.map((item) => (
              <article key={item.title}>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finish}>
        <div>
          <p className="homeopathy-kicker">04</p>
          <h2>{text.finishTitle}</h2>
          <p>{text.finishText}</p>
        </div>
        <Link className="hh-primary" href={`/${locale}/homeopathy/remedies`}>{text.remedies}</Link>
      </section>

      <PublicConsultationCta locale={locale} />
    </main>
  );
}
