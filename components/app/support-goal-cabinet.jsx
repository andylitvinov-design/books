"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, LockKeyhole, RotateCcw, Target } from "lucide-react";
import { appFetch } from "@/lib/app/client-fetch";
import {
  readStagedSupportGoalProfile, clearStagedSupportGoalProfile,
  normalizeSavedGoalProfile,
} from "@/lib/holistic-support/saved-goal-profile.mjs";
import styles from "./support-goal-cabinet.module.css";

const COPY = {
  en: {
    title: "My goals and self-ratings", subtitle: "My free Goal Filter profile · private to my account",
    saved: "Saved securely in your Cabinet.", saving: "Saving your selected goals to your account…",
    failed: "Your goal profile was not confirmed as saved. Reconnect and try again.",
    retry: "Try saving again", open: "Open the goal filter", expand: "View saved ratings",
    now: "Now", want: "Want", checkin: "Overall now",
  },
  ru: {
    title: "Мои цели и самооценки", subtitle: "Мой профиль фильтра целей · только для меня",
    saved: "Данные сохранены в личном кабинете.", saving: "Сохраняем выбранные цели в вашем кабинете…",
    failed: "Сохранение профиля целей не подтверждено. Повторите попытку.",
    retry: "Повторить сохранение", open: "Открыть фильтр целей", expand: "Посмотреть сохранённые оценки",
    now: "Сейчас", want: "Хочу", checkin: "Общая оценка",
  },
  es: {
    title: "Mis metas y valoraciones", subtitle: "Mi perfil del filtro · privado en mi cuenta",
    saved: "Guardado de forma segura en tu cuenta.", saving: "Guardando tus metas en tu cuenta…",
    failed: "No se confirmó el guardado. Vuelve a intentarlo.",
    retry: "Reintentar", open: "Abrir el filtro de metas", expand: "Ver valoraciones guardadas",
    now: "Ahora", want: "Quiero", checkin: "Valoración general",
  },
};
const SECTORS = {
  en: { energy: "Body & energy", money: "Money & work", love: "Love & connection", meaning: "Meaning" },
  ru: { energy: "Энергия и тело", money: "Деньги", love: "Любовь и отношения", meaning: "Смыслы" },
  es: { energy: "Cuerpo y energía", money: "Dinero y trabajo", love: "Amor y vínculos", meaning: "Sentido" },
};
const AXES = {
  en: {
    vitality: "Energy", sleepQuality: "Sleep quality", calm: "Calm",
    incomeStability: "Income stability", monthlyIncome: "Monthly income", reserveMonths: "Reserve (months)",
    connection: "Closeness", trust: "Trust", communication: "Communication",
    meaningAxis: "Meaning", selfContact: "Self-contact", inspirationAxis: "Inspiration",
    goalClarity: "Goal clarity", actions: "Actions", progress: "Progress",
  },
  ru: {
    vitality: "Энергия", sleepQuality: "Качество сна", calm: "Спокойствие",
    incomeStability: "Стабильность дохода", monthlyIncome: "Доход в месяц", reserveMonths: "Резерв (мес.)",
    connection: "Близость", trust: "Доверие", communication: "Взаимопонимание",
    meaningAxis: "Осмысленность", selfContact: "Контакт с собой", inspirationAxis: "Вдохновение",
    goalClarity: "Ясность цели", actions: "Действия", progress: "Прогресс",
  },
  es: {
    vitality: "Energía", sleepQuality: "Calidad del sueño", calm: "Calma",
    incomeStability: "Estabilidad de ingresos", monthlyIncome: "Ingreso mensual", reserveMonths: "Reserva (meses)",
    connection: "Cercanía", trust: "Confianza", communication: "Comunicación",
    meaningAxis: "Sentido", selfContact: "Conexión interior", inspirationAxis: "Inspiración",
    goalClarity: "Claridad de metas", actions: "Acciones", progress: "Progreso",
  },
};
const CHECKIN_KEY = { energy: "energy", money: "money", love: "relationships", meaning: "meaning" };

export default function SupportGoalCabinet({ accountId, locale = "en" }) {
  const lang = Object.hasOwn(COPY, locale) ? locale : "en";
  const t = COPY[lang];
  const [result, setResult] = useState({ phase: "loading", profile: null, justSaved: false });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function loadAndSave() {
      let staged = null;
      try {
        staged = readStagedSupportGoalProfile();
        if (staged && active) setResult({ phase: "saving", profile: null, justSaved: false });
        let current = await appFetch("development-goals", undefined, "GET", { accountId });
        if (staged) {
          // Reuse the encrypted account goal record and optimistic revision,
          // never create a second profile, public lead or practitioner contact.
          for (let attempt = 0; attempt < 2; attempt += 1) {
            const existing = normalizeSavedGoalProfile(current.goals?.supportProfile);
            if (JSON.stringify(existing) === JSON.stringify(staged)) break;
            try {
              await appFetch("development-goals", {
                ...current.goals, supportProfile: staged, revision: current.revision,
              }, "POST", { accountId });
              break;
            } catch (error) {
              if (error?.code !== "DEVELOPMENT_GOALS_CONFLICT" || attempt === 1) throw error;
              current = await appFetch("development-goals", undefined, "GET", { accountId });
            }
          }
          // A successful HTTP response alone is not confirmation: read back
          // the account-owned sealed record before clearing the handoff.
          current = await appFetch("development-goals", undefined, "GET", { accountId });
          const verified = normalizeSavedGoalProfile(current.goals?.supportProfile);
          if (JSON.stringify(verified) !== JSON.stringify(staged)) throw new Error("GOALS_SAVE_UNCONFIRMED");
          clearStagedSupportGoalProfile();
        }
        if (active) setResult({ phase: "ready",
          profile: normalizeSavedGoalProfile(current.goals?.supportProfile), justSaved: Boolean(staged) });
      } catch {
        if (active) setResult({ phase: staged ? "error" : "loading", profile: null, justSaved: false });
      }
    }
    loadAndSave();
    return () => { active = false; };
  }, [accountId, revision]);
  if (result.phase === "loading") return null;
  if (result.phase === "error") return (
    <section className={styles.notice} role="alert" data-support-goal-cabinet-save-error>
      <LockKeyhole size={20} aria-hidden="true" />
      <span>{t.failed}</span>
      <button type="button" onClick={() => setRevision(value => value + 1)}>
        <RotateCcw size={16} aria-hidden="true" />{t.retry}
      </button>
    </section>
  );
  if (result.phase === "saving") return (
    <section className={styles.notice} role="status" data-support-goal-cabinet-saving>
      <LockKeyhole size={20} aria-hidden="true" />{t.saving}
    </section>
  );
  const profile = result.profile;
  if (!profile) return null;
  return (
    <section className={styles.root} data-support-goal-cabinet-profile>
      <div className={styles.heading}>
        <span className={styles.icon}><Target size={23} aria-hidden="true" /></span>
        <div><h2>{t.title}</h2><p>{t.subtitle}</p></div>
        <CheckCircle2 className={styles.check} size={21} aria-label={t.saved} />
      </div>
      {result.justSaved ? <p className={styles.confirmed} role="status">{t.saved}</p> : null}
      <details>
        <summary>{t.expand}<ChevronDown size={18} aria-hidden="true" /></summary>
        <div className={styles.sectors}>
          {Object.entries(profile.savedSectors).map(([sector, snapshot]) => (
            <article key={sector} className={styles.sector}>
              <h3>{SECTORS[lang][sector]}</h3>
              <p>{t.checkin}: <strong>{profile.scores[CHECKIN_KEY[sector]]}/10</strong></p>
              <dl>
                {Object.entries(snapshot.ratings).map(([axis, pair]) => (
                  <div key={axis}><dt>{AXES[lang][axis] || axis}</dt>
                    <dd>{t.now}: {pair.current} · {t.want}: {pair.desired}</dd></div>
                ))}
                {Object.entries(snapshot.amounts ?? {}).map(([axis, pair]) => (
                  <div key={axis}><dt>{AXES[lang][axis] || axis}</dt>
                    <dd>{t.now}: {pair.current ?? "—"} · {t.want}: {pair.desired ?? "—"}
                      {axis === "monthlyIncome" ? " " + snapshot.currency : ""}</dd></div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        <Link href={"/" + lang + "/holistic-support/mobile"} prefetch={false}>{t.open}</Link>
      </details>
    </section>
  );
}
