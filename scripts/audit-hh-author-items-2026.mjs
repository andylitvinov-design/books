// Author-owned definitions only. Never connects to the client DB or reads
// Client Cabinet answers; automated flags are hypotheses for qualified review.
import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { auditAuthorItemContent,authorItemContentCsv } from '../lib/assessments/author-item-content-audit.js'

const audit=auditAuthorItemContent(ASSESSMENT_DEFINITIONS,MONITORING_CATALOG)
if(audit.missingVersions.length){
  process.stderr.write('Missing EN/RU review sources: '+audit.missingVersions.join(', ')+'\n')
  process.exitCode=1
}
if(process.argv.includes('--csv'))process.stdout.write(authorItemContentCsv(audit))
else if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(audit,null,2)+'\n')
else {
  const flags=Object.fromEntries([...new Set(audit.rows.flatMap(row=>row.flags))]
    .sort().map(flag=>[flag,audit.rows.filter(row=>row.flags.includes(flag)).length]))
  process.stdout.write(JSON.stringify({
    purpose:audit.purpose,families:audit.families,
    languageVersions:audit.languageVersions,expectedLanguageVersions:audit.expectedLanguageVersions,
    sourceQuestions:audit.itemCount,itemsWithHeuristicFlags:audit.candidatesForReview,
    warningTypes:flags,missingVersions:audit.missingVersions,
    note:audit.disclaimer,
  },null,2)+'\n')
}
