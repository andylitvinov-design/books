import assert from 'node:assert/strict'
import test from 'node:test'
import {fixtureModuleBody} from './helpers/fixture-module-body.mjs'

test('fixture compiler removes module boundaries while preserving aliases and executable declarations',()=>{
  const source=`import 'server-only';
    import {
      dependency as provided
    } from 'never-load-this';
    const client = () => provided(3);
    export { client as createPrivateStorageClient };
    export const note = 'export import { client as alias }';
    export async function value() { return client(); }`
  let calls=0
  const model=new Function('provided',fixtureModuleBody(source)+'; return {value,note}')(n=>{calls++;return n*7})
  assert.equal(model.note,'export import { client as alias }')
  return model.value().then(value=>{assert.equal(value,21);assert.equal(calls,1)})
})
test('unknown default adapters and invalid source fail rather than deleting executable behavior',()=>{
  assert.throws(()=>fixtureModuleBody('export default sideEffect()'),SyntaxError)
  assert.throws(()=>fixtureModuleBody('export const ='),SyntaxError)
  const compiled=fixtureModuleBody("import {notInjected} from 'never-connect'; export function value(){ return notInjected(); }")
  const value=new Function(compiled+';return value')()
  assert.throws(()=>value(),ReferenceError)
})
