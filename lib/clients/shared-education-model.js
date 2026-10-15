// Reusable, non-personal educational video for homeopathy consultation reports.
// This is NOT an individual prescription or an instruction to change a dose.
export const GRANULES_GUIDE_ID = 'homeopathy-granules-ru-v2'
export const GRANULES_GUIDE_SOURCE_VIDEO_ID = '1e4fb28d920f7fc4739d33e14061c56b'
export const GRANULES_GUIDE_OBJECT_KEY = 'shared/homeopathy/2026-10-15-granules-ru-v2.mp4'
export const GRANULES_GUIDE_DURATION_SECONDS = 62.448
export const GRANULES_GUIDE_TRANSCRIPT_RU = `Знаете, меня часто спрашивают: сколько гранул гомеопатии лучше принимать? Пять, десять или больше?

Поделюсь своим наблюдением.

Пять гранул — уже можно наблюдать небольшое изменение. Десять гранул — более сильное воздействие. Пятнадцать еще мощнее, но может быть перебор.

Казалось бы, чем больше, тем сильнее эффект? Не совсем!

Цель гомеопатии как раз через минимальное воздействие направлять организм к росту.

Лучше придерживаться индивидуальной инструкции в вашем отчёте.

А если изменений нет — не спешите увеличивать дозу. Лучше проверим препарат и потенцию.

И самое интересное — наблюдайте за своим настроением, физическим состоянием, реакциями на людей и жизненные ситуации.

Делитесь своими наблюдениями. До связи!`

// Activation is deliberately separate from code publication. The expected
// byte count must match the independently QA'd single shared private MP4.
export function granulesGuideConfig(env) {
  const raw = env?.HH_CLIENT_GRANULES_GUIDE_BYTES
  const bytes = typeof raw === 'string' && /^[1-9]\\d*$/.test(raw) ? Number(raw) : 0
  const ready = env?.HH_CLIENT_DELIVERY_ENABLED === 'true' &&
    env?.HH_CLIENT_GRANULES_GUIDE_APPROVED === 'true' &&
    Number.isSafeInteger(bytes) && bytes >= 1024 && bytes <= 45000000
  return {ready, bytes:ready ? bytes : 0}
}
