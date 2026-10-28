"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, Coins, Flame, Heart, ImagePlus, Pause, Play, RotateCcw, Sparkles, Target, Zap } from "lucide-react";

import { compareMandalaRatings, normalizeMandalaRatings } from "@/lib/holistic-support/mandala-progress";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./support-mandala-comparison.module.css";

const areas = ["energy", "money", "relationships", "goals"] as const;
type Area = (typeof areas)[number];
type Ratings = Record<Area, number>;
type Effect = "fire" | "money";

const icons = { energy: Zap, money: Coins, relationships: Heart, goals: Target };
const copy = {
  en: {
    heading: "Your mandala · before and after", intro: "Notice your own impressions. There is no right answer and no promised change.",
    before: "1 · Before the practice", beforeHint: "Check the starting values. You can adjust the ratings shown above.",
    after: "2 · After the practice", afterHint: "When you wish, rate the same four areas again.",
    setBaseline: "Set my starting point", editBaseline: "Change starting values",
    baselineSet: "Starting point set", beforeValue: "Before", afterValue: "Now",
    compare: "Compare my ratings", retry: "Rate again", notYet: "Set the starting point on the left to enable the second check-in.",
    mandala: "My personal mandala", addPhoto: "Add my photo", photoAlt: "Photo you selected for your mandala",
    imageNote: "Your photo is shown locally in the centre; it is never sent for analysis.",
    effects: "Animated background", fire: "Fire", money: "Money rain", start: "Play animation", pause: "Pause animation",
    reduced: "Movement is disabled by your device accessibility settings.",
    effectsNote: "Decorative motion only. The original guided video is in the player above.",
    result: "Your own before / after", same: "No change", up: "Higher by", down: "Lower by",
    resultNote: "These are changes in your self-ratings, not evidence of treatment or financial outcomes.",
    privacy: "Temporary on this page: no saving to your account, no CRM, no tracking and no photo upload.",
    areas: { energy: "Energy", money: "Money / work", relationships: "Relationships", goals: "Goals / meaning" },
  },
  ru: {
    heading: "Личная мандала · до и после", intro: "Понаблюдайте за своими ощущениями. Здесь нет правильных ответов и обещанного результата.",
    before: "1 · До практики", beforeHint: "Уточните исходные значения. Первоначально взяты оценки сверху.",
    after: "2 · После практики", afterHint: "Когда захотите, оцените те же четыре области ещё раз.",
    setBaseline: "Зафиксировать исходные оценки", editBaseline: "Изменить исходные оценки",
    baselineSet: "Точка отсчёта зафиксирована", beforeValue: "Было", afterValue: "Сейчас",
    compare: "Сравнить мои оценки", retry: "Оценить повторно", notYet: "Сначала зафиксируйте исходные оценки слева.",
    mandala: "Моя личная мандала", addPhoto: "Добавить своё фото", photoAlt: "Ваша фотография в мандале",
    imageNote: "Фото отображается в центре только на вашем устройстве; анализ по фото не проводится.",
    effects: "Анимированный фон", fire: "Огонь", money: "Денежный дождь", start: "Запустить анимацию", pause: "Остановить анимацию",
    reduced: "Движение отключено настройками доступности вашего устройства.",
    effectsNote: "Только декоративная анимация. Авторское видео остаётся в плеере выше.",
    result: "Ваши оценки до / после", same: "Без изменений", up: "Выше на", down: "Ниже на",
    resultNote: "Это изменения субъективных оценок, а не подтверждение лечения или финансового результата.",
    privacy: "Данные только на этом экране: без сохранения в аккаунт, CRM, аналитики и загрузки фото на сервер.",
    areas: { energy: "Энергия", money: "Деньги / работа", relationships: "Отношения", goals: "Цели / смысл" },
  },
  es: {
    heading: "Tu mandala · antes y después", intro: "Observa tus propias impresiones. No hay respuestas correctas ni resultados garantizados.",
    before: "1 · Antes de la práctica", beforeHint: "Revisa tus valores iniciales, tomados de las escalas superiores.",
    after: "2 · Después de la práctica", afterHint: "Cuando lo desees, vuelve a valorar las mismas cuatro áreas.",
    setBaseline: "Guardar punto de partida", editBaseline: "Modificar valores iniciales",
    baselineSet: "Punto de partida establecido", beforeValue: "Antes", afterValue: "Ahora",
    compare: "Comparar mis valoraciones", retry: "Volver a valorar", notYet: "Primero establece los valores iniciales a la izquierda.",
    mandala: "Mi mandala personal", addPhoto: "Añadir mi foto", photoAlt: "Tu foto dentro del mandala",
    imageNote: "La foto aparece solo en tu dispositivo; no se analiza.",
    effects: "Fondo animado", fire: "Fuego", money: "Lluvia de dinero", start: "Iniciar animación", pause: "Detener animación",
    reduced: "El movimiento está desactivado por los ajustes de accesibilidad.",
    effectsNote: "Solo animación decorativa. El vídeo original permanece en el reproductor superior.",
    result: "Tu valoración antes / después", same: "Sin cambios", up: "Subió", down: "Bajó",
    resultNote: "Son cambios en tus propias valoraciones, no pruebas de tratamiento o éxito económico.",
    privacy: "Datos temporales en esta pantalla: sin guardar en cuenta, CRM, analítica ni subir fotos.",
    areas: { energy: "Energía", money: "Dinero / trabajo", relationships: "Relaciones", goals: "Metas / sentido" },
  },
} as const;

function initialValues(scores: Ratings): Ratings {
  return normalizeMandalaRatings(scores) as Ratings;
}

export function SupportMandalaComparison({
  locale, initialScores, photoUrl, onRequestPhoto,
}: {
  locale: PublicLocale;
  initialScores: Ratings;
  photoUrl: string | null;
  onRequestPhoto: () => void;
}) {
  const t = copy[locale];
  const [baseline, setBaseline] = useState<Ratings>(() => initialValues(initialScores));
  const [after, setAfter] = useState<Ratings>(() => initialValues(initialScores));
  const [confirmed, setConfirmed] = useState(false);
  const [compared, setCompared] = useState<ReturnType<typeof compareMandalaRatings> | null>(null);
  const [effect, setEffect] = useState<Effect>("fire");
  const [effectPlaying, setEffectPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(media.matches);
      if (media.matches) setEffectPlaying(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function setStartingPoint() {
    setConfirmed(true);
    setAfter({ ...baseline });
    setCompared(null);
  }

  function changeBaseline(area: Area, value: number) {
    setBaseline(old => ({ ...old, [area]: value }));
    setCompared(null);
  }

  function changeAfter(area: Area, value: number) {
    setAfter(old => ({ ...old, [area]: value }));
    setCompared(null);
  }

  return (
    <section className={styles.root} data-support-mandala-progress aria-label={t.heading}>
      <header className={styles.header}>
        <span className={styles.eyebrow}><Sparkles size={17} aria-hidden="true" /> HOLISTIC HOUSE</span>
        <h2>{t.heading}</h2>
        <p>{t.intro}</p>
      </header>
      <div className={styles.workspace}>
        <section className={styles.ratingCard} aria-label={t.before} data-mandala-baseline>
          <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>01</span>
            <h3>{t.before}</h3>
          </div>
          <p className={styles.hint}>{t.beforeHint}</p>
          <div className={styles.ratingList}>
            {areas.map(area => {
              const Icon = icons[area];
              return <label key={area} className={styles.ratingRow} data-mandala-before={area}>
                <span className={styles.ratingName}><Icon size={17} aria-hidden="true" /> {t.areas[area]}</span>
                <span className={styles.ratingControl}>
                  <input type="range" min="1" max="10" step="1" value={baseline[area]} disabled={confirmed}
                    aria-label={t.before + " · " + t.areas[area]}
                    aria-valuetext={baseline[area] + " / 10"}
                    onChange={event => changeBaseline(area, Number(event.currentTarget.value))} />
                  <output>{baseline[area]}/10</output>
                </span>
              </label>;
            })}
          </div>
          {confirmed ? <button type="button" className={styles.secondaryAction}
            data-mandala-edit-baseline onClick={() => { setConfirmed(false); setCompared(null); setEffectPlaying(false); }}>
            <RotateCcw size={17} aria-hidden="true" /> {t.editBaseline}
          </button> : <button type="button" className={styles.primaryAction}
            data-mandala-confirm-baseline onClick={setStartingPoint}>
            <Check size={17} aria-hidden="true" /> {t.setBaseline}
          </button>}
          {confirmed ? <p className={styles.confirmation}><Check size={16} aria-hidden="true" /> {t.baselineSet}</p> : null}
        </section>

        <section className={styles.mandalaColumn} aria-label={t.mandala} data-mandala-visual>
          <h3>{t.mandala}</h3>
          <div className={styles.mandalaStage} data-mandala-effect={effectPlaying && !reducedMotion ? effect : "off"}>
            <div className={styles.ambient} aria-hidden="true">
              {Array.from({ length: 10 }, (_, index) => <span key={"fire" + index}
                className={styles.flame} style={{ left: (7 + index * 9) + "%", animationDelay: (-index * 0.37) + "s" }} />)}
              {Array.from({ length: 11 }, (_, index) => <span key={"money" + index}
                className={styles.moneyNote} style={{
                  left: (5 + index * 8.6) + "%", animationDelay: (-index * 0.54) + "s",
                }}>{index % 3 === 0 ? "$" : "€"}</span>)}
            </div>
            <Image src="/mandalas/legacy-stone-mosaic.svg" alt="" fill unoptimized draggable={false}
              sizes="(max-width: 640px) 85vw, 410px" className={styles.mandalaArtwork} />
            <div className={styles.photoHalo}>
              {photoUrl ? (
                <Image src={photoUrl} alt={t.photoAlt} unoptimized width={210} height={210}
                  className={styles.face} data-mandala-local-photo />
              ) : (
                <button type="button" className={styles.photoPlaceholder}
                  data-mandala-photo-action onClick={onRequestPhoto}>
                  <ImagePlus size={32} aria-hidden="true" />{t.addPhoto}
                </button>
              )}
            </div>
          </div>
          <p className={styles.imageNote}>{t.imageNote}</p>
          <div className={styles.effects}>
            <p>{t.effects}</p>
            <div className={styles.effectOptions} role="group" aria-label={t.effects}>
              <button type="button" aria-pressed={effect === "fire"} data-mandala-effect-choice="fire"
                onClick={() => setEffect("fire")}><Flame size={17} aria-hidden="true" />{t.fire}</button>
              <button type="button" aria-pressed={effect === "money"} data-mandala-effect-choice="money"
                onClick={() => setEffect("money")}><Coins size={17} aria-hidden="true" />{t.money}</button>
            </div>
            <button type="button" className={styles.effectToggle}
              data-mandala-effect-toggle disabled={reducedMotion}
              aria-pressed={effectPlaying && !reducedMotion}
              onClick={() => setEffectPlaying(value => !value)}>
              {effectPlaying && !reducedMotion ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
              {effectPlaying && !reducedMotion ? t.pause : t.start}
            </button>
          </div>
          <p className={styles.effectNote}>{reducedMotion ? t.reduced : t.effectsNote}</p>
        </section>

        <section className={styles.ratingCard} aria-label={t.after} data-mandala-retest>
          <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>02</span>
            <h3>{t.after}</h3>
          </div>
          <p className={styles.hint}>{t.afterHint}</p>
          <div className={styles.ratingList}>
            {areas.map(area => {
              const Icon = icons[area];
              const change = compared?.find(row => row.key === area);
              return <label key={area} className={styles.ratingRow} data-mandala-after={area}>
                <span className={styles.ratingName}><Icon size={17} aria-hidden="true" /> {t.areas[area]}</span>
                <span className={styles.ratingControl}>
                  <span className={styles.previous}>{t.beforeValue}: {baseline[area]}</span>
                  <input type="range" min="1" max="10" step="1" disabled={!confirmed}
                    value={after[area]} aria-label={t.after + " · " + t.areas[area]}
                    aria-valuetext={after[area] + " / 10"}
                    onChange={event => changeAfter(area, Number(event.currentTarget.value))} />
                  <output>{after[area]}/10</output>
                </span>
                {change ? <span className={styles.delta} data-trend={change.direction}>
                  {change.delta > 0 ? "+" : ""}{change.delta}
                </span> : null}
              </label>;
            })}
          </div>
          <button type="button" className={styles.primaryAction} disabled={!confirmed}
            data-mandala-compare onClick={() => setCompared(compareMandalaRatings(baseline, after))}>
            <Check size={17} aria-hidden="true" /> {t.compare}
          </button>
          {!confirmed ? <p className={styles.disabledHint}>{t.notYet}</p> : null}
          {compared ? <div className={styles.result} data-mandala-comparison aria-live="polite">
            <strong>{t.result}</strong>
            <ul>{compared.map(row => <li key={row.key}>
              <span>{t.areas[row.key as Area]}</span>
              <span>{row.before} → {row.after} <b data-trend={row.direction}>
                {row.delta > 0 ? "+" : ""}{row.delta}</b></span>
            </li>)}</ul>
            <p>{t.resultNote}</p>
            <button type="button" className={styles.secondaryAction} onClick={() => {
              setAfter({ ...baseline }); setCompared(null);
            }}><RotateCcw size={16} aria-hidden="true" />{t.retry}</button>
          </div> : null}
        </section>
      </div>
      <p className={styles.privacy}>{t.privacy}</p>
    </section>
  );
}
