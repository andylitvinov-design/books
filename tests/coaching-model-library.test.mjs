import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../supabase/migrations/20261023183000_hh_coaching_model_catalog_schema.sql', import.meta.url), 'utf8');
const seed = readFileSync(new URL('../supabase/migrations/20261023183100_hh_coaching_model_catalog_seed.sql', import.meta.url), 'utf8');

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
  assert.doesNotMatch(schema,/client_id|account_id|transcript|payload_ciphertext|health_score/);
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
});
