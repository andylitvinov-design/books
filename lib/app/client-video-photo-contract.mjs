// Private reusable client photos for the existing Video Studio. No provider calls.
export const MAX_VIDEO_PHOTOS=8;
export const MAX_VIDEO_PHOTO_INPUT_BYTES=1_500_000;
export const MAX_VIDEO_PHOTO_BYTES=1_450_000;
export const MAX_VIDEO_PHOTO_TOTAL_BYTES=11_600_000;
export const VIDEO_PHOTO_ID=/^[a-f0-9]{64}$/;
const ACCOUNT_ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function videoPhotoPrefix(accountId){
  if(!ACCOUNT_ID.test(accountId||""))throw new Error("INVALID_ACCOUNT");
  return "client-video-photos/"+accountId+"/";
}
export function videoPhotoKey(accountId,id){
  if(!VIDEO_PHOTO_ID.test(id||""))throw new Error("INVALID_PHOTO_ID");
  return videoPhotoPrefix(accountId)+id+".jpg";
}
export function savedVideoPhotos(entries){
  return (Array.isArray(entries)?entries:[])
    .filter(item=>item&&typeof item.name==="string"&&VIDEO_PHOTO_ID.test(item.name.replace(/\.jpg$/,""))
      &&item.name.endsWith(".jpg")&&!item.name.includes("/"))
    .map(item=>({id:item.name.slice(0,-4),
      bytes:Number(item.metadata?.size)||0,createdAt:item.created_at||null}));
}
export function requireVideoPhotoPermission(input){
  const subject=input?.subject;
  if(input?.cloudConsent!=="true"||input?.photoRights!=="true"||
     !["self","other","minor"].includes(subject)||
     (subject!=="self"&&input?.subjectConsent!=="true")||
     (subject==="minor"&&input?.guardianConsent!=="true"))
    throw new Error("PHOTO_CONSENT_REQUIRED");
  return subject;
}
