import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import {antiStressBlueprint} from '../lib/inner-growth/anti-stress-blueprint.js'
import {antiStressPublicSkillsV5} from '../lib/inner-growth/anti-stress-day-scheme.js'
import {oporaAs59Day,oporaAs59Skills} from '../lib/inner-growth/opora-as59-seven-skills.js'
import {oporaAs60Day,oporaAs60Skills} from '../lib/inner-growth/opora-as60-experiential-practices.js'
import {oporaRecoveryStages} from '../lib/inner-growth/antistress-recovery-pathway.js'

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

test('public blueprint retains nonempty AS6.0 descriptions without rewriting AS5.9 or legacy skills',()=>{
  for(const locale of ['ru','en','es']){
    const legacy=antiStressPublicSkillsV5(locale)
    const before=structuredClone(legacy)
    const historical=oporaAs59Skills(locale)
    const historicalBefore=structuredClone(historical)
    const historicalDays=Array.from({length:14},(_,index)=>oporaAs59Day(index+1,locale))
    const historicalDaysBefore=structuredClone(historicalDays)
    const programme=antiStressBlueprint(locale)
    // The public blueprint uses AS6.0; AS5.9 stays a separate historical edition.
    const canonical=oporaAs60Skills(locale)
    assert.equal(programme.locale,locale)
    assert.equal(programme.skills.length,7)
    assert.equal(legacy.length,7)
    for(const [index,skill] of programme.skills.entries()){
      assert.deepEqual(skill,{...canonical[index],measureIds:legacy[index].measureIds})
      assert.equal(typeof skill.description,'string')
      assert.ok(skill.description.trim().length>0,`${locale} ${skill.id} description`)
      assert.equal(skill.description,oporaAs60Day(index+1,locale).purpose)
      assert.equal(skill.description,oporaAs60Day(index+8,locale).purpose)
      assert.equal(skill.id,'S'+(index+1))
      assert.deepEqual(skill.days,[index+1,index+8])
      assert.equal(historical[index].description,historicalDays[index].purpose)
      assert.equal(historical[index].description,historicalDays[index+7].purpose)
      assert.equal(legacy[index].id,'S'+(index+1))
      assert.deepEqual(legacy[index].days,[index+1,index+8])
      assert.equal(typeof legacy[index].description,'string')
      assert.ok(legacy[index].description.trim().length>0)
      assert.equal(legacy[index].description,legacy[index].result)
      assert.notEqual(skill.description,legacy[index].description)
    }
    assert.deepEqual(legacy,before)
    assert.deepEqual(antiStressPublicSkillsV5(locale),before)
    assert.deepEqual(historical,historicalBefore)
    assert.deepEqual(oporaAs59Skills(locale),historicalBefore)
    assert.deepEqual(historicalDays,historicalDaysBefore)
    assert.deepEqual(Array.from({length:14},(_,index)=>oporaAs59Day(index+1,locale)),historicalDaysBefore)
    assert.notEqual(programme.skills[0].title,historical[0].title)
    assert.notEqual(programme.skills[0].description,historical[0].description)
  }
  assert.deepEqual(antiStressBlueprint('unsupported'),antiStressBlueprint('en'))
})

function nodes(root,predicate){
  const found=[]
  const visit=node=>{if(predicate(node))found.push(node);ts.forEachChild(node,visit)}
  visit(root)
  return found
}
function only(matches,label){
  assert.equal(matches.length,1,label)
  return matches[0]
}

test('typed public programme JSX binds canonical descriptions and keeps other-route fallbacks',()=>{
  const source=readFileSync(new URL('../components/public-antistress-landing.tsx',import.meta.url),'utf8')
  assert.match(source,/skills: \{id:string;title:string;description:string;days:\[number,number\];outcome:string\}\[\]/)
  const syntax=ts.createSourceFile('landing.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  const imported=only(syntax.statements.filter(node=>ts.isImportDeclaration(node)&&
    node.moduleSpecifier.text==='@/lib/inner-growth/anti-stress-blueprint'),'canonical blueprint import')
  assert.ok(ts.isNamedImports(imported.importClause.namedBindings))
  assert.ok(imported.importClause.namedBindings.elements.some(node=>
    node.name.text==='antiStressBlueprint'&&!node.propertyName))
  const component=only(syntax.statements.filter(node=>ts.isFunctionDeclaration(node)&&
    node.name?.text==='PublicAntistressLanding'),'public landing function')
  const programme=only(nodes(component,node=>ts.isVariableDeclaration(node)&&
    node.name.getText(syntax)==='programme'),'canonical programme binding')
  let initializer=programme.initializer
  while(ts.isAsExpression(initializer)||ts.isParenthesizedExpression(initializer))initializer=initializer.expression
  assert.equal(initializer.getText(syntax),'antiStressBlueprint(locale)')
  const returned=only(component.body.statements.filter(ts.isReturnStatement),'landing JSX return')
  const mapping=only(nodes(returned,node=>ts.isCallExpression(node)&&
    node.expression.getText(syntax)==='programme.skills.map'),'rendered skills map')
  const callback=mapping.arguments[0]
  assert.ok(ts.isArrowFunction(callback)&&ts.isBlock(callback.body))
  const card=only(callback.body.statements.filter(ts.isReturnStatement),'skill card return')
  // Read the real JSX child, not a comment or an unused copy elsewhere in the file.
  const binding=only(nodes(card,node=>ts.isJsxExpression(node)&&
    node.expression&&ts.isConditionalExpression(node.expression)&&
    node.expression.whenTrue.getText(syntax)==='skill.description'&&
    ts.isJsxElement(node.parent)&&node.parent.openingElement.tagName.getText(syntax)==='span'),
  'rendered skill description')
  const expression=binding.expression.getText(syntax)
  for(const locale of ['ru','en','es']){
    const skills=antiStressBlueprint(locale).skills
    const recoveryStages=oporaRecoveryStages(locale)
    for(const [index,skill] of skills.entries()){
      const render=(previewModuleId,stages=recoveryStages)=>runInNewContext(`(${expression})`,
        {previewModuleId,recoveryStages:stages,index,skill},{timeout:1000})
      assert.equal(render('AS2'),skill.description)
      for(const route of ['AS1','AS3','AS4','AS5','AS6']){
        assert.equal(typeof recoveryStages[index].description,'string')
        assert.ok(recoveryStages[index].description.trim().length>0)
        assert.equal(render(route),recoveryStages[index].description)
        for(const stages of [[],skills.map(()=>({})),skills.map(()=>({description:''}))]){
          assert.equal(render(route,stages),skill.description)
        }
      }
    }
  }
})
