import { Link } from 'react-router-dom';
import { esVerdadero, type UbicacionAnuncio } from '@fitia/shared';
import { api } from '../api';
import { useSesion } from '../auth/SesionContext';
import { useDatos } from '../hooks/useDatos';

/** Publicidad: solo se muestra en el plan Free (con_publicidad). En Pro no se pide ni se pinta. */
export function BannerAnuncio({ ubicacion = 'BANNER_HOME' }: { ubicacion?: UbicacionAnuncio }) {
  const { perfil } = useSesion();
  const conPublicidad = !perfil?.plan || esVerdadero(perfil.plan.con_publicidad);
  const { datos } = useDatos(() => (conPublicidad ? api.anuncios(ubicacion) : Promise.resolve(null)), [conPublicidad, ubicacion]);
  const a = datos?.anuncio;
  if (!conPublicidad || !a) return null;
  return (
    <aside aria-label="Publicidad" className="relative flex flex-wrap items-center gap-5 rounded bg-hueso px-6 pb-5 pt-7 text-asfalto">
      <span className="absolute left-3 top-2 font-metrica text-[11px] tracking-[.06em] text-humo">PUBLICIDAD</span>
      <div className="flex h-[72px] w-[120px] flex-none items-center justify-center rounded-sm bg-yeso font-titulo text-3xl text-humo">
        {a.anunciante.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-[220px] flex-1">
        <div className="text-[17px] font-bold">{a.anunciante}</div>
        <div className="text-[15px] text-[#3A3A40]">{a.titulo}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {a.destino_url && (
          <a href={a.destino_url} target="_blank" rel="noopener noreferrer sponsored" className="inline-flex min-h-[44px] items-center rounded bg-asfalto px-4 text-[15px] font-semibold text-hueso no-underline hover:bg-grafito hover:text-hueso">
            Ver oferta
          </a>
        )}
        <Link to="/app/planes" className="inline-flex min-h-[44px] items-center px-3 text-[15px] font-semibold text-asfalto underline underline-offset-4 hover:text-asfalto">
          Quitar anuncios con Pro
        </Link>
      </div>
    </aside>
  );
}
