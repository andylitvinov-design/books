// Assert the questionnaire itself; mode selection is optional inside the runner.
export async function assertQuestionnaireMode(target, expect, { mode, guest, definition }) {
  const runnerClass = guest ? 'cabinet-guest-runner' : 'hh-runner'
  const runner = target.locator('.' + runnerClass)
  await expect(runner).toHaveCount(1, { timeout: 20000 })
  await expect(runner).toBeVisible()
  await expect(runner).toHaveClass(new RegExp('(?:^|\\s)' + runnerClass + '--' + mode + '(?:\\s|$)'))
  await expect(target.locator('.hh-test-mode-picker, .hh-runner-mode-picker, .hh-test-mode-grid')).toHaveCount(0)

  const quickQuestions = runner.locator(guest ? '.cabinet-quick-question' : '.hh-quick-question')
  const guidedQuestion = runner.locator(guest ? '.cabinet-guided-question' : '.hh-runner-question')
  await expect(quickQuestions).toHaveCount(mode === 'quick' ? definition.questions.length : 0)
  await expect(guidedQuestion).toHaveCount(mode === 'guided' ? 1 : 0)
  if (mode === 'quick') {
    const headings = quickQuestions.getByRole('heading', { level: guest ? 3 : 2 })
    await expect(headings).toHaveText(definition.questions.map(question => question.text))
    await expect(headings.first()).toBeVisible()
  } else {
    await expect(guidedQuestion.getByRole('heading', { name: definition.questions[0].text, exact: true, level: guest ? 3 : 1 })).toBeVisible()
  }

  const choices = runner.locator('.hh-test-mode-toggle')
  await expect(choices.getByRole('button')).toHaveCount(2)
  await expect(choices.getByRole('button', { name: /Quick/ })).toHaveAttribute('aria-pressed', String(mode === 'quick'))
  await expect(choices.getByRole('button', { name: /Guided/ })).toHaveAttribute('aria-pressed', String(mode === 'guided'))
}

export async function enterGuestQuestionnaireMode(target, expect, { mode, definition }) {
  // New and resumed guests enter Quick without a preflight mode-selection click.
  await assertQuestionnaireMode(target, expect, { mode: 'quick', guest: true, definition })
  if (mode === 'guided') {
    await target.locator('.cabinet-guest-runner .hh-test-mode-toggle').getByRole('button', { name: /Guided/ }).click()
    await assertQuestionnaireMode(target, expect, { mode, guest: true, definition })
  }
}
