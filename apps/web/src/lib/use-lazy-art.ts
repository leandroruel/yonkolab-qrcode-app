import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * `true` depois do primeiro período ocioso do navegador (ou de um timeout curto
 * quando `requestIdleCallback` não existe). Usado para adiar as demos de QR,
 * que carregam `qr-code-styling` e não devem competir com o primeiro paint.
 */
export function useIdleReady(timeout = 1500) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idleWindow = window as IdleWindow;

    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(() => setReady(true), { timeout });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    const timer = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(timer);
  }, [timeout]);

  return ready;
}

/**
 * `true` quando o elemento entra na margem informada ao redor do viewport.
 * Mantém as demos abaixo da dobra fora do caminho até o visitante rolar.
 */
export function useNearViewport(ref: RefObject<Element | null>, rootMargin = '600px') {
  const [near, setNear] = useState(() => !('IntersectionObserver' in window));

  useEffect(() => {
    if (near) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [near, ref, rootMargin]);

  return near;
}
