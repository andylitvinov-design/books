import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateAssessmentInput, clientAssessmentSummary } from '../lib/clients/assessments.js'
import { publicAssessmentView } from '../lib/clients/assessment-share.js'
import { PROFILE_AREAS, profileServiceOffer } from '../lib/profile/profile-service-offers.js'

const source = path => readFile(path, 'utf8')
const fields = {
  kind: 'research_result', title: 'Personal five-elements profile',
  occurredOn: '2026-10-11', language: 'ru', profileArea: 'wu_xing',
  originalResult: 'Practitioner-authored source content',
}

test('practitioner may categorize reports in exactly four real profile areas, without changing old records', () => {
  const allowed = ['psychology','homeopathy','wu_xing','hypnotherapy']
  for (const profileArea of allowed) {
    assert.equal(validateAssessmentInput({ ...fields, profileArea }).profileArea, profileArea)
  }
  const unchanged = validateAssessmentInput({ ...fields, profileArea: 'general' })
  assert.equal(Object.hasOwn(unchanged, 'profileArea'), false)
  assert.equal(Object.hasOwn(validateAssessmentInput({ ...fields, profileArea: undefined }), 'profileArea'), false)
  for (const profileArea of ['medicine','wellness','hyped','__proto__',17,null]) {
    if (profileArea === null) continue // omission is canonical 'general'
    assert.throws(() => validateAssessmentInput({ ...fields, profileArea }), { code: 'VALIDATION' })
  }
})

test('shared personal report includes explicit area while draft or unrelated client never leaks', () => {
  const record = { ...validateAssessmentInput(fields), id:'report-1', clientId:'client-1', schemaVersion:1, status:'shared' }
  const client = clientAssessmentSummary(record, 'client-1')
  assert.equal(client.profileArea,'wu_xing')
  assert.equal(client.originalResult,undefined)
  assert.equal(publicAssessmentView(record).profileArea,'wu_xing')
  assert.equal(clientAssessmentSummary(record,'client-2'),undefined)
  assert.equal(clientAssessmentSummary({...record,status:'draft'},'client-1'),undefined)
  assert.equal(publicAssessmentView({...record,status:'draft'}),undefined)
  assert.equal(Object.hasOwn(publicAssessmentView({...record,profileArea:undefined}), 'profileArea'),false)
})

test('Google and private cabinets both select four areas without auto-linking private archives', async () => {
  const [workspace, legacyPage, legacy, domain, owner, editor, style] = await Promise.all([
    source('components/app/app-workspace.jsx'),
    source('app/[locale]/client/[selector]/page.js'),
    source('components/client-cabinet.jsx'),
    source('components/app/profile-domains.jsx'),
    source('app/admin/clients/[id]/assessments/actions.js'),
    source('components/assessment-editor.jsx'),
    source('components/app/profile-domains.css'),
  ])
  assert.match(workspace, /<ProfileDomains locale=\{locale\} mode="account"/)
  assert.match(workspace, /<Portrait data=\{data\} locale=\{locale\}/)
  assert.match(legacy, /\?view=profile/)
  assert.match(legacy, /<ProfileDomains locale=\{locale\} mode="legacy"/)
  assert.match(legacyPage, /authorizeCabinetRequest\(selector\)/)
  assert.match(legacyPage, /legacyDocumentProjection\(record, locale\)/)
  assert.match(domain, /const DOMAINS = PROFILE_AREAS/)
  assert.match(domain, /role="tablist"/)
  assert.match(domain, /role="tabpanel"/)
  assert.match(domain, /savedReports\.filter\(report => report.available !== false\)/)
  assert.match(domain, /credentials: 'same-origin'/)
  assert.match(domain, /cache: 'no-store'/)
  assert.match(domain, /recommendationItemType\(item, document\.recommendationType\)/)
  assert.match(domain, /open=\{expanded\}/)
  assert.match(domain, /\/app\/portfolio\?tab=dynamics/)
  assert.match(domain, /<ProfileServiceOffer area={active} locale={locale} \/>/)
  assert.match(domain, /data-profile-service-cta={area}/)
  assert.match(domain, /data-profile-interactive={interactive/)
  assert.doesNotMatch(domain, /hh-domain-next|consultHref|serviceHref/)
  assert.doesNotMatch(domain, /localStorage|sessionStorage/)
  assert.doesNotMatch(domain, /(?:diagnos\w*|percentage)\s*=\s*[^;]+/i)
  assert.match(owner, /'profileArea'/)
  assert.match(editor, /name="profileArea"/)
  assert.match(style, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(style, /\.hh-profile-domains \.hh-domain-promo \{/)
  assert.match(style, /@media\(max-width:760px\)/)
})

test('homeopathic history reads only names from authorized recommendation documents, no automatic doses', async () => {
  const [domain, route] = await Promise.all([
    source('components/app/profile-domains.jsx'),
    source('app/[locale]/client/[selector]/page.js'),
  ])
  assert.match(domain, /document\.recommendationType/)
  assert.match(route, /record\.clientId === access\.client\.id/)
  assert.match(route, /record\.status === 'active'/)
  assert.match(route, /items \|\| \[\]/)
  assert.match(domain, /item\.displayName/)
  assert.doesNotMatch(domain, /item\.dosage|item\.potency|item\.frequency/)
  assert.match(domain, /This shows what was issued, not what you currently take/)
})

test('all four profile areas show optional compact service orders in EN/RU with real routed destinations', async () => {
  assert.deepEqual([...PROFILE_AREAS], ['psychology','homeopathy','wu_xing','hypnotherapy'])
  const slugs = {
    psychology: 'alchemy-of-soul',
    homeopathy: 'psychohomeopathy',
    wu_xing: 'dao-health-profile',
    hypnotherapy: 'hypnotherapy-course',
  }
  const copyByArea = {
    psychology: ['Alchemy of the Soul','Алхимия души'],
    homeopathy: ['homeopathy','гомеопатии'],
    wu_xing: ['Wu Xing','У-Син'],
    hypnotherapy: ['Hypnotherapy','гипнотерапии'],
  }
  for (const locale of ['en','ru']) {
    for (const area of PROFILE_AREAS) {
      const offer = profileServiceOffer(area,locale)
      assert.equal(offer.descriptionHref, '/' + locale + '/services/' + slugs[area])
      const href = new URL(offer.requestHref)
      assert.equal(href.origin,'https://wa.me')
      assert.equal(href.pathname,'/14376066502')
      const message = href.searchParams.get('text')
      assert.ok(message.includes(offer.service))
      assert.ok(message.includes(offer.request))
      assert.match(message,new RegExp(copyByArea[area][locale === 'ru' ? 1 : 0],'i'))
      assert.doesNotMatch(message, /\/client\/|\/app\/|\/report\/|\.pdf|selector|token|assessment id|medication dose/i)
      assert.ok(offer.button && offer.description && offer.details)
      assert.ok(offer.request.length >= 30)
      assert.ok(!Object.hasOwn(offer,'score') && !Object.hasOwn(offer,'clientId'))
      const slug = slugs[area]
      await assert.doesNotReject(() => source('app/[locale]/services/' + slug + '/page.tsx'))
    }
  }
  assert.match(profileServiceOffer('wu_xing','en').service,/FREE/)
  assert.match(profileServiceOffer('wu_xing','ru').service,/БЕСПЛАТНАЯ/)
  assert.throws(()=>profileServiceOffer('other','en'),/UNKNOWN_PROFILE_AREA/)
  assert.throws(()=>profileServiceOffer('psychology','xx'),/UNKNOWN_PROFILE_LOCALE/)
})
