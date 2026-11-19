import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, QrCode, ShieldCheck, User, X } from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2.5 pl-10 pr-3 text-sm text-[var(--fg)] placeholder-[var(--muted)] transition-colors focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30';

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--fg)]">{label}</span>
      <span className="relative block">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        {children}
      </span>
    </label>
  );
}

export function AuthModal({
  isOpen,
  setIsOpen,
  onLoginSuccess,
  redirectTo,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLoginSuccess?: () => void;
  redirectTo?: string;
}) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);

    if (mode === 'signup') {
      // Collect form data and send to server API
      const formData = new FormData(e.target as HTMLFormElement);
      const email = formData.get('email') as string;
      const name = formData.get('name') as string;

      try {
        // Call server API to create Stripe customer and user
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Erro no signup');

        // Set auth session
        localStorage.setItem('yonkolab_auth', 'authenticated');

        if (onLoginSuccess) onLoginSuccess();
        navigate(redirectTo ?? '/');
      } catch (error) {
        console.error('Signup error:', error);
        // Stay on modal with error indication
        setIsOpen(true);
        return;
      }
    } else {
      // Login flow - set auth session
      localStorage.setItem('yonkolab_auth', 'authenticated');
      if (onLoginSuccess) onLoginSuccess();
      navigate(redirectTo ?? '/');
    }
  };

  const isLogin = mode === 'login';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--elevated)] text-[var(--fg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Faixa de marca */}
        <div className="relative border-b border-[var(--line)] bg-[var(--brand-soft)] px-6 pb-5 pt-6">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--elevated)] hover:text-[var(--fg)]"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--brand)] text-white shadow-md">
              <QrCode className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight">
                {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isLogin
                  ? 'Entre para gerar e baixar seu QR code.'
                  : 'Cadastre-se para gerar e baixar seu QR code.'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Alternância login/cadastro */}
          <div
            className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface)] p-1"
            role="tablist"
          >
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-lg py-2 text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-[var(--elevated)] text-[var(--fg)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--fg)]'
                }`}
              >
                {m === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Field icon={User} label="Nome">
                <input
                  type="text"
                  name="name"
                  required
                  className={inputClass}
                  placeholder="Seu nome"
                  autoComplete="name"
                />
              </Field>
            )}

            <Field icon={Mail} label="E-mail">
              <input
                type="email"
                name="email"
                required
                className={inputClass}
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </Field>

            {isLogin && (
              <Field icon={Lock} label="Senha">
                <input
                  type="password"
                  name="password"
                  required
                  className={inputClass}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                />
              </Field>
            )}

            <button
              type="submit"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--brand-strong)] hover:shadow-lg"
            >
              {isLogin ? 'Entrar' : 'Criar conta'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--muted)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
            Seus dados estão seguros. Sem spam, sem complicação.
          </p>
        </div>
      </div>
    </div>
  );
}
