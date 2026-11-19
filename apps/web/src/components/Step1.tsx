import type { QrType } from '@/shared/types';
import { READY_TYPES, TYPE_LABELS, TYPE_CARDS } from '@/shared/types';
import { ArrowLeft, Globe, Smartphone, Mail, Eye, Download, MessageCircle } from 'lucide-react';

export function Step1({ setType, setStep, tipoParam }: {
  setType: (t: QrType) => void;
  setStep: (s: number) => void;
  tipoParam: QrType | null;
}) {
  const tipoValido = tipoParam !== null && READY_TYPES.has(tipoParam);

  return (
    <div className="space-y-3">
      {tipoParam && !READY_TYPES.has(tipoParam) && (
        <p className="rounded-xl border border-[var(--line)] bg-[var(--brand-soft)] p-3 text-sm">
          O tipo <strong>{TYPE_LABELS[tipoParam] ?? 'Site'}</strong> chega nas próximas etapas. Por enquanto, geramos QR de Site e WhatsApp por aqui.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TYPE_CARDS.map((card) => {
          'use client';
          const Icon = card.icon === 'globe' ? Globe : card.icon === 'smartphone' ? Smartphone : card.icon === 'mail' ? Mail : card.icon === 'eye' ? Eye : card.icon === 'download' ? Download : card.icon === 'message-circle' ? MessageCircle : ArrowLeft;
          return (
            <button
              key={card.type}
              type="button"
              disabled={!card.ready}
              onClick={() => {
                if (!card.ready) return;
                setType(card.type);
                setStep(2);
              }}
              className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors ${
                card.ready
                  ? 'border-[var(--line)] bg-[var(--elevated)] hover:border-[var(--brand)]'
                  : 'border-[var(--line)]/40 bg-[var(--surface)]/50 opacity-70 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 shrink-0" />
                <span className="font-medium text-[var(--fg)]">{card.label}</span>
              </div>
              <span className="text-sm subtle">{card.sublabel}</span>
              {!card.ready && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--brand)]">
                  Em breve
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}