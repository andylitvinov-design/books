"use client";

import { useState, type FormEvent } from "react";
import { Coins, Filter, Flower2, Heart, RotateCcw, Sparkles, Target, X, Zap, type LucideIcon } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-goal-filter.module.css";

export type GoalSector = "energy" | "money" | "love" | "goals" | "meaning";
export type GoalRating = { current: number; desired: number };
export type GoalSelection = {
  sector: GoalSector;
  concerns: string[];
  tasks: string[];
  ratings: Record<string, GoalRating>;
};
type Item = { id: string; en: string; ru: string; es: string };
type Items = { concerns: Item[]; tasks: Item[]; axes: Item[] };

export const goalSectorFocus: Record<GoalSector, "energy" | "money" | "relationships" | "goals"> = {
  energy: "energy", money: "money", love: "relationships", goals: "goals", meaning: "goals",
};
const make = (id: string, en: string, ru: string, es: string): Item => ({ id, en, ru, es });
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
      make("vitality", "Energy", "Энергия", "Energía"),
      make("rest", "Rest", "Отдых", "Descanso"),
      make("calm", "Calm", "Спокойствие", "Calma"),
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
      make("stability", "Stability", "Стабильность", "Estabilidad"),
      make("workClarity", "Work clarity", "Ясность в деле", "Claridad laboral"),
      make("confidence", "Confidence", "Уверенность", "Confianza"),
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
      make("connection", "Connection", "Близость", "Cercanía"),
      make("safety", "Trust", "Доверие", "Confianza"),
      make("warmth", "Warmth", "Тепло", "Calidez"),
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
      make("directionAxis", "Direction", "Направление", "Dirección"),
      make("momentum", "Momentum", "Движение", "Impulso"),
      make("clarity", "Clarity", "Ясность", "Claridad"),
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
      make("meaningAxis", "Meaning", "Смысл", "Sentido"),
      make("selfContact", "Inner connection", "Контакт с собой", "Conexión interior"),
      make("inspirationAxis", "Inspiration", "Вдохновение", "Inspiración"),
    ],
  },
};
const ui = {
  en: {
    title: "Goal & task filter", sector: "Life area", current: "1. What matters right now?",
    desired: "2. What would you like?", select: "Select up to 3", rating: "3. Now and desired",
    ratingHelp: "Your own ratings from 1 to 10, not a medical assessment.",
    now: "Now", want: "Want", show: "Show matching meditations", original: "Only published original recordings",
    clear: "Reset filter", close: "Close filter",
    labels: { energy: "Body & energy", money: "Money & work", love: "Love & connection", goals: "Goals & direction", meaning: "Meaning & values" },
  },
  ru: {
    title: "Фильтр целей и задач", sector: "Сфера жизни", current: "1. Что сейчас беспокоит?",
    desired: "2. Какая твоя задача?", select: "Выбери до 3 пунктов", rating: "3. Сейчас и хочу",
    ratingHelp: "Твоя оценка от 1 до 10, не медицинский тест.",
    now: "Сейчас", want: "Хочу", show: "Показать подходящие медитации", original: "Только опубликованные оригинальные записи",
    clear: "Сбросить фильтр", close: "Закрыть фильтр",
    labels: { energy: "Энергия и тело", money: "Деньги", love: "Любовь и отношения", goals: "Цели", meaning: "Смыслы" },
  },
  es: {
    title: "Filtro de metas y tareas", sector: "Área de vida", current: "1. ¿Qué te preocupa?",
    desired: "2. ¿Qué te gustaría?", select: "Elige hasta 3", rating: "3. Ahora y deseado",
    ratingHelp: "Tu autoevaluación de 1 a 10, no una prueba médica.",
    now: "Ahora", want: "Quiero", show: "Mostrar meditaciones afines", original: "Solo grabaciones originales publicadas",
    clear: "Restablecer filtro", close: "Cerrar filtro",
    labels: { energy: "Cuerpo y energía", money: "Dinero y trabajo", love: "Amor y vínculos", goals: "Metas", meaning: "Sentido y valores" },
  },
} as const;

type Props = {
  locale: PublicLocale;
  scores: Record<"energy" | "money" | "relationships" | "goals", number>;
  initial: GoalSelection | null;
  onApply: (value: GoalSelection) => void;
  onReset: () => void;
  onClose: () => void;
};

export function HolisticSupportGoalFilter({ locale, scores, initial, onApply, onReset, onClose }: Props) {
  const t = ui[locale];
  const [sector, setSector] = useState<GoalSector>(initial?.sector ?? "energy");
  const [concerns, setConcerns] = useState<string[]>(initial?.concerns ?? []);
  const [tasks, setTasks] = useState<string[]>(initial?.tasks ?? []);
  const [ratings, setRatings] = useState<Record<string, GoalRating>>(initial?.ratings ?? {});
  const selected = sectors[sector];

  function changeSector(value: GoalSector) {
    if (value === sector) return;
    setSector(value); setConcerns([]); setTasks([]); setRatings({});
  }
  function toggle(id: string, values: string[], update: (next: string[]) => void) {
    update(values.includes(id) ? values.filter(item => item !== id) :
      values.length < 3 ? [...values, id] : values);
  }
  function getRating(id: string, index: number): GoalRating {
    const current = index === 0 ? scores[goalSectorFocus[sector]] : 5;
    return ratings[id] ?? { current, desired: Math.max(current, 8) };
  }
  function updateRating(id: string, index: number, field: keyof GoalRating, value: number) {
    setRatings(previous => ({
      ...previous, [id]: { ...getRating(id, index), ...previous[id], [field]: value },
    }));
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: Record<string, GoalRating> = {};
    selected.axes.forEach((axis, index) => { values[axis.id] = getRating(axis.id, index); });
    onApply({ sector, concerns, tasks, ratings: values });
  }
  function reset() {
    setSector("energy"); setConcerns([]); setTasks([]); setRatings({});
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
          <section className={styles.fieldGroup} aria-labelledby="goal-ratings">
            <h3 id="goal-ratings">{t.rating}</h3>
            <p>{t.ratingHelp}</p>
            <div className={styles.ratings}>
              {selected.axes.map((axis, index) => {
                const value = getRating(axis.id, index);
                return <div className={styles.axis} key={axis.id} data-goal-axis={axis.id}>
                  <strong>{axis[locale]}</strong>
                  <div className={styles.sliders}>
                    {(["current", "desired"] as const).map(field => (
                      <label className={styles.slider} key={field}>
                        <span>{field === "current" ? t.now : t.want} <output>{value[field]}</output></span>
                        <input type="range" min="1" max="10" step="1"
                          value={value[field]} aria-label={axis[locale] + ": " + (field === "current" ? t.now : t.want)}
                          aria-valuetext={value[field] + " / 10"}
                          onChange={event => updateRating(axis.id, index, field, Number(event.target.value))} />
                      </label>
                    ))}
                  </div>
                </div>;
              })}
            </div>
          </section>
        </div>
      </div>
      <footer className={styles.actions}>
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
