import { useEffect } from 'react';

/**
 * Fade/translate na entrada das seções ao rolar.
 *
 * Usa posição (não interseção) para ser resiliente a rolagem rápida, âncoras e
 * restauração de scroll: qualquer bloco que já passou pelo viewport é revelado.
 * Com `prefers-reduced-motion`, tudo aparece de imediato.
 */
export function useReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      nodes.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    let frame = 0;

    const check = () => {
      frame = 0;
      const limit = window.innerHeight * 0.92;
      for (const el of nodes) {
        if (el.classList.contains('is-visible')) continue;
        if (el.getBoundingClientRect().top <= limit) el.classList.add('is-visible');
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };

    check();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
}
