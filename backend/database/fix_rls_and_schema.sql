-- Fix Database Schema and RLS Policies

-- 1. Add permissions column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permisos TEXT[] DEFAULT '{}';

-- 2. Enhance Documents visibility for Gerencias
DROP POLICY IF EXISTS "Documents viewable by sender or receiver" ON documentos;
CREATE POLICY "Documents viewable by sender, receiver or gerencia" ON documentos 
FOR SELECT USING (
    auth.uid() = remitente_id 
    OR auth.uid() = receptor_id 
    OR (
        receptor_gerencia_id IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND gerencia_id = receptor_gerencia_id
        )
    )
);

-- 3. Enable Deletion for Documents
DROP POLICY IF EXISTS "Documents deletable by authenticated users" ON documentos;
CREATE POLICY "Documents deletable by sender or admin" ON documentos 
FOR DELETE USING (
    auth.uid() = remitente_id 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND rol_id IN (1, 4) -- CEO or Desarrollador
    )
);

-- 4. Enable Deletion for Tickets
DROP POLICY IF EXISTS "Tickets deletable by authenticated users" ON tickets;
CREATE POLICY "Tickets deletable by creator or admin" ON tickets 
FOR DELETE USING (
    auth.uid() = solicitante_id 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND rol_id IN (1, 4)
    )
);

-- 5. Secure Audit Logs
DROP POLICY IF EXISTS "Audit logs viewable by admin" ON logs_seguridad;
CREATE POLICY "Audit logs viewable by staff" ON logs_seguridad 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND rol_id IN (1, 4)
    )
);

DROP POLICY IF EXISTS "Audit logs insertable by everyone" ON logs_seguridad;
CREATE POLICY "Audit logs insertable by everyone" ON logs_seguridad 
FOR INSERT WITH CHECK (true);

-- 6. Fix cascade for documento_ocultos (re-create if necessary)
-- Note: Doing this via ALTER if possible
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documento_ocultos') THEN
        -- Check if foreign key exists, if not add it
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.key_column_usage 
            WHERE table_name = 'documento_ocultos' AND column_name = 'documento_id'
            AND constraint_name LIKE '%fkey%'
        ) THEN
            ALTER TABLE documento_ocultos 
            ADD CONSTRAINT documento_ocultos_documento_id_fkey 
            FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;
