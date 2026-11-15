import { lazy } from 'react';

const RELOAD_KEY = 'yonkolab:chunk-reload-at';

/**
 * `React.lazy` com uma recarga de segurança.
 *
 * Depois de um deploy, o HTML antigo pode apontar para chunks que já não existem
 * (os nomes mudam a cada build). Nesse caso recarregamos uma vez para pegar o
 * HTML atual; o limite de 10 s evita loop quando a falha é de rede.
 */
export function lazyWithRetry(loader: Parameters<typeof lazy>[0]) {
  return lazy(async () => {
    try {
      return await loader();
    } catch (error) {
      try {
        const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
        if (Date.now() - lastReload > 10_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
        }
      } catch {
        // sessionStorage indisponível: mostra o erro sem tentar recarregar.
      }
      throw error;
    }
  });
}
