import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../supabase/migrations/20261023183000_hh_coaching_model_catalog_schema.sql', import.meta.url), 'utf8');
const seed = readFileSync(new URL('../supabase/migrations/20261023183100_hh_coaching_model_catalog_seed.sql', import.meta.url), 'utf8');
const relevanceGuard = readFileSync(new URL('../supabase/migrations/20261023183200_hh_coaching_relevance_guard.sql', import.meta.url), 'utf8');

const countRows = (name) => {
  const marker = `INSERT INTO app_private.${name} (`;
  const section = seed.split(marker)[1]?.split('ON CONFLICT DO NOTHING')[0] || '';
  return [...section.matchAll(/^  \(/gm)].length;
};

test('coaching reference library contains exactly the reviewed content in stable v1 keys', () => {
  assert.equal(countRows('coaching_models'), 8);
  assert.equal(countRows('coaching_schemes'), 10);
  assert.equal(countRows('coaching_steps'), 39);
  assert.equal(countRows('coaching_questions'), 39);
  assert.equal(countRows('coaching_answer_sets'), 13);
  for (const key of ['grow_v1','tgrow_v1','oskar_v1','clear_v1','fuel_v1',
    'solution_focus_v1','woop_v1','appreciative_5d_v1']) {
    assert.match(seed, new RegExp(`'${key}'`));
  }
  assert.match(seed,/required_custom_plan/);
  assert.match(seed,/woop_habit_v1[\s\S]*?true/);
});

test('all five catalog tables are private, backend-read-only and have no unprotected direct grants', () => {
  for (const table of ['coaching_models','coaching_schemes','coaching_steps',
    'coaching_questions','coaching_answer_sets']) {
    assert.match(schema,new RegExp(`CREATE TABLE IF NOT EXISTS app_private\\.${table}\\b`));
    assert.match(schema,new RegExp(`'${table}'`));
  }
  assert.match(schema,/ENABLE ROW LEVEL SECURITY/);
  assert.match(schema,/REVOKE ALL ON TABLE app_private\.%I FROM PUBLIC, anon, authenticated/);
  assert.match(schema,/GRANT SELECT ON TABLE app_private\.%I TO hh_app_backend/);
  assert.doesNotMatch(schema,/GRANT (?:SELECT|ALL).*? TO (?:anon|authenticated)/);
  assert.match(schema,/SECURITY INVOKER/);
  assert.match(schema,/REVOKE ALL ON FUNCTION app_private\.recommend_coaching_schemes/);
});

test('reference questions and answer sets are localized and coach-owned rather than client records', () => {
  for (const table of ['coaching_models','coaching_schemes','coaching_steps','coaching_questions']) {
    assert.match(schema,new RegExp(`CREATE TABLE IF NOT EXISTS app_private\\.${table}`));
  }
  assert.match(schema,/name_i18n jsonb NOT NULL CHECK \(name_i18n \?& ARRAY\['en','ru','es'\]\)/);
  assert.match(schema,/prompt_i18n jsonb NOT NULL CHECK \(prompt_i18n \?& ARRAY\['en','ru','es'\]\)/);
  assert.match(seed,/jsonb_array_elements\(a\.choices\)/);
  assertReferenceOnlySchema(schema);
  assert.match(schema,/question_key.*PRIMARY KEY/);
  assert.match(schema,/FOREIGN KEY \(model_key,step_key\)/);
});

test('a recommendation explicitly requires client-chosen topics and cannot depend on test scores', () => {
  assert.match(schema,/p_topics text\[\]/);
  assert.match(schema,/p_minutes integer/);
  assert.match(schema,/p_style text/);
  assert.match(schema,/cardinality\(c\.matched\)\*10/);
  assert.match(schema,/ORDER BY match_score DESC/);
  assert.doesNotMatch(schema,/assessment_results|crm_contacts|profile_snapshots/);
  assert.match(relevanceGuard,/WHERE cardinality\(c\.matched\)>0/);
  assert.match(relevanceGuard,/CREATE OR REPLACE FUNCTION app_private\.recommend_coaching_schemes/);
});

// Inspect executable SQL identifiers and actual CREATE TABLE column shapes, not
// policy commentary (which deliberately mentions the excluded transcripts).
const catalogColumns = {
  coaching_models: ['model_key','name_i18n','focus_i18n','limitation_i18n','source_title',
    'source_url','source_kind','topic_tags','editorial_status','created_at'],
  coaching_schemes: ['scheme_key','model_key','name_i18n','result_i18n','style',
    'estimated_minutes','topic_tags','step_keys','required_custom_plan','published','created_at'],
  coaching_steps: ['model_key','step_key','model_order','title_i18n','emphasis_i18n','key_question_i18n'],
  coaching_answer_sets: ['answer_set_key','choices','created_at'],
  coaching_questions: ['question_key','model_key','step_key','position','prompt_i18n',
    'answer_type','answer_set_key','core','required','interaction_note'],
};
function sqlTokens(sql) {
  const tokens = [];
  for (let i = 0; i < sql.length;) {
    const tail = sql.slice(i);
    const whitespace = tail.match(/^\s+/);
    if (whitespace) { i += whitespace[0].length; continue; }
    if (tail.startsWith('--')) { const end = sql.indexOf('\n', i); i = end < 0 ? sql.length : end; continue; }
    if (tail.startsWith('/*')) {
      let depth = 1; i += 2;
      while (depth && i < sql.length) {
        if (sql.startsWith('/*', i)) { depth++; i += 2; }
        else if (sql.startsWith('*/', i)) { depth--; i += 2; }
        else i++;
      }
      assert.equal(depth, 0, 'SQL block comment must close'); continue;
    }
    if (tail[0] === "'") {
      const literal = tail.match(/^'(?:[^']|'')*'/);
      assert.ok(literal, 'SQL string must close');
      // Dynamic DDL must not hide private columns in an EXECUTE/format string.
      const value = literal[0].slice(1, -1).replaceAll("''", "'");
      if (/\b(?:create|alter)\s+table\b/i.test(value)) tokens.push(...sqlTokens(value));
      i += literal[0].length; continue;
    }
    if (tail[0] === '"') {
      const quoted = tail.match(/^"(?:[^"]|"")*"/);
      assert.ok(quoted, 'SQL identifier must close');
      tokens.push(quoted[0].slice(1, -1).replaceAll('""', '"').toLowerCase());
      i += quoted[0].length; continue;
    }
    const dollar = tail.match(/^\$(?:[a-z_][a-z_0-9]*)?\$/i);
    if (dollar) {
      const start = i + dollar[0].length, end = sql.indexOf(dollar[0], start);
      assert.ok(end >= start, 'SQL function body must close');
      tokens.push(...sqlTokens(sql.slice(start, end))); i = end + dollar[0].length; continue;
    }
    const identifier = tail.match(/^[a-z_][a-z_0-9$]*/i);
    if (identifier) { tokens.push(identifier[0].toLowerCase()); i += identifier[0].length; continue; }
    tokens.push(sql[i++]);
  }
  return tokens;
}
function assertReferenceOnlySchema(sql) {
  const tokens = sqlTokens(sql);
  for (const token of tokens) assert.doesNotMatch(token,
    /client_id|account_id|transcript|payload_ciphertext|health_score/, 'Private SQL identifier: ' + token);
  const tables = {};
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] !== 'create' || tokens[i + 1] !== 'table') continue;
    let at = i + 2;
    if (tokens.slice(at, at + 3).join(' ') === 'if not exists') at += 3;
    assert.equal(tokens[at++], 'app_private', 'Catalog remains in its private schema');
    assert.equal(tokens[at++], '.');
    const name = tokens[at++];
    assert.ok(Object.hasOwn(catalogColumns, name), 'Unexpected reference table: ' + name);
    assert.ok(!Object.hasOwn(tables, name), 'Duplicate table declaration: ' + name);
    assert.equal(tokens[at++], '(');
    const items = []; let item = [], depth = 1;
    for (; at < tokens.length && depth; at++) {
      const token = tokens[at];
      if (token === '(') depth++;
      if (token === ')') depth--;
      if (depth === 0 || (token === ',' && depth === 1)) { items.push(item); item = []; }
      else item.push(token);
    }
    assert.equal(depth, 0, 'Table declaration must close');
    tables[name] = items.filter(item => !['primary','unique','foreign','constraint','check'].includes(item[0]))
      .map(item => item[0]);
  }
  assert.deepEqual(tables, catalogColumns, 'Only reviewed reference columns are permitted');
}

test('schema privacy guard rejects real private columns but retains explanatory comments', () => {
  assertReferenceOnlySchema(schema + '\n-- account_id and transcript must never be catalog columns.\n');
  assertReferenceOnlySchema(schema + '\n/* payload_ciphertext /* health_score */ client_id */\n');
  for (const column of ['client_id','account_id','transcript','payload_ciphertext','health_score']) {
    for (const identifier of [column, '"' + column.toUpperCase() + '"']) {
      const mutation = schema.replace('model_key text PRIMARY KEY', identifier + ' text, model_key text PRIMARY KEY');
      assert.notEqual(mutation, schema);
      assert.throws(() => assertReferenceOnlySchema(mutation), /Private SQL identifier/);
    }
    assert.throws(() => assertReferenceOnlySchema(schema +
      '\nALTER TABLE app_private.coaching_models ADD COLUMN ' + column + ' text;'), /Private SQL identifier/);
  }
  assert.throws(() => assertReferenceOnlySchema(schema.replace('model_key text PRIMARY KEY',
    'unreviewed_field text, model_key text PRIMARY KEY')), /Only reviewed reference columns/);
});
