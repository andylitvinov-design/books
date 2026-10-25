import { AppError } from '../assessments/contracts.js'

// Public vanity handles are deliberately stricter than auto-generated service slugs.
// Keep the contract identical for every locale and for anonymous alias resolution.
export const PROFILE_ALIAS_PATTERN = /^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$/
export const PROFILE_ALIAS_RESERVED = new Set([
  'admin','administrator','api','app','account','accounts','auth','billing','blog',
  'book','books','business','cart','checkout','client','clients','contact','courses',
  'dashboard','diagnosis','en','es','explore','free','help','home','holistic','holistic-house',
  'holistichouse','info','login','logout','m','master','masters','media','moderator',
  'official','payment','payments','practice','privacy','profile','profiles','pro',
  'register','report','reports','ru','search','service','services','settings','shop',
  'signup','staff','support','system','test','tests','toronto','users','videos',
  'www','your','youtube',
])

export function validateProfileAlias(value){
  if(typeof value!=='string')throw new AppError('INVALID_ALIAS',400)
  const alias=value.trim().toLowerCase()
  if(!PROFILE_ALIAS_PATTERN.test(alias)||alias.includes('--'))
    throw new AppError('INVALID_ALIAS',400)
  if(PROFILE_ALIAS_RESERVED.has(alias))throw new AppError('ALIAS_RESERVED',400)
  return alias
}
