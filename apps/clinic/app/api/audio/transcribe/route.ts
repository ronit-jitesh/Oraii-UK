import { NextRequest, NextResponse } from 'next/server';

// ── Deepgram EU endpoint — UK-GDPR compliant ──
// UK-GDPR: audio data processed within EU only
// Endpoint: api.eu.deepgram.com (NOT api.deepgram.com — that routes to US)
// Model: nova-3, language: en-GB (British English)

export async function POST(request: NextRequest) {
  try {
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramKey) {
      return NextResponse.json({ error: 'Deepgram key not configured' }, { status: 500 });
    }

    const endpoint = process.env.DEEPGRAM_ENDPOINT || 'https://api.eu.deepgram.com';

    // Validate EU endpoint — refuse US routing
    if (!endpoint.includes('eu.deepgram') && !endpoint.includes('api.eu')) {
      console.error('[transcribe] Non-EU Deepgram endpoint detected — UK-GDPR violation risk');
      return NextResponse.json(
        { error: 'Configuration error: non-EU endpoint detected' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const audioBuffer = await audioFile.arrayBuffer();

    const response = await fetch(
      `${endpoint}/v1/listen` +
      '?model=nova-3' +
      '&language=en-GB' +
      '&smart_format=true' +
      '&punctuate=true' +
      '&diarize=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${deepgramKey}`,
          'Content-Type': audioFile.type || 'audio/webm',
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[transcribe] Deepgram error:', errText);
      return NextResponse.json(
        { error: 'Transcription failed', detail: errText },
        { status: 500 }
      );
    }

    const data = await response.json();
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('[transcribe] Error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
