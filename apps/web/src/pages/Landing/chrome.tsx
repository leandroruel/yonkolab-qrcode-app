import { ArrowRight, Menu, QrCode, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

const NAV = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#tipos', label: 'Tipos de QR' },
  { href: '#dinamico', label: 'QR dinâmico' },
  { href: '#perguntas', label: 'Perguntas' },
];

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <span
        className="grid h-8 w-8 place-items-center rounded-lg text-white"
        style={{ backgroundColor: 'var(--brand)' }}
        aria-hidden
      >
        <QrCode className="h-4 w-4" />
      </span>
      <span>
        yonkolab <span className="subtle">·</span> QR
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-[var(--line)] backdrop-blur-md"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 88%, transparent)' }}
      >
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-3 px-4 sm:px-6">
        <Wordmark />

        <nav aria-label="Navegação principal" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium subtle transition-colors hover:text-[var(--fg)]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            to="/meus-qrs"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium subtle transition-colors hover:text-[var(--fg)] sm:block"
          >
            Entrar
          </Link>
          <Link to="/criar" className="btn btn-primary btn-sm hidden sm:inline-flex">
            Criar meu QR Code grátis
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link to="/criar" className="btn btn-primary btn-sm sm:hidden" aria-label="Criar meu QR Code grátis">
            Criar
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={open}
            className="inline-grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 h-full w-full bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="absolute right-0 top-0 flex h-full w-[min(20rem,86vw)] flex-col gap-2 border-l border-[var(--line)] bg-[var(--bg)] p-5 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <Wordmark />
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="inline-grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav aria-label="Navegação principal (mobile)" className="flex flex-col">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium hover:bg-[var(--surface)]"
                >
                  {item.label}
                </a>
              ))}
              <Link
                to="/meus-qrs"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium hover:bg-[var(--surface)]"
              >
                Entrar
              </Link>
            </nav>

            <Link
              to="/criar"
              onClick={() => setOpen(false)}
              className="btn btn-primary mt-3 w-full"
            >
              Criar meu QR Code grátis
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="mx-auto grid max-w-[1120px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-xs text-sm subtle">
            QR codes com a sua identidade. Gerador gratuito, sem cadastro.
          </p>
        </div>

        <nav aria-label="Links do rodapé" className="text-sm">
          <h2 className="mb-3 text-xs font-semibold tracking-wider uppercase subtle">Produto</h2>
          <ul className="space-y-2">
            <li>
              <Link to="/criar" className="hover:text-[var(--fg)]">
                Gerador de QR Code
              </Link>
            </li>
            <li>
              <a href="#tipos" className="hover:text-[var(--fg)]">
                Tipos de QR
              </a>
            </li>
            <li>
              <a href="#perguntas" className="hover:text-[var(--fg)]">
                Perguntas frequentes
              </a>
            </li>
            <li>
              <Link to="/status" className="hover:text-[var(--fg)]">
                Status da API
              </Link>
            </li>
          </ul>
        </nav>

        <div className="text-sm">
          <h2 className="mb-3 text-xs font-semibold tracking-wider uppercase subtle">YonkoLab</h2>
          <ul className="space-y-2">
            <li>
              <a href="https://yonkolab.xyz" target="_blank" rel="noreferrer" className="hover:text-[var(--fg)]">
                yonkolab.xyz
              </a>
            </li>
            <li>
              <a href="mailto:contato@yonkolab.xyz" className="hover:text-[var(--fg)]">
                contato@yonkolab.xyz
              </a>
            </li>
            <li>
              <a
                href="https://yonkolab.xyz/termos"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--fg)]"
              >
                Termos
              </a>
            </li>
            <li>
              <a
                href="https://yonkolab.xyz/privacidade"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--fg)]"
              >
                Privacidade
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-[1120px] px-4 py-5 text-xs subtle sm:px-6">
          © {new Date().getFullYear()} YonkoLab. QR estáticos são gerados no seu navegador.
        </div>
      </div>
    </footer>
  );
}
