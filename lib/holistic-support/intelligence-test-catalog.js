import 'server-only'
import { buildExplorerEntries } from '../assessments/test-explorer.js'
import { rankAssessmentDefinitions } from '../assessments/test-recommendations.js'
import { buildSupportGuideTestShortlists, SUPPORT_GUIDE_TEST_FOCUS } from '../assessments/support-guide-tests.js'

// Server-side projection only: never expose complete test definitions or
// unapproved/private candidates to the client. ES transparently uses EN forms.
export function buildIntelligenceTestCatalog(locale = 'en') {
  const language = locale === 'ru' ? 'ru' : 'en'
  const entries = buildExplorerEntries({ locale:language, audience:'guest' })
  const shortlists = buildSupportGuideTestShortlists({locale:language,entries})
  return Object.fromEntries(['energy','money','meaning'].map(goal => {
    const shortlist = shortlists[goal] || []
    const keys = new Set(shortlist.map(item=>item.key))
    const definitions = entries.filter(item=>keys.has(item.key)).map(item=>item.definition)
    const ranked = rankAssessmentDefinitions(definitions,{focus:SUPPORT_GUIDE_TEST_FOCUS[goal],depth:'quick'})
    const projected = new Map(shortlist.map(item=>[item.key,item]))
    return [goal,ranked.map(row=>projected.get(row.definition.key)).filter(Boolean)]
  }))
}
