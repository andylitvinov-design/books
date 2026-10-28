// Self-contained for Playwright Locator.evaluate: no application/global state
// is modified. Match the resized viewport and observe two equal animation-frame
// samples before one deterministic viewport alignment, then two equal samples
// before measuring it. All three control rows are sampled together.
export function alignAndMeasureStablePortraitFrame(el, { width, height }) {
  const win = el.ownerDocument.defaultView
  const upper = el.querySelector('[data-portrait-sectors]')
  const lower = el.querySelector('[data-testid="portrait-quick-actions"]')
  const picture = el.querySelector('[data-radar-layout="full-circle"]')
  const middle = el.querySelector('[data-testid="portrait-view-switch"]')
  if (!win || !upper || !lower || !middle || !picture) throw new Error('Portrait frame elements are missing')
  const sample = () => {
    const top = upper.getBoundingClientRect()
    const bottom = lower.getBoundingClientRect()
    const image = picture.getBoundingClientRect()
    const middleRect = middle.getBoundingClientRect()
    const topButtons = [...upper.querySelectorAll('button')]
    const middleButtons = [...middle.querySelectorAll('button')]
    const bottomControls = [...lower.querySelectorAll('a, button')]
    const goalsLink = lower.querySelector('a[data-testid="portrait-goals-action"]')
    if (!topButtons.length || !middleButtons.length || !bottomControls.length || !goalsLink)
      throw new Error('Portrait controls are missing')
    const goalsRect = goalsLink.getBoundingClientRect()
    // Serialize numeric rectangles only: internal control movement must not be
    // hidden by unchanged row bounds or an unchanged minimum target height.
    const controlGeometry = controls => JSON.stringify(controls.map(node => {
      const rect = node.getBoundingClientRect()
      return [rect.top, rect.left, rect.bottom, rect.right, rect.width, rect.height]
    }))
    return {
      firstTop: top.top, lastBottom: bottom.bottom, span: bottom.bottom - top.top,
      pictureWidth: image.width, pictureHeight: image.height,
      minTopTap: Math.min(...topButtons.map(node => node.getBoundingClientRect().height)),
      minBottomTap: Math.min(...bottomControls.map(node => node.getBoundingClientRect().height)),
      miniTabCount: middleButtons.length,
      middleTop: middleRect.top, middleBottom: middleRect.bottom,
      middleVisible: middleRect.top >= top.bottom && middleRect.bottom <= bottom.top,
      minMiddleTap: Math.min(...middleButtons.map(node => node.getBoundingClientRect().height)),
      lowerControlCount: bottomControls.length,
      middleControlGeometry: controlGeometry(middleButtons),
      lowerControlGeometry: controlGeometry(bottomControls),
      goalsTop: goalsRect.top, goalsBottom: goalsRect.bottom, goalsHeight: goalsRect.height,
      pageScrollY: win.scrollY,
      maxScrollY: el.ownerDocument.documentElement.scrollHeight - win.innerHeight,
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
          // A clipping details ancestor can consume scrollIntoView. Correct
          // the viewport once, not repeatedly until a geometry gate passes.
          win.scrollBy({ top: upper.getBoundingClientRect().top - 6, behavior: 'instant' })
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
