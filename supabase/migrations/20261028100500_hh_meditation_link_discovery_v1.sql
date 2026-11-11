-- Phase 2: deliberately limited link-only discovery of platform-identified videos.
-- Media remain on the creator's official YouTube page until full playback/embed/content QA.
alter table public.hh_meditation_catalog_v1
  add column if not exists discovery_status text not null default 'private_review'
  check (discovery_status in ('private_review','link_only'));

do $guard$
begin
 if not exists (
   select 1 from pg_constraint
   where conname = 'hh_meditation_link_only_guard'
     and conrelid = 'public.hh_meditation_catalog_v1'::regclass
 ) then
   alter table public.hh_meditation_catalog_v1
     add constraint hh_meditation_link_only_guard
     check (discovery_status <> 'link_only' or
       (source_kind = 'external'
         and editorial_status = 'candidate'
         and metadata_confidence = 'public_listing'
         and metadata_checked_at is not null
         and content_type = 'guided'
         and claims_risk in ('low','moderate')
         and embed_status = 'unverified'
         and rights_status = 'pending_embed_check'));
 end if;
end
$guard$;

-- Independently checked titles/channels and public descriptions as of 28 Oct 2026.
-- Not evidence of permission to embed, listening to full audio, or outcomes.
update public.hh_meditation_catalog_v1
set discovery_status = 'link_only', updated_at = now()
where youtube_id in (
  'fWfG5gXHK5Y', -- Great Meditation: Financial worry
  '8Cx-cTU1Y9k', -- The Honest Guys: Money worries
  'qbPE5zaiNqs', -- Tara Brach: Loving awareness
  '9r8jXUvsi3w', -- Ally Boothroyd: Yoga Nidra
  'EpMXNJiFOt4'  -- Encontrando el balance: calm/uncertainty
)
and source_kind = 'external'
and editorial_status = 'candidate'
and metadata_confidence = 'public_listing'
and claims_risk in ('low','moderate')
and content_type = 'guided';

drop policy if exists "Only editorially verified meditations are discoverable"
  on public.hh_meditation_catalog_v1;
drop policy if exists "Published video or curated metadata-only YouTube link" on public.hh_meditation_catalog_v1;
create policy "Published video or curated metadata-only YouTube link"
on public.hh_meditation_catalog_v1 for select to anon,authenticated using (
  (editorial_status = 'approved' and embed_status = 'confirmed'
    and rights_status = 'embed_approved' and content_checked_at is not null)
  or
  (discovery_status = 'link_only' and source_kind = 'external'
    and editorial_status = 'candidate' and metadata_confidence = 'public_listing'
    and content_type = 'guided' and claims_risk in ('low','moderate')
    and embed_status = 'unverified'
    and rights_status = 'pending_embed_check'
    and metadata_checked_at is not null)
);
