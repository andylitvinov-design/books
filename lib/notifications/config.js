// Public enrollment configuration. No private key is returned to browser callers.
export function getNotificationConfig(env = process.env) {
  const publicKey = env.HH_COURSE_PUSH_PUBLIC_KEY || ''
  const bytes = /^[A-Za-z0-9_-]{87}$/.test(publicKey) ? Buffer.from(publicKey, 'base64url') : null
  const environment = env.HH_COURSE_PUSH_ENVIRONMENT === 'live' ? 'live' : 'sandbox'
  const productionApproved = env.VERCEL_ENV !== 'production' || (environment === 'live' && env.HH_COURSE_PUSH_PRODUCTION_APPROVED === 'true')
  const storageAvailable = env.HH_COURSE_PUSH_STORAGE_APPROVED === 'true' && productionApproved
  const configured = env.HH_COURSE_PUSH_ENABLED === 'true' && bytes?.length === 65 && bytes[0] === 4 && storageAvailable
  const available = Boolean(configured && productionApproved)
  const deliveryEnabled = available && env.HH_COURSE_PUSH_DELIVERY_APPROVED === 'true' && env.HH_COURSE_PUSH_DISPATCH_APPROVED === 'true' && dispatchSecretsReady(env)
  return Object.freeze({ storageAvailable, available, environment, publicKey: available ? publicKey : null, deliveryEnabled })
}
export function getNotificationDispatchConfig(env = process.env) {
  const publicConfig = getNotificationConfig(env)
  const privateKey = env.HH_COURSE_PUSH_PRIVATE_KEY || '', subject = env.HH_COURSE_PUSH_SUBJECT || '', cronSecret = env.HH_COURSE_PUSH_CRON_SECRET || env.CRON_SECRET || ''
  const keyValid = /^[A-Za-z0-9_-]{43}$/.test(privateKey) && Buffer.from(privateKey, 'base64url').length === 32
  const subjectValid = /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject) || /^https:\/\/[^\s/#?]+\/?$/.test(subject)
  return Object.freeze({ ...publicConfig, deliveryEnabled: publicConfig.deliveryEnabled && keyValid && subjectValid && cronSecret.length >= 32, privateKey, subject, cronSecret })
}

function dispatchSecretsReady(env) {
  const secret = env.HH_COURSE_PUSH_PRIVATE_KEY || '', subject = env.HH_COURSE_PUSH_SUBJECT || '', cron = env.HH_COURSE_PUSH_CRON_SECRET || env.CRON_SECRET || ''
  return /^[A-Za-z0-9_-]{43}$/.test(secret) && Buffer.from(secret, 'base64url').length === 32 && cron.length >= 32 && (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject) || /^https:\/\/[^\s/#?]+\/?$/.test(subject))
}
