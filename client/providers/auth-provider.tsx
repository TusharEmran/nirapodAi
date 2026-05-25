import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearAuthToken, loadAuthToken, saveAuthToken } from '@/lib/auth-storage';
import { ApiError, fetchCurrentUser, type AuthUser } from '@/lib/auth-api';

type AuthContextValue = {
    user: AuthUser | null;
    token: string | null;
    isReady: boolean;
    signIn: (token: string, user: AuthUser) => Promise<void>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isReady, setIsReady] = useState(false);

    const refreshSession = async () => {
        if (!token) {
            setUser(null);
            return;
        }

        try {
            const response = await fetchCurrentUser(token);
            setUser(response.user);
        } catch (error) {
            if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
                await clearAuthToken();
                setToken(null);
            }

            setUser(null);
        }
    };

    useEffect(() => {
        let mounted = true;

        const bootstrap = async () => {
            try {
                const storedToken = await loadAuthToken();

                if (!mounted) {
                    return;
                }

                if (!storedToken) {
                    setToken(null);
                    setUser(null);
                    setIsReady(true);
                    return;
                }

                setToken(storedToken);

                try {
                    const response = await fetchCurrentUser(storedToken);
                    if (mounted) {
                        setUser(response.user);
                    }
                } catch (error) {
                    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
                        await clearAuthToken();
                        if (mounted) {
                            setToken(null);
                        }
                    }

                    if (mounted) {
                        setUser(null);
                    }
                }
            } finally {
                if (mounted) {
                    setIsReady(true);
                }
            }
        };

        void bootstrap();

        return () => {
            mounted = false;
        };
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            token,
            isReady,
            signIn: async (nextToken, nextUser) => {
                await saveAuthToken(nextToken);
                setToken(nextToken);
                setUser(nextUser);
            },
            signOut: async () => {
                await clearAuthToken();
                setToken(null);
                setUser(null);
            },
            refreshSession,
        }),
        [isReady, refreshSession, token, user],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
}
