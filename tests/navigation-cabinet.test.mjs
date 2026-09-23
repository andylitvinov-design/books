import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('locale counterpart paths preserve the current localized route', async () => {
  const { localePath } = await import('../lib/ui-locale.js')

  assert.equal(localePath('/ru/homeopathy/remedies/aconitum', 'en'), '/en/homeopathy/remedies/aconitum')
  assert.equal(localePath('/en/client/personal-selector', 'ru'), '/ru/client/personal-selector')
  assert.equal(localePath('/books', 'en'), '/books')
})

test('public navigation exposes both UI languages and the practitioner cabinet', async () => {
  const navigation = await readFile('components/site-navigation.tsx', 'utf8')

  assert.match(navigation, /Главная/)
  assert.match(navigation, /Книги/)
  assert.match(navigation, /Препараты/)
  assert.match(navigation, /Услуги/)
  assert.match(navigation, /Кабинет/)
  assert.match(navigation, /Home/)
  assert.match(navigation, /Books/)
  assert.match(navigation, /Remedies/)
  assert.match(navigation, /Services/)
  assert.match(navigation, /Cabinet/)
  assert.match(navigation, /href="\/admin"/)
  assert.match(navigation, /localePath/)
  assert.match(navigation, /document\.cookie/)
})

test('the umbrella homepage can render Russian and English chrome and copy', async () => {
  const [home, page] = await Promise.all([
    readFile('components/holistic-house-home.tsx', 'utf8'),
    readFile('app/page.tsx', 'utf8'),
  ])

  assert.match(home, /восстановление · практика · поддержка/)
  assert.match(home, /healing · practice · guidance/)
  assert.match(home, /Книги, справочные материалы и цифровые ресурсы/)
  assert.match(home, /Inspiring books, reference materials, and digital resources/)
  assert.match(page, /uiLocale/)
})

test('the admin entry redirects guests and shows daily practitioner actions after authentication', async () => {
  const [dashboard, header, cabinet, loginAction] = await Promise.all([
    readFile('app/admin/page.js', 'utf8'),
    readFile('components/prescription-admin-header.jsx', 'utf8'),
    readFile('components/practitioner-cabinet.jsx', 'utf8'),
    readFile('app/admin/login/actions.js', 'utf8'),
  ])

  assert.match(dashboard, /requireAdminRequest/)
  assert.match(dashboard, /redirect\('\/admin\/login'\)/)
  assert.match(dashboard, /PractitionerCabinet/)
  assert.match(cabinet, /PRACTITIONER CABINET/)
  assert.match(cabinet, /КАБИНЕТ ПРАКТИКА/)
  assert.match(cabinet, /\/admin\/consultations\/new/)
  assert.match(cabinet, /\/admin\/clients/)
  assert.match(cabinet, /\/admin\/clients\/legacy/)
  assert.match(header, /Holistic House/)
  assert.match(header, /Cabinet/)
  assert.match(header, /New consultation/)
  assert.match(header, /Unassigned legacy documents/)
  assert.match(loginAction, /redirect\('\/admin'\)/)
})


test('direct protected admin pages redirect signed-out visitors to login instead of rendering a 404', async () => {
  const pages = [
    'app/admin/clients/page.js',
    'app/admin/clients/[id]/page.js',
    'app/admin/clients/legacy/page.js',
    'app/admin/consultations/new/page.js',
    'app/admin/consultations/[id]/page.js',
    'app/admin/consultations/[id]/edit/page.js',
    'app/admin/documents/[id]/page.js',
    'app/admin/payments/new/page.js',
    'app/admin/payments/[id]/page.js',
    'app/admin/prescriptions/new/page.js',
    'app/admin/prescriptions/[id]/page.js',
  ]
  for (const page of pages) {
    const source = await readFile(page, 'utf8')
    assert.match(source, /if \(!await requireAdminRequest\(\)\) redirect\('\/admin\/login'\)/, page)
  }
})
