/** Preserve PostgreSQL microseconds. Converting these values to JS Date before
 * persisting loses precision and breaks strict source/snapshot equality. */
export function databaseTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?[+-]\d{2}(?::\d{2})?$/.test(value)) throw new Error('INVALID_DATABASE_TIMESTAMP')
  return value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00').replace(/\+00:00$/, 'Z')
}
