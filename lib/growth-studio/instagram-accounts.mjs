// Owner-managed Instagram destination registry for the existing Growth Studio.
// Work and personal accounts are deliberately separate brands and credentials.
// Registry entries are requested targets, NOT proof of ownership, Meta authorization or
// permission to publish. Keep publishing and insights disabled until provider readback.
export const GROWTH_INSTAGRAM_ACCOUNT_TARGETS = Object.freeze([
  Object.freeze({
    id:'wizards_secrets',
    label:'@wizards.secrets',
    displayName:'Wizards Secrets',
    network:'instagram',
    accountRole:'work',
    brandKey:'wizards_secrets',
    ruPurpose:'Рабочий Instagram-профиль Holistic House: wizard-эстетика, короткие секреты, любопытные наблюдения, шутки и афоризмы. Ведёт аудиторию к бесплатным тестам и материалам Holistic House.',
    enPurpose:'Holistic House work Instagram: wizard-flavoured secrets, curious observations, jokes and short aphorisms that introduce people to free Holistic House tests and content.',
    contentPositioning:'Shareable wizard-flavoured curiosity and wit that leads naturally to free Holistic House tests and discovery.',
    connectionState:'pending_authorization',
    providerAccountId:null,
    providerPageId:null,
    publishEnabled:false,
    insightsEnabled:false,
  }),
  Object.freeze({
    id:'andy_therapist',
    label:'@andy.therapist',
    displayName:'Andy Therapist',
    network:'instagram',
    accountRole:'personal',
    brandKey:'andy_personal',
    ruPurpose:'Личный профессиональный Instagram Andy. Персональные экспертные публикации, авторские наблюдения и профессиональный контент; отдельные редактура, аналитика и разрешения.',
    enPurpose:'Andy’s personal professional Instagram. Personal expert posts, original observations and professional content, with separate editorial control, analytics and permissions.',
    contentPositioning:'Personal professional voice; do not blend with the Wizards Secrets entertainment account.',
    connectionState:'pending_authorization',
    providerAccountId:null,
    providerPageId:null,
    publishEnabled:false,
    insightsEnabled:false,
  }),
])
