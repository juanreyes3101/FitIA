// Revisión visual de FitIA móvil sobre la vista web de Expo (react-native-web): recorre todas las rutas
// en 360 px (Android de gama baja, el público objetivo) y 390 px, y detecta desbordes horizontales.
//
// En React Native lo que se sale NO crea scroll: queda CORTADO. Por eso aquí cuenta como desborde:
//   - cualquier elemento que se salga de la pantalla, o
//   - que se salga del contenedor que lo recorta (overflow hidden), p. ej. un texto cortado en una tarjeta.
// Se exime: el contenido de los carruseles horizontales (ScrollView horizontal, a propósito) y los
// adornos marcados con aria-hidden (números gigantes de fondo, cintas de obra).
//
// Requisitos: la API (npm run api:lan) y Expo web (npm --prefix apps/mobile run web) corriendo.
// Uso:  npm --prefix apps/mobile run revision     (sale con código 1 si hay desbordes)
// Variables opcionales: WEB_URL, API_URL, REVISION_EMAIL, REVISION_PASSWORD
// Es una aproximación (Yoga en el celular y CSS flex en el navegador se parecen, no son idénticos):
// la prueba final es en el celular con Expo Go.
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const WEB = process.env.WEB_URL ?? 'http://localhost:8081';
const API = process.env.API_URL ?? 'http://localhost:5000/api/v1';
const EMAIL = process.env.REVISION_EMAIL ?? 'laura@fitia.co';
const PASSWORD = process.env.REVISION_PASSWORD ?? 'Demo2026*';

const ANCHOS = [
  { ancho: 360, alto: 760 },
  { ancho: 390, alto: 844 },
];

const PUBLICAS = [['ingresar', '/ingresar']];
// Solo lectura: ninguna de estas rutas escribe datos de Laura al abrirse
const APP = [
  ['hoy', '/'],
  ['rutina', '/rutina'],
  ['progreso', '/progreso'],
  ['lumbar', '/lumbar'],
  ['perfil', '/perfil'],
  ['imc', '/imc'],
  ['ejercicio', '/ejercicio/6'],
  ['entreno', '/entreno'],
  ['onboarding', '/onboarding'],
];

/** Corre en la página: encuentra los elementos más externos que se salen de la pantalla o de su recorte. */
function medir(vw) {
  const decorativo = (el) => !!el.closest('[aria-hidden="true"]');
  const carrusel = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (['auto', 'scroll'].includes(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true;
    }
    return false;
  };
  /** Límites visibles: la pantalla, recortada por cada ancestro con overflow-x hidden/clip */
  const limites = (el) => {
    let izq = 0;
    let der = vw;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (['hidden', 'clip'].includes(s.overflowX)) {
        const r = p.getBoundingClientRect();
        izq = Math.max(izq, r.left);
        der = Math.min(der, r.right);
      }
    }
    return { izq, der };
  };
  const describir = (el) => {
    const texto = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 50);
    const id = el.getAttribute('data-testid') ?? el.getAttribute('aria-label') ?? '';
    return `<${el.tagName.toLowerCase()}${id ? ` "${id}"` : ''}>${texto ? ` "${texto}"` : ''}`;
  };
  const fuera = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    const { izq, der } = limites(el);
    if (r.right <= der + 1 && r.left >= izq - 1) continue;
    if (der <= izq) continue; // el contenedor está fuera de la vista (pestañas ocultas, hojas cerradas)
    if (decorativo(el) || carrusel(el)) continue;
    fuera.push({ el, exceso: Math.round(Math.max(r.right - der, izq - r.left)), r });
  }
  // Texto truncado con "…" (numberOfLines): en la app se pierde información, también cuenta
  for (const el of document.body.querySelectorAll('*')) {
    const st = getComputedStyle(el);
    if (st.textOverflow !== 'ellipsis' && !st.webkitLineClamp?.match(/\d/)) continue;
    if (decorativo(el) || carrusel(el)) continue;
    // Vertical: solo si se oculta al menos media línea (las tildes y descendentes de Anton sobresalen
    // unos píxeles de la caja sin que se corte nada visible)
    const linea = parseFloat(st.lineHeight) || parseFloat(st.fontSize) || 16;
    const corto = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight - el.clientHeight > linea * 0.5;
    if (corto) fuera.push({ el, exceso: Math.max(el.scrollWidth - el.clientWidth, el.scrollHeight - el.clientHeight), r: el.getBoundingClientRect(), cortado: true });
  }
  const elementos = fuera.map((f) => f.el);
  const raiz = fuera.filter((f) => !elementos.includes(f.el.parentElement));
  return {
    scrollWidth: document.documentElement.scrollWidth,
    culpables: raiz
      .map((f) => ({ el: (f.cortado ? 'TEXTO CORTADO ' : '') + describir(f.el), izq: Math.round(f.r.left), der: Math.round(f.r.right), exceso: f.exceso }))
      .sort((a, b) => b.exceso - a.exceso),
  };
}

async function revisarRuta(contexto, { ancho }, [nombre, ruta]) {
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await pagina.goto(WEB + ruta, { waitUntil: 'networkidle' });
  // La bienvenida dura 1,2 s y luego las pantallas cargan datos
  await pagina.waitForTimeout(2500);
  const m = await pagina.evaluate(medir, ancho);
  // Sin texto en pantalla = el bundle no cargó o la app se cayó: eso es una falla, no un "OK"
  const vacia = (await pagina.evaluate(() => document.body.innerText.trim().length)) < 5;
  const url = new URL(pagina.url()).pathname;
  await pagina.screenshot({ path: join(RAIZ, 'revision', String(ancho), `${nombre}.png`), fullPage: true });
  await pagina.close();
  const desborde = m.scrollWidth > ancho || m.culpables.length > 0;
  return { nombre, ruta, url, ancho, ...m, desborde, vacia, errores };
}

async function login() {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!r.ok) throw new Error(`No se pudo iniciar sesión como ${EMAIL} (HTTP ${r.status}). ¿La API está corriendo?`);
  return r.json();
}

async function main() {
  const salud = await fetch(`${API}/health`).catch(() => null);
  if (!salud?.ok) throw new Error(`La API no responde en ${API}. Arráncala con: npm run api:lan`);
  const web = await fetch(WEB).catch(() => null);
  if (!web?.ok) throw new Error(`Expo web no responde en ${WEB}. Arráncalo con: npm --prefix apps/mobile run web`);

  // Un solo login por corrida (la API limita a 5 por minuto); el refresh sirve para ambos anchos
  const auth = await login();
  const navegador = await chromium.launch();
  const resultados = [];
  try {
    for (const v of ANCHOS) {
      await mkdir(join(RAIZ, 'revision', String(v.ancho)), { recursive: true });
      const base = { viewport: { width: v.ancho, height: v.alto }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'es-CO' };

      const publico = await navegador.newContext(base);
      for (const r of PUBLICAS) resultados.push(await revisarRuta(publico, v, r));
      await publico.close();

      const app = await navegador.newContext(base);
      // En web, el almacén de la app cae a localStorage (secure-store solo existe en el celular)
      await app.addInitScript(
        ([t, u]) => {
          localStorage.setItem('fitia.refresh', t);
          localStorage.setItem('fitia.usuario', u);
        },
        [auth.refresh_token, JSON.stringify(auth.usuario)],
      );
      for (const r of APP) resultados.push(await revisarRuta(app, v, r));
      await app.close();
    }
  } finally {
    await navegador.close();
  }

  console.log('\nRevisión visual FitIA móvil (vista web de Expo)\n');
  console.log('ANCHO  RUTA                 RESULTADO');
  for (const r of resultados) {
    const res = r.vacia ? 'FALLA (pantalla vacía: ¿error de bundle?)' : r.desborde ? `DESBORDE (${r.culpables.length} elementos)` : 'OK';
    const redir = r.url !== r.ruta ? `  → ${r.url}` : '';
    console.log(`${String(r.ancho).padEnd(6)} ${r.ruta.padEnd(20)} ${res}${redir}`);
    for (const c of r.culpables.slice(0, 5)) console.log(`         ↳ ${c.el}  [izq ${c.izq}, der ${c.der}, se sale ${c.exceso}px]`);
    for (const e of [...new Set(r.errores)].slice(0, 3)) console.log(`         ⚠ consola: ${e.slice(0, 160)}`);
  }
  const malas = resultados.filter((r) => r.desborde || r.vacia);
  console.log(`\n${resultados.length} revisiones · ${malas.length} con desborde o falla · capturas en apps/mobile/revision/{360,390}/`);
  process.exitCode = malas.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 2;
});
