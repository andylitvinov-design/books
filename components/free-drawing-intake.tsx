"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, ShieldCheck } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { coachingIntakeEntryTopic } from "@/lib/coaching/intake-model";
import styles from "./free-drawing-intake.module.css";

const copy = {
  en: {
    eyebrow: "FREE WRITTEN SITUATION REVIEW", title: "Prepare your question privately",
    lead: "Use the existing coaching questionnaire. Sign in to save an encrypted private draft. Saving does not send it to a coach or create a booking. This is not a free live call.",
    drawing: "If a drawing helps, use paper and a pen to sketch ME, MY GOAL and MY PROBLEM. Keep the photo on your device until a secure handoff has been agreed with your practitioner. This questionnaire does not upload drawings.",
    action: "Open private coaching questionnaire",
    privacy: "Do not send private answers, drawings or test results through WhatsApp, Telegram or email. Contact channels are for scheduling and neutral requests only. Your draft is visible only to you. A symbolic written review is not a medical or mental-health diagnosis.",
  },
  ru: {
    eyebrow: "БЕСПЛАТНЫЙ ПИСЬМЕННЫЙ РАЗБОР", title: "Подготовьте запрос приватно",
    lead: "Используйте существующую коучинг-анкету. Войдите, чтобы сохранить зашифрованный личный черновик. Сохранение не отправляет его коучу и не создаёт запись. Это не бесплатный созвон.",
    drawing: "Если рисунок помогает, изобразите ручкой на бумаге Я, МОЯ ЦЕЛЬ и МОЯ ПРОБЛЕМА. Оставьте фото на своём устройстве до согласования защищённой передачи с мастером. Эта анкета не загружает рисунки.",
    action: "Открыть приватную коучинг-анкету",
    privacy: "Не отправляйте личные ответы, рисунки и результаты тестов через WhatsApp, Telegram или email. Каналы связи нужны только для согласования времени и нейтральных заявок. Черновик видите только вы. Символический разбор — не медицинский диагноз.",
  },
  es: {
    eyebrow: "REVISIÓN ESCRITA GRATUITA", title: "Prepara tu consulta en privado",
    lead: "Usa el formulario de coaching existente. Inicia sesión para guardar un borrador cifrado. Guardar no lo envía al coach ni reserva una cita. No es una llamada gratuita.",
    drawing: "Si te ayuda dibujar, representa en papel con bolígrafo YO, MI META y MI PROBLEMA. Conserva la foto en tu dispositivo hasta acordar una entrega segura con el profesional. Este formulario no sube dibujos.",
    action: "Abrir formulario privado de coaching",
    privacy: "No envíes respuestas privadas, dibujos ni resultados por WhatsApp, Telegram o correo. Los canales de contacto sirven solo para horarios y solicitudes neutrales. Solo tú ves el borrador. La revisión simbólica no es un diagnóstico médico.",
  },
} as const;

export function FreeDrawingIntake({ locale }: { locale: PublicLocale }) {
  const t = copy[locale], titleId = useId();
  const [topic, setTopic] = useState("personal");
  useEffect(() => { setTopic(coachingIntakeEntryTopic(window.location.search)); }, []);
  return <section className={styles.card} aria-labelledby={titleId} data-free-drawing-intake lang={locale}>
    <p className={styles.eyebrow}><FileText size={17} aria-hidden="true" />{t.eyebrow}</p>
    <h2 id={titleId}>{t.title}</h2>
    <p className={styles.lead}>{t.lead}</p>
    <p className={styles.note}>{t.drawing}</p>
    <Link className={styles.prepare} href={"/" + locale + "/coaching/intake?topic=" + topic} prefetch={false}>
      {t.action}<ArrowUpRight size={20} aria-hidden="true" />
    </Link>
    <p className={styles.privacy}><ShieldCheck size={17} aria-hidden="true" />{t.privacy}</p>
  </section>;
}
