-- Holistic House CRM 2.0: associate one internal booking task with one owner deal.
-- NO outbound messages or appointment/payment claims; existing followups stay intact.
begin;
alter table app.crm_opportunities
 add constraint crm_opportunity_owner_contact_identity unique (id,owner_id,contact_id);
alter table app.crm_followups add column opportunity_id uuid;
alter table app.crm_followups
 add constraint crm_followup_opportunity_same_contact_fk
 foreign key (opportunity_id,owner_id,contact_id)
 references app.crm_opportunities(id,owner_id,contact_id) on delete cascade;
create unique index crm_followup_opportunity_kind_once
 on app.crm_followups(owner_id,opportunity_id,kind)
 where opportunity_id is not null;
create index crm_followups_opportunity_owner_idx
 on app.crm_followups(opportunity_id,owner_id) where opportunity_id is not null;
comment on column app.crm_followups.opportunity_id is
 'Optional owner- and contact-bound manual business deal. One internal booking task per deal; not proof of confirmed appointment.';
commit;