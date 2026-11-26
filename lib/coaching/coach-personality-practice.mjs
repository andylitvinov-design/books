// Editorial practice catalog. Existing consented Daybook owns rendering, persistence and authoritative receipts.
const PRACTICES={
  "mira": [
    {
      "id": "personality-mira-day-1",
      "day": 1,
      "locales": {
        "en": {
          "title": "Sources of support",
          "instruction": "Name one thing that already makes today easier. If you wish, write down one manageable step."
        },
        "ru": {
          "title": "Мои источники опоры",
          "instruction": "Назовите то, что уже немного облегчает сегодняшний день. Если хотите, запишите один посильный шаг."
        },
        "es": {
          "title": "Mis fuentes de apoyo",
          "instruction": "Nombra algo que ya hace más llevadero el día. Si quieres, anota un paso posible."
        }
      }
    },
    {
      "id": "personality-mira-day-2",
      "day": 2,
      "locales": {
        "en": {
          "title": "Less pressure",
          "instruction": "Notice one demand you can reduce or postpone without harm."
        },
        "ru": {
          "title": "Меньше давления",
          "instruction": "Заметьте одно требование, которое можно уменьшить или отложить без вреда."
        },
        "es": {
          "title": "Menos presión",
          "instruction": "Observa una exigencia que puedas reducir o aplazar sin perjuicio."
        }
      }
    },
    {
      "id": "personality-mira-day-3",
      "day": 3,
      "locales": {
        "en": {
          "title": "A gentle next step",
          "instruction": "Choose a small action only if it feels manageable; you may also choose rest."
        },
        "ru": {
          "title": "Бережный следующий шаг",
          "instruction": "Выберите небольшое действие, если оно посильно; можно выбрать и отдых."
        },
        "es": {
          "title": "Un siguiente paso amable",
          "instruction": "Elige una acción pequeña si te resulta posible; también puedes elegir descansar."
        }
      }
    }
  ],
  "max": [
    {
      "id": "personality-max-day-1",
      "day": 1,
      "locales": {
        "en": {
          "title": "One useful target",
          "instruction": "Write one observable change that would be worthwhile to you."
        },
        "ru": {
          "title": "Один полезный результат",
          "instruction": "Запишите одно наблюдаемое изменение, которое было бы для вас полезным."
        },
        "es": {
          "title": "Un resultado útil",
          "instruction": "Anota un cambio observable que te resultaría útil."
        }
      }
    },
    {
      "id": "personality-max-day-2",
      "day": 2,
      "locales": {
        "en": {
          "title": "A tiny experiment",
          "instruction": "Identify one low-risk test and what you would learn from it. You need not perform it."
        },
        "ru": {
          "title": "Маленький эксперимент",
          "instruction": "Определите одну безопасную проверку и что она могла бы прояснить. Выполнять её необязательно."
        },
        "es": {
          "title": "Un pequeño experimento",
          "instruction": "Identifica una prueba de bajo riesgo y qué aprenderías. No es obligatorio realizarla."
        }
      }
    },
    {
      "id": "personality-max-day-3",
      "day": 3,
      "locales": {
        "en": {
          "title": "Action and feedback",
          "instruction": "If you choose to try an action, note when and how you could review it."
        },
        "ru": {
          "title": "Действие и обратная связь",
          "instruction": "Если выберете действие, отметьте, когда и как сможете оценить результат."
        },
        "es": {
          "title": "Acción y aprendizaje",
          "instruction": "Si eliges probar una acción, anota cuándo y cómo revisarías el resultado."
        }
      }
    }
  ],
  "sofia": [
    {
      "id": "personality-sofia-day-1",
      "day": 1,
      "locales": {
        "en": {
          "title": "My needs and boundaries",
          "instruction": "Distinguish a situation, what you felt, and what mattered to you."
        },
        "ru": {
          "title": "Мои потребности и границы",
          "instruction": "Разделите ситуацию, свои чувства и то, что было для вас важно."
        },
        "es": {
          "title": "Mis necesidades y límites",
          "instruction": "Distingue la situación, lo que sentiste y lo que te importaba."
        }
      }
    },
    {
      "id": "personality-sofia-day-2",
      "day": 2,
      "locales": {
        "en": {
          "title": "A respectful request",
          "instruction": "Draft an optional request using your own needs, without guessing another person's intentions."
        },
        "ru": {
          "title": "Уважительная просьба",
          "instruction": "Сформулируйте возможную просьбу от своих потребностей, не угадывая намерения другого человека."
        },
        "es": {
          "title": "Una petición respetuosa",
          "instruction": "Redacta una petición opcional desde tus necesidades, sin adivinar las intenciones ajenas."
        }
      }
    },
    {
      "id": "personality-sofia-day-3",
      "day": 3,
      "locales": {
        "en": {
          "title": "Choosing a boundary",
          "instruction": "Write a boundary you might choose and a safe way to communicate it, without obligation."
        },
        "ru": {
          "title": "Выбор личной границы",
          "instruction": "Запишите границу, которую могли бы выбрать, и безопасный способ её обозначить, без обязательств."
        },
        "es": {
          "title": "Elegir un límite",
          "instruction": "Anota un límite que podrías elegir y una forma segura de comunicarlo, sin obligación."
        }
      }
    }
  ],
  "alex": [
    {
      "id": "personality-alex-day-1",
      "day": 1,
      "locales": {
        "en": {
          "title": "Facts and assumptions",
          "instruction": "Make two columns: what you know and what still needs checking."
        },
        "ru": {
          "title": "Факты и предположения",
          "instruction": "Сделайте две колонки: что известно и что ещё стоит проверить."
        },
        "es": {
          "title": "Hechos y suposiciones",
          "instruction": "Haz dos columnas: lo que sabes y lo que falta comprobar."
        }
      }
    },
    {
      "id": "personality-alex-day-2",
      "day": 2,
      "locales": {
        "en": {
          "title": "Options and criteria",
          "instruction": "Compare two realistic options using criteria that you choose."
        },
        "ru": {
          "title": "Варианты и критерии",
          "instruction": "Сравните два реалистичных варианта по критериям, которые выбрали сами."
        },
        "es": {
          "title": "Opciones y criterios",
          "instruction": "Compara dos opciones realistas con criterios que tú elijas."
        }
      }
    },
    {
      "id": "personality-alex-day-3",
      "day": 3,
      "locales": {
        "en": {
          "title": "A low-risk information test",
          "instruction": "Name one piece of information that would make your decision clearer and how you could obtain it safely."
        },
        "ru": {
          "title": "Безопасная проверка",
          "instruction": "Назовите информацию, которая прояснила бы решение, и безопасный способ её получить."
        },
        "es": {
          "title": "Una prueba de bajo riesgo",
          "instruction": "Nombra un dato que aclararía tu decisión y una forma segura de obtenerlo."
        }
      }
    }
  ],
  "merlin": [
    {
      "id": "personality-merlin-day-1",
      "day": 1,
      "locales": {
        "en": {
          "title": "What matters now",
          "instruction": "Write one enduring value and one aspect of your life that is changing."
        },
        "ru": {
          "title": "Что сейчас важно",
          "instruction": "Запишите одну сохраняющуюся ценность и одну сторону жизни, которая меняется."
        },
        "es": {
          "title": "Lo que importa ahora",
          "instruction": "Anota un valor que permanece y un aspecto de tu vida que está cambiando."
        }
      }
    },
    {
      "id": "personality-merlin-day-2",
      "day": 2,
      "locales": {
        "en": {
          "title": "A different perspective",
          "instruction": "If helpful, describe the situation in a metaphor of your own, then connect it to one real fact."
        },
        "ru": {
          "title": "Другой ракурс",
          "instruction": "Если полезно, опишите ситуацию своим образом, затем свяжите его с одним реальным фактом."
        },
        "es": {
          "title": "Otra perspectiva",
          "instruction": "Si te ayuda, describe la situación con una metáfora propia y relaciónala con un hecho real."
        }
      }
    },
    {
      "id": "personality-merlin-day-3",
      "day": 3,
      "locales": {
        "en": {
          "title": "The next chapter",
          "instruction": "Name a value and an optional concrete action that could express it."
        },
        "ru": {
          "title": "Следующая глава",
          "instruction": "Назовите ценность и необязательное конкретное действие, которое могло бы её выразить."
        },
        "es": {
          "title": "El próximo capítulo",
          "instruction": "Nombra un valor y una acción concreta opcional que podría expresarlo."
        }
      }
    }
  ],
  "harry": [
    {
      "id": "personality-harry-day-1",
      "day": 1,
      "locales": {
        "en": {
          "title": "My real allies",
          "instruction": "Think of one person or resource you can safely turn to, if you want support."
        },
        "ru": {
          "title": "Мои реальные союзники",
          "instruction": "Подумайте об одном человеке или ресурсе, к которому можно безопасно обратиться за поддержкой."
        },
        "es": {
          "title": "Mis aliados reales",
          "instruction": "Piensa en una persona o recurso al que puedas acudir con seguridad si deseas apoyo."
        }
      }
    },
    {
      "id": "personality-harry-day-2",
      "day": 2,
      "locales": {
        "en": {
          "title": "Courage without risk",
          "instruction": "Separate one real risk from one feared possibility; neither requires immediate action."
        },
        "ru": {
          "title": "Смелость без лишнего риска",
          "instruction": "Отделите один реальный риск от одного опасения; действовать немедленно необязательно."
        },
        "es": {
          "title": "Valor sin riesgos innecesarios",
          "instruction": "Separa un riesgo real de una posibilidad temida; no tienes que actuar de inmediato."
        }
      }
    },
    {
      "id": "personality-harry-day-3",
      "day": 3,
      "locales": {
        "en": {
          "title": "A supported step",
          "instruction": "If you want, choose a manageable step and note what support would make it safer."
        },
        "ru": {
          "title": "Шаг с поддержкой",
          "instruction": "Если хотите, выберите посильный шаг и отметьте, какая поддержка сделала бы его безопаснее."
        },
        "es": {
          "title": "Un paso con apoyo",
          "instruction": "Si quieres, elige un paso posible y anota qué apoyo lo haría más seguro."
        }
      }
    }
  ],
  "genie": [
    {
      "id": "personality-genie-day-1",
      "day": 1,
      "locales": {
        "en": {
          "title": "The wish beneath the wish",
          "instruction": "Describe a wish and the real need it might express; keep uncertainty open."
        },
        "ru": {
          "title": "Желание за желанием",
          "instruction": "Опишите желание и реальную потребность, которую оно может выражать; оставьте место сомнениям."
        },
        "es": {
          "title": "El deseo detrás del deseo",
          "instruction": "Describe un deseo y la necesidad real que podría expresar; deja espacio a la incertidumbre."
        }
      }
    },
    {
      "id": "personality-genie-day-2",
      "day": 2,
      "locales": {
        "en": {
          "title": "Three real routes",
          "instruction": "If useful, list up to three realistic alternatives, without treating them as commitments."
        },
        "ru": {
          "title": "Три реальных пути",
          "instruction": "Если полезно, перечислите до трёх реалистичных вариантов, не превращая их в обязательства."
        },
        "es": {
          "title": "Tres caminos reales",
          "instruction": "Si te sirve, enumera hasta tres alternativas realistas, sin convertirlas en compromisos."
        }
      }
    },
    {
      "id": "personality-genie-day-3",
      "day": 3,
      "locales": {
        "en": {
          "title": "One reversible spark",
          "instruction": "Choose an optional small experiment that you could safely stop or revise."
        },
        "ru": {
          "title": "Одна обратимая искра",
          "instruction": "Выберите необязательный небольшой эксперимент, который можно безопасно остановить или изменить."
        },
        "es": {
          "title": "Una chispa reversible",
          "instruction": "Elige un pequeño experimento opcional que puedas detener o modificar con seguridad."
        }
      }
    }
  ],
  "caesar": [
    {
      "id": "personality-caesar-day-1",
      "day": 1,
      "locales": {
        "en": {
          "title": "My own position",
          "instruction": "Name one value you choose to stand by without controlling anyone else."
        },
        "ru": {
          "title": "Моя собственная позиция",
          "instruction": "Назовите ценность, которой вы выбираете придерживаться, не контролируя других."
        },
        "es": {
          "title": "Mi propia postura",
          "instruction": "Nombra un valor que eliges mantener sin controlar a nadie más."
        }
      }
    },
    {
      "id": "personality-caesar-day-2",
      "day": 2,
      "locales": {
        "en": {
          "title": "My sphere of influence",
          "instruction": "Separate what you can influence from what lies outside your control."
        },
        "ru": {
          "title": "Моя сфера влияния",
          "instruction": "Отделите то, на что можете повлиять, от того, что вне вашего контроля."
        },
        "es": {
          "title": "Mi esfera de influencia",
          "instruction": "Distingue lo que puedes influir de lo que queda fuera de tu control."
        }
      }
    },
    {
      "id": "personality-caesar-day-3",
      "day": 3,
      "locales": {
        "en": {
          "title": "A decision with dignity",
          "instruction": "If you choose to act, write one responsible step that respects your values and others' freedom."
        },
        "ru": {
          "title": "Решение с достоинством",
          "instruction": "Если решите действовать, запишите ответственный шаг, учитывающий ваши ценности и свободу других."
        },
        "es": {
          "title": "Una decisión con dignidad",
          "instruction": "Si eliges actuar, anota un paso responsable que respete tus valores y la libertad ajena."
        }
      }
    }
  ]
}
function coachPersonalityPractice(personaId,day,locale="en"){
 if(typeof personaId!=="string"||!Object.hasOwn(PRACTICES,personaId)||!Number.isInteger(day)||day<1||day>3)return null;
 const row=PRACTICES[personaId][day-1],copy=row.locales[["ru","en","es"].includes(locale)?locale:"en"];
 return Object.freeze({id:row.id,personaId,day,version:1,optional:true,minutes:3,title:copy.title,instruction:copy.instruction});
}

function coachPersonalityHomeworkOffer({personaId,locale="en",courseSessionId,completion,rows=[],protocolId}={}){
 // The caller MUST supply the existing authoritative end-of-logical-session
 // receipt, not a client flag or a model claim. This helper does not grant
 // authority or write a journal. No homework on interruption or other days.
 if(courseSessionId!=="clarity_day_1"||completion?.reason!=="timebox"||completion?.reviewed!==true||
   !Number.isFinite(completion?.activeSeconds)||completion.activeSeconds<1200||
   typeof protocolId!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(protocolId))return null;
 const practice=coachPersonalityPractice(personaId,1,locale);
 if(!practice||!Array.isArray(rows))return null;
 const ids=new Set(),questions=[];
 for(const r of rows){
  if(!r||!["not_explored","needs_confirmation"].includes(r.status)||typeof r.id!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(r.id)||
   ids.has(r.id)||typeof r.question!=="string"||!r.question.trim()||r.question.length>600)continue;
  ids.add(r.id);questions.push(Object.freeze({id:r.id,question:r.question,sourceProtocolId:protocolId,optional:true}));
 }
 if(!questions.length)return null;
 return Object.freeze({version:1,sourceProtocolId:protocolId,personaId,day:1,optional:true,questions:Object.freeze(questions),practice});
}
export {coachPersonalityPractice,coachPersonalityHomeworkOffer}
