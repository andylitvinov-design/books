-- Correct the existing consent-only master preview policy on production.
-- Qualify the target uploaded video ID rather than the subquery request ID.
-- Neither the table's existing owner policy nor any grants are expanded.
drop policy if exists hh_youtube_owner_consented_presentation
 on app_private.practitioner_presentation_uploads;
create policy hh_youtube_owner_consented_presentation
 on app_private.practitioner_presentation_uploads
 for select to hh_app_backend
 using(
   current_setting('hh.youtube_publication_manager',true)='1' and
   exists(
     select 1 from app_private.youtube_owner_publication_requests r
     where r.source_type='practitioner_presentation'
       and r.source_id=practitioner_presentation_uploads.id
       and r.source_owner_auth_user_id=practitioner_presentation_uploads.owner_auth_user_id
       and r.state in ('requested','approved','publishing','uncertain','uploaded')
   )
 );
