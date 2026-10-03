// Genera recursos/icon.png (512×512) desde el logo de FitIA, para electron-builder.
// Usa el Chromium de Playwright (npx -w apps/web playwright install chromium si falta).
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const destino = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'recursos', 'icon.png');
const html = `<!doctype html><html><body style="margin:0;background:transparent">
<div style="width:512px;height:512px;background:#0B0B0C;border-radius:72px;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 10px #D4FF00">
  <svg viewBox="0 0 48 36" width="360" height="270" style="color:#D4FF00">
    <g fill="currentColor"><rect x="2" y="12" width="6" height="24"/><rect x="8" y="17" width="4" height="14"/>
    <rect x="40" y="12" width="6" height="24"/><rect x="36" y="17" width="4" height="14"/>
    <path d="M43 0l1.4 3.6L48 5l-3.6 1.4L43 10l-1.4-3.6L38 5l3.6-1.4z"/></g>
    <path d="M12 24h5l3-8 5 16 3-10 2 2h6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  </svg>
</div></body></html>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 512, height: 512 } });
await pagina.setContent(html);
await pagina.locator('div').first().screenshot({ path: destino, omitBackground: true });
await navegador.close();
console.log(`Ícono generado: ${destino}`);
