-- IntegridadWeb - Esquema Supabase/PostgreSQL
-- Tema 5: Integridad de Datos y Documentación S-SDLC
-- Controles: ISO/IEC 27002:2022 8.28, 5.37; NIST SP 800-53 SI-10, SI-10(5), SA-5.

create extension if not exists pgcrypto;

-- Tabla usuarios:
-- Almacena las cuentas registradas. La contraseña nunca se guarda en texto plano;
-- la aplicación inserta únicamente el hash generado con bcrypt.
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre varchar(50) not null,
  correo varchar(120) unique not null,
  password_hash text not null,
  created_at timestamp default now(),
  constraint chk_usuarios_nombre_len check (char_length(nombre) <= 50),
  constraint chk_usuarios_correo_len check (char_length(correo) <= 120)
);

comment on table usuarios is 'Cuentas de usuarios de IntegridadWeb. Contiene hash de contraseña, nunca contraseña en texto plano.';
comment on column usuarios.password_hash is 'Hash bcrypt de la contraseña del usuario.';

-- Tabla comentarios:
-- Almacena comentarios asociados a usuarios autenticados. La aplicación valida y sanitiza
-- el contenido antes de insertarlo.
create table if not exists comentarios (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete cascade,
  comentario text not null,
  created_at timestamp default now(),
  constraint chk_comentarios_len check (char_length(comentario) between 3 and 300)
);

comment on table comentarios is 'Comentarios publicados por usuarios autenticados. Se valida longitud y se sanitiza antes de guardar.';

-- Tabla audit_logs:
-- Disponible para trazabilidad persistente si se desea enviar eventos desde la aplicación.
-- La versión de desarrollo registra eventos en consola y logs/app.log.
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  evento varchar(100) not null,
  descripcion text,
  created_at timestamp default now()
);

comment on table audit_logs is 'Bitácora de eventos de seguridad y operación para evidencias de trazabilidad.';

create index if not exists idx_usuarios_correo on usuarios(correo);
create index if not exists idx_comentarios_created_at on comentarios(created_at desc);
create index if not exists idx_comentarios_usuario_id on comentarios(usuario_id);

-- Acceso directo de clientes anónimos/autenticados denegado por defecto.
-- El backend usa una clave privada de servidor y controla el propietario de cada operación.
alter table usuarios enable row level security;
alter table comentarios enable row level security;
alter table audit_logs enable row level security;
revoke all on table usuarios, comentarios, audit_logs from anon, authenticated;
