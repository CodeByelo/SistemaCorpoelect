'use server';

import { sql } from '@/lib/db';

export async function getSecurityLogs() {
    try {
        const logs = await sql`
      SELECT * FROM activity_logs 
      ORDER BY fecha_hora DESC 
      LIMIT 100
    `;
        return logs;
    } catch (error) {
        console.error('Error fetching logs:', error);
        return [];
    }
}

export async function getUsersList() {
    try {
        const users = await sql`
      SELECT id, nombre, apellido, usuario_corp, gerencia_depto, email_corp 
      FROM usuarios 
      ORDER BY id DESC
    `;
        return users;
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

export async function getUserDetails(userId: string) {
    try {
        const user = await sql`
      SELECT * FROM usuarios WHERE id = ${userId} LIMIT 1
    `;
        return user[0];
    } catch (error) {
        console.error('Error fetching user details:', error);
        return null;
    }
}

export async function getUserLogs(userId: string) {
    try {
        const logs = await sql`
      SELECT * FROM activity_logs 
      WHERE usuario_id = ${userId} 
      ORDER BY fecha_hora DESC
    `;
        return logs;
    } catch (error) {
        console.error('Error fetching user logs:', error);
        return [];
    }
}

export async function logTicketActivity(data: {
    username: string;
    evento: string;
    detalles: string;
    estado: 'success' | 'warning' | 'danger' | 'info';
}) {
    try {
        await sql`
      INSERT INTO activity_logs (username, evento, detalles, estado, fecha_hora, ip_address)
      VALUES (${data.username}, ${data.evento}, ${data.detalles}, ${data.estado}, NOW(), '127.0.0.1')
    `;
        return { success: true };
    } catch (error) {
        console.error('Error logging ticket activity:', error);
        return { success: false };
    }
}

export async function logDocumentActivity(data: {
    username: string;
    evento: string;
    detalles: string;
    estado: 'success' | 'warning' | 'danger' | 'info';
}) {
    try {
        await sql`
      INSERT INTO activity_logs (username, evento, detalles, estado, fecha_hora, ip_address)
      VALUES (${data.username}, ${data.evento}, ${data.detalles}, ${data.estado}, NOW(), '127.0.0.1')
    `;
        return { success: true };
    } catch (error) {
        console.error('Error logging document activity:', error);
        return { success: false };
    }
}
