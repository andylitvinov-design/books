// Holistic House authored explanatory prose and optional reflection, not validated
// questionnaire translations, clinical advice, norms or scoring rules.
// Meanings checked against immutable original English items and their keyed polarity.
// Primary source keys: https://ipip.ori.org/BFASKeys.htm
// https://ipip.ori.org/IPIP-VIA-R_Key.html
// https://ipip.ori.org/IPIP-VIA-R-core-strengths_Key.html
// https://gosling.psy.utexas.edu/scales-weve-developed/ten-item-personality-measure-tipi/ten-item-personality-inventory-tipi/
// Mini-IPIP source items and scorer remain the pinned definitions/scoring modules.
// Explicit identity allowlist prevents future versions inheriting this prose silently.
const IDENTITIES = {
  "921c3ba9-2c20-5763-867f-29553cd491cd": [
    "trait.extraversion",
    "trait.agreeableness",
    "trait.conscientiousness",
    "trait.neuroticism",
    "trait.intellect_imagination"
  ],
  "d6277cc3-f343-5576-afc4-2a4717387448": [
    "trait.bfas.volatility"
  ],
  "47f0cced-c738-560f-a260-f5c93c17042c": [
    "trait.bfas.withdrawal"
  ],
  "03b38216-fe2a-520a-a9c0-f74e8d204a28": [
    "trait.bfas.compassion"
  ],
  "674407f4-04f2-5cfc-a9a1-2ba8702fe8a4": [
    "trait.bfas.industriousness"
  ],
  "918240af-eb81-514b-ad1f-a7d9d6f60bff": [
    "trait.bfas.orderliness"
  ],
  "fc6dc5c8-3642-53c8-a118-4435f2c9aa6a": [
    "trait.bfas.intellect"
  ],
  "0934a6ef-65e8-58ff-a897-ff021e4a863d": [
    "trait.bfas.openness"
  ],
  "ac69dd83-0fa4-5ffd-ae46-f86e48edd369": [
    "trait.via.capacity_for_love"
  ],
  "a73591ea-aa21-5dbd-a524-ed04ecbe688f": [
    "trait.via.curiosity"
  ],
  "4599d220-c3c1-5a32-acbb-3fce95d4bb4c": [
    "trait.via.forgiveness"
  ],
  "7d57d976-9ac3-5f0f-a1c0-dc6c6ff4cde9": [
    "trait.via.gratitude"
  ],
  "6b803c55-e713-5110-a125-b8bb7e613914": [
    "trait.via.hope"
  ],
  "972393f1-2f84-510b-aeac-b97fe99dd69c": [
    "trait.via.humor"
  ],
  "39bc7056-3b0e-5377-aac8-34f30bb26676": [
    "trait.via.perseverance"
  ],
  "1833e942-2887-54cf-a1db-270e6c566b05": [
    "trait.via.creativity"
  ],
  "c1d1b8f4-7e06-53e2-a5f8-539874959f6d": [
    "trait.via.social_intelligence"
  ],
  "c7da129b-23b9-5b9d-a92b-b8b13e6cf482": [
    "trait.via.zest"
  ],
  "6fa6fd5a-0e86-5164-a898-3674a54435e1": [
    "trait.tipi.extraversion",
    "trait.tipi.agreeableness",
    "trait.tipi.conscientiousness",
    "trait.tipi.emotional_stability",
    "trait.tipi.openness"
  ],
  "4282c169-808a-5a23-9c3e-bac9d2696a8d": [
    "trait.via.appreciation_beauty"
  ],
  "2aab919b-5283-586d-a2e5-380c8267812c": [
    "trait.via.teamwork"
  ],
  "25d4624c-2830-5180-adfc-a35c3215c638": [
    "trait.via.fairness"
  ],
  "706d25e1-bab7-564c-8807-f11bd01d0dca": [
    "trait.via.honesty"
  ],
  "ac939bcb-bfb1-51ba-bd84-ba22f6e45aa1": [
    "trait.via.judgment"
  ],
  "bebfef64-55f3-5bc7-81b9-058149ceb837": [
    "trait.via.kindness"
  ],
  "cff96f74-e0b3-5ccb-a648-cb004d993ec7": [
    "trait.via.leadership"
  ],
  "e374c379-af17-5668-a535-2b0c5b0800a7": [
    "trait.via.love_of_learning"
  ],
  "8a90f626-0a76-5f05-833f-8bf0ce92e104": [
    "trait.via.humility"
  ],
  "11ebb81e-c150-5168-a235-c8d6ac948a0f": [
    "trait.via.perspective"
  ],
  "b0911a40-a3fc-5312-b6ab-d367fd5d40fc": [
    "trait.via.prudence"
  ],
  "01939380-b360-5430-956d-bb2a198621cd": [
    "trait.via.self_regulation"
  ],
  "35c3a856-68dd-5d69-9e0e-b9e49cf50a2b": [
    "trait.via.spirituality"
  ],
  "c239828d-da4c-5de2-9e50-aa38fad4ad32": [
    "trait.via.bravery"
  ],
  "24df183a-da18-5e99-bba8-d4f1210e7964": [
    "trait.via.core.positivity"
  ],
  "3d81667e-f088-5fb5-b253-8543562759bc": [
    "trait.via.core.dependability"
  ],
  "6cd07c7d-775a-5b0b-abc9-0c22d7cec774": [
    "trait.via.core.mastery"
  ],
  "a72fd3a8-343c-5499-a9af-3ab45f1633e6": [
    "trait.via.appreciation_beauty",
    "trait.via.bravery",
    "trait.via.capacity_for_love",
    "trait.via.creativity",
    "trait.via.curiosity",
    "trait.via.fairness",
    "trait.via.forgiveness",
    "trait.via.gratitude",
    "trait.via.honesty",
    "trait.via.hope",
    "trait.via.humility",
    "trait.via.humor",
    "trait.via.judgment",
    "trait.via.kindness",
    "trait.via.leadership",
    "trait.via.love_of_learning",
    "trait.via.perseverance",
    "trait.via.perspective",
    "trait.via.prudence",
    "trait.via.self_regulation",
    "trait.via.social_intelligence",
    "trait.via.spirituality",
    "trait.via.teamwork",
    "trait.via.zest"
  ]
}

const TEXT = {
  "trait.extraversion": {
    "en": {
      "explanation": "Higher scores describe more talkative, socially outgoing self-descriptions; lower scores describe being quieter or staying in the background. This does not measure social skill or a need to have more friends.",
      "reflection": "Choose a balance of company and quiet time that fits your energy; notice which setting helps you participate comfortably."
    },
    "ru": {
      "explanation": "Больший балл описывает более разговорчивое и общительное самоописание; меньший — сдержанность и склонность оставаться в стороне. Это не оценка навыков общения или необходимости иметь больше друзей.",
      "reflection": "Подберите удобное сочетание общения и времени наедине с собой; отметьте, в какой обстановке вам легче участвовать в разговоре."
    }
  },
  "trait.agreeableness": {
    "en": {
      "explanation": "Higher scores describe more interest in other people and sensitivity to their feelings; lower scores describe less endorsement of these responses. Four items cannot determine someone's kindness or relationship quality.",
      "reflection": "In one conversation, check what the other person needs while also stating your own limits."
    },
    "ru": {
      "explanation": "Больший балл описывает больший интерес к людям и отклик на их чувства; меньший — меньшее согласие с этими описаниями. Четыре пункта не определяют доброту человека или качество отношений.",
      "reflection": "В одном разговоре уточните, что нужно собеседнику, и обозначьте собственные границы."
    }
  },
  "trait.conscientiousness": {
    "en": {
      "explanation": "Higher scores describe more prompt completion of chores and preference for order; lower scores describe more everyday disorganization. This brief measure does not establish diligence in every area or explain difficulties with tasks.",
      "reflection": "Try one small cue, such as a fixed place for an often-mislaid item, and check whether it reduces friction."
    },
    "ru": {
      "explanation": "Больший балл описывает более своевременное выполнение дел и предпочтение порядка; меньший — больше бытовой неорганизованности. Краткая шкала не устанавливает усердие во всех сферах и не объясняет причины трудностей с делами.",
      "reflection": "Попробуйте одну небольшую опору, например постоянное место для часто теряющейся вещи, и проверьте, стало ли удобнее."
    }
  },
  "trait.neuroticism": {
    "en": {
      "explanation": "Higher scores describe more emotional ups and downs, becoming upset and low mood; lower scores describe greater calm in these answers. This is a personality self-description, not a diagnosis or evidence of weakness.",
      "reflection": "Notice a recent emotional shift, its context and what helped you settle; avoid judging the feeling itself."
    },
    "ru": {
      "explanation": "Больший балл описывает больше перепадов настроения, огорчения и подавленности; меньший — больше спокойствия в этих ответах. Это самоописание черты личности, а не диагноз или свидетельство слабости.",
      "reflection": "Отметьте недавнюю перемену настроения, её обстоятельства и то, что помогло успокоиться, без осуждения самого чувства."
    }
  },
  "trait.intellect_imagination": {
    "en": {
      "explanation": "Higher scores describe more vivid imagination and engagement with abstract ideas; lower scores describe less endorsement of those interests. The score is not an intelligence or creativity performance test.",
      "reflection": "Explore a question through either an imaginative example or a concrete demonstration, choosing the approach you find useful."
    },
    "ru": {
      "explanation": "Больший балл описывает более яркое воображение и интерес к абстрактным идеям; меньший — меньшее согласие с этими интересами. Балл не является проверкой интеллекта или творческих достижений.",
      "reflection": "Разберите интересующий вопрос через воображаемый пример или конкретную демонстрацию, выбрав удобный подход."
    }
  },
  "trait.bfas.volatility": {
    "en": {
      "explanation": "Higher scores describe becoming irritated, upset or emotionally stirred up more readily; lower scores describe steadier composure. This aspect concerns emotional reactivity, not whether feelings are justified or whether someone is dangerous.",
      "reflection": "When you notice irritation rising, try a brief pause before responding and identify what triggered it."
    },
    "ru": {
      "explanation": "Больший балл описывает более лёгкое возникновение раздражения, огорчения и сильного эмоционального отклика; меньший — более устойчивое спокойствие. Эта грань касается реактивности эмоций, а не их обоснованности или опасности человека.",
      "reflection": "Когда раздражение нарастает, попробуйте ненадолго отложить ответ и заметить, что его вызвало."
    }
  },
  "trait.bfas.withdrawal": {
    "en": {
      "explanation": "Higher scores describe more worry, self-doubt, discouragement and feeling threatened or overwhelmed; lower scores describe less of this pattern. Here withdrawal is broader than avoiding people and is not simply introversion.",
      "reflection": "For one worrying situation, separate what is known from what is feared and choose a manageable next step or source of support."
    },
    "ru": {
      "explanation": "Больший балл описывает больше тревоги, сомнений в себе, уныния и ощущения угрозы или перегрузки; меньший — меньше таких переживаний. Здесь склонность к отстранению шире избегания людей и не равна интроверсии.",
      "reflection": "В одной тревожащей ситуации отделите известные факты от опасений и выберите посильный следующий шаг или источник поддержки."
    }
  },
  "trait.bfas.compassion": {
    "en": {
      "explanation": "Higher scores describe more concern for others' feelings and needs and interest in helping; lower scores describe less of this reported involvement. This does not test the accuracy of reading emotions or require self-sacrifice.",
      "reflection": "Ask whether help is wanted and what kind would be useful before taking responsibility for another person's problem."
    },
    "ru": {
      "explanation": "Больший балл описывает большую заботу о чувствах и нуждах других и интерес к помощи; меньший — меньшую выраженность такого участия в ответах. Шкала не проверяет точность понимания эмоций и не требует самопожертвования.",
      "reflection": "Прежде чем брать на себя чужую проблему, спросите, нужна ли помощь и какая именно."
    }
  },
  "trait.bfas.industriousness": {
    "en": {
      "explanation": "Higher scores describe following through on plans, getting started and sustaining task focus; lower scores describe more delay or distraction. This is reported task behavior, not a measure of personal worth or the cause of productivity difficulties.",
      "reflection": "Break one delayed task into a small starting action and check whether the obstacle is unclear instructions, workload or distraction."
    },
    "ru": {
      "explanation": "Больший балл описывает выполнение планов, начало работы и удержание внимания на задаче; меньший — больше откладывания или отвлечений. Это описание поведения в делах, а не ценности человека или причин трудностей с продуктивностью.",
      "reflection": "Разделите отложенную задачу на небольшой первый шаг и проверьте, что мешает: неясность, нагрузка или отвлечения."
    }
  },
  "trait.bfas.orderliness": {
    "en": {
      "explanation": "Higher scores describe stronger preferences for tidiness, schedules, rules and attention to detail; lower scores describe more tolerance of disorder and less routine. Neither end specifies the best way to organize every situation.",
      "reflection": "Choose where a simple routine saves effort and where leaving room for changes is more useful."
    },
    "ru": {
      "explanation": "Больший балл описывает более сильное предпочтение порядка, расписаний, правил и внимания к деталям; меньший — большую терпимость к беспорядку и меньшую приверженность распорядку. Ни один конец не задаёт лучший способ организации всех ситуаций.",
      "reflection": "Определите, где простой распорядок экономит силы, а где полезнее оставить место для изменений."
    }
  },
  "trait.bfas.intellect": {
    "en": {
      "explanation": "Higher scores describe enjoyment of complex ideas and perceived ease with understanding, vocabulary and thinking; lower scores describe less of that self-reported ease or interest. These answers do not measure IQ or establish actual cognitive ability.",
      "reflection": "Try explaining an interesting idea in your own words, using a concrete example if that makes it clearer."
    },
    "ru": {
      "explanation": "Больший балл описывает интерес к сложным идеям и субъективную лёгкость понимания, работы со словами и размышления; меньший — меньше такого интереса или лёгкости в самоописании. Ответы не измеряют IQ и не устанавливают реальные когнитивные способности.",
      "reflection": "Попробуйте объяснить интересную идею своими словами, добавив конкретный пример, если так понятнее."
    }
  },
  "trait.bfas.openness": {
    "en": {
      "explanation": "Higher scores describe greater absorption in art, music, natural beauty, imagination and reflection; lower scores describe less involvement in these experiences. This aspect is about aesthetic and imaginative experience, not intelligence or tolerance of every belief.",
      "reflection": "Notice whether music, nature or another creative outlet feels engaging; choose an accessible form without forcing an emotional response."
    },
    "ru": {
      "explanation": "Больший балл описывает большую погружённость в искусство, музыку, красоту природы, воображение и размышления; меньший — меньшую вовлечённость в такой опыт. Эта грань касается эстетических и образных переживаний, а не интеллекта или принятия любых убеждений.",
      "reflection": "Заметьте, увлекают ли вас музыка, природа или творчество; выберите доступную форму, не заставляя себя испытывать определённые чувства."
    }
  },
  "trait.via.capacity_for_love": {
    "en": {
      "explanation": "Higher scores describe more ease expressing and accepting affection and a sense of reciprocal care; lower scores describe less of this reported experience. Relationship safety and available support matter; the score does not determine whether you are lovable.",
      "reflection": "Consider one safe relationship and a comfortable way to express or receive care; closeness and touch are always optional."
    },
    "ru": {
      "explanation": "Больший балл описывает большую лёгкость выражения и принятия тёплых чувств и ощущение взаимной заботы; меньший — меньше такого опыта в ответах. Важны безопасность отношений и доступная поддержка; балл не определяет, достойны ли вы любви.",
      "reflection": "Подумайте об одних безопасных отношениях и удобном способе выразить или принять заботу; близость и прикосновения всегда остаются выбором."
    }
  },
  "trait.via.curiosity": {
    "en": {
      "explanation": "Higher scores describe broad interests and finding things engaging across situations; lower scores describe fewer or narrower reported interests. This is interest in exploring, not a test of knowledge or learning ability.",
      "reflection": "Choose one small question you genuinely want to explore, without needing to collect more interests."
    },
    "ru": {
      "explanation": "Больший балл описывает разнообразные интересы и способность находить увлекательное в разных ситуациях; меньший — меньшее число или более узкий круг интересов в ответах. Это интерес к исследованию, а не проверка знаний или способности учиться.",
      "reflection": "Выберите один небольшой вопрос, который действительно хочется исследовать, без необходимости расширять круг интересов ради самого количества."
    }
  },
  "trait.via.forgiveness": {
    "en": {
      "explanation": "Higher scores describe more willingness to understand wrongdoing and allow a fresh start, with less holding of grudges; lower scores describe more difficulty doing so. Forgiveness does not require reconciliation, restored trust or tolerating harm.",
      "reflection": "If useful, distinguish letting go of a grievance from deciding what boundaries keep you safe; there is no obligation to reconnect."
    },
    "ru": {
      "explanation": "Больший балл описывает большую готовность понять чужой проступок и дать новый шанс, с меньшей склонностью хранить обиду; меньший — больше трудностей с этим. Прощение не требует примирения, восстановления доверия или терпимости к вреду.",
      "reflection": "Если это полезно, отделите освобождение от обиды от решения о границах безопасности; возобновлять контакт не обязательно."
    }
  },
  "trait.via.gratitude": {
    "en": {
      "explanation": "Higher scores describe more noticing and expressing appreciation for people and life circumstances; lower scores describe less reported gratitude. The score does not mean you owe someone gratitude or should minimize hardship.",
      "reflection": "If it feels genuine, name one helpful thing or thank someone specifically, while leaving room for difficult feelings."
    },
    "ru": {
      "explanation": "Больший балл описывает больше замечаемой и выражаемой признательности людям и обстоятельствам жизни; меньший — меньше благодарности в ответах. Балл не означает, что вы обязаны быть благодарны или преуменьшать трудности.",
      "reflection": "Если это искренне, назовите одну полезную для вас вещь или поблагодарите человека за конкретный поступок, оставляя место трудным чувствам."
    }
  },
  "trait.via.hope": {
    "en": {
      "explanation": "Higher scores describe maintaining hope and seeing possibilities despite difficulties; lower scores describe more negative expectations. This measures an outlook, not the likelihood of success or a requirement to stay positive.",
      "reflection": "Pair one hoped-for outcome with a realistic next step and a backup plan for uncertainty."
    },
    "ru": {
      "explanation": "Больший балл описывает сохранение надежды и видение возможностей при трудностях; меньший — больше негативных ожиданий. Это описание взгляда на будущее, а не вероятности успеха или обязанности сохранять позитивный настрой.",
      "reflection": "Соедините один желаемый исход с реалистичным следующим шагом и запасным планом на случай неопределённости."
    }
  },
  "trait.via.humor": {
    "en": {
      "explanation": "Higher scores describe more use of humor and playfulness, including during difficulty; lower scores describe less identification with that style. This does not assess whether a joke is welcome or whether serious feelings are being avoided.",
      "reflection": "Notice when shared humor brings relief and when the situation calls for direct listening; respect others' reactions."
    },
    "ru": {
      "explanation": "Больший балл описывает больше юмора и игривости, в том числе при трудностях; меньший — меньшую близость к такому стилю. Шкала не оценивает, уместна ли шутка и не избегает ли человек серьёзных чувств.",
      "reflection": "Заметьте, когда общий юмор приносит облегчение, а когда нужно просто выслушать; учитывайте реакцию других."
    }
  },
  "trait.via.perseverance": {
    "en": {
      "explanation": "Higher scores describe continuing and finishing tasks despite obstacles; lower scores describe more difficulty sustaining or completing them. Persistence is not always the best choice when a goal is unsafe, costly or no longer relevant.",
      "reflection": "For one unfinished goal, decide whether to take a small next step, change the approach or deliberately stop."
    },
    "ru": {
      "explanation": "Больший балл описывает продолжение и завершение дел вопреки препятствиям; меньший — больше трудностей с продолжением или завершением. Упорство не всегда полезно, если цель небезопасна, слишком затратна или потеряла смысл.",
      "reflection": "Для одной незавершённой цели решите, сделать ли небольшой следующий шаг, изменить подход или осознанно остановиться."
    }
  },
  "trait.via.creativity": {
    "en": {
      "explanation": "Higher scores describe generating original ideas and new ways of doing things; lower scores describe less identification with this approach. The score does not evaluate the quality, usefulness or originality of an actual product.",
      "reflection": "Generate two different ways to handle a small everyday problem, then test the more practical one."
    },
    "ru": {
      "explanation": "Больший балл описывает придумывание оригинальных идей и новых способов действий; меньший — меньшую близость к этому подходу. Балл не оценивает качество, полезность или оригинальность конкретной работы.",
      "reflection": "Придумайте два разных решения небольшой бытовой задачи и проверьте более практичное."
    }
  },
  "trait.via.social_intelligence": {
    "en": {
      "explanation": "Higher scores describe confidence in sensing feelings, anticipating reactions and navigating social situations; lower scores describe less reported ease. This is self-perception, not an objective test of emotional understanding or mind-reading.",
      "reflection": "Check an impression with a respectful question rather than assuming you know what another person feels."
    },
    "ru": {
      "explanation": "Больший балл описывает уверенность в понимании чувств, ожидании реакций и ориентировании в общении; меньший — меньшую субъективную лёгкость. Это самооценка, а не объективная проверка понимания эмоций или чтения мыслей.",
      "reflection": "Проверьте своё впечатление уважительным вопросом, вместо того чтобы считать чувства другого человека известными."
    }
  },
  "trait.via.zest": {
    "en": {
      "explanation": "Higher scores describe more energy, anticipation and enthusiasm for daily life; lower scores describe less of this reported vitality. Sleep, health and current demands may affect answers; this is not a medical fatigue assessment.",
      "reflection": "Notice which activities restore or drain energy and allow recovery; persistent unexplained exhaustion is worth discussing with a qualified clinician."
    },
    "ru": {
      "explanation": "Больший балл описывает больше энергии, предвкушения и энтузиазма в повседневной жизни; меньший — меньше такой живости в ответах. На ответы могут влиять сон, здоровье и нагрузка; это не медицинская оценка усталости.",
      "reflection": "Заметьте, какие занятия восстанавливают или отнимают силы, и оставляйте время на отдых; стойкое необъяснимое истощение стоит обсудить с врачом."
    }
  },
  "trait.tipi.extraversion": {
    "en": {
      "explanation": "Higher scores describe a more outgoing, enthusiastic style; lower scores describe a more reserved, quiet style. This very brief two-item estimate cannot show the full range of how you behave across settings.",
      "reflection": "Compare how comfortable you feel in a lively group and a quieter interaction, then plan social time accordingly."
    },
    "ru": {
      "explanation": "Больший балл описывает более общительный, увлечённый стиль; меньший — более сдержанный и спокойный в общении. Эта очень краткая оценка по двум пунктам не показывает всё разнообразие поведения в разных обстоятельствах.",
      "reflection": "Сравните комфорт в оживлённой компании и более спокойном общении и учитывайте это при планировании встреч."
    }
  },
  "trait.tipi.agreeableness": {
    "en": {
      "explanation": "Higher scores describe more warmth and sympathy and less quarrelsomeness; lower scores describe more critical or confrontational self-descriptions. Two items cannot establish fairness, trustworthiness or relationship compatibility.",
      "reflection": "In a disagreement, try expressing your position clearly while checking that you understood the other person's view."
    },
    "ru": {
      "explanation": "Больший балл описывает больше теплоты и сочувствия и меньше склонности к ссорам; меньший — более критичное или конфликтное самоописание. Два пункта не устанавливают справедливость, надёжность или совместимость в отношениях.",
      "reflection": "При разногласии попробуйте ясно выразить свою позицию и проверить, правильно ли поняли точку зрения собеседника."
    }
  },
  "trait.tipi.conscientiousness": {
    "en": {
      "explanation": "Higher scores describe more dependability, self-discipline and organization; lower scores describe more disorganization or carelessness in self-description. This broad two-item estimate does not explain why a particular commitment was hard to keep.",
      "reflection": "Choose one commitment and make its next step and timing explicit, adjusting it if the workload is unrealistic."
    },
    "ru": {
      "explanation": "Больший балл описывает больше надёжности, самодисциплины и организованности; меньший — больше неорганизованности или невнимательности в самоописании. Эта широкая оценка по двум пунктам не объясняет, почему было трудно выполнить конкретное обязательство.",
      "reflection": "Выберите одно обязательство, уточните следующий шаг и срок и пересмотрите их, если нагрузка нереалистична."
    }
  },
  "trait.tipi.emotional_stability": {
    "en": {
      "explanation": "Higher scores describe more calm and emotional steadiness; lower scores describe more anxiety and becoming upset easily. The direction is opposite to a neuroticism score. Two items cannot diagnose anxiety or assess coping in every situation.",
      "reflection": "Recall a stressful moment and identify what supported calm or what support was missing, without treating steadiness as an obligation."
    },
    "ru": {
      "explanation": "Больший балл описывает больше спокойствия и эмоциональной устойчивости; меньший — больше тревоги и лёгкости возникновения огорчения. Направление противоположно баллу нейротизма. Два пункта не диагностируют тревожное расстройство и не оценивают совладание во всех ситуациях.",
      "reflection": "Вспомните напряжённый момент и отметьте, что поддержало спокойствие или какой поддержки не хватило, без требования всегда быть невозмутимым."
    }
  },
  "trait.tipi.openness": {
    "en": {
      "explanation": "Higher scores describe more openness to unfamiliar experiences and a less conventional self-image; lower scores describe more conventional preferences. This two-item estimate is not an intelligence test or a ranking of lifestyles.",
      "reflection": "If you want variety, try a small reversible new experience; keeping a familiar preference is also a valid choice."
    },
    "ru": {
      "explanation": "Больший балл описывает большую открытость незнакомому опыту и менее традиционное самоописание; меньший — более привычные, традиционные предпочтения. Оценка по двум пунктам не является тестом интеллекта или рейтингом образа жизни.",
      "reflection": "Если хочется разнообразия, попробуйте небольшой новый опыт, от которого легко отказаться; сохранить привычное предпочтение тоже допустимо."
    }
  },
  "trait.via.appreciation_beauty": {
    "en": {
      "explanation": "Higher scores describe more noticing and emotional response to beauty, including in nature; lower scores describe less of that reported attention. This does not test artistic taste or imply an obligation to enjoy art.",
      "reflection": "Pause briefly with a sound, view or object you find pleasing, if accessible and enjoyable, and notice your response."
    },
    "ru": {
      "explanation": "Больший балл описывает больше внимания и эмоционального отклика на красоту, в том числе в природе; меньший — меньше такого внимания в ответах. Это не проверка художественного вкуса или обязанность любить искусство.",
      "reflection": "Если это доступно и приятно, ненадолго остановитесь у понравившегося вида, звука или предмета и заметьте свой отклик."
    }
  },
  "trait.via.teamwork": {
    "en": {
      "explanation": "Higher scores describe more loyalty, support for group members and comfort working together; lower scores describe more preference for working alone or difficulty in groups. The score does not require loyalty to an unsafe or unfair group.",
      "reflection": "In a group task, clarify roles and how to ask for help while preserving the option to disagree."
    },
    "ru": {
      "explanation": "Больший балл описывает больше преданности, поддержки участников группы и удобства совместной работы; меньший — больше предпочтения одиночной работы или трудностей в группе. Балл не требует верности небезопасной или несправедливой группе.",
      "reflection": "В общей задаче уточните роли и способ попросить помощь, сохраняя возможность не соглашаться."
    }
  },
  "trait.via.fairness": {
    "en": {
      "explanation": "Higher scores describe stronger endorsement of equal rights and even-handed treatment rather than using or favoring people; lower scores describe less endorsement of these responses. Self-report does not certify how fairly someone actually behaves.",
      "reflection": "Before a decision affecting others, check whether the same relevant criteria are being applied and whose perspective is missing."
    },
    "ru": {
      "explanation": "Больший балл описывает большее согласие с равными правами и беспристрастным отношением вместо использования людей или предпочтения одних другим; меньший — меньшее согласие с такими ответами. Самоотчёт не удостоверяет реальную справедливость поведения.",
      "reflection": "Перед решением, затрагивающим других, проверьте, применяются ли одинаковые уместные критерии и чья точка зрения не учтена."
    }
  },
  "trait.via.honesty": {
    "en": {
      "explanation": "Higher scores describe keeping promises and confidences and less deception or betrayal in self-report; lower scores describe less of this pattern. This is not proof of another person's reliability or a moral verdict.",
      "reflection": "Review a promise you made: keep it realistically or communicate clearly if it needs to change; respect confidential information."
    },
    "ru": {
      "explanation": "Больший балл описывает выполнение обещаний, сохранение доверенного и меньше обмана или предательства в самоотчёте; меньший — меньшую выраженность этого сочетания. Это не доказательство надёжности другого человека и не моральный приговор.",
      "reflection": "Пересмотрите одно данное обещание: выполните его реалистично или ясно сообщите о необходимости изменения; уважайте доверенную информацию."
    }
  },
  "trait.via.judgment": {
    "en": {
      "explanation": "Higher scores describe weighing alternatives and thinking critically before decisions, alongside perceived good judgment; lower scores describe less of that reported deliberation. The score cannot establish that a particular decision is correct.",
      "reflection": "For a current choice, write down two options and one piece of evidence that could change your mind."
    },
    "ru": {
      "explanation": "Больший балл описывает взвешивание вариантов и критическое обдумывание решений вместе с самооценкой рассудительности; меньший — меньше такого обдумывания в ответах. Балл не устанавливает правильность конкретного решения.",
      "reflection": "Для текущего выбора запишите два варианта и один факт, который мог бы изменить ваше мнение."
    }
  },
  "trait.via.kindness": {
    "en": {
      "explanation": "Higher scores describe more willingness to help and comfort people without requiring kindness in return; lower scores describe less reported availability or patience. This does not measure how much help someone can safely afford to give.",
      "reflection": "Choose a modest act of help that is wanted and fits your capacity; declining a request can be appropriate."
    },
    "ru": {
      "explanation": "Больший балл описывает большую готовность помогать и поддерживать без требования ответной доброты; меньший — меньше доступности или терпения в ответах. Это не оценка того, сколько помощи человек может безопасно предоставить.",
      "reflection": "Выберите небольшую помощь, которая нужна и соответствует вашим силам; отказ от просьбы тоже может быть уместен."
    }
  },
  "trait.via.leadership": {
    "en": {
      "explanation": "Higher scores describe perceived ability to coordinate people, take charge and lead fairly; lower scores describe less reported ease in those roles. This is not a performance assessment or evidence that someone should have authority.",
      "reflection": "If coordinating a task, agree on a shared goal and invite input from quieter members rather than assuming agreement."
    },
    "ru": {
      "explanation": "Больший балл описывает субъективную способность объединять людей, брать руководство и действовать справедливо; меньший — меньшую лёгкость в этих ролях. Это не оценка результатов работы и не доказательство права на власть.",
      "reflection": "Если вы координируете задачу, согласуйте общую цель и пригласите менее активных участников высказаться, не предполагая их согласия."
    }
  },
  "trait.via.love_of_learning": {
    "en": {
      "explanation": "Higher scores describe enjoyment of learning and acquiring knowledge over time; lower scores describe less identification with that enjoyment. The score is not educational attainment, intelligence or ability to succeed in a course.",
      "reflection": "Choose a topic and learning format you enjoy, with a small realistic amount of time rather than a performance target."
    },
    "ru": {
      "explanation": "Больший балл описывает удовольствие от учёбы и приобретения знаний в течение жизни; меньший — меньшую близость к этому интересу. Балл не равен уровню образования, интеллекту или способности успешно пройти курс.",
      "reflection": "Выберите интересную тему и удобный формат обучения, выделив немного реального времени вместо целевого показателя достижений."
    }
  },
  "trait.via.humility": {
    "en": {
      "explanation": "Higher scores describe less boasting and self-promotion and a more modest self-presentation; lower scores describe more willingness to stand out or talk about oneself. This is not a measure of self-worth and does not mean hiding achievements is healthier.",
      "reflection": "Practice describing one contribution accurately while acknowledging others; you do not need to minimize your work."
    },
    "ru": {
      "explanation": "Больший балл описывает меньше хвастовства и самопродвижения и более скромную подачу себя; меньший — большую готовность выделяться или говорить о себе. Это не мера самоценности и не утверждение, что скрывать достижения полезнее.",
      "reflection": "Попробуйте точно назвать свой вклад, признавая вклад других; преуменьшать свою работу не нужно."
    }
  },
  "trait.via.perspective": {
    "en": {
      "explanation": "Higher scores describe a sense of maturity, seeing what matters and being sought for advice; lower scores describe less of that self-perceived perspective. This does not certify wisdom or the quality of any particular advice.",
      "reflection": "Consider how a current issue looks over different time horizons, and ask what matters most to the person affected."
    },
    "ru": {
      "explanation": "Больший балл описывает ощущение зрелого взгляда, понимания важного и востребованности советов; меньший — меньшую выраженность такого самоощущения. Это не подтверждение мудрости или качества конкретного совета.",
      "reflection": "Рассмотрите текущий вопрос в разных временных перспективах и уточните, что важнее всего для затронутого им человека."
    }
  },
  "trait.via.prudence": {
    "en": {
      "explanation": "Higher scores describe careful choices, attention to consequences and caution about risk; lower scores describe more readiness to act or take risks. This is a decision style, not proof that caution always produces the best outcome.",
      "reflection": "For a choice, identify both the risk of acting and the cost of waiting, then choose a proportionate precaution."
    },
    "ru": {
      "explanation": "Больший балл описывает осторожный выбор, внимание к последствиям и сдержанность в риске; меньший — большую готовность действовать или рисковать. Это стиль решений, а не доказательство, что осторожность всегда даёт лучший исход.",
      "reflection": "Для одного решения определите и риск действия, и цену ожидания, затем выберите соразмерную меру предосторожности."
    }
  },
  "trait.via.self_regulation": {
    "en": {
      "explanation": "Higher scores describe more self-discipline and restraint of immediate urges in light of longer-term consequences; lower scores describe more giving in to urges. This does not diagnose an impulse-control problem or explain the circumstances behind behavior.",
      "reflection": "For one habit you want to change, make the preferred action easier and pause before the usual response, without punishing yourself for setbacks."
    },
    "ru": {
      "explanation": "Больший балл описывает больше самодисциплины и сдерживания немедленных побуждений с учётом долгосрочных последствий; меньший — больше уступок побуждениям. Это не диагностика нарушения контроля импульсов и не объяснение обстоятельств поведения.",
      "reflection": "Для одной привычки, которую хочется изменить, упростите желаемое действие и сделайте паузу перед привычным ответом, без наказания себя за трудности."
    }
  },
  "trait.via.spirituality": {
    "en": {
      "explanation": "Higher scores describe more identification with spirituality, purpose and belief in a universal power or God; lower scores describe less agreement with this combination. The scale combines distinct beliefs and is not a measure of morality, mental health or meaning available to a secular person.",
      "reflection": "Reflect on sources of meaning that genuinely fit your worldview, whether religious, spiritual or secular; no belief change is required."
    },
    "ru": {
      "explanation": "Больший балл описывает большую близость к духовности, предназначению и вере во всеобщую силу или Бога; меньший — меньшее согласие с этим сочетанием. Шкала объединяет разные убеждения и не измеряет нравственность, психическое здоровье или доступность смысла для светского человека.",
      "reflection": "Поразмышляйте об источниках смысла, подходящих вашему мировоззрению: религиозных, духовных или светских; менять убеждения не требуется."
    }
  },
  "trait.via.bravery": {
    "en": {
      "explanation": "Higher scores describe more willingness to state beliefs and unpopular opinions despite opposition; lower scores describe more reluctance when consequences are possible. These items concern speaking up, not all forms of courage or willingness to face physical danger.",
      "reflection": "If speaking up matters, assess the risks and choose a safe channel or ally; silence can be a protective choice."
    },
    "ru": {
      "explanation": "Больший балл описывает большую готовность выражать убеждения и непопулярные мнения вопреки сопротивлению; меньший — большую сдержанность при возможных последствиях. Пункты касаются высказывания позиции, а не всех форм смелости или готовности к физической опасности.",
      "reflection": "Если важно высказаться, оцените риски и выберите безопасный канал или союзника; молчание может быть защитным выбором."
    }
  },
  "trait.via.core.positivity": {
    "en": {
      "explanation": "Higher scores describe a combined pattern of hope, enthusiasm, reciprocal care, gratitude, forgiveness and accepting love; lower scores describe less endorsement of that combination. Different response patterns can yield the same mean; it is not a happiness or mental-health total.",
      "reflection": "Notice which part of the combination feels available and which does not; choose a realistic source of support without requiring positivity or forgiveness."
    },
    "ru": {
      "explanation": "Больший балл описывает сочетание надежды, энтузиазма, взаимной заботы, благодарности, прощения и принятия любви; меньший — меньшее согласие с этим сочетанием. Разные ответы могут дать одинаковое среднее; это не общий балл счастья или психического здоровья.",
      "reflection": "Заметьте, какая часть сочетания вам доступна, а какая нет; выберите реалистичный источник поддержки без требования позитивности или прощения."
    }
  },
  "trait.via.core.dependability": {
    "en": {
      "explanation": "Higher scores describe a mixture of careful choices, modesty, equal rights, honesty and consideration for others; lower scores describe less endorsement of this mixture. It is broader than punctuality and does not certify trustworthiness or moral character.",
      "reflection": "Look at one shared responsibility and ask whether clear expectations, fair treatment or a more careful decision would help."
    },
    "ru": {
      "explanation": "Больший балл описывает сочетание осторожного выбора, скромности, равных прав, честности и внимания к другим; меньший — меньшее согласие с этим сочетанием. Оно шире пунктуальности и не удостоверяет надёжность или нравственные качества.",
      "reflection": "Рассмотрите одну общую обязанность и подумайте, помогут ли ясные ожидания, справедливое отношение или более обдуманное решение."
    }
  },
  "trait.via.core.mastery": {
    "en": {
      "explanation": "Higher scores describe a combination of originality, perspective, judgment, speaking up, anticipating reactions and coordinating others; lower scores describe less reported ease across this mix. It is not an objective measure of competence or mastery of a profession.",
      "reflection": "For a specific challenge, identify whether it calls for a new idea, considered judgment or coordination; use feedback on that task rather than treating the total as an ability rating."
    },
    "ru": {
      "explanation": "Больший балл описывает сочетание оригинальности, широты взгляда, рассудительности, выражения позиции, ожидания реакций и координации людей; меньший — меньшую субъективную лёгкость в этом наборе. Это не объективная оценка компетентности или владения профессией.",
      "reflection": "Для конкретной задачи определите, нужна ли новая идея, обдуманное решение или координация; опирайтесь на обратную связь по задаче, а не на общий балл как оценку способностей."
    }
  }
}

// Caller supplies the definition already resolved by exactInterpretationDefinition.
// No scores, thresholds, source URLs or classification fields are set here.
export function traitReportCopy(definition, dimension, locale = 'en') {
  if (dimension?.dimensionClass !== 'trait' ||
      !IDENTITIES[definition?.id]?.includes(dimension?.key)) return null
  const copy = TEXT[dimension.key]?.[locale === 'ru' ? 'ru' : 'en']
  if (!copy) return null
  return {
    explanation: copy.explanation + (locale === 'ru'
      ? ' Это непрерывное самоописание с авторским пояснением Holistic House, а не валидированная интерпретационная категория; границы шкалы показывают возможные баллы, а не норму или процентиль.'
      : ' This continuous self-description uses Holistic House explanatory prose, not a validated interpretation category; scale endpoints describe possible scores, not norms or percentiles.'),
    reflection: copy.reflection,
  }
}
