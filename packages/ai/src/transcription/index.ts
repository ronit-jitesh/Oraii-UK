// ── Deepgram EU Transcription ──
// Endpoint: api.eu.deepgram.com (NOT api.deepgram.com — that routes to US)
// Model: nova-3 — best accuracy for UK English clinical speech
// Language: en-GB — British English acoustic model
// UK-GDPR: audio is never stored. Deepgram DPA confirms deletion after transcription.
// Data Processing Agreement must be signed with Deepgram before go-live.

export type TranscriptionResult = {
  transcript: string
  confidence: number
  words: Array<{
    word: string
    start: number
    end: number
    confidence: number
  }>
  durationSeconds: number
}

export type TranscriptionOptions = {
  language?: 'en-GB'
  model?: 'nova-3'
  smartFormat?: boolean
  punctuate?: boolean
}

export async function transcribeSessionAudio(
  audioBuffer: ArrayBuffer,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const endpoint =
    process.env.DEEPGRAM_ENDPOINT ?? 'https://api.eu.deepgram.com'

  if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY is not set')
  }

  // Validate endpoint is EU — refuse to send data to US endpoint
  if (!endpoint.includes('eu.deepgram')) {
    throw new Error(
      'UK-GDPR violation: Deepgram endpoint must be EU (api.eu.deepgram.com). ' +
        'Set DEEPGRAM_ENDPOINT=https://api.eu.deepgram.com in .env.local'
    )
  }

  const params = new URLSearchParams({
    model: options.model ?? 'nova-3',
    language: options.language ?? 'en-GB',
    smart_format: String(options.smartFormat ?? true),
    punctuate: String(options.punctuate ?? true),
    diarize: 'false', // single-therapist note generation; no speaker separation needed
  })

  const response = await fetch(
    `${endpoint}/v1/listen?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/wav',
      },
      body: audioBuffer,
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Deepgram transcription failed [${response.status}]: ${err}`)
  }

  const data = await response.json()
  const channel = data.results?.channels?.[0]?.alternatives?.[0]
  const metadata = data.metadata

  return {
    transcript: channel?.transcript ?? '',
    confidence: channel?.confidence ?? 0,
    words: channel?.words ?? [],
    durationSeconds: metadata?.duration ?? 0,
  }
}
