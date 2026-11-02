/**
 * Daily Holistic Light public Design QA -> one actionable issue, no duplicate PRs.
 * An issue update is NEVER evidence of a code change, successful merge or LIVE.
 */
export const ISSUE_TITLE = "[Design QA] Holistic Light — daily action queue";
export const ISSUE_MARKER = "<!-- HH_HOLISTIC_LIGHT_DAILY_ACTION_V1 -->";
export const ISSUE_LABEL = "hh:design-qa";
const SAFE_ROUTE = /^\/(?:en|ru|es)\/[a-z0-9/_-]+$/;
const PRIVATE_ROUTE = /(?:^|\/)(?:api|app|admin|client|dashboard|account|auth|checkout|payment|private)(?:\/|$)/i;
const RANK = {
  VIEW_IDENTITY:[100,"routing","Inspect redirects and page identity before screenshot comparison."],
  SOLID_CONTROL_CONTRAST:[95,"a11y","Fix foreground/background using existing tokens; recheck WCAG AA in the rendered view."],
  HORIZONTAL_OVERFLOW:[95,"mobile","Fix owning component's layout/width/safe area; test 320/390/430px."],
  PUBLIC_PAGE_ERRORS:[90,"runtime","Trace the browser error and fix the underlying component or API, then retry."],
  CAPTURE_FAILED:[75,"infra","Retry isolated guest capture; verify this is a reproducible site defect before editing."],
  SMALL_TAP_TARGETS:[70,"a11y","Inspect real clickable geometry; target at least 44x44px with adequate separation."],
  NO_FIRST_SCREEN_ACTION:[60,"hierarchy","Verify one clear and actually working primary CTA in the first viewport."],
  SAGE_GREEN_WASH:[50,"visual-review","Review screenshot and reduce large sage-gray fills if appropriate; preserve approved themes."],
  SMALL_HEADINGS:[45,"readability","Adjust mobile type scale without truncating EN/RU/ES."],
  H1_COUNT:[35,"structure","Check heading hierarchy; document genuine editorial exceptions."]
};
const OWNERS = {
  "/meditations":"app/[locale]/meditations/page.tsx",
  "/holistic-support/mandala":"app/[locale]/holistic-support/mandala/page.tsx",
  "/holistic-support/mobile":"components/holistic-support-mobile.tsx",
  "/practice":"app/[locale]/practice/page.jsx"
};
const safeText=(value,limit=160)=>String(value??"").replace(/[<>\r\n]/g," ").slice(0,limit);
function validate(summary) {
  if(summary?.schema!=="hh.design-bible-qa-batch.v1"||summary?.publicGuestOnly!==true||
     !Array.isArray(summary.reports)||!summary.reports.length||summary.reports.length>100)
    throw Error("Invalid public guest audit: refuse to mark incomplete results clean");
}
export function makeActionPlan(summary) {
  validate(summary);
  const grouped=new Map();
  for(const result of summary.reports) {
    if(!SAFE_ROUTE.test(result?.route??"")||PRIVATE_ROUTE.test(result.route))throw Error("Unsafe public route");
    if(!Array.isArray(result.critical)||!Array.isArray(result.warnings))
      throw Error("Missing public QA diagnostics");
    for(const [level,items] of [["CRITICAL",result.critical],["REVIEW",result.warnings]]) {
      for(const item of items) {
        const code=safeText(item.code,60);
        const [score,kind,action]=RANK[code]??[25,"triage","Reproduce and inspect before changing source."];
        const family=result.route.replace(/^\/(?:en|ru|es)/,"");
        const key=family+":"+code;
        const observation={locale:result.route.split("/")[1],width:result.width};
        const prior=grouped.get(key);
        if(prior) {
          if(level==="CRITICAL")prior.severity=level;
          if(!prior.observations.some(x=>x.locale===observation.locale&&x.width===observation.width))
            prior.observations.push(observation);
        } else {
          grouped.set(key,{key,code,score,kind,action,severity:level,
            family,route:result.route,
            ownerFile:OWNERS[family]||"Locate existing component in production",
            explanation:safeText(item.reason||item.message||code,190),
            observations:[observation]});
        }
      }
    }
  }
  const findings=[...grouped.values()].sort((a,b)=>
    Number(b.severity==="CRITICAL")-Number(a.severity==="CRITICAL")||
    b.score-a.score||a.key.localeCompare(b.key));
  const suitable=findings.filter(x=>x.kind!=="triage"&&x.kind!=="visual-review");
  return {schema:"hh.design-action-plan.v1",examined:summary.reports.length,
    criticalCases:summary.criticalCases||0,findings,top:findings.slice(0,8),
    highest:suitable[0]||findings[0]||null,
    nextAction:suitable.length?"REPRODUCE_AND_REPAIR_EXISTING_CODE":
      findings.length?"MANUAL_VISUAL_REVIEW":"REVIEW_SCREENSHOTS_AND_EXPAND_COVERAGE"};
}
export function issueBody(plan,{runUrl,sourceHead}={}) {
  if(plan.schema!=="hh.design-action-plan.v1")throw Error("Invalid plan");
  const evidence=/^https:\/\/github\.com\/andylitvinov-design\/books\/actions\/runs\/\d+$/.test(runUrl??"")
    ?runUrl:"RUN_URL_NOT_VERIFIED";
  const sha=/^[a-f0-9]{40}$/i.test(sourceHead??"")?sourceHead:"UNVERIFIED";
  const lines=[
    ISSUE_MARKER,
    "# Holistic House | Daily Design QA | actionable repair queue",
    "",
    "Source: https://holistichouse.vercel.app",
    "Design Bible: https://docs.google.com/document/d/1zREpz2hpHA-dfilYgXS18TASkrw-D8mf_UXEFrfOvvU/edit",
    "Evidence and screenshots: "+evidence,
    "Audited source checkout: "+sha+" (NOT proof of serving Vercel SHA)",
    "Routes checked: "+plan.examined+"; grouped findings: "+plan.findings.length,
    "Next action: "+plan.nextAction,
    "",
    "## First source-repair task (not yet claimed or implemented)"
  ];
  if(plan.highest) {
    const p=plan.highest;
    lines.push("Priority: "+p.severity+" / "+p.code+" / "+p.kind);
    lines.push("Page: "+p.route+"; family: "+p.family+"; widths/locales: "+
      p.observations.map(x=>x.locale+"/"+x.width+"px").join(", "));
    lines.push("Likely owner: "+p.ownerFile+" (confirm component and view before edits)");
    lines.push("Evidence: "+p.explanation);
    lines.push("Recommended code action: "+p.action);
    lines.push("Acceptance: correct existing module, test 320/390/430, EN/RU/ES, "+
      "Chromium/WebKit, real CTA, screenshot overlay, exact-head CI, then production READY/SHA and LIVE.");
  } else {
    lines.push("No machine-confirmed fault. Concrete next action: inspect the latest screenshots "+
      "against the owner's warm, airy reference, then choose the next public route for coverage.");
  }
  lines.push("","## Other findings");
  for(const p of plan.top.filter(p=>p.key!==plan.highest?.key))
    lines.push("- "+p.severity+" / "+p.code+" / "+p.family+": "+p.action);
  if(plan.findings.length>plan.top.length)lines.push("- More cases in the linked run artifacts.");
  lines.push("","## Mandatory handoff and outcome receipts",
    "- A GitHub issue or dispatch is NOT a source edit, claimed repair, PR, merge or LIVE.",
    "- Source agent: find existing open PR first and respect active owner lease; fix in existing module, or create ONE scoped PR.",
    "- Record actual SOURCE_COMMIT, PR, CI result, MERGE_SHA, VERCEL_READY_SHA and LIVE behavior with links.",
    "- If blocked, write exact blocker and owner-only action; do not mark done.",
    "- Public guest audit only; no private client data or fabricated video/medical outcome.",
    "",
    "One canonical issue is updated daily; repeated findings must not create duplicates."
  );
  return lines.join("\n");
}
export async function publishActionIssue({github,owner,repo,summary,runUrl,sourceHead}) {
  if(owner!=="andylitvinov-design"||repo!=="books")
    throw Error("Repository safety mismatch");
  const plan=makeActionPlan(summary);
  const body=issueBody(plan,{runUrl,sourceHead});
  try {
    await github.rest.issues.getLabel({owner,repo,name:ISSUE_LABEL});
  } catch(error) {
    if(error?.status!==404)throw error;
    await github.rest.issues.createLabel({owner,repo,name:ISSUE_LABEL,
      color:"137F70",description:"Holistic Light daily design audit action queue"});
  }
  const list=await github.rest.issues.listForRepo({
    owner,repo,state:"all",per_page:100,labels:ISSUE_LABEL,sort:"updated",direction:"desc"
  });
  const old=(list.data||[]).find(x=>!x.pull_request&&x.title===ISSUE_TITLE);
  let issue;
  if(old) {
    issue=(await github.rest.issues.update({owner,repo,issue_number:old.number,body,
      state:plan.findings.length?"open":"closed"})).data;
  } else if(plan.findings.length) {
    issue=(await github.rest.issues.create({owner,repo,title:ISSUE_TITLE,body,
      labels:[ISSUE_LABEL]})).data;
  }
  return {status:issue?(old?"ISSUE_UPDATED":"ISSUE_CREATED"):"REVIEW_RECOMMENDATION_ONLY",
    issueNumber:issue?.number||null,url:issue?.html_url||null,
    topCode:plan.highest?.code||null,action:plan.nextAction,
    findings:plan.findings.length,criticalCases:plan.criticalCases,
    proof:"Issue update is a handoff, NOT a code commit, PR or resolved bug"};
}
