import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, Mail, QrCode, ShieldCheck, User, X } from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path
      fill="#4285F4"
      d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.8z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.14.01-3.6 2.8-.05.13C3.4 21.3 7.4 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4l-.01-.16-3.7-2.9-.12.06C.5 8.3 0 10.1 0 12s.5 3.7 1.3 5.4l3.9-3z"
    />
    <path
      fill="#EA4335"
      d="M12 4.6c2.2 0 3.7.9 4.6 1.7l3.3-3.2C18 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.3 6.6l3.9 3c1-2.9 3.7-5 6.8-5z"
    />
  </svg>
);

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const formData = new FormData(e.target as HTMLFormElement);
        const email = formData.get('email') as string;
        const name = formData.get('name') as string;
        // Ainda não existe endpoint de signup no worker (só OAuth Google);
        // segue o mesmo modo demo do login: sessão local + perfil salvo.
        localStorage.setItem('yonkolab_user', JSON.stringify({ name, email }));
      }
      localStorage.setItem('yonkolab_auth', 'authenticated');
      setIsOpen(false);
      if (onLoginSuccess) onLoginSuccess();
      navigate(redirectTo ?? '/');
    } catch {
      setError('Não foi possível concluir. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLogin = mode === 'login';

  // Google OAuth: o worker cuida do fluxo e devolve o usuário para cá.
  const googleSignIn = () => {
    const next =
      redirectTo && redirectTo.startsWith('/')
        ? `/qrcode${redirectTo === '/' ? '/' : redirectTo}`
        : '/qrcode/';
    window.location.assign(`/qrcode/api/auth/google?next=${encodeURIComponent(next)}`);
  };

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

          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

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
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--brand-strong)] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isLogin ? 'Entrando…' : 'Criando conta…'}
                </>
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Criar conta'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--line)]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
              ou
            </span>
            <span className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <button
            type="button"
            onClick={googleSignIn}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--fg)] transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            <GoogleIcon />
            Continuar com Google
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--muted)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
            Seus dados estão seguros. Sem spam, sem complicação.
          </p>
        </div>
      </div>
    </div>
  );
}
