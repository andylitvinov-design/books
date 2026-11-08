'use strict';
/* Owner-auth screen enhancer. An existing owner session is always checked first
 * by each page. Google One Tap and its button appear only after a real 401.
 * No password is required on the normal owner journey.
 */
(function(win,doc){
 const ENDPOINT='/api/google-owner-auth';
 let sdkPromise=null;
 const message=(slot,text)=>{
  let node=slot.querySelector('[data-hh-sso-status]');
  if(!node){node=doc.createElement('p');node.className='hh-sso-status';node.setAttribute('data-hh-sso-status','');node.setAttribute('role','status');slot.append(node);}
  node.textContent=text;
 };
 function sdk(){
  if(win.google?.accounts?.id)return Promise.resolve();
  if(sdkPromise)return sdkPromise;
  sdkPromise=new Promise((resolve,reject)=>{
   const script=doc.createElement('script');script.src='https://accounts.google.com/gsi/client';
   script.async=true;script.defer=true;script.referrerPolicy='strict-origin-when-cross-origin';
   const timer=win.setTimeout(()=>reject(Error('GOOGLE_SIGN_IN_UNAVAILABLE')),12000);
   script.onload=()=>{win.clearTimeout(timer);win.google?.accounts?.id?resolve():reject(Error('GOOGLE_SIGN_IN_UNAVAILABLE'))};
   script.onerror=()=>{win.clearTimeout(timer);reject(Error('GOOGLE_SIGN_IN_UNAVAILABLE'))};
   doc.head.append(script);
  });
  return sdkPromise;
 }
 async function mount(slot,onStatus){
  if(!slot||slot.dataset.hhSsoMounted==='yes')return;
  slot.dataset.hhSsoMounted='yes';
  slot.classList.add('hh-sso-slot');
  const status=s=>{message(slot,s);if(typeof onStatus==='function')onStatus(s)};
  status('Проверяю вход через Google…');
  try{
   const resp=await win.fetch(ENDPOINT+'?return='+encodeURIComponent(win.location.pathname),{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json'}});
   if(!resp.ok)throw Error(resp.status===503?'GOOGLE_SSO_NOT_CONFIGURED':'GOOGLE_SSO_UNAVAILABLE');
   const config=await resp.json();
   if(!/^[A-Za-z0-9_-]{32}$/.test(config.nonce||'')||typeof config.clientId!=='string')throw Error('GOOGLE_SSO_UNAVAILABLE');
   await sdk();
   const button=doc.createElement('div');button.className='hh-sso-button';slot.prepend(button);
   let busy=false;
   const isiOS=/iPad|iPhone|iPod/i.test(win.navigator?.userAgent||'')||
     (win.navigator?.platform==='MacIntel'&&win.navigator?.maxTouchPoints>1);
   win.google.accounts.id.initialize({
    client_id:config.clientId,nonce:config.nonce,auto_select:!isiOS,itp_support:true,
    ...(isiOS?{ux_mode:'redirect',login_uri:win.location.origin+ENDPOINT}:{}),
    callback:async result=>{
     if(busy||!result?.credential)return;
     busy=true;status('Подтверждаю аккаунт владельца…');
     try{
      const r=await win.fetch(ENDPOINT,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
       headers:{'Content-Type':'application/json',Accept:'application/json'},
       body:JSON.stringify({credential:result.credential})});
      const data=await r.json();
      if(!r.ok||data.authenticated!==true)throw Error('GOOGLE_OWNER_NOT_VERIFIED');
      status('Вход подтверждён. Открываю рабочее пространство…');
      win.location.reload();
     }catch(e){busy=false;status('Google не подтвердил доступ владельца. Проверьте выбранный аккаунт или резервный вход.');}
    }
   });
   win.google.accounts.id.renderButton(button,{type:'standard',theme:'filled_black',shape:'pill',size:'large',text:'continue_with',logo_alignment:'left',width:260});
   status('Продолжить через Google · без отдельного пароля PR Monitor.');
   win.google.accounts.id.prompt();
  }catch(e){
   status(e.message==='GOOGLE_SSO_NOT_CONFIGURED'?
    'Google-вход на PR Monitor пока не настроен. Резервный вход доступен ниже.':
    'Google-вход сейчас недоступен. Резервный вход доступен ниже.');
  }
 }
 win.HHGoogleOwnerSSO={mount};
})(window,document);
