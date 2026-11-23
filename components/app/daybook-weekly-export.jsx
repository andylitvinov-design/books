'use client'
import DaybookDailyExport from './daybook-daily-export'
import {collectWeeklyExport} from '@/lib/app/daybook-weekly-export.mjs'
const COPY={
 en:{title:'Export my weekly reviews',note:'Includes saved reflections and the confirmed source dates, versions and step counts. Original journal text and unsaved drafts are excluded.',button:'Export saved weekly reviews (JSON)',working:'Reading saved weekly reviews…',done:'Download prepared.',failed:'Export could not finish. No partial file was downloaded. Try again.',large:'The export exceeds the 32 MiB browser limit. No partial file was downloaded.'},
 ru:{title:'Экспорт моих недельных обзоров',note:'Включает сохранённые размышления и подтверждённые даты, версии и счётчики шагов. Исходные тексты дневника и несохранённые черновики не включены.',button:'Экспорт сохранённых недельных обзоров (JSON)',working:'Чтение сохранённых недельных обзоров…',done:'Файл подготовлен для скачивания.',failed:'Не удалось завершить экспорт. Неполный файл не скачан. Повторите попытку.',large:'Экспорт превышает лимит браузера 32 МиБ. Неполный файл не скачан.'},
 es:{title:'Exportar mis revisiones semanales',note:'Incluye las reflexiones guardadas y las fechas, versiones y recuentos de pasos confirmados. No incluye el texto original del diario ni borradores sin guardar.',button:'Exportar revisiones semanales guardadas (JSON)',working:'Leyendo las revisiones semanales guardadas…',done:'Descarga preparada.',failed:'No se pudo completar la exportación. No se descargó un archivo parcial. Reintenta.',large:'La exportación supera el límite del navegador de 32 MiB. No se descargó un archivo parcial.'},
}
export default function DaybookWeeklyExport(props){
 return <DaybookDailyExport {...props} collector={collectWeeklyExport} copy={COPY} downloadPrefix="holistic-house-weekly-reviews"/>
}
