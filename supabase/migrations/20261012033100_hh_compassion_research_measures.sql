-- Two author-permitted English compassion research measures; no clinical cutoffs.
-- Append-only technical registration. Do not apply to production without separate authorization.
-- Existing definitions, results, auth and RLS remain unchanged.
begin;
do $$
declare d jsonb;
begin
  for d in select value from jsonb_array_elements($compassion$
[
  {
    "id": "c2506513-5f3c-599f-a790-506411bc2c05",
    "key": "scs-sf",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Self-Compassion Scale Short Form (SCS-SF)",
    "source": {
      "title": "Self-Compassion Scale Short Form (SCS-SF)",
      "url": "https://self-compassion.org/wp-content/uploads/2021/03/SCS-SF-information.pdf",
      "scoringUrl": "https://self-compassion.org/wp-content/uploads/2021/03/SCS-SF-information.pdf#page=3",
      "permissionUrl": "https://self-compassion.org/wp-content/uploads/2021/03/SCS-SF-information.pdf#page=1",
      "permission": "Author grant for use for any purpose, including research, clinical work and teaching (sheet page 1).",
      "citation": "Raes, F., Pommier, E., Neff, K. D., & Van Gucht, D. (2011). Construction and factorial validation of a short form of the Self-Compassion Scale. Clinical Psychology & Psychotherapy, 18, 250–255.",
      "reviewedAt": "2026-10-12",
      "nonDiagnostic": true,
      "notes": "Original English 12-item short form, sheet page 2. Total only; author warns that short-form subscales are unreliable. No clinical norms; the ad hoc rubric is not used.",
      "missingResponsePolicy": "All items required; incomplete forms have no score. This is a conservative product rule, not author-specified imputation.",
      "languageNote": "Original English questionnaire only. Russian interface and report explanations are not a validated Russian questionnaire adaptation."
    },
    "instructions": "HOW I TYPICALLY ACT TOWARDS MYSELF IN DIFFICULT TIMES. Please read each statement carefully before answering. Indicate how often you behave in the stated manner, using the following scale:",
    "answerScale": {
      "min": 1,
      "max": 5
    },
    "responseAnchors": [
      "Almost never",
      "2",
      "3",
      "4",
      "Almost always"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "resources.scs_sf.total",
          "method": "mean",
          "items": [
            "scs_sf.01",
            "scs_sf.02",
            "scs_sf.03",
            "scs_sf.04",
            "scs_sf.05",
            "scs_sf.06",
            "scs_sf.07",
            "scs_sf.08",
            "scs_sf.09",
            "scs_sf.10",
            "scs_sf.11",
            "scs_sf.12"
          ],
          "reverseItems": [
            "scs_sf.01",
            "scs_sf.04",
            "scs_sf.08",
            "scs_sf.09",
            "scs_sf.11",
            "scs_sf.12"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Self-compassion — total mean",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "scs_sf.01",
        "text": "When I fail at something important to me I become consumed by feelings of inadequacy.",
        "required": true
      },
      {
        "id": "scs_sf.02",
        "text": "I try to be understanding and patient towards those aspects of my personality I don’t like.",
        "required": true
      },
      {
        "id": "scs_sf.03",
        "text": "When something painful happens I try to take a balanced view of the situation.",
        "required": true
      },
      {
        "id": "scs_sf.04",
        "text": "When I’m feeling down, I tend to feel like most other people are probably happier than I am.",
        "required": true
      },
      {
        "id": "scs_sf.05",
        "text": "I try to see my failings as part of the human condition.",
        "required": true
      },
      {
        "id": "scs_sf.06",
        "text": "When I’m going through a very hard time, I give myself the caring and tenderness I need.",
        "required": true
      },
      {
        "id": "scs_sf.07",
        "text": "When something upsets me I try to keep my emotions in balance.",
        "required": true
      },
      {
        "id": "scs_sf.08",
        "text": "When I fail at something that’s important to me, I tend to feel alone in my failure",
        "required": true
      },
      {
        "id": "scs_sf.09",
        "text": "When I’m feeling down I tend to obsess and fixate on everything that’s wrong.",
        "required": true
      },
      {
        "id": "scs_sf.10",
        "text": "When I feel inadequate in some way, I try to remind myself that feelings of inadequacy are shared by most people.",
        "required": true
      },
      {
        "id": "scs_sf.11",
        "text": "I’m disapproving and judgmental about my own flaws and inadequacies.",
        "required": true
      },
      {
        "id": "scs_sf.12",
        "text": "I’m intolerant and impatient towards those aspects of my personality I don’t like.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:3275b6aaaa19c8f52a2f892ac94384626984d50f561f404fda9cbee3d912503f"
  },
  {
    "id": "a5cb84ed-75bd-59e0-adba-64bfa1626cca",
    "key": "compassion-scale",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-v1",
    "timeframe": "general",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Compassion Scale (CS)",
    "source": {
      "title": "Compassion Scale (CS)",
      "url": "https://self-compassion.org/wp-content/uploads/2021/03/CS-information.pdf",
      "scoringUrl": "https://self-compassion.org/wp-content/uploads/2021/03/CS-information.pdf#page=3",
      "permissionUrl": "https://self-compassion.org/wp-content/uploads/2021/03/CS-information.pdf#page=1",
      "permission": "Author grant for use for any purpose, including research, clinical work and teaching (sheet page 1).",
      "citation": "Pommier, E., Neff, K. D., & Tóth-Király, I. (2019). The development and validation of the Compassion Scale. Assessment, 21–39.",
      "reviewedAt": "2026-10-12",
      "nonDiagnostic": true,
      "notes": "Original English 16-item form, sheet page 2. All four subscales and total are means; indifference is reversed both in its subscale and in the total. No clinical norms or cutoffs.",
      "missingResponsePolicy": "All items required; incomplete forms have no score. This is a conservative product rule, not author-specified imputation.",
      "languageNote": "Original English questionnaire only. Russian interface and report explanations are not a validated Russian questionnaire adaptation."
    },
    "instructions": "Please read each statement carefully before answering. Please answer according to what really reflects your experience rather than what you think your experience should be. Indicate how often you behave in the stated manner, using the following scale:",
    "answerScale": {
      "min": 1,
      "max": 5
    },
    "responseAnchors": [
      "Almost never",
      "2",
      "3",
      "4",
      "Almost always"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "resources.cs.total",
          "method": "mean",
          "items": [
            "cs.01",
            "cs.02",
            "cs.03",
            "cs.04",
            "cs.05",
            "cs.06",
            "cs.07",
            "cs.08",
            "cs.09",
            "cs.10",
            "cs.11",
            "cs.12",
            "cs.13",
            "cs.14",
            "cs.15",
            "cs.16"
          ],
          "reverseItems": [
            "cs.03",
            "cs.07",
            "cs.11",
            "cs.15"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Compassion toward others — total mean",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.cs.kindness",
          "method": "mean",
          "items": [
            "cs.02",
            "cs.06",
            "cs.10",
            "cs.14"
          ],
          "reverseItems": [],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Kindness toward others",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.cs.common_humanity",
          "method": "mean",
          "items": [
            "cs.04",
            "cs.08",
            "cs.12",
            "cs.16"
          ],
          "reverseItems": [],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Common humanity",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.cs.mindfulness",
          "method": "mean",
          "items": [
            "cs.01",
            "cs.05",
            "cs.09",
            "cs.13"
          ],
          "reverseItems": [],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Mindful attention to others",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.cs.indifference_reversed",
          "method": "mean",
          "items": [
            "cs.03",
            "cs.07",
            "cs.11",
            "cs.15"
          ],
          "reverseItems": [
            "cs.03",
            "cs.07",
            "cs.11",
            "cs.15"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "resources",
          "sourceConstruct": "Indifference (reverse-scored: higher means less indifference)",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "cs.01",
        "text": "I pay careful attention when other people talk to me about their troubles.",
        "required": true
      },
      {
        "id": "cs.02",
        "text": "If I see someone going through a difficult time, I try to be caring toward that person.",
        "required": true
      },
      {
        "id": "cs.03",
        "text": "I am unconcerned with other people’s problems.",
        "required": true
      },
      {
        "id": "cs.04",
        "text": "I realize everyone feels down sometimes, it is part of being human.",
        "required": true
      },
      {
        "id": "cs.05",
        "text": "I notice when people are upset, even if they don’t say anything.",
        "required": true
      },
      {
        "id": "cs.06",
        "text": "I like to be there for others in times of difficulty.",
        "required": true
      },
      {
        "id": "cs.07",
        "text": "I think little about the concerns of others.",
        "required": true
      },
      {
        "id": "cs.08",
        "text": "I feel it’s important to recognize that all people have weaknesses and no one’s perfect.",
        "required": true
      },
      {
        "id": "cs.09",
        "text": "I listen patiently when people tell me their problems.",
        "required": true
      },
      {
        "id": "cs.10",
        "text": "My heart goes out to people who are unhappy.",
        "required": true
      },
      {
        "id": "cs.11",
        "text": "I try to avoid people who are experiencing a lot of pain.",
        "required": true
      },
      {
        "id": "cs.12",
        "text": "I feel that suffering is just a part of the common human experience.",
        "required": true
      },
      {
        "id": "cs.13",
        "text": "When people tell me about their problems, I try to keep a balanced perspective on the situation.",
        "required": true
      },
      {
        "id": "cs.14",
        "text": "When others feel sadness, I try to comfort them.",
        "required": true
      },
      {
        "id": "cs.15",
        "text": "I can’t really connect with other people when they’re suffering.",
        "required": true
      },
      {
        "id": "cs.16",
        "text": "Despite my differences with others, I know that everyone feels pain just like me.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:0b77d1eb4e39a6a91eb461447dbec57c4b879ecff2c20e80eec36dd2e04578bb"
  }
]
$compassion$::jsonb)
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
