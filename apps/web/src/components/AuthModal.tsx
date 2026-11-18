import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail } from 'lucide-react';

export function AuthModal({
  isOpen,
  setIsOpen,
  onLoginSuccess,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLoginSuccess?: () => void;
}) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

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
        navigate('/');
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
      navigate('/');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-zxl z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl transform scale-100 transition-transform">
        <h2 className="text-2xl font-bold mb-4 text-center text-[var(--fg)]">
          {mode === 'login' ? 'Login' : 'Cadastro'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--fg)]">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none bg-[var(--elevated)] text-[var(--fg)] placeholder-[var(--muted)]"
              placeholder="seu@email.com"
            />
          </div>

          {mode === 'login' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--fg)]">
                Senha
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none bg-[var(--elevated)] text-[var(--fg)] placeholder-[var(--muted)]"
                placeholder="minha senha"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--fg)]">
                Nome
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none bg-[var(--elevated)] text-[var(--fg)] placeholder-[var(--muted)]"
                placeholder="Seu nome"
              />
            </div>
          )}

          <div className="flex justify-between text-sm subtle">
            <a
              href="#"
              onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
              className="text-[var(--muted)] hover:text-[var(--fg)]"
            >
              {mode === 'login' ? 'Criar conta' : 'Já tem conta? Fazer login'}
            </a>
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-[var(--brand)] px-4 py-2 text-white font-medium transition-colors hover:bg-[var(--brand-strong)]"
          >
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  );
}