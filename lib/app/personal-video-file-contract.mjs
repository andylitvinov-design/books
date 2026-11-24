// Shared upload limits for finished client MP4s. No storage or provider access.
export const PERSONAL_VIDEO_MAX_BYTES=12_000_000
export const PERSONAL_VIDEO_MAX_SECONDS=60

export function personalVideoFileError(code){
  const error=new Error(code)
  error.code=code
  return error
}

export function validPersonalVideoDuration(value){
  return Number.isInteger(value)&&value>=1&&value<=PERSONAL_VIDEO_MAX_SECONDS
}

export function personalVideoDuration(seconds){
  if(!Number.isFinite(seconds)||seconds<=0||seconds>PERSONAL_VIDEO_MAX_SECONDS)
    throw personalVideoFileError('VIDEO_DURATION_NOT_ALLOWED')
  return Math.ceil(seconds)
}

export async function inspectPersonalVideoFile(file){
  if(!file||!Number.isSafeInteger(file.size)||file.size<1024||typeof file.slice!=='function')
    throw personalVideoFileError('INVALID_VIDEO_FILE')
  if(file.size>PERSONAL_VIDEO_MAX_BYTES)throw personalVideoFileError('VIDEO_TOO_LARGE')
  const mime=typeof file.type==='string'?file.type.toLowerCase():''
  // iPhone Files may omit the MIME or use octet-stream. Only a named .mp4
  // may use that fallback, and the bytes must still identify an MP4 below.
  if(mime!=='video/mp4'&&(!['','application/octet-stream'].includes(mime)||
    typeof file.name!=='string'||!/\.mp4$/i.test(file.name)))
    throw personalVideoFileError('INVALID_VIDEO_FILE')
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer())
  const box=String.fromCharCode(...bytes.slice(4,8))
  const brand=String.fromCharCode(...bytes.slice(8,12))
  if(bytes.length<12||box!=='ftyp'||
    !/^(?:isom|iso[2-9]|mp4[12]|avc[13]|M4V[ H]|M4VP|MSNV|dash|cmf[cs]|F4V )$/.test(brand))
    throw personalVideoFileError('INVALID_VIDEO_FILE')
}
