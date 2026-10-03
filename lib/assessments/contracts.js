/** Pure contracts shared by the runner, scorer and tests. No browser persistence. */
export class AppError extends Error {
  constructor(code, status = 400) {
    super(code)
    this.name = 'AppError'
    this.code = code
    this.status = status
  }
}
export function fail(code, status = 400) {
  throw new AppError(code, status)
}
export function assertObject(value) {
  if (
    !value ||
    Array.isArray(value) ||
    typeof value !== 'object' ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    fail('INVALID_OBJECT')
  return value
}
export function onlyKeys(value, allowed) {
  assertObject(value)
  if (Object.keys(value).some((key) => !allowed.includes(key))) fail('UNKNOWN_FIELD')
  return value
}
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}
export function canonicalJSON(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']'
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + canonicalJSON(value[key]))
        .join(',') +
      '}'
    )
  return JSON.stringify(value)
}
export function requireUUID(value) {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
    fail('INVALID_ID')
  return value
}
export function requireDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d\d-\d\dT/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    fail('INVALID_DATE')
  return new Date(value).toISOString()
}
export function requireTimezone(value) {
  if (typeof value !== 'string' || value.length > 100) fail('INVALID_TIMEZONE')
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format()
  } catch {
    fail('INVALID_TIMEZONE')
  }
  return value
}
export function text(value, max = 1000) {
  if (typeof value !== 'string' || [...value].length > max || /\u0000/.test(value))
    fail('INVALID_TEXT')
  return value.trim()
}
export function revision(value) {
  if (!Number.isSafeInteger(value) || value < 0) fail('INVALID_REVISION')
  return value
}
