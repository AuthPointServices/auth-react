import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthClient, type AuthClient } from './client';
import { AuthProvider, RequireAuth, useUser } from './react';

afterEach(cleanup);

function client(authenticated: boolean): { auth: AuthClient; fetch: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> } {
  const fetch = vi.fn(async () => new Response(JSON.stringify(authenticated ? { authenticated, user: { sub: 'u1', name: 'Ana', email_verified: true } } : { authenticated })));
  const navigate = vi.fn();
  return { auth: createAuthClient({ fetch, navigate }), fetch, navigate };
}

function Name() {
  return <p>{useUser()?.name ?? 'nadie'}</p>;
}

describe('RequireAuth', () => {
  it('shows the page to a signed-in person', async () => {
    const { auth } = client(true);
    render(<AuthProvider client={auth}><RequireAuth fallback={<p>cargando</p>}><Name /></RequireAuth></AuthProvider>);
    expect(screen.getByText('cargando')).toBeTruthy();
    expect(await screen.findByText('Ana')).toBeTruthy();
  });

  it('sends everyone else to sign in', async () => {
    const { auth, navigate } = client(false);
    render(<AuthProvider client={auth}><RequireAuth><Name /></RequireAuth></AuthProvider>);
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(navigate.mock.calls[0]?.[0]).toMatch(/^\/auth\/login\?return_to=/);
    expect(screen.queryByText('Ana')).toBeNull();
  });

  it('asks again when the tab comes back', async () => {
    const { auth, fetch } = client(true);
    render(<AuthProvider client={auth}><Name /></AuthProvider>);
    await screen.findByText('Ana');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
