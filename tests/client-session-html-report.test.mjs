import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('private consultation HTML has prescription-first course-style hierarchy',()=>{
 const page=src('components/client-session-page.jsx')
 const report=src('components/client-session-prescription.jsx')
 const css=src('components/client-session.module.css')
 for(const marker of ['id="session-message"','part="summary"','part="remedies"',
   'id="session-report"','id="session-guide"','id="session-recommendations"','id="session-resources"'])
   assert.ok(page.includes(marker),marker)
 for(const marker of ["recommendation.generalInstructions","recommendation.includeDistanceHomeopathy",
   "item.displayName","<details","remedySchedule(item,locale"])
   assert.ok(report.includes(marker),marker)
 assert.doesNotMatch(report,/recommendationGuidance/)
 assert.ok(css.includes('.courseSessionPage'))
 assert.ok(css.includes('.remedyAccordion[open]'))
 assert.ok(css.includes('min-height:44px'))
})

test('client and cabinet route supply only authorized report projection and client name',()=>{
 const guest=src('app/[locale]/client/session/[shareSelector]/page.js')
 const cabinet=src('app/[locale]/client/[selector]/sessions/[sessionId]/page.js')
 assert.match(guest,/authorizeSessionGuest/)
 assert.match(guest,/getPublishedSessionReport/)
 assert.match(cabinet,/authorizeCabinetRequest/)
 assert.match(cabinet,/getPublishedSessionReport/)
 assert.match(guest,/recommendation=\{recommendation\}/)
 assert.match(cabinet,/recommendation=\{recommendation\}/)
 assert.doesNotMatch(guest,/return <ClientSessionPage[^]*?internalNotes=/)
})
