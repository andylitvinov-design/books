// Owner-managed Instagram destination registry for the existing Growth Studio.
// These handles are owner-specified intended destinations, NOT proof of ownership,
// Meta OAuth, professional-account status, Page linkage, Metricool access or permission
// to publish. Keep publishing disabled until provider identity/scopes are verified.
export const GROWTH_INSTAGRAM_ACCOUNT_TARGETS = Object.freeze([
  Object.freeze({
    id:'wizards_secrets',
    label:'@wizards.secrets',
    network:'instagram',
    accountRole:'work',
    brandKey:'wizards_secrets',
    ruPurpose:'Рабочий Instagram Holistic House: основной публичный контент, Social SEO, аналитика и продвижение материалов проекта.',
    enPurpose:'Holistic House work Instagram: primary public content, Social SEO, analytics and project promotion.',
    connectionState:'pending_authorization',
    providerAccountId:null,
    providerPageId:null,
    publishEnabled:false,
    insightsEnabled:false,
  }),
  Object.freeze({
    id:'andy_therapist',
    label:'@andy.therapist',
    network:'instagram',
    accountRole:'personal',
    brandKey:'andy_personal',
    ruPurpose:'Личный профессиональный Instagram Andy: персональные экспертные публикации и отдельная аналитика. Не смешивать с рабочим аккаунтом.',
    enPurpose:'Andy’s personal professional Instagram: personal expert content and separate analytics. Keep independent from the work account.',
    connectionState:'pending_authorization',
    providerAccountId:null,
    providerPageId:null,
    publishEnabled:false,
    insightsEnabled:false,
  }),
])
