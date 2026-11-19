import { useCallback } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export function Step2({
  type,
  url,
  setUrl,
  name,
  setName,
  country,
  setCountry,
  phone,
  setPhone,
  message,
  setMessage,
  payload,
  generateQr,
  contentValid,
}: {
  type: string;
  url: string;
  setUrl: (u: string) => void;
  name: string;
  setName: (n: string) => void;
  country: string;
  setCountry: (c: string) => void;
  phone: string;
  setPhone: (p: string) => void;
  message: string;
  setMessage: (m: string) => void;
  payload: string;
  generateQr: () => void;
  contentValid: boolean;
}) {
  return (
    <form
      className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--elevated)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        generateQr();
      }}
    >
      <h2 className="text-sm font-semibold text-[var(--fg)]">
        {type === 'whatsapp' ? 'Dados do WhatsApp' : 'Link de destino'}
      </h2>

      {type === 'site' ? (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="url">
              URL *
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemplo.com"
              className="w-full rounded-md border border-[var(--line)] px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="name">
              Nome do QR code
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="w-full rounded-md border border-[var(--line)] px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-[6rem_1fr] gap-3">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="country">
                País
              </label>
              <input
                id="country"
                type="text"
                inputMode="numeric"
                value={country}
                onChange={(e) => setCountry(e.target.value.replace(/\D/g, '').slice(0, 3))}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="phone">
                Telefone *
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 91234-5678"
                className="w-full rounded-md border border-[var(--line)] px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="message">
              Mensagem inicial
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={300}
              className="w-full rounded-md border border-[var(--line)] px-3 py-2 focus:ring-2 focus:ring-[var(--brand)] focus:outline-none"
              placeholder="Olá! Quero mais informações."
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => {/* navigation */}}
          className="inline-flex items-center gap-1 text-sm subtle hover:text-[var(--fg)]"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button
          type="submit"
          disabled={false}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-50"
        >
          Gerar QR code
        </button>
      </div>
    </form>
  );
}