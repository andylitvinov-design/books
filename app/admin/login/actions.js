'use server'

import { redirect } from 'next/navigation'

import { establishAdminSession } from '@/lib/prescriptions/admin'

export async function login(formData) {
  const accepted = await establishAdminSession(String(formData.get('accessCode') ?? ''))
  if (!accepted) redirect('/admin/login?error=1')
  redirect('/admin/prescriptions/new')
}
