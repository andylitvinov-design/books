import { directMessageText } from './direct-message-policy.mjs'

const REFERENCE = /^HH-[A-F0-9]{12}$/
const MARK = '--- Holistic House · free express details (visitor consent) ---'

export function freeExpressOwnerParts(value) {
  const message = typeof value === 'string' ? value : ''
  const index = message.indexOf(MARK)
  if (index < 0) return { initial: message.trim(), details: '' }
  return {
    initial: message.slice(0, index).trim(),
    details: message.slice(index + MARK.length).trim(),
  }
}

export function prepareFreeExpressOwnerReply(reference, value) {
  if (!REFERENCE.test(reference || '')) throw new Error('INVALID_ENQUIRY_REFERENCE')
  const message = directMessageText(value)
  const prepared = 'Free review ' + reference + '\n\n' + message
  if (prepared.length > 1200) throw new Error('MESSAGE_TOO_LONG')
  return prepared
}
