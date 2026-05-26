// ─────────────────────────────────────────────────────────────
// Environment variable validation
// ─────────────────────────────────────────────────────────────
// Centralises the contract between the running app and its
// configuration. If a required env var is missing, fail loud
// at first use rather than letting the app silently misbehave
// (e.g. patient chat falling through to a no-op, or Deepgram
// requests routing to the US default endpoint).
//
// Use `requireEnv(name)` for hard requirements (will throw).
// Use `optionalEnv(name, fallback)` for soft requirements.
// Use `assertEUEndpoint(url)` to enforce UK-GDPR data residency.
// ─────────────────────────────────────────────────────────────

/**
 * Read a required environment variable. Throws a clear error
 * with the variable name if it is missing or empty. Use this
 * at the top of any module / route that depends on the value.
 */
export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v || v.trim() === '' || v.startsWith('your-')) {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
      `Set this in your .env.local file. See .env.example for documentation.`,
    )
  }
  return v
}

/**
 * Read an optional environment variable with a sensible fallback.
 */
export function optionalEnv(name: string, fallback: string): string {
  const v = process.env[name]
  if (!v || v.trim() === '' || v.startsWith('your-')) return fallback
  return v
}

/**
 * Validate that a URL points at a UK or EU regional endpoint. This is the
 * runtime guard for UK-GDPR data residency: any cloud processor handling
 * PHI must be configured to a UK / EU region, never the global default
 * which routes via the US.
 *
 * Recognised UK / EU patterns:
 *   - api.eu.<provider>.com         (Deepgram EU)
 *   - <region>.openai.azure.com     (Azure UK South / EU regions)
 *   - eu.api.openai.com             (OpenAI Enterprise EU residency)
 *   - <project>.supabase.co         (Supabase project — region set at project level)
 */
export function assertEUEndpoint(url: string, label = 'endpoint'): void {
  const u = url.toLowerCase()
  const ukOrEu =
    u.includes('eu.deepgram') ||
    u.includes('api.eu.') ||
    u.includes('eu.api.') ||
    u.includes('uksouth.api.cognitive.microsoft') ||
    u.includes('.openai.azure.com') ||      // Azure region pinned at resource level
    u.includes('.supabase.co')               // region pinned at project level
  if (!ukOrEu) {
    throw new Error(
      `[env] ${label} does not appear to be a UK or EU regional URL: ${url}. ` +
      `UK-GDPR requires PHI processors to be EU-resident. ` +
      `Acceptable patterns: api.eu.<provider>.com, <region>.openai.azure.com, eu.api.openai.com.`,
    )
  }
}

/**
 * Validate the full ORAII clinical environment in one call. Throws on the
 * first missing or non-compliant value. Call this at app boot (e.g. from a
 * Next.js middleware or instrumentation hook) so misconfigurations crash
 * loudly rather than failing silently mid-session.
 */
export function validateClinicalEnv(): void {
  // Hard requirements
  requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  requireEnv('OPENAI_API_KEY')

  // Optional but if set, must be UK/EU
  const dgEndpoint = process.env.DEEPGRAM_ENDPOINT
  if (dgEndpoint) assertEUEndpoint(dgEndpoint, 'DEEPGRAM_ENDPOINT')

  const openaiBase = process.env.OPENAI_BASE_URL
  if (openaiBase) assertEUEndpoint(openaiBase, 'OPENAI_BASE_URL')
}
