import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {
  assertSavedLocaleAssignment, assertProtectedConsultationForm,
  assertOptionalClinicalFields, assertStudioDeliveryOrder, assertPrivateReportRedirect,
} from './helpers/report-editor-contracts.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const form=read('components/consultation-form.jsx')
const studio=read('components/admin-session-studio.jsx')
const route=read('app/admin/reports/new/page.js')
const guest=read('app/[locale]/client/session/[shareSelector]/page.js')
const pdf=read('app/api/client-session-viewer/[selector]/pdf/route.js')
function replace(source,before,after){
  assert.ok(source.includes(before),'mutation target must exist: '+before)
  return source.replace(before,after)
}
function rejects(check,source,mutations){
  for(const [label,before,after] of mutations){
    const changed=replace(source,before,after)
    assert.throws(()=>check(changed),{name:'AssertionError'},label)
  }
}

test('exact owner source satisfies the current editor, language and delivery contracts',async()=>{
  assertSavedLocaleAssignment(guest,'locale');assertSavedLocaleAssignment(pdf,'requestedLocale')
  assertProtectedConsultationForm(form);assertOptionalClinicalFields(form)
  assertStudioDeliveryOrder(studio);await assertPrivateReportRedirect(route)
})

test('saved-language contract rejects removed resolution, wrong record/fallback and later overwrite',()=>{
  rejects(source=>assertSavedLocaleAssignment(source,'locale'),guest,[
    ['missing resolver','reportLocale=resolveSavedReportLocale(record,locale)','reportLocale=locale'],
    ['wrong record','resolveSavedReportLocale(record,locale)','resolveSavedReportLocale(otherRecord,locale)'],
    ['wrong fallback','resolveSavedReportLocale(record,locale)','resolveSavedReportLocale(record,requestedLocale)'],
    ['hardcoded locale','reportLocale=resolveSavedReportLocale(record,locale)',"reportLocale='en'"],
    ['overwritten saved locale','reportLocale=resolveSavedReportLocale(record,locale)','reportLocale=resolveSavedReportLocale(record,locale); reportLocale=locale'],
  ])
  rejects(source=>assertSavedLocaleAssignment(source,'requestedLocale'),pdf,[
    ['missing PDF resolver','resolveSavedReportLocale(record,requestedLocale)','requestedLocale'],
    ['wrong PDF record','resolveSavedReportLocale(record,requestedLocale)','resolveSavedReportLocale(otherRecord,requestedLocale)'],
    ['hardcoded PDF fallback','resolveSavedReportLocale(record,requestedLocale)',"resolveSavedReportLocale(record,'en')"],
  ])
})

test('protected-form contract rejects wrong action binding, missing identity and bypassed submit guards',()=>{
  rejects(assertProtectedConsultationForm,form,[
    ['wrong action','action={submit}','action={unprotectedAction}'],
    ['wrong binding','useActionState(action, {})','useActionState(unprotectedAction, {})'],
    ['missing identity','id="consultation-report-form"','id="unrelated-form"'],
    ['missing submit handler','onSubmit={(event) => {','onChange={(event) => {'],
    ['no-document bypass','if (!includeRecommendation && !includeInvoice)','if (false)'],
    ['invalid row bypass','includeRecommendation && !validateConsultationRows(items)','false'],
    ['invalid progress bypass','includeRecommendation && progressScoresInvalid','false'],
    ['invalid Dao bypass','includeRecommendation && daoScoreInvalid','false'],
    ['wrong progress message','setError(labels.progressError)','setError(labels.chooseError)'],
    ['progress leaks into invoice-only save','includeRecommendation && progressScoresInvalid','progressScoresInvalid'],
    ['missing before parser','parseReportProgressScore(progressBefore);',''],
    ['missing after parser','parseReportProgressScore(progressAfter);',''],
    ['invalid parser result accepted','parseReportProgressScore(progressAfter); return false } catch { return true }','parseReportProgressScore(progressAfter); return false } catch { return false }'],
    ['no preventDefault','event.preventDefault()','void event'],
  ])
})

test('optional clinical details reject an open block, missing editor, invented defaults and wrong update key',()=>{
  rejects(assertOptionalClinicalFields,form,[
    ['open by default','<details className="consultation-advanced-remedy">','<details className="consultation-advanced-remedy" open>'],
    ['missing saved fields','consultationClinicalFields.map(([field, label])','otherFields.map(([field, label])'],
    ['invented default',"value={item[field] ?? ''}","value={item[field] ?? 'suggested dose'}"],
    ['lost change handler','onChange={(event) => update(index, { [field]: event.target.value })}','onChange={() => {}}'],
    ['wrong saved key','{ [field]: event.target.value }','{ otherField: event.target.value }'],
    ['wrong notes value',"value={item.notes ?? ''}","value={item.notes ?? 'default note'}"],
  ])
})

test('delivery order rejects missing, duplicated or reordered private/shared/publication blocks',()=>{
  const privateLabel="ru?'Персональные записи консультации':'Private session recordings'"
  const sharedLabel="ru?'Общие материалы из библиотеки':'Shared library materials'"
  rejects(assertStudioDeliveryOrder,studio,[
    ['missing report','id="session-attached-report"','id="other-report"'],
    ['missing publication','id="session-publication"','id="other-publication"'],
    ['missing private identity',privateLabel,"ru?'Другие записи':'Other recordings'"],
    ['missing shared picker','<SessionMaterialPicker ','<OtherMaterialPicker '],
    ['duplicate publication','<section className={styles.editorCard} id="session-publication"','<section id="session-publication"/><section className={styles.editorCard} id="session-publication"'],
  ])
  const swapped=replace(replace(studio,privateLabel,'SWAP_PRIVATE'),sharedLabel,privateLabel).replace('SWAP_PRIVATE',sharedLabel)
  assert.throws(()=>assertStudioDeliveryOrder(swapped),{name:'AssertionError'},'shared Materials must not move before private voice')
})

test('report redirect rejects missing authorization, invalid preselection and dropped valid client',async()=>{
  for(const [label,before,after] of [
    ['missing authorization',"if (!await requireAdminRequest()) redirect('/admin/login')",''],
    ['always authorized','!await requireAdminRequest()','false'],
    ['invalid client accepted','validUuid(clientId)','Boolean(clientId)'],
    ['valid client dropped','validUuid(clientId)','false'],
    ['wrong destination','/admin/consultations/new','/admin/clients/new'],
  ]){
    await assert.rejects(assertPrivateReportRedirect(replace(route,before,after)),{name:'AssertionError'},label)
  }
})
