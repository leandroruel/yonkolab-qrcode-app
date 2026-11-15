import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

const STORAGE_KEY = 'yonkolab:theme';

/** Botão de tema claro/escuro. A classe `dark` no <html> é aplicada antes do paint. */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  // O script inline do index.html já definiu a classe antes do primeiro render.
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // localStorage indisponível (modo privado): tema vale só nesta sessão.
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      aria-pressed={dark}
      title={dark ? 'Tema claro' : 'Tema escuro'}
      className={`inline-grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] text-[var(--fg)] transition-colors hover:bg-[var(--surface)] ${className}`}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
