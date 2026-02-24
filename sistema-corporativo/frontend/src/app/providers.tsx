import { AuthProvider } from "@/context/AuthContext";
import { SecurityProtector } from "@/components/SecurityProtector";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <SecurityProtector>
                {children}
            </SecurityProtector>
        </AuthProvider>
    );
}
