/** Count semicolon-separated source records, including export IDs and channel posts. */
export function countSupplementarySources(references = '') {
  return references.split(';').filter((reference) =>
    /^(?:message-?\d+|(?:https?:\/\/t\.me\/)?[a-z][a-z0-9_]*\/\d+)(?=\s|$)/i.test(reference.trim()),
  ).length
}
