"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, ShieldCheck } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { coachingIntakeEntryTopic } from "@/lib/coaching/intake-model";
import styles from "./free-drawing-intake.module.css";

const copy = {
en: {
    eyebrow: "WRITE YOUR QUESTION PRIVATELY", title: "Would you rather write it all down?",
    lead: "You can use the questionnaire on this website. Sign in to keep a private, encrypted draft. Saving the draft doesn't send it to Andrey or book a session. The free review is a written reply, not a live call.",
    drawing: "If a drawing feels useful, take a sheet of paper and mark three things: ME, MY GOAL and MY PROBLEM. Keep any photo on your own device for now. This questionnaire can't upload drawings.",
    action: "Open the private questionnaire",
    privacy: "Please don't send personal answers, drawings, test results or medical records through a messenger or email. We'll arrange a protected way to share anything needed. This review isn't a medical diagnosis.",
  },
ru: {
    eyebrow: "ЗАПИСАТЬ ВОПРОС ПРИВАТНО", title: "Удобнее сначала всё записать?",
    lead: "Можно открыть анкету на сайте и спокойно ответить на вопросы. После входа вы сможете сохранить защищённый черновик. Он не отправится мне автоматически и не создаст запись на сессию. Бесплатный разбор — это письменный ответ, а не созвон.",
    drawing: "Если захочется, нарисуйте на листе три части: «Я», «Моя цель» и «Моя проблема». Фото пока оставьте у себя. Загрузить рисунок через эту анкету нельзя.",
    action: "Открыть личную анкету",
    privacy: "Личные ответы, рисунки, результаты тестов и медицинские документы не отправляйте в мессенджеры или по почте. Если они понадобятся, согласуем защищённый способ передачи. Этот разбор не является медицинской диагностикой.",
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
