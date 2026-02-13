const db = require('../config/db');

const dashboardController = {
    getStats: async (req, res) => {
        try {
            // Documents status count (Pie Chart data)
            const docStats = await db.query(
                'SELECT estado, COUNT(*) as cantidad FROM documentos_alfa GROUP BY estado'
            );

            // Tickets status count (Pie Chart data)
            const ticketStats = await db.query(
                'SELECT estado, COUNT(*) as cantidad FROM tickets_soporte GROUP BY estado'
            );

            // Tasks by priority (Bar Chart data)
            const taskStats = await db.query(
                'SELECT prioridad, COUNT(*) as cantidad FROM tareas_prioridad GROUP BY prioridad'
            );

            // Recent Activity
            const recentLogs = await db.query(
                `SELECT l.*, u.username 
         FROM logs_seguridad l 
         LEFT JOIN usuarios_alfa u ON l.usuario_id = u.id 
         ORDER BY fecha_evento DESC LIMIT 10`
            );

            res.json({
                documents: docStats.rows,
                tickets: ticketStats.rows,
                tasks: taskStats.rows,
                recentLogs: recentLogs.rows
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    }
};

module.exports = dashboardController;
