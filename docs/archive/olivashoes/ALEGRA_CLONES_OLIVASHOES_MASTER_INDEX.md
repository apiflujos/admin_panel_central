# Indice maestro - clones Alegra olivashoes

Trabajo de clasificacion para limpieza segura.

No borrar nada por ahora.

## Objetivo

- sacar de operacion clones claros
- conservar originales
- dejar aparte los casos ambiguos para revision manual

## Regla general

Inactivar solo cuando se cumpla todo esto:

- mismo nombre
- existe un original con `reference`
- el clone no tiene `reference`
- el clone no tiene `barcode`
- el clone no tiene `code`

No inactivar automaticamente si el clone tiene:

- movimientos
- stock
- uso documental

En esos casos:

- pasar a revision manual

## Lotes preparados

### Lote 1

- Archivo: [ALEGRA_CLONES_OLIVASHOES_FIRST_BATCH_EXECUTION.md](/mnt/c/users/usr/documents/proyectos_apiflujos/admin_panel_central/docs/ALEGRA_CLONES_OLIVASHOES_FIRST_BATCH_EXECUTION.md)
- Grupos: `40`
- Clones candidatos: `233`
- Familias:
  - `ABDALA`
  - `ABRIL`
  - `ACACIA`
  - `AIDE`
  - `AKIRA`

### Lote 2

- Archivo: [ALEGRA_CLONES_OLIVASHOES_SECOND_BATCH_EXECUTION.md](/mnt/c/users/usr/documents/proyectos_apiflujos/admin_panel_central/docs/ALEGRA_CLONES_OLIVASHOES_SECOND_BATCH_EXECUTION.md)
- Grupos: `41`
- Clones candidatos: `118`
- Familias:
  - `ADI`
  - `ADELE`
  - `ADEL`
  - `ADINA`
  - `ADELINA`

### Lote 3

- Archivo: [ALEGRA_CLONES_OLIVASHOES_THIRD_BATCH_EXECUTION.md](/mnt/c/users/usr/documents/proyectos_apiflujos/admin_panel_central/docs/ALEGRA_CLONES_OLIVASHOES_THIRD_BATCH_EXECUTION.md)
- Grupos: `28`
- Clones candidatos: `59`
- Familias:
  - `ADORACION`
  - `AGATA`
  - `AITANA BAJA CUERO`
  - `AISHA`
  - `AIDA`

### Lote 4

- Archivo: [ALEGRA_CLONES_OLIVASHOES_FOURTH_BATCH_EXECUTION.md](/mnt/c/users/usr/documents/proyectos_apiflujos/admin_panel_central/docs/ALEGRA_CLONES_OLIVASHOES_FOURTH_BATCH_EXECUTION.md)
- Grupos: `19`
- Clones candidatos: `34`
- Familias:
  - `AINARA BAJA`
  - `AELEN`
  - `AGAPE`
  - `ALPARGATA MAFALDA TEXTIL`
  - `DAFNA`

### Lote 5

- Archivo: [ALEGRA_CLONES_OLIVASHOES_FIFTH_BATCH_EXECUTION.md](/mnt/c/users/usr/documents/proyectos_apiflujos/admin_panel_central/docs/ALEGRA_CLONES_OLIVASHOES_FIFTH_BATCH_EXECUTION.md)
- Grupos: `14`
- Clones candidatos: `16`
- Familias:
  - `DALIA`
  - `ALPARGATA LETY TEXTIL`
  - `ANABELLE`
  - `DAKOTA`
  - `DANILA`

### Lote 6

- Archivo: [ALEGRA_CLONES_OLIVASHOES_SIXTH_BATCH_EXECUTION.md](/mnt/c/users/usr/documents/proyectos_apiflujos/admin_panel_central/docs/ALEGRA_CLONES_OLIVASHOES_SIXTH_BATCH_EXECUTION.md)
- Grupos: `12`
- Clones candidatos: `14`
- Familias:
  - `DONATELLA TEXTIL`
  - `ENRIQUETA`
  - `FLOR`
  - `ALESHA`
  - `AGUSTINA`

## Total consolidado listo para intervenir

- Lotes preparados: `6`
- Grupos listos: `154`
- Clones claros candidatos a inactivar: `474`

## Frontera de seguridad

Esto si esta listo para intervenir:

- clones claros listados en los 6 lotes

Esto no esta listo para intervenir en automatico:

- grupos donde todos los duplicados estan sin `reference`
- items unicos sin `reference`
- casos donde no hay original claro
- cualquier item con uso operativo visible

## Orden sugerido de ejecucion

1. Lote 1
2. Lote 2
3. Lote 3
4. Lote 4
5. Lote 5
6. Lote 6

## Modo de trabajo sugerido

Por cada grupo:

1. conservar el `id original`
2. revisar si algun clone tiene movimientos, stock o documentos
3. si no tiene uso, inactivar
4. si tiene uso, marcar `revision manual`
5. no borrar nada

## Estado actual

- clasificacion de clones claros: lista
- lotes operativos: listos
- borrado: no ejecutado
- inactivacion real en Alegra: no ejecutada desde este repo
