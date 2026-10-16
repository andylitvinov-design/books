/** A received video ID is a recovery handle, not proof of a safe completed upload. */
export function uploadNeedsRecovery(entry) {
  return Boolean(entry?.videoId && (!entry.saved || entry.verificationError || entry.wrongChannel))
}

export function hasUnarchivedCompletedUpload(entries) {
  return entries.some(entry => entry.state === 'done' && uploadNeedsRecovery(entry))
}

export function retainUploadEntry(entry) {
  return entry.state !== 'done' || uploadNeedsRecovery(entry)
}

/** Verify the existing video before archiving it or allowing the next upload. */
export async function completeYoutubeUpload({videoId, channelId, readDetails, update, save}) {
  // Preserve the ID before any network read so recovery never creates a second video.
  update({state:'verifying',progress:100,videoId,saved:false,verificationError:null,wrongChannel:false})
  let details = null
  try {details = await readDetails()} catch {}
  const privacyStatus = details?.privacyStatus || 'unknown'
  const wrongChannel = Boolean(details?.channelId && details.channelId !== channelId)
  const verificationError = wrongChannel ? 'wrong_channel'
    : !details?.channelId || !['unlisted','private','public'].includes(privacyStatus) ? 'readback_unverified'
    : privacyStatus !== 'unlisted' ? 'unexpected_visibility' : null
  update({state:verificationError ? 'failed':'done',privacyStatus,wrongChannel,verificationError})
  if (verificationError) throw new Error(verificationError)
  // Use only the independently read-back identity, never the expected channel as a fallback.
  if (!await save(details)) throw new Error('history_unavailable')
}
