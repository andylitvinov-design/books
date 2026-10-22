// iOS Voice Memos exports M4A, but Files and third-party file pickers can
// label imported recordings as octet-stream/empty or use vendor audio aliases.
// Normalize only a known audio extension + compatible MIME declaration.
// The server still validates content size, privacy scope and magic bytes.
const supportedAudioExtensions=Object.freeze({
  m4a:{mime:'audio/mp4',aliases:['','application/octet-stream','audio/x-m4a','audio/m4a','application/x-m4a']},
  mp3:{mime:'audio/mpeg',aliases:['','application/octet-stream','audio/mp3','audio/x-mp3','audio/x-mpeg','audio/mpeg3','audio/x-mpeg-3']},
  webm:{mime:'audio/webm',aliases:['','application/octet-stream','audio/x-webm']},
  wav:{mime:'audio/wav',aliases:['','application/octet-stream','audio/x-wav','audio/wave','audio/vnd.wave','audio/x-pn-wav']},
  wave:{mime:'audio/wav',aliases:['','application/octet-stream','audio/x-wav','audio/wave','audio/vnd.wave','audio/x-pn-wav']},
  ogg:{mime:'audio/ogg',aliases:['','application/octet-stream','audio/x-ogg','application/ogg']},
  oga:{mime:'audio/ogg',aliases:['','application/octet-stream','audio/x-ogg','application/ogg']},
  flac:{mime:'audio/flac',aliases:['','application/octet-stream','audio/x-flac']},
  aac:{mime:'audio/aac',aliases:['','application/octet-stream','audio/aacp','audio/x-aac']},
})

export function normalizePhoneAudioFile(file,FileType=globalThis.File) {
  if(!file||typeof file.size!=='number')return file
  const name=String(file.name||'')
  const extension=/\.([^.\\/]+)$/.exec(name)?.[1]?.toLowerCase()
  if(!extension||!Object.prototype.hasOwnProperty.call(supportedAudioExtensions,extension))return file
  const known=supportedAudioExtensions[extension]
  const declared=String(file.type||'').split(';')[0].trim().toLowerCase()
  if(declared===known.mime)return file
  if(!known.aliases.includes(declared)||typeof FileType!=='function')return file
  return new FileType([file],name,{
    type:known.mime,
    lastModified:Number.isFinite(file.lastModified)?file.lastModified:Date.now(),
  })
}
