# QA Manual — `client/olivashoes`

## Objetivo

Validar la superficie funcional actual antes y después de cada fase de portado a `apps/admin-web`.

## Preflight

- `GET /health` responde `{"status":"ok"}`
- login admin válido
- si se van a probar operaciones/facturas reales, identificar primero una tienda y un pedido de prueba

## Smoke base

1. Abrir `/login.html`
2. Login válido
3. Abrir `/`
4. Abrir `/dashboard`
5. Abrir `/settings/connections`
6. Logout

Resultado esperado:

- no hay errores visibles
- la sesión se mantiene entre rutas
- el logout devuelve a `/login.html`

## Auth / sesión

### Login válido

- `POST /api/auth/login`
- se crea cookie `os_session`
- redirección correcta

### Login inválido

- error visible
- no crea sesión

### Expiración o ausencia de cookie

- cualquier pantalla privada termina en login

### CSRF

- las mutaciones sin token deben fallar
- los `GET` no deben exigir CSRF

## Branding

### Login

- título correcto
- logo ApiFlujos visible
- logo cliente visible si existe

### App

- topbar consistente
- branding de empresa se refleja en la UI

## Conexiones

### Carga inicial

- `/api/connections`
- `/api/woocommerce/connections`
- render correcto del panel

### Estados

- Shopify conectado / reconectar
- Alegra conectado / reconectar
- WooCommerce conectado / pendiente

### Acciones mínimas

- reconnect Shopify
- reconnect Alegra
- disconnect proveedor
- crear tienda

### Validaciones

- no guardar conexión incompleta
- errores claros si faltan credenciales o dominio

## Store configs

### Carga

- `/api/store-configs`
- selección de tienda activa correcta

### Persistencia

- cambiar un toggle
- guardar
- recargar
- validar persistencia

### Copia entre tiendas

- copiar config origen -> destino
- verificar que el destino cambia

## Operaciones

### Listado

- `/api/operations`
- lista visible y estable

### Acción manual

- sync manual por pedido
- retry invoice
- emitir pago
- cancelar

Resultado esperado:

- respuesta clara
- sin duplicación
- sin 500 genérico

## Facturas

### Listado

- `/api/invoices`
- búsqueda básica

### PDF

- descarga PDF correcta

## Rutas clave

- `/`
- `/dashboard`
- `/settings`
- `/settings/connections`
- `/login.html`
- `/__sa` con rol adecuado

## Edge cases prioritarios

- tienda conectada sin `store-config`
- Alegra con credencial vencida
- sesión expirada durante el uso
- logo > 2MB
- retry invoice sobre pedido ya facturado
- deep-link directo a `/settings/connections`

## Regla de pase

La fase solo pasa si:

1. auth/sesión siguen estables
2. branding no se degrada
3. conexiones siguen operando
4. store-configs siguen guardando
5. operaciones/facturas no pierden acciones críticas
