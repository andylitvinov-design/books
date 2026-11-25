'use client'
import {useState} from 'react'
import {REPORT_PROGRAMS,normalizeReportPlacement} from '@/lib/consultations/report-program.mjs'
export function ReportProgramPicker({initial=null,locale='en'}){
 const placement=normalizeReportPlacement(initial)
 const [program,setProgram]=useState(placement?.program||'standalone')
 const [week,setWeek]=useState(placement?.week?String(placement.week):'')
 const ru=locale==='ru'
 return <fieldset className="consultation-remedy-fieldset">
  <legend>{ru?'Программа и неделя':'Program and week'}</legend>
  <label>{ru?'Программа клиента':'Client program'}
   <select name="reportProgram" value={program} onChange={event=>{setProgram(event.target.value);setWeek('')}}>
    <option value="standalone">{ru?'Вне программы':'Standalone report'}</option>
    {Object.entries(REPORT_PROGRAMS).map(([id,item])=><option key={id} value={id}>{item.label[locale]||item.label.en}</option>)}
   </select>
  </label>
  {program!=='standalone'?<label>{ru?'Неделя / сессия':'Week / session'}
   <select name="reportWeek" required value={week} onChange={event=>setWeek(event.target.value)}>
    <option value="" disabled>{ru?'Выберите неделю':'Choose a week'}</option>
    {Array.from({length:REPORT_PROGRAMS[program].weeks},(_,i)=><option key={i+1} value={i+1}>{ru?'Неделя':'Week'} {i+1}</option>)}
   </select>
  </label>:<input type="hidden" name="reportWeek" value=""/>}
  <small>{ru?'Выбранная неделя сохранится в отчёте. Это не отметка об оплате, прохождении программы или автоматическая привязка к конкретной цели.':'The selected week is saved in the report. This does not record payment, completion or automatic linkage to a specific goal.'}</small>
 </fieldset>
}
