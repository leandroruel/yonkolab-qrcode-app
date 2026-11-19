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
      className={`rounded-xl border p-2 transition-colors ${
        active
          ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
          : 'border-[var(--line)] bg-[var(--elevated)] text-[var(--fg)] hover:border-[var(--brand)]'
      }`}
    >
      <div className="relative flex items-center justify-center aspect-square min-h-[120px]">
        {src ? (
          <img
            src={src}
            alt={`Moldura: ${frame.label}`}
            className="w-full h-full rounded-lg object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-lg bg-[var(--surface)] animate-pulse" />
        )}
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-medium text-[var(--fg)] whitespace-nowrap">
          {frame.label}
        </span>
      </div>
    </button>
  );
}