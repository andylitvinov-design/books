import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'

function parsed(path) {
  const text=readFileSync(path,'utf8')
  const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.equal(file.parseDiagnostics.length,0,'Source must parse: '+path)
  return {text,file}
}
export function sourceFunction(path,name,bindings={}) {
  const {file}=parsed(path)
  const found=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name)
  assert.equal(found.length,1,'Exactly one top-level '+name+' in '+path)
  return runInNewContext('('+found[0].getText(file).replace(/^export\s+(?:default\s+)?/,'')+')',bindings)
}
export function sourceModule(path,modules) {
  const {text}=parsed(path)
  const result=ts.transpileModule(text,{fileName:path,reportDiagnostics:true,compilerOptions:{
    jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,
  }})
  assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0)
  const module={exports:{}}
  runInNewContext(result.outputText,{module,exports:module.exports,require:name=>{
    assert.ok(Object.hasOwn(modules,name),'Unexpected dependency '+name+' in '+path)
    return modules[name]
  }})
  return module.exports
}

