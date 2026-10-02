// Revisión visual de FitIA web: recorre todas las rutas en 390 px (celular) y 1440 px (escritorio),
// detecta desbordes horizontales, dice qué elemento los causa y guarda capturas en apps/web/revision/.
//
// Requisitos: la web (npm run web) y la API (flask --app wsgi run) corriendo.
// Uso:  npm -w apps/web run revision            (sale con código 1 si hay desbordes)
// Variables opcionales: WEB_URL, API_URL, REVISION_EMAIL, REVISION_PASSWORD
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const WEB = process.env.WEB_URL ?? 'http://localhost:5173';
const API = process.env.API_URL ?? 'http://localhost:5000/api/v1';
const EMAIL = process.env.REVISION_EMAIL ?? 'laura@fitia.co';
const PASSWORD = process.env.REVISION_PASSWORD ?? 'Demo2026*';

const ANCHOS = [
  { ancho: 390, alto: 844, movil: true },
  { ancho: 1440, alto: 900, movil: false },
];

const PUBLICAS = [
  ['inicio', '/'],
  ['imc', '/imc'],
  ['planes', '/planes'],
  ['nosotros', '/nosotros'],
  ['ingresar', '/ingresar'],
  ['registro', '/ingresar#registro'],
  ['404', '/no-existe'],
];
// Solo lectura: ninguna de estas rutas escribe datos de Laura al abrirse
const APP = [
  ['app-dashboard', '/app'],
  ['app-onboarding', '/app/onboarding'],
  ['app-rutina', '/app/rutina'],
  ['app-ejercicio', '/app/ejercicio/6'],
  ['app-entreno', '/app/entreno'],
  ['app-progreso', '/app/progreso'],
  ['app-lumbar', '/app/lumbar'],
  ['app-planes', '/app/planes'],
  ['app-perfil', '/app/perfil'],
];

// Quita el respaldo (overflow-x: clip del body) solo mientras se mide, para ver la causa real
const SIN_RESPALDO = 'html, body { overflow: visible !important; }';

/** Corre en la página: mide el desborde y encuentra los elementos más externos que se salen. */
function medir(anchoNominal) {
  const vw = anchoNominal;
  const clipX = (el) => {
    const s = getComputedStyle(el);
    return ['hidden', 'clip', 'auto', 'scroll'].includes(s.overflowX) || s.clipPath !== 'none' || s.contain.includes('paint');
  };
  const recortado = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      if (clipX(p)) {
        const r = p.getBoundingClientRect();
        if (r.left >= -1 && r.right <= vw + 1) return true;
      }
    }
    return false;
  };
  const describir = (el) => {
    const cls = (typeof el.className === 'string' ? el.className : el.getAttribute('class') ?? '').trim().split(/\s+/).slice(0, 6).join('.');
    const texto = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls}` : ''}>${texto ? ` "${texto}"` : ''}`;
  };
  const fuera = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= vw + 1 && r.left >= -1) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    if (recortado(el)) continue;
    fuera.push(el);
  }
  // Solo los más externos: si el padre también se sale, el culpable es el padre
  const raiz = fuera.filter((el) => !fuera.includes(el.parentElement));
  const culpables = raiz
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { el: describir(el), izq: Math.round(r.left), der: Math.round(r.right), ancho: Math.round(r.width), exceso: Math.round(Math.max(r.right - vw, -r.left)) };
    })
    .sort((a, b) => b.exceso - a.exceso);
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    culpables,
  };
}

async function recorrer(pagina) {
  // Baja la página por tramos para disparar las animaciones de aparición (IntersectionObserver)
  const alto = await pagina.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < alto; y += 500) {
    await pagina.evaluate((yy) => window.scrollTo(0, yy), y);
    await pagina.waitForTimeout(60);
  }
  await pagina.evaluate(() => window.scrollTo(0, 0));
  await pagina.waitForTimeout(900);
}

async function revisarRuta(contexto, { ancho }, [nombre, ruta]) {
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await pagina.goto(WEB + ruta, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(400);
  await recorrer(pagina);

  const estilo = await pagina.addStyleTag({ content: SIN_RESPALDO });
  await pagina.waitForTimeout(100);
  const m = await pagina.evaluate(medir, ancho);
  await estilo.evaluate((n) => n.remove());

  const url = pagina.url().replace(WEB, '');
  await pagina.screenshot({ path: join(RAIZ, 'revision', String(ancho), `${nombre}.png`), fullPage: true });
  await pagina.close();
  const desborde = m.scrollWidth > ancho || m.innerWidth > ancho || m.culpables.length > 0;
  return { nombre, ruta, url, ancho, ...m, desborde, errores };
}

async function tokenRefresh() {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`No se pudo iniciar sesión como ${EMAIL} (HTTP ${r.status}). ¿La API está corriendo?`);
  return (await r.json()).refresh_token;
}

async function main() {
  const salud = await fetch(`${API}/health`).catch(() => null);
  if (!salud?.ok) throw new Error(`La API no responde en ${API}. Arráncala con: cd backend && .venv\\Scripts\\flask --app wsgi run`);
  const web = await fetch(WEB).catch(() => null);
  if (!web?.ok) throw new Error(`La web no responde en ${WEB}. Arráncala con: npm run web`);

  // Un solo login por corrida (la API limita a 5 por minuto); el refresh token sirve para ambos anchos
  const refresh = await tokenRefresh();
  const navegador = await chromium.launch();
  const resultados = [];
  try {
    for (const v of ANCHOS) {
      await mkdir(join(RAIZ, 'revision', String(v.ancho)), { recursive: true });
      const base = { viewport: { width: v.ancho, height: v.alto }, isMobile: v.movil, hasTouch: v.movil, deviceScaleFactor: 1, locale: 'es-CO' };

      const publico = await navegador.newContext(base);
      for (const r of PUBLICAS) resultados.push(await revisarRuta(publico, v, r));
      await publico.close();

      const app = await navegador.newContext(base);
      await app.addInitScript((t) => localStorage.setItem('fitia.refresh', t), refresh);
      for (const r of APP) resultados.push(await revisarRuta(app, v, r));
      await app.close();
    }
  } finally {
    await navegador.close();
  }

  console.log('\nRevisión visual FitIA web\n');
  console.log('ANCHO  RUTA                     RESULTADO');
  for (const r of resultados) {
    const res = r.desborde ? `DESBORDE (scrollWidth ${r.scrollWidth} > ${r.ancho})` : `OK (scrollWidth ${r.scrollWidth})`;
    const redir = r.url !== r.ruta ? `  → ${r.url}` : '';
    console.log(`${String(r.ancho).padEnd(6)} ${r.ruta.padEnd(24)} ${res}${redir}`);
    for (const c of r.culpables.slice(0, 5)) console.log(`         ↳ ${c.el}  [izq ${c.izq}, der ${c.der}, ancho ${c.ancho}, se sale ${c.exceso}px]`);
    for (const e of [...new Set(r.errores)].slice(0, 3)) console.log(`         ⚠ consola: ${e.slice(0, 160)}`);
  }
  const malas = resultados.filter((r) => r.desborde);
  console.log(`\n${resultados.length} revisiones · ${malas.length} con desborde · capturas en apps/web/revision/{390,1440}/`);
  process.exitCode = malas.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 2;
});
