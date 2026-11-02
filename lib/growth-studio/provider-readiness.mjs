// Authoritative, private, read-only Growth Studio publisher connection status.
// ChatGPT plugins, HYPD ad accounts and locally drafted content do NOT confer
// publishing access to this website. Provider state is never inferred from
// remembered IDs, installed apps or presence of a social-network card.
import {GROWTH_PUBLICATION_NETWORKS} from './channel-capabilities.mjs'
import {telegramPublicStatus} from './telegram.mjs'
import {normalizeGoogleOauthClientId,normalizeChannelConfig} from '../youtube/upload-history-model.mjs'
import {getYoutubeHistoryStore} from '../youtube/upload-history-store.js'

const STATE = Object.freeze({
  absent:'not_connected',
  configured:'configured_unverified',
  manual:'manual_only',
  external:'external_tool',
  unavailable:'unavailable',
})
const ALWAYS_MANUAL = new Set([
  'facebook','instagram','twitter','linkedin','pinterest','google_business',
  'tiktok','mastodon','threads','bluesky','wordpress','manual','meetup',
])

// No external requests, provider writes, browser storage or token readback.
// YouTube OAuth Client ID is public, but we return ONLY its presence, not its
// value. Actual Google consent/channel identity remains a separate user flow.
export async function readGrowthStudioProviderReadiness({
  environment=process.env,
  youtubeStore,
}={}) {
  if (typeof window !== 'undefined') throw new Error('server_only')
  const telegram=telegramPublicStatus(environment)
  const channels=Object.fromEntries(GROWTH_PUBLICATION_NETWORKS.map(id=>[
    id,{state:ALWAYS_MANUAL.has(id)?STATE.manual:
      id==='eventbrite'?STATE.external:STATE.absent},
  ]))
  channels.telegram={
    state:telegram.ready?STATE.configured:STATE.absent,
    // Provider permissions must still be checked by the existing explicit
    // Telegram button. Configuration itself is NOT a verified channel.
    channelConfigured:telegram.ready,
  }

  let store=youtubeStore
  if (store === undefined) store=getYoutubeHistoryStore()
  let storeReadable=false
  let oauthId=normalizeGoogleOauthClientId(environment.HH_YOUTUBE_UPLOAD_OAUTH_CLIENT_ID||'')
  let englishPaired=false
  if (store) {
    try {
      const [savedId,pairedChannels]=await Promise.all([store.oauthConfig(),store.channels()])
      storeReadable=true
      if(!oauthId) oauthId=normalizeGoogleOauthClientId(savedId||'')
      englishPaired=Boolean(normalizeChannelConfig(pairedChannels?.en))
    } catch {
      // A failed Redis read can never appear as a usable uploader, even with
      // a configured environment OAuth client ID.
    }
  }
  const uploaderDisabled=environment.HH_YOUTUBE_PHONE_UPLOAD_ENABLED==='false'
  channels.youtube={
    state:!storeReadable?STATE.unavailable:
      !uploaderDisabled&&oauthId?STATE.configured:STATE.absent,
    uploaderStoreReadable:storeReadable,
    oauthClientConfigured:Boolean(oauthId),
    englishChannelPaired:englishPaired,
    uploaderDisabled,
    // Crucial: configured OAuth client means a possible sign-in, NOT a
    // Google login token, upload permission, or permission for Growth Studio.
  }
  return {channels}
}

export const GROWTH_CONNECTION_STATES=Object.freeze(Object.values(STATE))
