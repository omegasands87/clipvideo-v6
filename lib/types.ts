export type VideoMeta = {
  title: string;
  duration: number;
  fileName: string;
  url: string | null;
  width: number;
  height: number;
};

export type ClipRecommendation = {
  id: string;
  index: number;
  start: number;
  end: number;
  label: string;
  description: string;
  viralScore: number;
  engagement: number;
  retention: number;
  hashtags: string[];
};

export type SubtitleEntry = {
  id: string;
  start: number;
  end: number;
  text: string;
};

export type TypographySettings = {
  textMode: string;
  visualStyle: string;
  fontFamily: string;
  fontSize: number;
  verticalPosition: number;
  audioEnhancer: string;
};

export type VisualFxSettings = {
  kenBurns: number;
  motionPreset: string;
  horizontalMirror: boolean;
  noiseInjection: boolean;
  colorGrading: boolean;
  speedRamp: boolean;
};

export type AudioSettings = {
  pitchShift: number;
  playbackSpeed: number;
  eqRandomizer: boolean;
  bgmVolume: number;
  voiceVolume: number;
  bgmTrack: string;
};

export type ExportSettings = {
  format: string;
  quality: string;
  stripMetadata: boolean;
};

export type ApiProvider = 'gemini' | 'claude' | 'openai';
export type ApiSettings = {
  provider: ApiProvider;
  apiKey: string;
  model: string;
  systemPrompt: string;
};

// Single source of truth for which models are currently offered per
// provider. Used both by the settings dropdown AND to validate/migrate
// any model string previously saved to localStorage — this prevents the
// silent-mismatch bug where a <select> visually shows its first option
// while the underlying saved value is actually an old, no-longer-valid
// model id (e.g. a retired Gemini model), causing API calls to fail with
// a 404 even though the UI looked correct.
export const AI_PROVIDERS: { id: ApiProvider; name: string; models: string[] }[] = [
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.5-flash'] },
  { id: 'claude', name: 'Anthropic Claude', models: ['claude-sonnet-5', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'] },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-5.1'] },
];

/** Returns `model` if it's still valid for `provider`, otherwise the provider's first current model. */
export function ensureValidModel(provider: ApiProvider, model: string): string {
  const providerDef = AI_PROVIDERS.find((p) => p.id === provider) ?? AI_PROVIDERS[0];
  return providerDef.models.includes(model) ? model : providerDef.models[0];
}

export const DEFAULT_SYSTEM_PROMPT =
  'Temukan 3-5 momen paling lucu dan memicu penasaran (hook) dari video ini. Untuk setiap momen, berikan rentang waktu (detik awal dan akhir), skor virality (0-100), deskripsi singkat, dan 3-5 hashtag yang relevan. Format output sebagai JSON array.';

export const DEFAULT_API_SETTINGS: ApiSettings = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-2.5-flash',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};
