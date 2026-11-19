import { composeFrame, sampleQr, framePalette } from '@/lib/qr-frames';
import type { FrameDef } from '@/lib/qr-frames';

export function FrameThumbnail({
  frame,
  dotsColor,
  bgColor,
  active,
  onSelect,
}: {
  frame: FrameDef;
  dotsColor: string;
  bgColor: string;
  active: boolean;
  onSelect: () => void;
}) {
  const s = 140;
  const qr = sampleQr(s, dotsColor);
  const palette = framePalette(dotsColor, bgColor);
  const composed = composeFrame(frame.id, {
    qr,
    s,
    caption: 'ESCANEIE-ME!',
    palette,
    uid: `thumb-${frame.id}`,
  });
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(composed.svg)}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`w-full rounded-xl border p-2 text-center transition-colors ${
        active
          ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
          : 'border-[var(--line)] bg-[var(--elevated)] text-[var(--fg)] hover:border-[var(--brand)]'
      }`}
    >
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-[var(--surface)]">
        {src ? (
          <img
            src={src}
            alt={`Moldura: ${frame.label}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="h-full w-full animate-pulse" />
        )}
      </div>
      <span className="mt-1.5 block truncate text-[10px] font-medium">{frame.label}</span>
    </button>
  );
}