// Revisión visual de FitIA Control con Playwright sobre Electron (el build de producción, app://fitia).
// Requisitos: `npm -w apps/desktop run build` y la API corriendo (y el worker, para la demo del pico).
//   node scripts/revision.mjs            → recorre todas las pantallas a 1366×768 y 1920×1080
//   node scripts/revision.mjs --pico     → además pulsa "Simular pico" y espera la mitigación
// Entra UNA sola vez (el login tiene límite de 5 intentos por minuto). Sale con código 1 si hay desbordes.
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const salida = path.join(raiz, 'revision');
const RUTAS = ['resumen', 'usuarios', 'entrenadores', 'ejercicios', 'planes', 'reportes', 'monitoreo', 'config'];
const TAMANOS = [[1366, 768], [1920, 1080]];
const EMAIL = process.env.FITIA_EMAIL ?? 'admin@fitia.co';
const CLAVE = process.env.FITIA_CLAVE ?? 'Admin2026*';
const conPico = process.argv.includes('--pico');

const app = await electron.launch({ args: [raiz], cwd: raiz });
const ventana = await app.firstWindow();
const errores = [];
ventana.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
ventana.on('console', (m) => m.type() === 'error' && errores.push(`console: ${m.text()}`));

async function tamano(w, h) {
  await app.evaluate(({ BrowserWindow }, [w, h]) => {
    const v = BrowserWindow.getAllWindows()[0];
    v.unmaximize();
    v.setContentSize(w, h);
  }, [w, h]);
  await ventana.waitForTimeout(400);
}

/** Desbordes horizontales dentro de <main> y de la página; nombra el elemento culpable. */
async function desbordes() {
  return ventana.evaluate(() => {
    const problemas = [];
    const nombre = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${[...el.classList].slice(0, 3).join('.')} «${(el.textContent ?? '').trim().slice(0, 40)}»`;
    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth + 1) problemas.push(`página: ${doc.scrollWidth} > ${window.innerWidth}`);
    const main = document.querySelector('main');
    if (main && main.scrollWidth > main.clientWidth + 1) {
      const borde = main.getBoundingClientRect().right;
      const culpables = [...main.querySelectorAll('*')].filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= borde + 1) return false;
        // Solo el más externo: su padre no desborda
        const p = el.parentElement?.getBoundingClientRect();
        return !p || p.right <= borde + 1;
      });
      problemas.push(`main: ${main.scrollWidth} > ${main.clientWidth} · ${culpables.slice(0, 3).map(nombre).join(' | ')}`);
    }
    // Contenedores que recortan contenido sin scroll (texto cortado)
    for (const el of document.querySelectorAll('main *')) {
      const cs = getComputedStyle(el);
      if (cs.overflowX === 'hidden' && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0) {
        problemas.push(`recortado: ${nombre(el)}`);
      }
    }
    return problemas;
  });
}

fs.mkdirSync(salida, { recursive: true });
await ventana.waitForLoadState('domcontentloaded');
await ventana.waitForTimeout(1500);

if (await ventana.getByRole('heading', { name: 'Ingreso' }).isVisible().catch(() => false)) {
  await ventana.getByLabel('Correo institucional').fill(EMAIL);
  await ventana.getByLabel('Contraseña').fill(CLAVE);
  await ventana.getByRole('button', { name: 'Ingresar' }).click();
}
await ventana.locator('main').waitFor({ timeout: 15000 });

let total = 0;
for (const [w, h] of TAMANOS) {
  await tamano(w, h);
  fs.mkdirSync(path.join(salida, String(w)), { recursive: true });
  for (const ruta of RUTAS) {
    await ventana.evaluate((r) => { window.location.hash = `#/${r}`; }, ruta);
    await ventana.waitForTimeout(ruta === 'monitoreo' ? 3500 : 2000);
    const p = await desbordes();
    total += p.length;
    console.log(`${p.length ? '✗' : '✓'} ${w}×${h} ${ruta}${p.length ? `\n    ${p.join('\n    ')}` : ''}`);
    await ventana.screenshot({ path: path.join(salida, String(w), `${ruta}.png`) });
  }
}

if (conPico) {
  await tamano(1366, 768);
  await ventana.evaluate(() => { window.location.hash = '#/monitoreo'; });
  await ventana.waitForTimeout(3000);
  await ventana.getByRole('button', { name: /Simular pico/ }).click();
  await ventana.getByText(/^INCIDENTE ABIERTO/).waitFor({ timeout: 15000 });
  await ventana.waitForTimeout(1500);
  await ventana.screenshot({ path: path.join(salida, 'pico-1-detectado.png') });
  console.log('✓ pico detectado: incidente abierto');
  await ventana.getByText(/^ÚLTIMO INCIDENTE · CERRADO/).waitFor({ timeout: 90000 });
  await ventana.waitForTimeout(1500);
  await ventana.screenshot({ path: path.join(salida, 'pico-2-mitigado.png') });
  console.log('✓ pico mitigado: incidente cerrado');
}

if (errores.length) console.log(`\nErrores en la consola del renderer:\n  ${[...new Set(errores)].join('\n  ')}`);
await app.close();
console.log(`\n${total} desbordes. Capturas en ${salida}`);
process.exit(total ? 1 : 0);
