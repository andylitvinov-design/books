import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const es = read('app/es/services/page.tsx')
const esCatalog = read('app/es/services/catalog/page.tsx')
const shared = read('app/[locale]/services/page.tsx')
const sharedCatalog = read('app/[locale]/services/catalog/page.tsx')
const directory = read('components/services-directory-page.tsx')

test('the real dedicated Spanish services route renders a complete existing conversion page', () => {
  assert.match(es, /export default async function SpanishServicesPage/)
  assert.ok(es.includes('import uniformStyles from "@/components/services-support-uniform.module.css"'))
  assert.ok(es.includes('compactStyles.page + " " + uniformStyles.page} lang="es"'))
  const catalogOpening = '<ServicesCompactCatalog locale="es" initialConsultationOpen={query?.consultation === "1"}>'
  assert.ok(es.includes(catalogOpening), 'Spanish booking query opens the existing compact catalog')
  const dialogueIndex = es.indexOf('<ServicesAssistMobile locale="es" />')
  assert.ok(dialogueIndex >= 0 && dialogueIndex < es.indexOf(catalogOpening),'Spanish dialogue remains above compact catalog')
  assert.match(es, /<ServicesAssistMobile locale="es"\s*\/>/)
  assert.match(es, /import assistStyles from "@\/components\/services-assist-mobile\.module\.css"/)
  assert.match(es, /<ServicesConversionHero locale="es"\s*\/>/)
  assert.match(es, /<PublicConsultationCta locale="es" id="consultation" serviceBooking/)
  assert.match(es, /<ServicesCompactPanel id="services"><ServicesStudioOffers locale="es" splitExtras \/><\/ServicesCompactPanel>/)
  for(const id of ['consultation','homeopathy','services','business','browse','courses','video','coach','reiki','reading','about','testimonials','mytube','directory'])
    assert.match(es,new RegExp('<ServicesCompactPanel id="'+id+'">'),'real compact category exists: '+id)
  assert.match(es, /<PersonalTestimonials locale="es" variant="services"\s*\/>/)
  assert.doesNotMatch(es, /<CompactLeadCapture locale="es"/)
  assert.doesNotMatch(es, /<ServicesCompactPanel id="magical">/)
  assert.match(es, /<ServicesMagicalHelpMobile locale="es" \/>/)
  assert.ok(es.indexOf('<ServicesPersonalConsultationMobile locale="es" />') >
    es.indexOf('<ServicesCompactPanel id="consultation">'), 'legacy formats live only in optional consultation')
  assert.match(es, /La homeopatía no tiene evidencia fiable/)
  assert.match(es, /Los resultados individuales no están garantizados/)
  assert.equal((es.match(/<PublicConsultationCta locale="es"/g) || []).length, 1)
})

test('Spanish catalog already reuses the canonical practitioner directory without a duplicate UI', () => {
  assert.match(esCatalog, /spanishMetadata\(/)
  assert.match(esCatalog, /"\/es\/services\/catalog"/)
  assert.match(esCatalog, /<ServicesDirectoryPage locale="es"\s*\/>/)
  assert.match(directory, /export async function ServicesDirectoryPage\(\{ locale \}: \{ locale: PublicLocale \}\)/)
  assert.match(directory, /createPractitionerRepository\(getAppConfig\(\)\)\.listPublicServices\(locale\)/)
})

test('Spanish page keeps explicit, working navigation into the original optional catalog', () => {
  assert.match(es, /const query = await searchParams;/)
  assert.match(es, /if \(query\?\.catalog === "1"\) redirect\("\/es\/services\/catalog#service-listings"\)/)
  assert.match(es, /<ServicesDirectoryInvitation locale="es"\s*\/>/)
  assert.match(es, /spanishMetadata\(/)
  assert.match(es, /"\/es\/services"/)
})

test('EN/RU shared services are preserved; Spanish has separate existing routes', () => {
  assert.match(shared, /export default async function ServicesPage/)
  assert.match(sharedCatalog, /export default async function DirectoryRoute/)
  assert.match(shared, /<PublicConsultationCta locale=\{locale\}/)
  assert.match(shared, /<ServicesCompactPanel id="consultation">/)
  assert.match(shared, /<ServicesCompactPanel id="mytube">/)
  assert.match(shared, /<ServicesAssistQuiz locale=\{locale\} \/>/)
  assert.match(es, /<ServicesAssistQuiz locale="es" \/>/)
  assert.match(shared, /query\?\.assist==="chat"/)
  assert.match(es, /query\?\.assist==="chat"/)
  assert.match(sharedCatalog, /<ServicesDirectoryPage locale=\{locale as Locale\}/)
  assert.doesNotMatch(es, /service_role|SUPABASE_SECRET|navigator\.sendBeacon/)
  assert.doesNotMatch(esCatalog, /service_role|SUPABASE_SECRET/)
})
