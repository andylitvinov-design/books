
create index if not exists coaching_questions_answer_set_fk_idx
  on app_private.coaching_questions(answer_set_key);
create index if not exists coaching_schemes_model_fk_idx
  on app_private.coaching_schemes(model_key);
