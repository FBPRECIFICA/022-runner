import { useEffect, useRef, useState } from 'react';
import { useInView } from './useInView';

// Sobe de 0 até `value` quando entra na tela. Termina sempre no valor exato.
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    const start = performance.now(), dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setShown(k === 1 ? value : Math.floor(value * (1 - Math.pow(2, -10 * k))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return <span ref={ref} className="tabular-nums">{shown.toLocaleString('pt-BR')}</span>;
}
