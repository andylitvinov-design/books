// Official CFPB (2017) five-item abbreviated scale look-up, transcribed from the public-domain worksheet.
// Columns: self-administered 18–61, self-administered 62+, assisted 18–61, assisted 62+.
// Source: https://files.consumerfinance.gov/f/documents/bcfp_fin-well-being_short-scorecard.pdf
import { fail, deepFreeze } from './contracts.js'

export const CFPB_SHORT_2017_LOOKUP = deepFreeze([
  [
    19,
    20,
    22,
    24
  ],
  [
    25,
    26,
    30,
    30
  ],
  [
    29,
    31,
    33,
    33
  ],
  [
    32,
    34,
    36,
    37
  ],
  [
    36,
    37,
    39,
    39
  ],
  [
    38,
    40,
    42,
    42
  ],
  [
    41,
    43,
    44,
    44
  ],
  [
    43,
    46,
    47,
    46
  ],
  [
    46,
    48,
    49,
    49
  ],
  [
    48,
    51,
    51,
    51
  ],
  [
    50,
    53,
    54,
    53
  ],
  [
    53,
    55,
    56,
    55
  ],
  [
    55,
    58,
    58,
    57
  ],
  [
    57,
    61,
    60,
    59
  ],
  [
    60,
    63,
    63,
    62
  ],
  [
    63,
    66,
    66,
    64
  ],
  [
    65,
    69,
    68,
    67
  ],
  [
    68,
    73,
    72,
    70
  ],
  [
    72,
    76,
    75,
    73
  ],
  [
    76,
    81,
    80,
    77
  ],
  [
    82,
    90,
    87,
    84
  ]
])

export function scoreCfpbShort2017(valid) {
  if (!valid || typeof valid !== 'object') fail('INVALID_ANSWER')
  const age = valid['cfpb5.06']
  const mode = valid['cfpb5.07']
  const values = [1, 2, 3, 4, 5].map(index => valid[`cfpb5.${String(index).padStart(2, '0')}`])
  if (values.some(value => !Number.isInteger(value) || value < 0 || value > 4) ||
      ![0, 1].includes(age) || ![0, 1].includes(mode)) fail('INVALID_ANSWER')
  // Three negatively-worded "describes me" statements are scored 0..4
  // in the questionnaire's stated order. The fourth, positive frequency
  // statement must be reversed. The fifth negative frequency item is 0..4.
  const responseTotal = values[0] + values[1] + values[2] + (4 - values[3]) + values[4]
  const column = mode * 2 + age
  const score = CFPB_SHORT_2017_LOOKUP[responseTotal]?.[column]
  if (!Number.isInteger(score) || score < 0 || score > 100) fail('INVALID_INSTRUMENT')
  return { score, responseTotal }
}
