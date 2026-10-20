import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { interpretationSourceHashes, verifyInterpretationSource } from '../scripts/interpretation-source-proof.mjs'
import { parse } from 'acorn'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationBandModel } from '../lib/assessments/interpretation-registry.js'
const definitions = ASSESSMENT_DEFINITIONS.filter(definition => ['hh-current-state', 'hh-weekly-pulse'].includes(definition.key))

test('13 active direct ratings and historical current-state v1 use exact single-question anchors at every attainable score', () => {
  assert.equal(definitions.length, 6); let checked = 0
  for (const definition of definitions) for (let value = 0; value <= 10; value++) {
    const result = scoreAssessment(definition, Object.fromEntries(definition.questions.map(question => [question.id, value])))
    for (const locale of ['en', 'ru']) for (const dimension of result.dimensions) {
      const question = getAssessmentDefinition(definition.key, definition.version, locale).questions.find(item => item.id === dimension.key)
      const model = interpretationBandModel(result, dimension, locale)
      assert.equal(dimension.value, value)
      assert.ok(model.summary.includes(question.anchors[0])); assert.ok(model.summary.includes(question.anchors[1]))
      assert.match(model.summary, locale === 'en' ? /one selected rating.*not a sum or mean/ : /один выбранный ответ.*не сумма или среднее/)
      assert.match(model.summary, locale === 'en' ? /Intermediate numbers.*not clinical categories/ : /Промежуточные числа.*не клинические категории/)
      assert.ok(model.actions[0].includes(`${value} (0–10)`))
      assert.doesNotMatch(model.actions[0], /aggregate|общий балл/)
      assert.equal(model.basis, 'descriptive'); assert.deepEqual(model.bands, []); assert.deepEqual(model.answerBands, [])
      assert.ok(model.actions[1].length > 25)
      checked++
    }
  }
  assert.equal(checked, 792)
})

test('historical current-state uses the same question endpoints and raw scorer semantics; resource-pulse remains distinct', () => {
  for (const locale of ['en', 'ru']) {
    const old = getAssessmentDefinition('hh-current-state', 'v1', locale), current = getAssessmentDefinition('hh-current-state', 'v2', locale)
    assert.equal(old.scoringKey, current.scoringKey); assert.equal(old.scoringVersion, current.scoringVersion)
    const semantics = definition => definition.questions.map(({ id, min, max, anchors, direction }) => ({ id, min, max, anchors, direction }))
    assert.deepEqual(semantics(old), semantics(current))
    const resource = getAssessmentDefinition('hh-resource-pulse', 'v1', locale)
    const result = scoreAssessment(resource, Object.fromEntries(resource.questions.map((question, index) => [question.id, index * 2])))
    const overall = result.dimensions.find(dimension => dimension.key === 'resources.overall')
    assert.equal(overall.value, 5)
    for (const dimension of result.dimensions) {
      const model = interpretationBandModel(result, dimension, locale)
      assert.doesNotMatch(model.summary, /one selected rating|один выбранный ответ/)
    }
    assert.match(interpretationBandModel(result, overall, locale).meaning, locale === 'en' ? /Mean of 6 responses/ : /Среднее 6 ответов/)
  }
})

test('wrong direct-rating identity, signature and noninteger values remain unavailable', () => {
  for (const definition of definitions) {
    const baseline = scoreAssessment(definition, Object.fromEntries(definition.questions.map(question => [question.id, 5])))
    for (const mutate of [result => { result.definitionVersion = 'future' }, result => { result.contentHash = 'forged' }, result => { result.dimensions[0].value = 0.5 }, result => { result.dimensions[0].max = 11 }]) {
      const result = structuredClone(baseline); mutate(result)
      const model = interpretationBandModel(result, result.dimensions[0], 'en')
      assert.equal(model.basis, 'unavailable'); assert.deepEqual(model.actions, [])
      assert.doesNotMatch(model.meaning, /one selected rating/)
    }
  }
})

test('direct-rating prose preserves all eight exact numeric template substitutions', () => {
  const source = readFileSync(new URL('../lib/assessments/interpretation-context.js', import.meta.url), 'utf8')
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }); let count = 0
  function walk(node) {
    if (!node || typeof node !== 'object') return
    if (node.type === 'TemplateLiteral') for (const expression of node.expressions) if (source.slice(expression.start, expression.end) === 'n(dimension.value)') count++
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value)
  }
  walk(ast); assert.equal(count, 8)
})


test('source proof includes every new semantic dependency and rejects missing or mismatched module proof', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const hashes = await interpretationSourceHashes(root)
  const semanticFiles = ['lib/assessments/descriptive-score-position.js', 'lib/assessments/ipip50-guidance.js', 'lib/assessments/interpretation-context.js', 'lib/assessments/interpretation-resolution.js', 'lib/assessments/definitions.js', 'lib/assessments/bach-guidance.js', 'lib/assessments/personality-type-interpretation.js']
  // Full provenance is automatic, including imported definitions and guidance.
  const files = Object.keys(hashes).map(path => {
    const bytes = readFileSync(new URL('../' + path, import.meta.url))
    assert.equal(hashes[path], 'sha256:' + createHash('sha256').update(bytes).digest('hex'))
    return { path, sha: createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex') }
  })
  const sourceCommit = 'a'.repeat(40)
  const options = { root, sourceCommit, executingExporter: fileURLToPath(new URL('../scripts/export-assessment-interpretations.mjs', import.meta.url)), executingStorage: fileURLToPath(new URL('../lib/assessments/interpretation-storage.js', import.meta.url)) }
  assert.equal(await verifyInterpretationSource({ ...options, proofInput: { commit: sourceCommit, files } }), true)
  for (const path of semanticFiles) {
    assert.ok(hashes[path], 'Missing transitive source: ' + path)
    await assert.rejects(verifyInterpretationSource({ ...options, proofInput: { commit: sourceCommit, files: files.filter(file => file.path !== path) } }), /Missing source proof/)
  }
  const tampered = files.map(file => file.path.endsWith('/ipip50-guidance.js') ? { ...file, sha: '0'.repeat(40) } : file)
  await assert.rejects(verifyInterpretationSource({ ...options, proofInput: { commit: sourceCommit, files: tampered } }), /Source blob mismatch/)
})

test('all eight context numeric slots compile to score placeholders without freezing the owner endpoint reading', async () => {
  const url = new URL('../lib/assessments/interpretation-context.js', import.meta.url)
  const source = readFileSync(url, 'utf8'), edits = []
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
  function walk(node) {
    if (!node || typeof node !== 'object') return
    if (node.type === 'TemplateLiteral') for (const expression of node.expressions) if (source.slice(expression.start, expression.end) === 'n(dimension.value)') edits.push({ from: expression.start - 2, to: expression.end + 1 })
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value)
  }
  walk(ast); assert.equal(edits.length, 8)
  let compiledSource = source
  for (const edit of edits.sort((a, b) => b.from - a.from)) compiledSource = compiledSource.slice(0, edit.from) + '{{value}}' + compiledSource.slice(edit.to)
  compiledSource = compiledSource.replace(/from '(\.\/[^']+)'/g, (_, relative) => `from '${new URL(relative, url).href}'`)
  const compiled = await import('data:text/javascript;base64,' + Buffer.from(compiledSource).toString('base64'))
  const original = await import(url.href)
  let checked = 0
  for (const definition of definitions) for (let value = 0; value <= 10; value++) {
    const result = scoreAssessment(definition, Object.fromEntries(definition.questions.map(question => [question.id, value])))
    for (const dimension of result.dimensions) for (const locale of ['en', 'ru']) {
      const template = compiled.descriptiveInterpretation(result, dimension, definition, null, locale)
      const rendered = JSON.parse(JSON.stringify(template).replaceAll('{{value}}', String(dimension.value)))
      assert.deepEqual(rendered, original.descriptiveInterpretation(result, dimension, definition, null, locale))
      assert.ok(template.summary.includes('{{value}}'))
      checked++
    }
  }
  assert.equal(checked, 792)
  for (const key of ['k10', 'cbi-personal']) {
    const definition = getAssessmentDefinition(key, 'v1', 'en')
    for (const value of [definition.answerScale.min, definition.answerScale.max]) {
      const result = scoreAssessment(definition, Object.fromEntries(definition.questions.map(question => [question.id, value])))
      for (const dimension of result.dimensions) for (const locale of ['en', 'ru']) {
        const template = compiled.descriptiveInterpretation(result, dimension, definition, null, locale)
        assert.equal(template.responseAnchors, null)
        assert.ok(template.summary.includes('{{value}}'))
        const rendered = JSON.parse(JSON.stringify(template).replaceAll('{{value}}', String(dimension.value)))
        assert.deepEqual(rendered, original.descriptiveInterpretation(result, dimension, definition, null, locale))
      }
    }
  }
})

test('six resource-pulse statement ratings use exact question text while only the overall score is a mean', () => {
  let checked = 0
  for (const instrumentLocale of ['en', 'ru']) {
    const definition = getAssessmentDefinition('hh-resource-pulse', 'v1', instrumentLocale)
    const singles = definition.scoring.dimensions.filter(scale => scale.method === 'value')
    assert.equal(singles.length, 6)
    for (let value = 0; value <= 10; value++) {
      const result = scoreAssessment(definition, Object.fromEntries(definition.questions.map(question => [question.id, value])))
      for (const locale of ['en', 'ru']) {
        const localized = getAssessmentDefinition(definition.key, definition.version, locale)
        for (const scale of singles) {
          assert.deepEqual(scale.items, [scale.key])
          const dimension = result.dimensions.find(item => item.key === scale.key)
          const model = interpretationBandModel(result, dimension, locale)
          const question = localized.questions.find(item => item.id === scale.key)
          assert.ok(model.summary.includes(question.text))
          assert.match(model.summary, locale === 'en' ? /rating of one statement/ : /оценка одного утверждения/)
          assert.match(model.summary, locale === 'en' ? /single response, not a sum or mean/ : /один ответ, а не сумма или среднее/)
          assert.doesNotMatch(model.summary, /an aggregate can hide|общий показатель может/)
          assert.doesNotMatch(model.actions[0], /aggregate|общий балл/)
          assert.equal(model.responseAnchors, null, 'No invented endpoints for a question without anchors')
          assert.ok(model.summary.includes(String(value)))
          assert.deepEqual(model.bands, []); assert.deepEqual(model.answerBands, [])
          const rejected = interpretationBandModel({ ...result, contentHash: 'forged' }, dimension, locale)
          assert.equal(rejected.basis, 'unavailable'); assert.deepEqual(rejected.actions, [])
          checked++
        }
        const overall = result.dimensions.find(item => item.key === 'resources.overall')
        const aggregate = interpretationBandModel(result, overall, locale)
        assert.equal(overall.value, value)
        assert.match(aggregate.meaning, locale === 'en' ? /Mean of 6 responses/ : /Среднее 6 ответов/)
        assert.doesNotMatch(aggregate.summary, /rating of one statement|оценка одного утверждения/)
      }
    }
  }
  assert.equal(checked, 264)
})
