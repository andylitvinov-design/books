-- Defense-in-depth: ordinary master actors may access only their own
-- per-video consent requests; only the platform moderator may review all.
drop policy if exists hh_youtube_owner_request_backend
 on app_private.youtube_owner_publication_requests;
create policy hh_youtube_owner_request_backend
 on app_private.youtube_owner_publication_requests
 for all to hh_app_backend
 using(
   current_setting('hh.youtube_publication_manager',true)='1' and
   (current_setting('hh.moderator',true)='1' or
    (source_type='practitioner_presentation' and
     source_owner_auth_user_id=(select auth.uid())))
 )
 with check(
   current_setting('hh.youtube_publication_manager',true)='1' and
   (current_setting('hh.moderator',true)='1' or
    (source_type='practitioner_presentation' and
     source_owner_auth_user_id=(select auth.uid())))
 );
