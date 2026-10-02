import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { esVerdadero } from '@fitia/shared';
import { useSesion } from '../auth/SesionContext';
import { useScrollAlNavegar } from '../publico/LayoutPublico';
import { Cargando } from '../ui/Estados';
import { Icono, type NombreIcono } from '../ui/Iconos';
import { Logo, Simbolo } from '../ui/Logo';

const NAV: [string, string, NombreIcono][] = [
  ['/app', 'Inicio', 'inicio'],
  ['/app/rutina', 'Mi rutina', 'rutina'],
  ['/app/entreno', 'Entrenar', 'entreno'],
  ['/app/progreso', 'Progreso', 'progreso'],
  ['/app/lumbar', 'Zona lumbar', 'lumbar'],
  ['/app/planes', 'Planes', 'planes'],
  ['/app/perfil', 'Perfil', 'perfil'],
];

/** Solo el rol USUARIO entra a la app web; sin sesión → /ingresar. */
export function RutaPrivada() {
  const { estado, usuario } = useSesion();
  const loc = useLocation();
  if (estado === 'cargando')
    return (
      <div className="contenedor">
        <Cargando texto="Recuperando tu sesión…" alto="min-h-screen" />
      </div>
    );
  if (estado !== 'autenticado' || usuario?.rol !== 'USUARIO') return <Navigate to="/ingresar" replace state={{ desde: loc.pathname }} />;
  return <Outlet />;
}

export function iniciales(nombre: string | null | undefined) {
  return (nombre ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function TarjetaCupo() {
  const { perfil } = useSesion();
  const navigate = useNavigate();
  const plan = perfil?.plan;
  const max = plan?.rutinas_ia_mes ?? 2;
  const cupo = Math.max(0, Math.min(max, perfil?.cupo_ia_restante ?? 0));
  const free = !plan || esVerdadero(plan.con_publicidad);
  return (
    <div className="tarjeta flex flex-col gap-2.5 p-4">
      <div className="flex items-center justify-between">
        <span className="font-metrica text-[11px] tracking-[.06em] text-niebla">RUTINAS IA · MES</span>
        <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-bold tracking-[.08em] ${free ? 'bg-grafito text-hueso' : 'bg-voltaje text-asfalto'}`}>
          {free ? 'FREE' : 'PRO'}
        </span>
      </div>
      <div className="cifra text-[28px] font-bold leading-none">
        {cupo}
        <span className="text-[15px] font-normal text-niebla"> / {max} disponibles</span>
      </div>
      <div className="flex gap-[3px]">
        {Array.from({ length: Math.min(max, 10) }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 ${i < cupo ? 'bg-voltaje' : 'bg-grafito'}`} />
        ))}
      </div>
      {free && (
        <button
          onClick={() => navigate('/app/planes')}
          className="min-h-[44px] rounded border-2 border-voltaje text-sm font-semibold text-voltaje hover:bg-voltaje hover:text-asfalto active:translate-y-0.5"
        >
          Pásate a Pro · 10 al mes
        </button>
      )}
    </div>
  );
}

/** Contenedor de la app del usuario: sidebar de 256 px en escritorio; barra superior + tab bar en celular. */
export function AppLayout() {
  useScrollAlNavegar();
  const { perfil, usuario } = useSesion();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const nombre = perfil?.nombre ?? `${usuario?.nombres ?? ''} ${usuario?.apellidos ?? ''}`;
  const enEntreno = pathname.startsWith('/app/entreno');
  const enOnboarding = pathname.startsWith('/app/onboarding');

  // El modo entreno y el onboarding van a pantalla completa
  if (enEntreno || enOnboarding) return <Outlet />;

  const itemMovil = (to: string, etiqueta: string, ic: NombreIcono) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/app'}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold no-underline ${
          isActive ? 'text-voltaje shadow-[inset_0_3px_0_#D4FF00]' : 'text-niebla'
        }`
      }
    >
      <Icono nombre={ic} tam={24} />
      {etiqueta}
    </NavLink>
  );

  return (
    <div className="min-h-screen">
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-grafito bg-asfalto px-4 pb-5 pt-6 lg:flex">
        <button onClick={() => navigate('/app')} aria-label="FitIA, inicio" className="flex min-h-[44px] items-center px-2">
          <Logo ancho={36} tamTexto={28} />
        </button>
        <nav aria-label="Principal" className="mt-8 flex flex-col gap-1">
          {NAV.map(([to, etiqueta, ic]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              className={({ isActive }) =>
                `flex min-h-[48px] items-center gap-3 rounded px-3 text-[15px] no-underline transition-colors ${
                  isActive
                    ? 'bg-voltaje font-bold text-asfalto hover:text-asfalto'
                    : 'font-semibold text-niebla hover:bg-concreto hover:text-hueso active:translate-y-0.5'
                }`
              }
            >
              <Icono nombre={ic} tam={22} />
              {etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <TarjetaCupo />
          <button
            onClick={() => navigate('/app/perfil')}
            className="flex min-h-[56px] items-center gap-3 rounded px-2 py-1.5 text-left hover:bg-concreto"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-hueso font-titulo text-lg text-asfalto">
              {iniciales(nombre)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{nombre}</span>
              <span className="block truncate text-[13px] text-niebla">{perfil?.email ?? usuario?.email}</span>
            </span>
          </button>
        </div>
      </aside>

      {/* Celular */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-[60px] items-center justify-between border-b border-grafito bg-asfalto/95 pl-4 pr-3 backdrop-blur-[10px] lg:hidden">
        <button onClick={() => navigate('/app')} aria-label="FitIA, inicio" className="flex min-h-[44px] items-center gap-2">
          <Simbolo ancho={30} />
          <span className="font-titulo text-2xl leading-none">
            FIT<span className="text-voltaje">IA</span>
          </span>
        </button>
        <div className="flex items-center gap-1">
          {(
            [
              ['/app/lumbar', 'Zona lumbar', 'lumbar'],
              ['/app/planes', 'Planes', 'planes'],
            ] as const
          ).map(([to, label, ic]) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                `flex h-11 w-11 items-center justify-center rounded ${isActive ? 'bg-voltaje text-asfalto' : 'text-hueso'}`
              }
            >
              <Icono nombre={ic} tam={22} />
            </NavLink>
          ))}
        </div>
      </header>
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 flex h-[72px] items-stretch border-t border-grafito bg-concreto px-1 lg:hidden">
        {itemMovil('/app', 'Inicio', 'inicio')}
        {itemMovil('/app/rutina', 'Rutina', 'rutina')}
        <div className="flex flex-1 items-center justify-center">
          <button
            onClick={() => navigate('/app/entreno')}
            aria-label="Entrenar"
            className="-mt-7 flex h-[60px] w-[60px] -rotate-[7deg] items-center justify-center rounded bg-voltaje text-asfalto shadow-golpe transition-[transform,box-shadow] duration-golpe active:shadow-golpe-2"
          >
            <Icono nombre="entreno" tam={28} />
          </button>
        </div>
        {itemMovil('/app/progreso', 'Progreso', 'progreso')}
        {itemMovil('/app/perfil', 'Perfil', 'perfil')}
      </nav>

      <main className="px-4 pb-28 pt-[84px] sm:px-6 lg:ml-64 lg:px-[clamp(24px,3.4vw,56px)] lg:pb-16 lg:pt-10">
        <div className="mx-auto max-w-[1180px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
