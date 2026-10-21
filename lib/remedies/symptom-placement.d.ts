export type RemedyIntroSplit = { before: string[]; after: string[]; foundIndications: boolean };
export function splitAtRemedyIndications(blocks: string[]): RemedyIntroSplit;
