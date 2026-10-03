// Proceso principal de FitIA Control.
// Seguridad: contextIsolation + sandbox, sin nodeIntegration; el renderer solo ve window.fitia (preload.ts).
// En producción el renderer se sirve con el protocolo propio app://fitia (origen estable para el CORS de la API).
import { app, BrowserWindow, dialog, ipcMain, net, protocol, safeStorage, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ES_DEV = process.argv.includes('--dev');
const URL_DEV = 'http://localhost:5174';
const RENDERER = path.join(__dirname, '..', 'dist');
const API_POR_DEFECTO = 'http://localhost:5000/api/v1';
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  // La URL de la API es configurable (LAN, túnel…): se permite cualquier http(s)
  'connect-src http: https:',
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true } },
]);

// ---------------------------------------------------------------- configuración (URL de la API)
interface Config {
  apiUrl: string;
}

const rutaConfig = () => path.join(app.getPath('userData'), 'config.json');
const rutaSesion = () => path.join(app.getPath('userData'), 'sesion.bin');

function leerConfig(): Config {
  try {
    const datos = JSON.parse(fs.readFileSync(rutaConfig(), 'utf-8')) as Partial<Config>;
    return { apiUrl: typeof datos.apiUrl === 'string' && datos.apiUrl ? datos.apiUrl : API_POR_DEFECTO };
  } catch {
    return { apiUrl: API_POR_DEFECTO };
  }
}

function urlValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || valor.length > 300) return false;
  try {
    const u = new URL(valor);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- sesión cifrada (refresh token)
// safeStorage usa DPAPI en Windows: solo la cuenta de Windows que la guardó puede leerla.
function leerSesion(): string | null {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(fs.readFileSync(rutaSesion()));
  } catch {
    return null;
  }
}

function guardarSesion(texto: string | null): void {
  try {
    if (texto === null) {
      fs.rmSync(rutaSesion(), { force: true });
    } else if (safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(rutaSesion(), safeStorage.encryptString(texto));
    }
  } catch {
    /* sin persistencia: la sesión dura lo que dure la ventana */
  }
}

// ---------------------------------------------------------------- ventana
let ventana: BrowserWindow | null = null;

function crearVentana(): void {
  ventana = new BrowserWindow({
    width: 1440,
    height: 860,
    minWidth: 1180,
    minHeight: 700,
    frame: false,
    show: false,
    backgroundColor: '#0B0B0C',
    title: 'FitIA Control',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  ventana.once('ready-to-show', () => ventana?.show());
  const avisar = () => ventana?.webContents.send('ventana:maximizada', ventana.isMaximized());
  ventana.on('maximize', avisar);
  ventana.on('unmaximize', avisar);
  ventana.on('closed', () => {
    ventana = null;
  });

  // Nada de ventanas nuevas ni de navegar fuera de la app: los enlaces externos van al navegador
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  ventana.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(ES_DEV ? URL_DEV : 'app://fitia')) e.preventDefault();
  });

  void ventana.loadURL(ES_DEV ? URL_DEV : 'app://fitia/index.html');
  if (ES_DEV) ventana.webContents.openDevTools({ mode: 'detach' });
}

function registrarProtocolo(): void {
  protocol.handle('app', async (req) => {
    const { pathname } = new URL(req.url);
    const relativa = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const archivo = path.normalize(path.join(RENDERER, relativa));
    if (!archivo.startsWith(RENDERER)) return new Response('Prohibido', { status: 403 });
    const resp = await net.fetch(pathToFileURL(archivo).toString());
    const headers = new Headers(resp.headers);
    headers.set('Content-Security-Policy', CSP);
    return new Response(resp.body, { status: resp.status, headers });
  });
}

function registrarIpc(): void {
  ipcMain.handle('config:obtener', () => ({ ...leerConfig(), version: app.getVersion() }));
  ipcMain.handle('config:guardar', (_e, apiUrl: unknown) => {
    if (!urlValida(apiUrl)) throw new Error('URL inválida');
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(rutaConfig(), JSON.stringify({ apiUrl: apiUrl.replace(/\/+$/, '') }, null, 2));
    return leerConfig();
  });
  ipcMain.handle('sesion:obtener', () => leerSesion());
  ipcMain.handle('sesion:guardar', (_e, texto: unknown) => {
    guardarSesion(typeof texto === 'string' && texto.length < 20000 ? texto : null);
  });
  ipcMain.handle('ventana:minimizar', () => ventana?.minimize());
  ipcMain.handle('ventana:maximizar', () => {
    if (!ventana) return false;
    if (ventana.isMaximized()) ventana.unmaximize();
    else ventana.maximize();
    return ventana.isMaximized();
  });
  ipcMain.handle('ventana:cerrar', () => ventana?.close());
  ipcMain.handle('archivo:guardar', async (_e, nombre: unknown, contenido: unknown) => {
    if (!ventana || typeof nombre !== 'string' || typeof contenido !== 'string') return null;
    const limpio = path.basename(nombre).replace(/[^\w.\- ]/g, '_');
    const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
      title: 'Exportar reporte',
      defaultPath: path.join(app.getPath('documents'), limpio),
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (canceled || !filePath) return null;
    // BOM para que Excel abra bien las tildes
    fs.writeFileSync(filePath, '﻿' + contenido, 'utf-8');
    return filePath;
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (ventana?.isMinimized()) ventana.restore();
    ventana?.focus();
  });
  app.whenReady().then(() => {
    registrarProtocolo();
    registrarIpc();
    crearVentana();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) crearVentana();
    });
  });
  app.on('window-all-closed', () => app.quit());
}
