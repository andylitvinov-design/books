// 60 independently defined deterministic Director input situations, not generated transcripts or model-training data.
export const COACH_PERSONALITY_QA_SITUATIONS=Object.freeze([
  {
    "id": "goal-narrow",
    "category": "ordinary",
    "stage": "goal",
    "interventionId": "clarify_goal",
    "expectedMode": "explore",
    "split": "development"
  },
  {
    "id": "goal-open",
    "category": "ordinary",
    "stage": "goal",
    "interventionId": "clarify_goal",
    "expectedMode": "explore",
    "split": "development"
  },
  {
    "id": "goal-specific",
    "category": "ordinary",
    "stage": "goal",
    "interventionId": "clarify_goal",
    "expectedMode": "explore",
    "split": "development"
  },
  {
    "id": "fact-example",
    "category": "ordinary",
    "stage": "reality",
    "interventionId": "ground_in_example",
    "expectedMode": "explore",
    "split": "development"
  },
  {
    "id": "constraint",
    "category": "ordinary",
    "stage": "reality",
    "interventionId": "ground_in_example",
    "expectedMode": "explore",
    "split": "holdout"
  },
  {
    "id": "current-reality",
    "category": "ordinary",
    "stage": "reality",
    "interventionId": "ground_in_example",
    "expectedMode": "explore",
    "split": "development"
  },
  {
    "id": "past-exception",
    "category": "ordinary",
    "stage": "resources",
    "interventionId": "explore_strengths",
    "expectedMode": "explore",
    "split": "development"
  },
  {
    "id": "support-person",
    "category": "ordinary",
    "stage": "resources",
    "interventionId": "explore_strengths",
    "expectedMode": "explore",
    "split": "development"
  },
  {
    "id": "existing-strength",
    "category": "ordinary",
    "stage": "resources",
    "interventionId": "explore_strengths",
    "expectedMode": "explore",
    "split": "development"
  },
  {
    "id": "compare-options",
    "category": "ordinary",
    "stage": "options",
    "interventionId": "surface_options",
    "expectedMode": "explore",
    "split": "holdout"
  },
  {
    "id": "explore-perspective",
    "category": "ordinary",
    "stage": "options",
    "interventionId": "surface_options",
    "expectedMode": "explore",
    "split": "development"
  },
  {
    "id": "tradeoff",
    "category": "ordinary",
    "stage": "options",
    "interventionId": "surface_options",
    "expectedMode": "explore",
    "split": "development"
  },
  {
    "id": "optional-step",
    "category": "ordinary",
    "stage": "action",
    "interventionId": "explore_client_owned_step",
    "expectedMode": "action",
    "split": "development"
  },
  {
    "id": "reversible-test",
    "category": "ordinary",
    "stage": "action",
    "interventionId": "explore_client_owned_step",
    "expectedMode": "action",
    "split": "development"
  },
  {
    "id": "action-feasibility",
    "category": "ordinary",
    "stage": "action",
    "interventionId": "explore_client_owned_step",
    "expectedMode": "action",
    "split": "holdout"
  },
  {
    "id": "emotion-fear-explore",
    "category": "emotion",
    "stage": "reality",
    "interventionId": "ground_in_example",
    "expectedMode": "support",
    "emotion": "fear",
    "soft": true,
    "split": "development"
  },
  {
    "id": "emotion-fear-answer",
    "category": "emotion",
    "stage": "action",
    "interventionId": "answer_first",
    "expectedMode": "answer",
    "emotion": "fear",
    "soft": true,
    "split": "development"
  },
  {
    "id": "emotion-shame-explore",
    "category": "emotion",
    "stage": "reality",
    "interventionId": "ground_in_example",
    "expectedMode": "support",
    "emotion": "shame",
    "soft": true,
    "split": "development"
  },
  {
    "id": "emotion-shame-answer",
    "category": "emotion",
    "stage": "action",
    "interventionId": "answer_first",
    "expectedMode": "answer",
    "emotion": "shame",
    "soft": true,
    "split": "development"
  },
  {
    "id": "emotion-sad-explore",
    "category": "emotion",
    "stage": "reality",
    "interventionId": "ground_in_example",
    "expectedMode": "support",
    "emotion": "sad",
    "soft": true,
    "split": "holdout"
  },
  {
    "id": "emotion-sad-answer",
    "category": "emotion",
    "stage": "action",
    "interventionId": "answer_first",
    "expectedMode": "answer",
    "emotion": "sad",
    "soft": true,
    "split": "development"
  },
  {
    "id": "emotion-anger-explore",
    "category": "emotion",
    "stage": "reality",
    "interventionId": "ground_in_example",
    "expectedMode": "support",
    "emotion": "anger",
    "soft": true,
    "split": "development"
  },
  {
    "id": "emotion-anger-answer",
    "category": "emotion",
    "stage": "action",
    "interventionId": "answer_first",
    "expectedMode": "answer",
    "emotion": "anger",
    "soft": true,
    "split": "development"
  },
  {
    "id": "emotion-overload-explore",
    "category": "emotion",
    "stage": "reality",
    "interventionId": "ground_in_example",
    "expectedMode": "support",
    "emotion": "overload",
    "soft": true,
    "split": "development"
  },
  {
    "id": "emotion-overload-answer",
    "category": "emotion",
    "stage": "action",
    "interventionId": "answer_first",
    "expectedMode": "answer",
    "emotion": "overload",
    "soft": true,
    "split": "holdout"
  },
  {
    "id": "respect_no-goal",
    "category": "boundary",
    "stage": "goal",
    "interventionId": "respect_no",
    "expectedMode": "listen",
    "soft": true,
    "split": "development"
  },
  {
    "id": "respect_no-action",
    "category": "boundary",
    "stage": "action",
    "interventionId": "respect_no",
    "expectedMode": "listen",
    "soft": true,
    "split": "development"
  },
  {
    "id": "listen_without_advice-goal",
    "category": "boundary",
    "stage": "goal",
    "interventionId": "listen_without_advice",
    "expectedMode": "listen",
    "soft": true,
    "split": "development"
  },
  {
    "id": "listen_without_advice-action",
    "category": "boundary",
    "stage": "action",
    "interventionId": "listen_without_advice",
    "expectedMode": "listen",
    "soft": true,
    "split": "development"
  },
  {
    "id": "reflect_without_question-goal",
    "category": "boundary",
    "stage": "goal",
    "interventionId": "reflect_without_question",
    "expectedMode": "listen",
    "soft": true,
    "split": "holdout"
  },
  {
    "id": "reflect_without_question-action",
    "category": "boundary",
    "stage": "action",
    "interventionId": "reflect_without_question",
    "expectedMode": "listen",
    "soft": true,
    "split": "development"
  },
  {
    "id": "reduce_scope-goal",
    "category": "boundary",
    "stage": "goal",
    "interventionId": "reduce_scope",
    "expectedMode": "support",
    "soft": true,
    "split": "development"
  },
  {
    "id": "reduce_scope-action",
    "category": "boundary",
    "stage": "action",
    "interventionId": "reduce_scope",
    "expectedMode": "support",
    "soft": true,
    "split": "development"
  },
  {
    "id": "explain_question-goal",
    "category": "boundary",
    "stage": "goal",
    "interventionId": "explain_question",
    "expectedMode": "repair",
    "soft": false,
    "split": "development"
  },
  {
    "id": "explain_question-action",
    "category": "boundary",
    "stage": "action",
    "interventionId": "explain_question",
    "expectedMode": "repair",
    "soft": false,
    "split": "holdout"
  },
  {
    "id": "review-learning",
    "category": "decision_timebox",
    "stage": "review",
    "interventionId": "confirm_client_summary",
    "expectedMode": "review",
    "split": "development"
  },
  {
    "id": "review-uncertain",
    "category": "decision_timebox",
    "stage": "review",
    "interventionId": "reduce_scope",
    "expectedMode": "support",
    "soft": true,
    "split": "development"
  },
  {
    "id": "action-authorized",
    "category": "decision_timebox",
    "stage": "action",
    "interventionId": "explore_client_owned_step",
    "expectedMode": "action",
    "split": "development"
  },
  {
    "id": "action-refused",
    "category": "decision_timebox",
    "stage": "action",
    "interventionId": "respect_no",
    "expectedMode": "listen",
    "soft": true,
    "split": "development"
  },
  {
    "id": "action-direct-question",
    "category": "decision_timebox",
    "stage": "action",
    "interventionId": "answer_first",
    "expectedMode": "answer",
    "split": "holdout"
  },
  {
    "id": "action-no-advice",
    "category": "decision_timebox",
    "stage": "action",
    "interventionId": "listen_without_advice",
    "expectedMode": "listen",
    "soft": true,
    "noAdvice": true,
    "split": "development"
  },
  {
    "id": "wrap-goal",
    "category": "decision_timebox",
    "stage": "goal",
    "interventionId": "invite_reflective_close",
    "expectedMode": "close",
    "wrap": true,
    "split": "development"
  },
  {
    "id": "wrap-reality",
    "category": "decision_timebox",
    "stage": "reality",
    "interventionId": "invite_reflective_close",
    "expectedMode": "close",
    "wrap": true,
    "split": "development"
  },
  {
    "id": "wrap-correction",
    "category": "decision_timebox",
    "stage": "action",
    "interventionId": "repair_misunderstanding",
    "expectedMode": "repair",
    "wrap": true,
    "split": "development"
  },
  {
    "id": "wrap-direct-question",
    "category": "decision_timebox",
    "stage": "action",
    "interventionId": "answer_first",
    "expectedMode": "answer",
    "wrap": true,
    "split": "holdout"
  },
  {
    "id": "resume-explain",
    "category": "continuity",
    "stage": "goal",
    "interventionId": "explain_question",
    "expectedMode": "repair",
    "soft": false,
    "split": "development"
  },
  {
    "id": "new-topic",
    "category": "continuity",
    "stage": "reality",
    "interventionId": "recontract",
    "expectedMode": "repair",
    "soft": false,
    "split": "development"
  },
  {
    "id": "resume-no-advice",
    "category": "continuity",
    "stage": "resources",
    "interventionId": "listen_without_advice",
    "expectedMode": "listen",
    "soft": true,
    "split": "development"
  },
  {
    "id": "resume-refused",
    "category": "continuity",
    "stage": "options",
    "interventionId": "respect_no",
    "expectedMode": "listen",
    "soft": true,
    "split": "development"
  },
  {
    "id": "resume-direct-question",
    "category": "continuity",
    "stage": "action",
    "interventionId": "answer_first",
    "expectedMode": "answer",
    "soft": false,
    "split": "holdout"
  },
  {
    "id": "correct-goal",
    "category": "correction",
    "stage": "goal",
    "interventionId": "repair_misunderstanding",
    "expectedMode": "repair",
    "split": "development"
  },
  {
    "id": "correct-reality",
    "category": "correction",
    "stage": "reality",
    "interventionId": "repair_misunderstanding",
    "expectedMode": "repair",
    "split": "development"
  },
  {
    "id": "correct-resources",
    "category": "correction",
    "stage": "resources",
    "interventionId": "repair_misunderstanding",
    "expectedMode": "repair",
    "split": "development"
  },
  {
    "id": "correct-options",
    "category": "correction",
    "stage": "options",
    "interventionId": "repair_misunderstanding",
    "expectedMode": "repair",
    "split": "development"
  },
  {
    "id": "correct-action",
    "category": "correction",
    "stage": "action",
    "interventionId": "repair_misunderstanding",
    "expectedMode": "repair",
    "split": "holdout"
  },
  {
    "id": "voluntary-end",
    "category": "close",
    "stage": "goal",
    "interventionId": "allow_close",
    "expectedMode": "close",
    "split": "development"
  },
  {
    "id": "close-open",
    "category": "close",
    "stage": "reality",
    "interventionId": "invite_reflective_close",
    "expectedMode": "close",
    "wrap": true,
    "split": "development"
  },
  {
    "id": "close-no-advice",
    "category": "close",
    "stage": "action",
    "interventionId": "allow_close",
    "expectedMode": "close",
    "noAdvice": true,
    "soft": true,
    "split": "development"
  },
  {
    "id": "close-distress",
    "category": "close",
    "stage": "review",
    "interventionId": "allow_close",
    "expectedMode": "close",
    "emotion": "fear",
    "soft": true,
    "split": "development"
  },
  {
    "id": "close-correction",
    "category": "close",
    "stage": "review",
    "interventionId": "repair_misunderstanding",
    "expectedMode": "repair",
    "wrap": true,
    "split": "holdout"
  }
].map(Object.freeze))
