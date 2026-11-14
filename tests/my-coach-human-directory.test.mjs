import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from '../lib/whatsapp-enquiry.js'

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('My Coach defaults to All: first five AI coaches, then real people; filters preserve full AI directory', () => {
  const catalog = read('components/my-coach-catalog.jsx')
  const css = read('components/my-coach-catalog.module.css')
  assert.match(catalog, /data-my-coach-kind-switch/)
  assert.match(catalog, /const \[directoryMode, setDirectoryMode\] = useState\('all'\)/)
  for (const mode of ['all', 'ai', 'human'])
    assert.ok(catalog.includes("aria-pressed={directoryMode === '" + mode + "'}"), mode)
  assert.match(catalog, /directoryMode === 'all' \? visibleList\.slice\(0, 5\) : visibleList/)
  assert.match(catalog, /\{displayedCoaches\.map\(persona =>/)
  assert.match(catalog, /hidden=\{directoryMode === 'human'\}/)
  assert.match(catalog, /hidden=\{directoryMode === 'ai'\}/)
  assert.match(catalog, /data-my-coach-combined=\{directoryMode === 'all'/)
  assert.match(catalog, /data-my-coach-human-card="andrey-litvinov"/)
  assert.match(catalog, /data-my-coach-card=\{persona\.id\}/)
  assert.match(catalog, /coachSessionHref\(lang, persona\.id, normalizeCoachSettings\(persona\.id\)\)/)
  assert.match(css, /\.coachKindSwitch\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css, /\.coachKindActive/)
  assert.match(css, /\.humanPortrait img\{[^}]*object-fit:cover/)
})

test('Human Message opens two standard messenger actions below the whole card, not a booking page', () => {
  const catalog = read('components/my-coach-catalog.jsx')
  const ui = read('components/mandatory-messenger-actions.tsx')
  const page = read('app/[locale]/my-coach/page.jsx')
  const target = read('app/[locale]/services/imagery-therapy/page.tsx')
  assert.match(catalog, /src="\/images\/holistic-house\/andy-about.png"/)
  assert.match(catalog, /data-my-coach-human-message-toggle aria-expanded=\{humanContactOpen\}/)
  assert.match(catalog, /data-my-coach-human-message-menu/)
  assert.match(catalog, /hidden=\{!humanContactOpen\}/)
  assert.match(catalog, /<MandatoryMessengerActions locale=\{lang\} whatsappUrl=\{humanMessageUrl\}/)
  assert.match(catalog, /telegramUrl=\{telegramEnquiryUrlFromWhatsApp\(humanMessageUrl\)\}/)
  assert.match(catalog, /pagePath: '\/' \+ lang \+ '\/services\/imagery-therapy'/)
  assert.match(catalog, /aria-expanded=\{humanExpanded\}/)
  assert.match(target, /service = "imagery-therapy"/)
  assert.match(ui, /data-messenger-only-channel="whatsapp"/)
  assert.match(ui, /data-messenger-only-channel="telegram"/)
  for (const locale of ['en', 'ru', 'es']) {
    assert.match(catalog, new RegExp('\\b' + locale + ': \\{'))
    assert.ok(page.includes('/' + locale + '/my-coach'))
  }
  const url = whatsappEnquiryUrl({
    locale:'ru',service:'Психотерапия и работа с образами',
    request:'Хочу узнать о персональной сессии',pagePath:'/ru/services/imagery-therapy',
  })
  const draft = new URL(url).searchParams.get('text')
  assert.match(draft, /Психотерапия и работа с образами/)
  assert.match(draft, /\/ru\/services\/imagery-therapy/)
  assert.match(decodeURIComponent(telegramEnquiryUrlFromWhatsApp(url)), /Хочу узнать о персональной сессии/)
  assert.match(catalog, /confirmed separately|подтверждаются отдельно|confirman después/)
  assert.doesNotMatch(catalog, /Guaranteed booking/)
})
