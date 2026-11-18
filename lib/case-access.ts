import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { ReportAttachment } from '@/lib/types'
export async function isAdmin(client: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await client.rpc('idanu_is_admin')
  return !error && data === true
}
export async function signedAttachments(client: Awaited<ReturnType<typeof createClient>>, attachments: ReportAttachment[] = []) {
  return Promise.all(attachments.map(async attachment => {
    const match = attachment.url?.match(/\/storage\/v1\/object\/(?:public|sign)\/report-images\/([^?]+)/)
    if (!match) return attachment
    const { data } = await client.storage.from('report-images').createSignedUrl(decodeURIComponent(match[1]), 300)
    return { ...attachment, url: data?.signedUrl || '' }
  }))
}
