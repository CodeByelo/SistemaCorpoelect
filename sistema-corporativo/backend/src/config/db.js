/**
 * MOCK DATABASE CONFIGURATION
 * Replaces the live Neon SQL / PostgreSQL connection.
 */
require('dotenv').config();

// Mock Pool that simulates pg.Pool
const pool = {
    query: async (text, params) => {
        console.log(`[Mock DB] Executing query: ${text.substring(0, 100)}...`);

        // Simular respuesta basada en la consulta
        const queryLower = text.toLowerCase();

        if (queryLower.includes('from usuarios')) {
            return {
                rows: [{
                    id: 1,
                    nombre: 'Admin',
                    apellido: 'Sistema',
                    email_corp: 'admin@corpoelec.gob.ve',
                    usuario_corp: 'admin',
                    password: 'admin',
                    gerencia_depto: 'TECNOLOGIA',
                    rol: 'CEO'
                }]
            };
        }

        if (queryLower.includes('from documentos')) {
            return {
                rows: [
                    { id: 1, nombre: 'Manual de Seguridad.pdf', fecha: new Date(), tamano: '2.5MB', tipo: 'PDF' },
                    { id: 2, nombre: 'Plan Operativo 2026.docx', fecha: new Date(), tamano: '1.2MB', tipo: 'DOCX' }
                ]
            };
        }

        return { rows: [], rowCount: 0 };
    },
    on: () => { }, // Mock event emitter
    end: () => Promise.resolve()
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
