import QRCodeStyling from 'qr-code-styling';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Copy,
  Download,
  Eye,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  Share,
  Smartphone,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthModal } from '@/components/AuthModal';
import { defineStepper } from '@stepperize/react/headless';
import { FrameThumbnail } from '@/components/FrameThumbnail';
import { COLOR_PRESETS, FRAMES, composeFrame, framePalette } from '@/lib/qr-frames';

const qrFlow = defineStepper([
  { id: 'tipo', title: 'Escolha o tipo de QR' },
  { id: 'conteudo', title: 'Criar conteúdo' },
  { id: 'moldura', title: 'Moldura' },
  { id: 'personalizar', title: 'Personalizar e baixar' },
]);

type QrStepId = 'tipo' | 'conteudo' | 'moldura' | 'personalizar';

const QR_STEP_IDS: readonly QrStepId[] = ['tipo', 'conteudo', 'moldura', 'personalizar'];

function stepIdFromParam(passoParam: string | null, tipoValido: boolean): QrStepId {
  const parsed = passoParam ? Number(passoParam) : NaN;
  if (Number.isFinite(parsed)) {
    const n = Math.min(Math.max(Math.trunc(parsed), 1), QR_STEP_IDS.length);
    return QR_STEP_IDS[n - 1] ?? 'tipo';
  }
  return tipoValido ? 'conteudo' : 'tipo';
}

type QrType =
  | 'site'
  | 'whatsapp'
  | 'vcard'
  | 'pix'
  | 'texto'
  | 'wifi'
  | 'email';

const DRAFT_KEY = 'yonkolab:qr-draft';

type QrDraft = {
  step?: number;
  tipo?: string;
  url?: string;
  name?: string;
  country?: string;
  phone?: string;
  message?: string;
  color?: string;
  bgColor?: string;
  margin?: number;
  qrShape?: string;
  cornerShape?: string;
  dotShape?: string;
  cornerColorMode?: string;
  cornerColor?: string;
  logoMode?: string;
  logoSize?: number;
  level1Tab?: string;
  level2Tab?: string;
  frameId?: string;
  frameCaption?: string;
};

function readQrDraft(): QrDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as QrDraft) : null;
  } catch {
    return null;
  }
}

const READY_TYPE_LIST = ['site', 'whatsapp'] as const;
const LOGO_MODES = ['nenhum', 'enviar'] as const;
const CORNER_COLOR_MODES = ['igual', 'personalizada'] as const;
const QR_SHAPE_VALUES = ['square', 'rounded', 'circle'] as const;
const CORNER_DOT_VALUES = [
  'square',
  'rounded',
  'circle',
  'top-left-rounded',
  'bottom-right-rounded',
] as const;
const LEVEL1_VALUES = ['custom', 'brand', 'ai'] as const;
const LEVEL2_VALUES = ['geral', 'personalizacao', 'senha', 'agendamento'] as const;

const asStr = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : undefined;
const asNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const asOneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

// getRawData('svg') devolve uma data URL (base64), não o markup SVG.
async function coerceSvgMarkup(raw: unknown): Promise<string | null> {
  let text: string | null = null;
  if (typeof raw === 'string') text = raw;
  else if (raw instanceof Blob) text = await raw.text();
  else if (raw != null) text = String(raw);
  if (!text) return null;
  if (text.startsWith('data:')) {
    const comma = text.indexOf(',');
    if (comma === -1) return null;
    const meta = text.slice(0, comma);
    const body = text.slice(comma + 1);
    if (meta.includes(';base64')) {
      try {
        const bin = atob(body);
        const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
        text = new TextDecoder().decode(bytes);
      } catch {
        return null;
      }
    } else {
      text = decodeURIComponent(body);
    }
  }
  const markup = text.replace(/^\s*<\?xml[\s\S]*?\?>/, '');
  return markup.includes('<svg') ? markup : null;
}

/** Tipos que o gerador já entrega conteúdo neste passo da entrega. */
const READY_TYPES = new Set<QrType>(['site', 'whatsapp']);

const TYPE_LABELS: Record<QrType, string> = {
  site: 'Site / URL',
  whatsapp: 'WhatsApp',
  vcard: 'vCard',
  pix: 'PIX',
  texto: 'Texto',
  wifi: 'Wi-Fi',
  email: 'E-mail',
};

type TypeCard = {
  type: QrType;
  label: string;
  sublabel: string;
  ready: boolean;
  icon: React.ElementType;
};

const TYPE_CARDS: TypeCard[] = [
  { type: 'site', label: TYPE_LABELS.site, sublabel: 'Abra um link ao escanear', ready: true, icon: Globe },
  {
    type: 'whatsapp',
    label: TYPE_LABELS.whatsapp,
    sublabel: 'Inicie uma conversa',
    ready: true,
    icon: Smartphone,
  },
  { type: 'vcard', label: TYPE_LABELS.vcard, sublabel: 'Salve um contato na agenda', ready: false, icon: Mail },
  { type: 'pix', label: TYPE_LABELS.pix, sublabel: 'Pague com chave Pix', ready: false, icon: Eye },
  { type: 'texto', label: TYPE_LABELS.texto, sublabel: 'Mostre qualquer texto curto', ready: false, icon: Download },
  { type: 'wifi', label: TYPE_LABELS.wifi, sublabel: 'Conecte à rede Wi-Fi', ready: false, icon: MessageCircle },
  { type: 'email', label: TYPE_LABELS.email, sublabel: 'Abra um e-mail pronto', ready: false, icon: ArrowLeft },
];

type Level1Tab = {
  key: 'custom' | 'brand' | 'ai';
  label: string;
  disabled: boolean;
  soon: boolean;
};

const LEVEL1_TABS: Level1Tab[] = [
  { key: 'custom', label: 'Designs personalizados', disabled: false, soon: false },
  { key: 'brand', label: 'Designs com sua marca', disabled: false, soon: false },
  { key: 'ai', label: 'Designs com IA', disabled: true, soon: true },
];

type Level2Tab = {
  key: 'geral' | 'personalizacao' | 'senha' | 'agendamento';
  label: string;
  disabled: boolean;
  soon: boolean;
};

const LEVEL2_TABS: Level2Tab[] = [
  { key: 'geral', label: 'Geral', disabled: false, soon: false },
  { key: 'personalizacao', label: 'Personalização', disabled: false, soon: false },
  { key: 'senha', label: 'Senha', disabled: true, soon: true },
  { key: 'agendamento', label: 'Agendamento', disabled: true, soon: true },
];

const SHAPE_LABELS: Record<string, string> = {
  square: 'Quadrado',
  rounded: 'Arredondado',
  circle: 'Circular',
  dots: 'Pontos',
  classy: 'Clássico',
  'classy-rounded': 'Clássico arredondado',
  'extra-rounded': 'Extra arredondado',
  'top-left-rounded': 'Topo esquerda',
  'bottom-right-rounded': 'Bottom direita',
};

type ShapeOption = 'square' | 'rounded' | 'circle' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded';

function ShapeThumb({ value, active, label, onClick }: { value: ShapeOption; active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border p-2 transition-colors ${
        active
          ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
          : 'border-[var(--line)] bg-[var(--elevated)] text-[var(--fg)] hover:border-[var(--brand)]'
      }`}
    >
      <span className="text-lg" aria-hidden>{shapeIcon(value)}</span>
      <span className="w-full truncate text-center text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}

function shapeIcon(value: ShapeOption): string {
  switch (value) {
    case 'square':
      return '■';
    case 'dots':
      return '⬢';
    case 'rounded':
      return '◐';
    case 'classy':
      return '◑';
    case 'classy-rounded':
      return '◒';
    case 'extra-rounded':
      return '●';
    default:
      return '■';
  }
}

/** Painel de Personalização (seção 6 do prompt). */
function PersonalizationPanel({
  qrShape,
  setQrShape,
  cornerShape,
  setCornerShape,
  dotShape,
  setDotShape,
  color,
  setColor,
  cornerColor,
  setCornerColor,
  cornerColorMode,
  setCornerColorMode,
  _qrOptions,
  buildQrDataUrl,
  setQrDataUrl,
  loading,
}: {
  qrShape: string;
  setQrShape: (s: string) => void;
  cornerShape: string;
  setCornerShape: (s: string) => void;
  dotShape: string;
  setDotShape: (s: string) => void;
  color: string;
  setColor: (s: string) => void;
  cornerColor: string;
  setCornerColor: (s: string) => void;
  cornerColorMode: string;
  setCornerColorMode: (s: string) => void;
  _qrOptions: Record<string, unknown>;
  buildQrDataUrl: () => Promise<string | null>;
  setQrDataUrl: (u: string) => void;
  loading: boolean;
}) {
  const QR_SHAPES: ShapeOption[] = ['square', 'dots', 'rounded', 'classy'];
  const CORNER_SHAPES: ShapeOption[] = ['square', 'rounded', 'circle', 'extra-rounded'];
  const DOT_SHAPES: ShapeOption[] = ['square', 'rounded', 'circle', 'extra-rounded'];

  const regenerate = useCallback(async () => {
    const dataUrl = await buildQrDataUrl();
    if (dataUrl) setQrDataUrl(dataUrl);
  }, [buildQrDataUrl, setQrDataUrl]);

  return (
    <div className="space-y-3 rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4">
      <h2 className="text-sm font-semibold text-[var(--fg)]">Personalização</h2>

      {/* 6.1 Formato do QR */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--fg)] uppercase tracking-wider">Formato do QR</label>
        <div className="flex flex-wrap gap-2">
          {QR_SHAPES.map((shape) => (
            <ShapeThumb
              key={shape}
              value={shape}
              active={qrShape === shape}
              label={SHAPE_LABELS[shape] ?? shape}
              onClick={() => {
                setQrShape(shape);
                void regenerate();
              }}
            />
          ))}
        </div>
      </div>

      {/* 6.2 Formato do quadrado do canto */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--fg)] uppercase tracking-wider">Formato do quadrado do canto</label>
          <div className="grid grid-cols-2 gap-2">
            {CORNER_SHAPES.map((shape) => (
              <ShapeThumb
                key={shape}
                value={shape}
                active={cornerShape === shape}
                label={SHAPE_LABELS[shape] ?? shape}
                onClick={() => {
                  setCornerShape(shape);
                  void regenerate();
                }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--fg)] uppercase tracking-wider">Formato do ponto do canto</label>
          <div className="grid grid-cols-2 gap-2">
            {DOT_SHAPES.map((shape) => (
              <ShapeThumb
                key={shape}
                value={shape}
                active={dotShape === shape}
                label={SHAPE_LABELS[shape] ?? shape}
                onClick={() => {
                  setDotShape(shape);
                  void regenerate();
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 6.4 Cor dos quadrados dos cantos */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--fg)] uppercase tracking-wider">Cor dos quadrados dos cantos</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCornerColorMode('igual')}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
              cornerColorMode === 'igual'
                ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
                : 'border-[var(--line)] bg-[var(--elevated)] text-[var(--fg)] hover:border-[var(--brand)]'
            }`}
          >
            Igual ao QR
          </button>
          <button
            type="button"
            onClick={() => setCornerColorMode('personalizada')}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
              cornerColorMode === 'personalizada'
                ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
                : 'border-[var(--line)] bg-[var(--elevated)] text-[var(--fg)] hover:border-[var(--brand)]'
            }`}
          >
            Personalizada
          </button>
        </div>
        {cornerColorMode === 'personalizada' && (
          <div className="space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--muted)]">Quadrado externo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cornerColor}
                    onChange={(e) => setCornerColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-[var(--line)]"
                  />
                  <input
                    type="text"
                    value={cornerColor.replace('#', '')}
                    onChange={(e) => {
                      const v = e.target.value.replace('#', '');
                      setCornerColor('#' + v);
                    }}
                    className="w-full rounded-md border border-[var(--line)] px-2 py-1.5 text-xs focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                    placeholder="000000"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--muted)]">Ponto interno</label>
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
            </div>
          </div>
        )}
      </div>

      {/* Rodapé do painel: atualizar */}
      <div className="mt-3 pt-2 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={regenerate}
          disabled={loading}
          className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm font-medium transition-colors hover:border-[var(--brand)] disabled:opacity-50"
        >
          {loading ? 'Atualizando…' : 'Aplicar estilo'}
        </button>
      </div>
    </div>
  );
}

export default function GeneratorPage() {
  // `?tipo=` vem dos cards da landing; tipos prontos pulam direto ao passo 2.
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get('tipo');
  const tipoValido =
    tipoParam !== null && READY_TYPES.has(tipoParam as QrType);
  const passoParam = searchParams.get('passo');
  const retomar = searchParams.get('retomar') === '1';
  const [initialDraft] = useState<QrDraft | null>(() =>
    retomar ? readQrDraft() : null,
  );

  const [type, setType] = useState<QrType>(
    asOneOf(initialDraft?.tipo, READY_TYPE_LIST) ??
      ((tipoParam ?? 'site') === 'whatsapp' ? 'whatsapp' : 'site'),
  );
  const stepper = qrFlow.useStepper({
    snapshot: { step: stepIdFromParam(passoParam, tipoValido) },
  });
  const step = stepper.index + 1;

  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check authentication status on mount: sessão real do worker
  // (cookie httpOnly via /auth/me) + marcador demo em localStorage.
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/qrcode/api/auth/me');
        if (res.ok) {
          const me = (await res.json()) as { name?: string; email?: string };
          localStorage.setItem('yonkolab_auth', 'authenticated');
          localStorage.setItem('yonkolab_user', JSON.stringify(me));
          setIsAuthenticated(true);
          return;
        }
      } catch {
        // Worker fora do ar em dev: cai no marcador local abaixo.
      }
      const session = localStorage.getItem('yonkolab_auth');
      setIsAuthenticated(!!session);
    };
    void checkAuth();
  }, []);

  // Conteúdo (passo 2)
  const [url, setUrl] = useState(asStr(initialDraft?.url) ?? '');
  const [name, setName] = useState(asStr(initialDraft?.name) ?? 'Meu QR code');
  const [country, setCountry] = useState(asStr(initialDraft?.country) ?? '55');
  const [phone, setPhone] = useState(asStr(initialDraft?.phone) ?? '');
  const [message, setMessage] = useState(asStr(initialDraft?.message) ?? '');

  // Estilo (passo 3)
  const [color, setColor] = useState(asStr(initialDraft?.color) ?? '#111111');
  const [bgColor, setBgColor] = useState(asStr(initialDraft?.bgColor) ?? '#ffffff');
  const [margin, setMargin] = useState(asNum(initialDraft?.margin) ?? 2);
  const [logoMode, setLogoMode] = useState<'nenhum' | 'enviar'>(
    asOneOf(initialDraft?.logoMode, LOGO_MODES) ?? 'nenhum',
  );
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(asNum(initialDraft?.logoSize) ?? 20);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [qrShape, setQrShape] = useState<'square' | 'rounded' | 'circle'>(
    asOneOf(initialDraft?.qrShape, QR_SHAPE_VALUES) ?? 'square',
  );
  const [cornerShape, setCornerShape] = useState<'square' | 'rounded' | 'circle' | 'top-left-rounded' | 'bottom-right-rounded'>(
    asOneOf(initialDraft?.cornerShape, CORNER_DOT_VALUES) ?? 'square',
  );
  const [dotShape, setDotShape] = useState<'square' | 'rounded' | 'circle' | 'top-left-rounded' | 'bottom-right-rounded'>(
    asOneOf(initialDraft?.dotShape, CORNER_DOT_VALUES) ?? 'square',
  );
  const [cornerColorMode, setCornerColorMode] = useState<'igual' | 'personalizada'>(
    asOneOf(initialDraft?.cornerColorMode, CORNER_COLOR_MODES) ?? 'igual',
  );
  const [cornerColor, setCornerColor] = useState(asStr(initialDraft?.cornerColor) ?? '#111111');

  // Estado do passo 3 (casca — painéis preenchidos nas fatias seguintes)
  const [level1Tab, setLevel1Tab] = useState<'custom' | 'brand' | 'ai'>(
    asOneOf(initialDraft?.level1Tab, LEVEL1_VALUES) ?? 'custom',
  );
  const [level2Tab, setLevel2Tab] = useState<'geral' | 'personalizacao' | 'senha' | 'agendamento'>(
    asOneOf(initialDraft?.level2Tab, LEVEL2_VALUES) ?? 'personalizacao',
  );

  // Moldura (passo 3)
  const [frameId, setFrameId] = useState(asStr(initialDraft?.frameId) ?? 'none');
  const [frameCaption, setFrameCaption] = useState(asStr(initialDraft?.frameCaption) ?? 'Escaneie-me!');
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  // Mantém um rascunho local para o CTA "Continuar meu QR Code" da landing
  // e para restaurar as escolhas após o cadastro.
  useEffect(() => {
    if (step < 2) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          step,
          tipo: type,
          url,
          name,
          country,
          phone,
          message,
          color,
          bgColor,
          margin,
          qrShape,
          cornerShape,
          dotShape,
          cornerColorMode,
          cornerColor,
          logoMode,
          logoSize,
          level1Tab,
          level2Tab,
          frameId,
          frameCaption,
        }),
      );
    } catch {
      // localStorage indisponível: sem rascunho nesta sessão.
    }
  }, [
    step, type, url, name, country, phone, message, color, bgColor, margin,
    qrShape, cornerShape, dotShape, cornerColorMode, cornerColor, logoMode,
    logoSize, level1Tab, level2Tab, frameId, frameCaption,
  ]);


  const payload = useMemo(() => {
    if (type === 'whatsapp') {
      const digits = `${country}${phone}`.replace(/\D/g, '');
      const text = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : '';
      return `https://wa.me/${digits}${text}`;
    }
    return url.trim();
  }, [type, country, phone, message, url]);

  const contentValid = useMemo(() => {
    if (!payload) return false;
    if (type === 'whatsapp') return phone.length > 0;
    return url.length > 0;
  }, [payload, type, url, phone]);

  const mapShape = (s: string): 'square' | 'rounded' | 'circle' => {
    switch (s) {
      case 'square':
        return 'square';
      case 'rounded':
        return 'rounded';
      case 'circle':
        return 'circle';
      default:
        return 'rounded';
    }
  };

  const _qrOptions = useMemo<Record<string, unknown>>(() => {
    const dotsType = mapShape(qrShape);
    const cornerType = mapShape(cornerShape);
    const dotType = mapShape(dotShape);
    const effectiveColor = cornerColorMode === 'personalizada' ? cornerColor : color;
    const opts: Record<string, unknown> = {
      width: 512,
      height: 512,
      type: 'canvas',
      data: payload,
      margin,
      qrOptions: { errorCorrectionLevel: 'Q' },
      dotsOptions: { color, type: dotsType },
      cornersSquareOptions: { color: effectiveColor, type: cornerType },
      cornersDotOptions: { color: effectiveColor, type: dotType },
      backgroundOptions: { color: bgColor },
    };
    if (logoMode === 'enviar' && logoImage) {
      opts.imageOptions = {
        image: logoImage,
        size: logoSize / 100,
        margin: 2,
      };
    }
    return opts;
  }, [payload, margin, color, bgColor, logoMode, logoImage, logoSize, qrShape, cornerShape, dotShape, cornerColorMode, cornerColor]);

  const buildQrDataUrl = useCallback(async (): Promise<string | null> => {
    if (!payload) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = new QRCodeStyling(_qrOptions as any);
    const blob = await instance.getRawData('png');
    if (!(blob instanceof Blob)) return null;
    const reader = new FileReader();
    return new Promise<string | null>((resolve) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }, [_qrOptions, payload]);

  const buildQrSvg = useCallback(async (): Promise<string | null> => {
    if (!payload) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = new QRCodeStyling({ ...(_qrOptions as any), type: 'svg' } as any);
      const raw = (await instance.getRawData('svg')) as unknown;
      const markup = await coerceSvgMarkup(raw);
      if (!markup) return null;
      return /\bwidth\s*=/.test(markup)
        ? markup
        : markup.replace('<svg ', '<svg width="512" height="512" ');
    } catch {
      return null;
    }
  }, [_qrOptions, payload]);

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    void buildQrSvg().then((svg) => {
      if (!cancelled) setQrSvg(svg);
    });
    return () => {
      cancelled = true;
    };
  }, [buildQrSvg, payload]);

  const framedPreview = useMemo(() => {
    if (!payload || !qrSvg) return null;
    const composed = composeFrame(frameId, {
      qr: qrSvg,
      s: 512,
      caption: frameCaption,
      palette: framePalette(color, bgColor),
      uid: 'preview',
    });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(composed.svg)}`;
  }, [payload, qrSvg, frameId, frameCaption, color, bgColor]);

  const generateQr = useCallback(async () => {
    // Check authentication before generating QR
    if (!isAuthenticated) {
      setIsModalOpen(true);
      return;
    }

    if (!payload) {
      setError('Preencha o conteúdo do QR code antes de gerar.');
      return;
    }
    setLoading(true);
    setError(null);
    const dataUrl = await buildQrDataUrl();
    if (!dataUrl) {
      setError('Não foi possível gerar o QR code. Tente novamente.');
      setLoading(false);
      return;
    }
    setQrDataUrl(dataUrl);
    setLoading(false);
  }, [isAuthenticated, payload, buildQrDataUrl, setQrDataUrl, setError]);

  // Geração de QR (data URL) só acontece para usuários autenticados;
  // a prévia ao vivo usa qrSvg e não depende deste estado.
  const setQrDataUrlIfAuthed = useCallback(
    (u: string) => {
      if (isAuthenticated) setQrDataUrl(u);
    },
    [isAuthenticated],
  );

  const downloadQR = useCallback(
    async (format: 'png' | 'jpg' | 'svg', size: number) => {
      if (!payload) return;
      setLoading(true);
      try {
        let blob: Blob;
        if (frameId !== 'none' && qrSvg) {
          const composed = composeFrame(frameId, {
            qr: qrSvg,
            s: 512,
            caption: frameCaption,
            palette: framePalette(color, bgColor),
            uid: 'download',
          });
          if (format === 'svg') {
            blob = new Blob([composed.svg], { type: 'image/svg+xml' });
          } else {
            const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(composed.svg)}`;
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error('svg load'));
              img.src = src;
            });
            const scale = size / Math.max(composed.width, composed.height);
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(composed.width * scale));
            canvas.height = Math.max(1, Math.round(composed.height * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('canvas');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const raster = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, format === 'jpg' ? 'image/jpeg' : 'image/png'),
            );
            if (!raster) throw new Error('toBlob');
            blob = raster;
          }
        } else {
          const instance = new QRCodeStyling({
            ...(_qrOptions as Record<string, unknown>),
            width: size,
            height: size,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
          if (format === 'svg') {
            const raw = (await instance.getRawData('svg')) as unknown;
            const svg = await coerceSvgMarkup(raw);
            if (!svg) throw new Error('svg vazio');
            blob = new Blob([svg], { type: 'image/svg+xml' });
          } else {
            const mime = format === 'jpg' ? 'jpeg' : 'png';
            blob = (await instance.getRawData(mime)) as Blob;
          }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-${type}-${Date.now()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setError('Não foi possível baixar o QR code. Tente novamente.');
      } finally {
        setLoading(false);
      }
    },
    [payload, _qrOptions, frameId, qrSvg, frameCaption, color, bgColor, setError, setLoading, type],
  );

  const copyQR = useCallback(async () => {
    if (!qrDataUrl) return;
    try {
      await navigator.clipboard.writeText(qrDataUrl);
    } catch {
      setError('Não foi possível copiar a imagem.');
    }
  }, [qrDataUrl, setError]);

  return (
    <div className="space-y-6">
      {step === 4 && !isAuthenticated && isModalOpen && (
        <AuthModal
          isOpen={isModalOpen}
          setIsOpen={setIsModalOpen}
          onLoginSuccess={() => setIsAuthenticated(true)}
          redirectTo="/criar?retomar=1&passo=4"
        />
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gerador de QR code</h1>
        <p className="mt-1 text-sm subtle">
          Escolha o tipo, preencha o conteúdo e personalize. Grátis e sem cadastro.
        </p>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {stepper.steps.map((s, i) => {
          const active = stepper.index === i;
          const done = stepper.index > i;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  active || done ? 'bg-[var(--brand)] text-white' : 'bg-[var(--surface)] subtle'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-sm ${active ? 'font-medium text-[var(--fg)]' : 'subtle'}`}>
                {s.title}
              </span>
              {i < stepper.steps.length - 1 && <span className="h-px flex-1 bg-[var(--surface)]" />}
            </li>
          );
        })}
      </ol>
      <hr className="border-[var(--line)]" />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Passo 1: tipo */}
      {step === 1 && (
        <div className="space-y-3">
          {tipoParam && !READY_TYPES.has(tipoParam as QrType) && (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--brand-soft)] p-3 text-sm">
              O tipo <strong>{TYPE_LABELS[tipoParam as QrType] ?? tipoParam}</strong> chega nas
              próximas etapas. Por enquanto, geramos QR de Site e WhatsApp por aqui.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TYPE_CARDS.map((card) => (
              <button
                key={card.type}
                type="button"
                disabled={!card.ready}
                onClick={() => {
                  if (!card.ready) return;
                  setType(card.type);
                  void stepper.goTo('conteudo');
                }}
                className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors ${
                  card.ready
                    ? 'border-[var(--line)] bg-[var(--elevated)] hover:border-[var(--brand)]'
                    : 'border-[var(--line)]/40 bg-[var(--surface)]/50 opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  <card.icon className="h-5 w-5 shrink-0" />
                  <span className="font-medium text-[var(--fg)]">{card.label}</span>
                </div>
                <span className="text-sm subtle">{card.sublabel}</span>
                {!card.ready && (
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--brand)]">
                    Em breve
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Passo 2: conteúdo */}
      {step === 2 && (
        <form
          className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!payload) {
              setError('Preencha o conteúdo do QR code antes de continuar.');
              return;
            }
            void stepper.goTo('moldura');
          }}
        >
          <h2 className="text-sm font-semibold text-[var(--fg)]">
            {type === 'whatsapp' ? 'Dados do WhatsApp' : 'Link de destino'}
          </h2>

          {type === 'site' ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="url">
                  URL *
                </label>
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://exemplo.com"
                  className="w-full rounded-md border border-[var(--line)] px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="name">
                  Nome do QR code
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  className="w-full rounded-md border border-[var(--line)] px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-[6rem_1fr] gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium" htmlFor="country">
                    País
                  </label>
                  <input
                    id="country"
                    type="text"
                    inputMode="numeric"
                    value={country}
                    onChange={(e) => setCountry(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    className="w-full rounded-md border border-[var(--line)] px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium" htmlFor="phone">
                    Telefone *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 91234-5678"
                    className="w-full rounded-md border border-[var(--line)] px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="message">
                  Mensagem inicial
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full rounded-md border border-[var(--line)] px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                  placeholder="Olá! Quero mais informações."
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => void stepper.goTo('tipo')}
              className="inline-flex items-center gap-1 text-sm subtle hover:text-[var(--fg)]"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Gerando…' : 'Continuar'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </form>
      )}

      {/* Passo 3: moldura */}
      {step === 3 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,736px)_1px_340px]">
          {/* Coluna esquerda: moldura e cores */}
          <div className="space-y-4">
            <div className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4">
              <h2 className="text-sm font-semibold text-[var(--fg)]">Moldura</h2>
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-[var(--fg)]"
                  htmlFor="frame-caption"
                >
                  Texto da moldura
                </label>
                <input
                  id="frame-caption"
                  type="text"
                  value={frameCaption}
                  onChange={(e) => setFrameCaption(e.target.value)}
                  maxLength={40}
                  placeholder="Escaneie-me!"
                  className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                />
              </div>
              <p className="text-xs text-[var(--muted)]">
                Escolha a moldura. Ela será aplicada na pré-visualização e no arquivo baixado.
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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

            <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-[var(--fg)] uppercase tracking-wider">
                  Predefinições de cores
                </h3>
                <span className="text-[10px] text-[var(--muted)]">Clique para aplicar</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
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
                        style={{
                          backgroundColor: preset.bg,
                          borderColor: preset.bg === '#ffffff' ? '#cbd5e1' : 'transparent',
                        }}
                      />
                      <div
                        className="w-5 h-5 rounded-sm border border-[var(--line)]"
                        style={{ backgroundColor: preset.dots }}
                      />
                      <div
                        className="w-5 h-5 rounded-sm border border-[var(--line)]"
                        style={{
                          backgroundColor: preset.bg,
                          borderColor: preset.bg === '#ffffff' ? '#cbd5e1' : 'transparent',
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-medium">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Divisor vertical (desktop) */}
          <div className="hidden lg:block w-px bg-[var(--line)] self-stretch" />

          {/* Coluna direita: prévia */}
          <div className="space-y-4 lg:sticky lg:top-4">
            <h2 className="text-sm font-semibold text-[var(--fg)]">Pré-visualização</h2>
            <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4 aspect-square max-w-[320px] mx-auto">
              {framedPreview ? (
                <img
                  src={framedPreview}
                  alt="Pré-visualização do QR code"
                  className="w-full max-w-xs rounded"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-xs subtle">Pré-visualização aparecerá aqui</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Passo 4: Personalizar e baixar (casca) */}
      {step === 4 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,736px)_1px_340px]">
          {/* Coluna esquerda: design */}
          <div className="space-y-4">
            {/* Abas de nível 1 */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
              {LEVEL1_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={level1Tab === tab.key}
                  disabled={tab.disabled}
                  onClick={() => !tab.disabled && setLevel1Tab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    level1Tab === tab.key
                      ? 'border-b-[var(--brand)] border-b-2 text-[var(--fg)] bg-[var(--brand-soft)]'
                      : tab.disabled
                        ? 'border-transparent text-[var(--muted)] opacity-60 cursor-not-allowed'
                        : 'border-[var(--line)] text-[var(--fg)] hover:border-[var(--brand)] hover:bg-[var(--surface)]'
                  }`}
                >
                  {tab.label}
                  {tab.soon && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded border border-[var(--brand)] px-1.5 py-0.5 text-[var(--brand)] text-[10px]">
                      Em breve
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Pílulas de nível 2 */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
              {LEVEL2_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={level2Tab === tab.key}
                  disabled={tab.disabled}
                  onClick={() => !tab.disabled && setLevel2Tab(tab.key)}
                  className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                    level2Tab === tab.key
                      ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                      : tab.disabled
                        ? 'border-transparent text-[var(--muted)] opacity-60 cursor-not-allowed'
                        : 'border-[var(--line)] text-[var(--fg)] hover:border-[var(--brand)] hover:bg-[var(--surface)]'
                  }`}
                >
                  {tab.label}
                  {tab.soon && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded border border-[var(--brand)] px-1 py-0 text-[var(--brand)] text-[10px]">
                      Em breve
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Conteúdo do nível 2 */}
            <div className="space-y-4">
              {level2Tab === 'personalizacao' && (
                <PersonalizationPanel
                  qrShape={qrShape}
                  setQrShape={(s) => setQrShape(s as 'square' | 'rounded' | 'circle')}
                  cornerShape={cornerShape}
                  setCornerShape={(s) => setCornerShape(s as 'square' | 'rounded' | 'circle' | 'top-left-rounded' | 'bottom-right-rounded')}
                  dotShape={dotShape}
                  setDotShape={(s) => setDotShape(s as 'square' | 'rounded' | 'circle' | 'top-left-rounded' | 'bottom-right-rounded')}
                  color={color}
                  setColor={setColor}
                  cornerColor={cornerColor}
                  setCornerColor={setCornerColor}
                  cornerColorMode={cornerColorMode}
                  setCornerColorMode={(s) => setCornerColorMode(s as 'igual' | 'personalizada')}
                  _qrOptions={_qrOptions}
                  buildQrDataUrl={buildQrDataUrl}
                  setQrDataUrl={setQrDataUrlIfAuthed}
                  loading={loading}
                />
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
                          value={margin}
                          onChange={(e) => setMargin(Number(e.target.value))}
                          className="w-full accent-[var(--brand)]"
                        />
                        <span className="text-xs text-[var(--muted)]">{margin}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="mb-1 block text-xs font-medium text-[var(--fg)]">Logotipo</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setLogoMode('nenhum')}
                          className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                            logoMode === 'nenhum'
                              ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
                              : 'border-[var(--line)] bg-[var(--elevated)] text-[var(--fg)] hover:border-[var(--brand)]'
                          }`}
                        >
                          Nenhum
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogoMode('enviar')}
                          className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                            logoMode === 'enviar'
                              ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
                              : 'border-[var(--line)] bg-[var(--elevated)] text-[var(--fg)] hover:border-[var(--brand)]'
                          }`}
                        >
                          Enviar logo
                        </button>
                      </div>
                      {logoMode === 'enviar' && (
                        <div className="space-y-2 mt-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const result = ev.target?.result;
                                if (typeof result === 'string') setLogoImage(result);
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                          />
                          {logoImage && (
                            <div className="flex items-center gap-2">
                              <img src={logoImage} alt="Logo" className="h-8 w-8 rounded object-cover" />
                              <button
                                type="button"
                                onClick={() => setLogoImage(null)}
                                className="text-xs subtle hover:text-[var(--fg)]"
                              >
                                Remover
                              </button>
                            </div>
                          )}
                          <div>
                            <label className="mb-1 block text-[10px] text-[var(--muted)]">Tamanho (% do QR)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={10}
                                max={40}
                                step={1}
                                value={logoSize}
                                onChange={(e) => setLogoSize(Number(e.target.value))}
                                className="w-full accent-[var(--brand)]"
                              />
                              <span className="text-xs text-[var(--muted)]">{logoSize}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {level2Tab === 'senha' && (
                <div className="rounded-lg border border-[var(--line)] bg-[var(--brand-soft)] p-4 min-h-[300px]">
                  <span className="inline-flex items-center gap-1 rounded border border-[var(--brand)] px-2 py-0.5 text-[var(--brand)] text-[10px]">
                    Em breve
                  </span>
                  <p className="mt-1 text-sm text-[var(--muted)]">Proteção por senha chega em uma próxima versão.</p>
                </div>
              )}
              {level2Tab === 'agendamento' && (
                <div className="rounded-lg border border-[var(--line)] bg-[var(--brand-soft)] p-4 min-h-[300px]">
                  <span className="inline-flex items-center gap-1 rounded border border-[var(--brand)] px-2 py-0.5 text-[var(--brand)] text-[10px]">
                    Em breve
                  </span>
                  <p className="mt-1 text-sm text-[var(--muted)]">Agendamento chega em uma próxima versão.</p>
                </div>
              )}
            </div>
          </div>

          {/* Divisor vertical (desktop) */}
          <div className="hidden lg:block w-px bg-[var(--line)] self-stretch" />

          {/* Coluna direita: prévia */}
          <div className="space-y-4 lg:sticky lg:top-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--fg)]">Pré-visualização</h2>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4 aspect-square max-w-[320px] mx-auto">
              {(framedPreview ?? qrDataUrl) ? (
                <img
                  src={framedPreview ?? qrDataUrl ?? ''}
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
                  <span className="inline-flex items-center gap-1 rounded border border-[var(--brand)] px-2 py-0.5 text-[var(--brand)] text-[10px] font-medium">
                    ✓ Leitura verificada
                  </span>
                ) : (
                  <span className="text-xs text-[var(--muted)]">Complete o conteúdo no passo 2</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void generateQr()}
              disabled={loading || !contentValid}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Gerando…' : qrDataUrl ? 'Atualizar QR code' : 'Gerar QR code'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
            {!isAuthenticated && (
              <p className="text-center text-[10px] subtle">
                Entre ou crie uma conta para gerar o QR code.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rodapé fixo (mobile) / alinhado (desktop) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={() => {
            const prev = step === 4 ? 'moldura' : step === 3 ? 'conteudo' : 'tipo';
            void stepper.goTo(prev);
          }}
          disabled={!contentValid}
          className="inline-flex items-center gap-1 text-sm subtle hover:text-[var(--fg)] disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        {step === 3 && (
          <button
            type="button"
            onClick={() => void stepper.goTo('personalizar')}
            disabled={!contentValid}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-50"
          >
            Próximo
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => void downloadQR('png', 512)}
          disabled={!qrDataUrl || !contentValid || loading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Gerando…' : 'Baixar QR'}
          {!loading && <Download className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
          disabled={!qrDataUrl || !contentValid || loading}
          className="rounded-md bg-[var(--brand)] px-2 py-2 transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-50"
          aria-label="Opções de download"
        >
          <ChevronDown className="h-4 w-4 text-white" />
        </button>
        {downloadMenuOpen && (
          <div className="absolute bottom-[60px] right-0 w-48 rounded-md border border-[var(--line)] bg-[var(--elevated)] shadow-lg py-2 z-10">
            <div className="px-3 py-2 text-xs font-semibold text-[var(--muted)] uppercase">Formato</div>
            <button
              type="button"
              onClick={() => { void downloadQR('png', 512); setDownloadMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--fg)] hover:bg-[var(--surface)]"
            >
              PNG (512 px)
            </button>
            <button
              type="button"
              onClick={() => { void downloadQR('png', 1024); setDownloadMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--fg)] hover:bg-[var(--surface)]"
            >
              PNG (1024 px)
            </button>
            <button
              type="button"
              onClick={() => { void downloadQR('png', 2048); setDownloadMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--fg)] hover:bg-[var(--surface)]"
            >
              PNG (2048 px)
            </button>
            <button
              type="button"
              onClick={() => { void downloadQR('jpg', 1024); setDownloadMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--fg)] hover:bg-[var(--surface)]"
            >
              JPG (1024 px)
            </button>
            <button
              type="button"
              onClick={() => { void downloadQR('svg', 1024); setDownloadMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--fg)] hover:bg-[var(--surface)]"
            >
              SVG
            </button>
            <div className="h-px mx-3 my-1 bg-[var(--line)]" />
            <div className="px-3 py-2 text-xs font-semibold text-[var(--muted)] uppercase">Mais</div>
            <button
              type="button"
              onClick={() => { void copyQR(); setDownloadMenuOpen(false); }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-[var(--fg)] hover:bg-[var(--surface)]"
            >
              <Copy className="h-4 w-4" /> Copiar imagem
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  void navigator.share({ files: [new File([qrDataUrl ?? ''], 'qr.png')] });
                }
                setDownloadMenuOpen(false);
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-[var(--fg)] hover:bg-[var(--surface)]"
            >
              <Share className="h-4 w-4" /> Compartilhar
            </button>
          </div>
        )}
      </div>

      <p className="text-sm subtle">
        Quer um QR que possa ser editado depois?{' '}
        <Link className="underline" to="/create">
          Criar QR dinâmico
        </Link>
      </p>
    </div>
  );
}
