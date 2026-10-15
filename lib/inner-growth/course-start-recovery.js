// Safe course-start reconciliation. A network/server error after the final POST
// does not prove the transaction failed: check the owner-scoped course first.
// Never automatically create a second cycle without a current stage/revision read.
const RETRYABLE = new Set(['SERVICE_UNAVAILABLE', 'REVISION_CONFLICT', 'CONFLICT'])

function recoverable(error) {
  return RETRYABLE.has(error?.code || error?.message) ||
    (error?.name === 'TypeError' && error?.status == null)
}

function stateChanged() {
  const error = new Error('COURSE_STATE_CHANGED')
  error.code = 'COURSE_STATE_CHANGED'
  return error
}

export async function startCourseWithRecovery(request, payload) {
  if (typeof request !== 'function' || payload?.action !== 'choose-goals' ||
      !Number.isInteger(payload.expectedRevision))
    throw new Error('INVALID_COURSE_START_REQUEST')

  try {
    return await request(payload)
  } catch (initialError) {
    if (!recoverable(initialError)) throw initialError
    let current
    try {
      current = await request()
    } catch {
      // Do not replace the original failure with an unrelated read error.
      throw initialError
    }
    // A previously committed transaction may have lost its HTTP response.
    // In that case the course/cycle already exists: do not POST again.
    if (current?.course?.stage === 4) {
      if (!payload.moduleId || current.course.moduleChoice?.id === payload.moduleId)
        return current
      throw stateChanged()
    }
    // One retry is safe only if the server confirms the first transaction did
    // not advance the course, and no other tab changed the account revision.
    if (current?.course?.stage !== 3 ||
        current.course.revision !== payload.expectedRevision)
      throw stateChanged()

    return request(payload)
  }
}
