const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function main() {
    console.log('Creating activity_logs table...');
    try {
        await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        username VARCHAR(255),
        evento VARCHAR(255) NOT NULL,
        detalles TEXT,
        ip_address VARCHAR(50),
        fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(50) DEFAULT 'info', -- info, warning, danger, success
        nivel_permiso VARCHAR(50)
      );
    `;
        console.log('✅ Table activity_logs created successfully.');
    } catch (err) {
        console.error('❌ Error creating table:', err);
    }
}

main();
