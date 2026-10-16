import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('private consultation follows one-level mobile-first reading order with a single PDF action',()=>{
 const page=src('components/client-session-page.jsx')
 const report=src('components/client-session-prescription.jsx')
 const css=src('components/client-session.module.css')
 for(const marker of ['id="session-message"','part="remedies"','id="session-report"',
   'id="session-guide"','id="session-recommendations"','id="session-resources"'])
   assert.ok(page.includes(marker),marker)
 const ordered=['part="remedies"','id="session-recommendations"','id="session-message"',
   'id="session-photos"','id="session-guide"','id="session-resources"','id="session-report"']
 ordered.reduce((previous,marker)=>{
   const index=page.indexOf(marker)
   assert.ok(index>previous,marker+' must follow the previous section')
   return index
 },-1)
 assert.doesNotMatch(page,/part="summary"|nextAnchor|nextStepLink|Развернуть полную HTML-версию/)
 assert.match(page,/reportContent&&\(!hasRecommendation\|\|hasReportAppendix\)/)
 assert.match(page,/session\.summary&&<details/)
 assert.match(page,/item\.transcript&&<div className=\{styles\.transcriptText\}/)
 assert.equal((page.match(/className=\{styles\.downloadButton\}/g)||[]).length,1)
 assert.match(page,/Скачать отчёт/)\n assert.match(page,/Приложения к отчёту/)
 assert.match(page,/className=\{styles\.clientWordmark\}/)
 for(const marker of ["recommendation.generalInstructions","recommendation.includeDistanceHomeopathy",
   "item.displayName","<details","remedySchedule(item,locale","id=\"session-prescription\""])
   assert.ok(report.includes(marker),marker)
 assert.doesNotMatch(report,/className=\{styles\.nestedDetail\}/)
 assert.match(report,/return <div className=\{styles\.adviceSupplement\}>/)
 assert.doesNotMatch(report,/recommendationGuidance/)
 assert.ok(css.includes('.cabinetSessionPage .sessionDisclosure'))
 assert.ok(css.includes('.sessionDisclosure[open]>summary .disclosureChevron'))
 assert.ok(css.includes('.courseSessionPage'))
 assert.ok(css.includes('.remedyAccordion[open]'))
 assert.ok(css.includes('min-height:44px'))
 assert.match(report,/parsed.toISOString\(\).slice\(0, 10\) !== value/,'invalid ISO dates remain unchanged')
 assert.match(css,/Client consultation report v4/,'approved premium visual design stays active')
 assert.match(css,/@media\(max-width:355px\)/,'320px phones keep the corrected identity strip')
 assert.match(css,/@media print\{/,'print retains compact document layout')
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
