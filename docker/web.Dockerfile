# Web de FitIA: se compila con Node y se sirve con Nginx (contexto = raíz del repo).

# --- 1. Compilar (solo la web y el código compartido) ---
FROM node:22-alpine AS build
WORKDIR /repo
# No hace falta Electron para la web: evita descargar su binario de ~100 MB
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY apps/desktop/package.json apps/desktop/
RUN npm ci --workspace apps/web --workspace packages/shared --include-workspace-root=false --no-audit --no-fund

COPY packages/shared packages/shared
COPY apps/web apps/web
# La web y la API quedan en el mismo origen: Nginx reenvía /api a la API
ENV VITE_API_URL=/api/v1
RUN npm -w apps/web run build

# --- 2. Servir ---
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80 5000
