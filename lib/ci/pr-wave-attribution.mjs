// Read-only, evidence-bounded explanation of repeated Core CI runs.
// An actor who triggered an event is not necessarily responsible for the delay.
const validSha = value => typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
const instant = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const actorLogin = value => typeof value === 'string' &&
  /^(?:[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?)(?:\[bot\])?$/i.test(value) ? value : null;
const coreRun = run => run?.name === 'HH PR core release gate' && run.event === 'pull_request' &&
  Number.isSafeInteger(run.id) && run.id > 0 && validSha(run.head_sha);
const timelineActions = {
  edited: 'Изменены название или описание PR',
  ready_for_review: 'PR переведён в Ready',
  convert_to_draft: 'PR переведён в Draft',
  converted_to_draft: 'PR переведён в Draft',
  reopened: 'PR открыт повторно',
};

export function explainCoreWave(gap, runs, timeline) {
  const previous = Array.isArray(runs) ? runs.find(run => run.id === gap?.previous_run_id) : null;
  const next = Array.isArray(runs) ? runs.find(run => run.id === gap?.run_id) : null;
  const workflowActor = actorLogin(next?.actor?.login);
  const base = {
    code: 'UNVERIFIED', label: 'Недостаточно данных о повторном запуске',
    confidence: 'unknown', initiator: workflowActor,
    initiator_source: workflowActor ? 'workflow_actor' : 'unknown',
    event: null, event_at: null, commit_sha: null,
    prior_sha: validSha(previous?.head_sha) ? previous.head_sha : null,
    next_sha: validSha(next?.head_sha) ? next.head_sha : null,
  };
  if (!coreRun(previous) || !coreRun(next) ||
      previous.head_branch !== next.head_branch ||
      previous.id === next.id || gap?.run_id !== next.id ||
      gap?.previous_run_id !== previous.id) return base;
  if (previous.head_sha !== next.head_sha && gap.head_relation === 'new_head') {
    // SHA comparison is proof of a new source revision; run.actor is the
    // workflow initiator, NOT independently established commit author/pusher.
    return {...base, code: 'HEAD_CHANGED',
      label: 'Новый HEAD PR: повторная проверка другого коммита',
      confidence: 'confirmed_technical', commit_sha: next.head_sha};
  }
  if (previous.head_sha !== next.head_sha || gap.head_relation !== 'same_head') return base;
  const ended = instant(previous.updated_at), started = instant(next.created_at);
  if (ended === null || started === null || started < ended ||
      previous.status !== 'completed' || gap.overlapping_or_unverified) {
    return {...base, code:'SAME_HEAD_UNVERIFIED',
      label:'Повтор того же HEAD, но интервалы/статус не подтверждены'};
  }
  // The run API reports pull_request, but not its action (edited/ready/etc).
  // A unique nearby timeline event is a CORRELATION, never a proven cause.
  const candidates = Array.isArray(timeline) && timeline.length < 100 ? timeline.filter(e => {
    const time = instant(e?.created_at);
    return Object.hasOwn(timelineActions, e?.event) && time !== null &&
      time >= ended && time <= started && started - time <= 10 * 60_000;
  }) : [];
  if (candidates.length === 1) {
    const e = candidates[0], eventActor = actorLogin(e.actor?.login);
    // Conflicting identities make the event-to-run mapping ambiguous.
    if (eventActor && workflowActor && eventActor !== workflowActor)
      return {...base, code:'ACTOR_MISMATCH',
        label:'Событие PR рядом с запуском, но инициаторы не совпадают',
        event:e.event, event_at:e.created_at};
    return {...base, code:'PR_EVENT_CORRELATED',
      label:'Возможно: '+timelineActions[e.event], confidence:'correlated',
      initiator:eventActor || workflowActor,
      initiator_source:eventActor ? 'timeline_actor' : base.initiator_source,
      event:e.event, event_at:e.created_at};
  }
  return {...base,
    code:candidates.length > 1 ? 'MULTIPLE_PR_EVENTS' : 'SAME_HEAD_CAUSE_UNKNOWN',
    label:candidates.length > 1 ? 'Несколько событий PR: причина неоднозначна' :
      'Повтор того же HEAD: триггер не установлен'};
}

export function explainCoreRerunAttempt(run) {
  if (!coreRun(run) || !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 2) return null;
  return {
    run_id:run.id, head_sha:run.head_sha, attempts:run.run_attempt,
    previous_attempts_without_history:run.run_attempt - 1,
    latest_initiator:actorLogin(run.triggering_actor?.login),
    reason:'Повторная попытка существующего run; почему запущена — неизвестно',
    confidence:'unknown',
  };
}
