const db = require('../config/db');

const configController = {
    getConfig: async (req, res) => {
        try {
            const config = await db.query('SELECT * FROM sistema_config ORDER BY id DESC LIMIT 1');
            res.json(config.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener configuración' });
        }
    },

    updateConfig: async (req, res) => {
        const { institucion, siglas_inst, banner_alerta } = req.body;
        try {
            const updated = await db.query(
                `UPDATE sistema_config 
         SET institucion = $1, siglas_inst = $2, banner_alerta = $3, ultimo_mantenimiento = NOW()
         WHERE id = (SELECT id FROM sistema_config ORDER BY id DESC LIMIT 1)
         RETURNING *`,
                [institucion, siglas_inst, banner_alerta]
            );
            res.json(updated.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al actualizar configuración' });
        }
    }
};

module.exports = configController;
