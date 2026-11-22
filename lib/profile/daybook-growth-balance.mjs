import {emptyDevelopmentVectors,normalizeDevelopmentVectors} from './development-vectors.mjs'
// Absence is a valid unrated profile. Malformed saved ratings are unavailable.
export function savedDaybookBalance(result){
 if(!result?.goals||typeof result.goals!=='object'||Array.isArray(result.goals))throw new Error('PRIVATE_BALANCE_UNAVAILABLE')
 if(!Object.hasOwn(result.goals,'vectors'))return emptyDevelopmentVectors()
 const values=normalizeDevelopmentVectors(result.goals.vectors)
 if(!values)throw new Error('PRIVATE_BALANCE_UNAVAILABLE')
 return values
}
