import { createExpectedTestimonialPosterFixture, expectedTestimonialPoster, additionalTestimonialPoster, assertSyntheticPosterObservation } from './expected-testimonial-poster-fixture.mjs'
import assert from 'node:assert/strict'
const REFERENCE = 'HH-ABCD1234EF56', PHONE = '+14165550123'
// Source-pinned expectations; never inferred from a rendered URL or POST.
export const freeReviewVideos = Object.freeze({
 en: { provider: 'youtube', id: 's30Y42IwPcg', title: 'How I Choose the Right Method', audio: 'en' },
 ru: { provider: 'youtube', id: 'Cz6SxXJNZbw', title: 'Как я выбираю подходящий метод', audio: 'ru' },
 es: { provider: 'heygen', id: '2c251709aba74fd96ae8be43257a080b', title: 'Mi enfoque de la alquimia psíquica', audio: 'es' },
})
export const diagnosisOffers = Object.freeze({
 en: { titles: ['Free situation diagnosis', 'Free energy & wellbeing review — Wu Xing (Five Elements)', 'Personal consultation'], free: 'FREE', price: '30 MIN · €50', label: '03 · LIVE WITH ANDREY', phoneError: 'Enter your international phone number.', consentError: 'Please agree to one personal reply before continuing.' },
 ru: { titles: ['Бесплатная диагностика ситуации', 'Диагностика энергии и здоровья по У-Син (Пять стихий)', 'Личная консультация'], free: 'БЕСПЛАТНО', price: '30 МИН · €50', label: '03 · ВСТРЕЧА С АНДРЕЕМ', phoneError: 'Введите номер телефона с кодом страны.', consentError: 'Для отправки подтвердите согласие на один личный ответ.' },
 es: { titles: ['Diagnóstico gratuito de tu situación', 'Revisión de energía y bienestar Wu Xing (Cinco Elementos)', 'Consulta personal'], free: 'GRATIS', price: '30 MIN · €50', label: '03 · CON ANDREY', phoneError: 'Introduce tu teléfono con prefijo internacional.', consentError: 'Acepta una respuesta personal antes de continuar.' },
})
const offerIds = ['situation-written-free', 'wu-xing-free', 'personal-session-30-eur50']
function boundary(origin, locale) {
 assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/)
 assert.equal(new URL(origin).origin, origin)
 assert.ok(Object.hasOwn(freeReviewVideos, locale))
}
export function assertFreeReviewVideoSource(raw, locale) {
 const c = freeReviewVideos[locale]; assert.ok(c)
 assert.ok(typeof raw === 'string' && raw.length > 0 && raw.length <= 2048 && raw === raw.trim())
 const url = new URL(raw)
 assert.equal(url.protocol, 'https:')
 assert.equal(url.username + url.password + url.port + url.hash, '')
 assert.equal(url.origin, c.provider === 'youtube' ? 'https://www.youtube-nocookie.com' : 'https://app.heygen.com')
 assert.equal(url.pathname, (c.provider === 'youtube' ? '/embed/' : '/embeds/') + c.id)
 const expected = c.provider === 'youtube' ? {autoplay:'1', playsinline:'1', rel:'0', hl:locale, cc_lang_pref:c.audio} : {}
 assert.equal([...url.searchParams].length, Object.keys(expected).length)
 for (const [key, value] of Object.entries(expected)) assert.deepEqual(url.searchParams.getAll(key), [value])
}
export function assertDiagnosisPayload(payload, locale) {
 const c = diagnosisOffers[locale]; assert.ok(c)
 assert.deepEqual(Object.keys(payload).sort(), ['operationId','serviceTitle','description','sourcePath','locale','contact','contactConsent','website'].sort())
 assert.match(payload.operationId, /^[a-f0-9-]{36}$/i)
 assert.equal(payload.serviceTitle, c.titles[2])
 assert.equal(payload.description, c.label + ' · ' + c.price, 'The chosen €50 / 30-minute offer survives registration')
 assert.equal(payload.sourcePath, '/' + locale + '/services/free-consultation')
 assert.equal(payload.locale, locale)
 assert.deepEqual(payload.contact, {displayName:'', email:'', phone:PHONE})
 assert.equal(payload.contactConsent, true)
 assert.equal(payload.website, '')
}
// Independent complete public-message oracle. Do not import the app generator,
// derive these lines from its output, or permit arbitrary text around substrings.
const diagnosisDrafts = Object.freeze({
 en: 'Hello Andrey!\nHolistic House — service enquiry\n\nService: Personal consultation\nRequest: I would like to request this service. Please tell me the next step.\nSelected option: 30 MIN · €50\nPage: https://holistichouse.vercel.app/en/services/free-consultation\n\nEnquiry: HH-ABCD1234EF56',
 ru: 'Здравствуйте, Андрей!\nHolistic House — запрос по услуге\n\nУслуга: Личная консультация\nЗапрос: Хочу заказать эту услугу. Подскажите, пожалуйста, следующий шаг.\nВыбранный вариант: 30 МИН · €50\nСтраница: https://holistichouse.vercel.app/ru/services/free-consultation\n\nЗаявка: HH-ABCD1234EF56',
 es: 'Hola Andrey.\nHolistic House — solicitud de servicio\n\nServicio: Consulta personal\nSolicitud: Quisiera solicitar este servicio. Indícame, por favor, el siguiente paso.\nOpción elegida: 30 MIN · €50\nPágina: https://holistichouse.vercel.app/es/services/free-consultation\n\nSolicitud: HH-ABCD1234EF56',
})
export function assertDiagnosisDraft(raw, locale, channel = 'whatsapp') {
 assert.ok(['whatsapp','telegram'].includes(channel))
 assert.ok(Object.hasOwn(diagnosisDrafts,locale))
 assert.ok(typeof raw === 'string' && raw.length > 0 && raw.length <= 2048 && raw === raw.trim())
 const url = new URL(raw)
 assert.equal(url.origin, channel === 'whatsapp' ? 'https://wa.me' : 'https://t.me')
 assert.equal(url.pathname, channel === 'whatsapp' ? '/14376066502' : '/AndyTherapist')
 assert.equal(url.username + url.password + url.port + url.hash, '')
 assert.deepEqual([...url.searchParams.keys()], ['text'])
 const message = url.searchParams.get('text')
 assert.equal(message, diagnosisDrafts[locale], 'Only the complete pinned public offer/source/reference draft is permitted')
 const encoded = channel === 'whatsapp' ? new URLSearchParams({text:diagnosisDrafts[locale]}).toString() : 'text='+encodeURIComponent(diagnosisDrafts[locale])
 assert.equal(raw, (channel === 'whatsapp' ? 'https://wa.me/14376066502?' : 'https://t.me/AndyTherapist?')+encoded, 'Exact public recipient and canonical draft URL')
 for (const value of [PHONE,'4165550123','enquiry-qa@example.test','Public QA Visitor']) assert.ok(!decodeURIComponent(url.href).includes(value), 'No synthetic contact in provider URL')
 return message
}
// Expected provider documents are intercepted as inert HTML, not fetched.
// Unknown APIs, writes and providers fail closed; context routing covers popups.
export function createFreeEntryGuard(origin, locale, {syntheticTestimonialPoster=false} = {}) {
 boundary(origin, locale)
 const posterFixture=syntheticTestimonialPoster===true?createExpectedTestimonialPosterFixture(origin,locale):null
 const state = {videoArmed:false, enquiryArmed:false, submissions:[], videos:0, handoffs:0, blocked:[], get fixturePosters(){return posterFixture?.responses||0}, fixturePosterRequests:id=>posterFixture?.responsesFor(id)||0}
 const block = (route, reason) => { state.blocked.push(reason); return route.abort('blockedbyclient') }
 state.route = async route => {
  const request = route.request(), url = new URL(request.url()), method = request.method()
  if (url.origin === origin && url.pathname === '/api/service-enquiries') {
   if (!state.enquiryArmed || method !== 'POST' || url.href !== origin + '/api/service-enquiries' || state.submissions.length) return block(route, 'unexpected-enquiry')
   const payload = request.postDataJSON()
   try { assertDiagnosisPayload(payload, locale) } catch { return block(route, 'wrong-offer-or-contact') }
   state.submissions.push(payload)
   return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({saved:true,referenceCode:REFERENCE})})
  }
  if (url.origin === origin && ['GET','HEAD'].includes(method) && !url.pathname.startsWith('/api/')) return route.continue()
  if (posterFixture && await posterFixture.tryFulfill(route)) return
  if (method === 'GET' && request.resourceType() === 'document') {
   if (state.videoArmed) {
    try { assertFreeReviewVideoSource(url.href,locale); state.videos++; return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Synthetic video document</title>'}) } catch { /* Not the expected embed. */ }
   }
   if (state.submissions.length === 1) {
    try { assertDiagnosisDraft(url.href,locale); state.handoffs++; return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Synthetic handoff document</title>'}) } catch { /* No other provider is authorized. */ }
   }
  }
  return block(route, url.origin === origin ? 'unexpected-local-request' : 'unexpected-provider')
 }
 return state
}
export async function verifyFreeReviewCurrentFlow(page, expect, {origin,locale,inspectPrivateIntake}) {
 boundary(origin,locale)
 assert.equal(page.url(),origin+'/'+locale+'/services/free-situation-review')
 const guard=createFreeEntryGuard(origin,locale),context=page.context(),c=freeReviewVideos[locale]
 await context.route('**/*',guard.route)
 try {
  const main=page.locator('main[data-free-entry-landing="situation"]'),intro=main.locator('[data-free-review-intro-video]')
  await expect(intro).toHaveCount(1); await expect(intro).toBeVisible()
  await expect(intro).toHaveAttribute('data-intro-audio-language',c.audio)
  await expect(intro.locator('figure.site-video-player')).toHaveAttribute('lang',locale)
  await expect(intro.locator('.site-video-caption > span[lang]')).toHaveAttribute('lang',c.audio)
  await expect(intro.locator('.site-video-caption > span[lang]')).toHaveText(c.title)
  await expect(intro.locator('a.site-video-watch-link')).toHaveAttribute('href',c.provider==='youtube'?'https://www.youtube.com/watch?v='+c.id:'https://app.heygen.com/share/'+c.id)
  await expect(intro.locator('iframe')).toHaveCount(0)
  const play=intro.locator('button.site-video-play')
  await expect(play).toBeVisible(); await expect(play).toBeEnabled()
  assert.equal(guard.videos,0,'No provider document before explicit click')
  guard.videoArmed=true
  await play.click()
  const frame=intro.locator('iframe')
  await expect(frame).toHaveCount(1)
  await expect(frame).toHaveAttribute('data-video-playback',c.provider)
  await expect(frame).toHaveAttribute('title',c.title)
  assertFreeReviewVideoSource(await frame.getAttribute('src'),locale)
  await expect(play).toHaveCount(0)
  await expect.poll(()=>guard.videos).toBe(1)
  guard.videoArmed=false
  await expect(main.locator('[data-diagnosis-offer]')).toHaveCount(0)
  const enquiry=main.locator('#request-free-review[data-personal-express-enquiry]')
  await expect(enquiry).toHaveCount(1); await expect(enquiry).toHaveAttribute('lang',locale)
  const reveal=enquiry.locator('[data-express-reveal]'),panel=enquiry.locator('[data-express-inline-disclosure]')
  await expect(reveal).toHaveAttribute('aria-expanded','false'); await expect(panel).toBeHidden()
  await reveal.click()
  await expect(reveal).toHaveAttribute('aria-expanded','true'); await expect(panel).toBeVisible()
  for(const focus of ['energy','situation']) {
   await enquiry.locator('[data-express-focus="'+focus+'"]').click()
   await expect(enquiry.locator('input[value="'+focus+'"]')).toBeChecked()
   await expect(enquiry.locator('input[type="checkbox"]')).not.toBeChecked()
   await expect(enquiry.locator('a[data-contact-channel]')).toHaveCount(0)
   assert.equal(guard.submissions.length,0,'A free focus selection is not registration')
  }
  await reveal.click(); await expect(panel).toBeHidden()
  const advanced=main.locator('details[data-optional-written-review]')
  await expect(advanced).toHaveCount(1)
  assert.equal(await advanced.evaluate(element=>element.open),false)
  if(inspectPrivateIntake) {
   await advanced.locator(':scope > summary').click()
   const intake=advanced.locator('[data-free-drawing-intake]')
   await expect(intake).toBeVisible()
   await expect(intake.locator('a[href="/'+locale+'/coaching/intake?topic=personal"]')).toBeVisible()
   await expect(intake.locator('form,textarea,input[type="file"]')).toHaveCount(0)
  }
  assert.equal(guard.submissions.length,0); assert.deepEqual(guard.blocked,[])
 } finally { await context.unroute('**/*',guard.route) }
}

export async function verifyFreeDiagnosisHub(page, expect, {origin,locale}) {
 boundary(origin,locale)
 const guard=createFreeEntryGuard(origin,locale,{syntheticTestimonialPoster:true}),context=page.context(),c=diagnosisOffers[locale]
 let popup
 await context.route('**/*',guard.route)
 try {
  await page.goto(origin + "/" + locale + "/services/free-consultation", {waitUntil: "domcontentloaded"});
  assert.equal(page.url(),origin+'/'+locale+'/services/free-consultation')
  const hub=page.locator('[data-free-consultation-hub]'),offers=hub.locator('[data-diagnosis-offer]')
  await expect(offers).toHaveCount(3); await expect(offers.locator('img')).toHaveCount(3)
  // One source-approved public poster is synthetic; every other provider stays closed.
  const posterCard=hub.locator('[data-personal-testimonials="all"] [data-testimonial-video-id="m9RfDgK76PU"]')
  await expect(posterCard).toHaveCount(1)
  const poster=posterCard.locator('img.site-video-poster')
  await expect(poster).toHaveCount(1); await expect(poster).toHaveAttribute('src',expectedTestimonialPoster)
  await posterCard.scrollIntoViewIfNeeded()
  await expect.poll(()=>guard.fixturePosterRequests('m9RfDgK76PU')).toBe(1)
  await expect.poll(()=>poster.evaluate(image=>image.complete&&image.naturalWidth===640&&image.naturalHeight===360)).toBe(true)
  const posterState=await poster.evaluate((image,expected)=>{
   const rect=image.getBoundingClientRect()
   return{sourceMatches:image.getAttribute('src')===expected,complete:image.complete,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,width:rect.width,height:rect.height}
  },expectedTestimonialPoster)
  assertSyntheticPosterObservation({...posterState,targetCount:await posterCard.count(),imageCount:await poster.count(),requests:guard.fixturePosterRequests('m9RfDgK76PU')})
  // This second source-declared poster is fulfilled only if the browser asks;
  // no scroll/load is forced for an otherwise offscreen image.
  const additionalCard=hub.locator('[data-personal-testimonials="all"] [data-testimonial-video-id="5oj0BIbLT4w"]')
  await expect(additionalCard).toHaveCount(1)
  const additionalPoster=additionalCard.locator('img.site-video-poster')
  await expect(additionalPoster).toHaveCount(1); await expect(additionalPoster).toHaveAttribute('src',additionalTestimonialPoster)
  for(let i=0;i<offerIds.length;i++) {
   const offer=hub.locator('[data-diagnosis-offer="'+offerIds[i]+'"]')
   await expect(offer.locator('h3')).toHaveText(c.titles[i])
   await expect(offer.locator('strong')).toHaveText(i===2?c.price:c.free)
  }
  const dialog=hub.locator('[data-diagnosis-order-form]')
  await expect(dialog).toHaveAttribute('data-open','false'); await expect(dialog.locator('form')).toHaveCount(0)
  await hub.locator('[data-diagnosis-order="wu-xing-free"]').click()
  await expect(dialog).toBeVisible(); await expect(dialog).toHaveAttribute('role','dialog'); await expect(dialog).toHaveAttribute('aria-modal','true')
  await expect(dialog.locator('#diagnosis-request-heading')).toHaveText(c.titles[1])
  await expect(dialog.locator('input[type="checkbox"]')).not.toBeChecked()
  assert.equal(guard.submissions.length,0)
  await page.keyboard.press('Escape'); await expect(dialog).toHaveAttribute('data-open','false')
  await hub.locator('[data-diagnosis-order="personal-session-30-eur50"]').click()
  await expect(dialog.locator('#diagnosis-request-heading')).toHaveText(c.titles[2])
  const chooser=dialog.locator('[data-contact-channel-chooser][data-reiki-phone-enquiry]')
  await expect(chooser).toHaveCount(1)
  const form=chooser.locator('form'),consent=form.locator('input[type="checkbox"]'),submit=form.locator('[data-contact-channel-submit="whatsapp"]')
  await expect(consent).not.toBeChecked(); await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
  await submit.click(); await expect(form.getByRole('alert')).toHaveText(c.phoneError)
  assert.equal(guard.submissions.length,0)
  await form.locator('[data-phone-country-input] select').selectOption('CA')
  await form.locator('[data-phone-country-input] input[type="tel"]').fill('4165550123')
  await submit.click(); await expect(form.getByRole('alert')).toHaveText(c.consentError)
  assert.equal(guard.submissions.length,0,'Paid selection and contact are not consent or booking')
  await consent.check(); await expect(consent).toBeChecked()
  guard.enquiryArmed=true
  const popupPromise=page.waitForEvent('popup')
  await submit.click(); popup=await popupPromise
  await expect(chooser.getByRole('status')).toContainText(REFERENCE)
  await expect.poll(()=>guard.submissions.length).toBe(1)
  assertDiagnosisPayload(guard.submissions[0],locale)
  await expect.poll(()=>guard.handoffs).toBe(1)
  const messages=[]
  for(const channel of ['whatsapp','telegram']) {
   const link=chooser.locator('a[data-contact-channel="'+channel+'"]')
   await expect(link).toBeVisible(); await expect(link).toHaveAttribute('target','_blank')
   await expect(link).toHaveAttribute('rel',/noopener/); await expect(link).toHaveAttribute('rel',/noreferrer/)
   messages.push(assertDiagnosisDraft(await link.getAttribute('href'),locale,channel))
  }
  assert.equal(messages[0],messages[1]); assertDiagnosisDraft(popup.url(),locale)
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('hh-service-enquiry-receipt:v1')))
  assert.deepEqual(Object.keys(stored).sort(),['createdAt','referenceCode']); assert.equal(stored.referenceCode,REFERENCE)
  assert.ok(Number.isSafeInteger(stored.createdAt) && stored.createdAt <= Date.now())
  assert.equal(page.url(),origin+'/'+locale+'/services/free-consultation')
  await popup.close(); popup=null
  await dialog.locator('header button[type="button"]').click()
  await hub.locator('[data-diagnosis-order="situation-written-free"]').click()
  await expect(dialog.locator('#diagnosis-request-heading')).toHaveText(c.titles[0])
  await expect(dialog.locator('input[type="checkbox"]')).not.toBeChecked()
  await expect(dialog.locator('a[data-contact-channel]')).toHaveCount(0)
  assert.equal(guard.submissions.length,1,'Switching back to free is not another registration')
  const additionalRequests=guard.fixturePosterRequests('5oj0BIbLT4w')
  assert.ok(additionalRequests===0||additionalRequests===1,'Second declared poster remains optional and capped')
  if(additionalRequests===1) {
   await expect.poll(()=>additionalPoster.evaluate(image=>image.complete&&image.naturalWidth===640&&image.naturalHeight===360)).toBe(true)
   assert.equal(await additionalPoster.getAttribute('src'),additionalTestimonialPoster)
  }
  assert.deepEqual(guard.blocked,[])
 } finally { if(popup) await popup.close(); await context.unroute('**/*',guard.route) }
}
