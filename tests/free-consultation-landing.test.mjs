import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const landing = read('app/[locale]/services/free-consultation/page.tsx')
const css = read('app/[locale]/services/free-consultation/free-consultation.module.css')
const offers = read('components/free-diagnosis-offers.tsx')
const profile = read('components/app/profile-domains.jsx')
const publicLocales = read('lib/public-locales.ts')

function assertLanding(page) {
  assert.match(page, /data-free-consultation-hub/)
  assert.match(page, /publicLocales\.map\(locale => \(\{ locale \}\)\)/)
  assert.match(page, /if \(!publicLocales\.includes\(locale as PublicLocale\)\) notFound\(\)/)
  assert.match(page, /<FreeDiagnosisOffers locale=\{lang\} \/>/)
  assert.match(page, /<p className=\{styles\.safety\}>[\s\S]*?\{t\.safety\}<\/p>/)
  for (const phrase of [
    'not a confirmed booking or payment',
    'не означает подтверждённую запись или оплату',
    'no confirma una reserva ni un pago',
    'not a medical diagnostic or treatment',
    'не медицинская диагностика и не лечение',
    'no un diagnóstico o tratamiento médico',
  ]) assert.ok(page.includes(phrase), phrase)
  assert.doesNotMatch(page, /fetch\(|post\(|localStorage|sessionStorage|target="_blank"/)
}

test('one localized Cabinet destination presents requests, not instant appointments or payment', () => {
  assert.ok(profile.includes("href={'/' + locale + '/services/free-consultation'}"))
  assert.match(profile, /data-report-archive-always-open/)
  assert.doesNotMatch(profile, /setArchiveOpen|hh-account-report-toggle|freeIntroConsultationHref/)
  assertLanding(landing)
  for (const [before, after] of [
    ['<FreeDiagnosisOffers locale={lang} />', '<FreeDiagnosisOffers locale="en" />'],
    ['{t.safety}</p>', '</p>'],
    ['not a confirmed booking or payment', 'a confirmed booking and payment'],
  ]) assert.throws(() => assertLanding(landing.replace(before, after)))
})

function assertOfferContract(source, chooser) {
  // The authored replacement is two free written options plus one optional paid
  // session, not the retired three-free-links layout. Pin prices independently.
  const rows = [...source.matchAll(/id: "(situation-written-free|wu-xing-free|personal-session-30-eur50)",[\s\S]*?price: "([^"]+)"/g)]
    .map(([, id, price]) => ({ id, price }))
  assert.deepEqual(rows, ['FREE', 'БЕСПЛАТНО', 'GRATIS'].flatMap((free, index) => [
    { id: 'situation-written-free', price: free },
    { id: 'wu-xing-free', price: free },
    { id: 'personal-session-30-eur50', price: index === 1 ? '30 МИН · €50' : '30 MIN · €50' },
  ]))
  assert.match(source, /const activeOffer = t\.offers\.find\(offer => offer\.id === selected\)/)
  assert.match(source, /function requestOffer\(id: OfferId\) \{\s*setSelected\(id\);\s*setRequestOpen\(true\)/)
  assert.match(source, /onClick=\{\(\) => requestOffer\(offer\.id\)\}/)
  assert.match(source, /<strong>\{offer\.price\}<\/strong>/)
  assert.match(source, /service: activeOffer\.title, request: t\.messengerRequest/)
  assert.match(source, /option: activeOffer\.price, pagePath: pathname/)
  assert.match(source, /compactPhone stayAfterSave resetKey=\{selected\}/)
  assert.match(source, /publicTopic=\{activeOffer\.label \+ " · " \+ activeOffer\.price\}/)
  assert.match(chooser, /if \(!consent\) \{/)
  assert.match(chooser, /contactConsent: consent/)
  assert.match(chooser, /description\.trim\(\) \|\| \(\(quick \|\| compactPhone\) \? publicTopic\?\.trim\(\) \|\| "" : ""\)/)
  for (const phrase of ['without a live call or payment', 'без звонка и оплаты', 'sin videollamada ni pago',
    'secure way to share your materials', 'защищённым способом', 'compartir tus materiales con seguridad']) assert.ok(source.includes(phrase), phrase)
  assert.doesNotMatch(source, /navigator\.clipboard|fetch\(|sendBeacon|XMLHttpRequest|localStorage|sessionStorage/)
}

test('two free written reviews and optional €50 session preserve selected offer, consent and secure materials handoff', () => {
  const chooser = read('components/contact-channel-chooser.tsx')
  assertOfferContract(offers, chooser)
  assert.match(publicLocales, /free-situation-review\|free-consultation\|imagery-therapy/)
  for (const [before, after] of [
    ['price: "FREE"', 'price: "€50"'], ['30 MIN · €50', '30 MIN · €100'],
    ['setSelected(id)', 'setSelected("situation-written-free")'],
    ['option: activeOffer.price', 'option: "FREE"'],
    ['publicTopic={activeOffer.label + " · " + activeOffer.price}', 'publicTopic={activeOffer.label}'],
  ]) { assert.ok(offers.includes(before)); assert.throws(() => assertOfferContract(offers.replace(before, after), chooser), undefined, before) }
  assert.throws(() => assertOfferContract(offers, chooser.replace('if (!consent)', 'if (false)')))
  assert.throws(() => assertOfferContract(offers + '\nnavigator.clipboard.writeText(privateAnswers)', chooser))
})

test('the current offer cards and request dialog retain mobile and keyboard controls', () => {
  assert.match(landing, /<StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/)
  assert.match(landing, /href="#free-diagnosis-options"/)
  assert.match(offers, /id="free-diagnosis-options"/)
  assert.match(offers, /<Image src=\{photos\[offer\.id\]\} alt=\{offer\.imageAlt\}/)
  assert.match(offers, /aria-label=\{t\.order \+ ": " \+ offer\.title\}/)
  assert.match(offers, /role=\{requestOpen \? "dialog" : undefined\} aria-modal=\{requestOpen \|\| undefined\}/)
  assert.match(offers, /aria-labelledby="diagnosis-request-heading"/)
  assert.match(offers, /closeButtonRef\.current\?\.focus\(\)/)
  assert.match(offers, /event\.key === "Escape"/)
  assert.match(offers, /previousFocus\?\.focus\(\)/)
  assert.match(css, /@media\(max-width:760px\)/)
  assert.match(css, /@media\(max-width:390px\)/)
  assert.match(css, /\.page a:focus-visible/)
  assert.match(css, /prefers-reduced-motion/)
  const offerCss = read('components/free-diagnosis-offers.module.css')
  assert.match(offerCss, /@media\(max-width:720px\)/)
  assert.match(offerCss, /:focus-visible/)
  assert.match(offerCss, /min-height:44px/)
})
