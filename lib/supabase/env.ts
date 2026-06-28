export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return Boolean(
    url &&
      key &&
      url !== 'your-project-url' &&
      key !== 'your-anon-key' &&
      url.startsWith('http'),
  )
}
