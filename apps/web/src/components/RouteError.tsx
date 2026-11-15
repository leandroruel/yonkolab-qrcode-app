import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

function isChunkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /dynamically imported module|importing a module script failed|loading chunk/i.test(
    error.message,
  );
}

/**
 * Tela de erro do roteador. Cobre principalmente falha ao baixar um chunk
 * (deploy novo com HTML antigo em cache) e dá um caminho claro de recuperação.
 */
export default function RouteError() {
  const error = useRouteError();
  const chunkError = isChunkError(error);
  const status = isRouteErrorResponse(error) ? error.status : null;

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="card w-full max-w-md p-6 text-center" style={{ boxShadow: 'var(--shadow)' }}>
        <span
          className="mx-auto grid h-12 w-12 place-items-center rounded-2xl"
          style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }}
          aria-hidden
        >
          <RefreshCw className="h-6 w-6" />
        </span>

        <h1 className="mt-5 text-xl font-bold tracking-tight">
          {chunkError ? 'Uma atualização foi publicada' : 'Não foi possível abrir esta página'}
        </h1>

        <p className="mt-2 text-sm subtle">
          {chunkError
            ? 'A versão aberta no navegador ficou desatualizada. Recarregue para usar a versão mais recente.'
            : 'Algo deu errado ao carregar o conteúdo. Tente recarregar; se continuar, volte ao início.'}
          {status ? ` (HTTP ${status})` : null}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Recarregar
          </button>
          <Link to="/" className="btn btn-ghost">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
