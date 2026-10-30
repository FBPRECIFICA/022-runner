import { useEffect, useState, type RefObject } from 'react';

// Visto = topo do elemento acima de 85% da altura da tela (inclui o que já
// ficou para trás). Checado na rolagem, não com IntersectionObserver: um pulo
// grande de rolagem (dedo rápido, âncora) atravessa o elemento sem disparar o
// observer, e o contador ficava parado em 0.
const seen = (el: Element) => el.getBoundingClientRect().top < window.innerHeight * 0.85;

function onScrollFrame(fn: () => void) {
  let frame = 0;
  const handler = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; fn(); }); };
  window.addEventListener('scroll', handler, { passive: true });
  window.addEventListener('resize', handler);
  fn();
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', handler);
    window.removeEventListener('resize', handler);
  };
}

// true na primeira vez que o elemento é visto (e fica true).
export function useInView(ref: RefObject<Element | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (inView) return;
    return onScrollFrame(() => { if (ref.current && seen(ref.current)) setInView(true); });
  }, [ref, inView]);
  return inView;
}

// Marca com .is-in cada [data-reveal] dentro de root quando ele é visto.
// Reexecuta quando `key` muda (ex.: eventos reais chegaram e trocaram os cards).
export function useReveal(root: RefObject<Element | null>, key: unknown) {
  useEffect(() => onScrollFrame(() => {
    root.current?.querySelectorAll('[data-reveal]:not(.is-in)').forEach(el => { if (seen(el)) el.classList.add('is-in'); });
  }), [root, key]);
}
