// De-identified owner-authored example from the report preview.
// Draft only: never attach to a patient record until the practitioner edits
// and explicitly creates that patient's documents. No patient identifiers.
const RU_REPORT_TEMPLATE = Object.freeze({
  analysis: `Было: к цели интерес 3/10 так как не было активного внимания (небольшая обида что не выбирают/ отвергают).

После сессии: к цели стало 6/10 (любопытство поиска разведчика).

Прием препаратов должен увеличить активность к цели до 7.3/10 (активное наблюдение)`,
  additionalNotes: `Схема:
- принимать препарат 2-3 раза в день по инструкции,
- раз в день ставить препарат на свое фото и запускать намерение (визуализировать цель).

Можно вести личный дневник наблюдений, отмечать уровень интереса по шкале в 10 баллов.`,
})


// Practitioner-authored draft only. Edit and approve for each individual client.
export const OWNER_REPORT_TEXT_TEMPLATES = Object.freeze({
  ru: RU_REPORT_TEMPLATE,
  en: Object.freeze({
    analysis: "Before the session: interest in the goal was 3/10, with little active attention to it (some hurt about not being chosen or feeling rejected).\n\nAfter the session: interest in the goal rose to 6/10 (curiosity and a willingness to explore).\n\nTarget to observe after working with the selected remedies: engagement with the goal at 7.3/10 (active observation).",
    additionalNotes: "Plan:\n- take the remedy 2–3 times a day as instructed;\n- once a day, place the remedy on your photograph and set an intention (visualize your goal).\n\nYou can keep a personal observation journal and rate your level of interest on a 10-point scale.",
  }),
})

export const OWNER_REPORT_TEXT_TEMPLATE = RU_REPORT_TEMPLATE
export function getOwnerReportTextTemplate(locale = 'ru') {
  return OWNER_REPORT_TEXT_TEMPLATES[locale === 'en' ? 'en' : 'ru']
}
