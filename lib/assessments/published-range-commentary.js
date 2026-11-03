// Contextual range explanations are keyed to already-verified, exact instrument
// and dimension identities. They do not define, move or validate score cutoffs.
// Primary sources: OECD 2025 PHQ-4, CDC PHQ-9/PHQ-8, JAMA GAD-7, CDC K6,
// PHQscreeners PHQ-15, Johns Hopkins BRCS, and NYU ASRS-v1.1 scoring guidance.
// A client must only use these notes after interpretationBandModel validates
// immutable result provenance and its existing source-backed band rules.
export const PUBLISHED_RANGE_COMMENTARY = Object.freeze({
  "phq-2": {
    "symptoms.phq2.total": {
      "below_screen": {
        "ru": "За последние две недели суммарные ответы о настроении и интересе ниже порога 3/6. Если симптомы мешают жить, их стоит обсудить независимо от суммы.",
        "en": "Across the past two weeks, the combined low-mood and interest responses are below the 3/6 screening threshold. Seek advice if problems affect daily life regardless of this total."
      },
      "screen_signal": {
        "ru": "Сумма 3–6/6 достигла порога, при котором полезна более полная оценка симптомов настроения. Это не диагноз депрессии.",
        "en": "A 3–6/6 total meets the threshold for considering a fuller assessment of mood symptoms. It is not a depression diagnosis."
      }
    }
  },
  "gad-2": {
    "symptoms.gad2.total": {
      "below_screen": {
        "ru": "Ответы о нервозности и трудноуправляемом беспокойстве ниже порога 3/6. Отдельные значимые трудности возможны и при меньшей сумме.",
        "en": "The nervousness and difficult-to-control worry responses are below 3/6. Significant difficulties can still occur with a lower total."
      },
      "screen_signal": {
        "ru": "Сумма 3–6/6 служит сигналом для уточняющей оценки тревоги и её влияния на сон, дела и отношения; она не подтверждает расстройство.",
        "en": "A 3–6/6 score signals that a fuller anxiety assessment may be helpful, including effects on sleep, daily tasks and relationships; it does not confirm a disorder."
      }
    }
  },
  "phq-4": {
    "symptoms.phq4.total": {
      "minimal": {
        "ru": "Общая сумма тревожных и депрессивных симптомов за две недели находится в нижней опубликованной категории 0–2/12. Всё равно посмотрите обе подшкалы и влияние на жизнь.",
        "en": "The combined two-week mood and anxiety symptom total falls in the lowest published 0–2/12 category. Review both subscales and daily impact separately."
      },
      "mild": {
        "ru": "Общая сумма 3–5/12 соответствует лёгкой категории психологического дистресса. Важно выяснить, вклад какой из двух подшкал больше.",
        "en": "The 3–5/12 total corresponds to the mild distress category. Check which of the anxiety and low-mood subscales contributes most."
      },
      "moderate": {
        "ru": "Общая сумма 6–8/12 соответствует умеренной категории дистресса. Уточните симптомы по отдельным подшкалам и их последствия для повседневных дел.",
        "en": "The 6–8/12 total is in the moderate distress category. Review each symptom subscale and how concerns affect day-to-day functioning."
      },
      "severe": {
        "ru": "Общая сумма 9–12/12 попадает в верхнюю опубликованную категорию дистресса. Желательно обсудить переживания с квалифицированным специалистом; это не диагноз.",
        "en": "The 9–12/12 total falls in the highest published distress category. Consider discussing the concerns with a qualified professional; this is not a diagnosis."
      }
    },
    "symptoms.phq4.depression": {
      "below_screen": {
        "ru": "Два вопроса об утрате интереса и сниженном настроении дают 0–2/6, ниже скринингового порога 3. Это не исключает других эмоциональных затруднений.",
        "en": "The two low-mood and loss-of-interest items total 0–2/6, below the screening threshold of 3; this does not rule out other emotional difficulties."
      },
      "screen_signal": {
        "ru": "Два вопроса о настроении дают 3–6/6, что достигает порога для дополнительного уточнения депрессивных симптомов, но не подтверждает диагноз.",
        "en": "The two mood items total 3–6/6, reaching the threshold for further evaluation of depressive symptoms without establishing a diagnosis."
      }
    },
    "symptoms.phq4.anxiety": {
      "below_screen": {
        "ru": "Два вопроса о нервозности и беспокойстве дают 0–2/6, ниже скринингового порога 3. Если тревога мешает, значение не отменяет необходимости поддержки.",
        "en": "The two anxiety items total 0–2/6, below 3; if anxiety interferes with life, a below-threshold score does not negate the need for support."
      },
      "screen_signal": {
        "ru": "Два вопроса о нервозности и беспокойстве дают 3–6/6: полезно уточнить тревогу и её влияние на повседневную жизнь. Это не диагноз.",
        "en": "The two anxiety items total 3–6/6: consider further assessment of anxiety and its everyday impact. This is not a diagnosis."
      }
    }
  },
  "phq-9": {
    "symptoms.phq9.total": {
      "minimal": {
        "ru": "Сумма 0–4/27 отражает минимальную частоту девяти симптомов за последние две недели. Даже маленькая сумма не заменяет отдельную проверку вопроса о безопасности.",
        "en": "A 0–4/27 total reflects minimal endorsement of nine symptoms over two weeks. Even a low total never replaces the separate item-level safety check."
      },
      "mild": {
        "ru": "Сумма 5–9/27 соответствует лёгкой категории симптомов. Отметьте, что конкретно мешало обычным делам; устойчивые переживания можно обсудить со специалистом.",
        "en": "A 5–9/27 total is in the mild symptom range. Identify which specific experiences affected daily life; persistent difficulties are worth discussing."
      },
      "moderate": {
        "ru": "Сумма 10–14/27 — умеренная опубликованная категория; от 10 баллов применяется распространённый порог дальнейшего клинического уточнения. Это не диагноз.",
        "en": "A 10–14/27 total is moderate; 10 is a commonly used threshold for further clinical evaluation. This is not a diagnosis."
      },
      "moderately_severe": {
        "ru": "Сумма 15–19/27 соответствует значительно выраженным симптомам. Рекомендуется профессиональная оценка влияния на жизнь; вопрос о безопасности рассматривается отдельно.",
        "en": "A 15–19/27 total is moderately severe. Professional evaluation of day-to-day impact is advisable; safety responses require separate attention."
      },
      "severe": {
        "ru": "Сумма 20–27/27 — верхняя опубликованная категория выраженности симптомов. Нужна своевременная профессиональная оценка; при непосредственной опасности — экстренная помощь независимо от суммы.",
        "en": "A 20–27/27 total is the highest published symptom category. Timely professional assessment is important; immediate danger warrants emergency help regardless of the total."
      }
    }
  },
  "phq-8": {
    "symptoms.phq_8.total": {
      "minimal": {
        "ru": "Сумма PHQ-8 0–4/24 отражает минимум сообщённых депрессивных симптомов за две недели. В PHQ-8 нет девятого вопроса PHQ-9 о безопасности.",
        "en": "A 0–4/24 PHQ-8 total reflects minimal reported depressive symptoms over two weeks. PHQ-8 omits PHQ-9's ninth safety item."
      },
      "mild": {
        "ru": "Сумма 5–9/24 соответствует лёгкой категории PHQ-8. Рассмотрите отдельные симптомы, их продолжительность и влияние на день.",
        "en": "A 5–9/24 total is in the mild PHQ-8 symptom range. Consider the individual symptoms, their persistence and everyday impact."
      },
      "moderate": {
        "ru": "Сумма 10–14/24 достигает часто используемого порога клинически значимых симптомов PHQ-8; необходима дополнительная оценка с учётом ситуации.",
        "en": "A 10–14/24 total meets a commonly used threshold for potentially clinically significant PHQ-8 symptoms; fuller contextual assessment is appropriate."
      },
      "moderately_severe": {
        "ru": "Сумма 15–19/24 — значительно выраженные симптомы в пятиуровневом варианте интерпретации; ряд публикаций объединяет диапазон 15–24 в одну тяжёлую категорию.",
        "en": "A 15–19/24 total is moderately severe in the five-band convention; some published PHQ-8 surveillance reports instead group 15–24 as severe."
      },
      "severe": {
        "ru": "Сумма 20–24/24 — верхняя часть пятиуровневой шкалы PHQ-8. Полезна своевременная профессиональная оценка; PHQ-8 сам по себе не оценивает безопасность.",
        "en": "A 20–24/24 total is the highest five-band PHQ-8 range. Timely professional review is appropriate; PHQ-8 alone does not assess safety."
      }
    }
  },
  "gad-7": {
    "symptoms.gad7.total": {
      "minimal": {
        "ru": "Сумма тревожных симптомов 0–4/21 соответствует минимальной категории за последние две недели. Это не исключает отдельных значимых тревожных ситуаций.",
        "en": "A 0–4/21 score reflects minimal anxiety symptoms over two weeks but cannot rule out particular distressing situations."
      },
      "mild": {
        "ru": "Сумма 5–9/21 соответствует лёгким симптомам тревоги. Отмечайте, какие переживания повторяются и когда беспокойство мешает делам.",
        "en": "A 5–9/21 score reflects mild anxiety symptoms. Notice which worries recur and where anxiety affects everyday activities."
      },
      "moderate": {
        "ru": "Сумма 10–14/21 соответствует умеренным симптомам; 10 баллов — опубликованный порог для дополнительного уточнения генерализованной тревоги, не диагноз.",
        "en": "A 10–14/21 score reflects moderate anxiety; 10 is a published threshold for further GAD evaluation, not a diagnosis."
      },
      "severe": {
        "ru": "Сумма 15–21/21 относится к верхнему диапазону тревожных симптомов. Обсудите выраженность и влияние на функционирование с квалифицированным специалистом.",
        "en": "A 15–21/21 score is the highest anxiety symptom range. Discuss intensity and everyday functioning with a qualified professional."
      }
    }
  },
  "k6": {
    "symptoms.k6.total": {
      "below_screen": {
        "ru": "Сумма 0–12/24 ниже порога 13, использованного в исследованиях для скрининга серьёзного психологического дистресса. Это не означает отсутствие стресса или любых расстройств.",
        "en": "A 0–12/24 sum is below the research screening threshold of 13 for serious distress. It does not establish absence of stress or any disorder."
      },
      "screen_signal": {
        "ru": "Сумма 13–24/24 достигает исследовательского скринингового порога серьёзного неспецифического дистресса. Его точность зависит от популяции; личную вероятность или диагноз по нему не определяют.",
        "en": "A 13–24/24 total reaches a research screening threshold for serious non-specific distress. Its calibration depends on population; it is not an individual probability or diagnosis."
      }
    }
  },
  "phq-15": {
    "symptoms.phq15.total": {
      "minimal": {
        "ru": "Сумма 0–4/30 означает минимальную выраженность сообщаемых телесных симптомов за четыре недели. Она не исключает заболевания при настораживающих жалобах.",
        "en": "A 0–4/30 score indicates minimal reported bodily symptom burden over four weeks. A low total does not rule out medical conditions when symptoms are concerning."
      },
      "low": {
        "ru": "Сумма 5–9/30 отражает невысокую выраженность телесных жалоб. Учитывайте наиболее беспокоящий симптом и его медицинский контекст.",
        "en": "A 5–9/30 total reflects a lower bodily symptom burden. Focus on the most concerning symptom and its medical context."
      },
      "medium": {
        "ru": "Сумма 10–14/30 соответствует умеренной выраженности телесных жалоб. Балл не различает физические и психологические причины.",
        "en": "A 10–14/30 total reflects moderate bodily symptom burden. It does not distinguish physical from psychological causes."
      },
      "high": {
        "ru": "Сумма 15–30/30 соответствует высокой выраженности сообщаемых телесных жалоб. При новых, стойких или усиливающихся симптомах важна медицинская оценка; психологическую причину предполагать нельзя.",
        "en": "A 15–30/30 total reflects high reported bodily symptom burden. New, persistent or worsening symptoms merit medical evaluation; a psychological cause must not be presumed."
      }
    }
  },
  "brcs": {
    "resources.brcs.total": {
      "low_coping": {
        "ru": "Сумма 4–13/20 соответствует нижней опубликованной группе ответов о гибком совладании. Это самоописание четырёх утверждений, а не подтверждение неспособности справляться.",
        "en": "A 4–13/20 total falls in the lower published resilient-coping range. Four self-report items cannot establish an inability to cope."
      },
      "mid_coping": {
        "ru": "Сумма 14–16/20 соответствует средней опубликованной группе способов совладания. Изучите, какие гибкие реакции доступны в конкретных обстоятельствах.",
        "en": "A 14–16/20 total is in the middle published coping range. Explore which flexible responses are available in specific situations."
      },
      "high_coping": {
        "ru": "Сумма 17–20/20 — верхняя опубликованная группа склонности к гибкому совладанию. Это не гарантия эффективности каждого способа в реальной стрессовой ситуации.",
        "en": "A 17–20/20 total is in the upper published range of resilient-coping tendencies, not a guarantee that every strategy works in real-world stress."
      }
    }
  },
  "asrs-6": {
    "symptoms.asrs6.shaded_count": {
      "below_screen": {
        "ru": "Менее четырёх из шести ответов попали в заштрихованные поля классического ASRS-v1.1. Такой результат не исключает СДВГ и не является оценкой тяжести.",
        "en": "Fewer than four of six classic ASRS-v1.1 items qualify under the shaded-response rule. This does not rule out ADHD or measure severity."
      },
      "screen_signal": {
        "ru": "Четыре–шесть из шести ответов соответствуют классическому скрининговому признаку ASRS-v1.1. Для диагноза требуется квалифицированная оценка, а не этот счётчик.",
        "en": "Four to six qualifying ASRS-v1.1 shaded responses meet the classic screening signal. Diagnosis requires professional evaluation, not this count."
      }
    }
  }
})

export function publishedRangeCommentary(resultKey, dimensionKey, bandCode, locale = 'en') {
  if (![resultKey, dimensionKey, bandCode].every(value => typeof value === 'string' && value.length)) return null
  const copy = PUBLISHED_RANGE_COMMENTARY[resultKey]?.[dimensionKey]?.[bandCode]
  return copy?.[locale === 'ru' ? 'ru' : 'en'] || null
}
