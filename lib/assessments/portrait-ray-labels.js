// Plain-text labels near their corresponding measured radar dots.
// Coordinates use the existing 360×390 SVG; names stay complete in EN/RU/ES.
// The sparse, two-column collision pass is for geometry only: no pill boxes.
const CENTER = 180
// Leave a readable inset beyond the halo of SVG-stroked captions.
const TOP = 13
const BOTTOM = 377
const EDGE = 14
const GAP = 6
const MAX_LINE_WIDTH = 128

export function portraitLabelLines(value) {
  const name = String(value ?? '').trim()
  const words = name.split(/\s+/).filter(Boolean)
  if (name.length <= 16 || words.length < 2) return [name]

  let best = null
  for (let split = 1; split < words.length; split += 1) {
    const first = words.slice(0, split).join(' ')
    const second = words.slice(split).join(' ')
    const score = Math.max(first.length, second.length) * 2 + Math.abs(first.length - second.length)
    if (!best || score < best.score) best = { score, lines: [first, second] }
  }
  return best.lines
}

const estimatedWidth = (line) => [...line].reduce((width, character) => {
  if (/[А-Яа-яЁё]/.test(character)) return width + 8
  if (/[WMmw]/.test(character)) return width + 9
  if (/[ilI .,/]/.test(character)) return width + 4
  return width + 7
}, 0)

export function layoutPortraitRayLabels(rays = []) {
  const labels = rays.map((ray) => {
    const lines = portraitLabelLines(ray.label)
    // Use the same per-line widths in the layout pass AND in the rendered
    // SVG textLength attributes. Font engines can otherwise draw wider than
    // estimated (especially on mobile Safari and for long Cyrillic labels).
    const lineWidths = lines.map(line => Math.min(MAX_LINE_WIDTH, Math.max(19, estimatedWidth(line))))
    const width = Math.max(28, ...lineWidths)
    const height = lines.length === 1 ? 19 : 32
    // Assign the same side for an axis even when its score changes.
    const side = ray.ideal.x <= CENTER ? 'left' : 'right'
    const tip = ray.end || ray.ideal
    // Keep every label in its own half of the SVG to avoid cross-side overlap.
    const x = side === 'right'
      ? Math.min(360 - EDGE - width, Math.max(184, tip.x + 9))
      : Math.max(EDGE, Math.min(176 - width, tip.x - width - 9))
    const coversDot = tip.x >= x - 3 && tip.x <= x + width + 3
    // Move outward just enough to keep the colored dot unobscured by glyphs.
    const offset = coversDot ? 21 : 4
    const desiredY = tip.y + (tip.y < 182 ? -offset : offset) - height / 2
    return { ...ray, tip, side, lines, lineWidths, x, width, height, desiredY }
  })

  for (const side of ['left', 'right']) {
    const column = labels.filter((item) => item.side === side)
      .sort((a, b) => a.desiredY - b.desiredY || a.axis.localeCompare(b.axis))
    let cursor = TOP
    for (const item of column) {
      item.y = Math.max(cursor, Math.min(item.desiredY, BOTTOM - item.height))
      cursor = item.y + item.height + GAP
    }
    cursor = BOTTOM
    for (let index = column.length - 1; index >= 0; index -= 1) {
      const item = column[index]
      item.y = Math.min(item.y, cursor - item.height)
      cursor = item.y - GAP
    }
    if (column[0]?.y < TOP) {
      cursor = TOP
      for (const item of column) {
        item.y = Math.max(cursor, item.y)
        cursor = item.y + item.height + GAP
      }
    }
  }

  return labels.map((item) => {
    const anchorX = item.tip.x < item.x ? item.x : item.tip.x > item.x + item.width
      ? item.x + item.width : item.tip.x < item.x + item.width / 2 ? item.x : item.x + item.width
    const anchor = { x: anchorX, y: item.y + item.height / 2 }
    return {
      axis: item.axis, label: item.label, measured: item.measured,
      side: item.side, lines: item.lines, lineWidths: item.lineWidths, width: item.width,
      height: item.height, x: item.x, y: item.y, tip: item.tip, anchor,
      showLeader: Math.hypot(item.tip.x - anchor.x, item.tip.y - anchor.y) > 18,
    }
  })
}
