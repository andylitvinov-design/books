// Self-contained for Playwright Locator.evaluate: no application/global state
// is modified. Match the resized viewport and observe two equal animation-frame
// samples before one alignment, then two equal samples before measuring it.
export function alignAndMeasureStablePortraitFrame(el, { width, height }) {
  const win = el.ownerDocument.defaultView
  const upper = el.querySelector('[data-portrait-sectors]')
  const lower = el.querySelector('[data-testid="portrait-quick-actions"]')
  const picture = el.querySelector('[data-radar-layout="full-circle"]')
  if (!win || !upper || !lower || !picture) throw new Error('Portrait frame elements are missing')
  const sample = () => {
    const top = upper.getBoundingClientRect()
    const bottom = lower.getBoundingClientRect()
    const image = picture.getBoundingClientRect()
    const topButtons = [...upper.querySelectorAll('button')]
    const bottomButtons = [...lower.querySelectorAll('button')]
    if (!topButtons.length || !bottomButtons.length) throw new Error('Portrait controls are missing')
    return {
      firstTop: top.top, lastBottom: bottom.bottom, span: bottom.bottom - top.top,
      pictureWidth: image.width, pictureHeight: image.height,
      minTopTap: Math.min(...topButtons.map(node => node.getBoundingClientRect().height)),
      minBottomTap: Math.min(...bottomButtons.map(node => node.getBoundingClientRect().height)),
      viewportWidth: win.innerWidth, viewportHeight: win.innerHeight,
      overflow: el.ownerDocument.documentElement.scrollWidth - win.innerWidth,
      scrollX: win.scrollX, scrollY: win.scrollY,
      visualWidth: win.visualViewport?.width ?? win.innerWidth,
      visualHeight: win.visualViewport?.height ?? win.innerHeight,
      visualTop: win.visualViewport?.offsetTop ?? 0,
    }
  }
  return new Promise((resolve, reject) => {
    let previous = null, phase = 'before-scroll', frameId, done = false
    const finish = (error, frame) => {
      if (done) return
      done = true
      win.clearTimeout(deadline)
      win.cancelAnimationFrame(frameId)
      if (error) reject(error)
      else resolve(frame)
    }
    // This is a failure deadline, not a delay before measurement. Stable but
    // clipped/oversized frames are returned unchanged for the existing gates.
    const deadline = win.setTimeout(() => finish(new Error(
      `Portrait frame did not stabilize at ${width}x${height} (${phase})`)), 30000)
    const tick = () => {
      try {
        const frame = sample()
        const viewportMatches = frame.viewportWidth === width && frame.viewportHeight === height
        const stable = viewportMatches && previous && Object.keys(frame).every(key => frame[key] === previous[key])
        if (stable && phase === 'before-scroll') {
          upper.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
          phase = 'after-scroll'
          previous = null
        } else if (stable) {
          finish(null, frame)
          return
        } else previous = viewportMatches ? frame : null
        frameId = win.requestAnimationFrame(tick)
      } catch (error) { finish(error) }
    }
    frameId = win.requestAnimationFrame(tick)
  })
}
