import {
  FRAMES,
  COLOR_PRESETS,
  frameById,
  framePalette,
  composeFrame,
  sampleQr,
  type FrameDef,
} from '@/lib/qr-frames';
import { FrameThumbnail } from '@/components/FrameThumbnail';

export function Step3({
  step,
  setStep,
  qrDataUrl,
  setQrDataUrl,
  color,
  setColor,
  bgColor,
  setBgColor,
  margin,
  setMargin,
  frameId,
  setFrameId,
  frameCaption,
  setFrameCaption,
  level2Tab,
  setLevel2Tab,
  loading,
  contentValid,
}: {
  step: number;
  setStep: (s: number) => void;
  qrDataUrl: string | null;
  setQrDataUrl: (u: string) => void;
  color: string;
  setColor: (c: string) => void;
  bgColor: string;
  setBgColor: (b: string) => void;
  margin: number;
  setMargin: (m: number) => void;
  frameId: string;
  setFrameId: (f: string) => void;
  frameCaption: string;
  setFrameCaption: (f: string) => void;
  level2Tab: string;
  setLevel2Tab: (t: string) => void;
  loading: boolean;
  contentValid: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,736px)_1px_340px]">
      <div className="space-y-4">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {['custom', 'brand', 'ai'].map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={level2Tab === tab}
              onClick={() => setLevel2Tab(tab)}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                level2Tab === tab
                  ? 'border-b-[var(--brand)] border-b-2 text-[var(--fg)] bg-[var(--brand-soft)]'
                  : 'border-transparent text-[var(--muted)] opacity-60 cursor-not-allowed'
              }`}
            >
              {tab === 'custom' ? 'Designs personalizadas' : tab === 'brand' ? 'Designs com sua marca' : 'Designs com IA'}
              {tab === 'brand' && <span className="ml-1 inline-flex items-center gap-1 rounded border border-[var(--brand)] px-1.5 py-0.5 text-[var(--brand)] text-[10px]">Em breve</span>}
            </button>
          ))}
        </div>

        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {['geral', 'personalizacao', 'senha', 'agendamento'].map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={level2Tab === tab}
              onClick={() => setLevel2Tab(tab)}
              className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                level2Tab === tab
                  ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                  : 'border-transparent text-[var(--muted)] opacity-60 cursor-not-allowed'
              }`}
            >
              {tab === 'geral' ? 'Geral' : tab === 'personalizacao' ? 'Personalização' : tab === 'senha' ? 'Senha' : 'Agendamento'}
              {tab === 'senha' && <span className="ml-1 inline-flex items-center gap-1 rounded border border-[var(--brand)] px-1 py-0 text-[var(--brand)] text-[10px]">Em breve</span>}
              {tab === 'agendamento' && <span className="ml-1 inline-flex items-center gap-1 rounded border border-[var(--brand)] px-1 py-0 text-[var(--brand)] text-[10px]">Em breve</span>}
            </button>
          ))}
        </div>

        {level2Tab === 'personalizacao' && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--muted)]">
              Escolha a moldura. Ela será aplicada na pré-visualização e no arquivo baixado.
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
              {FRAMES.map((frame) => (
                <FrameThumbnail
                  key={frame.id}
                  frame={frame}
                  dotsColor={color}
                  bgColor={bgColor}
                  active={frameId === frame.id}
                  onSelect={() => setFrameId(frame.id)}
                />
              ))}
            </div>
          </div>
        )}

        {level2Tab === 'geral' && (
          <div className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4">
            <h2 className="text-sm font-semibold text-[var(--fg)]">Geral</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--fg)]">Cor dos módulos</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-[var(--line)]"
                  />
                  <input
                    type="text"
                    value={color.replace('#', '')}
                    onChange={(e) => {
                      const v = e.target.value.replace('#', '');
                      setColor('#' + v);
                    }}
                    className="w-full rounded-md border border-[var(--line)] px-2 py-1.5 text-xs focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                    placeholder="000000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--fg)]">Cor de fundo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-[var(--line)]"
                  />
                  <input
                    type="text"
                    value={bgColor.replace('#', '')}
                    onChange={(e) => {
                      const v = e.target.value.replace('#', '');
                      setBgColor('#' + v);
                    }}
                    className="w-full rounded-md border border-[var(--line)] px-2 py-1.5 text-xs focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                    placeholder="ffffff"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--fg)]">
                  Margem (módulos)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={6}
                    step={1}
                    value={String(margin)}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full accent-[var(--brand)]"
                  />
                  <span className="text-xs text-[var(--muted)]">2</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="mb-1 block text-xs font-medium text-[var(--fg)]">Logotipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {/* setLogoMode */}}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                      /* logoMode === 'nenhum' */ 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
                    }`}
                  >
                    Nenhum
                  </button>
                  <button
                    type="button"
                    onClick={() => {/* setLogoMode */}}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                      /* logoMode === 'enviar' */ 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
                    }`}
                  >
                    Enviar logo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-[var(--fg)] uppercase tracking-wider">
              Predefinições de cores
            </h3>
            <span className="text-[10px] text-[var(--muted)]">Clique para aplicar</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => {
              'use client';
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setColor(preset.dots);
                    setBgColor(preset.bg);
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-md border p-1.5 transition-colors ${
                    color === preset.dots && bgColor === preset.bg
                      ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
                      : 'border-[var(--line)] bg-[var(--elevated)] text-[var(--fg)] hover:border-[var(--brand)]'
                  }`}
                >
                  <div className="flex gap-1">
                    <div
                      className="w-5 h-5 rounded-sm border border-[var(--line)]"
                      style={{ backgroundColor: preset.bg, borderColor: preset.bg === '#ffffff' ? '#cbd5e1' : 'transparent' }}
                    />
                    <div
                      className="w-5 h-5 rounded-sm border border-[var(--line)]"
                      style={{ backgroundColor: preset.dots }}
                    />
                    <div
                      className="w-5 h-5 rounded-sm border border-[var(--line)]"
                      style={{ backgroundColor: preset.bg, borderColor: preset.bg === '#ffffff' ? '#cbd5e1' : 'transparent' }}
                    />
                  </div>
                  <span className="text-[10px] font-medium">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hidden lg:block w-px bg-[var(--line)] self-stretch" />

      <div className="space-y-4 lg:sticky lg:top-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--fg)]">Pré-visualização</h2>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4 aspect-square max-w-[320px] mx-auto">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Pré-visualização do QR code"
              className="w-full max-w-xs rounded"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-xs subtle">Pré-visualização aparecerá aqui</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-center gap-1">
            {contentValid ? (
              <span
                className="inline-flex items-center gap-1 rounded border border-[var(--brand)] px-2 py-0.5 text-[var(--brand)] text-[10px] font-medium"
              >
                ✓ Leitura verificada
              </span>
            ) : (
              <span className="text-xs text-[var(--muted)]">Complete o conteúdo no passo 2</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}