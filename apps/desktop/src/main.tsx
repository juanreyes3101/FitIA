import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fuentes locales (@fontsource, licencia OFL): la consola funciona sin internet
import '@fontsource/anton/400.css';
import '@fontsource/inter-tight/400.css';
import '@fontsource/inter-tight/500.css';
import '@fontsource/inter-tight/600.css';
import '@fontsource/inter-tight/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import App from './App';
import { SesionProvider } from './sesion/SesionContext';
import { ToastProvider } from './ui/Toasts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <SesionProvider>
        <App />
      </SesionProvider>
    </ToastProvider>
  </StrictMode>,
);
