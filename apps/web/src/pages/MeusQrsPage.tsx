import { ArrowRight, Lock, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MeusQrsPage() {
  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus QR codes</h1>
        <p className="mt-2 text-sm subtle">
          Seus QR dinâmicos, com destino editável e estatísticas de scan.
        </p>
      </div>

      <div className="card space-y-4 p-6">
        <span
          className="grid h-11 w-11 place-items-center rounded-xl"
          style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }}
        >
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Login em breve</h2>
          <p className="mt-1 text-sm subtle">
            A entrada com Google ainda não está habilitada neste ambiente. Enquanto isso, você pode
            gerar QR estáticos gratuitamente, sem cadastro.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to="/criar" className="btn btn-primary">
            <QrCode className="h-4 w-4" aria-hidden />
            Criar QR agora
          </Link>
          <Link to="/" className="btn btn-ghost">
            Voltar para a página inicial
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      <p className="text-xs subtle">
        QR dinâmico: até 5 códigos no plano gratuito. Você poderá editar o destino, pausar e
        programar a validade.
      </p>
    </section>
  );
}
