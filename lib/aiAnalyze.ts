import type { ApiSettings, ClipRecommendation } from './types';
import { ensureValidModel } from './types';

/** Grabs `count` evenly-spaced JPEG frames from the video as base64 (no data: prefix). */
async function sampleFrames(
  video: HTMLVideoElement,
  count: number
): Promise<{ time: number; base64: string }[]> {
  const duration = video.duration;
  if (!isFinite(duration) || duration <= 0) return [];

  const canvas = document.createElement('canvas');
  const targetW = 480;
  const scale = targetW / (video.videoWidth || targetW);
  canvas.width = targetW;
  canvas.height = Math.round((video.videoHeight || 270) * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const wasPaused = video.paused;
  const originalTime = video.currentTime;
  const frames: { time: number; base64: string }[] = [];

  for (let i = 0; i < count; i++) {
    const t = (duration / (count + 1)) * (i + 1);
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = t;
    });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    frames.push({ time: t, base64: dataUrl.split(',')[1] });
  }

  video.currentTime = originalTime;
  if (!wasPaused) await video.play().catch(() => {});

  return frames;
}

function buildUserInstruction(frames: { time: number; base64: string }[]): string {
  const timeList = frames.map((f, i) => `Frame ${i + 1} = detik ke-${f.time.toFixed(1)}`).join(', ');
  return (
    `Berikut adalah ${frames.length} cuplikan gambar yang diambil dari video pada waktu berikut: ${timeList}. ` +
    `Gunakan gambar-gambar ini sebagai representasi isi video secara keseluruhan. ` +
    `Balas HANYA dengan JSON array yang valid (tanpa markdown, tanpa teks lain), setiap elemen berbentuk: ` +
    `{"start": number, "end": number, "label": string, "description": string, "viralScore": number, "engagement": number, "retention": number, "hashtags": string[]}. ` +
    `"start" dan "end" dalam detik, gunakan waktu dari frame-frame di atas sebagai acuan realistis.`
  );
}

function extractJsonArray(text: string): ClipRecommendation[] {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  const jsonStr = match ? match[0] : cleaned;
  const parsed = JSON.parse(jsonStr) as Array<Record<string, unknown>>;
  return parsed.map((c, i) => ({
    id: crypto.randomUUID(),
    index: i + 1,
    start: Number(c.start) || 0,
    end: Number(c.end) || 0,
    label: String(c.label ?? `Klip ${i + 1}`),
    description: String(c.description ?? ''),
    viralScore: Math.round(Number(c.viralScore) || 0),
    engagement: Math.round(Number(c.engagement) || 0),
    retention: Math.round(Number(c.retention) || 0),
    hashtags: Array.isArray(c.hashtags) ? c.hashtags.map(String) : [],
  }));
}

async function callGemini(settings: ApiSettings, instruction: string, frames: { base64: string }[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: settings.systemPrompt }] },
    contents: [
      {
        role: 'user',
        parts: [
          { text: instruction },
          ...frames.map((f) => ({ inline_data: { mime_type: 'image/jpeg', data: f.base64 } })),
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
  return text;
}

async function callOpenAI(settings: ApiSettings, instruction: string, frames: { base64: string }[]) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: settings.systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: instruction },
            ...frames.map((f) => ({
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${f.base64}` },
            })),
          ],
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callClaude(settings: ApiSettings, instruction: string, frames: { base64: string }[]) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      // Required to allow this request to be made directly from the browser.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 2000,
      system: settings.systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: instruction },
            ...frames.map((f) => ({
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: f.base64 },
            })),
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '';
}

/**
 * Runs a real AI analysis pass using the user's chosen provider, model and
 * (crucially) their custom system prompt — this is what actually drives the
 * model's behavior, unlike a hardcoded simulation.
 */
export async function analyzeVideoWithAI(
  video: HTMLVideoElement,
  settings: ApiSettings
): Promise<ClipRecommendation[]> {
  const validatedSettings: ApiSettings = { ...settings, model: ensureValidModel(settings.provider, settings.model) };
  const frames = await sampleFrames(video, 6);
  if (frames.length === 0) throw new Error('Video belum siap dianalisis (durasi tidak terbaca).');

  const instruction = buildUserInstruction(frames);
  let raw: string;
  if (validatedSettings.provider === 'gemini') raw = await callGemini(validatedSettings, instruction, frames);
  else if (validatedSettings.provider === 'openai') raw = await callOpenAI(validatedSettings, instruction, frames);
  else raw = await callClaude(validatedSettings, instruction, frames);

  return extractJsonArray(raw);
}
