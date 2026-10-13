// Single source for the optional educational guide in client PDFs.
// The text is imported from the published original article, not paraphrased.
import { distanceHomeopathyCopy } from '../../data/distance-homeopathy-content.js'

export function distanceHomeopathyAppendixBlocks(locale = 'en') {
  const text = distanceHomeopathyCopy[locale === 'ru' ? 'ru' : 'en']
  const blocks = []
  const heading = (value) => blocks.push({ kind: 'heading', text: value })
  const subheading = (value) => blocks.push({ kind: 'subheading', text: value })
  const paragraph = (value) => blocks.push({ kind: 'paragraph', text: value })

  heading(text.heading + '. ' + text.subheading)
  paragraph(text.lead)
  subheading(text.safetyTitle)
  paragraph(text.safetyText)
  heading(text.baseTitle)
  paragraph(text.baseIntro)
  subheading(text.optionOneTitle)
  paragraph(text.optionOneText)
  subheading(text.optionTwoTitle)
  paragraph(text.optionTwoText)
  heading(text.photoTitle)
  paragraph(text.photoLead)
  text.photoSteps.forEach((value, index) => paragraph(String(index + 1) + '. ' + value))
  subheading(text.observeTitle)
  paragraph(text.observeText)
  heading(text.advancedTitle)
  paragraph(text.advancedLead)
  subheading(text.selfTitle)
  text.selfItems.forEach(({ title, text: value }) => { subheading(title); paragraph(value) })
  subheading(text.sessionTitle)
  text.sessionItems.forEach(({ title, text: value }) => { subheading(title); paragraph(value) })
  heading(text.finishTitle)
  paragraph(text.finishText)
  return blocks
}

export function remedyDescriptionBlocks(markdown = '') {
  // Normalize presentation only. The author-approved original markdown remains
  // untouched in the library; this prevents unsupported emoji rendering as '?'.
  const text = String(markdown).replace(/\r\n?/g, '\n')
  const entries = text.split('\n').map((raw) => {
    const line = raw.trim()
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^[🔹🔸]\s*/u, '• ')
      .replace(/^(?:[\p{Extended_Pictographic}\uFE0F\u200D]+\s*)+(?=[A-ZА-ЯЁ])/u, '')
    if (!line) return { kind: 'space', text: '' }
    const heading = line.match(/^#{1,6}\s+(.+)$/)
    if (heading) return { kind: 'subheading', text: heading[1] }
    if (/^[A-ZА-ЯЁ][A-ZА-ЯЁ\d \-—:.,]{2,48}[.:]?$/.test(line) && line.trim().split(/\s+/).length <= 5) {
      return { kind: 'subheading', text: line }
    }
    return { kind: 'paragraph', text: line.replace(/^[-*]\s+/, '• ').replace(/^>\s?/, '') }
  })
  // Consecutive blank source lines are not extra page spacing.
  return entries.filter((entry, i) => entry.kind !== 'space' || (
    i > 0 && i < entries.length - 1 && entries[i - 1].kind !== 'space'
  ))
}