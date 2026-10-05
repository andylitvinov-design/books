import {
  AppError,
  onlyKeys,
  requireDate,
  requireTimezone,
  requireUUID,
} from '../assessments/contracts.js'

export const MOODS = Object.freeze(['sad', 'neutral', 'happy'])
export const MOOD_CATEGORIES = Object.freeze([
  'body',
  'energy',
  'emotions',
  'relationships',
  'work-money',
  'other',
])
export const MOOD_SURFACES = Object.freeze(['cabinet_landing', 'portrait', 'tests'])

export function validateMoodInput(input) {
  onlyKeys(input, ['mood', 'category', 'occurredAt', 'timezone', 'sourceSurface', 'operationId'])
  if (!MOODS.includes(input.mood)) throw new AppError('INVALID_MOOD', 400)
  const category = input.category ?? null
  if (category !== null && !MOOD_CATEGORIES.includes(category))
    throw new AppError('INVALID_MOOD_CATEGORY', 400)
  const occurredAt = requireDate(input.occurredAt)
  requireTimezone(input.timezone)
  if (!MOOD_SURFACES.includes(input.sourceSurface))
    throw new AppError('INVALID_MOOD_SURFACE', 400)
  requireUUID(input.operationId)
  return {
    mood: input.mood,
    category,
    occurredAt,
    timezone: input.timezone,
    sourceSurface: input.sourceSurface,
    operationId: input.operationId,
  }
}

export function moodView(row) {
  return {
    id: row.id,
    mood: row.mood,
    category: row.category || null,
    occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : row.occurred_at,
    timezone: row.timezone,
    sourceSurface: row.source_surface,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    ...(row.expires_at
      ? { expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at }
      : {}),
  }
}
