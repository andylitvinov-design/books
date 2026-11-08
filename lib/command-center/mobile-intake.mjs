/** Conservative, zero-model recognition for mobile owner task intake.
 * A GitHub URL can be suggested, but a code-fix instruction NEVER silently
 * becomes a read-only audit. No arbitrary URLs, credentials or user profiling.
 */
const URL=/https:\/\/github\.com\/andylitvinov-design\/books\/(pull|issues)\/([1-9]\d{0,7})(?=$|[\s,.!;:])/g;
const AUDIT=new Set(['проверь','проверить','проверка','аудит','статус','check','audit','inspect','status','review','verificar','revisar']);
export function suggestCommandTask(text){
  if(typeof text!=='string'||text.length>140)return null;
  const matches=[...text.matchAll(URL)];
  if(matches.length!==1)return null;
  const [url,kind]=matches[0];
  const first=(text.trim().split(/\s+/)[0]||'').toLowerCase().replace(/[:.!;,]+$/,'');
  const audit=AUDIT.has(first)||first===url.toLowerCase();
  return {sourceRef:url,kind:audit?(kind==='pull'?'repo_pr_audit':'repo_issue_audit'):null};
}
/** Rendering-only helper; the server's CC_TRANSITIONS remains the authority. */
export function ownerTaskActions(task){
  if(!task||typeof task!=='object')return Object.freeze({pause:false,resume:false,cancel:false});
  const state=task.state;
  const attempts=Number(task.attempt_count)||0;
  const readOnly=task.auto_allowed===true&&['repo_pr_audit','repo_issue_audit'].includes(task.kind);
  return Object.freeze({
    pause:readOnly&&['ready','retry_wait'].includes(state),
    resume:readOnly&&attempts<2&&['paused','blocked_external'].includes(state),
    cancel:['inbox','needs_spec','planned','ready','retry_wait',
      'blocked_dependency','blocked_approval','blocked_no_runner',
      'blocked_budget','blocked_external','paused','dead_letter'].includes(state)
  });
}
