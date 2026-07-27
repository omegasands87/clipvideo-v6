'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Upload, Scissors, ScanFace, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TypographySettings, VisualFxSettings, AudioSettings } from '@/lib/types';
import { useAudioEngine } from '@/lib/audioEngine';

type Props = {
  videoUrl: string | null;
  videoTitle: string;
  videoWidth: number;
  videoHeight: number;
  startTime: number;
  endTime: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  onTimeChange: (t: number) => void;
  onStartTimeChange: (t: number) => void;
  onEndTimeChange: (t: number) => void;
  onPlayPause: () => void;
  onMuteToggle: () => void;
  onVideoSelect: (file: File) => void;
  onLoadedMetadata: (duration: number, width: number, height: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  typography: TypographySettings;
  visualFx: VisualFxSettings;
  audio: AudioSettings;
  bgmUrl: string | null;
  activeSubtitleText: string;
};

// Visual style presets for the live subtitle preview — mirrors the options
// exposed in TypographyCard so what you configure is what you see.
const SUBTITLE_STYLE_CLASSES: Record<string, string> = {
  '3D Bevel Gold':
    'text-amber-400 font-extrabold [text-shadow:_0_2px_0_#78350f,_0_4px_6px_rgba(0,0,0,0.6)]',
  'TikTok Yellow': 'text-yellow-300 font-extrabold [text-shadow:_2px_2px_0_#000,_-2px_-2px_0_#000]',
  'Netflix White': 'text-white font-bold [text-shadow:_0_2px_4px_rgba(0,0,0,0.8)]',
  'Neon Glow': 'text-fuchsia-300 font-bold [text-shadow:_0_0_8px_#e879f9,_0_0_16px_#e879f9]',
  'Minimal Clean': 'text-zinc-100 font-medium [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]',
  'Bold Black Outline': 'text-white font-black [-webkit-text-stroke:1.5px_black]',
};

function buildVideoFilterCss(colorGrading: boolean): string {
  const filters: string[] = [];
  if (colorGrading) filters.push('saturate(1.25)', 'contrast(1.08)', 'brightness(1.02)');
  return filters.join(' ');
}

export default function VideoPlayer({
  videoUrl,
  videoTitle,
  videoWidth,
  videoHeight,
  startTime,
  endTime,
  currentTime,
  duration,
  isPlaying,
  isMuted,
  onTimeChange,
  onStartTimeChange,
  onEndTimeChange,
  onPlayPause,
  onMuteToggle,
  onVideoSelect,
  onLoadedMetadata,
  videoRef,
  typography,
  visualFx,
  audio,
  bgmUrl,
  activeSubtitleText,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgmRef = useRef<HTMLAudioElement>(null);

  // Real Web Audio graph: makes Pitch Shifting / Playback Speed / Original
  // Voice Volume / EQ Randomizer actually affect the video's sound.
  useAudioEngine(videoRef, videoUrl, audio);

  // Keep the (real, uploaded) BGM track in sync with the video: same
  // play/pause state, its own volume slider, and looping under the clip.
  useEffect(() => {
    const bgm = bgmRef.current;
    const video = videoRef.current;
    if (!bgm || !video) return;
    const syncPlay = () => bgm.play().catch(() => {});
    const syncPause = () => bgm.pause();
    video.addEventListener('play', syncPlay);
    video.addEventListener('pause', syncPause);
    video.addEventListener('seeked', () => {
      bgm.currentTime = video.currentTime % (bgm.duration || 1);
    });
    return () => {
      video.removeEventListener('play', syncPlay);
      video.removeEventListener('pause', syncPause);
    };
  }, [videoRef, bgmUrl]);

  useEffect(() => {
    if (bgmRef.current) bgmRef.current.volume = audio.bgmVolume / 100;
  }, [audio.bgmVolume]);
  const [cropX, setCropX] = useState(50); // 0-100, position within the RENDERED video (not the container)
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // --- Auto face detection state ---
  const [faceDetectEnabled, setFaceDetectEnabled] = useState(false);
  const [faceDetectStatus, setFaceDetectStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const faceDetectIntervalRef = useRef<number | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onVideoSelect(file);
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0.0';
    return s.toFixed(1);
  };

  // Track container size so the crop math below can convert between
  // percentages and real pixels correctly at any window size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setContainerSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- Crop frame dragging (manual mode) ---
  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (faceDetectEnabled) return; // face tracking owns cropX while active
    e.preventDefault();
    setDragging(true);
  };

  const handleCropMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const { renderedW, offsetX } = getRenderedVideoBox(rect.width, rect.height, videoWidth, videoHeight);
      const xInVideo = e.clientX - rect.left - offsetX;
      const pct = renderedW > 0 ? (xInVideo / renderedW) * 100 : 50;
      setCropX(Math.max(0, Math.min(100, pct)));
    },
    [dragging, videoWidth, videoHeight]
  );

  const handleCropMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleCropMouseMove);
      window.addEventListener('mouseup', handleCropMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleCropMouseMove);
        window.removeEventListener('mouseup', handleCropMouseUp);
      };
    }
  }, [dragging, handleCropMouseMove, handleCropMouseUp]);

  // --- Auto face detection (client-side, via face-api.js loaded from CDN) ---
  useEffect(() => {
    if (!faceDetectEnabled || !videoUrl) {
      if (faceDetectIntervalRef.current) {
        window.clearInterval(faceDetectIntervalRef.current);
        faceDetectIntervalRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const setup = async () => {
      setFaceDetectStatus('loading');
      try {
        const w = window as unknown as { faceapi?: any };
        if (!w.faceapi) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Gagal memuat pustaka deteksi wajah.'));
            document.head.appendChild(script);
          });
        }
        const faceapi = (window as unknown as { faceapi: any }).faceapi;
        // Pinned to a specific tag instead of `@master` — `@master` can change
        // or briefly 404 underneath us, which is what was causing detection
        // to silently fail (and cropX to drift on garbage/no-op results).
        const MODEL_URL =
          'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        if (cancelled) return;
        setFaceDetectStatus('ready');

        // Require a minimum confidence AND pick the LARGEST detected face
        // (closest to camera) rather than whichever one the detector
        // returned first — this is what made the crop jump to random
        // background faces/objects before.
        const MIN_SCORE = 0.6;
        let missCount = 0;

        faceDetectIntervalRef.current = window.setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.paused || video.readyState < 2) return;
          try {
            const detections = await faceapi.detectAllFaces(
              video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: MIN_SCORE })
            );
            const valid = (detections as any[]).filter((d) => d.score >= MIN_SCORE);
            if (valid.length === 0) {
              // Don't snap anywhere on a miss — a couple of dropped frames
              // is normal; only bail out visually after sustained misses.
              missCount++;
              return;
            }
            missCount = 0;
            const largest = valid.reduce((a, b) =>
              a.box.width * a.box.height >= b.box.width * b.box.height ? a : b
            );
            const faceCenterXPct = ((largest.box.x + largest.box.width / 2) / video.videoWidth) * 100;
            const LERP_FACTOR = 0.15;
            setCropX((prev) => prev + (faceCenterXPct - prev) * LERP_FACTOR);
          } catch {
            // ignore transient detection failures
          }
        }, 300);
      } catch {
        if (!cancelled) setFaceDetectStatus('error');
      }
    };

    setup();
    return () => {
      cancelled = true;
      if (faceDetectIntervalRef.current) {
        window.clearInterval(faceDetectIntervalRef.current);
        faceDetectIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceDetectEnabled, videoUrl]);

  // --- Crop geometry, computed from the ACTUAL video aspect ratio ---
  const { renderedW, renderedH, offsetX, offsetY } = getRenderedVideoBox(
    containerSize.w,
    containerSize.h,
    videoWidth,
    videoHeight
  );
  const frameWidthPx = renderedH * (9 / 16);
  const rawLeftPx = offsetX + (cropX / 100) * renderedW - frameWidthPx / 2;
  const clampedLeftPx = Math.max(offsetX, Math.min(offsetX + renderedW - frameWidthPx, rawLeftPx));
  const frameWidthPct = containerSize.w > 0 ? (frameWidthPx / containerSize.w) * 100 : 0;
  const frameLeftPct = containerSize.w > 0 ? (clampedLeftPx / containerSize.w) * 100 : 0;
  const frameTopPct = containerSize.h > 0 ? (offsetY / containerSize.h) * 100 : 0;
  const frameHeightPct = containerSize.h > 0 ? (renderedH / containerSize.h) * 100 : 100;

  const videoFilterCss = buildVideoFilterCss(visualFx.colorGrading);
  const kenBurnsScale = 1 + (visualFx.kenBurns / 100) * 0.15;
  const subtitleStyleClass =
    SUBTITLE_STYLE_CLASSES[typography.visualStyle] ?? SUBTITLE_STYLE_CLASSES['Netflix White'];

  return (
    <div className="card-studio overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#22242A]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-amber-500 pulse-dot shrink-0" />
          <span className="text-sm font-semibold text-zinc-100 truncate">
            {videoTitle || 'Tidak ada video dimuat'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setFaceDetectEnabled((v) => !v)}
            disabled={!videoUrl}
            title="Auto Face Detection (Beta): otomatis mengikuti wajah pembicara pada bingkai 9:16"
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40',
              faceDetectEnabled
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-[#22242A] text-zinc-300 hover:bg-[#2a2c33]'
            )}
          >
            {faceDetectStatus === 'loading' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ScanFace className="h-3.5 w-3.5" />
            )}
            Deteksi Wajah {faceDetectEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Ganti Video
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {faceDetectStatus === 'error' && (
        <div className="px-4 py-1.5 text-[10px] text-red-400 bg-red-500/5 border-b border-[#22242A]">
          Gagal memuat model deteksi wajah (periksa koneksi internet). Mode manual tetap bisa dipakai.
        </div>
      )}

      {/* Video Display */}
      <div
        ref={containerRef}
        className="relative bg-black flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: '16 / 9' }}
      >
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="h-full w-full object-contain"
            style={{
              filter: videoFilterCss || undefined,
              transform: `scale(${kenBurnsScale}) ${visualFx.horizontalMirror ? 'scaleX(-1)' : ''}`,
              transition: 'transform 4s ease-out, filter 0.3s ease',
            }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              onLoadedMetadata(v.duration, v.videoWidth, v.videoHeight);
            }}
            onClick={onPlayPause}
            playsInline
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-zinc-600">
            <Upload className="h-12 w-12" />
            <p className="text-sm">Klik &quot;Ganti Video&quot; untuk memuat file video</p>
          </div>
        )}

        {bgmUrl && <audio ref={bgmRef} src={bgmUrl} loop className="hidden" />}

        {/* Noise injection overlay preview */}
        {videoUrl && visualFx.noiseInjection && (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
        )}

        {/* Live subtitle preview, positioned & styled per Typography settings */}
        {videoUrl && activeSubtitleText && (
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 max-w-[85%] text-center leading-tight"
            style={{
              top: `${typography.verticalPosition}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${Math.max(10, typography.fontSize * 0.5)}px`,
              fontFamily: typography.fontFamily,
            }}
          >
            <span className={subtitleStyleClass}>{activeSubtitleText}</span>
          </div>
        )}

        {/* 9:16 Crop Guide Overlay — sized/positioned from the video's real aspect ratio */}
        {videoUrl && containerSize.w > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${frameLeftPct}%`,
              width: `${frameWidthPct}%`,
              top: `${frameTopPct}%`,
              height: `${frameHeightPct}%`,
            }}
          >
            <div className="absolute inset-0 border-2 border-dashed border-amber-500/80 bg-black/40" />
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1">
              <div className="rounded-b-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold tracking-wider text-black whitespace-nowrap">
                BINGKAI SHORTS 9:16 {faceDetectEnabled && '· AUTO'}
              </div>
            </div>
            {[
              'top-0 left-0 border-t-2 border-l-2',
              'top-0 right-0 border-t-2 border-r-2',
              'bottom-0 left-0 border-b-2 border-l-2',
              'bottom-0 right-0 border-b-2 border-r-2',
            ].map((pos, i) => (
              <div
                key={i}
                className={cn('absolute h-5 w-5 border-amber-400', pos)}
                style={{ borderColor: '#FBBF24' }}
              />
            ))}
            {!faceDetectEnabled && (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-ew-resize"
                onMouseDown={handleCropMouseDown}
              >
                <div className="flex h-10 w-8 items-center justify-center rounded-md bg-amber-500/90 text-black shadow-lg">
                  <Scissors className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3 px-4 py-3">
        {/* Timeline */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] tabular-nums text-zinc-500 w-10">{formatTime(currentTime)}s</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => onTimeChange(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-[10px] tabular-nums text-zinc-500 w-10 text-right">{formatTime(duration)}s</span>
          </div>
          {/* Clip range highlight */}
          <div className="relative h-1 rounded-full bg-[#22242A]">
            <div
              className="absolute h-full rounded-full bg-amber-500/40"
              style={{
                left: `${duration ? (startTime / duration) * 100 : 0}%`,
                width: `${duration ? ((endTime - startTime) / duration) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Buttons + Time inputs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPlayPause}
            disabled={!videoUrl}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <button
            onClick={onMuteToggle}
            disabled={!videoUrl}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22242A] text-zinc-300 hover:bg-[#2a2c33] disabled:opacity-40 transition-colors"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <div className="flex flex-col">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Mulai Detik</label>
              <input
                type="number"
                min={0}
                max={duration || 0}
                step={0.1}
                value={startTime.toFixed(1)}
                onChange={(e) => onStartTimeChange(parseFloat(e.target.value) || 0)}
                className="w-20 rounded-md border border-[#22242A] bg-[#0A0A0C] px-2 py-1 text-xs text-amber-400 tabular-nums focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Selesai Detik</label>
              <input
                type="number"
                min={0}
                max={duration || 0}
                step={0.1}
                value={endTime.toFixed(1)}
                onChange={(e) => onEndTimeChange(parseFloat(e.target.value) || 0)}
                className="w-20 rounded-md border border-[#22242A] bg-[#0A0A0C] px-2 py-1 text-xs text-amber-400 tabular-nums focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Computes where the video actually renders inside a `object-contain`
 * container of size (containerW, containerH), given the video's natural
 * (videoW, videoH). Falls back sanely when the video's dimensions aren't
 * known yet (e.g. metadata hasn't loaded).
 */
function getRenderedVideoBox(
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number
): { renderedW: number; renderedH: number; offsetX: number; offsetY: number } {
  if (!containerW || !containerH) {
    return { renderedW: 0, renderedH: 0, offsetX: 0, offsetY: 0 };
  }
  const videoAspect = videoW > 0 && videoH > 0 ? videoW / videoH : containerW / containerH;
  const containerAspect = containerW / containerH;

  let renderedW: number;
  let renderedH: number;
  if (videoAspect > containerAspect) {
    renderedW = containerW;
    renderedH = containerW / videoAspect;
  } else {
    renderedH = containerH;
    renderedW = containerH * videoAspect;
  }
  const offsetX = (containerW - renderedW) / 2;
  const offsetY = (containerH - renderedH) / 2;
  return { renderedW, renderedH, offsetX, offsetY };
}
