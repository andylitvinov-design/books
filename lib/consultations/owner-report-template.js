// De-identified owner-authored example from the report preview.
// Draft only: never attach to a patient record until the practitioner edits
// and explicitly creates that patient's documents. No patient identifiers.
export const OWNER_REPORT_TEXT_TEMPLATE = Object.freeze({
  analysis: `Было: к цели интерес 3/10 так как не было активного внимания (небольшая обида что не выбирают/ отвергают).

После сессии: к цели стало 6/10 (любопытство поиска разведчика).

Прием препаратов должен увеличить активность к цели до 7.3/10 (активное наблюдение)`,
  additionalNotes: `Схема:
- принимать препарат 2-3 раза в день по инструкции,
- раз в день ставить препарат на свое фото и запускать намерение (визуализировать цель).

Можно вести личный дневник наблюдений, отмечать уровень интереса по шкале в 10 баллов.`,
})
