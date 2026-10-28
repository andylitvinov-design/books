import assert from 'node:assert/strict'

// Existing approved ten-chapter landing (#1874), not a count-only allowance.
export const ALCHEMY_PANEL_IDS = Object.freeze([
  'featured-video', 'hero', 'situations', 'method', 'report', 'video',
  'reviews', 'formats', 'faq', 'request',
])
const reviewSources = Object.freeze({
  en: Object.freeze(['Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js', 'itjo2_z2NGk', '4NrryHcEF1A', 'hYwRNMxIMjc']),
  ru: Object.freeze(['m9RfDgK76PU', 'MIVLm1GUTtM', 'ttQxUHopaUM', 'VABgpmn4ZYA', 'muOnIHllI7E', '5oj0BIbLT4w']),
})

export function assertAlchemyPanelGeometry(measurements) {
  assert.deepEqual(measurements.map(panel => panel.name), ALCHEMY_PANEL_IDS,
    'Alchemy must retain exactly ten unique chapters in the approved order')
  for (const panel of measurements) {
    assert.ok(Number.isFinite(panel.height) && panel.height > 0 && Number.isFinite(panel.max) && panel.max > 0,
      'Alchemy chapter geometry must be present: ' + panel.name)
  }
  // The already-approved twelve-video feed grows vertically. The other nine
  // chapters retain the original viewport-minus-80 one-screen limit unchanged.
  assert.deepEqual(measurements.filter(panel => panel.name !== 'reviews' && panel.height > panel.max), [],
    'Every collapsed Alchemy service chapter must fit one phone screen: ' + JSON.stringify(measurements))
}

// Read only public editorial identifiers/audio labels and rectangles. No text,
// URLs, contact values, storage, cookies, network or event callbacks are read.
export function collectAlchemyReviewGeometry(section) {
  const feed = section.querySelector('[data-alchemy-review-stack]')
  const cards = Array.from(feed?.querySelectorAll('[data-testimonial-video-id]') ?? [], card => {
    const rect = card.getBoundingClientRect()
    const frame = card.querySelector('.site-video-frame')?.getBoundingClientRect()
    return { id: card.getAttribute('data-testimonial-video-id'),
      audio: card.getAttribute('data-testimonial-original-audio'),
      top: rect.top, bottom: rect.bottom, width: Math.round(rect.width),
      videoWidth: Math.round(frame?.width ?? 0) }
  })
  const sectionRect = section.getBoundingClientRect()
  const headingRect = section.querySelector('header')?.getBoundingClientRect()
  const firstRect = feed?.firstElementChild?.getBoundingClientRect()
  const noteRect = section.querySelector('[data-alchemy-review-note]')?.getBoundingClientRect()
  return { cards, scrollWidth: feed?.scrollWidth ?? 0, clientWidth: feed?.clientWidth ?? 0,
    topGap: headingRect && firstRect ? Math.round(firstRect.top - headingRect.bottom) : null,
    bottomGap: noteRect ? Math.round(sectionRect.bottom - noteRect.bottom) : null }
}

export function assertAlchemyReviewFeed(measurements, { locale, width }) {
  assert.ok(['en', 'ru', 'es'].includes(locale))
  assert.ok(Number.isFinite(width) && width > 0)
  const languages = locale === 'ru' ? ['ru', 'en'] : ['en', 'ru']
  const expected = languages.flatMap(audio => reviewSources[audio].map(id => ({ id, audio })))
  const { cards } = measurements
  assert.deepEqual(cards.map(({ id, audio }) => ({ id, audio })), expected,
    'All twelve approved original-language testimonials remain once, locale-first')
  assert.ok(measurements.clientWidth > 0 && measurements.scrollWidth <= measurements.clientWidth + 1,
    'Vertical testimonial stack cannot overflow horizontally')
  for (const [index, card] of cards.entries()) {
    assert.ok([card.top, card.bottom, card.width, card.videoWidth].every(Number.isFinite) &&
      card.bottom > card.top && card.width > 0 && card.videoWidth > 0, 'Every testimonial card and video has visible geometry')
    assert.ok(index === 0 || card.top >= cards[index - 1].bottom, 'Testimonial cards must stack vertically without overlap')
    assert.ok(card.width - card.videoWidth <= 12, 'Testimonial video must fill its card')
    // Match the existing standalone mobile geometry contract; desktop cards
    // retain their intentional 760px max-width rather than filling a 1280px page.
    if (width <= 680) assert.ok(card.videoWidth >= width - 65, 'Testimonial videos must occupy nearly the full mobile width')
  }
  assert.ok(Number.isFinite(measurements.topGap) && measurements.topGap <= 55 &&
    Number.isFinite(measurements.bottomGap) && measurements.bottomGap <= 55,
    'Testimonial section must not introduce blank viewport-sized gaps')
}
