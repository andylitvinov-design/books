// The server-owned logical course clock is independent of a voice transport.
// Events must be constructed by a verified server adapter, never from a
// browser-reported elapsed duration, checkbox, model reply or token mint.
// This is an internal domain contract, NOT a provider authorization.
import {createLogicalCourseClockEngine} from './logical-course-clock-engine.mjs'
export const CLARITY_CLOCK_VERSION='hh-clarity-clock-v1'
export const CLARITY_LOGICAL_SESSION_MS=20*60*1000
export const CLARITY_CLOCK_MAX_GAP_MS=15000
const engine=createLogicalCourseClockEngine({version:CLARITY_CLOCK_VERSION,limitMs:CLARITY_LOGICAL_SESSION_MS,prefix:'CLARITY',maxGapMs:CLARITY_CLOCK_MAX_GAP_MS})
export const createClarityCourseClock=engine.createClarityCourseClock
export const validateClarityCourseClock=engine.validateClarityCourseClock
export const clarityClockNewDailyClaims=engine.clarityClockNewDailyClaims
export const clarityClockDailySlot=engine.clarityClockDailySlot
export const clarityClockSummary=engine.clarityClockSummary
export const advanceClarityCourseClock=engine.advanceClarityCourseClock
export const clarityClockResumeTime=engine.clarityClockResumeTime
export const clarityClockTimedEnd=engine.clarityClockTimedEnd
