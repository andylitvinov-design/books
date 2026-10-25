import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = name => readFileSync(new URL('../' + name,import.meta.url),'utf8')
test('one free express review keeps original inline CRM-first capture and optional short note',()=>{
 const form=read('components/contact-channel-chooser.tsx')
 const landing=read('components/personal-express-enquiry.tsx')
 const css=read('components/contact-channel-chooser.module.css')
 assert.match(landing,/publicTopic=\{"Express review focus: "/)
 assert.match(form,/const expressReview = compactPhone && publicTopic\?\.startsWith\("Express review focus: "\)/)
 assert.match(form, /\{expressReview && <label className=\{styles\.compactQuestion\}>/)
 assert.match(form,/textarea rows=\{2\} maxLength=\{300\}/)
 assert.match(form,/Initial question: /)
 assert.match(form,/publicTopic\?\.trim\(\)/)
 assert.match(form,/fetch\("\/api\/service-enquiries"/)
 assert.match(form,/contactConsent: consent/)
 assert.match(form,/!consent/)
 assert.match(form,/data-contact-channel-submit="whatsapp"/)
 assert.match(form,/data-contact-channel-submit="telegram"/)
 assert.match(css,/\.compactQuestion textarea/)
 assert.match(css,/font:400 16px/)
 assert.doesNotMatch(form,/lead_created|sendBeacon\(|navigator\.clipboard|uploadPhoto/)
})
test('EN RU ES privacy-neutral text only and no newly required field',()=>{
 const form=read('components/contact-channel-chooser.tsx')
 for(const term of ['expressQuestion:','expressHint:']) assert.equal(form.split(term).length-1,3)
 assert.ok(form.includes('В чём суть вашего вопроса? (необязательно)'))
 assert.ok(form.includes('What would you like to explore? (optional)'))
 assert.ok(form.includes('¿Cuál es tu consulta? (opcional)'))
 assert.doesNotMatch(form,/textarea rows=\{2\} maxLength=\{300\} required/)
})
