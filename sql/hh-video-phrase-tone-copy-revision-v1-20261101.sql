-- Text-only editorial refinement to ensure all four tones produce distinct
-- visible wording for every scenario/idea/locale/address/length combination.
-- Idempotent: each UPDATE matches an old prefix only. Public table grants and
-- identifiers are unchanged, and no private records are touched.
update public.hh_video_phrase_catalog_v1
set phrase_text='Я разрешаю себе '||substr(phrase_text,length('Я могу ')+1)
where locale='ru' and tone='gentle' and speaker='self' and variant=2
  and left(phrase_text,length('Я могу '))='Я могу ';

update public.hh_video_phrase_catalog_v1
set phrase_text='Ты можешь позволить себе '||substr(phrase_text,length('Ты можешь ')+1)
where locale='ru' and tone='gentle' and speaker='support' and variant=2
  and left(phrase_text,length('Ты можешь '))='Ты можешь ';

update public.hh_video_phrase_catalog_v1
set phrase_text='I feel free to '||substr(phrase_text,length('I can ')+1)
where locale='en' and tone='gentle' and speaker='self' and variant=2
  and left(phrase_text,length('I can '))='I can ';

update public.hh_video_phrase_catalog_v1
set phrase_text='You are free to '||substr(phrase_text,length('You can ')+1)
where locale='en' and tone='gentle' and speaker='support' and variant=2
  and left(phrase_text,length('You can '))='You can ';

update public.hh_video_phrase_catalog_v1
set phrase_text='Me doy espacio para '||substr(phrase_text,length('Puedo ')+1)
where locale='es' and tone='gentle' and speaker='self' and variant=1
  and left(phrase_text,length('Puedo '))='Puedo ';

update public.hh_video_phrase_catalog_v1
set phrase_text='Puedes darte permiso para '||substr(phrase_text,length('Puedes ')+1)
where locale='es' and tone='gentle' and speaker='support' and variant=1
  and left(phrase_text,length('Puedes '))='Puedes ';
