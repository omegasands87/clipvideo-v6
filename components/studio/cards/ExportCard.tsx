'use client';

import { Download, FileVideo, FileCheck2, ShieldX } from 'lucide-react';
import type { ExportSettings } from '@/lib/types';

type Props = {
  settings: ExportSettings;
  onChange: (field: keyof ExportSettings, value: string | boolean) => void;
  onExport: () => void;
  isExporting: boolean;
  exportProgress: number;
};

const FORMATS = [
  { id: 'mp4', label: '.MP4 (H.264)', desc: 'Recommended for TikTok/Reels/Shorts', icon: FileVideo },
  { id: 'webm', label: '.WEBM (VP9)', desc: 'Web Optimized', icon: FileVideo },
  { id: 'mov', label: '.MOV (ProRes/RAW)', desc: 'High Quality', icon: FileVideo },
  { id: 'gif', label: '.GIF', desc: 'Animated Short Clip', icon: FileVideo },
];

export default function ExportCard({ settings, onChange, onExport, isExporting, exportProgress }: Props) {
  return (
    <div className="card-studio p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
          <Download className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Ekspor Multi-Format</h3>
          <p className="text-[10px] text-zinc-500">Metadata Eraser &amp; render</p>
        </div>
      </div>

      {/* Format */}
      <div className="space-y-1.5">
        <label className="label-sm">Export Format</label>
        <div className="grid grid-cols-2 gap-1.5">
          {FORMATS.map((f) => {
            const Icon = f.icon;
            const active = settings.format === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onChange('format', f.id)}
                className={`flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all ${
                  active
                    ? 'border-amber-500 bg-amber-500/5'
                    : 'border-[#22242A] bg-[#0A0A0C] hover:border-zinc-600'
                }`}
              >
                <span className={`flex items-center gap-1 text-xs font-bold ${active ? 'text-amber-400' : 'text-zinc-200'}`}>
                  <Icon className="h-3 w-3" /> {f.label}
                </span>
                <span className="text-[9px] text-zinc-500">{f.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quality */}
      <div className="space-y-1.5">
        <label className="label-sm">Quality</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'high', label: 'High (1080p)' },
            { id: 'medium', label: 'Medium (720p)' },
          ].map((q) => (
            <button
              key={q.id}
              onClick={() => onChange('quality', q.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all ${
                settings.quality === q.id
                  ? 'border-amber-500 bg-amber-500/5 text-amber-400'
                  : 'border-[#22242A] text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {settings.quality === q.id && <FileCheck2 className="h-3 w-3" />}
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Strip Metadata */}
      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#22242A] bg-[#0A0A0C] p-2.5 hover:border-zinc-600 transition-colors">
        <div className="relative mt-0.5">
          <input
            type="checkbox"
            checked={settings.stripMetadata}
            onChange={(e) => onChange('stripMetadata', e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-4 w-4 rounded border border-[#22242A] bg-[#0A0A0C] peer-checked:border-amber-500 peer-checked:bg-amber-500 transition-colors flex items-center justify-center">
            {settings.stripMetadata && (
              <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <ShieldX className="h-3 w-3 text-emerald-500" />
            Strip EXIF Metadata
          </p>
          <p className="text-[10px] text-zinc-500">-map_metadata -1</p>
        </div>
      </label>

      {/* Export progress */}
      {isExporting && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400">Memproses video...</span>
            <span className="text-[10px] tabular-nums text-amber-400">{exportProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#22242A]">
            <div className="h-full rounded-full progress-shine transition-all" style={{ width: `${exportProgress}%` }} />
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onExport}
        disabled={isExporting}
        className="w-full rounded-lg bg-amber-500 py-3 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors amber-glow"
      >
        {isExporting ? 'MEMPROSES...' : 'PROSES & UNDUH VIDEO SEKARANG'}
      </button>
    </div>
  );
}
