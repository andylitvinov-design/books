do $$
begin
  if not exists (select 1 from vault.secrets where name='agent_commander_worker_token') then
    perform vault.create_secret(encode(gen_random_bytes(32),'hex'),'agent_commander_worker_token');
  end if;

  if not exists (select 1 from cron.job where jobname='agent_commander_openrouter_worker_1m') then
    perform cron.schedule(
      'agent_commander_openrouter_worker_1m',
      '* * * * *',
      $job$
        select net.http_post(
          url := 'https://shervdixkaxurnaecioe.supabase.co/functions/v1/agent-commander-openrouter-worker',
          headers := jsonb_build_object(
            'Content-Type','application/json',
            'x-agent-commander-worker',
            (select decrypted_secret from vault.decrypted_secrets where name='agent_commander_worker_token' limit 1)
          ),
          body := '{"tick":true}'::jsonb,
          timeout_milliseconds := 95000
        ) as request_id;
      $job$
    );
  end if;
end $$;
