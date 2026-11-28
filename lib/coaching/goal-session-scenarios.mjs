// Advisory timing, not clock, enrollment or completion authority. Retain archived checkpoint IDs.
export const GOAL_SCENARIO_VERSION='hh-goal-eight-v1.1-20261127';
const data=[
  {
    "id": "goal_result",
    "resultTitle": {
      "en": "My goal and starting point",
      "ru": "Моя цель и точка старта",
      "es": "Mi meta y punto de partida"
    },
    "stages": [
      {
        "id": "contact",
        "start": 0,
        "end": 2,
        "fields": [],
        "instruction": "Confirm permission and actual topic; respond with a brief character-specific viewpoint and reason before minute 2 when the client provides a topic. Reuse verified context only; do not treat the reaction or time as consent or checkpoint evidence."
      },
      {
        "id": "situation",
        "start": 2,
        "end": 5,
        "fields": [
          "baseline"
        ],
        "instruction": "Clarify current reality and an example."
      },
      {
        "id": "method",
        "start": 5,
        "end": 9,
        "fields": [
          "goal",
          "why"
        ],
        "instruction": "Choose a personally meaningful controllable goal."
      },
      {
        "id": "insight",
        "start": 9,
        "end": 13,
        "fields": [
          "success",
          "horizon"
        ],
        "instruction": "Define observable success and realistic horizon."
      },
      {
        "id": "support",
        "start": 13,
        "end": 17,
        "fields": [
          "boundaries",
          "next"
        ],
        "instruction": "Check boundaries and invite a small next action."
      },
      {
        "id": "integration",
        "start": 17,
        "end": 20,
        "fields": [
          "timing"
        ],
        "instruction": "Check the chosen action and its conditions; review the actual answer and any unresolved points."
      }
    ]
  },
  {
    "id": "goal_motivation",
    "resultTitle": {
      "en": "My future vision",
      "ru": "Мой образ будущего",
      "es": "Mi visión del futuro"
    },
    "stages": [
      {
        "id": "contact",
        "start": 0,
        "end": 2,
        "fields": [],
        "instruction": "Confirm permission and actual topic; respond with a brief character-specific viewpoint and reason before minute 2 when the client provides a topic. Reuse verified context only; do not treat the reaction or time as consent or checkpoint evidence."
      },
      {
        "id": "situation",
        "start": 2,
        "end": 5,
        "fields": [
          "goal",
          "future_scene"
        ],
        "instruction": "Review the goal and describe an ordinary future day; imagery optional."
      },
      {
        "id": "method",
        "start": 5,
        "end": 9,
        "fields": [
          "why"
        ],
        "instruction": "Explore personal meaning and values."
      },
      {
        "id": "insight",
        "start": 9,
        "end": 13,
        "fields": [
          "boundaries"
        ],
        "instruction": "Check ownership and boundaries."
      },
      {
        "id": "support",
        "start": 13,
        "end": 17,
        "fields": [
          "next"
        ],
        "instruction": "Invite a small optional experiment today."
      },
      {
        "id": "integration",
        "start": 17,
        "end": 20,
        "fields": [
          "timing"
        ],
        "instruction": "Confirm when and under what conditions the personally chosen action could happen; reflect and close."
      }
    ]
  },
  {
    "id": "goal_plan",
    "resultTitle": {
      "en": "My path to the goal",
      "ru": "Мой маршрут к цели",
      "es": "Mi ruta hacia la meta"
    },
    "stages": [
      {
        "id": "contact",
        "start": 0,
        "end": 2,
        "fields": [],
        "instruction": "Confirm permission and actual topic; respond with a brief character-specific viewpoint and reason before minute 2 when the client provides a topic. Reuse verified context only; do not treat the reaction or time as consent or checkpoint evidence."
      },
      {
        "id": "situation",
        "start": 2,
        "end": 5,
        "fields": [
          "plan"
        ],
        "instruction": "Build an adaptable 90/30/7/1 route."
      },
      {
        "id": "method",
        "start": 5,
        "end": 9,
        "fields": [
          "timing"
        ],
        "instruction": "Clarify timing and conditions."
      },
      {
        "id": "insight",
        "start": 9,
        "end": 13,
        "fields": [
          "levels",
          "success"
        ],
        "instruction": "Compare minimum, ordinary and extended workload."
      },
      {
        "id": "support",
        "start": 13,
        "end": 17,
        "fields": [
          "contingency",
          "next"
        ],
        "instruction": "Choose a reserve plan and one action."
      },
      {
        "id": "integration",
        "start": 17,
        "end": 20,
        "fields": [
          "review"
        ],
        "instruction": "Review actual answers and unresolved points; invite corrections; finish by minute 20."
      }
    ]
  },
  {
    "id": "goal_resources",
    "resultTitle": {
      "en": "My strengths and support",
      "ru": "Моя карта силы и поддержки",
      "es": "Mi mapa de fortalezas y apoyo"
    },
    "stages": [
      {
        "id": "contact",
        "start": 0,
        "end": 2,
        "fields": [],
        "instruction": "Confirm permission and actual topic; respond with a brief character-specific viewpoint and reason before minute 2 when the client provides a topic. Reuse verified context only; do not treat the reaction or time as consent or checkpoint evidence."
      },
      {
        "id": "situation",
        "start": 2,
        "end": 5,
        "fields": [
          "strengths"
        ],
        "instruction": "Review a concrete past success."
      },
      {
        "id": "method",
        "start": 5,
        "end": 9,
        "fields": [
          "resources"
        ],
        "instruction": "Identify internal and external resources."
      },
      {
        "id": "insight",
        "start": 9,
        "end": 13,
        "fields": [
          "limits"
        ],
        "instruction": "Notice realistic limits and energy drains."
      },
      {
        "id": "support",
        "start": 13,
        "end": 17,
        "fields": [
          "next",
          "practices"
        ],
        "instruction": "Choose an accessible resource and optional gentle trial; planned is not tried."
      },
      {
        "id": "integration",
        "start": 17,
        "end": 20,
        "fields": [
          "resource_observation"
        ],
        "instruction": "Review the client's observation or intended trial; distinguish a plan from a practice already tried."
      }
    ]
  },
  {
    "id": "goal_obstacles",
    "resultTitle": {
      "en": "My obstacle response plan",
      "ru": "Мой план преодоления препятствий",
      "es": "Mi plan ante obstáculos"
    },
    "stages": [
      {
        "id": "contact",
        "start": 0,
        "end": 2,
        "fields": [],
        "instruction": "Confirm permission and actual topic; respond with a brief character-specific viewpoint and reason before minute 2 when the client provides a topic. Reuse verified context only; do not treat the reaction or time as consent or checkpoint evidence."
      },
      {
        "id": "situation",
        "start": 2,
        "end": 5,
        "fields": [
          "obstacle"
        ],
        "instruction": "Explore one concrete obstacle, not a presumed hidden cause."
      },
      {
        "id": "method",
        "start": 5,
        "end": 9,
        "fields": [
          "trigger"
        ],
        "instruction": "Identify trigger; distinguish facts from assumptions."
      },
      {
        "id": "insight",
        "start": 9,
        "end": 13,
        "fields": [
          "limits",
          "facts"
        ],
        "instruction": "Respect external limits and avoid trauma exploration."
      },
      {
        "id": "support",
        "start": 13,
        "end": 17,
        "fields": [
          "contingency",
          "stop_rule"
        ],
        "instruction": "Choose a safe if–then response, experiment and stop rule."
      },
      {
        "id": "integration",
        "start": 17,
        "end": 20,
        "fields": [
          "experiment"
        ],
        "instruction": "Review actual answers and unresolved points; invite corrections; finish by minute 20."
      }
    ]
  },
  {
    "id": "goal_possibilities",
    "resultTitle": {
      "en": "My map of possibilities",
      "ru": "Моя карта возможностей",
      "es": "Mi mapa de posibilidades"
    },
    "stages": [
      {
        "id": "contact",
        "start": 0,
        "end": 2,
        "fields": [],
        "instruction": "Confirm permission and actual topic; respond with a brief character-specific viewpoint and reason before minute 2 when the client provides a topic. Reuse verified context only; do not treat the reaction or time as consent or checkpoint evidence."
      },
      {
        "id": "situation",
        "start": 2,
        "end": 5,
        "fields": [
          "options"
        ],
        "instruction": "Generate alternatives only with permission; simplify, divide or test."
      },
      {
        "id": "method",
        "start": 5,
        "end": 9,
        "fields": [
          "tradeoffs"
        ],
        "instruction": "Compare benefits, costs, risks and reversibility."
      },
      {
        "id": "insight",
        "start": 9,
        "end": 13,
        "fields": [
          "experiment"
        ],
        "instruction": "Choose a small reversible experiment and observable check."
      },
      {
        "id": "support",
        "start": 13,
        "end": 17,
        "fields": [
          "review",
          "stop_rule"
        ],
        "instruction": "Agree when and how to review."
      },
      {
        "id": "integration",
        "start": 17,
        "end": 20,
        "fields": [
          "decision_rule"
        ],
        "instruction": "Review the client's own criterion for continuing, changing or stopping the experiment."
      }
    ]
  },
  {
    "id": "goal_acceleration",
    "resultTitle": {
      "en": "My progress and sustainable pace",
      "ru": "Мой прогресс и устойчивый темп",
      "es": "Mi progreso y ritmo sostenible"
    },
    "stages": [
      {
        "id": "contact",
        "start": 0,
        "end": 2,
        "fields": [],
        "instruction": "Confirm permission and actual topic; respond with a brief character-specific viewpoint and reason before minute 2 when the client provides a topic. Reuse verified context only; do not treat the reaction or time as consent or checkpoint evidence."
      },
      {
        "id": "situation",
        "start": 2,
        "end": 5,
        "fields": [
          "progress"
        ],
        "instruction": "Review actual actions and evidence; no progress is a valid answer."
      },
      {
        "id": "method",
        "start": 5,
        "end": 9,
        "fields": [
          "adjust",
          "learning"
        ],
        "instruction": "Identify what worked and what needs changing."
      },
      {
        "id": "insight",
        "start": 9,
        "end": 13,
        "fields": [
          "next"
        ],
        "instruction": "Choose one concrete next step based on what worked."
      },
      {
        "id": "support",
        "start": 13,
        "end": 17,
        "fields": [
          "sustainable_pace"
        ],
        "instruction": "Check a sustainable workload and avoid pressure to accelerate."
      },
      {
        "id": "integration",
        "start": 17,
        "end": 20,
        "fields": [
          "review"
        ],
        "instruction": "Confirm the client's chosen review time and method; reflect and close."
      }
    ]
  },
  {
    "id": "goal_integration",
    "resultTitle": {
      "en": "My results and next possibilities",
      "ru": "Мои результаты и новые перспективы",
      "es": "Mis resultados y nuevas perspectivas"
    },
    "stages": [
      {
        "id": "contact",
        "start": 0,
        "end": 2,
        "fields": [],
        "instruction": "Confirm permission and actual topic; respond with a brief character-specific viewpoint and reason before minute 2 when the client provides a topic. Reuse verified context only; do not treat the reaction or time as consent or checkpoint evidence."
      },
      {
        "id": "situation",
        "start": 2,
        "end": 5,
        "fields": [
          "progress",
          "outcome_status"
        ],
        "instruction": "Compare actual evidence with the original goal; attendance is not achievement."
      },
      {
        "id": "method",
        "start": 5,
        "end": 9,
        "fields": [
          "learning",
          "changes",
          "resources"
        ],
        "instruction": "Reflect on learning; compare only comparable measurements."
      },
      {
        "id": "insight",
        "start": 9,
        "end": 13,
        "fields": [
          "direction"
        ],
        "instruction": "Explore the direction the client prefers: continuing, revising the goal or choosing a new direction. Do not introduce postponement; respect explicit client requests and safety."
      },
      {
        "id": "support",
        "start": 13,
        "end": 17,
        "fields": [
          "next"
        ],
        "instruction": "Confirm a voluntary next step; no automatic enrollment."
      },
      {
        "id": "integration",
        "start": 17,
        "end": 20,
        "fields": [
          "review"
        ],
        "instruction": "Review the chosen next step and the client's own next review criteria; preserve unresolved points."
      }
    ]
  }
];
export const GOAL_SESSION_SCENARIOS=Object.freeze(data.map(s=>Object.freeze({...s,resultTitle:Object.freeze(s.resultTitle),stages:Object.freeze(s.stages.map(t=>Object.freeze({...t,fields:Object.freeze(t.fields)})))})));
export function goalSessionScenario(id){return GOAL_SESSION_SCENARIOS.find(s=>s.id===id)||null}
export function goalCheckpointStage(id,fieldId){return goalSessionScenario(id)?.stages.find(s=>s.fields.includes(fieldId))?.id||null}
// Advisory course time, never verified session progress or practice consent.
export function goalScenarioTimeGuidance(id,seconds){
 const scenario=goalSessionScenario(id);if(!scenario)return '';
 if(!Number.isFinite(seconds)||seconds<0)return ' Active time unverified; follow the agreed Goal scenario in order, after consent. Do not assume a minute.';
 if(seconds>=1200)return ' Goal course time target reached: reflect and close without opening another question. Wait for trusted closing; time does not prove completion.';
 const stage=scenario.stages.find(t=>seconds<t.end*60);
 if(!stage)return '';
 if(seconds>=1080)return ' Goal course integration: review actual answers and unresolved points; '+stage.instruction+' Checkpoints: '+stage.fields.join(', ')+'. Do not open a new theme or force an action. Timing is advisory.';
 return ' Goal active phase: '+stage.id+' ('+stage.start+'–'+stage.end+' min; '+Math.ceil(stage.end*60-seconds)+' sec to next window). '+stage.instruction+
  (stage.fields.length?' Checkpoints: '+stage.fields.join(', ')+'.':'')+
  ' Respond first; choose one relevant unanswered eligible point. Personal method is secondary. Keep consent and client pace; timing is advisory.';
}
export function goalScenarioGuidance(id){
 const s=goalSessionScenario(id);if(!s)return '';
 return 'Goal course scenario is primary after consent; the personal coaching model is a secondary toolbox, not a competing roadmap. Advisory active minutes: '+s.stages.map(t=>t.start+'–'+t.end+' min '+t.instruction+(t.fields.length?' Existing checkpoints: '+t.fields.join(', ')+'.':'')).join(' ')+' Ask one question at a time. Begin review at minute 17; after minute 18 do not open a new theme. Timing never verifies a checkpoint. Missing answers stay open. Respect authoritative clock and consent; no new entitlement, assignment or completion authority.';
}
export function goalResultOutline(id,rows=[],locale='en'){
 const s=goalSessionScenario(id);if(!s)return null;
 const supplied=Array.isArray(rows)?rows:[];
 const fields=s.stages.flatMap(stage=>stage.fields.map(id=>{
  const matches=supplied.filter(row=>row?.id===id),row=matches.length===1?matches[0]:null;
  const verified=row?.status==='confirmed'&&typeof row.quote==='string'&&row.quote.trim()&&Number.isInteger(row.turnIndex)&&row.turnIndex>=0&&row.source==='client_reviewed_quote';
  return {id,stage:stage.id,status:verified?'confirmed':row?.status==='skipped_by_client'?'skipped_by_client':'not_explored',quote:verified?row.quote:null,turnIndex:verified?row.turnIndex:null};
 }));
 return {version:GOAL_SCENARIO_VERSION,courseSessionId:id,title:s.resultTitle[locale]||s.resultTitle.en,fields,completeness:fields.every(f=>f.status==='confirmed')?'complete':'partial'};
}
