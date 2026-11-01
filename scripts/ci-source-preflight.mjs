#!/usr/bin/env node
// Syntax and TypeScript check before expensive Next production build.
// Emits stable root fingerprints so one source defect is not counted as multiple CI failures.
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_FILES = 3000;
const MAX_FINDINGS = 100;
const JS_SYNTAX = /\.(?:mjs|cjs)$/i;
const TS_IMPACT = /\.(?:tsx?|jsx?)$|^(?:tsconfig(?:\.[^/]*)?\.json|next-env\.d\.ts|package(?:-lock)?\.json)$/i;

export function parsePaths(raw) {
  if (typeof raw !== 'string' || !raw.endsWith('\0')) throw Error('INVALID_DIFF_FORMAT');
  const paths = raw.slice(0, -1).split('\0');
  if (paths.length > MAX_FILES || paths.some(p => !p || p.startsWith('-') || p.startsWith('/') ||
    p.split('/').some(part => part === '..' || part === '.') || /[\x00-\x1f\x7f]/.test(p))) {
    throw Error('INVALID_DIFF_PATHS');
  }
  return [...new Set(paths)].sort();
}
export const syntaxCandidates = paths => paths.filter(p => JS_SYNTAX.test(p));
export const impactsTypes = paths => paths.some(p => TS_IMPACT.test(p));
export function rootFingerprint(category, file, code, message) {
  const key = [category, String(file || ''), String(code || ''), String(message || '').trim().replace(/\s+/g, ' ')].join('\0');
  return createHash('sha256').update(key).digest('hex').slice(0, 20);
}
export function parseTypescriptDiagnostics(output) {
  const rows = [];
  const rx = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm;
  for (const m of String(output).matchAll(rx)) {
    const file = m[1].replace(/\\/g, '/'), message = m[5].slice(0, 500);
    rows.push({category:'source.typescript', code:m[4], file, line:Number(m[2]),
      column:Number(m[3]), message,
      root:rootFingerprint('source.typescript', file, m[4], message)});
    if (rows.length >= MAX_FINDINGS) break;
  }
  return rows;
}
export function summarizeFindings(findings) {
  const roots = new Map();
  for (const f of findings) {
    if (roots.has(f.root)) roots.get(f.root).occurrences++;
    else roots.set(f.root, {root:f.root,category:f.category,code:f.code,file:f.file,
      line:f.line ?? null,message:f.message,occurrences:1});
  }
  return [...roots.values()].sort((a,b)=>b.occurrences-a.occurrences||a.root.localeCompare(b.root));
}
function git(args) {
  return execFileSync('git', args, {encoding:'utf8', maxBuffer:10*1024*1024,stdio:['ignore','pipe','pipe']});
}
function changedPaths(base) {
  if (!base || base.startsWith('-') || /\s/.test(base)) throw Error('BASE_REF_REQUIRED');
  const sha=git(['rev-parse','--verify',base+'^{commit}']).trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw Error('UNVERIFIED_BASE_REF');
  // Compare the tested merge checkout, not the changing live PR files list.
  // Include uncommitted changes for local pre-push use.
  const raw=[
    git(['diff','--no-renames','--name-only','--diff-filter=ACMRT','-z',sha,'HEAD']),
    git(['diff','--no-renames','--name-only','--diff-filter=ACMRT','-z','HEAD']),
    git(['ls-files','--others','--exclude-standard','-z']),
  ].filter(Boolean).join('');
  return raw ? parsePaths(raw) : [];
}
function run(command,args,maxMs=180000) {
  const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:12*1024*1024,timeout:maxMs,env:process.env});
  return {ok:!r.error&&r.status===0,output:(r.stdout||'')+'\n'+(r.stderr||''),message:r.error?r.error.message:''};
}
function checkSyntax(paths) {
  const findings=[];
  for (const file of syntaxCandidates(paths)) {
    const r=run(process.execPath,['--check',file],15000);
    if (!r.ok) {
      const message=(r.output.match(/SyntaxError:\s*(.+)/)?.[1]?.trim()||
        (r.message?'node --check failed: '+r.message:'node --check failed')).slice(0,500);
      findings.push({category:'source.javascript_syntax',code:'JS_SYNTAX',file,message,
        root:rootFingerprint('source.javascript_syntax',file,'JS_SYNTAX',message)});
    }
    if (findings.length>=MAX_FINDINGS) break;
  }
  return findings;
}
function checkTypes() {
  // Next 15.5+ must generate route helpers before tsc on fresh checkouts.
  const next=resolve('node_modules','.bin',process.platform==='win32'?'next.cmd':'next');
  const generated=run(next,['typegen'],90000);
  if (!generated.ok) {
    const message=(generated.message||generated.output.trim()||'next typegen failed').slice(0,500);
    return [{category:'source.typegen',code:'NEXT_TYPEGEN',file:'next.config.ts',message,
      root:rootFingerprint('source.typegen','next.config.ts','NEXT_TYPEGEN',message)}];
  }
  const tsc=resolve('node_modules','.bin',process.platform==='win32'?'tsc.cmd':'tsc');
  const r=run(tsc,['--noEmit','--incremental','false','--pretty','false']);
  if (r.ok) return [];
  const findings=parseTypescriptDiagnostics(r.output);
  if (findings.length) return findings;
  const message=(r.message||r.output.trim().slice(0,250)||'tsc exited nonzero');
  return [{category:'infrastructure.preflight',code:'TSC_EXECUTION',file:'tsconfig.json',message,
    root:rootFingerprint('infrastructure.preflight','tsconfig.json','TSC_EXECUTION',message)}];
}
export function formatReport(paths,findings,typechecked) {
  const roots=summarizeFindings(findings);
  return {schema:'hh.source-preflight.v1',status:findings.length?'failed':'passed',
    check:'source-preflight',changedFiles:paths.length,syntaxFiles:syntaxCandidates(paths).length,
    typechecked,findingCount:findings.length,rootCount:roots.length,roots};
}
function main() {
  const args=process.argv.slice(2);
  let base=null,fullTypes=false;
  for(let i=0;i<args.length;i++) {
    if(args[i]==='--base'&&args[i+1]) base=args[++i];
    else if(args[i]==='--full-types') fullTypes=true;
    else throw Error('INVALID_ARGUMENT: '+args[i]);
  }
  if(!base) throw Error('Supply --base <tested-base-sha-or-local-ref>');
  const paths=changedPaths(base);
  const findings=checkSyntax(paths);
  const typechecked=fullTypes||impactsTypes(paths);
  if(!findings.length&&typechecked) findings.push(...checkTypes());
  const report=formatReport(paths,findings,typechecked);
  if(process.env.HH_PREFLIGHT_REPORT) {
    const file=resolve(process.env.HH_PREFLIGHT_REPORT);
    mkdirSync(dirname(file),{recursive:true});
    writeFileSync(file,JSON.stringify(report,null,2)+'\n');
  }
  if(process.env.GITHUB_STEP_SUMMARY) {
    const lines=['### Source Preflight',
      '- Changed files: '+report.changedFiles+'; syntax checked: '+report.syntaxFiles+'; TypeScript checked: '+typechecked,
      '- Errors: '+report.findingCount+'; distinct source roots: '+report.rootCount,
      ...report.roots.slice(0,10).map(r=>'- '+r.code+' '+r.file+' — '+r.message.replace(/[<>|]/g,' ').slice(0,180)+' (root '+r.root+')'),''];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
  }
  if(findings.length) {
    console.error('SOURCE_PREFLIGHT_FAILED: '+report.findingCount+' errors, '+report.rootCount+' unique roots');
    for(const r of report.roots.slice(0,30)) {
      console.error('::error file='+r.file.replace(/[,\r\n]/g,'_')+',title='+r.code+'::'+r.message.replace(/[\r\n]/g,' '));
      console.error('['+r.root+'] '+r.category+' '+r.file+(r.line?':'+r.line:'')+' '+r.message);
    }
    process.exitCode=1;
  } else console.log('SOURCE_PREFLIGHT_OK: '+paths.length+' changes; '+report.syntaxFiles+' syntax checks; TypeScript '+(typechecked?'passed':'not applicable'));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  try{main();}catch(e){console.error('SOURCE_PREFLIGHT_UNAVAILABLE: '+e.message);process.exitCode=2;}
}
