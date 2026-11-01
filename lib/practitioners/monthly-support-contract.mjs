const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const MONTHLY_SUPPORT_TITLE = "Personal support · 2 x 60 min · EUR 200 per month";
export const MONTHLY_SUPPORT_PRICE_MINOR = 20000;
export const MONTHLY_SUPPORT_CURRENCY = "EUR";
export const MONTHLY_SUPPORT_SLOTS = 2;
const formats = new Set(["online_call","remote_no_call","toronto_in_person"]);
const methods = new Set(["wise","paypal_personal","bank_transfer"]);
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const keys = (input,allowed) => Object.keys(input).every(key => allowed.includes(key));
const uuid = value => typeof value === "string" && UUID.test(value);
export function normalizeMonthlySupportOwnerAction(input) {
  if (!object(input) || typeof input.action !== "string") throw new Error("INVALID_REQUEST");
  if (input.action === "activate") {
    if (!keys(input,["action","operationId","sourceEnquiryId","clientAccountId","format","paymentMethod","receiptReference","confirmedByOwner","clientConsentConfirmed","termsAgreed"])) throw new Error("INVALID_REQUEST");
    if (!uuid(input.operationId) || !uuid(input.sourceEnquiryId) || !uuid(input.clientAccountId) ||
        !formats.has(input.format) || !methods.has(input.paymentMethod) ||
        input.confirmedByOwner !== true || input.clientConsentConfirmed !== true || input.termsAgreed !== true)
      throw new Error("INVALID_REQUEST");
    const receipt = typeof input.receiptReference === "string" ? input.receiptReference.trim() : "";
    if (!/^[A-Za-z0-9][A-Za-z0-9_./:#+ -]{5,159}$/.test(receipt)) throw new Error("INVALID_RECEIPT");
    return {action:"activate",operationId:input.operationId.toLowerCase(),
      sourceEnquiryId:input.sourceEnquiryId.toLowerCase(),clientAccountId:input.clientAccountId.toLowerCase(),
      format:input.format,paymentMethod:input.paymentMethod,receiptReference:receipt};
  }
  if (input.action === "schedule") {
    if (!keys(input,["action","programId","ordinal","scheduledAt","expectedRevision"]) ||
       !uuid(input.programId) || ![1,2].includes(input.ordinal) ||
       !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision<1 ||
       typeof input.scheduledAt !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?Z$/.test(input.scheduledAt) ||
       !Number.isFinite(Date.parse(input.scheduledAt))) throw new Error("INVALID_REQUEST");
    return {action:"schedule",programId:input.programId.toLowerCase(),ordinal:input.ordinal,
      expectedRevision:input.expectedRevision,scheduledAt:new Date(input.scheduledAt).toISOString()};
  }
  if (input.action === "complete") {
    if (!keys(input,["action","programId","ordinal","expectedRevision"]) ||
       !uuid(input.programId) || ![1,2].includes(input.ordinal) ||
       !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision<1) throw new Error("INVALID_REQUEST");
    return {action:"complete",programId:input.programId.toLowerCase(),
      ordinal:input.ordinal,expectedRevision:input.expectedRevision};
  }
  throw new Error("INVALID_ACTION");
}
