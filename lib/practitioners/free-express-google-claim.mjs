// A same-tab, non-sensitive OAuth continuation hint, NOT an authorization token.
// Only a verified account plus the HttpOnly HMAC cookie may bind an enquiry.
export const EXPRESS_GOOGLE_CLAIM_PENDING_KEY = "hh-free-express-google-claim-v1";
export const EXPRESS_GOOGLE_CLAIM_MAX_AGE_MS = 10 * 60 * 1000;
const REF = /^HH-[A-F0-9]{12}$/;
export function validExpressGoogleClaimIntent(value,locale,path,now=Date.now()){
  return Boolean(value && typeof value==="object" && !Array.isArray(value)
    && REF.test(value.referenceCode || "")
    && value.locale===locale && ["en","ru","es"].includes(locale)
    && path==="/"+locale+"/services/free-situation-review"
    && value.path===path
    && Number.isSafeInteger(value.createdAt)
    && value.createdAt<=now && now-value.createdAt<EXPRESS_GOOGLE_CLAIM_MAX_AGE_MS);
}
