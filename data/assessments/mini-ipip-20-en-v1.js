const responseAnchors = Object.freeze(['Very Inaccurate', 'Moderately Inaccurate', 'Neither Inaccurate nor Accurate', 'Moderately Accurate', 'Very Accurate'])

export const MINI_IPIP_20_EN_V1 = Object.freeze({
  key: 'mini-ipip-20',
  version: 'v1',
  instrumentLocale: 'en',
  translationVersion: 'original-en-v1',
  timeframe: 'general-self-description',
  source: Object.freeze({
    title: 'Mini-IPIP Scoring Key',
    url: 'https://www.ipip.ori.org/MiniIPIPKey.htm',
    scoringUrl: 'https://ipip.ori.org/newScoringInstructions.htm',
    permissionUrl: 'https://ipip.ori.org/newPermission.htm',
    permission: 'public-domain',
    retrievedAt: '2026-10-02',
    contentHash: 'sha256:a9451a4356aaf8a7b83cb8d7e23807dfc7c7915dd91b49221c9ced6ba551eea9'
  }),
  answerScale: Object.freeze({min: 1, max: 5}),
  responseAnchors,
  factors: Object.freeze([
    {key: 'extraversion', label: 'Extraversion', min: 4, max: 20},
    {key: 'agreeableness', label: 'Agreeableness', min: 4, max: 20},
    {key: 'conscientiousness', label: 'Conscientiousness', min: 4, max: 20},
    {key: 'neuroticism', label: 'Neuroticism', min: 4, max: 20},
    {key: 'intellect_imagination', label: 'Intellect / Imagination', min: 4, max: 20}
  ]),
  questions: Object.freeze([
    {id: 'mini-ipip-20.en.01', factor: 'extraversion', keyed: '+', text: 'Am the life of the party.'},
    {id: 'mini-ipip-20.en.02', factor: 'agreeableness', keyed: '+', text: "Sympathize with others' feelings."},
    {id: 'mini-ipip-20.en.03', factor: 'conscientiousness', keyed: '+', text: 'Get chores done right away.'},
    {id: 'mini-ipip-20.en.04', factor: 'neuroticism', keyed: '+', text: 'Have frequent mood swings.'},
    {id: 'mini-ipip-20.en.05', factor: 'intellect_imagination', keyed: '+', text: 'Have a vivid imagination.'},
    {id: 'mini-ipip-20.en.06', factor: 'extraversion', keyed: '-', text: "Don't talk a lot."},
    {id: 'mini-ipip-20.en.07', factor: 'agreeableness', keyed: '-', text: "Am not interested in other people's problems."},
    {id: 'mini-ipip-20.en.08', factor: 'conscientiousness', keyed: '-', text: 'Often forget to put things back in their proper place.'},
    {id: 'mini-ipip-20.en.09', factor: 'neuroticism', keyed: '-', text: 'Am relaxed most of the time.'},
    {id: 'mini-ipip-20.en.10', factor: 'intellect_imagination', keyed: '-', text: 'Am not interested in abstract ideas.'},
    {id: 'mini-ipip-20.en.11', factor: 'extraversion', keyed: '+', text: 'Talk to a lot of different people at parties.'},
    {id: 'mini-ipip-20.en.12', factor: 'agreeableness', keyed: '+', text: "Feel others' emotions."},
    {id: 'mini-ipip-20.en.13', factor: 'conscientiousness', keyed: '+', text: 'Like order.'},
    {id: 'mini-ipip-20.en.14', factor: 'neuroticism', keyed: '+', text: 'Get upset easily.'},
    {id: 'mini-ipip-20.en.15', factor: 'intellect_imagination', keyed: '-', text: 'Have difficulty understanding abstract ideas.'},
    {id: 'mini-ipip-20.en.16', factor: 'extraversion', keyed: '-', text: 'Keep in the background.'},
    {id: 'mini-ipip-20.en.17', factor: 'agreeableness', keyed: '-', text: 'Am not really interested in others.'},
    {id: 'mini-ipip-20.en.18', factor: 'conscientiousness', keyed: '-', text: 'Make a mess of things.'},
    {id: 'mini-ipip-20.en.19', factor: 'neuroticism', keyed: '-', text: 'Seldom feel blue.'},
    {id: 'mini-ipip-20.en.20', factor: 'intellect_imagination', keyed: '-', text: 'Do not have a good imagination.'}
  ])
})
