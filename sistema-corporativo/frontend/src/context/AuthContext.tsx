"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { DEFAULT_SCOPES, PERMISSIONS_MASTER } from '@/permissions/constants';

export type UserRole = 'CEO' | 'Administrativo' | 'Usuario' | 'Desarrollador';

export interface User {
    id: number;
    username: string;
    nombre: string;
    apellido: string;
    email_corp: string;
    gerencia_depto: string;
    role: UserRole;
    roleOriginal?: UserRole;
    permissions: string[];
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    setUser: (user: User | null) => void;
    switchRole: (newRole: UserRole) => Promise<boolean>;
    hasPermission: (permission: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);

    // ✅ HELPER PARA OBTENER PERMISOS REALES (Persistencia Dev)
    const getEffectivePermissions = (role: UserRole, basePermissions?: string[]): string[] => {
        // ✅ REGLA MAESTRA: Desarrollador siempre tiene TODO
        if (role === 'Desarrollador') return Object.values(PERMISSIONS_MASTER);

        if (typeof window === 'undefined') return (basePermissions && basePermissions.length > 0) ? basePermissions : DEFAULT_SCOPES[role] || [];

        // Si es Administrativo, priorizar lo que el DEV guardó en localStorage
        if (role === 'Administrativo') {
            const savedScope = localStorage.getItem('admin_scope_2026');
            if (savedScope) {
                try {
                    return JSON.parse(savedScope);
                } catch (e) {
                    console.error("Error parsing admin_scope_2026", e);
                }
            }
        }

        return (basePermissions && basePermissions.length > 0) ? basePermissions : DEFAULT_SCOPES[role] || [];
    };

    // Mark that we're on the client
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Check for existing session on mount (ONLY on client)
    useEffect(() => {
        if (!isClient) return;

        const checkSession = async () => {
            try {
                const response = await fetch('/api/auth/session');
                if (response.ok) {
                    const data = await response.json();
                    if (data.user) {
                        const userWithPerms = {
                            ...data.user,
                            permissions: getEffectivePermissions(data.user.role as UserRole, data.user.permissions)
                        };
                        setUser(userWithPerms);
                    }
                }
            } catch (error) {
                console.error('Session check failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, [isClient]);

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    const userWithPerms = {
                        ...data.user,
                        permissions: getEffectivePermissions(data.user.role as UserRole, data.user.permissions)
                    };
                    localStorage.setItem('sgd_token', data.access_token);
                    setUser(userWithPerms);
                    return true;
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
            }
            return false;
        } catch (error) {
            return false;
        }
    };

    const logout = () => {
        // Clear client-side state
        setUser(null);

        // Clear server-side cookie
        fetch('/api/auth/logout', { method: 'POST' })
            .then(() => {
                // Redirect to login
                window.location.href = '/login';
            })
            .catch(error => {
                console.error('Logout failed:', error);
                // Force redirect anyway
                window.location.href = '/login';
            });
    };

    const switchRole = async (newRole: UserRole): Promise<boolean> => {
        if (!user) return false;

        try {
            const response = await fetch('/api/auth/switch-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });

            if (response.ok) {
                let newNombre = user.nombre;
                let newApellido = user.apellido;
                const originalRole = user.roleOriginal || user.role;

                // Sync name with role for clarity in Dev Switcher
                if (newRole === 'CEO') { newNombre = 'Director'; newApellido = 'Ejecutivo'; }
                else if (newRole === 'Administrativo') { newNombre = 'Administrador'; newApellido = 'General'; }
                else if (newRole === 'Usuario') { newNombre = 'Operador'; newApellido = 'Estándar'; }
                else if (newRole === 'Desarrollador') { newNombre = 'Desarrollador'; newApellido = 'Principal'; }

                setUser({
                    ...user,
                    role: newRole,
                    roleOriginal: originalRole,
                    nombre: newNombre,
                    apellido: newApellido,
                    permissions: getEffectivePermissions(newRole)
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Switch role failed:', error);
            return false;
        }
    };

    const hasPermission = (permission: string): boolean => {
        if (!user) return false;
        if (user.role === 'Desarrollador') return true;
        return user.permissions?.includes(permission) || false;
    };

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        setUser,
        switchRole,
        hasPermission
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
