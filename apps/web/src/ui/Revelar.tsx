import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Aparición al hacer scroll: desplazamiento diagonal (−48, +40) → (0, 0) en 700 ms, escalonado. */
export function Revelar({ children, retraso = 0, className = '' }: { children: ReactNode; retraso?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setVisto(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisto(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-fitia motion-reduce:transform-none motion-reduce:opacity-100 ${className}`}
      style={{
        opacity: visto ? 1 : 0,
        transform: visto ? 'none' : 'translate3d(-48px, 40px, 0)',
        transitionDelay: `${retraso}ms`,
      }}
    >
      {children}
    </div>
  );
}
