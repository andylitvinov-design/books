import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const catalog=JSON.parse(src('skills-library.json'));
test('catalog is valid, unique and has review-only legacy recipes',()=>{
 assert.equal(catalog.schema,'HH_COMMANDER_SKILLS_V1');assert.equal(catalog.skills.length,30);
 assert.equal(new Set(catalog.skills.map(s=>s.id)).size,30);
 assert.equal(catalog.skills.filter(s=>s.status==='review_only').length,3);
 for(const s of catalog.skills){assert.match(s.id,/^[a-z][a-z0-9-]+$/);assert.ok(s.steps.length>=3);assert.ok(s.proof.length>10)}
});
test('skill engine routes specific tasks to appropriate specialties and does not auto choose review-only',()=>{
 const c={fetch:async()=>({ok:true,json:async()=>catalog}),globalThis:null};c.globalThis=c;
 vm.runInNewContext(src('commander-skills.js'),c);
 const api=c.HHCommanderSkills;
 for(const [text,id] of [['Исправить CI TypeScript ошибку на PR','ci-root-cause'],['Проверить деплой на лив Vercel','live-verifier'],['Мобильный UI iPhone','mobile-ui'],['Telegram бот отвечает на китайском','telegram-bot']]){
  const skills=api.recommend(catalog.skills,text);
  assert.ok(skills.some(x=>x.id===id),text);
  assert.ok(skills.every(x=>x.status==='curated'));
 }
 assert.match(api.markdown(catalog.skills[0]),/SKILL.md|Процедура/);
});
test('owner task intake preserves four sections and receives skill selection without API writes',()=>{
 const intake=src('commander-task-input.js'),nav=src('project-management-nav.js');
 assert.match(intake,/HHCommanderSkills/);assert.match(intake,/Разобрать задачу/);
 assert.match(intake,/1. ЧТО НАДО ВЫПОЛНИТЬ/);assert.match(nav,/commander-skills\.js/);
 assert.doesNotMatch(src('commander-skills.js'),/workflow_dispatch|service_role|fetch\(['"]https:/);
});
test('skill hub is accessible from Agents and PM and retains fixed dock',()=>{
 assert.match(src('skills.html'),/hh-skills-hub/);assert.match(src('agents.html'),/commander-ui/);
 assert.match(src('commander-ui.js'),/skills\.html/);
 assert.match(src('project-management-nav.js'),/Главная/);assert.match(src('project-management-nav.js'),/Проекты/);
 assert.match(src('commander-skills.js'),/selectedTaskShortcut/);
});
