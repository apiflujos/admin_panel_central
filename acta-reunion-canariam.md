# Acta de Reunión — Equipo Canariam

| Campo | Detalle |
|---|---|
| **Proyecto** | Piloto de flujos en la plataforma apiflujos |
| **Fecha** | Julio de 2026 _(ajustar día exacto)_ |
| **Lugar / Modalidad** | _(por definir)_ |
| **Elaborada por** | Sebastián Giraldo |

### Asistentes
- Equipo Canariam
- Zaadita Castro
- Camilo Jaramillo
- Sebastián Giraldo _(completar / ajustar asistentes)_

---

## 1. Objetivo de la reunión

Definir el alcance y los compromisos para poner en marcha un **piloto** durante la **primera semana de agosto de 2026**, implementando dos flujos de prueba en la plataforma apiflujos e iniciar pruebas reales del funcionamiento completo (toma de pedido, creación de orden, creación de contacto y sincronización con SAP).

---

## 2. Acuerdos principales

### 2.1. Piloto — primera semana de agosto
Se implementarán **dos flujos de prueba**:

1. **Flujo de Servicio al Cliente (SAC) completo.**
2. **Flujo de Ventas inline.**

### 2.2. Maestro de producto
Se establece la creación de un **producto maestro** que sirva como estándar para la creación de todos los productos de ahora en adelante. Cada producto maestro debe contar con:

- **Nombre completo y estándar**, unificado para todas las plataformas.
- **Despiece de las partes que componen el producto.**
  - *Ejemplo — Patines:* siempre se componen de **4 elementos**: **botas, chasis, ruedas y rodamientos**. El **número de rodamientos depende del tipo de ruedas**.
- **Posibles mejoras** de cada uno de los elementos.
- **Elementos personalizables** disponibles para ese combo.
- Para **cada parte** que compone el producto:
  - Descripción.
  - Ficha técnica.
  - Garantía.
- **Categorías y subcategorías.**
- **Palabras clave y etiquetas**, orientadas a mejorar el entrenamiento del asistente para que tenga conocimiento completo de cada producto y pueda resolver cualquier duda o inquietud sobre el mismo.

### 2.3. Comportamiento del asistente según el origen del contacto
El asistente debe **comportarse de forma diferente** según el punto de entrada:

- **Contacto desde pauta / visitante de la página web**, sin contexto de producto ni de cliente.
- **Cliente que se contacta directamente.**

Adicionalmente, el asistente debe ofrecer un **flujo conversacional basado en el historial de compras** del cliente a través de los diferentes canales.

### 2.4. Flujo de Servicio al Cliente (SAC)
Se implementará dentro de la plataforma apiflujos el flujo completo de SAC, **desde su creación hasta la resolución**.

---

## 3. Compromisos y responsables

| # | Compromiso | Responsable | Fecha objetivo |
|---|---|---|---|
| 1 | Entregar **2 productos completos** como maestro/modelo de cómo se debe crear un producto de ahora en adelante (con toda la estructura del punto 2.2). | **Zaadita Castro** | Primera semana de agosto de 2026 |
| 2 | Proporcionar el **flujo completo de SAC**, desde su creación hasta la resolución, para implementarlo dentro de apiflujos. | **Camilo Jaramillo** | Primera semana de agosto de 2026 |
| 3 | Implementar en apiflujos los dos flujos de prueba (SAC completo y Ventas inline) para el piloto. | Equipo apiflujos / Sebastián Giraldo | Primera semana de agosto de 2026 |

---

## 4. Meta del piloto

Con los entregables anteriores se podrán iniciar **pruebas reales del funcionamiento completo de la plataforma**, cubriendo el ciclo:

**Toma del pedido → Creación de la orden → Creación del contacto → Sincronización con SAP.**

---

## 5. Próximos pasos
- [ ] Confirmar fecha exacta de inicio del piloto (primera semana de agosto de 2026).
- [ ] Zaadita Castro entrega los 2 productos maestro con la estructura acordada.
- [ ] Camilo Jaramillo entrega el flujo completo de SAC.
- [ ] Configurar en apiflujos los dos flujos (SAC y Ventas inline).
- [ ] Ejecutar pruebas reales del ciclo completo con sincronización a SAP.

---

_Acta sujeta a revisión y aprobación de los asistentes._
