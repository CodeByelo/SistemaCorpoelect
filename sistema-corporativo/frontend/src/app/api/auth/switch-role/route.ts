import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const { role } = await request.json();
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            return NextResponse.json({ error: 'No session found' }, { status: 401 });
        }

        const sessionData = JSON.parse(sessionCookie.value);
        sessionData.role = role;

        cookieStore.set('session', JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Switch Role Error]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
