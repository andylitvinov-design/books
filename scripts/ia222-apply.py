"""One-use, exact-anchor integration on the isolated issue-222 work branch.
No network, credentials, production writes, migrations, or media generation.
Removed with its temporary workflow after the generated source is committed.
"""
from pathlib import Path
import json


def change(path, old, new, count=1):
    p = Path(path)
    text = p.read_text()
    assert text.count(old) == count, f'Unexpected source shape: {path}'
    p.write_text(text.replace(old, new))

# Reuse the existing encryption/transport closures; do not invent a second store.
p = Path('lib/prescriptions/store.js')
text = p.read_text()
left, right = text.split('function createRestKvStore(', 1)
anchor = '  return {\n    async findLegacyAssignment'
assert left.count(anchor) == 1 and right.count(anchor) == 1
left = "import { createMemoryAssessmentStore, createKvAssessmentStore } from '../clients/assessment-store.js'\n" + left.replace(anchor, '  return {\n    ...createMemoryAssessmentStore({ clients, documents: byId }),\n    async findLegacyAssignment')
right = right.replace(anchor, '  return {\n    ...createKvAssessmentStore({ command, encode: record => encryptedEnvelope(record, key), decode: raw => encryptedRecord(raw, key) }),\n    async findLegacyAssignment')
p.write_text(left + 'function createRestKvStore(' + right)

# Pure session resolver is independently testable; authorization still lives server-side.
p = Path('lib/clients/access.js')
p.write_text(p.read_text() + '''
export async function resolveCurrentCabinet(store, token, nowMs = Date.now()) {
  const digest = digestSessionToken(token)
  if (!store || !digest) return undefined
  const session = await store.findCabinetSession(digest)
  if (!session) return undefined
  const client = await store.findClientById(session.clientId)
  return authorizeCabinetSession(client, session.selector, session, nowMs)
    ? { selector: session.selector } : undefined
}
''')
p = Path('lib/clients/session.js')
text = p.read_text().replace('verifyCabinetSecret, createCabinetSession,', 'resolveCurrentCabinet, verifyCabinetSecret, createCabinetSession,')
p.write_text(text + '''
export async function currentCabinetAccess() {
  try {
    const token = (await cookies()).get(cabinetCookieName())?.value
    return await resolveCurrentCabinet(getPrescriptionStore(), token)
  } catch { return undefined }
}
''')

p = Path('app/[locale]/client/page.tsx')
text = p.read_text().replace('import { notFound }', 'import { notFound, redirect }').replace('getHomeopathyLocaleParams, isSupportedLocale', 'isSupportedLocale')
old = 'export function generateStaticParams() {\n  return getHomeopathyLocaleParams();\n}'
assert old in text
text = text.replace(old, "export const dynamic = 'force-dynamic';")
text = "import { currentCabinetAccess } from '@/lib/clients/session';\n" + text
text = text.replace('  const typedLocale = locale as Locale;', '  const session = await currentCabinetAccess();\n  if (session) redirect(`/${locale}/client/${session.selector}`);\n  const typedLocale = locale as Locale;')
p.write_text(text)
p = Path('app/es/client/page.tsx')
text = "import { redirect } from 'next/navigation';\nimport { currentCabinetAccess } from '@/lib/clients/session';\nexport const dynamic = 'force-dynamic';\n" + p.read_text()
text = text.replace('export default function SpanishClientEntryPage() {', "export default async function SpanishClientEntryPage() {\n  const session = await currentCabinetAccess();\n  if (session) redirect(`/en/client/${session.selector}`);")
p.write_text(text)

p = Path('components/client-cabinet.jsx')
text = p.read_text().replace("import { useEffect, useState } from 'react'", "import { useEffect, useState } from 'react'\nimport { ClientAssessments } from './client-assessments'")
text = text.replace('selector, documents })', 'selector, documents, assessments = [] })')
assert '</main>' in text
text = text.replace('</main>', '<ClientAssessments records={assessments} locale={locale} selector={selector} /></main>')
p.write_text(text)
p = Path('app/[locale]/client/[selector]/page.js')
text = "import { clientAssessmentSummary } from '@/lib/clients/assessments'\n" + p.read_text()
old = '  return <ClientCabinet name='
assert old in text
text = text.replace(old, "  const assessments = (await access.store.listClientAssessments(access.client.id))\n    .map(record => clientAssessmentSummary(record, access.client.id)).filter(Boolean)\n    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || a.id.localeCompare(b.id))\n  return <ClientCabinet assessments={assessments} name=")
p.write_text(text)
p = Path('app/admin/clients/[id]/page.js')
text = "import { OwnerAssessments } from '@/components/owner-assessments'\n" + p.read_text()
text = text.replace('  return <main', '  const assessments = (await store.listClientAssessments(id)).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || a.id.localeCompare(b.id))\n  return <main', 1)
assert '<details>' in text
text = text.replace('<details>', '<OwnerAssessments records={assessments} clientId={id} locale={client.preferredLocale} temporary={store.assessmentStorage === \'memory\'} /><details>', 1)
p.write_text(text)

change('lib/public-locales.ts', '(?:about|services|books|client|homeopathy', '(?:about|services|books|library|client|homeopathy')
change('app/layout.tsx', 'import "./reader-responsive.css";', 'import "./reader-responsive.css";\nimport "./ia-v2.css";')
change('app/layout.tsx', '<MobileBottomNavigation />', '<MobileBottomNavigation initialLocale={lang} />')
# Resolve a fresh root's actual public locale before SSR of the icon navigation.
p = Path('middleware.ts')
text = p.read_text()
old = "  return /^\\/(ru|en)\\/(prescriptions|client)\\//.test(decoded)"
assert old in text
text = text.replace(old, "  return /^\\/(en|ru|es)\\/client(?:\\/|$)/.test(decoded)\n    || /^\\/(ru|en)\\/prescriptions\\//.test(decoded)")
old = "  const pageLocale = /^\\/es(?:\\/|$)/.test(request.nextUrl.pathname) ? 'es'\n    : request.nextUrl.pathname.match(/^\\/(en|ru)(?:\\/|$)/)?.[1] ?? 'ru'"
assert old in text
new = """  const urlLocale = request.nextUrl.pathname.match(/^\\/(en|ru|es)(?:\\/|$)/)?.[1]
  const queryLocale = request.nextUrl.pathname === '/' ? request.nextUrl.searchParams.get('lang') : null
  const preference = request.cookies.get('holistic_house_public_locale')?.value === 'es' ? 'es'
    : request.cookies.get('holistic_house_ui_locale')?.value === 'ru' ? 'ru' : 'en'
  const pageLocale = urlLocale ?? (['en', 'ru', 'es'].includes(queryLocale ?? '') ? queryLocale : preference) ?? 'en'"""
text = text.replace(old, new)
p.write_text(text)

# Keep exact old routes/readers; add only a navigation-level parent.
for path, locale in [('components/book-catalog.tsx', '{locale}'), ('app/[locale]/homeopathy/page.tsx', '{locale}'), ('app/es/books/page.tsx', '"es"'), ('app/es/homeopathy/page.tsx', '"es"')]:
    p = Path(path)
    text = p.read_text()
    marker = '<PublicSiteHeader locale=' + locale + ' />'
    assert marker in text, path
    # A use-client directive, where present, must stay the first statement.
    insertion = "import { LibraryBackLink } from '@/components/library-hub';\n"
    if text.startswith('"use client";'):
        text = text.replace('"use client";\n', '"use client";\n' + insertion, 1)
    else:
        text = insertion + text
    text = text.replace(marker, marker + '<LibraryBackLink locale=' + locale + ' />', 1)
    p.write_text(text)
p = Path('components/holistic-house-home.tsx')
text = p.read_text().replace('"use client";\n', '"use client";\nimport { featuredBookUrls } from "@/data/featured-books";\n', 1)
for lang, url in [('ru','https://designrr.page/?id=367554&token=1057485987&h=4958'), ('en','https://designrr.page/?id=377444&token=639498968&h=5264')]:
    assert '"'+url+'"' in text
    text = text.replace('"'+url+'"', 'featuredBookUrls.'+lang)
p.write_text(text)
change('app/sitemap.ts', "const publicPaths = ['/es',", "const publicPaths = ['/en/library', '/ru/library', '/es/library', '/es',")

# Update obsolete assertions, retaining all unrelated tests and security assertions.
p = Path('tests/navigation-cabinet.test.mjs')
text = p.read_text()
start = text.index("test('public navigation exposes")
end = text.index("\ntest('the umbrella homepage", start)
text = text[:start] + '''test('public navigation shares six destinations and never exposes administration', async () => {
  const { getSiteNavigation, primaryNavigationIds } = await import('../lib/site-navigation-model.js')
  assert.deepEqual(primaryNavigationIds, ['home', 'library', 'services', 'academy', 'about', 'cabinet'])
  for (const locale of ['en', 'ru', 'es']) {
    const items = getSiteNavigation(locale)
    assert.equal(items.length, 6)
    assert.equal(items.find(item => item.id === 'library').href, `/${locale}/library`)
    assert.equal(items.find(item => item.id === 'cabinet').href, `/${locale}/client`)
    assert.equal(items.find(item => item.id === 'academy').href, 'https://psitrends.com/academy')
    assert.ok(items.every(item => item.label && !item.href.startsWith('/admin')))
  }
  for (const path of ['components/site-navigation.tsx', 'components/mobile-bottom-navigation.tsx']) {
    const source = await readFile(path, 'utf8')
    assert.match(source, /getSiteNavigation/)
    assert.match(source, /prefetch=\\{false\\}/)
  }
})
''' + text[end:]
p.write_text(text)
p = Path('tests/es-public-site.test.mjs')
text = p.read_text().replace("'about', 'services', 'books', 'client'", "'about', 'services', 'books', 'library', 'client'")
text = text.replace('nextLocale', 'next')
p.write_text(text)
change('scripts/verify-es-public-site.mjs', "const nav = ['/es', '/es/books', '/es/homeopathy', '/es/services', '/es/about'];", "const nav = ['/es', '/es/library', '/es/services', 'https://psitrends.com/academy', '/es/about', '/es/client'];")
p = Path('package.json')
data = json.loads(p.read_text())
data['scripts']['verify:ia-v2'] = 'node scripts/verify-ia-v2.mjs'
p.write_text(json.dumps(data, indent=2) + '\n')
print('IA222 integration applied; source documents, media and production data unchanged.')
