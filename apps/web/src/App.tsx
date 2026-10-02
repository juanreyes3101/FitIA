import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout, RutaPrivada } from './app/AppLayout';
import { CalculadoraImc } from './publico/CalculadoraImc';
import { Inicio } from './publico/Inicio';
import { Ingresar, NoEncontrado } from './publico/Ingresar';
import { LayoutPublico } from './publico/LayoutPublico';
import { Planes } from './publico/Planes';
import { SobreNosotros } from './publico/SobreNosotros';
import { Cargando } from './ui/Estados';

// La app del usuario (con Recharts) se carga aparte: el sitio público queda liviano para datos móviles
const Dashboard = lazy(() => import('./app/Dashboard').then((m) => ({ default: m.Dashboard })));
const Onboarding = lazy(() => import('./app/Onboarding').then((m) => ({ default: m.Onboarding })));
const Rutina = lazy(() => import('./app/Rutina').then((m) => ({ default: m.Rutina })));
const Ejercicio = lazy(() => import('./app/Ejercicio').then((m) => ({ default: m.Ejercicio })));
const Entreno = lazy(() => import('./app/Entreno').then((m) => ({ default: m.Entreno })));
const Progreso = lazy(() => import('./app/Progreso').then((m) => ({ default: m.Progreso })));
const Lumbar = lazy(() => import('./app/Lumbar').then((m) => ({ default: m.Lumbar })));
const PlanesApp = lazy(() => import('./app/PlanesApp').then((m) => ({ default: m.PlanesApp })));
const Perfil = lazy(() => import('./app/Perfil').then((m) => ({ default: m.Perfil })));

const P = ({ children }: { children: ReactNode }) => <Suspense fallback={<Cargando />}>{children}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route element={<LayoutPublico />}>
        <Route index element={<Inicio />} />
        <Route path="imc" element={<CalculadoraImc />} />
        <Route path="planes" element={<Planes />} />
        <Route path="nosotros" element={<SobreNosotros />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
      <Route element={<LayoutPublico conFooter={false} />}>
        <Route path="ingresar" element={<Ingresar />} />
      </Route>
      <Route path="app" element={<RutaPrivada />}>
        <Route element={<AppLayout />}>
          <Route index element={<P><Dashboard /></P>} />
          <Route path="onboarding" element={<P><Onboarding /></P>} />
          <Route path="rutina" element={<P><Rutina /></P>} />
          <Route path="ejercicio/:id" element={<P><Ejercicio /></P>} />
          <Route path="entreno" element={<P><Entreno /></P>} />
          <Route path="progreso" element={<P><Progreso /></P>} />
          <Route path="lumbar" element={<P><Lumbar /></P>} />
          <Route path="planes" element={<P><PlanesApp /></P>} />
          <Route path="perfil" element={<P><Perfil /></P>} />
        </Route>
      </Route>
    </Routes>
  );
}
