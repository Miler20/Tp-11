# TP 11 - Reemplazo completo de reservas desde la web

## Objetivo

Implementar la edición de una reserva desde un formulario HTML mediante reemplazo completo. La web y la API reutilizan el mismo servicio MongoDB y conservan el mismo identificador del documento.

## Punto de partida y alcance

Este proyecto parte del TP 10 terminado. Se conservan las consultas de la API, el listado, la creación, el detalle, los filtros, el ordenamiento y la paginación heredados. Se agrega exclusivamente la edición completa desde la web:

- `GET /reservas/:id/editar`: busca la reserva y precarga los siete campos.
- `POST /reservas/:id/editar`: valida los siete campos y llama a `servicioReservas.reemplazarReserva`.
- `PUT /api/reservas/:id`: conserva el reemplazo completo de la API.

No se implementa PATCH ni DELETE desde páginas web. Tampoco se agregan filtros, orden ni paginación al HTML. La aplicación no se llama a sí misma por HTTP y el controlador no ejecuta operaciones MongoDB directamente.

## Tecnologías

- Node.js con soporte para `--env-file`.
- Express 5 y EJS.
- Mongoose 8 y MongoDB Atlas Free.
- CommonJS.
- Prettier, ESLint y pruebas con `node:test`.

## Preparación

1. Crear una copia del TP 10 llamada `tp-11-salas-web-completa-mongodb`.
2. No copiar `.git`, `node_modules` ni `.env` privado.
3. Conservar `package.json`, `package-lock.json`, fuentes, vistas, `public`, `scripts`, `tests`, herramientas y colecciones Postman.
4. Copiar `.env.example` como `.env`.
5. Completar `MONGODB_URI` con las credenciales privadas de MongoDB Atlas y la base `reservas_salas_u11`. No publicar `.env`.
6. Ejecutar:

```bash
npm ci
npm run check
node --env-file=.env scripts/comprobar-conexion.js
node --env-file=.env src/index.js
```

Abrir `http://localhost:3000` y `http://localhost:3000/reservas`.

## Base de datos

- Servicio: MongoDB Atlas Free.
- Base: `reservas_salas_u11`.
- Colección: `reservas`.

Si la colección está vacía, crear manualmente desde el formulario previo estas dos reservas (no se cargan automáticamente):

| Estudiante | Email | Sala | Fecha | Turno | Personas | Estado inicial |
|---|---|---|---|---|---:|---|
| Ana Ejemplo | ana@example.com | Sala Norte | 2026-11-04 | Mañana | 2 | pendiente |
| Bruno Ejemplo | bruno@example.com | Sala Sur | 2026-11-04 | Tarde | 3 | pendiente |

La fecha es ilustrativa. Si ya existen registros equivalentes, no duplicarlos. Guardar los IDs reales para las pruebas.

## Campos y validaciones

| Campo | Regla |
|---|---|
| `estudiante` | Texto obligatorio, sin espacios exteriores. |
| `email` | Texto obligatorio que contenga `@`. |
| `sala` | `Sala Norte`, `Sala Sur` o `Sala Multimedia`. |
| `fecha` | Texto obligatorio en formato de fecha del formulario. |
| `turno` | `Mañana`, `Tarde` o `Noche`. |
| `personas` | Entero de 1 a 6; se comprueba que no esté vacío antes de convertirlo. |
| `estado` | `pendiente` o `confirmada`. |

El formulario debe enviar exactamente los siete campos. Se rechazan campos adicionales, arrays, identificadores enviados en el cuerpo y operadores. El ID se obtiene exclusivamente desde la ruta.

## Funcionamiento de la edición web

1. Desde el listado o el detalle, seleccionar **Editar reserva**.
2. `GET /reservas/:id/editar` consulta la reserva y muestra los siete valores actuales.
3. **Cancelar** vuelve al detalle sin enviar el formulario ni escribir en MongoDB.
4. **Guardar cambios** envía los siete campos mediante POST.
5. Si la entrada es inválida, se devuelve HTML 400 con el mensaje y los valores ingresados conservados. El documento permanece intacto.
6. Si Mongoose rechaza el guardado, el manejador general vuelve al formulario de edición con los datos recibidos y un mensaje seguro.
7. Si el reemplazo es correcto, se responde con HTTP 303 hacia `/reservas/:id`. Se eligió el detalle como destino para que el usuario pueda revisar los valores guardados.

Un ID inválido devuelve HTML 400; un ID válido que no existe devuelve HTML 404.

## Rutas principales

| Método | Ruta | Resultado |
|---|---|---|
| GET | `/reservas` | Listado HTML heredado. |
| GET | `/reservas/:id` | Detalle HTML. |
| GET | `/reservas/:id/editar` | Formulario precargado. |
| POST | `/reservas/:id/editar` | Reemplazo completo y 303 al detalle. |
| GET | `/api/reservas/:id` | Consulta JSON de una reserva. |
| PUT | `/api/reservas/:id` | Reemplazo completo mediante JSON. |

Las rutas de API heredadas del TP 10 siguen disponibles, incluidas creación, consultas, PATCH y DELETE por API.

## Pruebas reproducibles

### 1. Edición desde el navegador y verificación por API

1. Abrir `/reservas` y elegir una reserva.
2. Abrir **Editar reserva** y verificar los siete campos precargados.
3. Cambiar `personas` a `4` y `estado` a `confirmada`.
4. Guardar. La respuesta esperada es HTTP 303 y destino `/reservas/ID_REAL`.
5. Consultar `GET http://localhost:3000/api/reservas/ID_REAL`.
6. Comprobar que el ID no cambió, `personas` vale `4` y `estado` es `confirmada`.

### 2. Guardar desde la API y comprobar la precarga web

En Postman usar `PUT http://localhost:3000/api/reservas/ID_REAL`, Body > raw > JSON:

```json
{
  "estudiante": "Ana Ejemplo",
  "email": "ana@example.com",
  "sala": "Sala Norte",
  "fecha": "2026-11-04",
  "turno": "Mañana",
  "personas": 3,
  "estado": "pendiente"
}
```

Se espera HTTP 200 y el mismo ID. Abrir `/reservas/ID_REAL/editar` y comprobar que los siete campos reflejan el PUT.

Duplicar la solicitud PUT y omitir `estado`: se espera HTTP 400. Consultar por GET y comprobar que el documento conserva el último reemplazo válido.

### 3. Formulario inválido y conservación de valores

Enviar `POST /reservas/ID_REAL/editar` como `x-www-form-urlencoded`, con los siete campos. Colocar `personas=0` y un texto reconocible en `estudiante`; mantener válidos los demás valores.

Se espera HTML 400, vista de edición y valores recibidos conservados. Consultar la API: el documento guardado no debe haber cambiado. Corregir `personas` y reenviar: se espera HTTP 303.

### 4. Cancelación y persistencia

Cambiar valores en pantalla y pulsar **Cancelar**. Consultar por API y comprobar que no hubo escritura. Después guardar un reemplazo válido, reiniciar el servidor con la misma base y consultar el mismo ID: los cambios deben persistir sin crear otra reserva.

### 5. Identificadores y funcionalidades heredadas

- ID con formato inválido en GET de edición: HTML 400.
- ID válido inexistente: HTML 404.
- Crear una reserva desde el formulario y comprobar que aparece en el listado.
- Consultar una reserva por API y comprobar que las rutas y consultas anteriores siguen funcionando.

## Estructura

- `src/controladores/reservas.js`: respuestas HTML/JSON y coordinación de operaciones.
- `src/rutas/reservas.js`: rutas de páginas, incluida la edición.
- `src/rutas/reservas-api.js`: rutas de la API.
- `src/servicios/reservas-mongo.js`: operaciones persistentes MongoDB; contiene el reemplazo reutilizado por web y API.
- `src/modelos/reserva.js`: esquema Mongoose.
- `src/middleware`: validación y manejo de errores.
- `views/reservas/editar.ejs`: formulario de edición.
- `views/reservas`: listado, alta y detalle.
- `scripts`: comprobación de conexión y utilidades.
- `postman`: colecciones de solicitudes.
- `tests`: pruebas automatizadas.

## Entrega

Publicar el proyecto en un repositorio GitHub accesible y entregar su URL. Antes de publicar, verificar que `.env`, credenciales, URI privada y datos personales reales no estén incluidos. Adjuntar capturas propias del navegador y Postman, sin secretos. Este paquete incluye el código y una guía de pruebas; las capturas y la publicación en GitHub deben realizarse desde la cuenta del estudiante.
