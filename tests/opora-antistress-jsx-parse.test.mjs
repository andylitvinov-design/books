import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'

// This directly parses production JSX without requiring a Vercel deployment,
// whose team quota is a separate external precondition.
test('OPORA slideshow and schedule keep syntactically valid JSX after interactive additions',()=>{
  const files=[
    'components/app/course-slide-player.jsx',
    'components/app/course-today.jsx',
    'components/app/course-14-day-overview.jsx',
    'components/public-antistress-landing.tsx',
    'components/public-antistress-evidence.tsx',
    'components/app/anti-stress-method-activity.jsx',
  ]
  for(const file of files){
    const source=readFileSync(new URL('../'+file,import.meta.url),'utf8')
    const syntax=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,
      file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.JSX)
    const errors=syntax.parseDiagnostics.map(diag=>({
      text:ts.flattenDiagnosticMessageText(diag.messageText,' '),
      line:syntax.getLineAndCharacterOfPosition(diag.start||0).line+1,
    }))
    assert.deepEqual(errors,[],file+' JSX parse error')
  }
})

test('a practice phrase closes before the guided exercise and controls remain optional',()=>{
  const player=readFileSync(new URL('../components/app/course-slide-player.jsx',import.meta.url),'utf8')
  assert.match(player,/data-course-support-phrase-choice/)
  assert.match(player,/phraseResponse&&<p/)
  assert.match(player,/\{slide\.kind === 'guided' &&/u)
  assert.match(player,/data-course-practice-attempt/)
  assert.match(player,/data-antistress-skill-probe/)
})

test('typed public programme retains the description supplied by the canonical blueprint',async()=>{
  const source=readFileSync(new URL('../components/public-antistress-landing.tsx',import.meta.url),'utf8')
  const {antiStressBlueprint}=await import('../lib/inner-growth/anti-stress-blueprint.js')
  const {oporaAs60Skills}=await import('../lib/inner-growth/opora-as60-experiential-practices.js')
  assert.match(source,/skills: \{id:string;title:string;description:string;days:\[number,number\];outcome:string\}\[\]/)
  assert.match(source,/skill\.description/)
  for (const locale of ['en','ru','es']) {
    const skills=antiStressBlueprint(locale).skills
    const expected=oporaAs60Skills(locale)
    assert.equal(skills.length,7)
    assert.deepEqual(skills.map(skill=>skill.description),expected.map(skill=>skill.description))
    assert.ok(skills.every(skill=>typeof skill.description==='string' && skill.description.trim().length>0))
  }
})
