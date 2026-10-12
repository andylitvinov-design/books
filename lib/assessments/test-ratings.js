import { AppError, onlyKeys, revision } from './contracts.js'
export function validateRatingInput(input) {
  onlyKeys(input, ['stars', 'expectedRevision'])
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) throw new AppError('INVALID_RATING', 400)
  revision(input.expectedRevision)
  return input
}
// Public usefulness feedback is separate from test scores and scientific validity.
export const RATING_MINIMUM_COUNT = 5
export const RATING_RANKING_METHOD = 'mean-minimum-5'
export function ratingSummary(row) {
  const count = Number(row?.rating_count), sum = Number(row?.rating_sum)
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(sum) || sum < count || sum > count * 5) return null
  return { count, average: sum / count, ranked: count >= RATING_MINIMUM_COUNT }
}
export function compareTestRatings(a, b, summaries = {}) {
  const left = summaries[a.definition?.id], right = summaries[b.definition?.id]
  const leftRanked = left?.count >= RATING_MINIMUM_COUNT, rightRanked = right?.count >= RATING_MINIMUM_COUNT
  if (leftRanked !== rightRanked) return leftRanked ? -1 : 1
  if (!leftRanked) return 0 // Preserve relevance order, never promote a single 5-star vote.
  return right.average - left.average || right.count - left.count || a.key.localeCompare(b.key)
}
export const RATING_COPY = {
  en: { title: 'How useful was this test?', note: 'Rate your experience of the test and its interpretation. This is feedback on usefulness, not scientific validity or a diagnosis.', choose: 'Your rating', star: 'out of 5 stars', save: 'Save rating', update: 'Update rating', saving: 'Saving…', saved: 'Rating saved. You can change it later.', error: 'The rating could not be saved. Try again.', unavailable: 'Ratings are temporarily unavailable.', conflict: 'Your rating changed in another tab. Reload it before saving again.', reload: 'Reload rating', guest: 'Save this result to your Cabinet and sign in to rate it. One changeable rating per account and test.', guestAction: 'Save result and sign in', loading: 'Loading your rating…', top: 'Highest rated', recommended: 'Best match', sort: 'Sort tests', method: 'Highest rated: average usefulness rating, at least 5 ratings for this questionnaire version and language. Ties use rating count. Tests with fewer ratings follow in match order. Selected tests stay first in the full catalog.', empty: 'No ratings yet', votes: 'ratings', few: 'Not enough ratings to rank', privacy: 'Only the average and number of ratings are public. Your name and test results are never shown with your rating.', remove: 'Remove rating', removed: 'Rating removed.' },
  ru: { title: 'Насколько полезен этот тест?', note: 'Оцените ваш опыт прохождения теста и получения интерпретации. Это оценка полезности, а не научной достоверности или диагноза.', choose: 'Ваша оценка', star: 'из 5 звёзд', save: 'Сохранить оценку', update: 'Изменить оценку', saving: 'Сохраняем…', saved: 'Оценка сохранена. Её можно изменить позже.', error: 'Не удалось сохранить оценку. Попробуйте ещё раз.', unavailable: 'Рейтинги временно недоступны.', conflict: 'Оценка изменилась в другой вкладке. Загрузите её перед повторным сохранением.', reload: 'Загрузить оценку', guest: 'Сохраните результат в кабинете и войдите, чтобы оценить тест. Один изменяемый голос на аккаунт и тест.', guestAction: 'Сохранить результат и войти', loading: 'Загружаем вашу оценку…', top: 'Сначала высокооценённые', recommended: 'По соответствию запросу', sort: 'Сортировка тестов', method: 'По рейтингу: средняя оценка полезности при наличии минимум 5 голосов для этой версии и языка опросника. При равенстве учитываем число голосов. Тесты с меньшим числом оценок идут ниже по соответствию запросу. Во всей базе выбранные тесты остаются первыми.', empty: 'Пока нет оценок', votes: 'оценок', few: 'Недостаточно оценок для рейтинга', privacy: 'Публичны только средняя оценка и число голосов. Ваше имя и результаты теста не публикуются вместе с оценкой.', remove: 'Удалить оценку', removed: 'Оценка удалена.' },
  es: { title: '¿Te ha sido útil esta prueba?', note: 'Valora la utilidad de la prueba y su interpretación, no su validez científica ni un diagnóstico.', choose: 'Tu valoración', star: 'de 5 estrellas', save: 'Guardar valoración', update: 'Cambiar valoración', saving: 'Guardando…', saved: 'Valoración guardada. Puedes cambiarla después.', error: 'No se pudo guardar. Inténtalo de nuevo.', unavailable: 'Las valoraciones no están disponibles temporalmente.', conflict: 'La valoración cambió en otra pestaña. Vuelve a cargarla antes de guardar.', reload: 'Recargar valoración', guest: 'Guarda el resultado e inicia sesión para valorar. Una valoración modificable por cuenta y prueba.', guestAction: 'Guardar e iniciar sesión', loading: 'Cargando valoración…', top: 'Mejor valoradas', recommended: 'Mejor coincidencia', sort: 'Ordenar pruebas', method: 'Por valoración media de utilidad, con al menos 5 votos para esta versión e idioma. Los empates se ordenan por número de votos. Con menos votos se mantiene el orden de afinidad; las pruebas seleccionadas siguen primero en el catálogo.', empty: 'Sin valoraciones', votes: 'valoraciones', few: 'Faltan valoraciones para clasificar', privacy: 'Solo se publican la media y el número de votos, nunca tu nombre ni los resultados.', remove: 'Eliminar valoración', removed: 'Valoración eliminada.' },
}
export const ratingCopy = locale => RATING_COPY[locale] || RATING_COPY.en
