"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Sparkles } from "lucide-react";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./temple-initiation-chooser.module.css";

type Localized = Record<PublicLocale, string>;
type Deity = { id: string; name: Localized; quality: Localized };
type TraditionId = "greek" | "roman" | "egyptian" | "norse" | "slavic" | "other";
type Tradition = { id: TraditionId; name: Localized; deities: Deity[] };
type FormatId = "meditation" | "personal" | "group";
const text = (en: string, ru: string, es: string): Localized => ({ en, ru, es });

const traditions: Tradition[] = [
  {
    id: "greek", name: text("Greek", "Греческая", "Griega"), deities: [
      { id: "aphrodite", name: text("Aphrodite", "Афродита", "Afrodita"), quality: text("Love & self-worth", "Любовь и самоценность", "Amor y autoestima") },
      { id: "dionysus", name: text("Dionysus", "Дионис", "Dioniso"), quality: text("Vitality & freedom", "Жизненность и свобода", "Vitalidad y libertad") },
      { id: "demeter", name: text("Demeter", "Деметра", "Deméter"), quality: text("Care & belonging", "Забота и принадлежность", "Cuidado y pertenencia") },
      { id: "athena", name: text("Athena", "Афина", "Atenea"), quality: text("Clarity & strategy", "Ясность и стратегия", "Claridad y estrategia") },
    ],
  },
  {
    id: "roman", name: text("Roman", "Римская", "Romana"), deities: [
      { id: "venus", name: text("Venus", "Венера", "Venus"), quality: text("Love & beauty", "Любовь и красота", "Amor y belleza") },
      { id: "mars", name: text("Mars", "Марс", "Marte"), quality: text("Courage & action", "Смелость и действие", "Valor y acción") },
      { id: "minerva", name: text("Minerva", "Минерва", "Minerva"), quality: text("Wisdom & discernment", "Мудрость и различение", "Sabiduría y discernimiento") },
      { id: "diana", name: text("Diana", "Диана", "Diana"), quality: text("Independence & boundaries", "Независимость и границы", "Autonomía y límites") },
    ],
  },
  {
    id: "egyptian", name: text("Egyptian", "Египетская", "Egipcia"), deities: [
      { id: "isis", name: text("Isis", "Исида", "Isis"), quality: text("Restoration & care", "Восстановление и забота", "Renovación y cuidado") },
      { id: "osiris", name: text("Osiris", "Осирис", "Osiris"), quality: text("Transition & renewal", "Переход и обновление", "Transición y renovación") },
      { id: "thoth", name: text("Thoth", "Тот", "Thot"), quality: text("Knowledge & expression", "Знание и выражение", "Conocimiento y expresión") },
      { id: "horus", name: text("Horus", "Гор", "Horus"), quality: text("Vision & direction", "Видение и направление", "Visión y dirección") },
    ],
  },
  {
    id: "norse", name: text("Norse", "Скандинавская", "Nórdica"), deities: [
      { id: "odin", name: text("Odin", "Один", "Odín"), quality: text("Wisdom & inner search", "Мудрость и внутренний поиск", "Sabiduría y búsqueda interior") },
      { id: "freyja", name: text("Freyja", "Фрейя", "Freyja"), quality: text("Desire & sovereignty", "Желание и суверенность", "Deseo y autonomía") },
      { id: "thor", name: text("Thor", "Тор", "Thor"), quality: text("Strength & protection", "Сила и защита", "Fuerza y protección") },
      { id: "frigg", name: text("Frigg", "Фригг", "Frigg"), quality: text("Connection & foresight", "Связи и предвидение", "Vínculos y previsión") },
    ],
  },
  {
    id: "slavic", name: text("Slavic", "Славянская", "Eslava"), deities: [
      { id: "perun", name: text("Perun", "Перун", "Perún"), quality: text("Courage & resolve", "Смелость и решимость", "Valentía y decisión") },
      { id: "veles", name: text("Veles", "Велес", "Veles"), quality: text("Thresholds & intuition", "Переходы и интуиция", "Umbrales e intuición") },
      { id: "mokosh", name: text("Mokosh", "Мокошь", "Mokosh"), quality: text("Earth & nurturing", "Земля и забота", "Tierra y cuidado") },
    ],
  },
  { id: "other", name: text("Another tradition", "Другая традиция", "Otra tradición"), deities: [] },
];

const formats: { id: FormatId; title: Localized; description: Localized }[] = [
  {
    id: "meditation",
    title: text("Meditation–initiation", "Медитация-инициация", "Meditación–iniciación"),
    description: text(
      "Guided imagery and a symbolic entry into the chosen deity's channel.",
      "Медитация и символическое вхождение в выбранный канал божества.",
      "Visualización guiada y entrada simbólica al canal de la deidad elegida.",
    ),
  },
  {
    id: "personal",
    title: text("Personal Mystery Constellation", "Личная мистерия-расстановка", "Misterio-constelación personal"),
    description: text(
      "A one-to-one archetypal constellation exploring your question through this channel.",
      "Индивидуальная архетипическая расстановка по вашему запросу через этот канал.",
      "Constelación arquetípica individual para explorar tu pregunta a través de este canal.",
    ),
  },
  {
    id: "group",
    title: text("Group Mystery Constellation", "Групповая мистерия-расстановка", "Misterio-constelación grupal"),
    description: text(
      "A facilitated group mystery exploring the archetype through shared roles and experience.",
      "Групповая мистерия с исследованием архетипа через роли и общий опыт.",
      "Misterio grupal guiado con roles y experiencias compartidas para explorar el arquetipo.",
    ),
  },
];

const copy = {
  en: {
    eyebrow: "YOUR PATH · 3 SIMPLE CHOICES",
    title: "Choose your personal mystery",
    lead: "You can begin with a single deity and initiation. The seven learning chapters below are optional deeper study, not prerequisites.",
    exampleNote: "These are examples. You can name another deity or ask for a suggestion.",
    otherDeityOption: "Another deity / channel",
    helpMeChoose: "Help me choose a deity",
    continue: "Continue to initiation formats",
    choosePrompt: "Select a tradition, deity and format to request a mystery.",
    pending: "Not selected yet",
    optionNote: "One step at a time: you can change an earlier choice at any moment.",
    customTraditionHint: "Write the name of your tradition to continue.",
    step1: "Choose a tradition",
    step1Hint: "Each tradition opens a selection of gods and goddesses.",
    step2: "Choose a deity's channel",
    step2Hint: "Select the image and qualities you would like to explore.",
    step3: "Choose the initiation format",
    step3Hint: "Different ways to experience the same chosen channel.",
    otherTradition: "Which tradition interests you?",
    otherDeity: "Which deity or channel interests you?",
    customTradition: "e.g. Celtic",
    customDeity: "Name a deity or ask for guidance",
    undecided: "Please help me choose",
    selected: "Your selection",
    contact: "Request this mystery on WhatsApp",
    note: "WhatsApp opens with your exact tradition, deity/channel and format. You decide whether to send.",
    availability: "Dates, group availability and fees are confirmed personally.",
    messageIntro: "Hello Andrey! I would like to ask about a Temple Studies initiation.",
    messageClosing: "Please confirm the available format, schedule and price.",
    messageTradition: "Tradition",
    messageDeity: "Deity / channel",
    messageFormat: "Initiation format",
    context: "The ‘channel’ is approached here through modern symbolic and spiritual practice; this is not an official initiation into a historical religious community.",
  },
  ru: {
    eyebrow: "ВАШ ПУТЬ · 3 ПРОСТЫХ ВЫБОРА",
    title: "Выберите свою мистерию",
    lead: "Можно начать с одного божества и посвящения. Семь учебных глав ниже — дополнительное изучение, а не обязательные условия.",
    exampleNote: "Это примеры. Можно указать другое божество или попросить подсказать.",
    otherDeityOption: "Другое божество / канал",
    helpMeChoose: "Помогите выбрать божество",
    continue: "Перейти к выбору формата",
    choosePrompt: "Выберите традицию, божество и формат, чтобы отправить запрос.",
    pending: "Пока не выбрано",
    optionNote: "Вы выбираете по одному шагу. К предыдущему выбору можно вернуться.",
    customTraditionHint: "Укажите традицию, чтобы продолжить.",
    step1: "Выберите традицию",
    step1Hint: "У каждой традиции — свои боги и богини.",
    step2: "Выберите канал божества",
    step2Hint: "Выберите образ и качества, которые хотите исследовать.",
    step3: "Выберите формат посвящения",
    step3Hint: "Три способа пройти мистерию в выбранном канале.",
    otherTradition: "Какая традиция вас интересует?",
    otherDeity: "Какое божество или канал вас интересует?",
    customTradition: "Например, кельтская",
    customDeity: "Назовите божество или попросите помочь",
    undecided: "Помогите мне выбрать",
    selected: "Ваш выбор",
    contact: "Запросить мистерию в WhatsApp",
    note: "WhatsApp откроется с указанием точной традиции, божества и формата. Сообщение отправляете вы.",
    availability: "Даты, наличие группы и стоимость уточняются лично.",
    messageIntro: "Здравствуйте, Андрей! Хочу узнать о посвящении Temple Studies.",
    messageClosing: "Подскажите доступные форматы, даты и стоимость.",
    messageTradition: "Традиция",
    messageDeity: "Божество / канал",
    messageFormat: "Формат инициации",
    context: "Под «каналом» здесь понимается современная символическая и духовная практика, а не официальное посвящение в историческую религиозную общину.",
  },
  es: {
    eyebrow: "TU CAMINO · 3 ELECCIONES SENCILLAS",
    title: "Elige tu misterio personal",
    lead: "Puedes empezar con una deidad y una iniciación. Los siete capítulos siguientes son lecturas opcionales, no requisitos.",
    exampleNote: "Son ejemplos. Puedes proponer otra deidad o pedir orientación.",
    otherDeityOption: "Otra deidad / canal",
    helpMeChoose: "Ayúdame a elegir una deidad",
    continue: "Continuar a formatos de iniciación",
    choosePrompt: "Elige una tradición, una deidad y un formato para enviar la solicitud.",
    pending: "Sin seleccionar",
    optionNote: "Un paso a la vez. Puedes volver y cambiar tu elección.",
    customTraditionHint: "Escribe la tradición para continuar.",
    step1: "Elige una tradición",
    step1Hint: "Cada tradición ofrece diferentes dioses y diosas.",
    step2: "Elige el canal de una deidad",
    step2Hint: "Selecciona la figura y las cualidades que deseas explorar.",
    step3: "Elige un formato de iniciación",
    step3Hint: "Tres formas de explorar el mismo canal.",
    otherTradition: "¿Qué tradición te interesa?",
    otherDeity: "¿Qué deidad o canal te interesa?",
    customTradition: "p. ej., celta",
    customDeity: "Nombra una deidad o pide orientación",
    undecided: "Ayúdame a elegir",
    selected: "Tu selección",
    contact: "Solicitar este misterio por WhatsApp",
    note: "WhatsApp abre tu solicitud exacta. Tú decides si enviarla.",
    availability: "Las fechas, los grupos y los precios se confirman personalmente.",
    messageIntro: "Hola Andrey. Me gustaría consultar sobre una iniciación Temple Studies.",
    messageClosing: "Por favor, confirma los formatos, fechas y precios disponibles.",
    messageTradition: "Tradición",
    messageDeity: "Deidad / canal",
    messageFormat: "Formato de iniciación",
    context: "El «canal» se aborda mediante una práctica espiritual y simbólica moderna; no es una iniciación oficial a una comunidad religiosa histórica.",
  },
} as const;

function WhatsAppLogo() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.76-1.653-2.057-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.496.099-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.273.297-1.04 1.016-1.04 2.478s1.064 2.874 1.213 3.073c.148.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.693.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.886 9.886 0 0 1-5.031-1.378l-.361-.214-3.74.981.998-3.646-.235-.374a9.866 9.866 0 0 1-1.51-5.26c.002-5.45 4.437-9.885 9.888-9.885a9.824 9.824 0 0 1 6.99 2.897 9.825 9.825 0 0 1 2.893 6.994c-.002 5.45-4.437 9.885-9.888 9.885m8.413-18.3A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.334.157 11.892a11.833 11.833 0 0 0 1.587 5.937L.057 24l6.314-1.656a11.884 11.884 0 0 0 5.674 1.446h.005c6.557 0 11.892-5.334 11.895-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

export function TempleInitiationChooser({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [traditionId, setTraditionId] = useState<TraditionId | null>(null);
  const [deityId, setDeityId] = useState("");
  const [formatId, setFormatId] = useState<FormatId | null>(null);
  const [customTradition, setCustomTradition] = useState("");
  const [customDeity, setCustomDeity] = useState("");
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  // After advancing, return keyboard and screen-reader focus to the new step.
  useEffect(() => {
    if (step > 1) stepHeadingRef.current?.focus();
  }, [step]);

  const tradition = traditions.find((item) => item.id === traditionId);
  const format = formats.find((item) => item.id === formatId);
  const hasTradition = Boolean(traditionId && (traditionId !== "other" || customTradition.trim()));
  const hasDeity = deityId === "help" || Boolean(
    deityId === "custom" ? customDeity.trim() : tradition?.deities.some((item) => item.id === deityId),
  );
  const ready = hasTradition && hasDeity && Boolean(format);
  const traditionName = traditionId === "other"
    ? customTradition.trim() || t.pending
    : tradition?.name[locale] ?? t.pending;
  const deityName = deityId === "help"
    ? t.helpMeChoose
    : deityId === "custom"
      ? customDeity.trim() || t.pending
      : tradition?.deities.find((item) => item.id === deityId)?.name[locale] ?? t.pending;

  function chooseTradition(id: TraditionId) {
    setTraditionId(id);
    setCustomTradition("");
    setCustomDeity("");
    setDeityId("");
    setFormatId(null);
    setStep(id === "other" ? 1 : 2);
  }

  function chooseDeity(id: string) {
    setDeityId(id);
    setCustomDeity("");
    setFormatId(null);
    if (id !== "custom") setStep(3);
  }

  const message = [
    t.messageIntro,
    "",
    "Temple Studies — Holistic House",
    t.messageTradition + ": " + traditionName,
    t.messageDeity + ": " + deityName,
    t.messageFormat + ": " + (format?.title[locale] ?? t.pending),
    "",
    t.messageClosing,
    "Page: https://holistichouse.vercel.app/" + locale + "/academy/temple-studies",
  ].join("\n");
  const whatsappUrl = ready ? "https://wa.me/14376066502?text=" + encodeURIComponent(message) : "";

  const steps = [
    { number: 1 as const, title: t.step1, enabled: true, done: hasTradition },
    { number: 2 as const, title: t.step2, enabled: hasTradition, done: hasDeity },
    { number: 3 as const, title: t.step3, enabled: hasTradition && hasDeity, done: Boolean(format) },
  ];

  return (
    <section className={styles.chooser} id="temple-choose" aria-labelledby="temple-choose-title" data-temple-initiation-chooser>
      <div className={styles.heading}>
        <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" /> {t.eyebrow}</p>
        <h2 id="temple-choose-title">{t.title}</h2>
        <p>{t.lead}</p>
      </div>

      <nav className={styles.progress} aria-label={t.eyebrow}>
        {steps.map((item) => (
          <button key={item.number} type="button" className={styles.progressItem}
            disabled={!item.enabled} aria-current={step === item.number ? "step" : undefined}
            data-active={step === item.number} data-done={item.done}
            onClick={() => setStep(item.number)}>
            <span>{item.done ? <Check size={15} aria-hidden="true" /> : String(item.number).padStart(2, "0")}</span>
            <small>{item.title}</small>
          </button>
        ))}
      </nav>
      <p className={styles.progressNote}>{t.optionNote}</p>

      {step === 1 ? (
        <div className={styles.step} data-temple-step="tradition">
          <div className={styles.stepTitle}><span>01</span><div><h3 ref={stepHeadingRef}>{t.step1}</h3><p>{t.step1Hint}</p></div></div>
          <div className={styles.traditions} role="group" aria-label={t.step1}>
            {traditions.map((item) => (
              <button type="button" key={item.id} className={styles.tradition}
                data-selected={item.id === traditionId} aria-pressed={item.id === traditionId}
                onClick={() => chooseTradition(item.id)}>
                {item.id === traditionId ? <Check size={16} aria-hidden="true" /> : null}
                {item.name[locale]}
              </button>
            ))}
          </div>
          {traditionId === "other" ? (
            <div className={styles.customEntry}>
              <label className={styles.customLabel}>{t.otherTradition}
                <input value={customTradition} onChange={(event) => setCustomTradition(event.target.value)}
                  placeholder={t.customTradition} maxLength={80} autoComplete="off" />
              </label>
              <button type="button" className={styles.continue} disabled={!customTradition.trim()}
                onClick={() => setStep(2)}>{t.continue}<ChevronRight size={17} aria-hidden="true" /></button>
              <small>{t.customTraditionHint}</small>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className={styles.step} data-temple-step="deity">
          <div className={styles.stepTitle}><span>02</span><div><h3 tabIndex={-1} ref={stepHeadingRef}>{t.step2}</h3><p>{t.step2Hint}</p></div></div>
          {tradition?.deities.length ? (
            <div className={styles.deities} role="group" aria-label={t.step2}>
              {tradition.deities.map((deity) => (
                <button type="button" key={deity.id} className={styles.deity}
                  aria-pressed={deityId === deity.id} data-selected={deityId === deity.id}
                  onClick={() => chooseDeity(deity.id)}>
                  <span className={styles.deityName}>{deityId === deity.id ? <Check size={15} aria-hidden="true" /> : null}{deity.name[locale]}</span>
                  <small>{deity.quality[locale]}</small>
                </button>
              ))}
            </div>
          ) : null}
          <p className={styles.examplesNote}>{t.exampleNote}</p>
          <div className={styles.alternativeActions}>
            <button type="button" data-temple-custom-deity className={styles.alternative}
              aria-pressed={deityId === "custom"} onClick={() => chooseDeity("custom")}>{t.otherDeityOption}</button>
            <button type="button" data-temple-help-deity className={styles.alternative}
              aria-pressed={deityId === "help"} onClick={() => chooseDeity("help")}>{t.helpMeChoose}</button>
          </div>
          {deityId === "custom" ? (
            <div className={styles.customEntry}>
              <label className={styles.customLabel}>{t.otherDeity}
                <input value={customDeity} onChange={(event) => setCustomDeity(event.target.value)}
                  placeholder={t.customDeity} maxLength={80} autoComplete="off" />
              </label>
              <button type="button" className={styles.continue} disabled={!customDeity.trim()}
                onClick={() => setStep(3)}>{t.continue}<ChevronRight size={17} aria-hidden="true" /></button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className={styles.step} data-temple-step="initiation">
          <div className={styles.stepTitle}><span>03</span><div><h3 tabIndex={-1} ref={stepHeadingRef}>{t.step3}</h3><p>{t.step3Hint}</p></div></div>
          <div className={styles.formats} role="group" aria-label={t.step3}>
            {formats.map((item) => (
              <button type="button" key={item.id} className={styles.format}
                aria-pressed={item.id === formatId} data-selected={item.id === formatId}
                onClick={() => setFormatId(item.id)}>
                <span className={styles.formatTitle}>{item.id === formatId
                  ? <Check size={16} aria-hidden="true" />
                  : <ChevronRight size={16} aria-hidden="true" />}{item.title[locale]}</span>
                <small>{item.description[locale]}</small>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className={styles.conversion} aria-live="polite">
          <div className={styles.selection}>
            <span>{t.selected}</span>
            <strong>{traditionName} <ChevronRight size={13} aria-hidden="true" /> {deityName}</strong>
            <small>{format?.title[locale] ?? t.pending}</small>
          </div>
          {ready ? (
            <a className={styles.action} href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              data-temple-whatsapp-request>
              <WhatsAppLogo /> {t.contact} <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          ) : (
            <span className={styles.actionDisabled} data-temple-whatsapp-disabled>{t.choosePrompt}</span>
          )}
          <p className={styles.note}>{t.note} {t.availability}</p>
        </div>
      ) : null}
      <p className={styles.disclaimer}>{t.context}</p>
    </section>
  );
}
