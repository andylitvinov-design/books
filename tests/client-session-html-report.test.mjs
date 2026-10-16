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


test('private report v4 removes visual duplication while retaining protected report actions',()=>{
  const page=src('components/client-session-page.jsx')
  const report=src('components/client-session-prescription.jsx')
  const css=src('components/client-session.module.css')
  const summary=report.split("if(part==='summary')return")[1]?.split("if(part==='remedies')return")[0]
  assert.ok(summary,'the original approved summary projection remains')
  assert.doesNotMatch(summary,/prescriptionOverviewList/,'prescriptions appear only in the expandable list')
  assert.match(summary,/prescriptionSummaryLead/)
  assert.match(report,/remedyAccordions/)
  assert.match(report,/followUpDateLabel\(recommendation.followUpDate,locale\)/)
  assert.match(report,/parsed.toISOString\(\).slice\(0, 10\) !== value/,'invalid ISO dates are not reformatted')
  assert.match(page,/className=\{styles.clientWordmark\}/)
  assert.match(page,/className=\{styles.fullReportContent\}>\{reportContent\}/)
  assert.match(page,/!hasFullReport&&hasRecommendation/)
  assert.doesNotMatch(page,/<details className=\{styles.reportDetails\}>/)
  assert.match(page,/href=\{pdfPath\}/,'PDF uses the original protected route')
  assert.match(page,/PrivatePlayer/)
  assert.match(page,/SaveClientSessionToAccount/)
  assert.match(page,/SessionExitSaveGuard/)
  assert.match(css,/Client consultation report v4/)
  assert.match(css,/Original signed HTML report: always-visible/)
  assert.match(css,/\.cabinetSessionPage \.sessionIdentity\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css,/\.cabinetSessionPage \.remedyDetailSection\{/)
  assert.match(css,/@media\(max-width:355px\)/,'320px phones get a single-column identity strip')
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)
  assert.match(css,/@media print\{/)
})
