/**
 * Parse SRT content into a JSON array of subtitle objects.
 * @param {string} srtContent
 * @returns {Array<{id:number, startTime:string, endTime:string, text:string}>}
 */
export function srtToJson(srtContent) {
  const blocks = srtContent.trim().split(/\r?\n\r?\n/);
  const result = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    if (lines.length >= 2) {
      const id = parseInt(lines[0].trim(), 10);
      const timeMatch = lines[1].match(/(.+) --> (.+)/);
      if (timeMatch) {
        result.push({
          id,
          startTime: timeMatch[1].trim(),
          endTime:   timeMatch[2].trim(),
          text:      lines.slice(2).join('\n').trim(),
        });
      }
    }
  }
  return result;
}

/**
 * Convert JSON subtitle array back to SRT string.
 * @param {Array<{id:number, startTime:string, endTime:string, text:string}>} subtitles
 * @returns {string}
 */
export function jsonToSrt(subtitles) {
  return subtitles
    .sort((a, b) => a.id - b.id)
    .map(item => `${item.id}\n${item.startTime} --> ${item.endTime}\n${item.text}`)
    .join('\n\n');
}

/**
 * Split an array into chunks of the given size.
 */
export function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format duration in seconds to mm:ss.
 */
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Build the translation prompt sent to the AI.
 */
export function buildPrompt(chunkData, targetLanguage = 'Bengali (বাংলা)') {
  return `You are a professional movie subtitle translator.

Your task is to translate ONLY the value of the 'text' field from English to natural, fluent ${targetLanguage}.

Rules:
1. Return ONLY valid JSON — no markdown, no code fences, no explanations.
2. Preserve the JSON structure exactly (same number of objects, same keys).
3. Do NOT change the 'id' values.
4. Translate ONLY the 'text' field.
5. Preserve proper nouns, URLs, numbers, filenames, and special identifiers.
6. Preserve punctuation, ellipses (...), brackets, and formatting.
7. Keep subtitles natural, conversational, and suitable for movies.
8. Translate idioms into their natural ${targetLanguage} equivalent.
9. Do not translate empty strings.
10. The output must be directly parseable using JSON.parse().

Input:
${JSON.stringify(chunkData)}

Output:
The same JSON array with only the 'text' values translated.`;
}

/**
 * Parse SRT timestamp (HH:MM:SS,mmm) to milliseconds.
 */
export function timestampToMs(timestamp) {
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (!match) return 0;
  const [, h, m, s, ms] = match;
  return parseInt(h) * 3600000 + parseInt(m) * 60000 + parseInt(s) * 1000 + parseInt(ms);
}

/**
 * Convert milliseconds to SRT timestamp format (HH:MM:SS,mmm).
 */
export function msToTimestamp(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Adjust subtitle timings by adding/subtracting milliseconds.
 */
export function adjustSubtitleTimings(subtitles, offsetMs) {
  return subtitles.map(sub => ({
    ...sub,
    startTime: msToTimestamp(Math.max(0, timestampToMs(sub.startTime) + offsetMs)),
    endTime: msToTimestamp(Math.max(0, timestampToMs(sub.endTime) + offsetMs)),
  }));
}
