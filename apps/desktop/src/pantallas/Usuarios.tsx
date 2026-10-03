import { useMemo, useState, type FormEvent } from 'react';
import { CLASIFICACIONES_IMC, type ClasificacionImc, type EstadoUsuario, type Rol, type Usuario, type UsuarioAdmin } from '@fitia/shared';
import { admin } from '../api';
import { useDatos } from '../hooks/useDatos';
import { aCsv, guardarCsv } from '../lib/csv';
import { decimal, dia, entero, iniciales, nombreCompleto } from '../lib/formato';
import { useSesion } from '../sesion/SesionContext';
import { Boton } from '../ui/Boton';
import { Dialogo } from '../ui/Dialogo';
import { Cargando, ErrorEstado, mensajeError } from '../ui/Estados';
import { useToast } from '../ui/Toasts';

const ROLES: Record<Rol, string> = { USUARIO: 'Usuario', ENTRENADOR: 'Entrenador', ADMIN: 'Administrador' };
const ESTADOS: Record<EstadoUsuario, [string, string]> = {
  ACTIVO: ['Activo', 'text-exito'], INACTIVO: ['Inactivo', 'text-niebla'], BLOQUEADO: ['Bloqueado', 'text-error'],
};
const COLOR_IMC: Record<ClasificacionImc, string> = {
  BAJO_PESO: 'text-advertencia', NORMAL: 'text-exito', SOBREPESO: 'text-voltaje', OBESIDAD: 'text-senal',
};
const AVATAR: Record<Rol, string> = { USUARIO: 'bg-hueso', ENTRENADOR: 'bg-voltaje', ADMIN: 'bg-advertencia' };

export default function Usuarios() {
  const { usuario: yo } = useSesion();
  const avisar = useToast();
  const lista = useDatos(() => admin.usuarios.listar(), []);
  const [q, setQ] = useState('');
  const [rol, setRol] = useState<Rol | ''>('');
  const [estado, setEstado] = useState<EstadoUsuario | ''>('');
  const [plan, setPlan] = useState('');
  const [selId, setSelId] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);

  const usuarios = lista.datos ?? [];
  const planes = useMemo(() => [...new Set(usuarios.map((u) => u.plan).filter(Boolean))] as string[], [usuarios]);
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return usuarios.filter((u) =>
      (!t || `${nombreCompleto(u)} ${u.email}`.toLowerCase().includes(t)) &&
      (!rol || u.rol === rol) && (!estado || u.estado === estado) && (!plan || u.plan === plan));
  }, [usuarios, q, rol, estado, plan]);
  const sel = usuarios.find((u) => u.id === selId) ?? null;
  const hayFiltros = !!(q || rol || estado || plan);

  function reemplazar(u: Usuario) {
    lista.setDatos(usuarios.map((x) => (x.id === u.id ? { ...x, ...u } : x)));
  }

  async function editar(u: UsuarioAdmin, cambios: { rol?: Rol; estado?: EstadoUsuario }, texto: string) {
    try {
      reemplazar(await admin.usuarios.editar(u.id, cambios));
      avisar('ok', texto, nombreCompleto(u));
    } catch (e) {
      avisar('err', 'No se pudo guardar', mensajeError(e));
    }
  }

  async function exportar() {
    const csv = aCsv(filtrados.map((u) => ({ ...u, nombre: nombreCompleto(u), rol: ROLES[u.rol],
      clasificacion: u.clasificacion_imc ? CLASIFICACIONES_IMC[u.clasificacion_imc] : '' })), [
      ['id', 'ID'], ['nombre', 'Nombre'], ['email', 'Correo'], ['rol', 'Rol'], ['plan', 'Plan'], ['imc', 'IMC'],
      ['clasificacion', 'Clasificación IMC'], ['ultimo_acceso', 'Último acceso'], ['estado', 'Estado'],
    ]);
    const ruta = await guardarCsv('usuarios_fitia.csv', csv);
    if (ruta) avisar('ok', 'CSV exportado', `${filtrados.length} usuarios`);
  }

  const activos = usuarios.filter((u) => u.estado === 'ACTIVO').length;
  return (
    <div className="flex animate-entrada flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">{lista.datos ? `${entero(usuarios.length)} CUENTAS · ${entero(activos)} ACTIVAS` : 'CUENTAS'}</div>
          <h1 className="titulo-pagina">Usuarios</h1>
        </div>
        <div className="flex gap-2">
          <Boton onClick={() => void exportar()} disabled={!filtrados.length}>Exportar CSV</Boton>
          <Boton variante="primario" onClick={() => setCreando(true)}>+ Nuevo usuario</Boton>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[240px] flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A9AA0" strokeWidth="2" strokeLinecap="square" className="absolute left-[10px] top-1/2 -translate-y-1/2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o correo" aria-label="Buscar" className="campo min-h-[36px] pl-[34px]" />
        </label>
        <select value={rol} onChange={(e) => setRol(e.target.value as Rol | '')} aria-label="Rol" className={`campo min-h-[36px] w-auto ${rol ? 'border-voltaje' : ''}`}>
          <option value="">Todos los roles</option>
          {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoUsuario | '')} aria-label="Estado" className={`campo min-h-[36px] w-auto ${estado ? 'border-voltaje' : ''}`}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan" className={`campo min-h-[36px] w-auto ${plan ? 'border-voltaje' : ''}`}>
          <option value="">Todos los planes</option>
          {planes.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {hayFiltros && (
          <button type="button" onClick={() => { setQ(''); setRol(''); setEstado(''); setPlan(''); }} className="min-h-[36px] px-[10px] text-[13px] font-semibold text-voltaje">
            Limpiar
          </button>
        )}
      </div>

      {lista.cargando && !lista.datos ? (
        <Cargando />
      ) : lista.error ? (
        <ErrorEstado error={lista.error} reintentar={lista.recargar} />
      ) : (
        <div className={`grid items-start gap-[10px] ${sel ? 'grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
          <div className="max-h-[calc(100vh-250px)] overflow-auto rounded border border-grafito bg-concreto">
            <table>
              <thead>
                <tr className="sticky top-0 z-[1] bg-carbon">
                  {['USUARIO', 'ROL', 'PLAN', 'IMC', 'CONDICIÓN', 'ÚLTIMO ACCESO', 'ESTADO'].map((h) => (
                    <th key={h} className={`etiqueta whitespace-nowrap px-3 py-[9px] ${h === 'IMC' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => {
                  const [est, colorEst] = ESTADOS[u.estado];
                  return (
                    <tr key={u.id} onClick={() => setSelId(u.id === selId ? null : u.id)} aria-selected={u.id === selId}
                      className={`cursor-pointer border-t border-grafito hover:bg-fila ${u.id === selId ? 'bg-rejilla' : ''} ${u.estado === 'ACTIVO' ? '' : 'opacity-60'}`}>
                      <td className="px-3 py-[7px]">
                        <div className="flex items-center gap-[10px]">
                          <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-sm font-titulo text-[13px] text-asfalto ${AVATAR[u.rol]}`}>{iniciales(u)}</span>
                          <span className="min-w-0">
                            <span className="block whitespace-nowrap font-semibold">{nombreCompleto(u)}</span>
                            <span className="block whitespace-nowrap text-[12px] text-niebla">{u.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-[7px] text-[13px]">{ROLES[u.rol]}</td>
                      <td className="px-3 py-[7px]">
                        {u.plan ? (
                          <span className={`whitespace-nowrap rounded-sm px-[6px] py-[2px] text-[11px] font-bold ${/premium|pro/i.test(u.plan) ? 'bg-voltaje text-asfalto' : 'bg-grafito text-plata'}`}>{u.plan}</span>
                        ) : <span className="text-niebla">—</span>}
                      </td>
                      <td className={`px-3 py-[7px] text-right font-metrica text-[13px] ${u.clasificacion_imc ? COLOR_IMC[u.clasificacion_imc] : 'text-niebla'}`}>{u.imc ? decimal(u.imc) : '—'}</td>
                      <td className="px-3 py-[7px] text-[13px]">{u.clasificacion_imc ? CLASIFICACIONES_IMC[u.clasificacion_imc] : <span className="text-niebla">Sin medición</span>}</td>
                      <td className="whitespace-nowrap px-3 py-[7px] font-metrica text-[12px] text-niebla">{u.ultimo_acceso ? dia(u.ultimo_acceso) : 'Nunca'}</td>
                      <td className="px-3 py-[7px]">
                        <span className={`inline-flex items-center gap-[6px] text-[12px] font-bold ${colorEst}`}><span className="h-[7px] w-[7px] rounded-full bg-current" />{est}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filtrados.length && <div className="p-10 text-center text-niebla">Ningún usuario coincide con esos filtros.</div>}
          </div>

          {sel && (
            <aside className="sticky top-0 flex animate-entrada-corta flex-col gap-[14px] rounded border border-grafito bg-concreto p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-sm font-titulo text-[20px] text-asfalto ${AVATAR[sel.rol]}`}>{iniciales(sel)}</span>
                  <div className="min-w-0">
                    <div className="font-titulo text-[22px] leading-none">{nombreCompleto(sel)}</div>
                    <div className="truncate text-[12px] text-niebla">{sel.email}</div>
                  </div>
                </div>
                <button type="button" onClick={() => setSelId(null)} aria-label="Cerrar ficha" className="h-8 w-8 flex-none rounded text-niebla hover:bg-grafito hover:text-hueso">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-px border border-grafito bg-grafito">
                <div className="bg-concreto p-2"><div className="font-metrica text-[18px] font-bold">{sel.peso_kg ? decimal(sel.peso_kg) : '—'}</div><div className="text-[10px] font-bold text-niebla">KG</div></div>
                <div className="bg-concreto p-2"><div className={`font-metrica text-[18px] font-bold ${sel.clasificacion_imc ? COLOR_IMC[sel.clasificacion_imc] : ''}`}>{sel.imc ? decimal(sel.imc) : '—'}</div><div className="text-[10px] font-bold text-niebla">IMC</div></div>
                <div className="bg-concreto p-2"><div className="font-metrica text-[18px] font-bold">{sel.creado_en ? dia(sel.creado_en).split(' ').slice(1).join(' ') : '—'}</div><div className="text-[10px] font-bold text-niebla">ALTA</div></div>
              </div>
              <div className="flex flex-col gap-1 text-[13px]">
                <div className="flex justify-between gap-2"><span className="text-niebla">Condición por IMC</span><span>{sel.clasificacion_imc ? CLASIFICACIONES_IMC[sel.clasificacion_imc] : '—'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-niebla">Plan</span><span>{sel.plan ?? '—'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-niebla">Teléfono</span><span className="font-metrica">{sel.telefono ?? '—'}</span></div>
              </div>
              <label className="flex flex-col gap-[6px]">
                <span className="text-[12px] font-bold">Rol</span>
                <select value={sel.rol} disabled={sel.id === yo?.id} onChange={(e) => void editar(sel, { rol: e.target.value as Rol }, 'Rol actualizado')} className="campo min-h-[36px]">
                  {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {sel.id === yo?.id && <span className="text-[12px] text-niebla">No puedes cambiar tu propio rol.</span>}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={sel.estado === 'ACTIVO'} onClick={() => void editar(sel, { estado: 'ACTIVO' }, 'Cuenta activada')}
                  className="min-h-[38px] rounded border border-exito text-[13px] font-bold text-exito hover:bg-exito/[.12] disabled:cursor-not-allowed disabled:opacity-40">Activar</button>
                <button type="button" disabled={sel.estado === 'BLOQUEADO' || sel.id === yo?.id} onClick={() => void editar(sel, { estado: 'BLOQUEADO' }, 'Cuenta bloqueada')}
                  className="min-h-[38px] rounded border border-error text-[13px] font-bold text-error hover:bg-error/[.12] disabled:cursor-not-allowed disabled:opacity-40">Bloquear</button>
              </div>
            </aside>
          )}
        </div>
      )}

      <NuevoUsuario abierto={creando} alCerrar={() => setCreando(false)} alCrear={(u) => {
        lista.setDatos([...usuarios, u]);
        setSelId(u.id);
        avisar('ok', 'Usuario creado', nombreCompleto(u));
      }} />
    </div>
  );
}

function NuevoUsuario({ abierto, alCerrar, alCrear }: { abierto: boolean; alCerrar: () => void; alCrear: (u: UsuarioAdmin) => void }) {
  const vacio = { nombres: '', apellidos: '', email: '', password: '', telefono: '', rol: 'USUARIO' as Rol };
  const [f, setF] = useState(vacio);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!f.nombres.trim() || !f.apellidos.trim() || !f.email.trim()) return setError('Completa nombres, apellidos y correo.');
    if (f.password.length < 8) return setError('La contraseña temporal debe tener al menos 8 caracteres.');
    setOcupado(true);
    setError(null);
    try {
      const u = await admin.usuarios.crear({ ...f, telefono: f.telefono || null });
      // La respuesta de crear no trae plan ni IMC: se completan para la tabla
      alCrear({ ...u, telefono: f.telefono || null, creado_en: new Date().toISOString(), ultimo_acceso: null, peso_kg: null,
        imc: null, clasificacion_imc: null, plan: null });
      setF(vacio);
      alCerrar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setOcupado(false);
    }
  }

  const campo = (k: keyof typeof f, etiqueta: string, tipo = 'text') => (
    <label className="flex flex-col gap-[6px]">
      <span className="text-[12px] font-bold">{etiqueta}</span>
      <input type={tipo} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="campo" autoComplete="off" />
    </label>
  );
  return (
    <Dialogo titulo="Nuevo usuario" abierto={abierto} alCerrar={alCerrar}>
      <form onSubmit={enviar} className="flex flex-col gap-3" noValidate>
        <div className="grid grid-cols-2 gap-3">{campo('nombres', 'Nombres')}{campo('apellidos', 'Apellidos')}</div>
        {campo('email', 'Correo', 'email')}
        <div className="grid grid-cols-2 gap-3">{campo('password', 'Contraseña temporal', 'password')}{campo('telefono', 'Celular (opcional)', 'tel')}</div>
        <label className="flex flex-col gap-[6px]">
          <span className="text-[12px] font-bold">Rol</span>
          <select value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value as Rol })} className="campo">
            {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        {error && <p role="alert" className="text-[13px] text-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Boton variante="fantasma" onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="primario" type="submit" disabled={ocupado}>{ocupado ? 'Creando…' : 'Crear usuario'}</Boton>
        </div>
      </form>
    </Dialogo>
  );
}
