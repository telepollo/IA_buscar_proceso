# Buscador de estado SEACE

Aplicacion web para consultar el estado de un procedimiento de seleccion a partir de su
nomenclatura, usando la API oficial de Contrataciones Abiertas del OSCE/OECE.

## Ejecutar localmente

Requiere Node.js 18 o superior.

```powershell
npm start
```

Luego abre:

```text
http://localhost:3000
```

Si `node` esta bloqueado en Windows, usa `iniciar-app.bat`.

## Desplegar en Vercel

1. Sube esta carpeta a un repositorio GitHub.
2. Entra a Vercel y crea un nuevo proyecto desde ese repositorio.
3. Vercel detectara `vercel.json` y publicara:
   - `public/index.html`, `public/styles.css`, `public/app.js`
   - `api/status.js` como funcion serverless
4. No necesitas comando de build.

Variables opcionales:

```text
SEACE_API_BASE=https://contratacionesabiertas.osce.gob.pe/api/v1
SEACE_SEARCH_URL=https://servidor/api/buscar?query={nomenclatura}
```

`SEACE_SEARCH_URL` sirve si la documentacion oficial cambia la ruta exacta de busqueda.

## Desplegar en Render, Railway o Fly.io

Usa estos valores:

```text
Start command: npm start
Port: usar la variable PORT que entregue el hosting
```

## Estructura

```text
api/status.js      Funcion serverless para Vercel
lib/seace.js       Cliente y normalizador de respuestas OCDS
public/            Interfaz web responsive
server.js          Servidor Node local o para hosting Node
vercel.json        Configuracion de despliegue Vercel
```
