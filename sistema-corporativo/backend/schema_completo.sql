-- ========================================================
-- SISTEMA CORPOELECT INDUSTRIAL 2026 - SCHEMA COMPLETO
-- ========================================================

-- 1. EXTENSION PARA UUIDs (Si no existe)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE GERENCIAS
CREATE TABLE IF NOT EXISTS gerencias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    categoria VARCHAR(100),
    siglas VARCHAR(20)
);

-- 3. TABLA DE ROLES
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
);

-- 4. TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    gerencia_id INT REFERENCES gerencias(id),
    rol_id INT REFERENCES roles(id),
    ultima_ip INET,
    ultima_conexion TIMESTAMPTZ,
    estado BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE LOGS DE SEGURIDAD
CREATE TABLE IF NOT EXISTS logs_seguridad (
    id SERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id),
    evento TEXT NOT NULL,
    nivel VARCHAR(20) DEFAULT 'INFO',
    ip_origen INET,
    fecha_evento TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DATOS INICIALES (SEMILLA)

-- Insertar Roles Básicos
INSERT INTO roles (id, nombre_rol) VALUES 
(1, 'CEO'),
(2, 'Administrativo'),
(3, 'Usuario')
ON CONFLICT (id) DO NOTHING;

-- Insertar Gerencias Principales
INSERT INTO gerencias (nombre, siglas) VALUES 
('Gerencia Nacional de Tecnologías de la Información y la Comunicación', 'GNTIC'),
('Gerencia de Infraestructura', 'GINFRA'),
('Gerencia de Operaciones', 'GOPS'),
('Gerencia de Talento Humano', 'GTH')
ON CONFLICT (nombre) DO NOTHING;

-- NOTA: El primer usuario será creado desde la pantalla de Registro (/registro)
-- para asegurar que su contraseña esté correctamente hasheada con PBKDF2.
