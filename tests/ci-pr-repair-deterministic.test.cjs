'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {repairTypeOnlyImports,trustedRepairScope}=require('../scripts/ci-pr-repair-deterministic.cjs');

test('mixed signed JS/TS scope is accepted without permitting unsafe or duplicate paths',()=>{
 const sha='a'.repeat(40),files=['components/page.jsx','lib/helper.mjs','components/types.tsx'];
 const scope=trustedRepairScope({REPAIR_SHA:sha,REPAIR_FILES_JSON:JSON.stringify(files)});
 assert.deepEqual(scope,{sha,files});
 for(const invalid of [
  ['tests/ci.spec.ts'],['.github/workflows/guard.ts'],['lib/../secret.ts'],
  ['components/a.ts','components/a.ts'],Array.from({length:9},(_,i)=>'lib/f'+i+'.js'),
  ['components/.env.ts']
 ])assert.throws(()=>trustedRepairScope({REPAIR_SHA:sha,REPAIR_FILES_JSON:JSON.stringify(invalid)}),
  /INVALID_TRUSTED_REPAIR_SCOPE/);
 assert.throws(()=>trustedRepairScope({REPAIR_SHA:'stale',REPAIR_FILES_JSON:'["lib/a.js"]'}),
  /INVALID_TRUSTED_REPAIR_SCOPE/);
 assert.equal(repairTypeOnlyImports('export const x=1;','public.js').detail,'UNSUPPORTED_EXTENSION');
});
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
