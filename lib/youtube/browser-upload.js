import {CHUNK_BYTES, nextByteOffset, verifiedSessionUrl} from './phone-upload-protocol.mjs'

const API = 'https://www.googleapis.com'

function safeJson(body) {
  try { return JSON.parse(body || '{}') } catch { return {} }
}

function xhrRequest({method, url, token, headers = {}, body = null, signal, onProgress}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url, true)
    xhr.timeout = method === 'POST' ? 60_000 : 0
    xhr.setRequestHeader('Authorization', 'Bearer ' + token)
    Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value))
    if (onProgress) xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(event.loaded)
    }
    const onAbort = () => xhr.abort()
    const cleanup = () => signal?.removeEventListener('abort', onAbort)
    if (signal?.aborted) {reject(new Error('upload_paused')); return}
    signal?.addEventListener('abort', onAbort, {once:true})
    xhr.onload = () => {
      cleanup()
      resolve({status:xhr.status, body:safeJson(xhr.responseText), location:xhr.getResponseHeader('Location'), range:xhr.getResponseHeader('Range')})
    }
    xhr.onerror = () => {cleanup(); reject(new Error('network_interrupted'))}
    xhr.ontimeout = () => {cleanup(); reject(new Error('network_interrupted'))}
    xhr.onabort = () => {cleanup(); reject(new Error('upload_paused'))}
    xhr.send(body)
  })
}

function assertSuccess(response, allowed) {
  if (!allowed.includes(response.status)) {
    if (response.status === 401 || response.status === 403) throw new Error('youtube_permission')
    if (response.status === 429) throw new Error('youtube_quota')
    throw new Error('youtube_http_' + response.status)
  }
}

export async function getConnectedChannel(token, signal) {
  const response = await fetch(API + '/youtube/v3/channels?part=id,snippet&mine=true', {
    headers: {Authorization: 'Bearer ' + token}, signal, cache:'no-store',
  })
  if (!response.ok) throw new Error('youtube_permission')
  const data = await response.json()
  if (!Array.isArray(data.items) || data.items.length !== 1 || !data.items[0].id) throw new Error('channel_ambiguous')
  return {id: data.items[0].id, name: data.items[0].snippet?.title || data.items[0].id, handle: data.items[0].snippet?.customUrl || ''}
}

export async function beginUpload(file, token, metadata, signal) {
  const response = await xhrRequest({
    method:'POST',
    url:API + '/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    token, signal,
    headers:{
      'Content-Type':'application/json; charset=UTF-8',
      'X-Upload-Content-Type':file.type || 'application/octet-stream',
      'X-Upload-Content-Length':String(file.size),
    },
    body: JSON.stringify(metadata),
  })
  assertSuccess(response, [200,201])
  if (!response.location) throw new Error('cors_session_header')
  return verifiedSessionUrl(response.location)
}

export async function probeUpload(url, token, total, signal) {
  const response = await xhrRequest({
    method:'PUT', url:verifiedSessionUrl(url), token, signal,
    headers:{'Content-Range':'bytes */' + total, 'Content-Type':'application/octet-stream'},
  })
  if ([200,201].includes(response.status) && response.body.id) return {done:true, videoId:response.body.id, offset:total}
  assertSuccess(response, [308])
  return {done:false, offset:nextByteOffset(response.range, total)}
}

export async function putChunk(url, token, file, offset, signal, onProgress) {
  const end = Math.min(file.size, offset + CHUNK_BYTES)
  const chunk = file.slice(offset, end)
  const response = await xhrRequest({
    method:'PUT', url:verifiedSessionUrl(url), token, signal,
    headers:{
      'Content-Type':file.type || 'application/octet-stream',
      'Content-Range':'bytes ' + offset + '-' + (end - 1) + '/' + file.size,
    },
    body:chunk,
    onProgress:sent => onProgress?.(Math.min(file.size, offset + sent)),
  })
  if ([200,201].includes(response.status) && response.body.id) return {done:true, videoId:response.body.id, offset:file.size}
  assertSuccess(response, [308])
  const next = nextByteOffset(response.range, file.size)
  if (next <= offset || next > end) throw new Error('invalid_range')
  return {done:false, offset:next}
}

/**
 * Read back the authoritative channel ID as well as visibility. Browser tokens
 * remain in memory; video metadata is requested from Google, not our server.
 */
export async function readUploadedDetails(id, token, signal, {requireProcessed=false}={}) {
  try {
    const response = await fetch(API + '/youtube/v3/videos?part=snippet,status&id=' + encodeURIComponent(id), {
      headers:{Authorization:'Bearer ' + token}, signal, cache:'no-store',
    })
    if (!response.ok) return null
    const data = await response.json()
    const resource = data.items?.find(item => item?.id === id)
    if (!resource) return null
    // A confirmed video ID is not final while YouTube is still transcoding.
    // Imported private owner videos must reach the processed terminal state.
    if (requireProcessed && resource.status?.uploadStatus !== 'processed') return null
    const privacy = resource.status?.privacyStatus
    return {
      privacyStatus:['private','unlisted','public'].includes(privacy) ? privacy : null,
      channelId:/^UC[A-Za-z0-9_-]{22}$/.test(resource.snippet?.channelId || '')
        ? resource.snippet.channelId : null,
    }
  } catch {return null}
}

export async function readUploadedVisibility(id, token, signal) {
  const details = await readUploadedDetails(id,token,signal)
  return details?.privacyStatus ?? null
}
