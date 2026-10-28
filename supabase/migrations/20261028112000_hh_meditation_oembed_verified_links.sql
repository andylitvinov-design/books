-- 28 Oct 2026. All 20 external video IDs independently returned HTTP 200,
-- public title and channel from YouTube's official oEmbed endpoint.
-- This is LINK DISCOVERY only, not content, duration, rights or iframe QA.
alter table public.hh_meditation_catalog_v1
 add column if not exists youtube_oembed_checked_at timestamptz;
comment on column public.hh_meditation_catalog_v1.youtube_oembed_checked_at is
 'Public YouTube oEmbed metadata check, NOT an embedded-playback, medical-claims or transcript verification';

update public.hh_meditation_catalog_v1
set youtube_oembed_checked_at=now(),
    metadata_checked_at=now(),
    metadata_confidence='public_listing',
    updated_at=now()
where source_kind='external'
  and editorial_status='candidate'
  and youtube_id = any(array['4P2SCgwXVxc','5eaGPbI2hLk','8Cx-cTU1Y9k','9r8jXUvsi3w','beqlbgNtwSk','EpMXNJiFOt4','fWfG5gXHK5Y','fYSh2Jklr8I','jU7lFvLJKKc','NTYuQ3tMSIA','okYUCEsHQCk','qbPE5zaiNqs','QfLD2_yy2AU','TSrQCIYlcV8','u7l82BPQaIU','vceXCrOTUe0','waC2GIaDKCc','x6dYoegBt7I','XGmoBdZpVqY','xtxz5BBUlwU'])
  and source_url='https://www.youtube.com/watch?v='||youtube_id;

update public.hh_meditation_catalog_v1
set discovery_status='link_only',updated_at=now()
where source_kind='external'
  and editorial_status='candidate'
  and youtube_oembed_checked_at is not null
  and metadata_confidence='public_listing'
  and content_type='guided'
  and claims_risk in ('low','moderate')
  and embed_status='unverified'
  and rights_status='pending_embed_check'
  and youtube_id=any(array['4P2SCgwXVxc','5eaGPbI2hLk','8Cx-cTU1Y9k','9r8jXUvsi3w','beqlbgNtwSk','EpMXNJiFOt4','fWfG5gXHK5Y','fYSh2Jklr8I','jU7lFvLJKKc','NTYuQ3tMSIA','okYUCEsHQCk','qbPE5zaiNqs','QfLD2_yy2AU','TSrQCIYlcV8','u7l82BPQaIU','vceXCrOTUe0','waC2GIaDKCc','x6dYoegBt7I','XGmoBdZpVqY','xtxz5BBUlwU']);

-- Don't accidentally expose future merely hand-entered metadata: every
-- discoverable third-party link must carry a real platform verification event.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='hh_meditation_link_only_oembed_verified' and conrelid='public.hh_meditation_catalog_v1'::regclass) then
    alter table public.hh_meditation_catalog_v1
     add constraint hh_meditation_link_only_oembed_verified
     check (discovery_status <> 'link_only' or youtube_oembed_checked_at is not null);
  end if;
end
$$;

drop policy if exists "Published video or curated metadata-only YouTube link"
 on public.hh_meditation_catalog_v1;
create policy "Published video or curated metadata-only YouTube link"
 on public.hh_meditation_catalog_v1 for select to anon,authenticated
 using (
  (editorial_status='approved' and embed_status='confirmed'
     and rights_status='embed_approved' and content_checked_at is not null)
  or
  (discovery_status='link_only' and source_kind='external'
    and editorial_status='candidate'
    and youtube_oembed_checked_at is not null
    and metadata_confidence='public_listing'
    and content_type='guided'
    and claims_risk in ('low','moderate')
    and embed_status='unverified'
    and rights_status='pending_embed_check'
    and metadata_checked_at is not null)
 );
