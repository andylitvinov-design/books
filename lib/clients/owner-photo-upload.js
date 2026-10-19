// Private report photographs travel through the owner's authenticated same-origin
// endpoint. Keep each binary request well below Vercel's 4.5 MB function cap.
// No photo bytes or user-specific metadata are sent to a public CDN.
export const OWNER_PHOTO_PROXY_MAX_BYTES=3_000_000
export const OWNER_PHOTO_MIME_TYPES=Object.freeze([
  'image/jpeg','image/png','image/webp',
])
export const canProxyOwnerPhoto=(file)=>Boolean(file&&
  OWNER_PHOTO_MIME_TYPES.includes((file.type||'').split(';')[0].toLowerCase())&&
  Number.isSafeInteger(file.size)&&file.size>=128&&
  file.size<=OWNER_PHOTO_PROXY_MAX_BYTES)
