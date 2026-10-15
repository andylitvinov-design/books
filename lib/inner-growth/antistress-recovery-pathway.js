// OPORA / Anti-Stress: educational recovery stages shared by all five routes.
// This is a trauma-informed learning sequence, not staged PTSD treatment.
export const OPORA_RECOVERY_PATH_VERSION = 'opora-path-2.0-20261014'
const text=(ru,en,es)=>Object.freeze({ru,en,es})
export const OPORA_RECOVERY_STAGES=Object.freeze([
 Object.freeze({id:'safety',days:[1,2],title:text('Безопасность и выбор','Safety and choice','Seguridad y elección'),
   description:text('Найти доступную опору в настоящем; в любой момент можно пропустить или остановиться.',
     'Find a manageable anchor in the present. Pausing or stopping is always allowed.',
     'Encontrar un apoyo accesible en el presente; siempre puedes hacer una pausa.')}),
 Object.freeze({id:'stabilization',days:[3,4],title:text('Стабилизация','Stabilization','Estabilización'),
   description:text('Замечать ранние сигналы перегрузки и снижать требования, не усиливая симптомы.',
     'Notice early overload signs and adjust demands without pushing through distress.',
     'Reconocer señales tempranas y ajustar las exigencias sin forzarse.')}),
 Object.freeze({id:'regulation',days:[5,6],title:text('Мягкая саморегуляция','Gentle self-regulation','Autorregulación suave'),
   description:text('Выбрать короткую сенсорную или телесную паузу и управлять её длительностью.',
     'Choose a brief sensory or optional body-based pause and control its duration.',
     'Elegir una pausa sensorial o corporal opcional y ajustar su duración.')}),
 Object.freeze({id:'resources',days:[7,8],title:text('Восстановление ресурсов','Reconnecting with resources','Recuperar recursos'),
   description:text('Найти реальные источники поддержки; образные практики остаются добровольными.',
     'Identify genuinely available supports; imagery stays optional.',
     'Identificar apoyos reales; la imaginación es opcional.')}),
 Object.freeze({id:'responses',days:[9,10],title:text('Стрессовые реакции и гибкость','Stress responses and flexibility','Respuestas al estrés y flexibilidad'),
   description:text('Замечать реакцию на обычные ситуации и пробовать безопасную альтернативу без работы с травматическими воспоминаниями.',
     'Notice everyday stress responses and safe alternatives, without trauma-memory processing.',
     'Observar reacciones cotidianas sin trabajar con recuerdos traumáticos.')}),
 Object.freeze({id:'boundaries',days:[11,12],title:text('Границы и человеческая поддержка','Boundaries and support','Límites y apoyo'),
   description:text('Пробовать безопасную фразу границы и знать, к кому можно обратиться.',
     'Rehearse a manageable boundary and recognise routes to human help.',
     'Ensayar un límite seguro y reconocer fuentes de ayuda.')}),
 Object.freeze({id:'integration',days:[13,14],title:text('Интеграция и план опоры','Integration and a support plan','Integración y plan de apoyo'),
   description:text('Собрать свою карту: сигнал → опора → запасной вариант, без требований к «успеху».',
     'Build a personal sign → support → backup plan without performance pressure.',
     'Crear un plan señal → apoyo → alternativa sin presión.')}),
])
export const OPORA_ENTRY_AND_EXIT=Object.freeze({
 entry:text('Тестирование перед стартом','Assessment before the course','Evaluación inicial'),
 exit:text('Повторный замер и дальнейший маршрут','Follow-up assessment and next route','Evaluación posterior y siguiente ruta'),
 note:text('Тест HH Weekly Pulse показывает субъективные оценки, а не клиническую стадию травмы. Повторение теста — по правилам его методики.',
   'HH Weekly Pulse is an original self-report, not a clinical trauma stage. Repeat assessments follow instrument rules.',
   'HH Weekly Pulse es un autoinforme, no una etapa clínica. La repetición sigue las reglas del instrumento.'),
})
export function oporaRecoveryStages(locale='en') {
 const lang=['ru','en','es'].includes(locale)?locale:'en'
 return OPORA_RECOVERY_STAGES.map(s=>({id:s.id,days:s.days,title:s.title[lang],description:s.description[lang]}))
}
