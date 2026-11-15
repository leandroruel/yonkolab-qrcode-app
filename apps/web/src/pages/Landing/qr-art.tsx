import QRCodeStyling, { type Options } from 'qr-code-styling';
import { useEffect, useRef } from 'react';

/**
 * Demos de QR da landing. Módulo carregado sob demanda (React.lazy) para que
 * `qr-code-styling` não entre no JS inicial da landing.
 */

const BRAND_LOGO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="30" fill="#6d28d9"/>
    <path d="M36 40l28 31 28-31" fill="none" stroke="#ffffff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M64 69v25" fill="none" stroke="#ffffff" stroke-width="13" stroke-linecap="round"/>
  </svg>`,
)}`;

function QrCanvas({
  options,
  label,
  size = 240,
}: {
  options: Options;
  label: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const serialized = JSON.stringify(options);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    host.innerHTML = '';
    const qr = new QRCodeStyling({ width: size, height: size, type: 'canvas', ...options });
    qr.append(host);

    return () => {
      host.innerHTML = '';
    };
    // `serialized` captura mudanças nas opções; `size` é estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, size]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className="w-full [&>canvas]:mx-auto [&>canvas]:h-auto [&>canvas]:w-full"
    />
  );
}

/** QR do hero: logo no centro + moldura com chamada. Fixo em fundo claro. */
export function HeroQr() {
  return (
    <div className="qr-card-shadow relative rounded-[28px] bg-white p-5">
      <div className="rounded-2xl border border-neutral-200 p-4">
        <QrCanvas
          size={256}
          label="Exemplo de QR code com logo central e moldura"
          options={{
            data: 'https://yonkolab.xyz',
            margin: 6,
            qrOptions: { errorCorrectionLevel: 'H' },
            dotsOptions: { color: '#17171d', type: 'rounded' },
            cornersSquareOptions: { color: '#6d28d9', type: 'extra-rounded' },
            cornersDotOptions: { color: '#6d28d9', type: 'dot' },
            backgroundOptions: { color: '#ffffff' },
            image: BRAND_LOGO,
            imageOptions: {
              crossOrigin: 'anonymous',
              margin: 5,
              imageSize: 0.32,
              hideBackgroundDots: true,
            },
          }}
        />
      </div>
      <p className="mt-4 text-center text-[10px] font-semibold tracking-[0.34em] text-neutral-500">
        ESCANEIE-ME
      </p>
    </div>
  );
}

const SHOWCASE: Array<{
  key: string;
  caption: string;
  hint: string;
  framed?: boolean;
  options: Options;
}> = [
  {
    key: 'gradient',
    caption: 'Cores e gradientes',
    hint: 'Pontos arredondados com gradiente violeta/azul.',
    options: {
      data: 'https://yonkolab.xyz',
      margin: 6,
      qrOptions: { errorCorrectionLevel: 'Q' },
      dotsOptions: {
        type: 'rounded',
        gradient: {
          type: 'linear',
          rotation: Math.PI / 4,
          colorStops: [
            { offset: 0, color: '#7c3aed' },
            { offset: 1, color: '#2563eb' },
          ],
        },
      },
      cornersSquareOptions: { type: 'extra-rounded', color: '#4c1d95' },
      cornersDotOptions: { type: 'dot', color: '#2563eb' },
      backgroundOptions: { color: '#ffffff' },
    },
  },
  {
    key: 'frame',
    caption: 'Moldura com chamada',
    hint: 'Cartão escuro com etiqueta de ação.',
    framed: true,
    options: {
      data: 'https://yonkolab.xyz',
      margin: 4,
      dotsOptions: { type: 'extra-rounded', color: '#f4f4f7' },
      cornersSquareOptions: { type: 'extra-rounded', color: '#a78bfa' },
      cornersDotOptions: { type: 'dot', color: '#a78bfa' },
      backgroundOptions: { color: '#0b0b10' },
    },
  },
  {
    key: 'logo',
    caption: 'Logo no centro',
    hint: 'Clássico com cor de marca e logo.',
    options: {
      data: 'https://yonkolab.xyz',
      margin: 6,
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: { type: 'square', color: '#0f766e' },
      cornersSquareOptions: { type: 'square', color: '#0f766e' },
      cornersDotOptions: { type: 'square', color: '#115e59' },
      backgroundOptions: { color: '#ffffff' },
      image: BRAND_LOGO,
      imageOptions: { crossOrigin: 'anonymous', margin: 4, imageSize: 0.3, hideBackgroundDots: true },
    },
  },
];

/** Vitrine de estilos: 3 QRs reais renderizados no cliente. */
export function ShowcaseQrs() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {SHOWCASE.map((item) => (
        <figure key={item.key} className="card flex flex-col items-center gap-4 p-5">
          {item.framed ? (
            <div className="w-full max-w-[12rem] rounded-2xl bg-[#0b0b10] p-3">
              <div className="rounded-xl bg-[#0b0b10] p-1">
                <QrCanvas
                  size={200}
                  label={`Exemplo de QR code: ${item.caption}`}
                  options={item.options}
                />
              </div>
              <p className="mt-2 text-center text-[9px] font-semibold tracking-[0.28em] text-white/70">
                ABRA O MENU
              </p>
            </div>
          ) : (
            <div className="w-full max-w-[12rem] rounded-2xl bg-white p-3 shadow-sm">
              <QrCanvas
                size={200}
                label={`Exemplo de QR code: ${item.caption}`}
                options={item.options}
              />
            </div>
          )}
          <figcaption className="text-center">
            <span className="block text-sm font-semibold">{item.caption}</span>
            <span className="mt-0.5 block text-xs subtle">{item.hint}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
