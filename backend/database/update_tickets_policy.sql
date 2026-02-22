-- Protocolo de actualización de políticas de Tickets para Desarrolladores
-- Objetivo: Permitir que los roles con privilegios vean todas las solicitudes.

-- 1. Eliminar política restrictiva anterior
DROP POLICY IF EXISTS "Tickets viewable by creator or tech" ON tickets;

-- 2. Crear nueva política inclusiva para SELECT
CREATE POLICY "Tickets visibility policy" ON tickets
FOR SELECT
USING (
    auth.uid() = solicitante_id 
    OR auth.uid() = tecnico_id
    OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.rol_id = r.id
        WHERE p.id = auth.uid() 
        AND (r.nombre_rol = 'Desarrollador' OR r.nombre_rol = 'CEO' OR r.nombre_rol = 'Administrativo')
    )
);

-- 3. Crear política para INSERT (si no existe una global)
DROP POLICY IF EXISTS "Users can create tickets" ON tickets;
CREATE POLICY "Users can create tickets" ON tickets
FOR INSERT
WITH CHECK (auth.uid() = solicitante_id);

-- 4. Crear política para UPDATE (permitir a técnicos/admins/devs)
DROP POLICY IF EXISTS "Tickets updatable by tech or admin" ON tickets;
CREATE POLICY "Tickets updatable by tech or admin" ON tickets
FOR UPDATE
USING (
    auth.uid() = solicitante_id 
    OR auth.uid() = tecnico_id
    OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.rol_id = r.id
        WHERE p.id = auth.uid() 
        AND (r.nombre_rol = 'Desarrollador' OR r.nombre_rol = 'CEO' OR r.nombre_rol = 'Administrativo')
    )
);
