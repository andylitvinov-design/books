"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import styles from "./monthly-support-owner.module.css";

type Enquiry={id:string;referenceCode:string;createdAt:string};
type Slot={ordinal:number;scheduledAt:string|null;completedAt:string|null};
type Programme={id:string;referenceCode:string;clientAccountId:string;format:string;
  phase:string;revision:number;remainingSessions:number;completedSessions:number;
  startsAt:string;endsAt:string;sessions:Slot[]};

export function MonthlySupportOwner(){
  const [queue,setQueue]=useState<Enquiry[]>([]);
  const [programmes,setProgrammes]=useState<Programme[]>([]);
  const [source,setSource]=useState("");
  const [account,setAccount]=useState("");
  const [receipt,setReceipt]=useState("");
  const [method,setMethod]=useState("wise");
  const [format,setFormat]=useState("online_call");
  const [consent,setConsent]=useState(false);
  const [terms,setTerms]=useState(false);
  const [statement,setStatement]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [info,setInfo]=useState("");
  async function refresh(){
    const res=await fetch("/admin/api/personal-support",{cache:"no-store",credentials:"same-origin"});
    const json=await res.json().catch(()=>null);
    if(!res.ok||!json)throw Error(json?.error||"REQUEST_FAILED");
    setQueue(json.pendingRequests||[]);setProgrammes(json.programs||[]);
  }
  useEffect(()=>{let live=true;
    fetch("/admin/api/personal-support",{cache:"no-store",credentials:"same-origin"})
      .then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||"REQUEST_FAILED");return d;})
      .then(d=>{if(live){setQueue(d.pendingRequests||[]);setProgrammes(d.programs||[]);setLoading(false);}})
      .catch(e=>{if(live){setError(e.message);setLoading(false);}});
    return ()=>{live=false};
  },[]);
  async function action(payload:Record<string,unknown>){
    if(busy)return;
    setBusy(true);setError("");setInfo("");
    try{
      const res=await fetch("/admin/api/personal-support",{method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d=await res.json().catch(()=>null);
      if(!res.ok||!d?.program)throw Error(d?.error||"REQUEST_FAILED");
      await refresh();
      setInfo("Recorded after server confirmation. No bank transfer was initiated.");
    }catch(e){setError(e instanceof Error?e.message:"REQUEST_FAILED")}
    finally{setBusy(false)}
  }
  function activate(){
    if(!source||!account.trim()||!receipt.trim()||!statement||!consent||!terms||busy)return;
    if(!window.confirm("Have you independently verified the exact €200 receipt in your own merchant statement, confirmed the client's account identity and obtained explicit terms consent?"))return;
    void action({action:"activate",operationId:window.crypto.randomUUID(),sourceEnquiryId:source,
      clientAccountId:account.trim(),format,paymentMethod:method,receiptReference:receipt.trim(),
      confirmedByOwner:true,clientConsentConfirmed:true,termsAgreed:true});
  }
  function schedule(program:Programme,ordinal:number,value:string){
    if(!value||!window.confirm("Schedule this session for the selected local date and time?"))return;
    const date=new Date(value);
    if(!Number.isFinite(date.getTime())){setError("Invalid date");return}
    void action({action:"schedule",programId:program.id,ordinal,
      scheduledAt:date.toISOString(),expectedRevision:program.revision});
  }
  function complete(program:Programme,slot:Slot){
    if(!window.confirm("Confirm session "+slot.ordinal+" was actually completed?"))return;
    void action({action:"complete",programId:program.id,ordinal:slot.ordinal,expectedRevision:program.revision});
  }
  return <main className={styles.page} data-monthly-support-owner>
    <div className={styles.shell}>
      <Link href="/admin" className={styles.back}>← Admin</Link>
      <h1>Monthly personal support · €200</h1>
      <p>Manual owner-only programme ledger. Two 60-minute sessions and one month of follow-up. No automatic payments, renewals, invoices or transfers are made here.</p>
      <p className={styles.warning}>Verify a real client relationship and independent incoming bank/provider statement before activation. A screenshot or chat message is not a verified payment. Do not connect an unverified CRM contact to a client's private account.</p>
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      {info&&<p role="status" className={styles.success}>{info}</p>}
      {loading?<p>Loading protected queue…</p>:<>
        <section className={styles.formCard}>
          <h2>Activate a paid month</h2>
          <label>Confirmed personal-support enquiry
            <select required value={source} onChange={e=>setSource(e.target.value)}>
              <option value="">Select an unassigned HH reference</option>
              {queue.map(q=><option key={q.id} value={q.id}>{q.referenceCode} · {q.createdAt.slice(0,10)}</option>)}
            </select>
          </label>
          {queue.length===0&&<p>No eligible requests yet. Ask the client to use the public consented form first.</p>}
          <label>Client's verified Google-account UUID (NOT CRM contact ID)
            <input value={account} autoComplete="off" onChange={e=>setAccount(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000" maxLength={36}/>
          </label>
          <div className={styles.twocol}>
            <label>Session format
              <select value={format} onChange={e=>setFormat(e.target.value)}>
                <option value="online_call">Online with call</option>
                <option value="remote_no_call">Remote without call + private report/video</option>
                <option value="toronto_in_person">In person Toronto</option>
              </select>
            </label>
            <label>Payment record source
              <select value={method} onChange={e=>setMethod(e.target.value)}>
                <option value="wise">Wise</option>
                <option value="paypal_personal">PayPal personal</option>
                <option value="bank_transfer">Other verified bank transfer</option>
              </select>
            </label>
          </div>
          <label>Exact €200 transaction reference from your merchant statement
            <input value={receipt} onChange={e=>setReceipt(e.target.value)}
              maxLength={160} autoComplete="off" placeholder="Payment transaction ID"/>
          </label>
          <label className={styles.check}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
            I independently verified the client's identity and explicit consent to attach this programme to their own account.</label>
          <label className={styles.check}><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/>
            The client accepted cancellation, refund, session and message boundaries before payment.</label>
          <label className={styles.check}><input type="checkbox" checked={statement} onChange={e=>setStatement(e.target.checked)}/>
            I checked the received €200 against my independent merchant statement (not a screenshot).</label>
          <button type="button" disabled={busy||!source||!account||!receipt||!consent||!terms||!statement}
            onClick={activate}>Verify received payment and activate 2 sessions</button>
        </section>
        <section className={styles.programmes}><h2>Active and previous programmes</h2>
          {programmes.length===0?<p>No verified programmes yet.</p>:programmes.map(p=><ProgrammeRow key={p.id} program={p} busy={busy} schedule={schedule} complete={complete}/>)}
        </section>
      </>}
    </div>
  </main>;
}
function ProgrammeRow({program:p,busy,schedule,complete}:{program:Programme;busy:boolean;
  schedule:(p:Programme,n:number,value:string)=>void;complete:(p:Programme,s:Slot)=>void}){
  const [date1,setDate1]=useState("");
  const [date2,setDate2]=useState("");
  return <article className={styles.programCard}>
    <h3>{p.referenceCode} · {p.format} · {p.phase}</h3>
    <small>Client account: <code>{p.clientAccountId}</code></small>
    <p>€200 manually verified · {p.completedSessions} done · {p.remainingSessions} remaining</p>
    <p>Window: {p.startsAt.slice(0,10)} – {p.endsAt.slice(0,10)}</p>
    {p.sessions.map(slot=><div key={slot.ordinal} className={styles.slot}>
      <strong>Session {slot.ordinal} · {slot.completedAt?"Completed":slot.scheduledAt?"Scheduled":"Unscheduled"}</strong>
      {slot.completedAt?<small>{new Date(slot.completedAt).toLocaleString()}</small>:<>
        {slot.scheduledAt&&<small>{new Date(slot.scheduledAt).toLocaleString()}</small>}
        <label>Local date/time
          <input type="datetime-local" value={slot.ordinal===1?date1:date2}
            onChange={e=>(slot.ordinal===1?setDate1:setDate2)(e.target.value)}/>
        </label>
        <button disabled={busy||p.phase!=="active"} type="button"
          onClick={()=>schedule(p,slot.ordinal,slot.ordinal===1?date1:date2)}>Save appointment</button>
        <button disabled={busy||!slot.scheduledAt||p.phase!=="active"} type="button"
          onClick={()=>complete(p,slot)}>Mark actually completed</button>
      </>}
    </div>)}
  </article>;
}
