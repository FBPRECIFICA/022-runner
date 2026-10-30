import { useEffect, useState, type RefObject } from 'react';

// true na primeira vez que o elemento entra na tela (e fica true).
export function useInView(ref: RefObject<Element | null>, rootMargin = '0px 0px -15% 0px') {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (!('IntersectionObserver' in window)) { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, inView]);
  return inView;
}

// Marca com .is-in cada [data-reveal] dentro de root quando ele entra na tela.
// Reexecuta quando `key` muda (ex.: eventos reais chegaram e trocaram os cards).
export function useReveal(root: RefObject<Element | null>, key: unknown) {
  useEffect(() => {
    const els = Array.from(root.current?.querySelectorAll('[data-reveal]:not(.is-in)') ?? []);
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [root, key]);
}
