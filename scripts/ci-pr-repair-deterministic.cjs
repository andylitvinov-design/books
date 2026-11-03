'use strict';
// Trusted, bounded TypeScript codemod. Only converts imported symbols that
// are provably referenced exclusively in type positions. Runtime imports,
// side-effect imports, files, and compiler configuration remain untouched.
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const ts=require('typescript');
const SOURCE=/^(?!\/)(?!.*(?:^|\/)\.)(?!.*\.\.)(?:[\w.-]+\/)*[\w.-]+\.(?:js|jsx|ts|tsx|mjs|cjs)$/;
const SHA=/^[a-f0-9]{40}$/i;
const MAX_FILES=8, MAX_BYTES=150000;

function withinTypeName(ts,node){
 let current=node;
 while(current.parent&&ts.isQualifiedName(current.parent))current=current.parent;
 return current;
}
function typeOnlyReference(ts,node){
 const current=withinTypeName(ts,node),parent=current.parent;
 if(parent&&ts.isTypeReferenceNode(parent)&&parent.typeName===current)return true;
 if(parent&&ts.isExpressionWithTypeArguments(parent)&&parent.expression===current){
  const clause=parent.parent,owner=clause&&clause.parent;
  // "class C extends Base" needs Base at runtime; implements/interface
  // heritage is type-only.
  if(clause&&ts.isHeritageClause(clause)&&clause.token===ts.SyntaxKind.ExtendsKeyword&&
     owner&&ts.isClassDeclaration(owner))return false;
  return !!(clause&&ts.isHeritageClause(clause));
 }
 if(parent&&((ts.isAsExpression(parent)&&parent.type===current)||
    (ts.isTypeAssertionExpression(parent)&&parent.type===current)||
    (ts.isSatisfiesExpression&&ts.isSatisfiesExpression(parent)&&parent.type===current)))return true;
 return false;
}
function declarationName(ts,node){
 const p=node.parent;
 if(!p)return false;
 const declarations=[
  ts.isVariableDeclaration,ts.isParameter,ts.isFunctionDeclaration,ts.isFunctionExpression,
  ts.isClassDeclaration,ts.isClassExpression,ts.isInterfaceDeclaration,ts.isTypeAliasDeclaration,
  ts.isEnumDeclaration,ts.isModuleDeclaration,ts.isPropertyDeclaration,ts.isPropertySignature,
  ts.isMethodDeclaration,ts.isMethodSignature,ts.isTypeParameterDeclaration,
  ts.isBindingElement,ts.isCatchClause
 ];
 return declarations.some(check=>check(p)&&p.name===node);
}
function exclusivelyTypeReferenced(ts,sourceFile,importDecl,localName){
 let references=0,unsafe=false;
 function visit(node){
  if(unsafe)return;
  if(ts.isIdentifier(node)&&node.text===localName){
   // Ignore the import declaration's own binding and member/property names:
   // they do not prove that the imported binding is used as a value.
   if(importDecl.pos<=node.pos&&node.end<=importDecl.end)return;
   const p=node.parent;
   if((ts.isPropertyAccessExpression(p)&&p.name===node)||
      (ts.isPropertyAssignment(p)&&p.name===node)||
      (ts.isPropertyDeclaration(p)&&p.name===node)||
      (ts.isPropertySignature(p)&&p.name===node)||
      (ts.isMethodDeclaration(p)&&p.name===node)||
      (ts.isMethodSignature(p)&&p.name===node))return;
   if(declarationName(ts,node)){unsafe=true;return;}
   if(typeOnlyReference(ts,node)){references++;return;}
   unsafe=true;return;
  }
  ts.forEachChild(node,visit);
 }
 visit(sourceFile);
 return references>0&&!unsafe;
}
function repairTypeOnlyImports(source,filename='source.ts'){
 if(typeof source!=='string'||Buffer.byteLength(source,'utf8')>MAX_BYTES)
  return {changed:false,code:source,detail:'INVALID_OR_OVERSIZED_SOURCE',edits:0};
 if(!/\.tsx?$/.test(filename))
  return {changed:false,code:source,detail:'UNSUPPORTED_EXTENSION',edits:0};
 const kind=filename.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const sf=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,kind);
 if(sf.parseDiagnostics.length)
  return {changed:false,code:source,detail:'PARSE_DIAGNOSTICS',edits:0};
 const insertions=[];
 function add(position){insertions.push(position);}
 function visit(node){
  if(ts.isImportDeclaration(node)&&node.importClause&&!node.importClause.isTypeOnly){
   const clause=node.importClause;
   if(clause.namedBindings&&ts.isNamedImports(clause.namedBindings)){
    for(const spec of clause.namedBindings.elements){
     if(spec.isTypeOnly)continue;
     const local=spec.name.text;
     if(exclusivelyTypeReferenced(ts,sf,node,local))add(spec.getStart(sf));
    }
   }else if(clause.name&&!clause.namedBindings){
    if(exclusivelyTypeReferenced(ts,sf,node,clause.name.text))add(clause.getStart(sf));
   }else if(clause.namedBindings&&ts.isNamespaceImport(clause.namedBindings)&&!clause.name){
    if(exclusivelyTypeReferenced(ts,sf,node,clause.namedBindings.name.text))
     add(clause.getStart(sf));
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(sf);
 const unique=[...new Set(insertions)].sort((a,b)=>b-a);
 let code=source;
 for(const position of unique)code=code.slice(0,position)+'type '+code.slice(position);
 return {changed:unique.length>0,code,detail:unique.length?'TYPE_ONLY_IMPORTS_FIXED':'NO_SAFE_TYPE_ONLY_IMPORTS',edits:unique.length};
}
// The trusted dispatcher intentionally accepts JS/JSX/MJS/CJS as ESLint
// candidates. Validate that entire lease with the same file constraints, but
// never run a TypeScript AST rewrite on non-TypeScript source files.
function validRepairScope(sha,files){
 return SHA.test(sha)&&Array.isArray(files)&&files.length>0&&files.length<=MAX_FILES&&
  new Set(files).size===files.length&&files.every(f=>typeof f==='string'&&
   SOURCE.test(f)&&!f.startsWith('tests/')&&!f.startsWith('.github/')&&
   !f.includes('/__tests__/'));
}
function main(){
 const sha=String(process.env.REPAIR_SHA||'');
 let files;try{files=JSON.parse(process.env.REPAIR_FILES_JSON||'null');}catch{}
 if(!validRepairScope(sha,files))throw Error('INVALID_TRUSTED_REPAIR_SCOPE');
 const root=fs.realpathSync(process.cwd());
 const head=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==sha)throw Error('REPAIR_CHECKOUT_HEAD_MISMATCH');
 const changed=[];
 const typeFiles=files.filter(f=>/\.tsx?$/.test(f));
 for(const file of typeFiles){
  const abs=path.resolve(root,file);
  if(!abs.startsWith(root+path.sep)||fs.realpathSync(abs)!==abs||!fs.lstatSync(abs).isFile())
   throw Error('UNSAFE_REPAIR_PATH');
  const before=fs.readFileSync(abs,'utf8');
  if(Buffer.byteLength(before,'utf8')>MAX_BYTES)throw Error('SOURCE_FILE_TOO_LARGE');
  const result=repairTypeOnlyImports(before,file);
  if(result.changed){
   fs.writeFileSync(abs,result.code,{mode:fs.statSync(abs).mode});
   changed.push({path:file,edits:result.edits,detail:result.detail});
  }
 }
 console.log('HH_DETERMINISTIC_REPAIR '+JSON.stringify({
  head_sha:sha,changed,eslint_only_count:files.length-typeFiles.length
 }));
}
if(require.main===module){try{main()}catch(error){console.error('HH_DETERMINISTIC_REPAIR_BLOCKED '+error.message);process.exitCode=1;}}
module.exports={repairTypeOnlyImports,typeOnlyReference,exclusivelyTypeReferenced,validRepairScope};
