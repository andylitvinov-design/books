// Compatibility URL for draft clients: one canonical dispatcher and claim ledger.
export { GET } from '@/app/api/internal/notification-dispatch/route'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60
