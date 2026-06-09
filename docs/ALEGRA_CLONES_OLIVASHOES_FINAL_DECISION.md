# Decision operativa final - clones Alegra olivashoes

## Objetivo

Definir que hacer ya con los clones detectados en Alegra.

## Decision

### 1. Revision manual

Estos `12` items no se tocan por ahora.

Motivo:

- tienen stock real en Alegra
- o la cantidad viene `null`

Lista:

- `19590` | `Alpargata Lety Textil - Negro` | stock `3`
- `19579` | `Alpargata Mafalda Textil - Crudo` | stock `4`
- `19580` | `Alpargata Mafalda Textil - Jean Claro` | stock `3`
- `19645` | `Alpargata Mafalda Textil - Nude x Café` | stock `2`
- `15898` | `Dakota - Arena` | stock `1`
- `15889` | `Enriqueta - Café` | stock `1`
- `15948` | `Flor - Arena` | stock `2`
- `15842` | `Flor - Vinotinto` | stock `2`
- `12027` | `Dafna - Dorado` | stock `null`
- `12026` | `Dafna - Plata` | stock `null`
- `12049` | `Dalia - Almendra` | stock `null`
- `12048` | `Dalia - Bronce` | stock `null`

### 2. Lote para intervenir

Estos `462` clones claros quedan como lote operativo para limpiar Alegra.

Accion recomendada:

- `inactivar`

No recomendado por ahora:

- `borrar`

Motivo:

- ya pasaron filtro de clone claro
- no aparecen en `/api/products`
- pero no quedaron totalmente cerrados contra toda posible trazabilidad documental

Archivo base:

- [ALEGRA_CLONES_OLIVASHOES_IDS_TO_INACTIVATE.md](/mnt/c/users/usr/documents/proyectos_apiflujos/admin_panel_central/docs/ALEGRA_CLONES_OLIVASHOES_IDS_TO_INACTIVATE.md)

## Resumen ejecutivo

- revision manual: `12`
- lote para inactivar: `462`
- lote para borrar directo: `0`

## Accion sugerida

1. revisar manualmente los `12`
2. inactivar los `462`
3. despues evaluar si vale la pena una segunda pasada para borrado definitivo
