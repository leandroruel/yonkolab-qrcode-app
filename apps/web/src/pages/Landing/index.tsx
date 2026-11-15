import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Frame,
  Image as ImageIcon,
  Layers,
  Link2,
  Mail,
  MessageCircle,
  Palette,
  Pencil,
  ScanLine,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  Type,
  UserRound,
  UtensilsCrossed,
  Wallet,
  Wifi,
} from 'lucide-react';
import { Suspense, lazy, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useIdleReady, useNearViewport } from '@/lib/use-lazy-art';
import { useReveal } from '@/lib/use-reveal';
import { SiteFooter, SiteHeader } from './chrome';

const HeroQr = lazy(() => import('./qr-art').then((m) => ({ default: m.HeroQr })));
const ShowcaseQrs = lazy(() => import('./qr-art').then((m) => ({ default: m.ShowcaseQrs })));

const DRAFT_KEY = 'yonkolab:qr-draft';

type Draft = { step?: number; tipo?: string };

const TRUST = ['Sem cadastro', 'PNG, JPG e SVG', 'Funciona com PIX e WhatsApp'];

const STEPS = [
  {
    title: 'Escolha o tipo',
    text: 'Site, WhatsApp, PIX, Wi-Fi e mais.',
    icon: Layers,
  },
  {
    title: 'Preencha o conteúdo',
    text: 'Só os campos que importam, com validação na hora.',
    icon: Type,
  },
  {
    title: 'Personalize e baixe',
    text: 'Cores, estilo, moldura e a sua logo no centro.',
    icon: Palette,
  },
];

const TYPES = [
  { id: 'site', label: 'Site', desc: 'Abra um link', icon: Link2 },
  { id: 'whatsapp', label: 'WhatsApp', desc: 'Inicie uma conversa', icon: MessageCircle },
  { id: 'vcard', label: 'vCard', desc: 'Cartão de contato', icon: UserRound },
  { id: 'pix', label: 'PIX', desc: 'Receba pagamentos', icon: Wallet },
  { id: 'texto', label: 'Texto', desc: 'Mostre um texto', icon: Type },
  { id: 'wifi', label: 'Wi-Fi', desc: 'Conecte à rede', icon: Wifi },
  { id: 'email', label: 'Email', desc: 'Envie um email', icon: Mail },
];

const SOON = [
  { label: 'PDF', icon: FileText },
  { label: 'Imagem', icon: ImageIcon },
  { label: 'Redes sociais', icon: Share2 },
  { label: 'Multi-link', icon: Layers },
];

const DYNAMIC_BENEFITS = [
  'Edite o link depois de impresso',
  'Pause ou programe a validade',
  'Veja scans por dia, país e dispositivo',
];

const USE_CASES = [
  {
    title: 'Restaurantes e bares',
    text: 'Cardápio digital sempre atualizado.',
    tipo: 'site',
    icon: UtensilsCrossed,
  },
  {
    title: 'Autônomos e lojas',
    text: 'Receba por PIX em um toque.',
    tipo: 'pix',
    icon: Store,
  },
  {
    title: 'Eventos',
    text: 'Link do evento ou conversa no WhatsApp.',
    tipo: 'whatsapp',
    icon: CalendarDays,
  },
  {
    title: 'Imobiliárias',
    text: 'Ficha completa do imóvel.',
    tipo: 'site',
    icon: Building,
  },
];

const FAQ = [
  {
    q: 'É grátis?',
    a: 'Sim. O gerador de QR estático é gratuito e sem cadastro. O QR dinâmico tem limite no plano gratuito.',
  },
  {
    q: 'Preciso criar conta?',
    a: 'Só para QR dinâmico e para acessar “Meus QR Codes”. Para gerar e baixar um QR estático, não é necessário.',
  },
  {
    q: 'O QR expira?',
    a: 'Um QR estático nunca expira. O dinâmico fica ativo enquanto a conta estiver ativa, e você pode programar validade.',
  },
  {
    q: 'Posso usar em material impresso?',
    a: 'Sim. Baixe em SVG ou PNG em alta resolução e teste a leitura antes de mandar imprimir.',
  },
  {
    q: 'Vocês guardam meus dados?',
    a: 'O QR estático é gerado no seu navegador e não é enviado ao servidor. Para dinâmico guardamos o destino e estatísticas de scan (país, dispositivo e navegador, sem IP).',
  },
];

function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1120px] px-4 sm:px-6 ${className}`}>{children}</div>;
}

function SectionHead({
  eyebrow,
  title,
  description,
  center = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div
      className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}
      data-reveal
    >
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-2 text-2xl font-bold tracking-[-0.01em] sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-base subtle sm:text-lg">{description}</p>}
    </div>
  );
}

function PrimaryCta({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="btn btn-primary">
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

function ShowcaseSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((key) => (
        <div
          key={key}
          className="h-[21rem] animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--elevated)]"
        />
      ))}
    </div>
  );
}

/** QR estilizado determinístico para a ilustração do QR dinâmico (sem dependências). */
function FakeQr() {
  const size = 21;
  const cells: Array<{ x: number; y: number }> = [];

  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x > size - 8 && y < 7) || (x < 7 && y > size - 8);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inFinder(x, y)) continue;
      if ((x * 7 + y * 11 + ((x * y) % 5)) % 3 === 0) cells.push({ x, y });
    }
  }

  const finders = [
    { x: 0, y: 0 },
    { x: size - 7, y: 0 },
    { x: 0, y: size - 7 },
  ];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-40 w-40" aria-hidden focusable="false">
      <rect width={size} height={size} fill="#ffffff" />
      {finders.map((finder) => (
        <g key={`${finder.x}-${finder.y}`}>
          <rect x={finder.x + 0.5} y={finder.y + 0.5} width={6} height={6} fill="#6d28d9" rx={1} />
          <rect x={finder.x + 1.5} y={finder.y + 1.5} width={4} height={4} fill="#ffffff" />
          <rect x={finder.x + 2.5} y={finder.y + 2.5} width={2} height={2} fill="#6d28d9" />
        </g>
      ))}
      {cells.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          x={cell.x}
          y={cell.y}
          width={0.9}
          height={0.9}
          rx={0.25}
          fill="#17171d"
        />
      ))}
    </svg>
  );
}

function DynamicQrIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden>
      <div className="card overflow-hidden p-5" style={{ boxShadow: 'var(--shadow)' }}>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs">
          <Link2 className="h-3.5 w-3.5 brand-text" />
          <span className="truncate">yonkolab.xyz/promo</span>
          <span
            className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }}
          >
            editado
          </span>
        </div>
        <div className="mt-4 grid place-items-center rounded-xl bg-white p-4">
          <FakeQr />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs subtle">
          <Clock className="h-3.5 w-3.5" />
          Ativo até 31/12 · scans por dia
        </div>
      </div>
      <div className="absolute -bottom-3 right-2 flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--elevated)] px-3 py-2 text-xs font-medium shadow-lg">
        <Pencil className="h-3.5 w-3.5 brand-text" /> destino atualizado
      </div>
    </div>
  );
}

function HeroVisual() {
  const ready = useIdleReady();

  const placeholder = (
    <div className="h-[21.5rem] w-full animate-pulse rounded-[28px] border border-[var(--line)] bg-white/70" />
  );

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden
        className="absolute inset-x-8 bottom-0 top-10 -z-10 rounded-[2rem] blur-2xl"
        style={{
          background:
            'linear-gradient(135deg, rgba(124,58,237,0.38), rgba(37,99,235,0.26) 70%, transparent)',
        }}
      />
      <div className="mx-auto w-full max-w-[19rem]" data-reveal style={{ '--reveal-delay': '80ms' } as CSSProperties}>
        <Suspense fallback={placeholder}>{ready ? <HeroQr /> : placeholder}</Suspense>
      </div>

      <span className="float-label absolute left-0 top-24 hidden items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--elevated)] px-2.5 py-1.5 text-[11px] font-medium shadow-lg lg:flex">
        <ImageIcon className="h-3.5 w-3.5 brand-text" /> Sua logo
      </span>
      <span className="float-label float-label--slow absolute right-0 top-1/2 hidden items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--elevated)] px-2.5 py-1.5 text-[11px] font-medium shadow-lg lg:flex">
        <Palette className="h-3.5 w-3.5 brand-text" /> Suas cores
      </span>
      <span className="float-label absolute bottom-16 left-2 hidden items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--elevated)] px-2.5 py-1.5 text-[11px] font-medium shadow-lg lg:flex">
        <Frame className="h-3.5 w-3.5 brand-text" /> Sua moldura
      </span>
    </div>
  );
}

export default function LandingPage() {
  useReveal();

  const [draft, setDraft] = useState<Draft | null>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Draft;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      // rascunho inválido: ignora
      return null;
    }
  });

  // Demos de personalização só carregam quando o visitante se aproxima da seção.
  const showcaseRef = useRef<HTMLDivElement>(null);
  const showcaseReady = useNearViewport(showcaseRef, '700px');

  const ctaHref = draft
    ? `/criar?retomar=1&passo=${draft.step ?? 1}${draft.tipo ? `&tipo=${encodeURIComponent(draft.tipo)}` : ''}`
    : '/criar';

  function startOver() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignora
    }
    setDraft(null);
  }

  return (
    <>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <SiteHeader />

      <main id="conteudo">
        {/* Hero */}
        <section className="hero-glow border-b border-[var(--line)]">
          <Container className="grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div data-reveal>
              <span className="chip">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Grátis e sem cadastro
              </span>
              <h1 className="mt-5 text-[2rem] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[3rem] lg:text-[3.5rem] lg:leading-[1.06]">
                Crie um QR Code com a <span className="brand-text">sua logo</span> em segundos
              </h1>
              <p className="mt-5 max-w-xl text-lg subtle">
                Escolha o tipo, preencha o conteúdo, personalize e baixe. Grátis e sem cadastro.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to={ctaHref} className="btn btn-primary">
                  {draft ? 'Continuar meu QR Code' : 'Criar meu QR Code grátis'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a href="#como-funciona" className="btn btn-ghost">
                  Ver como funciona
                </a>
              </div>
              {draft && (
                <button type="button" onClick={startOver} className="mt-3 text-sm underline subtle">
                  Começar de novo
                </button>
              )}

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm subtle">
                {TRUST.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 brand-text" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <HeroVisual />
          </Container>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="surface border-b border-[var(--line)]">
          <Container className="py-16 lg:py-24">
            <SectionHead
              eyebrow="Como funciona"
              title="Três passos, sem complicação"
              description="O mesmo fluxo do gerador: você vê o QR mudando enquanto edita."
            />
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="card p-6"
                    data-reveal
                    style={{ '--reveal-delay': `${index * 70}ms` } as CSSProperties}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold"
                        style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }}
                      >
                        {index + 1}
                      </span>
                      <Icon className="h-5 w-5 subtle" aria-hidden />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm subtle">{step.text}</p>
                  </li>
                );
              })}
            </ol>
          </Container>
        </section>

        {/* Tipos de QR */}
        <section id="tipos" className="border-b border-[var(--line)]">
          <Container className="py-16 lg:py-24">
            <SectionHead
              eyebrow="Tipos de QR"
              title="Escolha o que o QR deve abrir"
              description="Sete tipos ativos, cada um com os campos que importam."
            />

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TYPES.map((type, index) => {
                const Icon = type.icon;
                return (
                  <Link
                    key={type.id}
                    to={`/criar?tipo=${type.id}`}
                    className="group card p-4 transition-transform hover:-translate-y-0.5 hover:border-[var(--brand)]"
                    data-reveal
                    style={{ '--reveal-delay': `${index * 45}ms` } as CSSProperties}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-xl"
                        style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </div>
                    <span className="mt-3 block font-semibold">{type.label}</span>
                    <span className="mt-0.5 block text-sm subtle">{type.desc}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 border-t border-[var(--line)] pt-6">
              <p className="text-xs font-semibold tracking-wider uppercase subtle">Em breve</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {SOON.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.label} className="chip border-dashed">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {item.label}
                      <span className="ml-1 rounded-full border border-[var(--line)] px-1.5 py-0.5 text-[10px]">
                        Em breve
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-10 flex justify-center">
              <PrimaryCta to="/criar">Criar meu QR Code grátis</PrimaryCta>
            </div>
          </Container>
        </section>

        {/* Personalização */}
        <section className="surface border-b border-[var(--line)]">
          <Container className="py-16 lg:py-24">
            <SectionHead
              eyebrow="Personalização"
              title="Do seu jeito, com a sua cara"
              description="Cores, gradientes, formato dos pontos, moldura e logo no centro — tudo em tempo real."
              center
            />
            <div className="mt-10" data-reveal ref={showcaseRef}>
              <Suspense fallback={<ShowcaseSkeleton />}>
                {showcaseReady ? <ShowcaseQrs /> : <ShowcaseSkeleton />}
              </Suspense>
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm subtle" data-reveal>
              <ShieldCheck className="h-4 w-4 brand-text" aria-hidden />
              Avisamos quando o QR pode ficar difícil de ler (contraste, tamanho da logo).
            </p>
          </Container>
        </section>

        {/* QR dinâmico */}
        <section id="dinamico" className="border-b border-[var(--line)]">
          <Container className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
            <div data-reveal>
              <SectionHead
                eyebrow="QR dinâmico"
                title="Mudou o destino? Não precisa reimprimir."
                description="O QR aponta para um endereço curto seu. Você troca o destino quando quiser."
              />
              <ul className="mt-6 space-y-3">
                {DYNAMIC_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 brand-text" aria-hidden />
                    {benefit}
                  </li>
                ))}
              </ul>
              <p className="mt-6 max-w-md text-sm subtle">
                Disponível ao entrar com Google. O plano gratuito inclui até 5 QR codes dinâmicos.
              </p>
              <Link to="/criar?tipo=site" className="btn btn-ghost mt-6">
                Criar QR dinâmico
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div data-reveal>
              <DynamicQrIllustration />
            </div>
          </Container>
        </section>

        {/* Para quem é */}
        <section className="surface border-b border-[var(--line)]">
          <Container className="py-16 lg:py-24">
            <SectionHead
              eyebrow="Para quem é"
              title="Um QR para cada rotina"
              description="Comece pelo caso mais próximo do seu — depois é só editar."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {USE_CASES.map((useCase, index) => {
                const Icon = useCase.icon;
                return (
                  <Link
                    key={useCase.title}
                    to={`/criar?tipo=${useCase.tipo}`}
                    className="card group p-5 transition-transform hover:-translate-y-0.5"
                    data-reveal
                    style={{ '--reveal-delay': `${index * 60}ms` } as CSSProperties}
                  >
                    <Icon className="h-5 w-5 brand-text" aria-hidden />
                    <h3 className="mt-4 font-semibold">{useCase.title}</h3>
                    <p className="mt-1 text-sm subtle">{useCase.text}</p>
                    <span className="mt-4 flex items-center gap-1 text-sm font-medium brand-text">
                      Abrir gerador
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </Link>
                );
              })}
            </div>
          </Container>
        </section>

        {/* Perguntas frequentes */}
        <section id="perguntas" className="border-b border-[var(--line)]">
          <Container className="py-16 lg:py-24">
            <SectionHead
              eyebrow="Perguntas"
              title="Perguntas frequentes"
              description="Respostas curtas para as dúvidas mais comuns."
            />
            <div className="mt-8 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--elevated)] px-5">
              {FAQ.map((item) => (
                <details key={item.q} className="group">
                  <summary className="faq-summary">
                    <span>{item.q}</span>
                    <ChevronDown className="h-5 w-5 subtle" aria-hidden />
                  </summary>
                  <p className="pb-4 pr-8 text-sm subtle">{item.a}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA final */}
        <section className="surface">
          <Container className="py-16 lg:py-24">
            <div
              className="relative overflow-hidden rounded-3xl border border-[var(--line)] px-6 py-12 text-center sm:px-12"
              style={{
                background:
                  'radial-gradient(28rem 16rem at 50% 0%, rgba(124,58,237,0.18), transparent 70%)',
              }}
              data-reveal
            >
              <ScanLine className="mx-auto h-8 w-8 brand-text" aria-hidden />
              <h2 className="mt-4 text-2xl font-bold tracking-[-0.01em] sm:text-3xl">
                Pronto para criar o seu?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base subtle">
                Leva menos de um minuto. Sem cadastro para o QR estático.
              </p>
              <div className="mt-8 flex justify-center">
                <PrimaryCta to="/criar">Criar meu QR Code grátis</PrimaryCta>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
