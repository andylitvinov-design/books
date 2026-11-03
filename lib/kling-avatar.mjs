// Kling Avatar pilot: owner-only original portrait + PCM WAV. Never send client/clinical media.
const API = 'https://api-singapore.klingai.com';
const ID = /^[A-Za-z0-9_-]{8,128}$/;
const EXTERNAL = /^hh_avatar_[a-f0-9]{32}$/;
export const KLING_AVATAR_LIMITS = Object.freeze({
  imageBytes: 950_000, audioBytes: 2_100_000, totalBytes: 3_500_000,
  // Low-cost smoke test only: no more than 5 seconds of paid owner speech.
  // Long-form videos reuse original recording and offline editing until separately approved.
  minSeconds: 2, maxSeconds: 5,
});
export class KlingAvatarInputError extends Error {
  constructor() { super('validation'); this.code = 'validation'; }
}
const invalid = () => { throw new KlingAvatarInputError(); };

export function detectPortrait(bytes, mime) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 60 || bytes.length > KLING_AVATAR_LIMITS.imageBytes) invalid();
  let width, height;
  if (mime === 'image/png' &&
      Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (b.toString('ascii', 12, 16) !== 'IHDR') invalid();
    width = b.readUInt32BE(16); height = b.readUInt32BE(20);
  } else if (mime === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let at = 2;
    while (at + 9 < bytes.length) {
      if (bytes[at++] !== 0xff) invalid();
      let marker = bytes[at++];
      while (marker === 0xff && at < bytes.length) marker = bytes[at++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (at + 2 > bytes.length) break;
      const len = (bytes[at] << 8) | bytes[at + 1];
      if (len < 2 || at + len > bytes.length) invalid();
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        if (len < 7) invalid();
        height = (bytes[at + 3] << 8) | bytes[at + 4];
        width = (bytes[at + 5] << 8) | bytes[at + 6];
        break;
      }
      at += len;
    }
  } else invalid();
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 300 || height < 300 || width / height > 2.5 || height / width > 2.5) invalid();
  return { width, height };
}

export function pcmWavDuration(bytes, mime) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 48 || bytes.length > KLING_AVATAR_LIMITS.audioBytes ||
      !['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'].includes(mime)) invalid();
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (b.toString('ascii',0,4) !== 'RIFF' || b.toString('ascii',8,12) !== 'WAVE') invalid();
  if (b.readUInt32LE(4) + 8 > bytes.length) invalid();
  let at=12, fmt=null, payload=0;
  while(at+8<=bytes.length) {
    const tag=b.toString('ascii',at,at+4), len=b.readUInt32LE(at+4);
    const start=at+8;
    if (len > bytes.length-start) invalid();
    if(tag==='fmt ') {
      if (len < 16) invalid();
      const format=b.readUInt16LE(start), channels=b.readUInt16LE(start+2);
      const sampleRate=b.readUInt32LE(start+4), byteRate=b.readUInt32LE(start+8);
      const blockAlign=b.readUInt16LE(start+12), bits=b.readUInt16LE(start+14);
      if (format!==1 || ![1,2].includes(channels) || sampleRate<8000 || sampleRate>48000 ||
          ![16,24].includes(bits) || blockAlign!==channels*bits/8 ||
          byteRate!==sampleRate*blockAlign) invalid();
      fmt={byteRate,blockAlign};
    } else if(tag==='data') {
      if(payload) invalid();
      payload=len;
    }
    at=start+len+(len%2);
  }
  if (!fmt || !payload || payload%fmt.blockAlign!==0) invalid();
  const seconds=payload/fmt.byteRate;
  if(seconds<KLING_AVATAR_LIMITS.minSeconds || seconds>KLING_AVATAR_LIMITS.maxSeconds) invalid();
  return seconds;
}

export function normalizeKlingAvatar({ imageBytes, imageMime, audioBytes, audioMime, prompt='', externalTaskId }) {
  detectPortrait(imageBytes,imageMime);
  const seconds=pcmWavDuration(audioBytes,audioMime);
  if(typeof prompt!=='string' || prompt.length>1200 || typeof externalTaskId!=='string' ||
     !EXTERNAL.test(externalTaskId) || imageBytes.length+audioBytes.length>KLING_AVATAR_LIMITS.totalBytes) invalid();
  return { image:Buffer.from(imageBytes).toString('base64'),
    sound_file:Buffer.from(audioBytes).toString('base64'),
    prompt:prompt.trim(), mode:'std', external_task_id:externalTaskId, seconds };
}

function apiKeyOrError(key) {
  if(typeof key!=='string' || key.trim().length<12) throw Error('not_configured');
  return key.trim();
}
function validVideoUrl(value) {
  if(typeof value!=='string' || value.length>2500)return null;
  try { const u=new URL(value);return u.protocol==='https:' && !u.username && !u.password &&
    (u.hostname==='klingai.com' || u.hostname.endsWith('.klingai.com')) ? u.href:null; }catch{return null;}
}
async function bodyOrError(response) {
  if(!response?.ok)throw Error('provider_unavailable');
  let o;
  try {o=await response.json();}catch{throw Error('provider_unavailable');}
  if(o?.code!==0 || !o.data)throw Error('provider_unavailable');
  return o.data;
}
export async function submitKlingAvatar(input,{apiKey,fetchImpl=fetch}={}) {
  const key=apiKeyOrError(apiKey);
  // Restrict both modes and duration on the server; no raw source, secret or provider error is returned.
  const normalized=normalizeKlingAvatar(input);
  const {seconds,...body}=normalized;
  const response=await fetchImpl(API+'/v1/videos/avatar/image2video',{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25000),
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify(body),
  });
  const data=await bodyOrError(response);
  if(typeof data.task_id!=='string' || !ID.test(data.task_id)) throw Error('provider_unavailable');
  return {taskId:data.task_id, externalTaskId:body.external_task_id,
    seconds, status:['submitted','processing','succeed','failed'].includes(data.task_status) ? data.task_status:'submitted'};
}
export async function queryKlingAvatar(taskId,{apiKey,fetchImpl=fetch}={}) {
  const key=apiKeyOrError(apiKey);
  if(typeof taskId!=='string' || !ID.test(taskId))invalid();
  const response=await fetchImpl(API+'/v1/videos/avatar/image2video/'+encodeURIComponent(taskId),{
    method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(16000),
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
  });
  const data=await bodyOrError(response);
  const video=Array.isArray(data.task_result?.videos) ? data.task_result.videos[0]:null;
  const status=['submitted','processing','succeed','failed'].includes(data.task_status)
    ? data.task_status:'unknown';
  return {taskId,status,videoUrl:status==='succeed'?validVideoUrl(video?.url):null,
    duration:status==='succeed' && Number(video?.duration)>0?Number(video.duration):null};
}
