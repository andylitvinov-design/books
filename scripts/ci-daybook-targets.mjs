import {coachingRlsCiUrls} from './ci-coaching-rls-guard.mjs'
export function daybookCiTargets(env=process.env){
 const {control}=coachingRlsCiUrls(env)
 const definitions=[
  ['hh_daybook_runtime_test','HH_DAYBOOK_TEST_DATABASE_URL','tests/daybook-journal-database.integration.mjs'],
  ['hh_personal_goal_test','HH_GOAL_TEST_DATABASE_URL','tests/daybook-personal-goal-store.integration.mjs'],
  ['hh_daybook_daily_repo_test','HH_DAILY_TEST_DATABASE_URL','tests/daybook-daily-repository.integration.mjs'],
  ['hh_personal_action_test','HH_ACTION_TEST_DATABASE_URL','tests/daybook-personal-action-store.integration.mjs'],
  ['hh_daybook_schema_test','HH_DAYBOOK_SCHEMA_TEST_DATABASE_URL','tests/daybook-canonical-schema.integration.mjs'],
  ['hh_daybook_weekly_test','HH_WEEKLY_TEST_DATABASE_URL','tests/daybook-weekly-repository.integration.mjs'],
  ['hh_daybook_coach_test','HH_DAYBOOK_COACH_TEST_DATABASE_URL','tests/daybook-coach-repository.integration.mjs'],
 ]
 return {control,targets:definitions.map(([database,variable,file])=>{
  const url=new URL(control);url.pathname='/'+database
  return {database,variable,file,url:url.toString(),minimumPasses:['HH_WEEKLY_TEST_DATABASE_URL','HH_DAYBOOK_COACH_TEST_DATABASE_URL'].includes(variable)?9:8}
 })}
}
