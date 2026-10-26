import assert from 'node:assert/strict'

// Independent expectations for the compact, pre-enrolment App entry. The full
// 14-day public programme has a different route and is not rendered here.
const copy = {
  en: {
    title: 'What will you learn in week one?',
    start: "I'm interested — sign in to enrol",
    privacy: 'Your first course is free. No automatic enrolment: your choices and progress are saved privately only after sign-in and confirmation.',
    explore: 'Read the full programme',
  },
  ru: {
    title: 'Что вас ждёт в первую неделю?',
    start: 'Мне интересно — войти для записи',
    privacy: 'Первый курс бесплатно. Никакой автоматической записи: личные данные и прогресс сохраняются только после входа и подтверждения.',
    explore: 'Подробнее о программе',
  },
}

export async function assertOporaGuestFirstWeek(page, expect, locale) {
  assert.ok(Object.hasOwn(copy, locale), 'Unsupported guest preview verification locale')
  const t = copy[locale]
  const landing = page.locator('[data-opora-guest-landing]')
  await expect(landing).toBeVisible({timeout:20000})
  const preview = landing.locator('[data-opora-first-week-intro]')
  await expect(preview).toHaveCount(1)
  await expect(preview).toBeVisible()
  await expect(preview).toHaveAttribute('data-opora-week-one-count','7')
  await expect(preview.getByRole('heading',{name:t.title,exact:true,level:1})).toBeVisible()
  await expect(preview.locator('[data-opora-preview-day]')).toHaveCount(7)
  for (let day = 1; day <= 7; day++) {
    await expect(preview.locator('[data-opora-preview-day="'+day+'"]')).toBeVisible()
  }
  const start = preview.getByRole('button',{name:t.start,exact:true})
  await expect(start).toBeVisible()
  await expect(start).toBeEnabled()
  await expect(start).toHaveAttribute('data-opora-week-one-accept','true')
  await expect(start).toHaveAttribute('data-course-google-signin','')
  await expect(preview.locator('[data-opora-fast-consent]')).toHaveCount(0)
  await expect(preview.getByText(t.privacy,{exact:true})).toBeVisible()
  const explore = preview.getByRole('link',{name:t.explore,exact:true})
  await expect(explore).toBeVisible()
  await expect(explore).toHaveAttribute('href','/'+locale+'/courses/antistress')
  // Do not click, auto-enrol, clear errors, or start OAuth here. The existing
  // downstream native authentication/privacy journey remains authoritative.
}
