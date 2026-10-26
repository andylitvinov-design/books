// Independent acceptance snapshot of the fresh AS6.0 Day5 edition.
// Historical AS5.9 copy and its original single-action gate remain separate.
// This is test data, not editorial approval or a runtime curriculum source.
export const OPORA_BROWSER_FRESH_EDITION = 'as-6.0-experiments-v1'
export const OPORA_BROWSER_DAY5_COPY = Object.freeze({
  "ru": {
    "supportTitle": "Отделять мысли от фактов",
    "purpose": "Сегодня мы учимся замечать тревожную мысль как мысль, а не приказ или проверенный факт. Не нужно спорить с собой или заставлять мысль исчезнуть.",
    "practice": "«Радио мыслей»: замечаем внутренний комментарий, не принимая его за приказ.",
    "experiment": {
      "steps": [
        "Возьмите нейтральный пример: «Мне надо ответить на всё прямо сейчас».",
        "Добавьте перед ней: «Я замечаю мысль, что…». Не нужно спорить с ней.",
        "Спросите, нужен ли маленький шаг сейчас или мысль может немного подождать."
      ],
      "prompt": "Как обращаться с тревожной мыслью?",
      "choices": [
        {
          "id": "label",
          "label": "Назвать мыслью"
        },
        {
          "id": "fact",
          "label": "Проверить факт"
        },
        {
          "id": "pause",
          "label": "Отложить"
        }
      ]
    }
  },
  "en": {
    "supportTitle": "Making room around worried thoughts",
    "purpose": "Today we practise noticing a worried thought as a thought, not an order or a verified fact. There is no need to argue with it or force it away.",
    "practice": "Try thought radio: notice an inner commentary without treating it as an order.",
    "experiment": {
      "steps": [
        "Use a mild fictional thought: “I must answer everything right now.”",
        "Place “I notice I am having the thought that…” before it. No arguing required.",
        "Ask whether a small action is useful now or the thought can wait."
      ],
      "prompt": "How might you respond to a worry thought?",
      "choices": [
        {
          "id": "label",
          "label": "Name it as a thought"
        },
        {
          "id": "fact",
          "label": "Check a fact"
        },
        {
          "id": "pause",
          "label": "Set aside"
        }
      ]
    }
  },
  "es": {
    "supportTitle": "Tomar distancia de las preocupaciones",
    "purpose": "Hoy practicamos ver un pensamiento preocupante como pensamiento, no como orden ni hecho demostrado. No hace falta discutir con él ni expulsarlo.",
    "practice": "Prueba la radio mental: observa un comentario sin convertirlo en orden.",
    "experiment": {
      "steps": [
        "Usa una idea ficticia leve: «Debo contestar todo ahora».",
        "Anteponle «Noto que tengo el pensamiento de que…», sin discutir.",
        "Pregunta si hace falta un paso pequeño ahora o si la idea puede esperar."
      ],
      "prompt": "¿Cómo responder a una preocupación?",
      "choices": [
        {
          "id": "label",
          "label": "Nombrarla pensamiento"
        },
        {
          "id": "fact",
          "label": "Comprobar un hecho"
        },
        {
          "id": "pause",
          "label": "Dejarla pasar"
        }
      ]
    }
  }
})
