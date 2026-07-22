# Verificacion de borrado - clones Alegra olivashoes

Objetivo de este corte:

- medir si los clones claros ya preparados para limpieza pueden pasar de `inactivar` a `borrar`
- documentar lo que si esta verificado
- dejar explicita la barrera que aun falta

## Universo revisado

- clones claros preparados en 6 lotes: `474`

Fuente:

- [ALEGRA_CLONES_OLIVASHOES_MASTER_INDEX.md](/mnt/c/users/usr/documents/proyectos_apiflujos/admin_panel_central/docs/ALEGRA_CLONES_OLIVASHOES_MASTER_INDEX.md)

## Verificaciones realizadas

### 1. Inventario en cache Alegra

Se cruzaron los `474` IDs candidatos contra el cache local de items Alegra.

Resultado:

- con inventario `0`: `462`
- con inventario `> 0`: `8`
- con cantidad desconocida: `4`

Bloqueados por esta barrera:

- `19590` | `Alpargata Lety Textil - Negro` | qty `3`
- `19579` | `Alpargata Mafalda Textil - Crudo` | qty `4`
- `19580` | `Alpargata Mafalda Textil - Jean Claro` | qty `3`
- `19645` | `Alpargata Mafalda Textil - Nude x Café` | qty `2`
- `15898` | `Dakota - Arena` | qty `1`
- `15889` | `Enriqueta - Café` | qty `1`
- `15948` | `Flor - Arena` | qty `2`
- `15842` | `Flor - Vinotinto` | qty `2`
- `12027` | `Dafna - Dorado` | qty `desconocida`
- `12026` | `Dafna - Plata` | qty `desconocida`
- `12049` | `Dalia - Almendra` | qty `desconocida`
- `12048` | `Dalia - Bronce` | qty `desconocida`

Conclusion parcial:

- esos `12` no deben borrarse ahora
- los `462` restantes pasan la barrera minima de inventario

### 2. Presencia en `/api/products`

Se cruzaron los `474` IDs contra la salida del backend local en `/api/products`.

Resultado:

- presentes como producto local: `0`
- ausentes: `474`

Conclusion parcial:

- no hay evidencia de que estos clones esten activos en la tabla operativa local de productos

## Barreras que siguen faltando

### 1. `sync_mappings`

No pude verificar desde esta sesion si alguno de los `462` candidatos todavia aparece en `sync_mappings`.

Motivo:

- el puerto de `DATABASE_URL` no responde desde este proceso
- tampoco hay acceso al daemon Docker desde esta sesion para consultar `postgres` con `docker compose exec`

### 2. Uso documental o movimientos en Alegra

No hay en este repo un flujo implementado que consulte, por item:

- uso en facturas
- uso en documentos
- historial de movimientos

Tampoco existe una ruta backend lista para borrado de items de Alegra.

## Decision tecnica

Con lo verificado hasta ahora:

- `12` clones quedan bloqueados
- `462` clones son candidatos fuertes

Pero todavia no afirmo `borrado masivo seguro`.

La razon es simple:

- falta validar `sync_mappings`
- falta validar uso documental/movimientos

## Estado recomendado

### Se puede afirmar con seguridad

- `12` no borrar
- `462` son mejores candidatos a borrar que a conservar
- `474` no aparecen como productos operativos en `/api/products`

### Todavia no afirmo

- que los `462` puedan borrarse todos sin revisar mappings/documentos

## Siguiente paso correcto

1. consultar `sync_mappings` para los `462`
2. si no aparecen ahi, revisar documentalmente en Alegra o por export
3. borrar solo los que pasen ambas barreras

## Estado

- verificacion de stock: hecha
- verificacion en `/api/products`: hecha
- verificacion de `sync_mappings`: pendiente
- verificacion documental/movimientos: pendiente
