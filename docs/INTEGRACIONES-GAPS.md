# Integraciones Shopify + Alegra: gaps y plan

## Documentacion existente
- `README.md`: endpoints base, env vars minimas, nota de credenciales y DDL.
- No hay guias detalladas por servicio, ni flujos de OAuth/webhooks, ni reglas de negocio.

## Gaps criticos por servicio
### Shopify
- OAuth: flujo completo, parametros, scopes, instalacion multi-tienda, errores comunes.
- Webhooks: topics usados, validacion de firma, reintentos, GDPR.
- Admin API: endpoints/queries usadas, limites, rate limits, versionado.
- Productos/inventario: reglas de estado (draft/active), publicacion, stock.
- Pedidos: mapeo de estados, idempotencia, reintentos.

### Alegra
- API: endpoints usados, campos clave, validaciones, limites.
- Webhooks: firma, eventos, reintentos.
- Facturacion: resoluciones, metodos de pago, cuentas, factura electronica.
- Inventario: bodegas, traslados, reglas de stock.

### Sistema
- Configuracion por tienda vs global.
- Reglas de sincronizacion: deduplicacion, prioridad de match, conflictos.
- Jobs/Cron: inventario y ajustes, intervalos, impacto en Shopify.
- Observabilidad: logs, errores frecuentes, acciones de recovery.
- Esquema de datos y mapeos (tablas y claves).

## Plan de accion (documentacion + validacion)
1) Auditoria documental: matriz "existe / falta" por modulo.
2) Mapa de integracion: diagrama de flujos y dependencias.
3) Docs por servicio:
   - `docs/SHOPIFY.md`
   - `docs/ALEGRA.md`
   - `docs/FLOWS.md`
   - `docs/CONFIG.md`
4) Validacion con codigo: revisar controllers, jobs y conectores para cerrar gaps.
5) Checklist de implementacion: backlog priorizado para completar lo faltante.

