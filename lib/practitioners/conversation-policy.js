// One status predicate shared by client composer, master queue and counters.
// A remote booking is not an open conversation after it is completed/declined.
export function canReplyToConsultation(status,remoteBooking){
 return status==='requested'||status==='contacted'||
   (remoteBooking!=null&&['reschedule_proposed','confirmed','in_progress'].includes(status))
}
