'use client'
import {useState} from 'react'
import {REPORT_PROGRAMS,normalizeReportPlacement} from '@/lib/consultations/report-program.mjs'
export function ReportProgramPicker({initial=null,locale='en'}){
 const placement=normalizeReportPlacement(initial)
 const [program,setProgram]=useState(placement?.program||'standalone')
 const [week,setWeek]=useState(placement?.week?String(placement.week):'')
 const [goalId,setGoalId]=useState(placement?.goalId||'')
 const ru=locale==='ru'
 return <fieldset className="consultation-remedy-fieldset">
  <legend>{ru?'Программа и неделя':'Program and week'}</legend>
  <label>{ru?'Программа клиента':'Client program'}
   <select name="reportProgram" value={program} onChange={event=>{setProgram(event.target.value);setWeek('');setGoalId('')}}>
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
  {program==='goal'&&<label>{ru?'ID согласованной цели (необязательно)':'Agreed goal ID (optional)'}
   <input name="reportGoalId" value={goalId} onChange={event=>setGoalId(event.target.value.trim())} maxLength={36} autoComplete="off" placeholder="UUID"/>
   <small>{ru?'Используйте ID существующей цели, согласованной с клиентом. Если он неизвестен, оставьте поле пустым.':'Use the ID of an existing goal agreed with the client; leave empty if unknown.'}</small>
  </label>}
  <small>{ru?'Назначение недели не подтверждает оплату или прохождение. Связь с целью проверяется в аккаунте клиента.':'Week placement is not payment or completion. Goal ownership is checked in the client account.'}</small>
 </fieldset>
}
