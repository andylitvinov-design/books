-- Published seed is applied ONLY after the new code is READY on production.
-- No duplicate master account, offerings, fictitious reviews or unsupported 10/20 tariffs.
begin;
-- Owner-authorized launch offer: use only Andrey's already approved practitioner
-- and established personal €50/30m + €100/60m pricing. Other durations intentionally
-- remain unavailable rather than manufacturing tariffs.
-- This is a NEW offering, never a duplicate practitioner/CRM/service engine.
with owner_practitioner as (
  select id from app.practitioners
  where slug='andy-litvinov' and status='approved' and active
    and trusted_auth_user_id is not null
),
localized as (
  select jsonb_build_object(
    'en',jsonb_build_object(
      'title','Energy Support for Your Goal · Andrey Litvinov',
      'shortDescription','A private, scheduled distant Reiki practice for your own intention; no video call needed.',
      'description','Choose your intention, Reiki tradition, duration and preferred time. Andrey performs the remote practice at the confirmed interval, without requiring you to be online. An optional symbolic photo of your goal or your own portrait may be shared privately. This complementary spiritual practice is not a medical treatment and does not guarantee results.'
    ),
    'ru',jsonb_build_object(
      'title','Энергетическая поддержка цели · Андрей Литвинов',
      'shortDescription','Личная дистанционная практика Рейки по вашему намерению в согласованное время, без видеозвонка.',
      'description','Выберите цель, метод Рейки, длительность и удобное время. Андрей проводит дистанционную практику в подтверждённый интервал, присутствие клиента онлайн не требуется. При желании можно приложить символическое изображение цели или своё фото, доступное только мастеру. Это дополнительная духовная практика, не лечение и не гарантия результата.'
    ),
    'es',jsonb_build_object(
      'title','Apoyo energético para tu meta · Andrey Litvinov',
      'shortDescription','Práctica privada de Reiki a distancia según tu intención, sin necesidad de videollamada.',
      'description','Selecciona tu objetivo, tradición de Reiki, duración y hora preferida. Andrey realiza la práctica a distancia en el horario confirmado, sin requerir tu presencia en línea. Puedes compartir opcionalmente una imagen simbólica de tu meta o tu propia foto. Es una práctica espiritual complementaria, no un tratamiento médico ni una promesa de resultados.'
    )
  ) as copy
),
offer as (
  select jsonb_build_object(
    'goals',jsonb_build_array('energy','relaxation','purpose','relationships','confidence'),
    'methods',jsonb_build_array('Tantra Reiki','Reiki Yggdrasil'),
    'benefits',jsonb_build_array('A personally scheduled complementary spiritual practice'),
    'faq',jsonb_build_array('You do not need to join a video call. A booking is confirmed by the practitioner.'),
    'displayLocales',jsonb_build_array('en','ru','es'),
    'priceOptions',jsonb_build_array(jsonb_build_object('duration',30,'price',50),jsonb_build_object('duration',60,'price',100))
  ) as metadata
)
insert into app.service_offerings (
  id,practitioner_id,category,localized_copy,active,slug,status,offering_type,
  area_key,delivery_format,location_label,languages,pricing_mode,confirmed_price,
  currency,duration_minutes,image_path,photos,display_locales,discovery_metadata,
  draft_copy,submitted_at,reviewed_at,revision
)
select gen_random_uuid(),p.id,'energy_spiritual',c.copy,true,'remote-energy-support',
  'published','session','energy_spiritual','online',null,'["en","ru"]'::jsonb,
  'from',50,'EUR',30,'/images/holistic-house/andy-about.png',
  '[]'::jsonb,'["en","ru","es"]'::jsonb,o.metadata,
  jsonb_build_object(
    'copy',c.copy,'areaKey','energy_spiritual','offeringType','session',
    'deliveryFormat','online','locationLabel','','languages',jsonb_build_array('en','ru'),
    'pricingMode','from','confirmedPrice',50,'currency','EUR','durationMinutes',30,
    'imagePath','/images/holistic-house/andy-about.png','photos','[]'::jsonb,
    'goals',o.metadata->'goals','methods',o.metadata->'methods',
    'benefits',o.metadata->'benefits','faq',o.metadata->'faq',
    'displayLocales',o.metadata->'displayLocales','priceOptions',o.metadata->'priceOptions',
    'whatsapp','','telegram','','videoPresentation',null
  ),now(),now(),0
from owner_practitioner p cross join localized c cross join offer o
where (select count(*) from app.service_offerings x where x.practitioner_id=p.id
  and x.status<>'archived')<10
  and not exists (select 1 from app.service_offerings existing
    where existing.practitioner_id=p.id and existing.slug='remote-energy-support');

commit;
