import { deepFreeze } from '../../lib/assessments/contracts.js'

// Complete public-domain author form; do not alter this immutable version.
export const BFAS_100_DEFINITIONS = deepFreeze([
  {
    "id": "1412085c-c923-55bb-946f-c611554bcd6d",
    "key": "bfas-100",
    "version": "v1",
    "instrumentLocale": "en",
    "translationVersion": "original-en-author-form-v1",
    "timeframe": "general-self-description",
    "scoringKey": "configured",
    "scoringVersion": "v1",
    "resultVersion": "v1",
    "title": "Big Five Aspect Scales (BFAS) — 100",
    "source": {
      "title": "Big Five Aspect Scales — author self-rating form",
      "url": "https://docs.google.com/document/d/0B-XDPUhSKUmOUXdEU3ZnbnNvaUk/edit?resourcekey=0-kbXmTs_iSctSAlyyWmjR-A",
      "scoringUrl": "https://docs.google.com/document/d/0B-XDPUhSKUmOUXdEU3ZnbnNvaUk/edit?resourcekey=0-kbXmTs_iSctSAlyyWmjR-A",
      "permissionUrl": "https://deyoung.psych.umn.edu/research",
      "permission": "The author identifies the complete 100-item BFAS as public domain and invites its use.",
      "citation": "DeYoung, C. G., Quilty, L. C., & Peterson, J. B. (2007). Between facets and domains: 10 aspects of the Big Five. Journal of Personality and Social Psychology, 93(5), 880–896. https://doi.org/10.1037/0022-3514.93.5.880",
      "supplementaryKeyUrl": "https://ipip.ori.org/BFASKeys.htm",
      "reviewedAt": "2026-10-12",
      "authorFormSha256": "a9ee90dca1c8f31ac2a9f0fcaa1b8058cc12c4f27b2c98bd29c6fe0930ccfdb9",
      "authorFormBytes": 13398,
      "authorFormAccess": "Complete text supplied by the source auditor; the coding executor did not download the binary DOCX. Layout spacing only was collapsed in items 60 and 100.",
      "sourceAuditUrl": "https://github.com/andylitvinov-design/books/issues/342#issuecomment-6117973176",
      "nonDiagnostic": true,
      "notes": "Complete author self-rating form in its original interleaved order. Items 1, 60, 80 and 90 use Rarely as in the author form, not Seldom from the IPIP key. Reverse keyed responses are 6 minus the response. Each aspect is a 10-item mean; each domain is the mean of its two aspects, equivalently the mean of its 20 keyed responses. No overall personality score, norms, percentile ranks or clinical cutoffs.",
      "missingResponsePolicy": "The author form permits the mean of nonmissing items but specifies no minimum completion count. This interface requires all 100 responses and does not score incomplete forms or impute answers; this is a product rule, not an author requirement.",
      "languageNote": "Original English questionnaire only. Russian interface and report explanations are not a validated Russian questionnaire adaptation."
    },
    "instructions": "Here are a number of characteristics that may or may not describe you.  For example, do you agree that you rarely feel blue, compared to most other people?  Please fill in the number that best indicates the extent to which you agree or disagree with each statement listed below.  Be as honest as possible, but rely on your initial feeling and do not think too much about each item.\n\nUse the following scale:",
    "answerScale": {
      "min": 1,
      "max": 5
    },
    "responseAnchors": [
      "Strongly Disagree",
      "2",
      "Neither Agree Nor Disagree",
      "4",
      "Strongly Agree"
    ],
    "scoring": {
      "dimensions": [
        {
          "key": "trait.bfas100.domain.neuroticism",
          "method": "mean",
          "items": [
            "bfas100.001",
            "bfas100.011",
            "bfas100.021",
            "bfas100.031",
            "bfas100.041",
            "bfas100.051",
            "bfas100.061",
            "bfas100.071",
            "bfas100.081",
            "bfas100.091",
            "bfas100.006",
            "bfas100.016",
            "bfas100.026",
            "bfas100.036",
            "bfas100.046",
            "bfas100.056",
            "bfas100.066",
            "bfas100.076",
            "bfas100.086",
            "bfas100.096"
          ],
          "reverseItems": [
            "bfas100.001",
            "bfas100.021",
            "bfas100.041",
            "bfas100.071",
            "bfas100.016",
            "bfas100.036",
            "bfas100.056",
            "bfas100.076"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Neuroticism",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.domain.agreeableness",
          "method": "mean",
          "items": [
            "bfas100.002",
            "bfas100.012",
            "bfas100.022",
            "bfas100.032",
            "bfas100.042",
            "bfas100.052",
            "bfas100.062",
            "bfas100.072",
            "bfas100.082",
            "bfas100.092",
            "bfas100.007",
            "bfas100.017",
            "bfas100.027",
            "bfas100.037",
            "bfas100.047",
            "bfas100.057",
            "bfas100.067",
            "bfas100.077",
            "bfas100.087",
            "bfas100.097"
          ],
          "reverseItems": [
            "bfas100.002",
            "bfas100.032",
            "bfas100.052",
            "bfas100.062",
            "bfas100.082",
            "bfas100.017",
            "bfas100.037",
            "bfas100.067",
            "bfas100.077",
            "bfas100.087",
            "bfas100.097"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Agreeableness",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.domain.conscientiousness",
          "method": "mean",
          "items": [
            "bfas100.003",
            "bfas100.013",
            "bfas100.023",
            "bfas100.033",
            "bfas100.043",
            "bfas100.053",
            "bfas100.063",
            "bfas100.073",
            "bfas100.083",
            "bfas100.093",
            "bfas100.008",
            "bfas100.018",
            "bfas100.028",
            "bfas100.038",
            "bfas100.048",
            "bfas100.058",
            "bfas100.068",
            "bfas100.078",
            "bfas100.088",
            "bfas100.098"
          ],
          "reverseItems": [
            "bfas100.013",
            "bfas100.023",
            "bfas100.033",
            "bfas100.053",
            "bfas100.083",
            "bfas100.093",
            "bfas100.008",
            "bfas100.048",
            "bfas100.068",
            "bfas100.078"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Conscientiousness",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.domain.extraversion",
          "method": "mean",
          "items": [
            "bfas100.004",
            "bfas100.014",
            "bfas100.024",
            "bfas100.034",
            "bfas100.044",
            "bfas100.054",
            "bfas100.064",
            "bfas100.074",
            "bfas100.084",
            "bfas100.094",
            "bfas100.009",
            "bfas100.019",
            "bfas100.029",
            "bfas100.039",
            "bfas100.049",
            "bfas100.059",
            "bfas100.069",
            "bfas100.079",
            "bfas100.089",
            "bfas100.099"
          ],
          "reverseItems": [
            "bfas100.014",
            "bfas100.024",
            "bfas100.034",
            "bfas100.054",
            "bfas100.064",
            "bfas100.029",
            "bfas100.049",
            "bfas100.079",
            "bfas100.099"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Extraversion",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.domain.openness_intellect",
          "method": "mean",
          "items": [
            "bfas100.005",
            "bfas100.015",
            "bfas100.025",
            "bfas100.035",
            "bfas100.045",
            "bfas100.055",
            "bfas100.065",
            "bfas100.075",
            "bfas100.085",
            "bfas100.095",
            "bfas100.010",
            "bfas100.020",
            "bfas100.030",
            "bfas100.040",
            "bfas100.050",
            "bfas100.060",
            "bfas100.070",
            "bfas100.080",
            "bfas100.090",
            "bfas100.100"
          ],
          "reverseItems": [
            "bfas100.015",
            "bfas100.045",
            "bfas100.055",
            "bfas100.085",
            "bfas100.050",
            "bfas100.060",
            "bfas100.080",
            "bfas100.090"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Openness/Intellect",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.aspect.withdrawal",
          "method": "mean",
          "items": [
            "bfas100.001",
            "bfas100.011",
            "bfas100.021",
            "bfas100.031",
            "bfas100.041",
            "bfas100.051",
            "bfas100.061",
            "bfas100.071",
            "bfas100.081",
            "bfas100.091"
          ],
          "reverseItems": [
            "bfas100.001",
            "bfas100.021",
            "bfas100.041",
            "bfas100.071"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Withdrawal",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.aspect.volatility",
          "method": "mean",
          "items": [
            "bfas100.006",
            "bfas100.016",
            "bfas100.026",
            "bfas100.036",
            "bfas100.046",
            "bfas100.056",
            "bfas100.066",
            "bfas100.076",
            "bfas100.086",
            "bfas100.096"
          ],
          "reverseItems": [
            "bfas100.016",
            "bfas100.036",
            "bfas100.056",
            "bfas100.076"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Volatility",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.aspect.compassion",
          "method": "mean",
          "items": [
            "bfas100.002",
            "bfas100.012",
            "bfas100.022",
            "bfas100.032",
            "bfas100.042",
            "bfas100.052",
            "bfas100.062",
            "bfas100.072",
            "bfas100.082",
            "bfas100.092"
          ],
          "reverseItems": [
            "bfas100.002",
            "bfas100.032",
            "bfas100.052",
            "bfas100.062",
            "bfas100.082"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Compassion",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.aspect.politeness",
          "method": "mean",
          "items": [
            "bfas100.007",
            "bfas100.017",
            "bfas100.027",
            "bfas100.037",
            "bfas100.047",
            "bfas100.057",
            "bfas100.067",
            "bfas100.077",
            "bfas100.087",
            "bfas100.097"
          ],
          "reverseItems": [
            "bfas100.017",
            "bfas100.037",
            "bfas100.067",
            "bfas100.077",
            "bfas100.087",
            "bfas100.097"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Politeness",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.aspect.industriousness",
          "method": "mean",
          "items": [
            "bfas100.003",
            "bfas100.013",
            "bfas100.023",
            "bfas100.033",
            "bfas100.043",
            "bfas100.053",
            "bfas100.063",
            "bfas100.073",
            "bfas100.083",
            "bfas100.093"
          ],
          "reverseItems": [
            "bfas100.013",
            "bfas100.023",
            "bfas100.033",
            "bfas100.053",
            "bfas100.083",
            "bfas100.093"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Industriousness",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.aspect.orderliness",
          "method": "mean",
          "items": [
            "bfas100.008",
            "bfas100.018",
            "bfas100.028",
            "bfas100.038",
            "bfas100.048",
            "bfas100.058",
            "bfas100.068",
            "bfas100.078",
            "bfas100.088",
            "bfas100.098"
          ],
          "reverseItems": [
            "bfas100.008",
            "bfas100.048",
            "bfas100.068",
            "bfas100.078"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Orderliness",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.aspect.enthusiasm",
          "method": "mean",
          "items": [
            "bfas100.004",
            "bfas100.014",
            "bfas100.024",
            "bfas100.034",
            "bfas100.044",
            "bfas100.054",
            "bfas100.064",
            "bfas100.074",
            "bfas100.084",
            "bfas100.094"
          ],
          "reverseItems": [
            "bfas100.014",
            "bfas100.024",
            "bfas100.034",
            "bfas100.054",
            "bfas100.064"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Enthusiasm",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.aspect.assertiveness",
          "method": "mean",
          "items": [
            "bfas100.009",
            "bfas100.019",
            "bfas100.029",
            "bfas100.039",
            "bfas100.049",
            "bfas100.059",
            "bfas100.069",
            "bfas100.079",
            "bfas100.089",
            "bfas100.099"
          ],
          "reverseItems": [
            "bfas100.029",
            "bfas100.049",
            "bfas100.079",
            "bfas100.099"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Assertiveness",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.aspect.intellect",
          "method": "mean",
          "items": [
            "bfas100.005",
            "bfas100.015",
            "bfas100.025",
            "bfas100.035",
            "bfas100.045",
            "bfas100.055",
            "bfas100.065",
            "bfas100.075",
            "bfas100.085",
            "bfas100.095"
          ],
          "reverseItems": [
            "bfas100.015",
            "bfas100.045",
            "bfas100.055",
            "bfas100.085"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Intellect",
          "direction": "non-normative"
        },
        {
          "key": "trait.bfas100.aspect.openness",
          "method": "mean",
          "items": [
            "bfas100.010",
            "bfas100.020",
            "bfas100.030",
            "bfas100.040",
            "bfas100.050",
            "bfas100.060",
            "bfas100.070",
            "bfas100.080",
            "bfas100.090",
            "bfas100.100"
          ],
          "reverseItems": [
            "bfas100.050",
            "bfas100.060",
            "bfas100.080",
            "bfas100.090"
          ],
          "min": 1,
          "max": 5,
          "dimensionClass": "trait",
          "sourceConstruct": "Openness",
          "direction": "non-normative"
        }
      ]
    },
    "questions": [
      {
        "id": "bfas100.001",
        "text": "Rarely feel blue.",
        "required": true
      },
      {
        "id": "bfas100.002",
        "text": "Am not interested in other people's problems.",
        "required": true
      },
      {
        "id": "bfas100.003",
        "text": "Carry out my plans.",
        "required": true
      },
      {
        "id": "bfas100.004",
        "text": "Make friends easily.",
        "required": true
      },
      {
        "id": "bfas100.005",
        "text": "Am quick to understand things.",
        "required": true
      },
      {
        "id": "bfas100.006",
        "text": "Get angry easily.",
        "required": true
      },
      {
        "id": "bfas100.007",
        "text": "Respect authority.",
        "required": true
      },
      {
        "id": "bfas100.008",
        "text": "Leave my belongings around.",
        "required": true
      },
      {
        "id": "bfas100.009",
        "text": "Take charge.",
        "required": true
      },
      {
        "id": "bfas100.010",
        "text": "Enjoy the beauty of nature.",
        "required": true
      },
      {
        "id": "bfas100.011",
        "text": "Am filled with doubts about things.",
        "required": true
      },
      {
        "id": "bfas100.012",
        "text": "Feel others' emotions.",
        "required": true
      },
      {
        "id": "bfas100.013",
        "text": "Waste my time.",
        "required": true
      },
      {
        "id": "bfas100.014",
        "text": "Am hard to get to know.",
        "required": true
      },
      {
        "id": "bfas100.015",
        "text": "Have difficulty understanding abstract ideas.",
        "required": true
      },
      {
        "id": "bfas100.016",
        "text": "Rarely get irritated.",
        "required": true
      },
      {
        "id": "bfas100.017",
        "text": "Believe that I am better than others.",
        "required": true
      },
      {
        "id": "bfas100.018",
        "text": "Like order.",
        "required": true
      },
      {
        "id": "bfas100.019",
        "text": "Have a strong personality.",
        "required": true
      },
      {
        "id": "bfas100.020",
        "text": "Believe in the importance of art.",
        "required": true
      },
      {
        "id": "bfas100.021",
        "text": "Feel comfortable with myself.",
        "required": true
      },
      {
        "id": "bfas100.022",
        "text": "Inquire about others' well-being.",
        "required": true
      },
      {
        "id": "bfas100.023",
        "text": "Find it difficult to get down to work.",
        "required": true
      },
      {
        "id": "bfas100.024",
        "text": "Keep others at a distance.",
        "required": true
      },
      {
        "id": "bfas100.025",
        "text": "Can handle a lot of information.",
        "required": true
      },
      {
        "id": "bfas100.026",
        "text": "Get upset easily.",
        "required": true
      },
      {
        "id": "bfas100.027",
        "text": "Hate to seem pushy.",
        "required": true
      },
      {
        "id": "bfas100.028",
        "text": "Keep things tidy.",
        "required": true
      },
      {
        "id": "bfas100.029",
        "text": "Lack the talent for influencing people.",
        "required": true
      },
      {
        "id": "bfas100.030",
        "text": "Love to reflect on things.",
        "required": true
      },
      {
        "id": "bfas100.031",
        "text": "Feel threatened easily.",
        "required": true
      },
      {
        "id": "bfas100.032",
        "text": "Can't be bothered with other's needs.",
        "required": true
      },
      {
        "id": "bfas100.033",
        "text": "Mess things up.",
        "required": true
      },
      {
        "id": "bfas100.034",
        "text": "Reveal little about myself.",
        "required": true
      },
      {
        "id": "bfas100.035",
        "text": "Like to solve complex problems.",
        "required": true
      },
      {
        "id": "bfas100.036",
        "text": "Keep my emotions under control.",
        "required": true
      },
      {
        "id": "bfas100.037",
        "text": "Take advantage of others.",
        "required": true
      },
      {
        "id": "bfas100.038",
        "text": "Follow a schedule.",
        "required": true
      },
      {
        "id": "bfas100.039",
        "text": "Know how to captivate people.",
        "required": true
      },
      {
        "id": "bfas100.040",
        "text": "Get deeply immersed in music.",
        "required": true
      },
      {
        "id": "bfas100.041",
        "text": "Rarely feel depressed.",
        "required": true
      },
      {
        "id": "bfas100.042",
        "text": "Sympathize with others' feelings.",
        "required": true
      },
      {
        "id": "bfas100.043",
        "text": "Finish what I start.",
        "required": true
      },
      {
        "id": "bfas100.044",
        "text": "Warm up quickly to others.",
        "required": true
      },
      {
        "id": "bfas100.045",
        "text": "Avoid philosophical discussions.",
        "required": true
      },
      {
        "id": "bfas100.046",
        "text": "Change my mood a lot.",
        "required": true
      },
      {
        "id": "bfas100.047",
        "text": "Avoid imposing my will on others.",
        "required": true
      },
      {
        "id": "bfas100.048",
        "text": "Am not bothered by messy people.",
        "required": true
      },
      {
        "id": "bfas100.049",
        "text": "Wait for others to lead the way.",
        "required": true
      },
      {
        "id": "bfas100.050",
        "text": "Do not like poetry.",
        "required": true
      },
      {
        "id": "bfas100.051",
        "text": "Worry about things.",
        "required": true
      },
      {
        "id": "bfas100.052",
        "text": "Am indifferent to the feelings of others.",
        "required": true
      },
      {
        "id": "bfas100.053",
        "text": "Don't put my mind on the task at hand.",
        "required": true
      },
      {
        "id": "bfas100.054",
        "text": "Rarely get caught up in the excitement.",
        "required": true
      },
      {
        "id": "bfas100.055",
        "text": "Avoid difficult reading material.",
        "required": true
      },
      {
        "id": "bfas100.056",
        "text": "Rarely lose my composure.",
        "required": true
      },
      {
        "id": "bfas100.057",
        "text": "Rarely put people under pressure.",
        "required": true
      },
      {
        "id": "bfas100.058",
        "text": "Want everything to be “just right.”",
        "required": true
      },
      {
        "id": "bfas100.059",
        "text": "See myself as a good leader.",
        "required": true
      },
      {
        "id": "bfas100.060",
        "text": "Rarely notice the emotional aspects of paintings and pictures.",
        "required": true
      },
      {
        "id": "bfas100.061",
        "text": "Am easily discouraged.",
        "required": true
      },
      {
        "id": "bfas100.062",
        "text": "Take no time for others.",
        "required": true
      },
      {
        "id": "bfas100.063",
        "text": "Get things done quickly.",
        "required": true
      },
      {
        "id": "bfas100.064",
        "text": "Am not a very enthusiastic person.",
        "required": true
      },
      {
        "id": "bfas100.065",
        "text": "Have a rich vocabulary.",
        "required": true
      },
      {
        "id": "bfas100.066",
        "text": "Am a person whose moods go up and down easily.",
        "required": true
      },
      {
        "id": "bfas100.067",
        "text": "Insult people.",
        "required": true
      },
      {
        "id": "bfas100.068",
        "text": "Am not bothered by disorder.",
        "required": true
      },
      {
        "id": "bfas100.069",
        "text": "Can talk others into doing things.",
        "required": true
      },
      {
        "id": "bfas100.070",
        "text": "Need a creative outlet.",
        "required": true
      },
      {
        "id": "bfas100.071",
        "text": "Am not embarrassed easily.",
        "required": true
      },
      {
        "id": "bfas100.072",
        "text": "Take an interest in other people's lives.",
        "required": true
      },
      {
        "id": "bfas100.073",
        "text": "Always know what I am doing.",
        "required": true
      },
      {
        "id": "bfas100.074",
        "text": "Show my feelings when I'm happy.",
        "required": true
      },
      {
        "id": "bfas100.075",
        "text": "Think quickly.",
        "required": true
      },
      {
        "id": "bfas100.076",
        "text": "Am not easily annoyed.",
        "required": true
      },
      {
        "id": "bfas100.077",
        "text": "Seek conflict.",
        "required": true
      },
      {
        "id": "bfas100.078",
        "text": "Dislike routine.",
        "required": true
      },
      {
        "id": "bfas100.079",
        "text": "Hold back my opinions.",
        "required": true
      },
      {
        "id": "bfas100.080",
        "text": "Rarely get lost in thought.",
        "required": true
      },
      {
        "id": "bfas100.081",
        "text": "Become overwhelmed by events.",
        "required": true
      },
      {
        "id": "bfas100.082",
        "text": "Don't have a soft side.",
        "required": true
      },
      {
        "id": "bfas100.083",
        "text": "Postpone decisions.",
        "required": true
      },
      {
        "id": "bfas100.084",
        "text": "Have a lot of fun.",
        "required": true
      },
      {
        "id": "bfas100.085",
        "text": "Learn things slowly.",
        "required": true
      },
      {
        "id": "bfas100.086",
        "text": "Get easily agitated.",
        "required": true
      },
      {
        "id": "bfas100.087",
        "text": "Love a good fight.",
        "required": true
      },
      {
        "id": "bfas100.088",
        "text": "See that rules are observed.",
        "required": true
      },
      {
        "id": "bfas100.089",
        "text": "Am the first to act.",
        "required": true
      },
      {
        "id": "bfas100.090",
        "text": "Rarely daydream.",
        "required": true
      },
      {
        "id": "bfas100.091",
        "text": "Am afraid of many things.",
        "required": true
      },
      {
        "id": "bfas100.092",
        "text": "Like to do things for others.",
        "required": true
      },
      {
        "id": "bfas100.093",
        "text": "Am easily distracted.",
        "required": true
      },
      {
        "id": "bfas100.094",
        "text": "Laugh a lot.",
        "required": true
      },
      {
        "id": "bfas100.095",
        "text": "Formulate ideas clearly.",
        "required": true
      },
      {
        "id": "bfas100.096",
        "text": "Can be stirred up easily.",
        "required": true
      },
      {
        "id": "bfas100.097",
        "text": "Am out for my own personal gain.",
        "required": true
      },
      {
        "id": "bfas100.098",
        "text": "Want every detail taken care of.",
        "required": true
      },
      {
        "id": "bfas100.099",
        "text": "Do not have an assertive personality.",
        "required": true
      },
      {
        "id": "bfas100.100",
        "text": "See beauty in things that others might not notice.",
        "required": true
      }
    ],
    "optionalContext": [],
    "suggestedRepeatDays": null,
    "contentHash": "sha256:fc322ecc17c3f2f9e16578596a12ef7ded4a40a346fed665c3d96cde896dc021"
  }
])

export const BFAS_100_CATALOG = deepFreeze([
  {
    "key": "bfas-100",
    "version": "v1",
    "instrumentLocale": "en",
    "axis": "baseline",
    "resultAxes": [
      "baseline"
    ],
    "topics": [
      "personality"
    ],
    "moodAffinities": [],
    "categoryAffinities": [],
    "questionCount": 100,
    "durationMinutes": 15,
    "testStyle": "professional",
    "testLength": "comprehensive",
    "suggestedRepeatDays": null,
    "cooldownDays": null,
    "startable": true,
    "access": "account",
    "rightsStatus": "cleared",
    "guestEligible": true,
    "starterEligible": false,
    "free": true,
    "analysisAxes": [
      {
        "key": "personality",
        "weight": 1
      }
    ],
    "title": {
      "en": "Big Five Aspect Scales (BFAS) — 100",
      "ru": "Большая пятёрка: 10 аспектов (BFAS-100) · EN"
    },
    "description": {
      "en": "The complete original English 100-item personality measure: five domains and ten aspects. All 100 answers are required here. Continuous descriptive means; no diagnosis, norms or percentiles.",
      "ru": "Полная оригинальная английская методика: 100 пунктов, пять областей и десять аспектов личности. В этом интерфейсе обязательны все 100 ответов. Описательные средние без диагнозов, норм и процентилей."
    }
  }
])

export const BFAS_100_INTERPRETATION_ROWS = deepFreeze([
  [
    "bfas-100",
    "personality",
    "Compare the five domains and ten aspects in situations you know; no personality score is a goal to maximize.",
    "Сопоставьте пять областей и десять аспектов со знакомыми ситуациями; ни один личностный балл не требуется повышать."
  ]
])

export const BFAS_100_DIMENSION_ROWS = deepFreeze([
  [
    "bfas-100",
    "trait.bfas100.domain.neuroticism",
    "personality",
    "Neuroticism",
    "Нейротизм",
    "Compare worry and emotional reactivity in two settings, noting how rest and support affect each.",
    "Сопоставьте беспокойство и эмоциональную реактивность в двух ситуациях, отмечая влияние отдыха и поддержки."
  ],
  [
    "bfas-100",
    "trait.bfas100.domain.agreeableness",
    "personality",
    "Agreeableness",
    "Доброжелательность",
    "Consider how concern for another person and a clear personal boundary can coexist in one conversation.",
    "Подумайте, как в одном разговоре совместить внимание к другому человеку и ясную личную границу."
  ],
  [
    "bfas-100",
    "trait.bfas100.domain.conscientiousness",
    "personality",
    "Conscientiousness",
    "Добросовестность",
    "Choose a real task and notice whether a clear purpose, a schedule or flexibility helps you complete it.",
    "Выберите реальное дело и отметьте, что помогает его завершить: ясная цель, расписание или гибкость."
  ],
  [
    "bfas-100",
    "trait.bfas100.domain.extraversion",
    "personality",
    "Extraversion",
    "Экстраверсия",
    "Notice which kinds of contact feel rewarding and when you prefer to initiate, contribute or listen.",
    "Отметьте, какой контакт приносит удовольствие и когда хочется начинать разговор, участвовать или слушать."
  ],
  [
    "bfas-100",
    "trait.bfas100.domain.openness_intellect",
    "personality",
    "Openness/Intellect",
    "Открытость / интеллект",
    "Compare your interest in exploring an idea with your interest in an artistic or sensory experience.",
    "Сопоставьте интерес к исследованию идеи с интересом к художественному или чувственному опыту."
  ],
  [
    "bfas-100",
    "trait.bfas100.aspect.withdrawal",
    "personality",
    "Withdrawal",
    "Уязвимость к переживаниям",
    "Notice when anticipated difficulty affects a choice and compare that expectation with what actually happens.",
    "Заметьте, когда ожидание трудности влияет на выбор, и сопоставьте ожидание с тем, что действительно происходит."
  ],
  [
    "bfas-100",
    "trait.bfas100.aspect.volatility",
    "personality",
    "Volatility",
    "Эмоциональная изменчивость",
    "Recall a strong reaction and notice its trigger, duration and the circumstances in which it softened.",
    "Вспомните сильную реакцию и отметьте её повод, продолжительность и обстоятельства, в которых она ослабла."
  ],
  [
    "bfas-100",
    "trait.bfas100.aspect.compassion",
    "personality",
    "Compassion",
    "Сострадание",
    "Notice a situation where you care about another person and how you decide what support you can offer.",
    "Отметьте ситуацию заботы о другом и то, как вы решаете, какую поддержку можете предложить."
  ],
  [
    "bfas-100",
    "trait.bfas100.aspect.politeness",
    "personality",
    "Politeness",
    "Вежливость",
    "Consider a disagreement in which you can state your position clearly while allowing another person a choice.",
    "Рассмотрите разногласие, в котором можно ясно выразить свою позицию и оставить другому человеку выбор."
  ],
  [
    "bfas-100",
    "trait.bfas100.aspect.industriousness",
    "personality",
    "Industriousness",
    "Трудолюбие",
    "For one task, identify what makes starting and finishing easier without treating rest as a failure.",
    "Для одного дела определите, что облегчает начало и завершение, не считая отдых неудачей."
  ],
  [
    "bfas-100",
    "trait.bfas100.aspect.orderliness",
    "personality",
    "Orderliness",
    "Организованность",
    "Notice where structure helps you and where leaving room for adjustment would suit the situation.",
    "Отметьте, где структура помогает, а где обстоятельствам лучше соответствует возможность менять план."
  ],
  [
    "bfas-100",
    "trait.bfas100.aspect.enthusiasm",
    "personality",
    "Enthusiasm",
    "Энтузиазм",
    "Notice which people or activities invite enjoyment, and which amount of social contact suits your energy.",
    "Отметьте людей или занятия, с которыми появляется удовольствие, и подходящий вашим силам объём общения."
  ],
  [
    "bfas-100",
    "trait.bfas100.aspect.assertiveness",
    "personality",
    "Assertiveness",
    "Настойчивость в общении",
    "Compare a situation where you want to take the lead with one where listening or sharing leadership fits better.",
    "Сопоставьте ситуацию, где хочется взять инициативу, с той, где уместнее слушать или разделить лидерство."
  ],
  [
    "bfas-100",
    "trait.bfas100.aspect.intellect",
    "personality",
    "Intellect",
    "Интеллектуальная вовлечённость",
    "Explore a question that interests you at a comfortable level of complexity, without using the score to judge ability.",
    "Исследуйте интересующий вопрос на комфортном уровне сложности, не используя балл для оценки способностей."
  ],
  [
    "bfas-100",
    "trait.bfas100.aspect.openness",
    "personality",
    "Openness",
    "Открытость опыту",
    "Notice one detail in nature, music or an image and whether you want to spend more time with that experience.",
    "Заметьте одну деталь в природе, музыке или изображении и желание уделить этому опыту больше времени."
  ]
])

export const BFAS_100_MEANINGS = deepFreeze({
  "trait.bfas100.domain.neuroticism": {
    "en": "Average of Withdrawal and Volatility: reported susceptibility to negative emotions. This is a personality tendency, not evidence of an anxiety or depressive disorder.",
    "ru": "Среднее аспектов «Уязвимость к переживаниям» и «Эмоциональная изменчивость»: сообщаемая склонность к отрицательным эмоциям. Это личностная тенденция, а не свидетельство тревожного или депрессивного расстройства."
  },
  "trait.bfas100.domain.agreeableness": {
    "en": "Average of Compassion and Politeness: reported care for others and restraint in interpersonal conflict. It does not measure moral worth or require agreement with other people.",
    "ru": "Среднее аспектов «Сострадание» и «Вежливость»: сообщаемая забота о других и сдержанность в межличностном конфликте. Балл не измеряет нравственную ценность и не требует соглашаться с другими."
  },
  "trait.bfas100.domain.conscientiousness": {
    "en": "Average of Industriousness and Orderliness: reported task persistence and preference for structure. Situational demands and available energy matter when interpreting these tendencies.",
    "ru": "Среднее аспектов «Трудолюбие» и «Организованность»: сообщаемая настойчивость в делах и предпочтение структуры. Для понимания этих особенностей важны требования ситуации и доступные силы."
  },
  "trait.bfas100.domain.extraversion": {
    "en": "Average of Enthusiasm and Assertiveness: reported social enjoyment, positive engagement and social initiative. Reserved and outgoing styles can each fit different settings.",
    "ru": "Среднее аспектов «Энтузиазм» и «Настойчивость в общении»: сообщаемое удовольствие от общения, вовлечённость и социальная инициатива. Сдержанный и общительный стили могут подходить разным ситуациям."
  },
  "trait.bfas100.domain.openness_intellect": {
    "en": "Average of Intellect and Openness: reported engagement with ideas, imagination, art and sensory experience. This self-report is not an intelligence test or a measure of cultural sophistication.",
    "ru": "Среднее аспектов «Интеллектуальная вовлечённость» и «Открытость опыту»: сообщаемый интерес к идеям, воображению, искусству и чувственному опыту. Это самоотчёт, а не тест интеллекта или культурного уровня."
  },
  "trait.bfas100.aspect.withdrawal": {
    "en": "Reports anticipation of threat, worry and discouragement. Here Withdrawal is an aspect of Neuroticism, not simply a preference for solitude or a clinical symptom score.",
    "ru": "Описывает сообщаемое ожидание угрозы, беспокойство и склонность унывать. Здесь Withdrawal — аспект нейротизма, а не просто предпочтение одиночества или оценка клинических симптомов."
  },
  "trait.bfas100.aspect.volatility": {
    "en": "Reports irritability, changes in mood and emotional reactivity. A stronger reported tendency does not establish a disorder or explain the cause of a particular reaction.",
    "ru": "Описывает сообщаемую раздражительность, перемены настроения и эмоциональную реактивность. Более выраженная тенденция не устанавливает расстройство и не объясняет причину отдельной реакции."
  },
  "trait.bfas100.aspect.compassion": {
    "en": "Reports emotional concern for other people and interest in their well-being. This BFAS personality aspect is distinct from the Compassion Scale and from self-compassion measures.",
    "ru": "Описывает сообщаемое сочувствие другим и интерес к их благополучию. Этот личностный аспект BFAS отличается от Compassion Scale и методик самосострадания."
  },
  "trait.bfas100.aspect.politeness": {
    "en": "Reports restraint from exploitation, imposing on others and interpersonal aggression. It does not require compliance with authority or sacrificing personal boundaries.",
    "ru": "Описывает сообщаемую сдержанность в использовании других, навязывании своей воли и межличностной агрессии. Балл не требует подчиняться авторитету или отказываться от личных границ."
  },
  "trait.bfas100.aspect.industriousness": {
    "en": "Reports starting tasks, pursuing plans and completing work. It is a trait self-description, not a judgement of productivity, disability or the value of rest.",
    "ru": "Описывает сообщаемую готовность начинать дела, следовать планам и завершать работу. Это самоописание черты, а не оценка продуктивности, ограничений здоровья или ценности отдыха."
  },
  "trait.bfas100.aspect.orderliness": {
    "en": "Reports preference for order, detail, schedules and rules. Stronger or weaker preference can have different advantages depending on the setting; this is not a disorder assessment.",
    "ru": "Описывает сообщаемое предпочтение порядка, деталей, расписания и правил. Более или менее выраженное предпочтение может по-разному помогать в разных условиях; это не оценка расстройства."
  },
  "trait.bfas100.aspect.enthusiasm": {
    "en": "Reports social warmth, enjoyment and expression of positive emotion. It does not require constant happiness or indicate that quieter experiences are less valuable.",
    "ru": "Описывает сообщаемую теплоту в общении, удовольствие и выражение положительных эмоций. Балл не требует постоянного счастья и не делает спокойные переживания менее ценными."
  },
  "trait.bfas100.aspect.assertiveness": {
    "en": "Reports social initiative, leadership and willingness to influence others. Leading and following are context-dependent choices, not a universal hierarchy of better and worse personalities.",
    "ru": "Описывает сообщаемую социальную инициативу, лидерство и готовность влиять на других. Вести за собой или следовать — выборы по ситуации, а не универсальная иерархия лучших и худших личностей."
  },
  "trait.bfas100.aspect.intellect": {
    "en": "Reports engagement with abstract ideas, complex information and thinking. Intellect is the BFAS aspect name; this self-report does not measure IQ or establish actual cognitive ability.",
    "ru": "Описывает сообщаемую вовлечённость в абстрактные идеи, сложную информацию и размышления. Intellect — название аспекта BFAS; самоотчёт не измеряет IQ и не устанавливает реальные когнитивные способности."
  },
  "trait.bfas100.aspect.openness": {
    "en": "Reports imagination and engagement with art, beauty and perceptual experience. This aspect is separate from intellectual engagement and is not a ranking of creativity or taste.",
    "ru": "Описывает сообщаемое воображение и вовлечённость в искусство, красоту и чувственный опыт. Этот аспект отделён от интеллектуальной вовлечённости и не ранжирует творчество или вкус."
  }
})
