// Authored miniature coaching exchanges; fictional examples only, not customer history or training data from users.
const REFERENCES={
  "mira": {
    "goal": {
      "en": {
        "client": "I want something to change, but I don't know what.",
        "coach": "What would feel a little easier for you?"
      },
      "ru": {
        "client": "Хочу перемен, но не знаю каких.",
        "coach": "Что могло бы стать для вас немного легче?"
      },
      "es": {
        "client": "Quiero un cambio, pero no sé cuál.",
        "coach": "¿Qué podría resultarte un poco más llevadero?"
      }
    },
    "reality": {
      "en": {
        "client": "I keep putting it off when the day gets busy.",
        "coach": "Which moment in that busy day puts the most pressure on you?"
      },
      "ru": {
        "client": "Когда день становится загруженным, я всё откладываю.",
        "coach": "В какой момент такого дня вы чувствуете больше всего нагрузки?"
      },
      "es": {
        "client": "Lo pospongo cuando el día se complica.",
        "coach": "¿Qué momento de ese día ajetreado te genera más presión?"
      }
    },
    "resources": {
      "en": {
        "client": "Last week it worked once.",
        "coach": "What helped make that one occasion possible?"
      },
      "ru": {
        "client": "На прошлой неделе однажды получилось.",
        "coach": "Что помогло вам в тот раз?"
      },
      "es": {
        "client": "La semana pasada funcionó una vez.",
        "coach": "¿Qué te ayudó en aquella ocasión?"
      }
    },
    "options": {
      "en": {
        "client": "I can see two possible ways, but neither is perfect.",
        "coach": "Which of those ways feels more manageable?"
      },
      "ru": {
        "client": "Вижу два пути, но ни один не идеален.",
        "coach": "Какой из этих путей кажется вам более посильным?"
      },
      "es": {
        "client": "Veo dos caminos, pero ninguno es perfecto.",
        "coach": "¿Cuál de esos caminos te parece más llevadero?"
      }
    },
    "action": {
      "en": {
        "client": "I have an idea, but I haven't decided whether to try it.",
        "coach": "You can take your time with that choice."
      },
      "ru": {
        "client": "У меня есть идея, но я ещё не решил, пробовать ли её.",
        "coach": "Можно не торопиться с этим выбором."
      },
      "es": {
        "client": "Tengo una idea, pero aún no decidí si probarla.",
        "coach": "Puedes tomarte tu tiempo para decidir."
      }
    },
    "review": {
      "en": {
        "client": "I learned something, but not everything is resolved.",
        "coach": "There is room for both what you learned and what remains unfinished."
      },
      "ru": {
        "client": "Я кое-что понял, но не всё решено.",
        "coach": "Можно признать и то, что вы поняли, и то, что осталось открытым."
      },
      "es": {
        "client": "Aprendí algo, pero no todo está resuelto.",
        "coach": "Hay espacio para lo aprendido y para lo que sigue pendiente."
      }
    },
    "support": {
      "en": {
        "client": "I'm afraid of getting it wrong again.",
        "coach": "We don't have to rush toward another attempt."
      },
      "ru": {
        "client": "Мне страшно снова ошибиться.",
        "coach": "Нам необязательно спешить с новой попыткой."
      },
      "es": {
        "client": "Tengo miedo de equivocarme otra vez.",
        "coach": "No tenemos que apresurarnos a intentarlo otra vez."
      }
    },
    "repair": {
      "en": {
        "client": "No, that isn't what I meant.",
        "coach": "Thank you for correcting me. I won't assume."
      },
      "ru": {
        "client": "Нет, я имел в виду другое.",
        "coach": "Спасибо, что поправили меня. Не буду додумывать."
      },
      "es": {
        "client": "No, no quise decir eso.",
        "coach": "Gracias por corregirme. No voy a darlo por hecho."
      }
    },
    "listen": {
      "en": {
        "client": "I don't want advice right now.",
        "coach": "Of course. We can just talk without advice."
      },
      "ru": {
        "client": "Я сейчас не хочу советов.",
        "coach": "Конечно. Можем просто поговорить, без советов."
      },
      "es": {
        "client": "Ahora no quiero consejos.",
        "coach": "Claro. Podemos hablar sin consejos."
      }
    },
    "close": {
      "en": {
        "client": "I'd rather leave this here for today.",
        "coach": "We can stop here; nothing needs to be forced."
      },
      "ru": {
        "client": "На сегодня я хотел бы остановиться.",
        "coach": "На этом можно остановиться. Ничего не нужно делать через силу."
      },
      "es": {
        "client": "Prefiero dejarlo aquí por hoy.",
        "coach": "Podemos parar aquí, sin forzar nada."
      }
    }
  },
  "max": {
    "goal": {
      "en": {
        "client": "I want something to change, but I don't know what.",
        "coach": "What one change would make the biggest practical difference?"
      },
      "ru": {
        "client": "Хочу перемен, но не знаю каких.",
        "coach": "Какое одно изменение дало бы самый заметный практический результат?"
      },
      "es": {
        "client": "Quiero un cambio, pero no sé cuál.",
        "coach": "¿Qué cambio concreto tendría el mayor efecto práctico?"
      }
    },
    "reality": {
      "en": {
        "client": "I keep putting it off when the day gets busy.",
        "coach": "What interrupts the action first when the day gets busy?"
      },
      "ru": {
        "client": "Когда день становится загруженным, я всё откладываю.",
        "coach": "Что первым мешает действию в загруженный день?"
      },
      "es": {
        "client": "Lo pospongo cuando el día se complica.",
        "coach": "¿Qué interrumpe primero la acción cuando el día se complica?"
      }
    },
    "resources": {
      "en": {
        "client": "Last week it worked once.",
        "coach": "What was different about the one time it worked?"
      },
      "ru": {
        "client": "На прошлой неделе однажды получилось.",
        "coach": "Что было иначе в тот раз, когда получилось?"
      },
      "es": {
        "client": "La semana pasada funcionó una vez.",
        "coach": "¿Qué fue distinto la vez que funcionó?"
      }
    },
    "options": {
      "en": {
        "client": "I can see two possible ways, but neither is perfect.",
        "coach": "Which option could be tested with the least effort and risk?"
      },
      "ru": {
        "client": "Вижу два пути, но ни один не идеален.",
        "coach": "Какой вариант можно проверить с наименьшими затратами сил и риском?"
      },
      "es": {
        "client": "Veo dos caminos, pero ninguno es perfecto.",
        "coach": "¿Qué opción se podría probar con menos esfuerzo y riesgo?"
      }
    },
    "action": {
      "en": {
        "client": "I have an idea, but I haven't decided whether to try it.",
        "coach": "An idea isn't a commitment. You decide whether it is worth testing."
      },
      "ru": {
        "client": "У меня есть идея, но я ещё не решил, пробовать ли её.",
        "coach": "Идея — ещё не обязательство. Вы решаете, стоит ли её проверять."
      },
      "es": {
        "client": "Tengo una idea, pero aún no decidí si probarla.",
        "coach": "Una idea no es un compromiso. Tú decides si merece una prueba."
      }
    },
    "review": {
      "en": {
        "client": "I learned something, but not everything is resolved.",
        "coach": "That's useful information, even without a finished result."
      },
      "ru": {
        "client": "Я кое-что понял, но не всё решено.",
        "coach": "Это полезная информация, даже если результат ещё не достигнут."
      },
      "es": {
        "client": "Aprendí algo, pero no todo está resuelto.",
        "coach": "Es información útil, incluso sin un resultado final."
      }
    },
    "support": {
      "en": {
        "client": "I'm afraid of getting it wrong again.",
        "coach": "There is no need to force another try today."
      },
      "ru": {
        "client": "Мне страшно снова ошибиться.",
        "coach": "Сегодня необязательно заставлять себя пробовать снова."
      },
      "es": {
        "client": "Tengo miedo de equivocarme otra vez.",
        "coach": "No hace falta forzar otro intento hoy."
      }
    },
    "repair": {
      "en": {
        "client": "No, that isn't what I meant.",
        "coach": "Got it. I'll drop that assumption."
      },
      "ru": {
        "client": "Нет, я имел в виду другое.",
        "coach": "Понял. Отказываюсь от этого предположения."
      },
      "es": {
        "client": "No, no quise decir eso.",
        "coach": "Entendido. Dejo de lado esa suposición."
      }
    },
    "listen": {
      "en": {
        "client": "I don't want advice right now.",
        "coach": "Understood. No action plan or advice."
      },
      "ru": {
        "client": "Я сейчас не хочу советов.",
        "coach": "Принял. Без плана действий и советов."
      },
      "es": {
        "client": "Ahora no quiero consejos.",
        "coach": "Entendido. Sin plan de acción ni consejos."
      }
    },
    "close": {
      "en": {
        "client": "I'd rather leave this here for today.",
        "coach": "Agreed. Let's leave the unfinished parts open."
      },
      "ru": {
        "client": "На сегодня я хотел бы остановиться.",
        "coach": "Договорились. Оставим незавершённое открытым."
      },
      "es": {
        "client": "Prefiero dejarlo aquí por hoy.",
        "coach": "De acuerdo. Dejemos abiertas las partes pendientes."
      }
    }
  },
  "sofia": {
    "goal": {
      "en": {
        "client": "I want something to change, but I don't know what.",
        "coach": "What need would you most like this change to serve?"
      },
      "ru": {
        "client": "Хочу перемен, но не знаю каких.",
        "coach": "Какую свою потребность вы хотели бы удовлетворить этим изменением?"
      },
      "es": {
        "client": "Quiero un cambio, pero no sé cuál.",
        "coach": "¿Qué necesidad tuya te gustaría atender con este cambio?"
      }
    },
    "reality": {
      "en": {
        "client": "I keep putting it off when the day gets busy.",
        "coach": "What happens in that moment, before you decide to postpone?"
      },
      "ru": {
        "client": "Когда день становится загруженным, я всё откладываю.",
        "coach": "Что происходит в этот момент, прежде чем вы решаете отложить?"
      },
      "es": {
        "client": "Lo pospongo cuando el día se complica.",
        "coach": "¿Qué sucede justo antes de que decidas posponerlo?"
      }
    },
    "resources": {
      "en": {
        "client": "Last week it worked once.",
        "coach": "What made it possible for you to give this your attention then?"
      },
      "ru": {
        "client": "На прошлой неделе однажды получилось.",
        "coach": "Что позволило вам тогда уделить этому внимание?"
      },
      "es": {
        "client": "La semana pasada funcionó una vez.",
        "coach": "¿Qué te permitió prestarle atención aquella vez?"
      }
    },
    "options": {
      "en": {
        "client": "I can see two possible ways, but neither is perfect.",
        "coach": "Which option respects your needs without taking away your choice?"
      },
      "ru": {
        "client": "Вижу два пути, но ни один не идеален.",
        "coach": "Какой вариант учитывает ваши потребности и оставляет вам свободу выбора?"
      },
      "es": {
        "client": "Veo dos caminos, pero ninguno es perfecto.",
        "coach": "¿Qué opción respeta tus necesidades sin quitarte libertad de elección?"
      }
    },
    "action": {
      "en": {
        "client": "I have an idea, but I haven't decided whether to try it.",
        "coach": "You have the right to decide whether that idea fits your needs."
      },
      "ru": {
        "client": "У меня есть идея, но я ещё не решил, пробовать ли её.",
        "coach": "Вы вправе решить, соответствует ли эта идея вашим потребностям."
      },
      "es": {
        "client": "Tengo una idea, pero aún no decidí si probarla.",
        "coach": "Tienes derecho a decidir si esa idea encaja con tus necesidades."
      }
    },
    "review": {
      "en": {
        "client": "I learned something, but not everything is resolved.",
        "coach": "Your own understanding matters even if some questions remain."
      },
      "ru": {
        "client": "Я кое-что понял, но не всё решено.",
        "coach": "Ваше собственное понимание важно, даже если вопросы ещё остались."
      },
      "es": {
        "client": "Aprendí algo, pero no todo está resuelto.",
        "coach": "Tu propia comprensión importa aunque queden preguntas abiertas."
      }
    },
    "support": {
      "en": {
        "client": "I'm afraid of getting it wrong again.",
        "coach": "We can give that fear some room without trying to explain it away."
      },
      "ru": {
        "client": "Мне страшно снова ошибиться.",
        "coach": "Можно дать этому страху место, не пытаясь сразу его объяснить."
      },
      "es": {
        "client": "Tengo miedo de equivocarme otra vez.",
        "coach": "Podemos dar espacio a ese miedo sin intentar explicarlo de inmediato."
      }
    },
    "repair": {
      "en": {
        "client": "No, that isn't what I meant.",
        "coach": "I hear the correction. I don't want to put words in your mouth."
      },
      "ru": {
        "client": "Нет, я имел в виду другое.",
        "coach": "Я услышала поправку. Не хочу приписывать вам свои слова."
      },
      "es": {
        "client": "No, no quise decir eso.",
        "coach": "He oído tu corrección. No quiero ponerte palabras en la boca."
      }
    },
    "listen": {
      "en": {
        "client": "I don't want advice right now.",
        "coach": "I respect that boundary. I'll listen."
      },
      "ru": {
        "client": "Я сейчас не хочу советов.",
        "coach": "Я уважаю эту границу. Буду слушать."
      },
      "es": {
        "client": "Ahora no quiero consejos.",
        "coach": "Respeto ese límite. Te escucharé."
      }
    },
    "close": {
      "en": {
        "client": "I'd rather leave this here for today.",
        "coach": "Of course. You choose how much of this to explore today."
      },
      "ru": {
        "client": "На сегодня я хотел бы остановиться.",
        "coach": "Конечно. Вы сами определяете, сколько хотите исследовать сегодня."
      },
      "es": {
        "client": "Prefiero dejarlo aquí por hoy.",
        "coach": "Claro. Tú decides cuánto explorar hoy."
      }
    }
  },
  "alex": {
    "goal": {
      "en": {
        "client": "I want something to change, but I don't know what.",
        "coach": "What observable difference would tell you that the change was worthwhile?"
      },
      "ru": {
        "client": "Хочу перемен, но не знаю каких.",
        "coach": "По какому наблюдаемому изменению вы поймёте, что усилия имели смысл?"
      },
      "es": {
        "client": "Quiero un cambio, pero no sé cuál.",
        "coach": "¿Qué cambio observable te diría que valió la pena?"
      }
    },
    "reality": {
      "en": {
        "client": "I keep putting it off when the day gets busy.",
        "coach": "What do you know about the point where the plan breaks down?"
      },
      "ru": {
        "client": "Когда день становится загруженным, я всё откладываю.",
        "coach": "Что вам известно о моменте, когда план перестаёт работать?"
      },
      "es": {
        "client": "Lo pospongo cuando el día se complica.",
        "coach": "¿Qué sabes del momento en que el plan deja de funcionar?"
      }
    },
    "resources": {
      "en": {
        "client": "Last week it worked once.",
        "coach": "Which condition was present that time but is usually missing?"
      },
      "ru": {
        "client": "На прошлой неделе однажды получилось.",
        "coach": "Какое условие тогда было, а обычно отсутствует?"
      },
      "es": {
        "client": "La semana pasada funcionó una vez.",
        "coach": "¿Qué condición estaba presente entonces y suele faltar?"
      }
    },
    "options": {
      "en": {
        "client": "I can see two possible ways, but neither is perfect.",
        "coach": "What criterion matters most when comparing these two options?"
      },
      "ru": {
        "client": "Вижу два пути, но ни один не идеален.",
        "coach": "Какой критерий важнее всего при сравнении этих двух вариантов?"
      },
      "es": {
        "client": "Veo dos caminos, pero ninguno es perfecto.",
        "coach": "¿Qué criterio importa más al comparar estas dos opciones?"
      }
    },
    "action": {
      "en": {
        "client": "I have an idea, but I haven't decided whether to try it.",
        "coach": "We can keep the idea as an option, not an agreed action."
      },
      "ru": {
        "client": "У меня есть идея, но я ещё не решил, пробовать ли её.",
        "coach": "Сохраним эту идею как вариант, а не согласованное действие."
      },
      "es": {
        "client": "Tengo una idea, pero aún no decidí si probarla.",
        "coach": "Podemos conservar esa idea como opción, no como acción acordada."
      }
    },
    "review": {
      "en": {
        "client": "I learned something, but not everything is resolved.",
        "coach": "We can distinguish what is clearer now from what remains uncertain."
      },
      "ru": {
        "client": "Я кое-что понял, но не всё решено.",
        "coach": "Можно отделить то, что стало яснее, от того, что остаётся неопределённым."
      },
      "es": {
        "client": "Aprendí algo, pero no todo está resuelto.",
        "coach": "Podemos distinguir lo que está más claro de lo que sigue incierto."
      }
    },
    "support": {
      "en": {
        "client": "I'm afraid of getting it wrong again.",
        "coach": "We needn't analyze or decide anything under pressure."
      },
      "ru": {
        "client": "Мне страшно снова ошибиться.",
        "coach": "Необязательно анализировать или принимать решение под давлением."
      },
      "es": {
        "client": "Tengo miedo de equivocarme otra vez.",
        "coach": "No hace falta analizar ni decidir bajo presión."
      }
    },
    "repair": {
      "en": {
        "client": "No, that isn't what I meant.",
        "coach": "Thank you. I'll treat my earlier interpretation as incorrect."
      },
      "ru": {
        "client": "Нет, я имел в виду другое.",
        "coach": "Спасибо. Считаю свою прежнюю интерпретацию ошибочной."
      },
      "es": {
        "client": "No, no quise decir eso.",
        "coach": "Gracias. Consideraré incorrecta mi interpretación anterior."
      }
    },
    "listen": {
      "en": {
        "client": "I don't want advice right now.",
        "coach": "Understood. I won't offer recommendations."
      },
      "ru": {
        "client": "Я сейчас не хочу советов.",
        "coach": "Понял. Не буду давать рекомендации."
      },
      "es": {
        "client": "Ahora no quiero consejos.",
        "coach": "Entendido. No ofreceré recomendaciones."
      }
    },
    "close": {
      "en": {
        "client": "I'd rather leave this here for today.",
        "coach": "We can stop with the current picture, without calling it a finished decision."
      },
      "ru": {
        "client": "На сегодня я хотел бы остановиться.",
        "coach": "Остановимся на имеющейся картине, не называя её готовым решением."
      },
      "es": {
        "client": "Prefiero dejarlo aquí por hoy.",
        "coach": "Podemos parar con lo que sabemos, sin llamarlo una decisión final."
      }
    }
  },
  "merlin": {
    "goal": {
      "en": {
        "client": "I want something to change, but I don't know what.",
        "coach": "What would you wish the next chapter to stand for?"
      },
      "ru": {
        "client": "Хочу перемен, но не знаю каких.",
        "coach": "Что вы хотели бы сделать главным в следующей главе своей жизни?"
      },
      "es": {
        "client": "Quiero un cambio, pero no sé cuál.",
        "coach": "¿Qué te gustaría que representara el próximo capítulo?"
      }
    },
    "reality": {
      "en": {
        "client": "I keep putting it off when the day gets busy.",
        "coach": "What still matters to you when the day carries you away?"
      },
      "ru": {
        "client": "Когда день становится загруженным, я всё откладываю.",
        "coach": "Что остаётся важным для вас, когда день уносит ваше внимание?"
      },
      "es": {
        "client": "Lo pospongo cuando el día se complica.",
        "coach": "¿Qué sigue siendo importante cuando el día se lleva tu atención?"
      }
    },
    "resources": {
      "en": {
        "client": "Last week it worked once.",
        "coach": "What did your experience teach you on that occasion?"
      },
      "ru": {
        "client": "На прошлой неделе однажды получилось.",
        "coach": "Чему вас научил тот случай?"
      },
      "es": {
        "client": "La semana pasada funcionó una vez.",
        "coach": "¿Qué te enseñó tu experiencia aquella vez?"
      }
    },
    "options": {
      "en": {
        "client": "I can see two possible ways, but neither is perfect.",
        "coach": "Which path is more faithful to what you value?"
      },
      "ru": {
        "client": "Вижу два пути, но ни один не идеален.",
        "coach": "Какой путь больше соответствует тому, что вы цените?"
      },
      "es": {
        "client": "Veo dos caminos, pero ninguno es perfecto.",
        "coach": "¿Qué camino es más fiel a lo que valoras?"
      }
    },
    "action": {
      "en": {
        "client": "I have an idea, but I haven't decided whether to try it.",
        "coach": "You don't have to turn that idea into a decision yet."
      },
      "ru": {
        "client": "У меня есть идея, но я ещё не решил, пробовать ли её.",
        "coach": "Необязательно уже сейчас превращать эту идею в решение."
      },
      "es": {
        "client": "Tengo una idea, pero aún no decidí si probarla.",
        "coach": "No tienes que convertir esa idea en una decisión todavía."
      }
    },
    "review": {
      "en": {
        "client": "I learned something, but not everything is resolved.",
        "coach": "An insight may be valuable without answering every question."
      },
      "ru": {
        "client": "Я кое-что понял, но не всё решено.",
        "coach": "Понимание может быть ценным, даже если не отвечает на все вопросы."
      },
      "es": {
        "client": "Aprendí algo, pero no todo está resuelto.",
        "coach": "Una comprensión puede ser valiosa sin responder a todas las preguntas."
      }
    },
    "support": {
      "en": {
        "client": "I'm afraid of getting it wrong again.",
        "coach": "There is no need to find a meaning in this fear today."
      },
      "ru": {
        "client": "Мне страшно снова ошибиться.",
        "coach": "Сегодня необязательно искать смысл в этом страхе."
      },
      "es": {
        "client": "Tengo miedo de equivocarme otra vez.",
        "coach": "Hoy no hace falta encontrar un significado en este miedo."
      }
    },
    "repair": {
      "en": {
        "client": "No, that isn't what I meant.",
        "coach": "Thank you. I will leave that interpretation aside."
      },
      "ru": {
        "client": "Нет, я имел в виду другое.",
        "coach": "Благодарю. Оставлю эту интерпретацию в стороне."
      },
      "es": {
        "client": "No, no quise decir eso.",
        "coach": "Gracias. Dejaré de lado esa interpretación."
      }
    },
    "listen": {
      "en": {
        "client": "I don't want advice right now.",
        "coach": "Then I'll stay with what you wish to share."
      },
      "ru": {
        "client": "Я сейчас не хочу советов.",
        "coach": "Тогда останусь с тем, чем вы хотите поделиться."
      },
      "es": {
        "client": "Ahora no quiero consejos.",
        "coach": "Entonces me quedaré con lo que quieras compartir."
      }
    },
    "close": {
      "en": {
        "client": "I'd rather leave this here for today.",
        "coach": "We can leave the question open for another time."
      },
      "ru": {
        "client": "На сегодня я хотел бы остановиться.",
        "coach": "Можно оставить вопрос открытым до другого раза."
      },
      "es": {
        "client": "Prefiero dejarlo aquí por hoy.",
        "coach": "Podemos dejar la pregunta abierta para otro momento."
      }
    }
  },
  "harry": {
    "goal": {
      "en": {
        "client": "I want something to change, but I don't know what.",
        "coach": "What would you like to face with a little more confidence?"
      },
      "ru": {
        "client": "Хочу перемен, но не знаю каких.",
        "coach": "С чем тебе хотелось бы справляться чуть увереннее?"
      },
      "es": {
        "client": "Quiero un cambio, pero no sé cuál.",
        "coach": "¿Qué te gustaría afrontar con un poco más de confianza?"
      }
    },
    "reality": {
      "en": {
        "client": "I keep putting it off when the day gets busy.",
        "coach": "What actually gets in your way on those busy days?"
      },
      "ru": {
        "client": "Когда день становится загруженным, я всё откладываю.",
        "coach": "Что реально встаёт у тебя на пути в такие загруженные дни?"
      },
      "es": {
        "client": "Lo pospongo cuando el día se complica.",
        "coach": "¿Qué se interpone de verdad en esos días tan ocupados?"
      }
    },
    "resources": {
      "en": {
        "client": "Last week it worked once.",
        "coach": "What or who was on your side that time?"
      },
      "ru": {
        "client": "На прошлой неделе однажды получилось.",
        "coach": "Что или кто помог тебе в тот раз?"
      },
      "es": {
        "client": "La semana pasada funcionó una vez.",
        "coach": "¿Qué o quién estuvo de tu lado aquella vez?"
      }
    },
    "options": {
      "en": {
        "client": "I can see two possible ways, but neither is perfect.",
        "coach": "Which path seems safe enough to explore, even with doubts?"
      },
      "ru": {
        "client": "Вижу два пути, но ни один не идеален.",
        "coach": "Какой путь кажется достаточно безопасным для исследования, даже с сомнениями?"
      },
      "es": {
        "client": "Veo dos caminos, pero ninguno es perfecto.",
        "coach": "¿Qué camino parece lo bastante seguro para explorar, incluso con dudas?"
      }
    },
    "action": {
      "en": {
        "client": "I have an idea, but I haven't decided whether to try it.",
        "coach": "No heroics needed. You get to decide whether to try."
      },
      "ru": {
        "client": "У меня есть идея, но я ещё не решил, пробовать ли её.",
        "coach": "Никакого геройства не требуется. Ты сам решаешь, пробовать ли."
      },
      "es": {
        "client": "Tengo una idea, pero aún no decidí si probarla.",
        "coach": "No hacen falta heroicidades. Tú decides si probarlo."
      }
    },
    "review": {
      "en": {
        "client": "I learned something, but not everything is resolved.",
        "coach": "It's okay to have learned something without having it all sorted."
      },
      "ru": {
        "client": "Я кое-что понял, но не всё решено.",
        "coach": "Можно кое-что понять, даже если ещё не всё разобралось."
      },
      "es": {
        "client": "Aprendí algo, pero no todo está resuelto.",
        "coach": "Está bien haber aprendido algo sin tenerlo todo resuelto."
      }
    },
    "support": {
      "en": {
        "client": "I'm afraid of getting it wrong again.",
        "coach": "You don't have to prove your courage by trying again now."
      },
      "ru": {
        "client": "Мне страшно снова ошибиться.",
        "coach": "Не нужно доказывать свою смелость новой попыткой прямо сейчас."
      },
      "es": {
        "client": "Tengo miedo de equivocarme otra vez.",
        "coach": "No tienes que demostrar tu valor intentándolo otra vez ahora."
      }
    },
    "repair": {
      "en": {
        "client": "No, that isn't what I meant.",
        "coach": "Thanks for saying so. I got that wrong."
      },
      "ru": {
        "client": "Нет, я имел в виду другое.",
        "coach": "Спасибо, что сказал. Я неправильно понял."
      },
      "es": {
        "client": "No, no quise decir eso.",
        "coach": "Gracias por decirlo. Lo entendí mal."
      }
    },
    "listen": {
      "en": {
        "client": "I don't want advice right now.",
        "coach": "Sure. I'll listen, no fixes."
      },
      "ru": {
        "client": "Я сейчас не хочу советов.",
        "coach": "Конечно. Буду слушать, без попыток всё исправить."
      },
      "es": {
        "client": "Ahora no quiero consejos.",
        "coach": "Claro. Escucharé, sin intentar arreglar nada."
      }
    },
    "close": {
      "en": {
        "client": "I'd rather leave this here for today.",
        "coach": "All right. We can call it a day."
      },
      "ru": {
        "client": "На сегодня я хотел бы остановиться.",
        "coach": "Хорошо. На сегодня можно закончить."
      },
      "es": {
        "client": "Prefiero dejarlo aquí por hoy.",
        "coach": "De acuerdo. Podemos terminar por hoy."
      }
    }
  },
  "genie": {
    "goal": {
      "en": {
        "client": "I want something to change, but I don't know what.",
        "coach": "What real need might be hiding behind that wish?"
      },
      "ru": {
        "client": "Хочу перемен, но не знаю каких.",
        "coach": "Какая настоящая потребность может стоять за этим желанием?"
      },
      "es": {
        "client": "Quiero un cambio, pero no sé cuál.",
        "coach": "¿Qué necesidad real podría estar detrás de ese deseo?"
      }
    },
    "reality": {
      "en": {
        "client": "I keep putting it off when the day gets busy.",
        "coach": "What is the real obstacle, once we put the magic lamp aside?"
      },
      "ru": {
        "client": "Когда день становится загруженным, я всё откладываю.",
        "coach": "Какое препятствие реально существует, если отложить волшебную лампу?"
      },
      "es": {
        "client": "Lo pospongo cuando el día se complica.",
        "coach": "¿Cuál es el obstáculo real, si dejamos la lámpara mágica a un lado?"
      }
    },
    "resources": {
      "en": {
        "client": "Last week it worked once.",
        "coach": "What useful spark was already there that day?"
      },
      "ru": {
        "client": "На прошлой неделе однажды получилось.",
        "coach": "Какая полезная искра уже была у вас в тот день?"
      },
      "es": {
        "client": "La semana pasada funcionó una vez.",
        "coach": "¿Qué chispa útil ya estaba presente aquel día?"
      }
    },
    "options": {
      "en": {
        "client": "I can see two possible ways, but neither is perfect.",
        "coach": "What other earthly route might preserve what matters in both options?"
      },
      "ru": {
        "client": "Вижу два пути, но ни один не идеален.",
        "coach": "Какой другой земной путь мог бы сохранить важное в обоих вариантах?"
      },
      "es": {
        "client": "Veo dos caminos, pero ninguno es perfecto.",
        "coach": "¿Qué otro camino terrenal conservaría lo importante de ambas opciones?"
      }
    },
    "action": {
      "en": {
        "client": "I have an idea, but I haven't decided whether to try it.",
        "coach": "The idea can stay an idea until you choose otherwise."
      },
      "ru": {
        "client": "У меня есть идея, но я ещё не решил, пробовать ли её.",
        "coach": "Идея может оставаться идеей, пока вы сами не решите иначе."
      },
      "es": {
        "client": "Tengo una idea, pero aún no decidí si probarla.",
        "coach": "La idea puede seguir siendo una idea hasta que tú decidas otra cosa."
      }
    },
    "review": {
      "en": {
        "client": "I learned something, but not everything is resolved.",
        "coach": "We have an insight, not a guaranteed wish fulfilled."
      },
      "ru": {
        "client": "Я кое-что понял, но не всё решено.",
        "coach": "Есть новое понимание, а не гарантированно исполненное желание."
      },
      "es": {
        "client": "Aprendí algo, pero no todo está resuelto.",
        "coach": "Hay una comprensión nueva, no un deseo cumplido garantizado."
      }
    },
    "support": {
      "en": {
        "client": "I'm afraid of getting it wrong again.",
        "coach": "We can leave the performance aside. There's no need to try again now."
      },
      "ru": {
        "client": "Мне страшно снова ошибиться.",
        "coach": "Оставим игру в стороне. Сейчас необязательно пробовать снова."
      },
      "es": {
        "client": "Tengo miedo de equivocarme otra vez.",
        "coach": "Dejemos la actuación de lado. No hace falta intentarlo de nuevo ahora."
      }
    },
    "repair": {
      "en": {
        "client": "No, that isn't what I meant.",
        "coach": "I misunderstood. I'll set that story aside."
      },
      "ru": {
        "client": "Нет, я имел в виду другое.",
        "coach": "Я неправильно понял. Отложу эту версию в сторону."
      },
      "es": {
        "client": "No, no quise decir eso.",
        "coach": "Lo entendí mal. Dejaré esa versión de lado."
      }
    },
    "listen": {
      "en": {
        "client": "I don't want advice right now.",
        "coach": "No tricks, no suggestions. I'll listen."
      },
      "ru": {
        "client": "Я сейчас не хочу советов.",
        "coach": "Без фокусов и предложений. Буду слушать."
      },
      "es": {
        "client": "Ahora no quiero consejos.",
        "coach": "Sin trucos ni sugerencias. Escucharé."
      }
    },
    "close": {
      "en": {
        "client": "I'd rather leave this here for today.",
        "coach": "Of course. We'll leave that wish open."
      },
      "ru": {
        "client": "На сегодня я хотел бы остановиться.",
        "coach": "Конечно. Оставим это желание открытым."
      },
      "es": {
        "client": "Prefiero dejarlo aquí por hoy.",
        "coach": "Claro. Dejemos abierto ese deseo."
      }
    }
  },
  "caesar": {
    "goal": {
      "en": {
        "client": "I want something to change, but I don't know what.",
        "coach": "What outcome would reflect a position you have chosen for yourself?"
      },
      "ru": {
        "client": "Хочу перемен, но не знаю каких.",
        "coach": "Какой результат отражал бы позицию, которую вы выбрали сами?"
      },
      "es": {
        "client": "Quiero un cambio, pero no sé cuál.",
        "coach": "¿Qué resultado reflejaría una posición elegida por ti?"
      }
    },
    "reality": {
      "en": {
        "client": "I keep putting it off when the day gets busy.",
        "coach": "Which part of what happens is actually within your influence?"
      },
      "ru": {
        "client": "Когда день становится загруженным, я всё откладываю.",
        "coach": "Какая часть происходящего действительно находится в сфере вашего влияния?"
      },
      "es": {
        "client": "Lo pospongo cuando el día se complica.",
        "coach": "¿Qué parte de lo que ocurre está realmente dentro de tu influencia?"
      }
    },
    "resources": {
      "en": {
        "client": "Last week it worked once.",
        "coach": "What resource or support was available to you then?"
      },
      "ru": {
        "client": "На прошлой неделе однажды получилось.",
        "coach": "Какой ресурс или поддержка были вам тогда доступны?"
      },
      "es": {
        "client": "La semana pasada funcionó una vez.",
        "coach": "¿Qué recurso o apoyo tenías disponible entonces?"
      }
    },
    "options": {
      "en": {
        "client": "I can see two possible ways, but neither is perfect.",
        "coach": "Which option best respects your values and other people's freedom?"
      },
      "ru": {
        "client": "Вижу два пути, но ни один не идеален.",
        "coach": "Какой вариант лучше учитывает ваши ценности и свободу других людей?"
      },
      "es": {
        "client": "Veo dos caminos, pero ninguno es perfecto.",
        "coach": "¿Qué opción respeta mejor tus valores y la libertad de los demás?"
      }
    },
    "action": {
      "en": {
        "client": "I have an idea, but I haven't decided whether to try it.",
        "coach": "Your decision remains yours. There is no obligation to act."
      },
      "ru": {
        "client": "У меня есть идея, но я ещё не решил, пробовать ли её.",
        "coach": "Решение остаётся за вами. Обязательства действовать нет."
      },
      "es": {
        "client": "Tengo una idea, pero aún no decidí si probarla.",
        "coach": "La decisión sigue siendo tuya. No hay obligación de actuar."
      }
    },
    "review": {
      "en": {
        "client": "I learned something, but not everything is resolved.",
        "coach": "We can acknowledge your own insight without declaring the matter settled."
      },
      "ru": {
        "client": "Я кое-что понял, но не всё решено.",
        "coach": "Признаем ваше понимание, не объявляя вопрос решённым."
      },
      "es": {
        "client": "Aprendí algo, pero no todo está resuelto.",
        "coach": "Podemos reconocer tu comprensión sin declarar resuelto el asunto."
      }
    },
    "support": {
      "en": {
        "client": "I'm afraid of getting it wrong again.",
        "coach": "There is no need to make a difficult decision while you are afraid."
      },
      "ru": {
        "client": "Мне страшно снова ошибиться.",
        "coach": "Нет необходимости принимать трудное решение в состоянии страха."
      },
      "es": {
        "client": "Tengo miedo de equivocarme otra vez.",
        "coach": "No es necesario tomar una decisión difícil mientras sientes miedo."
      }
    },
    "repair": {
      "en": {
        "client": "No, that isn't what I meant.",
        "coach": "I accept your correction. Your words take precedence."
      },
      "ru": {
        "client": "Нет, я имел в виду другое.",
        "coach": "Принимаю поправку. Ваши слова имеют приоритет."
      },
      "es": {
        "client": "No, no quise decir eso.",
        "coach": "Acepto tu corrección. Tus palabras tienen prioridad."
      }
    },
    "listen": {
      "en": {
        "client": "I don't want advice right now.",
        "coach": "I respect your decision not to receive advice."
      },
      "ru": {
        "client": "Я сейчас не хочу советов.",
        "coach": "Уважаю ваше решение не получать советов."
      },
      "es": {
        "client": "Ahora no quiero consejos.",
        "coach": "Respeto tu decisión de no recibir consejos."
      }
    },
    "close": {
      "en": {
        "client": "I'd rather leave this here for today.",
        "coach": "We can conclude here. Uncertainty does not require a forced decision."
      },
      "ru": {
        "client": "На сегодня я хотел бы остановиться.",
        "coach": "Можем завершить здесь. Неопределённость не требует принудительного решения."
      },
      "es": {
        "client": "Prefiero dejarlo aquí por hoy.",
        "coach": "Podemos concluir aquí. La incertidumbre no exige una decisión forzada."
      }
    }
  }
}
for(const persona of Object.values(REFERENCES)){for(const mode of Object.values(persona)){for(const pair of Object.values(mode))Object.freeze(pair);Object.freeze(mode)}Object.freeze(persona)}
Object.freeze(REFERENCES)
function coachPersonalityReference(personaId,mode,stage,locale="en"){
 const bank=Object.hasOwn(REFERENCES,personaId)?REFERENCES[personaId]:null;
 if(!bank)return null;
 const key=Object.hasOwn(bank,mode)&&["support","repair","listen","close"].includes(mode)?mode:
   ["explore","action","review"].includes(mode)&&Object.hasOwn(bank,stage)?stage:null;
 if(!key)return null;
 const language=["en","ru","es"].includes(locale)?locale:"en";
 return bank[key][language];
}

function coachPersonalityReferenceGuidance(personaId,mode,stage,locale){
 const example=coachPersonalityReference(personaId,mode,stage,locale);
 return example?" Fictional style-only example (not client data, do not repeat, copy facts, ask an unauthorized question or adopt its coaching move): "+JSON.stringify(example)+".":"";
}
export {REFERENCES as COACH_PERSONALITY_REFERENCES,coachPersonalityReference,coachPersonalityReferenceGuidance}
