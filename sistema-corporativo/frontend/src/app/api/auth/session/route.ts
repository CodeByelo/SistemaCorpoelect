import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            return NextResponse.json({ user: null });
        }

        // Parse session data
        const user = JSON.parse(decodeURIComponent(sessionCookie.value));

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json({ user: null });
    }
}
