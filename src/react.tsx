import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';

import type { AuthClient, Session, User } from './client';

const Context = createContext<AuthClient | null>(null);

/** Pide la sesión al montar y otra vez al volver a la pestaña: así se nota si se cerró en otro producto. */
export function AuthProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
  useEffect(() => {
    void client.refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void client.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [client]);
  return <Context value={client}>{children}</Context>;
}

export function useAuth(): AuthClient {
  const client = useContext(Context);
  if (!client) throw new Error('auth-react: useAuth outside <AuthProvider>');
  return client;
}

export function useSession(): Session {
  const client = useAuth();
  return useSyncExternalStore(client.subscribe, client.getSession);
}

export function useUser(): User | null {
  const s = useSession();
  return s.status === 'authenticated' ? s.user : null;
}

/** Sin sesión manda a entrar y vuelve aquí. Mientras tanto, y si falla, dibuja `fallback`. */
export function RequireAuth({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const client = useAuth();
  const session = useSession();
  const anonymous = session.status === 'anonymous';
  useEffect(() => {
    if (anonymous) client.signIn();
  }, [anonymous, client]);
  return session.status === 'authenticated' ? children : fallback;
}
