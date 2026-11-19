import { STEPS } from '@/shared/types';

export function Stepper({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s) => {
        'use client';
        const active = step === s.n;
        const done = step > s.n;
        return (
          <li key={s.label} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                active || done ? 'bg-[var(--brand)] text-white' : 'bg-[var(--surface)] subtle'
              }`}
            >
              {done ? '✓' : s.n}
            </span>
            <span className={`text-sm ${active ? 'font-medium text-[var(--fg)]' : 'subtle'}`}>
              {s.label}
            </span>
            {s.n < STEPS.length && <span className="h-px flex-1 bg-[var(--surface)]" />}
          </li>
        );
      })}
    </ol>
  );
}