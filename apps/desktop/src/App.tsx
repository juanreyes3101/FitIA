import { lazy, Suspense, type ReactNode } from 'react';
import { BarraTitulo } from './shell/BarraTitulo';
import { Cabecera } from './shell/Cabecera';
import { Lateral } from './shell/Lateral';
import { NAV, useRuta, type Ruta } from './shell/rutas';
import { resumenSalud, SaludProvider, useSalud } from './shell/SaludContext';
import { Login } from './pantallas/Login';
import { useSesion, type UsuarioSesion } from './sesion/SesionContext';
import { Cargando } from './ui/Estados';

const Monitoreo = lazy(() => import('./pantallas/Monitoreo'));
const Resumen = lazy(() => import('./pantallas/Resumen'));
const Usuarios = lazy(() => import('./pantallas/Usuarios'));
const Ejercicios = lazy(() => import('./pantallas/Ejercicios'));
const Entrenadores = lazy(() => import('./pantallas/Entrenadores'));
const Planes = lazy(() => import('./pantallas/Planes'));
const Reportes = lazy(() => import('./pantallas/Reportes'));
const Configuracion = lazy(() => import('./pantallas/Configuracion'));

const PANTALLAS: Record<Ruta, () => ReactNode> = {
  resumen: () => <Resumen />,
  usuarios: () => <Usuarios />,
  entrenadores: () => <Entrenadores />,
  ejercicios: () => <Ejercicios />,
  planes: () => <Planes />,
  reportes: () => <Reportes />,
  monitoreo: () => <Monitoreo />,
  config: () => <Configuracion />,
};

export default function App() {
  const { estado, usuario } = useSesion();
  if (estado === 'cargando') {
    return (
      <div className="flex h-full flex-col">
        <BarraTitulo titulo="Iniciando" />
        <Cargando texto="Recuperando tu sesión…" alto="flex-1" />
      </div>
    );
  }
  if (!usuario) {
    return (
      <div className="flex h-full flex-col">
        <BarraTitulo titulo="Ingreso" />
        <div className="min-h-0 flex-1">
          <Login />
        </div>
      </div>
    );
  }
  return (
    <SaludProvider activo={usuario.rol === 'ADMIN'}>
      <Consola usuario={usuario} />
    </SaludProvider>
  );
}

function Consola({ usuario }: { usuario: UsuarioSesion }) {
  const { logout } = useSesion();
  const [ruta, ir] = useRuta(usuario.rol);
  const salud = useSalud();
  const abiertas = salud?.datos ? resumenSalud(salud.datos).abiertas : null;
  const titulo = NAV.find((n) => n.id === ruta)?.titulo ?? '';

  return (
    <div className="flex h-full flex-col">
      <BarraTitulo titulo={titulo} />
      <div className="flex min-h-0 flex-1">
        <Lateral usuario={usuario} ruta={ruta} ir={ir} abiertas={abiertas} salir={logout} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Cabecera irMonitoreo={usuario.rol === 'ADMIN' ? () => ir('monitoreo') : null} />
          <main id="principal" className="min-h-0 flex-1 overflow-auto px-5 pb-7 pt-[18px] min-[1500px]:px-8 min-[1500px]:pb-10 min-[1500px]:pt-6">
            <Suspense fallback={<Cargando />}>
              <div key={ruta}>{PANTALLAS[ruta]()}</div>
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
