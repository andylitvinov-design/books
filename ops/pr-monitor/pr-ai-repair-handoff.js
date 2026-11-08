'use strict';
/* HH_COMMANDER_AI_REPAIR_HANDOFF_V1
 * Read-only exact PR + trusted Core evidence preflight. Owner authorizes any
 * action by posting a public command to the EXISTING GitHub #3890 inbox.
 * NO GitHub write credential, AI token, model inference or dispatch in browser.
 */
(function(win){
  const GH='https://api.github.com/repos/andylitvinov-design/books';
  const INBOX='https://github.com/andylitvinov-design/books/issues/3890#new_comment_field';
  const OWNER='andylitvinov-design', SHA=/^[0-9a-f]{40}$/i;
  const REPAIR_LABEL='hh:repair-needed';
  const HOLDS=new Set(['hh:hold','hh:blocked','hh:repair-manual','hh:worker-claimed']);
  const NUMBER=/^[1-9]\d{0,7}$/;
  function checkPr(pr,number){
    if(!NUMBER.test(String(number))||!pr||pr.number!==Number(number))return {ok:false,reason:'Идентификатор GitHub PR не подтверждён'};
    if(pr.state!=='open'||pr.draft!==false)return {ok:false,reason:'Автоматический ремонт разрешён только для открытого Ready PR'};
    if(pr.user?.login!==OWNER||pr.head?.repo?.full_name!==OWNER+'/books')
      return {ok:false,reason:'PR не принадлежит доверенному исходному репозиторию'};
    if(pr.base?.ref!=='codex/public-book-library')
      return {ok:false,reason:'Возможен только ремонт PR в защищённую production-ветку'};
    if(!SHA.test(pr.head?.sha||''))return {ok:false,reason:'Точный HEAD SHA не подтверждён'};
    if(pr.mergeable!==true||!['clean','blocked','behind'].includes(pr.mergeable_state))
      return {ok:false,reason:'GitHub не подтвердил допустимый merge / текущий HEAD; проверьте PR или повторите позже'};
    if(!Array.isArray(pr.labels))return {ok:false,reason:'GitHub не подтвердил метки PR'};
    const labels=new Set(pr.labels.map(x=>x?.name).filter(Boolean));
    if(!labels.has(REPAIR_LABEL))return {ok:false,reason:'Нет подтверждённой метки hh:repair-needed для Repair Worker'};
    for(const hold of HOLDS)if(labels.has(hold))return {ok:false,reason:'PR в режиме HOLD / другой владелец: '+hold};
    return {ok:true,number:Number(number),sha:pr.head.sha.toLowerCase()};
  }
  function hasSignedFailedCore(comments,sha){
    if(!Array.isArray(comments)||comments.length>=100||!SHA.test(sha))return false;
    const marker='<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha.toLowerCase()+' -->\n';
    return comments.some(c=>{
      if(c?.user?.id!==41898282||c.user?.login!=='github-actions[bot]'||
        c.user?.type!=='Bot'||c.performed_via_github_app?.id!==15368||
        c.performed_via_github_app?.slug!=='github-actions'||
        typeof c.body!=='string'||!c.body.startsWith(marker))return false;
      const line=c.body.match(/^Failed jobs: ([^\n]+)$/m);
      return !!line&&line[1].split(',').some(x=>x.trim()==='core-lint-types-build');
    });
  }
  function command(number,sha){
    if(!NUMBER.test(String(number))||!SHA.test(sha||''))throw Error('INVALID_PR_HEAD');
    return '!pm repair '+Number(number)+' '+sha.toLowerCase();
  }
  async function getJson(fetcher,url){
    let response;
    try{response=await fetcher(url,{method:'GET',cache:'no-store',redirect:'error',
      credentials:'omit',headers:{Accept:'application/vnd.github+json'}});}
    catch{throw Error('GitHub сейчас недоступен — команда не подготовлена');}
    if(response?.status===403||response?.status===429)throw Error('Лимит GitHub API — повторите позже');
    if(!response?.ok)throw Error('GitHub HTTP '+String(response?.status||'UNKNOWN'));
    try{return await response.json();}catch{throw Error('GitHub вернул неполные данные');}
  }
  async function preflight(number,fetcher){
    if(!NUMBER.test(String(number)))return {ok:false,reason:'Неверный номер PR'};
    const pr=await getJson(fetcher,GH+'/pulls/'+Number(number));
    const gate=checkPr(pr,number);
    if(!gate.ok)return gate;
    // Same FIRST bounded comment page and trusted-app signature as the server.
    const comments=await getJson(fetcher,GH+'/issues/'+Number(number)+'/comments?per_page=100&page=1');
    if(!hasSignedFailedCore(comments,gate.sha))return {ok:false,reason:'Нет подписанного подтверждения RED Core CI для текущего HEAD, или история неполная'};
    return {...gate,command:command(gate.number,gate.sha),inbox:INBOX,
      modelPolicy:'auto: North Mini Code → Flint → Nemotron Ultra → Xing4.0'};
  }

  const api=Object.freeze({checkPr,hasSignedFailedCore,command,preflight});
  if(typeof module==='object'&&module.exports)module.exports=api;
  const doc=win?.document,root=doc?.getElementById('pm-root');
  if(!root)return;
  const tree=doc.getElementById('hh-pr-task-tree');
  const make=(tag,cls,caption)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(caption!==undefined)e.textContent=String(caption);return e;};
  let overlay=null,active=false,scanQueued=false,dialogEpoch=0;
  const name='hh-pr-ai-repair';
  function removeDialog(){dialogEpoch++;if(overlay){overlay.remove();overlay=null;}active=false;}
  function rowButton(host,number){
    if(!NUMBER.test(String(number))||host.querySelector('.'+name+'[data-pr-number="'+number+'"]'))return;
    const btn=make('button',name,'🛠 AI-ремонт');btn.type='button';
    btn.dataset.prNumber=String(number);
    btn.title='Проверить GitHub PR и подготовить команду для доверенного бесплатного Repair Worker';
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();void open(number);});
    host.append(btn);
  }
  function scan(){
    for(const card of root.querySelectorAll('.pm-task')){
      const host=card.querySelector('.pm-pr-inline');if(!host)continue;
      for(const anchor of host.querySelectorAll('a.pm-pr-pill[data-pr-number]'))
        rowButton(host,anchor.dataset.prNumber);
    }
    if(tree)for(const card of tree.querySelectorAll('.hh-pt-pr')){
      const host=card.querySelector('.hh-pt-pr-head');if(!host)continue;
      const href=card.querySelector('a[href*="/pull/"]')?.getAttribute('href')||'';
      const match=/\/pull\/([1-9]\d{0,7})(?:$|[?#])/.exec(href);
      if(match)rowButton(host,match[1]);
    }
  }
  function scheduleScan(){
    if(scanQueued)return;scanQueued=true;
    Promise.resolve().then(()=>{scanQueued=false;scan();});
  }
  async function open(number){
    removeDialog();active=true;const epoch=dialogEpoch;
    overlay=make('div','hh-repair-overlay');
    const pane=make('section','hh-repair-dialog');
    pane.setAttribute('role','dialog');pane.setAttribute('aria-modal','true');
    pane.setAttribute('aria-label','Проверка AI-ремонта PR #'+number);
    const head=make('div','hh-repair-head');
    const title=make('h2',null,'🛠 AI-ремонт PR #'+number);
    const close=make('button','hh-repair-close','✕');close.type='button';
    close.setAttribute('aria-label','Закрыть');close.addEventListener('click',removeDialog);
    head.append(title,close);
    const status=make('p','hh-repair-status','Проверяю GitHub HEAD, метки и подписанную ошибку Core CI…');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const note=make('p','hh-repair-note','Исполнитель: существующий GitHub Repair Worker. Автоматический бесплатный выбор: North Mini Code → Flint → Nemotron Ultra → Xing4.0 (проверка живой цены $0 на Runner). Предпочтение модели в браузере не меняет уже запущенный Worker.');
    const commandLabel=make('label','hh-repair-label','Публичная команда GitHub — ещё НЕ отправлена');
    const field=make('textarea','hh-repair-command');field.rows=3;field.readOnly=true;
    field.setAttribute('aria-label','Точная команда для GitHub Agent Inbox');
    commandLabel.append(field);
    const actions=make('div','hh-repair-actions');
    const copy=make('button','hh-repair-primary','Копировать команду');copy.type='button';copy.disabled=true;
    const link=make('a','hh-repair-link','Открыть GitHub для подтверждения');
    link.href=INBOX;link.target='_blank';link.rel='noopener noreferrer';link.hidden=true;
    actions.append(copy,link);
    const caveat=make('p','hh-repair-note','После вашего комментария GitHub Watchdog может принять задачу. Сервер заново проверит право владельца, текущий HEAD, lease, Core и разрешённость файлов. CLAIMED ≠ исправление, MERGED ≠ LIVE. Секреты и клиентские данные не передаются.');
    pane.append(head,status,note,commandLabel,actions,caveat);
    overlay.append(pane);
    overlay.addEventListener('click',e=>{if(e.target===overlay)removeDialog();});
    doc.body.append(overlay);close.focus();
    copy.addEventListener('click',async()=>{
      if(!field.value)return;
      try{await win.navigator.clipboard.writeText(field.value);status.textContent='Команда скопирована. Разместите её лично в GitHub Issue #3890.';}
      catch{field.focus();field.select();status.textContent='Команда выделена. Скопируйте её вручную в GitHub.';}
    });
    try{
      const result=await preflight(number,win.fetch.bind(win));
      if(!active||!overlay||epoch!==dialogEpoch)return;
      if(!result.ok){status.textContent='Не запускаем: '+result.reason;return;}
      field.value=result.command;copy.disabled=false;link.hidden=false;
      status.textContent='Готово к подтверждению владельцем. PR #'+result.number+
        ' · SHA '+result.sha.slice(0,12)+' · подтверждён RED Core CI. В GitHub отправка выполняется вручную.';
    }catch(e){if(active&&overlay&&epoch===dialogEpoch)status.textContent='Команда заблокирована: '+String(e?.message||'GitHub недоступен').slice(0,180);}
  }
  if(typeof win.MutationObserver==='function'){
    const mo=new win.MutationObserver(scheduleScan);
    mo.observe(root,{subtree:true,childList:true});
    if(tree)mo.observe(tree,{subtree:true,childList:true});
  }
  doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&overlay)removeDialog();});
  scan();
})(typeof window==='undefined'?null:window);
