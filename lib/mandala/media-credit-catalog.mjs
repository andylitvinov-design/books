// Shared pricing in *USD minor units*. The browser never authorizes a charge.
export const WELCOME_BONUS_MINOR = 200;
export const MEDIA_CREDIT_OFFERS = Object.freeze([
  { sku: "video-basic", kind: "video", minor: 0, available: true },
  { sku: "video-smart", kind: "video", minor: 200, available: false },
  { sku: "video-pro", kind: "video", minor: 990, available: false },
  { sku: "audio-basic", kind: "audio", minor: 0, available: true },
  { sku: "audio-smart", kind: "audio", minor: 50, available: false },
  { sku: "audio-pro", kind: "audio", minor: 150, available: false },
]);
export const MEDIA_TOPUP_PACKS = Object.freeze([500, 1000, 2000]);
export function mediaOffer(sku) {
  return MEDIA_CREDIT_OFFERS.find(item => item.sku === sku) || null;
}
export function creditAmount(minor) {
  return (minor / 100).toFixed(2);
}
