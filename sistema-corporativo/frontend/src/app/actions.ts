'use server';

import { sql } from '@/lib/db';
import { headers } from 'next/headers';

// Helper para logs
async function logActivity(usuario_corp: string, evento: string, detalles?: string, estado: 'info' | 'warning' | 'danger' | 'success' = 'info') {
    try {
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for') || 'unknown';

        // Intentamos buscar el ID del usuario si posible
        let usuario_id = null;
        const user = await sql`SELECT id FROM usuarios WHERE usuario_corp = ${usuario_corp} LIMIT 1`;
        if (user.length > 0) usuario_id = user[0].id;

        await sql`
      INSERT INTO activity_logs (usuario_id, username, evento, detalles, ip_address, estado, nivel_permiso)
      VALUES (${usuario_id}, ${usuario_corp}, ${evento}, ${detalles}, ${ip}, ${estado}, 'user')
    `;
    } catch (err) {
        console.error('Error logging activity:', err);
    }
}

export type LoginState = {
    message?: string;
    errors?: {
        username?: string;
        password?: string;
    };
    success?: boolean;
};

export async function manejarLogin(prevState: LoginState, formData: FormData): Promise<LoginState> {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
        return {
            message: 'Faltan campos requeridos'
        };
    }

    try {
        // ⚠️ ADVERTENCIA: Comparación de contraseña en texto plano
        const usuarios = await sql`
      SELECT *
      FROM usuarios 
      WHERE usuario_corp = ${username} AND password = ${password}
      LIMIT 1
    `;

        if (usuarios.length > 0) {
            await logActivity(username, 'Login', 'Inicio de sesión exitoso', 'success');
            return { success: true, message: 'Login exitoso' };
        } else {
            await logActivity(username, 'Login Fallido', 'Contraseña incorrecta', 'warning');
            return { message: 'Credenciales incorrectas' };
        }
    } catch (error) {
        console.error('Database Error:', error);
        return { message: 'Error de base de datos' };
    }
}

export async function registrarUsuario(formData: FormData) {
    // Extraemos todos los datos del formulario
    const datos = {
        nombre: formData.get('nombre') as string,
        apellido: formData.get('apellido') as string,
        email_corp: formData.get('email_corp') as string,
        telefono: formData.get('telefono') as string,
        usuario_corp: formData.get('usuario_corp') as string,
        gerencia_depto: formData.get('gerencia_depto') as string,
        password: formData.get('password') as string, // Nota: En producción, usa 'bcrypt' para encriptar
    };

    try {
        await sql`
      INSERT INTO usuarios (nombre, apellido, email_corp, telefono, usuario_corp, gerencia_depto, password)
      VALUES (${datos.nombre}, ${datos.apellido}, ${datos.email_corp}, ${datos.telefono}, ${datos.usuario_corp}, ${datos.gerencia_depto}, ${datos.password})
    `;

        await logActivity(datos.usuario_corp, 'Registro', `Usuario creado en ${datos.gerencia_depto}`, 'success');

    } catch (error: any) {
        console.error("Error detallado al registrar:", error);
        return { error: `Error DB: ${error.message || JSON.stringify(error)}` };
    }
    // Si sale bien (no entró al catch), retornamos éxito
    return { success: true };
}