-- One complete public-domain BFAS-100 English author form; continuous neutral traits.
-- Append-only technical registration. Do not apply to production without separate authorization.
-- Existing definitions, results, auth and RLS remain unchanged.
begin;
do $$
declare d jsonb;
begin
  for d in select value from jsonb_array_elements($bfas100$
[
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
]
$bfas100$::jsonb)
  loop
    if exists (select 1 from app.assessment_versions where id=(d->>'id')::uuid and (content_hash is distinct from d->>'contentHash' or definition is distinct from d)) then
      raise exception 'Conflicting professional assessment ID %',d->>'id';
    end if;
    if exists (select 1 from app.assessment_versions where definition_key=d->>'key' and definition_version=d->>'version' and instrument_locale=d->>'instrumentLocale' and (id is distinct from (d->>'id')::uuid or content_hash is distinct from d->>'contentHash' or definition is distinct from d)) then
      raise exception 'Different content already published for %',d->>'key';
    end if;
    insert into app.assessment_versions (
      id,definition_key,definition_version,instrument_locale,translation_version,
      definition,questions,answer_schema,scoring_key,scoring_version,result_schema,
      timeframe,source_metadata,content_hash
    ) values (
      (d->>'id')::uuid,d->>'key',d->>'version',d->>'instrumentLocale',d->>'translationVersion',
      d,d->'questions',jsonb_build_object('type','integer','minimum',(d->'answerScale'->>'min')::int,'maximum',(d->'answerScale'->>'max')::int),
      d->>'scoringKey',d->>'scoringVersion',jsonb_build_object('version',d->>'resultVersion'),
      d->>'timeframe',d->'source',d->>'contentHash'
    ) on conflict (id) do nothing;
  end loop;
end $$;
commit;
