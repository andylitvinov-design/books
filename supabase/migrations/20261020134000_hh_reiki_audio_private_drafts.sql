-- Separate owner-only educational audio drafts from the public published lesson CDN.
-- Existing hh-reiki-course-audio remains public for explicitly published output.
-- Never store any client/session media here; owner uploads require a one-time,
-- server-minted Storage signed upload URL. No anon/auth RLS policies added.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'hh-reiki-audio-drafts',
  'hh-reiki-audio-drafts',
  false,
  20000000,
  array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav']::text[]
)
on conflict (id) do nothing;
