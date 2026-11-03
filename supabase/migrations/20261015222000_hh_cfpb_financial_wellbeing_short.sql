-- Official CFPB 5-item financial-wellbeing scale and age/mode qualifiers (7 responses total).
-- Immutable source and scorecard; no existing client data is modified.
-- Production DB migration requires exact-head tests, owner approval, RLS and scoring readback.
begin;
do $$
declare d jsonb;
begin
  for d in select value from jsonb_array_elements($hh_cfpb5$
[{"id":"2b0e07c9-a9ba-5a39-a111-16927b32299b","key":"cfpb-financial-wellbeing-5","version":"v1","instrumentLocale":"en","translationVersion":"official-en-v1","timeframe":"current-financial-wellbeing","scoringKey":"cfpb-short-2017","scoringVersion":"v1","resultVersion":"v1","title":"CFPB Financial Well-Being Scale — Abbreviated (5 statements + scoring details)","source":{"title":"Consumer Financial Protection Bureau — Abbreviated Financial Well-Being Scale (2017)","url":"https://www.consumerfinance.gov/data-research/research-reports/financial-well-being-scale/","scoringUrl":"https://files.consumerfinance.gov/f/documents/bcfp_fin-well-being_short-scorecard.pdf","permissionUrl":"https://www.consumerfinance.gov/consumer-tools/financial-well-being/about/","permission":"CFPB states anyone may reproduce, publish or use the questionnaire without permission, including commercial contexts; no CFPB endorsement or logo.","citation":"Consumer Financial Protection Bureau (2017). CFPB Financial Well-Being Scale: Scale development technical report and Abbreviated scoring worksheet.","reviewedAt":"2026-10-15","interpretation":"Official five-item scale plus mandatory age-band and administration-mode questions; scored from the published age/mode-specific short-form lookup, not a raw sum or diagnosis. US population reference context must be clear outside the US."},"answerScale":{"min":0,"max":4},"scoring":{"dimensions":[{"key":"resources.financial_wellbeing.cfpb_short","method":"official-age-mode-lookup","items":["cfpb5.01","cfpb5.02","cfpb5.03","cfpb5.04","cfpb5.05"],"ageGroupItem":"cfpb5.06","modeItem":"cfpb5.07","min":0,"max":100,"dimensionClass":"resources","sourceConstruct":"CFPB Financial Well-Being Scale — 5-item calibrated score","direction":"higher-reported-resource"}]},"questions":[{"id":"cfpb5.01","text":"Because of my money situation, I feel like I will never have the things I want in life","required":true,"min":0,"max":4,"responseAnchors":["Completely","Very well","Somewhat","Very little","Not at all"]},{"id":"cfpb5.02","text":"I am just getting by financially","required":true,"min":0,"max":4,"responseAnchors":["Completely","Very well","Somewhat","Very little","Not at all"]},{"id":"cfpb5.03","text":"I am concerned that the money I have or will save won’t last","required":true,"min":0,"max":4,"responseAnchors":["Completely","Very well","Somewhat","Very little","Not at all"]},{"id":"cfpb5.04","text":"I have money left over at the end of the month","required":true,"min":0,"max":4,"responseAnchors":["Always","Often","Sometimes","Rarely","Never"]},{"id":"cfpb5.05","text":"My finances control my life","required":true,"min":0,"max":4,"responseAnchors":["Always","Often","Sometimes","Rarely","Never"]},{"id":"cfpb5.06","text":"How old are you?","required":true,"min":0,"max":1,"responseAnchors":["18–61","62+"]},{"id":"cfpb5.07","text":"How did you take the questionnaire?","required":true,"min":0,"max":1,"responseAnchors":["I read the questions","Someone read the questions to me"]}],"optionalContext":[],"suggestedRepeatDays":30,"contentHash":"sha256:10b19f9ba9ab5910365d4e41122ee809875b6a9ff55fd664b399c3a99f7a0ed7"}]
$hh_cfpb5$::jsonb) loop
    if exists (select 1 from app.assessment_versions where id=(d->>'id')::uuid and content_hash<>d->>'contentHash') then
      raise exception 'Conflicting CFPB 5 ID %',d->>'id';
    end if;
    if exists (select 1 from app.assessment_versions where definition_key=d->>'key' and definition_version=d->>'version' and instrument_locale=d->>'instrumentLocale' and content_hash<>d->>'contentHash') then
      raise exception 'Conflicting CFPB 5 edition %',d->>'key';
    end if;
    insert into app.assessment_versions (id,definition_key,definition_version,instrument_locale,translation_version,definition,questions,answer_schema,scoring_key,scoring_version,result_schema,timeframe,source_metadata,content_hash)
    values ((d->>'id')::uuid,d->>'key',d->>'version',d->>'instrumentLocale',d->>'translationVersion',d,d->'questions',
      jsonb_build_object('type','integer','minimum',(d->'answerScale'->>'min')::int,'maximum',(d->'answerScale'->>'max')::int),
      d->>'scoringKey',d->>'scoringVersion',jsonb_build_object('version',d->>'resultVersion'),d->>'timeframe',d->'source',d->>'contentHash')
    on conflict (id) do nothing;
  end loop;
end $$;
commit;
