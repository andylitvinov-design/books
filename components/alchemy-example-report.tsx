import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./alchemy-example-report.module.css";

/** A fictional example only. Never read private report or assessment data here. */
const copy = {
  en: {
    kicker: "SAMPLE · FICTIONAL CLIENT SCENARIO",
    title: "A clearer question. A map. One next step.",
    intro: "This illustrates how a reflective session summary might be structured. It is not a real client's record, a medical report or an automatically included deliverable.",
    labels: {question:"Starting question",mapping:"1 · Situation analysis",constellation:"2 · Systemic constellation",imagery:"3 · Guided imagery",homeopathy:"4 · Optional psycho-homeopathy",plan:"Practical next steps"},
    question: "I want to explain an important decision without becoming silent when someone disagrees.",
    mapping: "We name the decision, your goal, the people involved and the moment where the conversation feels hard.",
    constellation: "In a symbolic exercise, we compare your role today with the role you want to take. One possible hypothesis: another person's expectations overshadow your own.",
    imagery: "In a voluntary imagery exercise, you imagine a stable place and practise a shorter, calmer response. The image is a subjective resource, not proof of hidden events.",
    homeopathy: "Not necessary for this example. If requested, homeopathic themes may be discussed symbolically; there is no reliable evidence they accelerate counselling or treat illness.",
    steps: ["Write the decision in one sentence.", "Rehearse one respectful boundary with a trusted person.", "Notice whether it was easier to speak; review the result next time."],
    footer: "Individual sessions differ. We agree the scope and whether written notes are supplied. No guaranteed results or diagnosis; continue prescribed care with your clinician.",
    back: "Back to Psychic Alchemy",
    request: "Ask about a personal session",
    visualAlt: "Sea and lighthouse illustrating a clear direction",
  },
  ru: {
    kicker: "ОБРАЗЕЦ · ВЫМЫШЛЕННАЯ СИТУАЦИЯ",
    title: "Ясный запрос. Карта ситуации. Реальный шаг.",
    intro: "Так может выглядеть краткое резюме работы. Это не реальные сведения клиента, не медицинское заключение и не автоматически включённый документ.",
    labels: {question:"Исходный запрос",mapping:"1 · Диагностика ситуации",constellation:"2 · Системная расстановка",imagery:"3 · Образная гипнотерапия",homeopathy:"4 · Дополнительная психогомеопатия",plan:"Практические шаги"},
    question: "Хочу спокойно озвучить важное решение, даже если кто-то со мной не согласен.",
    mapping: "Обозначаем решение, цель, участников и момент, в котором говорить особенно трудно.",
    constellation: "В символической расстановке смотрим на текущую и желаемую роль. Возможная гипотеза: ожидания других заслоняют собственное решение.",
    imagery: "В добровольной образной практике ищем ощущение опоры и репетируем короткий спокойный ответ. Образ — субъективный ресурс, а не доказательство скрытых событий.",
    homeopathy: "В примере не требуется. По желанию можно обсудить гомеопатические образы символически; доказанного ускорения работы или лечения заболеваний нет.",
    steps: ["Сформулировать решение одной фразой.", "Проговорить спокойную границу с доверенным человеком.", "Отметить, насколько стало легче говорить, и обсудить опыт при следующей встрече."],
    footer: "Реальные сессии различаются. Наличие письменных заметок согласуется отдельно. Не является диагнозом или обещанием результата; назначенное лечение согласуйте с врачом.",
    back: "Вернуться к Алхимии души",
    request: "Обсудить личную сессию",
    visualAlt: "Море и маяк как символ ясного направления",
  },
  es: {
    kicker: "EJEMPLO · SITUACIÓN FICTICIA",
    title: "Una pregunta clara. Un mapa. Un paso posible.",
    intro: "Ejemplo de notas de una sesión reflexiva. No es un expediente real, informe médico ni documento incluido automáticamente.",
    labels: {question:"Pregunta inicial",mapping:"1 · Diagnóstico de la situación",constellation:"2 · Constelación sistémica",imagery:"3 · Imágenes guiadas",homeopathy:"4 · Psicohomeopatía opcional",plan:"Próximos pasos"},
    question: "Quiero expresar una decisión importante incluso cuando otras personas no están de acuerdo.",
    mapping: "Aclaramos la decisión, el objetivo, las personas implicadas y el momento en que resulta difícil hablar.",
    constellation: "En un mapa simbólico exploramos el papel actual y el deseado. Hipótesis posible: las expectativas ajenas eclipsan la decisión propia.",
    imagery: "Con consentimiento usamos una imagen de apoyo y practicamos una respuesta más calmada. La imagen no prueba hechos ocultos.",
    homeopathy: "No es necesaria. Puede explorarse simbólicamente si se desea, sin pruebas fiables de acelerar la terapia o tratar enfermedades.",
    steps: ["Escribir la decisión en una frase.", "Ensayar un límite respetuoso con alguien de confianza.", "Observar la experiencia y comentarla en la próxima sesión."],
    footer: "Cada sesión es diferente. Las notas escritas se acuerdan aparte. No es diagnóstico ni promesa de resultados; no modifiques tratamientos sin tu médico.",
    back: "Volver a Alquimia del Alma",
    request: "Consultar una sesión personal",
    visualAlt: "Mar y faro que simbolizan una dirección clara",
  },
} as const;

export function AlchemyExampleReport({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const back = "/" + locale + "/services/alchemy-of-soul";
  const items = [
    {key: t.labels.mapping, text: t.mapping},
    {key: t.labels.constellation, text: t.constellation},
    {key: t.labels.imagery, text: t.imagery},
    {key: t.labels.homeopathy, text: t.homeopathy},
  ];
  return <main className={styles.page} lang={locale} data-alchemy-example-report="fictional">
    <div className={styles.shell}>
      <Link className={styles.back} href={back}><ArrowLeft size={16} aria-hidden="true" />{t.back}</Link>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>{t.kicker}</p>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
        <div className={styles.photo}><Image src="/images/holistic-house/report-lighthouse-coast.avif" alt={t.visualAlt} fill sizes="(max-width:700px) 100vw, 42vw" /></div>
      </header>
      <article className={styles.paper}>
        <div className={styles.question}><span>{t.labels.question}</span><p>{t.question}</p></div>
        <div className={styles.stages}>
          {items.map((item)=><section key={item.key}><h2>{item.key}</h2><p>{item.text}</p></section>)}
        </div>
        <section className={styles.next}>
          <h2>{t.labels.plan}</h2>
          <ol>{t.steps.map(step=><li key={step}><CheckCircle2 size={18} aria-hidden="true" />{step}</li>)}</ol>
        </section>
      </article>
      <p className={styles.disclosure}><ShieldCheck size={17} aria-hidden="true" />{t.footer}</p>
      <Link className={styles.cta} href={back + "#alchemy-request"}>{t.request}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
  </main>;
}
