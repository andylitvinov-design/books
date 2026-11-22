-- Forward-only dedicated greeting preset: retain original account RLS and prior motions.
begin;
alter table app_private.client_live_photos_v1
  drop constraint if exists client_live_photos_v1_motion_check;
alter table app_private.client_live_photos_v1
  add constraint client_live_photos_v1_motion_check
  check (motion in ('smile', 'greeting', 'wave', 'blink', 'turn'));
commit;
