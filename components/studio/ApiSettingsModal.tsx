'use client';

import { useEffect, useState } from 'react';
import { X, Eye, EyeOff, Save, RotateCcw, KeyRound, Cpu, MessageSquareText } from 'lucide-react';
import type { ApiSettings } from '@/lib/types';
import { DEFAULT_SYSTEM_PROMPT, AI_PROVIDERS } from '@/lib/types';

type Props = {
  open: boolean;
  onClose: () => void;
  settings: ApiSettings;
  onSave: (s: ApiSettings) => void;
};

const PROVIDERS = AI_PROVIDERS;

export default function ApiSettingsModal({ open, onClose, settings, onSave }: Props) {
  const [local, setLocal] = useState<ApiSettings>(settings);
  const [showKey, setShowKey] = useState(false);

  // Keep the modal's local draft in sync with the saved settings
  // whenever it is (re)opened, so stale values from a previous
  // session aren't shown.
  useEffect(() => {
    if (open) {
      setLocal(settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, settings]);

  if (!open) return null;

  const currentProvider = PROVIDERS.find((p) => p.id === local.provider) ?? PROVIDERS[0];

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  const handleResetPrompt = () => {
    setLocal({ ...local, systemPrompt: DEFAULT_SYSTEM_PROMPT });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg card-studio shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#22242A] sticky top-0 bg-[#121316] z-10">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Cpu className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">AI &amp; API Key Settings</h2>
              <p className="text-[10px] text-zinc-500">Konfigurasi provider dan model AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-[#22242A] hover:text-zinc-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          {/* Provider */}
          <div className="space-y-1.5">
            <label className="label-sm flex items-center gap-1.5">
              <KeyRound className="h-3 w-3" /> AI Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setLocal({ ...local, provider: p.id, model: p.models[0] })}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    local.provider === p.id
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-[#22242A] text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="label-sm">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={local.apiKey}
                onChange={(e) => setLocal({ ...local, apiKey: e.target.value })}
                placeholder="Masukkan API key Anda..."
                className="w-full rounded-lg border border-[#22242A] bg-[#0A0A0C] px-3 py-2.5 pr-10 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">
              API Key Anda disimpan aman di browser lokal Anda (Zero Server Storage).
            </p>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <label className="label-sm">Model</label>
            <select
              value={local.model}
              onChange={(e) => setLocal({ ...local, model: e.target.value })}
              className="w-full rounded-lg border border-[#22242A] bg-[#0A0A0C] px-3 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
            >
              {currentProvider.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* System Prompt */}
          <div className="space-y-1.5">
            <label className="label-sm flex items-center gap-1.5">
              <MessageSquareText className="h-3 w-3" /> Custom System Prompt
            </label>
            <textarea
              value={local.systemPrompt}
              onChange={(e) => setLocal({ ...local, systemPrompt: e.target.value })}
              rows={5}
              className="w-full resize-none rounded-lg border border-[#22242A] bg-[#0A0A0C] px-3 py-2.5 text-xs text-zinc-200 leading-relaxed focus:border-amber-500 focus:outline-none scrollbar-thin"
            />
            <button
              onClick={handleResetPrompt}
              className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-amber-400 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to Default Prompt
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#22242A] sticky bottom-0 bg-[#121316]">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#22242A] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-[#22242A] transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
}
