"use client";
import {useState} from "react";
type Scene={id:string;sceneNumber:number;status:string;submitted:boolean;sourceVerified:boolean};
type Order={id:string;tier:string;theme:string;locale:string;status:string;revision:number;
  amountMinor:number;currency:string;accountId:string;aiSeconds:number;aspectRatio:string;scenes:Scene[]};
type Snapshot={orders:Order[];providerReady:boolean;receiptReviewEnabled:boolean};
export function PaidVideoOrderAdmin({enabled}:{enabled:boolean}){
 const [data,setData]=useState<Snapshot>({orders:[],providerReady:false,receiptReviewEnabled:false});
 const [loaded,setLoaded]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [receipts,setReceipts]=useState<Record<string,string>>({});
 const [accepted,setAccepted]=useState<Record<string,boolean>>({});
 const [videoIds,setVideoIds]=useState<Record<string,string>>({});
 const [qaHashes,setQaHashes]=useState<Record<string,string>>({});
 async function load(){
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/admin/videos/paid-orders",{cache:"no-store"});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"UNAVAILABLE");
   setData(body);setLoaded(true);
  }catch(e){setError(String((e as Error).message))}
  finally{setBusy(false)}
 }
 async function act(body:Record<string,unknown>){
  if(busy)return;setBusy(true);setError("");
  try{
   const response=await fetch("/api/admin/videos/paid-orders",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body),
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"UNAVAILABLE");
   if(result.status==="unknown")setError("Provider outcome UNKNOWN; reconcile in Google Cloud before any retry.");
  }catch(e){setError(String((e as Error).message))}
  finally{setBusy(false)}
  await load();
 }
 if(!enabled)return null;
 return <section className="site-video-review-entry" style={{display:"block",padding:16,marginBlock:16}}
   data-paid-video-admin aria-label="Paid Video Studio orders">
   <h2 style={{fontWeight:700}}>Платные видео · заказы Extra / PRO</h2>
   <p>Здесь только проверенные заказы. PayPal.Me не подтверждает перевод автоматически.
     AI-генерация требует отдельного разрешения на каждый кадр. Никакой публикации на YouTube.</p>
   <button type="button" onClick={()=>void load()} disabled={busy}>{busy?"…":"Проверить заказы"}</button>
   {error?<p role="alert">{error}</p>:null}
   {loaded&&data.orders.length===0?<p role="status">Заказов пока нет.</p>:null}
   {data.orders.map(order=><article key={order.id} style={{borderTop:"1px solid #cbd5e1",marginTop:12,paddingTop:10}}>
    <strong>{order.tier.toUpperCase()} · €{(order.amountMinor/100).toFixed(2)} · {order.status}</strong>
    <p style={{fontSize:12,overflowWrap:"anywhere"}}>ID {order.id} · account {order.accountId} · {order.theme} · {order.aspectRatio}</p>
    {order.status==="requested"&&<div style={{marginBlock:8}}>
      <label style={{display:"block"}}>Проверенный номер PayPal
       <input style={{display:"block",maxWidth:320,width:"100%",padding:7}}
        autoComplete="off" value={receipts[order.id]||""}
        onChange={e=>setReceipts({...receipts,[order.id]:e.target.value})}/></label>
      <label style={{display:"block",fontSize:13}}>
       <input type="checkbox" checked={!!accepted[order.id]}
        onChange={e=>setAccepted({...accepted,[order.id]:e.target.checked})}/>
       Я проверил поступление непосредственно у получателя, сумму EUR и уникальный transaction ID</label>
      <button type="button" disabled={busy||!data.receiptReviewEnabled||!accepted[order.id]||!(receipts[order.id]||"").trim()}
       onClick={()=>void act({action:"verify",orderId:order.id,expectedRevision:order.revision,
         amountMinor:order.amountMinor,receiptSource:"paypal_transaction",
         receiptReference:receipts[order.id],confirmed:true})}>Подтвердить проверенный платёж</button>
    </div>}
    {["payment_verified","generating"].includes(order.status)&&<div style={{marginBlock:9}}>
      {!data.providerReady?<p>Veo платно выключен: нужны проверенная цена, ключи и лимит.</p>:null}
      {Array.from({length:order.aiSeconds/6},(_,i)=>i+1).map(sceneNumber=>
       <button key={sceneNumber} type="button" disabled={busy||!data.providerReady||
        order.scenes.some(scene=>scene.sceneNumber===sceneNumber)}
        onClick={()=>void act({action:"submit",orderId:order.id,sceneNumber,
         approvedMaxUsdCents:30,confirmed:true})}>
        Подтверждаю $0.30 · сцена {sceneNumber}</button>)}
    </div>}
    {order.scenes.map(scene=><p key={scene.id} style={{fontSize:13}}>
      Сцена {scene.sceneNumber}: {scene.status} {scene.sourceVerified?"· source found":""}
      {["pending","in_progress"].includes(scene.status)&&
       <button type="button" disabled={busy||!data.providerReady}
        onClick={()=>void act({action:"check",jobId:scene.id})}>Проверить</button>}
    </p>)}
    {order.status==="qa_pending"&&<div style={{marginBlock:10}}>
     <p>Сначала скачайте исходные кадры с защищённого Google Cloud, соберите настоящий 30s MP4,
      проверьте движение/звук/субтитры и сохраните в приватные My Videos этого клиента.</p>
     <label>Подтверждённый private video ID
      <input style={{display:"block",width:"100%"}} value={videoIds[order.id]||""}
       onChange={e=>setVideoIds({...videoIds,[order.id]:e.target.value})}/></label>
     <label>SHA-256 протокола QA
      <input style={{display:"block",width:"100%"}} value={qaHashes[order.id]||""}
       onChange={e=>setQaHashes({...qaHashes,[order.id]:e.target.value})}/></label>
     <button type="button" disabled={busy||!videoIds[order.id]||!qaHashes[order.id]}
      onClick={()=>void act({action:"deliver",orderId:order.id,personalVideoId:videoIds[order.id],
       qaManifestSha256:qaHashes[order.id],qaApproved:true})}>Подтвердить готовый MP4 и выдать</button>
    </div>}
   </article>)}
 </section>;
}