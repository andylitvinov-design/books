// Place an editorial symptom summary after an existing indications block without
// changing, removing, or reclassifying any archived author text.
const indications = new Set(['показания', 'indications', 'indicaciones']);
const sourceHeadings = /^(?:показания|симптомы|основа|основное состояние|суть|смысл|эффект(?: препарата)?|архетипы?|образы?|идея(?: препарата)?|ритуал|трансформация|этап развития|внутренний конфликт|дополнительные материалы.*|indications|symptoms|basis|base|effect(?: of the remedy)?|archetypes?|images?|idea|transformation|ritual|development stage|additional materials.*|indicaciones|síntomas|base|efecto|arquetipos?|imágenes?|idea|transformación|ritual|etapa de desarrollo|materiales adicionales.*)$/iu;

function header(block) {
  if (block.includes('\n') || block.trim().length > 100) return '';
  return block.trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[^\p{L}]+/u, '')
    .replace(/[^\p{L}\s]+$/u, '')
    .trim().toLocaleLowerCase();
}

function isSourceHeading(block) {
  const label = header(block);
  if (!label) return false;
  return /^#{2,6}\s+\S/u.test(block.trim()) || sourceHeadings.test(label);
}

export function splitAtRemedyIndications(blocks) {
  const index = blocks.findIndex(block => indications.has(header(block)));
  if (index >= 0) {
    const next = blocks.findIndex((block, offset) => offset > index && isSourceHeading(block));
    const cut = next === -1 ? blocks.length : next;
    return { before: blocks.slice(0, cut), after: blocks.slice(cut), foundIndications: true };
  }
  // No explicit indications heading in some author originals. Display the
  // editorial summary before the next formal section, not in the Telegram archive.
  const next = blocks.findIndex(block => /^#{2,6}\s+\S/u.test(block.trim()));
  const cut = next > 0 ? next : next === 0 ? 0 : blocks.length;
  return { before: blocks.slice(0, cut), after: blocks.slice(cut), foundIndications: false };
}
