// Rights-aware RESEARCH METADATA ONLY. 2026-10-15; not assessment definitions.
// Never infer web administration permission from article access, and never use as scoring keys.
// Source: Holistic House assessments coverage issue #626 and linked rights-holder documents.
export const PRIORITY_METHODS_2026 = Object.freeze([
  {
    "key": "who-5",
    "abbr": "WHO-5",
    "name": {
      "en": "WHO-5 Well-Being Index",
      "ru": "Индекс благополучия ВОЗ-5"
    },
    "questions": 5,
    "minutes": "2–3",
    "topic": {
      "en": "Mood & wellbeing",
      "ru": "Настроение и благополучие"
    },
    "status": "permission_required",
    "scales": {
      "en": "Mental wellbeing over two weeks; 0–25 raw, converted to 0–100.",
      "ru": "Психическое благополучие за две недели; 0–25, перевод в 0–100."
    },
    "rights": {
      "en": "WHO open access is generally non-commercial. Commercial web publication and any translated instrument need permission.",
      "ru": "Открытая лицензия ВОЗ рассчитана на некоммерческий контекст. Для коммерческого сайта и перевода нужно разрешение."
    },
    "source": "https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01",
    "registryKey": "who-5",
    "scoring": {
      "en": "Five responses scored 0–5; raw 0–25 sum is multiplied by 4 to yield 0–100.",
      "ru": "Пять ответов по 0–5; сумму 0–25 умножают на 4, итог 0–100."
    }
  },
  {
    "key": "pss-10",
    "abbr": "PSS-10",
    "name": {
      "en": "Perceived Stress Scale",
      "ru": "Шкала воспринимаемого стресса"
    },
    "questions": 10,
    "minutes": "3–5",
    "topic": {
      "en": "Stress",
      "ru": "Стресс"
    },
    "status": "permission_required",
    "scales": {
      "en": "Perceived stress in the past month; 0–40, no diagnostic cut-off.",
      "ru": "Восприятие стресса за месяц; 0–40, диагностического порога нет."
    },
    "rights": {
      "en": "CMU directs all requests to Mapi/ePROVIDE. Submission is free; the fee, if any, requires an actual quote.",
      "ru": "CMU направляет заявки через Mapi/ePROVIDE. Заявка бесплатна; стоимость возможной лицензии определяется отдельно."
    },
    "source": "https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/index.html",
    "registryKey": "pss-10",
    "scoring": {
      "en": "Ten responses scored 0–4 with the source-specified reversals; sum 0–40.",
      "ru": "Десять ответов по 0–4, часть пунктов обратные; сумма 0–40."
    }
  },
  {
    "key": "isi-7",
    "abbr": "ISI",
    "name": {
      "en": "Insomnia Severity Index",
      "ru": "Индекс тяжести инсомнии"
    },
    "questions": 7,
    "minutes": "2–3",
    "topic": {
      "en": "Sleep & recovery",
      "ru": "Сон и восстановление"
    },
    "status": "permission_required",
    "scales": {
      "en": "Perceived insomnia severity; 7 items, 0–28 total.",
      "ru": "Выраженность трудностей сна; 7 пунктов, сумма 0–28."
    },
    "rights": {
      "en": "The Morin/ISI licence and electronic administration conditions must be confirmed through the rights distributor.",
      "ru": "Требуется проверить права Morin/ISI и условия электронного использования через правообладателя."
    },
    "source": "https://eprovide.mapi-trust.org/isi-insomnia-severity-index/",
    "registryKey": "isi",
    "scoring": {
      "en": "Seven responses scored 0–4; total 0–28.",
      "ru": "Семь ответов по 0–4; сумма 0–28."
    }
  },
  {
    "key": "ecr-s-12",
    "abbr": "ECR-S (12)",
    "name": {
      "en": "Experiences in Close Relationships — Short Form",
      "ru": "Опыт близких отношений — краткая форма"
    },
    "questions": 12,
    "minutes": "2–3",
    "topic": {
      "en": "Relationships & closeness",
      "ru": "Отношения и близость"
    },
    "status": "permission_required",
    "scales": {
      "en": "Attachment anxiety and avoidance (two six-item factors).",
      "ru": "Тревожность и избегание в близости (две шкалы по 6 пунктов)."
    },
    "rights": {
      "en": "This is Wei et al.'s 2007 ECR-S, not ECR-RS or ECR-R. Original, web and translation rights remain unconfirmed.",
      "ru": "Это ECR-S Wei и соавт., 2007, не ECR-RS и не ECR-R. Права на форму, онлайн и перевод не подтверждены."
    },
    "source": "https://pubmed.ncbi.nlm.nih.gov/17437384/",
    "registryKey": null,
    "scoring": {
      "en": "Two six-item attachment factor means; check reverse-keying against the exact 2007 short form.",
      "ru": "Среднее по двум шести-пунктным факторам; обратные пункты сверяются с редакцией 2007 года."
    }
  },
  {
    "key": "ucla-3",
    "abbr": "UCLA-3",
    "name": {
      "en": "Three-Item Loneliness Scale",
      "ru": "Трёхпунктная шкала одиночества"
    },
    "questions": 3,
    "minutes": "1",
    "topic": {
      "en": "Relationships & closeness",
      "ru": "Отношения и близость"
    },
    "status": "rights_review",
    "scales": {
      "en": "Subjective loneliness (three response items).",
      "ru": "Субъективное одиночество (три пункта)."
    },
    "rights": {
      "en": "Hughes et al. short-form publication identified; commercial electronic reuse and translation rights still need confirmation.",
      "ru": "Краткая форма Hughes и соавт. найдена; права на коммерческое электронное использование и перевод ещё уточняются."
    },
    "source": "https://pubmed.ncbi.nlm.nih.gov/18504506/",
    "registryKey": null,
    "scoring": {
      "en": "Three responses scored 1–3; total 3–9, higher means more loneliness.",
      "ru": "Три ответа по 1–3; сумма 3–9, больше — сильнее одиночество."
    }
  },
  {
    "key": "audit-10",
    "abbr": "AUDIT",
    "name": {
      "en": "Alcohol Use Disorders Identification Test",
      "ru": "Скрининг проблем, связанных с алкоголем"
    },
    "questions": 10,
    "minutes": "2–4",
    "topic": {
      "en": "Habits & substance use",
      "ru": "Привычки и зависимости"
    },
    "status": "permission_required",
    "scales": {
      "en": "Alcohol-related risk screening; 0–40 total, not a diagnosis.",
      "ru": "Скрининг рисков употребления алкоголя; 0–40, не диагноз."
    },
    "rights": {
      "en": "WHO's original manual permits non-commercial use, not commercial reproduction. Also requires a reviewed safeguarding/referral pathway.",
      "ru": "Руководство ВОЗ разрешает некоммерческое использование, но не коммерческое воспроизведение. Нужен безопасный сценарий помощи."
    },
    "source": "https://apps.who.int/iris/bitstream/10665/67205/1/WHO_MSD_MSB_01.6a.pdf",
    "registryKey": "audit",
    "sensitive": true,
    "scoring": {
      "en": "Ten scored answers; published 0–40 total. No automated diagnostic judgement.",
      "ru": "Десять оценённых ответов; сумма 0–40. Не автоматический диагноз."
    }
  },
  {
    "key": "dast-10",
    "abbr": "DAST-10",
    "name": {
      "en": "Drug Abuse Screening Test (10 items)",
      "ru": "Скрининг проблем, связанных с веществами"
    },
    "questions": 10,
    "minutes": "5",
    "topic": {
      "en": "Habits & substance use",
      "ru": "Привычки и зависимости"
    },
    "status": "permission_required",
    "scales": {
      "en": "Self-reported drug-related concerns; 0–10 total.",
      "ru": "Самооценка проблем, связанных с веществами; 0–10."
    },
    "rights": {
      "en": "Commercial digital instrument/translation permission and safeguarding workflow are not documented; keep research-only.",
      "ru": "Нет подтверждения прав на коммерческий онлайн-опросник/перевод; требуется безопасный сценарий помощи."
    },
    "source": null,
    "registryKey": null,
    "sensitive": true,
    "scoring": {
      "en": "Ten yes/no scored answers; published key yields 0–10; verify any reversed items.",
      "ru": "Десять ответов «да/нет»; по оригинальному ключу 0–10, проверить обратные пункты."
    }
  },
  {
    "key": "scoff-5",
    "abbr": "SCOFF",
    "name": {
      "en": "SCOFF eating-disorder screening",
      "ru": "Скрининг нарушений пищевого поведения"
    },
    "questions": 5,
    "minutes": "1",
    "topic": {
      "en": "Body & nutrition",
      "ru": "Тело и питание"
    },
    "status": "rights_review",
    "scales": {
      "en": "Five yes/no screening signals, not a diagnosis.",
      "ru": "Пять вопросов скрининга, не диагноз."
    },
    "rights": {
      "en": "Verify publication, electronic-use and translation permissions; human-care escalation is required before starting this sensitive screen.",
      "ru": "Уточнить права на онлайн-публикацию и перевод; до запуска требуется безопасная маршрутизация к специалистам."
    },
    "source": "https://pubmed.ncbi.nlm.nih.gov/10582927/",
    "registryKey": null,
    "sensitive": true,
    "scoring": {
      "en": "Count five yes/no risk signals, 0–5; no automatic diagnostic interpretation.",
      "ru": "Подсчёт пяти ответов «да/нет», 0–5; без автоматического диагноза."
    }
  },
  {
    "key": "cfpb-fwbs-10",
    "abbr": "CFPB FWBS (10)",
    "name": {
      "en": "CFPB Financial Well-Being Scale — Full",
      "ru": "Шкала финансового благополучия CFPB — полная"
    },
    "questions": 10,
    "minutes": "10",
    "topic": {
      "en": "Money",
      "ru": "Деньги"
    },
    "status": "open_reuse",
    "scales": {
      "en": "Calibrated 0–100 wellbeing score. Two additional age/administration questions are required.",
      "ru": "Калиброванный балл 0–100. Нужны ещё два вопроса о возрасте и способе заполнения."
    },
    "rights": {
      "en": "CFPB explicitly allows publication and commercial reuse without permission, excluding trademark endorsement. Full 10-item and short 5-item forms must not be conflated; the 5-item implementation is a separate pending PR.",
      "ru": "CFPB разрешает публикацию и коммерческое использование без запроса; нельзя создавать впечатление поддержки CFPB. Полная 10-пунктная и короткая 5-пунктная формы различаются; короткая готовится в отдельном PR."
    },
    "source": "https://www.consumerfinance.gov/consumer-tools/financial-well-being/about/",
    "registryKey": null,
    "relatedRunnableKey": "cfpb-financial-wellbeing-5",
    "scoring": {
      "en": "Ten scored items plus age and administration-mode qualifiers; official calibrated conversion to 0–100, not raw percentage.",
      "ru": "Десять оценочных пунктов и два уточнения (возраст, способ заполнения); официальный перевод в 0–100, не простой процент."
    }
  },
  {
    "key": "uwes-3",
    "abbr": "UWES-3",
    "name": {
      "en": "Ultra-Short Utrecht Work Engagement Scale",
      "ru": "Ультракороткая шкала вовлечённости в работу"
    },
    "questions": 3,
    "minutes": "1–2",
    "topic": {
      "en": "Work & engagement",
      "ru": "Работа и вовлечённость"
    },
    "status": "permission_required",
    "scales": {
      "en": "Vigour, dedication and absorption; short-form work engagement.",
      "ru": "Энергичность, увлечённость и погружённость в работу."
    },
    "rights": {
      "en": "A commercial/online-use licence from the authors or rights administrator must be confirmed; any data-sharing terms require review.",
      "ru": "Требуется проверить договор на коммерческое онлайн-использование и условия передачи данных авторам."
    },
    "source": null,
    "registryKey": null,
    "scoring": {
      "en": "Three 0–6 items, mean 0–6; confirm exact source version before use.",
      "ru": "Три пункта по 0–6, среднее 0–6; нужно сверить конкретную редакцию."
    }
  },
  {
    "key": "mlq-10",
    "abbr": "MLQ",
    "name": {
      "en": "Meaning in Life Questionnaire",
      "ru": "Опросник смысла жизни"
    },
    "questions": 10,
    "minutes": "3–5",
    "topic": {
      "en": "Meaning & goals",
      "ru": "Смысл и цели"
    },
    "status": "permission_required",
    "scales": {
      "en": "Presence of meaning and search for meaning (5 + 5).",
      "ru": "Наличие смысла и поиск смысла (5 + 5)."
    },
    "rights": {
      "en": "The published non-commercial/research permission does not establish commercial website use; obtain written authorization.",
      "ru": "Доступность для исследований не означает права на коммерческий сайт; нужно письменное разрешение."
    },
    "source": "https://steger.socialpsychology.org/publications",
    "registryKey": null,
    "scoring": {
      "en": "Presence and Search are separate five-item totals, 5–35 each, with source reversal where required.",
      "ru": "Две отдельные шкалы «Наличие» и «Поиск», по 5–35; обратный пункт по ключу автора."
    }
  },
  {
    "key": "gse-10",
    "abbr": "GSE",
    "name": {
      "en": "General Self-Efficacy Scale",
      "ru": "Шкала общей самоэффективности"
    },
    "questions": 10,
    "minutes": "4",
    "topic": {
      "en": "Personal effectiveness",
      "ru": "Личная эффективность"
    },
    "status": "rights_review",
    "scales": {
      "en": "Self-efficacy; standard 10–40 response sum.",
      "ru": "Самоэффективность; сумма ответов 10–40."
    },
    "rights": {
      "en": "Some versions claim open licences. Verify the exact edition, author terms, language and commercial digital scope before publication.",
      "ru": "Для отдельных версий встречаются открытые лицензии. Нужно подтвердить точную редакцию, перевод и коммерческое онлайн-использование."
    },
    "source": "https://userpage.fu-berlin.de/~health/selfscal.htm",
    "registryKey": "gse-10",
    "scoring": {
      "en": "Ten 1–4 items; published total 10–40.",
      "ru": "Десять ответов по 1–4; сумма 10–40."
    }
  },
  {
    "key": "ips-9",
    "abbr": "IPS",
    "name": {
      "en": "Irrational Procrastination Scale",
      "ru": "Шкала иррациональной прокрастинации"
    },
    "questions": 9,
    "minutes": "2–3",
    "topic": {
      "en": "Personal effectiveness",
      "ru": "Личная эффективность"
    },
    "status": "rights_review",
    "scales": {
      "en": "Nine-item pattern of unnecessary delay.",
      "ru": "Девять пунктов о неоправданном откладывании дел."
    },
    "rights": {
      "en": "Confirm the exact nine-item edition, official scoring and digital/commercial permission before publishing items.",
      "ru": "Нужно подтвердить девятипунктную версию, ключ подсчёта и права на коммерческое размещение."
    },
    "source": null,
    "registryKey": null,
    "scoring": {
      "en": "Nine 1–5 items; published reverse items; total 9–45.",
      "ru": "Девять ответов по 1–5 с обратными пунктами; сумма 9–45."
    }
  },
  {
    "key": "gq-6",
    "abbr": "GQ-6",
    "name": {
      "en": "Gratitude Questionnaire — Six Item",
      "ru": "Опросник благодарности — 6 пунктов"
    },
    "questions": 6,
    "minutes": "2",
    "topic": {
      "en": "Positive states",
      "ru": "Позитивные состояния"
    },
    "status": "rights_review",
    "scales": {
      "en": "Dispositional gratitude (including reverse-scored items).",
      "ru": "Склонность к благодарности (с обратными пунктами)."
    },
    "rights": {
      "en": "Research-use access is not proof of commercial electronic or translated questionnaire rights.",
      "ru": "Доступность для исследований не подтверждает права на коммерческий онлайн-опросник или перевод."
    },
    "source": "https://doi.org/10.1037/0022-3514.82.1.112",
    "registryKey": null,
    "scoring": {
      "en": "Six 1–7 items with reverse-keyed statements; total 6–42.",
      "ru": "Шесть ответов по 1–7, включая обратные пункты; сумма 6–42."
    }
  },
  {
    "key": "ffmq-15",
    "abbr": "FFMQ-15",
    "name": {
      "en": "Five Facet Mindfulness Questionnaire — Short Form",
      "ru": "Пятигранный опросник осознанности — краткая форма"
    },
    "questions": 15,
    "minutes": "3",
    "topic": {
      "en": "Mindfulness",
      "ru": "Майндфулнесс"
    },
    "status": "rights_review",
    "scales": {
      "en": "Observing, describing, acting with awareness, non-judging, non-reactivity (edition dependent).",
      "ru": "Наблюдение, описание, осознанное действие, неосуждение, нереактивность (зависит от версии)."
    },
    "rights": {
      "en": "Confirm which validated 15-item edition and target population are intended, as well as rights for commercial web and translation.",
      "ru": "Нужно определить конкретную 15-пунктную валидированную редакцию и популяцию, подтвердить права на сайт и перевод."
    },
    "source": "https://www.mindfulnesslab.pitt.edu/measures/",
    "registryKey": null,
    "scoring": {
      "en": "Five facet scores from three 1–5 items each; validate edition-specific keys before using.",
      "ru": "Пять шкал по три пункта 1–5; ключ и нормы зависят от конкретной редакции."
    }
  }
].map((item) => Object.freeze(item)))

export const PRIORITY_METHODS_RIGHTS_COUNTS = Object.freeze(PRIORITY_METHODS_2026.reduce((counts, item) => {
  counts[item.status] += 1
  return counts
}, { open_reuse: 0, permission_required: 0, rights_review: 0 }))
