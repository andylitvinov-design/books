import crypto from 'node:crypto'

export const MAX_COMPACT_SQL_BYTES = 12 * 1024 * 1024
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'
// E strings make escaping independent of the caller's session settings.
export const sqlLiteral = value => "E'" + String(value).replaceAll('\\', '\\\\').replaceAll("'", "''") + "'"

export function restoreCanonicalFragments(dictionary, parts) {
  if (!Array.isArray(dictionary) || dictionary.length > 100000 || !Array.from({ length: dictionary.length }, (_, index) => Object.hasOwn(dictionary, index) && typeof dictionary[index] === 'string').every(Boolean) || new Set(dictionary).size !== dictionary.length) throw Error('Invalid compact dictionary')
  if (!Array.isArray(parts) || parts.length === 0 || parts.length > 100000 || !Array.from({ length: parts.length }, (_, index) => Object.hasOwn(parts, index)).every(Boolean)) throw Error('Invalid compact fragments')
  return parts.map(part => {
    if (typeof part === 'string') return part
    if (!Number.isSafeInteger(part) || part < 0 || part >= dictionary.length || !Object.hasOwn(dictionary, part)) throw Error('Missing compact dictionary index')
    return dictionary[part]
  }).join('')
}

export function encodeCanonicalDictionary(rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 10000) throw Error('Invalid compact row count')
  const counts = new Map(), identities = new Set()
  function collect(value) {
    const text = canonical(value)
    if (typeof text !== 'string') throw Error('Unsupported JSON value')
    if (text.length >= 64) counts.set(text, (counts.get(text) || 0) + 1)
    if (Array.isArray(value)) value.forEach(collect)
    else if (value && typeof value === 'object') Object.values(value).forEach(collect)
  }
  for (const row of rows) {
    const identity = JSON.stringify([row.assessment_version_id, row.interpretation_version, row.report_locale])
    if (identities.has(identity)) throw Error('Duplicate compact row identity')
    identities.add(identity)
    if (canonical(row.payload) !== row.payload_canonical || row.payload_sha256 !== 'sha256:' + crypto.createHash('sha256').update(row.payload_canonical).digest('hex')) throw Error('Compact input canonical/hash mismatch')
    collect(row.payload)
  }
  const dictionary = [], indices = new Map()
  function encode(value, parts) {
    const text = canonical(value)
    if ((counts.get(text) || 0) > 1 && text.length >= 64) {
      if (!indices.has(text)) { indices.set(text, dictionary.length); dictionary.push(text) }
      parts.push(indices.get(text)); return
    }
    const append = text => { if (typeof parts.at(-1) === 'string') parts[parts.length - 1] += text; else parts.push(text) }
    if (Array.isArray(value)) { append('['); value.forEach((item, index) => { if (index) append(','); encode(item, parts) }); append(']') }
    else if (value && typeof value === 'object') { append('{'); Object.keys(value).sort().forEach((key, index) => { if (index) append(','); append(JSON.stringify(key) + ':'); encode(value[key], parts) }); append('}') }
    else append(text)
  }
  const encoded = rows.map(row => { const parts = []; encode(row.payload, parts); return { hash: row.payload_sha256, parts } })
  for (let index = 0; index < rows.length; index++) if (restoreCanonicalFragments(dictionary, encoded[index].parts) !== rows[index].payload_canonical) throw Error('Compact roundtrip mismatch')
  return { dictionary, encoded }
}

export function compactInterpretationInsert(rows) {
  const { dictionary, encoded } = encodeCanonicalDictionary(rows)
  const sql = `WITH dictionary AS MATERIALIZED (SELECT ${sqlLiteral(JSON.stringify(dictionary))}::jsonb AS parts),
encoded(expected_hash, fragments) AS (VALUES
${encoded.map(row => '(' + sqlLiteral(row.hash) + ',' + sqlLiteral(JSON.stringify(row.parts)) + '::jsonb)').join(',\n')}
), restored AS MATERIALIZED (
 SELECT e.expected_hash, (
  SELECT string_agg(CASE
   WHEN jsonb_typeof(f.value) = 'string' THEN f.value #>> '{}'
   WHEN jsonb_typeof(f.value) = 'number' AND f.value::text ~ '^(0|[1-9][0-9]{0,5})$' THEN
    CASE WHEN (f.value::text)::int < jsonb_array_length(d.parts) AND jsonb_typeof(d.parts->((f.value::text)::int)) = 'string'
      THEN d.parts->>((f.value::text)::int)
      ELSE (('invalid dictionary index: ' || f.value::text)::int)::text END
   ELSE (('invalid fragment: ' || f.value::text)::int)::text
  END, '' ORDER BY f.ordinality)
  FROM jsonb_array_elements(e.fragments) WITH ORDINALITY AS f(value, ordinality)
 ) AS payload_canonical
 FROM encoded e CROSS JOIN dictionary d
), decoded AS (SELECT expected_hash, payload_canonical, payload_canonical::jsonb AS payload FROM restored)
INSERT INTO app.assessment_interpretation_versions
 (assessment_version_id,interpretation_version,report_locale,definition_content_hash,provenance,source_commit,rules_engine_version,payload_sha256,payload_canonical,payload)
SELECT (payload->'provenance'->>'assessmentVersionId')::uuid, payload->>'interpretationVersion', payload->>'reportLocale',
 payload->'provenance'->>'contentHash', payload->'provenance', payload->>'sourceCommit', payload->>'rulesEngineVersion',
 expected_hash, payload_canonical, payload FROM decoded;`
  if (Buffer.byteLength(sql) > MAX_COMPACT_SQL_BYTES) throw Error('Compact SQL exceeds reviewed transport bound')
  return { sql, dictionaryEntries: dictionary.length, recordCount: encoded.length }
}
