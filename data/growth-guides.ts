// Educational public copy only: never combine with private assessment scores.
// Guide content is intentionally non-diagnostic and available without sign-in.
export type GrowthGuideLocale = 'en' | 'ru' | 'es'
export type GrowthGuide = {
  title: string
  lead: string
  steps: [string, string][]
  faq: [string, string][]
}
export const GROWTH_GUIDES: Record<string, Record<GrowthGuideLocale, GrowthGuide>> = {
  "stress": {
    "en": {
      "title": "Free stress self-check: understand pressure before choosing your next step",
      "lead": "Stress can show up as tension, worry, fatigue or feeling constantly 'on'. A questionnaire helps you describe what is happening today; it cannot determine a diagnosis or explain the cause on its own.",
      "steps": [
        [
          "Notice the context",
          "Think about when pressure increases, what changes in your sleep or concentration and what helps even a little. Your experience matters more than any universal score."
        ],
        [
          "Compare like with like",
          "If you repeat a questionnaire, compare the same tool and version over time. A change in a score is a description of your answers, not proof that a practice caused an improvement."
        ],
        [
          "Try one gentle action",
          "Choose a manageable pause: feel your feet on the floor, look around the room or take a short break. You can stop any exercise that feels uncomfortable."
        ]
      ],
      "faq": [
        [
          "Can an online stress test diagnose anxiety or burnout?",
          "No. The self-checks offered here support reflection and can help you prepare questions for a qualified professional; they are not a clinical assessment."
        ],
        [
          "What should I do after seeing my results?",
          "Review the specific questionnaire and its limits, choose what you want to work on, then explore short self-guided practices or seek personal support if needed."
        ]
      ]
    },
    "ru": {
      "title": "Бесплатная самооценка стресса: как понять напряжение и выбрать следующий шаг",
      "lead": "Стресс может проявляться напряжением, тревожными мыслями, усталостью и ощущением постоянной готовности. Опросник помогает описать своё состояние сегодня, но сам по себе не устанавливает диагноз и причину.",
      "steps": [
        [
          "Заметьте обстоятельства",
          "Понаблюдайте, когда усиливается напряжение, как меняются сон и внимание и что хотя бы немного помогает. Личный контекст важнее универсальных баллов."
        ],
        [
          "Сравнивайте сопоставимое",
          "При повторном прохождении сравнивайте один и тот же опросник и версию. Изменение показателя описывает ответы, но не доказывает причину улучшения."
        ],
        [
          "Попробуйте маленькую паузу",
          "Выберите посильное действие: почувствуйте опору стоп, оглядитесь вокруг или ненадолго прервитесь. Если упражнение неприятно, его можно остановить."
        ]
      ],
      "faq": [
        [
          "Можно ли по онлайн-тесту поставить диагноз тревоги или выгорания?",
          "Нет. Это инструменты самонаблюдения и подготовки вопросов специалисту, а не клиническая диагностика."
        ],
        [
          "Что делать после результата?",
          "Прочитайте описание шкал и ограничения метода, выберите добровольную цель, попробуйте мягкую практику или обратитесь за персональной поддержкой."
        ]
      ]
    },
    "es": {
      "title": "Autoevaluación gratuita del estrés: comprende la presión y elige tu siguiente paso",
      "lead": "El estrés puede sentirse como tensión, preocupación, cansancio o una alerta constante. Un cuestionario puede describir tu experiencia actual, pero por sí solo no identifica un diagnóstico ni una causa.",
      "steps": [
        [
          "Observa el contexto",
          "Fíjate en cuándo aumenta la presión, cómo cambia tu descanso y qué te ayuda un poco. Tu experiencia importa más que una puntuación universal."
        ],
        [
          "Compara lo comparable",
          "Si repites una prueba, utiliza el mismo instrumento y versión. Un cambio refleja tus respuestas, no demuestra la causa de una mejoría."
        ],
        [
          "Elige una pausa suave",
          "Puedes sentir los pies apoyados, mirar alrededor o hacer una pausa breve. Detén cualquier ejercicio si te resulta incómodo."
        ]
      ],
      "faq": [
        [
          "¿Una prueba en línea puede diagnosticar ansiedad o agotamiento?",
          "No. Estas herramientas son para la autoobservación y no sustituyen una valoración clínica."
        ],
        [
          "¿Qué hago después de recibir el resultado?",
          "Lee las limitaciones de la escala, elige un objetivo personal y explora prácticas breves o apoyo profesional si lo necesitas."
        ]
      ]
    }
  },
  "relationships": {
    "en": {
      "title": "Relationships and boundaries: free self-reflection tools",
      "lead": "Connection is more than a personality label. Trust, emotional safety, communication and boundaries can change across situations, relationships and time.",
      "steps": [
        [
          "Choose your question",
          "Are you interested in closeness, communication, personal boundaries or everyday support? Pick the topic rather than assuming one test measures everything."
        ],
        [
          "Respect choice and consent",
          "Scores never determine compatibility or anyone's capacity to consent. Talk about real experiences, preferences and boundaries instead of using a label to judge another person."
        ],
        [
          "Practise a small conversation",
          "Try a simple sentence such as 'I need a little time to think' or 'Can we discuss what works for both of us?' and notice how it feels."
        ]
      ],
      "faq": [
        [
          "Can a quiz tell me whether a relationship is healthy?",
          "No single questionnaire can determine the quality or safety of a relationship. Results can prompt reflection, but context and behaviour matter."
        ],
        [
          "Will my answers be shared?",
          "Opening this public guide does not publish your answers. Your account reports and personal reflections stay separate from the shareable public link."
        ]
      ]
    },
    "ru": {
      "title": "Отношения и границы: бесплатные опросники для самоисследования",
      "lead": "Близость не сводится к «типу личности». Доверие, безопасность, общение и личные границы зависят от ситуации и могут меняться.",
      "steps": [
        [
          "Выберите свой вопрос",
          "Важнее близость, общение, границы или поддержка? Выбирайте тему, не предполагая, что один тест измеряет всё сразу."
        ],
        [
          "Уважайте выбор и согласие",
          "Баллы не определяют совместимость или способность человека дать согласие. Опирайтесь на реальные действия, разговоры и личные границы."
        ],
        [
          "Попробуйте короткий разговор",
          "Например: «Мне нужно немного времени подумать» или «Можем обсудить, как удобно нам обоим?» — и отметьте свои ощущения."
        ]
      ],
      "faq": [
        [
          "Определит ли тест, здоровые ли у меня отношения?",
          "Нет. Один опросник не оценивает безопасность и качество отношений. Важны обстоятельства и поведение."
        ],
        [
          "Опубликуются ли мои ответы?",
          "Нет. Публичной можно поделиться только ссылкой на этот раздел; личные ответы и отчёты остаются отдельно."
        ]
      ]
    },
    "es": {
      "title": "Relaciones y límites: herramientas gratuitas para reflexionar",
      "lead": "La conexión no se reduce a una etiqueta de personalidad. La confianza, la comunicación y los límites personales cambian según el contexto.",
      "steps": [
        [
          "Elige tu pregunta",
          "¿Te interesa la cercanía, la comunicación, los límites o el apoyo? Una sola prueba no puede medirlo todo."
        ],
        [
          "Respeta la elección y el consentimiento",
          "Las puntuaciones no determinan la compatibilidad ni la capacidad de consentir. Importan las experiencias y los límites reales."
        ],
        [
          "Prueba una conversación",
          "Por ejemplo: 'Necesito tiempo para pensarlo' o '¿Podemos hablar de lo que nos conviene a ambos?'"
        ]
      ],
      "faq": [
        [
          "¿Una prueba indica si una relación es sana?",
          "No. Un cuestionario no determina la seguridad ni la calidad de una relación. El contexto y las acciones importan."
        ],
        [
          "¿Mis respuestas se hacen públicas?",
          "No. El enlace para compartir abre esta guía pública y no contiene respuestas ni resultados personales."
        ]
      ]
    }
  },
  "business": {
    "en": {
      "title": "Work pressure, focus and decisions: free personal reflection",
      "lead": "Busy workdays mix practical tasks with attention, stress, priorities and self-expectations. Explore these separately before choosing a useful routine.",
      "steps": [
        [
          "Separate workload from self-worth",
          "A difficult decision or an overloaded week is not a measure of your personal value. Notice demands you can change and what is outside your control."
        ],
        [
          "Choose a focus",
          "Select attention, work stress, motivation or everyday resources to find questionnaires aligned with your question."
        ],
        [
          "Make an experiment small",
          "Try one clear priority and one break during your day. Observe what was workable instead of expecting constant productivity."
        ]
      ],
      "faq": [
        [
          "Are these financial or professional aptitude tests?",
          "No. They explore self-reported psychological experiences around work, not financial outcomes, business forecasting or hiring fitness."
        ],
        [
          "Can I use the report at work?",
          "Your results are personal self-reflection. Do not use them to rank, diagnose or make employment decisions about other people."
        ]
      ]
    },
    "ru": {
      "title": "Рабочее напряжение и концентрация: бесплатное самоисследование",
      "lead": "В рабочем дне переплетаются задачи, внимание, стресс, приоритеты и ожидания от себя. Полезно рассмотреть эти аспекты отдельно.",
      "steps": [
        [
          "Отделите нагрузку от самооценки",
          "Сложное решение или перегруженная неделя не определяют вашу ценность. Отметьте, что в ваших силах изменить."
        ],
        [
          "Определите фокус",
          "Выберите внимание, рабочий стресс, мотивацию или ресурсы, чтобы подобрать относящиеся к теме опросники."
        ],
        [
          "Маленький эксперимент",
          "Попробуйте одну ясную задачу и один перерыв в течение дня. Оцените, что получилось без требования быть продуктивным постоянно."
        ]
      ],
      "faq": [
        [
          "Это финансовая диагностика или профотбор?",
          "Нет. Тесты исследуют самоощущение в рабочем контексте, но не прогнозируют доход и не оценивают пригодность сотрудника."
        ],
        [
          "Можно использовать результат для оценки коллег?",
          "Нет. Ответы предназначены для личного самонаблюдения и не подходят для решений о других людях."
        ]
      ]
    },
    "es": {
      "title": "Estrés laboral, concentración y decisiones: reflexión gratuita",
      "lead": "En el trabajo se mezclan tareas, atención, estrés, prioridades y expectativas personales. Conviene observar cada área por separado.",
      "steps": [
        [
          "Separa presión y autoestima",
          "Una semana difícil no determina tu valor. Identifica qué puedes cambiar y qué no está bajo tu control."
        ],
        [
          "Elige un enfoque",
          "Explora la atención, la presión laboral, la motivación o los recursos personales."
        ],
        [
          "Haz un experimento pequeño",
          "Prueba una prioridad clara y una pausa. Observa lo que resulta viable sin exigirte productividad constante."
        ]
      ],
      "faq": [
        [
          "¿Son evaluaciones financieras o laborales?",
          "No. Son cuestionarios de autoobservación, no pronósticos económicos ni herramientas de contratación."
        ],
        [
          "¿Puedo evaluar a otras personas con ellos?",
          "No. Los resultados se destinan a la reflexión personal, no a clasificar compañeros o empleados."
        ]
      ]
    }
  },
  "energy": {
    "en": {
      "title": "Sleep, fatigue and everyday energy: explore your patterns",
      "lead": "Low energy can have many explanations. A self-report can help you track sleep, daily load and perceived resources, but cannot find or rule out medical causes.",
      "steps": [
        [
          "Look at your week",
          "Notice sleep timing, rest opportunities, workload and what makes the day easier or harder without assigning yourself a diagnosis."
        ],
        [
          "Keep the measures separate",
          "A sleep questionnaire and a resilience questionnaire describe different things. Their numeric scores should not be added into a single 'energy percentage'."
        ],
        [
          "Choose a sustainable step",
          "Try a consistent rest cue or short daytime pause. Persistent or unexplained fatigue deserves a conversation with a healthcare professional."
        ]
      ],
      "faq": [
        [
          "Can the tests tell me why I am tired?",
          "No. Symptoms can have medical, psychological or situational contributors. Seek qualified healthcare advice for persistent or concerning fatigue."
        ],
        [
          "What is a useful next step?",
          "Review your observations, choose a topic to explore and consider a manageable daily routine while respecting your body's limits."
        ]
      ]
    },
    "ru": {
      "title": "Сон, усталость и повседневный ресурс: исследуйте свой ритм",
      "lead": "У нехватки сил может быть много причин. Самооценка помогает отслеживать сон, нагрузку и ощущение ресурсов, но не выявляет и не исключает заболевания.",
      "steps": [
        [
          "Посмотрите на свою неделю",
          "Замечайте режим сна, отдых, нагрузку и то, что облегчает или усложняет день, не ставя себе диагноз."
        ],
        [
          "Не смешивайте шкалы",
          "Опросник сна и шкала устойчивости измеряют разное. Их баллы нельзя складывать в один «процент энергии»."
        ],
        [
          "Выберите посильный шаг",
          "Попробуйте простой ритуал отдыха или короткую паузу днём. При стойкой или необъяснимой усталости обратитесь к врачу."
        ]
      ],
      "faq": [
        [
          "Покажет ли тест причину усталости?",
          "Нет. На самочувствие влияют разные факторы, включая медицинские. Стойкие и беспокоящие симптомы обсудите со специалистом."
        ],
        [
          "С чего начать?",
          "Изучите отдельные показатели, выберите важную тему и попробуйте реалистичный способ поддержки."
        ]
      ]
    },
    "es": {
      "title": "Sueño, cansancio y energía cotidiana: explora tus patrones",
      "lead": "La falta de energía puede tener muchas causas. Los cuestionarios ayudan a observar el sueño y el descanso, pero no identifican ni descartan enfermedades.",
      "steps": [
        [
          "Observa tu semana",
          "Fíjate en tus horarios, el descanso y las cargas cotidianas sin convertir las sensaciones en un diagnóstico."
        ],
        [
          "No mezcles escalas",
          "Una prueba del sueño y otra de resiliencia miden cosas distintas. No existe un porcentaje único de energía."
        ],
        [
          "Elige un paso viable",
          "Prueba una pausa breve o una rutina de descanso. Consulta con un profesional sanitario si el cansancio persiste o preocupa."
        ]
      ],
      "faq": [
        [
          "¿La prueba explica por qué estoy cansado?",
          "No. Puede haber distintas causas, incluidas las médicas. Busca asesoramiento sanitario si la fatiga es persistente."
        ],
        [
          "¿Qué hago primero?",
          "Revisa las observaciones, elige un tema y prueba un hábito pequeño que respete tus límites."
        ]
      ]
    }
  },
  "effectiveness": {
    "en": {
      "title": "Attention and motivation: a free self-check for everyday focus",
      "lead": "Concentration varies with sleep, pressure, task clarity and circumstances. Self-report questionnaires help organise observations; they cannot by themselves diagnose ADHD or tell you who you are.",
      "steps": [
        [
          "Describe a real situation",
          "Instead of judging yourself as 'lazy' or 'undisciplined', write down a specific task and the conditions that make it difficult."
        ],
        [
          "Use the right instrument",
          "Choose among focus, habits, daily functioning and stress. Read the source and time window of each questionnaire before interpreting a score."
        ],
        [
          "Try one adjustment",
          "Make your next action smaller or reduce one distraction. Track whether it was helpful, without assuming the score measures intelligence or worth."
        ]
      ],
      "faq": [
        [
          "Can a short online checklist confirm ADHD?",
          "No. Screening questions can suggest a topic to discuss with a qualified healthcare professional, but cannot confirm or exclude a diagnosis."
        ],
        [
          "How do I measure progress?",
          "Use the same compatible questionnaire at a later check-in, and also reflect on whether daily tasks feel more manageable."
        ]
      ]
    },
    "ru": {
      "title": "Внимание и мотивация: бесплатные тесты на повседневный фокус",
      "lead": "Концентрация зависит от сна, стресса, ясности задачи и обстоятельств. Опросники помогают упорядочить наблюдения, но не ставят диагноз СДВГ и не определяют вашу личность.",
      "steps": [
        [
          "Опишите реальную ситуацию",
          "Вместо ярлыков «ленивый» и «несобранный» запишите конкретное дело и условия, при которых оно становится сложным."
        ],
        [
          "Выбирайте подходящую шкалу",
          "Различайте внимание, привычки, повседневное функционирование и стресс. До оценки балла прочитайте источник и период измерения."
        ],
        [
          "Попробуйте одну настройку",
          "Уменьшите следующий шаг или уберите один отвлекающий фактор. Заметьте полезность без оценки своего интеллекта и достоинства."
        ]
      ],
      "faq": [
        [
          "Может ли короткий тест подтвердить СДВГ?",
          "Нет. Скрининговые вопросы — повод обсудить трудности с квалифицированным специалистом, но не подтверждение или исключение диагноза."
        ],
        [
          "Как наблюдать прогресс?",
          "Повторите сопоставимый опросник позднее и дополнительно отметьте, стало ли легче справляться с повседневными задачами."
        ]
      ]
    },
    "es": {
      "title": "Atención y motivación: autoevaluación gratuita de la concentración",
      "lead": "La concentración cambia según el descanso, la presión y las circunstancias. Un cuestionario organiza observaciones, pero no diagnostica TDAH ni define tu identidad.",
      "steps": [
        [
          "Describe una situación real",
          "En vez de llamarte 'perezoso', escribe una tarea concreta y las condiciones que la dificultan."
        ],
        [
          "Elige la escala adecuada",
          "Distingue la atención, los hábitos, el funcionamiento diario y el estrés. Lee la fuente y el período de cada prueba."
        ],
        [
          "Prueba un cambio pequeño",
          "Reduce el siguiente paso o elimina una distracción. Observa si resulta útil sin convertir las puntuaciones en juicios de valor."
        ]
      ],
      "faq": [
        [
          "¿Una lista breve puede confirmar el TDAH?",
          "No. Una herramienta de cribado no confirma ni descarta un diagnóstico; consulta con un profesional cualificado."
        ],
        [
          "¿Cómo observo mi progreso?",
          "Repite una prueba comparable más adelante y revisa también cómo se sienten tus tareas cotidianas."
        ]
      ]
    }
  }
}

export function growthGuideFor(theme: string, locale: GrowthGuideLocale): GrowthGuide | null {
  return GROWTH_GUIDES[theme]?.[locale] ?? null
}
