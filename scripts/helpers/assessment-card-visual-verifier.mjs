// Visual acceptance for the real assessment runner, sharing existing synthetic
// MHC-SF browser journeys. No production account, new sessions, or sample health data.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const widths = [320, 354, 390, 430]
const ROOT = '[data-test-card-system="v1"]'
const CARD = '.hh-test-question-card'

export async function verifyAssessmentCardLayout(page, { guest, mode, output, locale, name, expect }) {
  const source = guest ? 'guest' : 'account'
  const runner = page.locator(ROOT)
  await expect(runner).toBeVisible()
  assert.ok(['quick', 'guided'].includes(mode))
  assert.ok(['en', 'ru'].includes(locale))
  await mkdir(output, { recursive: true })
  const previous = page.viewportSize()
  try {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width === 320 ? 640 : 844 })
      const cards = runner.locator(CARD)
      const count = await cards.count()
      assert.ok(count > 0, source + ' must render real assessment cards')
      if (mode === 'guided') assert.equal(count, 1, source + ' guided must show exactly one card')
      if (mode === 'quick') assert.ok(count >= 3, source + ' quick must show a full battery')
      await expect(cards.first().locator('.hh-test-question-number')).toHaveText('1')
      const audit = await page.evaluate(({ ROOT, CARD }) => {
        const runner = document.querySelector(ROOT)
        const cards = [...runner.querySelectorAll(CARD)]
        const checked = cards.map(card => {
          const bounds = card.getBoundingClientRect()
          const style = getComputedStyle(card)
          const title = card.querySelector('h1, h2, h3')
          const caption = card.querySelector('legend')
          const answers = [...card.querySelectorAll('select, button')]
          const answerStats = answers.map(answer => {
            const rect = answer.getBoundingClientRect()
            const css = getComputedStyle(answer)
            return { left: rect.left, right: rect.right, height: rect.height, fontSize: Number.parseFloat(css.fontSize) }
          })
          return {
            left: bounds.left, right: bounds.right, width: bounds.width,
            radius: Number.parseFloat(style.borderTopLeftRadius), titleSize: Number.parseFloat(getComputedStyle(title).fontSize),
            heading: title?.textContent?.trim().length || 0, caption: caption?.textContent?.trim().length || 0,
            answers: answerStats,
          }
        })
        return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, cards: checked }
      }, { ROOT, CARD })
      assert.ok(audit.scrollWidth <= width + 3, `Page horizontal overflow at ${width}: ${audit.scrollWidth}`)
      for (const [index, card] of audit.cards.entries()) {
        assert.ok(card.left >= -3 && card.right <= width + 3, `card ${index + 1} beyond viewport at ${width}`)
        assert.ok(card.radius >= 15, 'question card has rounded corners')
        assert.ok(card.titleSize >= 16 && card.titleSize <= 26, `comfortable typography ${card.titleSize}px at ${width}`)
        assert.ok(card.heading > 9 && card.caption > 3, 'original question and accessible legend survive')
        assert.ok(card.answers.length > 0, 'every card has answer controls')
        for (const answer of card.answers) {
          assert.ok(answer.height >= 43, `answer touch target ${answer.height}px < 44px`)
          assert.ok(answer.left >= card.left - 2 && answer.right <= card.right + 2, 'answer fits its question card')
          if (answer.fontSize && card.answers.length === 1) assert.ok(answer.fontSize >= 15, 'iOS selector font must avoid zoom')
        }
      }
      const modeToggle = runner.locator('.hh-test-mode-toggle')
      await expect(modeToggle.locator('button')).toHaveCount(2)
      for (const option of await modeToggle.locator('button').all()) {
        const bounds = await option.boundingBox()
        assert.ok(bounds && bounds.height >= 44, 'both mode controls must be touch accessible')
      }
      await page.screenshot({
        path: `${output}/${source}-${mode}-${locale}-${name}-${width}.png`,
        fullPage: false,
      })
    }
  } finally {
    if (previous) await page.setViewportSize(previous)
  }
}
