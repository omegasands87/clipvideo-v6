'use client';

import { Type, Volume2 } from 'lucide-react';
import type { TypographySettings } from '@/lib/types';

type Props = {
  settings: TypographySettings;
  onChange: (field: keyof TypographySettings, value: string | number) => void;
};

const TEXT_MODES = ['1 Kata (Word-by-word)', '2-3 Kata (Phrase)', 'Full Kalimat', 'Karaoke Style'];
const VISUAL_STYLES = ['3D Bevel Gold', 'TikTok Yellow', 'Netflix White', 'Neon Glow', 'Minimal Clean', 'Bold Black Outline'];
const FONT_FAMILIES = ['Inter', 'Montserrat', 'Poppins', 'Anton', 'Bebas Neue', 'Roboto Condensed'];
const AUDIO_ENHANCERS = ['Normal', 'Vocal Pro', 'Deep Bass', 'Warmth'];

export default function TypographyCard({ settings, onChange }: Props) {
  return (
    <div className="card-studio p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
          <Type className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Gaya Tipografi Subtitle &amp; Audio</h3>
          <p className="text-[10px] text-zinc-500">Customisasi visual &amp; suara</p>
        </div>
      </div>

      {/* Dropdowns */}
      <div className="space-y-2">
        <div>
          <label className="label-sm">Text Mode</label>
          <select
            value={settings.textMode}
            onChange={(e) => onChange('textMode', e.target.value)}
            className="w-full rounded-lg border border-[#22242A] bg-[#0A0A0C] px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
          >
            {TEXT_MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-sm">Visual Style Preset</label>
          <select
            value={settings.visualStyle}
            onChange={(e) => onChange('visualStyle', e.target.value)}
            className="w-full rounded-lg border border-[#22242A] bg-[#0A0A0C] px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
          >
            {VISUAL_STYLES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-sm">Font Family</label>
          <select
            value={settings.fontFamily}
            onChange={(e) => onChange('fontFamily', e.target.value)}
            className="w-full rounded-lg border border-[#22242A] bg-[#0A0A0C] px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label-sm">Font Size (PX)</label>
            <span className="text-[11px] font-bold tabular-nums text-amber-400">{settings.fontSize}px</span>
          </div>
          <input
            type="range"
            min={12}
            max={80}
            value={settings.fontSize}
            onChange={(e) => onChange('fontSize', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label-sm">Subtitle Vertical Position</label>
            <span className="text-[11px] font-bold tabular-nums text-amber-400">{settings.verticalPosition}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.verticalPosition}
            onChange={(e) => onChange('verticalPosition', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Audio Enhancer */}
      <div className="space-y-1.5">
        <label className="label-sm flex items-center gap-1.5">
          <Volume2 className="h-3 w-3" /> Audio Enhancer
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {AUDIO_ENHANCERS.map((enh) => (
            <button
              key={enh}
              onClick={() => onChange('audioEnhancer', enh)}
              className={`rounded-md px-2 py-1.5 text-[10px] font-semibold transition-all ${
                settings.audioEnhancer === enh
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#22242A] text-zinc-400 hover:bg-[#2a2c33]'
              }`}
            >
              {enh}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
