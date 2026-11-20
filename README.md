# IntegridadWeb

Aplicación académica Node.js, Express y Supabase/PostgreSQL con registro, sesiones y comentarios.

## Configuración local

1. Usar Node.js 22.12 o superior e instalar las dependencias con `npm ci`.
2. Copiar `.env.example` a `.env` y completar `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `SESSION_SECRET`.
3. Crear un secreto de sesión aleatorio de al menos 32 caracteres. No reutilizar ejemplos o claves personales.
4. Revisar y aplicar el esquema SQL en una base de pruebas. RLS queda activado y el acceso directo de `anon` y `authenticated` se revoca.
5. Ejecutar `npm start`. Configurar HTTPS y `NODE_ENV=production` al desplegar.

La clave privada de Supabase se usa exclusivamente en el backend. Se admite `SUPABASE_SERVICE_ROLE_KEY` como alternativa para proyectos con claves heredadas. Nunca incluir ninguna de estas claves en el frontend, la app móvil, Git o capturas.

El backend usa sesiones propias y bcrypt; la clave de servidor omite RLS, por lo que los controladores deben autorizar cada operación. Los comentarios se guardan como texto sanitizado y se muestran mediante `textContent`. Se retiró la ruta SQLi de demostración de esta copia.

## Alcance

Esta copia de portafolio recibió correcciones de configuración y XSS. Antes de producción requiere pruebas de integración, revisión de dependencias, límites de solicitudes, un almacén de sesiones persistente y revisión de permisos en el servicio real. No se modificaron bases de datos ni aplicaciones desplegadas durante la auditoría. La aplicación original del PC se conservó.
