import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_PATH } from '@yonkolab/shared';

interface CreatedQr {
  id: string;
  code: string;
  name: string;
  destination: string;
  shortUrl?: string;
}

export default function CreatePage() {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreated(null);

    try {
      const res = await fetch(`${API_BASE_PATH}/v1/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), destination: destination.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError((data && data.error) || `Erro ${res.status} ao criar o QR code`);
        return;
      }

      setCreated(data.data as CreatedQr);
      setName('');
      setDestination('');
      formRef.current?.reset();
    } catch {
      setError('Erro de conexão com a API');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Criar QR code dinâmico</h1>
        <p className="mt-1 text-sm text-neutral-600">
          O destino pode ser alterado depois, sem reimprimir o QR.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {created && (
        <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p className="font-medium">QR code criado com sucesso!</p>
          <p className="break-all">
            Link curto:{' '}
            <a className="underline" href={created.shortUrl} target="_blank" rel="noreferrer">
              {created.shortUrl}
            </a>
          </p>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="name">
            Nome do QR code
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
            placeholder="Ex: Página inicial"
            maxLength={80}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="destination">
            Destino (URL)
          </label>
          <input
            id="destination"
            type="url"
            name="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
            placeholder="https://exemplo.com"
            maxLength={2048}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-neutral-900 px-4 py-3 text-lg font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? 'Criando…' : 'Criar QR code'}
        </button>
      </form>

      <p className="text-sm text-neutral-600">
        Prefere gerar o QR na hora?{' '}
        <Link className="underline" to="/generator">
          Abrir o gerador
        </Link>
      </p>
    </section>
  );
}
