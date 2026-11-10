-- Holistic House editorial YouTube meditation discovery catalog.
-- Discovery-only staging: NO client assessments, symptoms or selections are stored.
-- Every video requires playback + content + rights review before public API visibility.
create table if not exists public.hh_meditation_catalog_v1 (
 youtube_id varchar(11) primary key check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
 title text not null,
 creator text not null,
 source_kind text not null check (source_kind in ('original','external')),
 source_url text not null,
 source_evidence_url text,
 audio_language text not null check (audio_language in ('en','ru','es')),
 subtitle_languages text[] not null default '{}',
 duration_hint_minutes smallint check (duration_hint_minutes > 0 and duration_hint_minutes <= 360),
 duration_verified_seconds integer check (duration_verified_seconds > 0),
 duration_basis text not null default 'unknown' check (duration_basis in ('unknown','title_only','metadata_checked')),
 content_type text not null default 'guided' check (content_type in ('guided','practice','talk','ambient','unknown')),
 goals text[] not null default '{}',
 goal_weights jsonb not null default '{}'::jsonb check (jsonb_typeof(goal_weights)='object'),
 subtopics text[] not null default '{}',
 user_situations text[] not null default '{}',
 desired_states text[] not null default '{}',
 techniques text[] not null default '{}',
 time_of_day text not null default 'any' check (time_of_day in ('any','morning','day','evening','bedtime')),
 posture text not null default 'unknown' check (posture in ('unknown','sitting','lying','either')),
 experience_level text not null default 'unspecified' check (experience_level in ('unspecified','beginner','intermediate','advanced')),
 intensity text not null default 'unknown' check (intensity in ('unknown','gentle','moderate','intense')),
 spiritual_style text not null default 'unspecified' check (spiritual_style in ('unspecified','secular','open','spiritual','esoteric')),
 music_style text not null default 'unknown' check (music_style in ('unknown','voice_only','music_under_voice','ambient_only')),
 voice_style text not null default 'unknown',
 safety_flags text[] not null default '{}',
 claims_risk text not null default 'unknown' check (claims_risk in ('unknown','low','moderate','high')),
 metadata_confidence text not null default 'candidate' check (metadata_confidence in ('candidate','public_listing','owner_source')),
 editorial_status text not null default 'candidate' check (editorial_status in ('candidate','approved','rejected')),
 embed_status text not null default 'unverified' check (embed_status in ('unverified','confirmed','blocked')),
 rights_status text not null default 'pending_embed_check' check (rights_status in ('pending_embed_check','embed_approved','permission_required','blocked')),
 review_notes text,
 metadata_checked_at timestamptz,
 content_checked_at timestamptz,
 embed_checked_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint hh_meditation_catalog_v1_goals_check
  check (goals <@ array['money','energy','relationships','goals','meaning']::text[]),
 constraint hh_meditation_catalog_v1_publication_gate
  check (editorial_status <> 'approved' or
    (embed_status = 'confirmed' and rights_status = 'embed_approved' and content_checked_at is not null))
);
comment on table public.hh_meditation_catalog_v1 is
  'Manually curated YouTube meditation index; public API only after independent editorial, embed and rights review. No private client records.';
create index if not exists hh_meditation_v1_goals_idx on public.hh_meditation_catalog_v1 using gin (goals);
create index if not exists hh_meditation_v1_situations_idx on public.hh_meditation_catalog_v1 using gin (user_situations);
create index if not exists hh_meditation_v1_states_idx on public.hh_meditation_catalog_v1 using gin (desired_states);
create index if not exists hh_meditation_v1_techniques_idx on public.hh_meditation_catalog_v1 using gin (techniques);
create index if not exists hh_meditation_v1_language_status_idx on public.hh_meditation_catalog_v1 (audio_language,editorial_status);
alter table public.hh_meditation_catalog_v1 enable row level security;
revoke all on table public.hh_meditation_catalog_v1 from public,anon,authenticated;
grant select on table public.hh_meditation_catalog_v1 to anon,authenticated;
drop policy if exists "Only editorially verified meditations are discoverable" on public.hh_meditation_catalog_v1;
create policy "Only editorially verified meditations are discoverable" on public.hh_meditation_catalog_v1
 for select to anon,authenticated using (
  editorial_status = 'approved' and embed_status = 'confirmed'
  and rights_status = 'embed_approved' and content_checked_at is not null
 );

create table if not exists public.hh_meditation_facets_v1 (
 facet_type text not null check (facet_type in ('goal','situation','outcome','technique','time','level','spirituality','posture')),
 facet_key text not null,
 label_en text not null,
 label_ru text not null,
 label_es text not null,
 sort_order smallint not null default 0,
 active boolean not null default true,
 primary key (facet_type,facet_key)
);
alter table public.hh_meditation_facets_v1 enable row level security;
revoke all on table public.hh_meditation_facets_v1 from public,anon,authenticated;
grant select on table public.hh_meditation_facets_v1 to anon,authenticated;
drop policy if exists "Public taxonomy only" on public.hh_meditation_facets_v1;
create policy "Public taxonomy only" on public.hh_meditation_facets_v1 for select
 to anon,authenticated using (active);
