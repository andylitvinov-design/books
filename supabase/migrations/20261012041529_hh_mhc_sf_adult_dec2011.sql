-- Author-permitted adult December 2011 English MHC-SF; no clinical cutoffs.
-- Append-only technical registration. Do not apply to production without separate authorization.
-- Existing definitions, results, auth and RLS remain unchanged.
begin;
do $$
declare d jsonb;
begin
  for d in select value from jsonb_array_elements($mhcsf$
[
  {
    "id": "fe2feb75-6428-52a1-a9a6-ea45f0e43242",
    "key": "mhc-sf",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-adult-dec2011-v1",
    "timeframe": "past-month",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Mental Health Continuum Short Form (MHC-SF) — Adult",
    "source": {
      "title": "Corey L. M. Keyes — Adult MHC-SF, December 2011",
      "url": "https://peplab.web.unc.edu/wp-content/uploads/sites/18901/2018/11/MHC-SFoverview.pdf",
      "scoringUrl": "https://peplab.web.unc.edu/wp-content/uploads/sites/18901/2018/11/MHC-SFoverview.pdf#page=6",
      "permissionUrl": "https://peplab.web.unc.edu/wp-content/uploads/sites/18901/2018/11/MHC-SFoverview.pdf#page=1",
      "permission": "Copyrighted measure; author grants use without individual permission when proper credit is given (page 1). Original English only; no questionnaire translation is supplied.",
      "citation": "Keyes, C. L. M. (2009). Brief description of the mental health continuum short form (MHC-SF). Atlanta. December 2011 document, adult form page 4; retrieved 2026-10-12.",
      "formVersion": "Adult form printed in December 2011 overview, revised item 6",
      "minimumAge": 18,
      "population": "Adults aged 18 or older",
      "reviewedAt": "2026-10-12",
      "nonDiagnostic": true,
      "notes": "Continuous sums only. The printed adult item 6 is revised; the earlier 2009 wording is not substituted. Author categorical rules and optional 10-point categories are not used. Individual item facets are not reported as separate tests or subscales.",
      "missingResponsePolicy": "All 14 integer responses required; zero is valid, missing is not zero. No imputation or prorating. This is a conservative product rule.",
      "languageNote": "Original English questionnaire. Russian interface and explanations are not a validated Russian adaptation.",
      "validationSources": [
        "https://research.utwente.nl/en/publications/evaluating-the-psychometric-properties-of-the-mental-health-conti/",
        "https://www.canada.ca/en/public-health/services/reports-publications/health-promotion-chronic-disease-prevention-canada-research-policy-practice/vol-37-no-4-2017/measuring-positive-mental-health-canada-construct-validation-mental-health-continuum-short-form.html"
      ],
      "validationLimitations": "Evidence for the MHC-SF family is population/form specific; this site has not validated the printed December 2011 English form or a Russian adaptation. PHAC 2017 cautions about the social wellbeing subscale in Canadian population surveys. Wellbeing and mental illness are related but distinct; high scores do not rule out illness."
    },
    "instructions": "Adult MHC-SF (ages 18 or older). Please answer the following questions are about how you have been feeling during the past month. Place a check mark in the box that best represents how often you have experienced or felt the following: During the past month, how often did you feel …",
    "answerScale": {
      "min": 0,
      "max": 5
    },
    "responseAnchors": [
      "Never",
      "Once or twice",
      "About once a week",
      "About 2 or 3 times a week",
      "Almost every day",
      "Every day"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "resources.mhc_sf.total",
          "method": "sum",
          "items": [
            "mhc_sf.01",
            "mhc_sf.02",
            "mhc_sf.03",
            "mhc_sf.04",
            "mhc_sf.05",
            "mhc_sf.06",
            "mhc_sf.07",
            "mhc_sf.08",
            "mhc_sf.09",
            "mhc_sf.10",
            "mhc_sf.11",
            "mhc_sf.12",
            "mhc_sf.13",
            "mhc_sf.14"
          ],
          "reverseItems": [],
          "min": 0,
          "max": 70,
          "dimensionClass": "resources",
          "sourceConstruct": "Positive mental wellbeing — total sum",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.mhc_sf.emotional",
          "method": "sum",
          "items": [
            "mhc_sf.01",
            "mhc_sf.02",
            "mhc_sf.03"
          ],
          "reverseItems": [],
          "min": 0,
          "max": 15,
          "dimensionClass": "resources",
          "sourceConstruct": "Emotional wellbeing",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.mhc_sf.social",
          "method": "sum",
          "items": [
            "mhc_sf.04",
            "mhc_sf.05",
            "mhc_sf.06",
            "mhc_sf.07",
            "mhc_sf.08"
          ],
          "reverseItems": [],
          "min": 0,
          "max": 25,
          "dimensionClass": "resources",
          "sourceConstruct": "Social wellbeing",
          "direction": "higher-reported-resource"
        },
        {
          "key": "resources.mhc_sf.psychological",
          "method": "sum",
          "items": [
            "mhc_sf.09",
            "mhc_sf.10",
            "mhc_sf.11",
            "mhc_sf.12",
            "mhc_sf.13",
            "mhc_sf.14"
          ],
          "reverseItems": [],
          "min": 0,
          "max": 30,
          "dimensionClass": "resources",
          "sourceConstruct": "Psychological wellbeing",
          "direction": "higher-reported-resource"
        }
      ]
    },
    "questions": [
      {
        "id": "mhc_sf.01",
        "text": "happy",
        "required": true
      },
      {
        "id": "mhc_sf.02",
        "text": "interested in life",
        "required": true
      },
      {
        "id": "mhc_sf.03",
        "text": "satisfied with life",
        "required": true
      },
      {
        "id": "mhc_sf.04",
        "text": "that you had something important to contribute to society",
        "required": true
      },
      {
        "id": "mhc_sf.05",
        "text": "that you belonged to a community (like a social group, or your neighborhood)",
        "required": true
      },
      {
        "id": "mhc_sf.06",
        "text": "that our society is a good place, or is becoming a better place, for all people",
        "required": true
      },
      {
        "id": "mhc_sf.07",
        "text": "that people are basically good",
        "required": true
      },
      {
        "id": "mhc_sf.08",
        "text": "that the way our society works makes sense to you",
        "required": true
      },
      {
        "id": "mhc_sf.09",
        "text": "that you liked most parts of your personality",
        "required": true
      },
      {
        "id": "mhc_sf.10",
        "text": "good at managing the responsibilities of your daily life",
        "required": true
      },
      {
        "id": "mhc_sf.11",
        "text": "that you had warm and trusting relationships with others",
        "required": true
      },
      {
        "id": "mhc_sf.12",
        "text": "that you had experiences that challenged you to grow and become a better person",
        "required": true
      },
      {
        "id": "mhc_sf.13",
        "text": "confident to think or express your own ideas and opinions",
        "required": true
      },
      {
        "id": "mhc_sf.14",
        "text": "that your life has a sense of direction or meaning to it",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:c70b5b61ad92d2daad15dbaf4e145d27262abe94cc9f2a64eda275c257b6a853"
  }
]
$mhcsf$::jsonb)
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
