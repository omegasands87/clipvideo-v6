'use client';

import { Settings, Sparkles, TrendingUp, Eye, Repeat, Hash, Check } from 'lucide-react';
import type { ClipRecommendation } from '@/lib/types';

type Props = {
  onOpenSettings: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  recommendations: ClipRecommendation[];
  onApplyClip: (clip: ClipRecommendation) => void;
  appliedClipId: string | null;
  errorMessage?: string | null;
};

function MetricBar({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] text-zinc-400">
          <Icon className="h-3 w-3" /> {label}
        </span>
        <span className="text-[11px] font-bold tabular-nums text-zinc-200">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#22242A]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function AiKuratorCard({
  onOpenSettings,
  onAnalyze,
  isAnalyzing,
  recommendations,
  onApplyClip,
  appliedClipId,
  errorMessage,
}: Props) {
  return (
    <div className="card-studio p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Asisten Kurator AI</h3>
            <p className="text-[10px] text-zinc-500">Momen Viral</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-amber-400">
            MULTI-CLIP REF
          </span>
          <button
            onClick={onOpenSettings}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-[#22242A] hover:text-amber-400 transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors amber-glow"
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-3 w-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
            MENGANALISIS VIDEO...
          </span>
        ) : (
          'ANALYSIS MOMEN VIRAL DENGAN AI'
        )}
      </button>

      {errorMessage && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Metrics */}
      {recommendations.length > 0 && (
        <div className="space-y-2 rounded-lg bg-[#0A0A0C] p-3">
          <MetricBar icon={TrendingUp} label="Viral Score" value={recommendations[0].viralScore} color="#F59E0B" />
          <MetricBar icon={Eye} label="Engagement" value={recommendations[0].engagement} color="#10B981" />
          <MetricBar icon={Repeat} label="Retention" value={recommendations[0].retention} color="#3B82F6" />
        </div>
      )}

      {/* Hashtags */}
      {recommendations.length > 0 && recommendations[0].hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recommendations[0].hashtags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-0.5 rounded-full bg-[#22242A] px-2 py-0.5 text-[10px] text-zinc-300"
            >
              <Hash className="h-2.5 w-2.5 text-amber-500" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 ? (
        <div className="space-y-2">
          {recommendations.map((clip) => (
            <div
              key={clip.id}
              className={`rounded-lg border p-3 transition-colors ${
                appliedClipId === clip.id
                  ? 'border-amber-500 bg-amber-500/5'
                  : 'border-[#22242A] bg-[#0A0A0C]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-400">Opsi #{clip.index}</span>
                <span className="text-[10px] tabular-nums text-zinc-500">
                  {clip.start.toFixed(1)}s - {clip.end.toFixed(1)}s
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">{clip.description}</p>
              <button
                onClick={() => onApplyClip(clip)}
                className={`flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[10px] font-bold transition-colors ${
                  appliedClipId === clip.id
                    ? 'bg-amber-500 text-black'
                    : 'bg-[#22242A] text-zinc-300 hover:bg-[#2a2c33]'
                }`}
              >
                {appliedClipId === clip.id ? (
                  <>
                    <Check className="h-3 w-3" /> DITERAPKAN
                  </>
                ) : (
                  'TERAPKAN DETIK PILIHAN INI'
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-[11px] text-zinc-600 py-2">
          Belum ada rekomendasi. Jalankan analisis AI untuk menemukan momen viral.
        </p>
      )}
    </div>
  );
}
