# auth-react

La sesión del lado del navegador para los productos que usan `auth-go`. No guarda tokens: pregunta al backend del
producto (`/auth/session`) quién entró y manda a `/auth/login` o `/auth/logout` cuando hace falta. No trae estilos;
cada producto dibuja su menú de cuenta con su diseño.
