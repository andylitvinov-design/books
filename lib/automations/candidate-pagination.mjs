/** Owner-only research listing, fixed 40-row pages. No dynamic user SQL. */
export const CANDIDATE_PAGE_SIZE=40;
export const CANDIDATE_MAX_PAGE=100;
export function parseCandidatePage(raw){
  if(raw===undefined||raw===null)return 1;
  if(typeof raw!=='string'||!/^[1-9][0-9]{0,2}$/.test(raw))return null;
  const n=Number(raw);
  return Number.isSafeInteger(n)&&n<=CANDIDATE_MAX_PAGE?n:null;
}
export function candidatePageInfo(page,total){
  if(!Number.isSafeInteger(page)||page<1||page>CANDIDATE_MAX_PAGE||
    !Number.isSafeInteger(total)||total<0)throw Error('CANDIDATE_PAGE_INVALID');
  return Object.freeze({page,pageSize:CANDIDATE_PAGE_SIZE,
    pages:Math.max(1,Math.ceil(total/CANDIDATE_PAGE_SIZE)),
    offset:(page-1)*CANDIDATE_PAGE_SIZE,
    hasPrevious:page>1,hasNext:page*CANDIDATE_PAGE_SIZE<total});
}
