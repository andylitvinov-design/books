'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {repairTypeOnlyImports}=require('../scripts/ci-pr-repair-deterministic.cjs');

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
 assert.equal(out.edits,0);
 // The class base is a runtime use; conservative all-use policy keeps both.
 assert.equal(out.changed,false);
});
