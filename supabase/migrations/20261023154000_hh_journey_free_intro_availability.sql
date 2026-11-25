-- A free INTRODUCTORY AVAILABILITY ENQUIRY, not a free confirmed live session.
-- Reuse the authenticated consultation_requests -> practitioner workspace flow.
-- No CRM duplicate or new table; no results or health information are auto-shared.
begin;
insert into app.service_offerings (
  id, practitioner_id, slug, category, localized_copy, status, offering_type,
  area_key, delivery_format, location_label, languages, pricing_mode,
  confirmed_price, currency, duration_minutes, active, display_locales
)
select gen_random_uuid(), p.id, 'free-intro-availability-request', 'personal_development',
  jsonb_build_object(
    'en',jsonb_build_object(
      'title','Free introductory conversation — availability enquiry',
      'description','Ask whether a short introductory conversation with Andrey is available. This is an enquiry only; it is not a confirmed booking or a promise of a free full session. Any appointment requires a separate personal confirmation.',
      'shortDescription','Ask about a possible free introductory conversation. Confirmation is separate.'
    ),
    'ru',jsonb_build_object(
      'title','Бесплатное знакомство — запрос возможности встречи',
      'description','Уточните, возможен ли короткий бесплатный ознакомительный разговор с Андреем. Это только запрос, не подтверждённая запись и не обещание полной бесплатной сессии. Время встречи согласуется отдельно.',
      'shortDescription','Узнайте о возможности бесплатного вводного разговора. Запись подтверждается отдельно.'
    )
  ),
  'published', 'intro', 'personal_development', 'online', 'Online',
  '["en","ru"]'::jsonb, 'free', null, null, null, true, '["en","ru"]'::jsonb
from app.practitioners p
where p.id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid
  and p.active and p.status='approved'
on conflict (practitioner_id, slug) do nothing;
commit;
