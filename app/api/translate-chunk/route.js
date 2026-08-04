import axios from 'axios';
import { buildPrompt, chunkArray } from '@/lib/subtitle';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      subtitles,
      chunkIndex,
      chunkSize = 30,
      apiKey,
      apiUrl  = 'http://82.165.174.94/:20128/api/v1/chat/completions',
      model   = 'agy/gemini-3.5-flash-low',
      targetLanguage = 'Bengali (বাংলা)',
    } = body;

    if (!subtitles || !Array.isArray(subtitles)) {
      return Response.json({ error: 'Invalid subtitles payload.' }, { status: 400 });
    }

    const chunks = chunkArray(
      subtitles.map(s => ({ id: s.id, text: s.text })),
      chunkSize
    );

    if (chunkIndex < 0 || chunkIndex >= chunks.length) {
      return Response.json({ error: 'Invalid chunk index.' }, { status: 400 });
    }

    const chunk = chunks[chunkIndex];
    const prompt = buildPrompt(chunk, targetLanguage);

    const response = await axios.post(
      apiUrl,
      {
        model,
        messages: [{ role: 'system', content: prompt }],
        stream: false,
        temperature: 0.7,
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120_000,
      }
    );

    const raw = response.data.choices[0].message.content.trim();
    const result = JSON.parse(raw);

    return Response.json({
      success: true,
      chunkIndex,
      totalChunks: chunks.length,
      translated: result,
    });

  } catch (err) {
    console.error('[translate-chunk] Error:', err?.response?.data || err.message);
    return Response.json(
      { error: err?.response?.data?.error?.message || err.message || 'Translation failed.' },
      { status: 500 }
    );
  }
}
