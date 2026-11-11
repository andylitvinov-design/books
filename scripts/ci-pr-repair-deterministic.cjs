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
function trustedRepairScope(env=process.env){
 const sha=String(env.REPAIR_SHA||'');
 let files;try{files=JSON.parse(env.REPAIR_FILES_JSON||'null');}catch{}
 // The signed Repair Worker sends a mixed JS/TS source allowlist. This
 // TypeScript-only codemod must skip JS, not reject the entire signed task.
 if(!SHA.test(sha)||!Array.isArray(files)||!files.length||files.length>MAX_FILES||
   new Set(files).size!==files.length||!files.every(f=>typeof f==='string'&&
   SOURCE.test(f)&&!f.startsWith('tests/')&&!f.startsWith('.github/')&&
   !f.includes('/__tests__/')))
  throw Error('INVALID_TRUSTED_REPAIR_SCOPE');
 return {sha,files};
}

/** Restore a provably introduced one-line TS2304 error from protected
 * production, never from model output or PR text. The verifier and publisher
 * remain independent and every other case falls back to existing repairs. */
function exactProtectedBaseTs2304Line({file,source,baseline,diagnostics}={}){
 const {safeSourcePath}=require('./ci-pr-repair-free-agent.cjs');
 const blocked=detail=>({changed:false,detail});
 if(typeof file!=='string'||!/\.tsx?$/.test(file)||!safeSourcePath(file)||
    typeof source!=='string'||typeof baseline!=='string'||typeof diagnostics!=='string')
   return blocked('INVALID_SCOPE');
 if(Buffer.byteLength(source)>MAX_BYTES||Buffer.byteLength(baseline)>MAX_BYTES||
    !source.endsWith('\n')||!baseline.endsWith('\n')||
    /[\r\0]/.test(source)||/[\r\0]/.test(baseline))
   return blocked('INVALID_SOURCE_BYTES');
 const errors=diagnostics.split(/\r?\n/).filter(s=>/: error TS\d{4}:/.test(s));
 if(errors.length!==1)return blocked('MULTIPLE_OR_MISSING_COMPILER_ERRORS');
 const escaped=file.split('').map(c=>/[a-zA-Z0-9_/]/.test(c)?c:'\\'+c).join('');
 const linePattern='^'+escaped+
   "\\((\\d+),(\\d+)\\): error TS2304: Cannot find name '([A-Za-z_$][\\w$]{0,79})'\\.$";
 const m=new RegExp(linePattern).exec(errors[0]);
 if(!m)return blocked('NOT_EXACT_TS2304');
 const line=Number(m[1]),column=Number(m[2]),identifier=m[3];
 if(!Number.isSafeInteger(line)||!Number.isSafeInteger(column)||line<1||column<1)
   return blocked('INVALID_LINE_OR_COLUMN');
 const curr=source.slice(0,-1).split('\n'),old=baseline.slice(0,-1).split('\n');
 if(curr.length!==old.length||line>curr.length)return blocked('LINE_COUNTS_CHANGED');
 let differences=0,changedLine=-1;
 for(let i=0;i<curr.length;i++)if(curr[i]!==old[i]){differences++;changedLine=i;}
 if(differences!==1||changedLine!==line-1)return blocked('NOT_UNIQUE_COMPILER_LINE_REGRESSION');
 const bad=curr[line-1],good=old[line-1];
 if(bad.slice(column-1,column-1+identifier.length)!==identifier||
    good.includes(identifier)||bad.length>4000||good.length>4000)
   return blocked('BAD_IDENTIFIER_OR_PROTECTED_LINE');
 const patched=curr.slice();patched[line-1]=good;
 return {changed:true,code:patched.join('\n')+'\n',line,column,
   detail:'PROTECTED_BASE_EXACT_TS2304_LINE_RESTORED'};
}
function applyProtectedBaseTs2304Line(){
 const {sha,files}=trustedRepairScope(),root=fs.realpathSync(process.cwd());
 const diagnosticFile=path.join(root,'.hh-repair-tsc-errors.log');
 if(files.length!==1||!/\.tsx?$/.test(files[0])||!fs.existsSync(diagnosticFile)){
   console.log('HH_BASELINE_TS2304 '+JSON.stringify({changed:false,reason:'NO_SINGLE_SOURCE_ERROR'}));return;
 }
 const file=files[0],{safeSourcePath}=require('./ci-pr-repair-free-agent.cjs');
 if(!safeSourcePath(file))throw Error('UNSAFE_PROTECTED_BASE_SCOPE');
 const git=(args,timeout=12000)=>cp.spawnSync('git',args,{cwd:root,encoding:'utf8',
   timeout,maxBuffer:512000,env:{PATH:process.env.PATH||'/usr/bin:/bin',
     HOME:process.env.HOME||'/tmp',CI:'true',GIT_TERMINAL_PROMPT:'0'}});
 const current=git(['rev-parse','HEAD']);
 if(current.status!==0||current.stdout.trim()!==sha)throw Error('BASELINE_HEAD_STALE');
 const abs=path.resolve(root,file);
 if(!abs.startsWith(root+path.sep)||fs.realpathSync(abs)!==abs||!fs.lstatSync(abs).isFile())
   throw Error('UNSAFE_PROTECTED_BASE_FILE');
 if(git(['diff','--quiet','HEAD','--',file]).status!==0){
   console.log('HH_BASELINE_TS2304 '+JSON.stringify({changed:false,reason:'SOURCE_ALREADY_EDITED'}));return;
 }
 const remote=git(['remote','get-url','origin']);
 if(remote.status!==0||
    !/^https:\/\/github\.com\/andylitvinov-design\/books(?:\.git)?\s*$/.test(remote.stdout)){
   console.log('HH_BASELINE_TS2304 '+JSON.stringify({changed:false,reason:'UNTRUSTED_ORIGIN'}));return;
 }
 const fetched=git(['fetch','--quiet','--no-tags','--depth=1','origin','codex/public-book-library'],45000);
 if(fetched.status!==0){
   console.log('HH_BASELINE_TS2304 '+JSON.stringify({changed:false,reason:'BASELINE_FETCH_UNAVAILABLE'}));return;
 }
 const ref=git(['rev-parse','FETCH_HEAD']);
 if(ref.status!==0||!SHA.test(ref.stdout.trim()))throw Error('BASELINE_SHA_INVALID');
 const original=git(['show','FETCH_HEAD:'+file],16000);
 if(original.status!==0){
   console.log('HH_BASELINE_TS2304 '+JSON.stringify({changed:false,reason:'BASE_SOURCE_UNAVAILABLE'}));return;
 }
 const content=fs.readFileSync(abs,'utf8');
 const decision=exactProtectedBaseTs2304Line({file,source:content,baseline:original.stdout,
   diagnostics:fs.readFileSync(diagnosticFile,'utf8')});
 if(decision.changed){
   if(fs.readFileSync(abs,'utf8')!==content)throw Error('SOURCE_RACE_ABORT');
   fs.writeFileSync(abs,decision.code,{mode:fs.statSync(abs).mode});
 }
 console.log('HH_BASELINE_TS2304 '+JSON.stringify({changed:decision.changed,detail:decision.detail,
   line:decision.line||null,protected_sha:ref.stdout.trim()}));
}

function main(){
 const {sha,files}=trustedRepairScope();
 const root=fs.realpathSync(process.cwd());
 const head=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==sha)throw Error('REPAIR_CHECKOUT_HEAD_MISMATCH');
 const changed=[],skipped=[];
 for(const file of files){
  // No JS/JSX transformation is approved here. The later ESLint/free-only
  // path retains those source files under its separate strict allowlist.
  if(!/\.tsx?$/.test(file))continue;
  const abs=path.resolve(root,file);
  if(!abs.startsWith(root+path.sep)||fs.realpathSync(abs)!==abs||!fs.lstatSync(abs).isFile())
   throw Error('UNSAFE_REPAIR_PATH');
  const before=fs.readFileSync(abs,'utf8');
  // Refuse to parse or modify an oversized source, but preserve safe independent
  // sibling repairs. The existing 150KB verified-patch limit is unchanged.
  if(Buffer.byteLength(before,'utf8')>MAX_BYTES){
   skipped.push({path:file,reason:'SOURCE_FILE_TOO_LARGE'});
   continue;
  }
  const result=repairTypeOnlyImports(before,file);
  if(result.changed){
   fs.writeFileSync(abs,result.code,{mode:fs.statSync(abs).mode});
   changed.push({path:file,edits:result.edits,detail:result.detail});
  }
 }
 console.log('HH_DETERMINISTIC_REPAIR '+JSON.stringify({head_sha:sha,changed,skipped}));
}
if(require.main===module){try{process.argv[2]==='base-line'?applyProtectedBaseTs2304Line():main();}catch(error){console.error('HH_DETERMINISTIC_REPAIR_BLOCKED '+error.message);process.exitCode=1;}}
module.exports={repairTypeOnlyImports,typeOnlyReference,exclusivelyTypeReferenced,trustedRepairScope,exactProtectedBaseTs2304Line};
