import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: Request) {
    try {
        const body = await request.formData();
        const username = body.get('username');
        const password = body.get('password');

        if (!username || !password) {
            return NextResponse.json({ detail: 'Credenciales incompletas' }, { status: 400 });
        }

        // Proxy to Python Backend
        const formData = new FormData();
        formData.append('username', username as string);
        formData.append('password', password as string);

        const response = await fetch(`${API_BASE_URL}/token`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (response.ok) {
            // Set session cookie
            const cookieStore = await cookies();
            cookieStore.set('session', JSON.stringify(data.user), {
                path: '/',
                maxAge: 28800, // 8 hours
                sameSite: 'strict',
                secure: process.env.NODE_ENV === 'production',
            });

            return NextResponse.json(data);
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json({ detail: 'Error en el servidor de autenticación' }, { status: 500 });
    }
}
