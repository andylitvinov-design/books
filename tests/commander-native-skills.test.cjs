'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const loader=require('../scripts/commander-native-skill-loader.cjs');
const root=path.resolve(__dirname,'..'),home=path.join(root,'.agents','skills');
test('every catalog entry maps to a real standards-compatible SKILL.md without tool permissions',()=>{
 const skills=loader.readCatalog();
 assert.equal(skills.length,30);
 assert.equal(skills.filter(s=>s.status==='curated').length,27);
 assert.equal(skills.filter(s=>s.status==='review_only').length,3);
 assert.equal(new Set(skills.map(s=>loader.folderName(s))).size,30);
 for(const s of skills){
  const file=path.join(home,loader.folderName(s),'SKILL.md');
  const raw=fs.readFileSync(file,'utf8');
  assert.ok(raw.startsWith('---\nname: '+loader.folderName(s)+'\n'),file);
  assert.match(raw,/^description:/m);
  assert.ok(raw.length>250&&raw.length<12000);
  assert.doesNotMatch(raw.slice(0,750),/\nallowed-tools:/);
  assert.equal(loader.getSkill(s).id,s.id);
 }
});
test('select by subtask, include independent reviewer and exclude review-only worker guidance',()=>{
 for(const [task,expected] of [
 ['Исправить CI TypeScript ошибку на PR','ci-root-cause'],
 ['Проверить Vercel деплой на лив','live-verifier'],
 ['Мобильный UI на iPhone Safari','mobile-ui'],
 ['Telegram бот не отвечает','telegram-bot'],
 ['Собрать Skills Hub каталог','skills-curator']
 ]){
  const list=loader.select(task);assert.equal(list.length,4);
  assert.deepEqual(list.map(s=>s.id).filter(x=>['task-architect','context-assembler','independent-reviewer'].includes(x)),['task-architect','context-assembler','independent-reviewer']);
  assert.ok(list.some(s=>s.id===expected),task);
  assert.ok(list.every(s=>s.status==='curated'));
 }
});
test('resolver emits full instructions from repository, not from network or model',()=>{
 const result=loader.resolve('Проверить сайт после деплоя на live');
 assert.equal(result.schema,'HH_COMMANDER_SKILLS_NATIVE_V1');
 assert.equal(result.executed,false);assert.equal(result.sourceSha,null);
 assert.equal(result.selected.length,4);
 assert.ok(result.selected.every(s=>s.path.startsWith('.agents/skills/')));
 assert.ok(result.selected.some(s=>s.id==='live-verifier'));
 assert.ok(result.selected.every(s=>s.text.includes('SKILL.md')||s.text.includes('## Когда подключать')));
});
test('reject blank, oversized, invalid tasks, do not auto-promote review-only',()=>{
 for(const s of ['', 'тест','x'.repeat(2501)])assert.throws(()=>loader.select(s));
 assert.ok(!loader.select('ESLint lint autofix').some(s=>s.status==='review_only'));
 assert.match(fs.readFileSync(path.join(home,'README.md'),'utf8'),/no tool permissions|not.*grant|does \*\*not\*\*/i);
});
