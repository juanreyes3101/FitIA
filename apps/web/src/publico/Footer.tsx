import { Link } from 'react-router-dom';
import { Logo } from '../ui/Logo';

const COLUMNAS = [
  {
    titulo: 'PRODUCTO',
    links: [
      ['Cómo funciona', '/#como'],
      ['Calculadora IMC', '/imc'],
      ['Planes', '/planes'],
      ['App para celular', '/#app'],
    ],
  },
  {
    titulo: 'PROYECTO',
    links: [
      ['Sobre nosotros', '/nosotros'],
      ['Equipo', '/nosotros#equipo'],
      ['Tecnología', '/nosotros#tecnologia'],
      ['Ingresar', '/ingresar'],
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-grafito bg-asfalto pb-10 pt-20">
      <div className="contenedor flex flex-col gap-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="max-w-[320px] text-[15px] text-niebla">
              Entrenamiento personalizado con IA para los gimnasios de barrio de Bogotá.
            </p>
          </div>
          {COLUMNAS.map((c) => (
            <div key={c.titulo} className="flex flex-col gap-3">
              <span className="kicker text-niebla">{c.titulo}</span>
              {c.links.map(([t, href]) => (
                <Link key={t} to={href} className="py-1 text-[15px] text-hueso no-underline hover:text-voltaje">
                  {t}
                </Link>
              ))}
            </div>
          ))}
          <div className="flex flex-col gap-3">
            <span className="kicker text-niebla">LEGAL</span>
            <span className="py-1 text-[15px] text-hueso">Términos y condiciones</span>
            <span className="py-1 text-[15px] text-hueso">Política de tratamiento de datos</span>
          </div>
        </div>
        <p className="max-w-[880px] border-t border-grafito pt-8 text-sm text-niebla">
          <strong className="text-hueso">Tratamiento de datos personales.</strong> FitIA trata tus datos (peso, estatura,
          molestias y progreso) solo para crear y ajustar tus rutinas, conforme a la Ley 1581 de 2012 y el Decreto 1377 de
          2013. Puedes conocer, actualizar, rectificar o pedir que borremos tus datos cuando quieras desde tu perfil.
        </p>
        <div className="flex flex-wrap justify-between gap-3 font-metrica text-[13px] text-niebla">
          <span>© 2026 FitIA · Bogotá, Colombia</span>
          <span>PROYECTO INTEGRADOR CUN 2026</span>
        </div>
      </div>
    </footer>
  );
}
