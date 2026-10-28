"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Coins, Filter, Flower2, Heart, RotateCcw, Sparkles, Target, X, Zap, type LucideIcon } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-goal-filter.module.css";

export type GoalSector = "energy" | "money" | "love" | "goals" | "meaning";
export type GoalRating = { current: number; desired: number };
export type GoalAmount = { current: number | null; desired: number | null };
export type GoalCurrency = "CAD" | "EUR" | "USD" | "GBP";
export type GoalSectorSnapshot = {
  concerns: string[];
  tasks: string[];
  ratings: Record<string, GoalRating>;
  amounts?: Record<string, GoalAmount>;
  currency?: GoalCurrency;
};
export type GoalSelection = GoalSectorSnapshot & {
  sector: GoalSector;
  // Accepted categories stay only in this page's React state, never on a server.
  savedSectors?: Partial<Record<GoalSector, GoalSectorSnapshot>>;
};
type Item = { id: string; en: string; ru: string; es: string };
type Axis = Item & { unit: "score" | "currency" | "months" };
type Items = { concerns: Item[]; tasks: Item[]; axes: Axis[] };

export const goalSectorFocus: Record<GoalSector, "energy" | "money" | "relationships" | "goals"> = {
  energy: "energy", money: "money", love: "relationships", goals: "goals", meaning: "goals",
};
const make = (id: string, en: string, ru: string, es: string): Item => ({ id, en, ru, es });
const axis = (id: string, en: string, ru: string, es: string, unit: Axis["unit"] = "score"): Axis =>
  ({ ...make(id, en, ru, es), unit });
const sectorOrder: { id: GoalSector; Icon: LucideIcon }[] = [
  { id: "energy", Icon: Zap },
  { id: "money", Icon: Coins },
  { id: "love", Icon: Heart },
  { id: "goals", Icon: Target },
  { id: "meaning", Icon: Flower2 },
];

// Editorial reflection options: not a clinical, financial, or validated assessment.
const sectors: Record<GoalSector, Items> = {
  energy: {
    concerns: [
      make("fatigue", "Fatigue", "Усталость", "Cansancio"),
      make("lowEnergy", "Low energy", "Мало энергии", "Poca energía"),
      make("stress", "Stress / worry", "Стресс, тревога", "Estrés, ansiedad"),
      make("tension", "Tension / discomfort", "Напряжение", "Tensión"),
      make("sleepTrouble", "Trouble sleeping", "Трудности со сном", "Problemas de sueño"),
      make("symptoms", "Health concerns", "Беспокоят симптомы", "Síntomas preocupantes"),
    ],
    tasks: [
      make("moreEnergy", "More energy", "Больше энергии", "Más energía"),
      make("sleepWell", "Better rest", "Лучше спать", "Descansar mejor"),
      make("stayCalm", "Feel calmer", "Больше спокойствия", "Más calma"),
      make("easeTension", "Ease tension", "Снизить напряжение", "Aliviar tensión"),
      make("selfCare", "Care for myself", "Позаботиться о себе", "Cuidarme"),
      make("endurance", "Build stamina", "Больше выносливости", "Más resistencia"),
    ],
    axes: [
      axis("vitality", "Energy", "Энергия", "Energía"),
      axis("sleepQuality", "Sleep quality", "Качество сна", "Calidad del sueño"),
      axis("calm", "Inner calm", "Спокойствие", "Calma interior"),
    ],
  },
  money: {
    concerns: [
      make("income", "Irregular income", "Нестабильный доход", "Ingresos irregulares"),
      make("moneyStress", "Money worries", "Тревога о деньгах", "Preocupación económica"),
      make("workStuck", "Feeling stuck", "Нет роста", "Estancamiento"),
      make("decisions", "Hard decisions", "Трудно решать", "Decisiones difíciles"),
      make("moneyFocus", "No clear direction", "Нет направления", "Falta de rumbo"),
      make("overworked", "Overwork", "Перегрузка", "Sobrecarga"),
    ],
    tasks: [
      make("stableIncome", "More stability", "Стабильный доход", "Más estabilidad"),
      make("moneyConfidence", "Confidence", "Уверенность", "Confianza"),
      make("growth", "Create opportunities", "Новые возможности", "Nuevas oportunidades"),
      make("clearPlan", "A clear plan", "Ясный план", "Un plan claro"),
      make("balance", "Work-life balance", "Баланс работы и жизни", "Equilibrio"),
      make("newProject", "Start a project", "Начать проект", "Iniciar un proyecto"),
    ],
    axes: [
      axis("monthlyIncome", "Monthly income", "Доход в месяц", "Ingreso mensual", "currency"),
      axis("incomeStability", "Income stability", "Стабильность дохода", "Estabilidad de ingresos"),
      axis("reserveMonths", "Reserve in months", "Финансовый резерв", "Meses de reserva", "months"),
    ],
  },
  love: {
    concerns: [
      make("loneliness", "Loneliness", "Одиночество", "Soledad"),
      make("distance", "Emotional distance", "Мало близости", "Distancia emocional"),
      make("conflicts", "Conflicts", "Конфликты", "Conflictos"),
      make("trustIssues", "Difficulty trusting", "Сложно доверять", "Falta de confianza"),
      make("boundaries", "Weak boundaries", "Трудно с границами", "Límites difíciles"),
      make("fearOfCloseness", "Fear of closeness", "Страх близости", "Miedo a la intimidad"),
    ],
    tasks: [
      make("closeness", "Feel closer", "Больше близости", "Más cercanía"),
      make("trust", "Build trust", "Больше доверия", "Más confianza"),
      make("communication", "Open dialogue", "Улучшить диалог", "Mejor comunicación"),
      make("healthyBounds", "Set boundaries", "Укрепить границы", "Poner límites"),
      make("harmony", "More harmony", "Больше гармонии", "Más armonía"),
      make("selfRespect", "Self-respect", "Уважать себя", "Respetarme"),
    ],
    axes: [
      axis("connection", "Closeness", "Близость", "Cercanía"),
      axis("trust", "Trust", "Доверие", "Confianza"),
      axis("communication", "Communication", "Взаимопонимание", "Comunicación"),
    ],
  },
  goals: {
    concerns: [
      make("stuck", "Feeling stuck", "Застой", "Estancamiento"),
      make("distraction", "Distraction", "Рассеянность", "Distracción"),
      make("procrastination", "Putting it off", "Откладывание", "Postergación"),
      make("fear", "Fear of failure", "Страх неудачи", "Miedo al fracaso"),
      make("tooMany", "Too many demands", "Слишком много задач", "Demasiadas tareas"),
      make("unclearGoals", "Unclear goal", "Нет ясной цели", "Meta poco clara"),
    ],
    tasks: [
      make("direction", "Find direction", "Найти направление", "Encontrar rumbo"),
      make("nextStep", "Take the next step", "Сделать шаг", "Dar el siguiente paso"),
      make("habits", "Build a habit", "Создать привычку", "Crear un hábito"),
      make("courage", "Feel courageous", "Стать смелее", "Ganar valentía"),
      make("priorities", "Set priorities", "Выбрать главное", "Priorizar"),
      make("motivation", "Find motivation", "Найти мотивацию", "Motivarme"),
    ],
    axes: [
      axis("goalClarity", "Goal clarity", "Ясность цели", "Claridad de metas"),
      axis("actions", "Consistent action", "Реальные действия", "Acciones concretas"),
      axis("progress", "Progress", "Ощущение прогресса", "Sensación de avance"),
    ],
  },
  meaning: {
    concerns: [
      make("emptiness", "Emptiness", "Пустота", "Vacío"),
      make("lostPurpose", "Lack of purpose", "Нет смысла", "Falta de sentido"),
      make("valueConflict", "Conflicting values", "Конфликт ценностей", "Valores en conflicto"),
      make("noInspiration", "No inspiration", "Нет вдохновения", "Sin inspiración"),
      make("uncertainty", "Uncertainty", "Неопределённость", "Incertidumbre"),
      make("littleSpace", "No time for myself", "Нет времени для себя", "Sin tiempo para mí"),
    ],
    tasks: [
      make("purpose", "Explore purpose", "Найти смысл", "Encontrar sentido"),
      make("innerContact", "Reconnect with self", "Контакт с собой", "Reconectar conmigo"),
      make("creativity", "Create", "Творить", "Crear"),
      make("quiet", "Inner quiet", "Внутренняя тишина", "Paz interior"),
      make("values", "Clarify values", "Прояснить ценности", "Aclarar valores"),
      make("inspiration", "Feel inspired", "Вдохновение", "Inspiración"),
    ],
    axes: [
      axis("meaningAxis", "Meaning in life", "Осмысленность", "Sentido de vida"),
      axis("selfContact", "Connection with self", "Контакт с собой", "Conexión interior"),
      axis("inspirationAxis", "Inspiration", "Вдохновение", "Inspiración"),
    ],
  },
};
const ui = {
  en: {
    title: "Goal & task filter", sector: "Life area", current: "1. What matters right now?",
    desired: "2. What would you like?", select: "Select any that fit", rating: "3. Now → Want",
    ratingHelp: "Three indicators. Self-ratings 1–10; financial amounts have their own units."
    now: "Now", want: "Want", show: "Show recommendations", original: "Meditations, tests, courses, talismans & masters",
    currency: "Currency", perMonth: "per month", reserveUnit: "months of expenses", optional: "Optional; leave blank if unknown. Changing currency clears income values.",
    clear: "Reset filter", close: "Close filter",
    save: "Save", next: "Next category", accepted: "Accepted",
    savedNote: "Saved on this page only",
    labels: { energy: "Body & energy", money: "Money & work", love: "Love & connection", goals: "Goals & direction", meaning: "Meaning & values" },
  },
  ru: {
    title: "Фильтр целей и задач", sector: "Сфера жизни", current: "1. Что сейчас беспокоит?",
    desired: "2. Какая твоя задача?", select: "Выбери любые подходящие пункты", rating: "3. Сейчас → Хочу",
    ratingHelp: "Три показателя. Оценки 1–10; доход и резерв — в реальных единицах."
    now: "Сейчас", want: "Хочу", show: "Показать рекомендации", original: "Медитации, тесты, курсы, талисманы и мастера",
    currency: "Валюта", perMonth: "в месяц", reserveUnit: "месяцев расходов", optional: "Необязательно. Смена валюты очищает суммы дохода без конвертации.",
    clear: "Сбросить фильтр", close: "Закрыть фильтр",
    save: "Сохранить", next: "Следующая категория", accepted: "Принято",
    savedNote: "Сохранено только на этой странице",
    labels: { energy: "Энергия и тело", money: "Деньги", love: "Любовь и отношения", goals: "Цели", meaning: "Смыслы" },
  },
  es: {
    title: "Filtro de metas y tareas", sector: "Área de vida", current: "1. ¿Qué te preocupa?",
    desired: "2. ¿Qué te gustaría?", select: "Elige todos los que correspondan", rating: "3. Ahora → Quiero",
    ratingHelp: "Tres indicadores. Escalas 1–10; ingresos y reserva con unidades reales."
    now: "Ahora", want: "Quiero", show: "Mostrar recomendaciones", original: "Meditaciones, pruebas, cursos, talismanes y guías",
    currency: "Moneda", perMonth: "por mes", reserveUnit: "meses de gastos", optional: "Opcional. Cambiar moneda borra los ingresos sin convertirlos.",
    clear: "Restablecer filtro", close: "Cerrar filtro",
    save: "Guardar", next: "Siguiente categoría", accepted: "Aceptado",
    savedNote: "Guardado solo en esta página",
    labels: { energy: "Cuerpo y energía", money: "Dinero y trabajo", love: "Amor y vínculos", goals: "Metas", meaning: "Sentido y valores" },
  },
} as const;


/** Human-readable chosen goals. This is displayed locally, never serialized in a URL. */
export function summarizeGoalSelection(locale: PublicLocale, selection: GoalSelection): string {
  const available = sectors[selection.sector];
  const selected = selection.tasks.length ? selection.tasks : selection.concerns;
  const options = selection.tasks.length ? available.tasks : available.concerns;
  return selected.slice(0, 2)
    .map(id => options.find(item => item.id === id)?.[locale])
    .filter((item): item is string => Boolean(item)).join(" · ");
}

type Props = {
  locale: PublicLocale;
  scores: Record<"energy" | "money" | "relationships" | "goals", number>;
  initial: GoalSelection | null;
  savedSectors: Partial<Record<GoalSector, GoalSectorSnapshot>>;
  onSave: (sector: GoalSector, value: GoalSectorSnapshot) => void;
  onApply: (value: GoalSelection) => void;
  onReset: () => void;
  onClose: () => void;
};

export function HolisticSupportGoalFilter({
  locale, scores, initial, savedSectors, onSave, onApply, onReset, onClose,
}: Props) {
  const t = ui[locale];
  const initialSector = initial?.sector ?? "energy";
  const initialDraft = initial ?? savedSectors[initialSector];
  const [sector, setSector] = useState<GoalSector>(initialSector);
  const [concerns, setConcerns] = useState<string[]>(initialDraft?.concerns ?? []);
  const [tasks, setTasks] = useState<string[]>(initialDraft?.tasks ?? []);
  const [ratings, setRatings] = useState<Record<string, GoalRating>>(initialDraft?.ratings ?? {});
  const [amounts, setAmounts] = useState<Record<string, GoalAmount>>(initialDraft?.amounts ?? {});
  const [currency, setCurrency] = useState<GoalCurrency>(initialDraft?.currency ?? "CAD");
  const [drafts, setDrafts] = useState<Partial<Record<GoalSector, GoalSectorSnapshot>>>(
    () => ({ ...savedSectors, ...(initial ? { [initial.sector]: initial } : {}) }));
  const [accepted, setAccepted] = useState<Partial<Record<GoalSector, GoalSectorSnapshot>>>(savedSectors);
  const [dirty, setDirty] = useState<Partial<Record<GoalSector, boolean>>>({});
  const selected = sectors[sector];
  const markDirty = () => setDirty(previous => ({ ...previous, [sector]: true }));
  const isAccepted = (id: GoalSector) => Boolean(accepted[id] && !dirty[id]);

  function changeSector(value: GoalSector) {
    if (value === sector) return;
    setDrafts(previous => ({ ...previous, [sector]: snapshotCurrent() }));
    const next = drafts[value] ?? accepted[value];
    setSector(value);
    setConcerns(next?.concerns ?? []);
    setTasks(next?.tasks ?? []);
    setRatings(next?.ratings ?? {});
    setAmounts(next?.amounts ?? {});
    setCurrency(next?.currency ?? "CAD");
  }
  function toggle(id: string, values: string[], update: (next: string[]) => void) {
    update(values.includes(id) ? values.filter(item => item !== id) : [...values, id]);
    markDirty();
  }
  function getRating(id: string, index: number): GoalRating {
    const current = sector === "money" && id === "incomeStability" ? scores.money
      : index === 0 && sector !== "meaning" && sector !== "money" ? scores[goalSectorFocus[sector]] : 5;
    return ratings[id] ?? { current, desired: Math.max(current, 8) };
  }
  function updateRating(id: string, index: number, field: keyof GoalRating, value: number) {
    setRatings(previous => ({
      ...previous, [id]: { ...getRating(id, index), ...previous[id], [field]: value },
    }));
    markDirty();
  }
  // Blank money values remain blank; no fabricated income or target is stored.
  function updateAmount(id: string, field: keyof GoalAmount, raw: string, max: number) {
    const numeric = raw === "" ? null : Number(raw);
    if (numeric !== null && (!Number.isFinite(numeric) || numeric < 0 || numeric > max)) return;
    setAmounts(previous => ({
      ...previous,
      [id]: {
        current: field === "current" ? numeric : (previous[id]?.current ?? null),
        desired: field === "desired" ? numeric : (previous[id]?.desired ?? null),
      },
    }));
    markDirty();
  }
  function snapshotCurrent(): GoalSectorSnapshot {
    const values: Record<string, GoalRating> = {};
    const entered: Record<string, GoalAmount> = {};
    selected.axes.forEach((item, index) => {
      if (item.unit === "score") values[item.id] = getRating(item.id, index);
      else if (amounts[item.id]) entered[item.id] = amounts[item.id];
    });
    return { concerns: [...concerns], tasks: [...tasks], ratings: values,
      ...(sector === "money" ? { amounts: entered, currency } : {}) };
  }
  function saveCurrent() {
    const snapshot = snapshotCurrent();
    setDrafts(previous => ({ ...previous, [sector]: snapshot }));
    setAccepted(previous => ({ ...previous, [sector]: snapshot }));
    setDirty(previous => ({ ...previous, [sector]: false }));
    onSave(sector, snapshot); // no API, session storage, or analytics
  }
  function nextSector() {
    const index = sectorOrder.findIndex(item => item.id === sector);
    changeSector(sectorOrder[(index + 1) % sectorOrder.length].id);
    window.requestAnimationFrame(() => document.getElementById("support-goal-filter-title")
      ?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto" : "smooth", block: "start" }));
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const snapshot = snapshotCurrent();
    const all = { ...accepted, [sector]: snapshot };
    onSave(sector, snapshot);
    onApply({ ...snapshot, sector, savedSectors: all });
  }
  function reset() {
    setSector("energy"); setConcerns([]); setTasks([]); setRatings({}); setAmounts({}); setCurrency("CAD");
    setDrafts({}); setAccepted({}); setDirty({});
    onReset();
  }
  return (
    <form id="support-goal-filter" className={styles.panel} onSubmit={apply}
      aria-labelledby="support-goal-filter-title" data-support-goal-filter>
      <header className={styles.header}>
        <h2 id="support-goal-filter-title"><Filter size={23} aria-hidden="true" />{t.title}</h2>
        <button type="button" className={styles.close} aria-label={t.close} onClick={onClose}>
          <X size={24} aria-hidden="true" />
        </button>
      </header>
      <div className={styles.columns}>
        <nav className={styles.sectors} aria-label={t.sector} data-support-goal-sectors>
          {sectorOrder.map(({ id, Icon }) => (
            <button type="button" key={id} className={styles.sector}
              aria-pressed={sector === id} data-goal-sector={id}
              onClick={() => changeSector(id)}>
              <Icon size={23} strokeWidth={1.85} aria-hidden="true" />
              <span>{t.labels[id]}</span>
            </button>
          ))}
        </nav>
        <div className={styles.fields}>
          <section className={styles.fieldGroup} aria-labelledby="goal-problems">
            <h3 id="goal-problems">{t.current}</h3>
            <p>{t.select}</p>
            <div className={styles.checks}>
              {selected.concerns.map(option => (
                <label className={styles.check} key={option.id} data-goal-concern={option.id}
                  data-checked={concerns.includes(option.id)}>
                  <input type="checkbox" checked={concerns.includes(option.id)}
                    onChange={() => toggle(option.id, concerns, setConcerns)} />
                  <span>{option[locale]}</span>
                </label>
              ))}
            </div>
          </section>
          <section className={styles.fieldGroup} aria-labelledby="goal-tasks">
            <h3 id="goal-tasks">{t.desired}</h3>
            <p>{t.select}</p>
            <div className={styles.checks}>
              {selected.tasks.map(option => (
                <label className={styles.check} key={option.id} data-goal-task={option.id}
                  data-checked={tasks.includes(option.id)}>
                  <input type="checkbox" checked={tasks.includes(option.id)}
                    onChange={() => toggle(option.id, tasks, setTasks)} />
                  <span>{option[locale]}</span>
                </label>
              ))}
            </div>
          </section>

        </div>
      </div>
      <section className={styles.metricsGroup} aria-labelledby="goal-ratings" data-support-goal-axes>
        <div className={styles.metricsHeading}>
          <div><h3 id="goal-ratings">{t.rating}</h3><p>{t.ratingHelp}</p></div>
          {sector === "money" ? <label className={styles.currencyLabel}>
            {t.currency}
            <select data-goal-currency value={currency}
              onChange={event => {
                // No exchange-rate conversion: changing currency clears only cash amounts.
                setCurrency(event.target.value as GoalCurrency);
                setAmounts(previous => ({ ...previous, monthlyIncome: { current: null, desired: null } }));
              }}>
              {(["CAD", "EUR", "USD", "GBP"] as GoalCurrency[]).map(id =>
                <option key={id} value={id}>{id}</option>)}
            </select>
          </label> : null}
        </div>
        <div className={styles.ratings}>
          {selected.axes.map((item, index) => (
            <div className={styles.axis} key={item.id} data-goal-axis={item.id} data-unit={item.unit}>
              <strong>{item[locale]}</strong>
              <div className={styles.sliders}>
                {(["current", "desired"] as const).map(field => (
                  <label className={styles.slider} key={field}>
                    <span>{field === "current" ? t.now : t.want}
                      {item.unit === "score" ? <output>{getRating(item.id, index)[field]}</output> : null}
                    </span>
                    {item.unit === "score" ? <input type="range" min="1" max="10" step="1"
                      value={getRating(item.id, index)[field]}
                      aria-label={item[locale] + ": " + (field === "current" ? t.now : t.want)}
                      aria-valuetext={getRating(item.id, index)[field] + " / 10"}
                      onChange={event => updateRating(item.id, index, field, Number(event.target.value))} /> :
                      <div className={styles.amountField}>
                        <input type="number" min="0" max={item.unit === "months" ? 120 : 100000000}
                          step={item.unit === "months" ? "1" : "any"} inputMode="decimal"
                          data-goal-metric={item.id} data-metric-field={field}
                          value={amounts[item.id]?.[field] ?? ""} placeholder="—"
                          aria-label={item[locale] + " " + (field === "current" ? t.now : t.want) +
                            " (" + (item.unit === "months" ? t.reserveUnit : currency + " " + t.perMonth) + ")"}
                          onChange={event => updateAmount(item.id, field, event.target.value,
                            item.unit === "months" ? 120 : 100000000)} />
                        <small>{item.unit === "months" ? (locale === "ru" ? "мес." : "mo.") : currency}</small>
                      </div>}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {sector === "money" ? <p className={styles.amountHint}>{t.optional}</p> : null}
      </section>
      <footer className={styles.actions} data-support-goal-actions>
        <button type="submit" className={styles.apply} data-support-goal-apply>
          <Sparkles size={22} aria-hidden="true" /><span>{t.show}<small>{t.original}</small></span>
        </button>
        <button type="button" className={styles.reset} data-support-goal-reset onClick={reset}>
          <RotateCcw size={18} aria-hidden="true" />{t.clear}
        </button>
      </footer>
    </form>
  );
}
