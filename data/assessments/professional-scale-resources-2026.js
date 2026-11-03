// Public *research metadata*, not test items, response keys, protected manuals or cutoffs.
// This allowlist controls which rights-gated catalog references receive a standalone
// Holistic House educational PDF about the scales. Adding a registry entry alone
// must never make a copyrighted questionnaire available for download.
const rows = [
  ['who-5', 'WHO-5 Well-Being Index', ['Subjective well-being over the preceding two weeks'], 'https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01', 'WHO CC BY-NC-SA: commercial use needs permission. Do not redistribute the original questionnaire.'],
  ['pss-10', 'Perceived Stress Scale (PSS-10)', ['Perceived unpredictability', 'Perceived uncontrollability', 'Perceived overload'], '', 'Do not reproduce the original questionnaire without applicable authorization. No universal diagnostic cutoff.'],
  ['psqi', 'Pittsburgh Sleep Quality Index (PSQI)', ['Subjective sleep quality', 'Sleep latency', 'Sleep duration', 'Habitual sleep efficiency', 'Sleep disturbances', 'Sleep medication use', 'Daytime dysfunction'], '', 'The full form and scoring instructions are controlled by the rights holder.'],
  ['bdi-ii', 'Beck Depression Inventory - II (BDI-II)', ['Severity of self-reported depressive symptoms'], '', 'Pearson-controlled assessment. Published dimensions do not authorize copying items or score tables.'],
  ['bai-21', 'Beck Anxiety Inventory (BAI)', ['Severity of self-reported anxiety symptoms'], '', 'Publisher-controlled instrument: items and official scoring require the appropriate licence.'],
  ['stai-40', 'State-Trait Anxiety Inventory (STAI)', ['State anxiety', 'Trait anxiety'], '', 'Protected form and norms; use the official licensed instrument.'],
  ['mmpi-3', 'Minnesota Multiphasic Personality Inventory-3', ['Validity and response style', 'Higher-order scales', 'Restructured clinical scales', 'Specific problem scales', 'Personality psychopathology scales'], '', 'Qualified professional administration and licensed materials are required.'],
  ['mbi', 'Maslach Burnout Inventory', ['Emotional exhaustion', 'Depersonalization / cynicism', 'Personal accomplishment / efficacy'], '', 'Publisher-controlled versions; domain names are educational only.'],
  ['scl-90-r', 'Symptom Checklist-90-Revised', ['Somatization', 'Obsessive-compulsive symptoms', 'Interpersonal sensitivity', 'Depression', 'Anxiety', 'Hostility', 'Phobic anxiety', 'Paranoid ideation', 'Psychoticism'], '', 'Proprietary instrument; not an open questionnaire or scoring manual.'],
  ['pcl-5', 'PTSD Checklist for DSM-5 (PCL-5)', ['Intrusion symptoms', 'Avoidance', 'Negative alterations in cognition and mood', 'Arousal and reactivity'], 'https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp', 'Official VA form is public domain, but it is intended for qualified professionals and researchers; do not present this guide as a self-diagnosis.'],
  ['ecr-r-36', 'Experiences in Close Relationships - Revised', ['Attachment anxiety', 'Attachment avoidance'], '', 'Assessment and translation rights are not established here; this document is not the questionnaire.'],
  ['ysq-s3-90', 'Young Schema Questionnaire - Short Form 3', ['Early maladaptive schema domains', 'Disconnection and rejection', 'Impaired autonomy and performance', 'Impaired limits', 'Other-directedness', 'Overvigilance and inhibition'], '', 'Licensed schema questionnaire; the full 18-schema instrument is not reproduced.'],
  ['iip-32', 'Inventory of Interpersonal Problems (IIP-32)', ['Assertiveness and dominance', 'Social involvement', 'Affiliation and nurturance', 'Interpersonal distress'], '', 'Only high-level measurement themes, not protected scale contents or norms.'],
  ['lsas-sr-24', 'Liebowitz Social Anxiety Scale - Self Report', ['Social fear', 'Social avoidance', 'Performance situations', 'Social interaction situations'], '', 'No online or PDF questionnaire reproduction without confirmed rights.'],
  ['dass-21', 'Depression Anxiety Stress Scales (DASS-21)', ['Depression', 'Anxiety', 'Stress'], '', 'This educational PDF does not include items or reproduce an official form; see the instrument owner for use conditions.'],
  ['neo-pi-3', 'NEO Personality Inventory 3', ['Neuroticism', 'Extraversion', 'Openness', 'Agreeableness', 'Conscientiousness'], '', 'Commercial personality assessment: full facets, test materials and normative scores require licensed access.'],
  ['16pf-fifth-edition', 'Sixteen Personality Factor Questionnaire', ['Sixteen primary personality factors', 'Five global factors', 'Response style indices'], '', 'Publisher-controlled questionnaire and scoring; no form or norm reproduction.'],
  ['maia-2-37', 'Multidimensional Assessment of Interoceptive Awareness - 2', ['Noticing', 'Not-Distracting', 'Not-Worrying', 'Attention Regulation', 'Emotional Awareness', 'Self-Regulation', 'Body Listening', 'Trusting'], 'https://osher.ucsf.edu/research/maia', 'UCSF makes an official PDF available without charge, with attribution and use conditions. Use the official copy for the actual survey.'],
  ['bfne-12', 'Brief Fear of Negative Evaluation Scale', ['Fear of negative evaluation by others'], '', 'Research overview only; rights for reproducing the original items or a translation must be checked.'],
  ['fscrs-22', 'Forms of Self-Criticizing / Attacking and Self-Reassuring Scale', ['Inadequate Self', 'Hated Self', 'Reassured Self'], '', 'The scale names are public constructs; this is not an authorized questionnaire.'],
  ['ras-7', 'Relationship Assessment Scale', ['Subjective relationship satisfaction'], '', 'Survey text and validated translations are not included.'],
  ['cfq-7', 'Cognitive Fusion Questionnaire - 7', ['Cognitive fusion / entanglement with thoughts'], 'https://doi.org/10.1371/journal.pone.0246434', 'Educational summary; research-access forms are not automatically licensed for this commercial website.'],
  ['mlq-10', 'Meaning in Life Questionnaire', ['Presence of meaning', 'Search for meaning'], '', 'No items or scoring keys are reproduced; refer to authors for permissions.'],
  ['sdi-2-14', 'Sexual Desire Inventory - 2', ['Dyadic sexual desire', 'Solitary sexual desire'], '', 'Non-explicit research summary only; the copyrighted form is not reproduced.'],
  ['gq-6', 'Gratitude Questionnaire - Six Item Form', ['Dispositional gratitude'], '', 'No validated item text or score cutoffs are included.'],
  ['uwes-9', 'Utrecht Work Engagement Scale - 9', ['Vigor', 'Dedication', 'Absorption'], '', 'Check authors\' permission before digital or commercial administration.'],
  ['ffmq-15', 'Five Facet Mindfulness Questionnaire - Short Form', ['Observing', 'Describing', 'Acting with awareness', 'Nonjudging', 'Nonreactivity'], '', 'Short-form versions differ; this overview is not a standardized score report.'],
  ['fss-9', 'Fatigue Severity Scale', ['Impact of fatigue on everyday functioning'], '', 'No original item text or proprietary interpretations are provided.'],
]

export const PROFESSIONAL_SCALE_RESOURCES = Object.freeze(Object.fromEntries(
  rows.map(([key, title, scales, sourceUrl, rightsNotice]) => [key, Object.freeze({
    key, title, scales: Object.freeze(scales), sourceUrl, rightsNotice,
    downloadType: 'educational_scale_guide_only',
  })]),
))

export function getProfessionalScaleResource(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(PROFESSIONAL_SCALE_RESOURCES, key)
    ? PROFESSIONAL_SCALE_RESOURCES[key] : null
}
