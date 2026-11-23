import React, { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { Language, getTranslations } from '../core/localization';
import { GODOT_SCRIPTS } from '../godot/godotScripts';

interface GodotModalProps {
  language: Language;
  onClose: () => void;
}

export const GodotModal: React.FC<GodotModalProps> = ({ language, onClose }) => {
  const t = getTranslations(language);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const current = GODOT_SCRIPTS[selectedIdx];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl h-[86vh] flex flex-col rounded-xl border border-stone-800 bg-stone-950 text-stone-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <div>
            <h2 className="font-display text-2xl font-bold">{t.godotSource}</h2>
            <p className="text-xs text-stone-400">
              {language === 'ru'
                ? 'Строго типизированный GDScript (Godot 4.3+) — Этап 1 и Этап 2'
                : 'Strictly typed GDScript (Godot 4.3+) — Stage 1 & Stage 2'}
            </p>
          </div>
          <button
            type="button"
            aria-label={t.close}
            onClick={onClose}
            className="p-1.5 rounded-md text-stone-400 hover:text-white hover:bg-stone-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3">
          <div className="border-b md:border-b-0 md:border-r border-stone-800 overflow-y-auto p-3 space-y-1">
            {GODOT_SCRIPTS.map((file, idx) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                  idx === selectedIdx
                    ? 'bg-amber-600 text-stone-950 font-bold'
                    : 'text-stone-300 hover:bg-stone-900'
                }`}
              >
                <div className="truncate font-mono-num">{file.path}</div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    idx === selectedIdx ? 'text-stone-900' : 'text-stone-500'
                  }`}
                >
                  {file.stage}
                </div>
              </button>
            ))}
          </div>

          <div className="md:col-span-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800 bg-stone-900/50">
              <span className="font-mono-num text-xs text-stone-300 truncate">{current.path}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-stone-800 hover:bg-stone-700 text-stone-100 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono-num text-stone-200 leading-relaxed">
              <code>{current.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
