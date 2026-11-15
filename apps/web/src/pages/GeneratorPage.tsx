import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GeneratorPage() {
  const navigate = useNavigate();

  const [type, setType] = useState<'site' | 'whatsapp'>('site');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string>('');

  const generateQr = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { QrCodeStyling } = await import('qr-code-styling');
      const dataUrl = await QrCodeStyling.toDataUrl({
        data: url,
        width: 300,
        height: 300,
        color: '#000000',
        bgColor: '#FFFFFF',
        margin: 2,
      });
      setQrDataUrl(dataUrl);
      setLoading(false);
      setStep(3);
    } catch (err) {
      setError('Erro ao gerar QR code');
      setLoading(false);
      window.alert('Não foi possível gerar o QR code. Tente novamente.');
    }
  }, [url]);

  // Render step based on current step state
  const renderStep = () => {
    if (step === 1) {
      return (
        <div>
          <h3 className="font-medium text-sm text-gray-600 dark:text-gray-300 mb-2">Tipo</h3>
          <div className="flex gap-2">
            <button
              onClick={() => { setType('site'); setStep(2); }}
              className="flex-1 py-2 px-4 rounded-md border border-gray-300 hover:border-primary hover:text-primary"
            >
              <Link className="h-4 w-4" /> Site
            </button>
            <button
              onClick={() => { setType('whatsapp'); setStep(2); }}
              className="flex-1 py-2 px-4 rounded-md border border-gray-300 hover:border-primary hover:text-primary"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div>
          <h3 className="font-medium text-sm text-gray-600 dark:text-gray-300 mb-2">Conteúdo</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generateQr();
            }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Link de destino*
              </label>
              <input
                placeholder="https://exemplo.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome do QR
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={60}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 text-lg font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              {step === 2 ? 'Gerar QR Code' : 'Concluído'}
            </button>
          </form>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div>
          <h3 className="font-medium text-sm text-gray-600 dark:text-gray-300 mb-3">Prévia</h3>
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-full max-w-max h-auto rounded"
            />
          )}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => navigator.clipboard.writeText(qrDataUrl || '')}
              className="py-2 px-4 text-sm text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Copiar"
            >
              <Link className="h-4 w-4" /> Copiar
            </button>
            <button
              onClick={() => window.open(qrDataUrl || '', '_blank')}
              className="py-2 px-4 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors"
            >
              <Eye className="h-4 w-4" /> Ver
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {type === 'site' && 'Gerador de QR Code'}
        </h1>

        <nav className="stepper mb-6">
          <div className="stepper-header">
            <div className="stepper-item {step >= 1 ? 'stepper-item-active' : 'stepper-item-inactive'}">
              <span className="stepper-circle">1</span>
              <span className="stepper-label">Tipo</span>
            </div>
            <div className="stepper-line"></div>
            <div className="stepper-item {step >= 2 ? 'stepper-item-active' : 'stepper-item-inactive'}">
              <span className="stepper-circle">2</span>
              <span className="stepper-label">Conteúdo</span>
            </div>
            <div className="stepper-item {step >= 3 ? 'stepper-item-active' : 'stepper-item-inactive'}">
              <span className="stepper-circle">3</span>
              <span className="stepper-label">Personalizar</span>
            </div>
          </div>
          <div className="stepper-footer">
            <button onClick={() => step > 1 && setStep(step - 1)} className="stepper-prev">Voltar</button>
            <button onClick={() => step < 3 && setStep(step + 1)} className="stepper-next">Avançar</button>
          </div>
        </nav>

        {renderStep()}
      </div>
    </div>
  );
}