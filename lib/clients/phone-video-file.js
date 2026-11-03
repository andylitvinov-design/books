// A MOV selected from iPhone Photos is often reported as video/quicktime,
// but some iOS file pickers omit or mislabel the MIME. Normalize only known
// MOV extensions, without changing media bytes or promising transcoding.
export const QUICKTIME_MIME='video/quicktime'
export const isQuickTimeVideo=(file)=>Boolean(file&&
  (/\.mov$/i.test(String(file.name||''))||
   String(file.type||'').split(';')[0].toLowerCase()===QUICKTIME_MIME))
export function normalizePhoneVideoFile(file,FileType=globalThis.File){
  if(!file||typeof file.size!=='number')return file
  const name=String(file.name||'')
  const declared=String(file.type||'').split(';')[0].toLowerCase()
  const mov=/\.mov$/i.test(name),mp4=/\.mp4$/i.test(name)
  if(!mov&&!mp4)return file
  const mime=mov?QUICKTIME_MIME:'video/mp4'
  if(declared===mime)return file
  if(!['','video/mp4',QUICKTIME_MIME,'application/octet-stream',
       'application/quicktime'].includes(declared))return file
  if(typeof FileType!=='function')return file
  return new FileType([file],name,{type:mime,lastModified:file.lastModified||Date.now()})
}
