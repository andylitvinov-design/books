'use strict';

/**
 * HH Direction Watcher: zero-new-service classifier for ALL open production
 * PRs. Classifies by five strategic directions and ten operational ranks,
 * then reconciles the current queue stage. It NEVER changes PR code,
 * branch, reviewers, checks or actual merge status.
 */
const {POLICY,desiredLabels,priorityFor,rankedCandidates,MERGE_STAGES,SHA}=
  require('./ci-pr-priority.cjs');
const PROD='codex/public-book-library';
const DEFAULT='codex/bootstrap-books';
const TARGETS=new Set([PROD,DEFAULT]);
const MAX_REQUESTS=115;
const MIN_RATE_RESERVE=100;
const MAX_WRITES=18;
const MAX_PATH_READS=5;
// A single trusted bootstrap dispatch can drain the historical PR inventory
// even when GitHub's schedule event is temporarily unobserved. At most 12
// serial runs, 18 metadata-only updates each; never recursive from cron/push.
const MAX_BOOTSTRAP_BATCH=11;

const LABELS=[
  ...POLICY.directions.map(d=>({name:'hh:direction:'+d.id,color:'5319e7',
    description:'Auto-classified development direction: '+d.name})),
  ...POLICY.directions.map(d=>({name:'hh:direction-override:'+d.id,color:'d4c5f9',
    description:'Optional owner direction override (priority still inherited): '+d.name})),
  ...POLICY.levels.map(l=>({name:'hh:priority:'+l.id,
    color:['b60205','e99695','fbca04','0e8a16','c5def5'][l.id-1],
    description:'Inherited direction priority P'+l.id+' — '+l.name})),
  ...Array.from({length:10},(_,i)=>({
    name:'hh:merge-priority:'+String(i+1).padStart(2,'0'),
    color:['b60205','d93f0b','e99695','e99695','fbca04',
      'fbca04','0e8a16','0e8a16','c5def5','c5def5'][i],
    description:'Computed 10-level merge work rank R'+String(i+1).padStart(2,'0')+
      ' (importance, not merge approval)'
  })),
  ...MERGE_STAGES.map(stage=>({
    name:'hh:merge-stage:'+stage,color:'ededed',
    description:'Current queue stage: '+stage+' (informational only)'
  }))
];

async function readOpenPRs(github,owner,repo,limited){
  const all=[];
  for(let page=1;page<=30;page++){
    const response=await limited('open-pr-page',()=>github.rest.pulls.list({
      owner,repo,state:'open',per_page:100,page
    }));
    if(!Array.isArray(response.data))throw Error('HH_DIRECTION_INCOMPLETE_INVENTORY');
    all.push(...response.data);
    if(response.data.length<100)return all;
  }
  throw Error('HH_DIRECTION_TOO_MANY_PRS');
}
async function ensureKnownLabels(github,owner,repo,limited,dryRun,log){
  const known=new Set();
  for(let page=1;page<=5;page++){
    const response=await limited('read-labels',()=>github.rest.issues.listLabelsForRepo({
      owner,repo,per_page:100,page
    }));
    if(!Array.isArray(response.data))throw Error('HH_DIRECTION_LABEL_CATALOG_INCOMPLETE');
    for(const l of response.data)known.add(l.name);
    if(response.data.length<100)break;
    if(page===5)throw Error('HH_DIRECTION_TOO_MANY_LABELS');
  }
  let created=0;
  for(const label of LABELS){
    if(known.has(label.name))continue;
    if(!dryRun){
      try{
        await limited('create-label',()=>github.rest.issues.createLabel({owner,repo,...label}));
      }catch(error){
        if(error.status!==422)throw error; // another worker won the same label
      }
    }
    created++;
  }
  log((dryRun?'WOULD_CREATE':'CREATED')+' '+created+' direction/rank/stage labels');
  return created;
}
function selectReclassification(items,now=Date.now(),max=MAX_WRITES){
  // Give high-priority directions fast slots while guaranteeing P4/P5
  // eventually get labels. This is only a metadata queue, not a job lease.
  const ordered=rankedCandidates(items,now);
  if(ordered.length<=max)return ordered;
  const fast=Math.max(1,Math.floor(max*2/3));
  const first=ordered.slice(0,fast);
  const used=new Set(first.map(x=>x.number));
  const rest=ordered.filter(x=>!used.has(x.number)).sort((a,b)=>a.number-b.number);
  const count=max-first.length;
  const offset=(Math.floor(now/600000)*count)%rest.length;
  return [...first,...Array.from({length:count},(_,i)=>rest[(offset+i)%rest.length])];
}

async function run({github,core,context,now=Date.now(),dryRun=false,
  maxUpdates=MAX_WRITES}){
  const {owner,repo}=context.repo;
  const log=message=>core.info('HH_DIRECTION_WATCHER: '+message);
  const summary={checkedAt:new Date(now).toISOString(),dryRun,
    inventoried:0,production:0,defaultBranchPRs:0,inScope:0,synced:0,pending:0,updated:0,
    pathProbes:0,createdLabels:0,blockedOverrides:0,
    byLevel:{P1:0,P2:0,P3:0,P4:0,P5:0},
    byMergePriority:Object.fromEntries(Array.from({length:10},
      (_,i)=>['R'+String(i+1).padStart(2,'0'),0])),
    byStage:{},byDirection:{},
    selected:[],errors:0,apiRequests:0,apiRemaining:null,paused:false,
    nextBatch:null,reason:null};
  const finish=async()=>{
    log(JSON.stringify(summary));
    await core.summary.addHeading('HH PR Watcher — five directions / ten merge ranks')
      .addCodeBlock(JSON.stringify(summary,null,2)).write();
    return summary;
  };
  if(owner+'/'+repo!=='andylitvinov-design/books' ||
     context.ref && context.ref!=='refs/heads/codex/bootstrap-books'){
    summary.reason='NOT_TRUSTED_DEFAULT_BRANCH';return finish();
  }
  if(!Number.isInteger(maxUpdates)||maxUpdates<1||maxUpdates>MAX_WRITES){
    summary.reason='INVALID_WRITE_BUDGET';return finish();
  }
  let remaining=null,requests=0;
  const limited=async(name,fn)=>{
    if(requests>=MAX_REQUESTS ||
       (remaining!==null&&remaining<MIN_RATE_RESERVE)){
      summary.paused=true;summary.reason='API_BUDGET_PAUSE';
      throw Error('HH_DIRECTION_API_BUDGET_PAUSE '+name);
    }
    requests++;
    try{
      const result=await fn();
      const rate=result?.headers?.['x-ratelimit-remaining'];
      if(rate!==undefined&&rate!==null&&Number.isFinite(Number(rate)))
        remaining=Number(rate);
      summary.apiRequests=requests;
      summary.apiRemaining=remaining;
      return result;
    }catch(error){
      if([403,429].includes(error.status) &&
         /rate.limit|rate limit|abuse|secondary/i.test(error.message||'')){
        summary.paused=true;summary.reason='GITHUB_RATE_LIMIT';
      }
      throw error;
    }
  };
  let all;
  try{
    all=await readOpenPRs(github,owner,repo,limited);
  }catch(error){
    summary.reason||='INVENTORY_UNAVAILABLE';
    log(summary.reason+': '+error.message);
    return finish();
  }
  summary.inventoried=all.length;
  const inScope=all.filter(pr=>TARGETS.has(pr.base?.ref) &&
    pr.head?.repo?.full_name===owner+'/'+repo &&
    Number.isSafeInteger(pr.number)&&SHA.test(pr.head?.sha||''));
  summary.inScope=inScope.length;
  summary.production=inScope.filter(pr=>pr.base?.ref===PROD).length;
  summary.defaultBranchPRs=inScope.filter(pr=>pr.base?.ref===DEFAULT).length;
  const missing=[];
  for(const pr of inScope){
    const result=desiredLabels(pr);
    if(result.conflicted){summary.blockedOverrides++;continue;}
    summary.byLevel['P'+result.level]++;
    summary.byMergePriority['R'+String(result.rank).padStart(2,'0')]++;
    summary.byStage[result.stage]=(summary.byStage[result.stage]||0)+1;
    summary.byDirection[result.id]=(summary.byDirection[result.id]||0)+1;
    if(result.needsSync)missing.push(pr);
    else summary.synced++;
  }
  summary.pending=missing.length;
  if(!missing.length)return finish();
  try{
    summary.createdLabels=await ensureKnownLabels(
      github,owner,repo,limited,dryRun,log);
  }catch(error){
    summary.reason||='LABEL_CATALOG_UNAVAILABLE';
    log(summary.reason+': '+error.message);
    return finish();
  }
  const chosen=selectReclassification(missing,now,maxUpdates);
  for(const initial of chosen){
    if(summary.paused)break;
    try{
      const response=await limited('fresh-pr',()=>github.rest.pulls.get({
        owner,repo,pull_number:initial.number
      }));
      const live=response.data;
      if(live?.number!==initial.number||live.state!=='open'||
         !TARGETS.has(live.base?.ref)||live.base?.ref!==initial.base.ref||
         live.head?.repo?.full_name!==owner+'/'+repo||
         live.head?.sha!==initial.head.sha)continue;

      let classification=desiredLabels(live);
      // A vague or generic PR title is insufficient to identify a direction.
      // Probe a small bounded number of changed-path lists; never inspect
      // patch content, PR scripts or private user data.
      if(classification.id==='other'&&summary.pathProbes<MAX_PATH_READS){
        const paths=await limited('changed-paths',()=>github.rest.pulls.listFiles({
          owner,repo,pull_number:live.number,per_page:100,page:1
        }));
        summary.pathProbes++;
        if(Array.isArray(paths.data)&&paths.data.length<100){
          classification=desiredLabels(live,paths.data.map(f=>f.filename));
        }
      }
      if(classification.conflicted){summary.blockedOverrides++;continue;}
      if(!classification.needsSync)continue;

      summary.selected.push({
        number:live.number,direction:classification.id,level:classification.level,
        rank:classification.rank,stage:classification.stage,
        source:classification.source
      });
      if(dryRun)continue;
      const present=new Set((live.labels||[]).map(l=>l.name));
      const additions=classification.desired.filter(name=>!present.has(name));
      if(additions.length){
        await limited('add-direction',()=>github.rest.issues.addLabels({
          owner,repo,issue_number:live.number,labels:additions
        }));
      }
      // Never replace the PR's entire label set: Repair/CI ownership labels
      // might be created at the same time by another trusted workflow.
      for(const old of classification.obsolete){
        try{
          await limited('remove-obsolete-direction',()=>github.rest.issues.removeLabel({
            owner,repo,issue_number:live.number,name:old
          }));
        }catch(error){if(error.status!==404)throw error;}
      }
      summary.updated++;
      log('#'+live.number+' -> '+classification.id+' P'+classification.level+
        ' R'+String(classification.rank).padStart(2,'0')+
        ' stage='+classification.stage);
    }catch(error){
      if(summary.paused||error.message?.startsWith('HH_DIRECTION_API_BUDGET_PAUSE')){
        summary.paused=true;break;
      }
      summary.errors++;
      log('#'+initial.number+' classification failed: '+error.message);
    }
  }
  summary.pending=Math.max(0,summary.pending-summary.updated);
  // Initial rollout must not depend on a cron registration which GitHub
  // sometimes silently omits. A GITHUB_TOKEN workflow_dispatch is exempt
  // from normal GitHub Actions recursion suppression. Concurrency serializes
  // the handoff; a hard batch limit, progress check, API reserve and no-op
  // on scheduled/push runs prevent an unbounded Actions event storm.
  if(context.eventName==='workflow_dispatch' && !dryRun &&
     summary.pending>0 && summary.updated>0 &&
     summary.errors===0 && !summary.paused){
    const raw=String(context.payload?.inputs?.batch ?? '0');
    const batch=/^(?:0|[1-9][0-9]?)$/.test(raw)?Number(raw):NaN;
    if(!Number.isSafeInteger(batch)||batch>=MAX_BOOTSTRAP_BATCH){
      summary.reason||='BOOTSTRAP_BATCH_LIMIT';
    } else {
      try{
        await limited('continue-bootstrap',()=>github.rest.actions.createWorkflowDispatch({
          owner,repo,workflow_id:'hh-pr-direction-watcher.yml',
          ref:'codex/bootstrap-books',
          inputs:{dry_run:'false',batch:String(batch+1)}
        }));
        summary.nextBatch=batch+1;
        log('BOOTSTRAP_CONTINUATION_DISPATCHED nextBatch='+summary.nextBatch+
          ' remaining='+summary.pending);
      }catch(error){
        summary.errors++;
        summary.reason||='BOOTSTRAP_CONTINUATION_FAILED';
        log('Bootstrap continuation unavailable: '+error.message);
      }
    }
  }
  return finish();
}
module.exports={run,readOpenPRs,ensureKnownLabels,selectReclassification,LABELS,PROD,DEFAULT,TARGETS};
