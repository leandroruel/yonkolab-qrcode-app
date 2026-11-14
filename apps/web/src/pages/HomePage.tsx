import { useQuery } from '@tanstack/react-query';
import { API_BASE_PATH } from '@yonkolab/shared';

interface HealthResponse {
  ok: boolean;
  service: string;
  ts: number;
}

export default function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthResponse> => {
      const res = await fetch(`${API_BASE_PATH}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as HealthResponse;
    },
  });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">QR codes dinâmicos</h1>
      <p className="text-neutral-600">
        Edite o destino, pause e acompanhe os scans — sem reimprimir o QR.
      </p>
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-neutral-500">API</h2>
        {health.isPending && <p className="text-sm text-neutral-500">Verificando…</p>}
        {health.isError && (
          <p className="text-sm text-red-600">API indisponível: {String(health.error)}</p>
        )}
        {health.isSuccess && (
          <p className="text-sm text-emerald-700">
            Conectado à API ({health.data.service}) ✓
          </p>
        )}
      </div>
    </section>
  );
}
