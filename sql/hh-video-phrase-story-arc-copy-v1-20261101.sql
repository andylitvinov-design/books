-- Refine ready-made copy by the canonical narrative arc. Same stable IDs,
-- no client data; this preserves manual selections and the approved RLS grants.
-- Adds a distinctive scenario phrase: journey / shelter / awakening / connection.
with arc_tags(locale,scenario_suffix,speaker,phrase_tail) as (
  values ('ru','s1','self',' — шаг за шагом'),
         ('ru','s1','support',' — шаг за шагом'),
         ('ru','s2','self',' — без спешки'),
         ('ru','s2','support',' — без спешки'),
         ('ru','s3','self',' — с новым интересом'),
         ('ru','s3','support',' — с новым интересом'),
         ('ru','s4','self',' — в своём ритме'),
         ('ru','s4','support',' — в своём ритме'),
         ('en','s1','self',', one step at a time'),
         ('en','s1','support',', one step at a time'),
         ('en','s2','self',', without rushing'),
         ('en','s2','support',', without rushing'),
         ('en','s3','self',', with fresh curiosity'),
         ('en','s3','support',', with fresh curiosity'),
         ('en','s4','self',', at my own pace'),
         ('en','s4','support',', at your own pace'),
         ('es','s1','self',', paso a paso'),
         ('es','s1','support',', paso a paso'),
         ('es','s2','self',', sin prisa'),
         ('es','s2','support',', sin prisa'),
         ('es','s3','self',', con nueva curiosidad'),
         ('es','s3','support',', con nueva curiosidad'),
         ('es','s4','self',', a mi ritmo'),
         ('es','s4','support',', a tu ritmo')
)
update public.hh_video_phrase_catalog_v1 as p
set phrase_text=left(p.phrase_text,position('.' in p.phrase_text)-1)
  ||t.phrase_tail||substr(p.phrase_text,position('.' in p.phrase_text))
from arc_tags t
where p.locale=t.locale and p.speaker=t.speaker
  and right(p.scenario_id,2)=t.scenario_suffix
  and position('.' in p.phrase_text)>0
  and position(t.phrase_tail in p.phrase_text)=0;
