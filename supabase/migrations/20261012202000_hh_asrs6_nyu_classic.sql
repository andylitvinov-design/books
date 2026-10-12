-- NYU-permitted ASRS-v1.1 6Q EN/RU patient-facing classic shaded-count screening.
-- Append-only technical registration. Do not apply to production without separate authorization.
-- Existing definitions, results, auth and RLS remain unchanged.
begin;
do $$
declare d jsonb;
begin
  for d in select value from jsonb_array_elements($asrs6$
[
  {
    "id": "7d84b0f8-027a-5992-a752-27133aa897ea",
    "key": "asrs-6",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "nyu-patient-en-v1",
    "timeframe": "past-6-months",
    "scoringKey": "asrs-v1-6-classic",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Adult ADHD Self-Report Scale v1.1 — 6-Question Screener",
    "source": {
      "title": "New York University — ASRS-v1.1 6-Question Screener, patient-facing English original",
      "url": "https://license.tov.med.nyu.edu/product/asrs6Qscreener",
      "scoringUrl": "https://license.tov.med.nyu.edu/product/asrs6Qscreener",
      "permissionUrl": "https://license.tov.med.nyu.edu/product/asrs6Qscreener",
      "permission": "NYU permits clinical, nonclinical and commercial use with attribution. Electronic reproduction is permitted; no other modifications are permitted. Not public domain.",
      "citation": "Kessler RC et al. (2005). The World Health Organization Adult ADHD Self-Report Scale (ASRS): a short screening scale for use in the general population. Psychological Medicine 35(2):245–256. doi:10.1017/S0033291704002892.",
      "formVersion": "ASRS-v1.1 6Q, patient-facing shaded form; not ASRS-5 or the full 18Q",
      "minimumAge": 18,
      "population": "Adults aged 18 or older",
      "reviewedAt": "2026-10-12",
      "nonDiagnostic": true,
      "masterFilename": "6Q_ASRS_ENGLISH_final.pdf",
      "masterSha256": "3383491ecbbd65beb79b97c86a49e72fac8a5fdf8c40d94bfe58ed9189bdfee4",
      "sourceExtractionSha256": "a7fa800ddfeee5e4bc33e1d4cf2e5c029c91ba214d56c7a1a79bafb7bd88d8cf",
      "questionnairePage": 2,
      "missingResponsePolicy": "Require all six valid answers. This is an HH implementation guardrail; no official prorating/imputation rule was located. Never convert missing to zero.",
      "languageNote": "Original English patient-facing ASRS-v1.1 6Q. Published validation is sample-specific and does not establish a diagnosis.",
      "validationSources": [
        "https://pubmed.ncbi.nlm.nih.gov/15841682/",
        "https://pubmed.ncbi.nlm.nih.gov/17623385/"
      ],
      "validationLimitations": "Screening is not diagnosis. Exact-version Russian validation is unverified. No probabilities, severity bands, norms or treatment conclusions are assigned. The 2024 continuous 0–24 scoring and ASRS-5 are not used."
    },
    "instructions": "Check the box that best describes how you have felt and conducted yourself over the past 6 months. Please give the completed questionnaire to your healthcare professional during your next appointment to discuss the results.",
    "eligibilityText": "This Adult Self-Report Scale-V1.1 (ASRS-V1.1) Screener is intended for people aged 18 years or older.",
    "safetyText": "The following questionnaire can be used as a starting point to help you recognize the signs/symptoms of Adult ADHD but is not meant to replace consultation with a trained healthcare professional. An accurate diagnosis can only be made through a clinical evaluation. Regardless of the questionnaire results, if you have concerns about diagnosis and treatment of Adult ADHD, please discuss your concerns with your physician.",
    "printedScoringText": "Add the number of checkmarks that appear in the darkly shaded area. Four (4) or more checkmarks indicate that your symptoms may be consistent with Adult ADHD. It may be beneficial for you to talk with your healthcare provider about an evaluation.",
    "requiredSiteAttribution": "The 6-question Adult Self-Report Scale-Version1.1 (ASRS-V1.1) Screener is a subset of the 18-question Adult ADHD Self-Report Scale-Version1.1 (Adult ASRSV1.1) Symptom Checklist. © New York University and the President and Fellows of Harvard College.",
    "formCopyright": "© New York University and President and Fellows of Harvard College. All rights reserved.",
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Never",
      "Rarely",
      "Sometimes",
      "Often",
      "Very Often"
    ],
    "scoring": {
      "positiveMinimumResponse": [
        2,
        2,
        2,
        3,
        3,
        3
      ],
      "positiveScreenMinimum": 4,
      "dimensions": [
        {
          "key": "symptoms.asrs6.shaded_count",
          "min": 0,
          "max": 6,
          "method": "classic-shaded-count",
          "items": [
            "asrs6.01",
            "asrs6.02",
            "asrs6.03",
            "asrs6.04",
            "asrs6.05",
            "asrs6.06"
          ],
          "reverseItems": [],
          "direction": "lower-reported-symptom-burden",
          "dimensionClass": "symptoms",
          "sourceConstruct": "ASRS-v1.1 shaded-response count",
          "displayKind": "screening-count"
        }
      ]
    },
    "questions": [
      {
        "id": "asrs6.01",
        "text": "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?",
        "required": true,
        "shadedFrom": 2
      },
      {
        "id": "asrs6.02",
        "text": "How often do you have difficulty getting things in order when you have to do a task that requires organization?",
        "required": true,
        "shadedFrom": 2
      },
      {
        "id": "asrs6.03",
        "text": "How often do you have problems remembering appointments or obligations?",
        "required": true,
        "shadedFrom": 2
      },
      {
        "id": "asrs6.04",
        "text": "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?",
        "required": true,
        "shadedFrom": 3
      },
      {
        "id": "asrs6.05",
        "text": "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?",
        "required": true,
        "shadedFrom": 3
      },
      {
        "id": "asrs6.06",
        "text": "How often do you feel overly active and compelled to do things, like you were driven by a motor?",
        "required": true,
        "shadedFrom": 3
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:3f2648c2008ae7436ab04fa28ce329f66d44960b7f1ca486ea5fdb814a872b04"
  },
  {
    "id": "132782f6-fe16-5d66-956c-ea47596f085a",
    "key": "asrs-6",
    "version": "v1",
    "instrumentLocale": "ru",
    "translationVersion": "nyu-patient-ru-v1",
    "timeframe": "past-6-months",
    "scoringKey": "asrs-v1-6-classic",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Скринер ASRS-v1.1 — 6 вопросов для взрослых",
    "source": {
      "title": "New York University — ASRS-v1.1 6-Question Screener, patient-facing Russian translation",
      "url": "https://license.tov.med.nyu.edu/product/asrs6Qscreener",
      "scoringUrl": "https://license.tov.med.nyu.edu/product/asrs6Qscreener",
      "permissionUrl": "https://license.tov.med.nyu.edu/product/asrs6Qscreener",
      "permission": "NYU permits clinical, nonclinical and commercial use with attribution. Electronic reproduction is permitted; no other modifications are permitted. Not public domain.",
      "citation": "Kessler RC et al. (2005). The World Health Organization Adult ADHD Self-Report Scale (ASRS): a short screening scale for use in the general population. Psychological Medicine 35(2):245–256. doi:10.1017/S0033291704002892.",
      "formVersion": "ASRS-v1.1 6Q, patient-facing shaded form; not ASRS-5 or the full 18Q",
      "minimumAge": 18,
      "population": "Adults aged 18 or older",
      "reviewedAt": "2026-10-12",
      "nonDiagnostic": true,
      "masterFilename": "6Q_Russian_final.pdf",
      "masterSha256": "43068fbc890d8f05ab08d563d9efd6464feafd130a9c881be73afc2f07651382",
      "sourceExtractionSha256": "a7fa800ddfeee5e4bc33e1d4cf2e5c029c91ba214d56c7a1a79bafb7bd88d8cf",
      "questionnairePage": 2,
      "missingResponsePolicy": "Require all six valid answers. This is an HH implementation guardrail; no official prorating/imputation rule was located. Never convert missing to zero.",
      "languageNote": "Official Russian translation distributed by NYU. Exact-version Russian validation was not established. Do not attach the performance figures of the differently worded 2026 Russian validation.",
      "validationSources": [
        "https://pubmed.ncbi.nlm.nih.gov/15841682/",
        "https://pubmed.ncbi.nlm.nih.gov/17623385/"
      ],
      "validationLimitations": "Screening is not diagnosis. Exact-version Russian validation is unverified. No probabilities, severity bands, norms or treatment conclusions are assigned. The 2024 continuous 0–24 scoring and ASRS-5 are not used."
    },
    "instructions": "Отметьте клетку с ответом, который лучше всего описывает ваше самочувствие и поведение за последние 6 месяцев. Чтобы обсудить результаты, передайте, пожалуйста, заполненную анкету обслуживающему вас профессиональному медицинскому работнику во время следующего визита к нему.",
    "eligibilityText": "Этот скринер со шкалой самооценки V1.1 (ASRS-V1.1) предназначен для людей в возрасте от 18 лет.",
    "safetyText": "Приведенная ниже анкета, для начала, может помочь вам распознать признаки и (или) симптомы ADHD-синдрома у взрослых, но не заменит консультацию специально обученного профессионального медицинского работника. Точный диагноз можно поставить только после клинического обследования. Независимо от ответов на вопросы анкеты, если вас что-то беспокоит в связи с диагнозом и лечением ADHD-синдрома у взрослых, обсудите это с вашим врачом.",
    "printedScoringText": "Подсчитайте количество отметок, сделанных в темной заштрихованной части графика. Четыре (4) или большее количество таких отметок свидетельствует о том, что ваши симптомы, возможно, совпадают с симптомами ADHD-синдрома у взрослых. Теперь может оказаться полезным поговорить с обслуживающим вас профессиональным медицинским работником об оценке этих результатов.",
    "requiredSiteAttribution": "The 6-question Adult Self-Report Scale-Version1.1 (ASRS-V1.1) Screener is a subset of the 18-question Adult ADHD Self-Report Scale-Version1.1 (Adult ASRSV1.1) Symptom Checklist. © New York University and the President and Fellows of Harvard College.",
    "formCopyright": null,
    "answerScale": {
      "min": 0,
      "max": 4
    },
    "responseAnchors": [
      "Никогда",
      "Редко",
      "Иногда",
      "Часто",
      "Очень часто"
    ],
    "scoring": {
      "positiveMinimumResponse": [
        2,
        2,
        2,
        3,
        3,
        3
      ],
      "positiveScreenMinimum": 4,
      "dimensions": [
        {
          "key": "symptoms.asrs6.shaded_count",
          "min": 0,
          "max": 6,
          "method": "classic-shaded-count",
          "items": [
            "asrs6.01",
            "asrs6.02",
            "asrs6.03",
            "asrs6.04",
            "asrs6.05",
            "asrs6.06"
          ],
          "reverseItems": [],
          "direction": "lower-reported-symptom-burden",
          "dimensionClass": "symptoms",
          "sourceConstruct": "ASRS-v1.1 shaded-response count",
          "displayKind": "screening-count"
        }
      ]
    },
    "questions": [
      {
        "id": "asrs6.01",
        "text": "Как часто вам бывает трудно закончить работу после того как самое трудное уже сделано?",
        "required": true,
        "shadedFrom": 2
      },
      {
        "id": "asrs6.02",
        "text": "Как часто вам бывает трудно навести порядок перед выполнением работы, требующей организованности?",
        "required": true,
        "shadedFrom": 2
      },
      {
        "id": "asrs6.03",
        "text": "Как часто у вас возникают трудности с запоминанием времени встреч или своих обязанностей?",
        "required": true,
        "shadedFrom": 2
      },
      {
        "id": "asrs6.04",
        "text": "Как часто вы избегаете или откладываете начало работы, требующей больших умственных усилий?",
        "required": true,
        "shadedFrom": 3
      },
      {
        "id": "asrs6.05",
        "text": "Как часто вы беспокойно перебираете руками или ногами, когда приходится долго сидеть на одном месте?",
        "required": true,
        "shadedFrom": 3
      },
      {
        "id": "asrs6.06",
        "text": "Как часто вы испытываете чрезмерную активность и непреодолимое желание что-то сделать, как если бы у вас внутри был мотор?",
        "required": true,
        "shadedFrom": 3
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:b64274437777684e0aea0150493adb4eb6015f9fd06bfbeb8b0b98998a67b387"
  }
]
$asrs6$::jsonb)
  loop
    if exists (select 1 from app.assessment_versions where id=(d->>'id')::uuid and (content_hash is distinct from d->>'contentHash' or definition is distinct from d)) then
      raise exception 'Conflicting professional assessment ID %',d->>'id';
    end if;
    if exists (select 1 from app.assessment_versions where definition_key=d->>'key' and definition_version=d->>'version' and instrument_locale=d->>'instrumentLocale' and (id is distinct from (d->>'id')::uuid or content_hash is distinct from d->>'contentHash' or definition is distinct from d)) then
      raise exception 'Different content already published for %',d->>'key';
    end if;
    insert into app.assessment_versions (
      id,definition_key,definition_version,instrument_locale,translation_version,
      definition,questions,answer_schema,scoring_key,scoring_version,result_schema,
      timeframe,source_metadata,content_hash
    ) values (
      (d->>'id')::uuid,d->>'key',d->>'version',d->>'instrumentLocale',d->>'translationVersion',
      d,d->'questions',jsonb_build_object('type','integer','minimum',(d->'answerScale'->>'min')::int,'maximum',(d->'answerScale'->>'max')::int),
      d->>'scoringKey',d->>'scoringVersion',jsonb_build_object('version',d->>'resultVersion'),
      d->>'timeframe',d->'source',d->>'contentHash'
    ) on conflict (id) do nothing;
  end loop;
end $$;
commit;
