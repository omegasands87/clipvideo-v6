'use client';

import { useRef } from 'react';
import { AudioWaveform, Music, Mic, Square, Upload } from 'lucide-react';
import type { AudioSettings } from '@/lib/types';

type Props = {
  settings: AudioSettings;
  onChange: (field: keyof AudioSettings, value: string | number | boolean) => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  bgmFileName?: string | null;
  onBgmFileSelect: (file: File) => void;
};

const BGM_TRACKS = ['None', 'Lo-Fi Chill', 'Epic Cinematic', 'Upbeat Pop', 'Ambient Pad'];

export default function AudioCard({
  settings,
  onChange,
  isRecording,
  onToggleRecord,
  bgmFileName,
  onBgmFileSelect,
}: Props) {
  const bgmInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="card-studio p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
          <AudioWaveform className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Audio Modification Studio</h3>
          <p className="text-[10px] text-zinc-500">Pitch, speed, BGM &amp; voiceover</p>
        </div>
      </div>

      {/* Pitch & Speed */}
      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label-sm">Pitch Shifting</label>
            <span className="text-[11px] font-bold tabular-nums text-amber-400">{settings.pitchShift}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={0.5}
            value={settings.pitchShift}
            onChange={(e) => onChange('pitchShift', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label-sm">Playback Speed</label>
            <span className="text-[11px] font-bold tabular-nums text-amber-400">{settings.playbackSpeed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={settings.playbackSpeed}
            onChange={(e) => onChange('playbackSpeed', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* EQ Randomizer */}
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#22242A] bg-[#0A0A0C] p-2.5">
        <span className="text-xs font-semibold text-zinc-200">Audio Frequency Equalizer Randomizer</span>
        <button
          onClick={() => onChange('eqRandomizer', !settings.eqRandomizer)}
          className={`relative h-5 w-9 rounded-full transition-colors ${settings.eqRandomizer ? 'bg-amber-500' : 'bg-[#22242A]'}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${settings.eqRandomizer ? 'translate-x-4' : 'translate-x-0.5'}`}
          />
        </button>
      </label>

      {/* BGM */}
      <div className="space-y-2">
        <label className="label-sm flex items-center gap-1.5">
          <Music className="h-3 w-3" /> Background Music (BGM)
        </label>
        <select
          value={settings.bgmTrack}
          onChange={(e) => onChange('bgmTrack', e.target.value)}
          className="w-full rounded-lg border border-[#22242A] bg-[#0A0A0C] px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
        >
          {BGM_TRACKS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <p className="text-[10px] text-zinc-500">
          Nama di atas hanya label preset — unggah file audio milik Anda sendiri di bawah ini agar benar-benar terdengar sebagai BGM.
        </p>
        <input
          ref={bgmInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onBgmFileSelect(f);
          }}
        />
        <button
          onClick={() => bgmInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#22242A] bg-[#0A0A0C] py-2 text-xs font-semibold text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          {bgmFileName ? bgmFileName : 'Unggah File Audio BGM'}
        </button>
        <div className="space-y-1.5">
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-zinc-500">BGM Volume</span>
              <span className="text-[10px] tabular-nums text-amber-400">{settings.bgmVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.bgmVolume}
              onChange={(e) => onChange('bgmVolume', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-zinc-500">Original Voice Volume</span>
              <span className="text-[10px] tabular-nums text-amber-400">{settings.voiceVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.voiceVolume}
              onChange={(e) => onChange('voiceVolume', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Voiceover */}
      <div className="space-y-1.5">
        <label className="label-sm flex items-center gap-1.5">
          <Mic className="h-3 w-3" /> Voiceover Recorder
        </label>
        <button
          onClick={onToggleRecord}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-colors ${
            isRecording
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-[#22242A] text-zinc-200 hover:bg-[#2a2c33]'
          }`}
        >
          {isRecording ? (
            <>
              <Square className="h-3.5 w-3.5" /> STOP RECORDING
            </>
          ) : (
            <>
              <Mic className="h-3.5 w-3.5" /> Record Microphone
            </>
          )}
        </button>
        {isRecording && (
          <div className="flex items-center justify-center gap-1.5 py-1">
            <span className="h-2 w-2 rounded-full bg-red-500 pulse-dot" />
            <span className="text-[10px] text-red-400">Merekam...</span>
          </div>
        )}
      </div>
    </div>
  );
}
