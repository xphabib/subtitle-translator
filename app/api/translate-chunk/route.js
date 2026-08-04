import axios from 'axios';
import { buildPrompt, chunkArray } from '@/lib/subtitle';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      subtitles,      // Array of {id, text}
      chunkIndex,     // Which chunk index to translate
      chunkSize = 30,
      apiProvider = 'openai', // 'openai' | 'omniroute'
      apiKey,
      apiUrl,
      model,
      targetLanguage = 'Bengali (বাংলা)',
    } = body;

    if (!subtitles || !Array.isArray(subtitles)) {
      return Response.json({ error: 'Invalid subtitles payload.' }, { status: 400 });
    }

    // Build chunks and pick the right one
    const chunks = chunkArray(
      subtitles.map(s => ({ id: s.id, text: s.text })),
      chunkSize
    );

    if (chunkIndex < 0 || chunkIndex >= chunks.length) {
      return Response.json({ error: 'Invalid chunk index.' }, { status: 400 });
    }

    const chunk = chunks[chunkIndex];
    const prompt = buildPrompt(chunk, targetLanguage);

    let result;

    if (apiProvider === 'openai') {
      // ── OpenAI API ──────────────────────────────────────────
      const chosenModel = model || 'gpt-4o-mini';
      const chosenKey   = apiKey || process.env.OPENAI_API_KEY;

      if (!chosenKey) {
        return Response.json({ error: 'OpenAI API key is required.' }, { status: 400 });
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: chosenModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${chosenKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120_000,
        }
      );

      const raw = response.data.choices[0].message.content.trim();
      result = JSON.parse(raw);

    } else {
      // ── OmniRoute / Local API ───────────────────────────────
      const chosenModel = model || 'agy/gemini-3.5-flash-low';
      const chosenUrl   = apiUrl  || 'http://82.165.174.94/:20128/api/v1/chat/completions';
      const chosenKey   = apiKey  || 'sk-8256e6b78df8bc49-5f3b9f-78a650fd';

      const response = await axios.post(
        chosenUrl,
        {
          model: chosenModel,
          messages: [{ role: 'system', content: prompt }],
          stream: false,
          temperature: 0.7,
          max_tokens: 2048,
        },
        {
          headers: {
            Authorization: `Bearer ${chosenKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120_000,
        }
      );

      const raw = response.data.choices[0].message.content.trim();
      result = JSON.parse(raw);
    }

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
