'use client';
import {useEffect,useState} from 'react';
import {SITE_OWNER_AVATARS,isSiteOwnerAvatarId} from '@/lib/coaching/site-owner-avatar-presets.mjs';

const L={
  en:{title:'Site avatars',intro:'Eight existing five-second coach animations. Removing one here does not affect the website.',calm:'Calm',attentive:'Attentive',hide:'Remove from my cabinet',restore:'Restore to cabinet',show:'Show removed',close:'Hide removed',download:'Download MP4',empty:'No site avatars visible.',error:'Avatar list could not be updated.',notice:'Only your personal list changes. Public site videos and other accounts are unaffected.'},
  ru:{title:'Наши аватары сайта',intro:'Восемь готовых пятисекундных анимаций коучей. Удаление из кабинета не затрагивает сайт.',calm:'Спокойный',attentive:'Внимательный',hide:'Убрать из моего кабинета',restore:'Вернуть в кабинет',show:'Показать убранные',close:'Скрыть убранные',download:'Скачать MP4',empty:'Нет видимых аватаров сайта.',error:'Не удалось обновить список аватаров.',notice:'Меняется только ваш список в кабинете. Публичные ролики и кабинеты других людей не затрагиваются.'},
  es:{title:'Avatares del sitio',intro:'Ocho animaciones de cinco segundos ya creadas. Quitarlas aquí no afecta al sitio web.',calm:'Sereno',attentive:'Atento',hide:'Quitar de mi cuenta',restore:'Restaurar',show:'Mostrar ocultos',close:'Ocultar eliminados',download:'Descargar MP4',empty:'No hay avatares visibles.',error:'No se pudo actualizar la lista.',notice:'Solo cambia tu lista privada. Los vídeos públicos y otras cuentas no se modifican.'},
};
const frame={padding:14,margin:'16px 0',border:'1px solid #e9dfd1',borderRadius:20,background:'#fffcf7',color:'#143d3a'};
const button={minHeight:44,padding:'8px 12px',borderRadius:12,border:'1px solid #b2c8c2',background:'#fff',color:'#143d3a',fontSize:14,fontWeight:650};
export default function SiteOwnerAvatarGallery({locale='en'}){
  const t=L[locale]||L.en;
  const [state,setState]=useState('loading');
  const [hidden,setHidden]=useState([]);
  const [showHidden,setShowHidden]=useState(false);
  const [busy,setBusy]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let mounted=true;
    fetch('/api/app/site-avatar-visibility',{credentials:'same-origin',cache:'no-store'})
      .then(async response=>{
        if(response.status===401||response.status===403)return {notOwner:true};
        if(!response.ok)throw Error('UNAVAILABLE');
        return response.json();
      }).then(result=>{
        if(!mounted)return;
        if(result.notOwner){setState('not-owner');return;}
        setHidden(Array.isArray(result.hiddenIds)?result.hiddenIds.filter(isSiteOwnerAvatarId):[]);
        setState('ready');
      }).catch(()=>{if(mounted)setState('error');});
    return()=>{mounted=false;};
  },[]);
  async function setVisibility(id,action){
    if(busy||!isSiteOwnerAvatarId(id))return;
    setBusy(id);setError('');
    try{
      const response=await fetch('/api/app/site-avatar-visibility',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action}),
      });
      if(!response.ok)throw Error('CHANGE_FAILED');
      setHidden(previous=>action==='hide'?[...new Set([...previous,id])]:previous.filter(value=>value!==id));
    }catch{setError(t.error);}finally{setBusy(null);}
  }
  if(state==='not-owner')return null;
  const displayed=SITE_OWNER_AVATARS.filter(item=>showHidden||!hidden.includes(item.id));
  return <section data-site-owner-avatar-gallery aria-label={t.title} style={frame}>
    <h3 style={{fontSize:22,margin:'0 0 7px'}}>{t.title}</h3>
    <p style={{fontSize:15,lineHeight:1.45,margin:'0 0 12px'}}>{t.intro}</p>
    {state==='error'&&<p role="alert">{t.error}</p>}
    {state==='ready'&&<>
      {hidden.length>0&&<button type="button" aria-pressed={showHidden} style={{...button,marginBottom:12}}
        onClick={()=>setShowHidden(value=>!value)}>{showHidden?t.close:t.show+' ('+hidden.length+')'}</button>}
      {!displayed.length&&<p>{t.empty}</p>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,170px),1fr))',gap:12}}>
        {displayed.map(item=>{
          const removed=hidden.includes(item.id);
          return <article key={item.id} data-site-avatar-id={item.id}
            style={{minWidth:0,padding:10,border:'1px solid #e9dfd1',borderRadius:16,background:removed?'#f5ecdc':'#fff'}}>
            <video src={item.video} poster={item.poster} controls playsInline preload="none"
              aria-label={(item.names[locale]||item.names.en)+' — '+t[item.take]}
              style={{width:'100%',aspectRatio:'3/4',objectFit:'cover',borderRadius:12,background:'#f5ecdc'}}/>
            <strong style={{display:'block',fontSize:18,marginTop:7}}>{item.names[locale]||item.names.en}</strong>
            <p style={{fontSize:14,margin:'2px 0 8px'}}>{t[item.take]}</p>
            <a href={item.video} download style={{display:'inline-flex',alignItems:'center',minHeight:44,color:'#067a67',fontWeight:700}}>{t.download}</a>
            <button type="button" disabled={busy!==null} style={{...button,width:'100%',background:removed?'#e6f6f1':'#fffcf7'}}
              onClick={()=>void setVisibility(item.id,removed?'restore':'hide')}>{removed?t.restore:t.hide}</button>
          </article>;
        })}
      </div>
      <p style={{fontSize:13,color:'#5d6a71',lineHeight:1.4,margin:'12px 0 0'}}>{t.notice}</p>
    </>}
    {error&&<p role="alert" style={{color:'#9b2930'}}>{error}</p>}
  </section>;
}
