import { AppError, onlyKeys, requireTimezone, requireUUID } from '../assessments/contracts.js'

export const MOODS = Object.freeze(['sad', 'neutral', 'happy'])
export const MOOD_CATEGORIES = Object.freeze([
  'body',
  'energy',
  'emotions',
  'relationships',
  'work-money',
  'other',
])
export const MOOD_SOURCES = Object.freeze(['cabinet_landing', 'portrait', 'monitoring'])

export function validateMoodInput(input) {
  onlyKeys(input, ['mood', 'category', 'timezone', 'sourceSurface', 'operationId'])
  requireUUID(input.operationId)
  requireTimezone(input.timezone)
  if (!MOODS.includes(input.mood)) throw new AppError('INVALID_MOOD', 400)
  if (input.category !== null && input.category !== undefined && !MOOD_CATEGORIES.includes(input.category))
    throw new AppError('INVALID_MOOD_CATEGORY', 400)
  if (!MOOD_SOURCES.includes(input.sourceSurface)) throw new AppError('INVALID_MOOD_SOURCE', 400)
  return {
    mood: input.mood,
    category: input.category || null,
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
    operationId: row.operation_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}
