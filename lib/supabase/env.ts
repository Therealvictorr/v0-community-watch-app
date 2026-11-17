export function isSupabaseConfigured() {
  return process.env.IDANU_DEMO_MODE !== '1' && Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
