import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicSiteHeader } from "@/components/public-site-header";
import { metadataBaseFor } from "@/data/site-metadata";
import type { PublicLocale } from "@/lib/public-locales";

type Props = { params: Promise<{ locale: string }> };

const miasmUpdate = {
  ru: {
    title: "Новая авторская заметка · миазмы × У-Син",
    lead: "В публикации 1072 автор переосмысливает миазмы как символическую карту глубинных защитных стратегий и сопоставляет их пяти стихиям.",
    items: [
      "Металл — сифилитическая динамика: разрушение структуры / поиск внутреннего стержня.",
      "Вода — псорическая динамика: истощение.",
      "Дерево — карциносная динамика: стыд, достоинство, желание нравиться.",
      "Огонь — туберкулиновая динамика: свобода, ограничения, воля и вина.",
      "Земля — сикотическая динамика: скрыть или проявиться, держать в себе или быть услышанным.",
    ],
    note: "Это авторская психообразовательная гипотеза, а не общепринятая медицинская классификация и не способ диагностики или лечения заболеваний.",
    source: "Открыть исходную публикацию 1072",
  },
  en: {
    title: "New author note · miasms × Wu Xing",
    lead: "In post 1072 the author reframes miasms as a symbolic map of deep protective strategies and relates them to the five elements.",
    items: [
      "Metal — syphilitic dynamic: breakdown of structure / search for an inner core.",
      "Water — psoric dynamic: depletion.",
      "Wood — carcinosin dynamic: shame, dignity and the wish to please.",
      "Fire — tubercular dynamic: freedom, restriction, will and guilt.",
      "Earth — sycotic dynamic: conceal or express, hold in or be heard.",
    ],
    note: "This is an author-developed psychoeducational hypothesis, not a standard medical classification and not a method for diagnosing or treating disease.",
    source: "Open source post 1072",
  },
  es: {
    title: "Nueva nota del autor · miasmas × Wu Xing",
    lead: "En la publicación 1072 el autor reinterpreta los miasmas como un mapa simbólico de estrategias protectoras profundas y los relaciona con los cinco elementos.",
    items: [
      "Metal — dinámica sifilítica: ruptura de estructura / búsqueda de eje interno.",
      "Agua — dinámica psórica: agotamiento.",
      "Madera — dinámica carcinosínica: vergüenza, dignidad y deseo de agradar.",
      "Fuego — dinámica tuberculínica: libertad, límites, voluntad y culpa.",
      "Tierra — dinámica sicótica: ocultar o expresar, contener o ser escuchado.",
    ],
    note: "Es una hipótesis psicoeducativa del autor, no una clasificación médica estándar ni un método de diagnóstico o tratamiento.",
    source: "Abrir publicación fuente 1072",
  },
} as const;

const copy = {
  en: {
    title: "Wu Xing Levels: how to read your personal profile",
    description: "A client guide to Andy Litvinov's five-elements, eight-phase Wu Xing profile.",
    kicker: "Guide to your personal Wu Xing diagnostic",
    heading: "Wu Xing Levels",
    lead: "A practical way to read your five-elements profile: not as a label, but as a map of current resource, compensation and the next realistic step.",
    sourceNote: "This guide consolidates Andy Litvinov's working texts “Dao Wu Xing”, “Wu Xing and Psychotherapy”, and later notes on gentle Wu Xing work.",
    introTitle: "Not “good or bad” — but where you are now",
    introText: "In this author-developed model, each element can be in a different phase. The purpose of a personal diagnostic is not simply to name a “weak element”, but to see how much of that function is available, how it is being held together, what supports it, and what one step of development is realistic now.",
    restoreTitle: "Phases 1–4 · Restore",
    restoreText: "First restore contact, reserve, regulation and a reliable base. Growth that outruns the base usually becomes another form of strain.",
    growTitle: "Phases 5–8 · Unfold",
    growText: "When a function is stable, the same element can become maturity, creativity, contribution and an integrated personal strength.",
    elementsTitle: "Five elements — five human functions",
    elementsLead: "The elements are read here as a cycle of psychological functions. A person may have a strong resource in one function and need support in another.",
    elements: [
      { symbol: "水", name: "Water", role: "Safety & support", development: "Birth · contact · receiving care", text: "Deep safety, trust, endurance and the ability to receive support. Core question: “I exist. Can I rely, receive care and stay in contact with myself?”" },
      { symbol: "木", name: "Wood", role: "Autonomy & movement", development: "Autonomy · will · action", text: "Impulse, desire, boundaries, growth and the capacity to act. Core question: “Can I want, separate, choose and move?”" },
      { symbol: "火", name: "Fire", role: "Feeling & expression", development: "Love · joy · manifestation", text: "Feelings, joy, love, openness and contact with others. Core question: “Can I feel, be seen and express what is alive in me?”" },
      { symbol: "土", name: "Earth", role: "Value & belonging", development: "Value · care · belonging", text: "Stability, care, practical grounding and being part of a group or relationship. Core question: “Do I matter, and can I belong without losing myself?”" },
      { symbol: "金", name: "Metal", role: "Identity & form", development: "Identity · structure · completion", text: "Clarity, boundaries, identity, completion and letting go. Core question: “Who am I? What is mine? What needs a clear form or an ending?”" },
    ],
    phasesTitle: "Eight phases of resource",
    phasesLead: "The phase matters more than a single score. It describes how available and integrated a function feels right now.",
    phases: [
      { name: "Freeze", text: "Resource is organised around basic safety: withdrawal, constriction or shutting down. The task is not achievement; it is restoring minimal contact and support." },
      { name: "Depletion", text: "Energy and initiative are low. The next step is replenishment and permission to recover rather than forcing a breakthrough." },
      { name: "Hypercontrol", text: "The function is maintained through effort, tension or excessive control. The task is to add regulation, flexibility and less costly stability." },
      { name: "Balance / support", text: "A reliable base appears: more clarity, contact and recovery. This is the foundation from which genuine growth becomes possible." },
      { name: "Bloom / maturity", text: "The function is sufficiently resourced to move outward into relationships, work, creativity and sustained expression." },
      { name: "Flow / charisma", text: "The quality moves more freely and can become creativity, influence and aliveness. Direction and grounding still matter." },
      { name: "Guide / purpose", text: "A mature function starts to become contribution, mastery and meaningful service — while remaining rooted in a personal base." },
      { name: "Gift / integration", text: "The quality feels natural and deeply integrated: less about proving strength, more about freely using it when life calls for it." },
    ],
    methodTitle: "How I read a personal profile",
    methodLead: "A useful profile is a sequence, not a verdict.",
    method: [
      { title: "1. Find the current phase", text: "First ask how the element functions now: shut down, depleted, held by effort, stable, or already unfolding." },
      { title: "2. Do not attack the weakest element", text: "A low element is not a defect to push harder. Direct activation can create more strain when the base is not ready." },
      { title: "3. Look for the nourishing function", text: "In the Wu Xing generating cycle, support often comes from the preceding element. For example, when Wood lacks movement, Water — personal support and reserve — may need attention first." },
      { title: "4. Move one sustainable step", text: "The working formula is: identify the phase → find support → add the smallest useful resource → move one phase forward → stabilise." },
      { title: "5. Read the whole circle", text: "A strong element can be a resource, a weak one can be a request for support, and an apparently strong element can sometimes be expensive compensation. The pattern matters more than one number." },
    ],
    reportTitle: "Use this page next to your personal report",
    reportText: "When you receive your Wu Xing profile, read it in three passes: which element is the main resource, which function is asking for support, and what the next phase — not the final ideal — looks like. This keeps the work gentle and measurable.",
    resourceLabel: "Resource",
    requestLabel: "Support request",
    nextLabel: "Next phase",
    resourceText: "What is already available and can support the rest of the system.",
    requestText: "Where effort is costly, reserve is low, or the function is hard to access.",
    nextText: "One realistic developmental task to practise and observe before adding more.",
    ctaTitle: "Want a personal Wu Xing profile?",
    ctaText: "The diagnostic is an individual interpretation of the five elements and their current phases. Bring your report back to this guide whenever you want to understand the logic behind the result.",
    ctaPrimary: "Order personal Wu Xing diagnostic",
    ctaSecondary: "Open Mind–Body Monitor",
    note: "This is an author-developed self-reflection and psychoeducational framework. It is not a medical diagnosis, does not assess organ disease, and does not replace medical or mental-health care.",
  },
  ru: {
    title: "Уровни У-Син: как читать личный профиль",
    description: "Клиентская методичка по пяти стихиям и восьми фазам ресурса в авторской модели У-Син Андрея Литвинова.",
    kicker: "Методичка к персональной диагностике У-Син",
    heading: "Уровни У-Син",
    lead: "Как читать свой профиль по пяти стихиям: не как ярлык, а как карту текущего ресурса, компенсаций и следующего реалистичного шага.",
    sourceNote: "Методичка собрана из рабочих текстов Андрея Литвинова «ДАО УСИН», «УСИН и ПСИХОТЕРАПИЯ» и более поздних заметок о мягкой работе с У-Син.",
    introTitle: "Не «хорошо / плохо», а где вы сейчас",
    introText: "В этой авторской модели каждая стихия может находиться на своей фазе. Поэтому задача персональной диагностики — не просто назвать «слабую стихию», а увидеть, насколько доступна эта функция, за счёт чего она держится, что её питает и какой следующий шаг сейчас действительно можно встроить.",
    restoreTitle: "Фазы 1–4 · Восстановление",
    restoreText: "Сначала возвращаем контакт, запас ресурса, регуляцию и опору. Рост, который обгоняет базу, часто превращается в новое напряжение.",
    growTitle: "Фазы 5–8 · Раскрытие",
    growText: "Когда функция уже устойчива, та же стихия может проявляться как зрелость, творчество, вклад и интегрированная сильная сторона.",
    elementsTitle: "Пять стихий — пять функций личности",
    elementsLead: "Здесь стихии читаются как цикл психических функций. В одной функции у человека может быть хороший ресурс, а другая в это же время может нуждаться в поддержке.",
    elements: [
      { symbol: "水", name: "Вода", role: "Безопасность и опора", development: "Рождение · контакт · принятие заботы", text: "Глубинная безопасность, доверие, выдержка и способность принимать поддержку. Главный вопрос: «Я есть. Могу ли я опираться, принимать заботу и оставаться в контакте с собой?»" },
      { symbol: "木", name: "Дерево", role: "Автономия и движение", development: "Автономия · воля · действие", text: "Импульс, желание, границы, рост и способность действовать. Главный вопрос: «Могу ли я хотеть, отделяться, выбирать и двигаться?»" },
      { symbol: "火", name: "Огонь", role: "Чувства и проявленность", development: "Любовь · радость · проявление", text: "Чувства, радость, любовь, открытость и контакт с другими. Главный вопрос: «Могу ли я чувствовать, быть видимым и проявлять то, что во мне живо?»" },
      { symbol: "土", name: "Земля", role: "Ценность и принадлежность", development: "Ценность · забота · принадлежность", text: "Стабильность, забота, практическая опора и место в отношениях или группе. Главный вопрос: «Я важен? Могу ли я принадлежать, не теряя себя?»" },
      { symbol: "金", name: "Металл", role: "Идентичность и форма", development: "Идентичность · структура · завершение", text: "Ясность, границы, идентичность, завершение и отпускание. Главный вопрос: «Кто я? Что моё? Чему нужна ясная форма, а что пора завершить?»" },
    ],
    phasesTitle: "Восемь фаз ресурса",
    phasesLead: "Фаза важнее отдельной цифры. Она показывает, насколько функция сейчас доступна и встроена в жизнь.",
    phases: [
      { name: "Заморозка", text: "Ресурс организован вокруг базовой безопасности: сжатие, замирание, уход внутрь. Задача — не достижение, а возвращение минимального контакта и опоры." },
      { name: "Истощение", text: "Энергии и импульса мало. Следующий шаг — восполнение и разрешение восстанавливаться, а не требование от себя рывка." },
      { name: "Гиперконтроль", text: "Функция держится усилием, напряжением или чрезмерным контролем. Задача — добавить регуляцию, гибкость и менее затратную устойчивость." },
      { name: "Баланс / опора", text: "Появляется надёжная база: больше ясности, контакта и восстановления. С этого уровня настоящий рост становится безопаснее." },
      { name: "Расцвет / зрелость", text: "Ресурса уже достаточно, чтобы функция выходила наружу — в отношения, работу, творчество и устойчивое проявление." },
      { name: "Поток / харизма", text: "Качество стихии движется свободнее и может становиться творчеством, влиянием и живостью. При этом всё ещё важны направление и основание." },
      { name: "Проводник / предназначение", text: "Зрелая функция начинает становиться вкладом, мастерством и служением смыслу — при сохранении собственной опоры." },
      { name: "Дар / интеграция", text: "Качество становится естественным и глубоко встроенным: меньше необходимости доказывать силу, больше свободы пользоваться ею тогда, когда она нужна." },
    ],
    methodTitle: "Как я читаю персональный профиль",
    methodLead: "Полезная диагностика — это последовательность, а не приговор.",
    method: [
      { title: "1. Сначала определяем фазу", text: "Смотрим, как функция работает сейчас: выключена, истощена, держится усилием, стала устойчивой или уже раскрывается." },
      { title: "2. Не идём в лоб в самую слабую стихию", text: "Низкий показатель — не дефект, который надо сильнее «качать». Прямая активация может добавить напряжение, если база ещё не готова." },
      { title: "3. Ищем питающую функцию", text: "В порождающем круге У-Син поддержка часто приходит через предыдущую стихию. Например, если Дереву не хватает движения, сначала может понадобиться Вода — личная опора и запас." },
      { title: "4. Поднимаемся на один устойчивый шаг", text: "Рабочая формула: определить фазу → найти опору → добавить минимально достаточный ресурс → перейти на следующую фазу → стабилизировать." },
      { title: "5. Читаем весь круг, а не одну цифру", text: "Сильная стихия может быть ресурсом, слабая — просьбой о поддержке, а внешне сильная иногда оказывается дорогой компенсацией. Важен рисунок целиком." },
    ],
    reportTitle: "Читайте эту страницу рядом со своим отчётом",
    reportText: "Получив профиль У-Син, пройдите его в три шага: какая стихия сейчас является ресурсом, какая функция просит поддержки и как выглядит именно следующая фаза — не далёкий идеал. Так работа остаётся мягкой и наблюдаемой.",
    resourceLabel: "Ресурс",
    requestLabel: "Запрос на поддержку",
    nextLabel: "Следующая фаза",
    resourceText: "Что уже доступно и может поддерживать остальные части системы.",
    requestText: "Где устойчивость стоит дорого, запас мал или функцию трудно свободно использовать.",
    nextText: "Одна реалистичная задача развития, которую стоит встроить и понаблюдать до следующего шага.",
    ctaTitle: "Хотите получить личный профиль У-Син?",
    ctaText: "Персональная диагностика — это индивидуальное чтение пяти стихий и их текущих фаз. После получения отчёта возвращайтесь к этой методичке, чтобы понимать логику результата.",
    ctaPrimary: "Заказать персональную диагностику У-Син",
    ctaSecondary: "Открыть монитор состояния",
    note: "Это авторская модель самонаблюдения и психообразования. Она не является медицинской диагностикой, не оценивает заболевания органов и не заменяет врача, психотерапию или экстренную помощь.",
  },
  es: {
    title: "Niveles Wu Xing: cómo leer tu perfil personal",
    description: "Guía para clientes sobre cinco elementos y ocho fases de recurso en el modelo Wu Xing de Andy Litvinov.",
    kicker: "Guía para tu diagnóstico personal Wu Xing",
    heading: "Niveles Wu Xing",
    lead: "Una forma práctica de leer tu perfil de cinco elementos: no como una etiqueta, sino como un mapa del recurso actual, la compensación y el siguiente paso realista.",
    sourceNote: "Esta guía reúne textos de trabajo de Andy Litvinov sobre Dao Wu Xing, Wu Xing y psicoterapia, y notas posteriores sobre un enfoque gradual y suave.",
    introTitle: "No “bien o mal”, sino dónde estás ahora",
    introText: "En este modelo de autor, cada elemento puede encontrarse en una fase distinta. La finalidad no es nombrar un “elemento débil”, sino observar cuánta función está disponible, cómo se sostiene, qué la nutre y qué siguiente paso puede integrarse ahora.",
    restoreTitle: "Fases 1–4 · Restaurar",
    restoreText: "Primero se recuperan contacto, reserva, regulación y una base fiable. El crecimiento que supera la base suele convertirse en más tensión.",
    growTitle: "Fases 5–8 · Desplegar",
    growText: "Cuando una función es estable, el mismo elemento puede convertirse en madurez, creatividad, contribución y fortaleza integrada.",
    elementsTitle: "Cinco elementos — cinco funciones humanas",
    elementsLead: "Aquí los elementos se leen como un ciclo de funciones psicológicas. Puede haber buen recurso en una función y necesidad de apoyo en otra.",
    elements: [
      { symbol: "水", name: "Agua", role: "Seguridad y apoyo", development: "Nacimiento · contacto · recibir cuidado", text: "Seguridad profunda, confianza, resistencia y capacidad de recibir apoyo. Pregunta central: “Existo. ¿Puedo apoyarme, recibir cuidado y seguir en contacto conmigo?”" },
      { symbol: "木", name: "Madera", role: "Autonomía y movimiento", development: "Autonomía · voluntad · acción", text: "Impulso, deseo, límites, crecimiento y capacidad de actuar. Pregunta central: “¿Puedo querer, separarme, elegir y moverme?”" },
      { symbol: "火", name: "Fuego", role: "Sentir y expresarse", development: "Amor · alegría · expresión", text: "Sentimientos, alegría, amor, apertura y contacto. Pregunta central: “¿Puedo sentir, ser visto y expresar lo que está vivo en mí?”" },
      { symbol: "土", name: "Tierra", role: "Valor y pertenencia", development: "Valor · cuidado · pertenencia", text: "Estabilidad, cuidado, arraigo práctico y pertenencia. Pregunta central: “¿Importo y puedo pertenecer sin perderme?”" },
      { symbol: "金", name: "Metal", role: "Identidad y forma", development: "Identidad · estructura · cierre", text: "Claridad, límites, identidad, cierre y capacidad de soltar. Pregunta central: “¿Quién soy? ¿Qué es mío? ¿Qué necesita forma o un final?”" },
    ],
    phasesTitle: "Ocho fases de recurso",
    phasesLead: "La fase importa más que una cifra aislada. Describe cuán disponible e integrada está una función en este momento.",
    phases: [
      { name: "Congelación", text: "El recurso se organiza alrededor de la seguridad básica: retirada, contracción o bloqueo. La tarea es recuperar contacto y apoyo mínimos." },
      { name: "Agotamiento", text: "Hay poca energía e iniciativa. El siguiente paso es reponer y permitir recuperación, no forzar un salto." },
      { name: "Hipercontrol", text: "La función se sostiene con esfuerzo, tensión o control excesivo. La tarea es sumar regulación, flexibilidad y estabilidad menos costosa." },
      { name: "Equilibrio / apoyo", text: "Aparece una base fiable: más claridad, contacto y recuperación. Desde aquí el crecimiento puede ser más auténtico." },
      { name: "Floración / madurez", text: "Hay suficiente recurso para llevar la función hacia relaciones, trabajo, creatividad y expresión sostenida." },
      { name: "Flujo / carisma", text: "La cualidad circula con mayor libertad y puede convertirse en creatividad, influencia y vitalidad. Aún importan dirección y base." },
      { name: "Guía / propósito", text: "La función madura empieza a convertirse en contribución, maestría y servicio con sentido, sin perder la base personal." },
      { name: "Don / integración", text: "La cualidad se vuelve natural e integrada: menos necesidad de demostrar fuerza y más libertad para utilizarla cuando hace falta." },
    ],
    methodTitle: "Cómo leo un perfil personal",
    methodLead: "Un perfil útil es una secuencia, no un veredicto.",
    method: [
      { title: "1. Encontrar la fase actual", text: "Primero vemos si la función está bloqueada, agotada, sostenida por esfuerzo, estable o ya desplegándose." },
      { title: "2. No atacar el elemento más bajo", text: "Un valor bajo no es un defecto que deba empujarse. La activación directa puede añadir tensión si la base aún no está lista." },
      { title: "3. Buscar la función que nutre", text: "En el ciclo generador de Wu Xing, el apoyo suele venir del elemento anterior. Si a Madera le falta movimiento, Agua — apoyo y reserva — puede necesitar atención primero." },
      { title: "4. Avanzar un paso sostenible", text: "Fórmula de trabajo: identificar la fase → encontrar apoyo → añadir el recurso mínimo útil → avanzar una fase → estabilizar." },
      { title: "5. Leer el círculo completo", text: "Un elemento fuerte puede ser recurso, uno bajo puede pedir apoyo y una aparente fortaleza puede ser compensación costosa. Importa el patrón completo." },
    ],
    reportTitle: "Usa esta página junto a tu informe personal",
    reportText: "Al recibir tu perfil, haz tres lecturas: qué elemento es recurso, qué función pide apoyo y cómo se ve la siguiente fase — no el ideal final. Así el proceso sigue siendo suave y observable.",
    resourceLabel: "Recurso",
    requestLabel: "Necesidad de apoyo",
    nextLabel: "Siguiente fase",
    resourceText: "Lo que ya está disponible y puede sostener al resto del sistema.",
    requestText: "Dónde la estabilidad cuesta demasiado, la reserva es baja o la función no está libremente disponible.",
    nextText: "Una tarea realista de desarrollo para integrar y observar antes de añadir más.",
    ctaTitle: "¿Quieres un perfil personal Wu Xing?",
    ctaText: "El diagnóstico es una interpretación individual de los cinco elementos y sus fases actuales. Vuelve a esta guía con tu informe para comprender la lógica del resultado.",
    ctaPrimary: "Solicitar diagnóstico personal Wu Xing",
    ctaSecondary: "Abrir monitor mente–cuerpo",
    note: "Es un marco de autor para autoobservación y psicoeducación. No es un diagnóstico médico, no evalúa enfermedades de órganos y no sustituye atención médica o de salud mental.",
  },
} as const;

function isLocale(value: string): value is PublicLocale {
  return value === "en" || value === "ru" || value === "es";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return { title: "Not found" };
  const text = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: `${text.title} — Holistic House`,
    description: text.description,
    alternates: {
      canonical: `/${locale}/wu-xing`,
      languages: { en: "/en/wu-xing", ru: "/ru/wu-xing", es: "/es/wu-xing" },
    },
  };
}

export default async function WuXingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const text = copy[locale];

  return (
    <main className="wu-xing-guide" lang={locale}>
      <PublicSiteHeader locale={locale} />

      <section className="wu-xing-guide__hero">
        <p className="homeopathy-kicker">{text.kicker}</p>
        <h1>{text.heading}</h1>
        <p className="wu-xing-guide__lead">{text.lead}</p>
        <p className="wu-xing-guide__source">{text.sourceNote}</p>
        <div className="wu-xing-guide__actions">
          <Link className="hh-primary" href={`/${locale}/services#available-services`}>{text.ctaPrimary}</Link>
          <Link href={`/${locale}/client#cabinet-tests`}>{text.ctaSecondary}</Link>
        </div>
      </section>

      <section className="wu-xing-guide__section wu-xing-guide__intro">
        <div className="wu-xing-guide__section-heading">
          <h2>{text.introTitle}</h2>
          <p>{text.introText}</p>
        </div>
        <div className="wu-xing-guide__zones">
          <article>
            <span>1–4</span>
            <h3>{text.restoreTitle}</h3>
            <p>{text.restoreText}</p>
          </article>
          <article>
            <span>5–8</span>
            <h3>{text.growTitle}</h3>
            <p>{text.growText}</p>
          </article>
        </div>
      </section>

      <section className="wu-xing-guide__section" id="elements">
        <div className="wu-xing-guide__section-heading">
          <h2>{text.elementsTitle}</h2>
          <p>{text.elementsLead}</p>
        </div>
        <div className="wu-xing-guide__elements">
          {text.elements.map((element) => (
            <article className="wu-xing-guide__element" key={element.name}>
              <div className="wu-xing-guide__element-symbol" aria-hidden="true">{element.symbol}</div>
              <div>
                <p className="wu-xing-guide__eyebrow">{element.role}</p>
                <h3>{element.name}</h3>
                <p className="wu-xing-guide__development">{element.development}</p>
                <p>{element.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wu-xing-guide__section" id="phases">
        <div className="wu-xing-guide__section-heading">
          <h2>{text.phasesTitle}</h2>
          <p>{text.phasesLead}</p>
        </div>
        <div className="wu-xing-guide__phases">
          {text.phases.map((phase, index) => (
            <article className="wu-xing-guide__phase" key={phase.name}>
              <span className="wu-xing-guide__phase-number">{index + 1}</span>
              <div>
                <h3>{phase.name}</h3>
                <p>{phase.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wu-xing-guide__section wu-xing-guide__method" id="method">
        <div className="wu-xing-guide__section-heading">
          <h2>{text.methodTitle}</h2>
          <p>{text.methodLead}</p>
        </div>
        <div className="wu-xing-guide__method-list">
          {text.method.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wu-xing-guide__section wu-xing-guide__miasm-update">
        <div className="wu-xing-guide__section-heading">
          <h2>{miasmUpdate[locale].title}</h2>
          <p>{miasmUpdate[locale].lead}</p>
        </div>
        <div className="wu-xing-guide__method-list">
          {miasmUpdate[locale].items.map((item) => <article key={item}><p>{item}</p></article>)}
        </div>
        <p className="wu-xing-guide__note">{miasmUpdate[locale].note}</p>
        <p><a href="https://t.me/psychic_alchemy/1072" rel="noreferrer" target="_blank">{miasmUpdate[locale].source} ↗</a></p>
      </section>

      <section className="wu-xing-guide__section wu-xing-guide__report">
        <div className="wu-xing-guide__section-heading">
          <h2>{text.reportTitle}</h2>
          <p>{text.reportText}</p>
        </div>
        <div className="wu-xing-guide__report-grid">
          <article><strong>{text.resourceLabel}</strong><p>{text.resourceText}</p></article>
          <article><strong>{text.requestLabel}</strong><p>{text.requestText}</p></article>
          <article><strong>{text.nextLabel}</strong><p>{text.nextText}</p></article>
        </div>
      </section>

      <section className="wu-xing-guide__cta">
        <div>
          <p className="homeopathy-kicker">{text.kicker}</p>
          <h2>{text.ctaTitle}</h2>
          <p>{text.ctaText}</p>
        </div>
        <div className="wu-xing-guide__actions">
          <Link className="hh-primary" href={`/${locale}/services#available-services`}>{text.ctaPrimary}</Link>
          <Link href={`/${locale}/client#cabinet-tests`}>{text.ctaSecondary}</Link>
        </div>
      </section>

      <p className="wu-xing-guide__note">{text.note}</p>
    </main>
  );
}
