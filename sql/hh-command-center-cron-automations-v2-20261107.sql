-- Cron Automations v2: owner-editable instructions and agent context, no new execution grants.
-- Additive to app_private.cc_skill_jobs. Existing runs/leases are unchanged.
BEGIN;
ALTER TABLE app_private.cc_skill_jobs
 ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS instruction text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS skill_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN IF NOT EXISTS brain_scope text NOT NULL DEFAULT 'none',
 ADD COLUMN IF NOT EXISTS agent_role text NOT NULL DEFAULT 'commander',
 ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'builtin',
 ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
UPDATE app_private.cc_skill_jobs SET title=CASE skill_id
 WHEN 'task.stall-watchdog' THEN 'Поиск зависших задач'
 WHEN 'agents.health-lease' THEN 'Проверка состояния агентов'
 WHEN 'cost.budget-guard' THEN 'Контроль бюджета'
 WHEN 'report.morning-brief' THEN 'Утренний брифинг'
 ELSE skill_id END WHERE title='';
UPDATE app_private.cc_skill_jobs SET instruction=CASE skill_id
 WHEN 'task.stall-watchdog' THEN 'Проверять агрегированные состояния задач Command Center. Выявлять зависшие и заблокированные задачи; сохранять подтверждённый журнал наблюдения.'
 WHEN 'agents.health-lease' THEN 'Проверять состояния разрешённых запусков и просроченных leases. Сохранять агрегированные показатели без изменения чужих запусков.'
 WHEN 'cost.budget-guard' THEN 'Проверять общий лимит безопасных запусков за сутки. Сообщать число использованных запусков; не разрешать дополнительные платные действия.'
 WHEN 'report.morning-brief' THEN 'Формировать краткую сводку по задачам, активным работам, блокерам и подтверждённым read-only результатам Command Center.'
 ELSE 'Пользовательский черновик: ожидает подключения подтверждённого исполнителя. Не запускается до авторизации и настройки безопасности.' END
WHERE instruction='';
UPDATE app_private.cc_skill_jobs
 SET skill_ids=jsonb_build_array(skill_id)
 WHERE skill_id IN('task.stall-watchdog','agents.health-lease','cost.budget-guard','report.morning-brief')
 AND skill_ids='[]'::jsonb;
ALTER TABLE app_private.cc_skill_jobs
 ADD CONSTRAINT cc_skill_jobs_owner_text_v2 CHECK (
 length(title) BETWEEN 0 AND 120 AND length(instruction) BETWEEN 0 AND 6000
 AND jsonb_typeof(skill_ids)='array' AND jsonb_array_length(skill_ids)<=8
 AND octet_length(skill_ids::text)<=800
 AND brain_scope IN('none','ai-projects-brain','agent-council')
 AND agent_role IN('commander','analyst','engineering','marketing','education')
 AND execution_mode IN('builtin','blocked_no_runner')
 AND revision BETWEEN 0 AND 1000000
 AND (execution_mode='builtin' OR enabled=false)
 );
-- Explicit fail-closed rule for user authored custom jobs: the table cannot
-- promote a custom prompt into an executable skill by toggling a flag.
ALTER TABLE app_private.cc_skill_jobs
 ADD CONSTRAINT cc_skill_jobs_custom_blocked_v2 CHECK(
 skill_id NOT LIKE 'custom.%' OR (enabled=false AND execution_mode='blocked_no_runner')
 );
-- Existing role policies remain FORCE RLS and restricted to hh_app_backend only.
COMMIT;
