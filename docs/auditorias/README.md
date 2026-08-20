# Auditorías de datos

## `becam-precios-sin-coincidencia-2026-08-20.csv`

176 productos de **Becam Cosmetics** (`mut50d-tj.myshopify.com`) cuyo precio en Shopify **no coincide
con ninguna lista de precios de Alegra**, ni siquiera aplicando el IVA del ítem.

Salieron de la auditoría del 2026-08-20 sobre los 1.770 productos mapeados de la tienda, hecha al corregir
la lista de precios (Becam debe usar *mayoristas*, no *General*). De esos 1.770: 711 ya estaban correctos,
750 se corrigieron, 53 no tienen lista mayorista definida, **176 son estos**, y 80 dieron error de lectura.

Estos 176 **no se tocaron**: al no casar con ninguna lista, no hay un precio "correcto" que aplicar. Son
precios puestos a mano en Shopify, o productos cuyo precio en Alegra cambió sin propagarse.

### Columnas

| Columna | Significado |
|---|---|
| `alegra_id` | Identificador del ítem en Alegra |
| `codigo` / `referencia` | SKU y referencia registrados |
| `nombre` | Título del producto en Shopify |
| `precio_actual_shopify` | Lo que se está cobrando hoy |
| `precio_mayoristas_con_iva` | Lista 3 "mayoristas" **con IVA aplicado** (la que corresponde a Becam) |
| `precio_general_con_iva` | Lista 1 "General" con IVA, como referencia |
| `diferencia_vs_mayorista` | `precio_actual − precio_mayoristas`. Negativo = se vende más barato |
| `situacion` | Clasificación rápida |
| `otras_listas_con_iva` | Resto de listas de Alegra para ese ítem |

Ordenado por `diferencia_vs_mayorista` ascendente: **arriba lo que más se está regalando**.

### Reparto

- **94 por debajo del precio mayorista** — se venden más barato de lo que deberían
- **69 por encima del precio general** — se venden más caro que la lista más alta
- **13 entre ambas listas**

Los precios de Alegra vienen **sin IVA**; las columnas de este CSV ya lo llevan aplicado con el porcentaje
de impuesto de cada ítem, para poder compararlas directamente con Shopify.
