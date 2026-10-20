// Metadata-only audit. Safe to run: no client results, identity or database reads.
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { RESEARCH_CATALOGUE_TOTAL, RESEARCH_DISCOVERY_TOTAL } from '../lib/assessments/research-directory-2026.js'
import { auditAssessmentCatalog, VALIDATION_IMPROVEMENT_PROTOCOL } from '../lib/assessments/psychometric-validity-2026.js'

const audits=Object.fromEntries(['en','ru'].map(locale=>[locale,auditAssessmentCatalog(MONITORING_CATALOG,{locale})]))
const report={
  generatedAt:new Date().toISOString(),
  publicCatalogueKeys:MONITORING_CATALOG.length,
  researchEditionReferences:RESEARCH_CATALOGUE_TOTAL,
  nonOverlappingResearchReferences:RESEARCH_DISCOVERY_TOTAL,
  note:'Not a clinical accreditation; no question content, scoring keys or legal approvals imported.',
  locales:Object.fromEntries(Object.entries(audits).map(([locale,audit])=>[
    locale,{
      total:audit.total,
      independentlyGraded:audit.graded,
      pendingExactVersionReview:audit.reviewPending,
      originalDevelopment:audit.development,
      toValidate:audit.rows.filter(row=>row.level==='development').map(row=>({
        key:row.key,version:row.version,respondentLocale:row.respondentLocale,gaps:row.gaps,
      })),
    }
  ])),
  validationStages:VALIDATION_IMPROVEMENT_PROTOCOL,
}
process.stdout.write(JSON.stringify(report,null,2)+'\n')
