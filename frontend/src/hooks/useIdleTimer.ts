import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useIdleTimer(timeoutMs: number = 900000) { // Default 15 mins
    const router = useRouter();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Events to reset the timer
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

        const resetTimer = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
                // Logout action
                console.warn('Sesión caducada por inactividad.');
                router.push('/login?reason=timeout');
            }, timeoutMs);
        };

        // Initialize timer
        resetTimer();

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [timeoutMs, router]);
}
