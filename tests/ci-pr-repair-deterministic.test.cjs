'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {repairTypeOnlyImports,validRepairScope}=require('../scripts/ci-pr-repair-deterministic.cjs');

test('converts only named imports used exclusively as types and preserves runtime imports',()=>{
 const input=[
  "import { User, createUser, Result as ApiResult } from './api';",
  "const user: User = {} as User;",
  "type Output = ApiResult<User>;",
  "createUser(user);",
  ""
 ].join('\n');
 const out=repairTypeOnlyImports(input,'sample.ts');
 assert.equal(out.changed,true);
 assert.equal(out.edits,2);
 assert.match(out.code,/import \{ type User, createUser, type Result as ApiResult \} from '\.\/api';/);
 assert.match(out.code,/createUser\(user\)/);
 assert.match(out.code,/as User/);
});

test('leaves value references, side-effect imports and unused imports unchanged',()=>{
 const input=[
  "import './register';",
  "import { Widget, makeWidget, Unused } from './widgets';",
  "const value = makeWidget();",
  "new Widget();",
  ""
 ].join('\n');
 const out=repairTypeOnlyImports(input,'sample.ts');
 assert.equal(out.changed,false);
 assert.equal(out.code,input);
 assert.equal(out.detail,'NO_SAFE_TYPE_ONLY_IMPORTS');
});

test('supports isolated default and namespace imports only when used as types',()=>{
 const input=[
  "import DefaultShape from './shape';",
  "import * as Domain from './domain';",
  "type A = DefaultShape;",
  "type B = Domain.User;",
  ""
 ].join('\n');
 const out=repairTypeOnlyImports(input,'sample.ts');
 assert.equal(out.edits,2);
 assert.match(out.code,/import type DefaultShape from '\.\/shape';/);
 assert.match(out.code,/import type \* as Domain from '\.\/domain';/);
});

test('does not rewrite ambiguous shadowed identifiers, parse errors or unsupported paths',()=>{
 const shadowed="import { User } from './api';\nfunction f(User: string) { return User; }\ntype T = User;\n";
 const out=repairTypeOnlyImports(shadowed,'sample.ts');
 assert.equal(out.changed,false);
 const broken=repairTypeOnlyImports("import { User } from './api';\ntype X = ;",'sample.ts');
 assert.equal(broken.detail,'PARSE_DIAGNOSTICS');
 assert.equal(repairTypeOnlyImports("import { User } from './api';",'sample.js').detail,'UNSUPPORTED_EXTENSION');
});

test('preserves class extends runtime dependency but permits implements type-only imports',()=>{
 const input=[
  "import { Base, Contract } from './types';",
  "class Child extends Base implements Contract {}",
  ""
 ].join('\n');
 const out=repairTypeOnlyImports(input,'sample.ts');
 assert.equal(out.edits,1);
 // The class base is runtime-required; only the implements contract is type-only.
 assert.match(out.code,/import \{ Base, type Contract \} from '\.\/types';/);
});

test('trusted repair lease accepts JS-only and mixed JS/TypeScript source without granting JS codemod edits',()=>{
 const sha='a'.repeat(40);
 assert.equal(validRepairScope(sha,['lib/billing.js']),true);
 assert.equal(validRepairScope(sha,['lib/feature.ts','components/card.jsx','lib/worker.mjs','lib/tool.cjs']),true);
 assert.equal(repairTypeOnlyImports('const x = 1;','lib/billing.js').detail,'UNSUPPORTED_EXTENSION');
 assert.equal(repairTypeOnlyImports('const x = 1;','components/card.jsx').changed,false);
});

test('trusted repair lease rejects scope expansion, duplicate paths, tests, and unsafe files',()=>{
 const sha='a'.repeat(40);
 for(const files of [
  [],['lib/a.js','lib/a.js'],['tests/a.ts'],['app/__tests__/a.tsx'],
  ['.github/workflows/a.js'],['lib/../secrets.ts'],['/tmp/a.ts'],
  ['lib/hidden/.private.ts'],['app/app.json'],Array(9).fill(0).map((_,i)=>'lib/m'+i+'.js')
 ]) assert.equal(validRepairScope(sha,files),false,JSON.stringify(files));
 assert.equal(validRepairScope('badsha',['lib/clean.ts']),false);
});
