import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read = name => readFileSync(new URL('../.github/workflows/'+name+'.yml',import.meta.url),'utf8')
// Literal Next route directories are not GitHub filter character classes.
for(const name of ['hh-course-presets','hh-energywork-ai','practitioner-presentations'])test(name+': bracketed route paths are escaped without changing permissions or jobs',()=>{
 const source=read(name)
 const patterns=source.split('\n').filter(line=>/^\s+- 'app\//.test(line)).map(line=>line.trim().slice(3,-1))
 assert.ok(patterns.length)
 assert.ok(patterns.includes('app/api/app/\\[...path\\]/route.js'))
 assert.ok(patterns.every(pattern=>!/(?<!\\)[\[\]]/.test(pattern)), 'No unescaped Next directory brackets')
 const api=patterns.find(p=>p.includes('...path'))
 assert.equal(api.replaceAll('\\[','[').replaceAll('\\]',']'),'app/api/app/[...path]/route.js')
 assert.match(source,/permissions:\s*\n\s+contents: read/)
 assert.match(source,/runs-on: ubuntu-latest/)
 assert.match(source,/npm run build/)
 assert.doesNotMatch(source,/continue-on-error:\s*true|pull_request_target:/)
})
