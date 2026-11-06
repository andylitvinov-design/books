-- Allow an explicitly consented full 20-question coaching questionnaire to be stored
-- in the EXISTING AES-GCM practitioner enquiry record. No new contact/CRM tables.
-- API remains limited to 1,400 characters for ordinary public enquiries; the
-- coaching-intake-only server validator caps plaintext at 40,000 characters and
-- its same-origin route caps total JSON at 80 KiB with per-IP rate limiting.
-- Sealed ciphertext is base64 and can exceed the source text byte length.
alter table app.public_service_enquiries
  drop constraint public_service_enquiries_description_ciphertext_check;
alter table app.public_service_enquiries
  add constraint public_service_enquiries_description_ciphertext_check
  check (char_length(description_ciphertext) between 40 and 128000);
