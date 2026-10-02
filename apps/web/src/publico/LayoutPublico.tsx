import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { NavPublica } from './NavPublica';

/** Al navegar: va al ancla (#como, #registro) o al inicio de la página. */
export function useScrollAlNavegar() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) return el.scrollIntoView({ behavior: 'smooth' });
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
}

export function LayoutPublico({ conFooter = true }: { conFooter?: boolean }) {
  useScrollAlNavegar();
  return (
    <>
      <NavPublica />
      <main>
        <Outlet />
      </main>
      {conFooter && <Footer />}
    </>
  );
}
