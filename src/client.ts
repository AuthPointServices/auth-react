export interface User {
  sub: string;
  email?: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
}

export type Session =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User }
  | { status: 'error'; error: Error };

export interface SignInOptions {
  /** Ruta de este producto a la que volver; por defecto, la actual. */
  returnTo?: string | undefined;
  /** `create` abre el registro; `login` pide la contraseña aunque haya sesión en el emisor. */
  prompt?: 'login' | 'create' | undefined;
  /** Una acción de la cuenta en el emisor: UPDATE_PASSWORD, webauthn-register-passwordless… */
  action?: string | undefined;
  loginHint?: string | undefined;
  locale?: string | undefined;
}

export interface AuthClient {
  getSession(): Session;
  subscribe(listener: () => void): () => void;
  refresh(): Promise<Session>;
  signIn(options?: SignInOptions): void;
  signOut(): void;
  /** fetch con la cookie; un 401 deja la sesión en anónima. */
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface AuthClientOptions {
  /** Donde el producto monta las rutas de auth-go; por defecto la raíz. */
  basePath?: string | undefined;
  fetch?: typeof fetch | undefined;
  navigate?: ((url: string) => void) | undefined;
}

const here = () => window.location.pathname + window.location.search + window.location.hash;

export function createAuthClient(options: AuthClientOptions = {}): AuthClient {
  const base = (options.basePath ?? '').replace(/\/$/, '');
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => window.fetch(...args));
  const navigate = options.navigate ?? ((url: string) => window.location.assign(url));
  const listeners = new Set<() => void>();
  let session: Session = { status: 'loading' };
  let pending: Promise<Session> | null = null;

  const set = (next: Session) => {
    session = next;
    listeners.forEach((l) => l());
  };

  const refresh = () => {
    pending ??= doFetch(`${base}/auth/session`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`auth: session ${res.status}`);
        const body = (await res.json()) as { authenticated: boolean; user?: User };
        return body.authenticated && body.user ? { status: 'authenticated' as const, user: body.user } : { status: 'anonymous' as const };
      })
      .catch((error: unknown) => ({ status: 'error' as const, error: error instanceof Error ? error : new Error(String(error)) }))
      .then((next) => {
        pending = null;
        set(next);
        return next;
      });
    return pending;
  };

  return {
    getSession: () => session,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh,
    signIn(o = {}) {
      const q = new URLSearchParams({ return_to: o.returnTo ?? here() });
      if (o.prompt) q.set('prompt', o.prompt);
      if (o.action) q.set('action', o.action);
      if (o.loginHint) q.set('login_hint', o.loginHint);
      if (o.locale) q.set('locale', o.locale);
      navigate(`${base}/auth/login?${q}`);
    },
    signOut() {
      const form = document.createElement('form');
      form.method = 'post';
      form.action = `${base}/auth/logout`;
      form.hidden = true;
      document.body.append(form);
      form.submit();
    },
    async fetch(input, init) {
      const res = await doFetch(input, { credentials: 'same-origin', ...init });
      if (res.status === 401 && session.status === 'authenticated') set({ status: 'anonymous' });
      return res;
    },
  };
}
