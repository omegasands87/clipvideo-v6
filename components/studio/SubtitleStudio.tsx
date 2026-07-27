'use client';

import { Sparkles, Plus, Trash2, Clock } from 'lucide-react';
import type { SubtitleEntry } from '@/lib/types';

type Props = {
  subtitles: SubtitleEntry[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onChange: (id: string, field: keyof SubtitleEntry, value: string | number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  errorMessage?: string | null;
};

export default function SubtitleStudio({
  subtitles,
  onAdd,
  onDelete,
  onChange,
  onGenerate,
  isGenerating,
  errorMessage,
}: Props) {
  const formatTime = (s: number) => s.toFixed(1);

  return (
    <div className="card-studio overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#22242A]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-zinc-100">Subtitle Studio Editor</span>
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          {isGenerating ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
              MEMPROSES...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              BUAT SUBTITLE AI SEKARANG
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="max-h-64 overflow-y-auto scrollbar-thin">
        {subtitles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <Clock className="h-8 w-8 text-zinc-700" />
            <p className="text-xs text-zinc-500">
              Belum ada subtitle. Klik tombol di atas untuk generate otomatis atau tambah manual.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#22242A]">
            {subtitles.map((sub) => (
              <div key={sub.id} className="flex items-start gap-2 px-4 py-2.5">
                <div className="flex gap-1 mt-1">
                  <input
                    type="number"
                    step={0.1}
                    value={formatTime(sub.start)}
                    onChange={(e) => onChange(sub.id, 'start', parseFloat(e.target.value) || 0)}
                    className="w-14 rounded border border-[#22242A] bg-[#0A0A0C] px-1.5 py-1 text-[11px] tabular-nums text-amber-400 focus:border-amber-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    step={0.1}
                    value={formatTime(sub.end)}
                    onChange={(e) => onChange(sub.id, 'end', parseFloat(e.target.value) || 0)}
                    className="w-14 rounded border border-[#22242A] bg-[#0A0A0C] px-1.5 py-1 text-[11px] tabular-nums text-amber-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={sub.text}
                  onChange={(e) => onChange(sub.id, 'text', e.target.value)}
                  placeholder="Teks subtitle..."
                  className="flex-1 rounded border border-[#22242A] bg-[#0A0A0C] px-2 py-1 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                />
                <button
                  onClick={() => onDelete(sub.id)}
                  className="mt-1 text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[#22242A] px-4 py-2.5">
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah Baris Subtitle
        </button>
      </div>
    </div>
  );
}
