import { marketingEligibility, CRM_CHANNELS } from './consent.js'

export const CRM_SEGMENTS = Object.freeze(['all_opted_in', 'active_subscribers', 'free_accounts'])
export const CRM_TEMPLATES = Object.freeze({
  course_update: {
    en: { subject: 'What is new at Holistic House', body: 'Explore the latest self-guided courses and practical resources in your account.' },
    ru: { subject: 'Что нового в Holistic House', body: 'Посмотрите новые самостоятельные курсы и практические материалы в своём кабинете.' },
    es: { subject: 'Novedades de Holistic House', body: 'Descubre los nuevos cursos a tu ritmo y los recursos prácticos en tu cuenta.' },
  },
  service_update: {
    en: { subject: 'Holistic House services', body: 'Browse the available services, their formats and prices. You can choose what suits you at your own pace.' },
    ru: { subject: 'Услуги Holistic House', body: 'Посмотрите доступные услуги, форматы и цены. Выбирайте то, что подходит вам, в удобное время.' },
    es: { subject: 'Servicios de Holistic House', body: 'Consulta los servicios disponibles, sus formatos y precios. Elige lo que te interese a tu ritmo.' },
  },
})

function httpsUrl(value) { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password } catch { return false } }
// An owner must explicitly attest to a public business mailing address.
 // It will be INCLUDED IN EVERY promotional Telegram message. Do not use a
 // private/home address unless the owner intentionally wants it disclosed.
export function validateTelegramCampaignSender(sender) {
  if (!sender || typeof sender!=='object' || Array.isArray(sender) ||
      Object.keys(sender).some(key=>!['name','postalAddress','addressConfirmed'].includes(key)))
    throw new Error('SENDER_IDENTIFICATION_REQUIRED')
  const name=typeof sender.name==='string'?sender.name.trim():''
  const postalAddress=typeof sender.postalAddress==='string'
    ?sender.postalAddress.trim()
      .replaceAll(String.fromCharCode(13),' ')
      .replaceAll(String.fromCharCode(10),', ')
      .replace(/ {2,}/g,' ') : ''
  const containsControls=value=>Array.from(value).some(char=>char.charCodeAt(0)<32)
  if(sender.addressConfirmed!==true ||
     name.length<3 || name.length>100 ||
     postalAddress.length<10 || postalAddress.length>240 ||
     containsControls(name)||containsControls(postalAddress))
    throw new Error('SENDER_IDENTIFICATION_REQUIRED')
  return {name,postalAddress,addressConfirmed:true}
}
export function validateCampaignDraft(draft) {
  if (!draft || typeof draft !== 'object') throw new Error('INVALID_CAMPAIGN')
  if (Object.keys(draft).some((key) => !['templateId', 'locale', 'channel', 'segment', 'sender'].includes(key))) throw new Error('UNEXPECTED_CAMPAIGN_FIELD')
  if (!Object.hasOwn(CRM_TEMPLATES, draft.templateId) || !Object.hasOwn(CRM_TEMPLATES[draft.templateId], draft.locale)) throw new Error('INVALID_TEMPLATE')
  if (!CRM_CHANNELS.includes(draft.channel) || !CRM_SEGMENTS.includes(draft.segment)) throw new Error('INVALID_SEGMENT_OR_CHANNEL')
  if(draft.channel==='telegram'){
    if(draft.segment!=='all_opted_in')throw new Error('INVALID_SEGMENT_OR_CHANNEL')
    return {...draft,sender:validateTelegramCampaignSender(draft.sender),status:'draft'}
  }
  if(draft.sender!==undefined)throw new Error('UNEXPECTED_CAMPAIGN_FIELD')
  return { ...draft, status: 'draft' }
}

// Computes a plan only; never sends. Dispatcher must recheck consent immediately before each send.
export function prepareCampaignPlan({ draft, contacts, sender, approvedContactIds = [], providerReady = false }, now = new Date()) {
  validateCampaignDraft(draft)
  if (!sender?.name?.trim() || !sender?.postalAddress?.trim() || !httpsUrl(sender.contactUrl) || !httpsUrl(sender.unsubscribeBaseUrl)) throw new Error('SENDER_IDENTIFICATION_REQUIRED')
  const approved = new Set(approvedContactIds)
  const seen = new Set()
  const recipients = []
  const excluded = []
  for (const contact of contacts) {
    if (seen.has(contact.id)) continue
    seen.add(contact.id)
    const eligible = marketingEligibility({ contactId: contact.id, channel: draft.channel, events: contact.consentEvents, suppressed: contact.suppressed, verifiedAddress: contact.verifiedAddress }, now)
    const segmentMatches = draft.segment === 'all_opted_in' || (draft.segment === 'active_subscribers' && contact.subscriptionActive === true) || (draft.segment === 'free_accounts' && contact.subscriptionActive === false)
    const reason = !eligible.allowed ? eligible.reason : !segmentMatches ? 'segment_mismatch' : !approved.has(contact.id) ? 'campaign_approval_required' : !providerReady ? 'provider_unconfigured' : null
    if (reason) excluded.push({ contactId: contact.id, reason })
    else recipients.push({ contactId: contact.id, consentEventId: eligible.consentEventId })
  }
  return { status: 'prepared_only', channel: draft.channel, recipients, excluded, requiresSendTimeConsentRecheck: true }
}
