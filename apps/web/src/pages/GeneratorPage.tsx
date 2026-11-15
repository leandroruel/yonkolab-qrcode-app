import {
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  Smartphone,
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

const STEPS = [
  { n: 1, label: 'Escolha o tipo de QR', done: true },
  { n: 2, label: 'Criar conteúdo', done: true },
  { n: 3, label: 'Personalizar e baixar', done: false },
] as const;

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
    if (Number.isFinite(parsed)) return Math.min(Math.max(Math.trunc(parsed), 1), 3);
    return tipoValido ? 2 : 1;
  });

  // Mantém um rascunho local para o CTA "Continuar meu QR Code" da landing.
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

  // Conteúdo (passo 2)
  const [url, setUrl] = useState('');
  const [name, setName] = useState('Meu QR code');
  const [country, setCountry] = useState('55');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  // Estado do passo 3 (casca — painéis preenchidos nas fatias seguintes)
  const [level1Tab, setLevel1Tab] = useState<'custom' | 'brand' | 'ai'>('custom');
  const [level2Tab, setLevel2Tab] = useState<'geral' | 'personalizacao' | 'senha' | 'agendamento'>('personalizacao');

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

  const generateQr = useCallback(async () => {
    if (!payload) {
      setError('Preencha o conteúdo do QR code antes de gerar.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const instance = new (await import('qr-code-styling')).default({
        width: 512,
        height: 512,
        type: 'canvas',
        data: payload,
        margin: 2,
        qrOptions: { errorCorrectionLevel: 'Q' },
        dotsOptions: { color: '#111111', type: 'square' },
        cornersSquareOptions: { color: '#111111', type: 'square' },
        cornersDotOptions: { color: '#111111', type: 'square' },
        backgroundOptions: { color: '#ffffff' },
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
    } catch {
      setError('Não foi possível gerar o QR code. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [payload]);

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
        {STEPS.map((s) => {
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

      {/* Passo 3: Personalizar e baixar (casca) */}
      {step === 3 && (
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

            {/* Conteúdo do nível 2 (placeholder até as fatias seguintes) */}
            <div className="rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4 min-h-[300px]">
              <p className="text-sm subtle">Conteúdo desta seção será preenchido na próxima fatia.</p>
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
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Pré-visualização do QR code" className="w-full max-w-xs rounded" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-xs subtle">Pré-visualização aparecerá aqui</span>
                </div>
              )}
              <div className="mt-2 text-xs text-[var(--muted)]">
                {contentValid ? '✓ Leitura verificada' : 'Complete o conteúdo no passo 2'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé fixo (mobile) / alinhado (desktop) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!contentValid}
          className="inline-flex items-center gap-1 text-sm subtle hover:text-[var(--fg)] disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button
          type="button"
          onClick={download}
          disabled={!qrDataUrl || !contentValid}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Gerando…' : 'Baixar QR'}
          {!loading && <Download className="h-4 w-4" />}
        </button>
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
