import React, { useState } from 'react';
import { X, Sparkles, MessageSquareQuote, ShieldCheck, ChevronRight } from 'lucide-react';
import { AmareNPCData } from '../game/types.ts';
import { sound } from '../game/audio.ts';

interface AmareDialogueModalProps {
  npc: AmareNPCData | null;
  onClose: () => void;
  onReceiveBuff: (buffName: string) => void;
}

export const AmareDialogueModal: React.FC<AmareDialogueModalProps> = ({
  npc,
  onClose,
  onReceiveBuff,
}) => {
  const [dialogueIndex, setDialogueIndex] = useState(0);

  if (!npc) return null;

  const currentLine = npc.dialogue[dialogueIndex] || npc.dialogue[0];
  const isLastLine = dialogueIndex >= npc.dialogue.length - 1;

  const handleNext = () => {
    if (!isLastLine) {
      setDialogueIndex((prev) => prev + 1);
      sound.playDoorSlide();
    } else {
      handleAcceptBuff();
    }
  };

  const handleAcceptBuff = () => {
    sound.playHackSuccess();
    onReceiveBuff(npc.buffName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm select-none">
      <div className="w-full max-w-xl bg-slate-900 border-2 rounded-xl shadow-2xl overflow-hidden text-slate-100 font-sans" style={{ borderColor: npc.color }}>
        {/* Header with Anime/Cyberpunk Character Crest */}
        <div className="flex items-center justify-between p-5 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-slate-950 font-bold font-mono text-lg shadow-lg"
              style={{ backgroundColor: npc.color }}
            >
              {npc.name[0]}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-base text-white">{npc.name}</h3>
                <span
                  className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `${npc.color}25`, color: npc.color }}
                >
                  {npc.epithet}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">{npc.role} · {npc.sanctuaryName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dialogue Body */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-950/70 p-4 rounded-lg border border-slate-800/80 flex items-start gap-3">
            <MessageSquareQuote className="w-5 h-5 shrink-0 mt-0.5" style={{ color: npc.color }} />
            <p className="text-sm font-sans text-slate-200 leading-relaxed italic">
              "{currentLine}"
            </p>
          </div>

          {/* Lore Context Pill */}
          <div className="text-xs text-slate-400 leading-relaxed border-l-2 pl-3" style={{ borderColor: npc.color }}>
            {npc.lore}
          </div>

          {/* Tactical Resonance Buff Offer */}
          <div className="p-3.5 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: npc.color }} />
              <div>
                <span className="font-mono font-bold text-xs text-white block">
                  Resonance Gift: {npc.buffName}
                </span>
                <span className="text-xs text-slate-400 block">
                  {npc.buffDescription}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-950/80 border-t border-slate-800">
          <span className="text-xs font-mono text-slate-500">
            Transmission {dialogueIndex + 1} of {npc.dialogue.length}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer transition"
            >
              Later
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded font-mono text-xs font-bold text-slate-950 transition cursor-pointer active:scale-95 shadow-md"
              style={{ backgroundColor: npc.color }}
            >
              {isLastLine ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Channel Resonance Buff</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
