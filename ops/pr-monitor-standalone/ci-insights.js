'use strict';
(()=>{
 const mount=document.getElementById('diagnostics-mount');if(!mount)return;
 const original=document.createElement('script');original.src='/ci-insights-original.js';original.async=false;
 document.head.append(original);
 const launch=document.createElement('section');launch.className='hc-deep-card hh-preflight-lazy';launch.id='hh-preflight-launch';
 const title=document.createElement('div');title.className='hc-deep-title';
 const header=document.createElement('h2');header.textContent='Source Preflight · подробная проверка';
 const button=document.createElement('button');button.type='button';button.textContent='Проверить вручную';
 button.setAttribute('aria-label','Запустить дополнительную GitHub API проверку исходного кода');
 const caption=document.createElement('p');caption.className='hc-deep-foot';
 caption.textContent='Для экономии GitHub API подробная Source Preflight не запускается при каждом открытии монитора. Нажмите, если нужен свежий точечный анализ.';
 title.append(header,button);launch.append(title,caption);
 const place=()=>{const prior=document.getElementById('hh-ci-deep-suite');if(prior)prior.insertAdjacentElement('afterend',launch);else mount.append(launch)};
 original.addEventListener('load',place,{once:true});original.addEventListener('error',place,{once:true});
 let busy=false;
 button.addEventListener('click',()=>{
  if(busy)return;busy=true;button.disabled=true;button.textContent='Запускаю проверку…';
  const style=document.createElement('link');style.rel='stylesheet';style.href='/source-preflight.css';document.head.append(style);
  const script=document.createElement('script');script.src='/source-preflight.js';script.async=false;
  script.addEventListener('load',()=>{launch.remove()},{once:true});
  script.addEventListener('error',()=>{busy=false;button.disabled=false;button.textContent='Повторить';caption.textContent='Source Preflight временно недоступен; другие показатели сохранены.'},{once:true});
  document.head.append(script);
 });
})();