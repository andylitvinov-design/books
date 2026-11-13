'use strict';
/* Public technical GitHub owner-command bridge for existing HH PR Repair Worker.
 * Does not post to GitHub, use Vercel secrets, or claim agent execution.
 * This page is owner-authenticated by the containing editor. Public issue
 * text must be explicitly reviewed before the owner posts it in GitHub.
 */
(function(win,doc){
 const WORKFLOW='https://github.com/andylitvinov-design/books/actions/workflows/hh-pr-repair-worker.yml';
 const INBOX='https://github.com/andylitvinov-design/books/issues/3890';
 const GH='https://api.github.com/repos/andylitvinov-design/books';
 const PATH=/^(?:app|components|lib|scripts)\/(?:[A-Za-z0-9_()\[\].-]+\/)*[A-Za-z0-9_.-]+\.(?:cjs|mjs|js|jsx|ts|tsx)$/;
 const SENSITIVE=/(^|[\/_.-])(?:api|auth|security|privacy|private|payment|billing|checkout|rls|secret|token|consent|crm|messenger|messages|client|contact|email|phone|order|booking|consultation|session|storage|health|admin|account|profile|wallet|migration|supabase|ci)(?=$|[\/_.-])/i;
 const SECRET=/(?:github_pat_|ghp_|sk-[A-Za-z0-9_-]{18,}|-----BEGIN [^-]*PRIVATE KEY|authorization\s*:\s*bearer|api[_-]?key\s*[:=])/i;
 const SHA=/^[0-9a-f]{40}$/i;
 const q=id=>doc?.getElementById('ac-'+id);
 function safeSourcePath(path){
  return typeof path==='string'&&path.length<=230&&PATH.test(path)&&
   !path.includes('..')&&!path.includes('//')&&!SENSITIVE.test(path)&&
   !path.startsWith('components/app/')&&!path.startsWith('lib/practitioners/')&&
   (!path.startsWith('scripts/')||path.startsWith('scripts/verify-'));
 }
 function validate(args){
  const title=String(args?.title||'').trim(),path=String(args?.path||'').trim();
  const mode=String(args?.mode||''),base=String(args?.base||'');
  if(!args?.approved)throw Error('Подтвердите, что все технические данные можно опубликовать в GitHub.');
  if(title.length<8||title.length>100||/[\x00-\x1f]/.test(title))throw Error('Название: от 8 до 100 символов, без переводов строк.');
  if(!safeSourcePath(path))throw Error('Недопустимый файл: защищённые пути и изменения нескольких файлов запрещены.');
  if(!['codex/bootstrap-books','codex/public-book-library'].includes(base))throw Error('Неизвестная целевая ветка.');
  if(!SHA.test(args?.sha||''))throw Error('Точный GitHub SHA не проверен.');
  if(!['literal','free_ai'].includes(mode))throw Error('Неизвестный режим изменения кода.');
  const task={task_id:String(args?.taskId||''),target_base:base,expected_base_sha:args.sha,
   path,title,mode,public_technical_only:true};
  if(!/^[a-z0-9][a-z0-9_-]{7,63}$/.test(task.task_id))throw Error('Неверный идентификатор задачи.');
  if(mode==='literal'){
   if(typeof args.find!=='string'||typeof args.replace!=='string'||
     !args.find||!args.replace||args.find===args.replace||
     args.find.length>7000||args.replace.length>7000)
    throw Error('Нужны два разных точных фрагмента исходного кода.');
   task.find=args.find;task.replace=args.replace;
  }else{
   const instruction=String(args.instruction||'').trim();
   if(instruction.length<15||instruction.length>3500)throw Error('Публичная техническая инструкция: 15–3500 символов.');
   task.instruction=instruction;
  }
  const raw=JSON.stringify(task);
  if(raw.length>2800)throw Error('Техническая команда слишком велика для защищённого канала.');
  if(SECRET.test(raw))throw Error('В данных обнаружен возможный ключ или пароль. Публикация заблокирована.');
  return task;
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={validate,safeSourcePath};
 if(!doc||!q('source-prepare'))return;
 let prepared=null,branch=null;
 const value=id=>q(id)?.value||'';
 const status=msg=>{q('source-status').textContent=msg};
 const hideProof=()=>{q('source-proof').textContent='Подтверждённого PR ещё нет.';q('source-pr-link').hidden=true};
 function invalidate(){
  prepared=null;branch=null;q('source-command').value='';q('source-copy').disabled=true;
  q('source-check').disabled=true;hideProof();status('Изменения ещё не подготовлены для публичной технической команды.');
 }
 function modeChange(){
  const ai=value('source-code-mode')==='free_ai';
  q('source-literal').hidden=ai;q('source-ai').hidden=!ai;invalidate();
 }
 const hex=buffer=>Array.from(new Uint8Array(buffer)).map(x=>x.toString(16).padStart(2,'0')).join('');
 async function hash(value){
  if(!win.crypto?.subtle||!win.TextEncoder)throw Error('Безопасная криптография браузера недоступна.');
  return hex(await win.crypto.subtle.digest('SHA-256',new win.TextEncoder().encode(value)));
 }
 async function readBaseSha(base){
  const res=await fetch(GH+'/git/ref/heads/'+base,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
  if(!res.ok)throw Error('GitHub не подтвердил текущую ветку: HTTP '+res.status);
  const result=await res.json(),sha=String(result?.object?.sha||'');
  if(!SHA.test(sha)||result.ref!=='refs/heads/'+base)throw Error('GitHub вернул неполную ссылку на ветку.');
  return sha;
 }
 async function prepare(){
  q('source-prepare').disabled=true;invalidate();status('Проверяю текущий SHA GitHub и публичный объём задачи…');
  try{
   const base=value('source-base'),mode=value('source-code-mode'),path=value('source-path').trim();
   const title=value('title').trim(),find=value('source-find'),replacement=value('source-replace');
   const instruction=value('source-instruction'),approved=q('source-approve').checked;
   if(!approved||!safeSourcePath(path))throw Error('Разрешите только публичную техническую задачу и допустимый исходный файл.');
   const sourceIdentity=JSON.stringify({base,title,path,mode,find:mode==='literal'?find:'',
    replace:mode==='literal'?replacement:'',instruction:mode==='free_ai'?instruction:''});
   const taskId='commander_'+(await hash(sourceIdentity)).slice(0,24);
   const sha=await readBaseSha(base);
   const task=validate({taskId,title,path,base,mode,sha,approved,find,replace:replacement,instruction});
   const raw=JSON.stringify(task);
   const command='!pm source '+raw;
   prepared=task;
   branch='commander/source-'+(await hash(task.task_id)).slice(0,20);
   q('source-command').value=command;q('source-copy').disabled=false;q('source-check').disabled=false;
   status('Готова публичная техническая команда. Скопируйте, прочитайте и самостоятельно разместите как комментарий владельца в Issue #3890. Это ещё НЕ запуск и НЕ commit.');
  }catch(e){status('Не подготовлено: '+String(e.message||e).slice(0,180))}
  finally{q('source-prepare').disabled=false}
 }
 async function copy(){
  if(!prepared)return;
  try{await win.navigator.clipboard.writeText(q('source-command').value);
   status('Команда скопирована. Откройте публичный GitHub Issue #3890 и разместите её только после просмотра.');
  }catch(_){q('source-command').focus();q('source-command').select();status('Команда выделена — скопируйте её вручную.');}
 }
 async function check(){
  if(!prepared||!branch)return;
  q('source-check').disabled=true;hideProof();status('Ищу настоящий PR по детерминированной ветке задачи…');
  try{
   const url=GH+'/pulls?state=all&per_page=20&head='+encodeURIComponent('andylitvinov-design:'+branch);
   const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
   if(!r.ok)throw Error('GitHub HTTP '+r.status);
   const rows=await r.json();if(!Array.isArray(rows))throw Error('Неполная проверка GitHub.');
   const p=rows.find(x=>x.head?.ref===branch&&x.head?.repo?.full_name==='andylitvinov-design/books');
   if(!p){status('PR ещё не подтверждён. Проверяйте CLAIMED/BLOCKED в Issue #3890 и запуск Worker в GitHub Actions.');return}
   const state=p.merged_at?'MERGED (LIVE неизвестен)':p.draft?'DRAFT':p.state==='open'?'OPEN':'CLOSED';
   q('source-proof').textContent='#'+p.number+' · '+state+' · HEAD '+String(p.head?.sha||'').slice(0,12)+
    ' · CI и LIVE здесь не проверены.';
   q('source-pr-link').href='https://github.com/andylitvinov-design/books/pull/'+p.number;
   q('source-pr-link').hidden=false;
   status('Найден настоящий GitHub PR. Далее нужны отдельные CI, merge и LIVE-проверки.');
  }catch(e){status('Проверка PR не удалась: '+String(e.message||e).slice(0,140))}
  finally{q('source-check').disabled=false}
 }
 q('source-mode-note').textContent='Literal не требует AI-ключа. Free AI может быть заблокирован бесплатной квотой. GitHub Actions и публичный канал доступны без Vercel GitHub-токена.';
 q('source-issue-link').href=INBOX;q('source-workflow-link').href=WORKFLOW;
 q('source-code-mode').addEventListener('change',modeChange);
 for(const id of ['source-base','source-path','source-find','source-replace','source-instruction','source-approve','title']){
  const el=q(id);if(el)el.addEventListener(id==='source-base'||id==='source-approve'?'change':'input',invalidate);
 }
 q('source-prepare').addEventListener('click',prepare);
 q('source-copy').addEventListener('click',copy);
 q('source-check').addEventListener('click',check);
 modeChange();
})(typeof window==='undefined'?null:window,typeof document==='undefined'?null:document);