import { API_BASE_PATH } from '@yonkolab/shared';
import { useEffect, useState } from 'react';

interface HealthResponse {
  ok: boolean;
  service: string;
  ts: number;
}

type HealthState =
  | { status: 'loading' }
  | { status: 'ok'; service: string }
  | { status: 'error'; message: string };

/** Diagnóstico da API (antiga home). Mantido em /status. */
export default function StatusPage() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch(`${API_BASE_PATH}/health`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as HealthResponse;
        setHealth({ status: 'ok', service: data.service });
      } catch (error) {
        if (controller.signal.aborted) return;
        setHealth({ status: 'error', message: String(error) });
      }
    })();

    return () => controller.abort();
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Status da API</h1>
        <p className="mt-1 text-sm subtle">
          Diagnóstico rápido do Worker. Esta página é só para verificação técnica.
        </p>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-medium subtle">Conexão</h2>
        {health.status === 'loading' && <p className="mt-2 text-sm subtle">Verificando…</p>}
        {health.status === 'error' && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            API indisponível: {health.message}
          </p>
        )}
        {health.status === 'ok' && (
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
            Conectado à API ({health.service}) ✓
          </p>
        )}
      </div>
    </section>
  );
}
