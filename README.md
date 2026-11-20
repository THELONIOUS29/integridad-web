# IntegridadWeb

Aplicación académica Node.js, Express y Supabase sobre integridad de datos y desarrollo seguro.

## Sobre esta copia

Instantánea preparada el 20 de noviembre de 2026 para organizar un portafolio profesional. Repositorio privado. No incluye el historial Git original.

Se omitieron configuraciones locales, credenciales, datos operativos, instalaciones y archivos generados. Los valores `CONFIGURAR_LOCALMENTE`, `CONFIGURAR_TOKEN_LOCALMENTE` y `CONFIGURAR_SECRETO_LOCALMENTE` deben reemplazarse mediante configuración local antes de ejecutar. En scripts SQL se omitieron bloques de datos `INSERT` y `COPY`; en notebooks se borraron salidas guardadas.

El respaldo no constituye una validación de funcionamiento: no se ejecutaron los programas ni sus suites de pruebas durante esta preparación. Dependencias, recursos y configuración pueden requerir restauración. No se añade una licencia nueva ni se atribuyen en exclusiva los trabajos grupales o sus dependencias.

## Documentación del proyecto original

# IntegridadWeb

IntegridadWeb es una aplicación web académica para el **Tema 5: Integridad de Datos y Documentación S-SDLC**. Demuestra controles de seguridad en registro, inicio de sesión, publicación y listado de comentarios usando Node.js, Express y Supabase/PostgreSQL.

## Normas aplicadas

- ISO/IEC 27002:2022 - Control 8.28 Codificación segura.
- ISO/IEC 27002:2022 - Control 5.37 Procedimientos operativos documentados.
- NIST SP 800-53 Rev. 5 - SI-10 Information Input Validation.
- NIST SP 800-53 Rev. 5 - SI-10(5) Restrict Inputs.
- NIST SP 800-53 Rev. 5 - SA-5 System Documentation.

## Tecnologías utilizadas

- Backend: Node.js con Express.
- Base de datos: Supabase/PostgreSQL.
- Frontend: HTML, CSS y JavaScript puro.
- Variables de entorno: `dotenv`.
- Validación: `express-validator`.
- Sanitización: `sanitize-html` y `validator`.
- Contraseñas: `bcrypt`.
- Sesiones: `express-session`.
- Cabeceras seguras: `helmet`.
- Consultas seguras: cliente oficial `@supabase/supabase-js`.

## Instalación

```bash
npm install
```

## Configuración de Supabase

1. Cree un proyecto en Supabase.
2. Abra el SQL Editor.
3. Ejecute el archivo `database/supabase_schema.sql`.
4. Copie la URL del proyecto y la anon key.
5. Cree un archivo `.env` basado en `.env.example`.

Variables requeridas:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SESSION_SECRET=
PORT=3000
```

Ejemplo de `SESSION_SECRET`: use una cadena larga y aleatoria. No comparta el archivo `.env`.

## Ejecución

```bash
npm run dev
```

Luego abra:

```text
http://localhost:3000
```

## Row Level Security en Supabase

El esquema desactiva explícitamente Row Level Security para desarrollo académico porque la app usa el cliente de Supabase desde el backend Express con la anon key. Si Supabase muestra el error `new row violates row-level security policy`, ejecute nuevamente `database/supabase_schema.sql` o estas instrucciones en el SQL Editor:

```sql
alter table usuarios disable row level security;
alter table comentarios disable row level security;
alter table audit_logs disable row level security;
```

Para producción se recomienda:

- Activar RLS en `usuarios`, `comentarios` y `audit_logs`.
- Usar una service role key solo en el servidor, nunca en el frontend.
- Crear políticas específicas de lectura/escritura.
- Migrar identidad a Supabase Auth si se desea usar `auth.uid()` en políticas.

## Módulos y relación normativa

### Registro

Valida nombre, correo y contraseña mediante las funciones centralizadas de `src/security/security.js`. El controlador llama la sanitización y el cifrado bcrypt exportados por ese módulo. Cumple NIST SI-10, SI-10(5) e ISO 8.28.

### Inicio de sesión

Busca usuarios con Supabase Query Builder en `src/controllers/auth.controller.js`, usando `.from("usuarios").select(...).eq("correo", correo).single()`. No usa SQL concatenado. Compara contraseña con bcrypt y responde mensajes genéricos. Cumple ISO 8.28 y NIST SI-10.

### Comentarios

Exige sesión activa mediante `requireAuth`, exportado por `src/security/security.js`. Valida longitud y sanitiza el contenido antes de guardar. El frontend renderiza comentarios con `createElement` y `textContent` en `public/js/comments.js`. También existe `PATCH /api/comments/:id` para demostrar `.update()` con actualización restringida al usuario dueño del comentario. Cumple ISO 8.28, NIST SI-10 y SI-10(5).

### Logs y trazabilidad

El objeto `logger` de `src/security/security.js` registra registro exitoso, login exitoso, login fallido, errores de validación, comentario publicado y cierre de sesión. No almacena contraseñas ni hashes. Cumple ISO 5.37 y NIST SA-5.

### Módulo central de seguridad

Toda la seguridad transversal se concentra en:

```text
src/security/security.js
```

`src/server.js` llama `configureSecurity(app, ...)`; las rutas llaman los validadores y `requireAuth`; los controladores llaman sanitización, bcrypt y logger. Las consultas seguras permanecen en los controladores porque forman parte del acceso a datos.

### Documentación

La carpeta `src/docs` contiene:

- `documentacion_seguridad.docs`

Este documento explica todas las técnicas implementadas, su ubicación, funcionamiento, relación normativa y pruebas de demostración. Respalda ISO 5.37 y NIST SA-5.

## Cómo probar la seguridad

### SQL Injection

En login, pruebe como correo o contraseña:

```text
' OR '1'='1
```

Resultado esperado: acceso rechazado con mensaje genérico. El sistema usa Supabase Query Builder y no concatena SQL.

### XSS

En comentarios, pruebe:

```text
<script>alert('XSS')</script>
```

Resultado esperado: el script no se ejecuta. El backend sanitiza y el frontend usa `textContent`.

### Validación de entradas

Pruebe:

- Correo inválido: `correo-invalido`
- Nombre con HTML: `<script>alert('XSS')</script>`
- Contraseña menor a 8 caracteres: `abc12`
- Comentario mayor a 300 caracteres

Resultado esperado: rechazo con mensaje claro y sin errores técnicos.

## Capturas recomendadas para el informe

- Página de inicio.
- Registro exitoso.
- Registro rechazado por correo inválido.
- Registro rechazado por nombre con `<script>`.
- Login exitoso.
- Login fallido con `' OR '1'='1`.
- Acceso a comentarios sin sesión.
- Comentario normal publicado.
- Comentario XSS sin ejecución de alerta.
- Comentario mayor a 300 caracteres rechazado.
- Tabla `usuarios` mostrando `password_hash`.
- Archivo `logs/app.log` o consola con eventos de trazabilidad.
- Archivos de documentación en `src/docs`.

## Estructura del proyecto

```text
integridadweb/
├── package.json
├── .env.example
├── README.md
├── src/
│   ├── server.js
│   ├── config/
│   │   └── supabaseClient.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── comments.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── comments.controller.js
│   ├── security/
│   │   └── security.js
│   └── docs/
│       └── documentacion_seguridad.docs
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── comments.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── auth.js
│       └── comments.js
└── database/
    └── supabase_schema.sql
```
