import assert from 'node:assert/strict'

// Passed directly to page.evaluate; it must not close over Node-side values.
export function collectBachGeometry() {
  const root = document.querySelector('[data-personal-result-report][data-bach-profile="true"]')
  const rectangle = node => {
    const rect = node.getBoundingClientRect()
    return { left: rect.left + scrollX, right: rect.right + scrollX, top: rect.top + scrollY,
      bottom: rect.bottom + scrollY, width: rect.width, height: rect.height }
  }
  const isVisible = node => {
    if (node.closest('details:not([open])') && !node.closest('summary')) return false
    const style = getComputedStyle(node), rect = node.getBoundingClientRect()
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
  }
  const describe = node => `${node.tagName.toLowerCase()}.${String(node.className)}: ${node.textContent.trim().replace(/\s+/g, ' ').slice(0, 160)}`
  const elements = [root, ...root.querySelectorAll('*')].filter(isVisible).map(node => {
    const style = getComputedStyle(node)
    return { label: describe(node), rect: rectangle(node), clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
      clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, display: style.display,
      overflowX: style.overflowX, overflowY: style.overflowY, whiteSpace: style.whiteSpace,
      overflowWrap: style.overflowWrap, minWidth: style.minWidth, textOverflow: style.textOverflow }
  })
  const textFragments = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const text = walker.currentNode, parent = text.parentElement
    if (!text.textContent.trim() || !isVisible(parent)) continue
    const range = document.createRange()
    range.selectNodeContents(text)
    const clippers = []
    for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor)
      if (/(hidden|clip|auto|scroll)/.test(style.overflowX + ' ' + style.overflowY)) {
        clippers.push({ label: describe(ancestor), rect: rectangle(ancestor), x: style.overflowX !== 'visible', y: style.overflowY !== 'visible' })
      }
    }
    for (const rect of range.getClientRects()) if (rect.width > 0 && rect.height > 0) {
      textFragments.push({ text: text.textContent.trim(), parent: describe(parent), parentRect: rectangle(parent),
        constrainedBlock: parent.matches('h3, .bach_fixture_construct, .bach_fixture_score'),
        rect: { left: rect.left + scrollX, right: rect.right + scrollX, top: rect.top + scrollY,
          bottom: rect.bottom + scrollY, width: rect.width, height: rect.height }, clippers })
    }
  }
  return { viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth, report: rectangle(root), elements, textFragments,
    articles: [...root.querySelectorAll('article')].filter(isVisible).map(node => ({
      title: node.querySelector('h3')?.textContent, score: node.querySelector('.bach_fixture_score')?.textContent,
      rect: rectangle(node), head: rectangle(node.querySelector('.bach_fixture_cardHead')),
      textColumn: rectangle(node.querySelector('.bach_fixture_cardHead > div')),
      titleRect: rectangle(node.querySelector('h3')),
      requiredParts: ['h3', '.bach_fixture_construct', '.bach_fixture_number', '.bach_fixture_score', 'a', '.bach_fixture_cardHead', '.bach_fixture_cardHead > div'].map(selector => {
        const part = node.querySelector(selector)
        return { selector, visible: Boolean(part && isVisible(part)), rect: part ? rectangle(part) : null }
      }),
    })) }
}

export function assertBachGeometry(geometry, label = 'Bach') {
  const tolerance = 1
  const failures = []
  if (geometry.documentWidth > geometry.viewportWidth + tolerance || geometry.bodyWidth > geometry.viewportWidth + tolerance) failures.push('document horizontal overflow')
  for (const article of geometry.articles) {
    for (const part of article.requiredParts || []) {
      if (!part.visible || !part.rect || part.rect.width <= 0 || part.rect.height <= 0) failures.push('required card content hidden: ' + article.title + ' ' + part.selector)
    }
    const parts = new Map((article.requiredParts || []).map(part => [part.selector, part]))
    for (const [before, after] of [['h3', '.bach_fixture_construct'], ['.bach_fixture_construct', '.bach_fixture_score']]) {
      const first = parts.get(before)?.rect, second = parts.get(after)?.rect
      if (first && second && first.bottom > second.top + tolerance) failures.push('required labels overlap: ' + article.title + ' ' + before + '/' + after)
    }
  }
  for (const item of geometry.elements) {
    if (item.rect.left < -tolerance || item.rect.right > geometry.viewportWidth + tolerance) failures.push('outside viewport: ' + item.label)
    if (item.rect.left < geometry.report.left - tolerance || item.rect.right > geometry.report.right + tolerance) failures.push('outside report: ' + item.label)
    if (item.clientWidth > 0 && item.scrollWidth > item.clientWidth + tolerance) failures.push('element content overflows width: ' + item.label)
    if (/(hidden|clip)/.test(item.overflowY) && item.scrollHeight > item.clientHeight + tolerance) failures.push('vertically clipped: ' + item.label)
  }
  for (const fragment of geometry.textFragments) {
    if (fragment.rect.left < fragment.parentRect.left - tolerance || fragment.rect.right > fragment.parentRect.right + tolerance) failures.push('text exceeds its own element: ' + fragment.parent)
    if (fragment.constrainedBlock && (fragment.rect.top < fragment.parentRect.top - tolerance || fragment.rect.bottom > fragment.parentRect.bottom + tolerance)) failures.push('label text exceeds its own height: ' + fragment.parent)
    for (const clip of fragment.clippers) {
      if ((clip.x && (fragment.rect.left < clip.rect.left - tolerance || fragment.rect.right > clip.rect.right + tolerance)) ||
          (clip.y && (fragment.rect.top < clip.rect.top - tolerance || fragment.rect.bottom > clip.rect.bottom + tolerance))) failures.push('clipped text: ' + fragment.parent)
    }
  }
  assert.deepEqual(failures, [], label + ': clipping/overflow; inspect saved geometry and screenshots')
}
