const db = require('../config/db');

const documentosController = {
    create: async (req, res) => {
        const { titulo, tipo_documento, receptor_id } = req.body;
        const remitente_id = req.user.id; // From middleware

        try {
            const correlativo = `DOC-${Date.now()}`;

            const newDoc = await db.query(
                `INSERT INTO documentos_alfa (correlativo, titulo, tipo_documento, remitente_id, receptor_id) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [correlativo, titulo, tipo_documento, remitente_id, receptor_id]
            );

            // Record traceability
            await db.query(
                `INSERT INTO trazabilidad_documentos (documento_id, usuario_origen, usuario_destino, accion) 
         VALUES ($1, $2, $3, $4)`,
                [newDoc.rows[0].id, remitente_id, receptor_id, 'CREACIÓN Y ENVÍO']
            );

            res.status(201).json(newDoc.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al crear documento' });
        }
    },

    getAll: async (req, res) => {
        try {
            const docs = await db.query(
                `SELECT d.*, u1.username as remitente, u2.username as receptor 
         FROM documentos_alfa d
         JOIN usuarios_alfa u1 ON d.remitente_id = u1.id
         JOIN usuarios_alfa u2 ON d.receptor_id = u2.id
         ORDER BY d.fecha_creacion DESC`
            );
            res.json(docs.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener documentos' });
        }
    },

    getTraceability: async (req, res) => {
        const { id } = req.params;
        try {
            const trace = await db.query(
                `SELECT t.*, u1.username as origen, u2.username as destino 
         FROM trazabilidad_documentos t
         LEFT JOIN usuarios_alfa u1 ON t.usuario_origen = u1.id
         LEFT JOIN usuarios_alfa u2 ON t.usuario_destino = u2.id
         WHERE t.documento_id = $1
         ORDER BY t.fecha_movimiento ASC`,
                [id]
            );
            res.json(trace.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener trazabilidad' });
        }
    }
};

module.exports = documentosController;
