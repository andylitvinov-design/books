import assert from 'node:assert/strict'
import test from 'node:test'
import { LAB_ANALYTES, LAB_EDUCATIONAL_INTERVALS, LAB_REFERENCE_SOURCES, LAB_CATALOG_VERSION, LAB_CLINICAL_APPROVAL } from '../lib/labs/reference-catalog.mjs'
import { findLabAnalyte, groupLabMarkers, ageAtSample, educationalLabReference, normalizeAnalyteName } from '../lib/labs/reference-engine.mjs'
import { labRangeStatus } from '../lib/labs/analysis.mjs'

const context = (name, birthDate, sampleDate, sex='male', unit='g/dL', specimen='blood') =>
  ({name,birthDate,sampleDate,sex,unit,specimen})
test('catalog is versioned, sourced, multilingual and explicitly not clinically approved', () => {
  assert.equal(LAB_CATALOG_VERSION,'2026-10-20-draft-1')
  assert.equal(LAB_CLINICAL_APPROVAL,false)
  assert.ok(LAB_ANALYTES.length >= 60)
  assert.ok(LAB_EDUCATIONAL_INTERVALS.length >= 50)
  const ids = new Set(LAB_ANALYTES.map(row=>row.id))
  assert.equal(ids.size,LAB_ANALYTES.length)
  assert.ok(new Set(LAB_ANALYTES.map(row=>row.group)).size>=10)
  for(const row of LAB_ANALYTES){
    assert.ok(row.names.en && row.names.ru && row.names.es && row.aliases.length>=1,row.id)
    assert.ok(row.specimen && row.unit,row.id)
  }
  for (const interval of LAB_EDUCATIONAL_INTERVALS){
    assert.ok(ids.has(interval.analyteId))
    assert.ok(LAB_REFERENCE_SOURCES[interval.sourceId])
    assert.ok(Number.isFinite(interval.low)&&Number.isFinite(interval.high)&&interval.low<interval.high)
    assert.ok(interval.maxMonthsExclusive===null||interval.maxMonthsExclusive>interval.minMonths)
  }
  for (const source of Object.values(LAB_REFERENCE_SOURCES)){
    assert.match(source.url,/^https:\/\/www\.healthcare\.uiowa\.edu\/path_handbook\//)
    assert.equal(source.scope,'laboratory-specific')
  }
})
test('aliases exact-match in three languages; ambiguous abbreviations and fuzzy names never guessed', () => {
  for (const [name,id] of [
    ['Hemoglobin','hemoglobin'],['HGB','hemoglobin'],['Гемоглобин','hemoglobin'],
    ['Hemoglobina','hemoglobin'],['Leucocitos','wbc'],['Лейкоциты','wbc'],
    ['ЩФ','alp'],['Fosfatasa alcalina','alp'],['HbA1c','hba1c'],
    ['Гликированный гемоглобин','hba1c'],['Гемоглобин Hb','hemoglobin'],
    ['Удельный вес мочи','urine_specific_gravity'],
  ]) assert.equal(findLabAnalyte(name).analyteId,id,name)
  assert.equal(findLabAnalyte('гЕмОгЛоБиН').analyteId,'hemoglobin')
  assert.equal(normalizeAnalyteName('Гемоглобин'),'гемоглобин')
  assert.equal(findLabAnalyte('Hgb? Needs checking').status,'unknown')
  assert.equal(findLabAnalyte('K').status,'unknown')
  assert.equal(findLabAnalyte('RBC urine').analyteId,'urine_rbc')
  assert.equal(findLabAnalyte('RBC').analyteId,'rbc')
})
test('all catalog aliases resolve to exactly one analyte (no silent name collision)', () => {
  for (const marker of LAB_ANALYTES) for (const name of [marker.names.en,marker.names.ru,marker.names.es,...marker.aliases]) {
    const hit=findLabAnalyte(name)
    if (normalizeAnalyteName(name).length<2) continue
    assert.equal(hit.status,'matched',name)
    assert.equal(hit.analyteId,marker.id,name)
  }
})
test('DOB stays local and age at sample uses calendar months plus exact neonatal days', () => {
  assert.deepEqual(ageAtSample('2026-01-01','2026-01-31'),{days:30,months:0})
  assert.deepEqual(ageAtSample('2026-01-01','2026-02-01'),{days:31,months:1})
  assert.deepEqual(ageAtSample('2008-10-20','2026-10-20'),{days:6574,months:216})
  assert.equal(ageAtSample('2026-02-30','2026-03-01'),null)
  assert.equal(ageAtSample('2026-10-20','2026-01-20'),null)
})
test('hemoglobin provenance, sex and age: source-specific examples, never patient classification', () => {
  const newborn=educationalLabReference(context('HGB','2026-01-01','2026-01-15'))
  assert.equal(newborn.status,'educational-example')
  assert.equal(newborn.low,13.4)
  assert.equal(newborn.high,19.9)
  assert.equal(newborn.mayClassifyPatient,false)
  const monthTwo=educationalLabReference(context('Hemoglobina','2026-01-01','2026-03-01'))
  assert.deepEqual([monthTwo.low,monthTwo.high],[9,14.1])
  const adult=educationalLabReference(context('Гемоглобин','1988-01-01','2026-10-20','male','g/L'))
  assert.deepEqual([adult.low,adult.high],[132,177])
  assert.equal(adult.sourceId,'uiowa-hgb')
  const teen=educationalLabReference(context('HGB','2012-01-01','2026-10-20','female'))
  assert.deepEqual([teen.low,teen.high],[11.9,15])
  const adultFemale=educationalLabReference(context('HGB','1988-01-01','2026-10-20','female'))
  assert.deepEqual([adultFemale.low,adultFemale.high],[11.9,15.5])
})
test('Iowa WBC, RBC, MCV and ALP pediatric/adult intervals respect age and sex', () => {
  const wbc=educationalLabReference(context('WBC','2026-01-01','2026-01-15','unspecified','10^9/L'))
  assert.deepEqual([wbc.low,wbc.high],[9,30])
  const olderWbc=educationalLabReference(context('Leucocitos','1980-01-01','2026-01-01','unspecified','k/mm3'))
  assert.deepEqual([olderWbc.low,olderWbc.high],[3.7,10.5])
  const rbc=educationalLabReference(context('RBC','2009-01-01','2026-10-20','female','10^12/L'))
  assert.deepEqual([rbc.low,rbc.high],[3.9,5.1])
  const mcv=educationalLabReference(context('MCV','2016-01-01','2026-10-20','unspecified','fL'))
  assert.deepEqual([mcv.low,mcv.high],[77,90])
  const alpTeenM=educationalLabReference(context('ALP','2012-01-01','2026-10-20','male','U/L','plasma'))
  const alpTeenF=educationalLabReference(context('Щелочная фосфатаза','2012-01-01','2026-10-20','female','U/L','plasma'))
  assert.deepEqual([alpTeenM.low,alpTeenM.high],[116,468])
  assert.deepEqual([alpTeenF.low,alpTeenF.high],[57,254])
  const alpAdult=educationalLabReference(context('ALP','1970-01-01','2026-10-20','female','U/L','plasma'))
  assert.deepEqual([alpAdult.low,alpAdult.high],[35,104])
})
test('fail closed on absent context, unsupported assays, prematurity or pregnancy', () => {
  const adult=context('HGB','1980-01-01','2026-10-20')
  assert.equal(educationalLabReference({ ...adult, sex:'unspecified' }).reason,'age-or-sex-range-not-available')
  assert.equal(educationalLabReference({ ...adult, specimen:'serum' }).reason,'specimen-unverified')
  assert.equal(educationalLabReference({ ...adult, unit:'mmol/L' }).reason,'unit-unverified')
  assert.equal(educationalLabReference({ ...adult, pregnant:true }).reason,'pregnancy-requires-lab-context')
  assert.equal(educationalLabReference({name:'HGB',sex:'male',unit:'g/dL',specimen:'blood'}).reason,'age-required')
  assert.equal(educationalLabReference({...context('HGB','2026-01-01','2026-01-05'),preterm:true}).reason,'preterm-infant-requires-lab-context')
  assert.equal(educationalLabReference(context('Ferritin','1988-01-01','2026-10-20','male','ng/mL','serum')).reason,'no-reviewed-source-example')
})
test('recognition can group data, but must not invent lab ranges or classify a number', () => {
  const output=groupLabMarkers([{name:'HGB',value:3},{name:'Ferritina',value:4},{name:'Unknown analysis',value:9}])
  assert.equal(output.recognized.length,2)
  assert.equal(output.needsReview.length,1)
  assert.equal(output.groups.cbc[0].analyteId,'hemoglobin')
  const guessed=educationalLabReference(context('HGB','1980-01-01','2026-10-20'))
  assert.equal(guessed.mayClassifyPatient,false)
  // The existing patient-specific engine remains strictly tied to the lab report's own bounds.
  assert.equal(labRangeStatus({name:'HGB',value:3,unit:'g/dL',lower:null,upper:null}),'unrated')
  assert.equal(labRangeStatus({name:'HGB',value:3,unit:'g/dL',lower:11,upper:17}),'low')
})
