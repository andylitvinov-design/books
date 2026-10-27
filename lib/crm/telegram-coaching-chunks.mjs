// Split a private coaching questionnaire into small encrypted CRM messages.
// The existing CRM definer rejects ciphertext >16,000 characters; a one-shot
// 40k questionnaire could otherwise report success without saving any answers.
// Chunks are UTF-8 bounded, lossless and written in one DB transaction.
export const MAX_COACHING_MESSAGE_BYTES = 3500
export const MAX_COACHING_MESSAGES = 48

export function coachingMessageChunks(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('INVALID_COACHING_MESSAGE')
  const parts=[]
  let current='', size=0
  for (const codepoint of text) {
    const bytes=Buffer.byteLength(codepoint,'utf8')
    if (size + bytes > MAX_COACHING_MESSAGE_BYTES && current) {
      parts.push(current)
      current=''
      size=0
    }
    current+=codepoint
    size+=bytes
    if (parts.length > MAX_COACHING_MESSAGES) throw new Error('COACHING_MESSAGE_TOO_LARGE')
  }
  if (current) parts.push(current)
  if (parts.length > MAX_COACHING_MESSAGES) throw new Error('COACHING_MESSAGE_TOO_LARGE')
  return parts
}
