// Place short, localized captions at the end of the portrait rays without
// changing which questionnaire results are measured or selected.
// Coordinates are in the existing 360 × 390 SVG viewBox.
const LABEL_WIDTH = 116
const TOP = 7
const BOTTOM = 382
const GAP = 4

export function portraitLabelLines(value) {
  const name = String(value ?? '').trim()
  const words = name.split(/\s+/).filter(Boolean)
  if (name.length <= 16 || words.length < 2) return [name]

  // Two readable lines, preserving the full existing EN/RU/ES scale name.
  let best = null
  for (let split = 1; split < words.length; split += 1) {
    const first = words.slice(0, split).join(' ')
    const second = words.slice(split).join(' ')
    const score = Math.max(first.length, second.length) * 2 + Math.abs(first.length - second.length)
    if (!best || score < best.score) best = { score, lines: [first, second] }
  }
  return best.lines
}

export function layoutPortraitRayLabels(rays = []) {
  const labels = rays.map((ray) => {
    const lines = portraitLabelLines(ray.label)
    const height = lines.length === 1 ? 25 : 38
    const side = ray.ideal.x >= 180 ? 'right' : 'left'
    return {
      ...ray, lines, height, side,
      x: side === 'right' ? 240 : 4,
      width: LABEL_WIDTH,
      desiredY: ray.ideal.y - height / 2,
    }
  })

  for (const side of ['left', 'right']) {
    const column = labels.filter((ray) => ray.side === side)
      .sort((a, b) => a.desiredY - b.desiredY || a.axis.localeCompare(b.axis))
    let cursor = TOP
    for (const item of column) {
      item.y = Math.max(cursor, Math.min(item.desiredY, BOTTOM - item.height))
      cursor = item.y + item.height + GAP
    }
    // If many scales cluster together, move earlier labels up while keeping
    // 4px between pills, rather than letting captions overlap or get clipped.
    cursor = BOTTOM
    for (let i = column.length - 1; i >= 0; i -= 1) {
      const item = column[i]
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

  return labels.map((item) => ({
    axis: item.axis, label: item.label, lines: item.lines,
    measured: item.measured, side: item.side,
    x: item.x, y: item.y, width: item.width, height: item.height,
    tip: item.ideal,
    anchor: {
      x: item.side === 'right' ? item.x : item.x + item.width,
      y: item.y + item.height / 2,
    },
  }))
}
