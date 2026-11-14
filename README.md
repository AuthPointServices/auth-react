# auth-react

La sesión del lado del navegador para los productos que usan `auth-go`. No guarda tokens: pregunta al backend del
producto (`/auth/session`) quién entró y manda a `/auth/login` o `/auth/logout` cuando hace falta. No trae estilos;
cada producto dibuja su menú de cuenta con su diseño.

## Instalar

Cada versión se publica ya compilada en las releases del repo:

```sh
pnpm add https://github.com/AuthPointServices/auth-react/releases/download/v0.1.0/authpoint-auth-react-0.1.0.tgz
```

## Uso

El backend del producto monta `auth-go` en la raíz (`/auth/*`). En el frontend:

```tsx
import { AuthProvider, RequireAuth, createAuthClient, useAuth, useUser } from '@authpoint/auth-react';

const auth = createAuthClient();

createRoot(root).render(
  <AuthProvider client={auth}>
    <RequireAuth fallback={<Splash />}>
      <App />
    </RequireAuth>
  </AuthProvider>,
);

function AccountMenu() {
  const user = useUser();
  const auth = useAuth();
  return (
    <>
      <span>{user?.name}</span>
      <button onClick={() => auth.signIn({ action: 'UPDATE_PASSWORD' })}>Cambiar la contraseña</button>
      <button onClick={() => auth.signOut()}>Cerrar sesión</button>
    </>
  );
}
```

`auth.fetch` es `fetch` con la cookie; si la API responde 401 la sesión pasa a anónima y `RequireAuth` manda a
entrar. La sesión se vuelve a pedir al volver a la pestaña, así se nota si se cerró en otro producto.
