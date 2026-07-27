'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Scissors, Film, ShieldCheck, Cpu, Github } from 'lucide-react';
import VideoPlayer from '@/components/studio/VideoPlayer';
import SubtitleStudio from '@/components/studio/SubtitleStudio';
import ApiSettingsModal from '@/components/studio/ApiSettingsModal';
import AiKuratorCard from '@/components/studio/cards/AiKuratorCard';
import TypographyCard from '@/components/studio/cards/TypographyCard';
import VisualFxCard from '@/components/studio/cards/VisualFxCard';
import AudioCard from '@/components/studio/cards/AudioCard';
import ExportCard from '@/components/studio/cards/ExportCard';
import type {
  VideoMeta,
  SubtitleEntry,
  ClipRecommendation,
  TypographySettings,
  VisualFxSettings,
  AudioSettings,
  ExportSettings,
  ApiSettings,
} from '@/lib/types';
import { DEFAULT_API_SETTINGS, DEFAULT_SYSTEM_PROMPT, ensureValidModel } from '@/lib/types';
import { analyzeVideoWithAI } from '@/lib/aiAnalyze';
import { generateRealSubtitles } from '@/lib/transcribe';
import { encryptSecret, decryptSecret } from '@/lib/secureStorage';

export default function Page() {
  // Video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMeta>({
    title: '',
    duration: 0,
    fileName: '',
    url: null,
    width: 0,
    height: 0,
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [isGeneratingSubs, setIsGeneratingSubs] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);

  // AI
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiSettings, setApiSettings] = useState<ApiSettings>(DEFAULT_API_SETTINGS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<ClipRecommendation[]>([]);
  const [appliedClipId, setAppliedClipId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Settings
  const [typography, setTypography] = useState<TypographySettings>({
    textMode: '1 Kata (Word-by-word)',
    visualStyle: '3D Bevel Gold',
    fontFamily: 'Inter',
    fontSize: 32,
    verticalPosition: 75,
    audioEnhancer: 'Normal',
  });
  const [visualFx, setVisualFx] = useState<VisualFxSettings>({
    kenBurns: 30,
    motionPreset: 'Zoom-In Perlahan',
    horizontalMirror: true,
    noiseInjection: true,
    colorGrading: true,
    speedRamp: true,
  });
  const [audio, setAudio] = useState<AudioSettings>({
    pitchShift: 2,
    playbackSpeed: 1.0,
    eqRandomizer: false,
    bgmVolume: 30,
    voiceVolume: 80,
    bgmTrack: 'Lo-Fi Chill',
  });
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'mp4',
    quality: 'high',
    stripMetadata: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Background music — user-uploaded file, actually played and mixed in.
  const [bgmUrl, setBgmUrl] = useState<string | null>(null);
  const [bgmFileName, setBgmFileName] = useState<string | null>(null);
  const handleBgmSelect = (file: File) => {
    if (bgmUrl) URL.revokeObjectURL(bgmUrl);
    setBgmUrl(URL.createObjectURL(file));
    setBgmFileName(file.name);
  };

  // Load API settings from localStorage. The API key portion is stored
  // encrypted (see lib/secureStorage.ts) and must be decrypted here.
  useEffect(() => {
    const saved = localStorage.getItem('cutclip_api_settings');
    if (!saved) return;
    (async () => {
      try {
        const parsed = JSON.parse(saved);
        const apiKey = parsed.encryptedApiKey ? await decryptSecret(parsed.encryptedApiKey) : '';
        const merged = { ...DEFAULT_API_SETTINGS, ...parsed, apiKey };
        merged.model = ensureValidModel(merged.provider, merged.model);
        setApiSettings(merged);
      } catch {
        // ignore corrupt/incompatible saved settings
      }
    })();
  }, []);

  // Video time tracking
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, [videoMeta.url]);

  // Enforce the selected clip range: stop playback from running past
  // endTime, and don't let scrubbing/currentTime drift before startTime.
  // Loops back to startTime so the user can preview the clip repeatedly.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoMeta.url || endTime <= startTime) return;
    const onTime = () => {
      if (v.currentTime >= endTime) {
        v.currentTime = startTime;
        if (v.paused === false) v.play().catch(() => {});
      } else if (v.currentTime < startTime) {
        v.currentTime = startTime;
      }
    };
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, [startTime, endTime, videoMeta.url]);

  const handleVideoSelect = (file: File) => {
    if (videoMeta.url) URL.revokeObjectURL(videoMeta.url);
    const url = URL.createObjectURL(file);
    setVideoMeta({
      title: file.name.replace(/\.[^.]+$/, ''),
      duration: 0,
      fileName: file.name,
      url,
      width: 0,
      height: 0,
    });
    setStartTime(0);
    setEndTime(0);
    setRecommendations([]);
    setAppliedClipId(null);
  };

  const handleLoadedMetadata = (duration: number, width: number, height: number) => {
    setVideoMeta((m) => ({ ...m, duration, width, height }));
    setEndTime(duration);
  };

  const handleTimeChange = (t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = t;
    setCurrentTime(t);
  };

  const handlePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const handleMuteToggle = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  // Subtitle handlers
  const addSubtitle = () => {
    setSubtitles((prev) => [
      ...prev,
      { id: crypto.randomUUID(), start: currentTime, end: currentTime + 2, text: '' },
    ]);
  };
  const deleteSubtitle = (id: string) => setSubtitles((prev) => prev.filter((s) => s.id !== id));
  const changeSubtitle = (id: string, field: keyof SubtitleEntry, value: string | number) =>
    setSubtitles((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const generateSubs = async () => {
    if (!videoMeta.url) return;
    if (!apiSettings.apiKey) {
      setShowApiModal(true);
      return;
    }
    setIsGeneratingSubs(true);
    setSubsError(null);
    try {
      // Real speech-to-text on the actual audio of the currently selected
      // clip range (startTime → endTime), using the user's own AI provider.
      const range = endTime > startTime ? [startTime, endTime] : [0, videoMeta.duration || 8];
      const real = await generateRealSubtitles(videoMeta.url, range[0], range[1], apiSettings);
      setSubtitles(real);
    } catch (err) {
      setSubsError(err instanceof Error ? err.message : 'Gagal membuat subtitle otomatis.');
    } finally {
      setIsGeneratingSubs(false);
    }
  };

  // API settings
  const saveApiSettings = async (s: ApiSettings) => {
    setApiSettings(s);
    const encryptedApiKey = await encryptSecret(s.apiKey);
    const { apiKey: _omit, ...rest } = s;
    localStorage.setItem('cutclip_api_settings', JSON.stringify({ ...rest, encryptedApiKey }));
  };

  // AI Analysis — calls the real provider API (Gemini/OpenAI/Claude) using
  // the user's own API key, model choice and CUSTOM system prompt. Frames
  // are sampled directly from the loaded <video>, so nothing is uploaded
  // to any server other than the AI provider the user configured.
  const runAnalysis = async () => {
    if (!videoMeta.url || !videoRef.current) return;
    if (!apiSettings.apiKey) {
      setShowApiModal(true);
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const clips = await analyzeVideoWithAI(videoRef.current, apiSettings);
      setRecommendations(clips);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analisis AI gagal.');
      setRecommendations([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyClip = (clip: ClipRecommendation) => {
    setStartTime(clip.start);
    setEndTime(clip.end);
    setAppliedClipId(clip.id);
    handleTimeChange(clip.start);
  };

  // Settings updaters
  const updateTypography = (field: keyof TypographySettings, value: string | number) =>
    setTypography((p) => ({ ...p, [field]: value }));
  const updateVisualFx = (field: keyof VisualFxSettings, value: string | number | boolean) =>
    setVisualFx((p) => ({ ...p, [field]: value }));
  const updateAudio = (field: keyof AudioSettings, value: string | number | boolean) =>
    setAudio((p) => ({ ...p, [field]: value }));
  const updateExport = (field: keyof ExportSettings, value: string | boolean) =>
    setExportSettings((p) => ({ ...p, [field]: value }));

  // Voiceover recording
  const toggleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
    } catch {
      setIsRecording(false);
    }
  };

  // Export
  const handleExport = async () => {
    if (!videoMeta.url) return;
    setIsExporting(true);
    setExportProgress(0);
    // Simulated export pipeline
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 120));
      setExportProgress(i);
    }
    setIsExporting(false);
    setExportProgress(0);
  };

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-[#22242A] bg-[#0A0A0C]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500">
              <Scissors className="h-5 w-5 text-black" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-zinc-100">
                CutClip <span className="text-amber-500">AI</span>
              </h1>
              <p className="text-[10px] text-zinc-500">Client-Side Video Processing Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 sm:flex">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-400">100% Client-Side</span>
            </div>
            <div className="hidden items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 sm:flex">
              <Cpu className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] font-semibold text-amber-400">WASM Powered</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN - span 7 */}
          <div className="space-y-6 lg:col-span-7">
            <VideoPlayer
              videoUrl={videoMeta.url}
              videoTitle={videoMeta.title}
              videoWidth={videoMeta.width}
              videoHeight={videoMeta.height}
              startTime={startTime}
              endTime={endTime}
              currentTime={currentTime}
              duration={videoMeta.duration}
              isPlaying={isPlaying}
              isMuted={isMuted}
              onTimeChange={handleTimeChange}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
              onPlayPause={handlePlayPause}
              onMuteToggle={handleMuteToggle}
              onVideoSelect={handleVideoSelect}
              onLoadedMetadata={handleLoadedMetadata}
              videoRef={videoRef}
              typography={typography}
              visualFx={visualFx}
              audio={audio}
              bgmUrl={bgmUrl}
              activeSubtitleText={
                subtitles.find((s) => currentTime >= s.start && currentTime <= s.end)?.text ?? ''
              }
            />
            <SubtitleStudio
              subtitles={subtitles}
              onAdd={addSubtitle}
              onDelete={deleteSubtitle}
              onChange={changeSubtitle}
              onGenerate={generateSubs}
              isGenerating={isGeneratingSubs}
              errorMessage={subsError}
            />
          </div>

          {/* RIGHT COLUMN - span 5 */}
          <div className="lg:col-span-5">
            <div className="space-y-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto scrollbar-thin lg:pr-1 lg:pb-2">
              <AiKuratorCard
                onOpenSettings={() => setShowApiModal(true)}
                onAnalyze={runAnalysis}
                isAnalyzing={isAnalyzing}
                recommendations={recommendations}
                onApplyClip={applyClip}
                appliedClipId={appliedClipId}
                errorMessage={analysisError}
              />
              <TypographyCard settings={typography} onChange={updateTypography} />
              <VisualFxCard settings={visualFx} onChange={updateVisualFx} />
              <AudioCard
                settings={audio}
                onChange={updateAudio}
                isRecording={isRecording}
                onToggleRecord={toggleRecord}
                bgmFileName={bgmFileName}
                onBgmFileSelect={handleBgmSelect}
              />
              <ExportCard
                settings={exportSettings}
                onChange={updateExport}
                onExport={handleExport}
                isExporting={isExporting}
                exportProgress={exportProgress}
              />
            </div>
          </div>
        </div>
      </main>

      <ApiSettingsModal
        open={showApiModal}
        onClose={() => setShowApiModal(false)}
        settings={apiSettings}
        onSave={saveApiSettings}
      />
    </div>
  );
}
