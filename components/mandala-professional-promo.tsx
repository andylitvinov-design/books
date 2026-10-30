"use client";

import { useState } from "react";
import { ArrowRight, Check, ClipboardCopy, Film, ShieldCheck, Sparkles } from "lucide-react";
import {
  buildProfessionalPromo, professionalPromoLabels,
  PROFESSIONAL_PROMO_FORMATS, PROFESSIONAL_PROMO_ROLES,
  PROFESSIONAL_PROMO_TOPICS, PROFESSIONAL_PROMO_ACTIONS,
} from "@/lib/mandala/professional-promo-director.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import css from "./mandala-professional-promo.module.css";

type ChoiceKey = "format" | "role" | "topic" | "action" | "displayName";
type FormState = Record<ChoiceKey, string>;
type PromoDraft = { headline: string; voiceScript: string; presetId: string; beats: {label: string; script: string}[] };
type Props = {
  locale: PublicLocale;
  disabled: boolean;
  onApply: (brief: { presetId: string; durationSeconds: 30; headline: string }) => void;
  onOpenAudio: () => void;
};

const COPY = {
  ru: {
    badge: "НОВОЕ · ДЛЯ СПЕЦИАЛИСТОВ",
    title: "Промо-видео для моей практики",
    intro: "Для психологов, коучей, ведущих групп и других помогающих специалистов. Выберите задачу — соберём безопасный черновик и 4 сцены без промптов и платных API.",
    fieldFormat: "Что создаём", fieldRole: "Ваше направление", fieldTopic: "Тема обращения",
    fieldName: "Имя или название практики (необязательно)", fieldAction: "Действие зрителя",
    namePlaceholder: "Например: Анна Иванова",
    compose: "Подготовить рекламный сценарий",
    result: "Предложение режиссёра", shots: "4 смысловые части",
    caption: "Заголовок в видео", script: "Текст для собственной озвучки",
    copy: "Копировать текст", copied: "Текст скопирован", copyFailed: "Выделите текст и скопируйте вручную",
    reviewed: "Я проверил(а) факты, квалификацию и рекламные правила своей юрисдикции. Использую только материалы с разрешением; без отзывов клиентов, вымышленных результатов и гарантии эффекта.",
    apply: "Перенести в бесплатный видеоредактор", voice: "Добавить свой голос",
    limitation: "Пока это видеозаготовка: 4 готовых MP4, один заголовок и отдельный текст для озвучки. Текст не становится автоматически синхронными субтитрами, AI-аватаром или готовой публикацией.",
    privacy: "Бриф остаётся в браузере. Никаких данных клиентов, AI-платежей и автопубликации.",
  },
  en: {
    badge: "NEW · FOR PRACTITIONERS",
    title: "Promo videos for my practice",
    intro: "For therapists, coaches, facilitators and other helping professionals. Choose the goal; get a reviewed creative draft and four scenes without prompting or paid APIs.",
    fieldFormat: "What are you creating?", fieldRole: "Your field", fieldTopic: "Main topic",
    fieldName: "Public name or practice name (optional)", fieldAction: "Viewer's next step",
    namePlaceholder: "For example: Anna Smith",
    compose: "Prepare my promotional script",
    result: "Director's suggestion", shots: "Four narrative beats",
    caption: "On-screen headline", script: "Script for your own voiceover",
    copy: "Copy script", copied: "Script copied", copyFailed: "Select the text and copy manually",
    reviewed: "I have checked qualifications, factual claims and local advertising rules. I have rights to any materials and will not use client testimonials, invented outcomes or guarantees.",
    apply: "Use in the free video editor", voice: "Add my own voice",
    limitation: "This is a video draft: four stock MP4 scenes, one headline and a separate narration script. There are no automatic synced subtitles, AI avatar or published ad.",
    privacy: "Brief stays in your browser. No client data, paid AI calls or auto-publishing.",
  },
  es: {
    badge: "NUEVO · PARA PROFESIONALES",
    title: "Vídeos promocionales para mi práctica",
    intro: "Para terapeutas, coaches, facilitadores y otros profesionales de apoyo. Elige el objetivo y recibe un guion y cuatro escenas sin prompts ni servicios de pago.",
    fieldFormat: "Qué quieres crear", fieldRole: "Tu especialidad", fieldTopic: "Tema principal",
    fieldName: "Nombre público o marca (opcional)", fieldAction: "Siguiente paso del público",
    namePlaceholder: "Por ejemplo: Ana García",
    compose: "Preparar mi guion promocional",
    result: "Propuesta del director", shots: "Cuatro momentos narrativos",
    caption: "Título en pantalla", script: "Texto para tu propia voz",
    copy: "Copiar texto", copied: "Texto copiado", copyFailed: "Selecciona y copia el texto manualmente",
    reviewed: "He verificado mi formación, las afirmaciones y las normas locales de publicidad. Tengo derechos sobre los materiales y no usaré testimonios de clientes, resultados ficticios ni garantías.",
    apply: "Usar en el editor gratuito", voice: "Añadir mi voz",
    limitation: "Por ahora es un borrador visual: cuatro MP4, un título y un guion de voz aparte. No incluye subtítulos automáticos, avatar de IA ni publicación.",
    privacy: "El brief se queda en el navegador. Sin datos de clientes, llamadas de pago ni publicación automática.",
  },
} as const;

export function MandalaProfessionalPromo({ locale, disabled, onApply, onOpenAudio }: Props) {
  const t = COPY[locale];
  const options = professionalPromoLabels(locale) as {
    formats: Record<string,string>; roles: Record<string,string>;
    topics: Record<string,string>; actions: Record<string,string>;
  };
  const [form, setForm] = useState<FormState>({
    format: "introduction", role: "psychologist", topic: "reflection",
    action: "details", displayName: "",
  });
  const [draft, setDraft] = useState<PromoDraft | null>(null);
  const [headline, setHeadline] = useState("");
  const [script, setScript] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState("");
  const update = (key: ChoiceKey, value: string) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setDraft(null); setReviewed(false); setMessage("");
  };
  const compose = () => {
    const result = buildProfessionalPromo({ ...form, locale });
    setDraft(result);
    setHeadline(result.headline);
    setScript(result.voiceScript);
    setReviewed(false);
    setMessage("");
  };
  const copyScript = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(script);
      setMessage(t.copied);
    } catch {
      setMessage(t.copyFailed);
    }
  };
  return (
    <details className={css.shell} data-professional-promo>
      <summary className={css.summary}>
        <span className={css.summaryIcon}><Film size={21} aria-hidden="true"/></span>
        <span className={css.summaryText}><small>{t.badge}</small><strong>{t.title}</strong></span>
        <span className={css.expand}><Sparkles size={17} aria-hidden="true"/></span>
      </summary>
      <div className={css.content}>
        <p className={css.intro}>{t.intro}</p>
        <div className={css.fields}>
          <label>{t.fieldFormat}<select data-promo-format value={form.format} disabled={disabled}
            onChange={event => update("format", event.currentTarget.value)}>
            {PROFESSIONAL_PROMO_FORMATS.map(id => <option value={id} key={id}>{options.formats[id]}</option>)}
          </select></label>
          <label>{t.fieldRole}<select data-promo-role value={form.role} disabled={disabled}
            onChange={event => update("role", event.currentTarget.value)}>
            {PROFESSIONAL_PROMO_ROLES.map(id => <option value={id} key={id}>{options.roles[id]}</option>)}
          </select></label>
          <label>{t.fieldTopic}<select data-promo-topic value={form.topic} disabled={disabled}
            onChange={event => update("topic", event.currentTarget.value)}>
            {PROFESSIONAL_PROMO_TOPICS.map(id => <option value={id} key={id}>{options.topics[id]}</option>)}
          </select></label>
          <label>{t.fieldAction}<select data-promo-action value={form.action} disabled={disabled}
            onChange={event => update("action", event.currentTarget.value)}>
            {PROFESSIONAL_PROMO_ACTIONS.map(id => <option value={id} key={id}>{options.actions[id]}</option>)}
          </select></label>
          <label className={css.wide}>{t.fieldName}<input data-promo-public-name type="text" maxLength={48}
            value={form.displayName} disabled={disabled} placeholder={t.namePlaceholder}
            onChange={event => update("displayName", event.currentTarget.value)}/></label>
        </div>
        <button className={css.compose} type="button" data-promo-compose disabled={disabled}
          onClick={compose}><Sparkles size={17} aria-hidden="true"/>{t.compose}</button>
        {draft ? <div className={css.draft} data-promo-draft aria-live="polite">
          <div className={css.draftHeading}><Check size={17} aria-hidden="true"/><strong>{t.result}</strong>
            <span>30s · 9:16 · 4 MP4</span></div>
          <div className={css.beats}><small>{t.shots}</small>
            <ol>{draft.beats.map((beat, index) => <li key={index}>
              <strong>{beat.label}</strong><span>{beat.script}</span>
            </li>)}</ol>
          </div>
          <label className={css.wide}>{t.caption}
            <input data-promo-headline value={headline} maxLength={60} disabled={disabled}
              onChange={event => {setHeadline(event.currentTarget.value);setReviewed(false);}}/>
          </label>
          <label className={css.wide}>{t.script}
            <textarea data-promo-script rows={5} maxLength={1500} value={script} disabled={disabled}
              onChange={event => {setScript(event.currentTarget.value);setReviewed(false);}}/>
          </label>
          <button type="button" className={css.copy} disabled={!script.trim()} onClick={copyScript}>
            <ClipboardCopy size={16} aria-hidden="true"/>{t.copy}
          </button>
          {message ? <span role="status" className={css.message}>{message}</span> : null}
          <label className={css.confirm}><input type="checkbox" data-promo-review checked={reviewed}
            disabled={disabled} onChange={event => setReviewed(event.currentTarget.checked)}/>
            <span><ShieldCheck size={17} aria-hidden="true"/>{t.reviewed}</span></label>
          <div className={css.actions}>
            <button className={css.apply} type="button" data-promo-apply
              disabled={disabled || !reviewed || !headline.trim() || !script.trim()}
              onClick={() => onApply({
                presetId: draft.presetId, durationSeconds: 30, headline: headline.trim(),
              })}>{t.apply}<ArrowRight size={16} aria-hidden="true"/></button>
            <button type="button" className={css.voice} disabled={disabled} onClick={onOpenAudio}>
              {t.voice}</button>
          </div>
          <p className={css.limit} role="note">{t.limitation}</p>
        </div> : null}
        <p className={css.privacy}><ShieldCheck size={15} aria-hidden="true"/>{t.privacy}</p>
      </div>
    </details>
  );
}
