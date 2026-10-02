import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useSesion } from '../auth/SesionContext';
import { clasesBoton } from '../ui/Boton';
import { Icono } from '../ui/Iconos';
import { Logo } from '../ui/Logo';

const LINKS = [
  { to: '/#como', etiqueta: 'Cómo funciona' },
  { to: '/imc', etiqueta: 'Calculadora IMC' },
  { to: '/planes', etiqueta: 'Planes' },
  { to: '/nosotros', etiqueta: 'Sobre nosotros' },
];

// Navbar: arriba 88 px transparente → con scroll > 40 px, 64 px en Asfalto 94 % + borde.
export function NavPublica() {
  const [compacta, setCompacta] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();
  const { estado, usuario } = useSesion();
  const dentro = estado === 'autenticado' && usuario?.rol === 'USUARIO';

  useEffect(() => {
    const onScroll = () => setCompacta(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setAbierto(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [abierto]);

  const alto = compacta || abierto ? 64 : 88;
  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-[100] backdrop-blur-[10px] transition-[height,background-color,border-color] duration-[260ms] ease-fitia"
        style={{
          height: alto,
          background: compacta || abierto ? 'rgba(11,11,12,.94)' : 'transparent',
          borderBottom: `1px solid ${compacta || abierto ? '#2A2A2E' : 'transparent'}`,
        }}
      >
        <div className="contenedor flex h-full items-center justify-between gap-6">
          <Link to="/" aria-label="FitIA, inicio" className="flex min-h-[44px] items-center no-underline">
            <Logo ancho={compacta ? 36 : 44} tamTexto={compacta ? 24 : 30} />
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center px-3.5 text-[15px] font-semibold no-underline transition-[color,box-shadow] duration-100 hover:text-hueso hover:shadow-[inset_0_-3px_0_#D4FF00] ${
                    isActive && !l.to.includes('#') ? 'text-hueso shadow-[inset_0_-3px_0_#D4FF00]' : 'text-niebla'
                  }`
                }
              >
                {l.etiqueta}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            {dentro ? (
              <Link to="/app" className={clasesBoton('primario', 'sm')}>
                Ir a mi rutina
              </Link>
            ) : (
              <>
                <Link to="/ingresar" className={clasesBoton('fantasma', 'sm')}>
                  Ingresar
                </Link>
                <Link to="/ingresar#registro" className={clasesBoton('primario', 'sm')}>
                  Empieza gratis
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <Link to={dentro ? '/app' : '/ingresar#registro'} className={clasesBoton('primario', 'sm', '!px-3.5 text-sm')}>
              {dentro ? 'Mi rutina' : 'Empieza gratis'}
            </Link>
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-label="Menú"
              aria-expanded={abierto}
              className="flex h-11 w-11 items-center justify-center rounded border-2 border-grafito text-hueso active:translate-y-0.5"
            >
              <Icono nombre={abierto ? 'cerrar' : 'menu'} tam={22} />
            </button>
          </div>
        </div>
      </header>
      {abierto && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-[99] flex flex-col overflow-auto bg-asfalto px-4 pt-6 lg:hidden">
          <nav aria-label="Menú móvil" className="flex flex-col">
            {LINKS.map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setAbierto(false)}
                className="flex items-baseline gap-4 border-b border-grafito py-4 font-titulo text-[40px] uppercase leading-none text-hueso no-underline"
              >
                <span className="font-metrica text-[13px] text-voltaje">0{i + 1}</span>
                {l.etiqueta}
              </Link>
            ))}
          </nav>
          <div className="mt-8 flex flex-col gap-3 pb-8">
            <Link to={dentro ? '/app' : '/ingresar'} className={clasesBoton('secundario', 'md')}>
              {dentro ? 'Ir a mi rutina' : 'Ingresar'}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
