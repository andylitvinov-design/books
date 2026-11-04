'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
type Preview={status:string;planHash:string;shot:string;visualPrompt:string;imagesCreated:number;costIncurred:boolean};
const options={
  theme:[['energy','Энергия'],['money','Работа и деньги'],['relationships','Отношения'],['goals','Цели'],['life','Жизнь'],['health','Покой']],
  style:[['warm','Золотой час'],['nature','Природа'],['dream','Сновидение'],['minimal','Минимализм']],
  aspect:[['portrait','Вертикальный'],['landscape','Горизонтальный'],['square','Квадратный']],
} as const;
export function GptImageOwnerPanel(){
  const [theme,setTheme]=useState('energy');
  const [style,setStyle]=useState('warm');
  const [aspect,setAspect]=useState('portrait');
  const [status,setStatus]=useState('');
  const [ready,setReady]=useState(false);
  const [preview,setPreview]=useState<Preview|null>(null);
  const [url,setUrl]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [approved,setApproved]=useState(false);
  useEffect(()=>{let active=true;fetch('/api/admin/gpt-image',{cache:'no-store'})
    .then(r=>r.ok?r.json():null).then(x=>{if(active)setReady(x?.enabled===true);})
    .catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  async function run(dryRun:boolean){
    if(busy)return;
    if(!dryRun&&(!ready||!approved))return;
    setBusy(true);setStatus('');if(!dryRun)setUrl(null);
    try{
      const response=await fetch('/api/admin/gpt-image',{method:'POST',
        credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({theme,style,aspect,locale:'ru',durationSeconds:30,
          avoidMotifs:[],dryRun,paidApproved:!dryRun&&approved})});
      if(!response.ok){const body=await response.json().catch(()=>({}));
        throw Error(body.error||'Генерация недоступна');}
      if(dryRun){setPreview(await response.json());setStatus('Без платного API: визуальный бриф подготовлен');}
      else{
        const blob=await response.blob();if(blob.type!=='image/jpeg')throw Error('Invalid image response');
        const objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
        setStatus('Реальный JPEG готов. Сохраните его на устройство, затем используйте в видеосборке.');
      }
    }catch(e){setStatus(e instanceof Error?e.message:'Ошибка запроса');}
    finally{setBusy(false);}
  }
  const select=(key:keyof typeof options,value:string,onChange:(v:string)=>void)=>
    <label key={key} style={{display:'grid',gap:6,marginBottom:12}}>
      {key==='theme'?'Тема':key==='style'?'Стиль':'Формат'}
      <select value={value} onChange={e=>onChange(e.target.value)} style={{padding:10,border:'1px solid #999',borderRadius:8}}>
        {options[key].map(([id,label])=><option key={id} value={id}>{label}</option>)}
      </select>
    </label>;
  return <section style={{border:'1px solid #ddd',borderRadius:12,padding:20,marginTop:20}}>
    {select('theme',theme,setTheme)}{select('style',style,setStyle)}{select('aspect',aspect,setAspect)}
    <button type='button' disabled={busy} onClick={()=>void run(true)} style={{padding:12,marginRight:12}}>
      {busy?'Проверяем…':'Показать безопасный промпт бесплатно'}
    </button>
    {preview&&<div style={{marginTop:16}}><p>Сцена: {preview.shot}</p>
      <p style={{whiteSpace:'pre-wrap',fontSize:14}}>{preview.visualPrompt}</p></div>}
    <hr style={{margin:'20px 0'}}/>
    <label style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:12}}>
      <input type='checkbox' checked={approved} onChange={e=>setApproved(e.target.checked)} />
      <span>Я понимаю, что OpenAI может списать реальные деньги за одну генерацию, и разрешаю один тестовый вызов.</span>
    </label>
    <button type='button' disabled={busy||!ready||!approved} onClick={()=>void run(false)} style={{padding:12}}>
      Сгенерировать один JPEG через OpenAI
    </button>
    {!ready&&<p>Платная генерация отключена администратором до настройки API-ключа, лимита и разрешения затрат.</p>}
    {url&&<p><a href={url} download='holistic-gpt-image.jpg'>Скачать готовый JPEG</a></p>}
    {url&&<Image unoptimized src={url} width={512} height={768} alt='Сгенерированная кинематографическая сцена' style={{maxWidth:'100%',height:'auto',marginTop:12}}/>}
    {status&&<p aria-live='polite' style={{marginTop:12}}>{status}</p>}
  </section>;
}