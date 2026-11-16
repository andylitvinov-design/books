// The existing, verified public YouTube mirrors of the exact published HeyGen videos.
// Share this one authoritative mapping between the player and master gallery.
export const existingYouTubeMirrors: Readonly<Record<string, string>> = {
  ed202847a43a96b918308aa972177b34: "Y4K4piEwwA8",
  "48105a2f2228e7cb3a67391e97acaf8b": "s30Y42IwPcg",
  "34df311e461509433b45929908a9097a": "ILyRWyHtJoE",
  "388a04b39ebf215ae656bcd22d0d0847": "AE8Pelpo424",
  "79c2845577865979cd95ac40a08fc01a": "Cz6SxXJNZbw",
  "0f984780d06948b1e78166e6e553e4e9": "Q9NvYECKWuc",
};

/** Known AI productions only: YouTube itself does not prove a video is original.
 * Unmarked public recordings retain their approved status and display before
 * explicitly known HeyGen masters. Keep this shared with every video gallery. */
type VideoOriginInput = { url?: string | null; heygenId?: string | null; youtubeId?: string | null }
const knownSyntheticYouTubeIds = new Set(Object.values(existingYouTubeMirrors))

export function isKnownSyntheticVideoSource(video: VideoOriginInput): boolean {
  if (typeof video.heygenId === 'string' && /^[a-f0-9]{32}$/i.test(video.heygenId)) return true
  if (typeof video.youtubeId === 'string' && knownSyntheticYouTubeIds.has(video.youtubeId)) return true
  if (!video.url) return false
  try {
    const source = new URL(video.url)
    if (source.protocol !== 'https:') return false
    if (source.hostname === 'app.heygen.com')
      return /^\/(?:share|embeds)\/[a-f0-9]{32}\/?$/i.test(source.pathname)
    let youtubeId: string | null = null
    if (['www.youtube.com', 'youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(source.hostname)) {
      youtubeId = source.pathname === '/watch' ? source.searchParams.get('v')
        : source.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/)?.[1] || null
    } else if (source.hostname === 'youtu.be') {
      youtubeId = source.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1] || null
    }
    return !!youtubeId && knownSyntheticYouTubeIds.has(youtubeId)
  } catch {
    return false
  }
}

/** Stable sorts preserve the existing order within original and AI video groups. */
export function compareVideoAuthenticity(a: VideoOriginInput, b: VideoOriginInput): number {
  return Number(isKnownSyntheticVideoSource(a)) - Number(isKnownSyntheticVideoSource(b))
}
