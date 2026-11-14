import { describe, expect, it, vi } from 'vitest';

import { createAuthClient } from './client';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('createAuthClient', () => {
  it('starts loading and resolves who signed in', async () => {
    const fetch = vi.fn(async () => json({ authenticated: true, user: { sub: 'u1', email: 'ana@x', email_verified: true } }));
    const auth = createAuthClient({ fetch });
    expect(auth.getSession()).toEqual({ status: 'loading' });
    const seen: string[] = [];
    auth.subscribe(() => seen.push(auth.getSession().status));
    await auth.refresh();
    expect(auth.getSession()).toEqual({ status: 'authenticated', user: { sub: 'u1', email: 'ana@x', email_verified: true } });
    expect(seen).toEqual(['authenticated']);
    expect(fetch).toHaveBeenCalledWith('/auth/session', expect.objectContaining({ credentials: 'same-origin' }));
  });

  it('asks once while a refresh is in flight', async () => {
    const fetch = vi.fn(async () => json({ authenticated: false }));
    const auth = createAuthClient({ fetch, basePath: '/cuenta/' });
    await Promise.all([auth.refresh(), auth.refresh(), auth.refresh()]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/cuenta/auth/session', expect.anything());
    expect(auth.getSession()).toEqual({ status: 'anonymous' });
  });

  it('reports a backend that does not answer', async () => {
    const auth = createAuthClient({ fetch: async () => json({}, 502) });
    const s = await auth.refresh();
    expect(s.status).toBe('error');
  });

  it('builds the sign-in address', () => {
    const navigate = vi.fn();
    window.history.replaceState(null, '', '/files?view=list');
    const auth = createAuthClient({ navigate, fetch: vi.fn() });
    auth.signIn();
    auth.signIn({ prompt: 'create', returnTo: '/welcome', locale: 'es' });
    auth.signIn({ action: 'UPDATE_PASSWORD', returnTo: '/security' });
    expect(navigate.mock.calls.map(([u]) => u)).toEqual([
      '/auth/login?return_to=%2Ffiles%3Fview%3Dlist',
      '/auth/login?return_to=%2Fwelcome&prompt=create&locale=es',
      '/auth/login?return_to=%2Fsecurity&action=UPDATE_PASSWORD',
    ]);
  });

  it('turns anonymous when the api says 401', async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/auth/session') ? json({ authenticated: true, user: { sub: 'u1', email_verified: true } }) : json({ error: 'unauthenticated' }, 401));
    const auth = createAuthClient({ fetch });
    await auth.refresh();
    const res = await auth.fetch('/api/account');
    expect(res.status).toBe(401);
    expect(auth.getSession()).toEqual({ status: 'anonymous' });
  });

  it('signs out with a form post', () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    createAuthClient({ fetch: vi.fn() }).signOut();
    const form = document.querySelector('form');
    expect(form?.method).toBe('post');
    expect(form?.getAttribute('action')).toBe('/auth/logout');
    expect(submit).toHaveBeenCalled();
  });
});
