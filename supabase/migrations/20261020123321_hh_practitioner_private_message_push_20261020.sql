-- Verified client reply -> assigned opt-in practitioner devices.
-- No message content; separate from existing practitioner -> client push function.
CREATE FUNCTION app_private.master_message_push_targets(p_message_id uuid)
RETURNS TABLE(subscription_id uuid,request_id uuid,endpoint text,p256dh text,auth_secret text,locale text)
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT sub.id,r.id,sub.endpoint,sub.p256dh,sub.auth_secret,pref.locale
 FROM app.practitioner_request_messages msg
 JOIN app.consultation_requests r ON r.id=msg.request_id
 JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
 JOIN app.accounts account ON account.id=p.trusted_auth_user_id
 JOIN app_private.notification_preferences pref ON pref.account_id=account.id
 JOIN app_private.push_subscriptions sub ON sub.account_id=account.id
 WHERE msg.id=p_message_id
  AND msg.author_role='client' AND msg.visibility='participants'
  AND msg.author_account_id=r.account_id
  AND p.active AND p.status IN ('approved','submitted','changes_requested')
  AND r.status IN ('requested','contacted')
  AND account.status='active' AND account.onboarding_state='active'
  AND pref.enabled=true AND pref.message_alerts=true
  AND account.id<>msg.author_account_id
  AND msg.created_at>now()-interval '15 minutes'
 ORDER BY sub.created_at ASC LIMIT 5
$$;
REVOKE ALL ON FUNCTION app_private.master_message_push_targets(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app_private.master_message_push_targets(uuid) TO hh_app_backend;
