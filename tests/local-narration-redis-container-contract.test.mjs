import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
const source=readFileSync(new URL('./local-narration-redis-runtime.test.mjs',import.meta.url),'utf8')
const workflow=readFileSync(new URL('../.github/workflows/ia-v2.yml',import.meta.url),'utf8')
const start=source.indexOf('const configuredContainer=')
const end=source.indexOf('\nconst ttl=',start)
assert.ok(start>=0&&end>start)
const selection=source.slice(start,end)+'; container'
const resolve=(env)=>runInNewContext(selection,{process:{env},assert},{timeout:1000})
test('standalone synthetic job retains exact dedicated container',()=>assert.equal(resolve({}),'andrey-voice-redis-ci'))
test('IA generated service container is addressed by its exact ID',()=>assert.equal(resolve({HH_TEST_REDIS_CONTAINER:'a'.repeat(64)}),'a'.repeat(64)))
for(const value of ['', 'redis', 'production', 'redis://localhost:6379', 'A'.repeat(64),'a'.repeat(63),'a'.repeat(65),'a'.repeat(64)+'\n','$(echo bad)','--privileged']){
 test('rejects invalid explicit container binding '+JSON.stringify(value),()=>assert.throws(()=>resolve({HH_TEST_REDIS_CONTAINER:value}),{code:'ERR_ASSERTION'}))
}
test('broad unit step binds the existing healthy Redis service, not arbitrary input',()=>{
 const step=workflow.slice(workflow.indexOf('      - name: Broad unit tests (fatal)'),workflow.indexOf('      - name: Summarize bounded unit failure evidence'))
 assert.match(step,/HH_TEST_REDIS_CONTAINER: \$\{\{ job\.services\.redis\.id \}\}/)
 assert.match(workflow,/redis:\n        image: redis:7-alpine/)
 assert.match(workflow,/--health-cmd "redis-cli ping"/)
 assert.match(step,/npm run test:unit/)
 assert.doesNotMatch(step,/continue-on-error|--test-skip-pattern/)
})
