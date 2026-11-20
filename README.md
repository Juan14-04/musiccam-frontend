# Frontend — plataforma de conciertos en vivo

SPA en **Vanilla JS + Vite + Bootstrap 5.3** (tema oscuro) para que artistas independientes de Colombia
vendan y transmitan conciertos, y para que espectadores los descubran, compren y vean (en vivo o en
replay). Incluye estudio del artista y panel de administración. Sin framework JS.

La guía operativa está en [`AGENTS.md`](./AGENTS.md) (fuente de verdad del frontend) y el
contrato de la API en [`docs/openapi.json`](./docs/openapi.json) (copia del backend).

## Arranque

### Aplicación completa con Docker

Desde la carpeta `../backend`:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose exec api flask --app wsgi seed
```

Abre <http://localhost:5173>. La API y su documentación quedan disponibles en
<http://localhost:8000/api/v1/health> y <http://localhost:8000/api/docs>.

Para que los cambios del frontend se vean al guardar, deja corriendo en otra terminal:

```powershell
docker compose watch --no-up
```

El código no se comparte como carpeta con el contenedor (en Windows eso hacía que cada página
tardara segundos): `watch` copia cada archivo que guardas y Vite recarga el navegador.

### Solo el frontend, con la API local

```bash
cp .env.example .env     # ajusta VITE_API_URL (por defecto http://localhost:5000/api/v1)
npm install
npm run dev              # http://localhost:5173  (puerto fijo: falla si está ocupado)
```

El origen `http://localhost:5173` debe estar en `CORS_ORIGINS` del backend. Con la API en Docker, el
puerto publicado es `8000`: `VITE_API_URL=http://localhost:8000/api/v1`.

| Comando           | Qué hace                                                        |
| ----------------- | --------------------------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo (Vite)                                   |
| `npm run build`   | Sitio estático en `dist/`, con la CSP inyectada en el HTML      |
| `npm run preview` | Sirve `dist/` para probar el build                              |
| `npm run lint`    | ESLint (sin avisos)                                             |
| `npm run format`  | Prettier                                                        |
| `npm test`        | Pruebas con `node --test` (utilidades, cliente HTTP, features…) |

Variables (`.env.example`): `VITE_API_URL`, `VITE_APP_NAME`, `VITE_PLAYER_MODE` (`simulated` \| `hls`),
`VITE_ENABLE_DEV_TOOLS` (`false` en producción) y `VITE_POLITICA_DATOS_URL` (solo `#/…` o `https://`).

## Estado

Las **fases 0 a 8** de §11 están implementadas: esqueleto, auth, catálogo, checkout (Wompi simulado),
ver (vivo/replay), estudio del artista (eventos, sala de control, estadísticas, finanzas), cuenta
(mis eventos, favoritos, siguiendo), administración, y esta fase de pulido y cierre.

Pendiente o fuera de alcance (a propósito): el **chat real** (en vivo se muestra una simulación local claramente identificada),
el **texto de la política de tratamiento de datos** (`#/politica-datos` muestra "Próximamente"; el
contenido legal lo define el negocio), pagos reales, recuperación de contraseña, modo claro e i18n.

Al crear un evento, el artista agrega un enlace a su tráiler público de YouTube. El detalle del
evento muestra ese tráiler; no debe usarse como sustituto de la transmisión protegida.

## Arquitectura

`app → features → shared → core` (nunca al revés). Cada feature (`auth`, `catalog`, `checkout`,
`watch`, `account`, `studio`, `admin`) expone su API pública en `index.js`; ninguna importa archivos
internos de otra. Las features se comunican por `shared`, `core` o el bus de eventos (p. ej.
`compra:aprobada`, que actualiza el detalle de un evento tras pagar). Capas dentro de una feature:
`pages → service → api → core/http`. Estas reglas las vigila `tests/auditoria/reglas.test.js`.

## Seguridad

- **XSS:** todo texto de la API se inserta con la plantilla `html` (escapa por defecto) o `textContent`.
  `setHtml` rechaza cadenas sueltas. No hay `eval`, `document.write` ni `innerHTML` con datos.
- **Sesión:** el access token vive solo en memoria; el refresh token, en `sessionStorage` (decisión de
  MVP: no hay revocación en el servidor, así que cerrar sesión solo descarta los tokens en el
  navegador y un refresh token robado valdría hasta expirar, 7 días). Nunca se guardan contraseñas,
  `stream_key` ni datos de pago.
- **URLs externas y redirecciones:** `portada_url` solo `https://` (o `http://localhost` en desarrollo);
  el `redirect` de login solo acepta rutas `#/…`; los enlaces `target="_blank"` llevan
  `rel="noopener noreferrer"`.
- **CSP:** el build añade un `<meta http-equiv="Content-Security-Policy">` (ver `csp.config.js`) con
  `script-src 'self'` y `connect-src` limitado al origen de `VITE_API_URL`. Con
  `VITE_PLAYER_MODE=hls`, añade el origen del servidor de medios a `connect-src` y `media-src`. En
  producción conviene servirla también como cabecera HTTP.
- **Dinero:** todos los montos y comisiones vienen del servidor; el cliente solo los formatea.

## Accesibilidad y diseño adaptable

Enlace "Saltar al contenido" (primer Tab de la página), un `<h1>` por pantalla con el foco puesto en él
al navegar, contorno de foco de 3 px, modales con foco atrapado y devuelto a quien los abrió, toasts
con `aria-live`, tablas equivalentes para las gráficas, contraste ≥ 4,5:1 con los tokens de §6.1,
áreas táctiles ≥ 44 px, y `prefers-reduced-motion` respetado (también en los scrolls hechos con JS).
Puntos de control: 375, 768 y 1280 px, sin scroll horizontal de página.

## Pruebas

`npm test` cubre utilidades, cliente HTTP (refresh _single-flight_, errores, `FormData`, cancelación),
la lógica de cada feature y las reglas de la auditoría. La verificación en navegador (recorrido de
todas las pantallas de los cuatro roles a 375/768/1280 px y los flujos de C1–C4) está descrita en
[`docs/trazabilidad.md`](./docs/trazabilidad.md).
