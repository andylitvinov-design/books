-- Weekly coaching adds a distinct written deliverable for each of 90 days.
-- Grow ONLY the existing encrypted payload capacity (not access surface).
-- At most ~90 x (1200-char result + 900-char reflection) plus KPI/weekly logs
-- may exceed the initial 250k-character ciphertext CHECK.
-- The client-owned encryption, account PK, grants and RLS remain unchanged.
begin;
alter table app_private.business_coaching_programs
  drop constraint business_coaching_programs_payload_ciphertext_check;
alter table app_private.business_coaching_programs
  add constraint business_coaching_programs_payload_ciphertext_check
    check (char_length(payload_ciphertext) between 40 and 750000);
commit;
