import type { ApiSettings } from './types';
import type { SubtitleEntry } from './types';

/**
 * Decodes the currently loaded video's audio track (between `start` and
 * `end` seconds) into a mono 16kHz WAV Blob. This runs entirely in the
 * browser via Web Audio API — nothing is uploaded anywhere except to
 * whichever AI provider the user has configured for transcription.
 */
async function extractAudioWav(videoUrl: string, start: number, end: number): Promise<Blob> {
  const res = await fetch(videoUrl);
  const arrayBuffer = await res.arrayBuffer();

  // Decode with a throwaway AudioContext just to read the samples.
  const decodeCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  await decodeCtx.close();

  const targetSampleRate = 16000;
  const clipStart = Math.max(0, start);
  const clipEnd = Math.min(decoded.duration, end > start ? end : decoded.duration);
  const clipDuration = Math.max(0.1, clipEnd - clipStart);

  // Resample + downmix to mono at 16kHz using an OfflineAudioContext, which
  // is what most speech models expect and keeps upload size small.
  const offline = new OfflineAudioContext(1, Math.ceil(clipDuration * targetSampleRate), targetSampleRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  const gain = offline.createGain();
  src.connect(gain).connect(offline.destination);
  src.start(0, clipStart, clipDuration);
  const rendered = await offline.startRendering();

  return encodeWav(rendered);
}

/** Minimal 16-bit PCM WAV encoder for a mono AudioBuffer. */
function encodeWav(buffer: AudioBuffer): Blob {
  const samples = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const view = new DataView(new ArrayBuffer(44 + dataSize));

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

/** OpenAI Whisper — real speech-to-text with per-segment timestamps. */
async function transcribeWithOpenAI(wav: Blob, apiKey: string): Promise<SubtitleEntry[]> {
  const form = new FormData();
  form.append('file', wav, 'audio.wav');
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`OpenAI Whisper error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const segments: { start: number; end: number; text: string }[] = data.segments ?? [];
  if (segments.length === 0 && data.text) {
    return [{ id: crypto.randomUUID(), start: 0, end: 4, text: String(data.text).trim() }];
  }
  return segments.map((s) => ({
    id: crypto.randomUUID(),
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }));
}

/** Gemini — audio understanding, prompted to return timestamped JSON segments. */
async function transcribeWithGemini(wav: Blob, apiKey: string, model: string): Promise<SubtitleEntry[]> {
  const base64 = await blobToBase64(wav);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'Transkripsikan ucapan pada audio ini kata demi kata (bahasa aslinya, jangan diterjemahkan). ' +
              'Balas HANYA dengan JSON array valid, tanpa markdown, setiap elemen: ' +
              '{"start": number, "end": number, "text": string}, dipecah per kalimat/frasa pendek, ' +
              '"start" dan "end" dalam detik relatif terhadap awal file audio ini.',
          },
          { inline_data: { mime_type: 'audio/wav', data: base64 } },
        ],
      },
    ],
    generationConfig: { responseMimeType: 'application/json' },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  const parsed = JSON.parse(match ? match[0] : cleaned) as Array<{ start: number; end: number; text: string }>;
  return parsed.map((s) => ({
    id: crypto.randomUUID(),
    start: Number(s.start) || 0,
    end: Number(s.end) || 0,
    text: String(s.text ?? '').trim(),
  }));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generates real subtitles by transcribing the actual speech in the
 * selected clip range (startTime → endTime), using the user's own AI
 * provider + API key from Settings. Timestamps returned are re-offset to
 * be absolute (relative to the full video), matching what the player and
 * SubtitleStudio timeline expect.
 */
export async function generateRealSubtitles(
  videoUrl: string,
  clipStart: number,
  clipEnd: number,
  settings: ApiSettings
): Promise<SubtitleEntry[]> {
  if (!settings.apiKey) throw new Error('Atur API key terlebih dahulu di Pengaturan AI.');
  if (settings.provider === 'claude') {
    throw new Error(
      'Claude belum mendukung input audio untuk transkripsi. Pilih provider Gemini atau OpenAI di Pengaturan AI untuk fitur subtitle otomatis.'
    );
  }

  const wav = await extractAudioWav(videoUrl, clipStart, clipEnd);

  let entries: SubtitleEntry[];
  if (settings.provider === 'openai') {
    entries = await transcribeWithOpenAI(wav, settings.apiKey);
  } else {
    entries = await transcribeWithGemini(wav, settings.apiKey, settings.model);
  }

  // Re-offset from "relative to clip" to "relative to full video timeline".
  return entries
    .filter((e) => e.text.length > 0)
    .map((e) => ({ ...e, start: e.start + clipStart, end: e.end + clipStart }));
}
