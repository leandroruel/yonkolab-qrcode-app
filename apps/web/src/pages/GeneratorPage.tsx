import QRCodeStyling from 'qr-code-styling';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  CreditCard,
  Download,
  Eye,
  Globe,
  Loader2,
  Mail,
  Smartphone,
  Text,
  User,
  Wifi,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

type QrType =
  | 'site'
  | 'whatsapp'
  | 'vcard'
  | 'pix'
  | 'texto'
  | 'wifi'
  | 'email';

const STEPS = ['Tipo', 'Conteúdo', 'Personalizar'] as const;
const DRAFT_KEY = 'yonkolab:qr-draft';

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
  {
    type: 'site',
    label: TYPE_LABELS.site,
    sublabel: 'Abra um link ao escanear',
    ready: true,
    icon: Globe,
  },
  {
    type: 'whatsapp',
    label: TYPE_LABELS.whatsapp,
    sublabel: 'Inicie uma conversa',
    ready: true,
    icon: Smartphone,
  },
  {
    type: 'vcard',
    label: TYPE_LABELS.vcard,
    sublabel: 'Salve um contato na agenda',
    ready: false,
    icon: User,
  },
  {
    type: 'pix',
    label: TYPE_LABELS.pix,
    sublabel: 'Pague com chave Pix',
    ready: false,
    icon: CreditCard,
  },
  {
    type: 'texto',
    label: TYPE_LABELS.texto,
    sublabel: 'Mostre qualquer texto curto',
    ready: false,
    icon: Text,
  },
  {
    type: 'wifi',
    label: TYPE_LABELS.wifi,
    sublabel: 'Conecte à rede Wi-Fi',
    ready: false,
    icon: Wifi,
  },
  {
    type: 'email',
    label: TYPE_LABELS.email,
    sublabel: 'Abra um e-mail pronto',
    ready: false,
    icon: Mail,
  },
];

export default function GeneratorPage() {
  // `?tipo=` vem dos cards da landing; tipos prontos pulam direto ao passo 2.
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get('tipo');
  const tipoValido =
    tipoParam !== null && READY_TYPES.has(tipoParam as QrType);
  const passoParam = searchParams.get('passo');

  const [type, setType] = useState<QrType>(
    (tipoParam ?? 'site') === 'whatsapp' ? 'whatsapp' : 'site',
  );
  const [step, setStep] = useState(() => {
    const parsed = passoParam ? Number(passoParam) : NaN;
    if (Number.isFinite(parsed)) return Math.min(Math.max(Math.trunc(parsed), 1), 2);
    return tipoValido ? 2 : 1;
  });

  // Mantém um rascunho local para o CTA "Continuar meu QR Code" da landing.
  // Só grava depois que o visitante avançou para o conteúdo (passo 2).
  useEffect(() => {
    if (step < 2) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, tipo: type }));
    } catch {
      // localStorage indisponível: sem rascunho nesta sessão.
    }
  }, [step, type]);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Conteúdo
  const [url, setUrl] = useState('');
  const [name, setName] = useState('Meu QR code');
  const [country, setCountry] = useState('55');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  // Estilo
  const [color, setColor] = useState('#111111');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [margin, setMargin] = useState(2);

  const payload = useMemo(() => {
    if (type === 'whatsapp') {
      const digits = `${country}${phone}`.replace(/\D/g, '');
      const text = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : '';
      return `https://wa.me/${digits}${text}`;
    }
    return url.trim();
  }, [type, country, phone, message, url]);

  const generateQr = useCallback(async () => {
    if (!payload) {
      setError('Preencha o conteúdo do QR code antes de gerar.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const instance = new QRCodeStyling({
        width: 512,
        height: 512,
        type: 'canvas',
        data: payload,
        margin,
        qrOptions: { errorCorrectionLevel: 'Q' },
        dotsOptions: { color, type: 'rounded' },
        cornersSquareOptions: { color, type: 'extra-rounded' },
        cornersDotOptions: { color },
        backgroundOptions: { color: bgColor },
      });
      const blob = await instance.getRawData('png');
      if (!(blob instanceof Blob)) throw new Error('Falha ao gerar imagem');

      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      setQrDataUrl(dataUrl);
      setStep(3);
    } catch {
      setError('Não foi possível gerar o QR code. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [payload, margin, color, bgColor, setStep]);

  const download = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${type}-${Date.now()}.png`;
    a.click();
  }, [qrDataUrl, type]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gerador de QR code</h1>
        <p className="mt-1 text-sm subtle">
          Escolha o tipo, preencha o conteúdo e personalize. Grátis e sem cadastro.
        </p>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  active || done ? 'bg-[var(--brand)] text-white' : 'bg-[var(--surface)] subtle'
                }`}
              >
                {n}
              </span>
              <span
                className={`text-sm ${active ? 'font-medium text-[var(--fg)]' : 'subtle'}`}
              >
                {label}
              </span>
              {n < STEPS.length && <span className="h-px flex-1 bg-[var(--surface)]" />}
            </li>
          );
        })}
      </ol>

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
                  setStep(2);
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
            void generateQr();
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
              onClick={() => setStep(1)}
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
              {loading ? 'Gerando…' : 'Gerar QR code'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </form>
      )}

      {/* Passo 3: personalizar + baixar */}
      {step === 3 && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="grid place-items-center rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code gerado"
                className="h-auto w-full max-w-xs rounded"
              />
            ) : (
              <p className="py-12 text-sm subtle">Gere o QR code para ver a prévia.</p>
            )}
          </div>

          <div className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4">
            <h2 className="text-sm font-semibold text-[var(--fg)]">Personalização</h2>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="color">
                Cor dos módulos
              </label>
              <input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded border border-[var(--line)] bg-[var(--elevated)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="bgColor">
                Cor de fundo
              </label>
              <input
                id="bgColor"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded border border-[var(--line)] bg-[var(--elevated)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="margin">
                Margem: {margin}
              </label>
              <input
                id="margin"
                type="range"
                min={0}
                max={6}
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full accent-[var(--brand)]"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => void generateQr()}
                disabled={loading}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2 text-sm font-medium transition-colors hover:border-[var(--brand)] disabled:opacity-50"
              >
                {loading ? 'Atualizando…' : 'Aplicar estilo'}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!qrDataUrl}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Baixar PNG
              </button>
              <button
                type="button"
                onClick={() => {
                  if (qrDataUrl) void navigator.clipboard.writeText(qrDataUrl);
                }}
                disabled={!qrDataUrl}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm transition-colors hover:border-[var(--brand)] disabled:opacity-50"
              >
                <Copy className="h-4 w-4" /> Copiar imagem
              </button>
              <button
                type="button"
                onClick={() => {
                  if (qrDataUrl) window.open(qrDataUrl, '_blank');
                }}
                disabled={!qrDataUrl}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm transition-colors hover:border-[var(--brand)] disabled:opacity-50"
              >
                <Eye className="h-4 w-4" /> Abrir
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex w-full items-center justify-center gap-1 pt-1 text-sm subtle hover:text-[var(--fg)]"
              >
                <ArrowLeft className="h-4 w-4" /> Editar conteúdo
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm subtle">
        Quer um QR que possa ser editado depois?{' '}
        <Link className="underline" to="/create">
          Criar QR dinâmico
        </Link>
      </p>
    </div>
  );
}
