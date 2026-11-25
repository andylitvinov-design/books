export type ReadyBasicVideoReason='checking'|'unavailable'|'guest_used'|'insufficient'|null;
export type ReadyBasicVideoAccess={allowed:boolean;reason:ReadyBasicVideoReason;chargeCredits:number};
export function readyBasicVideoAccess(options:{
  catalog:{chargeRequired:boolean;ready:boolean;blocked:boolean;priceCredits:number}|null;
  session:'checking'|'guest'|'signed_in'|'unavailable';
  balanceCredits:number|null;
  guestFirstVideoUsed?:boolean;
}):ReadyBasicVideoAccess;
