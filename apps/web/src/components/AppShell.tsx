import { Link, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import ThemeToggle from './ThemeToggle';

/** Casca das páginas internas (gerador, status, painel). A landing tem chrome próprio. */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>

      <header
        className="sticky top-0 z-40 border-b border-[var(--line)] backdrop-blur-md"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 88%, transparent)' }}
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            yonkolab <span className="brand-text">·</span> QR
          </Link>
          <div className="flex items-center gap-1.5">
            <NavLink
              to="/criar"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'brand-text' : 'subtle hover:text-[var(--fg)]'
                }`
              }
            >
              Gerador
            </NavLink>
            <NavLink
              to="/status"
              className={({ isActive }) =>
                `hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:block ${
                  isActive ? 'brand-text' : 'subtle hover:text-[var(--fg)]'
                }`
              }
            >
              Status
            </NavLink>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        {children}
      </main>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-1 px-4 py-6 text-xs subtle sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} YonkoLab</span>
          <a href="https://yonkolab.xyz" className="hover:text-[var(--fg)]" target="_blank" rel="noreferrer">
            yonkolab.xyz
          </a>
        </div>
      </footer>
    </div>
  );
}
