'use client'

import { useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { buildClientReport } from '@/lib/profile/client-report'
import styles from './client-report-actions.module.css'

const LABELS={
 en:{download:'Download complete PDF',print:'Print all results',generating:'Preparing your PDF…',empty:'Complete a test before generating your report.',failed:'Could not prepare the report. Please try again.',ready:'Your PDF has been prepared. Use your browser’s print button in the preview.',private:'Only your signed-in account data is included. Nothing is sent to an external PDF service.'},
 ru:{download:'Скачать полный PDF',print:'Распечатать все результаты',generating:'Создаём PDF-отчёт…',empty:'Для отчёта нужно завершить хотя бы один тест.',failed:'Не удалось сформировать отчёт. Попробуйте снова.',ready:'PDF готов. В открытом просмотре нажмите «Печать».',private:'Используются только ваши данные из аккаунта. Внешние сервисы PDF не получают результат.'},
}
export function ClientReportActions({ data, locale='en', compact=false }) {
 const c=LABELS[locale] || LABELS.en;
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const canExport=Array.isArray(data?.results) && data.results.length>0;

 async function create(print=false) {
  if(busy)return;
  if(!canExport){setMessage(c.empty);return}
  // Open a blank tab synchronously, before asynchronous PDF rendering, so Safari
  // can show the PDF viewer without treating it as an unsolicited popup.
  const viewer=print?window.open('about:blank','_blank'):null;
  if(viewer){
   try{viewer.opener=null;viewer.document.title='Holistic House · PDF';viewer.document.body.textContent=c.generating}
   catch{/* Viewer is optional; download remains available. */}
  }
  setBusy(true);setMessage(c.generating);
  try{
   const report=buildClientReport({
    account:data.account,
    results:data.results,
    snapshot:data.snapshot,
    locale,
   });
   const {generateClientPdf}=await import('@/lib/profile/client-report-pdf');
   const pdf=await generateClientPdf(report);
   const url=URL.createObjectURL(pdf);
   if(print && viewer && !viewer.closed){
    // Native browser PDF viewers support printing and saving; keep the full report
    // in the user’s local browser and leave the user in control of printing.
    viewer.location.replace(url);setMessage(c.ready);
   }else{
    const link=document.createElement('a');
    link.href=url;
    link.download='holistic-house-personal-report-'+new Date().toISOString().slice(0,10)+'.pdf';
    document.body.appendChild(link);link.click();link.remove();setMessage('');
   }
   window.setTimeout(()=>URL.revokeObjectURL(url),120000);
  }catch{
   if(viewer&&!viewer.closed)viewer.close();
   setMessage(c.failed);
  }finally{setBusy(false)}
 }
 return <div className={styles.wrapper} data-client-complete-report>
   <div className={styles.actions}>
     <button type="button" className={styles.download} disabled={!canExport||busy} onClick={()=>create(false)}>
       <Download size={20} aria-hidden="true" />{busy?c.generating:c.download}
     </button>
     <button type="button" className={styles.print} disabled={!canExport||busy} onClick={()=>create(true)}>
       <Printer size={19} aria-hidden="true" />{c.print}
     </button>
   </div>
   <p className={styles.privacy}>{canExport?c.private:c.empty}</p>
   {message && <p role="status" aria-live="polite" className={styles.message}>{message}</p>}
 </div>
}
