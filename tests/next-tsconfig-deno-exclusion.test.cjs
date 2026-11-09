'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('Next app typecheck excludes Deno Edge Function sources',()=>{
  const config=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../tsconfig.json'),'utf8'));
  assert.ok(config.exclude.includes('node_modules'));
  assert.ok(config.exclude.includes('supabase/functions/**'));
  assert.ok(config.include.includes('**/*.ts'));
  assert.ok(config.include.includes('**/*.tsx'));
});
