// Owner-managed Instagram destination registry for the existing Growth Studio.
// These are requested account targets, NOT evidence of account ownership, Meta OAuth,
// Metricool linkage or permission to publish. Keep each target disabled until its own
// provider readback binds the exact handle to a real professional Instagram account.
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
  Object.freeze({
    id:'wizards_secrets',
    label:'@wizards.secrets',
    network:'instagram',
    ruPurpose:'Развлекательный проект Wizards Secrets: юмор, афоризмы и наблюдения о повседневной жизни, любви и человеческой природе без нравоучений.',
    enPurpose:'Wizards Secrets entertainment profile: witty aphorisms and observations about everyday life, love and human nature, without preaching.',
    connectionState:'pending_authorization',
    providerAccountId:null,
    publishEnabled:false,
  }),
  Object.freeze({
    id:'andy_therapist',
    label:'@andy.therapist',
    network:'instagram',
    ruPurpose:'Личный профессиональный профиль Andy Therapist для публичных материалов о практике и консультациях. Клиентские и терапевтические данные не используются.',
    enPurpose:'Andy Therapist professional profile for public practice and consultation information. No private client or therapy data is used.',
    connectionState:'pending_authorization',
    providerAccountId:null,
    publishEnabled:false,
  }),
])
