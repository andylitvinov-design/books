import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('standalone root opens PR monitor; briefing retained on own route',()=>{
 assert.match(src('index.html'),/url=\/pr-monitor\.html/);
 assert.match(src('briefing.html'),/data-view="home"/);
 assert.match(src('pr-monitor.html'),/pr-two-screen-boot\.js/);
 assert.doesNotMatch(src('index.html'),/pr-two-screen-boot\.js/);
});
test('one seven-action dock is loaded for public Commander and PM views',()=>{
 const nav=src('project-management-nav.js'),css=src('commander-shell.css');
 for(const item of ['Главная','PR','Задачи','Создать','Агенты','Чат','Проекты'])assert.ok(nav.includes(item),item);
 assert.match(nav,/monitor:'\/pr-monitor\.html',chats:'\/chats\.html'/);
 assert.match(nav,/\[\['home','Главная'\],\['monitor','PR'\],\['tasks','Задачи'\],\['add','Создать'\],\['agents','Агенты'\],\['chats','Чат'\],\['projects','Проекты'\]\]/);
 assert.match(nav,/location\.pathname===paths\.monitor\?'monitor':location\.pathname===paths\.chats\?'chats'/);
 assert.match(css,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
 assert.match(css,/\.hh-cc-add\{width:clamp\(44px,11\.5vw,51px\)/);
 assert.match(css,/#hh-cc-dock\{position:fixed/);
 for(const [page,view]of [['briefing.html','home'],['agents.html','agents'],['projects.html','projects']]){
  assert.match(src(page),new RegExp('data-view="'+view+'"'));
  assert.match(src(page),/project-management-nav\.js/);
 }
 assert.match(src('project-management-public.html'),/project-management-nav\.js/);
 assert.match(src('pr-two-screen-boot.js'),/20261107-cc-v1/);
});
test('public Commander never pretends to create or launch an executor',()=>{
 const nav=src('project-management-nav.js'),ui=src('commander-ui.js');
 assert.match(nav,/\/task-editor\.html/);
 assert.doesNotMatch(nav,/holistichouse\.vercel\.app\/admin\/command-center/);
 assert.match(nav,/Публичный монитор не сохраняет и не запускает задания/);
 assert.doesNotMatch(nav+ui,/(supabase\.co|service_role|HH_PR_CRON_DISPATCH_TOKEN|POST['"]|workflow_dispatch)/i);
 assert.match(ui,/HH_PM_PUBLIC_V1/);
 assert.match(ui,/cache:'no-store'/);
 assert.doesNotMatch(ui,/setInterval|setTimeout/);
});
test('mobile safe area, PR original HTML and source snapshot remain unchanged',()=>{
 const css=src('commander-shell.css');
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(src('pr-monitor.html'),/legacy\.html/);
 assert.match(src('pr-two-screen-boot.js'),/legacy\.html/);
});

test('task intake can dictate, stop and fall back to iPhone keyboard while retaining editable input',()=>{
 const nav=src('project-management-nav.js'),ui=src('commander-task-input.js'),css=src('commander-shell.css');
 assert.match(nav,/commander-task-input\.js/);
 assert.match(nav,/openLegacyTaskDraft/);
 assert.match(ui,/webkitSpeechRecognition/);
 assert.match(ui,/next\.start\(\)/);
 assert.match(ui,/next\.onresult/);
 assert.match(ui,/voiceEpoch/);
 assert.match(ui,/old\.abort\(\)/);
 assert.match(ui,/клавиатуры/);
 assert.match(ui,/next\.lang=/);
 assert.match(ui,/maxLength=2500/);
 assert.match(css,/\.hh-cc-mic/);
 assert.match(css,/max-height:calc\(100% - 8px\)/);
 assert.match(ui,/visualViewport\.addEventListener\('resize'/);
});
test('local decomposition creates meaningful evidence-oriented, editable plan with source preserved',()=>{
 const {buildTaskBrief}=require('../commander-task-input.js');
 const raw='Добавить микрофон диктовки на iPhone, кнопку разобрать задачу; сохранить навигацию. PR #3864';
 const brief=buildTaskBrief(raw);
 assert.match(brief,/ИСХОДНОЕ ОПИСАНИЕ — ДОСЛОВНО/);
 assert.ok(brief.includes(raw));
 assert.ok(brief.includes('#3864'));
 assert.match(brief,/КРИТЕРИИ ПРИЁМКИ/);
 assert.match(brief,/Подзадачи|ПОДЗАДАЧИ/);
 assert.match(brief,/на поддерживаемом устройстве/i);
 assert.match(brief,/MERGED, Vercel READY/);
 assert.equal(buildTaskBrief('коротко'),'');
 const noRefs=buildTaskBrief('Нужна проверка формы в мобильной версии');
 assert.match(noRefs,/Точные ссылки и PR не указаны/);
 assert.doesNotMatch(noRefs,/https:\/\/example\.com/);
});
test('AI task decomposition is owner-only, zero-price and does not save or start agents',async()=>{
 const client=src('commander-task-input.js'),backend=src('api/pm-agent-chat.js');
 assert.match(client,/action=decompose/);
 assert.match(client,/action=status/);
 assert.match(client,/credentials:'same-origin'/);
 assert.match(client,/Без неё разбор локальный/);
 assert.doesNotMatch(client,/service_role|workflow_dispatch|localStorage|sessionStorage/);
 assert.match(backend,/if\(!isOwner\(req\)\)/);
 assert.match(backend,/if\(!correctOrigin\(req\)\)/);
 assert.match(backend,/if\(action==='decompose'\)/);
 assert.match(backend,/ONLY_VERIFIED_FREE_MODEL_IDS/);
 assert.match(backend,/provider:\{allow_fallbacks:false,max_price:\{prompt:0,completion:0\}\}/);
 assert.match(backend,/AI_TASK_PLAN_NOT_EXECUTION/);
 assert.doesNotMatch(client,/api\.github\.com\/repos.*method:'POST'/);
 const handler=require('../api/pm-agent-chat.js');
 const headers={},res={statusCode:200,setHeader(k,v){headers[k]=v},end(data){this.body=JSON.parse(data)}};
 await handler({method:'POST',url:'/api/pm-agent-chat?action=decompose',
  headers:{host:'holistic-house-pr-monitor.vercel.app',origin:'https://holistic-house-pr-monitor.vercel.app'},
  body:{message:'Добавить микрофон и разбор задачи'}},res);
 assert.equal(res.statusCode,401);assert.equal(res.body.error,'OWNER_SESSION_REQUIRED');
 assert.equal(headers['Cache-Control'],'private, no-store, max-age=0');
});

test('task processing yields all four mandatory prompt blocks with real public context and source benchmarks',()=>{
 const {buildTaskBrief}=require('../commander-task-input.js');
 const text='Добавить микрофон и разбор задачи в Agent Commander на iPhone Safari';
 const prompt=buildTaskBrief(text);
 for(const heading of ['1. ЧТО НАДО ВЫПОЛНИТЬ','2. КАКОЙ РЕЗУЛЬТАТ СЧИТАЕТСЯ ХОРОШИМ',
  '3. ОРИЕНТИРЫ КАЧЕСТВА','4. КОНТЕКСТ БИЗНЕСА И ПРОЕКТА'])assert.ok(prompt.includes(heading),heading);
 assert.match(prompt,/Linear/);
 assert.match(prompt,/Apple Dictation/);
 assert.match(prompt,/https:\/\/holistic-house-pr-monitor\.vercel\.app/);
 assert.match(prompt,/https:\/\/holistichouse\.vercel\.app/);
 assert.match(prompt,/https:\/\/github\.com\/andylitvinov-design\/books/);
 assert.match(prompt,/Точный физический адрес.*не подтверждён/);
 assert.ok(prompt.includes(text));
 assert.ok(prompt.length<=8500);
 assert.match(buildTaskBrief('Добавить монтаж видео в Video Studio'),/Canva Video Editor/);
 assert.match(buildTaskBrief('Улучшить каталог услуг и тесты для клиентов'),/Notion AI/);
});
test('AI enhancement can only append suggestions after four trusted sections',()=>{
 const client=src('commander-task-input.js'),api=src('api/pm-agent-chat.js');
 assert.match(api,/const \{buildTaskBrief\}=require/);
 assert.match(api,/base\+marker\+answer\.reply/);
 assert.match(api,/8\. ДОПОЛНЕНИЯ ИИ/);
 assert.match(api,/model\.endsWith\(':free'\)/);
 assert.match(client,/output\.value!==localBrief/);
 assert.match(client,/Копировать описание \/ промпт/);
 assert.match(client,/Готовый промпт для исполнителя/);
});

test('executor prompt includes all separately requested actions, keeps product-specific context',()=>{
 const {buildTaskBrief}=require('../commander-task-input.js');
 const prompt=buildTaskBrief('Добавь диктовку и разбор задачи в Agent Commander');
 assert.match(prompt,/Добавить кнопку микрофона/);
 assert.match(prompt,/Преобразовать свободное описание в проверяемые подзадачи/);
 assert.match(prompt,/holistic-house-pr-monitor\.vercel\.app/);
 const video=buildTaskBrief('Реализуй задачу монтажа ролика в Video Studio');
 assert.match(video,/Canva Video Editor/);
 assert.doesNotMatch(video,/Проект: отдельный Agent Commander/);
 const raw='Тесты каталога на Holistic House без изменения клиентского кабинета';
 const normal=buildTaskBrief(raw);
 assert.match(normal,/Проект: основной Holistic House/);
 assert.ok(normal.includes(raw));
});

test('exactly seven mobile dock actions; automation stays available in header menu',()=>{
 const nav=src('project-management-nav.js'),css=src('commander-shell.css');
 assert.match(nav,/\['Автоматизации · Cron Jobs',paths\.automations\]/);
 assert.doesNotMatch(nav,/\['automations','Авто'\]/);
 assert.match(nav,/\['agents','Агенты'\],\['chats','Чат'\]/);
 assert.match(css,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
});
