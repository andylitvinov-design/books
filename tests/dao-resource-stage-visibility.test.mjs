import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { DAO_RESOURCE_STAGES, daoResourceStage } from '../lib/consultations/dao-resource-stage.js'
import { DAO_STAGE_AUTHOR_CONTENT, daoStageAuthorContent } from '../lib/consultations/dao-stage-author-content.js'
import { createPrescription, getClientPrescription, updatePrescription } from '../lib/prescriptions/service.js'

const base = {
  patientName: 'A sample client', practitionerName: 'Test practitioner',
  dateIssued: '2026-10-18', languagePreference: 'ru', status: 'active',
  recommendationType: 'bach', items: [{ itemType: 'bach', displayNameOverride: 'Test flower' }],
  daoResourceScore: 3.8,
}

test('complete original Russian notes are connected to every canonical Dao stage', () => {
  assert.equal(DAO_RESOURCE_STAGES.length, 18)
  for (const stage of DAO_RESOURCE_STAGES) {
    const entry = daoStageAuthorContent(stage.level)
    assert.ok(entry, 'source for stage ' + stage.level)
    assert.ok(entry.paragraphs.length > 0, 'author paragraphs for stage ' + stage.level)
    assert.ok(entry.photo.startsWith('/'), 'same-origin image for stage ' + stage.level)
    assert.ok(entry.sourceTitle, 'source heading for stage ' + stage.level)
  }
  assert.equal(Object.keys(DAO_STAGE_AUTHOR_CONTENT).length, 18)
  assert.equal(daoStageAuthorContent(99), null)
  assert.equal(daoStageAuthorContent('unexpected'), null)
  const fifth = daoStageAuthorContent(daoResourceStage(3.8).level)
  assert.ok(fifth.paragraphs.some(text => text.includes('бережный обмен с миром')))
  assert.ok(fifth.cards.find(card => card.title === 'Маркеры перехода'))
  assert.equal(fifth.photo, '/document-assets/lighthouse.png')
})

test('Daoist parables come only from the owner’s actual seven documented stories', () => {
  const stagesWithSourceParables = [2, 3, 4, 5, 6, 7, 8]
  const actual = Object.keys(DAO_STAGE_AUTHOR_CONTENT)
    .map(Number).filter(level => Boolean(daoStageAuthorContent(level).parable))
  assert.deepEqual(actual, stagesWithSourceParables)
  const fifth = daoStageAuthorContent(5).parable
  assert.equal(fifth.title, 'Даосская притча о ростке перед восходом')
  assert.ok(fifth.body.includes('Ты — сам луч восхода'))
  for (const level of [1, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]) {
    assert.equal(daoStageAuthorContent(level).parable, null, 'no invented parable at ' + level)
  }
})

test('publishing checkbox can be turned off without erasing owner score or stage', () => {
  const initiallyPublished = createPrescription(base)
  assert.equal(initiallyPublished.daoResourcePublished, true)
  assert.equal(getClientPrescription(initiallyPublished, 'ru').daoResourceScore, 3.8)

  const hidden = updatePrescription(initiallyPublished, { ...base, daoResourcePublished: false })
  assert.equal(hidden.daoResourcePublished, false)
  assert.equal(hidden.daoResourceScore, 3.8)
  assert.equal(daoResourceStage(hidden.daoResourceScore).level, 5)
  assert.equal(getClientPrescription(hidden, 'ru').daoResourceScore, null)
  assert.equal(getClientPrescription(hidden, 'ru').daoResourcePublished, false)

  const retained = updatePrescription(hidden, Object.fromEntries(
    Object.entries(base).filter(([key]) => key !== 'daoResourceScore'),
  ))
  assert.equal(retained.daoResourceScore, 3.8)
  assert.equal(retained.daoResourcePublished, false)

  const shown = updatePrescription(hidden, { ...base, daoResourcePublished: true })
  assert.equal(shown.daoResourceScore, 3.8)
  assert.equal(getClientPrescription(shown, 'ru').daoResourceScore, 3.8)
})

test('HTML source puts optional stage after appendix and immediately before signature', async () => {
  const source = await readFile('components/prescription-document.jsx', 'utf8')
  const stagePosition = source.lastIndexOf('<DaoStageDisclosure score={document.daoResourceScore}')
  const signaturePosition = source.lastIndexOf('<DocumentSignature date={document.dateIssued}')
  const appendixPosition = source.indexOf('canonical-remedy-profiles')
  assert.ok(stagePosition > appendixPosition)
  assert.ok(stagePosition < signaturePosition)
  assert.match(source, /published=\{document\.daoResourcePublished !== false\}/)
})

test('editor, preview and report hide stages when unchecked, retaining source on PDF', async () => {
  const file = async path => readFile(path, 'utf8')
  const [field, form, action, preview, service, pdf, session] = await Promise.all([
    file('components/dao-resource-stage.jsx'),
    file('components/consultation-form.jsx'),
    file('app/admin/consultations/actions.js'),
    file('app/admin/api/consultations/preview/route.js'),
    file('lib/consultations/service.js'),
    file('lib/prescriptions/pdf.js'),
    file('components/client-session-page.jsx'),
  ])
  assert.match(field, /name="daoResourcePublished"/)
  assert.match(form, /onPublishedChange=\{setDaoResourcePublished\}/)
  assert.match(action, /data\.daoResourcePublished = formData\.get/)
  assert.match(preview, /input\.daoResourcePublished = form\.get/)
  assert.match(service, /daoResourcePublished: input\.daoResourcePublished !== false/)
  assert.equal((pdf.match(/daoResourceStage\(document\.daoResourceScore,locale\)/g) ?? []).length, 2)
  assert.equal((pdf.match(/document\.daoResourcePublished === false \? null/g) ?? []).length, 2)
  assert.match(pdf, /import \{ daoStageAuthorContent \}/)
  assert.match(session, /published=\{recommendation\?\.daoResourcePublished !== false\}/)
  assert.match(field, /loading="lazy"/)
  assert.match(field, /<details className=\{styles\.parableDisclosure\}>/)
  assert.doesNotMatch(field, /<details className=\{styles\.disclosure\} open/)
})
