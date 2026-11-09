// Owner-managed Instagram destination registry for the existing Growth Studio.
// These are requested account targets, NOT evidence of account ownership, Meta OAuth,
// Metricool linkage or permission to publish. Keep all publishing disabled until a
// provider readback binds each target to a real professional Instagram account.
export const GROWTH_INSTAGRAM_ACCOUNT_TARGETS = Object.freeze([
  Object.freeze({
    id:'my_coach_ai',
    label:'@my.coach.ai',
    network:'instagram',
    ruPurpose:'Аккаунт направления My Coach AI. Назначение контента и права публикации будут привязаны после подтверждения Meta-аккаунта.',
    enPurpose:'My Coach AI brand account. Content routing and publishing permissions will be bound after Meta account authorization.',
    connectionState:'pending_authorization',
    providerAccountId:null,
    publishEnabled:false,
  }),
  Object.freeze({
    id:'my_couch_ai',
    label:'@my.couch.ai',
    network:'instagram',
    ruPurpose:'Отдельный аккаунт My Couch AI. Не объединяется с My Coach AI; подключается и публикуется независимо.',
    enPurpose:'Separate My Couch AI account. It is not merged with My Coach AI and will have independent authorization and publishing.',
    connectionState:'pending_authorization',
    providerAccountId:null,
    publishEnabled:false,
  }),
])
