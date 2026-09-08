'use server'

import { redirect } from 'next/navigation'

import { clearAdminSession } from '@/lib/prescriptions/admin'

export async function logout() {
  await clearAdminSession()
  redirect('/admin/login')
}
