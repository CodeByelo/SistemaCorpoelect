-- Create tickets table if missing and add columns
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    area TEXT DEFAULT 'General',
    prioridad TEXT DEFAULT 'baja',
    estado TEXT DEFAULT 'abierto',
    solicitante_id UUID REFERENCES profiles(id),
    tecnico_id UUID REFERENCES profiles(id),
    observaciones TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table already existed (for safety)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Update existing rows if any
UPDATE tickets SET area = 'General' WHERE area IS NULL;
UPDATE tickets SET descripcion = titulo WHERE descripcion IS NULL AND titulo IS NOT NULL;
