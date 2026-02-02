# Plan Front (Configuraciones) - Integracion Oliva Shoes

Objetivo: rehacer la UX/UI del panel de configuraciones para que:
- sea clara (sin modulos/submodulos confusos),
- sea compacta (sin espacio desperdiciado),
- sea responsive (desktop/tablet/movil),
- mantenga wizard guiado real (solo muestra lo que falta),
- y permita QA rapido al final de cada fase.

Nota de seguridad:
- No pegar ni commitear tokens/keys en repo ni en chats. Si se expusieron, rotar credenciales.
- Evitar commitear `.env`.

## Estado actual (2026-02-02)

Fase 1 - COMPLETADA:
- Auditoria de modulos y problemas (jerarquia confusa, duplicacion, toggles poco claros, espacio desperdiciado).

Fase 2 - COMPLETADA:
- Nueva IA (arquitectura de informacion) definida:
  - Conectar (Nueva conexion + tienda activa + wizard)
  - Productos e inventario (Alegra -> Shopify)
  - Pedidos y facturacion (Shopify -> Alegra)
  - Operacion (webhooks/cron/salud)
  - Administracion (token QA + conexiones guardadas)

Fase 3 - EN PROGRESO:
- Reordenamiento en UI + ajustes de layout/toggles/compactacion.

## Fases (plan de accion)

### Fase 1 - Auditoria critica (done)
Entregables:
- Mapa de modulos actuales + pain points.
- Priorizacion P0/P1/P2.

QA (fase 1):
- Validar que la lista de modulos y dependencias sea correcta.

### Fase 2 - Nueva arquitectura (IA) (done)
Entregables:
- Nueva jerarquia por objetivos (no por proveedor).
- Mapeo modulo -> grupo y ruta del wizard.

QA (fase 2):
- Revisar que el usuario entienda "que hago primero" sin leer mucho texto.

### Fase 3 - Layout + toggles + compactacion (in progress)
Objetivos:
- Reducir altura (menos padding/gaps).
- Mejorar legibilidad y contraste.
- Toggles con estado claro (ON/OFF) y consistencia visual.
- Responsive real en tablet/movil.

Checklist de implementacion:
- Grid compacto (2 cols en tablet, 1 col en movil).
- Acciones (Editar/Guardar) consistentes y alineadas.
- "Conexiones guardadas" no debe ocupar demasiado; preferir cards compactas o resumen.
- Estados (bloqueado/recomendaciones) no deben competir con la accion principal.

QA (fase 3):
- Desktop: todo legible sin scroll excesivo por modulo.
- Tablet: 2 columnas donde aplique; sin overflow.
- Movil: 1 columna; botones a ancho completo; toggles visibles.

### Fase 4 - Micro-UX (mensajes, warnings, acciones)
Objetivos:
- Mensajes cortos y accionables.
- Recomendaciones no invasivas.
- Acciones contextuales (no repetir ruido visual).

QA (fase 4):
- Cambiar un toggle/campo y confirmar feedback claro (guardado, warning, error).

### Fase 5 - Wizard guiado real
Objetivos:
- Detectar faltantes y llevar al paso exacto (scroll/focus).
- Saltar pasos que no aplican (ej: invoice/logistics segun modo).
- No abrir/cerrar cosas "solas" de forma confusa.

QA (fase 5):
- Probar flujos:
  - tienda nueva: conectar Shopify/Alegra -> products -> orders -> invoice/logistics -> webhooks.
  - tienda existente: identificar pendientes y saltar directo.

### Fase 6 - QA final (visual + funcional)
Objetivos:
- Smoke test completo de configuraciones en entorno real.
- Verificacion rapida de pedidos/facturacion (script QA).

QA (fase 6):
- UI: responsive + estados + accesibilidad basica (focus/aria-expanded).
- Flujos: conectores, webhooks, cron, pedidos/facturacion.

## Como retomar en un chat nuevo (sin perder contexto)

1) Abrir este archivo: `docs/PLAN-FRONT.md`.
2) Ver el "Estado actual" y continuar desde la fase marcada como `EN PROGRESO`.
3) En el chat nuevo, pegar solo:
   - "Seguimos el plan en docs/PLAN-FRONT.md. Continuar desde Fase X."

## Comandos sugeridos (cuando toque)

- Guardar el plan en repo:
  - `git add docs/PLAN-FRONT.md`
  - `git commit -m "Docs: plan front (configuraciones)"`
  - `git push`

