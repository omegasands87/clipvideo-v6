'use client';

import { Zap, ShieldCheck } from 'lucide-react';
import type { VisualFxSettings } from '@/lib/types';

type Props = {
  settings: VisualFxSettings;
  onChange: (field: keyof VisualFxSettings, value: string | number | boolean) => void;
};

const MOTION_PRESETS = ['Satu Frame Statis', 'Zoom-In Perlahan', 'Zoom-Out Perlahan', 'Oscillating In/Out', 'Pan Kiri ke Kanan'];

const ANTI_FEATURES: { key: keyof VisualFxSettings; label: string; desc: string }[] = [
  { key: 'horizontalMirror', label: 'Horizontal Mirroring', desc: 'Flip video secara horizontal' },
  { key: 'noiseInjection', label: 'Noise Injection Overlay', desc: '1-2% opacity noise' },
  { key: 'colorGrading', label: 'Color Grading / LUT Filters', desc: 'Filter warna sinematik' },
  { key: 'speedRamp', label: 'Dynamic Speed Ramp', desc: '0.98x - 1.05x randomizer' },
];

export default function VisualFxCard({ settings, onChange }: Props) {
  return (
    <div className="card-studio p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
          <Zap className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Visual FX Studio</h3>
          <p className="text-[10px] text-zinc-500">Anti-Content Hashing</p>
        </div>
      </div>

      {/* Ken Burns */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label-sm">Camera Auto-Zoom (Ken Burns)</label>
          <span className="text-[11px] font-bold tabular-nums text-amber-400">{settings.kenBurns}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={settings.kenBurns}
          onChange={(e) => onChange('kenBurns', parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Motion Preset */}
      <div>
        <label className="label-sm">Dynamic Motion Preset</label>
        <select
          value={settings.motionPreset}
          onChange={(e) => onChange('motionPreset', e.target.value)}
          className="w-full rounded-lg border border-[#22242A] bg-[#0A0A0C] px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
        >
          {MOTION_PRESETS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Anti-Reused Content */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span className="label-sm text-emerald-400">Anti-Reused Content Features</span>
        </div>
        <div className="space-y-1.5">
          {ANTI_FEATURES.map((feat) => (
            <label
              key={feat.key}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#22242A] bg-[#0A0A0C] p-2.5 hover:border-zinc-600 transition-colors"
            >
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={settings[feat.key] as boolean}
                  onChange={(e) => onChange(feat.key, e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-4 w-4 rounded border border-[#22242A] bg-[#0A0A0C] peer-checked:border-amber-500 peer-checked:bg-amber-500 transition-colors flex items-center justify-center">
                  {settings[feat.key] && (
                    <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">{feat.label}</p>
                <p className="text-[10px] text-zinc-500">{feat.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
